import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchEmailsFromImap, type FetchedEmail } from "@/lib/email/imap";
import { parsePurchaseEmail } from "@/lib/email/parser";
import {
  API_RATE_LIMITS,
  EMAIL_SYNC_BOOTSTRAP_LOOKBACK_DAYS,
  EMAIL_SYNC_DEFAULT_LIMIT,
  EMAIL_SYNC_IMAP_TIMEOUT_MS,
  EMAIL_SYNC_MAX_LIMIT,
} from "@/lib/utils/constants";
import { checkRateLimit } from "@/lib/utils/rateLimit";

export const runtime = "nodejs";
// Sin esto Vercel corta la funcion a los 10s por defecto: la lectura IMAP mas
// la escritura en Supabase supera ese limite y el sync moria con 504.
export const maxDuration = 60;


function toMs(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/i);
  if (!match) return 60_000;

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit === "s") return amount * 1000;
  if (unit === "m") return amount * 60_000;
  if (unit === "h") return amount * 3_600_000;
  return amount * 86_400_000;
}

function getImapConfig(provider: string) {
  if (provider === "outlook") {
    return { host: "outlook.office365.com", port: 993, secure: true };
  }

  return { host: "imap.gmail.com", port: 993, secure: true };
}

function parseDateOrNull(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  return Promise.race([
    promise.finally(() => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }),
    new Promise<null>((resolve) => {
      timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const supabaseAdmin = getSupabaseAdmin();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rate = checkRateLimit(
      `email-auto-sync:${user.id}:${ip}`,
      API_RATE_LIMITS.email.requests,
      toMs(API_RATE_LIMITS.email.window)
    );

    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Límite excedido. Intenta en ${rate.retryAfterSeconds}s`,
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const limit = Math.min(
      Math.max(
        Number.parseInt(request.nextUrl.searchParams.get("limit") || String(EMAIL_SYNC_DEFAULT_LIMIT), 10),
        1
      ),
      EMAIL_SYNC_MAX_LIMIT
    );

    // Por defecto sincronizamos todos los correos. Si quieres solo no leídos,
    // envía unseenOnly=true desde la UI o el cliente.
    const unseenOnly = request.nextUrl.searchParams.get("unseenOnly") === "true";

    // Buzon configurable: en Gmail los correos bancarios suelen estar
    // archivados o filtrados fuera de INBOX ("[Gmail]/All Mail").
    const mailbox = request.nextUrl.searchParams.get("mailbox") || "INBOX";

    // Permite forzar una ventana historica concreta ignorando last_sync.
    const daysParam = Number.parseInt(request.nextUrl.searchParams.get("days") || "", 10);
    const forcedDays = Number.isFinite(daysParam)
      ? Math.min(Math.max(daysParam, 1), 365)
      : null;

    const { data: emailImport, error: emailImportError } = await supabaseAdmin
      .from("email_imports")
      .select("id, email_address, provider, access_token, last_sync")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{
        id: string;
        email_address: string;
        provider: "gmail" | "outlook";
        access_token: string | null;
        last_sync: string | null;
      }>();

    if (emailImportError) {
      return NextResponse.json({ error: emailImportError.message }, { status: 400 });
    }

    if (!emailImport) {
      return NextResponse.json(
        { error: "No tienes una importación activa de correo" },
        { status: 404 }
      );
    }

    const password = (emailImport.access_token || "").trim();
    if (!password || password === "[SENSITIVE]") {
      return NextResponse.json(
        {
          error:
            "Falta credencial IMAP. Guarda una App Password en email_imports.access_token para este correo.",
        },
        { status: 400 }
      );
    }

    const cfg = getImapConfig(emailImport.provider);
    // Con `days` explicito ignoramos last_sync y rebarremos la ventana pedida.
    const since = forcedDays ? null : parseDateOrNull(emailImport.last_sync);
    const startedAt = Date.now();
    const bootstrapSince = new Date(
      Date.now() -
        (forcedDays ?? EMAIL_SYNC_BOOTSTRAP_LOOKBACK_DAYS) * 24 * 60 * 60 * 1000
    );

    let parsed = 0;
    let inserted = 0;
    let duplicated = 0;
    let ignored = 0;
    let failed = 0;
    const warnings: string[] = [];

    let imapResult: FetchedEmail[] | null = null;
    try {
      imapResult = await withTimeout(
        fetchEmailsFromImap({
          host: cfg.host,
          port: cfg.port,
          secure: cfg.secure,
          user: emailImport.email_address,
          password,
          mailbox,
          since: since || bootstrapSince,
          limit,
          unseenOnly,
        }),
        EMAIL_SYNC_IMAP_TIMEOUT_MS
      );
    } catch (imapErr) {
      console.error("[email/sync/auto] Error conectando a IMAP:", imapErr);
      const msg = imapErr instanceof Error ? imapErr.message : String(imapErr);
      if (/authentication failed|invalid credentials|login failed|AUTHENTICATIONFAILED/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "Error de autenticación IMAP: Verifica tu correo y que la Contraseña de Aplicación de 16 caracteres de Google/Outlook sea correcta.",
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `Error de conexión IMAP (${cfg.host}): ${msg}` },
        { status: 400 }
      );
    }

    let fetched = Array.isArray(imapResult) ? imapResult : [];
    let usedBootstrapFallback = false;

    if (imapResult === null) {
      warnings.push(
        "La lectura IMAP tardó demasiado y se interrumpió para evitar timeout. Intenta con menos correos o revisa la credencial IMAP."
      );
    } else if (fetched.length === 0 && since) {
      usedBootstrapFallback = true;
      warnings.push(
        `No se encontraron correos desde last_sync. Reintentando con los últimos ${EMAIL_SYNC_BOOTSTRAP_LOOKBACK_DAYS} días.`
      );

      try {
        const fallbackResult = await withTimeout(
          fetchEmailsFromImap({
            host: cfg.host,
            port: cfg.port,
            secure: cfg.secure,
            user: emailImport.email_address,
            password,
            mailbox,
            since: bootstrapSince,
            limit,
            unseenOnly: false,
          }),
          EMAIL_SYNC_IMAP_TIMEOUT_MS
        );

        fetched = Array.isArray(fallbackResult) ? fallbackResult : [];

        if (fallbackResult === null) {
          warnings.push(
            "La lectura IMAP del fallback también tardó demasiado y se interrumpió para evitar timeout."
          );
        }
      } catch (fallbackErr) {
        console.error("[email/sync/auto] Error en fallback IMAP:", fallbackErr);
        warnings.push("No se pudo completar el reintento histórico de correos.");
      }
    }

    const preview: Array<{
      subject: string;
      merchant: string;
      category: string;
      confidence: number;
      status: string;
    }> = [];

    const ignoredSenders = new Map<string, number>();

    // 1) Parseo en memoria (sin I/O): decide que correos son movimientos.
    type Candidate = {
      email: (typeof fetched)[number];
      movement: NonNullable<ReturnType<typeof parsePurchaseEmail>>;
      subject: string;
      merchant: string;
      bodySnippet: string;
      messageId: string | null;
      status: string;
    };

    const candidates: Candidate[] = [];

    for (const email of fetched) {
      try {
        const movement = parsePurchaseEmail(email);

        if (!movement) {
          ignored += 1;
          ignoredSenders.set(email.from, (ignoredSenders.get(email.from) || 0) + 1);
          continue;
        }

        parsed += 1;

        candidates.push({
          email,
          movement,
          subject: (email.subject || "Sin asunto").slice(0, 300),
          merchant: (movement.merchant || "Sin comercio").slice(0, 255),
          bodySnippet: (movement.snippet || email.body || "").slice(0, 600),
          messageId: (email.messageId || "").slice(0, 500) || null,
          status: movement.confidence >= 0.9 ? "auto_classified" : "pending",
        });
      } catch (error) {
        failed += 1;
        warnings.push(
          `Error procesando \"${email.subject || "Sin asunto"}\": ${
            error instanceof Error ? error.message : "error desconocido"
          }`
        );
      }
    }

    // 2) Una sola consulta para detectar duplicados (antes eran 2 por correo,
    //    lo que agotaba el tiempo maximo de la funcion serverless).
    let newCandidates = candidates;

    if (candidates.length > 0) {
      const { data: existingRows, error: existingError } = await supabaseAdmin
        .from("expense_classifications")
        .select("message_id, subject, merchant")
        .eq("email_import_id", emailImport.id)
        .limit(1000);

      if (existingError) {
        warnings.push(`No se pudo validar duplicados: ${existingError.message}`);
      } else {
        const existingMessageIds = new Set(
          (existingRows ?? [])
            .map((r) => (r as { message_id: string | null }).message_id)
            .filter((v): v is string => Boolean(v))
        );
        const existingContent = new Set(
          (existingRows ?? []).map(
            (r) =>
              `${(r as { subject: string | null }).subject}|${(r as { merchant: string | null }).merchant}`
          )
        );

        newCandidates = candidates.filter((c) => {
          const isDuplicate = c.messageId
            ? existingMessageIds.has(c.messageId)
            : existingContent.has(`${c.subject}|${c.merchant}`);

          if (isDuplicate) duplicated += 1;
          return !isDuplicate;
        });
      }
    }

    // 3) Insercion en lote (una sola llamada en vez de N).
    if (newCandidates.length > 0) {
      const baseRows = newCandidates.map((c) => ({
        email_import_id: emailImport.id,
        subject: c.subject,
        body_snippet: c.bodySnippet,
        merchant: c.merchant,
        predicted_category: c.movement.category,
        confidence: c.movement.confidence,
        manual_category: null,
        status: c.status,
      }));

      const fullRows = newCandidates.map((c, i) => ({
        ...baseRows[i],
        // Sin user_id las filas quedan invisibles para las politicas RLS
        // basadas en usuario y el monto nunca llega a la revision.
        user_id: user.id,
        message_id: c.messageId,
        amount: c.movement.amount,
        currency: c.movement.currency,
        transaction_date: c.movement.date,
        detected_type: c.movement.type,
        num_installments: c.movement.numInstallments,
        source: c.movement.source,
        from_address: c.email.from,
        classified_by: "rules",
      }));

      let { data: insertedRows, error: insertError } = await supabaseAdmin
        .from("expense_classifications")
        .insert(fullRows)
        .select("id");

      // Compatibilidad: si la migracion 005 no esta aplicada, reintentamos con
      // el conjunto minimo de columnas.
      if (insertError && /column .* does not exist|schema cache/i.test(insertError.message)) {
        warnings.push(
          "La migración 005_email_parsing.sql no está aplicada: se guardaron los movimientos sin monto ni fecha. Aplícala en Supabase para tener datos completos."
        );
        ({ data: insertedRows, error: insertError } = await supabaseAdmin
          .from("expense_classifications")
          .insert(baseRows)
          .select("id"));
      }

      if (insertError) {
        failed += newCandidates.length;
        warnings.push(`No se pudieron guardar los movimientos: ${insertError.message}`);
      } else {
        inserted = insertedRows?.length ?? newCandidates.length;

        for (const c of newCandidates.slice(0, 10)) {
          preview.push({
            subject: c.subject,
            merchant: c.merchant,
            category: c.movement.category,
            confidence: c.movement.confidence,
            status: c.status,
          });
        }
      }
    }

    if (fetched.length > 0) {
      const now = new Date().toISOString();
      await supabaseAdmin
        .from("email_imports")
        .update({ last_sync: now })
        .eq("id", emailImport.id)
        .eq("user_id", user.id);
    } else {      warnings.push(
        "No se encontraron correos para procesar en la bandeja de entrada (INBOX). Asegúrate de tener correos de compras de bancos soportados (Banco de Chile, Santander, BCI, BancoEstado, Falabella, etc.)."
      );
      if (since || usedBootstrapFallback) {
        warnings.push(
          "No se actualizó last_sync para permitir reintentar correos históricos en la próxima sincronización."
        );
      }
    }

    const topIgnoredSenders = [...ignoredSenders.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([from, count]) => ({ from, count }));

    if (fetched.length > 0 && inserted === 0 && ignored > 0) {
      warnings.push(
        `Se leyeron ${fetched.length} correos pero ninguno se reconoció como movimiento bancario. Remitentes más frecuentes: ${topIgnoredSenders
          .slice(0, 3)
          .map((s) => s.from)
          .join(", ")}.`
      );
    }

    return NextResponse.json({
      message: "Sincronización automática completada",
      email_import_id: emailImport.id,
      stats: {
        fetched: fetched.length,
        parsed,
        inserted,
        duplicated,
        ignored,
        failed,
        timed_out: imapResult === null,
        used_bootstrap_fallback: usedBootstrapFallback,
        duration_ms: Date.now() - startedAt,
        remainingRateLimit: rate.remainingAttempts,
      },
      preview,
      ignored_senders: topIgnoredSenders,
      warnings: warnings.slice(0, 20),
    });
  } catch (err) {
    console.error("[email/sync/auto][POST] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}




