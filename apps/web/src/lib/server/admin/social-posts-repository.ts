import "server-only";

import { query, withAuthTransaction, type AuthContext } from "@/lib/server/postgres";

// ============================================================================
// Types
// ============================================================================

export type SocialPlatform =
  | "reddit"
  | "twitter"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "other";

export interface SocialPost {
  id: string;
  trr_show_id: string;
  trr_season_id: string | null;
  platform: SocialPlatform;
  url: string;
  title: string | null;
  notes: string | null;
  created_by_firebase_uid: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePostInput {
  trr_show_id: string;
  trr_season_id?: string | null;
  platform: SocialPlatform;
  url: string;
  title?: string | null;
  notes?: string | null;
}

export interface UpdatePostInput {
  trr_season_id?: string | null;
  platform?: SocialPlatform;
  url?: string;
  title?: string | null;
  notes?: string | null;
}

// ============================================================================
// Table Helper
// ============================================================================

const TABLE = "admin.show_social_posts";

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all social posts for a TRR show.
 */
export async function getPostsByShowId(trrShowId: string): Promise<SocialPost[]> {
  const result = await query<SocialPost>(
    `SELECT * FROM ${TABLE}
     WHERE trr_show_id = $1
     ORDER BY created_at DESC`,
    [trrShowId],
  );
  return result.rows;
}

/**
 * Get all social posts for a TRR season.
 */
export async function getPostsBySeasonId(trrSeasonId: string): Promise<SocialPost[]> {
  const result = await query<SocialPost>(
    `SELECT * FROM ${TABLE}
     WHERE trr_season_id = $1
     ORDER BY created_at DESC`,
    [trrSeasonId],
  );
  return result.rows;
}

/**
 * Get a single post by ID.
 */
export async function getPostById(id: string): Promise<SocialPost | null> {
  const result = await query<SocialPost>(
    `SELECT * FROM ${TABLE} WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

/**
 * Get posts by platform for a show.
 */
export async function getPostsByShowAndPlatform(
  trrShowId: string,
  platform: SocialPlatform,
): Promise<SocialPost[]> {
  const result = await query<SocialPost>(
    `SELECT * FROM ${TABLE}
     WHERE trr_show_id = $1 AND platform = $2
     ORDER BY created_at DESC`,
    [trrShowId, platform],
  );
  return result.rows;
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Create a new social post.
 * The firebaseUid is extracted from the AuthContext.
 */
export async function createPost(
  authContext: AuthContext,
  input: CreatePostInput,
): Promise<SocialPost> {
  return withAuthTransaction(authContext, async (client) => {
    // Get Firebase UID from auth context
    const firebaseUid = authContext.firebaseUid;
    if (!firebaseUid) {
      throw new Error("Firebase UID is required to create a social post");
    }

    const result = await client.query<SocialPost>(
      `INSERT INTO ${TABLE} (
        trr_show_id, trr_season_id, platform, url, title, notes, created_by_firebase_uid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        input.trr_show_id,
        input.trr_season_id ?? null,
        input.platform,
        input.url,
        input.title ?? null,
        input.notes ?? null,
        firebaseUid,
      ],
    );
    return result.rows[0];
  });
}

/**
 * Update an existing social post.
 */
export async function updatePost(
  authContext: AuthContext,
  id: string,
  input: UpdatePostInput,
): Promise<SocialPost | null> {
  return withAuthTransaction(authContext, async (client) => {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.trr_season_id !== undefined) {
      sets.push(`trr_season_id = $${paramIndex++}`);
      values.push(input.trr_season_id);
    }
    if (input.platform !== undefined) {
      sets.push(`platform = $${paramIndex++}`);
      values.push(input.platform);
    }
    if (input.url !== undefined) {
      sets.push(`url = $${paramIndex++}`);
      values.push(input.url);
    }
    if (input.title !== undefined) {
      sets.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }
    if (input.notes !== undefined) {
      sets.push(`notes = $${paramIndex++}`);
      values.push(input.notes);
    }

    if (sets.length === 0) {
      return getPostById(id);
    }

    values.push(id);
    const result = await client.query<SocialPost>(
      `UPDATE ${TABLE} SET ${sets.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  });
}

/**
 * Delete a social post by ID.
 */
export async function deletePost(
  authContext: AuthContext,
  id: string,
): Promise<boolean> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query(
      `DELETE FROM ${TABLE} WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  });
}
