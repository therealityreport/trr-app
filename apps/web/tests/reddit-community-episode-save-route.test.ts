import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getRedditCommunityByIdMock,
  getSeasonByIdMock,
  createRedditThreadMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getRedditCommunityByIdMock: vi.fn(),
  getSeasonByIdMock: vi.fn(),
  createRedditThreadMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  getRedditCommunityById: getRedditCommunityByIdMock,
  createRedditThread: createRedditThreadMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getSeasonById: getSeasonByIdMock,
}));

import { POST } from "@/app/api/admin/reddit/communities/[communityId]/episode-discussions/save/route";

const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";
const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SEASON_ID = "22222222-2222-4222-8222-222222222222";

describe("/api/admin/reddit/communities/[communityId]/episode-discussions/save", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getRedditCommunityByIdMock.mockReset();
    getSeasonByIdMock.mockReset();
    createRedditThreadMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getRedditCommunityByIdMock.mockResolvedValue({
      id: COMMUNITY_ID,
      trr_show_id: SHOW_ID,
      trr_show_name: "The Real Housewives of Salt Lake City",
      subreddit: "BravoRealHousewives",
    });
    getSeasonByIdMock.mockResolvedValue({ id: SEASON_ID, show_id: SHOW_ID });
    createRedditThreadMock.mockResolvedValue({ id: "thread-1" });
  });

  it("bulk-saves selected episode discussion threads without show_id/show_name", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/save`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season_id: SEASON_ID,
          threads: [
            {
              reddit_post_id: "post-1",
              title: "Live Episode Discussion",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-1/test/",
              permalink: "/r/BravoRealHousewives/comments/post-1/test/",
              author: "user1",
              score: 200,
              num_comments: 50,
              posted_at: "2026-02-24T12:00:00.000Z",
            },
          ],
        }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.saved_count).toBe(1);
    expect(payload.skipped_duplicates).toEqual([]);
    expect(createRedditThreadMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        trrShowId: SHOW_ID,
        trrShowName: "The Real Housewives of Salt Lake City",
      }),
    );
  });

  it("rejects legacy show_id/show_name payload", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/save`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show_id: SHOW_ID,
          show_name: "The Real Housewives of Salt Lake City",
          season_id: null,
          threads: [
            {
              reddit_post_id: "post-legacy",
              title: "Post Episode Discussion",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-legacy/test/",
            },
          ],
        }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Legacy body params");
    expect(createRedditThreadMock).not.toHaveBeenCalled();
  });

  it("rejects season_id that does not belong to community show", async () => {
    getSeasonByIdMock.mockResolvedValueOnce({
      id: SEASON_ID,
      show_id: "99999999-9999-4999-8999-999999999999",
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/save`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season_id: SEASON_ID,
          threads: [
            {
              reddit_post_id: "post-1",
              title: "Live Episode Discussion",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-1/test/",
            },
          ],
        }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("season_id");
  });

  it("rejects invalid payload shapes", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/save`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threads: [
            {
              reddit_post_id: "post-1",
              title: "Live Episode Discussion",
              url: "https://example.com/not-reddit",
            },
          ],
        }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("valid Reddit URLs");
  });

  it("rejects invalid posted_at datetime values", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/save`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season_id: SEASON_ID,
          threads: [
            {
              reddit_post_id: "post-invalid-date",
              title: "Live Episode Discussion",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-invalid-date/test/",
              posted_at: "not-a-date",
            },
          ],
        }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("posted_at");
  });

  it("deduplicates repeated reddit_post_id values before save", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/save`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season_id: null,
          threads: [
            {
              reddit_post_id: "post-dupe",
              title: "Post Episode Discussion",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-dupe/test/",
            },
            {
              reddit_post_id: "POST-DUPE",
              title: "Post Episode Discussion duplicate",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-dupe/test/",
            },
          ],
        }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.saved_count).toBe(1);
    expect(payload.skipped_duplicates).toEqual(["POST-DUPE"]);
    expect(createRedditThreadMock).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized thread payloads", async () => {
    const threads = Array.from({ length: 251 }, (_, index) => ({
      reddit_post_id: `post-${index}`,
      title: "Live Episode Discussion",
      url: `https://www.reddit.com/r/BravoRealHousewives/comments/post-${index}/test/`,
    }));
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/save`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threads }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("at most 250");
    expect(createRedditThreadMock).not.toHaveBeenCalled();
  });

  it("rejects legacy show fields when provided", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/reddit/communities/${COMMUNITY_ID}/episode-discussions/save`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show_id: SHOW_ID,
          show_name: "The Real Housewives of Salt Lake City",
          threads: [
            {
              reddit_post_id: "post-legacy",
              title: "Post Episode Discussion",
              url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-legacy/test/",
            },
          ],
        }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ communityId: COMMUNITY_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Legacy body params");
    expect(createRedditThreadMock).not.toHaveBeenCalled();
  });
});
