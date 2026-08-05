import "server-only";

import {
  AdminReadProxyError,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";
import { normalizeRoleConfig } from "@/lib/typography/runtime";
import type {
  TypographyArea,
  TypographyAssignment,
  TypographyRoleConfig,
  TypographySet,
  TypographyState,
} from "@/lib/typography/types";

const TYPOGRAPHY_AREAS = new Set<TypographyArea>(["user-frontend", "surveys", "admin"]);
const TYPOGRAPHY_SET_KEYS = new Set([
  "id",
  "slug",
  "name",
  "area",
  "seed_source",
  "roles",
  "created_at",
  "updated_at",
]);
const TYPOGRAPHY_ASSIGNMENT_KEYS = new Set([
  "id",
  "area",
  "page_key",
  "instance_key",
  "set_id",
  "source_path",
  "notes",
  "created_at",
  "updated_at",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
  Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));

const isTypographyArea = (value: unknown): value is TypographyArea =>
  typeof value === "string" && TYPOGRAPHY_AREAS.has(value as TypographyArea);

const optionalString = (value: unknown): string | null | undefined => {
  if (value === null || value === undefined) return value;
  return typeof value === "string" ? value : undefined;
};

const invalidBackendResponse = (): AdminReadProxyError =>
  new AdminReadProxyError("TRR-Backend returned an invalid typography response", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });

function parseRoles(value: unknown): Record<string, TypographyRoleConfig> {
  if (!isRecord(value)) throw invalidBackendResponse();
  const parsed: Record<string, TypographyRoleConfig> = {};
  for (const [key, role] of Object.entries(value)) {
    const normalized = normalizeRoleConfig(role as Partial<TypographyRoleConfig>);
    if (!normalized) throw invalidBackendResponse();
    parsed[key] = normalized;
  }
  if (Object.keys(parsed).length === 0) throw invalidBackendResponse();
  return parsed;
}

export function parseTypographySet(value: unknown): TypographySet {
  if (!isRecord(value) || !hasExactKeys(value, TYPOGRAPHY_SET_KEYS)) throw invalidBackendResponse();
  if (
    typeof value.id !== "string" ||
    typeof value.slug !== "string" ||
    typeof value.name !== "string" ||
    !isTypographyArea(value.area) ||
    typeof value.seed_source !== "string" ||
    typeof value.created_at !== "string" ||
    typeof value.updated_at !== "string"
  ) {
    throw invalidBackendResponse();
  }
  return {
    id: value.id,
    slug: value.slug,
    name: value.name,
    area: value.area,
    seedSource: value.seed_source,
    roles: parseRoles(value.roles),
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function parseTypographyAssignment(value: unknown): TypographyAssignment {
  if (!isRecord(value) || !hasExactKeys(value, TYPOGRAPHY_ASSIGNMENT_KEYS)) throw invalidBackendResponse();
  const pageKey = optionalString(value.page_key);
  const instanceKey = optionalString(value.instance_key);
  const notes = optionalString(value.notes);
  if (
    typeof value.id !== "string" ||
    !isTypographyArea(value.area) ||
    pageKey === undefined ||
    instanceKey === undefined ||
    typeof value.set_id !== "string" ||
    typeof value.source_path !== "string" ||
    notes === undefined ||
    typeof value.created_at !== "string" ||
    typeof value.updated_at !== "string"
  ) {
    throw invalidBackendResponse();
  }
  return {
    id: value.id,
    area: value.area,
    pageKey,
    instanceKey,
    setId: value.set_id,
    sourcePath: value.source_path,
    notes,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function parseTypographyStatePayload(value: unknown): TypographyState {
  if (!isRecord(value) || !hasExactKeys(value, new Set(["sets", "assignments"]))) {
    throw invalidBackendResponse();
  }
  if (!Array.isArray(value.sets) || !Array.isArray(value.assignments)) throw invalidBackendResponse();
  return {
    sets: value.sets.map(parseTypographySet),
    assignments: value.assignments.map(parseTypographyAssignment),
  };
}

export function parseTypographySetPayload(value: unknown): TypographySet {
  if (!isRecord(value) || !hasExactKeys(value, new Set(["set"]))) throw invalidBackendResponse();
  return parseTypographySet(value.set);
}

export function parseTypographyAssignmentPayload(value: unknown): TypographyAssignment {
  if (!isRecord(value) || !hasExactKeys(value, new Set(["assignment"]))) throw invalidBackendResponse();
  return parseTypographyAssignment(value.assignment);
}

const backendFailure = (status: number, data: Record<string, unknown>, fallbackMessage: string, routeName: string) =>
  buildAdminBackendStatusError({ status, data, fallbackMessage, routeName });

export async function getTypographyState(options?: { adminContext?: VerifiedAdminContext }): Promise<TypographyState> {
  const routeName = "site-typography:state";
  const upstream = await fetchAdminBackendJson("/admin/site-typography", {
    apiVersion: "v2",
    adminContext: options?.adminContext,
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName,
  });
  if (upstream.status !== 200) throw backendFailure(upstream.status, upstream.data, "Failed to fetch typography state", routeName);
  return parseTypographyStatePayload(upstream.data);
}

export interface CreateTypographySetInput {
  slug?: string;
  name: string;
  area: TypographyArea;
  seedSource: string;
  roles: Record<string, TypographyRoleConfig>;
}

export async function createTypographySet(
  input: CreateTypographySetInput,
  options?: { adminContext?: VerifiedAdminContext },
): Promise<TypographySet> {
  const routeName = "site-typography:create-set";
  const upstream = await fetchAdminBackendJson("/admin/site-typography/sets", {
    apiVersion: "v2",
    method: "POST",
    adminContext: options?.adminContext,
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input.slug?.trim() ? { slug: input.slug.trim() } : {}),
      name: input.name.trim(),
      area: input.area,
      seed_source: input.seedSource.trim(),
      roles: input.roles,
    }),
  });
  if (upstream.status !== 201) throw backendFailure(upstream.status, upstream.data, "Failed to create typography set", routeName);
  return parseTypographySetPayload(upstream.data);
}

export interface UpdateTypographySetInput {
  name?: string;
  area?: TypographyArea;
  seedSource?: string;
  roles?: Record<string, TypographyRoleConfig>;
}

export async function updateTypographySet(
  setId: string,
  input: UpdateTypographySetInput,
  options?: { adminContext?: VerifiedAdminContext },
): Promise<TypographySet | null> {
  const routeName = "site-typography:update-set";
  const upstream = await fetchAdminBackendJson(`/admin/site-typography/sets/${encodeURIComponent(setId)}`, {
    apiVersion: "v2",
    method: "PUT",
    adminContext: options?.adminContext,
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.area !== undefined ? { area: input.area } : {}),
      ...(input.seedSource !== undefined ? { seed_source: input.seedSource.trim() } : {}),
      ...(input.roles !== undefined ? { roles: input.roles } : {}),
    }),
  });
  if (upstream.status === 404) return null;
  if (upstream.status !== 200) throw backendFailure(upstream.status, upstream.data, "Failed to update typography set", routeName);
  return parseTypographySetPayload(upstream.data);
}

export async function deleteTypographySet(
  setId: string,
  options?: { adminContext?: VerifiedAdminContext },
): Promise<"deleted" | "in-use" | "missing"> {
  const routeName = "site-typography:delete-set";
  const upstream = await fetchAdminBackendJson(`/admin/site-typography/sets/${encodeURIComponent(setId)}`, {
    apiVersion: "v2",
    method: "DELETE",
    adminContext: options?.adminContext,
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName,
  });
  if (upstream.status === 404) return "missing";
  if (upstream.status === 409) return "in-use";
  if (upstream.status !== 200) throw backendFailure(upstream.status, upstream.data, "Failed to delete typography set", routeName);
  if (!isRecord(upstream.data) || !hasExactKeys(upstream.data, new Set(["ok"])) || upstream.data.ok !== true) {
    throw invalidBackendResponse();
  }
  return "deleted";
}

export interface UpdateTypographyAssignmentInput {
  area: TypographyArea;
  pageKey?: string | null;
  instanceKey?: string | null;
  setId: string;
  sourcePath: string;
  notes?: string | null;
}

export async function upsertTypographyAssignment(
  input: UpdateTypographyAssignmentInput,
  options?: { adminContext?: VerifiedAdminContext },
): Promise<TypographyAssignment> {
  const routeName = "site-typography:upsert-assignment";
  const upstream = await fetchAdminBackendJson("/admin/site-typography/assignments", {
    apiVersion: "v2",
    method: "PUT",
    adminContext: options?.adminContext,
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      area: input.area,
      page_key: input.pageKey ?? null,
      instance_key: input.instanceKey ?? null,
      set_id: input.setId,
      source_path: input.sourcePath.trim(),
      notes: input.notes ?? null,
    }),
  });
  if (upstream.status !== 200) throw backendFailure(upstream.status, upstream.data, "Failed to update typography assignment", routeName);
  return parseTypographyAssignmentPayload(upstream.data);
}
