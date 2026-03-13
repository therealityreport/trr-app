import "server-only";
import { createClient } from "@supabase/supabase-js";

const getTrrAdminUrl = (): string => {
  const url = process.env.TRR_CORE_SUPABASE_URL;
  if (!url) {
    throw new Error("TRR_CORE_SUPABASE_URL is not set. This is required for TRR admin data access.");
  }
  return url;
};

const getTrrAdminServiceKey = (): string => {
  const key = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "TRR_CORE_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not set. This is required for TRR admin data access.",
    );
  }
  return key;
};

let client: ReturnType<typeof createClient> | null = null;

export const getSupabaseTrrAdmin = () => {
  if (!client) {
    client = createClient(getTrrAdminUrl(), getTrrAdminServiceKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
};

export const supabaseTrrAdmin = {
  get client() {
    return getSupabaseTrrAdmin();
  },
};
