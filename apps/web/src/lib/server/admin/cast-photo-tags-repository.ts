import "server-only";

import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";

export interface CastPhotoTags {
  cast_photo_id: string;
  people_names: string[] | null;
  people_ids: string[] | null;
  people_count: number | null;
  people_count_source: "auto" | "manual" | null;
  detector: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by_firebase_uid: string | null;
  updated_by_firebase_uid: string | null;
}

const CAST_PHOTO_TAGS_ROUTE = "cast-photo-tags";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeStringArray = (value: unknown): string[] | null => {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return null;
  return value.filter((entry): entry is string => typeof entry === "string");
};

const normalizeCountSource = (value: unknown): "auto" | "manual" | null =>
  value === "auto" || value === "manual" ? value : null;

const normalizeString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const normalizeCount = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeTag = (value: unknown): CastPhotoTags | null => {
  if (!isRecord(value) || typeof value.cast_photo_id !== "string") return null;

  return {
    cast_photo_id: value.cast_photo_id,
    people_names: normalizeStringArray(value.people_names),
    people_ids: normalizeStringArray(value.people_ids),
    people_count: normalizeCount(value.people_count),
    people_count_source: normalizeCountSource(value.people_count_source),
    detector: normalizeString(value.detector),
    created_at: normalizeString(value.created_at),
    updated_at: normalizeString(value.updated_at),
    created_by_firebase_uid: normalizeString(value.created_by_firebase_uid),
    updated_by_firebase_uid: normalizeString(value.updated_by_firebase_uid),
  };
};

const warnBackendFallback = (operation: string, error: unknown) => {
  console.warn(`[cast-photo-tags] Backend ${operation} unavailable`, error);
};

export async function getTagsByPhotoIds(
  photoIds: string[],
): Promise<Map<string, CastPhotoTags>> {
  const tags = new Map<string, CastPhotoTags>();
  if (photoIds.length === 0) return tags;

  const params = new URLSearchParams();
  for (const photoId of photoIds) {
    if (photoId) params.append("photo_ids", photoId);
  }
  if (!params.has("photo_ids")) return tags;

  try {
    const result = await fetchAdminBackendJson("/admin/cast-photos/tags", {
      queryString: params.toString(),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: `${CAST_PHOTO_TAGS_ROUTE}:list`,
    });
    if (result.status !== 200) return tags;

    const rawTags = Array.isArray(result.data.tags) ? result.data.tags : [];
    for (const rawTag of rawTags) {
      const tag = normalizeTag(rawTag);
      if (tag) tags.set(tag.cast_photo_id, tag);
    }
  } catch (error) {
    warnBackendFallback("tag read", error);
  }

  return tags;
}

export async function getPhotoIdsByPersonId(personId: string): Promise<string[]> {
  if (!personId) return [];

  try {
    const result = await fetchAdminBackendJson("/admin/cast-photos/tags/photo-ids", {
      queryString: new URLSearchParams({ person_id: personId }).toString(),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: `${CAST_PHOTO_TAGS_ROUTE}:photo-ids`,
    });
    if (result.status !== 200 || !Array.isArray(result.data.photo_ids)) {
      return [];
    }
    return result.data.photo_ids.filter(
      (photoId): photoId is string => typeof photoId === "string",
    );
  } catch (error) {
    warnBackendFallback("photo ID read", error);
    return [];
  }
}

export async function upsertCastPhotoTags(
  payload: {
    cast_photo_id: string;
    people_names: string[] | null;
    people_ids: string[] | null;
    people_count: number | null;
    people_count_source: "auto" | "manual" | null;
    detector?: string | null;
    created_by_firebase_uid?: string | null;
    updated_by_firebase_uid?: string | null;
  },
): Promise<CastPhotoTags | null> {
  try {
    const result = await fetchAdminBackendJson("/admin/cast-photos/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cast_photo_id: payload.cast_photo_id,
        people_names: payload.people_names,
        people_ids: payload.people_ids,
        people_count: payload.people_count,
        people_count_source: payload.people_count_source,
        detector: payload.detector ?? null,
        created_by_firebase_uid: payload.created_by_firebase_uid ?? null,
        updated_by_firebase_uid: payload.updated_by_firebase_uid ?? null,
      }),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: `${CAST_PHOTO_TAGS_ROUTE}:upsert`,
    });
    if (result.status !== 200) return null;
    return normalizeTag(result.data.tag);
  } catch (error) {
    warnBackendFallback("tag upsert", error);
    return null;
  }
}

export async function setCastPhotoFaceBoxes(
  castPhotoId: string,
  faceBoxes: unknown[] | null,
): Promise<boolean> {
  try {
    const result = await fetchAdminBackendJson(
      `/admin/cast-photos/${castPhotoId}/face-boxes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ face_boxes: faceBoxes ?? null }),
        timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
        routeName: `${CAST_PHOTO_TAGS_ROUTE}:face-boxes`,
      },
    );
    return result.status === 200 && result.data.updated === true;
  } catch (error) {
    warnBackendFallback("face box update", error);
    return false;
  }
}
