import "server-only";

import { query, withAuthTransaction, type AuthContext } from "@/lib/server/postgres";

export interface RedditCommunityRow {
  id: string;
  trr_show_id: string;
  trr_show_name: string;
  subreddit: string;
  display_name: string | null;
  notes: string | null;
  post_flares: string[];
  post_flares_updated_at: string | null;
  is_active: boolean;
  created_by_firebase_uid: string;
  created_at: string;
  updated_at: string;
}

export interface RedditThreadRow {
  id: string;
  community_id: string;
  trr_show_id: string;
  trr_show_name: string;
  trr_season_id: string | null;
  reddit_post_id: string;
  title: string;
  url: string;
  permalink: string | null;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string | null;
  notes: string | null;
  created_by_firebase_uid: string;
  created_at: string;
  updated_at: string;
}

export interface RedditCommunityWithThreads extends RedditCommunityRow {
  assigned_threads: RedditThreadRow[];
  assigned_thread_count: number;
}

export interface ListRedditCommunitiesOptions {
  trrShowId?: string;
  includeInactive?: boolean;
}

export interface ListRedditCommunitiesWithThreadsOptions extends ListRedditCommunitiesOptions {
  trrSeasonId?: string | null;
  includeGlobalThreadsForSeason?: boolean;
}

export interface CreateRedditCommunityInput {
  trrShowId: string;
  trrShowName: string;
  subreddit: string;
  displayName?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateRedditCommunityInput {
  subreddit?: string;
  displayName?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface ListRedditThreadsOptions {
  communityId?: string;
  trrShowId?: string;
  trrSeasonId?: string | null;
  includeGlobalThreadsForSeason?: boolean;
}

export interface CreateRedditThreadInput {
  communityId: string;
  trrShowId: string;
  trrShowName: string;
  trrSeasonId?: string | null;
  redditPostId: string;
  title: string;
  url: string;
  permalink?: string | null;
  author?: string | null;
  score?: number | null;
  numComments?: number | null;
  postedAt?: string | null;
  notes?: string | null;
}

export interface UpdateRedditThreadInput {
  communityId?: string;
  trrSeasonId?: string | null;
  title?: string;
  url?: string;
  permalink?: string | null;
  author?: string | null;
  score?: number | null;
  numComments?: number | null;
  postedAt?: string | null;
  notes?: string | null;
}

const COMMUNITIES_TABLE = "admin.reddit_communities";
const THREADS_TABLE = "admin.reddit_threads";

const SUBREDDIT_RE = /^[A-Za-z0-9_]{2,21}$/;

interface RedditCommunityRowRaw extends Omit<RedditCommunityRow, "post_flares"> {
  post_flares: unknown;
}

const toThreadsArray = (value: unknown): RedditThreadRow[] => {
  if (!Array.isArray(value)) return [];
  return value as RedditThreadRow[];
};

const toPostFlaresArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const flair = item.trim();
    if (!flair) continue;
    const key = flair.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(flair);
  }
  return out;
};

const toNumberOrZero = (value: number | null | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
};

const toCommunityRow = (row: RedditCommunityRowRaw): RedditCommunityRow => ({
  ...row,
  post_flares: toPostFlaresArray(row.post_flares),
});

export const normalizeSubreddit = (value: string): string => {
  let cleaned = value.trim();
  cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?reddit\.com\/r\//i, "");
  cleaned = cleaned.replace(/^r\//i, "");
  cleaned = cleaned.replace(/^\/+|\/+$/g, "");
  cleaned = cleaned.split(/[/?#]/, 1)[0] ?? cleaned;
  return cleaned;
};

export const isValidSubreddit = (value: string): boolean => SUBREDDIT_RE.test(value);

export async function listRedditCommunities(
  options: ListRedditCommunitiesOptions = {},
): Promise<RedditCommunityRow[]> {
  const includeInactive = options.includeInactive ?? false;
  const result = await query<RedditCommunityRowRaw>(
    `SELECT *
       FROM ${COMMUNITIES_TABLE}
      WHERE ($1::uuid IS NULL OR trr_show_id = $1::uuid)
        AND ($2::boolean OR is_active = true)
      ORDER BY trr_show_name ASC, lower(subreddit) ASC`,
    [options.trrShowId ?? null, includeInactive],
  );
  return result.rows.map(toCommunityRow);
}

interface CommunitiesWithThreadsRow extends RedditCommunityRowRaw {
  assigned_threads: unknown;
  assigned_thread_count: number | null;
}

export async function listRedditCommunitiesWithThreads(
  options: ListRedditCommunitiesWithThreadsOptions = {},
): Promise<RedditCommunityWithThreads[]> {
  const includeInactive = options.includeInactive ?? false;
  const includeGlobalThreadsForSeason = options.includeGlobalThreadsForSeason ?? true;
  const result = await query<CommunitiesWithThreadsRow>(
    `SELECT
        c.*,
        COALESCE(
          json_agg(t ORDER BY t.posted_at DESC NULLS LAST, t.created_at DESC)
          FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS assigned_threads,
        COUNT(t.id)::int AS assigned_thread_count
      FROM ${COMMUNITIES_TABLE} c
      LEFT JOIN ${THREADS_TABLE} t
        ON t.community_id = c.id
       AND (
          $3::uuid IS NULL
          OR t.trr_season_id = $3::uuid
          OR ($4::boolean AND t.trr_season_id IS NULL)
       )
      WHERE ($1::uuid IS NULL OR c.trr_show_id = $1::uuid)
        AND ($2::boolean OR c.is_active = true)
      GROUP BY c.id
      ORDER BY c.trr_show_name ASC, lower(c.subreddit) ASC`,
    [options.trrShowId ?? null, includeInactive, options.trrSeasonId ?? null, includeGlobalThreadsForSeason],
  );

  return result.rows.map((row) => ({
    ...toCommunityRow(row),
    assigned_threads: toThreadsArray(row.assigned_threads),
    assigned_thread_count: toNumberOrZero(row.assigned_thread_count),
  }));
}

export async function getRedditCommunityById(id: string): Promise<RedditCommunityRow | null> {
  const result = await query<RedditCommunityRowRaw>(
    `SELECT * FROM ${COMMUNITIES_TABLE} WHERE id = $1::uuid LIMIT 1`,
    [id],
  );
  const row = result.rows[0];
  return row ? toCommunityRow(row) : null;
}

export async function createRedditCommunity(
  authContext: AuthContext,
  input: CreateRedditCommunityInput,
): Promise<RedditCommunityRow> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query<RedditCommunityRowRaw>(
      `INSERT INTO ${COMMUNITIES_TABLE} (
        trr_show_id,
        trr_show_name,
        subreddit,
        display_name,
        notes,
        is_active,
        created_by_firebase_uid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        input.trrShowId,
        input.trrShowName,
        input.subreddit,
        input.displayName ?? null,
        input.notes ?? null,
        input.isActive ?? true,
        authContext.firebaseUid,
      ],
    );
    return toCommunityRow(result.rows[0]);
  });
}

export async function updateRedditCommunity(
  authContext: AuthContext,
  id: string,
  input: UpdateRedditCommunityInput,
): Promise<RedditCommunityRow | null> {
  return withAuthTransaction(authContext, async (client) => {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.subreddit !== undefined) {
      sets.push(`subreddit = $${idx++}`);
      values.push(input.subreddit);
    }
    if (input.displayName !== undefined) {
      sets.push(`display_name = $${idx++}`);
      values.push(input.displayName);
    }
    if (input.notes !== undefined) {
      sets.push(`notes = $${idx++}`);
      values.push(input.notes);
    }
    if (input.isActive !== undefined) {
      sets.push(`is_active = $${idx++}`);
      values.push(input.isActive);
    }

    if (sets.length === 0) {
      return getRedditCommunityById(id);
    }

    values.push(id);
    const result = await client.query<RedditCommunityRowRaw>(
      `UPDATE ${COMMUNITIES_TABLE}
          SET ${sets.join(", ")}
        WHERE id = $${idx}::uuid
      RETURNING *`,
      values,
    );
    const row = result.rows[0];
    return row ? toCommunityRow(row) : null;
  });
}

export async function updateRedditCommunityPostFlares(
  authContext: AuthContext,
  id: string,
  postFlares: string[],
  postFlaresUpdatedAt: string,
): Promise<RedditCommunityRow | null> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query<RedditCommunityRowRaw>(
      `UPDATE ${COMMUNITIES_TABLE}
          SET post_flares = $1::jsonb,
              post_flares_updated_at = $2::timestamptz
        WHERE id = $3::uuid
      RETURNING *`,
      [JSON.stringify(postFlares), postFlaresUpdatedAt, id],
    );
    const row = result.rows[0];
    return row ? toCommunityRow(row) : null;
  });
}

export async function deleteRedditCommunity(
  authContext: AuthContext,
  id: string,
): Promise<boolean> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query(
      `DELETE FROM ${COMMUNITIES_TABLE} WHERE id = $1::uuid`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  });
}

export async function listRedditThreads(
  options: ListRedditThreadsOptions = {},
): Promise<RedditThreadRow[]> {
  const includeGlobalThreadsForSeason = options.includeGlobalThreadsForSeason ?? true;
  const result = await query<RedditThreadRow>(
    `SELECT *
       FROM ${THREADS_TABLE}
      WHERE ($1::uuid IS NULL OR community_id = $1::uuid)
        AND ($2::uuid IS NULL OR trr_show_id = $2::uuid)
        AND (
          $3::uuid IS NULL
          OR trr_season_id = $3::uuid
          OR ($4::boolean AND trr_season_id IS NULL)
        )
      ORDER BY posted_at DESC NULLS LAST, created_at DESC`,
    [
      options.communityId ?? null,
      options.trrShowId ?? null,
      options.trrSeasonId ?? null,
      includeGlobalThreadsForSeason,
    ],
  );
  return result.rows;
}

export async function getRedditThreadById(id: string): Promise<RedditThreadRow | null> {
  const result = await query<RedditThreadRow>(
    `SELECT * FROM ${THREADS_TABLE} WHERE id = $1::uuid LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function createRedditThread(
  authContext: AuthContext,
  input: CreateRedditThreadInput,
): Promise<RedditThreadRow> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query<RedditThreadRow>(
      `INSERT INTO ${THREADS_TABLE} (
        community_id,
        trr_show_id,
        trr_show_name,
        trr_season_id,
        reddit_post_id,
        title,
        url,
        permalink,
        author,
        score,
        num_comments,
        posted_at,
        notes,
        created_by_firebase_uid
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      ON CONFLICT (trr_show_id, reddit_post_id)
      DO UPDATE SET
        community_id = EXCLUDED.community_id,
        trr_show_name = EXCLUDED.trr_show_name,
        trr_season_id = EXCLUDED.trr_season_id,
        title = EXCLUDED.title,
        url = EXCLUDED.url,
        permalink = EXCLUDED.permalink,
        author = EXCLUDED.author,
        score = EXCLUDED.score,
        num_comments = EXCLUDED.num_comments,
        posted_at = EXCLUDED.posted_at,
        notes = EXCLUDED.notes
      RETURNING *`,
      [
        input.communityId,
        input.trrShowId,
        input.trrShowName,
        input.trrSeasonId ?? null,
        input.redditPostId,
        input.title,
        input.url,
        input.permalink ?? null,
        input.author ?? null,
        toNumberOrZero(input.score ?? 0),
        toNumberOrZero(input.numComments ?? 0),
        input.postedAt ?? null,
        input.notes ?? null,
        authContext.firebaseUid,
      ],
    );
    return result.rows[0];
  });
}

export async function updateRedditThread(
  authContext: AuthContext,
  id: string,
  input: UpdateRedditThreadInput,
): Promise<RedditThreadRow | null> {
  return withAuthTransaction(authContext, async (client) => {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.communityId !== undefined) {
      sets.push(`community_id = $${idx++}`);
      values.push(input.communityId);
    }
    if (input.trrSeasonId !== undefined) {
      sets.push(`trr_season_id = $${idx++}`);
      values.push(input.trrSeasonId);
    }
    if (input.title !== undefined) {
      sets.push(`title = $${idx++}`);
      values.push(input.title);
    }
    if (input.url !== undefined) {
      sets.push(`url = $${idx++}`);
      values.push(input.url);
    }
    if (input.permalink !== undefined) {
      sets.push(`permalink = $${idx++}`);
      values.push(input.permalink);
    }
    if (input.author !== undefined) {
      sets.push(`author = $${idx++}`);
      values.push(input.author);
    }
    if (input.score !== undefined) {
      sets.push(`score = $${idx++}`);
      values.push(toNumberOrZero(input.score));
    }
    if (input.numComments !== undefined) {
      sets.push(`num_comments = $${idx++}`);
      values.push(toNumberOrZero(input.numComments));
    }
    if (input.postedAt !== undefined) {
      sets.push(`posted_at = $${idx++}`);
      values.push(input.postedAt);
    }
    if (input.notes !== undefined) {
      sets.push(`notes = $${idx++}`);
      values.push(input.notes);
    }

    if (sets.length === 0) {
      return getRedditThreadById(id);
    }

    values.push(id);
    const result = await client.query<RedditThreadRow>(
      `UPDATE ${THREADS_TABLE}
          SET ${sets.join(", ")}
        WHERE id = $${idx}::uuid
      RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  });
}

export async function deleteRedditThread(
  authContext: AuthContext,
  id: string,
): Promise<boolean> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query(
      `DELETE FROM ${THREADS_TABLE} WHERE id = $1::uuid`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  });
}
