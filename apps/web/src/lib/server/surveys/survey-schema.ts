/**
 * Schema name for Firebase-authenticated normalized surveys.
 *
 * This schema is separate from the legacy `surveys.*` schema which uses
 * Supabase Auth (UUID user_id via auth.uid()). The firebase_surveys schema
 * uses Firebase Auth (text user_id via app.firebase_uid session variable).
 */
export const SURVEY_SCHEMA = "firebase_surveys";

/**
 * Helper to prefix table names with the schema.
 *
 * IMPORTANT: Only pass hardcoded table names to this function.
 * Never pass user input - identifiers cannot be parameterized.
 *
 * @example
 * // Returns "firebase_surveys.survey_runs"
 * t('survey_runs')
 */
export const t = (table: string): string => `${SURVEY_SCHEMA}.${table}`;
