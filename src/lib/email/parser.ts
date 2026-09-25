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
  /** Para ingresos: tipo de fuente (salary, transfer, deposit, refund, other). */
  incomeSource?: "salary" | "transfer" | "deposit" | "refund" | "other";
};

/* ------------------------------------------------------------------ *
 * Remitentes reconocidos
 * ------------------------------------------------------------------ */

type SenderRule = { source: string; domains: string[] };

const KNOWN_SENDERS: SenderRule[] = [
  { source: "banco_chile", domains: ["bancochile.cl", "banchile.cl", "notificaciones.bancochile.cl", "email.bancochile.cl"] },
  { source: "santander", domains: ["santander.cl"] },
  { source: "bci", domains: ["bci.cl", "mach.cl"] },
  { source: "estado", domains: ["bancoestado.cl", "bancoestado.com", "notificaciones.bancoestado.cl"] },
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
  /(?:por|monto|total|valor|importe|pago)\s*(?:de)?\s*:?\s*\$?\s*([\d.,]+)/i,
  // Monto cerca de keywords transaccionales (cargo en cuenta, compra, etc.)
  // Captura "cargo en tu cuenta corriente por $163.037" o "cargo ... 163.037"
  /(?:cargo|carga|compra|pago|abono|transferencia|debito|giro)(?:[^\d$]{0,80})\$?\s*([\d]{1,3}(?:[.,]\d{3})+)/i,
  // Fallback: numero con formato CLP (puntos como separador de miles, >= 1.000)
  // captura "50.000", "163.037" aunque no tenga $ ni keyword delante.
  /(?:^|\s)(\d{1,3}(?:\.\d{3})+)(?:\s|$)/m,
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

/**
 * Patrones prioritarios: cuando el correo tiene un "total pagado" o similar,
 * ese es el monto real (incluye cargos por servicio, intereses, etc.).
 */
const TOTAL_PAID_PATTERNS: RegExp[] = [
  /total\s+pagado\s*:?\s*\$?\s*([\d.,]+)/i,
  /total\s+a\s+pagar\s*:?\s*\$?\s*([\d.,]+)/i,
  /total\s+cobrado\s*:?\s*\$?\s*([\d.,]+)/i,
  /total\s+cargo\s*:?\s*\$?\s*([\d.,]+)/i,
  /monto\s+total\s*:?\s*\$?\s*([\d.,]+)/i,
  /valor\s+total\s*:?\s*\$?\s*([\d.,]+)/i,
  /total\s+transaccion\s*:?\s*\$?\s*([\d.,]+)/i,
];

function extractAmount(text: string): { amount: number; currency: string } | null {
  const currency = /US\$|USD|dolar/i.test(text) ? "USD" : "CLP";
  const searchable = stripNonTransactionAmounts(text);

  // Prioridad: si existe un "total pagado" explicito, ese es el monto real.
  for (const pattern of TOTAL_PAID_PATTERNS) {
    const match = searchable.match(pattern);
    if (!match?.[1]) continue;

    const amount = parseAmount(match[1]);
    if (amount !== null) return { amount, currency };
  }

  // Fallback: patrones genericos.
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
  // Tenpo y otros ponen "Comercio:\n  NOMBRE" (valor en la linea siguiente).
  /comercio:\s*\n+\s*([^\n,.]{3,40})/i,
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
  // Palabras comunes en textos de correos bancarios que no son comercios.
  "reflejarse", "verificar", "historial", "movimientos", "seguridad",
  "minutos", "exitoso", "exitosa", "comprobante", "detalle", "detalles",
  "tu saldo", "el saldo", "tu pago", "el pago",
  "tu credito", "tu debito", "tu prepago",
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
  "consumo", "debito", "suscripcion", "cobro", "cargo en cuenta",
  "cargo en tu cuenta", "descuento", "retiro",
];

const INCOME_HINTS = [
  "abono", "deposito", "transferencia recibida", "recibiste",
  "te transfirieron", "remuneracion", "sueldo", "acreditacion",
  "devolucion", "reembolso", "pago recibido",
  // Depósitos y TEF
  "deposito recibido", "tef recibida", "transferencia entrante",
  "abono en cuenta", "se ha depositado", "has recibido una transferencia",
  "te han transferido", "ingreso en cuenta", "abono recibido",
  "recibiste una transferencia", "deposito a tu cuenta",
  // Liquidaciones de sueldo
  "liquidacion de sueldo", "liquidacion de remuneraciones",
  "liquidacion mensual", "tu liquidacion", "comprobante de remuneracion",
  "pago de remuneracion", "pago de sueldo", "haberes",
  "tu sueldo ha sido depositado", "remuneracion depositada",
  "pago nomina", "anticipo de sueldo",
];

/** Mapeo de hints a tipo de fuente de ingreso. */
const INCOME_SOURCE_MAP: Record<string, "salary" | "transfer" | "deposit" | "refund"> = {
  // Sueldos
  "remuneracion": "salary", "sueldo": "salary",
  "liquidacion de sueldo": "salary", "liquidacion de remuneraciones": "salary",
  "liquidacion mensual": "salary", "tu liquidacion": "salary",
  "comprobante de remuneracion": "salary", "pago de remuneracion": "salary",
  "pago de sueldo": "salary", "haberes": "salary",
  "tu sueldo ha sido depositado": "salary", "remuneracion depositada": "salary",
  "pago nomina": "salary", "anticipo de sueldo": "salary",
  // Transferencias
  "transferencia recibida": "transfer", "recibiste": "transfer",
  "te transfirieron": "transfer", "tef recibida": "transfer",
  "transferencia entrante": "transfer", "has recibido una transferencia": "transfer",
  "te han transferido": "transfer", "recibiste una transferencia": "transfer",
  // Depósitos
  "deposito": "deposit", "deposito recibido": "deposit",
  "abono en cuenta": "deposit", "se ha depositado": "deposit",
  "ingreso en cuenta": "deposit", "abono recibido": "deposit",
  "deposito a tu cuenta": "deposit", "abono": "deposit",
  "acreditacion": "deposit",
  // Devoluciones
  "devolucion": "refund", "reembolso": "refund", "pago recibido": "refund",
};

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
/**
 * Un correo es ignorable solo si el ASUNTO indica que es informativo
 * (estado de cuenta, promocion, etc.). Si las palabras clave de descarte
 * aparecen solo en el cuerpo (ej. "Saldo disponible: $X" al pie de un
 * aviso de cargo), el correo NO se descarta: las frases de saldo en el
 * cuerpo se eliminan mas adelante para que no contaminen la extraccion
 * del monto de la transaccion.
 */
function isIgnorable(text: string): boolean {
  const normalized = normalizeText(text);

  // Separar asunto (primera linea) del cuerpo.
  const firstNewline = normalized.indexOf("\n");
  const subject = firstNewline >= 0 ? normalized.slice(0, firstNewline) : normalized;

  // Si el asunto contiene una palabra de descarte, es un correo informativo.
  if (IGNORE_HINTS.some((hint) => subject.includes(hint))) {
    return true;
  }

  // Si el asunto tiene keywords transaccionales, no ignorar aunque el cuerpo
  // mencione saldos o cupos.
  const hasTransactionInSubject = [...EXPENSE_HINTS, ...INCOME_HINTS].some(
    (hint) => subject.includes(hint)
  );
  if (hasTransactionInSubject) {
    return false;
  }

  // Sin keywords transaccionales en el asunto, revisar si el texto completo
  // es solo informativo (pero excluir "saldo/cupo disponible" que suelen
  // aparecer al pie de cualquier correo bancario).
  const BODY_SAFE_IGNORE_HINTS = IGNORE_HINTS.filter(
    (h) => !["saldo disponible", "cupo disponible"].includes(h)
  );
  return BODY_SAFE_IGNORE_HINTS.some((hint) => normalized.includes(hint));
}

type DetectTypeResult = {
  type: MovementType;
  incomeSource?: "salary" | "transfer" | "deposit" | "refund" | "other";
};

function detectType(text: string): DetectTypeResult {
  const normalized = normalizeText(text);

  // Buscar ingresos: verificar cada hint y mapear a su fuente.
  const matchedIncomeHint = INCOME_HINTS.find((hint) => normalized.includes(hint));
  if (matchedIncomeHint) {
    const incomeSource = INCOME_SOURCE_MAP[matchedIncomeHint] ?? "other";
    return { type: "income", incomeSource };
  }

  if (EXPENSE_HINTS.some((hint) => normalized.includes(hint))) {
    return { type: "expense" };
  }

  return { type: null };
}

/* ------------------------------------------------------------------ *
 * API principal
 * ------------------------------------------------------------------ */

/** Convierte HTML en texto plano legible para el parser. */
export function htmlToText(html: string): string {
  return html
    // Eliminar contenido no visible.
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    // Comentarios HTML (bancos meten metadata aqui).
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Saltos de linea semanticos.
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    // Separar celdas de tabla con espacio (no newline) para mantener
    // "Monto $50.000" en la misma linea cuando estan en <td> adyacentes.
    .replace(/<\/td>/gi, " ")
    // Atributos alt de imagenes (a veces el monto esta como alt text).
    .replace(/<img[^>]*alt=["']([^"']+)["'][^>]*>/gi, " $1 ")
    // Eliminar tags restantes.
    .replace(/<[^>]+>/g, " ")
    // Entidades HTML comunes.
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&dollar;/gi, "$")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&[a-zA-Z]+;/g, " ") // Cualquier otra entidad → espacio
    // Caracteres invisibles (zero-width spaces, BOM) que bancos insertan.
    .replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, "")
    // Normalizar whitespace.
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}


/** Decodifica entidades HTML que pueden aparecer en texto plano (mailparser a veces las deja). */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&dollar;/gi, "$")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&iacute;/gi, "í")
    .replace(/&aacute;/gi, "á")
    .replace(/&eacute;/gi, "é")
    .replace(/&oacute;/gi, "ó")
    .replace(/&uacute;/gi, "ú")
    .replace(/&ntilde;/gi, "ñ")
    .replace(/&iquest;/gi, "¿")
    .replace(/&iexcl;/gi, "¡")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&zwj;/gi, "")  // zero-width joiner — remove
    .replace(/&zwnj;/gi, "") // zero-width non-joiner — remove
    .replace(/&[a-zA-Z]+;/g, " "); // Cualquier otra entidad → espacio
}

/**
 * Analiza un correo y devuelve el movimiento detectado, o `null` si el correo
 * no corresponde a una transaccion (promociones, estados de cuenta, etc.).
 */
export function parsePurchaseEmail(email: ParsedEmail): ParsedMovement | null {
  const body = /<[a-z][\s\S]*>/i.test(email.body)
    ? htmlToText(email.body)
    : decodeHtmlEntities(email.body);

  const text = `${email.subject}\n${body}`;
  const source = detectSource(email.from) ?? "desconocido";

  // Un correo informativo (estado de cuenta, saldo, promocion) nunca es un
  // movimiento, aunque venga de un banco reconocido.
  if (isIgnorable(text)) return null;

  const { type, incomeSource } = detectType(text);

  const money = extractAmount(text);
  if (!money) return null;

  // Sanidad: en CLP, montos bajo $100 son casi siempre falsos positivos
  // (numeros sueltos capturados por las regex, no transacciones reales).
  if (money.currency === "CLP" && money.amount < 100) return null;

  const detectedMerchant = extractMerchant(email.subject, body);

  let movementType = type;
  if (!movementType) {
    // Fallback controlado: un correo de banco con monto solo se considera
    // gasto si ademas hay evidencia de transaccion (comercio identificado,
    // referencia a la tarjeta/cuenta, o keywords transaccionales en el texto).
    const looksTransactional = Boolean(detectedMerchant) || hasTransactionSignal(text);
    // Banco Chile y otros bancos usan "cargo en cuenta" sin mas detalle
    const hasTransactionKeyword = /(?:cargo|carga|compra|pago|debito|giro|transferencia|abono)\s+(?:en|a|de|por)/i.test(text);

    if (source !== "desconocido" && (looksTransactional || hasTransactionKeyword)) {
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

  const { category, confidence: merchantConfidence } = classifyMerchant(merchant, text.slice(0, 400));

  // Para ingresos, la confianza se basa en la deteccion de tipo, no en el merchant.
  let finalConfidence: number;
  if (movementType === "income") {
    // Base alta para ingresos detectados de bancos conocidos.
    const baseIncome = source !== "desconocido" ? 0.75 : 0.50;
    const salaryBonus = incomeSource === "salary" ? 0.20 : 0;
    const transferBonus = incomeSource === "transfer" || incomeSource === "deposit" ? 0.15 : 0;
    const refundBonus = incomeSource === "refund" ? 0.10 : 0;
    finalConfidence = Math.min(1, baseIncome + salaryBonus + transferBonus + refundBonus);
  } else {
    // Para gastos, usar la confianza del merchant + bonus por banco conocido.
    const sourceBonus = source !== "desconocido" ? 0.05 : 0;
    finalConfidence = Math.min(1, merchantConfidence + sourceBonus);
  }

  return {
    type: numInstallments ? "installment" : movementType,
    merchant,
    amount: money.amount,
    currency: money.currency,
    date: extractDate(text, email.date),
    numInstallments,
    category: movementType === "income" ? "Otros" : category,
    confidence: Number(finalConfidence.toFixed(2)),
    source,
    snippet: body.slice(0, 500),
    ...(movementType === "income" && { incomeSource: incomeSource ?? "other" }),
  };
}


/**
 * Versión de diagnóstico: en vez de devolver null, explica POR QUÉ el correo
 * no se reconoció como movimiento. Solo para el endpoint /api/email/diagnose.
 */
export function parsePurchaseEmailDebug(email: ParsedEmail): string | null {
  const body = /<[a-z][\s\S]*>/i.test(email.body)
    ? htmlToText(email.body)
    : decodeHtmlEntities(email.body);

  const text = `${email.subject}\n${body}`;
  const source = detectSource(email.from) ?? "desconocido";

  if (isIgnorable(text)) {
    return `Descartado: correo informativo (isIgnorable). Texto inicio: "${text.slice(0, 120)}"`;
  }

  const { type } = detectType(text);
  const money = extractAmount(text);

  if (!money) {
    // Mostrar qué texto se buscó para encontrar montos
    const searchable = stripNonTransactionAmounts(text);
    // Buscar cualquier cosa que parezca un número
    const numberMatches = searchable.match(/\$?\s*[\d.,]{3,}/g);
    return `Descartado: no se encontró monto. Números hallados: [${
      numberMatches ? numberMatches.slice(0, 5).map(m => m.trim()).join(", ") : "ninguno"
    }]. Texto (240 chars): "${searchable.slice(0, 240).replace(/\n/g, " | ")}"`;
  }

  if (money.currency === "CLP" && money.amount < 100) {
    return `Descartado: monto $${money.amount} muy bajo (< $100 CLP)`;
  }

  if (!type) {
    const detectedMerchant = extractMerchant(email.subject, body);
    const looksTransactional = Boolean(detectedMerchant) || hasTransactionSignal(text);
    const hasTransactionKeyword = /(?:cargo|carga|compra|pago|debito|giro|transferencia|abono)\s+(?:en|a|de|por)/i.test(text);

    if (source !== "desconocido" && (looksTransactional || hasTransactionKeyword)) {
      return null; // Se habría parseado correctamente
    }
    return `Descartado: tipo no detectado y sin señales transaccionales. Source: ${source}`;
  }

  return null; // Se habría parseado correctamente
}

/** Extrae el sufijo de un alias: "igor+ana@gmail.com" -> "ana". */
export function extractAliasTag(address: string): string | null {
  const match = address.match(/\+([^@>\s]+)@/);
  return match?.[1]?.toLowerCase() ?? null;
}

