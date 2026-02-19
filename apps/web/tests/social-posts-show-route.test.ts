import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getPostsByShowIdMock,
  getPostsBySeasonIdMock,
  createPostMock,
  getSeasonByIdMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getPostsByShowIdMock: vi.fn(),
  getPostsBySeasonIdMock: vi.fn(),
  createPostMock: vi.fn(),
  getSeasonByIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/social-posts-repository", () => ({
  getPostsByShowId: getPostsByShowIdMock,
  getPostsBySeasonId: getPostsBySeasonIdMock,
  createPost: createPostMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getSeasonById: getSeasonByIdMock,
}));

import { GET, POST } from "@/app/api/admin/trr-api/shows/[showId]/social-posts/route";

const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SEASON_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_SHOW_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("/api/admin/trr-api/shows/[showId]/social-posts route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getPostsByShowIdMock.mockReset();
    getPostsBySeasonIdMock.mockReset();
    createPostMock.mockReset();
    getSeasonByIdMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
  });

  it("returns 400 for invalid showId", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/bad-id/social-posts", {
      method: "GET",
    });
    const response = await GET(request, {
      params: Promise.resolve({ showId: "bad-id" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("showId");
    expect(getPostsByShowIdMock).not.toHaveBeenCalled();
  });

  it("returns 400 when trr_season_id is invalid", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${SHOW_ID}/social-posts?trr_season_id=bad-id`,
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("trr_season_id");
    expect(getPostsBySeasonIdMock).not.toHaveBeenCalled();
  });

  it("returns 400 when season does not belong to show", async () => {
    getSeasonByIdMock.mockResolvedValue({
      id: SEASON_ID,
      show_id: OTHER_SHOW_ID,
    });

    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${SHOW_ID}/social-posts?trr_season_id=${SEASON_ID}`,
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("must belong");
    expect(getPostsBySeasonIdMock).not.toHaveBeenCalled();
  });

  it("lists season posts when season belongs to show", async () => {
    getSeasonByIdMock.mockResolvedValue({
      id: SEASON_ID,
      show_id: SHOW_ID,
    });
    getPostsBySeasonIdMock.mockResolvedValue([{ id: "post-1" }]);

    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${SHOW_ID}/social-posts?trr_season_id=${SEASON_ID}`,
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.posts).toHaveLength(1);
    expect(getPostsBySeasonIdMock).toHaveBeenCalledWith(SEASON_ID);
  });

  it("rejects POST when trr_season_id belongs to another show", async () => {
    getSeasonByIdMock.mockResolvedValue({
      id: SEASON_ID,
      show_id: OTHER_SHOW_ID,
    });
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${SHOW_ID}/social-posts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "instagram",
          url: "https://example.com/post/1",
          trr_season_id: SEASON_ID,
        }),
      },
    );
    const response = await POST(request, {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("must belong");
    expect(createPostMock).not.toHaveBeenCalled();
  });

  it("creates post when season belongs to show", async () => {
    getSeasonByIdMock.mockResolvedValue({
      id: SEASON_ID,
      show_id: SHOW_ID,
    });
    createPostMock.mockResolvedValue({
      id: "post-1",
      trr_show_id: SHOW_ID,
    });
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${SHOW_ID}/social-posts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "instagram",
          url: "https://example.com/post/1",
          trr_season_id: SEASON_ID,
          title: "title",
        }),
      },
    );
    const response = await POST(request, {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.post.id).toBe("post-1");
    expect(createPostMock).toHaveBeenCalledWith(
      { firebaseUid: "admin-uid", isAdmin: true },
      expect.objectContaining({
        trr_show_id: SHOW_ID,
        trr_season_id: SEASON_ID,
      }),
    );
  });
});

