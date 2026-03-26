import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { requireAdminMock, fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: error instanceof Error && error.message === "unauthorized" ? 401 : 500 },
    ),
}));

import { GET, POST } from "@/app/api/admin/trr-api/shows/[showId]/social-posts/route";

const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SEASON_ID = "22222222-2222-4222-8222-222222222222";

describe("/api/admin/trr-api/shows/[showId]/social-posts route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
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
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
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
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("lists season posts through the backend proxy", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { posts: [{ id: "post-1" }] },
      durationMs: 6,
    });

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
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/shows/${SHOW_ID}/social-posts`,
      expect.objectContaining({
        routeName: "social-posts:list",
        queryString: `trr_season_id=${SEASON_ID}`,
      }),
    );
  });

  it("maps backend 404s on GET", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: { detail: "Season not found" },
      durationMs: 3,
    });

    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${SHOW_ID}/social-posts?trr_season_id=${SEASON_ID}`,
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "Season not found" });
  });

  it("creates post through the backend proxy with admin uid", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 201,
      data: {
        post: {
          id: "post-1",
          trr_show_id: SHOW_ID,
          trr_season_id: SEASON_ID,
        },
      },
      durationMs: 7,
    });

    const request = new NextRequest(`http://localhost/api/admin/trr-api/shows/${SHOW_ID}/social-posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "instagram",
        url: "https://example.com/post/1",
        trr_season_id: SEASON_ID,
        title: "title",
      }),
    });
    const response = await POST(request, {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.post.id).toBe("post-1");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/shows/${SHOW_ID}/social-posts`,
      expect.objectContaining({
        method: "POST",
        routeName: "social-posts:create",
        headers: {
          "Content-Type": "application/json",
          "X-TRR-Admin-User-Uid": "admin-uid",
        },
        body: JSON.stringify({
          platform: "instagram",
          url: "https://example.com/post/1",
          trr_season_id: SEASON_ID,
          title: "title",
          notes: null,
        }),
      }),
    );
  });

  it("returns backend validation errors on POST", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 400,
      data: { detail: "Season does not belong to show" },
      durationMs: 2,
    });

    const request = new NextRequest(`http://localhost/api/admin/trr-api/shows/${SHOW_ID}/social-posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "instagram",
        url: "https://example.com/post/1",
        trr_season_id: SEASON_ID,
      }),
    });
    const response = await POST(request, {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Season does not belong to show" });
  });
});
