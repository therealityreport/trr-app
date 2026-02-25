import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, fetchSeasonBackendJsonMock, socialProxyErrorResponseMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSeasonBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSeasonBackendJson: fetchSeasonBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/mirror-coverage/route";

describe("social mirror-coverage proxy route", () => {
  const showId = "11111111-1111-4111-8111-111111111111";
  const seasonId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSeasonBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSeasonBackendJsonMock.mockResolvedValue({ up_to_date: true, needs_mirror_count: 0 });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards validated mirror coverage query", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics/mirror-coverage?season_id=${seasonId}&source_scope=bravo&platforms=instagram&date_start=2026-01-01T00:00:00.000Z&date_end=2026-01-08T00:00:00.000Z`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { up_to_date?: boolean };

    expect(response.status).toBe(200);
    expect(payload.up_to_date).toBe(true);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/analytics/mirror-coverage",
      expect.objectContaining({
        seasonIdHint: seasonId,
      }),
    );
    expect(fetchSeasonBackendJsonMock.mock.calls[0]?.[3]?.queryString).toContain("platforms=instagram");
    expect(fetchSeasonBackendJsonMock.mock.calls[0]?.[3]?.queryString).toContain("date_start=2026-01-01T00%3A00%3A00.000Z");
  });

  it("returns 400 for invalid date_start", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics/mirror-coverage?date_start=bad-date`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("date_start");
    expect(fetchSeasonBackendJsonMock).not.toHaveBeenCalled();
  });
});
