import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";

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
    NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 }),
}));

import { GET } from "@/app/api/admin/trr-api/shows/route";

describe("/api/admin/trr-api/shows", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { shows: [], pagination: { limit: 100, offset: 0, count: 0 } },
      durationMs: 4,
    });
  });

  it("rejects malformed explicit pagination values before proxying", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/shows?q=bravo&limit=abc"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("limit must be an integer");
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("clamps valid out-of-range pagination values before proxying", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/shows?q=bravo&limit=999&offset=-4"),
    );

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows?q=bravo&limit=100&offset=0",
      expect.objectContaining({ routeName: "admin-shows" }),
    );
  });
});
