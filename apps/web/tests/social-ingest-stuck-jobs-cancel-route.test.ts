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
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 45_000,
}));

import { POST } from "@/app/api/admin/trr-api/social/ingest/stuck-jobs/cancel/route";

describe("social ingest stuck-jobs cancel proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      requested_job_ids_count: 0,
      cancelled_jobs: 2,
      cancelled_job_ids: [],
      affected_run_ids: [],
      stuck_jobs_remaining: 0,
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards validated UUID payload to backend", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/stuck-jobs/cancel", {
      method: "POST",
      body: JSON.stringify({ job_ids: ["00000000-0000-4000-8000-000000000001"] }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/ingest/stuck-jobs/cancel",
      expect.objectContaining({
        method: "POST",
        fallbackError: "Failed to cancel stuck jobs",
        retries: 1,
        timeoutMs: 45_000,
      }),
    );
  });

  it("returns 400 for invalid UUID payload", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/stuck-jobs/cancel", {
      method: "POST",
      body: JSON.stringify({ job_ids: ["not-a-uuid"] }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = (await response.json()) as { code?: string };
    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(fetchSocialBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns standardized proxy error when backend request fails", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const request = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/stuck-jobs/cancel", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = (await response.json()) as { code?: string };
    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
