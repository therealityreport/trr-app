import "server-only";
import { query } from "@/lib/server/postgres";
import { getSurveyDefinition, type SurveyDefinition } from "./definitions";

export interface SurveyUpsertPayload {
  surveyKey: string;
  appUserId: string;
  appUserEmail?: string | null;
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

  const answerColumns = new Set(definition.questionColumns.map((column) => column.column));
  const sanitizedAnswers = Object.entries(payload.answers ?? {}).filter(([column]) => answerColumns.has(column));

  const baseEntries: Array<[string, unknown]> = [
    ["respondent_id", payload.respondentId ?? null],
    ["app_user_id", payload.appUserId],
    ["app_user_email", payload.appUserEmail ?? null],
    ["source", payload.source ?? "trr_app"],
    ["show_id", payload.showId ?? definition.showId ?? null],
    ["season_number", payload.seasonNumber ?? definition.seasonNumber ?? null],
    ["episode_number", payload.episodeNumber ?? definition.defaultEpisodeNumber ?? null],
  ];

  const entries: Array<[string, unknown]> = [...baseEntries, ...sanitizedAnswers.map(([column, value]) => [column, value ?? null])];

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
