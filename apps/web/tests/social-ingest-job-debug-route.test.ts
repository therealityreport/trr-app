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

import { POST } from "@/app/api/admin/trr-api/social/ingest/jobs/[jobId]/debug/route";

describe("social ingest job debug proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      job_id: "00000000-0000-4000-8000-000000000001",
      model_used: "gpt-5.3-codex",
      fallback_used: false,
      analysis: { root_cause: "x", confidence: 0.9, files_touched: [], tests_to_run: [] },
      patch_unified_diff: "",
      apply: { enabled: false, requested: false, applied: false, check_ok: false, error: null, files_changed: [] },
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards debug payload to backend", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/jobs/00000000-0000-4000-8000-000000000001/debug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apply_patch: true, confirm_apply: true, include_context: false }),
    });
    const response = await POST(request, {
      params: Promise.resolve({ jobId: "00000000-0000-4000-8000-000000000001" }),
    });

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/ingest/jobs/00000000-0000-4000-8000-000000000001/debug",
      expect.objectContaining({
        method: "POST",
        fallbackError: "Failed to debug social ingest job",
        retries: 1,
        timeoutMs: 45_000,
      }),
    );
  });

  it("returns 400 for invalid job uuid", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/jobs/not-a-uuid/debug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: Promise.resolve({ jobId: "not-a-uuid" }) });
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(fetchSocialBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns standardized proxy error when backend fails", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("fetch failed"));
    const request = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/jobs/00000000-0000-4000-8000-000000000001/debug", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(request, {
      params: Promise.resolve({ jobId: "00000000-0000-4000-8000-000000000001" }),
    });
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
