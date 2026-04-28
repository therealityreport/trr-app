import "server-only";

import {
  getOrCreateRouteResponsePromise,
  getRouteResponseCache,
  invalidateRouteResponseCache,
  setRouteResponseCache,
} from "@/lib/server/admin/route-response-cache";
import { query } from "@/lib/server/postgres";
import { buildSeededTypographyState, buildTypographyStateSnapshot } from "@/lib/server/admin/typography-seed";
import { normalizeRoleConfig } from "@/lib/typography/runtime";
import type {
  TypographyArea,
  TypographyAssignment,
  TypographyRoleConfig,
  TypographySet,
  TypographyState,
} from "@/lib/typography/types";

type TypographySetRow = {
  id: string;
  slug: string;
  name: string;
  area: TypographyArea;
  seed_source: string;
  roles: unknown;
  created_at: string;
  updated_at: string;
};

type TypographyAssignmentRow = {
  id: string;
  area: TypographyArea;
  page_key: string | null;
  instance_key: string | null;
  set_id: string;
  source_path: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const TYPOGRAPHY_STATE_CACHE_NAMESPACE = "typography-state";
const TYPOGRAPHY_STATE_CACHE_KEY = "state";
const TYPOGRAPHY_STATE_CACHE_TTL_MS = 30_000;
const SEEDED_SNAPSHOT = buildTypographyStateSnapshot();
const SEEDED_SET_ID_TO_SLUG = new Map(SEEDED_SNAPSHOT.sets.map((set) => [set.id, set.slug]));

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRoles(value: unknown): Record<string, TypographyRoleConfig> {
  if (!isRecord(value)) return {};
  const next: Record<string, TypographyRoleConfig> = {};
  for (const [key, role] of Object.entries(value)) {
    const normalized = normalizeRoleConfig(role as Partial<TypographyRoleConfig>);
    if (!normalized) continue;
    next[key] = normalized;
  }
  return next;
}

function mapSet(row: TypographySetRow): TypographySet {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    area: row.area,
    seedSource: row.seed_source,
    roles: parseRoles(row.roles),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssignment(row: TypographyAssignmentRow): TypographyAssignment {
  return {
    id: row.id,
    area: row.area,
    pageKey: row.page_key,
    instanceKey: row.instance_key,
    setId: row.set_id,
    sourcePath: row.source_path,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isConcurrentUpdateError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown };
  return record.code === "XX000" && typeof record.message === "string" && record.message.includes("tuple concurrently updated");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function invalidateTypographyStateCache(): void {
  invalidateRouteResponseCache(TYPOGRAPHY_STATE_CACHE_NAMESPACE, TYPOGRAPHY_STATE_CACHE_KEY);
}

// Schema ownership moved to backend migration
// 20260427140000_quarantine_typography_runtime_ddl.sql (Wave A E1/I4 mirror, 2026-04-27).
// Request-time schema bootstrap was removed; runtime now assumes the backend
// migration has applied site_typography_sets / site_typography_assignments.

async function seedTypographyIfMissing(): Promise<void> {
  const seeded = buildSeededTypographyState();

  for (const set of seeded.sets) {
    await query(
      `INSERT INTO site_typography_sets (slug, name, area, seed_source, roles)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (slug) DO NOTHING`,
      [set.slug, set.name, set.area, set.seedSource, JSON.stringify(set.roles)],
    );
  }

  const existingSetsResult = await query<TypographySetRow>(
    `SELECT id, slug, name, area, seed_source, roles, created_at, updated_at
     FROM site_typography_sets`
  );
  const setIdBySlug = new Map(existingSetsResult.rows.map((row) => [row.slug, row.id]));

  for (const assignment of seeded.assignments) {
    const setId = setIdBySlug.get(assignment.setSlug);
    if (!setId) continue;
    await query(
      `INSERT INTO site_typography_assignments (area, page_key, instance_key, set_id, source_path, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (
         area,
         COALESCE(page_key, ''),
         COALESCE(instance_key, '')
       ) DO NOTHING`,
      [assignment.area, assignment.pageKey, assignment.instanceKey, setId, assignment.sourcePath, assignment.notes],
    );
  }
}

function isMissingTypographyTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown };
  if (record.code !== "42P01") return false;
  return String(record.message ?? "").toLowerCase().includes("site_typography_");
}

async function resolveTypographySetId(setId: string): Promise<string> {
  await seedTypographyIfMissing();

  const seededSlug = SEEDED_SET_ID_TO_SLUG.get(setId);
  if (!seededSlug) {
    return setId;
  }

  const resolved = await query<{ id: string }>(
    `SELECT id
     FROM site_typography_sets
     WHERE slug = $1
     LIMIT 1`,
    [seededSlug],
  );
  return resolved.rows[0]?.id ?? setId;
}

async function readPersistedTypographyState(): Promise<TypographyState | null> {
  try {
    const [setsResult, assignmentsResult] = await Promise.all([
      query<TypographySetRow>(
        `SELECT id, slug, name, area, seed_source, roles, created_at, updated_at
         FROM site_typography_sets
         ORDER BY area ASC, name ASC`
      ),
      query<TypographyAssignmentRow>(
        `SELECT id, area, page_key, instance_key, set_id, source_path, notes, created_at, updated_at
         FROM site_typography_assignments
         ORDER BY area ASC, page_key ASC NULLS FIRST, instance_key ASC NULLS FIRST, source_path ASC`
      ),
    ]);

    if (setsResult.rows.length === 0 && assignmentsResult.rows.length === 0) {
      return null;
    }

    return {
      sets: setsResult.rows.map(mapSet),
      assignments: assignmentsResult.rows.map(mapAssignment),
    };
  } catch (error) {
    if (isMissingTypographyTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function getTypographyState(): Promise<TypographyState> {
  const cached = getRouteResponseCache<TypographyState>(TYPOGRAPHY_STATE_CACHE_NAMESPACE, TYPOGRAPHY_STATE_CACHE_KEY);
  if (cached) {
    return cached;
  }

  return getOrCreateRouteResponsePromise(TYPOGRAPHY_STATE_CACHE_NAMESPACE, TYPOGRAPHY_STATE_CACHE_KEY, async () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const state = (await readPersistedTypographyState()) ?? SEEDED_SNAPSHOT;
        setRouteResponseCache(
          TYPOGRAPHY_STATE_CACHE_NAMESPACE,
          TYPOGRAPHY_STATE_CACHE_KEY,
          state,
          TYPOGRAPHY_STATE_CACHE_TTL_MS,
        );
        return state;
      } catch (error) {
        if (!isConcurrentUpdateError(error) || attempt === 3) {
          throw error;
        }
      }

      await sleep(50 * attempt);
    }

    const fallback = SEEDED_SNAPSHOT;
    setRouteResponseCache(
      TYPOGRAPHY_STATE_CACHE_NAMESPACE,
      TYPOGRAPHY_STATE_CACHE_KEY,
      fallback,
      TYPOGRAPHY_STATE_CACHE_TTL_MS,
    );
    return fallback;
  });
}

export interface CreateTypographySetInput {
  slug?: string;
  name: string;
  area: TypographyArea;
  seedSource: string;
  roles: Record<string, TypographyRoleConfig>;
}

export async function createTypographySet(input: CreateTypographySetInput): Promise<TypographySet> {
  await seedTypographyIfMissing();
  const slug = (input.slug?.trim() || input.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const result = await query<TypographySetRow>(
    `INSERT INTO site_typography_sets (slug, name, area, seed_source, roles)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, slug, name, area, seed_source, roles, created_at, updated_at`,
    [slug, input.name.trim(), input.area, input.seedSource.trim(), JSON.stringify(input.roles)],
  );
  invalidateTypographyStateCache();
  return mapSet(result.rows[0]!);
}

export interface UpdateTypographySetInput {
  name?: string;
  area?: TypographyArea;
  seedSource?: string;
  roles?: Record<string, TypographyRoleConfig>;
}

export async function updateTypographySet(setId: string, input: UpdateTypographySetInput): Promise<TypographySet | null> {
  const resolvedSetId = await resolveTypographySetId(setId);
  const updates: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${index++}`);
    values.push(input.name.trim());
  }
  if (input.area !== undefined) {
    updates.push(`area = $${index++}`);
    values.push(input.area);
  }
  if (input.seedSource !== undefined) {
    updates.push(`seed_source = $${index++}`);
    values.push(input.seedSource.trim());
  }
  if (input.roles !== undefined) {
    updates.push(`roles = $${index++}::jsonb`);
    values.push(JSON.stringify(input.roles));
  }

  if (updates.length === 0) {
    const state = await getTypographyState();
    return state.sets.find((set) => set.id === setId || set.id === resolvedSetId) ?? null;
  }

  values.push(resolvedSetId);
  const result = await query<TypographySetRow>(
    `UPDATE site_typography_sets
     SET ${updates.join(", ")}
     WHERE id = $${index}
     RETURNING id, slug, name, area, seed_source, roles, created_at, updated_at`,
    values,
  );
  if (result.rows[0]) {
    invalidateTypographyStateCache();
  }
  return result.rows[0] ? mapSet(result.rows[0]) : null;
}

export async function deleteTypographySet(setId: string): Promise<"deleted" | "in-use" | "missing"> {
  const resolvedSetId = await resolveTypographySetId(setId);
  const assignments = await query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM site_typography_assignments
     WHERE set_id = $1`,
    [resolvedSetId],
  );
  if (Number(assignments.rows[0]?.count ?? "0") > 0) {
    return "in-use";
  }
  const result = await query(`DELETE FROM site_typography_sets WHERE id = $1`, [resolvedSetId]);
  if ((result.rowCount ?? 0) > 0) {
    invalidateTypographyStateCache();
  }
  return (result.rowCount ?? 0) > 0 ? "deleted" : "missing";
}

export interface UpdateTypographyAssignmentInput {
  area: TypographyArea;
  pageKey?: string | null;
  instanceKey?: string | null;
  setId: string;
  sourcePath: string;
  notes?: string | null;
}

export async function upsertTypographyAssignment(input: UpdateTypographyAssignmentInput): Promise<TypographyAssignment> {
  const resolvedSetId = await resolveTypographySetId(input.setId);
  const existing = await query<TypographyAssignmentRow>(
    `SELECT id, area, page_key, instance_key, set_id, source_path, notes, created_at, updated_at
     FROM site_typography_assignments
     WHERE area = $1
       AND COALESCE(page_key, '') = COALESCE($2, '')
       AND COALESCE(instance_key, '') = COALESCE($3, '')`,
    [input.area, input.pageKey ?? null, input.instanceKey ?? null],
  );

  if (existing.rows[0]) {
    const updated = await query<TypographyAssignmentRow>(
      `UPDATE site_typography_assignments
       SET set_id = $1, source_path = $2, notes = $3
       WHERE id = $4
       RETURNING id, area, page_key, instance_key, set_id, source_path, notes, created_at, updated_at`,
      [resolvedSetId, input.sourcePath.trim(), input.notes ?? null, existing.rows[0].id],
    );
    invalidateTypographyStateCache();
    return mapAssignment(updated.rows[0]!);
  }

  const inserted = await query<TypographyAssignmentRow>(
    `INSERT INTO site_typography_assignments (area, page_key, instance_key, set_id, source_path, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, area, page_key, instance_key, set_id, source_path, notes, created_at, updated_at`,
    [input.area, input.pageKey ?? null, input.instanceKey ?? null, resolvedSetId, input.sourcePath.trim(), input.notes ?? null],
  );
  invalidateTypographyStateCache();
  return mapAssignment(inserted.rows[0]!);
}
