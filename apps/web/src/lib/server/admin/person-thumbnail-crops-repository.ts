import "server-only";

import {
  parseThumbnailCrop,
  type ThumbnailCrop,
  type ThumbnailCropMode,
} from "@/lib/thumbnail-crop";
import { query } from "@/lib/server/postgres";

export type ThumbnailCropOrigin = "cast_photos" | "media_links";

export interface ThumbnailCropWriteResult {
  origin: ThumbnailCropOrigin;
  photo_id: string;
  person_id: string;
  link_id: string | null;
  thumbnail_focus_x: number | null;
  thumbnail_focus_y: number | null;
  thumbnail_zoom: number | null;
  thumbnail_crop_mode: ThumbnailCropMode | null;
}

const toResult = (params: {
  origin: ThumbnailCropOrigin;
  photoId: string;
  personId: string;
  linkId: string | null;
  crop: ThumbnailCrop | null;
}): ThumbnailCropWriteResult => {
  return {
    origin: params.origin,
    photo_id: params.photoId,
    person_id: params.personId,
    link_id: params.linkId,
    thumbnail_focus_x: params.crop?.x ?? null,
    thumbnail_focus_y: params.crop?.y ?? null,
    thumbnail_zoom: params.crop?.zoom ?? null,
    thumbnail_crop_mode: params.crop?.mode ?? null,
  };
};

export async function updateCastPhotoThumbnailCrop(params: {
  personId: string;
  photoId: string;
  crop: ThumbnailCrop | null;
}): Promise<ThumbnailCropWriteResult | null> {
  const cropJson = params.crop ? JSON.stringify(params.crop) : null;
  const result = await query<{
    id: string;
    person_id: string;
    metadata: Record<string, unknown> | null;
  }>(
    `UPDATE core.cast_photos
     SET metadata = CASE
       WHEN $3::jsonb IS NULL THEN COALESCE(metadata, '{}'::jsonb) - 'thumbnail_crop'
       ELSE jsonb_set(COALESCE(metadata, '{}'::jsonb), '{thumbnail_crop}', $3::jsonb, true)
     END,
     updated_at = NOW()
     WHERE id = $1::uuid
       AND person_id = $2::uuid
     RETURNING id, person_id, metadata`,
    [params.photoId, params.personId, cropJson],
  );

  const row = result.rows[0];
  if (!row) return null;

  const rawCrop =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>).thumbnail_crop
      : null;
  const parsedCrop = parseThumbnailCrop(rawCrop, { clamp: true });

  return toResult({
    origin: "cast_photos",
    photoId: row.id,
    personId: row.person_id,
    linkId: null,
    crop: parsedCrop,
  });
}

export async function updateMediaLinkThumbnailCrop(params: {
  personId: string;
  linkId: string;
  crop: ThumbnailCrop | null;
}): Promise<ThumbnailCropWriteResult | null> {
  const cropJson = params.crop ? JSON.stringify(params.crop) : null;
  const result = await query<{
    id: string;
    entity_id: string;
    context: Record<string, unknown> | null;
  }>(
    `UPDATE core.media_links
     SET context = CASE
       WHEN $3::jsonb IS NULL THEN COALESCE(context, '{}'::jsonb) - 'thumbnail_crop'
       ELSE jsonb_set(COALESCE(context, '{}'::jsonb), '{thumbnail_crop}', $3::jsonb, true)
     END,
     updated_at = NOW()
     WHERE id = $1::uuid
       AND entity_type = 'person'
       AND entity_id = $2::uuid
       AND kind = 'gallery'
     RETURNING id, entity_id, context`,
    [params.linkId, params.personId, cropJson],
  );

  const row = result.rows[0];
  if (!row) return null;

  const rawCrop =
    row.context && typeof row.context === "object"
      ? (row.context as Record<string, unknown>).thumbnail_crop
      : null;
  const parsedCrop = parseThumbnailCrop(rawCrop, { clamp: true });

  return toResult({
    origin: "media_links",
    photoId: row.id,
    personId: row.entity_id,
    linkId: row.id,
    crop: parsedCrop,
  });
}
