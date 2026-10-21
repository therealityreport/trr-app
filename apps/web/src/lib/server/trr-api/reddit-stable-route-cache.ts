import "server-only";

import {
  buildUserScopedRouteCacheKey,
  parseCacheTtlMs,
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

/** Canonical Reddit content must reflect lifecycle redactions on every read.
 * Keep the route adapter signature while bypassing both response caches and
 * shared in-flight reads; local invalidation cannot cover other app processes.
 */
export async function getCachedStableRead<T>({ loader }: {
  namespace: string;
  cacheKey: string;
  promiseKey?: string;
  ttlMs: number;
  forceRefresh?: boolean;
  loader: () => Promise<T>;
}): Promise<{ payload: T; cacheHit: boolean }> {
  return { payload: await loader(), cacheHit: false };
}

export { buildUserScopedRouteCacheKey };

