import "server-only";

import { getSupabaseTrrCore } from "@/lib/server/supabase-trr-core";

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

const TAG_FIELDS =
  "cast_photo_id, people_names, people_ids, people_count, people_count_source, detector, created_at, updated_at, created_by_firebase_uid, updated_by_firebase_uid";

export async function getTagsByPhotoIds(
  photoIds: string[]
): Promise<Map<string, CastPhotoTags>> {
  const tags = new Map<string, CastPhotoTags>();
  if (photoIds.length === 0) return tags;

  try {
    const supabase = getSupabaseTrrCore();
    const { data, error } = await supabase
      .schema("admin")
      .from("cast_photo_people_tags")
      .select(TAG_FIELDS)
      .in("cast_photo_id", photoIds);

    if (error) {
      console.warn(
        "[cast-photo-tags] Failed to fetch tags (admin.cast_photo_people_tags)",
        error.message
      );
      return tags;
    }

    for (const row of (data ?? []) as CastPhotoTags[]) {
      tags.set(row.cast_photo_id, row);
    }
  } catch (error) {
    console.warn("[cast-photo-tags] Failed to fetch tags", error);
  }

  return tags;
}

export async function getPhotoIdsByPersonId(personId: string): Promise<string[]> {
  if (!personId) return [];

  try {
    const supabase = getSupabaseTrrCore();
    const { data, error } = await supabase
      .schema("admin")
      .from("cast_photo_people_tags")
      .select("cast_photo_id")
      .contains("people_ids", [personId]);

    if (error) {
      console.warn(
        "[cast-photo-tags] Failed to fetch tag photo IDs",
        error.message
      );
      return [];
    }

    return (data ?? []).map((row) => row.cast_photo_id as string);
  } catch (error) {
    console.warn("[cast-photo-tags] Failed to fetch tag photo IDs", error);
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
  }
): Promise<CastPhotoTags | null> {
  try {
    const supabase = getSupabaseTrrCore();
    const now = new Date().toISOString();
    const row = {
      cast_photo_id: payload.cast_photo_id,
      people_names: payload.people_names,
      people_ids: payload.people_ids,
      people_count: payload.people_count,
      people_count_source: payload.people_count_source,
      detector: payload.detector ?? null,
      updated_at: now,
      updated_by_firebase_uid: payload.updated_by_firebase_uid ?? null,
      created_by_firebase_uid: payload.created_by_firebase_uid ?? null,
    };

    const { data, error } = await supabase
      .schema("admin")
      .from("cast_photo_people_tags")
      .upsert(row, { onConflict: "cast_photo_id", defaultToNull: false })
      .select(TAG_FIELDS)
      .single();

    if (error) {
      console.warn("[cast-photo-tags] Failed to upsert tags", error.message);
      return null;
    }

    return data as CastPhotoTags;
  } catch (error) {
    console.warn("[cast-photo-tags] Failed to upsert tags", error);
    return null;
  }
}
