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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/mirror/requeue/route";

describe("social mirror requeue proxy route", () => {
  const showId = "11111111-1111-4111-8111-111111111111";
  const seasonId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSeasonBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSeasonBackendJsonMock.mockResolvedValue({ queued_jobs: 3, failed: 0 });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("accepts query/body mix and forwards platform route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/mirror/requeue?platform=instagram&season_id=${seasonId}`,
      {
        method: "POST",
        body: JSON.stringify({
          source_scope: "bravo",
          failed_only: false,
          date_start: "2026-01-01T00:00:00.000Z",
          date_end: "2026-01-08T00:00:00.000Z",
        }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { queued_jobs?: number };

    expect(response.status).toBe(200);
    expect(payload.queued_jobs).toBe(3);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/instagram/mirror/requeue",
      expect.objectContaining({
        method: "POST",
        seasonIdHint: seasonId,
      }),
    );
    expect(fetchSeasonBackendJsonMock.mock.calls[0]?.[3]?.queryString).toContain("date_start=2026-01-01T00%3A00%3A00.000Z");
  });

  it("returns 400 for unsupported platform", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/mirror/requeue?platform=facebook`,
      { method: "POST" },
    );

    const response = await POST(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("platform");
    expect(fetchSeasonBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid date_end", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/mirror/requeue?platform=instagram&date_end=invalid`,
      { method: "POST" },
    );

    const response = await POST(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("date_end");
    expect(fetchSeasonBackendJsonMock).not.toHaveBeenCalled();
  });
});
