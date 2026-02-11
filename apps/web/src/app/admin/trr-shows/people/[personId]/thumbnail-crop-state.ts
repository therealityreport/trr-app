export interface ThumbnailCropStatePhoto {
  id: string;
  origin: "cast_photos" | "media_links";
  link_id?: string | null;
  thumbnail_focus_x: number | null;
  thumbnail_focus_y: number | null;
  thumbnail_zoom: number | null;
  thumbnail_crop_mode: "manual" | "auto" | null;
}

export interface ThumbnailCropUpdatePayload {
  origin: "cast_photos" | "media_links";
  photoId: string;
  linkId: string | null;
  thumbnailFocusX: number | null;
  thumbnailFocusY: number | null;
  thumbnailZoom: number | null;
  thumbnailCropMode: "manual" | "auto" | null;
}

export function applyThumbnailCropUpdateToPhotos<T extends ThumbnailCropStatePhoto>(
  photos: T[],
  payload: ThumbnailCropUpdatePayload,
): T[] {
  return photos.map((photo) => {
    const matches =
      payload.origin === "media_links"
        ? photo.origin === "media_links" &&
          ((payload.linkId && photo.link_id === payload.linkId) || photo.id === payload.photoId)
        : photo.origin === "cast_photos" && photo.id === payload.photoId;

    if (!matches) return photo;

    return {
      ...photo,
      thumbnail_focus_x: payload.thumbnailFocusX,
      thumbnail_focus_y: payload.thumbnailFocusY,
      thumbnail_zoom: payload.thumbnailZoom,
      thumbnail_crop_mode: payload.thumbnailCropMode,
    };
  });
}

export function applyThumbnailCropUpdateToLightbox<
  T extends ThumbnailCropStatePhoto,
  L extends { photo: T } | null,
>(lightbox: L, payload: ThumbnailCropUpdatePayload): L {
  if (!lightbox) return lightbox;

  const photo = lightbox.photo;
  const matches =
    payload.origin === "media_links"
      ? photo.origin === "media_links" &&
        ((payload.linkId && photo.link_id === payload.linkId) || photo.id === payload.photoId)
      : photo.origin === "cast_photos" && photo.id === payload.photoId;

  if (!matches) return lightbox;

  return {
    ...lightbox,
    photo: {
      ...photo,
      thumbnail_focus_x: payload.thumbnailFocusX,
      thumbnail_focus_y: payload.thumbnailFocusY,
      thumbnail_zoom: payload.thumbnailZoom,
      thumbnail_crop_mode: payload.thumbnailCropMode,
    },
  } as L;
}
