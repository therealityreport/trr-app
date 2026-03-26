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
  ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS: 8_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 }),
}));

import { GET as getUnassigned } from "@/app/api/admin/trr-api/seasons/[seasonId]/unassigned-backdrops/route";
import { POST as assignBackdrops } from "@/app/api/admin/trr-api/seasons/[seasonId]/assign-backdrops/route";

describe("season backdrop proxy routes", () => {
  const seasonId = "11111111-1111-1111-1111-111111111111";
  const assetIdOne = "22222222-2222-2222-2222-222222222222";
  const assetIdTwo = "33333333-3333-3333-3333-333333333333";

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("proxies unassigned backdrops through the backend route", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        season: { id: seasonId, show_id: "show-1", season_number: 6 },
        backdrops: [{ media_asset_id: "asset-1", display_url: "https://tmdb.example.com/1.jpg" }],
      },
      durationMs: 2,
    });

    const response = await getUnassigned(
      new NextRequest(`http://localhost/api/admin/trr-api/seasons/${seasonId}/unassigned-backdrops`),
      { params: Promise.resolve({ seasonId }) },
    );

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/trr-api/seasons/${seasonId}/backdrops/unassigned`,
      expect.objectContaining({ routeName: "season-unassigned-backdrops" }),
    );
    const body = await response.json();
    expect(body.backdrops).toHaveLength(1);
  });

  it("proxies assign-backdrops without changing the response shape", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        requested: 2,
        assigned: 1,
        skipped: 0,
        mirrored_attempted: 1,
        mirrored_failed: 1,
        mirrored_failed_ids: [assetIdTwo],
        mirror_failures: [{ id: assetIdTwo, error: "Mirror failed" }],
      },
      durationMs: 10,
    });

    const response = await assignBackdrops(
      new NextRequest(`http://localhost/api/admin/trr-api/seasons/${seasonId}/assign-backdrops`, {
        method: "POST",
        body: JSON.stringify({ media_asset_ids: [assetIdOne, assetIdTwo] }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ seasonId }) },
    );

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/trr-api/seasons/${seasonId}/backdrops/assign`,
      expect.objectContaining({
        method: "POST",
        routeName: "season-assign-backdrops",
      }),
    );
    const body = await response.json();
    expect(body.mirrored_failed_ids).toEqual([assetIdTwo]);
    expect(body.mirror_failures).toEqual([{ id: assetIdTwo, error: "Mirror failed" }]);
  });
});
