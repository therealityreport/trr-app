import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  getStoredPostCountsByCommunityAndSeasonMock,
  getCachedStableReadMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  getStoredPostCountsByCommunityAndSeasonMock: vi.fn(),
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
  getStoredPostCountsByCommunityAndSeason: getStoredPostCountsByCommunityAndSeasonMock,
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

import { GET } from "@/app/api/admin/reddit/communities/[communityId]/stored-post-counts/route";

const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";
const SEASON_ID = "66666666-6666-4666-8666-666666666666";

const countsPayload = {
  counts: {
    "episode-1": 18,
    "episode-2": 21,
    "period-preseason": 6,
  },
  total_posts: 861,
  tracked_total_posts: 660,
  tracked_flair_counts: [
    {
      flair_key: "salt-lake-city",
      flair_label: "Salt Lake City",
      post_count: 466,
      container_counts: [{ container_key: "episode-1", post_count: 18 }],
    },
    {
      flair_key: "wwhl",
      flair_label: "WWHL",
      post_count: 121,
      container_counts: [{ container_key: "episode-2", post_count: 12 }],
    },
  ],
  pending_tracked_flair_counts: [
    {
      container_key: "episode-1",
      flair_key: "wwhl",
      flair_label: "WWHL",
      post_count: 8,
    },
  ],
  flair_counts: [
    { flair: "Salt Lake City", post_count: 466 },
    { flair: "WWHL", post_count: 121 },
  ],
};

describe("/api/admin/reddit/communities/[communityId]/stored-post-counts route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    getStoredPostCountsByCommunityAndSeasonMock.mockReset();
    getCachedStableReadMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid", email: "admin@example.com" });
    toVerifiedAdminContextMock.mockReturnValue(VERIFIED_ADMIN_CONTEXT);
    getCachedStableReadMock.mockImplementation(async ({ loader }) => ({
      payload: await loader(),
      cacheHit: false,
    }));
  });

  it("returns the backend-owned tracked-flair payload through the user cache", async () => {
    getStoredPostCountsByCommunityAndSeasonMock.mockResolvedValue(countsPayload);

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/stored-post-counts?season_id=${SEASON_ID}`,
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(countsPayload);
    expect(toVerifiedAdminContextMock).toHaveBeenCalledWith({
      uid: "admin-uid",
      email: "admin@example.com",
    });
    expect(getStoredPostCountsByCommunityAndSeasonMock).toHaveBeenCalledWith(
      COMMUNITY_ID,
      SEASON_ID,
      { adminContext: VERIFIED_ADMIN_CONTEXT },
    );
  });

  it("returns 400 for invalid communityId without calling the backend", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/reddit/communities/not-a-uuid/stored-post-counts?season_id=66666666-6666-4666-8666-666666666666",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ communityId: "not-a-uuid" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("communityId");
    expect(getStoredPostCountsByCommunityAndSeasonMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid season_id without calling the backend", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/stored-post-counts?season_id=not-a-uuid`,
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("season_id");
    expect(getStoredPostCountsByCommunityAndSeasonMock).not.toHaveBeenCalled();
  });
});
