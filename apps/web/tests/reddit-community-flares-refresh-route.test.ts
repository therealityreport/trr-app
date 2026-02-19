import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getRedditCommunityByIdMock,
  updateRedditCommunityPostFlaresMock,
  fetchSubredditPostFlaresMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getRedditCommunityByIdMock: vi.fn(),
  updateRedditCommunityPostFlaresMock: vi.fn(),
  fetchSubredditPostFlaresMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  getRedditCommunityById: getRedditCommunityByIdMock,
  updateRedditCommunityPostFlares: updateRedditCommunityPostFlaresMock,
}));

vi.mock("@/lib/server/admin/reddit-flairs-service", () => ({
  fetchSubredditPostFlares: fetchSubredditPostFlaresMock,
}));

import { POST } from "@/app/api/admin/reddit/communities/[communityId]/flares/refresh/route";

const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";

describe("/api/admin/reddit/communities/[communityId]/flares/refresh route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getRedditCommunityByIdMock.mockReset();
    updateRedditCommunityPostFlaresMock.mockReset();
    fetchSubredditPostFlaresMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getRedditCommunityByIdMock.mockResolvedValue({
      id: COMMUNITY_ID,
      subreddit: "BravoRealHousewives",
    });
    updateRedditCommunityPostFlaresMock.mockResolvedValue({
      id: COMMUNITY_ID,
      subreddit: "BravoRealHousewives",
      post_flares: ["Episode Discussion"],
      post_flares_updated_at: "2026-02-17T00:00:00.000Z",
    });
  });

  it("returns refreshed non-empty post flares", async () => {
    fetchSubredditPostFlaresMock.mockResolvedValue({
      flares: ["Episode Discussion", "Live Thread"],
      source: "api",
      warning: null,
    });

    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/flares/refresh`, {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.flares).toEqual(["Episode Discussion", "Live Thread"]);
    expect(payload.source).toBe("api");
    expect(updateRedditCommunityPostFlaresMock).toHaveBeenCalledWith(
      { firebaseUid: "admin-uid", isAdmin: true },
      COMMUNITY_ID,
      ["Episode Discussion", "Live Thread"],
      expect.any(String),
    );
  });

  it("returns success with empty post flares when none are available", async () => {
    fetchSubredditPostFlaresMock.mockResolvedValue({
      flares: [],
      source: "none",
      warning: null,
    });
    updateRedditCommunityPostFlaresMock.mockResolvedValue({
      id: COMMUNITY_ID,
      subreddit: "BravoRealHousewives",
      post_flares: [],
      post_flares_updated_at: "2026-02-17T00:00:00.000Z",
    });

    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/flares/refresh`, {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.flares).toEqual([]);
    expect(payload.source).toBe("none");
    expect(payload.community?.post_flares).toEqual([]);
  });

  it("returns 404 when community is missing", async () => {
    getRedditCommunityByIdMock.mockResolvedValue(null);

    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/flares/refresh`, {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("Community not found");
  });

  it("maps auth failures to 403", async () => {
    requireAdminMock.mockRejectedValue(new Error("forbidden"));

    const request = new NextRequest(`http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/flares/refresh`, {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("forbidden");
  });

  it("returns 400 for invalid communityId", async () => {
    const request = new NextRequest("http://localhost/api/admin/reddit/communities/not-a-uuid/flares/refresh", {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ communityId: "not-a-uuid" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("communityId");
    expect(getRedditCommunityByIdMock).not.toHaveBeenCalled();
  });
});
