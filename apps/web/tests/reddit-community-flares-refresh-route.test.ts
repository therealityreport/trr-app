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

describe("/api/admin/reddit/communities/[communityId]/flares/refresh route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getRedditCommunityByIdMock.mockReset();
    updateRedditCommunityPostFlaresMock.mockReset();
    fetchSubredditPostFlaresMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getRedditCommunityByIdMock.mockResolvedValue({
      id: "community-1",
      subreddit: "BravoRealHousewives",
    });
    updateRedditCommunityPostFlaresMock.mockResolvedValue({
      id: "community-1",
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

    const request = new NextRequest("http://localhost/api/admin/reddit/communities/community-1/flares/refresh", {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ communityId: "community-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.flares).toEqual(["Episode Discussion", "Live Thread"]);
    expect(payload.source).toBe("api");
    expect(updateRedditCommunityPostFlaresMock).toHaveBeenCalledWith(
      { firebaseUid: "admin-uid", isAdmin: true },
      "community-1",
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
      id: "community-1",
      subreddit: "BravoRealHousewives",
      post_flares: [],
      post_flares_updated_at: "2026-02-17T00:00:00.000Z",
    });

    const request = new NextRequest("http://localhost/api/admin/reddit/communities/community-1/flares/refresh", {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ communityId: "community-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.flares).toEqual([]);
    expect(payload.source).toBe("none");
    expect(payload.community?.post_flares).toEqual([]);
  });

  it("returns 404 when community is missing", async () => {
    getRedditCommunityByIdMock.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/admin/reddit/communities/community-1/flares/refresh", {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ communityId: "community-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("Community not found");
  });

  it("maps auth failures to 403", async () => {
    requireAdminMock.mockRejectedValue(new Error("forbidden"));

    const request = new NextRequest("http://localhost/api/admin/reddit/communities/community-1/flares/refresh", {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ communityId: "community-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("forbidden");
  });
});
