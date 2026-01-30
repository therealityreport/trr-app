import "server-only";

import { query, withAuthTransaction, type AuthContext } from "@/lib/server/postgres";

// ============================================================================
// Types
// ============================================================================

export interface PersonCoverPhoto {
  person_id: string;
  photo_id: string;
  photo_url: string;
  created_at: string;
  updated_at: string;
  created_by_firebase_uid: string;
}

export interface SetCoverPhotoInput {
  person_id: string;
  photo_id: string;
  photo_url: string;
}

// ============================================================================
// Table Helper
// ============================================================================

const TABLE = "admin.person_cover_photos";

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get the cover photo for a person.
 */
export async function getCoverPhoto(personId: string): Promise<PersonCoverPhoto | null> {
  const result = await query<PersonCoverPhoto>(
    `SELECT * FROM ${TABLE} WHERE person_id = $1`,
    [personId],
  );
  return result.rows[0] ?? null;
}

/**
 * Get cover photos for multiple people (batch).
 */
export async function getCoverPhotos(personIds: string[]): Promise<Map<string, PersonCoverPhoto>> {
  if (personIds.length === 0) return new Map();

  const placeholders = personIds.map((_, i) => `$${i + 1}`).join(", ");
  const result = await query<PersonCoverPhoto>(
    `SELECT * FROM ${TABLE} WHERE person_id IN (${placeholders})`,
    personIds,
  );

  const map = new Map<string, PersonCoverPhoto>();
  for (const photo of result.rows) {
    map.set(photo.person_id, photo);
  }
  return map;
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Set the cover photo for a person.
 * Upserts - creates if not exists, updates if exists.
 */
export async function setCoverPhoto(
  authContext: AuthContext,
  input: SetCoverPhotoInput,
): Promise<PersonCoverPhoto> {
  return withAuthTransaction(authContext, async (client) => {
    const firebaseUid = authContext.firebaseUid;
    if (!firebaseUid) {
      throw new Error("Firebase UID is required to set a cover photo");
    }

    const result = await client.query<PersonCoverPhoto>(
      `INSERT INTO ${TABLE} (person_id, photo_id, photo_url, created_by_firebase_uid)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (person_id) DO UPDATE SET
         photo_id = EXCLUDED.photo_id,
         photo_url = EXCLUDED.photo_url,
         updated_at = now(),
         created_by_firebase_uid = EXCLUDED.created_by_firebase_uid
       RETURNING *`,
      [input.person_id, input.photo_id, input.photo_url, firebaseUid],
    );
    return result.rows[0];
  });
}

/**
 * Remove the cover photo for a person (revert to default).
 */
export async function removeCoverPhoto(
  authContext: AuthContext,
  personId: string,
): Promise<boolean> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query(
      `DELETE FROM ${TABLE} WHERE person_id = $1`,
      [personId],
    );
    return (result.rowCount ?? 0) > 0;
  });
}
