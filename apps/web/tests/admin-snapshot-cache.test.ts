import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildAdminSnapshotCacheKey,
  getOrCreateAdminSnapshot,
  invalidateAdminSnapshotCache,
  invalidateAdminSnapshotFamilies,
} from "@/lib/server/admin/admin-snapshot-cache";

describe("admin snapshot cache", () => {
  beforeEach(() => {
    invalidateAdminSnapshotCache();
    vi.useRealTimers();
  });

  it("reuses fresh snapshots inside the ttl window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));
    const fetcher = vi.fn(async () => ({ ok: true }));
    const cacheKey = buildAdminSnapshotCacheKey({
      authPartition: "firebase-admin-1",
      pageFamily: "system-health",
    });

    const first = await getOrCreateAdminSnapshot({
      cacheKey,
      ttlMs: 2_500,
      fetcher,
    });
    const second = await getOrCreateAdminSnapshot({
      cacheKey,
      ttlMs: 2_500,
      fetcher,
    });

    expect(first.meta.cacheStatus).toBe("miss");
    expect(second.meta.cacheStatus).toBe("hit");
    expect(second.meta.cacheAgeMs).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent fetches for the same cache key", async () => {
    let resolveFetch: ((value: { ok: boolean }) => void) | null = null;
    const fetcher = vi.fn(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const cacheKey = buildAdminSnapshotCacheKey({
      authPartition: "firebase-admin-1",
      pageFamily: "season-social-analytics",
      query: new URLSearchParams({ season_id: "season-1", source_scope: "shared" }),
    });

    const firstPromise = getOrCreateAdminSnapshot({
      cacheKey,
      ttlMs: 2_500,
      fetcher,
    });
    const secondPromise = getOrCreateAdminSnapshot({
      cacheKey,
      ttlMs: 2_500,
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    resolveFetch?.({ ok: true });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(first.data).toEqual({ ok: true });
    expect(second.data).toEqual({ ok: true });
    expect(second.meta.cacheStatus).toBe("miss");
  });

  it("starts the ttl after slow fetches finish", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));
    const cacheKey = buildAdminSnapshotCacheKey({
      authPartition: "firebase-admin-1",
      pageFamily: "social-profile",
      scope: "instagram:thetraitorsus",
    });
    const fetcher = vi.fn(async () => {
      vi.setSystemTime(new Date("2026-04-08T12:00:07.000Z"));
      return { ok: true };
    });

    const first = await getOrCreateAdminSnapshot({
      cacheKey,
      ttlMs: 2_500,
      fetcher,
    });
    const second = await getOrCreateAdminSnapshot({
      cacheKey,
      ttlMs: 2_500,
      fetcher,
    });

    expect(first.meta.cacheStatus).toBe("miss");
    expect(second.meta.cacheStatus).toBe("hit");
    expect(second.meta.cacheAgeMs).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("serves the last good snapshot when the refresh errors inside the stale window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));
    const cacheKey = buildAdminSnapshotCacheKey({
      authPartition: "firebase-admin-1",
      pageFamily: "social-profile",
      query: new URLSearchParams({ platform: "instagram", handle: "bravotv" }),
    });
    const fetcher = vi
      .fn<() => Promise<{ run_status: string }>>()
      .mockResolvedValueOnce({ run_status: "running" })
      .mockRejectedValueOnce(new Error("backend busy"));

    const first = await getOrCreateAdminSnapshot({
      cacheKey,
      ttlMs: 2_500,
      staleIfErrorTtlMs: 2_500,
      fetcher,
    });

    vi.setSystemTime(new Date("2026-04-08T12:00:03.000Z"));

    const stale = await getOrCreateAdminSnapshot({
      cacheKey,
      ttlMs: 2_500,
      staleIfErrorTtlMs: 2_500,
      fetcher,
    });

    expect(first.meta.cacheStatus).toBe("miss");
    expect(stale.data.run_status).toBe("running");
    expect(stale.meta.cacheStatus).toBe("hit");
    expect(stale.meta.stale).toBe(true);
    expect(stale.meta.cacheAgeMs).toBe(3_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("bypasses the ttl and writes a fresh snapshot on force refresh", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));
    const fetcher = vi
      .fn<() => Promise<{ generated: string }>>()
      .mockResolvedValueOnce({ generated: "first" })
      .mockResolvedValueOnce({ generated: "second" });
    const cacheKey = buildAdminSnapshotCacheKey({
      authPartition: "firebase-admin-1",
      pageFamily: "system-health",
    });

    await getOrCreateAdminSnapshot({
      cacheKey,
      ttlMs: 5_000,
      fetcher,
    });

    vi.setSystemTime(new Date("2026-04-08T12:00:01.000Z"));

    const refreshed = await getOrCreateAdminSnapshot({
      cacheKey,
      ttlMs: 5_000,
      forceRefresh: true,
      fetcher,
    });

    expect(refreshed.data.generated).toBe("second");
    expect(refreshed.meta.cacheStatus).toBe("refresh");
    expect(refreshed.meta.cacheAgeMs).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("invalidates cached entries by snapshot family across auth partitions", async () => {
    const firstKey = buildAdminSnapshotCacheKey({
      authPartition: "firebase-admin-1",
      pageFamily: "reddit-sources",
      scope: "community-1:season-1",
    });
    const secondKey = buildAdminSnapshotCacheKey({
      authPartition: "firebase-admin-2",
      pageFamily: "reddit-sources",
      scope: "community-1:season-1",
    });
    const firstFetcher = vi.fn(async () => ({ scope: "first" }));
    const secondFetcher = vi.fn(async () => ({ scope: "second" }));

    await getOrCreateAdminSnapshot({ cacheKey: firstKey, ttlMs: 2_500, fetcher: firstFetcher });
    await getOrCreateAdminSnapshot({ cacheKey: secondKey, ttlMs: 2_500, fetcher: secondFetcher });

    expect(invalidateAdminSnapshotFamilies([{ pageFamily: "reddit-sources", scope: "community-1:season-1" }])).toBe(2);

    await getOrCreateAdminSnapshot({ cacheKey: firstKey, ttlMs: 2_500, fetcher: firstFetcher });
    await getOrCreateAdminSnapshot({ cacheKey: secondKey, ttlMs: 2_500, fetcher: secondFetcher });

    expect(firstFetcher).toHaveBeenCalledTimes(2);
    expect(secondFetcher).toHaveBeenCalledTimes(2);
  });
});
