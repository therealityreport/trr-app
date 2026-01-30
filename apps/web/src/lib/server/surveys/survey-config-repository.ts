import "server-only";
import { query } from "@/lib/server/postgres";
import type { SurveyTheme } from "@/lib/surveys/types";

// ============================================================================
// Types
// ============================================================================

export interface AirSchedule {
  airDays: string[];      // ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  airTime: string;        // "20:00" (24-hour format)
  timezone: string;       // "America/New_York"
  autoProgress: boolean;
}

export interface SurveyConfigRecord {
  id: string;
  key: string;
  title: string;
  description: string | null;
  response_table_name: string;
  show_id: string | null;
  season_number: number | null;
  episode_number: number | null;
  is_active: boolean;
  theme: Partial<SurveyTheme> | null;
  air_schedule: AirSchedule | null;
  current_episode_id: string | null;
  firestore_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSurveyInput {
  key: string;
  title: string;
  description?: string | null;
  responseTableName: string;
  showId?: string | null;
  seasonNumber?: number | null;
  theme?: Partial<SurveyTheme> | null;
  airSchedule?: AirSchedule | null;
  firestorePath?: string | null;
}

export interface UpdateSurveyInput {
  title?: string;
  description?: string | null;
  showId?: string | null;
  seasonNumber?: number | null;
  isActive?: boolean;
  theme?: Partial<SurveyTheme> | null;
  airSchedule?: AirSchedule | null;
  currentEpisodeId?: string | null;
  firestorePath?: string | null;
}

// ============================================================================
// Repository Functions
// ============================================================================

/**
 * Get all surveys with full config (theme, air_schedule, etc.)
 */
export async function getAllSurveyConfigs(): Promise<SurveyConfigRecord[]> {
  const result = await query<SurveyConfigRecord>(
    `SELECT
      id, key, title, description, response_table_name,
      show_id, season_number, episode_number, is_active,
      theme, air_schedule, current_episode_id, firestore_path,
      created_at, updated_at
    FROM surveys
    ORDER BY created_at ASC`
  );
  return result.rows.map(parseJsonFields);
}

/**
 * Get active surveys only
 */
export async function getActiveSurveyConfigs(): Promise<SurveyConfigRecord[]> {
  const result = await query<SurveyConfigRecord>(
    `SELECT
      id, key, title, description, response_table_name,
      show_id, season_number, episode_number, is_active,
      theme, air_schedule, current_episode_id, firestore_path,
      created_at, updated_at
    FROM surveys
    WHERE is_active = true
    ORDER BY created_at ASC`
  );
  return result.rows.map(parseJsonFields);
}

/**
 * Get a single survey by key with full config
 */
export async function getSurveyConfigByKey(key: string): Promise<SurveyConfigRecord | null> {
  const result = await query<SurveyConfigRecord>(
    `SELECT
      id, key, title, description, response_table_name,
      show_id, season_number, episode_number, is_active,
      theme, air_schedule, current_episode_id, firestore_path,
      created_at, updated_at
    FROM surveys
    WHERE key = $1`,
    [key]
  );
  const row = result.rows[0];
  return row ? parseJsonFields(row) : null;
}

/**
 * Get a single survey by ID with full config
 */
export async function getSurveyConfigById(id: string): Promise<SurveyConfigRecord | null> {
  const result = await query<SurveyConfigRecord>(
    `SELECT
      id, key, title, description, response_table_name,
      show_id, season_number, episode_number, is_active,
      theme, air_schedule, current_episode_id, firestore_path,
      created_at, updated_at
    FROM surveys
    WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? parseJsonFields(row) : null;
}

/**
 * Create a new survey
 */
export async function createSurvey(input: CreateSurveyInput): Promise<SurveyConfigRecord> {
  const result = await query<SurveyConfigRecord>(
    `INSERT INTO surveys (
      key, title, description, response_table_name,
      show_id, season_number, theme, air_schedule, firestore_path
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING
      id, key, title, description, response_table_name,
      show_id, season_number, episode_number, is_active,
      theme, air_schedule, current_episode_id, firestore_path,
      created_at, updated_at`,
    [
      input.key,
      input.title,
      input.description ?? null,
      input.responseTableName,
      input.showId ?? null,
      input.seasonNumber ?? null,
      input.theme ? JSON.stringify(input.theme) : null,
      input.airSchedule ? JSON.stringify(input.airSchedule) : null,
      input.firestorePath ?? null,
    ]
  );
  return parseJsonFields(result.rows[0]);
}

/**
 * Update an existing survey by key
 */
export async function updateSurveyByKey(
  key: string,
  input: UpdateSurveyInput
): Promise<SurveyConfigRecord | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.showId !== undefined) {
    updates.push(`show_id = $${paramIndex++}`);
    values.push(input.showId);
  }
  if (input.seasonNumber !== undefined) {
    updates.push(`season_number = $${paramIndex++}`);
    values.push(input.seasonNumber);
  }
  if (input.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(input.isActive);
  }
  if (input.theme !== undefined) {
    updates.push(`theme = $${paramIndex++}`);
    values.push(input.theme ? JSON.stringify(input.theme) : null);
  }
  if (input.airSchedule !== undefined) {
    updates.push(`air_schedule = $${paramIndex++}`);
    values.push(input.airSchedule ? JSON.stringify(input.airSchedule) : null);
  }
  if (input.currentEpisodeId !== undefined) {
    updates.push(`current_episode_id = $${paramIndex++}`);
    values.push(input.currentEpisodeId);
  }
  if (input.firestorePath !== undefined) {
    updates.push(`firestore_path = $${paramIndex++}`);
    values.push(input.firestorePath);
  }

  if (updates.length === 0) {
    return getSurveyConfigByKey(key);
  }

  values.push(key);
  const result = await query<SurveyConfigRecord>(
    `UPDATE surveys
    SET ${updates.join(", ")}
    WHERE key = $${paramIndex}
    RETURNING
      id, key, title, description, response_table_name,
      show_id, season_number, episode_number, is_active,
      theme, air_schedule, current_episode_id, firestore_path,
      created_at, updated_at`,
    values
  );
  const row = result.rows[0];
  return row ? parseJsonFields(row) : null;
}

/**
 * Update survey theme only
 */
export async function updateSurveyTheme(
  key: string,
  theme: Partial<SurveyTheme> | null
): Promise<SurveyConfigRecord | null> {
  return updateSurveyByKey(key, { theme });
}

/**
 * Update survey air schedule only
 */
export async function updateSurveyAirSchedule(
  key: string,
  airSchedule: AirSchedule | null
): Promise<SurveyConfigRecord | null> {
  return updateSurveyByKey(key, { airSchedule });
}

/**
 * Deactivate a survey (soft delete)
 */
export async function deactivateSurvey(key: string): Promise<boolean> {
  const result = await query(
    `UPDATE surveys SET is_active = false WHERE key = $1`,
    [key]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get surveys that need episode progression check
 */
export async function getSurveysWithAutoProgress(): Promise<SurveyConfigRecord[]> {
  const result = await query<SurveyConfigRecord>(
    `SELECT
      id, key, title, description, response_table_name,
      show_id, season_number, episode_number, is_active,
      theme, air_schedule, current_episode_id, firestore_path,
      created_at, updated_at
    FROM surveys
    WHERE is_active = true
      AND air_schedule IS NOT NULL
      AND (air_schedule->>'autoProgress')::boolean = true
    ORDER BY created_at ASC`
  );
  return result.rows.map(parseJsonFields);
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse JSONB fields from database row
 * PostgreSQL returns JSONB as parsed objects, but we ensure consistency
 */
function parseJsonFields(row: SurveyConfigRecord): SurveyConfigRecord {
  return {
    ...row,
    theme: typeof row.theme === "string" ? JSON.parse(row.theme) : row.theme,
    air_schedule: typeof row.air_schedule === "string" ? JSON.parse(row.air_schedule) : row.air_schedule,
  };
}
