import { describe, expect, it } from "vitest";

import { buildSocialSyncSessionRequest } from "@/lib/admin/social-sync-session";

describe("buildSocialSyncSessionRequest", () => {
  it("caps depth and keeps replies enabled for TikTok-only sync", () => {
    const payload = buildSocialSyncSessionRequest({
      sourceScope: "bravo",
      platforms: ["tiktok"],
      dateStart: "2026-01-01T00:00:00Z",
      dateEnd: "2026-01-02T00:00:00Z",
    });

    expect(payload.max_comments_per_post).toBe(5_000);
    expect(payload.max_replies_per_post).toBe(1_000);
    expect(payload.fetch_replies).toBe(true);
  });

  it("caps depth for Facebook, Threads, and Twitter/X syncs", () => {
    for (const platform of ["facebook", "threads", "twitter"] as const) {
      const payload = buildSocialSyncSessionRequest({
        sourceScope: "bravo",
        platforms: [platform],
        dateStart: "2026-01-01T00:00:00Z",
        dateEnd: "2026-01-02T00:00:00Z",
      });

      expect(payload.max_comments_per_post).toBe(5_000);
      expect(payload.max_replies_per_post).toBe(1_000);
      expect(payload.fetch_replies).toBe(true);
    }
  });

  it("preserves instagram-only reply skipping", () => {
    const payload = buildSocialSyncSessionRequest({
      sourceScope: "bravo",
      platforms: ["instagram"],
      dateStart: "2026-01-01T00:00:00Z",
      dateEnd: "2026-01-02T00:00:00Z",
    });

    expect(payload.max_comments_per_post).toBe(0);
    expect(payload.max_replies_per_post).toBe(0);
    expect(payload.fetch_replies).toBe(false);
  });
});
