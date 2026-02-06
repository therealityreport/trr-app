import { describe, expect, it } from "vitest";

import {
  applyFacebankSeedUpdateToLightbox,
  applyFacebankSeedUpdateToPhotos,
} from "@/app/admin/trr-shows/people/[personId]/facebank-seed-state";

describe("facebank seed UI state helpers", () => {
  it("updates only matching media_links photo rows", () => {
    const photos = [
      { id: "1", origin: "cast_photos" as const, link_id: null, facebank_seed: false },
      { id: "2", origin: "media_links" as const, link_id: "link-2", facebank_seed: false },
      { id: "3", origin: "media_links" as const, link_id: "link-3", facebank_seed: false },
    ];

    const updated = applyFacebankSeedUpdateToPhotos(photos, {
      linkId: "link-2",
      facebankSeed: true,
    });

    expect(updated[0].facebank_seed).toBe(false);
    expect(updated[1].facebank_seed).toBe(true);
    expect(updated[2].facebank_seed).toBe(false);
  });

  it("updates lightbox photo when selected media_links row matches", () => {
    const lightbox = {
      index: 1,
      photo: {
        id: "2",
        origin: "media_links" as const,
        link_id: "link-2",
        facebank_seed: false,
      },
    };

    const updated = applyFacebankSeedUpdateToLightbox(lightbox, {
      linkId: "link-2",
      facebankSeed: true,
    });

    expect(updated?.photo.facebank_seed).toBe(true);
  });

  it("leaves lightbox untouched when link id does not match", () => {
    const lightbox = {
      index: 1,
      photo: {
        id: "2",
        origin: "media_links" as const,
        link_id: "link-2",
        facebank_seed: false,
      },
    };

    const updated = applyFacebankSeedUpdateToLightbox(lightbox, {
      linkId: "link-999",
      facebankSeed: true,
    });

    expect(updated).toBe(lightbox);
    expect(updated?.photo.facebank_seed).toBe(false);
  });
});
