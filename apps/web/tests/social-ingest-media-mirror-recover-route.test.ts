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

import { POST } from "@/app/api/admin/trr-api/social/ingest/media-mirror/recover-stale/route";

describe("social ingest media mirror stale recovery proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      ok: true,
      recovered_count: 1,
      recovered_job_ids: ["job-1"],
      dispatch: { dispatched_job_ids: ["job-2"], dispatch_attempts: 1 },
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards run-scoped media recovery payload to backend", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/social/ingest/media-mirror/recover-stale",
      {
        method: "POST",
        body: JSON.stringify({
          run_id: "77f85ad9-0b32-4607-8ff4-999261bab84c",
          stage: "all",
          confirm_recovery: "RECOVER MEDIA MIRROR JOBS",
        }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/ingest/media-mirror/recover-stale",
      expect.objectContaining({
        method: "POST",
        fallbackError: "Failed to recover stale media mirror jobs",
        retries: 0,
        timeoutMs: 45_000,
      }),
    );
    const body = JSON.parse(String(fetchSocialBackendJsonMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      run_id: "77f85ad9-0b32-4607-8ff4-999261bab84c",
      stage: "all",
      confirm_recovery: "RECOVER MEDIA MIRROR JOBS",
    });
  });

  it("rejects invalid run IDs before backend fetch", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/social/ingest/media-mirror/recover-stale",
      {
        method: "POST",
        body: JSON.stringify({
          run_id: "bad-run",
          confirm_recovery: "RECOVER MEDIA MIRROR JOBS",
        }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request);
    const payload = (await response.json()) as { code?: string };
    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(fetchSocialBackendJsonMock).not.toHaveBeenCalled();
  });

  it("rejects missing confirmation before backend fetch", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/social/ingest/media-mirror/recover-stale",
      {
        method: "POST",
        body: JSON.stringify({
          run_id: "77f85ad9-0b32-4607-8ff4-999261bab84c",
          confirm_recovery: "wrong",
        }),
        headers: { "content-type": "application/json" },
      },
    );

    const response = await POST(request);
    const payload = (await response.json()) as { code?: string };
    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(fetchSocialBackendJsonMock).not.toHaveBeenCalled();
  });
});
