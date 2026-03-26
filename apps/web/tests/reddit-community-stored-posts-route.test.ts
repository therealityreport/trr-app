import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getStoredWindowPostsByCommunityAndSeasonMock,
  getCachedStableReadMock,
  loadStableRedditReadMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getStoredWindowPostsByCommunityAndSeasonMock: vi.fn(),
  getCachedStableReadMock: vi.fn(async ({ loader }) => ({ payload: await loader(), cacheHit: false })),
  loadStableRedditReadMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  getStoredWindowPostsByCommunityAndSeason: getStoredWindowPostsByCommunityAndSeasonMock,
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

vi.mock("@/lib/server/trr-api/reddit-stable-read", () => ({
  loadStableRedditRead: loadStableRedditReadMock,
}));

import { GET } from "@/app/api/admin/reddit/communities/[communityId]/stored-posts/route";

const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";
const SEASON_ID = "66666666-6666-4666-8666-666666666666";

describe("/api/admin/reddit/communities/[communityId]/stored-posts route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getStoredWindowPostsByCommunityAndSeasonMock.mockReset();
    getCachedStableReadMock.mockReset();
    loadStableRedditReadMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getCachedStableReadMock.mockImplementation(async ({ loader }) => ({
      payload: await loader(),
      cacheHit: false,
    }));
  });

  it("returns stored window posts for a canonical container", async () => {
    getStoredWindowPostsByCommunityAndSeasonMock.mockResolvedValue({
      pagination: {
        page: 1,
        per_page: 200,
        total_count: 2,
      },
      posts: [
        {
          reddit_post_id: "post-1",
          title: "Episode 1 stored post",
          text: null,
          url: "https://reddit.com/r/BravoRealHousewives/comments/post-1/sample/",
          permalink: "/r/BravoRealHousewives/comments/post-1/sample/",
          author: "stored-user",
          score: 42,
          num_comments: 18,
          posted_at: "2025-09-17T00:00:00.000Z",
          link_flair_text: "Salt Lake City",
          is_show_match: true,
          passes_flair_filter: true,
          match_score: 0.91,
          match_type: "flair",
        },
      ],
    });
    loadStableRedditReadMock.mockImplementation(async ({ fallback }) => ({
      payload: await fallback(),
      source: "local",
    }));

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/stored-posts?season_id=${SEASON_ID}&container_key=episode-1&page=1&per_page=200`,
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.pagination.total_count).toBe(2);
    expect(payload.posts).toHaveLength(1);
    expect(getStoredWindowPostsByCommunityAndSeasonMock).toHaveBeenCalledWith(
      COMMUNITY_ID,
      SEASON_ID,
      "episode-1",
      1,
      200,
    );
    expect(loadStableRedditReadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        backendPath: `/admin/reddit/communities/${COMMUNITY_ID}/stored-posts`,
        routeName: "reddit-stored-posts",
      }),
    );
  });

  it("routes through backend stable read payloads when available", async () => {
    loadStableRedditReadMock.mockResolvedValue({
      payload: {
        pagination: { page: 1, per_page: 200, total_count: 1 },
        posts: [],
      },
      source: "backend",
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/stored-posts?season_id=${SEASON_ID}&container_key=episode-1&page=1&per_page=200`,
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });

    expect(response.status).toBe(200);
    expect(loadStableRedditReadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        backendPath: `/admin/reddit/communities/${COMMUNITY_ID}/stored-posts`,
        routeName: "reddit-stored-posts",
      }),
    );
  });

  it("returns 400 for invalid season_id", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/stored-posts?season_id=bad&container_key=episode-1`,
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("season_id");
    expect(getStoredWindowPostsByCommunityAndSeasonMock).not.toHaveBeenCalled();
  });

  it("returns 400 when container_key is missing", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/stored-posts?season_id=${SEASON_ID}`,
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("container_key");
    expect(getStoredWindowPostsByCommunityAndSeasonMock).not.toHaveBeenCalled();
  });
});
