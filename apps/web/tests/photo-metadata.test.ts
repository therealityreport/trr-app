import { describe, it, expect } from "vitest";
import { mapPhotoToMetadata, type PhotoMetadata } from "@/lib/photo-metadata";

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
});
