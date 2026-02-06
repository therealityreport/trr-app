import { describe, expect, it } from "vitest";
import { DEFAULT_ADVANCED_FILTERS } from "@/lib/admin/advanced-filters";
import { applyAdvancedFiltersToSeasonAssets } from "@/lib/gallery-advanced-filtering";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

const mkAsset = (overrides: Partial<SeasonAsset>): SeasonAsset => ({
  id: overrides.id ?? "00000000-0000-0000-0000-000000000000",
  type: overrides.type ?? "season",
  source: overrides.source ?? "tmdb",
  kind: overrides.kind ?? "image",
  hosted_url: overrides.hosted_url ?? "https://example.com/a.jpg",
  width: overrides.width ?? null,
  height: overrides.height ?? null,
  caption: overrides.caption ?? null,
  episode_number: overrides.episode_number,
  person_name: overrides.person_name,
  person_id: overrides.person_id,
  season_number: overrides.season_number,
  ingest_status: overrides.ingest_status,
  created_at: overrides.created_at,
  fetched_at: overrides.fetched_at,
  context_section: overrides.context_section,
  context_type: overrides.context_type,
  metadata: overrides.metadata ?? null,
  hosted_content_type: overrides.hosted_content_type,
});

describe("applyAdvancedFiltersToSeasonAssets", () => {
  it("treats TEXT+NO TEXT selected as no text filter (unknowns included)", () => {
    const assets: SeasonAsset[] = [
      mkAsset({ id: "a", hosted_url: "https://example.com/1.jpg", metadata: { has_text_overlay: true } }),
      mkAsset({ id: "b", hosted_url: "https://example.com/2.jpg", metadata: { has_text_overlay: false } }),
      mkAsset({ id: "c", hosted_url: "https://example.com/3.jpg", metadata: {} }), // unknown
    ];

    const filters = {
      ...DEFAULT_ADVANCED_FILTERS,
      text: ["text", "no_text"],
    };

    const result = applyAdvancedFiltersToSeasonAssets(assets, filters);
    expect(result.map((a) => a.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("when TEXT is active, excludes unknowns and keeps only has_text_overlay=true", () => {
    const assets: SeasonAsset[] = [
      mkAsset({ id: "a", hosted_url: "https://example.com/1.jpg", metadata: { has_text_overlay: true } }),
      mkAsset({ id: "b", hosted_url: "https://example.com/2.jpg", metadata: { has_text_overlay: false } }),
      mkAsset({ id: "c", hosted_url: "https://example.com/3.jpg", metadata: {} }), // unknown
    ];

    const filters = {
      ...DEFAULT_ADVANCED_FILTERS,
      text: ["text"],
    };

    const result = applyAdvancedFiltersToSeasonAssets(assets, filters);
    expect(result.map((a) => a.id)).toEqual(["a"]);
  });

  it("when SOLO is active, excludes unknown people_count and keeps <= 1", () => {
    const assets: SeasonAsset[] = [
      mkAsset({ id: "solo", hosted_url: "https://example.com/solo.jpg", metadata: { people_count: 1 } }),
      mkAsset({ id: "group", hosted_url: "https://example.com/group.jpg", metadata: { people_count: 2 } }),
      mkAsset({ id: "unknown", hosted_url: "https://example.com/unknown.jpg", metadata: {} }),
    ];

    const filters = {
      ...DEFAULT_ADVANCED_FILTERS,
      people: ["solo"],
    };

    const result = applyAdvancedFiltersToSeasonAssets(assets, filters);
    expect(result.map((a) => a.id)).toEqual(["solo"]);
  });

  it("applies OR within sources, AND across categories", () => {
    const assets: SeasonAsset[] = [
      mkAsset({ id: "tmdb_text", source: "tmdb", metadata: { has_text_overlay: true } }),
      mkAsset({ id: "tmdb_no_text", source: "tmdb", metadata: { has_text_overlay: false } }),
      mkAsset({ id: "imdb_no_text", source: "imdb", metadata: { has_text_overlay: false } }),
    ];

    const filters = {
      ...DEFAULT_ADVANCED_FILTERS,
      sources: ["tmdb", "imdb"],
      text: ["no_text"],
    };

    const result = applyAdvancedFiltersToSeasonAssets(assets, filters);
    expect(result.map((a) => a.id).sort()).toEqual(["imdb_no_text", "tmdb_no_text"]);
  });

  it("filters by content type using fandom_section_tag normalization (PROMO)", () => {
    const assets: SeasonAsset[] = [
      mkAsset({
        id: "promo",
        source: "fandom",
        metadata: { fandom_section_tag: "Promo Portraits" },
      }),
      mkAsset({
        id: "reunion",
        source: "fandom",
        metadata: { fandom_section_tag: "Reunion" },
      }),
    ];

    const filters = {
      ...DEFAULT_ADVANCED_FILTERS,
      contentTypes: ["promo"],
    };

    const result = applyAdvancedFiltersToSeasonAssets(assets, filters);
    expect(result.map((a) => a.id)).toEqual(["promo"]);
  });

  it("filters by content type using fandom_section_label even when stored fandom_section_tag is OTHER (INTRO)", () => {
    const assets: SeasonAsset[] = [
      mkAsset({
        id: "theme_song",
        source: "fandom",
        metadata: { fandom_section_label: "Theme Song Snaps", fandom_section_tag: "OTHER" },
      }),
      mkAsset({
        id: "promo",
        source: "fandom",
        metadata: { fandom_section_label: "Promotional Portraits", fandom_section_tag: "PROMO" },
      }),
    ];

    const filters = {
      ...DEFAULT_ADVANCED_FILTERS,
      contentTypes: ["intro"],
    };

    const result = applyAdvancedFiltersToSeasonAssets(assets, filters);
    expect(result.map((a) => a.id)).toEqual(["theme_song"]);
  });
});
