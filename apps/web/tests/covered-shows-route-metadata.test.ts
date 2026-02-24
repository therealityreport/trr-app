import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";

const { requireAdminMock, getCoveredShowsMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getCoveredShowsMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/covered-shows-repository", () => ({
  getCoveredShows: getCoveredShowsMock,
  addCoveredShow: vi.fn(),
}));

import { GET } from "@/app/api/admin/covered-shows/route";

describe("covered shows route metadata fields", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getCoveredShowsMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-test-user" });
  });

  it("returns optional show metadata fields in GET payload", async () => {
    getCoveredShowsMock.mockResolvedValue([
      {
        id: "covered-1",
        trr_show_id: "show-1",
        show_name: "The Real Housewives",
        canonical_slug: "the-real-housewives",
        show_total_episodes: 200,
        poster_url: "https://cdn.example.com/poster.jpg",
        created_at: "2026-01-01T00:00:00.000Z",
        created_by_firebase_uid: "firebase-user-1",
      },
    ]);

    const request = new NextRequest("http://localhost/api/admin/covered-shows");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.shows).toHaveLength(1);
    expect(payload.shows[0]).toMatchObject({
      trr_show_id: "show-1",
      canonical_slug: "the-real-housewives",
      show_total_episodes: 200,
      poster_url: "https://cdn.example.com/poster.jpg",
    });
  });
});
