import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  resolveRedditPostDetailBySlugMock,
  getCachedStableReadMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  resolveRedditPostDetailBySlugMock: vi.fn(),
  getCachedStableReadMock: vi.fn(async ({ loader }) => ({ payload: await loader(), cacheHit: false })),
}));

const VERIFIED_ADMIN_CONTEXT = {
  uid: "admin-uid",
  email: "admin@example.com",
  verifiedAt: 1_700_000_000_000,
};

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  resolveRedditPostDetailBySlug: resolveRedditPostDetailBySlugMock,
}));

vi.mock("@/lib/server/trr-api/reddit-stable-route-cache", () => ({
  buildUserScopedRouteCacheKey: vi.fn(
    (userId: string, scope: string, searchParams?: URLSearchParams) =>
      `${userId}:${scope}:${searchParams?.toString() ?? ""}`,
  ),
  getCachedStableRead: getCachedStableReadMock,
  REDDIT_STABLE_DETAIL_CACHE_NAMESPACE: "admin-reddit-stable-detail",
  REDDIT_STABLE_DETAIL_CACHE_TTL_MS: 10_000,
}));

import { GET } from "@/app/api/admin/reddit/communities/[communityId]/posts/resolve/route";

const COMMUNITY_ID = "11111111-1111-4111-8111-111111111111";
const SEASON_ID = "22222222-2222-4222-8222-222222222222";

const resolvedPost = {
  reddit_post_id: "abc123",
  detail_slug: "sample-thread--u-test-user",
  collision: false,
  title: "Sample thread",
  author: "test-user",
  posted_at: "2026-03-01T00:00:00.000Z",
  url: "https://reddit.com/r/test/comments/abc123/sample-thread/",
  permalink: "/r/test/comments/abc123/sample-thread/",
};

describe("/api/admin/reddit/communities/[communityId]/posts/resolve route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    resolveRedditPostDetailBySlugMock.mockReset();
    getCachedStableReadMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-uid", email: "admin@example.com" });
    toVerifiedAdminContextMock.mockReturnValue(VERIFIED_ADMIN_CONTEXT);
    getCachedStableReadMock.mockImplementation(async ({ loader }) => ({
      payload: await loader(),
      cacheHit: false,
    }));
  });

  it("resolves a canonical slug through the verified v2 backend contract", async () => {
    resolveRedditPostDetailBySlugMock.mockResolvedValue(resolvedPost);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/posts/resolve?season_id=${SEASON_ID}&window_key=w0&slug=sample-thread&author=test-user`,
      ),
      { params: Promise.resolve({ communityId: COMMUNITY_ID }) },
    );

    expect(response.status).toBe(200);
    expect(toVerifiedAdminContextMock).toHaveBeenCalledWith({
      uid: "admin-uid",
      email: "admin@example.com",
    });
    expect(resolveRedditPostDetailBySlugMock).toHaveBeenCalledWith({
      communityId: COMMUNITY_ID,
      seasonId: SEASON_ID,
      windowKey: "period-preseason",
      titleSlug: "sample-thread",
      authorSlug: "test-user",
      redditPostId: null,
      adminContext: VERIFIED_ADMIN_CONTEXT,
    });
  });

  it("accepts post_id-only legacy resolution", async () => {
    resolveRedditPostDetailBySlugMock.mockResolvedValue(resolvedPost);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/posts/resolve?season_id=${SEASON_ID}&window_key=e1&post_id=abc123`,
      ),
      { params: Promise.resolve({ communityId: COMMUNITY_ID }) },
    );

    expect(response.status).toBe(200);
    expect(resolveRedditPostDetailBySlugMock).toHaveBeenCalledWith(
      expect.objectContaining({
        windowKey: "episode-1",
        titleSlug: null,
        authorSlug: null,
        redditPostId: "abc123",
        adminContext: VERIFIED_ADMIN_CONTEXT,
      }),
    );
  });

  it("preserves the route-level not-found response", async () => {
    resolveRedditPostDetailBySlugMock.mockResolvedValue(null);

    const response = await GET(
      new NextRequest(
        `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/posts/resolve?season_id=${SEASON_ID}&window_key=e1&post_id=missing`,
      ),
      { params: Promise.resolve({ communityId: COMMUNITY_ID }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Post not found for community, season, and window",
    });
  });

  it("rejects malformed resolver inputs before the backend read", async () => {
    const response = await GET(
      new NextRequest(
        `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/posts/resolve?season_id=${SEASON_ID}&window_key=w0&slug=bad slug&author=test-user`,
      ),
      { params: Promise.resolve({ communityId: COMMUNITY_ID }) },
    );

    expect(response.status).toBe(400);
    expect(resolveRedditPostDetailBySlugMock).not.toHaveBeenCalled();
  });
});
