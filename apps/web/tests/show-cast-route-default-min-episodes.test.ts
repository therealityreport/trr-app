import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";

const {
  requireAdminMock,
  resolveAdminShowIdMock,
  getCoverPhotosMock,
  getShowCastWithStatsMock,
  getShowArchiveFootageCastMock,
  getCastByShowIdMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  resolveAdminShowIdMock: vi.fn(),
  getCoverPhotosMock: vi.fn(),
  getShowCastWithStatsMock: vi.fn(),
  getShowArchiveFootageCastMock: vi.fn(),
  getCastByShowIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/person-cover-photos-repository", () => ({
  getCoverPhotos: getCoverPhotosMock,
}));

vi.mock("@/lib/server/admin/resolve-show-id", () => ({
  resolveAdminShowId: resolveAdminShowIdMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getCastByShowId: getCastByShowIdMock,
  getShowCastWithStats: getShowCastWithStatsMock,
  getShowArchiveFootageCast: getShowArchiveFootageCastMock,
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/cast/route";

describe("show cast route default minEpisodes behavior", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    resolveAdminShowIdMock.mockReset();
    getCoverPhotosMock.mockReset();
    getShowCastWithStatsMock.mockReset();
    getShowArchiveFootageCastMock.mockReset();
    getCastByShowIdMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-test-user" });
    resolveAdminShowIdMock.mockResolvedValue("00000000-0000-0000-0000-000000000001");
    getCoverPhotosMock.mockResolvedValue(new Map());
    getShowArchiveFootageCastMock.mockResolvedValue([]);
    getCastByShowIdMock.mockResolvedValue([]);
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

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast?limit=500&test=fallback"
    );
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getShowCastWithStatsMock).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      expect.objectContaining({
        limit: 500,
        offset: 0,
        photoFallbackMode: "none",
      })
    );
    expect(payload.cast).toHaveLength(1);
    expect(payload.cast[0].person_id).toBe("p2");
    expect(payload.cast_source).toBe("episode_evidence");
    expect(payload.eligibility_warning).toBeNull();
  });

  it("falls back to show membership when default eligibility returns no cast", async () => {
    getShowCastWithStatsMock.mockResolvedValue([]);
    getCastByShowIdMock.mockResolvedValue([
      {
        id: "fallback-c1",
        person_id: "fallback-p1",
        full_name: "Fallback Person",
        cast_member_name: "Fallback Person",
        role: "Self",
        billing_order: 1,
        credit_category: "cast",
        photo_url: null,
        total_episodes: null,
      },
    ]);

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/cast?limit=500");
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getCastByShowIdMock).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      expect.objectContaining({
        limit: 500,
        offset: 0,
        photoFallbackMode: "none",
      })
    );
    expect(payload.cast).toHaveLength(1);
    expect(payload.cast[0].person_id).toBe("fallback-p1");
    expect(payload.cast_source).toBe("show_fallback");
    expect(typeof payload.eligibility_warning).toBe("string");
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
        total_episodes: 1,
      },
    ]);
    getCastByShowIdMock.mockResolvedValue([
      {
        id: "fallback-c1",
        person_id: "fallback-p1",
      },
    ]);

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/cast?minEpisodes=2");
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.cast).toHaveLength(0);
    expect(getCastByShowIdMock).not.toHaveBeenCalled();
    expect(payload.cast_source).toBe("episode_evidence");
    expect(payload.eligibility_warning).toBeNull();
  });

  it("supports imdb_show_membership roster mode and overlays episode evidence totals", async () => {
    getShowCastWithStatsMock.mockResolvedValue([
      {
        id: "ev-1",
        person_id: "p1",
        total_episodes: 12,
      },
    ]);
    getCastByShowIdMock.mockResolvedValue([
      {
        id: "base-1",
        person_id: "p1",
        full_name: "Roster Person",
        cast_member_name: "Roster Person",
        role: "Self",
        billing_order: 1,
        credit_category: "cast",
        photo_url: null,
        total_episodes: null,
      },
      {
        id: "base-2",
        person_id: "p2",
        full_name: "Membership Only",
        cast_member_name: "Membership Only",
        role: "Friend",
        billing_order: 2,
        credit_category: "cast",
        photo_url: null,
        total_episodes: null,
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast?limit=500&roster_mode=imdb_show_membership&minEpisodes=0"
    );
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getCastByShowIdMock).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      expect.objectContaining({
        limit: 500,
        offset: 0,
        photoFallbackMode: "none",
      })
    );
    expect(payload.cast_source).toBe("imdb_show_membership");
    expect(payload.eligibility_warning).toBeNull();
    expect(payload.cast).toHaveLength(2);
    const merged = payload.cast.find((row: { person_id: string }) => row.person_id === "p1");
    expect(merged?.total_episodes).toBe(12);
  });

  it("enforces exclude_zero_episode_members even when minEpisodes is explicitly 0", async () => {
    getShowCastWithStatsMock.mockResolvedValue([
      {
        id: "ev-1",
        person_id: "p1",
        total_episodes: 0,
      },
      {
        id: "ev-2",
        person_id: "p2",
        total_episodes: 5,
      },
    ]);
    getCastByShowIdMock.mockResolvedValue([
      {
        id: "base-1",
        person_id: "p1",
        full_name: "Zero Episodes",
        cast_member_name: "Zero Episodes",
        role: "Friend",
        billing_order: 1,
        credit_category: "cast",
        photo_url: null,
        total_episodes: null,
      },
      {
        id: "base-2",
        person_id: "p2",
        full_name: "Has Episodes",
        cast_member_name: "Has Episodes",
        role: "Housewife",
        billing_order: 2,
        credit_category: "cast",
        photo_url: null,
        total_episodes: null,
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast?roster_mode=imdb_show_membership&minEpisodes=0&exclude_zero_episode_members=1"
    );
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.cast).toHaveLength(1);
    expect(payload.cast[0].person_id).toBe("p2");
  });

  it("passes through photo_fallback=bravo only for that request", async () => {
    getShowCastWithStatsMock.mockResolvedValue([]);
    getCastByShowIdMock.mockResolvedValue([
      {
        id: "fallback-c1",
        person_id: "fallback-p1",
        full_name: "Fallback Person",
        cast_member_name: "Fallback Person",
        role: "Self",
        billing_order: 1,
        credit_category: "cast",
        photo_url: null,
        total_episodes: null,
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast?photo_fallback=bravo"
    );
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });

    expect(response.status).toBe(200);
    expect(getShowCastWithStatsMock).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      expect.objectContaining({ photoFallbackMode: "bravo" })
    );
    expect(getShowArchiveFootageCastMock).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      expect.objectContaining({ photoFallbackMode: "bravo" })
    );
    expect(getCastByShowIdMock).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      expect.objectContaining({ photoFallbackMode: "bravo" })
    );
  });

  it("coerces invalid photo_fallback values to none", async () => {
    getShowCastWithStatsMock.mockResolvedValue([
      {
        id: "c2",
        person_id: "p2",
        full_name: "Person Two",
        cast_member_name: "Person Two",
        role: null,
        billing_order: 2,
        credit_category: "cast",
        photo_url: null,
        total_episodes: 1,
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/show-1/cast?photo_fallback=invalid"
    );
    const response = await GET(request, { params: Promise.resolve({ showId: "show-1" }) });

    expect(response.status).toBe(200);
    expect(getShowCastWithStatsMock).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      expect.objectContaining({ photoFallbackMode: "none" })
    );
  });

  it("returns 404 when show slug cannot be resolved", async () => {
    resolveAdminShowIdMock.mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost/api/admin/trr-api/shows/not-found/cast");
    const response = await GET(request, { params: Promise.resolve({ showId: "not-found" }) });
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(404);
    expect(payload.error).toContain('Show not found for "not-found".');
  });
});
