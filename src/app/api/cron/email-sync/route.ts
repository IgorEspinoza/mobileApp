import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  fetchEmailsFromImap,
  resolveImapMailbox,
  type FetchedEmail,
} from "@/lib/email/imap";
import { parsePurchaseEmail } from "@/lib/email/parser";
import { autoApproveClassifications, AUTO_APPROVE_CONFIDENCE } from "@/lib/email/autoApprove";
import {
  EMAIL_SYNC_BOOTSTRAP_LOOKBACK_DAYS,
  EMAIL_SYNC_IMAP_TIMEOUT_MS,
} from "@/lib/utils/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

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
    promise.finally(() => { if (timeoutHandle) clearTimeout(timeoutHandle); }),
    new Promise<null>((resolve) => {
      timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

const isCronAuthorized = (request: NextRequest) => {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return false;
  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${expectedSecret}`;
};


/* ------------------------------------------------------------------ *
 * Sincroniza correos de UN usuario. Devuelve estadísticas.
 * ------------------------------------------------------------------ */

type UserSyncResult = {
  userId: string;
  email: string;
  fetched: number;
  parsed: number;
  autoApproved: number;
  pendingReview: number;
  duplicated: number;
  ignored: number;
  failed: number;
  warnings: string[];
};

async function syncUserEmails(
  emailImport: {
    id: string;
    user_id: string;
    email_address: string;
    provider: "gmail" | "outlook";
    access_token: string;
    last_sync: string | null;
  },
): Promise<UserSyncResult> {
  const supabaseAdmin = getSupabaseAdmin();
  const result: UserSyncResult = {
    userId: emailImport.user_id,
    email: emailImport.email_address,
    fetched: 0,
    parsed: 0,
    autoApproved: 0,
    pendingReview: 0,
    duplicated: 0,
    ignored: 0,
    failed: 0,
    warnings: [],
  };

  const cfg = getImapConfig(emailImport.provider);
  const defaultMailbox = emailImport.provider === "gmail" ? "__ALL_MAIL__" : "INBOX";

  let resolvedMailbox: string;
  try {
    const mailboxResolution = await resolveImapMailbox(
      { host: cfg.host, port: cfg.port, secure: cfg.secure, user: emailImport.email_address, password: emailImport.access_token },
      defaultMailbox,
    );
    resolvedMailbox = mailboxResolution.mailbox;
  } catch (err) {
    result.warnings.push(`No se pudo resolver buzón: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  const since = parseDateOrNull(emailImport.last_sync);
  const bootstrapSince = new Date(Date.now() - EMAIL_SYNC_BOOTSTRAP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  let fetched: FetchedEmail[] = [];
  try {
    const imapResult = await withTimeout(
      fetchEmailsFromImap({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        user: emailImport.email_address,
        password: emailImport.access_token,
        mailbox: resolvedMailbox,
        since: since || bootstrapSince,
        limit: 30,
        unseenOnly: false,
      }),
      EMAIL_SYNC_IMAP_TIMEOUT_MS,
    );

    if (imapResult === null) {
      result.warnings.push("IMAP timeout");
      return result;
    }

    fetched = imapResult;

    // Si no hay correos desde last_sync, probar con ventana amplia
    if (fetched.length === 0 && since) {
      const fallback = await withTimeout(
        fetchEmailsFromImap({
          host: cfg.host, port: cfg.port, secure: cfg.secure,
          user: emailImport.email_address, password: emailImport.access_token,
          mailbox: resolvedMailbox, since: bootstrapSince, limit: 30, unseenOnly: false,
        }),
        EMAIL_SYNC_IMAP_TIMEOUT_MS,
      );
      fetched = Array.isArray(fallback) ? fallback : [];
    }
  } catch (err) {
    result.warnings.push(`IMAP error: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  result.fetched = fetched.length;
  if (fetched.length === 0) return result;

  // --- Parseo ---
  type Candidate = {
    email: FetchedEmail;
    movement: NonNullable<ReturnType<typeof parsePurchaseEmail>>;
    subject: string;
    merchant: string;
    bodySnippet: string;
    messageId: string | null;
  };

  const candidates: Candidate[] = [];

  for (const email of fetched) {
    try {
      const movement = parsePurchaseEmail(email);
      if (!movement) { result.ignored += 1; continue; }
      result.parsed += 1;
      candidates.push({
        email,
        movement,
        subject: (email.subject || "Sin asunto").slice(0, 300),
        merchant: (movement.merchant || "Sin comercio").slice(0, 255),
        bodySnippet: (movement.snippet || email.body || "").slice(0, 600),
        messageId: (email.messageId || "").slice(0, 500) || null,
      });
    } catch {
      result.failed += 1;
    }
  }

  // --- Deduplicación en lote ---
  const seenKeys = new Set<string>();
  const unique = candidates.filter((c) => {
    const key = c.messageId ? `mid:${c.messageId}` : `content:${c.subject}|${c.merchant}|${c.bodySnippet}`;
    if (seenKeys.has(key)) { result.duplicated += 1; return false; }
    seenKeys.add(key);
    return true;
  });

  // Dedup contra DB
  let newCandidates = unique;
  if (unique.length > 0) {
    const { data: existingRows } = await supabaseAdmin
      .from("expense_classifications")
      .select("id, message_id, subject, merchant, amount")
      .eq("email_import_id", emailImport.id)
      .limit(1000);

    if (existingRows) {
      const byMsgId = new Map<string, boolean>();
      const byContent = new Map<string, boolean>();
      for (const row of existingRows as { message_id: string | null; subject: string | null; merchant: string | null }[]) {
        if (row.message_id) byMsgId.set(row.message_id, true);
        byContent.set(`${row.subject}|${row.merchant}`, true);
      }
      newCandidates = unique.filter((c) => {
        const exists = (c.messageId && byMsgId.has(c.messageId)) || byContent.has(`${c.subject}|${c.merchant}`);
        if (exists) { result.duplicated += 1; return false; }
        return true;
      });
    }
  }

  // --- Insertar clasificaciones y auto-aprobar ---
  for (const c of newCandidates) {
    const shouldAutoApprove =
      c.movement.confidence >= AUTO_APPROVE_CONFIDENCE &&
      (c.movement.type === "expense" || c.movement.type === "income");

    // Siempre crear la clasificación para trazabilidad
    const classificationRow = {
      email_import_id: emailImport.id,
      user_id: emailImport.user_id,
      subject: c.subject,
      body_snippet: c.bodySnippet,
      merchant: c.merchant,
      predicted_category: c.movement.category,
      confidence: c.movement.confidence,
      manual_category: shouldAutoApprove ? c.movement.category : null,
      status: shouldAutoApprove ? "auto_classified" : "pending",
      message_id: c.messageId,
      amount: c.movement.amount,
      currency: c.movement.currency,
      transaction_date: c.movement.date,
      detected_type: c.movement.type,
      num_installments: c.movement.numInstallments,
      source: c.movement.source,
      from_address: c.email.from,
      classified_by: "rules",
    };

    const { data: _inserted, error: insertError } = await supabaseAdmin
      .from("expense_classifications")
      .insert(classificationRow)
      .select("id")
      .single();

    if (insertError) {
      if (/duplicate key|unique constraint/i.test(insertError.message)) {
        result.duplicated += 1;
      } else {
        result.failed += 1;
        result.warnings.push(`Insert failed: ${insertError.message}`);
      }
      continue;
    }

    if (!shouldAutoApprove) {
      result.pendingReview += 1;
    }
  }

  // Auto-aprobar transacciones de alta confianza
  const autoResult = await autoApproveClassifications(emailImport.user_id, emailImport.id);
  result.autoApproved = autoResult.approved;
  if (autoResult.errors.length > 0) {
    result.warnings.push(...autoResult.errors);
  }

  // Actualizar last_sync
  await supabaseAdmin.from("email_imports").update({ last_sync: new Date().toISOString() }).eq("id", emailImport.id);

  return result;
}

/* ------------------------------------------------------------------ *
 * GET /api/cron/email-sync — Vercel Cron llama a este endpoint.
 * ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const startedAt = Date.now();
  const supabaseAdmin = getSupabaseAdmin();

  // Obtener TODOS los usuarios con importación activa
  const { data: activeImports, error: importsError } = await supabaseAdmin
    .from("email_imports")
    .select("id, user_id, email_address, provider, access_token, last_sync")
    .eq("is_active", true);

  if (importsError || !activeImports) {
    return NextResponse.json({ error: importsError?.message || "No imports found" }, { status: 500 });
  }

  // Filtrar los que tienen credenciales válidas
  const validImports = activeImports.filter(
    (imp) => imp.access_token && imp.access_token.trim() !== "" && imp.access_token !== "[SENSITIVE]"
  ) as Array<{
    id: string;
    user_id: string;
    email_address: string;
    provider: "gmail" | "outlook";
    access_token: string;
    last_sync: string | null;
  }>;

  const results: UserSyncResult[] = [];

  // Procesar secuencialmente para no saturar IMAP
  for (const imp of validImports) {
    try {
      const userResult = await syncUserEmails(imp);
      results.push(userResult);
    } catch (err) {
      results.push({
        userId: imp.user_id,
        email: imp.email_address,
        fetched: 0, parsed: 0, autoApproved: 0, pendingReview: 0,
        duplicated: 0, ignored: 0, failed: 1,
        warnings: [`Error global: ${err instanceof Error ? err.message : String(err)}`],
      });
    }
  }

  const totalAutoApproved = results.reduce((sum, r) => sum + r.autoApproved, 0);
  const totalPending = results.reduce((sum, r) => sum + r.pendingReview, 0);

  return NextResponse.json({
    message: "Cron de sincronización de correos completado",
    duration_ms: Date.now() - startedAt,
    users_processed: results.length,
    total_auto_approved: totalAutoApproved,
    total_pending_review: totalPending,
    results: results.map((r) => ({
      email: r.email,
      fetched: r.fetched,
      parsed: r.parsed,
      autoApproved: r.autoApproved,
      pendingReview: r.pendingReview,
      duplicated: r.duplicated,
      ignored: r.ignored,
      failed: r.failed,
      warnings: r.warnings.slice(0, 5),
    })),
  });
}
