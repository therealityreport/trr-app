import { describe, expect, it } from "vitest";

import {
  applyThumbnailCropUpdateToLightbox,
  applyThumbnailCropUpdateToPhotos,
} from "@/app/admin/trr-shows/people/[personId]/thumbnail-crop-state";

describe("thumbnail crop UI state helpers", () => {
  it("updates matching media_links photo rows", () => {
    const photos = [
      {
        id: "cast-1",
        origin: "cast_photos" as const,
        link_id: null,
        thumbnail_focus_x: null,
        thumbnail_focus_y: null,
        thumbnail_zoom: null,
        thumbnail_crop_mode: null,
      },
      {
        id: "link-2",
        origin: "media_links" as const,
        link_id: "link-2",
        thumbnail_focus_x: null,
        thumbnail_focus_y: null,
        thumbnail_zoom: null,
        thumbnail_crop_mode: null,
      },
    ];

    const updated = applyThumbnailCropUpdateToPhotos(photos, {
      origin: "media_links",
      photoId: "link-2",
      linkId: "link-2",
      thumbnailFocusX: 44,
      thumbnailFocusY: 27,
      thumbnailZoom: 1.18,
      thumbnailCropMode: "manual",
    });

    expect(updated[0].thumbnail_crop_mode).toBeNull();
    expect(updated[1].thumbnail_focus_x).toBe(44);
    expect(updated[1].thumbnail_focus_y).toBe(27);
    expect(updated[1].thumbnail_zoom).toBe(1.18);
    expect(updated[1].thumbnail_crop_mode).toBe("manual");
  });

  it("updates matching cast_photos rows by photo id", () => {
    const photos = [
      {
        id: "cast-1",
        origin: "cast_photos" as const,
        link_id: null,
        thumbnail_focus_x: null,
        thumbnail_focus_y: null,
        thumbnail_zoom: null,
        thumbnail_crop_mode: null,
      },
    ];

    const updated = applyThumbnailCropUpdateToPhotos(photos, {
      origin: "cast_photos",
      photoId: "cast-1",
      linkId: null,
      thumbnailFocusX: null,
      thumbnailFocusY: null,
      thumbnailZoom: null,
      thumbnailCropMode: null,
    });

    expect(updated[0].thumbnail_crop_mode).toBeNull();
  });

  it("updates lightbox photo when selected row matches", () => {
    const lightbox = {
      index: 1,
      photo: {
        id: "link-2",
        origin: "media_links" as const,
        link_id: "link-2",
        thumbnail_focus_x: null,
        thumbnail_focus_y: null,
        thumbnail_zoom: null,
        thumbnail_crop_mode: null,
      },
    };

    const updated = applyThumbnailCropUpdateToLightbox(lightbox, {
      origin: "media_links",
      photoId: "link-2",
      linkId: "link-2",
      thumbnailFocusX: 40,
      thumbnailFocusY: 25,
      thumbnailZoom: 1.1,
      thumbnailCropMode: "manual",
    });

    expect(updated?.photo.thumbnail_focus_x).toBe(40);
    expect(updated?.photo.thumbnail_focus_y).toBe(25);
    expect(updated?.photo.thumbnail_zoom).toBe(1.1);
    expect(updated?.photo.thumbnail_crop_mode).toBe("manual");
  });

  it("keeps lightbox unchanged when row does not match", () => {
    const lightbox = {
      index: 1,
      photo: {
        id: "link-2",
        origin: "media_links" as const,
        link_id: "link-2",
        thumbnail_focus_x: null,
        thumbnail_focus_y: null,
        thumbnail_zoom: null,
        thumbnail_crop_mode: null,
      },
    };

    const updated = applyThumbnailCropUpdateToLightbox(lightbox, {
      origin: "cast_photos",
      photoId: "cast-999",
      linkId: null,
      thumbnailFocusX: 50,
      thumbnailFocusY: 32,
      thumbnailZoom: 1,
      thumbnailCropMode: "manual",
    });

    expect(updated).toBe(lightbox);
  });
});
