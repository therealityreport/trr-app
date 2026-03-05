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
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 45_000,
}));

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/[runId]/cancel/route";

describe("social run cancel proxy route", () => {
  const showId = "00000000-0000-4000-8000-000000000001";
  const runId = "00000000-0000-4000-8000-000000000002";

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSeasonBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSeasonBackendJsonMock.mockResolvedValue({
      run_id: runId,
      status: "cancelled",
      cancelled_jobs: 3,
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards validated run cancel request to backend", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/runs/${runId}/cancel?season_id=${showId}`,
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ showId, seasonNumber: "6", runId }),
    });
    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      `/ingest/runs/${runId}/cancel`,
      expect.objectContaining({
        method: "POST",
        fallbackError: "Failed to cancel social run",
        retries: 1,
        timeoutMs: 45_000,
      }),
    );
  });

  it("returns 400 for invalid runId", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/x/seasons/6/social/runs/not-a-uuid/cancel", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ showId, seasonNumber: "6", runId: "not-a-uuid" }),
    });
    const payload = (await response.json()) as { code?: string };
    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(fetchSeasonBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns standardized proxy error when backend request fails", async () => {
    fetchSeasonBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/runs/${runId}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ showId, seasonNumber: "6", runId }),
    });
    const payload = (await response.json()) as { code?: string };
    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
