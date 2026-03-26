import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getRedditCommunityByIdMock,
  getRedditThreadByIdMock,
  getCachedStableReadMock,
  loadStableRedditReadMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getRedditCommunityByIdMock: vi.fn(),
  getRedditThreadByIdMock: vi.fn(),
  getCachedStableReadMock: vi.fn(async ({ loader }) => ({ payload: await loader(), cacheHit: false })),
  loadStableRedditReadMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({
  getRedditCommunityById: getRedditCommunityByIdMock,
  getRedditThreadById: getRedditThreadByIdMock,
}));

vi.mock("@/lib/server/trr-api/reddit-stable-route-cache", () => ({
  buildUserScopedRouteCacheKey: vi.fn(
    (userId: string, scope: string, searchParams?: URLSearchParams) =>
      `${userId}:${scope}:${searchParams?.toString() ?? ""}`,
  ),
  getCachedStableRead: getCachedStableReadMock,
  REDDIT_STABLE_DETAIL_CACHE_NAMESPACE: "admin-reddit-stable-detail",
  REDDIT_STABLE_DETAIL_CACHE_TTL_MS: 10_000,
}));

vi.mock("@/lib/server/trr-api/reddit-stable-read", () => ({
  loadStableRedditRead: loadStableRedditReadMock,
}));

import { GET } from "@/app/api/admin/reddit/threads/[threadId]/route";

const THREAD_ID = "44444444-4444-4444-8444-444444444444";

describe("/api/admin/reddit/threads/[threadId] route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getRedditCommunityByIdMock.mockReset();
    getRedditThreadByIdMock.mockReset();
    getCachedStableReadMock.mockReset();
    loadStableRedditReadMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getCachedStableReadMock.mockImplementation(async ({ loader }) => ({
      payload: await loader(),
      cacheHit: false,
    }));
  });

  it("routes GET through the backend stable read path", async () => {
    loadStableRedditReadMock.mockResolvedValue({
      payload: {
        thread: {
          id: THREAD_ID,
          title: "Episode thread",
          community_id: "community-1",
        },
      },
      source: "backend",
    });

    const request = new NextRequest(`http://localhost/api/admin/reddit/threads/${THREAD_ID}`, {
      method: "GET",
    });
    const response = await GET(request, { params: Promise.resolve({ threadId: THREAD_ID }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.thread?.id).toBe(THREAD_ID);
    expect(loadStableRedditReadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        backendPath: `/admin/reddit/threads/${THREAD_ID}`,
        routeName: "reddit-threads:detail",
      }),
    );
  });

  it("rejects invalid thread IDs", async () => {
    const request = new NextRequest("http://localhost/api/admin/reddit/threads/not-a-uuid", {
      method: "GET",
    });
    const response = await GET(request, {
      params: Promise.resolve({ threadId: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    expect(loadStableRedditReadMock).not.toHaveBeenCalled();
  });
});
