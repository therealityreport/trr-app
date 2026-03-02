import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  listRedditCommunitiesMock,
  listRedditCommunitiesWithThreadsMock,
  createRedditCommunityMock,
  normalizeSubredditMock,
  isValidSubredditMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  listRedditCommunitiesMock: vi.fn(),
  listRedditCommunitiesWithThreadsMock: vi.fn(),
  createRedditCommunityMock: vi.fn(),
  normalizeSubredditMock: vi.fn((value: string) => value.replace(/^r\//i, "")),
  isValidSubredditMock: vi.fn(() => true),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  listRedditCommunities: listRedditCommunitiesMock,
  listRedditCommunitiesWithThreads: listRedditCommunitiesWithThreadsMock,
  createRedditCommunity: createRedditCommunityMock,
  normalizeSubreddit: normalizeSubredditMock,
  isValidSubreddit: isValidSubredditMock,
}));

import { GET, POST } from "@/app/api/admin/reddit/communities/route";

const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SEASON_ID = "22222222-2222-4222-8222-222222222222";

describe("/api/admin/reddit/communities route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    listRedditCommunitiesMock.mockReset();
    listRedditCommunitiesWithThreadsMock.mockReset();
    createRedditCommunityMock.mockReset();
    normalizeSubredditMock.mockClear();
    isValidSubredditMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    isValidSubredditMock.mockReturnValue(true);
  });

  it("returns communities list with season-aware filters", async () => {
    listRedditCommunitiesMock.mockResolvedValue([
      {
        id: "community-1",
        subreddit: "BravoRealHousewives",
        post_flares: ["Episode Discussion", "Live Thread"],
        post_flares_updated_at: "2026-02-17T00:00:00.000Z",
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities?trr_show_id=${SHOW_ID}&trr_season_id=${SEASON_ID}`,
      { method: "GET" },
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.communities).toHaveLength(1);
    expect(payload.communities[0]).toMatchObject({
      post_flares: ["Episode Discussion", "Live Thread"],
      post_flares_updated_at: "2026-02-17T00:00:00.000Z",
      assigned_thread_count: 0,
      assigned_threads: [],
    });
    expect(listRedditCommunitiesMock).toHaveBeenCalledWith({
      trrShowId: SHOW_ID,
      includeInactive: false,
    });
    expect(listRedditCommunitiesWithThreadsMock).not.toHaveBeenCalled();
  });

  it("includes assigned threads when include_assigned_threads=1", async () => {
    listRedditCommunitiesWithThreadsMock.mockResolvedValue([
      {
        id: "community-1",
        subreddit: "BravoRealHousewives",
        post_flares: ["Episode Discussion"],
        post_flares_updated_at: "2026-02-17T00:00:00.000Z",
        assigned_thread_count: 1,
        assigned_threads: [{ id: "thread-1", title: "Episode Thread" }],
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities?trr_show_id=${SHOW_ID}&trr_season_id=${SEASON_ID}&include_assigned_threads=1`,
      { method: "GET" },
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.communities[0]?.assigned_thread_count).toBe(1);
    expect(listRedditCommunitiesWithThreadsMock).toHaveBeenCalledWith({
      trrShowId: SHOW_ID,
      trrSeasonId: SEASON_ID,
      includeInactive: false,
      includeGlobalThreadsForSeason: true,
    });
  });

  it("returns 400 for invalid UUID query filters", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/reddit/communities?trr_show_id=not-a-uuid",
      { method: "GET" },
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("trr_show_id");
    expect(listRedditCommunitiesMock).not.toHaveBeenCalled();
    expect(listRedditCommunitiesWithThreadsMock).not.toHaveBeenCalled();
  });

  it("validates required POST fields", async () => {
    const request = new NextRequest("http://localhost/api/admin/reddit/communities", {
      method: "POST",
      body: JSON.stringify({ subreddit: "BravoRealHousewives" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("trr_show_id");
    expect(createRedditCommunityMock).not.toHaveBeenCalled();
  });

  it("creates a community when payload is valid", async () => {
    createRedditCommunityMock.mockResolvedValue({
      id: "community-1",
      trr_show_id: SHOW_ID,
      trr_show_name: "The Real Housewives of Salt Lake City",
      subreddit: "BravoRealHousewives",
      post_flares: [],
      post_flares_updated_at: null,
      analysis_flares: [],
      analysis_all_flares: [],
      is_show_focused: false,
      network_focus_targets: ["Bravo"],
      franchise_focus_targets: ["Real Housewives"],
      episode_title_patterns: ["Live Episode Discussion"],
    });

    const request = new NextRequest("http://localhost/api/admin/reddit/communities", {
      method: "POST",
      body: JSON.stringify({
        trr_show_id: SHOW_ID,
        trr_show_name: "The Real Housewives of Salt Lake City",
        subreddit: "r/BravoRealHousewives",
        is_show_focused: false,
        network_focus_targets: ["Bravo"],
        franchise_focus_targets: ["Real Housewives"],
        episode_title_patterns: ["Live Episode Discussion"],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.community?.id).toBe("community-1");
    expect(normalizeSubredditMock).toHaveBeenCalledWith("r/BravoRealHousewives");
    expect(createRedditCommunityMock).toHaveBeenCalledWith(
      { firebaseUid: "admin-uid", isAdmin: true },
      expect.objectContaining({
        trrShowId: SHOW_ID,
        trrShowName: "The Real Housewives of Salt Lake City",
        subreddit: "BravoRealHousewives",
        isShowFocused: false,
        networkFocusTargets: ["Bravo"],
        franchiseFocusTargets: ["Real Housewives"],
        episodeTitlePatterns: ["Live Episode Discussion"],
      }),
    );
  });

  it("rejects invalid focus target payloads", async () => {
    const request = new NextRequest("http://localhost/api/admin/reddit/communities", {
      method: "POST",
      body: JSON.stringify({
        trr_show_id: SHOW_ID,
        trr_show_name: "The Real Housewives of Salt Lake City",
        subreddit: "BravoRealHousewives",
        network_focus_targets: ["Bravo", 123],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("network_focus_targets");
    expect(createRedditCommunityMock).not.toHaveBeenCalled();
  });

  it("rejects invalid episode rule payloads", async () => {
    const request = new NextRequest("http://localhost/api/admin/reddit/communities", {
      method: "POST",
      body: JSON.stringify({
        trr_show_id: SHOW_ID,
        trr_show_name: "The Real Housewives of Salt Lake City",
        subreddit: "BravoRealHousewives",
        episode_title_patterns: ["Live Episode Discussion", 1],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("episode_title_patterns");
    expect(createRedditCommunityMock).not.toHaveBeenCalled();
  });

  it("rejects deprecated episode_required_flares on create payload", async () => {
    const request = new NextRequest("http://localhost/api/admin/reddit/communities", {
      method: "POST",
      body: JSON.stringify({
        trr_show_id: SHOW_ID,
        trr_show_name: "The Real Housewives of Salt Lake City",
        subreddit: "BravoRealHousewives",
        episode_title_patterns: ["Live Episode Discussion"],
        episode_required_flares: ["Salt Lake City", 123],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toContain("episode_required_flares");
    expect(createRedditCommunityMock).not.toHaveBeenCalled();
  });
});
