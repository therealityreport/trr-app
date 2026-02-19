import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getSeasonCastWithEpisodeCountsMock, getCastByShowIdMock } = vi.hoisted(
  () => ({
    requireAdminMock: vi.fn(),
    getSeasonCastWithEpisodeCountsMock: vi.fn(),
    getCastByShowIdMock: vi.fn(),
  })
);

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getSeasonCastWithEpisodeCounts: getSeasonCastWithEpisodeCountsMock,
  getCastByShowId: getCastByShowIdMock,
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/cast/route";

describe("season cast route fallback behavior", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getSeasonCastWithEpisodeCountsMock.mockReset();
    getCastByShowIdMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    getSeasonCastWithEpisodeCountsMock.mockResolvedValue([]);
    getCastByShowIdMock.mockResolvedValue([]);
  });

  it("falls back to show-level cast when season evidence is empty", async () => {
    getCastByShowIdMock.mockResolvedValue([
      {
        person_id: "p-fallback",
        full_name: "Fallback Person",
        cast_member_name: "Fallback Person",
        photo_url: "https://example.com/fallback.jpg",
        total_episodes: null,
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/seasons/1/cast?limit=500"
    );
    const response = await GET(request, {
      params: Promise.resolve({ showId: "show-1", seasonNumber: "1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getCastByShowIdMock).toHaveBeenCalledWith("show-1", { limit: 500, offset: 0 });
    expect(payload.cast_source).toBe("show_fallback");
    expect(typeof payload.eligibility_warning).toBe("string");
    expect(payload.cast).toHaveLength(1);
    expect(payload.cast[0].person_id).toBe("p-fallback");
    expect(payload.cast[0].episodes_in_season).toBe(0);
    expect(payload.cast[0].total_episodes).toBe(0);
  });

  it("does not fallback when include_archive_only=true", async () => {
    getCastByShowIdMock.mockResolvedValue([
      {
        person_id: "p-fallback",
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/seasons/1/cast?limit=500&include_archive_only=true"
    );
    const response = await GET(request, {
      params: Promise.resolve({ showId: "show-1", seasonNumber: "1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getCastByShowIdMock).not.toHaveBeenCalled();
    expect(payload.cast).toHaveLength(0);
    expect(payload.cast_source).toBe("season_evidence");
    expect(payload.eligibility_warning).toBeNull();
  });
});
