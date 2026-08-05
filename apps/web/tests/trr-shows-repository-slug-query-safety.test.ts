import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock, queryMock } = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/trr-api/admin-read-proxy")>(
    "@/lib/server/trr-api/admin-read-proxy",
  );
  return {
    ...actual,
    fetchAdminBackendJson: fetchAdminBackendJsonMock,
  };
});

import {
  getEpisodeById,
  getEpisodesBySeasonId,
  getEpisodesByShowAndSeason,
  getSeasonById,
  getSeasonByShowAndNumber,
  getSeasonsByShowId,
  getShowById,
  searchEpisodes,
  searchShows,
  updateShowById,
} from "@/lib/server/trr-api/trr-shows-repository";

describe("trr shows repository public core adapter", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    queryMock.mockReset();
  });

  it("uses API v2 public core show reads instead of direct SQL show lookup queries", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({
        status: 200,
        data: {
          shows: [
            {
              id: "00000000-0000-0000-0000-000000000001",
              name: "The Real Housewives of Salt Lake City",
              slug: "the-real-housewives-of-salt-lake-city",
              canonical_slug: "the-real-housewives-of-salt-lake-city",
              alternative_names: ["RHOSLC"],
              genres: [],
              networks: [],
              streaming_providers: [],
              tags: [],
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        },
        durationMs: 1,
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          show: {
            id: "00000000-0000-0000-0000-000000000001",
            name: "The Real Housewives of Salt Lake City",
            slug: "the-real-housewives-of-salt-lake-city",
            canonical_slug: "the-real-housewives-of-salt-lake-city",
            alternative_names: ["RHOSLC"],
            imdb_id: "tt11363282",
            tmdb_id: 157065,
            genres: [],
            networks: [],
            streaming_providers: [],
            tags: [],
            primary_poster_image_id: "00000000-0000-0000-0000-000000000010",
            primary_backdrop_image_id: "00000000-0000-0000-0000-000000000011",
            primary_logo_image_id: "00000000-0000-0000-0000-000000000012",
            tmdb_status: "Returning Series",
            tmdb_vote_average: 7.8,
            imdb_rating_value: 6.2,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        },
        durationMs: 1,
      });

    await searchShows("salt lake city", { limit: 5, offset: 0 });
    const detail = await getShowById("00000000-0000-0000-0000-000000000001");

    expect(queryMock).not.toHaveBeenCalled();
    expect(detail).toMatchObject({
      imdb_id: "tt11363282",
      tmdb_id: 157065,
      primary_poster_image_id: "00000000-0000-0000-0000-000000000010",
      primary_backdrop_image_id: "00000000-0000-0000-0000-000000000011",
      primary_logo_image_id: "00000000-0000-0000-0000-000000000012",
      tmdb_status: "Returning Series",
      tmdb_vote_average: 7.8,
      imdb_rating_value: 6.2,
      overview_networks: [],
      overview_streaming_providers: [],
      overview_watch_availability: [],
      watch_provider_regions: [],
      watch_providers: [],
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(1, "/shows", {
      apiVersion: "v2",
      queryString: "q=salt+lake+city&limit=5&offset=0",
      routeName: "public-core-shows-list",
      timeoutMs: expect.any(Number),
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      "/shows/00000000-0000-0000-0000-000000000001",
      {
        apiVersion: "v2",
        routeName: "public-core-show-detail",
        timeoutMs: expect.any(Number),
      },
    );
  });

  it("preserves the existing empty show search as an unfiltered list", async () => {
    fetchAdminBackendJsonMock.mockResolvedValueOnce({
      status: 200,
      data: { shows: [] },
      durationMs: 1,
    });

    await searchShows("");

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith("/shows", {
      apiVersion: "v2",
      queryString: "limit=20&offset=0",
      routeName: "public-core-shows-list",
      timeoutMs: expect.any(Number),
    });
  });

  it("preserves the existing empty episode search as an unfiltered list", async () => {
    fetchAdminBackendJsonMock.mockResolvedValueOnce({
      status: 200,
      data: { episodes: [] },
      durationMs: 1,
    });

    await searchEpisodes("");

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith("/episodes", {
      apiVersion: "v2",
      queryString: "limit=20&offset=0",
      routeName: "public-core-episodes-list",
      timeoutMs: expect.any(Number),
    });
  });

  it("returns the complete updated show without a fallible backend reread", async () => {
    const showId = "00000000-0000-0000-0000-000000000001";
    fetchAdminBackendJsonMock.mockResolvedValueOnce({
      status: 200,
      data: {
        show: {
        id: showId,
        name: "Updated Show",
        slug: "updated-show",
        canonical_slug: "updated-show",
        alternative_names: [],
        imdb_id: "tt1234567",
        tmdb_id: 123,
        external_ids: {},
        show_total_seasons: 2,
        show_total_episodes: 24,
        description: "Updated description",
        premiere_date: "2024-01-01",
        genres: ["Reality"],
        networks: ["Bravo"],
        streaming_providers: ["Peacock"],
        tags: [],
        primary_poster_image_id: "00000000-0000-0000-0000-000000000010",
        primary_backdrop_image_id: "00000000-0000-0000-0000-000000000011",
        primary_logo_image_id: "00000000-0000-0000-0000-000000000012",
        poster_url: "https://cdn.example/poster.jpg",
        backdrop_url: "https://cdn.example/backdrop.jpg",
        logo_url: "https://cdn.example/logo.svg",
        tmdb_status: "Returning Series",
        tmdb_vote_average: 7.8,
        imdb_rating_value: 6.2,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2026-07-16T00:00:00Z",
        },
      },
      durationMs: 1,
    });

    const updated = await updateShowById(showId, { name: "Updated Show" });

    expect(queryMock).not.toHaveBeenCalled();
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(`/admin/shows/${showId}`, {
      adminContext: undefined,
      apiVersion: "v2",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Show" }),
      timeoutMs: expect.any(Number),
      routeName: "admin-show:update",
      requestRole: "primary",
    });
    expect(updated).toMatchObject({
      id: showId,
      name: "Updated Show",
      primary_poster_image_id: "00000000-0000-0000-0000-000000000010",
      poster_url: "https://cdn.example/poster.jpg",
      tmdb_status: "Returning Series",
      imdb_rating_value: 6.2,
    });
  });

  it("uses API v2 public core season and episode reads instead of direct SQL", async () => {
    const showId = "00000000-0000-0000-0000-000000000001";
    const seasonId = "00000000-0000-0000-0000-000000000002";
    const episodeId = "00000000-0000-0000-0000-000000000003";
    const season = {
      id: seasonId,
      show_id: showId,
      season_number: 4,
      name: "Season 4",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    const episode = {
      id: episodeId,
      show_id: showId,
      season_id: seasonId,
      season_number: 4,
      episode_number: 1,
      title: "Snowflakes and Salt Lakes",
      show_slug: "the-real-housewives-of-salt-lake-city",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 200, data: { seasons: [season] }, durationMs: 1 })
      .mockResolvedValueOnce({ status: 200, data: { season }, durationMs: 1 })
      .mockResolvedValueOnce({ status: 200, data: { season }, durationMs: 1 })
      .mockResolvedValueOnce({ status: 200, data: { episodes: [episode] }, durationMs: 1 })
      .mockResolvedValueOnce({ status: 200, data: { episodes: [episode] }, durationMs: 1 })
      .mockResolvedValueOnce({ status: 200, data: { episode }, durationMs: 1 })
      .mockResolvedValueOnce({ status: 200, data: { episodes: [episode] }, durationMs: 1 });

    await getSeasonsByShowId(showId, { includeEpisodeSignal: true, limit: 10, offset: 2 });
    await getSeasonById(seasonId);
    await getSeasonByShowAndNumber(showId, 4);
    await getEpisodesBySeasonId(seasonId, { limit: 20, offset: 3 });
    await getEpisodesByShowAndSeason(showId, 4, { limit: 30, offset: 4 });
    await getEpisodeById(episodeId);
    await searchEpisodes("snowflakes", { limit: 5, offset: 1 });

    expect(queryMock).not.toHaveBeenCalled();
    expect(fetchAdminBackendJsonMock.mock.calls).toEqual([
      ["/shows/00000000-0000-0000-0000-000000000001/seasons", {
        apiVersion: "v2",
        queryString: "include_episode_signal=true&limit=10&offset=2",
        routeName: "public-core-show-seasons-list",
        timeoutMs: expect.any(Number),
      }],
      ["/seasons/00000000-0000-0000-0000-000000000002", {
        apiVersion: "v2",
        routeName: "public-core-season-detail",
        timeoutMs: expect.any(Number),
      }],
      ["/shows/00000000-0000-0000-0000-000000000001/seasons/4", {
        apiVersion: "v2",
        routeName: "public-core-show-season-detail",
        timeoutMs: expect.any(Number),
      }],
      ["/seasons/00000000-0000-0000-0000-000000000002/episodes", {
        apiVersion: "v2",
        queryString: "limit=20&offset=3",
        routeName: "public-core-season-episodes-list",
        timeoutMs: expect.any(Number),
      }],
      ["/shows/00000000-0000-0000-0000-000000000001/seasons/4/episodes", {
        apiVersion: "v2",
        queryString: "limit=30&offset=4",
        routeName: "public-core-show-season-episodes-list",
        timeoutMs: expect.any(Number),
      }],
      ["/episodes/00000000-0000-0000-0000-000000000003", {
        apiVersion: "v2",
        routeName: "public-core-episode-detail",
        timeoutMs: expect.any(Number),
      }],
      ["/episodes", {
        apiVersion: "v2",
        queryString: "q=snowflakes&limit=5&offset=1",
        routeName: "public-core-episodes-list",
        timeoutMs: expect.any(Number),
      }],
    ]);
  });
});
