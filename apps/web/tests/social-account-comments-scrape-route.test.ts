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

import { POST } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/comments/scrape/route";

describe("social account comments scrape proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({ run_id: "comments-run-1", status: "queued" });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards comments scrape launches to TRR-Backend as JSON objects", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/comments/scrape", {
        method: "POST",
        body: JSON.stringify({
          mode: "profile",
          source_scope: "bravo",
          refresh_policy: "all_saved_posts",
        }),
      }),
      {
        params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus" }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/thetraitorsus/comments/scrape",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          mode: "profile",
          source_scope: "bravo",
          refresh_policy: "all_saved_posts",
        }),
        fallbackError: "Failed to start social account comments scrape",
        retries: 0,
        timeoutMs: 210_000,
      }),
    );
  });

  it("returns standardized proxy errors", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const response = await POST(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/comments/scrape", {
        method: "POST",
        body: JSON.stringify({
          mode: "profile",
          source_scope: "bravo",
          refresh_policy: "all_saved_posts",
        }),
      }),
      {
        params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus" }),
      },
    );
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
