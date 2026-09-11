import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnvAnonKey, getSupabaseEnvUrl } from "./env";

const supabaseUrl = getSupabaseEnvUrl();
const supabaseAnonKey = getSupabaseEnvAnonKey();

// Para Route Handlers y Server Components (Next.js App Router)
export const createServerClient = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }

  const cookieStore = await cookies();
  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // En Server Components el set puede fallar (es OK en lectura)
        }
      },
    },
  });
};

