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

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast/route";

describe("season cast route proxy parity", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("forwards default season-cast params and preserves fallback envelope", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        cast: [{ person_id: "p-fallback", person_name: "Fallback Person", episodes_in_season: 0 }],
        cast_source: "show_fallback",
        eligibility_warning: "fallback",
        pagination: { limit: 500, offset: 0, count: 1 },
        include_archive_only: false,
      },
      durationMs: 7,
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/seasons/1/cast");
    const response = await GET(request, {
      params: Promise.resolve({ showId: "show-1", seasonNumber: "1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-1/seasons/1/cast?limit=500&offset=0&photo_fallback=none",
      expect.objectContaining({ routeName: "season-cast" }),
    );
    expect(payload.cast_source).toBe("show_fallback");
  });

  it("passes include_archive_only and photo_fallback through unchanged", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        cast: [],
        cast_source: "season_evidence",
        eligibility_warning: null,
        pagination: { limit: 500, offset: 0, count: 0 },
        include_archive_only: true,
      },
      durationMs: 4,
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/seasons/1/cast?include_archive_only=true&photo_fallback=bravo",
    );
    const response = await GET(request, {
      params: Promise.resolve({ showId: "show-1", seasonNumber: "1" }),
    });

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-1/seasons/1/cast?limit=500&offset=0&photo_fallback=bravo&include_archive_only=true",
      expect.objectContaining({ routeName: "season-cast" }),
    );
  });
});
