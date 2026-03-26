import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";

const { requireAdminMock, fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  invalidateAdminBackendCache: vi.fn(),
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    ),
}));

import { GET } from "@/app/api/admin/trr-api/people/resolve-slug/route";

describe("person resolve slug route parity", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("preserves the routed response contract for slug-based lookups", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        resolved: {
          person_id: "person-1",
          slug: "brandi-glanville",
          canonical_slug: "brandi-glanville--abc12345",
        },
        show_id: "show-1",
      },
      durationMs: 6,
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/resolve-slug?slug=brandi-glanville&showId=rhobh",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      resolved: {
        person_id: "person-1",
        slug: "brandi-glanville",
        canonical_slug: "brandi-glanville--abc12345",
      },
      show_id: "show-1",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/people/resolve-slug?slug=brandi-glanville&show_slug=rhobh",
      expect.objectContaining({ routeName: "person-resolve-slug" }),
    );
  });
});
