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

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis/route";

describe("social account catalog gap-analysis proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      status: "completed",
      operation_id: "gap-op-1",
      platform: "instagram",
      account_handle: "bravotv",
      result: {
        platform: "instagram",
        account_handle: "bravotv",
        gap_type: "tail_gap",
        catalog_posts: 15880,
        materialized_posts: 16575,
        expected_total_posts: 16575,
        missing_from_catalog_count: 695,
        sample_missing_source_ids: ["ABC123"],
        has_resumable_frontier: true,
        needs_recent_sync: false,
        recommended_action: "resume_tail",
      },
      stale: false,
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards gap-analysis lookups to TRR-Backend", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/gap-analysis",
      {
        headers: {
          "x-trr-request-id": "req-gap-1",
          "x-trr-tab-session-id": "tab-gap-1",
          "x-trr-flow-key": "flow-gap-1",
        },
      },
    );
    const response = await GET(
      request,
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv" }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/catalog/gap-analysis",
      expect.objectContaining({
        fallbackError: "Failed to fetch social account catalog gap analysis",
        retries: 0,
        timeoutMs: 25_000,
        headers: expect.any(Headers),
      }),
    );
    const forwardedHeaders = fetchSocialBackendJsonMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(forwardedHeaders.get("x-trr-request-id")).toBe("req-gap-1");
    expect(forwardedHeaders.get("x-trr-tab-session-id")).toBe("tab-gap-1");
    expect(forwardedHeaders.get("x-trr-flow-key")).toBe("flow-gap-1");
  });

  it("returns standardized proxy errors", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/gap-analysis"),
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
