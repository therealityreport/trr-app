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

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/capacity/route";

describe("social account catalog capacity proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-1" });
    fetchSocialBackendJsonMock.mockResolvedValue({ available: true, blocked: false });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      Response.json({ error: String(error), code: "BACKEND_UNREACHABLE" }, { status: 502 }),
    );
  });

  it("forwards the fresh selected-task and worker query without caching", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/capacity?selected_tasks=post_details%2Ccomments%2Cmedia&detail_worker_count=8&comments_worker_count=8",
      ),
      { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/catalog/capacity",
      expect.objectContaining({
        method: "GET",
        queryString: "selected_tasks=post_details%2Ccomments%2Cmedia&detail_worker_count=8&comments_worker_count=8",
        retries: 0,
        timeoutMs: 30_000,
      }),
    );
  });

  it("returns the standard proxy error when capacity is unavailable", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("offline"));

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/capacity"),
      { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
    );

    expect(response.status).toBe(502);
    expect(socialProxyErrorResponseMock).toHaveBeenCalledTimes(1);
  });
});
