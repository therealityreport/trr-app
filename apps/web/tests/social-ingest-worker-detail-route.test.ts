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
  SOCIAL_PROXY_SHORT_TIMEOUT_MS: 25_000,
}));

import { GET } from "@/app/api/admin/trr-api/social/ingest/workers/[workerId]/detail/route";

describe("social ingest worker detail proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({ worker: { worker_id: "social-worker:test" } });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards worker detail request to backend", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/workers/social-worker:test/detail");
    const response = await GET(request, { params: Promise.resolve({ workerId: "social-worker:test" }) });

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/ingest/workers/social-worker%3Atest/detail",
      expect.objectContaining({
        fallbackError: "Failed to fetch worker detail",
        retries: 0,
        timeoutMs: 25_000,
      }),
    );
  });

  it("returns 400 when worker id is empty", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/workers//detail");
    const response = await GET(request, { params: Promise.resolve({ workerId: "" }) });
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(fetchSocialBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns standardized proxy error when backend fails", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));
    const request = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/workers/social-worker:test/detail");
    const response = await GET(request, { params: Promise.resolve({ workerId: "social-worker:test" }) });
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
