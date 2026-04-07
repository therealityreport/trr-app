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

import { POST } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/freshness/route";

describe("social account catalog freshness proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      platform: "instagram",
      account_handle: "bravotv",
      eligible: true,
      live_total_posts_current: 14,
      stored_total_posts: 12,
      delta_posts: 2,
      has_newer_posts: true,
      needs_recent_sync: true,
      checked_at: "2026-03-20T12:30:00.000Z",
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards freshness probes to TRR-Backend", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/freshness", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv" }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/catalog/freshness",
      expect.objectContaining({
        method: "POST",
        fallbackError: "Failed to fetch social account catalog freshness",
        retries: 0,
        timeoutMs: 30_000,
      }),
    );
  });

  it("returns standardized proxy errors", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const response = await POST(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/freshness", {
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
