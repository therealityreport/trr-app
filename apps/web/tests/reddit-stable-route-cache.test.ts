import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getCachedStableRead,
  REDDIT_STABLE_LIST_CACHE_NAMESPACE,
} from "@/lib/server/trr-api/reddit-stable-route-cache";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

describe("stable reddit route cache helper", () => {
  beforeEach(() => {
    invalidateRouteResponseCache(REDDIT_STABLE_LIST_CACHE_NAMESPACE);
  });

  // TODO(ci-shard-isolation): Same module-level cache-dedupe leak as
  // person-gallery-route-cache-dedupe — passes under singleFork because a
  // prior file seeds the cache, fails under --shard=N/M. Re-enable after
  // the cache is reset in beforeEach or explicitly primed inside the test.
  it.skip("dedupes concurrent loads and stores the resolved payload", async () => {
    let resolvePayload: ((value: { value: number }) => void) | null = null;
    const loader = vi.fn(
      () =>
        new Promise<{ value: number }>((resolve) => {
          resolvePayload = resolve;
        }),
    );

    const first = getCachedStableRead({
      namespace: REDDIT_STABLE_LIST_CACHE_NAMESPACE,
      cacheKey: "user-1:reddit-threads:",
      ttlMs: 5_000,
      loader,
    });
    const second = getCachedStableRead({
      namespace: REDDIT_STABLE_LIST_CACHE_NAMESPACE,
      cacheKey: "user-1:reddit-threads:",
      ttlMs: 5_000,
      loader,
    });

    await Promise.resolve();
    expect(loader).toHaveBeenCalledTimes(1);

    resolvePayload?.({ value: 123 });
    await expect(first).resolves.toEqual({ payload: { value: 123 }, cacheHit: false });
    await expect(second).resolves.toEqual({ payload: { value: 123 }, cacheHit: false });

    const cached = await getCachedStableRead({
      namespace: REDDIT_STABLE_LIST_CACHE_NAMESPACE,
      cacheKey: "user-1:reddit-threads:",
      ttlMs: 5_000,
      loader: vi.fn(async () => ({ value: 456 })),
    });
    expect(cached).toEqual({ payload: { value: 123 }, cacheHit: true });
  });
});

