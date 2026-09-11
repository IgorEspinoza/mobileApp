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
  EMAIL_SYNC_MAX_RUNTIME_MS,
} from "@/lib/utils/constants";
import { checkRateLimit } from "@/lib/utils/rateLimit";

export const runtime = "nodejs";

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
    const since = parseDateOrNull(emailImport.last_sync);
    const startedAt = Date.now();
    const bootstrapSince = new Date(
      Date.now() - EMAIL_SYNC_BOOTSTRAP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
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
          mailbox: "INBOX",
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
            mailbox: "INBOX",
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

    for (const email of fetched) {
      if (Date.now() - startedAt > EMAIL_SYNC_MAX_RUNTIME_MS) {
        warnings.push(
          "Se alcanzó el tiempo máximo de sincronización. El lote se cortó para evitar timeout."
        );
        break;
      }

      try {
        const movement = parsePurchaseEmail(email);

        if (!movement) {
          ignored += 1;
          continue;
        }

        parsed += 1;

        const subject = (email.subject || "Sin asunto").slice(0, 300);
        const merchant = (movement.merchant || "Sin comercio").slice(0, 255);
        const bodySnippet = (movement.snippet || email.body || "").slice(0, 600);

        const { data: duplicateRow, error: duplicateError } = await supabaseAdmin
          .from("expense_classifications")
          .select("id")
          .eq("email_import_id", emailImport.id)
          .eq("subject", subject)
          .eq("merchant", merchant)
          .eq("body_snippet", bodySnippet)
          .maybeSingle();

        if (duplicateError) {
          failed += 1;
          warnings.push(`No se pudo validar duplicado para \"${subject}\": ${duplicateError.message}`);
          continue;
        }

        if (duplicateRow) {
          duplicated += 1;
          continue;
        }

        const row = {
          email_import_id: emailImport.id,
          subject,
          body_snippet: bodySnippet,
          merchant,
          predicted_category: movement.category,
          confidence: movement.confidence,
          manual_category: null,
          status: movement.confidence >= 0.9 ? "auto_classified" : "pending",
        };

        const { error: insertError } = await supabaseAdmin
          .from("expense_classifications")
          .insert(row);

        if (insertError) {
          failed += 1;
          warnings.push(`No se pudo guardar \"${subject}\": ${insertError.message}`);
          continue;
        }

        inserted += 1;

        if (preview.length < 10) {
          preview.push({
            subject,
            merchant,
            category: movement.category,
            confidence: movement.confidence,
            status: row.status,
          });
        }
      } catch (error) {
        failed += 1;
        warnings.push(
          `Error procesando \"${email.subject || "Sin asunto"}\": ${
            error instanceof Error ? error.message : "error desconocido"
          }`
        );
      }
    }

    if (fetched.length > 0) {
      const now = new Date().toISOString();
      await supabaseAdmin
        .from("email_imports")
        .update({ last_sync: now })
        .eq("id", emailImport.id)
        .eq("user_id", user.id);
    } else {
      warnings.push(
        "No se encontraron correos para procesar en la bandeja de entrada (INBOX). Asegúrate de tener correos de compras de bancos soportados (Banco de Chile, Santander, BCI, BancoEstado, Falabella, etc.)."
      );
      if (since || usedBootstrapFallback) {
        warnings.push(
          "No se actualizó last_sync para permitir reintentar correos históricos en la próxima sincronización."
        );
      }
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
        remainingRateLimit: rate.remainingAttempts,
      },
      preview,
      warnings: warnings.slice(0, 20),
    });
  } catch (err) {
    console.error("[email/sync/auto][POST] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}




