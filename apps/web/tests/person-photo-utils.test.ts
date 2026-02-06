import { describe, expect, it } from "vitest";

import { dedupePhotosByHostedUrlPreferMediaLinks } from "@/lib/server/trr-api/person-photo-utils";

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
