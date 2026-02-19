import { describe, expect, it } from "vitest";

import {
  buildShowAcronym,
  computePersonGalleryMediaViewAvailability,
  computePersonPhotoShowBuckets,
  resolveGalleryShowFilterFallback,
} from "@/lib/admin/person-gallery-media-view";
import type { TrrPersonPhoto } from "@/lib/server/trr-api/trr-shows-repository";

const makePhoto = (overrides: Partial<TrrPersonPhoto>): TrrPersonPhoto =>
  ({
    id: "photo-1",
    person_id: "person-1",
    source: "imdb",
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
      hasNonThisShowMatches: true,
    });
    expect(fallback).toBe("this-show");
  });
});
