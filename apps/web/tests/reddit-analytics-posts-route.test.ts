import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, fetchSocialBackendJsonMock, socialProxyErrorResponseMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn((error: unknown) => {
    const message = error instanceof Error ? error.message : "failed";
    return Response.json({ error: message }, { status: 502 });
  }),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 45_000,
}));

import { GET } from "@/app/api/admin/reddit/analytics/community/[communityId]/posts/route";

describe("/api/admin/reddit/analytics/community/[communityId]/posts route", () => {
  const communityId = "33333333-3333-4333-8333-333333333333";
  const seasonId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockClear();
    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
  });

  it("forwards validated analytics posts requests through the shared social proxy", async () => {
    fetchSocialBackendJsonMock.mockResolvedValue({
      posts: [{ reddit_post_id: "abc123", title: "Stored post" }],
      pagination: { total_count: 1 },
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/analytics/community/${communityId}/posts?scope=season&season_id=${seasonId}&container_key=episode-1&page=1&per_page=200`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId }) });
    const payload = (await response.json()) as { pagination?: { total_count?: number } };

    expect(response.status).toBe(200);
    expect(payload.pagination?.total_count).toBe(1);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      `/reddit/analytics/community/${communityId}/posts`,
      expect.objectContaining({
        queryString: "scope=season&season_id=22222222-2222-4222-8222-222222222222&container_key=episode-1&page=1&per_page=200",
        fallbackError: "Failed to fetch reddit analytics posts",
        timeoutMs: 45_000,
        retries: 1,
      }),
    );
  });
});
