import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

let client: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Shared browser-safe Supabase client (singleton).
 *
 * Uses NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY when available,
 * falling back to SUPABASE_URL / SUPABASE_ANON_KEY for local dev.
 */
export function createClient() {
  if (!client) {
    if (!SUPABASE_URL) {
      throw new Error(
        "Supabase URL is not configured. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.",
      );
    }
    if (!SUPABASE_ANON_KEY) {
      throw new Error(
        "Supabase anon key is not configured. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.",
      );
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
