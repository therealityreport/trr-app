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
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 120_000,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { POST } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/comments/runs/[runId]/cancel/route";

describe("social account comments cancel proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      run_id: "7bfb6214-bfce-4ff8-ac19-3ca5e275fca6",
      status: "cancelled",
      accepted: true,
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards comments cancel requests to TRR-Backend immediately", async () => {
    const runId = "7bfb6214-bfce-4ff8-ac19-3ca5e275fca6";
    const response = await POST(
      new NextRequest(
        `http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/comments/runs/${runId}/cancel`,
        { method: "POST" },
      ),
      {
        params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus", runId }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      `/profiles/instagram/thetraitorsus/comments/runs/${runId}/cancel`,
      expect.objectContaining({
        method: "POST",
        fallbackError: "Failed to cancel social account comments run",
        retries: 0,
        timeoutMs: 120_000,
      }),
    );
  });

  it("returns standardized proxy errors", async () => {
    const runId = "7bfb6214-bfce-4ff8-ac19-3ca5e275fca6";
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const response = await POST(
      new NextRequest(
        `http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/comments/runs/${runId}/cancel`,
        { method: "POST" },
      ),
      {
        params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus", runId }),
      },
    );
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
