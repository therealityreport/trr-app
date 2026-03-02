import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  requireAdminMock,
  getRedditCommunityByIdMock,
  getShowByIdMock,
  getCastNamesByShowIdMock,
  fetchSocialBackendJsonMock,
  socialProxyErrorResponseMock,
} = vi.hoisted(() => {
  return {
    requireAdminMock: vi.fn(),
    getRedditCommunityByIdMock: vi.fn(),
    getShowByIdMock: vi.fn(),
    getCastNamesByShowIdMock: vi.fn(),
    fetchSocialBackendJsonMock: vi.fn(),
    socialProxyErrorResponseMock: vi.fn((error: unknown) => {
      const message = error instanceof Error ? error.message : "failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }),
  };
});

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  getRedditCommunityById: getRedditCommunityByIdMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getShowById: getShowByIdMock,
  getCastNamesByShowId: getCastNamesByShowIdMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET } from "@/app/api/admin/reddit/communities/[communityId]/discover/route";

const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";
const SEASON_ID = "66666666-6666-4666-8666-666666666666";
const SHOW_ID = "11111111-1111-4111-8111-111111111111";

const DISCOVERY_RESULT = {
  subreddit: "BravoRealHousewives",
  fetched_at: "2026-02-28T12:00:00.000Z",
  collection_mode: "exhaustive_window" as const,
  sources_fetched: ["new"] as Array<"new" | "hot" | "top">,
  successful_sorts: ["new"] as Array<"new" | "hot" | "top">,
  failed_sorts: [] as Array<"new" | "hot" | "top">,
  rate_limited_sorts: [] as Array<"new" | "hot" | "top">,
  listing_pages_fetched: 2,
  max_pages_applied: 500,
  window_exhaustive_complete: true,
  totals: {
    fetched_rows: 1,
    matched_rows: 1,
    tracked_flair_rows: 1,
  },
  window_start: "2025-08-14T00:00:00.000Z",
  window_end: "2025-09-16T23:00:00.000Z",
  terms: ["rhoslc"],
  hints: {
    suggested_include_terms: [],
    suggested_exclude_terms: [],
  },
  threads: [
    {
      reddit_post_id: "post-1",
      title: "Live Scraped Salt Lake City Post",
      text: "Body",
      url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-1/test/",
      permalink: "/r/BravoRealHousewives/comments/post-1/test/",
      author: "user1",
      score: 10,
      num_comments: 7,
      posted_at: "2025-09-16T18:10:00.000Z",
      link_flair_text: "Salt Lake City",
      source_sorts: ["new"] as Array<"new" | "hot" | "top">,
      matched_terms: ["rhoslc"],
      matched_cast_terms: [],
      cross_show_terms: [],
      is_show_match: true,
      passes_flair_filter: true,
      match_score: 1,
      suggested_include_terms: [],
      suggested_exclude_terms: [],
    },
  ],
};

describe("/api/admin/reddit/communities/[communityId]/discover route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getRedditCommunityByIdMock.mockReset();
    getShowByIdMock.mockReset();
    getCastNamesByShowIdMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockClear();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getRedditCommunityByIdMock.mockResolvedValue({
      id: COMMUNITY_ID,
      trr_show_id: SHOW_ID,
      trr_show_name: "The Real Housewives of Salt Lake City",
      trr_season_id: SEASON_ID,
      subreddit: "BravoRealHousewives",
      is_show_focused: false,
      analysis_flares: ["Salt Lake City"],
      analysis_all_flares: ["Salt Lake City"],
    });
    getShowByIdMock.mockResolvedValue({
      id: SHOW_ID,
      name: "The Real Housewives of Salt Lake City",
      alternative_names: ["RHOSLC"],
    });
    getCastNamesByShowIdMock.mockResolvedValue(["Meredith Marks", "Lisa Barlow"]);
  });

  it("uses backend cached posts for period-window discovery when refresh is not requested", async () => {
    fetchSocialBackendJsonMock.mockResolvedValueOnce({
      discovery: DISCOVERY_RESULT,
      matched_period_key: "period-preseason",
      misses: [],
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/discover?season_id=${SEASON_ID}&period_start=2025-08-14T00:00:00.000Z&period_end=2025-09-16T23:00:00.000Z&exhaustive=true&search_backfill=true&force_flair=Salt%20Lake%20City&max_pages=500`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.source).toBe("cache");
    expect(payload.cache).toEqual({
      hit_used: true,
      fallback_used: false,
      forced_refresh: false,
    });
    expect(fetchSocialBackendJsonMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/reddit/cache/bulk",
      expect.objectContaining({ method: "POST" }),
    );
    expect(payload.discovery?.threads?.[0]?.reddit_post_id).toBe("post-1");
  });

  it("uses bulk cache lookup request body with all candidate period keys", async () => {
    fetchSocialBackendJsonMock.mockResolvedValueOnce({
      discovery: DISCOVERY_RESULT,
      matched_period_key: "community:period-preseason",
      misses: ["legacy-fallback"],
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/discover?season_id=${SEASON_ID}&period_start=2025-08-14T00:00:00.000Z&period_end=2025-09-16T23:00:00.000Z&container_key=period-preseason`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.cache?.hit_used).toBe(true);
    expect(payload.source).toBe("cache");
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/reddit/cache/bulk",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining(COMMUNITY_ID),
      }),
    );
    const bulkBody = JSON.parse(
      (fetchSocialBackendJsonMock.mock.calls[0]?.[1] as { body?: string }).body ?? "{}",
    ) as Record<string, unknown>;
    expect(Array.isArray(bulkBody.container_keys)).toBe(true);
    expect(bulkBody.container_keys).toEqual(["period-preseason"]);
  });

  it("starts backend refresh run and returns cached payload immediately when refresh=true", async () => {
    fetchSocialBackendJsonMock
      .mockResolvedValueOnce({
        run: {
          run_id: "run-123",
          status: "queued",
        },
      })
      .mockResolvedValueOnce({
        discovery: DISCOVERY_RESULT,
        matched_period_key: "period-preseason",
        misses: [],
      });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/discover?season_id=${SEASON_ID}&period_start=2025-08-14T00:00:00.000Z&period_end=2025-09-16T23:00:00.000Z&exhaustive=true&search_backfill=true&force_flair=Salt%20Lake%20City&max_pages=500&refresh=true`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.source).toBe("live_run");
    expect(payload.cache).toEqual({
      hit_used: true,
      fallback_used: false,
      forced_refresh: true,
    });
    expect(payload.warning).toContain("Refresh queued");
    expect(payload.run).toEqual({
      run_id: "run-123",
      status: "queued",
    });
    expect(fetchSocialBackendJsonMock).toHaveBeenNthCalledWith(
      1,
      "/reddit/runs",
      expect.objectContaining({ method: "POST" }),
    );
    const runBody = JSON.parse(
      (fetchSocialBackendJsonMock.mock.calls[0]?.[1] as { body?: string }).body ?? "{}",
    ) as Record<string, unknown>;
    expect(runBody.search_backfill).toBe(true);
    expect(runBody.force_include_flares).toEqual(["Salt Lake City"]);
    expect(runBody.fetch_comments).toBe(true);
    expect(fetchSocialBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      "/reddit/cache/bulk",
      expect.any(Object),
    );
    expect(payload.discovery?.threads?.[0]?.reddit_post_id).toBe("post-1");
  });

  it("wait=true polls status for completion when explicitly requested", async () => {
    fetchSocialBackendJsonMock
      .mockResolvedValueOnce({
        run: {
          run_id: "run-234",
          status: "queued",
        },
      })
      .mockResolvedValueOnce({
        run_id: "run-234",
        status: "completed",
        discovery: DISCOVERY_RESULT,
      });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/discover?season_id=${SEASON_ID}&period_start=2025-08-14T00:00:00.000Z&period_end=2025-09-16T23:00:00.000Z&refresh=true&wait=true`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.source).toBe("live_run");
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledTimes(2);
    expect(fetchSocialBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      "/reddit/runs/run-234",
      expect.any(Object),
    );
    expect(payload.discovery?.threads?.[0]?.reddit_post_id).toBe("post-1");
  });

  it("falls back to backend cache when wait=true polling fails", async () => {
    fetchSocialBackendJsonMock
      .mockResolvedValueOnce({
        run: {
          run_id: "run-345",
          status: "queued",
        },
      })
      .mockRejectedValueOnce(new Error("Request timed out. Please try again."))
      .mockRejectedValueOnce(new Error("Request timed out. Please try again."))
      .mockRejectedValueOnce(new Error("Request timed out. Please try again."))
      .mockRejectedValueOnce(new Error("Request timed out. Please try again."))
      .mockRejectedValueOnce(new Error("Request timed out. Please try again."))
      .mockResolvedValueOnce({
        discovery: DISCOVERY_RESULT,
        matched_period_key: "period-preseason",
        misses: [],
      });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/discover?season_id=${SEASON_ID}&period_start=2025-08-14T00:00:00.000Z&period_end=2025-09-16T23:00:00.000Z&refresh=true&wait=true`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.source).toBe("live_run");
    expect(payload.cache).toEqual({
      hit_used: false,
      fallback_used: true,
      forced_refresh: true,
    });
    expect(fetchSocialBackendJsonMock.mock.calls.length).toBeGreaterThanOrEqual(7);
    expect(payload.discovery?.threads?.[0]?.reddit_post_id).toBe("post-1");
  }, 12_000);

  it("uses stable container period key for cache lookup and run start when container_key is provided", async () => {
    fetchSocialBackendJsonMock
      .mockResolvedValueOnce({
        run: {
          run_id: "run-456",
          status: "queued",
        },
      })
      .mockResolvedValueOnce({ discovery: DISCOVERY_RESULT });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/discover?season_id=${SEASON_ID}&period_start=2025-08-14T00:00:00.000Z&period_end=2025-09-16T23:00:00.000Z&container_key=period-preseason&period_label=Pre-Season&refresh=true`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.source).toBe("live_run");
    const runBody = JSON.parse(
      (fetchSocialBackendJsonMock.mock.calls[0]?.[1] as { body?: string }).body ?? "{}",
    ) as Record<string, unknown>;
    expect(String(runBody.period_key ?? "")).toContain(":container:period-preseason");
    expect(runBody.period_stable_key).toBe("period-preseason");
    expect(runBody.container_key).toBe("period-preseason");
    expect(runBody.period_label).toBe("Pre-Season");
    expect(runBody.coverage_mode).toBe("adaptive_deep");
    expect(typeof runBody.run_config_hash).toBe("string");
    expect(String(runBody.run_config_hash).length).toBeGreaterThanOrEqual(32);
    expect(payload.discovery?.threads?.[0]?.reddit_post_id).toBe("post-1");
  });

  it("defaults episode container refreshes to standard coverage mode", async () => {
    fetchSocialBackendJsonMock
      .mockResolvedValueOnce({
        run: {
          run_id: "run-567",
          status: "queued",
        },
      })
      .mockResolvedValueOnce({ discovery: DISCOVERY_RESULT });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/discover?season_id=${SEASON_ID}&period_start=2025-09-16T23:01:01.000Z&period_end=2025-09-23T23:01:10.000Z&container_key=episode-1&period_label=Episode%201&refresh=true`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    const runBody = JSON.parse(
      (fetchSocialBackendJsonMock.mock.calls[0]?.[1] as { body?: string }).body ?? "{}",
    ) as Record<string, unknown>;
    expect(runBody.coverage_mode).toBe("standard");
    expect(runBody.period_stable_key).toBe("episode-1");
    expect(payload.discovery?.threads?.[0]?.reddit_post_id).toBe("post-1");
  });

  it("uses negative cache to suppress repeated miss lookups for the same period window", async () => {
    const communityId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const seasonId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    getRedditCommunityByIdMock.mockResolvedValue({
      id: communityId,
      trr_show_id: SHOW_ID,
      trr_show_name: "The Real Housewives of Salt Lake City",
      trr_season_id: seasonId,
      subreddit: "BravoRealHousewives",
      is_show_focused: false,
      analysis_flares: ["Salt Lake City"],
      analysis_all_flares: ["Salt Lake City"],
    });

    fetchSocialBackendJsonMock.mockImplementation(
      async (path: string, options?: { body?: string }) => {
        if (path !== "/reddit/cache/bulk") return {};
        const body = JSON.parse(options?.body ?? "{}") as { period_keys?: string[] };
        return {
          discovery: null,
          matched_period_key: null,
          misses: body.period_keys ?? [],
        };
      },
    );

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${communityId}/discover?season_id=${seasonId}&period_start=2025-08-14T00:00:00.000Z&period_end=2025-09-16T23:00:00.000Z`,
      { method: "GET" },
    );

    const first = await GET(request, { params: Promise.resolve({ communityId }) });
    const firstPayload = await first.json();
    expect(first.status).toBe(200);
    expect(firstPayload.discovery).toBeNull();

    const second = await GET(request, { params: Promise.resolve({ communityId }) });
    const secondPayload = await second.json();
    expect(second.status).toBe(200);
    expect(secondPayload.discovery).toBeNull();
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to legacy cache route when bulk cache endpoint is unavailable", async () => {
    const missingBulkRouteError = Object.assign(new Error("not found"), { status: 404 });
    fetchSocialBackendJsonMock.mockImplementation(async (path: string) => {
      if (path === "/reddit/cache/bulk") {
        throw missingBulkRouteError;
      }
      if (path === "/reddit/cache") {
        return { discovery: DISCOVERY_RESULT };
      }
      return {};
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/discover?season_id=${SEASON_ID}&period_start=2025-08-14T00:00:00.000Z&period_end=2025-09-16T23:00:00.000Z`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.discovery?.threads?.[0]?.reddit_post_id).toBe("post-1");
    expect(fetchSocialBackendJsonMock.mock.calls.some(([path]) => path === "/reddit/cache")).toBe(true);
  });
});
