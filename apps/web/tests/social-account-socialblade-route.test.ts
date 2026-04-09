import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, fetchSocialBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 60_000,
  socialProxyErrorResponse: (error: unknown) =>
    new Response(JSON.stringify({ error: error instanceof Error ? error.message : "proxy error" }), { status: 500 }),
}));

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade/route";

describe("social account SocialBlade read proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({ account_handle: "bravotv", platform: "instagram" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards canonical platform and handle segments to the backend helper", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/socialblade");

    const response = await GET(request, {
      params: Promise.resolve({ platform: "instagram", handle: "bravotv" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ account_handle: "bravotv", platform: "instagram" });
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith("/profiles/instagram/bravotv/socialblade", {
      fallbackError: "Failed to fetch social account SocialBlade data",
      retries: 0,
      timeoutMs: 60_000,
    });
  });
});
