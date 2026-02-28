import "server-only";

import { toCanonicalFlairKey } from "@/lib/reddit/flair-key";
import { normalizeRedditFlairLabel } from "@/lib/server/admin/reddit-flair-normalization";
import { query } from "@/lib/server/postgres";
import type { RedditDiscoveryThread, RedditListingSort } from "@/lib/server/admin/reddit-discovery-service";

const DISCOVERY_POSTS_TABLE = "admin.reddit_discovery_posts";
const DEFAULT_CACHE_QUERY_LIMIT = 5000;
const MAX_CACHE_QUERY_LIMIT = 20000;

interface CachedDiscoveryPostRow {
  reddit_post_id: string;
  title: string;
  text: string | null;
  url: string;
  permalink: string | null;
  author: string | null;
  score: number | null;
  num_comments: number | null;
  posted_at: string | null;
  link_flair_text: string | null;
  source_sorts: unknown;
  matched_terms: unknown;
  matched_cast_terms: unknown;
  cross_show_terms: unknown;
  is_show_match: boolean | null;
  passes_flair_filter: boolean | null;
  match_score: number | null;
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
};

const toSortArray = (value: unknown): RedditListingSort[] =>
  toStringArray(value).filter(
    (entry): entry is RedditListingSort => entry === "new" || entry === "hot" || entry === "top",
  );

const toCachedThread = (row: CachedDiscoveryPostRow): RedditDiscoveryThread => ({
  reddit_post_id: row.reddit_post_id,
  title: row.title,
  text: row.text,
  url: row.url,
  permalink: row.permalink,
  author: row.author,
  score: Number.isFinite(row.score) ? Number(row.score) : 0,
  num_comments: Number.isFinite(row.num_comments) ? Number(row.num_comments) : 0,
  posted_at: row.posted_at,
  link_flair_text: row.link_flair_text,
  source_sorts: toSortArray(row.source_sorts),
  matched_terms: toStringArray(row.matched_terms),
  matched_cast_terms: toStringArray(row.matched_cast_terms),
  cross_show_terms: toStringArray(row.cross_show_terms),
  is_show_match: row.is_show_match ?? false,
  passes_flair_filter: row.passes_flair_filter ?? true,
  match_score: Number.isFinite(row.match_score) ? Number(row.match_score) : 0,
  suggested_include_terms: [],
  suggested_exclude_terms: [],
});

const clampLimit = (value: number | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_CACHE_QUERY_LIMIT;
  return Math.max(1, Math.min(Math.floor(value), MAX_CACHE_QUERY_LIMIT));
};

export async function upsertRedditDiscoveryPosts(input: {
  communityId: string;
  subreddit: string;
  rows: RedditDiscoveryThread[];
}): Promise<void> {
  if (input.rows.length === 0) return;

  const payload = input.rows.map((row) => ({
    reddit_post_id: row.reddit_post_id,
    title: row.title,
    text: row.text ?? null,
    url: row.url,
    permalink: row.permalink ?? null,
    author: row.author ?? null,
    score: Number.isFinite(row.score) ? Math.floor(row.score) : 0,
    num_comments: Number.isFinite(row.num_comments) ? Math.floor(row.num_comments) : 0,
    posted_at: row.posted_at ?? null,
    link_flair_text: row.link_flair_text ?? null,
    source_sorts: row.source_sorts ?? [],
    matched_terms: row.matched_terms ?? [],
    matched_cast_terms: row.matched_cast_terms ?? [],
    cross_show_terms: row.cross_show_terms ?? [],
    is_show_match: row.is_show_match ?? false,
    passes_flair_filter: row.passes_flair_filter ?? true,
    match_score: Number.isFinite(row.match_score) ? Math.floor(row.match_score) : 0,
  }));

  await query(
    `WITH payload AS (
       SELECT *
       FROM jsonb_to_recordset($1::jsonb) AS x(
         reddit_post_id text,
         title text,
         text text,
         url text,
         permalink text,
         author text,
         score integer,
         num_comments integer,
         posted_at timestamptz,
         link_flair_text text,
         source_sorts text[],
         matched_terms text[],
         matched_cast_terms text[],
         cross_show_terms text[],
         is_show_match boolean,
         passes_flair_filter boolean,
         match_score integer
       )
     )
     INSERT INTO ${DISCOVERY_POSTS_TABLE} (
       community_id,
       subreddit,
       reddit_post_id,
       title,
       text,
       url,
       permalink,
       author,
       score,
       num_comments,
       posted_at,
       link_flair_text,
       source_sorts,
       matched_terms,
       matched_cast_terms,
       cross_show_terms,
       is_show_match,
       passes_flair_filter,
       match_score,
       last_discovered_at
     )
     SELECT
       $2::uuid,
       $3::text,
       payload.reddit_post_id,
       payload.title,
       payload.text,
       payload.url,
       payload.permalink,
       payload.author,
       COALESCE(payload.score, 0),
       COALESCE(payload.num_comments, 0),
       payload.posted_at,
       payload.link_flair_text,
       COALESCE(payload.source_sorts, '{}'::text[]),
       COALESCE(payload.matched_terms, '{}'::text[]),
       COALESCE(payload.matched_cast_terms, '{}'::text[]),
       COALESCE(payload.cross_show_terms, '{}'::text[]),
       COALESCE(payload.is_show_match, false),
       COALESCE(payload.passes_flair_filter, true),
       COALESCE(payload.match_score, 0),
       now()
     FROM payload
     ON CONFLICT (community_id, reddit_post_id)
     DO UPDATE SET
       subreddit = EXCLUDED.subreddit,
       title = EXCLUDED.title,
       text = EXCLUDED.text,
       url = EXCLUDED.url,
       permalink = EXCLUDED.permalink,
       author = EXCLUDED.author,
       score = EXCLUDED.score,
       num_comments = EXCLUDED.num_comments,
       posted_at = EXCLUDED.posted_at,
       link_flair_text = EXCLUDED.link_flair_text,
       source_sorts = EXCLUDED.source_sorts,
       matched_terms = EXCLUDED.matched_terms,
       matched_cast_terms = EXCLUDED.matched_cast_terms,
       cross_show_terms = EXCLUDED.cross_show_terms,
       is_show_match = EXCLUDED.is_show_match,
       passes_flair_filter = EXCLUDED.passes_flair_filter,
       match_score = EXCLUDED.match_score,
       last_discovered_at = now(),
       updated_at = now()`,
    [JSON.stringify(payload), input.communityId, input.subreddit],
  );
}

export async function listCachedRedditDiscoveryPosts(input: {
  communityId: string;
  subreddit: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  forceFlares?: string[] | null;
  limit?: number;
}): Promise<RedditDiscoveryThread[]> {
  const result = await query<CachedDiscoveryPostRow>(
    `SELECT
       reddit_post_id,
       title,
       text,
       url,
       permalink,
       author,
       score,
       num_comments,
       posted_at,
       link_flair_text,
       source_sorts,
       matched_terms,
       matched_cast_terms,
       cross_show_terms,
       is_show_match,
       passes_flair_filter,
       match_score
     FROM ${DISCOVERY_POSTS_TABLE}
     WHERE community_id = $1::uuid
       AND ($2::timestamptz IS NULL OR posted_at >= $2::timestamptz)
       AND ($3::timestamptz IS NULL OR posted_at <= $3::timestamptz)
     ORDER BY posted_at DESC NULLS LAST, score DESC, num_comments DESC
     LIMIT $4::int`,
    [input.communityId, input.periodStart ?? null, input.periodEnd ?? null, clampLimit(input.limit)],
  );

  const cachedThreads = result.rows.map(toCachedThread);
  const forceFlares = input.forceFlares ?? [];
  if (forceFlares.length === 0) {
    return cachedThreads;
  }

  const trackedFlairKeys = new Set(
    forceFlares
      .map((flair) => normalizeRedditFlairLabel(input.subreddit, flair))
      .map((flair) => toCanonicalFlairKey(flair))
      .filter((key) => key.length > 0),
  );
  if (trackedFlairKeys.size === 0) {
    return cachedThreads;
  }

  return cachedThreads.filter((thread) => {
    const normalizedThreadFlair = thread.link_flair_text
      ? normalizeRedditFlairLabel(input.subreddit, thread.link_flair_text)
      : null;
    const threadFlairKey = toCanonicalFlairKey(normalizedThreadFlair);
    return threadFlairKey.length > 0 && trackedFlairKeys.has(threadFlairKey);
  });
}
