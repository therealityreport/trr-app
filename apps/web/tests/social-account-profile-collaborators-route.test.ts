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

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/collaborators-tags/route";

describe("social account profile collaborators/tags route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    buildAdminAuthPartitionMock.mockReset();
    buildAdminSnapshotCacheKeyMock.mockReset();
    getOrCreateAdminSnapshotMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-1", provider: "firebase" });
    buildAdminAuthPartitionMock.mockReturnValue("firebase:admin-1");
    buildAdminSnapshotCacheKeyMock.mockReturnValue("collaborators-cache-key");
    fetchSocialBackendJsonMock.mockResolvedValue({ collaborators: [], tags: [] });
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

  it("uses the admin snapshot cache for collaborator/tag tab loads", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/collaborators-tags?refresh=1",
      ),
      { params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus" }) },
    );
    const body = (await response.json()) as { collaborators?: unknown[]; tags?: unknown[] };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(body.collaborators).toEqual([]);
    expect(buildAdminSnapshotCacheKeyMock).toHaveBeenCalledWith({
      authPartition: "firebase:admin-1",
      pageFamily: "social-profile",
      scope: "instagram:thetraitorsus:collaborators-tags",
    });
    expect(getOrCreateAdminSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: "collaborators-cache-key",
        ttlMs: 300_000,
        staleIfErrorTtlMs: 300_000,
        forceRefresh: true,
      }),
    );
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/thetraitorsus/collaborators-tags",
      expect.objectContaining({
        fallbackError: "Failed to fetch social account profile collaborators and tags",
        retries: 0,
        timeoutMs: 30_000,
      }),
    );
  });
});
