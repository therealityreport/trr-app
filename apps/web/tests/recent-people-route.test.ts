import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { TRR_RECENT_PEOPLE_CACHE_NAMESPACE } from "@/lib/server/trr-api/trr-show-read-route-cache";

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
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: error instanceof Error && error.message === "unauthorized" ? 401 : 500 },
    ),
}));

import { GET, POST } from "@/app/api/admin/recent-people/route";

describe("/api/admin/recent-people", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "firebase-admin-1" });
    invalidateRouteResponseCache(TRR_RECENT_PEOPLE_CACHE_NAMESPACE);
  });

  it("returns recent people scoped to current admin", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        people: [
          {
            person_id: "11111111-2222-3333-4444-555555555555",
            full_name: "Alan Cumming",
          },
        ],
        pagination: { limit: 5 },
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
        routeName: "recent-people:list",
        queryString: "limit=5",
        headers: {
          "X-TRR-Admin-User-Uid": "firebase-admin-1",
        },
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
        method: "POST",
        routeName: "recent-people:record",
        headers: {
          "Content-Type": "application/json",
          "X-TRR-Admin-User-Uid": "firebase-admin-1",
        },
        body: JSON.stringify({ personId, showId: "the-traitors-us" }),
      }),
    );
  });

  it("reuses cached recent people reads for the same admin and limit", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        people: [{ person_id: "11111111-2222-3333-4444-555555555555", full_name: "Alan Cumming" }],
        pagination: { limit: 5 },
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
          people: [{ person_id: "11111111-2222-3333-4444-555555555555", full_name: "Alan Cumming" }],
          pagination: { limit: 5 },
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
          people: [{ person_id: "99999999-2222-3333-4444-555555555555", full_name: "Phaedra Parks" }],
          pagination: { limit: 5 },
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
