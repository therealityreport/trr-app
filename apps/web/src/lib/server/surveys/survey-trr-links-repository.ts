import "server-only";

import { query, withAuthTransaction, type AuthContext } from "@/lib/server/postgres";
import { t } from "./survey-schema";
import type { NormalizedSurvey } from "@/lib/surveys/normalized-types";

// ============================================================================
// Types
// ============================================================================

export interface SurveyTrrLink {
  survey_id: string;
  trr_show_id: string;
  trr_season_id: string | null;
  trr_episode_id: string | null;
  season_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedSurvey extends NormalizedSurvey {
  trr_link: SurveyTrrLink;
}

export interface CreateLinkInput {
  survey_id: string;
  trr_show_id: string;
  trr_season_id?: string | null;
  trr_episode_id?: string | null;
  season_number?: number | null;
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all surveys linked to a TRR show
 */
export async function getSurveysByTrrShowId(trrShowId: string): Promise<LinkedSurvey[]> {
  const result = await query<LinkedSurvey>(
    `SELECT
      s.*,
      json_build_object(
        'survey_id', l.survey_id,
        'trr_show_id', l.trr_show_id,
        'trr_season_id', l.trr_season_id,
        'trr_episode_id', l.trr_episode_id,
        'season_number', l.season_number,
        'created_at', l.created_at,
        'updated_at', l.updated_at
      ) as trr_link
    FROM ${t("surveys")} s
    JOIN ${t("survey_trr_links")} l ON s.id = l.survey_id
    WHERE l.trr_show_id = $1
    ORDER BY l.season_number DESC NULLS LAST, s.created_at DESC`,
    [trrShowId],
  );
  return result.rows;
}

/**
 * Get all surveys linked to a specific TRR season
 */
export async function getSurveysByTrrSeasonId(trrSeasonId: string): Promise<LinkedSurvey[]> {
  const result = await query<LinkedSurvey>(
    `SELECT
      s.*,
      json_build_object(
        'survey_id', l.survey_id,
        'trr_show_id', l.trr_show_id,
        'trr_season_id', l.trr_season_id,
        'trr_episode_id', l.trr_episode_id,
        'season_number', l.season_number,
        'created_at', l.created_at,
        'updated_at', l.updated_at
      ) as trr_link
    FROM ${t("surveys")} s
    JOIN ${t("survey_trr_links")} l ON s.id = l.survey_id
    WHERE l.trr_season_id = $1
    ORDER BY s.created_at DESC`,
    [trrSeasonId],
  );
  return result.rows;
}

/**
 * Get the TRR link for a survey by survey ID
 */
export async function getLinkBySurveyId(surveyId: string): Promise<SurveyTrrLink | null> {
  const result = await query<SurveyTrrLink>(
    `SELECT * FROM ${t("survey_trr_links")} WHERE survey_id = $1`,
    [surveyId],
  );
  return result.rows[0] ?? null;
}

/**
 * Check if a link already exists for a show+season combination
 */
export async function linkExistsForShowSeason(
  trrShowId: string,
  seasonNumber: number,
): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM ${t("survey_trr_links")}
      WHERE trr_show_id = $1 AND season_number = $2
    ) as exists`,
    [trrShowId, seasonNumber],
  );
  return result.rows[0]?.exists ?? false;
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Create a link between a survey and a TRR show/season
 */
export async function createLink(
  authContext: AuthContext,
  input: CreateLinkInput,
): Promise<SurveyTrrLink> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query<SurveyTrrLink>(
      `INSERT INTO ${t("survey_trr_links")} (
        survey_id, trr_show_id, trr_season_id, trr_episode_id, season_number
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        input.survey_id,
        input.trr_show_id,
        input.trr_season_id ?? null,
        input.trr_episode_id ?? null,
        input.season_number ?? null,
      ],
    );
    return result.rows[0];
  });
}

/**
 * Update an existing link
 */
export async function updateLink(
  authContext: AuthContext,
  surveyId: string,
  input: Partial<Omit<CreateLinkInput, "survey_id">>,
): Promise<SurveyTrrLink | null> {
  return withAuthTransaction(authContext, async (client) => {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.trr_show_id !== undefined) {
      sets.push(`trr_show_id = $${paramIndex++}`);
      values.push(input.trr_show_id);
    }
    if (input.trr_season_id !== undefined) {
      sets.push(`trr_season_id = $${paramIndex++}`);
      values.push(input.trr_season_id);
    }
    if (input.trr_episode_id !== undefined) {
      sets.push(`trr_episode_id = $${paramIndex++}`);
      values.push(input.trr_episode_id);
    }
    if (input.season_number !== undefined) {
      sets.push(`season_number = $${paramIndex++}`);
      values.push(input.season_number);
    }

    if (sets.length === 0) {
      return getLinkBySurveyId(surveyId);
    }

    values.push(surveyId);
    const result = await client.query<SurveyTrrLink>(
      `UPDATE ${t("survey_trr_links")} SET ${sets.join(", ")} WHERE survey_id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  });
}

/**
 * Delete a link by survey ID
 */
export async function deleteLink(
  authContext: AuthContext,
  surveyId: string,
): Promise<boolean> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query(
      `DELETE FROM ${t("survey_trr_links")} WHERE survey_id = $1`,
      [surveyId],
    );
    return (result.rowCount ?? 0) > 0;
  });
}
