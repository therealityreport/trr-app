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
  socialProxyErrorResponse: (error: unknown) =>
    new Response(JSON.stringify({ error: error instanceof Error ? error.message : "proxy error" }), { status: 500 }),
}));

import { POST } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/socialblade/refresh/route";

describe("social account SocialBlade refresh proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({ account_handle: "bravotv", platform: "youtube", refresh_status: "refreshed" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards refresh payloads to the backend helper", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/social/profiles/youtube/bravo/socialblade/refresh", {
      method: "POST",
      body: JSON.stringify({ force: true }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request, {
      params: Promise.resolve({ platform: "youtube", handle: "bravo" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ account_handle: "bravotv", platform: "youtube", refresh_status: "refreshed" });
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith("/profiles/youtube/bravo/socialblade/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true }),
      fallbackError: "Failed to refresh social account SocialBlade data",
      retries: 0,
      timeoutMs: 210_000,
    });
  });
});
