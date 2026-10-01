import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Publishable values (safe to ship); override per environment with VITE_* vars.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://ijfjncsdkhnqpjdgjupo.supabase.co";
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_TUIzr6wsu8QgUUhSZ16uSw_ICDx7ltA";

let client: SupabaseClient | undefined;

/**
 * Browser-only client (pages are pre-rendered on the server, where there is no session).
 * Implicit flow so a password-reset link works even when opened on a different device than
 * the one that requested it (PKCE would need the same browser).
 */
export function supabase(): SupabaseClient {
  if (typeof window === "undefined") throw new Error("supabase() is browser-only");
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storageKey: "tsc-auth", flowType: "implicit", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
