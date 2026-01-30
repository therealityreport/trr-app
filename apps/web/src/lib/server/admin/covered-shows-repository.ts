import "server-only";

import { query, withAuthTransaction, type AuthContext } from "@/lib/server/postgres";

// ============================================================================
// Types
// ============================================================================

export interface CoveredShow {
  id: string;
  trr_show_id: string;
  show_name: string;
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

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all covered shows.
 */
export async function getCoveredShows(): Promise<CoveredShow[]> {
  const result = await query<CoveredShow>(
    `SELECT * FROM ${TABLE} ORDER BY show_name ASC`,
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
