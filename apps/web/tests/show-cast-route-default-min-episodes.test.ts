import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getCoverPhotosMock, getShowCastWithStatsMock, getShowArchiveFootageCastMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getCoverPhotosMock: vi.fn(),
  getShowCastWithStatsMock: vi.fn(),
  getShowArchiveFootageCastMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/person-cover-photos-repository", () => ({
  getCoverPhotos: getCoverPhotosMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getShowCastWithStats: getShowCastWithStatsMock,
  getShowArchiveFootageCast: getShowArchiveFootageCastMock,
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/cast/route";

describe("show cast route default minEpisodes behavior", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getCoverPhotosMock.mockReset();
    getShowCastWithStatsMock.mockReset();
    getShowArchiveFootageCastMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    getCoverPhotosMock.mockResolvedValue(new Map());
    getShowArchiveFootageCastMock.mockResolvedValue([]);
  });

  it("filters out cast entries with zero total episodes by default", async () => {
    getShowCastWithStatsMock.mockResolvedValue([
      {
        id: "c1",
        person_id: "p1",
        full_name: "Person One",
        cast_member_name: "Person One",
        role: null,
        billing_order: 1,
        credit_category: "cast",
        photo_url: null,
        total_episodes: 0,
      },
      {
        id: "c2",
        person_id: "p2",
        full_name: "Person Two",
        cast_member_name: "Person Two",
        role: null,
        billing_order: 2,
        credit_category: "cast",
        photo_url: null,
        total_episodes: 4,
      },
    ]);

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/cast?limit=500");
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getShowCastWithStatsMock).toHaveBeenCalledWith("show-1", { limit: 500, offset: 0 });
    expect(payload.cast).toHaveLength(1);
    expect(payload.cast[0].person_id).toBe("p2");
  });

  it("respects explicit minEpisodes query", async () => {
    getShowCastWithStatsMock.mockResolvedValue([
      {
        id: "c1",
        person_id: "p1",
        full_name: "Person One",
        cast_member_name: "Person One",
        role: null,
        billing_order: 1,
        credit_category: "cast",
        photo_url: null,
        total_episodes: 1,
      },
      {
        id: "c2",
        person_id: "p2",
        full_name: "Person Two",
        cast_member_name: "Person Two",
        role: null,
        billing_order: 2,
        credit_category: "cast",
        photo_url: null,
        total_episodes: 2,
      },
    ]);

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/cast?minEpisodes=2");
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.cast).toHaveLength(1);
    expect(payload.cast[0].person_id).toBe("p2");
  });
});
