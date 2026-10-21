import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getOrCreateAdminSnapshot,
  invalidateAdminSnapshotCache,
  invalidateAdminSnapshotFamily,
} from "@/lib/server/admin/admin-snapshot-cache";

describe("admin snapshot invalidation", () => {
  beforeEach(() => invalidateAdminSnapshotCache());

  it.each(["all", "prefix", "family"] as const)(
    "does not let an old load overwrite a fresh snapshot after %s invalidation",
    async (kind) => {
      const cacheKey = "admin:user:social-profile:instagram:bravotv:";
      let finishOld!: (value: string) => void;
      const old = getOrCreateAdminSnapshot({
        cacheKey,
        ttlMs: 60_000,
        fetcher: () => new Promise<string>((resolve) => { finishOld = resolve; }),
      });

      if (kind === "family") {
        invalidateAdminSnapshotFamily({ pageFamily: "social-profile", scope: "instagram:bravotv" });
      } else {
        invalidateAdminSnapshotCache(kind === "prefix" ? "admin:user:" : undefined);
      }

      const freshLoader = vi.fn(async () => "new");
      await getOrCreateAdminSnapshot({ cacheKey, ttlMs: 60_000, fetcher: freshLoader });
      finishOld("old");
      expect((await old).data).toBe("old");
      const current = await getOrCreateAdminSnapshot({ cacheKey, ttlMs: 60_000, fetcher: freshLoader });
      expect(current.data).toBe("new");
      expect(current.meta.cacheStatus).toBe("hit");
      expect(freshLoader).toHaveBeenCalledTimes(1);
    },
  );

  it("shares a current load and caches its result", async () => {
    let finish!: (value: string) => void;
    const fetcher = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; }));
    const options = { cacheKey: "shared", ttlMs: 60_000, fetcher };
    const first = getOrCreateAdminSnapshot(options);
    const second = getOrCreateAdminSnapshot(options);
    finish("value");
    expect((await first).data).toBe("value");
    expect((await second).data).toBe("value");
    expect((await getOrCreateAdminSnapshot(options)).meta.cacheStatus).toBe("hit");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
