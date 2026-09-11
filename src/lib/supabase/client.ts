import { createBrowserClient } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvAnonKey, getSupabaseEnvUrl } from "./env";

const supabaseUrl = getSupabaseEnvUrl();
const supabaseAnonKey = getSupabaseEnvAnonKey();

let cachedClient: SupabaseClient | null = null;

/**
 * Crea (una sola vez) el cliente de Supabase para el navegador.
 *
 * IMPORTANTE: usamos `createBrowserClient` de `@supabase/ssr` y no
 * `createClient` de `@supabase/supabase-js`. El login se realiza en el servidor
 * (`/api/auth/login`), que persiste la sesion en COOKIES. `createClient` guarda
 * la sesion en localStorage, por lo que el navegador no veia la sesion creada
 * por el servidor: `getSession()` devolvia null y la UI mostraba
 * "Usuario / Sin email" ademas de fallar las consultas protegidas por RLS.
 *
 * Se valida de forma perezosa para no romper el prerender del build
 * cuando las variables aun no estan disponibles.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }

  if (!cachedClient) {
    cachedClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return cachedClient;
}

/**
 * Proxy que mantiene la API `supabase.auth...` pero difiere la
 * creacion del cliente hasta el primer uso real.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const getSupabaseUrl = () => supabaseUrl;
export const getSupabaseAnonKey = () => supabaseAnonKey;
