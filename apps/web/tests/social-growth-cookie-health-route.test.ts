import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getBackendApiUrlMock,
  buildInternalAdminHeadersMock,
  timeoutSafeFetchMock,
  isTimeoutSafeFetchTimeoutErrorMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  buildInternalAdminHeadersMock: vi.fn(),
  timeoutSafeFetchMock: vi.fn(),
  isTimeoutSafeFetchTimeoutErrorMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  buildInternalAdminHeaders: buildInternalAdminHeadersMock,
}));

vi.mock("@/lib/server/timeout-safe-fetch", () => ({
  timeoutSafeFetch: timeoutSafeFetchMock,
  isTimeoutSafeFetchTimeoutError: isTimeoutSafeFetchTimeoutErrorMock,
}));

import { GET } from "@/app/api/admin/trr-api/social-growth/cookies/health/route";

describe("social growth cookie health route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    buildInternalAdminHeadersMock.mockReset();
    timeoutSafeFetchMock.mockReset();
    isTimeoutSafeFetchTimeoutErrorMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/people/socialblade/cookies/health?validate=true&handle=bravotv");
    buildInternalAdminHeadersMock.mockReturnValue(new Headers({ authorization: "Bearer internal-admin" }));
    isTimeoutSafeFetchTimeoutErrorMock.mockReturnValue(false);
  });

  it("forwards query params to the backend with internal admin auth", async () => {
    timeoutSafeFetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          healthy: true,
          platform: "socialblade",
          validation: { checked: true, healthy: true, handle: "bravotv" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social-growth/cookies/health?validate=true&handle=bravotv"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      healthy: true,
      platform: "socialblade",
      validation: { handle: "bravotv" },
    });
    expect(getBackendApiUrlMock).toHaveBeenCalledWith(
      "/admin/people/socialblade/cookies/health?validate=true&handle=bravotv",
    );
    expect(timeoutSafeFetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/people/socialblade/cookies/health?validate=true&handle=bravotv",
      expect.objectContaining({
        headers: expect.any(Headers),
        timeoutMs: 50_000,
        timeoutName: "socialblade-cookie-health",
      }),
    );
    const [, init] = timeoutSafeFetchMock.mock.calls[0];
    expect((init.headers as Headers).get("authorization")).toBe("Bearer internal-admin");
  });

  it("preserves SocialBlade backend error metadata", async () => {
    timeoutSafeFetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: {
            message: "SocialBlade session preflight failed before batch dispatch: missing_required_cookie:session",
            code: "SOCIALBLADE_SESSION_PREFLIGHT_FAILED",
            reason: "missing_required_cookie:session",
            retryable: true,
          },
        }),
        { status: 409, headers: { "content-type": "application/json" } },
      ),
    );

    const response = await GET(new NextRequest("http://localhost/api/admin/trr-api/social-growth/cookies/health"));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      error: "SocialBlade session preflight failed before batch dispatch: missing_required_cookie:session",
      code: "SOCIALBLADE_SESSION_PREFLIGHT_FAILED",
      reason: "missing_required_cookie:session",
      retryable: true,
    });
  });
});
