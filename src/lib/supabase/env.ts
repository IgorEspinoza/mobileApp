/**
 * Normaliza la URL del proyecto de Supabase.
 *
 * Supabase (Kong) responde `Invalid path specified in request URL` cuando la
 * URL base termina en "/" o incluye un path extra (ej. `/rest/v1`), porque las
 * peticiones quedan como `https://xxx.supabase.co//auth/v1/signup`.
 */
export function normalizeSupabaseUrl(rawUrl: string | undefined): string {
  const value = (rawUrl ?? "").trim().replace(/^["']|["']$/g, "");
  if (!value) return "";

  try {
    const url = new URL(value);
    // Solo conservamos protocolo + host: cualquier path/query sobra.
    return `${url.protocol}//${url.host}`;
  } catch {
    // Fallback: al menos quitamos las barras finales.
    return value.replace(/\/+$/, "");
  }
}

export function getSupabaseEnvUrl(): string {
  return normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseEnvAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

