import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnvUrl } from "./env";

// Admin client is only used in trusted server contexts (cron/maintenance routes).
export const getSupabaseAdmin = () => {
  const supabaseUrl = getSupabaseEnvUrl();
  const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
};


