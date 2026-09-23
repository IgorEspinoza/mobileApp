import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchEmailsFromImap, resolveImapMailbox } from "@/lib/email/imap";
import {
  detectSource,
  htmlToText,
  parsePurchaseEmail,
} from "@/lib/email/parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getImapConfig(provider: string) {
  if (provider === "outlook") {
    return { host: "outlook.office365.com", port: 993, secure: true };
  }
  return { host: "imap.gmail.com", port: 993, secure: true };
}

/**
 * Diagnóstico de sincronización: NO escribe nada en base de datos.
 *
 * Lee los últimos correos del buzón y explica, correo por correo, si el parser
 * lo reconoce como movimiento y, si no, por qué lo descarta.
 *
 * Query params:
 *   mailbox: buzón a leer (default INBOX; en Gmail puedes usar "[Gmail]/All Mail")
 *   days:    ventana de búsqueda hacia atrás (default 30)
 *   limit:   cantidad máxima de correos (default 25)
 */
export async function GET(request: NextRequest) {
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

    const params = request.nextUrl.searchParams;
    const mailboxParam = params.get("mailbox") || null;
    const days = Math.min(Math.max(Number.parseInt(params.get("days") || "30", 10), 1), 365);
    const limit = Math.min(Math.max(Number.parseInt(params.get("limit") || "25", 10), 1), 50);

    const { data: emailImport, error: importError } = await supabaseAdmin
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

    if (importError) {
      return NextResponse.json({ error: importError.message }, { status: 400 });
    }

    if (!emailImport) {
      return NextResponse.json(
        { error: "No tienes una conexión de correo activa. Guarda tus credenciales primero." },
        { status: 404 }
      );
    }

    const password = (emailImport.access_token || "").trim();
    if (!password || password === "[SENSITIVE]") {
      return NextResponse.json(
        { error: "Falta la App Password en la configuración de correo." },
        { status: 400 }
      );
    }

    // Para Gmail, usar All Mail por defecto para ver correos que Gmail filtra.
    const mailbox = mailboxParam
      ?? (emailImport.provider === "gmail" ? "__ALL_MAIL__" : "INBOX");

    const cfg = getImapConfig(emailImport.provider);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const mailboxResolution = await resolveImapMailbox(
      {
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        user: emailImport.email_address,
        password,
      },
      mailbox
    );

    let emails;
    try {
      emails = await fetchEmailsFromImap({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        user: emailImport.email_address,
        password,
        mailbox: mailboxResolution.mailbox,
        since,
        limit,
        unseenOnly: false,
      });
    } catch (imapErr) {
      const msg = imapErr instanceof Error ? imapErr.message : String(imapErr);
      return NextResponse.json(
        {
          error: `Fallo IMAP (${cfg.host}, buzón "${mailbox}"): ${msg}`,
          hint: /AUTHENTICATIONFAILED|Invalid credentials|LOGIN failed/i.test(msg)
            ? "La App Password es inválida o IMAP está deshabilitado en la cuenta."
            : /NONEXISTENT|Unknown Mailbox|does not exist/i.test(msg)
              ? `El buzón "${mailbox}" no existe. Usa la lista de buzones detectados por IMAP para elegir el nombre correcto.`
              : undefined,
        },
        { status: 400 }
      );
    }

    const details = emails.map((email) => {
      const source = detectSource(email.from);
      const bodyText = /<[a-z][\s\S]*>/i.test(email.body)
        ? htmlToText(email.body)
        : email.body;
      const movement = parsePurchaseEmail(email);

      let reason: string;
      if (movement) {
        reason = "OK - movimiento detectado";
      } else if (!source) {
        reason = "Descartado: remitente no reconocido como banco/billetera";
      } else {
        reason = "Descartado: no se encontró un monto en el correo";
      }

      return {
        date: email.date,
        from: email.from,
        subject: email.subject.slice(0, 160),
        detected_source: source ?? null,
        parsed: Boolean(movement),
        reason,
        movement: movement
          ? {
              type: movement.type,
              merchant: movement.merchant,
              amount: movement.amount,
              currency: movement.currency,
              date: movement.date,
              category: movement.category,
              confidence: movement.confidence,
              num_installments: movement.numInstallments,
            }
          : null,
        body_preview: bodyText.slice(0, 240),
      };
    });

    const bySender = details.reduce<Record<string, number>>((acc, d) => {
      acc[d.from] = (acc[d.from] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      account: {
        email_address: emailImport.email_address,
        provider: emailImport.provider,
        imap_host: cfg.host,
        last_sync: emailImport.last_sync,
      },
      query: {
        requested_mailbox: mailbox,
        resolved_mailbox: mailboxResolution.mailbox,
        matched_by: mailboxResolution.matchedBy,
        days,
        limit,
        since: since.toISOString(),
      },
      available_mailboxes: mailboxResolution.availableMailboxes,
      summary: {
        fetched: details.length,
        parsed: details.filter((d) => d.parsed).length,
        from_known_bank: details.filter((d) => d.detected_source).length,
        discarded: details.filter((d) => !d.parsed).length,
      },
      senders: Object.entries(bySender)
        .sort((a, b) => b[1] - a[1])
        .map(([from, count]) => ({ from, count })),
      details,
    });
  } catch (err) {
    console.error("[email/diagnose][GET] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

