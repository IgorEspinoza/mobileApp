import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvAnonKey, getSupabaseEnvUrl } from "./env";

const supabaseUrl = getSupabaseEnvUrl();
const supabaseAnonKey = getSupabaseEnvAnonKey();

let cachedClient: SupabaseClient | null = null;

/**
 * Crea (una sola vez) el cliente de Supabase para el navegador.
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
    cachedClient = createClient(supabaseUrl, supabaseAnonKey);
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
