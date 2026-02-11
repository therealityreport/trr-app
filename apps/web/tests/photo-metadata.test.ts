import { describe, it, expect } from "vitest";
import {
  mapPhotoToMetadata,
  mapSeasonAssetToMetadata,
  resolveMetadataDimensions,
  type PhotoMetadata,
} from "@/lib/photo-metadata";

describe("mapPhotoToMetadata", () => {
  it("maps source to badge color", () => {
    const result = mapPhotoToMetadata({
      id: "1",
      person_id: "p1",
      source: "imdb",
      url: null,
      hosted_url: "https://example.com/img.jpg",
      caption: "Test caption",
      width: 800,
      height: 600,
      context_type: "headshot",
      season: 2,
      people_names: ["John Doe", "Jane Doe"],
      title_names: ["Show A"],
      metadata: null,
      fetched_at: "2024-01-15T00:00:00Z",
    });

    expect(result.source).toBe("imdb");
    expect(result.sourceBadgeColor).toBe("#f5c518");
    expect(result.dimensions).toEqual({ width: 800, height: 600 });
    expect(result.people).toEqual(["John Doe", "Jane Doe"]);
  });

  it("deduplicates people and titles", () => {
    const result = mapPhotoToMetadata({
      id: "1",
      person_id: "p1",
      source: "tmdb",
      url: null,
      hosted_url: null,
      caption: null,
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: ["John", "John", "Jane"],
      title_names: ["Show", "Show"],
      metadata: null,
      fetched_at: null,
    });

    expect(result.people).toEqual(["John", "Jane"]);
    expect(result.titles).toEqual(["Show"]);
    expect(result.sourceBadgeColor).toBe("#01d277");
  });

  it("handles null dimensions", () => {
    const result = mapPhotoToMetadata({
      id: "1",
      person_id: "p1",
      source: "unknown",
      url: null,
      hosted_url: null,
      caption: null,
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: null,
      fetched_at: null,
    });

    expect(result.dimensions).toBeNull();
    expect(result.people).toEqual([]);
    expect(result.sourceBadgeColor).toBe("#6b7280");
  });

  it("normalizes source case for badge colors", () => {
    // Test different casings all map to the same color
    const imdbVariants = ["imdb", "IMDB", "ImDb", "IMDb"];
    const tmdbVariants = ["tmdb", "TMDB", "TmDb", "TMDb"];

    for (const source of imdbVariants) {
      const result = mapPhotoToMetadata({
        id: "1",
        person_id: "p1",
        source,
        url: null,
        hosted_url: null,
        caption: null,
        width: null,
        height: null,
        context_type: null,
        season: null,
        people_names: null,
        title_names: null,
        metadata: null,
        fetched_at: null,
      });
      expect(result.sourceBadgeColor).toBe("#f5c518"); // IMDb gold
      expect(result.source).toBe(source); // Original source preserved
    }

    for (const source of tmdbVariants) {
      const result = mapPhotoToMetadata({
        id: "1",
        person_id: "p1",
        source,
        url: null,
        hosted_url: null,
        caption: null,
        width: null,
        height: null,
        context_type: null,
        season: null,
        people_names: null,
        title_names: null,
        metadata: null,
        fetched_at: null,
      });
      expect(result.sourceBadgeColor).toBe("#01d277"); // TMDb teal
    }
  });

  it("handles all nullable fields without throwing", () => {
    // Minimal photo object - all optional fields null
    const minimalPhoto = {
      id: "1",
      person_id: "p1",
      source: "other",
      url: null,
      hosted_url: null,
      caption: null,
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: null,
      fetched_at: null,
    };

    // Should not throw
    const result = mapPhotoToMetadata(minimalPhoto);

    // All nullable outputs should be clean (null or empty array)
    expect(result.caption).toBeNull();
    expect(result.dimensions).toBeNull();
    expect(result.season).toBeNull();
    expect(result.contextType).toBeNull();
    expect(result.fetchedAt).toBeNull();
    expect(result.people).toEqual([]);
    expect(result.titles).toEqual([]);

    // Required outputs should still work
    expect(result.source).toBe("other");
    expect(result.sourceBadgeColor).toBe("#6b7280"); // Gray fallback
  });

  it("handles partial dimensions (only width or height)", () => {
    // Only width provided
    const widthOnly = mapPhotoToMetadata({
      id: "1",
      person_id: "p1",
      source: "imdb",
      url: null,
      hosted_url: null,
      caption: null,
      width: 800,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: null,
      fetched_at: null,
    });
    expect(widthOnly.dimensions).toBeNull();

    // Only height provided
    const heightOnly = mapPhotoToMetadata({
      id: "1",
      person_id: "p1",
      source: "imdb",
      url: null,
      hosted_url: null,
      caption: null,
      width: null,
      height: 600,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: null,
      fetched_at: null,
    });
    expect(heightOnly.dimensions).toBeNull();
  });

  it("infers fandom content type from section label even when stored tag is OTHER", () => {
    const cases = [
      { sectionLabel: "Theme Song Snaps", rawTag: "OTHER", expected: "INTRO" },
      { sectionLabel: "Chapter Cards", rawTag: "OTHER", expected: "INTRO" },
      { sectionLabel: "Confessional Interview Looks", rawTag: "OTHER", expected: "CONFESSIONAL" },
      { sectionLabel: "Promotional Portraits", rawTag: "OTHER", expected: "PROMO" },
      { sectionLabel: "Reunion Dresses", rawTag: "OTHER", expected: "REUNION" },
    ] as const;

    for (const c of cases) {
      const result = mapPhotoToMetadata({
        id: "1",
        person_id: "p1",
        source: "fandom",
        url: null,
        hosted_url: null,
        caption: null,
        width: null,
        height: null,
        context_type: null,
        season: null,
        people_names: null,
        title_names: null,
        metadata: {
          fandom_section_label: c.sectionLabel,
          fandom_section_tag: c.rawTag,
        },
        fetched_at: null,
      });

      expect(result.sectionLabel).toBe(c.sectionLabel);
      expect(result.sectionTag).toBe(c.expected);
    }
  });

  it("infers IMDb episode still from caption when type fields are missing", () => {
    const result = mapPhotoToMetadata({
      id: "imdb-episode",
      person_id: "p1",
      source: "imdb",
      url: null,
      hosted_url: "https://example.com/imdb.jpg",
      caption:
        "Lisa Barlow , Mary Cosby , Heather Gay in Opas and Outbursts (2025)",
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: { fandom_section_tag: "OTHER" },
      fetched_at: null,
    });

    expect(result.sectionTag).toBe("EPISODE STILL");
  });

  it("infers non-fandom content type from context and caption", () => {
    const result = mapPhotoToMetadata({
      id: "confessional-1",
      person_id: "p1",
      source: "tmdb",
      url: null,
      hosted_url: "https://example.com/confessional.jpg",
      caption: "Confessional interview look",
      width: null,
      height: null,
      context_type: "confessional interview",
      season: null,
      people_names: null,
      title_names: null,
      metadata: null,
      fetched_at: null,
    });

    expect(result.sectionTag).toBe("CONFESSIONAL");
  });

  it("uses fallback people list when tags are missing", () => {
    const result = mapPhotoToMetadata(
      {
        id: "fallback-person",
        person_id: "p1",
        source: "imdb",
        url: null,
        hosted_url: "https://example.com/imdb.jpg",
        caption: null,
        width: null,
        height: null,
        context_type: null,
        season: null,
        people_names: null,
        title_names: null,
        metadata: null,
        fetched_at: null,
      },
      { fallbackPeople: ["Meredith Marks"] }
    );

    expect(result.people).toEqual(["Meredith Marks"]);
  });
});

describe("resolveMetadataDimensions", () => {
  it("parses nested dimensions objects and strings", () => {
    const fromObject = resolveMetadataDimensions({
      dimensions: { width: 1200, height: 1500 },
    });
    expect(fromObject).toEqual({ width: 1200, height: 1500 });

    const fromShortObject = resolveMetadataDimensions({
      dimensions: { w: 1080, h: 1350 },
    });
    expect(fromShortObject).toEqual({ width: 1080, height: 1350 });

    const fromString = resolveMetadataDimensions({
      dimensions: "1080x1350",
    });
    expect(fromString).toEqual({ width: 1080, height: 1350 });
  });
});

describe("mapSeasonAssetToMetadata", () => {
  it("prefers metadata.people_names when asset.person_name is missing", () => {
    const meta = mapSeasonAssetToMetadata(
      {
        id: "a1",
        type: "season",
        source: "web_scrape:eonline.com",
        kind: "cast",
        hosted_url: "https://example.com/img.jpg",
        width: null,
        height: null,
        caption: null,
        season_number: 3,
        person_name: null,
        metadata: { people_names: ["Jen Shah", "Jen Shah"] },
        fetched_at: null,
        created_at: null,
        ingest_status: null,
        hosted_content_type: "image/jpeg",
      } as unknown as Parameters<typeof mapSeasonAssetToMetadata>[0],
      3,
      "RHOSLC",
    );

    expect(meta.people).toEqual(["Jen Shah"]);
  });

  it("labels web-scrape kind=other as Other (not Season Poster)", () => {
    const meta = mapSeasonAssetToMetadata(
      {
        id: "a2",
        type: "season",
        source: "web_scrape:eonline.com",
        kind: "other",
        hosted_url: "https://example.com/img.jpg",
        width: null,
        height: null,
        caption: null,
        season_number: 3,
        person_name: null,
        metadata: null,
        fetched_at: null,
        created_at: null,
        ingest_status: null,
        hosted_content_type: "image/jpeg",
      } as unknown as Parameters<typeof mapSeasonAssetToMetadata>[0],
      3,
      "RHOSLC",
    );

    expect(meta.contextType).toBe("Other");
  });
});
