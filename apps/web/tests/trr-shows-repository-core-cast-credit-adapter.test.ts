import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock, queryMock, MockAdminReadProxyError } = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
  queryMock: vi.fn(),
  MockAdminReadProxyError: class AdminReadProxyError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, options?: { code?: string }) {
      super(message);
      this.status = status;
      this.code = options?.code;
    }
  },
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  buildAdminBackendStatusError: ({ fallbackMessage }: { fallbackMessage: string }) =>
    new Error(fallbackMessage),
}));

import {
  getCastByShowId,
  getCastByShowSeason,
  getCastNamesByShowId,
  getCreditsByPersonId,
  getCuratedCastShowIdsByPersonId,
  getEpisodeCreditsByPersonId,
  getEpisodeCreditsByPersonShowId,
  getSeasonCastWithEpisodeCounts,
  getShowArchiveFootageCast,
  getShowCastWithStats,
} from "@/lib/server/trr-api/trr-shows-repository";

const castMember = {
  id: "credit-1",
  show_id: "show-1",
  person_id: "person-1",
  show_name: "Test Show",
  cast_member_name: "Person One",
  role: "Self",
  billing_order: 1,
  credit_category: "Self",
  source_type: "manual",
  full_name: "Person One",
  known_for: null,
  photo_url: "https://cdn.example.com/person-one.jpg",
  thumbnail_focus_x: 0.4,
  thumbnail_focus_y: 0.6,
  thumbnail_zoom: 1.2,
  thumbnail_crop_mode: "manual",
  total_episodes: 8,
  archive_episode_count: 2,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

const pagination = {
  limit: 10,
  offset: 2,
  count: 1,
  total_count: 1,
  has_more: false,
};

describe("TRR show repository core cast and credit adapters", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    queryMock.mockReset();
  });

  it("routes each show-cast view through the public v2 contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { cast: [castMember], pagination },
    });

    await expect(
      getCastByShowId("show-1", {
        limit: 10,
        offset: 2,
        photoFallbackMode: "bravo",
      }),
    ).resolves.toEqual([castMember]);
    await expect(getCastNamesByShowId("show-1", { limit: 10 })).resolves.toEqual([
      "Person One",
    ]);
    await expect(
      getShowCastWithStats("show-1", { limit: 10, offset: 2 }),
    ).resolves.toEqual([castMember]);
    await expect(
      getShowArchiveFootageCast("show-1", { limit: 10, offset: 2 }),
    ).resolves.toEqual([castMember]);

    expect(fetchAdminBackendJsonMock.mock.calls).toEqual([
      [
        "/shows/show-1/cast",
        {
          apiVersion: "v2",
          timeoutMs: 5_000,
          routeName: "public-core-show-cast-membership",
          queryString:
            "view=membership&include_photos=true&photo_fallback=bravo&limit=10&offset=2",
        },
      ],
      [
        "/shows/show-1/cast",
        {
          apiVersion: "v2",
          timeoutMs: 5_000,
          routeName: "public-core-show-cast-names",
          queryString:
            "view=membership&include_photos=false&photo_fallback=none&limit=10&offset=0",
        },
      ],
      [
        "/shows/show-1/cast",
        {
          apiVersion: "v2",
          timeoutMs: 5_000,
          routeName: "public-core-show-cast-episode-evidence",
          queryString:
            "view=episode_evidence&include_photos=true&photo_fallback=none&limit=10&offset=2",
        },
      ],
      [
        "/shows/show-1/cast",
        {
          apiVersion: "v2",
          timeoutMs: 5_000,
          routeName: "public-core-show-cast-archive-only",
          queryString:
            "view=archive_only&include_photos=true&photo_fallback=none&limit=10&offset=2",
        },
      ],
    ]);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects malformed core-cast rows instead of dropping or coercing them", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { cast: [{ ...castMember, person_id: 42 }] },
    });

    await expect(getCastByShowId("show-1")).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("resolves a season once per adapter and reads both season-cast views from v2", async () => {
    fetchAdminBackendJsonMock.mockImplementation(async (path: string) => {
      if (path === "/shows/show-1/seasons/3") {
        return {
          status: 200,
          data: {
            season: {
              id: "season-3",
              show_id: "show-1",
              season_number: 3,
            },
          },
        };
      }
      if (path === "/seasons/season-3/cast") {
        return {
          status: 200,
          data: {
            cast: [
              {
                person_id: "person-1",
                person_name: "Person One",
                seasons_appeared: [2, 3],
                total_episodes: 8,
                episodes_in_season: 5,
                archive_episodes_in_season: 1,
                photo_url: "https://cdn.example.com/person-one.jpg",
              },
            ],
          },
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const membership = await getCastByShowSeason("show-1", 3, {
      limit: 50,
      offset: 0,
      photoFallbackMode: "bravo",
    });
    const episodeCounts = await getSeasonCastWithEpisodeCounts("show-1", 3, {
      limit: 50,
      offset: 0,
      includeArchiveOnly: true,
    });

    expect(membership[0]).toMatchObject({
      person_id: "person-1",
      seasons_appeared: [2, 3],
      total_episodes: 8,
    });
    expect(episodeCounts[0]).toMatchObject({
      person_id: "person-1",
      episodes_in_season: 5,
      archive_episodes_in_season: 1,
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/seasons/season-3/cast",
      expect.objectContaining({
        routeName: "public-core-season-cast-membership",
        queryString:
          "view=membership&include_archive_only=false&photo_fallback=bravo&limit=50&offset=0",
      }),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/seasons/season-3/cast",
      expect.objectContaining({
        routeName: "public-core-season-cast-episode-counts",
        queryString:
          "view=episode_counts&include_archive_only=true&photo_fallback=none&limit=50&offset=0",
      }),
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("routes person credits, curated shows, and episode evidence through v2", async () => {
    const credit = {
      id: "credit-1",
      show_id: "show-1",
      person_id: "person-1",
      show_name: "Test Show",
      role: "Self",
      billing_order: 1,
      credit_category: "Self",
      source_type: "manual",
      external_imdb_id: null,
      external_url: null,
      metadata: null,
    };
    const episodeCredit = {
      show_id: "show-1",
      credit_id: "credit-1",
      credit_category: "Self",
      role: "Self",
      billing_order: 1,
      source_type: "manual",
      episode_id: "episode-1",
      season_number: 3,
      episode_number: 2,
      episode_name: "Dinner",
      appearance_type: "appears",
    };
    fetchAdminBackendJsonMock.mockImplementation(async (path: string) => {
      if (path.endsWith("/credits")) {
        return {
          status: 200,
          data: {
            credits: [credit],
            curated_cast_show_ids: ["show-1", "show-2"],
          },
        };
      }
      return {
        status: 200,
        data: { episode_credits: [episodeCredit] },
      };
    });

    await expect(
      getCreditsByPersonId("person-1", { limit: 10, offset: 2 }),
    ).resolves.toEqual([credit]);
    await expect(getCuratedCastShowIdsByPersonId("person-1")).resolves.toEqual(
      new Set(["show-1", "show-2"]),
    );
    await expect(
      getEpisodeCreditsByPersonShowId("person-1", "show-1", {
        includeArchiveFootage: true,
      }),
    ).resolves.toEqual([{ ...episodeCredit, show_id: undefined }]);
    await expect(
      getEpisodeCreditsByPersonId("person-1", { includeArchiveFootage: false }),
    ).resolves.toEqual([episodeCredit]);

    expect(fetchAdminBackendJsonMock.mock.calls).toEqual([
      [
        "/people/person-1/credits",
        expect.objectContaining({
          routeName: "public-core-person-credits",
          queryString: "limit=10&offset=2",
        }),
      ],
      [
        "/people/person-1/credits",
        expect.objectContaining({
          routeName: "public-core-person-curated-cast-shows",
          queryString: "limit=500&offset=0",
        }),
      ],
      [
        "/people/person-1/episode-credits",
        expect.objectContaining({
          routeName: "public-core-person-show-episode-credits",
          queryString: "show_id=show-1&include_archive_footage=true&limit=500&offset=0",
        }),
      ],
      [
        "/people/person-1/episode-credits",
        expect.objectContaining({
          routeName: "public-core-person-episode-credits",
          queryString: "include_archive_footage=false&limit=500&offset=0",
        }),
      ],
    ]);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
