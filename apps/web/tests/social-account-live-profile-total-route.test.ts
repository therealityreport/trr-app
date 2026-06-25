import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { requireAdminMock, toVerifiedAdminContextMock, fetchSocialBackendJsonMock, socialProxyErrorResponseMock } =
  vi.hoisted(() => ({
    requireAdminMock: vi.fn(),
    toVerifiedAdminContextMock: vi.fn(),
    fetchSocialBackendJsonMock: vi.fn(),
    socialProxyErrorResponseMock: vi.fn(),
  }));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/live-profile-total/route";

describe("social account live profile total route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: `admin-${crypto.randomUUID()}`, provider: "firebase" });
    toVerifiedAdminContextMock.mockReturnValue({ uid: "admin-1" });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 502 }),
    );
  });

  it("returns a fast degraded fallback when the backend total times out without stale cache", async () => {
    fetchSocialBackendJsonMock.mockRejectedValueOnce(new Error("TRR-Backend request timed out."));

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/live-profile-total"),
      { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
    );
    const payload = (await response.json()) as {
      status?: string;
      degraded?: boolean;
      live_total_posts_current?: number | null;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("fallback");
    expect(response.headers.get("x-trr-cacheable")).toBe("0");
    expect(payload.status).toBe("degraded");
    expect(payload.degraded).toBe(true);
    expect(payload.live_total_posts_current).toBeNull();
    expect(socialProxyErrorResponseMock).not.toHaveBeenCalled();
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/live-profile-total",
      expect.objectContaining({
        retries: 0,
        timeoutMs: 4_000,
      }),
    );
  });
});
