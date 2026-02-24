import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  buildDetailImageUrlCandidates,
  getPersonPhotoDetailUrlCandidates,
} from "@/lib/admin/image-url-candidates";

describe("person gallery detail priority", () => {
  it("prefers hosted/original/source before generated detail/crop detail", () => {
    const candidates = getPersonPhotoDetailUrlCandidates({
      detail_url: "https://cdn.example.com/detail.webp",
      hosted_url: "https://cdn.example.com/hosted.jpg",
      original_url: "https://origin.example.com/original.jpg",
      url: "https://origin.example.com/source.jpg",
      crop_detail_url: "https://cdn.example.com/crop-detail.webp",
    });

    expect(candidates).toEqual([
      "https://cdn.example.com/hosted.jpg",
      "https://origin.example.com/original.jpg",
      "https://origin.example.com/source.jpg",
      "https://cdn.example.com/detail.webp",
      "https://cdn.example.com/crop-detail.webp",
    ]);
  });

  it("still falls back to crop detail when no uncropped URLs are available", () => {
    const candidates = buildDetailImageUrlCandidates({
      cropDetailUrl: "https://cdn.example.com/crop-detail.webp",
      detailUrl: null,
      hostedUrl: null,
      originalUrl: null,
      sourceUrl: null,
    });

    expect(candidates).toEqual(["https://cdn.example.com/crop-detail.webp"]);
  });

  it("person lightbox continues passing detail candidate arrays", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/people/[personId]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/src=\{getPersonPhotoDetailUrl\(lightboxPhoto\.photo\) \|\| ""\}/);
    expect(contents).toMatch(/fallbackSrcs=\{getPersonPhotoDetailUrlCandidates\(lightboxPhoto\.photo\)\}/);
  });
});
