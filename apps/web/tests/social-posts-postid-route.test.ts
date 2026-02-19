import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getPostByIdMock,
  updatePostMock,
  deletePostMock,
  getSeasonByIdMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getPostByIdMock: vi.fn(),
  updatePostMock: vi.fn(),
  deletePostMock: vi.fn(),
  getSeasonByIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/social-posts-repository", () => ({
  getPostById: getPostByIdMock,
  updatePost: updatePostMock,
  deletePost: deletePostMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getSeasonById: getSeasonByIdMock,
}));

import { GET, PUT } from "@/app/api/admin/social-posts/[postId]/route";

const POST_ID = "44444444-4444-4444-8444-444444444444";
const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SEASON_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_SHOW_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("/api/admin/social-posts/[postId] route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getPostByIdMock.mockReset();
    updatePostMock.mockReset();
    deletePostMock.mockReset();
    getSeasonByIdMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
  });

  it("returns 400 for invalid postId in GET", async () => {
    const request = new NextRequest("http://localhost/api/admin/social-posts/bad-id", {
      method: "GET",
    });
    const response = await GET(request, {
      params: Promise.resolve({ postId: "bad-id" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("postId");
  });

  it("returns 400 for invalid postId in PUT", async () => {
    const request = new NextRequest("http://localhost/api/admin/social-posts/bad-id", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    const response = await PUT(request, {
      params: Promise.resolve({ postId: "bad-id" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("postId");
    expect(updatePostMock).not.toHaveBeenCalled();
  });

  it("returns 400 when PUT trr_season_id is not UUID", async () => {
    getPostByIdMock.mockResolvedValue({
      id: POST_ID,
      trr_show_id: SHOW_ID,
    });
    const request = new NextRequest(`http://localhost/api/admin/social-posts/${POST_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trr_season_id: "bad-id" }),
    });
    const response = await PUT(request, {
      params: Promise.resolve({ postId: POST_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("trr_season_id");
    expect(updatePostMock).not.toHaveBeenCalled();
  });

  it("returns 400 when target season belongs to another show", async () => {
    getPostByIdMock.mockResolvedValue({
      id: POST_ID,
      trr_show_id: SHOW_ID,
    });
    getSeasonByIdMock.mockResolvedValue({
      id: SEASON_ID,
      show_id: OTHER_SHOW_ID,
    });
    const request = new NextRequest(`http://localhost/api/admin/social-posts/${POST_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trr_season_id: SEASON_ID }),
    });
    const response = await PUT(request, {
      params: Promise.resolve({ postId: POST_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("must belong");
    expect(updatePostMock).not.toHaveBeenCalled();
  });

  it("updates post when target season belongs to post show", async () => {
    getPostByIdMock.mockResolvedValue({
      id: POST_ID,
      trr_show_id: SHOW_ID,
    });
    getSeasonByIdMock.mockResolvedValue({
      id: SEASON_ID,
      show_id: SHOW_ID,
    });
    updatePostMock.mockResolvedValue({
      id: POST_ID,
      trr_show_id: SHOW_ID,
      trr_season_id: SEASON_ID,
    });
    const request = new NextRequest(`http://localhost/api/admin/social-posts/${POST_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trr_season_id: SEASON_ID }),
    });
    const response = await PUT(request, {
      params: Promise.resolve({ postId: POST_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.post.id).toBe(POST_ID);
    expect(updatePostMock).toHaveBeenCalledWith(
      { firebaseUid: "admin-uid", isAdmin: true },
      POST_ID,
      expect.objectContaining({ trr_season_id: SEASON_ID }),
    );
  });
});

