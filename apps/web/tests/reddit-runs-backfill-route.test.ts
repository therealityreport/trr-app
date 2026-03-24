import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, fetchSocialBackendJsonMock, socialProxyErrorResponseMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn((error: unknown) => {
    const message = error instanceof Error ? error.message : "failed";
    return Response.json({ error: message, code: "BACKEND_UNREACHABLE" }, { status: 502 });
  }),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 45_000,
}));

import { POST } from "@/app/api/admin/reddit/runs/backfill/route";

describe("/api/admin/reddit/runs/backfill route", () => {
  const communityId = "33333333-3333-4333-8333-333333333333";
  const seasonId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockClear();
    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
  });

  it("forwards validated backfill requests through the shared social proxy", async () => {
    fetchSocialBackendJsonMock.mockResolvedValue({
      status: "started",
      operation_id: "op-backfill-1",
      attached: false,
    });

    const request = new NextRequest("http://localhost/api/admin/reddit/runs/backfill", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-trr-request-id": "req-1",
        "x-trr-tab-session-id": "tab-1",
        "x-trr-flow-key": "flow-1",
      },
      body: JSON.stringify({
        community_id: communityId,
        season_id: seasonId,
        container_keys: ["episode-3", "", 42],
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { operation_id?: string };

    expect(response.status).toBe(200);
    expect(payload.operation_id).toBe("op-backfill-1");
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/reddit/runs/backfill",
      expect.objectContaining({
        method: "POST",
        fallbackError: "Failed to backfill reddit refresh runs",
        timeoutMs: 45_000,
        retries: 1,
        headers: {
          "Content-Type": "application/json",
          "x-trr-request-id": "req-1",
          "x-trr-tab-session-id": "tab-1",
          "x-trr-flow-key": "flow-1",
        },
        body: JSON.stringify({
          community_id: communityId,
          season_id: seasonId,
          container_keys: ["episode-3"],
          mode: "sync_full",
          detail_refresh: false,
        }),
      }),
    );
  });

  it("returns 400 when community_id is invalid", async () => {
    const request = new NextRequest("http://localhost/api/admin/reddit/runs/backfill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        community_id: "bad-id",
        season_id: seasonId,
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toContain("community_id");
    expect(fetchSocialBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns standardized proxy errors when backend startup fails", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const request = new NextRequest("http://localhost/api/admin/reddit/runs/backfill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        community_id: communityId,
        season_id: seasonId,
        container_keys: ["episode-3"],
        mode: "sync_full",
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
