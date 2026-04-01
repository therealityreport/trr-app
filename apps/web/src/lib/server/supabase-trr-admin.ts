import "server-only";

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
