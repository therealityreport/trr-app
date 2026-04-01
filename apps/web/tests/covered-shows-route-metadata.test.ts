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

vi.mock("@/lib/server/admin/covered-shows-repository", () => ({
  addCoveredShow: vi.fn(),
  getCoveredShows: vi.fn(),
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

import { GET } from "@/app/api/admin/covered-shows/route";

describe("covered shows route metadata fields", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-test-user" });
  });

  it("returns only the batch-1 covered-show contract fields", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        shows: [
          {
            id: "covered-1",
            trr_show_id: "show-1",
            show_name: "The Real Housewives",
            canonical_slug: "the-real-housewives",
            alternative_names: ["RH"],
            show_total_episodes: 200,
            poster_url: "https://cdn.example.com/poster.jpg",
          },
        ],
      },
      durationMs: 8,
    });

    const request = new NextRequest("http://localhost/api/admin/covered-shows");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.shows).toEqual([
      {
        id: "covered-1",
        trr_show_id: "show-1",
        show_name: "The Real Housewives",
        canonical_slug: "the-real-housewives",
        alternative_names: ["RH"],
        show_total_episodes: 200,
        poster_url: "https://cdn.example.com/poster.jpg",
      },
    ]);
  });
});
