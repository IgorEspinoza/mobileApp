import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parsePurchaseEmail } from "@/lib/email/parser";
import { API_RATE_LIMITS } from "@/lib/utils/constants";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { SyncEmailSchema } from "@/lib/validations/schemas";

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

/**
 * Sync manual básico: recibe una lista de correos en el body y los convierte en
 * clasificaciones pendientes (o auto_classified) para revisión.
 *
 * Este endpoint NO se conecta todavía a Gmail/IMAP; sirve para habilitar el
 * flujo extremo a extremo mientras se implementa el conector real.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
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

    const emailLimits = API_RATE_LIMITS.email;
    const rate = checkRateLimit(
      `email-sync:${user.id}:${ip}`,
      emailLimits.requests,
      toMs(emailLimits.window)
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

    const body = await request.json();
    const validated = SyncEmailSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Validación fallida" },
        { status: 400 }
      );
    }

    const payload = validated.data;

    // Importación activa a usar (debe pertenecer al usuario)
    let emailImportId = payload.email_import_id;

    if (!emailImportId) {
      const { data: firstImport, error: importError } = await supabase
        .from("email_imports")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (importError) {
        return NextResponse.json({ error: importError.message }, { status: 400 });
      }

      if (!firstImport?.id) {
        return NextResponse.json(
          {
            error:
              "No tienes una importación de correo activa. Configúrala primero en Ajustes.",
          },
          { status: 404 }
        );
      }

      emailImportId = firstImport.id;
    } else {
      const { data: ownedImport, error: ownedImportError } = await supabase
        .from("email_imports")
        .select("id")
        .eq("id", emailImportId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedImportError) {
        return NextResponse.json({ error: ownedImportError.message }, { status: 400 });
      }

      if (!ownedImport?.id) {
        return NextResponse.json(
          { error: "La importación indicada no existe o no te pertenece" },
          { status: 404 }
        );
      }
    }

    let parsed = 0;
    let inserted = 0;
    let duplicated = 0;
    let ignored = 0;

    const preview: Array<{
      subject: string;
      merchant: string;
      category: string;
      confidence: number;
      status: string;
    }> = [];

    for (const email of payload.emails) {
      const result = parsePurchaseEmail({
        messageId: email.messageId || crypto.randomUUID(),
        from: email.from,
        to: email.to || "",
        subject: email.subject || "",
        body: email.body,
        date: email.date ? new Date(email.date) : new Date(),
      });

      if (!result) {
        ignored += 1;
        continue;
      }

      parsed += 1;

      const subject = (email.subject || "Sin asunto").slice(0, 300);
      const merchant = (result.merchant || "Sin comercio").slice(0, 255);
      const bodySnippet = (result.snippet || email.body || "").slice(0, 600);

      // Deduplicado básico compatible con esquema actual (sin depender de migration 005).
      const { data: duplicateRow } = await supabase
        .from("expense_classifications")
        .select("id")
        .eq("email_import_id", emailImportId)
        .eq("subject", subject)
        .eq("merchant", merchant)
        .eq("body_snippet", bodySnippet)
        .maybeSingle();

      if (duplicateRow) {
        duplicated += 1;
        continue;
      }

      const row = {
        email_import_id: emailImportId,
        subject,
        body_snippet: bodySnippet,
        merchant,
        predicted_category: result.category,
        confidence: result.confidence,
        manual_category: null,
        status: result.confidence >= 0.9 ? "auto_classified" : "pending",
      };

      if (!payload.dry_run) {
        const { error: insertError } = await supabase
          .from("expense_classifications")
          .insert(row);

        if (insertError) {
          return NextResponse.json(
            {
              error: `Error guardando clasificación para "${subject}": ${insertError.message}`,
            },
            { status: 400 }
          );
        }
      }

      inserted += 1;

      if (preview.length < 10) {
        preview.push({
          subject,
          merchant,
          category: result.category,
          confidence: result.confidence,
          status: row.status,
        });
      }
    }

    return NextResponse.json(
      {
        message: payload.dry_run
          ? "Dry-run completado"
          : "Sincronización manual completada",
        email_import_id: emailImportId,
        stats: {
          received: payload.emails.length,
          parsed,
          inserted,
          duplicated,
          ignored,
          remainingRateLimit: rate.remainingAttempts,
        },
        preview,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[email/sync][POST] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

