import "server-only";

import type { ThumbnailCrop, ThumbnailCropMode } from "@/lib/thumbnail-crop";
import {
  AdminReadProxyError,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESULT_KEYS = new Set([
  "origin",
  "photo_id",
  "person_id",
  "link_id",
  "thumbnail_focus_x",
  "thumbnail_focus_y",
  "thumbnail_zoom",
  "thumbnail_crop_mode",
]);

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

type ThumbnailCropWriteParams = {
  origin: ThumbnailCropOrigin;
  personId: string;
  photoId: string;
  linkId: string | null;
  crop: ThumbnailCrop | null;
  adminContext: VerifiedAdminContext;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
  Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));

const invalidBackendResponse = (): AdminReadProxyError =>
  new AdminReadProxyError("TRR-Backend returned an invalid thumbnail-crop response", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });

const readProblemCode = (data: Record<string, unknown>): string | null => {
  const detail = isRecord(data.detail) ? data.detail : null;
  return typeof detail?.code === "string" ? detail.code : null;
};

const isNullableFiniteNumber = (value: unknown): value is number | null =>
  value === null || (typeof value === "number" && Number.isFinite(value));

const parseResult = (
  value: unknown,
  expected: Pick<ThumbnailCropWriteParams, "origin" | "personId" | "photoId" | "linkId">,
): ThumbnailCropWriteResult => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, RESULT_KEYS) ||
    value.origin !== expected.origin ||
    typeof value.photo_id !== "string" ||
    !UUID_PATTERN.test(value.photo_id) ||
    value.photo_id.toLowerCase() !== expected.photoId.toLowerCase() ||
    typeof value.person_id !== "string" ||
    !UUID_PATTERN.test(value.person_id) ||
    value.person_id.toLowerCase() !== expected.personId.toLowerCase() ||
    (value.link_id !== null &&
      (typeof value.link_id !== "string" || !UUID_PATTERN.test(value.link_id))) ||
    (expected.linkId === null
      ? value.link_id !== null
      : typeof value.link_id !== "string" ||
        value.link_id.toLowerCase() !== expected.linkId.toLowerCase()) ||
    !isNullableFiniteNumber(value.thumbnail_focus_x) ||
    !isNullableFiniteNumber(value.thumbnail_focus_y) ||
    !isNullableFiniteNumber(value.thumbnail_zoom) ||
    (value.thumbnail_crop_mode !== null &&
      value.thumbnail_crop_mode !== "manual" &&
      value.thumbnail_crop_mode !== "auto")
  ) {
    throw invalidBackendResponse();
  }

  const cropFields = [
    value.thumbnail_focus_x,
    value.thumbnail_focus_y,
    value.thumbnail_zoom,
    value.thumbnail_crop_mode,
  ];
  const allNull = cropFields.every((field) => field === null);
  const allPresent = cropFields.every((field) => field !== null);
  if (
    (!allNull && !allPresent) ||
    (allPresent &&
      ((value.thumbnail_focus_x as number) < 0 ||
        (value.thumbnail_focus_x as number) > 100 ||
        (value.thumbnail_focus_y as number) < 0 ||
        (value.thumbnail_focus_y as number) > 100 ||
        (value.thumbnail_zoom as number) < 1 ||
        (value.thumbnail_zoom as number) > 4))
  ) {
    throw invalidBackendResponse();
  }

  return {
    origin: expected.origin,
    photo_id: value.photo_id,
    person_id: value.person_id,
    link_id: value.link_id,
    thumbnail_focus_x: value.thumbnail_focus_x,
    thumbnail_focus_y: value.thumbnail_focus_y,
    thumbnail_zoom: value.thumbnail_zoom,
    thumbnail_crop_mode: value.thumbnail_crop_mode,
  };
};

const updateThumbnailCrop = async (
  params: ThumbnailCropWriteParams,
): Promise<ThumbnailCropWriteResult | null> => {
  const upstream = await fetchAdminBackendJson(
    `/admin/people/${encodeURIComponent(params.personId)}/thumbnail-crops`,
    {
      apiVersion: "v2",
      adminContext: params.adminContext,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: params.origin,
        photo_id: params.photoId,
        link_id: params.linkId,
        crop: params.crop,
      }),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "person-thumbnail-crop",
    },
  );
  if (
    upstream.status === 404 &&
    readProblemCode(upstream.data) === "PERSON_THUMBNAIL_CROP_NOT_FOUND"
  ) {
    return null;
  }
  if (upstream.status !== 200) {
    throw buildAdminBackendStatusError({
      status: upstream.status,
      data: upstream.data,
      fallbackMessage: "Failed to update the person thumbnail crop",
      routeName: "person-thumbnail-crop",
    });
  }
  return parseResult(upstream.data, params);
};

export async function updateCastPhotoThumbnailCrop(params: {
  personId: string;
  photoId: string;
  crop: ThumbnailCrop | null;
  adminContext: VerifiedAdminContext;
}): Promise<ThumbnailCropWriteResult | null> {
  return updateThumbnailCrop({
    origin: "cast_photos",
    personId: params.personId,
    photoId: params.photoId,
    linkId: null,
    crop: params.crop,
    adminContext: params.adminContext,
  });
}

export async function updateMediaLinkThumbnailCrop(params: {
  personId: string;
  linkId: string;
  crop: ThumbnailCrop | null;
  adminContext: VerifiedAdminContext;
}): Promise<ThumbnailCropWriteResult | null> {
  return updateThumbnailCrop({
    origin: "media_links",
    personId: params.personId,
    photoId: params.linkId,
    linkId: params.linkId,
    crop: params.crop,
    adminContext: params.adminContext,
  });
}
