import "server-only";
import { query } from "@/lib/server/postgres";
import { getColumnsForSurvey, getSurveyDefinition, type SurveyColumn } from "./definitions";
import { getAllSurveys } from "./repository";

export interface SurveyMetadata {
  key: string;
  title: string;
  description?: string;
  tableName: string;
  showId?: string | null;
  seasonNumber?: number | null;
  previewColumns: string[];
  columns: SurveyColumn[];
  allowShowFilters?: boolean;
  allowEpisodeFilters?: boolean;
}

export interface SurveyFilters {
  from?: string;
  to?: string;
  showId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface FetchSurveyResponsesOptions extends SurveyFilters {
  surveyKey: string;
  limit?: number;
  offset?: number;
}

export interface SurveyFetchResult {
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
  columns: SurveyColumn[];
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const EXPORT_ROW_LIMIT = 20000;

export async function listSurveys(): Promise<SurveyMetadata[]> {
  // Get surveys from database (source of truth for survey list)
  const dbSurveys = await getAllSurveys();

  // Merge with definitions to get column metadata
  return dbSurveys.map((dbSurvey) => {
    const definition = getSurveyDefinition(dbSurvey.key);

    if (!definition) {
      // Fallback: if no definition exists, return minimal metadata
      console.warn(`[surveys] No definition found for survey key: ${dbSurvey.key}`);
      return {
        key: dbSurvey.key,
        title: dbSurvey.title,
        description: dbSurvey.description ?? undefined,
        tableName: dbSurvey.response_table_name,
        showId: dbSurvey.show_id,
        seasonNumber: dbSurvey.season_number,
        previewColumns: [],
        columns: [],
        allowShowFilters: false,
        allowEpisodeFilters: false,
      };
    }

    // Merge DB record with definition metadata
    return {
      key: dbSurvey.key,
      title: dbSurvey.title, // Use DB title as source of truth
      description: dbSurvey.description ?? definition.description,
      tableName: dbSurvey.response_table_name,
      showId: dbSurvey.show_id,
      seasonNumber: dbSurvey.season_number,
      previewColumns: definition.previewColumns,
      columns: getColumnsForSurvey(definition),
      allowShowFilters: definition.allowShowFilters,
      allowEpisodeFilters: definition.allowEpisodeFilters,
    };
  });
}

export const listAdminSurveys = listSurveys;

function buildWhereClause(filters: SurveyFilters = {}, startIndex = 1) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  let index = startIndex;

  if (filters.from) {
    clauses.push(`created_at >= $${index++}`);
    values.push(filters.from);
  }
  if (filters.to) {
    clauses.push(`created_at <= $${index++}`);
    values.push(filters.to);
  }
  if (filters.showId) {
    clauses.push(`show_id = $${index++}`);
    values.push(filters.showId);
  }
  if (typeof filters.seasonNumber === "number" && Number.isFinite(filters.seasonNumber)) {
    clauses.push(`season_number = $${index++}`);
    values.push(filters.seasonNumber);
  }
  if (typeof filters.episodeNumber === "number" && Number.isFinite(filters.episodeNumber)) {
    clauses.push(`episode_number = $${index++}`);
    values.push(filters.episodeNumber);
  }

  return {
    clause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
    nextIndex: index,
  } as const;
}

export async function fetchSurveyResponses(options: FetchSurveyResponsesOptions): Promise<SurveyFetchResult> {
  const definition = getSurveyDefinition(options.surveyKey);
  if (!definition) throw new Error(`Unknown survey: ${options.surveyKey}`);

  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);
  const filters: SurveyFilters = {
    from: options.from,
    to: options.to,
    showId: options.showId,
    seasonNumber: options.seasonNumber,
    episodeNumber: options.episodeNumber,
  };

  const { clause, values, nextIndex } = buildWhereClause(filters, 1);
  const columns = getColumnsForSurvey(definition);
  const selectColumns = columns.map((column) => `"${column.name}"`).join(", ");

  const dataQuery = `
    SELECT ${selectColumns}
    FROM ${definition.tableName}
    ${clause}
    ORDER BY ${definition.defaultSortColumn ?? "created_at"} ${definition.defaultSortDirection ?? "desc"}
    LIMIT $${nextIndex}
    OFFSET $${nextIndex + 1}
  `;
  const dataValues = [...values, limit, offset];
  const result = await query<Record<string, unknown>>(dataQuery, dataValues);

  const { clause: countClause, values: countValues } = buildWhereClause(filters, 1);
  const countQuery = `SELECT COUNT(*)::int AS count FROM ${definition.tableName} ${countClause}`;
  const countResult = await query<{ count: number }>(countQuery, countValues);
  const total = countResult.rows[0]?.count ?? 0;

  return {
    rows: result.rows,
    total,
    limit,
    offset,
    columns,
  };
}

export async function fetchSurveyResponseById(
  surveyKey: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const definition = getSurveyDefinition(surveyKey);
  if (!definition) throw new Error(`Unknown survey: ${surveyKey}`);
  const columns = getColumnsForSurvey(definition);
  const selectColumns = columns.map((column) => `"${column.name}"`).join(", ");
  const sql = `SELECT ${selectColumns} FROM ${definition.tableName} WHERE id = $1 LIMIT 1`;
  const result = await query<Record<string, unknown>>(sql, [id]);
  return result.rows[0] ?? null;
}

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(" | ");
  if (typeof value === "object") return JSON.stringify(value);
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function exportSurveyResponses(
  surveyKey: string,
  filters: SurveyFilters,
): Promise<{ filename: string; csv: string }> {
  const definition = getSurveyDefinition(surveyKey);
  if (!definition) throw new Error(`Unknown survey: ${surveyKey}`);
  const columns = getColumnsForSurvey(definition);
  const headers = columns.map((column) => column.name);

  const { clause, values } = buildWhereClause(filters, 1);
  const sql = `
    SELECT ${columns.map((column) => `"${column.name}"`).join(", ")}
    FROM ${definition.tableName}
    ${clause}
    ORDER BY ${definition.defaultSortColumn ?? "created_at"} ${definition.defaultSortDirection ?? "desc"}
    LIMIT ${EXPORT_ROW_LIMIT}
  `;

  const result = await query<Record<string, unknown>>(sql, values);

  const lines = [headers.join(",")];
  for (const row of result.rows) {
    const cells = headers.map((column) => {
      const raw = (row as Record<string, unknown>)[column];
      const serialized = serializeValue(raw);
      const needsQuotes = /[",\n]/.test(serialized);
      if (!needsQuotes) return serialized;
      return `"${serialized.replace(/"/g, '""')}"`;
    });
    lines.push(cells.join(","));
  }

  const timestamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
  const filename = `${surveyKey}-responses-${timestamp}.csv`;
  return { filename, csv: lines.join("\n") };
}
