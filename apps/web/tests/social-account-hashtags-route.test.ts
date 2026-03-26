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

import { GET, PUT } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags/route";

describe("social account hashtags proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({ items: [] });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards hashtag lookups and window filters to TRR-Backend", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/hashtags?window=30d&page=2",
    );

    const response = await GET(request, {
      params: Promise.resolve({ platform: "instagram", handle: "bravotv" }),
    });

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/hashtags?window=30d&page=2",
      expect.objectContaining({
        fallbackError: "Failed to fetch social account profile hashtags",
        retries: 0,
        timeoutMs: 30_000,
      }),
    );
  });

  it("forwards hashtag assignment saves to TRR-Backend", async () => {
    const response = await PUT(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/hashtags", {
        method: "PUT",
        body: JSON.stringify({
          hashtags: [{ hashtag: "rhop", assignments: [{ show_id: "show-rhop" }] }],
        }),
      }),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv" }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/hashtags",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          hashtags: [{ hashtag: "rhop", assignments: [{ show_id: "show-rhop" }] }],
        }),
        fallbackError: "Failed to update social account profile hashtags",
        retries: 0,
        timeoutMs: 45_000,
      }),
    );
  });

  it("returns standardized proxy errors", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/hashtags"),
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
