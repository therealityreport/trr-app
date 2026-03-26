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

import { GET } from "@/app/api/admin/trr-api/seasons/[seasonId]/episodes/route";

describe("season episodes route parity", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("proxies the season episodes contract through the backend", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        episodes: [{ id: "episode-1", episode_number: 1, title: "Pilot", air_date: null }],
        pagination: { limit: 250, offset: 0, count: 1 },
      },
      durationMs: 5,
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/seasons/season-1/episodes?limit=250");
    const response = await GET(request, { params: Promise.resolve({ seasonId: "season-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/seasons/season-1/episodes?limit=250&offset=0",
      expect.objectContaining({ routeName: "season-episodes" }),
    );
    expect(payload.episodes[0]).toMatchObject({ episode_number: 1, title: "Pilot" });
  });
});
