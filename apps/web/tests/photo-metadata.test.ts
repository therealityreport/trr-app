import { describe, it, expect } from "vitest";
import {
  mapPhotoToMetadata,
  mapSeasonAssetToMetadata,
  resolveMetadataDimensions,
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
    expect(result.contentType).toBe("CONFESSIONAL");
  });

  it("prefers explicit metadata content_type for canonical contentType", () => {
    const result = mapPhotoToMetadata({
      id: "content-type-explicit",
      person_id: "p1",
      source: "tmdb",
      url: null,
      hosted_url: "https://example.com/profile.jpg",
      caption: "Cast portrait",
      width: null,
      height: null,
      context_type: "profile",
      season: null,
      people_names: null,
      title_names: null,
      metadata: {
        content_type: "profile_picture",
      },
      fetched_at: null,
    });

    expect(result.contentType).toBe("PROFILE PICTURE");
    expect(result.sectionTag).toBe("PROFILE PICTURE");
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

  it("derives s3 mirror filename from hosted URL", () => {
    const result = mapPhotoToMetadata({
      id: "mirror-from-url",
      person_id: "p1",
      source: "tmdb",
      url: null,
      hosted_url: "https://cdn.example.com/media/ab/1234567890.webp",
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

    expect(result.s3MirrorFileName).toBe("1234567890.webp");
  });

  it("prefers explicit hosted key metadata for s3 mirror filename", () => {
    const result = mapPhotoToMetadata({
      id: "mirror-from-key",
      person_id: "p1",
      source: "imdb",
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
        hosted_key: "images/people/nm123/photos/imdb/cast-portrait.jpg",
      },
      fetched_at: null,
    });

    expect(result.s3MirrorFileName).toBe("cast-portrait.jpg");
  });

  it("sets originalImageUrl from true source URL instead of hosted mirror URL", () => {
    const result = mapPhotoToMetadata({
      id: "original-url",
      person_id: "p1",
      source: "web_scrape:fandom.com",
      url: "https://static.wikia.nocookie.net/rhoslc/images/1/1b/lisa.jpg",
      hosted_url: "https://d111111abcdef8.cloudfront.net/media/aa/bb.webp",
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

    expect(result.originalImageUrl).toBe("https://static.wikia.nocookie.net/rhoslc/images/1/1b/lisa.jpg");
    expect(result.originalSourceFileUrl).toBe("https://static.wikia.nocookie.net/rhoslc/images/1/1b/lisa.jpg");
    expect(result.originalSourcePageUrl).toBeNull();
    expect(result.originalSourceLabel).toBe("STATIC.WIKIA.NOCOOKIE.NET");
    expect(result.isS3Mirrored).toBe(true);
  });

  it("keeps originalImageUrl null when only hosted/mirror URLs exist", () => {
    const result = mapPhotoToMetadata({
      id: "hosted-only",
      person_id: "p1",
      source: "web_scrape:fandom.com",
      url: "https://d111111abcdef8.cloudfront.net/media/aa/bb.webp",
      hosted_url: "https://d111111abcdef8.cloudfront.net/media/aa/bb.webp",
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

    expect(result.originalImageUrl).toBeNull();
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

  it("extracts s3 mirror filename for season assets", () => {
    const meta = mapSeasonAssetToMetadata(
      {
        id: "a3",
        type: "season",
        source: "tmdb",
        kind: "poster",
        hosted_url: "https://cdn.example.com/images/seasons/rhoslc/season-4/poster-main.png",
        width: null,
        height: null,
        caption: null,
        season_number: 4,
        person_name: null,
        metadata: null,
        fetched_at: null,
        created_at: null,
        ingest_status: null,
        hosted_content_type: "image/png",
      } as unknown as Parameters<typeof mapSeasonAssetToMetadata>[0],
      4,
      "RHOSLC",
    );

    expect(meta.s3MirrorFileName).toBe("poster-main.png");
  });

  it("prefers source_url as originalImageUrl for imported season assets", () => {
    const meta = mapSeasonAssetToMetadata(
      {
        id: "a4",
        type: "season",
        source: "web_scrape:fandom.com",
        source_url: "https://static.wikia.nocookie.net/rhoslc/images/2/2c/meredith.jpg",
        kind: "other",
        hosted_url: "https://d111111abcdef8.cloudfront.net/media/aa/bb.webp",
        width: null,
        height: null,
        caption: null,
        season_number: 4,
        person_name: null,
        metadata: null,
        fetched_at: null,
        created_at: null,
        ingest_status: null,
        hosted_content_type: "image/webp",
      } as unknown as Parameters<typeof mapSeasonAssetToMetadata>[0],
      4,
      "RHOSLC",
    );

    expect(meta.originalImageUrl).toBe("https://static.wikia.nocookie.net/rhoslc/images/2/2c/meredith.jpg");
    expect(meta.originalSourceFileUrl).toBe("https://static.wikia.nocookie.net/rhoslc/images/2/2c/meredith.jpg");
    expect(meta.originalSourcePageUrl).toBeNull();
    expect(meta.originalSourceLabel).toBe("STATIC.WIKIA.NOCOOKIE.NET");
    expect(meta.isS3Mirrored).toBe(true);
  });

  it("uses metadata content_type as canonical contentType for season assets", () => {
    const meta = mapSeasonAssetToMetadata(
      {
        id: "a6",
        type: "season",
        source: "web_scrape:example.com",
        source_url: "https://example.com/person.jpg",
        kind: "other",
        hosted_url: "https://cdn.example.com/person.webp",
        width: null,
        height: null,
        caption: null,
        season_number: 4,
        person_name: null,
        metadata: { content_type: "profile_photo" },
        fetched_at: null,
        created_at: null,
        ingest_status: null,
        hosted_content_type: "image/webp",
      } as unknown as Parameters<typeof mapSeasonAssetToMetadata>[0],
      4,
      "RHOSLC",
    );

    expect(meta.contentType).toBe("PROFILE PICTURE");
    expect(meta.sectionTag).toBe("PROFILE PICTURE");
  });

  it("uses asset-level people_count fallback when metadata count is missing", () => {
    const meta = mapSeasonAssetToMetadata(
      {
        id: "a5",
        type: "season",
        source: "tmdb",
        kind: "poster",
        hosted_url: "https://cdn.example.com/poster.jpg",
        width: null,
        height: null,
        caption: null,
        season_number: 4,
        metadata: {},
        people_count: 2,
        fetched_at: null,
        created_at: null,
        ingest_status: null,
        hosted_content_type: "image/jpeg",
      } as unknown as Parameters<typeof mapSeasonAssetToMetadata>[0],
      4,
      "RHOSLC",
    );

    expect(meta.peopleCount).toBe(2);
  });

  it("uses IMDb tag payload for people and titles when flattened fields are missing", () => {
    const meta = mapSeasonAssetToMetadata(
      {
        id: "imdb-tags-1",
        type: "show",
        source: "imdb",
        kind: "media",
        hosted_url: "https://cdn.example.com/imdb.jpg",
        width: null,
        height: null,
        caption: null,
        metadata: {
          tags: {
            people: [
              { imdb_id: "nm100", name: "Meredith Marks" },
              { imdb_id: "nm200", name: "Lisa Barlow" },
            ],
            titles: [
              { imdb_id: "tt8819906", title: "The Real Housewives of Salt Lake City" },
              { imdb_id: "tt9999999", title: "Reunion Part 1" },
            ],
          },
        },
        fetched_at: null,
        created_at: null,
        ingest_status: null,
        hosted_content_type: "image/jpeg",
      } as unknown as Parameters<typeof mapSeasonAssetToMetadata>[0],
      5,
      "RHOSLC",
    );

    expect(meta.people).toEqual(["Meredith Marks", "Lisa Barlow"]);
    expect(meta.titles).toEqual([
      "The Real Housewives of Salt Lake City",
      "Reunion Part 1",
      "RHOSLC",
    ]);
  });

  it("maps IMDb Still Frame tag type to Episode Still content type", () => {
    const meta = mapSeasonAssetToMetadata(
      {
        id: "imdb-still-frame",
        type: "show",
        source: "imdb",
        kind: "media",
        hosted_url: "https://cdn.example.com/imdb-still.jpg",
        width: null,
        height: null,
        caption: null,
        metadata: {
          tags: {
            image_type: "Still Frame",
          },
        },
        fetched_at: null,
        created_at: null,
        ingest_status: null,
        hosted_content_type: "image/jpeg",
      } as unknown as Parameters<typeof mapSeasonAssetToMetadata>[0],
      5,
      "RHOSLC",
    );

    expect(meta.contentType).toBe("EPISODE STILL");
    expect(meta.sectionTag).toBe("EPISODE STILL");
  });
});
