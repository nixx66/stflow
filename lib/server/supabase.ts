import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerRuntimeConfig } from "./runtimeConfig.ts";

let admin: SupabaseClient | undefined;

export function getSupabaseAdmin() {
  if (admin) return admin;

  const config = getServerRuntimeConfig(process.env);
  admin = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );

  return admin;
}
