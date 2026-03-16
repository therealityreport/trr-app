import "server-only";

import { query, type AuthContext } from "@/lib/server/postgres";

export interface CoveredShow {
  id: string;
  trr_show_id: string;
  show_name: string;
  canonical_slug?: string | null;
  alternative_names?: string[] | null;
  show_total_episodes?: number | null;
  poster_url?: string | null;
  created_at: string;
  created_by_firebase_uid: string;
}

export interface CreateCoveredShowInput {
  trr_show_id: string;
  show_name: string;
}

interface CoveredShowRow {
  id: string;
  trr_show_id: string;
  show_name: string;
  created_at: string;
  created_by_firebase_uid: string;
}

interface CoveredShowQueryRow extends CoveredShowRow {
  core_show_name: string | null;
  slug: string | null;
  alternative_names: string[] | null;
  show_total_episodes: number | null;
  poster_url: string | null;
}

const normalizeSlug = (value: string | null | undefined): string => {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const buildCoveredShowRecords = (rows: CoveredShowQueryRow[]): CoveredShow[] => {
  const slugCounts = new Map<string, number>();

  for (const row of rows) {
    const computedSlug = normalizeSlug(row.core_show_name);
    if (!computedSlug) continue;
    slugCounts.set(computedSlug, (slugCounts.get(computedSlug) ?? 0) + 1);
  }

  return rows.map((row) => {
    const computedSlug = normalizeSlug(row.core_show_name);
    const canonicalBase = row.slug?.trim() || computedSlug || null;
    const collisionCount = computedSlug ? (slugCounts.get(computedSlug) ?? 0) : 0;
    const canonicalSlug =
      canonicalBase && collisionCount > 1
        ? `${canonicalBase}--${row.trr_show_id.slice(0, 8).toLowerCase()}`
        : canonicalBase;

    return {
      id: row.id,
      trr_show_id: row.trr_show_id,
      show_name: row.show_name,
      canonical_slug: canonicalSlug,
      alternative_names: row.alternative_names ?? null,
      show_total_episodes: row.show_total_episodes ?? null,
      poster_url: row.poster_url ?? null,
      created_at: row.created_at,
      created_by_firebase_uid: row.created_by_firebase_uid,
    };
  });
};

export async function getCoveredShows(): Promise<CoveredShow[]> {
  const result = await query<CoveredShowQueryRow>(
    `SELECT
       cs.id,
       cs.trr_show_id::text AS trr_show_id,
       cs.show_name,
       cs.created_at::text AS created_at,
       cs.created_by_firebase_uid,
       s.name AS core_show_name,
       s.slug,
       s.alternative_names,
       s.show_total_episodes,
       si.hosted_url AS poster_url
     FROM admin.covered_shows AS cs
     LEFT JOIN core.shows AS s
       ON s.id = cs.trr_show_id
     LEFT JOIN core.show_images AS si
       ON si.id = s.primary_poster_image_id
     ORDER BY cs.show_name ASC`,
  );
  return buildCoveredShowRecords(result.rows);
}

export async function getCoveredShowByTrrShowId(trrShowId: string): Promise<CoveredShow | null> {
  const shows = await getCoveredShows();
  return shows.find((row) => row.trr_show_id === trrShowId) ?? null;
}

export async function isShowCovered(trrShowId: string): Promise<boolean> {
  const result = await query<{ exists: number }>(
    `SELECT 1 AS exists
     FROM admin.covered_shows
     WHERE trr_show_id = $1::uuid
     LIMIT 1`,
    [trrShowId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getCoveredShowIds(): Promise<Set<string>> {
  const result = await query<Pick<CoveredShowRow, "trr_show_id">>(
    `SELECT trr_show_id::text AS trr_show_id
     FROM admin.covered_shows`,
  );
  const rows = result.rows;
  return new Set(rows.map((row) => row.trr_show_id));
}

export async function addCoveredShow(
  authContext: AuthContext,
  input: CreateCoveredShowInput,
): Promise<CoveredShow> {
  const firebaseUid = authContext.firebaseUid;
  if (!firebaseUid) {
    throw new Error("Firebase UID is required to add a covered show");
  }

  await query(
    `INSERT INTO admin.covered_shows (
       trr_show_id,
       show_name,
       created_by_firebase_uid
     ) VALUES (
       $1::uuid,
       $2::text,
       $3::text
     )
     ON CONFLICT (trr_show_id) DO UPDATE
     SET show_name = EXCLUDED.show_name`,
    [input.trr_show_id, input.show_name, firebaseUid],
  );

  const show = await getCoveredShowByTrrShowId(input.trr_show_id);
  if (!show) {
    throw new Error("Failed to load covered show after add");
  }
  return show;
}

export async function removeCoveredShow(
  _authContext: AuthContext,
  trrShowId: string,
): Promise<boolean> {
  const result = await query(
    `DELETE FROM admin.covered_shows
     WHERE trr_show_id = $1::uuid
     RETURNING id`,
    [trrShowId],
  );
  return (result.rowCount ?? 0) > 0;
}
