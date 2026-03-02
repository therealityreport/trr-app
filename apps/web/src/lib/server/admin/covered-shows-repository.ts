import "server-only";

import { query, withAuthTransaction, type AuthContext } from "@/lib/server/postgres";

// ============================================================================
// Types
// ============================================================================

export interface CoveredShow {
  id: string;
  trr_show_id: string;
  show_name: string;
  canonical_slug?: string | null;
  alternative_names?: string[] | null;
  show_total_episodes?: number | null;
  poster_url?: string | null;
  created_at: string;
  created_by_firebase_uid: string;
}

export interface CreateCoveredShowInput {
  trr_show_id: string;
  show_name: string;
}

// ============================================================================
// Table Helper
// ============================================================================

const TABLE = "admin.covered_shows";
const SHOW_SLUG_SQL = `
  lower(
    trim(
      both '-' FROM regexp_replace(
        regexp_replace(COALESCE(s.name, ''), '&', ' and ', 'gi'),
        '[^a-z0-9]+',
        '-',
        'gi'
      )
    )
  )
`;

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all covered shows.
 */
export async function getCoveredShows(): Promise<CoveredShow[]> {
  const result = await query<CoveredShow>(
    `WITH shows_with_slug AS (
       SELECT
         s.*,
         ${SHOW_SLUG_SQL} AS computed_slug,
         COUNT(*) OVER (PARTITION BY ${SHOW_SLUG_SQL}) AS slug_collision_count
       FROM core.shows AS s
     )
     SELECT
       cs.*,
       CASE
         WHEN s.slug_collision_count > 1
           THEN COALESCE(NULLIF(s.slug, ''), s.computed_slug) || '--' || lower(left(s.id::text, 8))
         ELSE COALESCE(NULLIF(s.slug, ''), s.computed_slug)
       END AS canonical_slug,
       s.alternative_names,
       s.show_total_episodes,
       si.hosted_url AS poster_url
     FROM ${TABLE} cs
     LEFT JOIN shows_with_slug s ON s.id::text = cs.trr_show_id::text
     LEFT JOIN core.show_images si ON si.id = s.primary_poster_image_id
     ORDER BY cs.show_name ASC`,
    [],
  );
  return result.rows;
}

/**
 * Get a covered show by TRR show ID.
 */
export async function getCoveredShowByTrrShowId(trrShowId: string): Promise<CoveredShow | null> {
  const result = await query<CoveredShow>(
    `SELECT * FROM ${TABLE} WHERE trr_show_id = $1`,
    [trrShowId],
  );
  return result.rows[0] ?? null;
}

/**
 * Check if a show is covered.
 */
export async function isShowCovered(trrShowId: string): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM ${TABLE} WHERE trr_show_id = $1) as exists`,
    [trrShowId],
  );
  return result.rows[0]?.exists ?? false;
}

/**
 * Get covered show IDs as a Set for efficient lookup.
 */
export async function getCoveredShowIds(): Promise<Set<string>> {
  const result = await query<{ trr_show_id: string }>(
    `SELECT trr_show_id FROM ${TABLE}`,
    [],
  );
  return new Set(result.rows.map(r => r.trr_show_id));
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Add a show to the covered shows list.
 */
export async function addCoveredShow(
  authContext: AuthContext,
  input: CreateCoveredShowInput,
): Promise<CoveredShow> {
  return withAuthTransaction(authContext, async (client) => {
    const firebaseUid = authContext.firebaseUid;
    if (!firebaseUid) {
      throw new Error("Firebase UID is required to add a covered show");
    }

    const result = await client.query<CoveredShow>(
      `INSERT INTO ${TABLE} (trr_show_id, show_name, created_by_firebase_uid)
       VALUES ($1, $2, $3)
       ON CONFLICT (trr_show_id) DO UPDATE SET show_name = EXCLUDED.show_name
       RETURNING *`,
      [input.trr_show_id, input.show_name, firebaseUid],
    );
    return result.rows[0];
  });
}

/**
 * Remove a show from the covered shows list.
 */
export async function removeCoveredShow(
  authContext: AuthContext,
  trrShowId: string,
): Promise<boolean> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query(
      `DELETE FROM ${TABLE} WHERE trr_show_id = $1`,
      [trrShowId],
    );
    return (result.rowCount ?? 0) > 0;
  });
}
