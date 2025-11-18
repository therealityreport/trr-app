import "server-only";
import { query } from "@/lib/server/postgres";
import { getQuestionColumns, getSurveyDefinition, type SurveyDefinition } from "./definitions";

export interface SurveyUpsertPayload {
  surveyKey: string;
  appUserId: string;
  appUserEmail?: string | null;
  appUsername?: string | null;
  respondentId?: string | null;
  source?: string | null;
  showId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  answers: Record<string, unknown>;
}

function ensureDefinition(key: string): SurveyDefinition {
  const definition = getSurveyDefinition(key);
  if (!definition) {
    throw new Error(`Unknown survey key: ${key}`);
  }
  return definition;
}

export async function upsertSurveyResponse(payload: SurveyUpsertPayload): Promise<void> {
  const definition = ensureDefinition(payload.surveyKey);
  if (!payload.appUserId) throw new Error("appUserId is required for survey responses");

  const questionColumns = getQuestionColumns(definition);
  const columnsByName = new Map(questionColumns.map((col) => [col.name, col]));
  const answerColumns = new Set(questionColumns.map((column) => column.name));
  const sanitizedAnswers = Object.entries(payload.answers ?? {}).filter(([column]) => answerColumns.has(column));

  const baseEntries: Array<[string, unknown]> = [
    ["respondent_id", payload.respondentId ?? null],
    ["app_user_id", payload.appUserId],
    ["app_user_email", payload.appUserEmail ?? null],
    ["app_username", payload.appUsername ?? null],
    ["source", payload.source ?? "trr_app"],
    ["show_id", payload.showId ?? definition.showId ?? null],
    ["season_number", payload.seasonNumber ?? definition.seasonNumber ?? null],
    ["episode_number", payload.episodeNumber ?? definition.defaultEpisodeNumber ?? null],
  ];

  const answerEntries: Array<[string, unknown]> = sanitizedAnswers.map(([column, value]) => {
    const columnDef = columnsByName.get(column);
    // Serialize json/jsonb columns as JSON strings
    if (columnDef?.type === "json" && value !== null && value !== undefined) {
      return [column, JSON.stringify(value)] as [string, unknown];
    }
    return [column, value ?? null] as [string, unknown];
  });
  const entries: Array<[string, unknown]> = [...baseEntries, ...answerEntries];

  if (entries.length === 0) {
    throw new Error(`No columns to insert for survey ${definition.key}`);
  }

  const columnsSql = entries.map(([column]) => `"${column}"`).join(", ");
  const valuesSql = entries.map((_, idx) => `$${idx + 1}`).join(", ");
  const values = entries.map(([, value]) => (value ?? null));

  const updateColumns = entries
    .map(([column]) => column)
    .filter((column) => !definition.upsertColumns.includes(column));

  const updateSql = updateColumns.length
    ? `${updateColumns.map((column) => `"${column}" = EXCLUDED."${column}"`).join(", ")}, updated_at = NOW()`
    : "updated_at = NOW()";

  const conflictSql = definition.upsertColumns.map((column) => `"${column}"`).join(", ");

  const text = `
    INSERT INTO ${definition.tableName} (${columnsSql})
    VALUES (${valuesSql})
    ON CONFLICT (${conflictSql})
    DO UPDATE SET ${updateSql}
  `;

  await query(text, values);
}

// ============================================================================
// Surveys Table Repository
// ============================================================================

export interface SurveyRecord {
  id: string;
  key: string;
  title: string;
  description: string | null;
  response_table_name: string;
  show_id: string | null;
  season_number: number | null;
  episode_number: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getAllSurveys(): Promise<SurveyRecord[]> {
  const result = await query<SurveyRecord>(
    "SELECT * FROM surveys WHERE is_active = true ORDER BY created_at ASC"
  );
  return result.rows;
}

export async function getSurveyByKey(key: string): Promise<SurveyRecord | null> {
  const result = await query<SurveyRecord>(
    "SELECT * FROM surveys WHERE key = $1 AND is_active = true",
    [key]
  );
  return result.rows[0] ?? null;
}
