import { describe, expect, it } from "vitest";

import {
  buildCanonicalShowAlternativeNames,
  buildShowDetailsFormValue,
  deriveShowDetailsAlternativeNames,
  deriveShowDetailsNickname,
  deriveShowDetailsSlugPreview,
} from "@/lib/admin/show-page/details-form";

describe("show details form helpers", () => {
  it("initializes nickname from the persisted slug when no preferred alias exists", () => {
    expect(
      deriveShowDetailsNickname({
        name: "The Real Housewives of Salt Lake City",
        slug: "rhoslc",
        alternative_names: [],
      })
    ).toBe("rhoslc");
  });

  it("initializes nickname from the preferred alias when the legacy slug is missing", () => {
    expect(
      deriveShowDetailsNickname({
        name: "The Real Housewives of Salt Lake City",
        slug: null,
        canonical_slug: "the-real-housewives-of-salt-lake-city",
        alternative_names: ["RHOSLC", "Salt Lake City"],
      })
    ).toBe("rhoslc");
  });

  it("omits the canonical slug from editable alternative names", () => {
    expect(
      deriveShowDetailsAlternativeNames({
        name: "Test Show",
        slug: "test-show",
        alternative_names: ["test-show", "Bravo Alias", "Test Show", "Bravo Alias"],
      })
    ).toEqual(["Bravo Alias"]);
  });

  it("keeps the preferred alias display value in editable alternative names", () => {
    expect(
      deriveShowDetailsAlternativeNames({
        name: "The Real Housewives of Salt Lake City",
        slug: null,
        canonical_slug: "the-real-housewives-of-salt-lake-city",
        alternative_names: ["RHOSLC", "Salt Lake City", "The Real Housewives of Salt Lake City"],
      })
    ).toEqual(["RHOSLC", "Salt Lake City"]);
  });

  it("keeps the normalized slug first while preserving the preferred alias display value", () => {
    expect(
      buildCanonicalShowAlternativeNames({
        displayName: "Test Show",
        nickname: " RHOSLC!!! ",
        alternativeNames: ["Salt Lake", "RHOSLC", "rhoslc", "Test Show"],
      })
    ).toEqual(["rhoslc", "RHOSLC", "Salt Lake"]);
  });

  it("uses the shared slugification rule for the preview", () => {
    expect(deriveShowDetailsSlugPreview("The Valley & Friends")).toBe("the-valley-and-friends");
  });

  it("builds editable details state from the backend-owned show contract", () => {
    expect(
      buildShowDetailsFormValue({
        name: "The Valley",
        slug: "the-valley",
        canonical_slug: "the-valley",
        alternative_names: ["Valley Girls", "The Valley"],
        description: "Chaos in the valley.",
        premiere_date: "2024-03-19",
        imdb_id: "tt1234567",
        tmdb_id: 98765,
        external_ids: {
          tvdb_id: "tvdb-1",
          wikidata_id: "Q123",
          tv_rage_id: "rage-9",
        },
        genres: ["Reality", "Drama"],
        networks: ["Bravo"],
        streaming_providers: ["Peacock"],
        watch_providers: ["Should not be used when streaming providers exist"],
        tags: ["friend group", "la"],
      })
    ).toEqual({
      displayName: "The Valley",
      nickname: "valley-girls",
      altNamesText: "Valley Girls",
      description: "Chaos in the valley.",
      premiereDate: "2024-03-19",
      imdbId: "tt1234567",
      tmdbId: "98765",
      tvdbId: "tvdb-1",
      wikidataId: "Q123",
      tvRageId: "rage-9",
      genresText: "Reality\nDrama",
      networksText: "Bravo",
      streamingProvidersText: "Peacock",
      tagsText: "friend group\nla",
    });
  });
});
