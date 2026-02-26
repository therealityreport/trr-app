import { describe, expect, it } from "vitest";

import {
  buildCardImageUrlCandidates,
  buildDetailImageUrlCandidates,
  getPersonPhotoOriginalUrlCandidates,
  getSeasonAssetCardUrlCandidates,
} from "@/lib/admin/image-url-candidates";

describe("image-url-candidates", () => {
  it("builds ordered card candidates and dedupes", () => {
    const candidates = buildCardImageUrlCandidates({
      cropDisplayUrl: " https://cdn.example.com/crop.webp ",
      thumbUrl: "https://cdn.example.com/thumb.webp",
      displayUrl: "https://cdn.example.com/display.webp",
      hostedUrl: "https://cdn.example.com/display.webp",
      originalUrl: "https://origin.example.com/original.jpg",
      sourceUrl: "https://origin.example.com/original.jpg",
    });

    expect(candidates).toEqual([
      "https://cdn.example.com/crop.webp",
      "https://cdn.example.com/thumb.webp",
      "https://cdn.example.com/display.webp",
      "https://origin.example.com/original.jpg",
    ]);
  });

  it("builds ordered detail candidates", () => {
    const candidates = buildDetailImageUrlCandidates({
      cropDetailUrl: "https://cdn.example.com/crop-detail.webp",
      detailUrl: "https://cdn.example.com/detail.webp",
      hostedUrl: "https://cdn.example.com/hosted.webp",
      originalUrl: "https://origin.example.com/original.jpg",
      sourceUrl: "https://origin.example.com/source.jpg",
    });

    expect(candidates).toEqual([
      "https://cdn.example.com/hosted.webp",
      "https://origin.example.com/original.jpg",
      "https://origin.example.com/source.jpg",
      "https://cdn.example.com/detail.webp",
      "https://cdn.example.com/crop-detail.webp",
    ]);
  });

  it("prioritizes season card crop/thumb/display before hosted/original/source", () => {
    const candidates = getSeasonAssetCardUrlCandidates({
      hosted_url: "https://cdn.example.com/hosted.webp",
      crop_display_url: "https://cdn.example.com/crop.webp",
      thumb_url: "https://cdn.example.com/thumb.webp",
      display_url: "https://cdn.example.com/display.webp",
      original_url: "https://origin.example.com/original.jpg",
      source_url: "https://origin.example.com/source.jpg",
    });

    expect(candidates).toEqual([
      "https://cdn.example.com/crop.webp",
      "https://cdn.example.com/thumb.webp",
      "https://cdn.example.com/display.webp",
      "https://cdn.example.com/hosted.webp",
      "https://origin.example.com/original.jpg",
      "https://origin.example.com/source.jpg",
    ]);
  });

  it("prefers original/source before hosted for person original candidates", () => {
    const candidates = getPersonPhotoOriginalUrlCandidates({
      original_url: "https://origin.example.com/original.jpg",
      url: "https://origin.example.com/source.jpg",
      hosted_url: "https://cdn.example.com/hosted.webp",
    });

    expect(candidates).toEqual([
      "https://origin.example.com/original.jpg",
      "https://origin.example.com/source.jpg",
      "https://cdn.example.com/hosted.webp",
    ]);
  });

  it("prioritizes mirrored hosted candidates before external display variants", () => {
    const candidates = buildCardImageUrlCandidates({
      cropDisplayUrl: "https://origin.example.com/crop.jpg",
      thumbUrl: "https://origin.example.com/thumb.jpg",
      displayUrl: "https://origin.example.com/display.jpg",
      hostedUrl: "https://d1fmdyqfafwim3.cloudfront.net/media/hosted.webp",
      originalUrl: "https://origin.example.com/original.jpg",
      sourceUrl: "https://origin.example.com/source.jpg",
    });

    expect(candidates[0]).toBe("https://d1fmdyqfafwim3.cloudfront.net/media/hosted.webp");
    expect(candidates.slice(1)).toEqual([
      "https://origin.example.com/crop.jpg",
      "https://origin.example.com/thumb.jpg",
      "https://origin.example.com/display.jpg",
      "https://origin.example.com/original.jpg",
      "https://origin.example.com/source.jpg",
    ]);
  });
});
