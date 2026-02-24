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
      successful_sorts: ["new"],
      failed_sorts: [],
      rate_limited_sorts: [],
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
          episode_number: 4,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
      episode_matrix: [
        {
          episode_number: 4,
          live: {
            post_count: 1,
            total_comments: 55,
            total_upvotes: 120,
            top_post_id: "post-1",
            top_post_url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-1/test/",
          },
          post: { post_count: 0, total_comments: 0, total_upvotes: 0, top_post_id: null, top_post_url: null },
          weekly: {
            post_count: 0,
            total_comments: 0,
            total_upvotes: 0,
            top_post_id: null,
            top_post_url: null,
          },
          total_posts: 1,
          total_comments: 55,
          total_upvotes: 120,
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
    expect(payload.episode_matrix).toHaveLength(1);
    expect(payload.meta?.effective_required_flares).toEqual(["Salt Lake City"]);
    expect(payload.meta?.auto_seeded_required_flares).toBe(false);
    expect(payload.meta?.successful_sorts).toEqual(["new"]);
    expect(payload.meta?.failed_sorts).toEqual([]);
    expect(payload.meta?.rate_limited_sorts).toEqual([]);
    expect(payload.meta?.effective_episode_title_patterns).toEqual([
      "Live Episode Discussion",
      "Post Episode Discussion",
      "Weekly Episode Discussion",
    ]);
    expect(discoverEpisodeDiscussionThreadsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonNumber: 6,
        episodeTitlePatterns: [
          "Live Episode Discussion",
          "Post Episode Discussion",
          "Weekly Episode Discussion",
        ],
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

  it("returns partial-sort diagnostics without failing refresh", async () => {
    discoverEpisodeDiscussionThreadsMock.mockResolvedValueOnce({
      subreddit: "BravoRealHousewives",
      fetched_at: "2026-02-24T12:00:00.000Z",
      sources_fetched: ["new", "top"],
      successful_sorts: ["new", "top"],
      failed_sorts: ["hot"],
      rate_limited_sorts: ["hot"],
      candidates: [],
      episode_matrix: [],
      filters_applied: {
        season_number: 6,
        title_patterns: ["Live Episode Discussion"],
        required_flares: ["Salt Lake City"],
        show_focused: false,
        period_start: null,
        period_end: null,
      },
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta?.successful_sorts).toEqual(["new", "top"]);
    expect(payload.meta?.failed_sorts).toEqual(["hot"]);
    expect(payload.meta?.rate_limited_sorts).toEqual(["hot"]);
  });

  it("caps and sanitizes echoed period labels", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh?period_label= Pre-Season  &period_label=Final%20Reunion&period_label=final%20reunion&period_label=${encodeURIComponent("x".repeat(240))}&period_label=One&period_label=Two&period_label=Three`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta?.period_context?.selected_period_labels).toEqual([
      "Pre-Season",
      "Final Reunion",
      "x".repeat(120),
      "One",
      "Two",
    ]);
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

  it("auto-seeds Salt Lake City flair for BravoRealHousewives RHOSLC rows when all-post flares are empty", async () => {
    getRedditCommunityByIdMock.mockResolvedValueOnce({
      id: COMMUNITY_ID,
      trr_show_id: SHOW_ID,
      trr_show_name: "The Real Housewives of Salt Lake City",
      subreddit: "BravoRealHousewives",
      is_show_focused: false,
      episode_title_patterns: [],
      analysis_all_flares: [],
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta?.auto_seeded_required_flares).toBe(true);
    expect(payload.meta?.effective_required_flares).toEqual(["Salt Lake City"]);
    expect(discoverEpisodeDiscussionThreadsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        episodeRequiredFlares: ["Salt Lake City"],
      }),
    );
  });

  it("rejects legacy params when provided", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh?show_id=${SHOW_ID}&season_number=6`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Legacy params");
    expect(discoverEpisodeDiscussionThreadsMock).not.toHaveBeenCalled();
  });
});
