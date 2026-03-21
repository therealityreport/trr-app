import { describe, it, expect } from "vitest";
import {
  formatPhotoSourceLabel,
  mapPhotoToMetadata,
  mapSeasonAssetToMetadata,
  resolveMetadataDimensions,
} from "@/lib/photo-metadata";

describe("mapPhotoToMetadata", () => {
  it("exposes mirror hosted url when hosted asset is present", () => {
    const result = mapPhotoToMetadata({
      id: "mirror-1",
      person_id: "p1",
      source: "imdb",
      url: "https://m.media-amazon.com/images/source.jpg",
      hosted_url: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/media/example.jpg",
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

    expect(result.hostedMediaUrl).toBe("https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/media/example.jpg");
  });

  it("canonicalizes legacy CloudFront hosted urls onto the R2 public host", () => {
    const result = mapPhotoToMetadata({
      id: "mirror-legacy-cloudfront",
      person_id: "p1",
      source: "imdb",
      url: "https://m.media-amazon.com/images/source.jpg",
      hosted_url: "https://d111111abcdef8.cloudfront.net/media/example.jpg",
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

    expect(result.hostedMediaUrl).toBe("https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/media/example.jpg");
    expect(result.isHostedMedia).toBe(true);
  });

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

  it("normalizes source labels for NBCUMV and Getty", () => {
    expect(formatPhotoSourceLabel("nbcumv")).toBe("NBCUMV");
    expect(formatPhotoSourceLabel("getty")).toBe("Getty");
  });

  it("decodes IMDb episode entities and parses numeric-string season metadata", () => {
    const result = mapPhotoToMetadata({
      id: "imdb-entities-1",
      person_id: "p1",
      source: "imdb",
      url: "https://m.media-amazon.com/images/sample.jpg",
      hosted_url: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/media/sample.jpg",
      caption: "Alan Cumming and Milo Ventimiglia in Milo Ventimiglia &amp; Alan Cumming (2023)",
      width: 1920,
      height: 1080,
      context_type: "episode_still",
      season: null,
      people_names: ["Alan Cumming", "Milo Ventimiglia"],
      title_names: ["Milo Ventimiglia &amp; Alan Cumming"],
      metadata: {
        show_name: "Watch What Happens Live with Andy Cohen",
        episode_title: "Milo Ventimiglia &amp; Alan Cumming",
        episode_number: "37",
        season_number: "20",
        face_detection_diagnostics: {
          raw: 4,
          filtered: 2,
          thresholds: {
            min_side_px: 64,
            min_area_ratio: 0.02,
          },
        },
      },
      fetched_at: null,
    });

    expect(result.season).toBe(20);
    expect(result.episodeNumber).toBe(37);
    expect(result.episodeTitle).toBe("Milo Ventimiglia & Alan Cumming");
    expect(result.episodeLabel).toBe("Episode 37 - Milo Ventimiglia & Alan Cumming");
    expect(result.titles).toContain("Milo Ventimiglia & Alan Cumming");
    expect(result.caption).toContain("Milo Ventimiglia & Alan Cumming (2023)");
    expect(result.faceCountRaw).toBe(4);
    expect(result.faceCountFiltered).toBe(2);
    expect(result.faceFilterThresholds).toEqual({ min_side_px: 64, min_area_ratio: 0.02 });
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

  it("uses nested Getty and NBCUMV metadata blocks for provenance", () => {
    const result = mapPhotoToMetadata({
      id: "nbcumv-1",
      person_id: "p1",
      source: "nbcumv",
      url: "https://lightbox-thumbnails.s3.us-west-2.amazonaws.com/NUP_209993/thumb.jpg",
      hosted_url: "https://cdn.example.com/media/nbcumv-1.jpg",
      caption: "WATCH WHAT HAPPENS LIVE WITH ANDY COHEN -- Pictured: Lisa Barlow",
      width: 2000,
      height: 3000,
      context_type: null,
      season: null,
      people_names: ["Lisa Barlow"],
      title_names: ["Watch What Happens Live with Andy Cohen"],
      metadata: {
        nbcumv: {
          lbx_headline: "Watch What Happens Live With Andy Cohen - Season 23",
          location: "https://lightbox-thumbnails.s3.us-west-2.amazonaws.com/NUP_209993/thumb.jpg",
        },
        getty: {
          detail_url: "https://www.gettyimages.com/detail/news-photo/example/2264300032",
          title: "Mac Forehand",
        },
      },
      fetched_at: null,
    });

    expect(result.sourceBadgeColor).toBe("#0ea5e9");
    expect(result.originalSourcePageUrl).toBe(
      "https://www.gettyimages.com/detail/news-photo/example/2264300032",
    );
    expect(result.originalSourceLabel).toBe("GETTY");
    expect(result.sourcePageTitle).toBe("Mac Forehand");
  });

  it("maps grouped Getty event metadata and detail fields", () => {
    const result = mapPhotoToMetadata({
      id: "getty-event-1",
      person_id: "p1",
      source: "getty",
      url: "https://media.gettyimages.com/preview.jpg",
      hosted_url: "https://media.gettyimages.com/preview.jpg",
      caption: "Lisa Barlow attends Bravo Fan Fest.",
      width: 2000,
      height: 3000,
      context_type: null,
      season: null,
      people_names: ["Lisa Barlow", "Meredith Marks"],
      title_names: ["Bravo Fan Fest"],
      metadata: {
        bucket_type: "event",
        bucket_key: "bravo-fan-fest",
        bucket_label: "Bravo Fan Fest",
        grouped_image_count: 35,
        source_resolution: "getty_watermark_fallback",
        google_reverse_image_search_url:
          "https://www.google.com/searchbyimage?image_url=https%3A%2F%2Fmedia.gettyimages.com%2Fpreview.jpg",
        getty_event_url: "https://www.gettyimages.com/editorial-images/event/bravo-fan-fest",
        getty_event_id: "event-35",
        getty_event_slug: "bravo-fan-fest",
        getty_event_date: "November 16, 2025",
        getty_details: {
          restrictions: "Editorial use only.",
          credit: "Bravo / Contributor",
          editorial_number: "2246511440",
          object_name: "NUP_209171_01723.JPG",
          max_file_size: "3000 x 2000 px (10.00 x 6.67 in) - 300 dpi - 2 MB",
        },
        getty_tags: ["BravoCon", "Meredith Marks", "Two People"],
        people_count: 2,
      },
      fetched_at: null,
    });

    expect(result.eventName).toBe("Bravo Fan Fest");
    expect(result.groupedEventCount).toBe(35);
    expect(result.sourceResolution).toBe("getty_watermark_fallback");
    expect(result.gettyEventUrl).toBe(
      "https://www.gettyimages.com/editorial-images/event/bravo-fan-fest",
    );
    expect(result.gettyEventId).toBe("event-35");
    expect(result.gettyEventSlug).toBe("bravo-fan-fest");
    expect(result.gettyEventDate).toBe("November 16, 2025");
    expect(result.gettyDetails).toEqual({
      restrictions: "Editorial use only.",
      credit: "Bravo / Contributor",
      editorial_number: "2246511440",
      object_name: "NUP_209171_01723.JPG",
      max_file_size: "3000 x 2000 px (10.00 x 6.67 in) - 300 dpi - 2 MB",
    });
    expect(result.gettyTags).toEqual(["BravoCon", "Meredith Marks", "Two People"]);
    expect(result.peopleCount).toBe(2);
    expect(result.googleReverseImageSearchUrl).toBe(
      "https://www.google.com/searchbyimage?image_url=https%3A%2F%2Fmedia.gettyimages.com%2Fpreview.jpg",
    );
    expect(result.originalSourcePageUrl).toBe(
      "https://www.gettyimages.com/editorial-images/event/bravo-fan-fest",
    );
  });

  it("parses face crops from photo payload", () => {
    const result = mapPhotoToMetadata({
      id: "face-crops-1",
      person_id: "p1",
      source: "imdb",
      url: null,
      hosted_url: "https://example.com/image.jpg",
      caption: null,
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: null,
      fetched_at: null,
      face_crops: [
        {
          index: 1,
          x: 0.1,
          y: 0.2,
          width: 0.3,
          height: 0.3,
          variant_key: "face-crops/imdb/1.jpg",
          variant_url: "https://cdn.example.com/face-crops/imdb/1.jpg",
          size: 256,
        },
      ],
    });

    expect(result.faceCrops).toBeDefined();
    expect(result.faceCrops?.length).toBe(1);
    expect(result.faceCrops?.[0].variantUrl).toBe("https://cdn.example.com/face-crops/imdb/1.jpg");
    expect(result.faceCrops?.[0].size).toBe(256);
  });

  it("parses face-box match diagnostics metadata", () => {
    const result = mapPhotoToMetadata({
      id: "face-boxes-1",
      person_id: "p1",
      source: "imdb",
      url: null,
      hosted_url: "https://example.com/image.jpg",
      caption: null,
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: null,
      fetched_at: null,
      face_boxes: [
        {
          index: 1,
          kind: "face",
          x: 0.1,
          y: 0.2,
          width: 0.3,
          height: 0.3,
          confidence: 0.9,
          person_name: "Alan Cumming",
          match_status: "below_threshold",
          match_similarity: 0.811,
          match_reason: "candidate_filter_empty",
          label_source: "reference_pool",
          match_candidates: [
            {
              person_name: "Susan Lucci",
              similarity: 0.811,
            },
            {
              person_id: "person-2",
              similarity: 0.643,
            },
          ],
        },
      ],
    });

    expect(result.faceBoxes).toBeDefined();
    expect(result.faceBoxes?.length).toBe(1);
    expect(result.faceBoxes?.[0].match_status).toBe("below_threshold");
    expect(result.faceBoxes?.[0].match_reason).toBe("candidate_filter_empty");
    expect(result.faceBoxes?.[0].match_candidates).toEqual([
      { person_name: "Susan Lucci", similarity: 0.811 },
      { person_id: "person-2", similarity: 0.643 },
    ]);
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

  it("uses IMDb tag payload for people and titles when flattened fields are missing", () => {
    const result = mapPhotoToMetadata({
      id: "imdb-tags-photo",
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
      metadata: {
        tags: {
          people: [
            { imdb_id: "nm1", name: "Andy Cohen" },
            { imdb_id: "nm2", name: "Wes O'Dell" },
          ],
          titles: [{ imdb_id: "tt1", title: "Watch What Happens Live" }],
        },
      },
      fetched_at: null,
    });

    expect(result.people).toEqual(["Andy Cohen", "Wes O'Dell"]);
    expect(result.titles).toEqual(["Watch What Happens Live"]);
    expect(result.peopleCount).toBe(2);
  });

  it("derives IMDb people and title from caption when tag payload is missing", () => {
    const result = mapPhotoToMetadata({
      id: "imdb-caption-photo",
      person_id: "p1",
      source: "imdb",
      url: null,
      hosted_url: "https://example.com/imdb2.jpg",
      caption: "Andy Cohen , Wes O'Dell , and Fraser Olender in Fraser Olender & Wes O'Dell (2022)",
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: null,
      fetched_at: null,
    });

    expect(result.people).toEqual(["Andy Cohen", "Wes O'Dell", "Fraser Olender"]);
    expect(result.titles).toEqual(["Fraser Olender & Wes O'Dell"]);
  });

  it("uses row source_page_url plus IMDb defaults for sparse legacy rows", () => {
    const result = mapPhotoToMetadata({
      id: "imdb-source-page-fallback",
      person_id: "p1",
      source: "imdb",
      url: "https://m.media-amazon.com/images/M/MV5BTEST._V1_.jpg",
      hosted_url: "https://cdn.example.com/imdb-fallback.jpg",
      source_page_url: "https://www.imdb.com/name/nm0000001/mediaviewer/rm123456789/",
      caption: "Andy Cohen in Watch What Happens Live (2022)",
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: {
        imdb_person_id: "nm0000001",
        imdb_viewer_id: "rm123456789",
      },
      fetched_at: null,
    });

    expect(result.originalSourcePageUrl).toBe(
      "https://www.imdb.com/name/nm0000001/mediaviewer/rm123456789/"
    );
    expect(result.originalSourceFileUrl).toBe("https://m.media-amazon.com/images/M/MV5BTEST._V1_.jpg");
    expect(result.sourceVariant).toBe("imdb_person_gallery");
    expect(result.sourceLogo).toBe("IMDb");
    expect(result.sourcePageTitle).toBe("Watch What Happens Live");
    expect(result.assetName).toBe("Watch What Happens Live");
  });

  it("derives IMDb source page URL from metadata IDs and source file URL from tag payload", () => {
    const result = mapPhotoToMetadata({
      id: "imdb-derived-source-url",
      person_id: "p1",
      source: "imdb",
      url: null,
      hosted_url: "https://cdn.example.com/imdb-derived.jpg",
      caption: null,
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: {
        imdb_person_id: "nm0000001",
        imdb_viewer_id: "rm555000111",
        tags: {
          image_url: "https://m.media-amazon.com/images/M/MV5BDERIVED._V1_.jpg",
        },
      },
      fetched_at: null,
    });

    expect(result.originalSourcePageUrl).toBe(
      "https://www.imdb.com/name/nm0000001/mediaviewer/rm555000111/"
    );
    expect(result.originalSourceFileUrl).toBe(
      "https://m.media-amazon.com/images/M/MV5BDERIVED._V1_.jpg"
    );
  });

  it("derives IMDb source page URL from mediaviewer path metadata when full URL is missing", () => {
    const result = mapPhotoToMetadata({
      id: "imdb-mv-path-fallback",
      person_id: "p1",
      source: "imdb",
      url: "https://m.media-amazon.com/images/M/MV5BPATH._V1_.jpg",
      hosted_url: "https://cdn.example.com/imdb-path.jpg",
      caption: null,
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: {
        mediaviewer_url_path: "/name/nm0169212/mediaviewer/rm1344200961/?ref_=nmmi_mi_23_2",
      },
      fetched_at: null,
    });

    expect(result.originalSourcePageUrl).toBe(
      "https://www.imdb.com/name/nm0169212/mediaviewer/rm1344200961/"
    );
    expect(result.originalSourceFileUrl).toBe("https://m.media-amazon.com/images/M/MV5BPATH._V1_.jpg");
  });

  it("maps show metadata fields including IMDb fallback show name", () => {
    const inferredResult = mapPhotoToMetadata({
      id: "imdb-show-inferred",
      person_id: "p1",
      source: "imdb",
      url: "https://m.media-amazon.com/images/M/MV5BSHOW._V1_.jpg",
      hosted_url: "https://cdn.example.com/imdb-show.jpg",
      caption: "Alan Cumming in The Power of the Seer (2025)",
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: ["The Power of the Seer"],
      metadata: {
        show_id: "show-traitors",
        show_name: "The Traitors",
        show_context_source: "request_context_inferred",
      },
      fetched_at: null,
    });

    expect(inferredResult.showId).toBe("show-traitors");
    expect(inferredResult.showName).toBe("The Traitors");
    expect(inferredResult.showContextSource).toBe("request_context_inferred");

    const unresolvedResult = mapPhotoToMetadata({
      id: "imdb-show-fallback",
      person_id: "p1",
      source: "imdb",
      url: "https://m.media-amazon.com/images/M/MV5BSHOW2._V1_.jpg",
      hosted_url: "https://cdn.example.com/imdb-show2.jpg",
      caption: null,
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: ["The Power of the Seer"],
      metadata: {
        imdb_fallback_show_name: "The Traitors",
      },
      fetched_at: null,
    });

    expect(unresolvedResult.showId).toBeNull();
    expect(unresolvedResult.showName).toBe("The Traitors");
    expect(unresolvedResult.showContextSource).toBeNull();
  });

  it("maps canonical IMDb title fields and credit media type", () => {
    const result = mapPhotoToMetadata({
      id: "imdb-title-canonical",
      person_id: "p1",
      source: "imdb",
      url: "https://m.media-amazon.com/images/M/MV5BTITLE._V1_.jpg",
      hosted_url: "https://cdn.example.com/imdb-title.jpg",
      caption: "Alan Cumming in Episode Name (2025)",
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: ["Episode Name"],
      metadata: {
        imdb_title_id: "tt26755932",
        imdb_title_type: "TVEpisode",
        imdb_credit_media_type: "TV Episode",
      },
      fetched_at: null,
    });

    expect(result.imdbTitleId).toBe("tt26755932");
    expect(result.imdbTitleUrl).toBe("https://www.imdb.com/title/tt26755932/");
    expect(result.imdbCreditMediaType).toBe("TV Episode");
    expect(result.imdbCreditType).toBe("TV Episode");
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

    expect(result.hostedMediaFileName).toBe("1234567890.webp");
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

    expect(result.hostedMediaFileName).toBe("cast-portrait.jpg");
  });

  it("does not infer s3 mirror filename from source URL when hosted mirror is missing", () => {
    const result = mapPhotoToMetadata({
      id: "non-mirrored-source",
      person_id: "p1",
      source: "web_scrape:fandom.com",
      url: "https://static.wikia.nocookie.net/rhoslc/images/1/1b/lisa.jpg",
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

    expect(result.isHostedMedia).toBe(false);
    expect(result.hostedMediaFileName).toBeNull();
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
    expect(result.originalSourceLabel).toBe("FANDOM");
    expect(result.isHostedMedia).toBe(true);
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

  it("does not treat original_url as hosted when resolving original source file URL", () => {
    const result = mapPhotoToMetadata({
      id: "original-url-not-hosted",
      person_id: "p1",
      source: "imdb",
      url: "https://m.media-amazon.com/images/M/MV5BTRUE._V1_.jpg",
      hosted_url: "https://d111111abcdef8.cloudfront.net/media/aa/bb.webp",
      caption: null,
      width: null,
      height: null,
      context_type: null,
      season: null,
      people_names: null,
      title_names: null,
      metadata: null,
      original_url: "https://m.media-amazon.com/images/M/MV5BTRUE._V1_.jpg",
      fetched_at: null,
    });

    expect(result.originalSourceFileUrl).toBe(
      "https://m.media-amazon.com/images/M/MV5BTRUE._V1_.jpg"
    );
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

    expect(meta.hostedMediaFileName).toBe("poster-main.png");
  });

  it("does not infer season asset s3 mirror filename from non-hosted source fields", () => {
    const meta = mapSeasonAssetToMetadata(
      {
        id: "a3-source-only",
        type: "season",
        source: "web_scrape:fandom.com",
        kind: "other",
        hosted_url: null,
        source_url: "https://static.wikia.nocookie.net/rhoslc/images/2/2c/meredith.jpg",
        original_url: "https://fandom.com/wiki/lisa",
        width: null,
        height: null,
        caption: null,
        season_number: 4,
        person_name: null,
        metadata: null,
        fetched_at: null,
        created_at: null,
        ingest_status: null,
        hosted_content_type: null,
      } as unknown as Parameters<typeof mapSeasonAssetToMetadata>[0],
      4,
      "RHOSLC",
    );

    expect(meta.isHostedMedia).toBe(false);
    expect(meta.hostedMediaFileName).toBeNull();
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
    expect(meta.originalSourceLabel).toBe("FANDOM");
    expect(meta.isHostedMedia).toBe(true);
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
