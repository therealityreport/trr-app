import "server-only";

import { query, withAuthTransaction, type AuthContext } from "@/lib/server/postgres";

// ============================================================================
// Types
// ============================================================================

export type SeasonSurveyCastRole = "main" | "friend_of";

export interface SeasonCastSurveyRoleRow {
  id: string;
  trr_show_id: string;
  season_number: number;
  person_id: string;
  role: SeasonSurveyCastRole;
  created_at: string;
  updated_at: string;
}

export interface UpsertSeasonCastSurveyRoleInput {
  trrShowId: string;
  seasonNumber: number;
  personId: string;
  role: SeasonSurveyCastRole;
}

export interface DeleteSeasonCastSurveyRoleInput {
  trrShowId: string;
  seasonNumber: number;
  personId: string;
}

// ============================================================================
// Table Helper
// ============================================================================

const TABLE = "admin.season_cast_survey_roles";

// ============================================================================
// Read Operations
// ============================================================================

export async function listSeasonCastSurveyRoles(
  trrShowId: string,
  seasonNumber: number,
): Promise<SeasonCastSurveyRoleRow[]> {
  const result = await query<SeasonCastSurveyRoleRow>(
    `SELECT * FROM ${TABLE}
     WHERE trr_show_id = $1 AND season_number = $2
     ORDER BY role ASC, created_at ASC`,
    [trrShowId, seasonNumber],
  );
  return result.rows;
}

// ============================================================================
// Write Operations
// ============================================================================

export async function upsertSeasonCastSurveyRole(
  authContext: AuthContext,
  input: UpsertSeasonCastSurveyRoleInput,
): Promise<SeasonCastSurveyRoleRow> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query<SeasonCastSurveyRoleRow>(
      `INSERT INTO ${TABLE} (trr_show_id, season_number, person_id, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (trr_show_id, season_number, person_id)
       DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [input.trrShowId, input.seasonNumber, input.personId, input.role],
    );
    return result.rows[0];
  });
}

export async function deleteSeasonCastSurveyRole(
  authContext: AuthContext,
  input: DeleteSeasonCastSurveyRoleInput,
): Promise<boolean> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query(
      `DELETE FROM ${TABLE}
       WHERE trr_show_id = $1 AND season_number = $2 AND person_id = $3`,
      [input.trrShowId, input.seasonNumber, input.personId],
    );
    return (result.rowCount ?? 0) > 0;
  });
}

export async function replaceSeasonCastSurveyRoles(
  authContext: AuthContext,
  trrShowId: string,
  seasonNumber: number,
  roles: Array<{ personId: string; role: SeasonSurveyCastRole }>,
): Promise<SeasonCastSurveyRoleRow[]> {
  return withAuthTransaction(authContext, async (client) => {
    await client.query(
      `DELETE FROM ${TABLE} WHERE trr_show_id = $1 AND season_number = $2`,
      [trrShowId, seasonNumber],
    );

    if (roles.length === 0) {
      return [];
    }

    const values: unknown[] = [];
    const tuples: string[] = [];
    let idx = 1;
    for (const row of roles) {
      tuples.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      values.push(trrShowId, seasonNumber, row.personId, row.role);
    }

    const result = await client.query<SeasonCastSurveyRoleRow>(
      `INSERT INTO ${TABLE} (trr_show_id, season_number, person_id, role)
       VALUES ${tuples.join(", ")}
       ON CONFLICT (trr_show_id, season_number, person_id)
       DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      values,
    );

    return result.rows;
  });
}

