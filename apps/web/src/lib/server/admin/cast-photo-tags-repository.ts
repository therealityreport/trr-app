import "server-only";

import { query } from "@/lib/server/postgres";

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

// In the Supabase/PostgREST world, schemas must be "exposed" to be queryable.
// In TRR-APP we prefer direct Postgres for admin tooling (no PostgREST), but we
// still treat missing schema/table as "unavailable" so callers can degrade.
let adminSchemaAvailable: boolean | null = null;

type PgErrorLike = { code?: string };

const isMissingAdminSchemaOrTable = (error: unknown): boolean => {
  const code = (error as PgErrorLike | null)?.code;
  // 3F000 = invalid_schema_name, 42P01 = undefined_table
  return code === "3F000" || code === "42P01";
};

const markAdminSchemaUnavailable = (error: unknown) => {
  if (adminSchemaAvailable === false) return;
  adminSchemaAvailable = false;
  console.warn("[cast-photo-tags] Admin tags table unavailable", error);
};

export async function getTagsByPhotoIds(
  photoIds: string[]
): Promise<Map<string, CastPhotoTags>> {
  const tags = new Map<string, CastPhotoTags>();
  if (photoIds.length === 0) return tags;
  if (adminSchemaAvailable === false) return tags;

  try {
    const result = await query<CastPhotoTags>(
      `SELECT ${TAG_FIELDS}
       FROM admin.cast_photo_people_tags
       WHERE cast_photo_id = ANY($1::uuid[])`,
      [photoIds]
    );
    for (const row of result.rows) {
      tags.set(row.cast_photo_id, row);
    }
  } catch (error) {
    if (isMissingAdminSchemaOrTable(error)) {
      markAdminSchemaUnavailable(error);
      return tags;
    }
    console.warn("[cast-photo-tags] Failed to fetch tags", error);
  }

  return tags;
}

export async function getPhotoIdsByPersonId(personId: string): Promise<string[]> {
  if (!personId) return [];
  if (adminSchemaAvailable === false) return [];

  try {
    const result = await query<{ cast_photo_id: string }>(
      `SELECT cast_photo_id
       FROM admin.cast_photo_people_tags
       WHERE people_ids @> ARRAY[$1]::text[]`,
      [personId]
    );
    return result.rows.map((row) => row.cast_photo_id);
  } catch (error) {
    if (isMissingAdminSchemaOrTable(error)) {
      markAdminSchemaUnavailable(error);
      return [];
    }
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
  if (adminSchemaAvailable === false) return null;
  try {
    const now = new Date().toISOString();
    const result = await query<CastPhotoTags>(
      `INSERT INTO admin.cast_photo_people_tags (
        cast_photo_id,
        people_names,
        people_ids,
        people_count,
        people_count_source,
        detector,
        created_by_firebase_uid,
        updated_by_firebase_uid,
        updated_at
      ) VALUES (
        $1::uuid,
        $2::text[],
        $3::text[],
        $4::int,
        $5::text,
        $6::text,
        $7::text,
        $8::text,
        $9::timestamptz
      )
      ON CONFLICT (cast_photo_id) DO UPDATE SET
        people_names = EXCLUDED.people_names,
        people_ids = EXCLUDED.people_ids,
        people_count = EXCLUDED.people_count,
        people_count_source = EXCLUDED.people_count_source,
        detector = EXCLUDED.detector,
        updated_by_firebase_uid = EXCLUDED.updated_by_firebase_uid,
        updated_at = EXCLUDED.updated_at,
        created_by_firebase_uid = COALESCE(admin.cast_photo_people_tags.created_by_firebase_uid, EXCLUDED.created_by_firebase_uid)
      RETURNING ${TAG_FIELDS}`,
      [
        payload.cast_photo_id,
        payload.people_names,
        payload.people_ids,
        payload.people_count,
        payload.people_count_source,
        payload.detector ?? null,
        payload.created_by_firebase_uid ?? null,
        payload.updated_by_firebase_uid ?? null,
        now,
      ]
    );

    return result.rows[0] ?? null;
  } catch (error) {
    if (isMissingAdminSchemaOrTable(error)) {
      markAdminSchemaUnavailable(error);
      return null;
    }
    console.warn("[cast-photo-tags] Failed to upsert tags", error);
    return null;
  }
}
