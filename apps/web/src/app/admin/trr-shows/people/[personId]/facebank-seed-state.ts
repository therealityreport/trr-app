export interface FacebankSeedTogglePhoto {
  origin: "cast_photos" | "media_links";
  link_id?: string | null;
  facebank_seed: boolean;
}

export interface FacebankSeedUpdatePayload {
  linkId: string;
  facebankSeed: boolean;
}

export function applyFacebankSeedUpdateToPhotos<T extends FacebankSeedTogglePhoto>(
  photos: T[],
  payload: FacebankSeedUpdatePayload,
): T[] {
  return photos.map((photo) =>
    photo.origin === "media_links" && photo.link_id === payload.linkId
      ? { ...photo, facebank_seed: payload.facebankSeed }
      : photo,
  );
}

export function applyFacebankSeedUpdateToLightbox<T extends FacebankSeedTogglePhoto, L extends { photo: T } | null>(
  lightbox: L,
  payload: FacebankSeedUpdatePayload,
): L {
  if (!lightbox) return lightbox;
  if (lightbox.photo.origin !== "media_links" || lightbox.photo.link_id !== payload.linkId) {
    return lightbox;
  }
  return {
    ...lightbox,
    photo: {
      ...lightbox.photo,
      facebank_seed: payload.facebankSeed,
    },
  } as L;
}
