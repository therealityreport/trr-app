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

import { GET } from "@/app/api/admin/reddit/communities/[communityId]/posts/[postId]/details/route";

const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";
const SEASON_ID = "66666666-6666-4666-8666-666666666666";
const POST_ID = "abc123";

describe("/api/admin/reddit/communities/[communityId]/posts/[postId]/details route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
  });

  it("returns backend-owned post details for a valid request", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        post: {
          reddit_post_id: POST_ID,
          title: "Test title",
        },
      },
      durationMs: 9,
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/posts/${POST_ID}/details?season_id=${SEASON_ID}&comments_limit=100`,
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID, postId: POST_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.post.reddit_post_id).toBe(POST_ID);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/reddit/communities/${COMMUNITY_ID}/posts/${POST_ID}/details?season_id=${SEASON_ID}&comments_limit=100`,
      expect.objectContaining({
        routeName: "reddit-post-detail",
      }),
    );
  });

  it("returns 400 for invalid communityId", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/not-a-uuid/posts/${POST_ID}/details?season_id=${SEASON_ID}`,
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ communityId: "not-a-uuid", postId: POST_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("communityId");
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid season_id", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/posts/${POST_ID}/details?season_id=bad-id`,
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID, postId: POST_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("season_id");
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("maps backend 404s", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: { detail: "Post not found for community and season" },
      durationMs: 2,
    });
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/posts/${POST_ID}/details?season_id=${SEASON_ID}`,
      { method: "GET" },
    );
    const response = await GET(request, {
      params: Promise.resolve({ communityId: COMMUNITY_ID, postId: POST_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toContain("Post not found");
  });
});
