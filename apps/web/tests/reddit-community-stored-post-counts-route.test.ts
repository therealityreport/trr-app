import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getStoredPostCountsByCommunityAndSeasonMock,
  getStoredPostTotalByCommunityAndSeasonMock,
  getStoredTrackedPostFlairCountsByCommunityAndSeasonMock,
  getStoredTrackedPostTotalByCommunityAndSeasonMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getStoredPostCountsByCommunityAndSeasonMock: vi.fn(),
  getStoredPostTotalByCommunityAndSeasonMock: vi.fn(),
  getStoredTrackedPostFlairCountsByCommunityAndSeasonMock: vi.fn(),
  getStoredTrackedPostTotalByCommunityAndSeasonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  getStoredPostCountsByCommunityAndSeason: getStoredPostCountsByCommunityAndSeasonMock,
  getStoredPostTotalByCommunityAndSeason: getStoredPostTotalByCommunityAndSeasonMock,
  getStoredTrackedPostFlairCountsByCommunityAndSeason:
    getStoredTrackedPostFlairCountsByCommunityAndSeasonMock,
  getStoredTrackedPostTotalByCommunityAndSeason: getStoredTrackedPostTotalByCommunityAndSeasonMock,
}));

import { GET } from "@/app/api/admin/reddit/communities/[communityId]/stored-post-counts/route";

const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";
const SEASON_ID = "66666666-6666-4666-8666-666666666666";

describe("/api/admin/reddit/communities/[communityId]/stored-post-counts route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getStoredPostCountsByCommunityAndSeasonMock.mockReset();
    getStoredPostTotalByCommunityAndSeasonMock.mockReset();
    getStoredTrackedPostFlairCountsByCommunityAndSeasonMock.mockReset();
    getStoredTrackedPostTotalByCommunityAndSeasonMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
  });

  it("returns tracked-flair additive payload with legacy compatibility fields", async () => {
    getStoredPostCountsByCommunityAndSeasonMock.mockResolvedValue({
      "episode-1": 18,
      "episode-2": 21,
      "period-preseason": 6,
    });
    getStoredPostTotalByCommunityAndSeasonMock.mockResolvedValue(861);
    getStoredTrackedPostTotalByCommunityAndSeasonMock.mockResolvedValue(660);
    getStoredTrackedPostFlairCountsByCommunityAndSeasonMock.mockResolvedValue([
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
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/stored-post-counts?season_id=${SEASON_ID}`,
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      counts: {
        "episode-1": 18,
        "episode-2": 21,
        "period-preseason": 6,
      },
      total_posts: 861,
      tracked_total_posts: 660,
      tracked_flair_counts: [
        expect.objectContaining({
          flair_key: "salt-lake-city",
          flair_label: "Salt Lake City",
          post_count: 466,
        }),
        expect.objectContaining({
          flair_key: "wwhl",
          flair_label: "WWHL",
          post_count: 121,
        }),
      ],
      flair_counts: [
        { flair: "Salt Lake City", post_count: 466 },
        { flair: "WWHL", post_count: 121 },
      ],
    });
    expect(getStoredPostCountsByCommunityAndSeasonMock).toHaveBeenCalledWith(
      COMMUNITY_ID,
      SEASON_ID,
    );
    expect(getStoredPostTotalByCommunityAndSeasonMock).toHaveBeenCalledWith(
      COMMUNITY_ID,
      SEASON_ID,
    );
    expect(getStoredTrackedPostTotalByCommunityAndSeasonMock).toHaveBeenCalledWith(
      COMMUNITY_ID,
      SEASON_ID,
    );
    expect(getStoredTrackedPostFlairCountsByCommunityAndSeasonMock).toHaveBeenCalledWith(
      COMMUNITY_ID,
      SEASON_ID,
    );
  });

  it("returns 400 for invalid communityId", async () => {
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

  it("returns 400 for invalid season_id", async () => {
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
