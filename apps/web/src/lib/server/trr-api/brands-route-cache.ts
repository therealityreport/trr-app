import { parseCacheTtlMs } from "@/lib/server/admin/route-response-cache";

export const BRANDS_PROFILE_CACHE_NAMESPACE = "admin-brands-profile";
export const BRANDS_PROFILE_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_BRANDS_PROFILE_CACHE_TTL_MS,
  10_000,
);

export const BRANDS_LOGOS_CACHE_NAMESPACE = "admin-brands-logos";
export const BRANDS_LOGOS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_BRANDS_LOGOS_CACHE_TTL_MS,
  15_000,
);

export const BRANDS_SHOWS_FRANCHISES_CACHE_NAMESPACE = "admin-brands-shows-franchises";
export const BRANDS_SHOWS_FRANCHISES_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_BRANDS_SHOWS_FRANCHISES_CACHE_TTL_MS,
  15_000,
);
