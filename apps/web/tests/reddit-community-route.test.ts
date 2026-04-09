import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getRedditCommunityByIdMock,
  updateRedditCommunityMock,
  deleteRedditCommunityMock,
  normalizeSubredditMock,
  isValidSubredditMock,
  getCachedStableReadMock,
  loadStableRedditReadMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getRedditCommunityByIdMock: vi.fn(),
  updateRedditCommunityMock: vi.fn(),
  deleteRedditCommunityMock: vi.fn(),
  normalizeSubredditMock: vi.fn((value: string) => value.replace(/^r\//i, "")),
  isValidSubredditMock: vi.fn(() => true),
  getCachedStableReadMock: vi.fn(async ({ loader }) => ({ payload: await loader(), cacheHit: false })),
  loadStableRedditReadMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  deleteRedditCommunity: deleteRedditCommunityMock,
  getRedditCommunityById: getRedditCommunityByIdMock,
  isValidSubreddit: isValidSubredditMock,
  normalizeSubreddit: normalizeSubredditMock,
  updateRedditCommunity: updateRedditCommunityMock,
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

import { GET, PATCH } from "@/app/api/admin/reddit/communities/[communityId]/route";

const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";

describe("/api/admin/reddit/communities/[communityId] route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getRedditCommunityByIdMock.mockReset();
    updateRedditCommunityMock.mockReset();
    deleteRedditCommunityMock.mockReset();
    normalizeSubredditMock.mockClear();
    isValidSubredditMock.mockReset();
    getCachedStableReadMock.mockReset();
    loadStableRedditReadMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    isValidSubredditMock.mockReturnValue(true);
    getCachedStableReadMock.mockImplementation(async ({ loader }) => ({
      payload: await loader(),
      cacheHit: false,
    }));
  });

  it("returns community payload including analysis flairs", async () => {
    loadStableRedditReadMock.mockResolvedValue({
      payload: {
        community: {
          id: COMMUNITY_ID,
          subreddit: "BravoRealHousewives",
          analysis_flairs: ["Episode Discussion", "Live Thread"],
          analysis_all_flairs: ["Salt Lake City"],
          is_show_focused: false,
          network_focus_targets: ["Bravo"],
          franchise_focus_targets: ["Real Housewives"],
          episode_title_patterns: ["Live Episode Discussion"],
        },
      },
      source: "backend",
    });

    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}`, {
      method: "GET",
    });
    const response = await GET(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.community?.analysis_flairs).toEqual(["Episode Discussion", "Live Thread"]);
    expect(payload.community?.analysis_all_flairs).toEqual(["Salt Lake City"]);
    expect(payload.community?.network_focus_targets).toEqual(["Bravo"]);
    expect(payload.community?.franchise_focus_targets).toEqual(["Real Housewives"]);
    expect(payload.community?.episode_title_patterns).toEqual(["Live Episode Discussion"]);
    expect(loadStableRedditReadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        backendPath: `/admin/reddit/communities/${COMMUNITY_ID}`,
        routeName: "reddit-communities:detail",
      }),
    );
  });

  it("updates analysis flair modes when PATCH payload is valid", async () => {
    updateRedditCommunityMock.mockResolvedValue({
      id: COMMUNITY_ID,
      subreddit: "realhousewivesofSLC",
      analysis_flairs: ["S1", "S3", "S4"],
      analysis_all_flairs: ["Salt Lake City"],
      is_show_focused: true,
      network_focus_targets: [],
      franchise_focus_targets: [],
      episode_title_patterns: ["Live Episode Discussion"],
    });

    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}`, {
      method: "PATCH",
      body: JSON.stringify({
        analysis_flairs: ["S3 ❄️", "S1 ❄️", "S4 ❄️"],
        analysis_all_flairs: ["Salt Lake City"],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.community?.analysis_flairs).toEqual(["S1", "S3", "S4"]);
    expect(payload.community?.analysis_all_flairs).toEqual(["Salt Lake City"]);
    expect(updateRedditCommunityMock).toHaveBeenCalledWith(
      { firebaseUid: "admin-uid", isAdmin: true },
      COMMUNITY_ID,
      expect.objectContaining({
        analysisFlairs: ["S3 ❄️", "S1 ❄️", "S4 ❄️"],
        analysisAllFlairs: ["Salt Lake City"],
      }),
    );
  });

  it("rejects invalid analysis flair payloads", async () => {
    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}`, {
      method: "PATCH",
      body: JSON.stringify({
        analysis_flairs: ["Episode Discussion", 123],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("analysis_flairs");
    expect(updateRedditCommunityMock).not.toHaveBeenCalled();
  });

  it("rejects invalid analysis_all_flairs payloads", async () => {
    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}`, {
      method: "PATCH",
      body: JSON.stringify({
        analysis_all_flairs: ["Salt Lake City", 123],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("analysis_all_flairs");
    expect(updateRedditCommunityMock).not.toHaveBeenCalled();
  });

  it("updates community focus fields when PATCH focus payload is valid", async () => {
    updateRedditCommunityMock.mockResolvedValue({
      id: COMMUNITY_ID,
      subreddit: "BravoRealHousewives",
      analysis_flairs: [],
      analysis_all_flairs: [],
      is_show_focused: false,
      network_focus_targets: ["Bravo"],
      franchise_focus_targets: ["Real Housewives"],
      episode_title_patterns: ["Live Episode Discussion"],
    });

    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}`, {
      method: "PATCH",
      body: JSON.stringify({
        is_show_focused: false,
        network_focus_targets: ["Bravo"],
        franchise_focus_targets: ["Real Housewives"],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.community?.is_show_focused).toBe(false);
    expect(payload.community?.network_focus_targets).toEqual(["Bravo"]);
    expect(payload.community?.franchise_focus_targets).toEqual(["Real Housewives"]);
    expect(updateRedditCommunityMock).toHaveBeenCalledWith(
      { firebaseUid: "admin-uid", isAdmin: true },
      COMMUNITY_ID,
      expect.objectContaining({
        isShowFocused: false,
        networkFocusTargets: ["Bravo"],
        franchiseFocusTargets: ["Real Housewives"],
      }),
    );
  });

  it("updates episode discussion rules when PATCH payload is valid", async () => {
    updateRedditCommunityMock.mockResolvedValue({
      id: COMMUNITY_ID,
      subreddit: "BravoRealHousewives",
      analysis_flairs: [],
      analysis_all_flairs: [],
      is_show_focused: false,
      network_focus_targets: ["Bravo"],
      franchise_focus_targets: ["Real Housewives"],
      episode_title_patterns: ["Live Episode Discussion", "Post Episode Discussion"],
    });

    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}`, {
      method: "PATCH",
      body: JSON.stringify({
        episode_title_patterns: ["Post Episode Discussion", "Live Episode Discussion"],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.community?.episode_title_patterns).toEqual([
      "Live Episode Discussion",
      "Post Episode Discussion",
    ]);
    expect(updateRedditCommunityMock).toHaveBeenCalledWith(
      { firebaseUid: "admin-uid", isAdmin: true },
      COMMUNITY_ID,
      expect.objectContaining({
        episodeTitlePatterns: ["Post Episode Discussion", "Live Episode Discussion"],
      }),
    );
  });

  it("updates structured flair assignments when PATCH payload is valid", async () => {
    updateRedditCommunityMock.mockResolvedValue({
      id: COMMUNITY_ID,
      subreddit: "realhousewivesofSLC",
      analysis_flairs: [],
      analysis_all_flairs: [],
      is_show_focused: true,
      network_focus_targets: [],
      franchise_focus_targets: [],
      episode_title_patterns: ["Live Episode Discussion"],
      post_flair_assignments: {
        s6: {
          show_ids: ["show-1", "show-2"],
          season_ids: ["season-1"],
          person_ids: ["person-1"],
        },
      },
    });

    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}`, {
      method: "PATCH",
      body: JSON.stringify({
        post_flair_assignments: {
          "S6 ❄️": {
            show_ids: ["show-1", "show-2"],
            season_ids: ["season-1"],
            person_ids: ["person-1"],
          },
        },
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.community?.post_flair_assignments).toEqual({
      s6: {
        show_ids: ["show-1", "show-2"],
        season_ids: ["season-1"],
        person_ids: ["person-1"],
      },
    });
    expect(updateRedditCommunityMock).toHaveBeenCalledWith(
      { firebaseUid: "admin-uid", isAdmin: true },
      COMMUNITY_ID,
      expect.objectContaining({
        postFlairAssignments: {
          s6: {
            show_ids: ["show-1", "show-2"],
            season_ids: ["season-1"],
            person_ids: ["person-1"],
          },
        },
      }),
    );
  });

  it("rejects invalid structured flair assignments payloads", async () => {
    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}`, {
      method: "PATCH",
      body: JSON.stringify({
        post_flair_assignments: {
          S6: {
            show_ids: ["show-1", 2],
            season_ids: ["season-1"],
            person_ids: ["person-1"],
          },
        },
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("post_flair_assignments");
    expect(updateRedditCommunityMock).not.toHaveBeenCalled();
  });

  it("rejects invalid network_focus_targets payloads", async () => {
    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}`, {
      method: "PATCH",
      body: JSON.stringify({
        network_focus_targets: ["Bravo", 1],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("network_focus_targets");
    expect(updateRedditCommunityMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid communityId", async () => {
    const request = new NextRequest("http://localhost/api/admin/reddit/communities/not-a-uuid", {
      method: "GET",
    });

    const response = await GET(request, {
      params: Promise.resolve({ communityId: "not-a-uuid" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("communityId");
    expect(getRedditCommunityByIdMock).not.toHaveBeenCalled();
  });

  it("rejects deprecated episode_required_flairs payloads", async () => {
    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}`, {
      method: "PATCH",
      body: JSON.stringify({
        episode_title_patterns: ["Live Episode Discussion"],
        episode_required_flairs: ["Salt Lake City", 123],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("episode_required_flairs");
    expect(updateRedditCommunityMock).not.toHaveBeenCalled();
  });
});
