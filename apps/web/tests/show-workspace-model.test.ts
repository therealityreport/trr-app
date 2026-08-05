import { describe, expect, it } from "vitest";

import {
  GalleryAssetSourceError,
  buildSeasonEpisodeSummary,
  buildSeasonEpisodeSummaryMap,
  getMeaningfulShowCreditsRoles,
  groupShowCrewRows,
  normalizeErrorMessage,
  normalizeShowCreditsCastRoster,
  type ShowCrewCreditRow,
  type TrrSeason,
} from "@/lib/admin/show-page/workspace-model";

const buildSeason = (overrides: Partial<TrrSeason> = {}): TrrSeason => ({
  id: "season-1",
  show_id: "show-1",
  season_number: 1,
  name: "Season 1",
  title: null,
  overview: null,
  air_date: null,
  url_original_poster: null,
  tmdb_season_id: null,
  ...overrides,
});

const buildCrewRow = (
  overrides: Partial<ShowCrewCreditRow> = {}
): ShowCrewCreditRow => ({
  credit_id: "credit-1",
  person_id: "person-1",
  person_name: "Alex Example",
  role: "Producer",
  billing_order: null,
  source_type: null,
  episode_count: null,
  episodes_label: null,
  years_label: null,
  imdb_name_id: null,
  display_order: null,
  ...overrides,
});

describe("show workspace model", () => {
  it("preserves the season summary precedence and null behavior", () => {
    expect(buildSeasonEpisodeSummary(buildSeason())).toBeNull();

    expect(
      buildSeasonEpisodeSummary(
        buildSeason({
          episode_count: 10,
          episode_airdate_count: 8,
          premiere_date: "2025-01-02",
          air_date: "2025-01-03",
          first_episode_air_date: "2025-01-01",
          last_episode_air_date: "2025-03-01",
        })
      )
    ).toEqual({
      count: 10,
      premiereDate: "2025-01-01",
      finaleDate: "2025-03-01",
    });
  });

  it("maps only seasons with summary data", () => {
    expect(
      buildSeasonEpisodeSummaryMap([
        buildSeason(),
        buildSeason({ id: "season-2", season_number: 2, episode_airdate_count: 7 }),
      ])
    ).toEqual({
      "season-2": {
        count: 7,
        premiereDate: null,
        finaleDate: null,
      },
    });
  });

  it("normalizes nested and list error payloads without changing precedence", () => {
    expect(normalizeErrorMessage([" first ", { detail: "second" }, null])).toBe(
      "first; second"
    );
    expect(
      normalizeErrorMessage({ error: "preferred", detail: "fallback", message: "last" })
    ).toBe("preferred");
    expect(normalizeErrorMessage("   ")).toBeNull();
  });

  it("normalizes credits cast rows and drops rows without a person id", () => {
    expect(
      normalizeShowCreditsCastRoster([
        null,
        { person_name: "Missing id" },
        {
          person_id: " person-1 ",
          person_name: "Alex Example",
          roles: ["Host", "", 5],
          photo_url: "https://example.com/photo.jpg",
          total_episodes: 12,
          archive_episodes: 3,
          latest_season: 4,
          season_numbers: [1, 2, Number.NaN, "3"],
        },
      ])
    ).toEqual([
      expect.objectContaining({
        id: "person-1",
        person_id: "person-1",
        full_name: "Alex Example",
        cast_member_name: "Alex Example",
        role: "Host",
        roles: ["Host"],
        total_episodes: 12,
        archive_episode_count: 3,
        latest_season: 4,
        seasons_appeared: [1, 2],
      }),
    ]);
  });

  it("filters generic self roles but keeps meaningful credits", () => {
    expect(
      getMeaningfulShowCreditsRoles([
        " Cast ",
        "Self",
        "Self - Guest",
        "Self/Host",
        " Executive Producer ",
        "",
      ])
    ).toEqual(["Executive Producer"]);
  });

  it("groups crew rows in first-seen order and falls back to credit ids", () => {
    const grouped = groupShowCrewRows([
      buildCrewRow(),
      buildCrewRow({ credit_id: "credit-2", role: "Writer" }),
      buildCrewRow({ credit_id: "credit-3", person_id: "", person_name: "Unknown" }),
    ]);

    expect(grouped.map((row) => row.person_id)).toEqual(["person-1", "credit-3"]);
    expect(grouped[0]?.role_lines.map((row) => row.role)).toEqual(["Producer", "Writer"]);
  });

  it("retains gallery source error metadata", () => {
    const error = new GalleryAssetSourceError({
      message: "source unavailable",
      status: 503,
      retryable: true,
      code: "UPSTREAM_TIMEOUT",
      reason: "timeout",
      detail: { source: "bravo" },
    });

    expect(error).toMatchObject({
      name: "GalleryAssetSourceError",
      message: "source unavailable",
      status: 503,
      retryable: true,
      code: "UPSTREAM_TIMEOUT",
      reason: "timeout",
      detail: { source: "bravo" },
    });
  });
});
