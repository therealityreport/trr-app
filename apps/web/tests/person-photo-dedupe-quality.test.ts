import { describe, expect, it } from "vitest";

import { dedupePhotosByCanonicalKeysPreferMediaLinks } from "@/lib/server/trr-api/person-photo-utils";

describe("person photo dedupe quality preference", () => {
  it("keeps renderable cast_photos row when matching media_links row has weaker URLs", () => {
    const photos = [
      {
        id: "cast-1",
        origin: "cast_photos" as const,
        source: "imdb",
        source_image_id: "rm100",
        hosted_sha256: "sha-1",
        hosted_url: "https://cdn.example.com/cast.jpg",
        thumb_url: "https://cdn.example.com/cast-thumb.jpg",
        display_url: "https://cdn.example.com/cast-display.jpg",
        detail_url: "https://cdn.example.com/cast-detail.jpg",
      },
      {
        id: "link-1",
        origin: "media_links" as const,
        source: "imdb",
        source_asset_id: "asset-rm100",
        media_asset_id: "asset-1",
        hosted_sha256: "sha-1",
        hosted_url: "https://cdn.example.com/link.jpg",
      },
    ];

    const deduped = dedupePhotosByCanonicalKeysPreferMediaLinks(photos);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe("cast-1");
    expect(deduped[0].origin).toBe("cast_photos");
  });

  it("still prefers media_links row when renderable quality is tied", () => {
    const photos = [
      {
        id: "cast-1",
        origin: "cast_photos" as const,
        source: "imdb",
        source_image_id: "rm200",
        hosted_sha256: "sha-2",
        hosted_url: "https://cdn.example.com/cast.jpg",
      },
      {
        id: "link-1",
        origin: "media_links" as const,
        source: "imdb",
        source_asset_id: "asset-rm200",
        media_asset_id: "asset-2",
        hosted_sha256: "sha-2",
        hosted_url: "https://cdn.example.com/link.jpg",
      },
    ];

    const deduped = dedupePhotosByCanonicalKeysPreferMediaLinks(photos);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe("link-1");
    expect(deduped[0].origin).toBe("media_links");
  });
});
