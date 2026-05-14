import { beforeEach, describe, expect, it, vi } from "vitest";
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

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/relationships/route";

describe("social account profile relationships proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    fetchSocialBackendJsonMock.mockResolvedValue({
      relationship_type: "following",
      items: [],
      pagination: { page: 2, page_size: 250, total: 0, total_pages: 0 },
    });
  });

  it("forwards source scope and pagination query params unchanged", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/relationships?type=following&source_scope=creator&page=2&page_size=250",
    );

    const response = await GET(request, {
      params: Promise.resolve({ platform: "instagram", handle: "bravotv" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      relationship_type: "following",
      items: [],
      pagination: { page: 2, page_size: 250, total: 0, total_pages: 0 },
    });
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith("/profiles/instagram/bravotv/relationships", {
      queryString: "type=following&source_scope=creator&page=2&page_size=250",
      fallbackError: "Failed to fetch Instagram profile relationships",
      retries: 0,
      timeoutMs: 30_000,
    });
  });
});
