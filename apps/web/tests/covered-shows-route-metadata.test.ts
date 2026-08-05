import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";

const { requireAdminMock, toVerifiedAdminContextMock, fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  buildAdminBackendStatusError: ({ fallbackMessage, status }: { fallbackMessage: string; status: number }) =>
    Object.assign(new Error(fallbackMessage), { status }),
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
    toVerifiedAdminContextMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-test-user" });
    toVerifiedAdminContextMock.mockReturnValue({
      uid: "admin-test-user",
      email: null,
      verifiedAt: 1_700_000_000_000,
    });
  });

  it("returns only the batch-1 covered-show contract fields", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        shows: [
          {
            id: "00000000-0000-0000-0000-000000000010",
            trr_show_id: "00000000-0000-0000-0000-000000000011",
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
        id: "00000000-0000-0000-0000-000000000010",
        trr_show_id: "00000000-0000-0000-0000-000000000011",
        show_name: "The Real Housewives",
        canonical_slug: "the-real-housewives",
        alternative_names: ["RH"],
        show_total_episodes: 200,
        poster_url: "https://cdn.example.com/poster.jpg",
      },
    ]);
  });
});
