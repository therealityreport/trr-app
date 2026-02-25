import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getRedditCommunityByIdMock,
  getShowByIdMock,
  getSeasonByIdMock,
  getSeasonsByShowIdMock,
  getEpisodesBySeasonIdMock,
  getEpisodesByShowAndSeasonMock,
  createRedditThreadMock,
  discoverEpisodeDiscussionThreadsMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getRedditCommunityByIdMock: vi.fn(),
  getShowByIdMock: vi.fn(),
  getSeasonByIdMock: vi.fn(),
  getSeasonsByShowIdMock: vi.fn(),
  getEpisodesBySeasonIdMock: vi.fn(),
  getEpisodesByShowAndSeasonMock: vi.fn(),
  createRedditThreadMock: vi.fn(),
  discoverEpisodeDiscussionThreadsMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  getRedditCommunityById: getRedditCommunityByIdMock,
  createRedditThread: createRedditThreadMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getShowById: getShowByIdMock,
  getSeasonById: getSeasonByIdMock,
  getSeasonsByShowId: getSeasonsByShowIdMock,
  getEpisodesBySeasonId: getEpisodesBySeasonIdMock,
  getEpisodesByShowAndSeason: getEpisodesByShowAndSeasonMock,
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
    getSeasonsByShowIdMock.mockReset();
    getEpisodesBySeasonIdMock.mockReset();
    getEpisodesByShowAndSeasonMock.mockReset();
    createRedditThreadMock.mockReset();
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
    getSeasonsByShowIdMock.mockResolvedValue([
      {
        id: "99999999-9999-4999-8999-999999999999",
        show_id: SHOW_ID,
        season_number: 7,
        has_scheduled_or_aired_episode: false,
      },
      {
        id: SEASON_ID,
        show_id: SHOW_ID,
        season_number: 6,
        has_scheduled_or_aired_episode: true,
      },
    ]);
    getShowByIdMock.mockResolvedValue({
      id: SHOW_ID,
      name: "The Real Housewives of Salt Lake City",
      alternative_names: ["RHOSLC"],
    });
    getEpisodesBySeasonIdMock.mockResolvedValue([
      {
        id: "ep-1",
        season_id: SEASON_ID,
        episode_number: 4,
        air_date: "2026-02-24",
      },
    ]);
    getEpisodesByShowAndSeasonMock.mockResolvedValue([
      {
        id: "ep-1",
        season_id: SEASON_ID,
        show_id: SHOW_ID,
        season_number: 6,
        episode_number: 4,
        air_date: "2026-02-24",
      },
    ]);
    createRedditThreadMock.mockResolvedValue({
      id: "thread-1",
      reddit_post_id: "post-1",
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
      expected_episode_count: 1,
      expected_episode_numbers: [4],
      coverage_found_episode_count: 1,
      coverage_expected_slots: 3,
      coverage_found_slots: 1,
      coverage_missing_slots: [
        { episode_number: 4, discussion_type: "post" },
        { episode_number: 4, discussion_type: "weekly" },
      ],
      discovery_source_summary: {
        listing_count: 65,
        search_count: 2,
        search_pages_fetched: 5,
        gap_fill_queries_run: 1,
      },
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

  it("defaults to the most recent season with aired/scheduled episodes when no season params are supplied", async () => {
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
    expect(payload.meta?.expected_episode_count).toBe(1);
    expect(payload.meta?.expected_episode_numbers).toEqual([4]);
    expect(payload.meta?.coverage_found_episode_count).toBe(1);
    expect(payload.meta?.coverage_expected_slots).toBe(3);
    expect(payload.meta?.coverage_found_slots).toBe(1);
    expect(payload.meta?.coverage_missing_slots).toEqual([
      { episode_number: 4, discussion_type: "post" },
      { episode_number: 4, discussion_type: "weekly" },
    ]);
    expect(payload.meta?.discovery_source_summary).toEqual({
      listing_count: 65,
      search_count: 2,
      search_pages_fetched: 5,
      gap_fill_queries_run: 1,
    });
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
        seasonEpisodes: [{ episode_number: 4, air_date: "2026-02-24" }],
      }),
    );
    expect(getSeasonsByShowIdMock).toHaveBeenCalledWith(
      SHOW_ID,
      expect.objectContaining({
        includeEpisodeSignal: true,
      }),
    );
    expect(getEpisodesBySeasonIdMock).toHaveBeenCalledWith(
      SEASON_ID,
      expect.objectContaining({ limit: 500, offset: 0 }),
    );
    expect(getEpisodesByShowAndSeasonMock).toHaveBeenCalledWith(
      SHOW_ID,
      6,
      expect.objectContaining({ limit: 500, offset: 0 }),
    );
    expect(createRedditThreadMock).not.toHaveBeenCalled();
  });

  it("falls back to highest season number when none have episode air_date signal", async () => {
    getSeasonsByShowIdMock.mockResolvedValueOnce([
      {
        id: "77777777-7777-4777-8777-777777777777",
        show_id: SHOW_ID,
        season_number: 7,
        has_scheduled_or_aired_episode: false,
      },
      {
        id: SEASON_ID,
        show_id: SHOW_ID,
        season_number: 6,
        has_scheduled_or_aired_episode: false,
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    expect(response.status).toBe(200);
    expect(discoverEpisodeDiscussionThreadsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonNumber: 7,
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

  it("sync=true auto-saves only eligible AutoModerator same-day episode discussion posts", async () => {
    discoverEpisodeDiscussionThreadsMock.mockResolvedValueOnce({
      subreddit: "BravoRealHousewives",
      fetched_at: "2026-02-24T12:00:00.000Z",
      sources_fetched: ["new"],
      successful_sorts: ["new"],
      failed_sorts: [],
      rate_limited_sorts: [],
      candidates: [
        {
          reddit_post_id: "eligible-post",
          title:
            "The Real Housewives Of Salt Lake City - Season 6 - Episode 1 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/eligible-post/test/",
          permalink: "/r/BravoRealHousewives/comments/eligible-post/test/",
          author: "AutoModerator",
          score: 120,
          num_comments: 55,
          posted_at: "2026-02-25T04:20:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 1,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
        {
          reddit_post_id: "ineligible-post",
          title:
            "The Real Housewives Of Salt Lake City - Season 6 - Episode 1 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/ineligible-post/test/",
          permalink: "/r/BravoRealHousewives/comments/ineligible-post/test/",
          author: "user-123",
          score: 15,
          num_comments: 5,
          posted_at: "2026-02-25T04:20:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 1,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
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
    getEpisodesBySeasonIdMock.mockResolvedValueOnce([
      {
        id: "ep-1",
        season_id: SEASON_ID,
        episode_number: 1,
        air_date: "2026-02-24",
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh?sync=true`,
      { method: "GET" },
    );
    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta?.sync_requested).toBe(true);
    expect(payload.meta?.sync_auto_saved_count).toBe(1);
    expect(payload.meta?.sync_auto_saved_post_ids).toEqual(["eligible-post"]);
    expect(payload.meta?.sync_skipped_ineligible_count).toBe(1);
    expect(payload.meta?.sync_candidate_results).toEqual([
      expect.objectContaining({
        reddit_post_id: "eligible-post",
        status: "auto_saved",
        reason_code: "auto_saved_success",
      }),
      expect.objectContaining({
        reddit_post_id: "ineligible-post",
        status: "not_eligible",
        reason_code: "author_not_automoderator",
        reason: "Author is not AutoModerator.",
      }),
    ]);
    expect(createRedditThreadMock).toHaveBeenCalledTimes(1);
    expect(createRedditThreadMock).toHaveBeenCalledWith(
      expect.objectContaining({ firebaseUid: "admin-uid", isAdmin: true }),
      expect.objectContaining({
        communityId: COMMUNITY_ID,
        trrSeasonId: SEASON_ID,
        sourceKind: "episode_discussion",
        redditPostId: "eligible-post",
      }),
    );
  });

  it("sync=true resolves episode air dates when season episode_number values are numeric strings", async () => {
    discoverEpisodeDiscussionThreadsMock.mockResolvedValueOnce({
      subreddit: "BravoRealHousewives",
      fetched_at: "2026-02-24T12:00:00.000Z",
      sources_fetched: ["new"],
      successful_sorts: ["new"],
      failed_sorts: [],
      rate_limited_sorts: [],
      candidates: [
        {
          reddit_post_id: "eligible-post",
          title:
            "The Real Housewives Of Salt Lake City - Season 6 - Episode 1 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/eligible-post/test/",
          permalink: "/r/BravoRealHousewives/comments/eligible-post/test/",
          author: "AutoModerator",
          score: 120,
          num_comments: 55,
          posted_at: "2026-02-24T23:20:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 1,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
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
    getEpisodesBySeasonIdMock.mockResolvedValueOnce([
      {
        id: "ep-1",
        season_id: SEASON_ID,
        episode_number: "1",
        air_date: "2026-02-24",
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh?sync=true`,
      { method: "GET" },
    );
    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta?.sync_auto_saved_count).toBe(1);
    expect(payload.meta?.sync_candidate_results).toEqual([
      expect.objectContaining({
        reddit_post_id: "eligible-post",
        status: "auto_saved",
        reason_code: "auto_saved_success",
      }),
    ]);
    expect(createRedditThreadMock).toHaveBeenCalledTimes(1);
  });

  it("sync=true tracks cross-community conflicts without failing", async () => {
    discoverEpisodeDiscussionThreadsMock.mockResolvedValueOnce({
      subreddit: "BravoRealHousewives",
      fetched_at: "2026-02-24T12:00:00.000Z",
      sources_fetched: ["new"],
      successful_sorts: ["new"],
      failed_sorts: [],
      rate_limited_sorts: [],
      candidates: [
        {
          reddit_post_id: "conflict-post",
          title: "RHOSLC - Season 6 - Episode 4 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/conflict-post/test/",
          permalink: "/r/BravoRealHousewives/comments/conflict-post/test/",
          author: "AutoModerator",
          score: 120,
          num_comments: 55,
          posted_at: "2026-02-25T04:20:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 4,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
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
    createRedditThreadMock.mockRejectedValueOnce(
      new Error("Thread already exists in another community for this show"),
    );

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh?sync=1`,
      { method: "GET" },
    );
    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta?.sync_requested).toBe(true);
    expect(payload.meta?.sync_auto_saved_count).toBe(0);
    expect(payload.meta?.sync_skipped_conflicts).toEqual(["conflict-post"]);
    expect(payload.meta?.sync_candidate_results).toEqual([
      expect.objectContaining({
        reddit_post_id: "conflict-post",
        status: "skipped_conflict",
        reason_code: "already_saved_other_community",
      }),
    ]);
  });

  it("sync uses America/New_York date matching for UTC boundary times", async () => {
    discoverEpisodeDiscussionThreadsMock.mockResolvedValueOnce({
      subreddit: "BravoRealHousewives",
      fetched_at: "2026-02-24T12:00:00.000Z",
      sources_fetched: ["new"],
      successful_sorts: ["new"],
      failed_sorts: [],
      rate_limited_sorts: [],
      candidates: [
        {
          reddit_post_id: "tz-post",
          title: "RHOSLC - Season 6 - Episode 4 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/tz-post/test/",
          permalink: "/r/BravoRealHousewives/comments/tz-post/test/",
          author: "AutoModerator",
          score: 120,
          num_comments: 55,
          posted_at: "2026-02-24T04:30:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 4,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
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
    getEpisodesBySeasonIdMock.mockResolvedValueOnce([
      {
        id: "ep-1",
        season_id: SEASON_ID,
        episode_number: 4,
        air_date: "2026-02-23",
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh?sync=true`,
      { method: "GET" },
    );
    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta?.sync_auto_saved_count).toBe(1);
    expect(payload.meta?.sync_candidate_results).toEqual([
      expect.objectContaining({
        reddit_post_id: "tz-post",
        status: "auto_saved",
        reason_code: "auto_saved_success",
      }),
    ]);
    expect(createRedditThreadMock).toHaveBeenCalledTimes(1);
  });

  it("sync=true returns explicit reason_code branches for non-eligible candidates", async () => {
    discoverEpisodeDiscussionThreadsMock.mockResolvedValueOnce({
      subreddit: "BravoRealHousewives",
      fetched_at: "2026-02-24T12:00:00.000Z",
      sources_fetched: ["new"],
      successful_sorts: ["new"],
      failed_sorts: [],
      rate_limited_sorts: [],
      candidates: [
        {
          reddit_post_id: "missing-title-token",
          title: "RHOSLC - Season 6 - Episode 2 - Live Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/missing-title-token/test/",
          permalink: "/r/BravoRealHousewives/comments/missing-title-token/test/",
          author: "AutoModerator",
          score: 20,
          num_comments: 10,
          posted_at: "2026-02-24T13:00:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 2,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
        {
          reddit_post_id: "missing-air-date",
          title: "RHOSLC - Season 6 - Episode 3 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/missing-air-date/test/",
          permalink: "/r/BravoRealHousewives/comments/missing-air-date/test/",
          author: "AutoModerator",
          score: 25,
          num_comments: 11,
          posted_at: "2026-02-24T13:10:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 3,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
        {
          reddit_post_id: "missing-posted-at",
          title: "RHOSLC - Season 6 - Episode 4 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/missing-posted-at/test/",
          permalink: "/r/BravoRealHousewives/comments/missing-posted-at/test/",
          author: "AutoModerator",
          score: 30,
          num_comments: 12,
          posted_at: null,
          link_flair_text: "Salt Lake City",
          episode_number: 4,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
        {
          reddit_post_id: "invalid-posted-at",
          title: "RHOSLC - Season 6 - Episode 5 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/invalid-posted-at/test/",
          permalink: "/r/BravoRealHousewives/comments/invalid-posted-at/test/",
          author: "AutoModerator",
          score: 40,
          num_comments: 13,
          posted_at: "not-a-date",
          link_flair_text: "Salt Lake City",
          episode_number: 5,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
        {
          reddit_post_id: "posted-date-mismatch",
          title: "RHOSLC - Season 6 - Episode 6 - Live Episode Discussion",
          text: null,
          url: "https://www.reddit.com/r/BravoRealHousewives/comments/posted-date-mismatch/test/",
          permalink: "/r/BravoRealHousewives/comments/posted-date-mismatch/test/",
          author: "AutoModerator",
          score: 50,
          num_comments: 14,
          posted_at: "2026-02-24T20:00:00.000Z",
          link_flair_text: "Salt Lake City",
          episode_number: 6,
          discussion_type: "live",
          source_sorts: ["new"],
          match_reasons: ["title pattern: Live Episode Discussion"],
        },
      ],
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
    getEpisodesBySeasonIdMock.mockResolvedValueOnce([
      {
        id: "ep-2",
        season_id: SEASON_ID,
        episode_number: 2,
        air_date: "2026-02-24",
      },
      {
        id: "ep-4",
        season_id: SEASON_ID,
        episode_number: 4,
        air_date: "2026-02-24",
      },
      {
        id: "ep-5",
        season_id: SEASON_ID,
        episode_number: 5,
        air_date: "2026-02-24",
      },
      {
        id: "ep-6",
        season_id: SEASON_ID,
        episode_number: 6,
        air_date: "2026-02-23",
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/refresh?sync=true`,
      { method: "GET" },
    );
    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta?.sync_auto_saved_count).toBe(0);
    expect(payload.meta?.sync_skipped_ineligible_count).toBe(5);
    expect(createRedditThreadMock).not.toHaveBeenCalled();

    expect(payload.meta?.sync_candidate_results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reddit_post_id: "missing-title-token",
          status: "not_eligible",
          reason_code: "title_missing_episode_discussion",
        }),
        expect.objectContaining({
          reddit_post_id: "missing-air-date",
          status: "not_eligible",
          reason_code: "missing_episode_air_date",
        }),
        expect.objectContaining({
          reddit_post_id: "missing-posted-at",
          status: "not_eligible",
          reason_code: "missing_post_timestamp",
        }),
        expect.objectContaining({
          reddit_post_id: "invalid-posted-at",
          status: "not_eligible",
          reason_code: "invalid_post_timestamp",
        }),
        expect.objectContaining({
          reddit_post_id: "posted-date-mismatch",
          status: "not_eligible",
          reason_code: "posted_date_mismatch",
        }),
      ]),
    );
  });
});
