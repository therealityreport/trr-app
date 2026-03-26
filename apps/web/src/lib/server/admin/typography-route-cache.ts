import {
  invalidateRouteResponseCache,
  parseCacheTtlMs,
} from "@/lib/server/admin/route-response-cache";

export const TYPOGRAPHY_ADMIN_CACHE_NAMESPACE = "admin-typography-state";
export const TYPOGRAPHY_PUBLIC_CACHE_NAMESPACE = "public-typography-state";
export const TYPOGRAPHY_ADMIN_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_TYPOGRAPHY_CACHE_TTL_MS,
  30_000,
);
export const TYPOGRAPHY_PUBLIC_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_PUBLIC_TYPOGRAPHY_CACHE_TTL_MS,
  30_000,
);

export function invalidateTypographyRouteCaches(): void {
  invalidateRouteResponseCache(TYPOGRAPHY_ADMIN_CACHE_NAMESPACE);
  invalidateRouteResponseCache(TYPOGRAPHY_PUBLIC_CACHE_NAMESPACE);
}
