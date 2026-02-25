import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, fetchSocialBackendJsonMock, socialProxyErrorResponseMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/ingest/worker-health/route";

describe("social worker-health proxy route", () => {
  const showId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      queue_enabled: false,
      healthy: true,
      healthy_workers: 1,
      reason: null,
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "UPSTREAM_TIMEOUT" }), {
        status: 504,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("returns proxied worker health payload on success", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/ingest/worker-health`,
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as {
      queue_enabled?: boolean;
      healthy?: boolean;
      healthy_workers?: number;
    };

    expect(response.status).toBe(200);
    expect(payload.queue_enabled).toBe(false);
    expect(payload.healthy).toBe(true);
    expect(payload.healthy_workers).toBe(1);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/ingest/worker-health",
      expect.objectContaining({
        fallbackError: "Failed to fetch social ingest worker health",
        retries: 0,
        timeoutMs: 12_000,
      }),
    );
  });

  it("returns 400 for invalid showId", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/not-a-uuid/seasons/6/social/ingest/worker-health",
      { method: "GET" },
    );

    const response = await GET(request, { params: Promise.resolve({ showId: "not-a-uuid", seasonNumber: "6" }) });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("showId");
    expect(fetchSocialBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid seasonNumber", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/not-a-number/social/ingest/worker-health`,
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ showId, seasonNumber: "not-a-number" }),
    });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("seasonNumber");
    expect(fetchSocialBackendJsonMock).not.toHaveBeenCalled();
  });

  it("uses proxy error envelope for timeout/unreachable failures", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("Social worker health request timed out"));

    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/ingest/worker-health`,
      { method: "GET" },
    );
    const response = await GET(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(504);
    expect(payload.code).toBe("UPSTREAM_TIMEOUT");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
