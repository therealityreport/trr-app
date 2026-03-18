import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

let client: ReturnType<typeof createSupabaseClient> | null = null;

let warnedMissing = false;

/**
 * Shared browser-safe Supabase client (singleton).
 *
 * Uses NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY when available,
 * falling back to SUPABASE_URL / SUPABASE_ANON_KEY for local dev.
 *
 * Returns `null` when env vars are missing so callers can degrade gracefully
 * instead of crashing the component tree.
 */
export function createClient(): ReturnType<typeof createSupabaseClient> | null {
  if (!client) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      if (!warnedMissing) {
        console.warn(
          "[supabase] Client not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
            "Supabase-backed features will be unavailable.",
        );
        warnedMissing = true;
      }
      return null;
    }
    client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
}
