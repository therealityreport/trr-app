import "server-only";
import { query } from "@/lib/server/postgres";
import { getColumnsForSurvey, getSurveyDefinition, listSurveyDefinitions, type SurveyFieldDefinition } from "./definitions";

export interface SurveyAdminMetadata {
  key: string;
  name: string;
  description?: string;
  tableName: string;
  previewColumns: string[];
  columns: SurveyFieldDefinition[];
  allowShowFilters?: boolean;
  allowEpisodeFilters?: boolean;
}

export interface SurveyAdminFilters {
  from?: string;
  to?: string;
  showId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface SurveyListResult {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  columns: SurveyFieldDefinition[];
}

const MAX_PAGE_SIZE = 100;
const EXPORT_ROW_LIMIT = 20000;

export function listAdminSurveys(): SurveyAdminMetadata[] {
  return listSurveyDefinitions().map((definition) => ({
    key: definition.key,
    name: definition.name,
    description: definition.description,
    tableName: definition.tableName,
    previewColumns: definition.previewColumns,
    columns: getColumnsForSurvey(definition),
    allowShowFilters: definition.allowShowFilters,
    allowEpisodeFilters: definition.allowEpisodeFilters,
  }));
}

function buildWhereClause(filters: SurveyAdminFilters = {}, startIndex = 1) {
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

export async function fetchSurveyResponses(
  surveyKey: string,
  filters: SurveyAdminFilters,
  page = 1,
  pageSize = 25,
): Promise<SurveyListResult> {
  const definition = getSurveyDefinition(surveyKey);
  if (!definition) throw new Error(`Unknown survey: ${surveyKey}`);

  const cappedPageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * cappedPageSize;

  const { clause, values, nextIndex } = buildWhereClause(filters, 1);
  const selectColumns = getColumnsForSurvey(definition)
    .map((column) => `"${column.column}"`)
    .join(", ");

  const limitPlaceholder = `$${nextIndex}`;
  const offsetPlaceholder = `$${nextIndex + 1}`;

  const dataQuery = `
    SELECT ${selectColumns}
    FROM ${definition.tableName}
    ${clause}
    ORDER BY ${definition.defaultSortColumn ?? "created_at"} ${definition.defaultSortDirection ?? "desc"}
    LIMIT ${limitPlaceholder}
    OFFSET ${offsetPlaceholder}
  `;

  const dataValues = [...values, cappedPageSize, offset];
  const result = await query<Record<string, unknown>>(dataQuery, dataValues);

  const { clause: countClause, values: countValues } = buildWhereClause(filters, 1);
  const countQuery = `SELECT COUNT(*)::int AS count FROM ${definition.tableName} ${countClause}`;
  const countResult = await query<{ count: number }>(countQuery, countValues);
  const total = countResult.rows[0]?.count ?? 0;

  return {
    items: result.rows,
    total,
    page: safePage,
    pageSize: cappedPageSize,
    columns: getColumnsForSurvey(definition),
  };
}

export async function fetchSurveyResponseById(
  surveyKey: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const definition = getSurveyDefinition(surveyKey);
  if (!definition) throw new Error(`Unknown survey: ${surveyKey}`);
  const columns = getColumnsForSurvey(definition).map((column) => `"${column.column}"`).join(", ");
  const sql = `SELECT ${columns} FROM ${definition.tableName} WHERE id = $1 LIMIT 1`;
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
  filters: SurveyAdminFilters,
): Promise<{ filename: string; csv: string }> {
  const definition = getSurveyDefinition(surveyKey);
  if (!definition) throw new Error(`Unknown survey: ${surveyKey}`);
  const columns = getColumnsForSurvey(definition);
  const headers = columns.map((column) => column.column);

  const { clause, values } = buildWhereClause(filters, 1);
  const sql = `
    SELECT ${columns.map((column) => `"${column.column}"`).join(", ")}
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
