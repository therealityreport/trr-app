import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  listRedditThreadsMock,
  getRedditCommunityByIdMock,
  createRedditThreadMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  listRedditThreadsMock: vi.fn(),
  getRedditCommunityByIdMock: vi.fn(),
  createRedditThreadMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  listRedditThreads: listRedditThreadsMock,
  getRedditCommunityById: getRedditCommunityByIdMock,
  createRedditThread: createRedditThreadMock,
}));

import { POST } from "@/app/api/admin/reddit/threads/route";

describe("/api/admin/reddit/threads route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    listRedditThreadsMock.mockReset();
    getRedditCommunityByIdMock.mockReset();
    createRedditThreadMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getRedditCommunityByIdMock.mockResolvedValue({
      id: "community-1",
      trr_show_id: "show-1",
      trr_show_name: "The Real Housewives of Salt Lake City",
    });
  });

  it("rejects non-Reddit URLs", async () => {
    const request = new NextRequest("http://localhost/api/admin/reddit/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        community_id: "community-1",
        trr_show_id: "show-1",
        trr_show_name: "The Real Housewives of Salt Lake City",
        reddit_post_id: "post-1",
        title: "Thread title",
        url: "https://example.com/comments/post-1/thread-title",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("url must be a valid Reddit URL");
    expect(getRedditCommunityByIdMock).not.toHaveBeenCalled();
    expect(createRedditThreadMock).not.toHaveBeenCalled();
  });

  it("accepts Reddit URLs and creates thread", async () => {
    createRedditThreadMock.mockResolvedValue({
      id: "thread-1",
      title: "Thread title",
    });

    const request = new NextRequest("http://localhost/api/admin/reddit/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        community_id: "community-1",
        trr_show_id: "show-1",
        trr_show_name: "The Real Housewives of Salt Lake City",
        reddit_post_id: "post-1",
        title: "Thread title",
        url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-1/thread-title/",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.thread?.id).toBe("thread-1");
    expect(createRedditThreadMock).toHaveBeenCalled();
  });
});
