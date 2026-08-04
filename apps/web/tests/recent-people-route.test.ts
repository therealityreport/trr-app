import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { TRR_RECENT_PEOPLE_CACHE_NAMESPACE } from "@/lib/server/trr-api/trr-show-read-route-cache";

const { requireAdminMock, toVerifiedAdminContextMock, fetchAdminBackendJsonMock, MockAdminReadProxyError } =
  vi.hoisted(() => {
    class TestAdminReadProxyError extends Error {
      status: number;
      code?: string;
      retryable?: boolean;

      constructor(
        message: string,
        status: number,
        options?: { code?: string; retryable?: boolean } | string,
        retryable?: boolean,
      ) {
        super(message);
        this.status = status;
        if (typeof options === "string") {
          this.code = options;
          this.retryable = retryable;
        } else {
          this.code = options?.code;
          this.retryable = options?.retryable;
        }
      }
    }
    return {
      requireAdminMock: vi.fn(),
      toVerifiedAdminContextMock: vi.fn(),
      fetchAdminBackendJsonMock: vi.fn(),
      MockAdminReadProxyError: TestAdminReadProxyError,
    };
  });

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminBackendStatusError: ({
    status,
    data,
    fallbackMessage,
  }: {
    status: number;
    data: Record<string, unknown>;
    fallbackMessage: string;
  }) => {
    const detail = data.detail as Record<string, unknown> | undefined;
    return new MockAdminReadProxyError(
      typeof detail?.message === "string" ? detail.message : fallbackMessage,
      status,
      typeof detail?.code === "string" ? detail.code : undefined,
      typeof detail?.retryable === "boolean" ? detail.retryable : status >= 500,
    );
  },
  buildAdminReadResponseHeaders: ({
    cacheStatus,
    upstreamMs,
  }: {
    cacheStatus: string;
    upstreamMs?: number | null;
  }) => {
    const headers: Record<string, string> = { "x-trr-cache": cacheStatus };
    if (typeof upstreamMs === "number") {
      headers["x-trr-upstream-ms"] = String(Math.round(upstreamMs));
    }
    return headers;
  },
  buildAdminProxyErrorResponse: (error: unknown) =>
    {
      const proxyError = error as InstanceType<typeof MockAdminReadProxyError>;
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "failed",
          ...(proxyError.code ? { code: proxyError.code } : {}),
          ...(typeof proxyError.retryable === "boolean" ? { retryable: proxyError.retryable } : {}),
        },
        {
          status:
            error instanceof Error && error.message === "unauthorized"
              ? 401
              : proxyError.status ?? 500,
        },
      );
    },
}));

import { GET, POST } from "@/app/api/admin/recent-people/route";

describe("/api/admin/recent-people", () => {
  const recentPerson = {
    person_id: "11111111-2222-3333-4444-555555555555",
    full_name: "Alan Cumming",
    known_for: "Reality TV",
    photo_url: "https://cdn.example.com/person.jpg",
    show_context: "the-traitors-us",
    view_count: 1,
    first_viewed_at: "2026-03-25T00:00:00Z",
    last_viewed_at: "2026-03-26T00:00:00Z",
  };

  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "firebase-admin-1" });
    toVerifiedAdminContextMock.mockReturnValue({
      uid: "firebase-admin-1",
      email: "admin@example.com",
      verifiedAt: 1_700_000_000_000,
    });
    invalidateRouteResponseCache(TRR_RECENT_PEOPLE_CACHE_NAMESPACE);
  });

  it("returns recent people scoped to current admin", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        people: [recentPerson],
        pagination: { limit: 5, count: 1 },
      },
      durationMs: 5,
    });

    const request = new NextRequest("http://localhost/api/admin/recent-people?limit=5");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(response.headers.get("x-trr-upstream-ms")).toBe("5");
    expect(payload.people).toHaveLength(1);
    expect(payload.pagination.limit).toBe(5);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/recent-people",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: expect.objectContaining({ uid: "firebase-admin-1" }),
        routeName: "recent-people:list",
        queryString: "limit=5",
      }),
    );
  });

  it("validates personId on POST", async () => {
    const request = new NextRequest("http://localhost/api/admin/recent-people", {
      method: "POST",
      body: JSON.stringify({ personId: "not-a-uuid" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("personId");
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("records recent person views and keeps show context", async () => {
    const personId = "11111111-2222-3333-4444-555555555555";
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { ok: true },
      durationMs: 4,
    });

    const request = new NextRequest("http://localhost/api/admin/recent-people", {
      method: "POST",
      body: JSON.stringify({ personId, showId: "the-traitors-us" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/recent-people",
      expect.objectContaining({
        apiVersion: "v2",
        method: "POST",
        adminContext: expect.objectContaining({ uid: "firebase-admin-1" }),
        routeName: "recent-people:record",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ personId, showId: "the-traitors-us" }),
      }),
    );
  });

  it("preserves typed backend problems for unavailable upstream reads", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 503,
      data: {
        detail: {
          code: "DATABASE_SERVICE_UNAVAILABLE",
          message: "Database service unavailable.",
          retryable: true,
        },
      },
      durationMs: 4,
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/recent-people?limit=5"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Database service unavailable.",
      code: "DATABASE_SERVICE_UNAVAILABLE",
      retryable: true,
    });
  });

  it("rejects malformed backend payloads instead of accepting extra fields", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        people: [
          {
            ...recentPerson,
            known_for: null,
            photo_url: null,
            show_context: null,
            view_count: 1,
            unexpected: true,
          },
        ],
        pagination: { limit: 5, count: 1 },
      },
      durationMs: 5,
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/recent-people?limit=5"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "TRR-Backend returned an invalid recent-people response",
      code: "INVALID_BACKEND_RESPONSE",
      retryable: false,
    });
  });

  it("reuses cached recent people reads for the same admin and limit", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        people: [recentPerson],
        pagination: { limit: 5, count: 1 },
      },
      durationMs: 5,
    });

    const request = new NextRequest("http://localhost/api/admin/recent-people?limit=5");
    const first = await GET(request);
    const second = await GET(request);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers.get("x-trr-cache")).toBe("hit");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);
  });

  it("invalidates the recent people cache after recording a new view", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({
        status: 200,
        data: {
          people: [recentPerson],
          pagination: { limit: 5, count: 1 },
        },
        durationMs: 5,
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { ok: true },
        durationMs: 4,
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          people: [
            {
              ...recentPerson,
              person_id: "99999999-2222-3333-4444-555555555555",
              full_name: "Phaedra Parks",
            },
          ],
          pagination: { limit: 5, count: 1 },
        },
        durationMs: 5,
      });

    const listRequest = new NextRequest("http://localhost/api/admin/recent-people?limit=5");
    await GET(listRequest);

    const postRequest = new NextRequest("http://localhost/api/admin/recent-people", {
      method: "POST",
      body: JSON.stringify({
        personId: "99999999-2222-3333-4444-555555555555",
        showId: "the-traitors-us",
      }),
      headers: { "content-type": "application/json" },
    });
    const postResponse = await POST(postRequest);
    expect(postResponse.status).toBe(200);

    const refreshedResponse = await GET(listRequest);
    const refreshedPayload = await refreshedResponse.json();

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(3);
    expect(refreshedPayload.people[0].full_name).toBe("Phaedra Parks");
  });
});
