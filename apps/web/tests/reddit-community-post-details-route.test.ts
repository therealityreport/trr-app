import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getRedditPostDetailsByCommunityAndSeasonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getRedditPostDetailsByCommunityAndSeasonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  getRedditPostDetailsByCommunityAndSeason: getRedditPostDetailsByCommunityAndSeasonMock,
}));

import { GET } from "@/app/api/admin/reddit/communities/[communityId]/posts/[postId]/details/route";

const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";
const SEASON_ID = "66666666-6666-4666-8666-666666666666";
const POST_ID = "abc123";

describe("/api/admin/reddit/communities/[communityId]/posts/[postId]/details route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getRedditPostDetailsByCommunityAndSeasonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
  });

  it("returns post details for a valid community/season/post request", async () => {
    getRedditPostDetailsByCommunityAndSeasonMock.mockResolvedValue({
      reddit_post_id: POST_ID,
      title: "Test title",
      comments: [],
      media: [],
      matches: [],
      assigned_threads: [],
      comment_summary: { total_comments: 0, top_level_comments: 0, reply_comments: 0 },
      media_summary: { total_media: 0, mirrored_media: 0, pending_media: 0, failed_media: 0 },
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
    expect(getRedditPostDetailsByCommunityAndSeasonMock).toHaveBeenCalledWith({
      communityId: COMMUNITY_ID,
      seasonId: SEASON_ID,
      redditPostId: POST_ID,
      commentsLimit: 100,
    });
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
    expect(getRedditPostDetailsByCommunityAndSeasonMock).not.toHaveBeenCalled();
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
    expect(getRedditPostDetailsByCommunityAndSeasonMock).not.toHaveBeenCalled();
  });

  it("returns 404 when post is not found", async () => {
    getRedditPostDetailsByCommunityAndSeasonMock.mockResolvedValue(null);
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
