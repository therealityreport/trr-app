import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  buildAdminAuthPartitionMock,
  buildAdminSnapshotCacheKeyMock,
  getOrCreateAdminSnapshotMock,
  fetchSocialBackendJsonMock,
  socialProxyErrorResponseMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  buildAdminAuthPartitionMock: vi.fn(),
  buildAdminSnapshotCacheKeyMock: vi.fn(),
  getOrCreateAdminSnapshotMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/admin-snapshot-cache", () => ({
  buildAdminAuthPartition: buildAdminAuthPartitionMock,
  buildAdminSnapshotCacheKey: buildAdminSnapshotCacheKeyMock,
  getOrCreateAdminSnapshot: getOrCreateAdminSnapshotMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags/route";

describe("social account profile hashtags route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    buildAdminAuthPartitionMock.mockReset();
    buildAdminSnapshotCacheKeyMock.mockReset();
    getOrCreateAdminSnapshotMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-1", provider: "firebase" });
    buildAdminAuthPartitionMock.mockReturnValue("firebase:admin-1");
    buildAdminSnapshotCacheKeyMock.mockReturnValue("hashtags-cache-key");
    fetchSocialBackendJsonMock.mockResolvedValue({ items: [] });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      Response.json({ error: String(error), code: "BACKEND_UNREACHABLE" }, { status: 502 }),
    );
    getOrCreateAdminSnapshotMock.mockImplementation(
      async (options: { fetcher: () => Promise<Record<string, unknown>> }) => ({
        data: await options.fetcher(),
        meta: {
          cacheStatus: "miss",
          generatedAt: "2026-04-28T12:00:00.000Z",
          cacheAgeMs: 0,
          stale: false,
        },
      }),
    );
  });

  it("uses the admin snapshot cache and strips refresh before proxying hashtags", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/hashtags?window=30d&refresh=1",
      ),
      { params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus" }) },
    );
    const body = (await response.json()) as { items?: unknown[] };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(body.items).toEqual([]);
    expect(buildAdminSnapshotCacheKeyMock).toHaveBeenCalledWith({
      authPartition: "firebase:admin-1",
      pageFamily: "social-profile",
      scope: "instagram:thetraitorsus:hashtags",
      query: new URLSearchParams({ window: "30d" }),
    });
    expect(getOrCreateAdminSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: "hashtags-cache-key",
        ttlMs: 300_000,
        staleIfErrorTtlMs: 900_000,
        forceRefresh: true,
      }),
    );
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/thetraitorsus/hashtags",
      expect.objectContaining({
        queryString: "window=30d",
        fallbackError: "Failed to fetch social account profile hashtags",
        retries: 0,
        timeoutMs: 30_000,
      }),
    );
  });
});
