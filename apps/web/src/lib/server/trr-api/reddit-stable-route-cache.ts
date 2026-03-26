import "server-only";

import {
  buildUserScopedRouteCacheKey,
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  parseCacheTtlMs,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";

export const REDDIT_STABLE_LIST_CACHE_NAMESPACE = "admin-reddit-stable-list";
export const REDDIT_STABLE_DETAIL_CACHE_NAMESPACE = "admin-reddit-stable-detail";
export const REDDIT_STABLE_SUMMARY_CACHE_NAMESPACE = "admin-reddit-stable-summary";

export const REDDIT_STABLE_LIST_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_REDDIT_STABLE_LIST_CACHE_TTL_MS,
  5_000,
);

export const REDDIT_STABLE_DETAIL_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_REDDIT_STABLE_DETAIL_CACHE_TTL_MS,
  10_000,
);

export const REDDIT_STABLE_SUMMARY_CACHE_TTL_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_REDDIT_STABLE_SUMMARY_CACHE_TTL_MS,
  5_000,
);

export async function getCachedStableRead<T>({
  namespace,
  cacheKey,
  promiseKey,
  ttlMs,
  forceRefresh = false,
  loader,
}: {
  namespace: string;
  cacheKey: string;
  promiseKey?: string;
  ttlMs: number;
  forceRefresh?: boolean;
  loader: () => Promise<T>;
}): Promise<{ payload: T; cacheHit: boolean }> {
  if (!forceRefresh) {
    const cached = getRouteResponseCache<T>(namespace, cacheKey);
    if (cached) {
      return { payload: cached, cacheHit: true };
    }
  }

  const resolved = await getOrCreateRouteResponsePromise(
    namespace,
    promiseKey ?? cacheKey,
    loader,
  );

  if (!forceRefresh) {
    setRouteResponseCache(namespace, cacheKey, resolved, ttlMs);
  }

  return { payload: resolved, cacheHit: false };
}

export { buildUserScopedRouteCacheKey };

