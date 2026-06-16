import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  buildAdminAuthPartitionMock,
  buildAdminSnapshotCacheKeyMock,
  getOrCreateAdminSnapshotMock,
  buildAdminReadResponseHeadersMock,
  fetchSocialBackendJsonMock,
  socialProxyErrorResponseMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  buildAdminAuthPartitionMock: vi.fn(),
  buildAdminSnapshotCacheKeyMock: vi.fn(),
  getOrCreateAdminSnapshotMock: vi.fn(),
  buildAdminReadResponseHeadersMock: vi.fn(),
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

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  buildAdminReadResponseHeaders: buildAdminReadResponseHeadersMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  SOCIAL_PROXY_LONG_TIMEOUT_MS: 60_000,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET as getComments } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/comments/route";
import { GET as getReviewQueue } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/review-queue/route";
import { GET as getPosts } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/posts/route";

describe("social account profile read proxy routes", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    buildAdminAuthPartitionMock.mockReset();
    buildAdminSnapshotCacheKeyMock.mockReset();
    getOrCreateAdminSnapshotMock.mockReset();
    buildAdminReadResponseHeadersMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-1", provider: "firebase" });
    buildAdminAuthPartitionMock.mockReturnValue("firebase:admin-1");
    buildAdminSnapshotCacheKeyMock.mockReturnValue("posts-cache-key");
    buildAdminReadResponseHeadersMock.mockImplementation(({ cacheStatus }: { cacheStatus: string }) => ({
      "x-trr-cache": cacheStatus,
    }));
    fetchSocialBackendJsonMock.mockResolvedValue({ items: [] });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      Response.json({ error: String(error), code: "BACKEND_UNREACHABLE" }, { status: 502 }),
    );
    getOrCreateAdminSnapshotMock.mockImplementation(
      async (options: { fetcher: () => Promise<Record<string, unknown>> }) => ({
        data: await options.fetcher(),
        meta: {
          cacheStatus: "miss",
          generatedAt: "2026-05-05T07:52:00.000Z",
          cacheAgeMs: 0,
          stale: false,
        },
      }),
    );
  });

  it("uses the snapshot cache for profile comments and strips refresh before proxying", async () => {
    const response = await getComments(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/comments?limit=25&cursor=abc&refresh=1",
      ),
      { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(response.headers.get("x-trr-admin-proxy-route-ms")).toMatch(/^\d+$/);
    expect(response.headers.get("x-trr-admin-proxy-endpoint")).toBe("comments");
    expect(buildAdminSnapshotCacheKeyMock).toHaveBeenCalledWith({
      authPartition: "firebase:admin-1",
      pageFamily: "social-profile",
      scope: "instagram:bravotv:comments",
      query: new URLSearchParams("limit=25&cursor=abc"),
    });
    expect(getOrCreateAdminSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: "posts-cache-key",
        ttlMs: 60_000,
        staleIfErrorTtlMs: 300_000,
        forceRefresh: true,
      }),
    );
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/comments",
      expect.objectContaining({
        fallbackError: "Failed to fetch social account comments",
        queryString: "limit=25&cursor=abc",
        retries: 0,
        timeoutMs: 30_000,
      }),
    );
  });

  it("uses the snapshot cache for catalog review queue reads", async () => {
    const response = await getReviewQueue(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/review-queue?assignment_status=pending",
      ),
      { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(response.headers.get("x-trr-admin-proxy-route-ms")).toMatch(/^\d+$/);
    expect(response.headers.get("x-trr-admin-proxy-endpoint")).toBe("catalog/review-queue");
    expect(buildAdminSnapshotCacheKeyMock).toHaveBeenCalledWith({
      authPartition: "firebase:admin-1",
      pageFamily: "social-profile",
      scope: "instagram:bravotv:catalog-review-queue",
      query: new URLSearchParams("assignment_status=pending"),
    });
    expect(getOrCreateAdminSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: "posts-cache-key",
        ttlMs: 60_000,
        staleIfErrorTtlMs: 300_000,
      }),
    );
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/catalog/review-queue",
      expect.objectContaining({
        fallbackError: "Failed to fetch social account catalog review queue",
        queryString: "assignment_status=pending",
        retries: 0,
        timeoutMs: 30_000,
      }),
    );
  });

  it("uses the snapshot cache and long timeout for comments-only profile posts", async () => {
    const response = await getPosts(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/posts?refresh=1&comments_only=true&page=2",
      ),
      { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(response.headers.get("x-trr-admin-proxy-route-ms")).toMatch(/^\d+$/);
    expect(response.headers.get("x-trr-admin-proxy-endpoint")).toBe("posts");
    expect(buildAdminSnapshotCacheKeyMock).toHaveBeenCalledWith({
      authPartition: "firebase:admin-1",
      pageFamily: "social-profile",
      scope: "instagram:bravotv:posts",
      query: new URLSearchParams("comments_only=true&page=2"),
    });
    expect(getOrCreateAdminSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: "posts-cache-key",
        ttlMs: 300_000,
        staleIfErrorTtlMs: 900_000,
        forceRefresh: true,
      }),
    );
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/posts",
      expect.objectContaining({
        fallbackError: "Failed to fetch social account profile posts",
        queryString: "comments_only=true&page=2",
        retries: 0,
        timeoutMs: 60_000,
      }),
    );
  });

  it("renders local dev browser document responses for direct API navigation", async () => {
    const previousLocalDev = process.env.TRR_LOCAL_DEV;
    process.env.TRR_LOCAL_DEV = "1";
    fetchSocialBackendJsonMock.mockResolvedValueOnce({
      items: [{ source_id: "DZaAVVLiAog" }],
      pagination: { page: 1, page_size: 20, total: 1, total_pages: 1 },
    });

    try {
      const response = await getPosts(
        new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/posts?limit=20", {
          headers: {
            accept: "text/html,application/xhtml+xml",
            "sec-fetch-dest": "document",
          },
        }),
        { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(response.headers.get("x-trr-local-api-document")).toBe("1");
      expect(response.headers.get("x-trr-admin-proxy-route-ms")).toMatch(/^\d+$/);
      await expect(response.text()).resolves.toContain("&quot;source_id&quot;: &quot;DZaAVVLiAog&quot;");
    } finally {
      if (previousLocalDev === undefined) {
        delete process.env.TRR_LOCAL_DEV;
      } else {
        process.env.TRR_LOCAL_DEV = previousLocalDev;
      }
    }
  });
});
