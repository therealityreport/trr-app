import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminContextMock, fetchSocialBackendJsonMock, socialProxyErrorResponseMock } = vi.hoisted(() => ({
  requireAdminContextMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdminContext: requireAdminContextMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  SOCIAL_PROXY_PROGRESS_TIMEOUT_MS: 5_000,
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/[runId]/progress/route";

describe("social account catalog run progress proxy route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    requireAdminContextMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    requireAdminContextMock.mockResolvedValue({
      uid: "admin-1",
      email: "admin@example.com",
      displayName: "Admin",
    });
    fetchSocialBackendJsonMock.mockResolvedValue({
      run_id: "run-123",
      run_status: "running",
      run_state: "running",
      completed_posts: 12,
      total_posts: 100,
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards progress polling with the fast timeout and no retry", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/runs/run-123/progress?recent_log_limit=25",
      ),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv", runId: "run-123" }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/catalog/runs/run-123/progress?recent_log_limit=25",
      expect.objectContaining({
        adminContext: expect.objectContaining({ uid: "admin-1" }),
        fallbackError: "Failed to fetch social account catalog run progress",
        retries: 0,
        timeoutMs: 5_000,
      }),
    );
  });

  it("returns standardized proxy errors", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/runs/run-123/progress"),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv", runId: "run-123" }),
      },
    );
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });

  it("logs timing diagnostics for slow progress proxy calls", async () => {
    const consoleInfo = vi.mocked(console.info);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/runs/run-123/progress"),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv", runId: "run-123" }),
      },
    );

    expect(response.status).toBe(200);
    expect(consoleInfo).toHaveBeenCalledWith(
      "[api] Social account catalog run progress timing",
      expect.objectContaining({
        platform: "instagram",
        handle: "bravotv",
        run_id: "run-123",
        auth_ms: expect.any(Number),
        params_ms: expect.any(Number),
        upstream_ms: expect.any(Number),
        response_ms: expect.any(Number),
        total_ms: expect.any(Number),
      }),
    );
  });
});
