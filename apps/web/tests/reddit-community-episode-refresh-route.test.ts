import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getRedditCommunityByIdMock,
  getShowByIdMock,
  getSeasonByIdMock,
  getSeasonByShowAndNumberMock,
  getSeasonsByShowIdMock,
  discoverEpisodeDiscussionThreadsMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getRedditCommunityByIdMock: vi.fn(),
  getShowByIdMock: vi.fn(),
  getSeasonByIdMock: vi.fn(),
  getSeasonByShowAndNumberMock: vi.fn(),
  getSeasonsByShowIdMock: vi.fn(),
  discoverEpisodeDiscussionThreadsMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  getRedditCommunityById: getRedditCommunityByIdMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getShowById: getShowByIdMock,
  getSeasonById: getSeasonByIdMock,
  getSeasonByShowAndNumber: getSeasonByShowAndNumberMock,
  getSeasonsByShowId: getSeasonsByShowIdMock,
}));

vi.mock("@/lib/server/admin/reddit-discovery-service", () => ({
  RedditDiscoveryError: class RedditDiscoveryError extends Error {
    status: number;

    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
  discoverEpisodeDiscussionThreads: discoverEpisodeDiscussionThreadsMock,
}));

import { GET } from "@/app/api/admin/reddit/communities/[communityId]/episode-discussions/refresh/route";

const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";
const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SEASON_ID = "22222222-2222-4222-8222-222222222222";

describe("/api/admin/reddit/communities/[communityId]/episode-discussions/refresh", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getRedditCommunityByIdMock.mockReset();
    getShowByIdMock.mockReset();
    getSeasonByIdMock.mockReset();
    getSeasonByShowAndNumberMock.mockReset();
    getSeasonsByShowIdMock.mockReset();
    discoverEpisodeDiscussionThreadsMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getRedditCommunityByIdMock.mockResolvedValue({
      id: COMMUNITY_ID,
      trr_show_id: SHOW_ID,
      trr_show_name: "The Real Housewives of Salt Lake City",
      subreddit: "BravoRealHousewives",
      is_show_focused: false,
      episode_title_patterns: ["Live Episode Discussion"],
      analysis_all_flares: ["Salt Lake City"],
    });
    getSeasonByIdMock.mockResolvedValue({ id: SEASON_ID, show_id: SHOW_ID, season_number: 6 });
    getSeasonByShowAndNumberMock.mockResolvedValue({ id: SEASON_ID, show_id: SHOW_ID, season_number: 6 });
    getSeasonsByShowIdMock.mockResolvedValue([
      { id: SEASON_ID, show_id: SHOW_ID, season_number: 6 },
      { id: "99999999-9999-4999-8999-999999999999", show_id: SHOW_ID, season_number: 5 },
    ]);
    getShowByIdMock.mockResolvedValue({
      id: SHOW_ID,
      name: "The Real Housewives of Salt Lake City",
      alternative_names: ["RHOSLC"],
    });
    discoverEpisodeDiscussionThreadsMock.mockResolvedValue({
      subreddit: "BravoRealHousewives",
      fetched_at: "2026-02-24T12:00:00.000Z",
      sources_fetched: ["new"],
      candidates: [
        {
          reddit_post_id: "post-1",
          title: "RHOSLC - Season 6 - Episode 4 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-1/test/",
          permalink: "/r/BravoRealHousewives/comments/post-1/test/",
          author: "user1",
          score: 120,
          num_comments: 55,
          posted_at: "2026-02-24T12:00:00.000Z",
          link_flair_text: "Salt Lake City",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
      filters_applied: {
        season_number: 6,
        title_patterns: ["Live Episode Discussion"],
        required_flares: ["Salt Lake City"],
        show_focused: false,
        period_start: null,
        period_end: null,
      },
    });
  });

  it("defaults to the latest season when no season params are supplied", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta?.season_context).toEqual({ season_id: SEASON_ID, season_number: 6 });
    expect(discoverEpisodeDiscussionThreadsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonNumber: 6,
        episodeTitlePatterns: ["Live Episode Discussion"],
        episodeRequiredFlares: ["Salt Lake City"],
      }),
    );
  });

  it("applies explicit period window filters", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh?season_id=${SEASON_ID}&period_start=2026-01-01T00:00:00.000Z&period_end=2026-01-31T23:59:59.000Z`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta?.period_context?.selected_window_start).toBe("2026-01-01T00:00:00.000Z");
    expect(payload.meta?.period_context?.selected_window_end).toBe("2026-01-31T23:59:59.000Z");
    expect(discoverEpisodeDiscussionThreadsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        periodStart: "2026-01-01T00:00:00.000Z",
        periodEnd: "2026-01-31T23:59:59.000Z",
      }),
    );
  });

  it("returns 400 when period_start is invalid", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh?period_start=not-a-date`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("period_start");
    expect(discoverEpisodeDiscussionThreadsMock).not.toHaveBeenCalled();
  });

  it("bypasses flair requirements when show-focused", async () => {
    getRedditCommunityByIdMock.mockResolvedValueOnce({
      id: COMMUNITY_ID,
      trr_show_id: SHOW_ID,
      trr_show_name: "The Real Housewives of Salt Lake City",
      subreddit: "realhousewivesofSLC",
      is_show_focused: true,
      episode_title_patterns: ["Live Episode Discussion"],
      analysis_all_flares: ["Salt Lake City"],
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    expect(response.status).toBe(200);
    expect(discoverEpisodeDiscussionThreadsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isShowFocused: true,
        episodeRequiredFlares: ["Salt Lake City"],
      }),
    );
  });
});
