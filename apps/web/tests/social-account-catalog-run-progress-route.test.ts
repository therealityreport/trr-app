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

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/progress/route";

describe("social account catalog run progress proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      run_id: "cc8db903-b725-4f86-8699-f880b351f010",
      run_status: "queued",
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards the progress query with retry-safe timeout settings", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/tiktok/bravotv/catalog/runs/cc8db903-b725-4f86-8699-f880b351f010/progress?recent_log_limit=25",
        { method: "GET" },
      ),
      {
        params: Promise.resolve({
          platform: "tiktok",
          handle: "bravotv",
          runId: "cc8db903-b725-4f86-8699-f880b351f010",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/tiktok/bravotv/catalog/runs/cc8db903-b725-4f86-8699-f880b351f010/progress?recent_log_limit=25",
      expect.objectContaining({
        fallbackError: "Failed to fetch social account catalog run progress",
        retries: 1,
        timeoutMs: 45_000,
      }),
    );
  });

  it("returns standardized proxy errors when the backend request fails", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/tiktok/bravotv/catalog/runs/cc8db903-b725-4f86-8699-f880b351f010/progress?recent_log_limit=25",
        { method: "GET" },
      ),
      {
        params: Promise.resolve({
          platform: "tiktok",
          handle: "bravotv",
          runId: "cc8db903-b725-4f86-8699-f880b351f010",
        }),
      },
    );

    const payload = (await response.json()) as { code?: string };
    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
