import type { ExpenseCategory } from "@/types/database";

/**
 * Clasificador de comercios por reglas.
 *
 * Cubre los comercios mas habituales en Chile para no depender de la IA
 * (coste 0). Si ninguna regla acierta, `classifyMerchant` devuelve confianza
 * baja y el llamador puede escalar a OpenAI o dejarlo en "Otros" para que el
 * usuario lo corrija en la bandeja de revision.
 */

type MerchantRule = {
  category: ExpenseCategory;
  /** Palabras clave normalizadas (sin tildes, minusculas) */
  keywords: string[];
};

/**
 * El orden importa: la primera regla que coincida gana.
 * Las categorias mas especificas van antes que las genericas.
 */
const MERCHANT_RULES: MerchantRule[] = [
  {
    category: "Supermercado",
    keywords: [
      "lider", "jumbo", "tottus", "santa isabel", "unimarc", "acuenta",
      "ekono", "mayorista 10", "alvi", "superbodega", "walmart", "erbi",
      "oxxo", "ok market", "big john", "supermercado", "minimarket",
    ],
  },
  {
    category: "Delivery",
    keywords: [
      "uber eats", "ubereats", "rappi", "pedidosya", "pedidos ya", "justo",
      "cornershop", "didi food", "didifood", "fazil", "delivery",
    ],
  },
  {
    category: "Comida Fuera",
    keywords: [
      "mcdonald", "burger king", "kfc", "subway", "starbucks", "juan maestro",
      "doggis", "telepizza", "papa john", "domino", "pizza hut", "sushi",
      "restaurant", "restaurante", "cafe", "cafeteria", "bar ", "pub",
      "dunkin", "tarragona", "fuente alemana", "castano", "pollo",
    ],
  },
  {
    category: "Transporte",
    keywords: [
      "uber", "cabify", "didi", "beat", "copec", "shell", "petrobras", "aramco",
      "bencina", "combustible", "autopista", "costanera norte", "vespucio",
      "autopista central", "tag", "metro de santiago", "bip", "red movilidad",
      "estacionamiento", "parking", "latam", "sky airline", "jetsmart",
      "turbus", "pullman", "peaje",
    ],
  },
  {
    category: "Salud",
    keywords: [
      "farmacia", "cruz verde", "salcobrand", "ahumada", "dr simi",
      "clinica", "hospital", "consultorio", "isapre", "fonasa", "banmedica",
      "colmena", "cruz blanca", "nueva masvida", "dental", "optica",
      "laboratorio", "megasalud", "integramedica", "redsalud",
    ],
  },
  {
    category: "Tecnología",
    keywords: [
      "pc factory", "spdigital", "sp digital", "apple", "samsung", "xiaomi",
      "microsoft", "google storage", "google one", "dropbox", "github",
      "openai", "chatgpt", "anthropic", "claude", "adobe", "notion",
      "jetbrains", "digitalocean", "aws", "amazon web", "vercel", "supabase",
      "cloudflare", "namecheap", "godaddy", "hosting", "dominio",
    ],
  },
  {
    category: "Entretenimiento",
    keywords: [
      "netflix", "spotify", "disney", "hbo", "max ", "prime video", "amazon prime",
      "youtube premium", "twitch", "steam", "playstation", "psn", "xbox",
      "nintendo", "epic games", "riot games", "cinemark", "cineplanet",
      "cinepolis", "hoyts", "puntoticket", "ticketmaster", "passline",
      "crunchyroll", "paramount", "apple tv", "deezer", "tidal",
    ],
  },
  {
    category: "Servicios",
    keywords: [
      "entel", "movistar", "wom", "claro", "vtr", "gtd", "mundo pacifico",
      "mundo ", "enel", "cge", "saesa", "frontel", "chilquinta",
      "aguas andinas", "essbio", "esval", "nuevosur", "smapa",
      "metrogas", "lipigas", "abastible", "gasco", "gas ",
      "seguro", "seguros", "mapfre", "consorcio", "metlife", "sura",
      "banco", "comision", "mantencion cuenta", "notaria", "registro civil",
    ],
  },
  {
    category: "Arriendo",
    keywords: ["arriendo", "alquiler", "renta depto", "canon arriendo"],
  },
  {
    category: "Gastos Comunes",
    keywords: [
      "gastos comunes", "gasto comun", "administracion edificio",
      "condominio", "comunidad edificio",
    ],
  },
  {
    category: "Hogar",
    keywords: [
      "sodimac", "easy", "construmart", "imperial", "homecenter", "ikea",
      "casa ideal", "hites", "abcdin", "la polar", "corona", "tricot",
      "falabella", "paris", "ripley", "h&m", "zara", "decathlon",
      "mueble", "ferreteria",
    ],
  },
  {
    category: "Otros",
    keywords: [
      "mercado pago", "mercadopago", "mercado libre", "mercadolibre",
      "aliexpress", "amazon", "shein", "temu", "paypal", "transferencia",
    ],
  },
];

/** Quita tildes y pasa a minusculas para comparar de forma robusta. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export type MerchantClassification = {
  category: ExpenseCategory;
  confidence: number;
  matchedKeyword: string | null;
};

/**
 * Deduce la categoria a partir del nombre del comercio (y opcionalmente del
 * asunto/cuerpo del correo, que aportan contexto adicional).
 */
export function classifyMerchant(
  merchant: string,
  extraContext = ""
): MerchantClassification {
  const haystack = normalizeText(`${merchant} ${extraContext}`);

  if (!haystack) {
    return { category: "Otros", confidence: 0, matchedKeyword: null };
  }

  const normalizedMerchant = normalizeText(merchant);

  for (const rule of MERCHANT_RULES) {
    for (const keyword of rule.keywords) {
      if (!haystack.includes(keyword)) continue;

      // Mas confianza si la coincidencia esta en el nombre del comercio
      // que si solo aparece en el cuerpo del correo.
      const inMerchant = normalizedMerchant.includes(keyword);
      const confidence = inMerchant ? 0.95 : 0.7;

      return { category: rule.category, confidence, matchedKeyword: keyword };
    }
  }

  return { category: "Otros", confidence: 0.2, matchedKeyword: null };
}

/** Lista de categorias validas, util para validar correcciones manuales. */
export const VALID_CATEGORIES: ExpenseCategory[] = [
  "Arriendo",
  "Gastos Comunes",
  "Supermercado",
  "Transporte",
  "Delivery",
  "Comida Fuera",
  "Salud",
  "Tecnología",
  "Entretenimiento",
  "Hogar",
  "Servicios",
  "Otros",
];

