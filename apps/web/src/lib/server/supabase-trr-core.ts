import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for TRR Core API (core schema).
 *
 * Uses service role key for admin-only access to core.shows, core.seasons,
 * core.episodes, core.show_cast, core.people, etc.
 *
 * NEVER import this in client components - it contains privileged credentials.
 *
 * Prerequisites on TRR API Supabase project:
 * - `core` schema must be in "Exposed schemas" (API Settings)
 * - `service_role` must have grants on `core.*` tables/views
 */

const getTrrCoreUrl = (): string => {
  const url = process.env.TRR_CORE_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "TRR_CORE_SUPABASE_URL is not set. This is required for TRR API access."
    );
  }
  return url;
};

const getTrrCoreServiceKey = (): string => {
  // First try TRR-specific key, then fall back to general Supabase service role key
  // (since TRR Core API may be on the same Supabase project)
  const key =
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "TRR_CORE_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not set. This is required for TRR API access."
    );
  }
  return key;
};

// Lazy initialization to avoid errors when env vars aren't set (e.g., in tests)
let client: ReturnType<typeof createClient> | null = null;

export const getSupabaseTrrCore = () => {
  if (!client) {
    const options = {
      db: { schema: "core" },
      auth: {
        // Disable auth features since we're using service role
        persistSession: false,
        autoRefreshToken: false,
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client = createClient(getTrrCoreUrl(), getTrrCoreServiceKey(), options as any);
  }
  return client;
};

// Export a convenience alias
export const supabaseTrrCore = {
  get client() {
    return getSupabaseTrrCore();
  },
};
