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
  invalidateAdminBackendCache: vi.fn(),
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 }),
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/route";

describe("/api/admin/trr-api/shows/[showId]/seasons include episode signal", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
  });

  it("passes include_episode_signal through to the backend route", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        seasons: [
          {
            id: "season-6",
            season_number: 6,
            overview: "Salt Lake City returns.",
            has_scheduled_or_aired_episode: true,
            episode_airdate_count: 18,
          },
        ],
        pagination: { limit: 100, offset: 0, count: 1 },
      },
      durationMs: 4,
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/seasons?limit=100&include_episode_signal=true",
      { method: "GET" },
    );
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-1/seasons?limit=100&offset=0&include_episode_signal=true",
      expect.objectContaining({ routeName: "show-seasons" }),
    );
    expect(payload.seasons?.[0]).toMatchObject({
      overview: "Salt Lake City returns.",
      has_scheduled_or_aired_episode: true,
      episode_airdate_count: 18,
    });
  });

  it("keeps default behavior when include_episode_signal is not provided", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        seasons: [],
        pagination: { limit: 20, offset: 0, count: 0 },
      },
      durationMs: 2,
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/seasons",
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-1/seasons?limit=20&offset=0",
      expect.objectContaining({ routeName: "show-seasons" }),
    );
  });
});
