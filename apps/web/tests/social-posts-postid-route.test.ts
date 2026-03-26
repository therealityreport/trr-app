import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { requireAdminMock, fetchAdminBackendJsonMock, getBackendApiUrlMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
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

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

import { DELETE, GET, PUT } from "@/app/api/admin/social-posts/[postId]/route";

const POST_ID = "44444444-4444-4444-8444-444444444444";
const SEASON_ID = "22222222-2222-4222-8222-222222222222";

describe("/api/admin/social-posts/[postId] route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getBackendApiUrlMock.mockImplementation((path: string) => `https://backend.example.com/api/v1${path}`);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET = "internal-secret";
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
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("reads a social post through the backend proxy", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { post: { id: POST_ID } },
      durationMs: 4,
    });

    const request = new NextRequest(`http://localhost/api/admin/social-posts/${POST_ID}`, {
      method: "GET",
    });
    const response = await GET(request, {
      params: Promise.resolve({ postId: POST_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.post.id).toBe(POST_ID);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/social-posts/${POST_ID}`,
      expect.objectContaining({ routeName: "social-posts:detail" }),
    );
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
  });

  it("returns 400 when PUT trr_season_id is not UUID", async () => {
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
  });

  it("updates a post through the backend proxy with admin uid", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ post: { id: POST_ID, trr_season_id: SEASON_ID } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

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
    expect(fetchMock).toHaveBeenCalledWith(
      `https://backend.example.com/api/v1/admin/social-posts/${POST_ID}`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ trr_season_id: SEASON_ID }),
      }),
    );
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer service-role-secret");
    expect(headers["X-TRR-Internal-Admin-Secret"]).toBe("internal-secret");
    expect(headers["X-TRR-Admin-User-Uid"]).toBe("admin-uid");
  });

  it("maps backend 404s for PUT", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Post not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(`http://localhost/api/admin/social-posts/${POST_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "new" }),
    });
    const response = await PUT(request, {
      params: Promise.resolve({ postId: POST_ID }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Post not found" });
  });

  it("deletes a post through the backend proxy with admin uid", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(`http://localhost/api/admin/social-posts/${POST_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ postId: POST_ID }),
    });

    expect(response.status).toBe(200);
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer service-role-secret");
    expect(headers["X-TRR-Internal-Admin-Secret"]).toBe("internal-secret");
    expect(headers["X-TRR-Admin-User-Uid"]).toBe("admin-uid");
  });
});
