import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, fetchSocialBackendJsonMock, socialProxyErrorResponseMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn((error: unknown) => {
    const message = error instanceof Error ? error.message : "failed";
    return Response.json({ error: message }, { status: 500 });
  }),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET } from "@/app/api/admin/reddit/runs/route";

describe("/api/admin/reddit/runs route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockClear();
    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
  });

  it("forwards validated query filters to backend list route", async () => {
    fetchSocialBackendJsonMock.mockResolvedValue({
      runs: [{ run_id: "11111111-1111-1111-1111-111111111111", status: "running" }],
    });

    const request = new NextRequest(
      "http://localhost/api/admin/reddit/runs?community_id=33333333-3333-4333-8333-333333333333&season_id=22222222-2222-4222-8222-222222222222&period_key=period-preseason&status=queued,running&limit=12",
      { method: "GET" },
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.runs).toHaveLength(1);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/reddit/runs",
      expect.objectContaining({
        queryString: expect.stringContaining("community_id=33333333-3333-4333-8333-333333333333"),
      }),
    );
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/reddit/runs",
      expect.objectContaining({
        queryString: expect.stringContaining("status=queued%2Crunning"),
      }),
    );
  });

  it("returns 400 when community_id is not a valid UUID", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/reddit/runs?community_id=bad-id",
      { method: "GET" },
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("community_id");
    expect(fetchSocialBackendJsonMock).not.toHaveBeenCalled();
  });
});
