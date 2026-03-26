import {
  invalidateRouteResponseCache,
  parseCacheTtlMs,
} from "@/lib/server/admin/route-response-cache";

export const TRR_SEARCH_CACHE_NAMESPACE = "admin-trr-search";
export const TRR_SHOWS_CACHE_NAMESPACE = "admin-trr-shows";
export const TRR_SHOW_RESOLVE_SLUG_CACHE_NAMESPACE = "admin-trr-show-resolve-slug";
export const TRR_PEOPLE_HOME_CACHE_NAMESPACE = "admin-trr-people-home";
export const TRR_SHOW_DETAIL_CACHE_NAMESPACE = "admin-trr-show-detail";
export const TRR_SHOW_SEASONS_CACHE_NAMESPACE = "admin-trr-show-seasons";
export const TRR_SEASON_EPISODES_CACHE_NAMESPACE = "admin-trr-season-episodes";
export const TRR_SHOW_CAST_CACHE_NAMESPACE = "admin-trr-show-cast";
export const TRR_SEASON_CAST_CACHE_NAMESPACE = "admin-trr-season-cast";

export const TRR_SEARCH_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SEARCH_CACHE_TTL_MS,
  15_000,
);
export const TRR_SHOWS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SHOWS_CACHE_TTL_MS,
  15_000,
);
export const TRR_SHOW_RESOLVE_SLUG_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SHOW_RESOLVE_SLUG_CACHE_TTL_MS,
  60_000,
);
export const TRR_PEOPLE_HOME_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_PEOPLE_HOME_CACHE_TTL_MS,
  20_000,
);
export const TRR_SHOW_DETAIL_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SHOW_DETAIL_CACHE_TTL_MS,
  15_000,
);
export const TRR_SHOW_SEASONS_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SHOW_SEASONS_CACHE_TTL_MS,
  30_000,
);
export const TRR_SEASON_EPISODES_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SEASON_EPISODES_CACHE_TTL_MS,
  30_000,
);
export const TRR_SHOW_CAST_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SHOW_CAST_CACHE_TTL_MS,
  45_000,
);
export const TRR_SEASON_CAST_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SEASON_CAST_CACHE_TTL_MS,
  45_000,
);

export function invalidateTrrShowReadCaches(prefix?: string): void {
  for (const namespace of [
    TRR_SEARCH_CACHE_NAMESPACE,
    TRR_SHOWS_CACHE_NAMESPACE,
    TRR_SHOW_RESOLVE_SLUG_CACHE_NAMESPACE,
    TRR_PEOPLE_HOME_CACHE_NAMESPACE,
    TRR_SHOW_DETAIL_CACHE_NAMESPACE,
    TRR_SHOW_SEASONS_CACHE_NAMESPACE,
    TRR_SEASON_EPISODES_CACHE_NAMESPACE,
    TRR_SHOW_CAST_CACHE_NAMESPACE,
    TRR_SEASON_CAST_CACHE_NAMESPACE,
  ]) {
    invalidateRouteResponseCache(namespace, prefix);
  }
}
