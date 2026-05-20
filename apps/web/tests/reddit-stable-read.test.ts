import { beforeEach, describe, expect, it, vi } from "vitest";

const { AdminReadProxyErrorMock, fetchAdminBackendJsonMock } = vi.hoisted(() => {
  class AdminReadProxyError extends Error {
    status: number;
    retryable?: boolean;

    constructor(message: string, status: number, options?: { retryable?: boolean }) {
      super(message);
      this.status = status;
      this.retryable = options?.retryable;
    }
  }

  return {
    AdminReadProxyErrorMock: AdminReadProxyError,
    fetchAdminBackendJsonMock: vi.fn(),
  };
});

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: AdminReadProxyErrorMock,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
}));

import { loadStableRedditRead } from "@/lib/server/trr-api/reddit-stable-read";

describe("stable reddit read helper", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
  });

  it("returns backend payloads when the upstream route is available", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { community: { id: "community-1" } },
      durationMs: 9,
    });

    const result = await loadStableRedditRead({
      backendPath: "/admin/reddit/communities/community-1",
      routeName: "reddit-communities:detail",
      fallback: async () => ({ community: null }),
    });

    expect(result.source).toBe("backend");
    expect(result.upstreamStatus).toBe(200);
    expect(result.payload).toEqual({ community: { id: "community-1" } });
  });

  it("falls back to the local loader when the backend route is missing", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: { error: "not found" },
      durationMs: 2,
    });

    const fallback = vi.fn(async () => ({ community: { id: "community-1" } }));
    const result = await loadStableRedditRead({
      backendPath: "/admin/reddit/communities/community-1",
      routeName: "reddit-communities:detail",
      fallback,
    });

    expect(result.source).toBe("local");
    expect(result.upstreamStatus).toBe(404);
    expect(result.payload).toEqual({ community: { id: "community-1" } });
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it("falls back to the local repository when the backend read times out", async () => {
    fetchAdminBackendJsonMock.mockRejectedValueOnce(
      new AdminReadProxyErrorMock("Admin read request timed out after 12s", 504, {
        retryable: true,
      }),
    );

    const result = await loadStableRedditRead({
      backendPath: "/admin/reddit/communities",
      routeName: "reddit-communities:list",
      fallback: async () => ({ communities: [{ id: "local-community" }] }),
    });

    expect(result).toEqual({
      payload: { communities: [{ id: "local-community" }] },
      source: "local",
      upstreamStatus: 504,
    });
  });
});
