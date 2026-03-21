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

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/hashtags/timeline/route";

describe("social account hashtag timeline proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      platform: "instagram",
      account_handle: "bravotv",
      years: [],
      series: [],
      top_rank_limit: 10,
      off_chart_rank: 11,
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards hashtag timeline lookups to TRR-Backend", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/hashtags/timeline?start_year=2022&end_year=2024",
    );

    const response = await GET(request, {
      params: Promise.resolve({ platform: "instagram", handle: "bravotv" }),
    });

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/hashtags/timeline?start_year=2022&end_year=2024",
      expect.objectContaining({
        fallbackError: "Failed to fetch social account hashtag timeline",
        retries: 0,
        timeoutMs: 30_000,
      }),
    );
  });

  it("returns standardized proxy errors", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/hashtags/timeline"),
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
