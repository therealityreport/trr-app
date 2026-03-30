import "server-only";
import { createClient } from "@supabase/supabase-js";

export const getTrrAdminUrl = (): string => {
  const url = process.env.TRR_CORE_SUPABASE_URL;
  if (!url) {
    throw new Error("TRR_CORE_SUPABASE_URL is not set. This is required for TRR admin data access.");
  }
  return url;
};

export const getTrrAdminServiceKey = (): string => {
  const canonicalKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
  if (canonicalKey) {
    return canonicalKey;
  }
  throw new Error(
    "TRR_CORE_SUPABASE_SERVICE_ROLE_KEY is not set. This is required for TRR admin data access.",
  );
};

// Keep this client loosely typed to avoid pulling the entire PostgREST type surface
// into server-only admin routes that only need runtime access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;

export const getSupabaseTrrAdmin = () => {
  if (!client) {
    client = createClient(getTrrAdminUrl(), getTrrAdminServiceKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }
  return client;
};

export const supabaseTrrAdmin = {
  get client() {
    return getSupabaseTrrAdmin();
  },
};
