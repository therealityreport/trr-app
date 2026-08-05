import "server-only";

import {
  AdminReadProxyError,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

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

type SeasonCastSurveyRoleReadOptions = {
  adminContext: VerifiedAdminContext;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const ROLE_ROW_KEYS = new Set([
  "id",
  "trr_show_id",
  "season_number",
  "person_id",
  "role",
  "created_at",
  "updated_at",
]);
const ROLES_ENVELOPE_KEYS = new Set(["roles"]);
const ROLE_ENVELOPE_KEYS = new Set(["role"]);
const DELETE_ENVELOPE_KEYS = new Set(["success", "removed"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
  Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));

const isRole = (value: unknown): value is SeasonSurveyCastRole =>
  value === "main" || value === "friend_of";

const isRfc3339 = (value: unknown): value is string =>
  typeof value === "string" &&
  RFC3339_PATTERN.test(value) &&
  Number.isFinite(Date.parse(value));

const invalidBackendResponse = (): AdminReadProxyError =>
  new AdminReadProxyError("TRR-Backend returned an invalid season cast survey-role response", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });

const parseRoleRow = (value: unknown): SeasonCastSurveyRoleRow => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ROLE_ROW_KEYS) ||
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    typeof value.trr_show_id !== "string" ||
    !UUID_PATTERN.test(value.trr_show_id) ||
    typeof value.season_number !== "number" ||
    !Number.isSafeInteger(value.season_number) ||
    value.season_number < 1 ||
    typeof value.person_id !== "string" ||
    !UUID_PATTERN.test(value.person_id) ||
    !isRole(value.role) ||
    !isRfc3339(value.created_at) ||
    !isRfc3339(value.updated_at)
  ) {
    throw invalidBackendResponse();
  }
  return {
    id: value.id,
    trr_show_id: value.trr_show_id,
    season_number: value.season_number,
    person_id: value.person_id,
    role: value.role,
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
};

const assertScope = (
  rows: readonly SeasonCastSurveyRoleRow[],
  trrShowId: string,
  seasonNumber: number,
): void => {
  if (
    rows.some(
      (row) =>
        row.trr_show_id.toLowerCase() !== trrShowId.toLowerCase() ||
        row.season_number !== seasonNumber,
    )
  ) {
    throw invalidBackendResponse();
  }
};

const parseRolesEnvelope = (
  value: Record<string, unknown>,
  trrShowId: string,
  seasonNumber: number,
): SeasonCastSurveyRoleRow[] => {
  if (!hasExactKeys(value, ROLES_ENVELOPE_KEYS) || !Array.isArray(value.roles)) {
    throw invalidBackendResponse();
  }
  const roles = value.roles.map(parseRoleRow);
  assertScope(roles, trrShowId, seasonNumber);
  return roles;
};

const parseRoleEnvelope = (
  value: Record<string, unknown>,
  input: UpsertSeasonCastSurveyRoleInput,
): SeasonCastSurveyRoleRow => {
  if (!hasExactKeys(value, ROLE_ENVELOPE_KEYS)) throw invalidBackendResponse();
  const role = parseRoleRow(value.role);
  assertScope([role], input.trrShowId, input.seasonNumber);
  if (role.person_id.toLowerCase() !== input.personId.toLowerCase() || role.role !== input.role) {
    throw invalidBackendResponse();
  }
  return role;
};

const rolePath = (trrShowId: string, seasonNumber: number): string =>
  `/admin/shows/${encodeURIComponent(trrShowId)}/seasons/${encodeURIComponent(String(seasonNumber))}/cast-survey-roles`;

const throwForStatus = (
  status: number,
  data: Record<string, unknown>,
  fallbackMessage: string,
): never => {
  throw buildAdminBackendStatusError({
    status,
    data,
    fallbackMessage,
    routeName: "season-cast-survey-roles",
  });
};

export async function listSeasonCastSurveyRoles(
  trrShowId: string,
  seasonNumber: number,
  options: SeasonCastSurveyRoleReadOptions,
): Promise<SeasonCastSurveyRoleRow[]> {
  const upstream = await fetchAdminBackendJson(rolePath(trrShowId, seasonNumber), {
    apiVersion: "v2",
    adminContext: options.adminContext,
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName: "season-cast-survey-roles",
  });
  if (upstream.status !== 200) {
    throwForStatus(upstream.status, upstream.data, "Failed to list season cast survey roles");
  }
  return parseRolesEnvelope(upstream.data, trrShowId, seasonNumber);
}

export async function upsertSeasonCastSurveyRole(
  adminContext: VerifiedAdminContext,
  input: UpsertSeasonCastSurveyRoleInput,
): Promise<SeasonCastSurveyRoleRow> {
  const upstream = await fetchAdminBackendJson(rolePath(input.trrShowId, input.seasonNumber), {
    apiVersion: "v2",
    adminContext,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ person_id: input.personId, role: input.role }),
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName: "season-cast-survey-roles",
  });
  if (upstream.status !== 200) {
    throwForStatus(upstream.status, upstream.data, "Failed to upsert a season cast survey role");
  }
  return parseRoleEnvelope(upstream.data, input);
}

export async function deleteSeasonCastSurveyRole(
  adminContext: VerifiedAdminContext,
  input: DeleteSeasonCastSurveyRoleInput,
): Promise<boolean> {
  const upstream = await fetchAdminBackendJson(rolePath(input.trrShowId, input.seasonNumber), {
    apiVersion: "v2",
    adminContext,
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ person_id: input.personId }),
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName: "season-cast-survey-roles",
  });
  if (upstream.status !== 200) {
    throwForStatus(upstream.status, upstream.data, "Failed to delete a season cast survey role");
  }
  if (
    !hasExactKeys(upstream.data, DELETE_ENVELOPE_KEYS) ||
    upstream.data.success !== true ||
    typeof upstream.data.removed !== "boolean"
  ) {
    throw invalidBackendResponse();
  }
  return upstream.data.removed;
}

export async function replaceSeasonCastSurveyRoles(
  adminContext: VerifiedAdminContext,
  trrShowId: string,
  seasonNumber: number,
  roles: Array<{ personId: string; role: SeasonSurveyCastRole }>,
): Promise<SeasonCastSurveyRoleRow[]> {
  const upstream = await fetchAdminBackendJson(rolePath(trrShowId, seasonNumber), {
    apiVersion: "v2",
    adminContext,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roles: roles.map((entry) => ({ person_id: entry.personId, role: entry.role })),
    }),
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName: "season-cast-survey-roles",
  });
  if (upstream.status !== 200) {
    throwForStatus(upstream.status, upstream.data, "Failed to replace season cast survey roles");
  }
  const parsed = parseRolesEnvelope(upstream.data, trrShowId, seasonNumber);
  const expected = new Map(roles.map((entry) => [entry.personId.toLowerCase(), entry.role]));
  if (
    parsed.length !== roles.length ||
    parsed.some((row) => expected.get(row.person_id.toLowerCase()) !== row.role)
  ) {
    throw invalidBackendResponse();
  }
  return parsed;
}
