import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  fetchSocialBackendJsonMock,
  socialProxyErrorResponseMock,
  getCachedStableReadMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn((error: unknown) => {
    const message = error instanceof Error ? error.message : "failed";
    return Response.json({ error: message }, { status: 502 });
  }),
  getCachedStableReadMock: vi.fn(async ({ loader }) => ({ payload: await loader(), cacheHit: false })),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/reddit-stable-route-cache", () => ({
  buildUserScopedRouteCacheKey: vi.fn(
    (userId: string, scope: string, searchParams?: URLSearchParams) =>
      `${userId}:${scope}:${searchParams?.toString() ?? ""}`,
  ),
  getCachedStableRead: getCachedStableReadMock,
  REDDIT_STABLE_SUMMARY_CACHE_NAMESPACE: "admin-reddit-stable-summary",
  REDDIT_STABLE_SUMMARY_CACHE_TTL_MS: 5_000,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 45_000,
}));

import { GET } from "@/app/api/admin/reddit/analytics/community/[communityId]/summary/route";

describe("/api/admin/reddit/analytics/community/[communityId]/summary route", () => {
  const communityId = "33333333-3333-4333-8333-333333333333";
  const seasonId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockClear();
    getCachedStableReadMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getCachedStableReadMock.mockImplementation(async ({ loader }) => ({
      payload: await loader(),
      cacheHit: false,
    }));
  });

  it("forwards validated analytics summary requests through the shared social proxy", async () => {
    fetchSocialBackendJsonMock.mockResolvedValue({
      totals: { tracked_posts: 5 },
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/analytics/community/${communityId}/summary?scope=season&season_id=${seasonId}`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.totals.tracked_posts).toBe(5);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      `/reddit/analytics/community/${communityId}/summary`,
      expect.objectContaining({
        queryString: "scope=season&season_id=22222222-2222-4222-8222-222222222222",
        fallbackError: "Failed to fetch reddit analytics summary",
        timeoutMs: 45_000,
        retries: 1,
      }),
    );
  });

  it("signals cache hits with x-trr-cache", async () => {
    getCachedStableReadMock.mockResolvedValue({
      payload: {
        totals: { tracked_posts: 1 },
      },
      cacheHit: true,
    });

    const response = await GET(
      new NextRequest(
        `http://localhost/api/admin/reddit/analytics/community/${communityId}/summary?scope=season&season_id=${seasonId}`,
      ),
      { params: Promise.resolve({ communityId }) },
    );

    expect(response.headers.get("x-trr-cache")).toBe("hit");
  });
});

