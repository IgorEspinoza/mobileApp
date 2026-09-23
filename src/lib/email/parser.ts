import type { ExpenseCategory } from "@/types/database";
import { classifyMerchant, normalizeText } from "./merchantRules";

/**
 * Parser de correos de compras (bancos y billeteras chilenas).
 *
 * Convierte un correo en un movimiento estructurado. No escribe en base de
 * datos: devuelve el resultado para que el llamador lo guarde como
 * `expense_classifications` pendiente de aprobacion del usuario.
 */

export type ParsedEmail = {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: Date;
};

export type ParsedMovement = {
  type: "expense" | "income" | "installment";
  merchant: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  numInstallments: number | null;
  category: ExpenseCategory;
  confidence: number;
  source: string;
  snippet: string;
};

/* ------------------------------------------------------------------ *
 * Remitentes reconocidos
 * ------------------------------------------------------------------ */

type SenderRule = { source: string; domains: string[] };

const KNOWN_SENDERS: SenderRule[] = [
  { source: "banco_chile", domains: ["bancochile.cl", "banchile.cl"] },
  { source: "santander", domains: ["santander.cl"] },
  { source: "bci", domains: ["bci.cl", "mach.cl"] },
  { source: "estado", domains: ["bancoestado.cl", "bancoestado.com"] },
  { source: "itau", domains: ["itau.cl"] },
  { source: "scotiabank", domains: ["scotiabank.cl"] },
  { source: "falabella", domains: ["falabella.cl", "bancofalabella.cl", "cmr.cl"] },
  { source: "ripley", domains: ["ripley.cl", "bancoripley.cl"] },
  { source: "security", domains: ["security.cl"] },
  { source: "bice", domains: ["bice.cl"] },
  { source: "consorcio", domains: ["consorcio.cl"] },
  { source: "tenpo", domains: ["tenpo.cl"] },
  { source: "mercado_pago", domains: ["mercadopago.com", "mercadolibre.com"] },
  { source: "paypal", domains: ["paypal.com"] },
  { source: "transbank", domains: ["transbank.cl", "onepay.cl", "webpay.cl"] },
];

/** Identifica el banco/billetera emisor a partir del remitente. */
export function detectSource(from: string): string | null {
  const normalized = from.toLowerCase();
  for (const rule of KNOWN_SENDERS) {
    if (rule.domains.some((domain) => normalized.includes(domain))) {
      return rule.source;
    }
  }
  return null;
}

/** Nombre legible del emisor, usado cuando no se detecta el comercio. */
const SOURCE_LABELS: Record<string, string> = {
  banco_chile: "Banco de Chile",
  santander: "Santander",
  bci: "BCI",
  estado: "BancoEstado",
  itau: "Itaú",
  scotiabank: "Scotiabank",
  falabella: "Banco Falabella",
  ripley: "Banco Ripley",
  security: "Banco Security",
  bice: "BICE",
  consorcio: "Consorcio",
  tenpo: "Tenpo",
  mercado_pago: "Mercado Pago",
  paypal: "PayPal",
  transbank: "Transbank",
};

/* ------------------------------------------------------------------ *
 * Montos
 * ------------------------------------------------------------------ */

/**
 * Convierte un monto chileno en numero.
 * Acepta "$12.345", "12.345", "$12.345,67", "CLP 12,345.67", "USD 19.99".
 */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;

  let value = raw.replace(/[^0-9.,]/g, "").trim();
  if (!value) return null;

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // El separador decimal es el que aparece mas a la derecha.
    if (lastComma > lastDot) {
      value = value.replace(/\./g, "").replace(",", ".");
    } else {
      value = value.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    const decimals = value.length - lastComma - 1;
    // "12,50" -> decimal ; "12,345" -> separador de miles
    value = decimals === 2 ? value.replace(",", ".") : value.replace(/,/g, "");
  } else if (lastDot > -1) {
    const decimals = value.length - lastDot - 1;
    // En CLP el punto casi siempre son miles ("12.345").
    if (decimals === 3) value = value.replace(/\./g, "");
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const AMOUNT_PATTERNS: RegExp[] = [
  // Signo $ explicito: la senal mas fiable de un monto en el correo.
  /\$\s*([\d.,]+)/,
  /(?:CLP|USD|UF)\s*\$?\s*([\d.,]+)/i,
  // Palabras clave + monto. "de" se quito como keyword porque es demasiado
  // comun en espanol y genera falsos positivos ("de 5 estrellas", "de 14 dias").
  /(?:por|monto|total|valor|importe|pago)\s*(?:de)?\s*\$?\s*([\d.,]+)/i,
];

/**
 * Frases cuyo monto NO es el de la transaccion (saldos, cupos, limites).
 * Se eliminan del texto antes de buscar el importe para no confundir, por
 * ejemplo, "Saldo disponible $500.000" con el valor de la compra.
 */
const NON_TRANSACTION_AMOUNT_PATTERNS: RegExp[] = [
  /(?:saldo|cupo|l[ií]mite|linea|l[ií]nea)\s+(?:disponible|total|actual|utilizado|de\s+cr[eé]dito)?\s*:?\s*\$?\s*[\d.,]+/gi,
  /(?:saldo|cupo)\s*:?\s*\$?\s*[\d.,]+/gi,
  /(?:deuda|total\s+facturado|pago\s+m[ií]nimo)\s*:?\s*\$?\s*[\d.,]+/gi,
];

function stripNonTransactionAmounts(text: string): string {
  let cleaned = text;
  for (const pattern of NON_TRANSACTION_AMOUNT_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  return cleaned;
}

function extractAmount(text: string): { amount: number; currency: string } | null {
  const currency = /US\$|USD|dolar/i.test(text) ? "USD" : "CLP";
  const searchable = stripNonTransactionAmounts(text);

  for (const pattern of AMOUNT_PATTERNS) {
    const match = searchable.match(pattern);
    if (!match?.[1]) continue;

    const amount = parseAmount(match[1]);
    if (amount !== null) return { amount, currency };
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Comercio
 * ------------------------------------------------------------------ */

// Nota: los charsets NO incluyen saltos de linea a proposito. Si los
// incluyeran, una coincidencia iniciada en el asunto podria "saltar" a la
// siguiente linea y capturar texto del cuerpo (ej. "cuotas Compra").
const MERCHANT_PATTERNS: RegExp[] = [
  /comercio:[ \t]*([^\n,.]{3,40})/i,
  /(?:establecimiento|tienda|negocio):[ \t]*([^\n,.]{3,40})/i,
  /\bpagaste[ \t]+\$?[\d.,]+[ \t]+(?:a|en)[ \t]+([^\n,.]{3,40})/i,
  /\ba[ \t]+favor[ \t]+de[ \t]+([^\n,.]{3,40})/i,
  /\ben[ \t]+(?:el[ \t]+)?(?:comercio[ \t]+)?["']?([A-Za-zÁÉÍÓÚÑáéíóúñ0-9&.\-* \t]{3,40}?)["']?[ \t]*(?:\.|,|\n|\bel\b|\bpor\b|\bcon\b|$)/i,
];

const MERCHANT_NOISE = [
  "tu tarjeta", "su tarjeta", "la tarjeta", "tarjeta", "cuenta corriente",
  "su cuenta", "tu cuenta", "cuenta", "linea de credito", "credito",
  "banco", "el extranjero", "chile", "pesos", "moneda nacional",
  "cuotas", "cuota", "compra", "cargo", "pago", "abono", "transaccion",
  "efectivo", "debito", "tu cuentarut", "cuentarut",
];

/** Palabras que, si aparecen, marcan el final del nombre del comercio. */
const MERCHANT_CUTOFFS = [
  /\bel\b[ \t]*\d{1,2}[/-]\d{1,2}/i, // "... el 09/09/2026"
  /\bel\b[ \t]+d[ií]a\b/i,
  /\bpor[ \t]+\$/i,
  /\ben[ \t]+\d{1,2}[ \t]+cuotas?/i,
  /\bcon[ \t]+tu\b/i,
  /\bterminada\b/i,
  /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/,
];

function cleanMerchant(raw: string): string {
  let merchant = raw.replace(/[ \t]+/g, " ").trim();

  // Corta la parte sobrante ("UBER EATS el 09/09/2026" -> "UBER EATS")
  for (const cutoff of MERCHANT_CUTOFFS) {
    const match = merchant.match(cutoff);
    if (match?.index !== undefined) {
      merchant = merchant.slice(0, match.index).trim();
    }
  }

  merchant = merchant
    .replace(/[*_]+/g, " ")
    .replace(/\s*[-–]\s*$/, "")
    .replace(/[ \t]+/g, " ")
    .trim();

  // Quita codigos de comercio tipo "SANTA ISABEL 1234"
  merchant = merchant.replace(/\s+\d{3,}$/, "").trim();

  // Un "comercio" puramente numerico casi siempre es el numero de tarjeta o
  // un codigo de referencia ("...terminada en 4821"), no un nombre real.
  if (/^[\d\s.,\-*#]+$/.test(merchant)) return "";

  const normalized = normalizeText(merchant);
  if (!merchant || MERCHANT_NOISE.includes(normalized)) return "";
  if (merchant.length < 3) return "";

  return merchant.slice(0, 60);
}

/**
 * Busca el comercio priorizando el cuerpo del correo (mas fiable) y usando
 * el asunto solo como respaldo.
 */
function extractMerchant(subject: string, body: string): string {
  for (const source of [body, subject]) {
    if (!source) continue;

    for (const pattern of MERCHANT_PATTERNS) {
      const match = source.match(pattern);
      if (!match?.[1]) continue;

      const merchant = cleanMerchant(match[1]);
      if (merchant) return merchant;
    }
  }
  return "";
}

/* ------------------------------------------------------------------ *
 * Cuotas
 * ------------------------------------------------------------------ */

const INSTALLMENT_PATTERNS: RegExp[] = [
  /en\s+(\d{1,2})\s+cuotas?/i,
  /(\d{1,2})\s+cuotas?\s+(?:de|sin|con)/i,
  /cuotas?:\s*(\d{1,2})/i,
];

function extractInstallments(text: string): number | null {
  for (const pattern of INSTALLMENT_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;

    const count = Number.parseInt(match[1], 10);
    if (Number.isFinite(count) && count > 1 && count <= 60) return count;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Fecha
 * ------------------------------------------------------------------ */

const DATE_PATTERNS: RegExp[] = [
  /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/,
  /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b/,
];

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function extractDate(text: string, fallback: Date): string {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    const day = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    let year = Number.parseInt(match[3], 10);
    if (year < 100) year += 2000;

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(parsed.getTime())) return toIsoDate(parsed);
    }
  }
  return toIsoDate(fallback);
}

/* ------------------------------------------------------------------ *
 * Tipo de movimiento
 * ------------------------------------------------------------------ */

const EXPENSE_HINTS = [
  "compra", "cargo", "carga", "pago", "pagaste", "giro", "transaccion",
  "consumo", "debito", "suscripcion", "cobro",
];

const INCOME_HINTS = [
  "abono", "deposito", "transferencia recibida", "recibiste",
  "te transfirieron", "remuneracion", "sueldo", "acreditacion",
  "devolucion", "reembolso", "pago recibido",
];

const IGNORE_HINTS = [
  "estado de cuenta", "newsletter", "promocion", "oferta", "concurso",
  "encuesta", "clave", "contrasena", "bloqueo", "phishing",
  "saldo disponible", "cupo disponible", "recordatorio de pago",
  "proximo vencimiento", "kino", "loto", "sorteo", "apuesta", "jackpot",
  // Avisos administrativos que suelen traer montos pero no son movimientos.
  "terminos y condiciones", "actualiza tus datos", "cambio de clave",
  "boletin informativo", "mantencion programada", "aviso legal",
  "politica de privacidad", "invitacion a", "te invitamos",
];

/**
 * Señales de que el correo describe una transaccion real y no un aviso
 * informativo: referencia a la tarjeta/cuenta usada o confirmacion explicita.
 */
const TRANSACTION_SIGNALS: RegExp[] = [
  /tarjeta\s+(?:de\s+)?(?:credito|debito)?\s*(?:terminada|terminado|que\s+termina|final)\s*(?:en)?\s*[\dx*]{3,}/i,
  /\*{2,}\s*\d{3,4}/, // "****1234"
  /(?:n[uú]mero|nro\.?|n°)\s*(?:de\s+)?(?:tarjeta|cuenta)\s*[\dx*]{3,}/i,
  /\b(?:autorizada|aprobada|realizada|exitosa|confirmada|efectuada)\b/i,
  /\bcomercio\b/i,
  /\ben\s+\d{1,2}\s+cuotas?\b/i,
];

function hasTransactionSignal(text: string): boolean {
  return TRANSACTION_SIGNALS.some((pattern) => pattern.test(text));
}

type MovementType = "expense" | "income" | "installment" | null;

/**
 * Correos informativos o promocionales que nunca son un movimiento, aunque
 * vengan de un banco reconocido (estados de cuenta, saldos, promociones).
 */
function isIgnorable(text: string): boolean {
  const normalized = normalizeText(text);
  return IGNORE_HINTS.some((hint) => normalized.includes(hint));
}

function detectType(text: string): MovementType {
  const normalized = normalizeText(text);

  if (INCOME_HINTS.some((hint) => normalized.includes(hint))) return "income";
  if (EXPENSE_HINTS.some((hint) => normalized.includes(hint))) return "expense";

  return null;
}

/* ------------------------------------------------------------------ *
 * API principal
 * ------------------------------------------------------------------ */

/** Convierte HTML en texto plano legible para el parser. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|td|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Analiza un correo y devuelve el movimiento detectado, o `null` si el correo
 * no corresponde a una transaccion (promociones, estados de cuenta, etc.).
 */
export function parsePurchaseEmail(email: ParsedEmail): ParsedMovement | null {
  const body = /<[a-z][\s\S]*>/i.test(email.body)
    ? htmlToText(email.body)
    : email.body;

  const text = `${email.subject}\n${body}`;
  const source = detectSource(email.from) ?? "desconocido";

  // Un correo informativo (estado de cuenta, saldo, promocion) nunca es un
  // movimiento, aunque venga de un banco reconocido.
  if (isIgnorable(text)) return null;

  const type = detectType(text);

  const money = extractAmount(text);
  if (!money) return null;

  // Sanidad: en CLP, montos bajo $100 son casi siempre falsos positivos
  // (numeros sueltos capturados por las regex, no transacciones reales).
  if (money.currency === "CLP" && money.amount < 100) return null;

  const detectedMerchant = extractMerchant(email.subject, body);

  let movementType = type;
  if (!movementType) {
    // Fallback controlado: un correo de banco con monto solo se considera
    // gasto si ademas hay evidencia de transaccion (comercio identificado o
    // referencia a la tarjeta/cuenta). Sin eso entrarian avisos informativos
    // que traen cifras pero no son movimientos reales.
    const looksTransactional = Boolean(detectedMerchant) || hasTransactionSignal(text);

    if (source !== "desconocido" && looksTransactional) {
      movementType = "expense";
    } else {
      return null;
    }
  }

  const numInstallments = movementType === "expense" ? extractInstallments(text) : null;

  let merchant = detectedMerchant;
  if (!merchant) {
    // Sin comercio identificable usamos el emisor como referencia.
    merchant = source !== "desconocido" ? SOURCE_LABELS[source] ?? source : "Sin detalle";
  }

  const { category, confidence } = classifyMerchant(merchant, text.slice(0, 400));

  // Un remitente bancario conocido da mas fiabilidad al resultado.
  const sourceBonus = source !== "desconocido" ? 0.05 : 0;

  return {
    type: numInstallments ? "installment" : movementType,
    merchant,
    amount: money.amount,
    currency: money.currency,
    date: extractDate(text, email.date),
    numInstallments,
    category: movementType === "income" ? "Otros" : category,
    confidence: Math.min(1, Number((confidence + sourceBonus).toFixed(2))),
    source,
    snippet: body.slice(0, 500),
  };
}

/** Extrae el sufijo de un alias: "igor+ana@gmail.com" -> "ana". */
export function extractAliasTag(address: string): string | null {
  const match = address.match(/\+([^@>\s]+)@/);
  return match?.[1]?.toLowerCase() ?? null;
}

