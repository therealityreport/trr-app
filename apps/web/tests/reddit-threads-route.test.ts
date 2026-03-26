import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  listRedditThreadsMock,
  getRedditCommunityByIdMock,
  createRedditThreadMock,
  getCachedStableReadMock,
  loadStableRedditReadMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  listRedditThreadsMock: vi.fn(),
  getRedditCommunityByIdMock: vi.fn(),
  createRedditThreadMock: vi.fn(),
  getCachedStableReadMock: vi.fn(async ({ loader }) => ({ payload: await loader(), cacheHit: false })),
  loadStableRedditReadMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  listRedditThreads: listRedditThreadsMock,
  getRedditCommunityById: getRedditCommunityByIdMock,
  createRedditThread: createRedditThreadMock,
}));

vi.mock("@/lib/server/trr-api/reddit-stable-route-cache", () => ({
  buildUserScopedRouteCacheKey: vi.fn(
    (userId: string, scope: string, searchParams?: URLSearchParams) =>
      `${userId}:${scope}:${searchParams?.toString() ?? ""}`,
  ),
  getCachedStableRead: getCachedStableReadMock,
  REDDIT_STABLE_LIST_CACHE_NAMESPACE: "admin-reddit-stable-list",
  REDDIT_STABLE_LIST_CACHE_TTL_MS: 5_000,
}));

vi.mock("@/lib/server/trr-api/reddit-stable-read", () => ({
  loadStableRedditRead: loadStableRedditReadMock,
}));

import { GET, POST } from "@/app/api/admin/reddit/threads/route";

const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";
const SHOW_ID = "11111111-1111-4111-8111-111111111111";

describe("/api/admin/reddit/threads route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    listRedditThreadsMock.mockReset();
    getRedditCommunityByIdMock.mockReset();
    createRedditThreadMock.mockReset();
    getCachedStableReadMock.mockReset();
    loadStableRedditReadMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getCachedStableReadMock.mockImplementation(async ({ loader }) => ({
      payload: await loader(),
      cacheHit: false,
    }));
    getRedditCommunityByIdMock.mockResolvedValue({
      id: COMMUNITY_ID,
      trr_show_id: SHOW_ID,
      trr_show_name: "The Real Housewives of Salt Lake City",
    });
  });

  it("returns 400 when GET query IDs are invalid UUIDs", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/reddit/threads?community_id=bad-id",
      { method: "GET" },
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("community_id");
    expect(listRedditThreadsMock).not.toHaveBeenCalled();
  });

  it("routes GET through the backend stable read path", async () => {
    loadStableRedditReadMock.mockResolvedValue({
      payload: {
        threads: [{ id: "thread-1", title: "Stored thread" }],
      },
      source: "backend",
    });

    const request = new NextRequest(
      `http://localhost/api/admin/reddit/threads?community_id=${COMMUNITY_ID}&trr_show_id=${SHOW_ID}&include_global_threads_for_season=true`,
      { method: "GET" },
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.threads).toHaveLength(1);
    expect(loadStableRedditReadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        backendPath: "/admin/reddit/threads",
        routeName: "reddit-threads:list",
      }),
    );
  });

  it("rejects non-Reddit URLs", async () => {
    const request = new NextRequest("http://localhost/api/admin/reddit/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        community_id: COMMUNITY_ID,
        trr_show_id: SHOW_ID,
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
        community_id: COMMUNITY_ID,
        trr_show_id: SHOW_ID,
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
    expect(createRedditThreadMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        sourceKind: "manual",
      }),
    );
  });

  it("returns 400 when POST IDs are invalid UUIDs", async () => {
    const request = new NextRequest("http://localhost/api/admin/reddit/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        community_id: "bad-id",
        trr_show_id: SHOW_ID,
        trr_show_name: "The Real Housewives of Salt Lake City",
        reddit_post_id: "post-1",
        title: "Thread title",
        url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-1/thread-title/",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("community_id");
    expect(createRedditThreadMock).not.toHaveBeenCalled();
  });
});
