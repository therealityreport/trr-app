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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/route";

describe("social ingest proxy route", () => {
  const showId = "11111111-1111-4111-8111-111111111111";
  const seasonId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSeasonBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSeasonBackendJsonMock.mockResolvedValue({ ok: true });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards valid season_id as seasonIdHint", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/ingest?season_id=${seasonId}`,
      {
        method: "POST",
        body: JSON.stringify({ source_scope: "bravo" }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { ok?: boolean };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/ingest",
      expect.objectContaining({ seasonIdHint: seasonId, retries: 0, timeoutMs: 210_000 }),
    );
  });

  it("returns 400 for invalid season_id hint", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/ingest?season_id=bad-season-id`,
      {
        method: "POST",
        body: JSON.stringify({ source_scope: "bravo" }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("season_id");
    expect(fetchSeasonBackendJsonMock).not.toHaveBeenCalled();
  });

  it("passes scheduler payload fields through to backend ingest body", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/ingest?season_id=${seasonId}`,
      {
        method: "POST",
        body: JSON.stringify({
          source_scope: "bravo",
          runner_strategy: "adaptive_dual_runner",
          runner_count: 2,
          window_shard_hours: 2,
          day_weight_profile: "rhoslc_default",
          priority_mode: "episode_peak_weighted",
        }),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    expect(response.status).toBe(200);
    const body = String(fetchSeasonBackendJsonMock.mock.calls[0]?.[3]?.body ?? "");
    expect(body).toContain("\"runner_strategy\":\"adaptive_dual_runner\"");
    expect(body).toContain("\"runner_count\":2");
    expect(body).toContain("\"window_shard_hours\":2");
    expect(body).toContain("\"day_weight_profile\":\"rhoslc_default\"");
    expect(body).toContain("\"priority_mode\":\"episode_peak_weighted\"");
  });
});
