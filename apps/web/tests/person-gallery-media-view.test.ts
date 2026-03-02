import { describe, expect, it } from "vitest";

import {
  buildShowAcronym,
  computePersonGalleryMediaViewAvailability,
  computePersonPhotoShowBuckets,
  resolveGalleryShowFilterFallback,
  isLikelyImdbEpisodeCaption,
} from "@/lib/admin/person-gallery-media-view";
import type { TrrPersonPhoto } from "@/lib/server/trr-api/trr-shows-repository";

const makePhoto = (overrides: Partial<TrrPersonPhoto>): TrrPersonPhoto =>
  ({
    id: "photo-1",
    person_id: "person-1",
    source: "tmdb",
    source_image_id: null,
    source_asset_id: null,
    url: "https://example.com/original.jpg",
    hosted_url: "https://cdn.example.com/photo.jpg",
    caption: null,
    width: 1200,
    height: 1600,
    context_section: null,
    context_type: null,
    season: null,
    source_page_url: null,
    people_names: null,
    people_ids: null,
    title_names: null,
    metadata: null,
    fetched_at: null,
    created_at: null,
    origin: "cast_photos",
    link_id: null,
    media_asset_id: null,
    facebank_seed: false,
    thumbnail_focus_x: null,
    thumbnail_focus_y: null,
    thumbnail_zoom: null,
    thumbnail_crop_mode: null,
    ...overrides,
  }) as TrrPersonPhoto;

describe("person gallery media view helpers", () => {
  it("computes WWHL and Other Shows availability from photo buckets", () => {
    const photos = [
      makePhoto({
        id: "this-show",
        metadata: { show_id: "show-1", show_name: "The Real Housewives of Salt Lake City" },
      }),
      makePhoto({
        id: "wwhl",
        caption: "Best moment on #WWHL",
      }),
      makePhoto({
        id: "other",
        metadata: { show_name: "The Real Housewives of Beverly Hills" },
      }),
    ];

    const availability = computePersonGalleryMediaViewAvailability({
      photos,
      showIdForApi: "show-1",
      activeShowName: "The Real Housewives of Salt Lake City",
      activeShowAcronym: buildShowAcronym("The Real Housewives of Salt Lake City"),
      allKnownShowNameMatches: [
        "the real housewives of salt lake city",
        "the real housewives of beverly hills",
      ],
      allKnownShowAcronymMatches: new Set(["TRSL", "RHOBH"]),
      allKnownShowIds: ["show-1"],
      otherShowNameMatches: ["the real housewives of beverly hills"],
      otherShowAcronymMatches: new Set(["RHOBH"]),
    });

    expect(availability.hasWwhlMatches).toBe(true);
    expect(availability.hasOtherShowMatches).toBe(true);
    expect(availability.hasNonThisShowMatches).toBe(true);
  });

  it("matches selected other show by show_id", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        id: "selected-other",
        metadata: { show_id: "show-2", show_name: "Below Deck" },
      }),
      showIdForApi: "show-1",
      activeShowName: "The Real Housewives of Salt Lake City",
      activeShowAcronym: buildShowAcronym("The Real Housewives of Salt Lake City"),
      allKnownShowNameMatches: ["the real housewives of salt lake city", "below deck"],
      allKnownShowAcronymMatches: new Set(["TR", "BD"]),
      allKnownShowIds: ["show-1", "show-2"],
      otherShowNameMatches: ["below deck"],
      otherShowAcronymMatches: new Set(["BD"]),
      selectedOtherShow: {
        showId: "show-2",
        showName: "Below Deck",
        acronym: "BD",
      },
    });

    expect(buckets.matchesSelectedOtherShow).toBe(true);
  });

  it("falls back to this-show when selected filter is unavailable", () => {
    const fallback = resolveGalleryShowFilterFallback({
      currentFilter: "wwhl",
      showContextEnabled: true,
      hasWwhlMatches: false,
      hasEventMatches: false,
      hasOtherShowMatches: true,
      hasUnknownShowMatches: false,
      hasSelectedOtherShowMatches: true,
      hasNonThisShowMatches: true,
      canSelectWwhlWithoutMatches: false,
      canSelectOtherShowWithoutMatches: false,
    });
    expect(fallback).toBe("this-show");
  });

  it("keeps WWHL selected with zero matches when credit-eligible", () => {
    const fallback = resolveGalleryShowFilterFallback({
      currentFilter: "wwhl",
      showContextEnabled: true,
      hasWwhlMatches: false,
      hasEventMatches: false,
      hasOtherShowMatches: true,
      hasUnknownShowMatches: false,
      hasSelectedOtherShowMatches: true,
      hasNonThisShowMatches: true,
      canSelectWwhlWithoutMatches: true,
      canSelectOtherShowWithoutMatches: false,
    });
    expect(fallback).toBe("wwhl");
  });

  it("keeps selected other-show filter with zero matches when credit-eligible", () => {
    const fallback = resolveGalleryShowFilterFallback({
      currentFilter: "other-shows",
      showContextEnabled: true,
      hasWwhlMatches: true,
      hasEventMatches: false,
      hasOtherShowMatches: false,
      hasUnknownShowMatches: false,
      hasSelectedOtherShowMatches: false,
      hasNonThisShowMatches: true,
      canSelectWwhlWithoutMatches: false,
      canSelectOtherShowWithoutMatches: true,
    });
    expect(fallback).toBe("other-shows");
  });

  it("does not classify movie captions as episode captions", () => {
    expect(
      isLikelyImdbEpisodeCaption(
        "Alan Cumming in Reefer Madness: The Movie Musical (2005)"
      )
    ).toBe(false);
  });

  it("classifies explicit IMDb episode-style captions", () => {
    expect(isLikelyImdbEpisodeCaption("Episode 4 (2020)")).toBe(true);
    expect(isLikelyImdbEpisodeCaption("The Hills #5.12")).toBe(false);
    expect(isLikelyImdbEpisodeCaption("Season 3 Episode 12 (2015)")).toBe(true);
    expect(isLikelyImdbEpisodeCaption("S01E12 (2018)")).toBe(true);
    expect(isLikelyImdbEpisodeCaption("No year text")).toBe(false);
  });

  it("does not treat movie-style caption as current-show match", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Alan Cumming in Reefer Madness: The Movie Musical (2005)",
        metadata: {
          show_id: "legacy-show-id",
          show_name: "The Show No One Actually Wants",
        },
      }),
      showIdForApi: "the-traitors-show-id",
      activeShowName: "The Traitors",
      activeShowAcronym: "TR",
      allKnownShowNameMatches: ["the traitors", "other show"],
      allKnownShowAcronymMatches: new Set(["TR", "OS"]),
      allKnownShowIds: ["the-traitors-show-id", "legacy-show-id"],
      otherShowNameMatches: ["other show"],
      otherShowAcronymMatches: new Set(["OS"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
    expect(buckets.matchesOtherShows).toBe(false);
    expect(buckets.matchesUnknownShows).toBe(true);
  });

  it("does not treat IMDb episode-style captions as current-show match without explicit show context", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Season 3 Episode 12 (2015)",
      }),
      showIdForApi: "the-traitors-show-id",
      activeShowName: "The Traitors",
      activeShowAcronym: "TR",
      allKnownShowNameMatches: ["the traitors"],
      allKnownShowAcronymMatches: new Set(["TR"]),
      allKnownShowIds: ["the-traitors-show-id"],
      otherShowNameMatches: ["other show"],
      otherShowAcronymMatches: new Set(["OS"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
    expect(buckets.matchesOtherShows).toBe(false);
    expect(buckets.matchesUnknownShows).toBe(true);
  });

  it("classifies episode-style caption without show metadata as unknown show", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Season 3 Episode 12 (2015)",
      }),
      showIdForApi: "the-traitors-show-id",
      activeShowName: "The Traitors",
      activeShowAcronym: "TR",
      allKnownShowNameMatches: [],
      allKnownShowAcronymMatches: new Set(),
      allKnownShowIds: ["the-traitors-show-id"],
      otherShowNameMatches: ["other show"],
      otherShowAcronymMatches: new Set(["OS"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
    expect(buckets.matchesOtherShows).toBe(false);
    expect(buckets.matchesUnknownShows).toBe(true);
  });

  it("classifies non-context, non-matching photos as unknown show", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "A scene with no identifiable show context",
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "TR",
      allKnownShowNameMatches: ["the traitors", "other known show"],
      allKnownShowAcronymMatches: new Set(["TR", "OKS"]),
      allKnownShowIds: ["show-traitors"],
      otherShowNameMatches: ["other known show"],
      otherShowAcronymMatches: new Set(["OKS"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
    expect(buckets.matchesOtherShows).toBe(false);
    expect(buckets.matchesUnknownShows).toBe(true);
  });

  it("does not classify IMDb movie-title evidence as current show when scoped show_id is incorrect", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Alan Cumming in 007: The Return (1995)",
        title_names: ["007: The Return"],
        metadata: {
          show_id: "show-traitors",
          show_name: "The Traitors",
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "T",
      allKnownShowNameMatches: ["the traitors", "watch what happens live"],
      allKnownShowAcronymMatches: new Set(["T", "WWHL"]),
      allKnownShowIds: ["show-traitors", "show-wwhl"],
      otherShowNameMatches: ["watch what happens live"],
      otherShowAcronymMatches: new Set(["WWHL"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
    expect(buckets.matchesOtherShows).toBe(false);
    expect(buckets.matchesUnknownShows).toBe(true);
  });

  it("routes IMDb WWHL episode-title rows to WWHL instead of this-show", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Alan Cumming and Milo Ventimiglia in Milo Ventimiglia & Alan Cumming (2023)",
        title_names: ["Milo Ventimiglia & Alan Cumming"],
        metadata: {
          episode_title: "Milo Ventimiglia & Alan Cumming",
          show_name: "Watch What Happens Live with Andy Cohen",
          show_id: "show-wwhl",
          show_context_source: "imdb_title_fallback",
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "T",
      allKnownShowNameMatches: ["the traitors", "watch what happens live with andy cohen"],
      allKnownShowAcronymMatches: new Set(["T", "WWHL"]),
      allKnownShowIds: ["show-traitors", "show-wwhl"],
      otherShowNameMatches: ["watch what happens live with andy cohen"],
      otherShowAcronymMatches: new Set(["WWHL"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
    expect(buckets.matchesWwhl).toBe(true);
  });

  it("routes IMDb event rows to events bucket", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Alan Cumming at The 77th Primetime Emmy Awards",
        metadata: {
          imdb_image_type: "event",
          content_type: "EVENT",
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "T",
      allKnownShowNameMatches: ["the traitors"],
      allKnownShowAcronymMatches: new Set(["T"]),
      allKnownShowIds: ["show-traitors"],
      otherShowNameMatches: [],
      otherShowAcronymMatches: new Set(),
      selectedOtherShow: null,
    });

    expect(buckets.matchesEvents).toBe(true);
    expect(buckets.matchesUnknownShows).toBe(false);
  });

  it("routes unresolved IMDb episode rows to WWHL via imdb_fallback_show_name", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Alan Cumming and Milo Ventimiglia in Milo Ventimiglia & Alan Cumming (2023)",
        title_names: ["Milo Ventimiglia & Alan Cumming"],
        metadata: {
          show_context_source: "imdb_episode_unresolved",
          imdb_fallback_show_name: "Watch What Happens Live with Andy Cohen",
          episode_title: "Milo Ventimiglia & Alan Cumming",
          imdb_title_type: "TVEpisode",
          imdb_image_type: "still_frame",
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "T",
      allKnownShowNameMatches: ["the traitors", "watch what happens live with andy cohen"],
      allKnownShowAcronymMatches: new Set(["T", "WWHL"]),
      allKnownShowIds: ["show-traitors", "show-wwhl"],
      otherShowNameMatches: ["watch what happens live with andy cohen"],
      otherShowAcronymMatches: new Set(["WWHL"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
    expect(buckets.matchesWwhl).toBe(true);
    expect(buckets.matchesUnknownShows).toBe(false);
  });

  it("routes trusted IMDb fallback rows to WWHL when show_name is blank", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Alan Cumming and Milo Ventimiglia in Milo Ventimiglia & Alan Cumming (2023)",
        title_names: ["Milo Ventimiglia & Alan Cumming"],
        metadata: {
          show_context_source: "imdb_title_fallback",
          show_name: null,
          imdb_fallback_show_name: "Watch What Happens Live with Andy Cohen",
          episode_title: "Milo Ventimiglia & Alan Cumming",
          imdb_title_type: "TVEpisode",
          imdb_image_type: "still_frame",
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "T",
      allKnownShowNameMatches: ["the traitors", "watch what happens live with andy cohen"],
      allKnownShowAcronymMatches: new Set(["T", "WWHL"]),
      allKnownShowIds: ["show-traitors", "show-wwhl"],
      otherShowNameMatches: ["watch what happens live with andy cohen"],
      otherShowAcronymMatches: new Set(["WWHL"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
    expect(buckets.matchesWwhl).toBe(true);
    expect(buckets.matchesUnknownShows).toBe(false);
  });

  it("routes IMDb rows to WWHL when fallback show name is present even without episode evidence", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Alan Cumming on a talk show",
        title_names: ["Alan Cumming"],
        metadata: {
          show_context_source: "request_context",
          imdb_fallback_show_name: "Watch What Happens Live with Andy Cohen",
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "T",
      allKnownShowNameMatches: ["the traitors", "watch what happens live with andy cohen"],
      allKnownShowAcronymMatches: new Set(["T", "WWHL"]),
      allKnownShowIds: ["show-traitors", "show-wwhl"],
      otherShowNameMatches: ["watch what happens live with andy cohen"],
      otherShowAcronymMatches: new Set(["WWHL"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
    expect(buckets.matchesWwhl).toBe(true);
  });

  it("keeps trusted IMDb episode metadata in this-show bucket when show text is absent", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Titles: The Game Is Afoot",
        title_names: ["The Game Is Afoot"],
        metadata: {
          episode_title: "The Game Is Afoot",
          show_id: "show-traitors",
          show_name: "The Traitors",
          show_context_source: "episode_table",
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "T",
      allKnownShowNameMatches: ["the traitors", "watch what happens live with andy cohen"],
      allKnownShowAcronymMatches: new Set(["T", "WWHL"]),
      allKnownShowIds: ["show-traitors", "show-wwhl"],
      otherShowNameMatches: ["watch what happens live with andy cohen"],
      otherShowAcronymMatches: new Set(["WWHL"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(true);
    expect(buckets.matchesWwhl).toBe(false);
  });

  it("treats request-context inferred IMDb metadata as trusted for this-show", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Alan Cumming in The Power of the Seer (2025)",
        title_names: ["The Power of the Seer"],
        metadata: {
          episode_title: "The Power of the Seer",
          show_id: "show-traitors",
          show_name: "The Traitors",
          show_context_source: "request_context_inferred",
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "T",
      allKnownShowNameMatches: ["the traitors", "watch what happens live with andy cohen"],
      allKnownShowAcronymMatches: new Set(["T", "WWHL"]),
      allKnownShowIds: ["show-traitors", "show-wwhl"],
      otherShowNameMatches: ["watch what happens live with andy cohen"],
      otherShowAcronymMatches: new Set(["WWHL"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(true);
    expect(buckets.matchesUnknownShows).toBe(false);
  });

  it("does not trust request-context inferred IMDb metadata without corroborating show name", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Alan Cumming in The Power of the Seer (2025)",
        title_names: ["The Power of the Seer"],
        metadata: {
          episode_title: "The Power of the Seer",
          show_id: "show-traitors",
          show_name: "Different Show",
          show_context_source: "request_context_inferred",
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "T",
      allKnownShowNameMatches: ["the traitors", "watch what happens live with andy cohen"],
      allKnownShowAcronymMatches: new Set(["T", "WWHL"]),
      allKnownShowIds: ["show-traitors", "show-wwhl"],
      otherShowNameMatches: ["watch what happens live with andy cohen"],
      otherShowAcronymMatches: new Set(["WWHL"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
    expect(buckets.matchesUnknownShows).toBe(true);
  });

  it("uses imdb_fallback_show_name for episode-evidenced IMDb rows in this-show bucket", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Revenge Is a Dish Best Served Cold (2025)",
        title_names: ["Revenge Is a Dish Best Served Cold"],
        metadata: {
          show_context_source: "imdb_episode_unresolved",
          imdb_fallback_show_name: "The Traitors",
          episode_title: "Revenge Is a Dish Best Served Cold",
          season_number: 3,
          episode_number: 2,
          imdb_image_type: "still_frame",
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors (US)",
      activeShowAcronym: "TT",
      allKnownShowNameMatches: ["the traitors", "watch what happens live with andy cohen"],
      allKnownShowAcronymMatches: new Set(["TT", "WWHL"]),
      allKnownShowIds: ["show-traitors", "show-wwhl"],
      otherShowNameMatches: ["watch what happens live with andy cohen"],
      otherShowAcronymMatches: new Set(["WWHL"]),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(true);
    expect(buckets.matchesUnknownShows).toBe(false);
  });

  it("matches selected other-show pill by normalized show name variants", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Episode Still (2025)",
        metadata: {
          show_context_source: "imdb_episode_unresolved",
          imdb_fallback_show_name: "The Traitors",
          episode_title: "Episode Still",
          imdb_title_type: "TVEPISODE",
        },
      }),
      showIdForApi: "show-rhobh",
      activeShowName: "The Real Housewives of Beverly Hills",
      activeShowAcronym: "RHOBH",
      allKnownShowNameMatches: ["the real housewives of beverly hills", "the traitors (us)"],
      allKnownShowAcronymMatches: new Set(["RHOBH", "TTUS"]),
      allKnownShowIds: ["show-rhobh"],
      otherShowNameMatches: ["the traitors (us)"],
      otherShowAcronymMatches: new Set(["TTUS"]),
      selectedOtherShow: {
        showId: null,
        showName: "The Traitors (US)",
        acronym: "TTUS",
      },
    });

    expect(buckets.matchesSelectedOtherShow).toBe(true);
    expect(buckets.matchesOtherShows).toBe(true);
  });

  it("keeps request_context IMDb metadata untrusted without corroborating text/acronym evidence", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Episode 2 (2025)",
        metadata: {
          show_context_source: "request_context",
          show_name: "The Traitors",
          episode_title: "Revenge Is a Dish Best Served Cold",
          season_number: 3,
          episode_number: 2,
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "TT",
      allKnownShowNameMatches: ["the traitors"],
      allKnownShowAcronymMatches: new Set(["TT"]),
      allKnownShowIds: ["show-traitors"],
      otherShowNameMatches: [],
      otherShowAcronymMatches: new Set(),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
    expect(buckets.matchesUnknownShows).toBe(true);
  });

  it("treats request_context_rejected IMDb metadata as explicitly untrusted", () => {
    const buckets = computePersonPhotoShowBuckets({
      photo: makePhoto({
        source: "imdb",
        caption: "Alan Cumming in The Power of the Seer (2025)",
        metadata: {
          show_context_source: "request_context_rejected",
          show_name: "The Traitors",
          imdb_fallback_show_name: "The Traitors",
          episode_title: "The Power of the Seer",
          season_number: 3,
          episode_number: 2,
          imdb_title_type: "TVEpisode",
        },
      }),
      showIdForApi: "show-traitors",
      activeShowName: "The Traitors",
      activeShowAcronym: "TT",
      allKnownShowNameMatches: ["the traitors"],
      allKnownShowAcronymMatches: new Set(["TT"]),
      allKnownShowIds: ["show-traitors"],
      otherShowNameMatches: [],
      otherShowAcronymMatches: new Set(),
      selectedOtherShow: null,
    });

    expect(buckets.matchesThisShow).toBe(false);
  });
});
