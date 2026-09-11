import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchEmailsFromImap } from "@/lib/email/imap";
import { parsePurchaseEmail } from "@/lib/email/parser";
import { API_RATE_LIMITS } from "@/lib/utils/constants";
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
      Math.max(Number.parseInt(request.nextUrl.searchParams.get("limit") || "25", 10), 1),
      100
    );

    const unseenOnly = request.nextUrl.searchParams.get("unseenOnly") !== "false";

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

    const fetched = await fetchEmailsFromImap({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      user: emailImport.email_address,
      password,
      mailbox: "INBOX",
      since: since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      limit,
      unseenOnly,
    });

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

    for (const email of fetched) {
      const movement = parsePurchaseEmail(email);

      if (!movement) {
        ignored += 1;
        continue;
      }

      parsed += 1;

      const subject = (email.subject || "Sin asunto").slice(0, 300);
      const merchant = (movement.merchant || "Sin comercio").slice(0, 255);
      const bodySnippet = (movement.snippet || email.body || "").slice(0, 600);

      const { data: duplicateRow } = await supabaseAdmin
        .from("expense_classifications")
        .select("id")
        .eq("email_import_id", emailImport.id)
        .eq("subject", subject)
        .eq("merchant", merchant)
        .eq("body_snippet", bodySnippet)
        .maybeSingle();

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
        return NextResponse.json(
          {
            error: `Error guardando clasificación para "${subject}": ${insertError.message}`,
          },
          { status: 400 }
        );
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
    }

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("email_imports")
      .update({ last_sync: now })
      .eq("id", emailImport.id)
      .eq("user_id", user.id);

    return NextResponse.json({
      message: "Sincronización automática completada",
      email_import_id: emailImport.id,
      stats: {
        fetched: fetched.length,
        parsed,
        inserted,
        duplicated,
        ignored,
        remainingRateLimit: rate.remainingAttempts,
      },
      preview,
    });
  } catch (err) {
    console.error("[email/sync/auto][POST] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}


