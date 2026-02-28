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
      hasOtherShowMatches: true,
      hasUnknownShowMatches: false,
      hasSelectedOtherShowMatches: true,
      hasNonThisShowMatches: true,
    });
    expect(fallback).toBe("this-show");
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
});
