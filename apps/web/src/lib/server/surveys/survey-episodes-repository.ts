import "server-only";
import { query, withTransaction } from "@/lib/server/postgres";

// ============================================================================
// Types
// ============================================================================

export interface SurveyEpisodeRecord {
  id: string;
  survey_id: string;
  episode_number: number;
  episode_id: string;
  episode_label: string | null;
  air_date: string | null;
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
  is_current: boolean;
  firestore_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEpisodeInput {
  surveyId: string;
  episodeNumber: number;
  episodeId: string;
  episodeLabel?: string | null;
  airDate?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  isActive?: boolean;
  isCurrent?: boolean;
}

export interface UpdateEpisodeInput {
  episodeNumber?: number;
  episodeId?: string;
  episodeLabel?: string | null;
  airDate?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  isActive?: boolean;
  isCurrent?: boolean;
  firestoreSyncedAt?: string | null;
}

// ============================================================================
// Repository Functions
// ============================================================================

/**
 * Get all episodes for a survey, ordered by episode_number
 */
export async function getEpisodesBySurveyId(surveyId: string): Promise<SurveyEpisodeRecord[]> {
  const result = await query<SurveyEpisodeRecord>(
    `SELECT
      id, survey_id, episode_number, episode_id, episode_label,
      air_date, opens_at, closes_at, is_active, is_current,
      firestore_synced_at, created_at, updated_at
    FROM survey_episodes
    WHERE survey_id = $1
    ORDER BY episode_number ASC`,
    [surveyId]
  );
  return result.rows;
}

/**
 * Get all episodes for a survey by survey key
 */
export async function getEpisodesBySurveyKey(surveyKey: string): Promise<SurveyEpisodeRecord[]> {
  const result = await query<SurveyEpisodeRecord>(
    `SELECT
      se.id, se.survey_id, se.episode_number, se.episode_id, se.episode_label,
      se.air_date, se.opens_at, se.closes_at, se.is_active, se.is_current,
      se.firestore_synced_at, se.created_at, se.updated_at
    FROM survey_episodes se
    INNER JOIN surveys s ON s.id = se.survey_id
    WHERE s.key = $1
    ORDER BY se.episode_number ASC`,
    [surveyKey]
  );
  return result.rows;
}

/**
 * Get the current episode for a survey
 */
export async function getCurrentEpisode(surveyKey: string): Promise<SurveyEpisodeRecord | null> {
  const result = await query<SurveyEpisodeRecord>(
    `SELECT
      se.id, se.survey_id, se.episode_number, se.episode_id, se.episode_label,
      se.air_date, se.opens_at, se.closes_at, se.is_active, se.is_current,
      se.firestore_synced_at, se.created_at, se.updated_at
    FROM survey_episodes se
    INNER JOIN surveys s ON s.id = se.survey_id
    WHERE s.key = $1 AND se.is_current = true
    LIMIT 1`,
    [surveyKey]
  );
  return result.rows[0] ?? null;
}

/**
 * Get a single episode by ID
 */
export async function getEpisodeById(id: string): Promise<SurveyEpisodeRecord | null> {
  const result = await query<SurveyEpisodeRecord>(
    `SELECT
      id, survey_id, episode_number, episode_id, episode_label,
      air_date, opens_at, closes_at, is_active, is_current,
      firestore_synced_at, created_at, updated_at
    FROM survey_episodes
    WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

/**
 * Get episode by survey and episode_id (e.g., "E01")
 */
export async function getEpisodeByEpisodeId(
  surveyKey: string,
  episodeId: string
): Promise<SurveyEpisodeRecord | null> {
  const result = await query<SurveyEpisodeRecord>(
    `SELECT
      se.id, se.survey_id, se.episode_number, se.episode_id, se.episode_label,
      se.air_date, se.opens_at, se.closes_at, se.is_active, se.is_current,
      se.firestore_synced_at, se.created_at, se.updated_at
    FROM survey_episodes se
    INNER JOIN surveys s ON s.id = se.survey_id
    WHERE s.key = $1 AND se.episode_id = $2`,
    [surveyKey, episodeId]
  );
  return result.rows[0] ?? null;
}

/**
 * Create a new episode
 */
export async function createEpisode(input: CreateEpisodeInput): Promise<SurveyEpisodeRecord> {
  const result = await query<SurveyEpisodeRecord>(
    `INSERT INTO survey_episodes (
      survey_id, episode_number, episode_id, episode_label,
      air_date, opens_at, closes_at, is_active, is_current
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING
      id, survey_id, episode_number, episode_id, episode_label,
      air_date, opens_at, closes_at, is_active, is_current,
      firestore_synced_at, created_at, updated_at`,
    [
      input.surveyId,
      input.episodeNumber,
      input.episodeId,
      input.episodeLabel ?? null,
      input.airDate ?? null,
      input.opensAt ?? null,
      input.closesAt ?? null,
      input.isActive ?? true,
      input.isCurrent ?? false,
    ]
  );
  return result.rows[0];
}

/**
 * Update an existing episode
 */
export async function updateEpisode(
  id: string,
  input: UpdateEpisodeInput
): Promise<SurveyEpisodeRecord | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.episodeNumber !== undefined) {
    updates.push(`episode_number = $${paramIndex++}`);
    values.push(input.episodeNumber);
  }
  if (input.episodeId !== undefined) {
    updates.push(`episode_id = $${paramIndex++}`);
    values.push(input.episodeId);
  }
  if (input.episodeLabel !== undefined) {
    updates.push(`episode_label = $${paramIndex++}`);
    values.push(input.episodeLabel);
  }
  if (input.airDate !== undefined) {
    updates.push(`air_date = $${paramIndex++}`);
    values.push(input.airDate);
  }
  if (input.opensAt !== undefined) {
    updates.push(`opens_at = $${paramIndex++}`);
    values.push(input.opensAt);
  }
  if (input.closesAt !== undefined) {
    updates.push(`closes_at = $${paramIndex++}`);
    values.push(input.closesAt);
  }
  if (input.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(input.isActive);
  }
  if (input.isCurrent !== undefined) {
    updates.push(`is_current = $${paramIndex++}`);
    values.push(input.isCurrent);
  }
  if (input.firestoreSyncedAt !== undefined) {
    updates.push(`firestore_synced_at = $${paramIndex++}`);
    values.push(input.firestoreSyncedAt);
  }

  if (updates.length === 0) {
    return getEpisodeById(id);
  }

  values.push(id);
  const result = await query<SurveyEpisodeRecord>(
    `UPDATE survey_episodes
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING
      id, survey_id, episode_number, episode_id, episode_label,
      air_date, opens_at, closes_at, is_active, is_current,
      firestore_synced_at, created_at, updated_at`,
    values
  );
  return result.rows[0] ?? null;
}

/**
 * Delete an episode
 */
export async function deleteEpisode(id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM survey_episodes WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Set an episode as current (and unset all others for the survey)
 */
export async function setCurrentEpisode(
  surveyId: string,
  episodeId: string
): Promise<SurveyEpisodeRecord | null> {
  return withTransaction(async (client) => {
    // Unset all current episodes for this survey
    await client.query(
      `UPDATE survey_episodes SET is_current = false WHERE survey_id = $1`,
      [surveyId]
    );

    // Set the new current episode
    const result = await client.query<SurveyEpisodeRecord>(
      `UPDATE survey_episodes
      SET is_current = true
      WHERE id = $1 AND survey_id = $2
      RETURNING
        id, survey_id, episode_number, episode_id, episode_label,
        air_date, opens_at, closes_at, is_active, is_current,
        firestore_synced_at, created_at, updated_at`,
      [episodeId, surveyId]
    );

    // Update the survey's current_episode_id
    await client.query(
      `UPDATE surveys SET current_episode_id = $1 WHERE id = $2`,
      [episodeId, surveyId]
    );

    return result.rows[0] ?? null;
  });
}

/**
 * Progress to the next episode
 */
export async function progressToNextEpisode(surveyKey: string): Promise<SurveyEpisodeRecord | null> {
  const currentEpisode = await getCurrentEpisode(surveyKey);
  if (!currentEpisode) {
    // No current episode, get the first one
    const episodes = await getEpisodesBySurveyKey(surveyKey);
    if (episodes.length === 0) return null;
    return setCurrentEpisode(episodes[0].survey_id, episodes[0].id);
  }

  // Find the next episode by episode_number
  const result = await query<SurveyEpisodeRecord>(
    `SELECT
      se.id, se.survey_id, se.episode_number, se.episode_id, se.episode_label,
      se.air_date, se.opens_at, se.closes_at, se.is_active, se.is_current,
      se.firestore_synced_at, se.created_at, se.updated_at
    FROM survey_episodes se
    WHERE se.survey_id = $1
      AND se.episode_number > $2
      AND se.is_active = true
    ORDER BY se.episode_number ASC
    LIMIT 1`,
    [currentEpisode.survey_id, currentEpisode.episode_number]
  );

  const nextEpisode = result.rows[0];
  if (!nextEpisode) return null;

  return setCurrentEpisode(nextEpisode.survey_id, nextEpisode.id);
}

/**
 * Get episodes that are scheduled to open
 */
export async function getEpisodesScheduledToOpen(beforeTime: Date): Promise<SurveyEpisodeRecord[]> {
  const result = await query<SurveyEpisodeRecord>(
    `SELECT
      id, survey_id, episode_number, episode_id, episode_label,
      air_date, opens_at, closes_at, is_active, is_current,
      firestore_synced_at, created_at, updated_at
    FROM survey_episodes
    WHERE opens_at IS NOT NULL
      AND opens_at <= $1
      AND is_active = true
      AND is_current = false
    ORDER BY opens_at ASC`,
    [beforeTime.toISOString()]
  );
  return result.rows;
}

/**
 * Bulk create episodes for a survey (useful for seeding)
 */
export async function bulkCreateEpisodes(
  surveyId: string,
  episodes: Omit<CreateEpisodeInput, "surveyId">[]
): Promise<SurveyEpisodeRecord[]> {
  const results: SurveyEpisodeRecord[] = [];
  for (const episode of episodes) {
    const created = await createEpisode({
      ...episode,
      surveyId,
    });
    results.push(created);
  }
  return results;
}
