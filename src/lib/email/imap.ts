import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export interface ImapFetchOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  mailbox?: string;
  since?: Date;
  limit?: number;
  unseenOnly?: boolean;
}

export interface FetchedEmail {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: Date;
}

function normalizeAddress(value: string | undefined): string {
  return (value || "").trim().toLowerCase();
}

function extractToAddress(parsedTo: unknown): string {
  if (!parsedTo) return "";

  if (Array.isArray(parsedTo)) {
    const first = parsedTo[0] as { address?: string } | undefined;
    return normalizeAddress(first?.address);
  }

  const addressObj = parsedTo as {
    value?: Array<{ address?: string }>;
    address?: string;
  };

  return normalizeAddress(addressObj.value?.[0]?.address || addressObj.address);
}

function toDate(value: Date | string | undefined): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Lee correos desde IMAP y devuelve un set normalizado para el parser interno.
 *
 * No marca mensajes como leídos y no modifica flags.
 */
export async function fetchEmailsFromImap(options: ImapFetchOptions): Promise<FetchedEmail[]> {
  const client = new ImapFlow({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: {
      user: options.user,
      pass: options.password,
    },
    // Evita volcar el protocolo IMAP completo en los logs de produccion.
    logger: false,
    greetingTimeout: 10_000,
    socketTimeout: 60_000,
  });

  const mailbox = options.mailbox || "INBOX";
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const unseenOnly = options.unseenOnly ?? true;

  await client.connect();
  const lock = await client.getMailboxLock(mailbox);

  try {
    const searchQuery: Record<string, unknown> = {};
    if (options.since) searchQuery.since = options.since;
    if (unseenOnly) searchQuery.seen = false;
    // ImapFlow exige al menos un criterio; `all` cubre el caso sin filtros.
    if (Object.keys(searchQuery).length === 0) searchQuery.all = true;

    // `uid: true` es obligatorio: sin el, search devuelve numeros de secuencia
    // que pueden desplazarse si llega correo nuevo entre el search y el fetch.
    const searchResult = await client.search(searchQuery, { uid: true });
    const uids = Array.isArray(searchResult) ? searchResult : [];
    if (uids.length === 0) return [];

    const targetUids = uids.slice(-limit);
    const emails: FetchedEmail[] = [];

    for await (const message of client.fetch(
      targetUids,
      {
        uid: true,
        envelope: true,
        source: true,
        flags: true,
      },
      { uid: true }
    )) {
      if (!message.source) continue;

      const parsed = await simpleParser(message.source);
      const text = (parsed.text || "").trim();
      const html = typeof parsed.html === "string" ? parsed.html.trim() : "";
      const body = text || html;
      if (!body) continue;

      const fromAddress =
        normalizeAddress(parsed.from?.value?.[0]?.address) ||
        normalizeAddress(message.envelope?.from?.[0]?.address) ||
        "unknown@example.com";

      const toAddress =
        extractToAddress(parsed.to) ||
        normalizeAddress(message.envelope?.to?.[0]?.address) ||
        options.user;

      const subject = (parsed.subject || message.envelope?.subject || "").trim();

      emails.push({
        messageId: parsed.messageId || `${message.uid}`,
        from: fromAddress,
        to: toAddress,
        subject,
        body,
        date: toDate(parsed.date || message.envelope?.date),
      });
    }

    return emails;
  } finally {
    lock.release();
    try {
      await client.logout();
    } catch {
      // El cierre limpio es best-effort: no debe tumbar la sincronizacion.
      client.close();
    }
  }
}




