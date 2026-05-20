import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { requireAdminMock, fetchSocialBackendJsonMock, MockSocialProxyError } = vi.hoisted(() => {
  class MockSocialProxyError extends Error {
    status: number;
    code: string;
    retryable: boolean;

    constructor(message: string, options: { status: number; code: string; retryable?: boolean }) {
      super(message);
      this.status = options.status;
      this.code = options.code;
      this.retryable = Boolean(options.retryable);
    }
  }

  return {
    requireAdminMock: vi.fn(),
    fetchSocialBackendJsonMock: vi.fn(),
    MockSocialProxyError,
  };
});

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  SocialProxyError: MockSocialProxyError,
  socialProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: error instanceof MockSocialProxyError ? error.status : 500 },
    ),
}));

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/cookies/health/route";

describe("social profile cookie health route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("returns degraded cookie health for default timeout checks without posts auth", async () => {
    fetchSocialBackendJsonMock.mockRejectedValue(
      new MockSocialProxyError("TRR-Backend request timed out.", {
        status: 504,
        code: "UPSTREAM_TIMEOUT",
        retryable: true,
      }),
    );

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/cookies/health",
    );
    const response = await GET(request, {
      params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cookie-health-source")).toBe("backend-timeout-degraded");
    expect(payload).toMatchObject({
      platform: "instagram",
      account_handle: "thetraitorsus",
      healthy: false,
      reason: "cookie_health_unavailable",
      refresh_available: false,
      degraded: true,
      degraded_reason: "backend_timeout",
    });
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/thetraitorsus/cookies/health",
      expect.objectContaining({ retries: 1, timeoutMs: 15_000 }),
    );
  });

  it("preserves posts-auth timeout errors for explicit repair probes", async () => {
    fetchSocialBackendJsonMock.mockRejectedValue(
      new MockSocialProxyError("TRR-Backend request timed out.", {
        status: 504,
        code: "UPSTREAM_TIMEOUT",
        retryable: true,
      }),
    );

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/thetraitorsus/cookies/health?posts_auth=true",
    );
    const response = await GET(request, {
      params: Promise.resolve({ platform: "instagram", handle: "thetraitorsus" }),
    });

    expect(response.status).toBe(504);
  });
});
