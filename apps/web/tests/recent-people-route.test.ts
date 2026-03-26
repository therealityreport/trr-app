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

import { GET, POST } from "@/app/api/admin/recent-people/route";

describe("/api/admin/recent-people", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "firebase-admin-1" });
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
});
