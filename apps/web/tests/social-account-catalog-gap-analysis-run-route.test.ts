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
  SOCIAL_PROXY_SHORT_TIMEOUT_MS: 25_000,
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { POST } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis/run/route";

describe("social account catalog gap-analysis run proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      platform: "instagram",
      account_handle: "bravotv",
      status: "queued",
      operation_id: "gap-op-queued-1",
      result: null,
      stale: false,
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards gap-analysis run requests to TRR-Backend with request ownership headers", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/gap-analysis/run", {
        method: "POST",
        headers: {
          "x-trr-request-id": "req-gap-run-1",
          "x-trr-tab-session-id": "tab-gap-run-1",
          "x-trr-flow-key": "flow-gap-run-1",
        },
      }),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv" }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/catalog/gap-analysis/run",
      expect.objectContaining({
        method: "POST",
        fallbackError: "Failed to start social account catalog gap analysis",
        retries: 0,
        timeoutMs: 25_000,
        headers: expect.any(Headers),
      }),
    );
    const forwardedHeaders = fetchSocialBackendJsonMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(forwardedHeaders.get("x-trr-request-id")).toBe("req-gap-run-1");
    expect(forwardedHeaders.get("x-trr-tab-session-id")).toBe("tab-gap-run-1");
    expect(forwardedHeaders.get("x-trr-flow-key")).toBe("flow-gap-run-1");
  });

  it("returns standardized proxy errors", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const response = await POST(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/gap-analysis/run", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv" }),
      },
    );
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
