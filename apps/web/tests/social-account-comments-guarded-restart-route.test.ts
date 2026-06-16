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

import { POST } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/comments/runs/[runId]/guarded-restart/route";

describe("social account comments guarded-restart proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      old_run_id: "7bfb6214-bfce-4ff8-ac19-3ca5e275fca6",
      new_run_id: "9d6c2cf1-8a4f-4b2d-9b1a-2f1c0e5d7a31",
      public_relay_only: true,
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards the public-relay restart body to TRR-Backend", async () => {
    const runId = "7bfb6214-bfce-4ff8-ac19-3ca5e275fca6";
    const requestBody = {
      date_start: "2025-01-01T00:00:00Z",
      date_end: "2027-01-01T00:00:00Z",
      comments_worker_count: 12,
      comments_target_batch_size: 10,
      comments_load_strategy: "public_relay",
      target_filter: "incomplete",
    };

    const response = await POST(
      new NextRequest(
        `http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/comments/runs/${runId}/guarded-restart`,
        { method: "POST", body: JSON.stringify(requestBody), headers: { "Content-Type": "application/json" } },
      ),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv", runId }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledTimes(1);
    const [backendPath, options] = fetchSocialBackendJsonMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(backendPath).toBe(`/profiles/instagram/bravotv/comments/runs/${runId}/guarded-restart`);
    expect(options).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      fallbackError: "Failed to restart social account comments run",
      retries: 0,
      timeoutMs: 120_000,
    });
    expect(JSON.parse(String(options.body))).toMatchObject(requestBody);
  });

  it("defaults to an empty JSON body when none is supplied", async () => {
    const runId = "7bfb6214-bfce-4ff8-ac19-3ca5e275fca6";
    await POST(
      new NextRequest(
        `http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/comments/runs/${runId}/guarded-restart`,
        { method: "POST" },
      ),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv", runId }),
      },
    );

    const [, options] = fetchSocialBackendJsonMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(options.body).toBe("{}");
  });

  it("returns standardized proxy errors", async () => {
    const runId = "7bfb6214-bfce-4ff8-ac19-3ca5e275fca6";
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const response = await POST(
      new NextRequest(
        `http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/comments/runs/${runId}/guarded-restart`,
        { method: "POST", body: "{}" },
      ),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv", runId }),
      },
    );
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
