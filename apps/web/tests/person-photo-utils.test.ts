import { describe, expect, it } from "vitest";

import {
  dedupePhotosByCanonicalKeysPreferMediaLinks,
  dedupePhotosByHostedUrlPreferMediaLinks,
} from "@/lib/server/trr-api/person-photo-utils";

describe("dedupePhotosByHostedUrlPreferMediaLinks", () => {
  it("keeps media_links row when cast and media share hosted_url", () => {
    const photos = [
      {
        id: "cast-1",
        hosted_url: "https://cdn.example.com/same.jpg",
        origin: "cast_photos" as const,
        facebank_seed: false,
      },
      {
        id: "cast-2",
        hosted_url: "https://cdn.example.com/only-cast.jpg",
        origin: "cast_photos" as const,
        facebank_seed: false,
      },
      {
        id: "link-1",
        link_id: "link-1",
        hosted_url: "https://cdn.example.com/same.jpg",
        origin: "media_links" as const,
        facebank_seed: true,
      },
    ];

    const deduped = dedupePhotosByHostedUrlPreferMediaLinks(photos);

    expect(deduped).toHaveLength(2);
    expect(deduped[0].id).toBe("link-1");
    expect(deduped[0].origin).toBe("media_links");
    expect(deduped[0].facebank_seed).toBe(true);
    expect(deduped[1].id).toBe("cast-2");
  });
});

describe("dedupePhotosByCanonicalKeysPreferMediaLinks", () => {
  it("dedupes cast_photos rows by source+source_image_id even when hosted_url differs", () => {
    const photos = [
      {
        id: "cast-a",
        hosted_url: "https://cdn.example.com/images/people/a/photo.jpg",
        origin: "cast_photos" as const,
        source: "imdb",
        source_image_id: "rm123",
        facebank_seed: false,
      },
      {
        id: "cast-b",
        hosted_url: "https://cdn.example.com/images/people/b/photo.jpg",
        origin: "cast_photos" as const,
        source: "imdb",
        source_image_id: "rm123",
        facebank_seed: false,
      },
    ];

    const deduped = dedupePhotosByCanonicalKeysPreferMediaLinks(photos);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe("cast-a");
  });

  it("prefers media_links when a collision occurs by hosted_url", () => {
    const photos = [
      {
        id: "cast-1",
        hosted_url: "https://cdn.example.com/same.jpg",
        origin: "cast_photos" as const,
        source: "imdb",
        source_image_id: "rm1",
        facebank_seed: false,
      },
      {
        id: "link-1",
        link_id: "link-1",
        media_asset_id: "asset-1",
        hosted_url: "https://cdn.example.com/same.jpg",
        origin: "media_links" as const,
        source: "web_scrape",
        source_asset_id: "x",
        facebank_seed: true,
      },
    ];

    const deduped = dedupePhotosByCanonicalKeysPreferMediaLinks(photos);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].origin).toBe("media_links");
    expect(deduped[0].id).toBe("link-1");
  });

  it("prefers media_links when a collision occurs by hosted_sha256", () => {
    const photos = [
      {
        id: "cast-1",
        hosted_url: "https://cdn.example.com/a.jpg",
        hosted_sha256: "abc",
        origin: "cast_photos" as const,
        source: "imdb",
        source_image_id: "rm1",
        facebank_seed: false,
      },
      {
        id: "link-1",
        media_asset_id: "asset-1",
        hosted_url: "https://cdn.example.com/b.jpg",
        hosted_sha256: "abc",
        origin: "media_links" as const,
        source: "web_scrape",
        source_asset_id: "x",
        facebank_seed: true,
      },
    ];

    const deduped = dedupePhotosByCanonicalKeysPreferMediaLinks(photos);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].origin).toBe("media_links");
    expect(deduped[0].id).toBe("link-1");
  });
});
