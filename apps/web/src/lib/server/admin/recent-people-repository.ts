import "server-only";

import { query, withAuthTransaction, type AuthContext } from "@/lib/server/postgres";

const TABLE = "admin.recent_people_views";
const DEFAULT_RECENT_LIMIT = 20;
const MAX_RECENT_LIMIT = 50;
const UNDEFINED_TABLE_ERROR_CODE = "42P01";

export interface RecentPersonView {
  person_id: string;
  full_name: string | null;
  known_for: string | null;
  photo_url: string | null;
  show_context: string | null;
  view_count: number;
  first_viewed_at: string;
  last_viewed_at: string;
}

export interface RecentPersonViewMutation {
  personId: string;
  showContext?: string | null;
}

const normalizeLimit = (value: number | undefined): number => {
  const parsed = Number.isFinite(value) ? Number(value) : DEFAULT_RECENT_LIMIT;
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_RECENT_LIMIT);
};

const normalizeShowContext = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isMissingRecentPeopleViewsTableError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const pgError = error as { code?: string; message?: string };
  if (pgError.code !== UNDEFINED_TABLE_ERROR_CODE) return false;
  const message = String(pgError.message ?? "").toLowerCase();
  return message.includes("recent_people_views");
};

export async function getRecentPeopleViews(
  firebaseUid: string,
  options?: { limit?: number },
): Promise<RecentPersonView[]> {
  const limit = normalizeLimit(options?.limit);
  try {
    const result = await query<RecentPersonView>(
      `SELECT
         rv.person_id,
         p.full_name,
         p.known_for,
         COALESCE(photo.thumb_url, photo.display_url, photo.hosted_url, photo.url) AS photo_url,
         rv.show_context,
         rv.view_count,
         rv.first_viewed_at,
         rv.last_viewed_at
       FROM ${TABLE} AS rv
       JOIN core.people AS p
         ON p.id = rv.person_id
       LEFT JOIN LATERAL (
         SELECT
           cp.thumb_url,
           cp.display_url,
           cp.hosted_url,
           cp.url
         FROM core.v_cast_photos AS cp
         WHERE cp.person_id = rv.person_id
         ORDER BY
           CASE
             WHEN lower(COALESCE(cp.context_section, '')) = 'bravo_profile' THEN 0
             WHEN lower(COALESCE(cp.context_section, '')) IN ('official season announcement', 'official_season_announcement') THEN 1
             ELSE 2
           END,
           cp.gallery_index ASC NULLS LAST
         LIMIT 1
       ) AS photo ON true
       WHERE rv.firebase_uid = $1
       ORDER BY rv.last_viewed_at DESC, rv.person_id ASC
       LIMIT $2`,
      [firebaseUid, limit],
    );

    return result.rows;
  } catch (error) {
    if (isMissingRecentPeopleViewsTableError(error)) {
      console.warn(
        `[recent-people] ${TABLE} is missing; returning empty recent-views list until migrations are applied`,
      );
      return [];
    }
    throw error;
  }
}

export async function recordRecentPersonView(
  authContext: AuthContext,
  input: RecentPersonViewMutation,
  options?: { cap?: number },
): Promise<void> {
  const firebaseUid = authContext.firebaseUid?.trim();
  if (!firebaseUid) {
    throw new Error("Firebase UID is required to record recent person views");
  }

  const cap = normalizeLimit(options?.cap ?? DEFAULT_RECENT_LIMIT);
  const showContext = normalizeShowContext(input.showContext);

  try {
    await withAuthTransaction(authContext, async (client) => {
      await client.query(
        `INSERT INTO ${TABLE} (
           firebase_uid,
           person_id,
           show_context,
           view_count,
           first_viewed_at,
           last_viewed_at
         )
         VALUES ($1, $2::uuid, $3, 1, now(), now())
         ON CONFLICT (firebase_uid, person_id)
         DO UPDATE SET
           show_context = COALESCE(EXCLUDED.show_context, ${TABLE}.show_context),
           view_count = ${TABLE}.view_count + 1,
           last_viewed_at = now(),
           updated_at = now()`,
        [firebaseUid, input.personId, showContext],
      );

      await client.query(
        `DELETE FROM ${TABLE} AS stale
         USING (
           SELECT person_id
           FROM (
             SELECT
               person_id,
               row_number() OVER (
                 PARTITION BY firebase_uid
                 ORDER BY last_viewed_at DESC, updated_at DESC, person_id ASC
               ) AS row_num
             FROM ${TABLE}
             WHERE firebase_uid = $1
           ) AS ranked
           WHERE ranked.row_num > $2
         ) AS overflow
         WHERE stale.firebase_uid = $1
           AND stale.person_id = overflow.person_id`,
        [firebaseUid, cap],
      );
    });
  } catch (error) {
    if (isMissingRecentPeopleViewsTableError(error)) {
      console.warn(
        `[recent-people] ${TABLE} is missing; skipping recent-view write until migrations are applied`,
      );
      return;
    }
    throw error;
  }
}
