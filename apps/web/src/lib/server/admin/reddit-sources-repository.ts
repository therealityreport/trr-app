import "server-only";

import { buildRedditDetailSlugBase } from "@/lib/admin/reddit-detail-slug";
import { query, withAuthTransaction, type AuthContext } from "@/lib/server/postgres";
import { sanitizeRedditFlairList } from "@/lib/server/admin/reddit-flair-normalization";
import {
  resolveCommunityFocusState,
  sanitizeFocusTargets,
} from "@/lib/server/admin/reddit-community-focus";
import {
  sanitizeEpisodeTitlePatterns,
} from "@/lib/server/admin/reddit-episode-rules";
import { toCanonicalFlairKey } from "@/lib/reddit/flair-key";

export interface RedditFlairAssignment {
  show_ids: string[];
  season_ids: string[];
  person_ids: string[];
}

export interface RedditCommunityRow {
  id: string;
  trr_show_id: string;
  trr_show_name: string;
  subreddit: string;
  display_name: string | null;
  notes: string | null;
  post_flairs: string[];
  analysis_flairs: string[];
  analysis_all_flairs: string[];
  is_show_focused: boolean;
  network_focus_targets: string[];
  franchise_focus_targets: string[];
  episode_title_patterns: string[];
  post_flair_categories: Record<string, string>;
  post_flair_assignments: Record<string, RedditFlairAssignment>;
  post_flairs_updated_at: string | null;
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
  source_kind: RedditThreadSourceKind;
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
  isShowFocused?: boolean;
  networkFocusTargets?: string[];
  franchiseFocusTargets?: string[];
  episodeTitlePatterns?: string[];
}

export interface UpdateRedditCommunityInput {
  subreddit?: string;
  displayName?: string | null;
  notes?: string | null;
  isActive?: boolean;
  analysisFlairs?: string[];
  analysisAllFlairs?: string[];
  isShowFocused?: boolean;
  networkFocusTargets?: string[];
  franchiseFocusTargets?: string[];
  episodeTitlePatterns?: string[];
  postFlairCategories?: Record<string, string>;
  postFlairAssignments?: Record<string, RedditFlairAssignment>;
}

export interface ListRedditThreadsOptions {
  communityId?: string;
  trrShowId?: string;
  trrSeasonId?: string | null;
  includeGlobalThreadsForSeason?: boolean;
}

export type RedditThreadSourceKind = "manual" | "episode_discussion";

export interface CreateRedditThreadInput {
  communityId: string;
  trrShowId: string;
  trrShowName: string;
  trrSeasonId?: string | null;
  sourceKind?: RedditThreadSourceKind;
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
  trrShowId?: string;
  trrShowName?: string;
  trrSeasonId?: string | null;
  sourceKind?: RedditThreadSourceKind;
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

interface RedditCommunityRowRaw
  extends Omit<
    RedditCommunityRow,
    | "post_flairs"
    | "analysis_flairs"
    | "analysis_all_flairs"
    | "network_focus_targets"
    | "franchise_focus_targets"
    | "episode_title_patterns"
    | "post_flair_categories"
    | "post_flair_assignments"
  > {
  post_flairs: unknown;
  analysis_flairs: unknown;
  analysis_all_flairs: unknown;
  network_focus_targets: unknown;
  franchise_focus_targets: unknown;
  episode_title_patterns: unknown;
  post_flair_categories: unknown;
  post_flair_assignments: unknown;
}

const toThreadsArray = (value: unknown): RedditThreadRow[] => {
  if (!Array.isArray(value)) return [];
  return value as RedditThreadRow[];
};

const toFlairArray = (subreddit: string, value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const raw = value.filter((item): item is string => typeof item === "string");
  return sanitizeRedditFlairList(subreddit, raw);
};

const toFocusTargets = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const raw = value.filter((item): item is string => typeof item === "string");
  return sanitizeFocusTargets(raw);
};

const toEpisodeTitlePatterns = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const raw = value.filter((item): item is string => typeof item === "string");
  return sanitizeEpisodeTitlePatterns(raw);
};

const VALID_FLAIR_CATEGORIES = new Set(["cast", "season"]);

const toFlairCategoriesMap = (value: unknown): Record<string, string> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [key, cat] of Object.entries(raw)) {
    if (typeof cat === "string" && VALID_FLAIR_CATEGORIES.has(cat)) {
      out[key] = cat;
    }
  }
  return out;
};

const toStringIdList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
};

const toFlairAssignmentsMap = (value: unknown): Record<string, RedditFlairAssignment> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const out: Record<string, RedditFlairAssignment> = {};
  for (const [key, entry] of Object.entries(raw)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const flairKey = toCanonicalFlairKey(key);
    if (!flairKey) continue;
    const assignment = entry as Record<string, unknown>;
    out[flairKey] = {
      show_ids: toStringIdList(assignment.show_ids),
      season_ids: toStringIdList(assignment.season_ids),
      person_ids: toStringIdList(assignment.person_ids),
    };
  }
  return out;
};

const toNumberOrZero = (value: number | null | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const buildCanonicalRedditContainerSql = ({
  periodKeyExpr = "m.period_key",
  periodStartExpr = "m.period_start",
  periodEndExpr = "m.period_end",
  postedAtExpr = "p.posted_at",
  seasonIdExpr = "m.season_id",
}: {
  periodKeyExpr?: string;
  periodStartExpr?: string;
  periodEndExpr?: string;
  postedAtExpr?: string;
  seasonIdExpr?: string;
} = {}): string => {
  const loweredKey = `lower(coalesce(${periodKeyExpr}, ''))`;
  const directContainerSql = `
    case
      when ${loweredKey} in ('period-preseason', 'period-postseason') then ${loweredKey}
      when ${loweredKey} ~ '^episode-[0-9]+$' then ${loweredKey}
      when ${loweredKey} ~ '^community:[^:]+:season:[^:]+:container:[a-z0-9-]+$'
        then substring(${loweredKey} from 'container:([a-z0-9-]+)$')
      else null
    end
  `;
  return `
    coalesce(
      ${directContainerSql},
      (
        with episode_starts as (
          select distinct on (e.episode_number)
                 e.episode_number,
                 (e.air_date::timestamp at time zone 'America/New_York') as start_utc
          from core.episodes e
          where e.season_id = ${seasonIdExpr}
            and e.air_date is not null
            and e.episode_number is not null
          order by e.episode_number asc, e.air_date asc
        ),
        season_windows as (
          select
            'period-preseason'::text as container_key,
            (select min(start_utc) from episode_starts) - interval '45 days' as start_utc,
            (select min(start_utc) from episode_starts) as end_utc
          where exists (select 1 from episode_starts)
          union all
          select
            'episode-' || episode_number::text as container_key,
            start_utc,
            coalesce(
              lead(start_utc) over (order by episode_number asc),
              start_utc + interval '7 days'
            ) as end_utc
          from episode_starts
          union all
          select
            'period-postseason'::text as container_key,
            season_end.end_utc as start_utc,
            season_end.end_utc + interval '7 days' as end_utc
          from (
            select max(coalesce(lead_start_utc, start_utc + interval '7 days')) as end_utc
            from (
              select
                start_utc,
                lead(start_utc) over (order by episode_number asc) as lead_start_utc
              from episode_starts
            ) finals
          ) season_end
          where season_end.end_utc is not null
        )
        select sw.container_key
        from season_windows sw
        where (
          ${periodStartExpr} is not null
          and ${periodEndExpr} is not null
          and ${periodStartExpr} >= sw.start_utc
          and ${periodEndExpr} <= sw.end_utc
        ) or (
          ${postedAtExpr} is not null
          and ${postedAtExpr} >= sw.start_utc
          and ${postedAtExpr} < sw.end_utc
        )
        order by
          case
            when ${periodStartExpr} is not null
             and ${periodEndExpr} is not null
             and ${periodStartExpr} >= sw.start_utc
             and ${periodEndExpr} <= sw.end_utc
            then 0
            else 1
          end,
          sw.start_utc asc
        limit 1
      ),
      'unmapped'
    )
  `;
};

const toCommunityRow = (row: RedditCommunityRowRaw): RedditCommunityRow => {
  const normalizedSubreddit = row.subreddit;
  return {
    id: row.id,
    trr_show_id: row.trr_show_id,
    trr_show_name: row.trr_show_name,
    subreddit: normalizedSubreddit,
    display_name: row.display_name,
    notes: row.notes,
    post_flairs: toFlairArray(normalizedSubreddit, row.post_flairs),
    analysis_flairs: toFlairArray(normalizedSubreddit, row.analysis_flairs),
    analysis_all_flairs: toFlairArray(normalizedSubreddit, row.analysis_all_flairs),
    is_show_focused: row.is_show_focused,
    network_focus_targets: toFocusTargets(row.network_focus_targets),
    franchise_focus_targets: toFocusTargets(row.franchise_focus_targets),
    episode_title_patterns: toEpisodeTitlePatterns(row.episode_title_patterns),
    post_flair_categories: toFlairCategoriesMap(row.post_flair_categories),
    post_flair_assignments: toFlairAssignmentsMap(row.post_flair_assignments),
    post_flairs_updated_at: row.post_flairs_updated_at,
    is_active: row.is_active,
    created_by_firebase_uid: row.created_by_firebase_uid,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

interface SanitizedAnalysisModes {
  analysisFlairs: string[];
  analysisAllFlairs: string[];
}

const sanitizeAnalysisFlairModes = (
  subreddit: string,
  values: {
    existingAnalysisFlairs: string[];
    existingAnalysisAllFlairs: string[];
    analysisFlairs?: string[];
    analysisAllFlairs?: string[];
  },
): SanitizedAnalysisModes => {
  const nextAll = values.analysisAllFlairs
    ? sanitizeRedditFlairList(subreddit, values.analysisAllFlairs)
    : values.existingAnalysisAllFlairs;
  const scanBeforeOverlap = values.analysisFlairs
    ? sanitizeRedditFlairList(subreddit, values.analysisFlairs)
    : values.existingAnalysisFlairs;
  const allKeys = new Set(nextAll.map((value) => value.toLowerCase()));
  const nextScan = scanBeforeOverlap.filter((value) => !allKeys.has(value.toLowerCase()));
  return {
    analysisFlairs: nextScan,
    analysisAllFlairs: nextAll,
  };
};

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
    const focusState = resolveCommunityFocusState({
      isShowFocused: input.isShowFocused,
      networkFocusTargets: input.networkFocusTargets,
      franchiseFocusTargets: input.franchiseFocusTargets,
    });

    const result = await client.query<RedditCommunityRowRaw>(
      `INSERT INTO ${COMMUNITIES_TABLE} (
        trr_show_id,
        trr_show_name,
        subreddit,
        display_name,
        notes,
        is_active,
        is_show_focused,
        network_focus_targets,
        franchise_focus_targets,
        episode_title_patterns,
        created_by_firebase_uid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11)
      RETURNING *`,
      [
        input.trrShowId,
        input.trrShowName,
        input.subreddit,
        input.displayName ?? null,
        input.notes ?? null,
        input.isActive ?? true,
        focusState.is_show_focused,
        JSON.stringify(focusState.network_focus_targets),
        JSON.stringify(focusState.franchise_focus_targets),
        JSON.stringify(sanitizeEpisodeTitlePatterns(input.episodeTitlePatterns ?? [])),
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
    const shouldResolveFocus =
      input.isShowFocused !== undefined ||
      input.networkFocusTargets !== undefined ||
      input.franchiseFocusTargets !== undefined;
    const shouldResolveAnalysis =
      input.analysisFlairs !== undefined || input.analysisAllFlairs !== undefined;
    const shouldResolveEpisodeRules = input.episodeTitlePatterns !== undefined;

    interface CommunityUpdateLookup {
      subreddit: string;
      is_show_focused: boolean;
      network_focus_targets: unknown;
      franchise_focus_targets: unknown;
      analysis_flairs: unknown;
      analysis_all_flairs: unknown;
      episode_title_patterns: unknown;
    }

    let lookupRow: CommunityUpdateLookup | null = null;
    if (shouldResolveFocus || shouldResolveAnalysis || shouldResolveEpisodeRules) {
      const communityLookup = await client.query<CommunityUpdateLookup>(
        `SELECT subreddit
               , is_show_focused
               , network_focus_targets
               , franchise_focus_targets
               , analysis_flairs
               , analysis_all_flairs
               , episode_title_patterns
           FROM ${COMMUNITIES_TABLE}
          WHERE id = $1::uuid
          LIMIT 1`,
        [id],
      );
      lookupRow = communityLookup.rows[0] ?? null;
    }

    const subredditForFlairSanitization = input.subreddit ?? lookupRow?.subreddit ?? "";

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
    if (shouldResolveFocus) {
      const focusState = resolveCommunityFocusState(
        {
          isShowFocused: input.isShowFocused,
          networkFocusTargets: input.networkFocusTargets,
          franchiseFocusTargets: input.franchiseFocusTargets,
        },
        lookupRow
          ? {
              is_show_focused: lookupRow.is_show_focused,
              network_focus_targets: toFocusTargets(lookupRow.network_focus_targets),
              franchise_focus_targets: toFocusTargets(lookupRow.franchise_focus_targets),
            }
          : undefined,
      );
      sets.push(`is_show_focused = $${idx++}`);
      values.push(focusState.is_show_focused);
      sets.push(`network_focus_targets = $${idx++}::jsonb`);
      values.push(JSON.stringify(focusState.network_focus_targets));
      sets.push(`franchise_focus_targets = $${idx++}::jsonb`);
      values.push(JSON.stringify(focusState.franchise_focus_targets));
    }

    if (shouldResolveAnalysis) {
      const existingAnalysisFlairs = lookupRow
        ? toFlairArray(subredditForFlairSanitization, lookupRow.analysis_flairs)
        : [];
      const existingAnalysisAllFlairs = lookupRow
        ? toFlairArray(subredditForFlairSanitization, lookupRow.analysis_all_flairs)
        : [];
      const sanitizedAnalysis = sanitizeAnalysisFlairModes(subredditForFlairSanitization, {
        existingAnalysisFlairs,
        existingAnalysisAllFlairs,
        analysisFlairs: input.analysisFlairs,
        analysisAllFlairs: input.analysisAllFlairs,
      });
      sets.push(`analysis_flairs = $${idx++}::jsonb`);
      values.push(JSON.stringify(sanitizedAnalysis.analysisFlairs));
      sets.push(`analysis_all_flairs = $${idx++}::jsonb`);
      values.push(JSON.stringify(sanitizedAnalysis.analysisAllFlairs));
    }

    if (shouldResolveEpisodeRules) {
      const nextEpisodeTitlePatterns = sanitizeEpisodeTitlePatterns(
        input.episodeTitlePatterns ??
          (lookupRow ? toEpisodeTitlePatterns(lookupRow.episode_title_patterns) : []),
      );
      sets.push(`episode_title_patterns = $${idx++}::jsonb`);
      values.push(JSON.stringify(nextEpisodeTitlePatterns));
    }

    if (input.postFlairCategories !== undefined) {
      const sanitized = toFlairCategoriesMap(input.postFlairCategories);
      sets.push(`post_flair_categories = $${idx++}::jsonb`);
      values.push(JSON.stringify(sanitized));
    }

    if (input.postFlairAssignments !== undefined) {
      const sanitized = toFlairAssignmentsMap(input.postFlairAssignments);
      sets.push(`post_flair_assignments = $${idx++}::jsonb`);
      values.push(JSON.stringify(sanitized));
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

export async function updateRedditCommunityPostFlairs(
  authContext: AuthContext,
  id: string,
  postFlairs: string[],
  postFlairsUpdatedAt: string,
): Promise<RedditCommunityRow | null> {
  return withAuthTransaction(authContext, async (client) => {
    const communityLookup = await client.query<{ subreddit: string }>(
      `SELECT subreddit
         FROM ${COMMUNITIES_TABLE}
        WHERE id = $1::uuid
        LIMIT 1`,
      [id],
    );
    const subreddit = communityLookup.rows[0]?.subreddit;
    if (!subreddit) {
      return null;
    }

    const sanitizedPostFlairs = sanitizeRedditFlairList(subreddit, postFlairs);
    const result = await client.query<RedditCommunityRowRaw>(
      `UPDATE ${COMMUNITIES_TABLE}
          SET post_flairs = $1::jsonb,
              post_flairs_updated_at = $2::timestamptz
        WHERE id = $3::uuid
      RETURNING *`,
      [JSON.stringify(sanitizedPostFlairs), postFlairsUpdatedAt, id],
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
        source_kind,
        created_by_firebase_uid
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::text, $15
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
        notes = EXCLUDED.notes,
        source_kind = CASE
          WHEN $16::boolean THEN EXCLUDED.source_kind
          ELSE ${THREADS_TABLE}.source_kind
        END
      WHERE ${THREADS_TABLE}.community_id = EXCLUDED.community_id
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
        input.sourceKind ?? "manual",
        authContext.firebaseUid,
        input.sourceKind !== undefined,
      ],
    );
    const row = result.rows[0];
    if (row) {
      return row;
    }

    const conflictLookup = await client.query<Pick<RedditThreadRow, "id">>(
      `SELECT id
         FROM ${THREADS_TABLE}
        WHERE trr_show_id = $1
          AND reddit_post_id = $2
        LIMIT 1`,
      [input.trrShowId, input.redditPostId],
    );
    if (conflictLookup.rowCount && conflictLookup.rowCount > 0) {
      throw new Error("Thread already exists in another community for this show");
    }
    throw new Error("Failed to create reddit thread");
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
    if (input.trrShowId !== undefined) {
      sets.push(`trr_show_id = $${idx++}`);
      values.push(input.trrShowId);
    }
    if (input.trrShowName !== undefined) {
      sets.push(`trr_show_name = $${idx++}`);
      values.push(input.trrShowName);
    }
    if (input.trrSeasonId !== undefined) {
      sets.push(`trr_season_id = $${idx++}`);
      values.push(input.trrSeasonId);
    }
    if (input.sourceKind !== undefined) {
      sets.push(`source_kind = $${idx++}`);
      values.push(input.sourceKind);
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

export interface RedditPostMatchContextRow {
  period_key: string;
  period_start: string | null;
  period_end: string | null;
  is_show_match: boolean;
  passes_flair_filter: boolean;
  match_score: number;
  match_type: string | null;
  admin_approved: boolean | null;
  flair_mode: string | null;
  source_sorts: string[];
  matched_terms: string[];
  matched_cast_terms: string[];
  cross_show_terms: string[];
  link_flair_text: string | null;
  canonical_flair_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface RedditPostCommentRow {
  reddit_comment_id: string;
  parent_comment_id: string | null;
  author: string | null;
  body: string;
  score: number;
  depth: number;
  created_at_utc: string | null;
  author_flair_text: string | null;
  is_submitter: boolean | null;
  controversiality: number | null;
  ups: number | null;
  downs: number | null;
  gildings: Record<string, unknown> | null;
}

export interface RedditPostMediaRow {
  id: string;
  reddit_comment_id: string | null;
  source_url: string;
  media_type: string;
  hosted_url: string | null;
  status: string;
  content_type: string | null;
  size_bytes: number | null;
  error_message: string | null;
  created_at: string;
}

export interface RedditPostCommentSummary {
  total_comments: number;
  top_level_comments: number;
  reply_comments: number;
  earliest_comment_at: string | null;
  latest_comment_at: string | null;
}

export interface RedditPostMediaSummary {
  total_media: number;
  mirrored_media: number;
  pending_media: number;
  failed_media: number;
}

export interface RedditPostDetails {
  reddit_post_id: string;
  subreddit: string;
  title: string;
  text: string | null;
  url: string | null;
  permalink: string | null;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string | null;
  link_flair_text: string | null;
  canonical_flair_key: string | null;
  upvote_ratio: number | null;
  is_self: boolean | null;
  post_type: string | null;
  thumbnail: string | null;
  content_url: string | null;
  is_nsfw: boolean | null;
  is_spoiler: boolean | null;
  author_flair_text: string | null;
  detail_scraped_at: string | null;
  source_sorts: string[];
  media_metadata: Record<string, unknown> | null;
  poll_data: Record<string, unknown> | null;
  matches: RedditPostMatchContextRow[];
  comments: RedditPostCommentRow[];
  comment_summary: RedditPostCommentSummary;
  media: RedditPostMediaRow[];
  media_summary: RedditPostMediaSummary;
  assigned_threads: RedditThreadRow[];
}

interface RedditPostRowRaw {
  reddit_post_id: string;
  subreddit: string;
  title: string;
  selftext: string | null;
  url: string | null;
  permalink: string | null;
  author: string | null;
  score: number | null;
  num_comments: number | null;
  posted_at: string | null;
  link_flair_text: string | null;
  canonical_flair_key: string | null;
  upvote_ratio: number | null;
  is_self: boolean | null;
  post_type: string | null;
  thumbnail: string | null;
  content_url: string | null;
  is_nsfw: boolean | null;
  is_spoiler: boolean | null;
  author_flair_text: string | null;
  detail_scraped_at: string | null;
  source_sorts: unknown;
  media_metadata: unknown;
  poll_data: unknown;
}

interface RedditCommentSummaryRowRaw {
  total_comments: number | null;
  top_level_comments: number | null;
  earliest_comment_at: string | null;
  latest_comment_at: string | null;
}

interface RedditPostMediaSummaryRowRaw {
  total_media: number | null;
  mirrored_media: number | null;
  pending_media: number | null;
  failed_media: number | null;
}

interface RedditDetailSlugCandidateRow {
  reddit_post_id: string;
  title: string;
  author: string | null;
  posted_at: string | null;
  url: string | null;
  permalink: string | null;
}

export interface ResolvedRedditPostDetail {
  reddit_post_id: string;
  detail_slug: string;
  collision: boolean;
  title: string;
  author: string | null;
  posted_at: string | null;
  url: string | null;
  permalink: string | null;
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const toObjectRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toCommentSummary = (value: RedditCommentSummaryRowRaw | undefined): RedditPostCommentSummary => {
  const totalComments = toNumberOrZero(value?.total_comments ?? 0);
  const topLevelComments = toNumberOrZero(value?.top_level_comments ?? 0);
  return {
    total_comments: totalComments,
    top_level_comments: topLevelComments,
    reply_comments: Math.max(0, totalComments - topLevelComments),
    earliest_comment_at: value?.earliest_comment_at ?? null,
    latest_comment_at: value?.latest_comment_at ?? null,
  };
};

const toMediaSummary = (value: RedditPostMediaSummaryRowRaw | undefined): RedditPostMediaSummary => ({
  total_media: toNumberOrZero(value?.total_media ?? 0),
  mirrored_media: toNumberOrZero(value?.mirrored_media ?? 0),
  pending_media: toNumberOrZero(value?.pending_media ?? 0),
  failed_media: toNumberOrZero(value?.failed_media ?? 0),
});

export async function getRedditPostDetailsByCommunityAndSeason(input: {
  communityId: string;
  seasonId: string;
  redditPostId: string;
  commentsLimit?: number;
}): Promise<RedditPostDetails | null> {
  const commentsLimit = Math.max(25, Math.min(500, Math.floor(input.commentsLimit ?? 250)));
  const postResult = await query<RedditPostRowRaw>(
    `SELECT
       p.reddit_post_id,
       p.subreddit,
       p.title,
       p.selftext,
       p.url,
       p.permalink,
       p.author,
       p.score,
       p.num_comments,
       p.posted_at::text,
       p.link_flair_text,
       p.canonical_flair_key,
       p.upvote_ratio,
       p.is_self,
       p.post_type,
       p.thumbnail,
       p.content_url,
       p.is_nsfw,
       p.is_spoiler,
       p.author_flair_text,
       p.detail_scraped_at::text,
       p.source_sorts,
       p.media_metadata,
       p.poll_data
     FROM social.reddit_posts p
     JOIN social.reddit_period_post_matches m
       ON m.reddit_post_id = p.reddit_post_id
     WHERE m.community_id = $1::uuid
       AND m.season_id = $2::uuid
       AND p.reddit_post_id = $3
     ORDER BY m.updated_at DESC
     LIMIT 1`,
    [input.communityId, input.seasonId, input.redditPostId],
  );

  const postRow = postResult.rows[0];
  if (!postRow) return null;

  const [matchesResult, commentsResult, commentSummaryResult, mediaResult, mediaSummaryResult, threadsResult] =
    await Promise.all([
      query<RedditPostMatchContextRow>(
        `SELECT
           period_key,
           period_start::text,
           period_end::text,
           is_show_match,
           passes_flair_filter,
           match_score,
           match_type,
           admin_approved,
           flair_mode,
           source_sorts,
           matched_terms,
           matched_cast_terms,
           cross_show_terms,
           link_flair_text,
           canonical_flair_key,
           created_at::text,
           updated_at::text
         FROM social.reddit_period_post_matches
         WHERE community_id = $1::uuid
           AND season_id = $2::uuid
           AND reddit_post_id = $3
         ORDER BY updated_at DESC`,
        [input.communityId, input.seasonId, input.redditPostId],
      ),
      query<RedditPostCommentRow>(
        `SELECT
           reddit_comment_id,
           parent_comment_id,
           author,
           body,
           score,
           depth,
           created_at_utc::text,
           author_flair_text,
           is_submitter,
           controversiality,
           ups,
           downs,
           gildings
         FROM social.reddit_comments
         WHERE reddit_post_id = $1
         ORDER BY created_at_utc ASC NULLS LAST, depth ASC, score DESC
         LIMIT $2`,
        [input.redditPostId, commentsLimit],
      ),
      query<RedditCommentSummaryRowRaw>(
        `SELECT
           COUNT(*)::int AS total_comments,
           COUNT(*) FILTER (WHERE COALESCE(depth, 0) = 0)::int AS top_level_comments,
           MIN(created_at_utc)::text AS earliest_comment_at,
           MAX(created_at_utc)::text AS latest_comment_at
         FROM social.reddit_comments
         WHERE reddit_post_id = $1`,
        [input.redditPostId],
      ),
      query<RedditPostMediaRow>(
        `SELECT
           id::text,
           reddit_comment_id,
           source_url,
           media_type,
           hosted_url,
           status,
           content_type,
           size_bytes::bigint,
           error_message,
           created_at::text
         FROM social.reddit_media_mirrors
         WHERE reddit_post_id = $1
         ORDER BY created_at DESC`,
        [input.redditPostId],
      ),
      query<RedditPostMediaSummaryRowRaw>(
        `SELECT
           COUNT(*)::int AS total_media,
           COUNT(*) FILTER (WHERE status = 'mirrored')::int AS mirrored_media,
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_media,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_media
         FROM social.reddit_media_mirrors
         WHERE reddit_post_id = $1`,
        [input.redditPostId],
      ),
      query<RedditThreadRow>(
        `SELECT *
         FROM ${THREADS_TABLE}
         WHERE community_id = $1::uuid
           AND reddit_post_id = $2
           AND (trr_season_id = $3::uuid OR trr_season_id IS NULL)
         ORDER BY posted_at DESC NULLS LAST, created_at DESC`,
        [input.communityId, input.redditPostId, input.seasonId],
      ),
    ]);

  return {
    reddit_post_id: postRow.reddit_post_id,
    subreddit: postRow.subreddit,
    title: postRow.title,
    text: postRow.selftext,
    url: postRow.url,
    permalink: postRow.permalink,
    author: postRow.author,
    score: toNumberOrZero(postRow.score ?? 0),
    num_comments: toNumberOrZero(postRow.num_comments ?? 0),
    posted_at: postRow.posted_at ?? null,
    link_flair_text: postRow.link_flair_text,
    canonical_flair_key: postRow.canonical_flair_key,
    upvote_ratio:
      typeof postRow.upvote_ratio === "number" && Number.isFinite(postRow.upvote_ratio)
        ? postRow.upvote_ratio
        : null,
    is_self: typeof postRow.is_self === "boolean" ? postRow.is_self : null,
    post_type: postRow.post_type,
    thumbnail: postRow.thumbnail,
    content_url: postRow.content_url,
    is_nsfw: typeof postRow.is_nsfw === "boolean" ? postRow.is_nsfw : null,
    is_spoiler: typeof postRow.is_spoiler === "boolean" ? postRow.is_spoiler : null,
    author_flair_text: postRow.author_flair_text,
    detail_scraped_at: postRow.detail_scraped_at,
    source_sorts: toStringArray(postRow.source_sorts),
    media_metadata: toObjectRecord(postRow.media_metadata),
    poll_data: toObjectRecord(postRow.poll_data),
    matches: matchesResult.rows.map((row) => ({
      ...row,
      match_score: toNumberOrZero(row.match_score),
      source_sorts: toStringArray(row.source_sorts),
      matched_terms: toStringArray(row.matched_terms),
      matched_cast_terms: toStringArray(row.matched_cast_terms),
      cross_show_terms: toStringArray(row.cross_show_terms),
    })),
    comments: commentsResult.rows.map((row) => ({
      ...row,
      score: toNumberOrZero(row.score),
      depth: toNumberOrZero(row.depth),
      controversiality:
        typeof row.controversiality === "number" && Number.isFinite(row.controversiality)
          ? Math.trunc(row.controversiality)
          : null,
      ups: typeof row.ups === "number" && Number.isFinite(row.ups) ? Math.trunc(row.ups) : null,
      downs: typeof row.downs === "number" && Number.isFinite(row.downs) ? Math.trunc(row.downs) : null,
      gildings: toObjectRecord(row.gildings),
    })),
    comment_summary: toCommentSummary(commentSummaryResult.rows[0]),
    media: mediaResult.rows.map((row) => ({
      ...row,
      size_bytes:
        typeof row.size_bytes === "number" && Number.isFinite(row.size_bytes)
          ? Math.trunc(row.size_bytes)
          : null,
    })),
    media_summary: toMediaSummary(mediaSummaryResult.rows[0]),
    assigned_threads: threadsResult.rows,
  };
}

export async function resolveRedditPostDetailBySlug(input: {
  communityId: string;
  seasonId: string;
  containerKey: string;
  titleSlug?: string | null;
  authorSlug?: string | null;
  redditPostId?: string | null;
}): Promise<ResolvedRedditPostDetail | null> {
  const canonicalContainerSql = buildCanonicalRedditContainerSql();
  const rowsResult = await query<RedditDetailSlugCandidateRow>(
    `WITH scoped AS (
       SELECT DISTINCT ON (p.reddit_post_id)
         p.reddit_post_id,
         p.title,
         p.author,
         p.posted_at::text,
         p.url,
         p.permalink,
         ${canonicalContainerSql} AS canonical_container_key
       FROM social.reddit_period_post_matches m
       JOIN social.reddit_posts p ON p.reddit_post_id = m.reddit_post_id
       WHERE m.community_id = $1::uuid
         AND m.season_id = $2::uuid
       ORDER BY p.reddit_post_id, m.updated_at DESC
     )
     SELECT
       reddit_post_id,
       title,
       author,
       posted_at,
       url,
       permalink
     FROM scoped
     WHERE canonical_container_key = $3`,
    [input.communityId, input.seasonId, input.containerKey],
  );

  const candidates = rowsResult.rows.map((row) => ({
    ...row,
    slug_base: buildRedditDetailSlugBase({
      title: row.title,
      author: row.author,
    }),
  }));
  const collisions = new Map<string, number>();
  for (const candidate of candidates) {
    collisions.set(candidate.slug_base, (collisions.get(candidate.slug_base) ?? 0) + 1);
  }

  const normalizedPostId = String(input.redditPostId ?? "").trim();
  const requestedBase =
    String(input.titleSlug ?? "").trim() && String(input.authorSlug ?? "").trim()
      ? `${String(input.titleSlug).trim().toLowerCase()}--u-${String(input.authorSlug).trim().toLowerCase()}`
      : "";

  const matched =
    (normalizedPostId
      ? candidates.find((candidate) => candidate.reddit_post_id === normalizedPostId)
      : null) ??
    (requestedBase
      ? candidates.find(
          (candidate) =>
            candidate.slug_base === requestedBase &&
            (collisions.get(candidate.slug_base) ?? 0) === 1,
        )
      : null) ??
    null;

  if (!matched) return null;
  const collision = (collisions.get(matched.slug_base) ?? 0) > 1;
  return {
    reddit_post_id: matched.reddit_post_id,
    detail_slug: collision ? `${matched.slug_base}--p-${matched.reddit_post_id}` : matched.slug_base,
    collision,
    title: matched.title,
    author: matched.author,
    posted_at: matched.posted_at,
    url: matched.url,
    permalink: matched.permalink,
  };
}

// ---------------------------------------------------------------------------
// Stored post counts from social.reddit_period_post_matches
// ---------------------------------------------------------------------------

interface StoredPostCountRow {
  container_key: string;
  post_count: number;
}

interface StoredPostTotalRow {
  total_posts: number;
}

interface StoredTrackedFlairContainerRow {
  flair_key: string;
  flair_label: string;
  post_count: number;
  container_key: string | null;
  container_post_count: number | null;
}

interface StoredPendingTrackedFlairRow {
  container_key: string | null;
  flair_key: string;
  flair_label: string;
  post_count: number;
}

interface StoredWindowPostRow {
  reddit_post_id: string;
  title: string | null;
  text: string | null;
  url: string | null;
  permalink: string | null;
  author: string | null;
  score: number | null;
  num_comments: number | null;
  posted_at: string | null;
  link_flair_text: string | null;
  is_show_match: boolean | null;
  match_score: number | null;
}

export interface StoredTrackedFlairContainerCount {
  container_key: string;
  post_count: number;
}

export interface StoredTrackedFlairCount {
  flair_key: string;
  flair_label: string;
  post_count: number;
  container_counts: StoredTrackedFlairContainerCount[];
}

export interface StoredPendingTrackedFlairCount {
  container_key: string;
  flair_key: string;
  flair_label: string;
  post_count: number;
}

export interface StoredWindowPost {
  reddit_post_id: string;
  title: string;
  text: string | null;
  url: string;
  permalink: string | null;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string | null;
  link_flair_text: string | null;
  is_show_match: boolean;
  passes_flair_filter: boolean;
  match_score: number | null;
  match_type: "flair";
}

export interface StoredWindowPostsResult {
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
  };
  posts: StoredWindowPost[];
}

const CANONICAL_CONTAINER_KEY_RE = /^(episode-\d+|period-preseason|period-postseason)$/;

const isCanonicalContainerKey = (value: string | null | undefined): boolean =>
  CANONICAL_CONTAINER_KEY_RE.test(String(value ?? "").trim().toLowerCase());

/**
 * Returns stored post counts grouped by container key for a given community
 * and season. Extracts the container key from the period_key column which has
 * the format `community:{cid}:season:{sid}:container:{containerKey}...`.
 */
export async function getStoredPostCountsByCommunityAndSeason(
  communityId: string,
  seasonId: string,
): Promise<Record<string, number>> {
  const canonicalContainerSql = buildCanonicalRedditContainerSql();
  const result = await query<StoredPostCountRow>(
    `WITH scoped AS (
       SELECT DISTINCT
         m.reddit_post_id,
         ${canonicalContainerSql} AS container_key
       FROM social.reddit_period_post_matches m
       LEFT JOIN social.reddit_posts p ON p.reddit_post_id = m.reddit_post_id
       WHERE m.community_id = $1::uuid
         AND m.season_id = $2::uuid
         AND m.passes_flair_filter = true
     )
     SELECT
       container_key,
       COUNT(DISTINCT reddit_post_id)::int AS post_count
     FROM scoped
     WHERE container_key <> 'unmapped'
     GROUP BY container_key
     ORDER BY container_key`,
    [communityId, seasonId],
  );
  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    if (row.container_key) {
      counts[row.container_key] = row.post_count;
    }
  }
  return counts;
}

/**
 * Returns the total distinct reddit posts currently stored in Supabase for a
 * community+season scope across all period containers.
 */
export async function getStoredPostTotalByCommunityAndSeason(
  communityId: string,
  seasonId: string,
): Promise<number> {
  const result = await query<StoredPostTotalRow>(
    `SELECT COUNT(DISTINCT reddit_post_id)::int AS total_posts
     FROM social.reddit_period_post_matches
     WHERE community_id = $1::uuid
       AND season_id = $2::uuid`,
    [communityId, seasonId],
  );
  const total = result.rows[0]?.total_posts;
  return Number.isFinite(total) ? total : 0;
}

/**
 * Returns the tracked-flair distinct reddit post total currently stored for
 * the community+season scope.
 */
export async function getStoredTrackedPostTotalByCommunityAndSeason(
  communityId: string,
  seasonId: string,
): Promise<number> {
  const result = await query<StoredPostTotalRow>(
    `SELECT COUNT(DISTINCT reddit_post_id)::int AS total_posts
     FROM social.reddit_period_post_matches
     WHERE community_id = $1::uuid
       AND season_id = $2::uuid
       AND passes_flair_filter = true`,
    [communityId, seasonId],
  );
  const total = result.rows[0]?.total_posts;
  return Number.isFinite(total) ? total : 0;
}

/**
 * Returns tracked-flair distinct post counts grouped by flair and by
 * container for the community+season scope.
 */
export async function getStoredTrackedPostFlairCountsByCommunityAndSeason(
  communityId: string,
  seasonId: string,
): Promise<StoredTrackedFlairCount[]> {
  const canonicalContainerSql = buildCanonicalRedditContainerSql();
  const result = await query<StoredTrackedFlairContainerRow>(
    `WITH scoped AS (
       SELECT DISTINCT
         m.reddit_post_id,
         ${canonicalContainerSql} AS container_key,
         COALESCE(NULLIF(m.canonical_flair_key, ''), NULLIF(p.canonical_flair_key, ''), '') AS flair_key,
         COALESCE(
           NULLIF(TRIM(m.link_flair_text), ''),
           NULLIF(TRIM(p.link_flair_text), ''),
           '(No Flair)'
         ) AS flair_label
       FROM social.reddit_period_post_matches m
       LEFT JOIN social.reddit_posts p ON p.reddit_post_id = m.reddit_post_id
       WHERE m.community_id = $1::uuid
         AND m.season_id = $2::uuid
         AND m.passes_flair_filter = true
     ),
     flair_totals AS (
       SELECT
         flair_key,
         MIN(flair_label) AS flair_label,
         COUNT(DISTINCT reddit_post_id)::int AS post_count
       FROM scoped
       GROUP BY flair_key
     ),
     flair_containers AS (
       SELECT
         flair_key,
         container_key,
         COUNT(DISTINCT reddit_post_id)::int AS container_post_count
       FROM scoped
       WHERE container_key <> 'unmapped'
       GROUP BY flair_key, container_key
     )
     SELECT
       t.flair_key,
       t.flair_label,
       t.post_count,
       c.container_key,
       c.container_post_count
     FROM flair_totals t
     LEFT JOIN flair_containers c ON c.flair_key = t.flair_key
     ORDER BY t.post_count DESC, t.flair_label ASC, c.container_key ASC`,
    [communityId, seasonId],
  );

  const byFlair = new Map<string, StoredTrackedFlairCount>();
  for (const row of result.rows) {
    const flairKey = row.flair_key ?? "";
    if (!byFlair.has(flairKey)) {
      byFlair.set(flairKey, {
        flair_key: flairKey,
        flair_label: row.flair_label || "(No Flair)",
        post_count: row.post_count,
        container_counts: [],
      });
    }
    if (row.container_key) {
      const containerPostCount =
        typeof row.container_post_count === "number" && Number.isFinite(row.container_post_count)
          ? row.container_post_count
          : 0;
      byFlair.get(flairKey)?.container_counts.push({
        container_key: row.container_key,
        post_count: containerPostCount,
      });
    }
  }
  return [...byFlair.values()];
}

/**
 * Returns unassigned tracked-flair post counts grouped by container+flair for
 * a community+season. "Unassigned" excludes posts already saved as reddit
 * threads for the same community in either the selected season or global
 * (season null) scope.
 */
export async function getStoredPendingTrackedFlairCountsByCommunityAndSeason(
  communityId: string,
  seasonId: string,
): Promise<StoredPendingTrackedFlairCount[]> {
  const canonicalContainerSql = buildCanonicalRedditContainerSql();
  const result = await query<StoredPendingTrackedFlairRow>(
    `WITH scoped AS (
       SELECT DISTINCT
         m.reddit_post_id,
         ${canonicalContainerSql} AS container_key,
         COALESCE(NULLIF(m.canonical_flair_key, ''), NULLIF(p.canonical_flair_key, ''), '') AS flair_key,
         COALESCE(
           NULLIF(TRIM(m.link_flair_text), ''),
           NULLIF(TRIM(p.link_flair_text), ''),
           '(No Flair)'
         ) AS flair_label
       FROM social.reddit_period_post_matches m
       LEFT JOIN social.reddit_posts p ON p.reddit_post_id = m.reddit_post_id
       WHERE m.community_id = $1::uuid
         AND m.season_id = $2::uuid
         AND m.passes_flair_filter = true
     ),
     unassigned AS (
       SELECT s.*
       FROM scoped s
       WHERE s.container_key <> 'unmapped'
         AND NOT EXISTS (
           SELECT 1
           FROM ${THREADS_TABLE} t
           WHERE t.community_id = $1::uuid
             AND t.reddit_post_id = s.reddit_post_id
             AND (t.trr_season_id = $2::uuid OR t.trr_season_id IS NULL)
         )
     )
     SELECT
       container_key,
       flair_key,
       MIN(flair_label) AS flair_label,
       COUNT(DISTINCT reddit_post_id)::int AS post_count
     FROM unassigned
     GROUP BY container_key, flair_key
     ORDER BY container_key ASC, post_count DESC, flair_label ASC`,
    [communityId, seasonId],
  );

  return result.rows
    .filter(
      (row): row is StoredPendingTrackedFlairRow =>
        typeof row.container_key === "string" &&
        row.container_key.length > 0 &&
        typeof row.flair_key === "string" &&
        typeof row.flair_label === "string" &&
        typeof row.post_count === "number" &&
        Number.isFinite(row.post_count),
    )
    .map((row) => ({
      container_key: row.container_key as string,
      flair_key: row.flair_key,
      flair_label: row.flair_label || "(No Flair)",
      post_count: row.post_count,
    }));
}

export async function getStoredWindowPostsByCommunityAndSeason(
  communityId: string,
  seasonId: string,
  containerKey: string,
  page = 1,
  perPage = 200,
): Promise<StoredWindowPostsResult> {
  const normalizedContainerKey = String(containerKey ?? "").trim().toLowerCase();
  if (!isCanonicalContainerKey(normalizedContainerKey)) {
    throw new Error("container_key must be a canonical season window key");
  }

  const normalizedPage =
    Number.isFinite(page) && page > 0 ? Math.max(1, Math.trunc(page)) : 1;
  const normalizedPerPage =
    Number.isFinite(perPage) && perPage > 0
      ? Math.min(200, Math.max(1, Math.trunc(perPage)))
      : 200;
  const offset = (normalizedPage - 1) * normalizedPerPage;
  const canonicalContainerSql = buildCanonicalRedditContainerSql();

  const countResult = await query<{ total_count: number }>(
    `WITH scoped AS (
       SELECT DISTINCT ON (m.reddit_post_id)
         m.reddit_post_id
       FROM social.reddit_period_post_matches m
       JOIN social.reddit_posts p ON p.reddit_post_id = m.reddit_post_id
       WHERE m.community_id = $1::uuid
         AND m.season_id = $2::uuid
         AND m.passes_flair_filter = true
         AND ${canonicalContainerSql} = $3
       ORDER BY m.reddit_post_id, m.updated_at DESC, p.posted_at DESC NULLS LAST
     )
     SELECT COUNT(*)::int AS total_count
     FROM scoped`,
    [communityId, seasonId, normalizedContainerKey],
  );

  const rowsResult = await query<StoredWindowPostRow>(
    `WITH scoped AS (
       SELECT DISTINCT ON (m.reddit_post_id)
         p.reddit_post_id,
         p.title,
         p.selftext AS text,
         p.url,
         p.permalink,
         p.author,
         p.score,
         p.num_comments,
         p.posted_at::text,
         COALESCE(
           NULLIF(TRIM(m.link_flair_text), ''),
           NULLIF(TRIM(p.link_flair_text), '')
         ) AS link_flair_text,
         m.is_show_match,
         m.match_score
       FROM social.reddit_period_post_matches m
       JOIN social.reddit_posts p ON p.reddit_post_id = m.reddit_post_id
       WHERE m.community_id = $1::uuid
         AND m.season_id = $2::uuid
         AND m.passes_flair_filter = true
         AND ${canonicalContainerSql} = $3
       ORDER BY m.reddit_post_id, m.updated_at DESC, p.posted_at DESC NULLS LAST
     )
     SELECT
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
       is_show_match,
       match_score
     FROM scoped
     ORDER BY posted_at DESC NULLS LAST, num_comments DESC NULLS LAST, score DESC NULLS LAST
     LIMIT $4
     OFFSET $5`,
    [communityId, seasonId, normalizedContainerKey, normalizedPerPage, offset],
  );

  const totalCount = countResult.rows[0]?.total_count ?? 0;

  return {
    pagination: {
      page: normalizedPage,
      per_page: normalizedPerPage,
      total_count: Number.isFinite(totalCount) ? totalCount : 0,
    },
    posts: rowsResult.rows.map((row) => ({
      reddit_post_id: row.reddit_post_id,
      title: row.title?.trim() || "(Untitled Post)",
      text: row.text,
      url: row.url?.trim() || "",
      permalink: row.permalink?.trim() || null,
      author: row.author?.trim() || null,
      score: toNumberOrZero(row.score),
      num_comments: toNumberOrZero(row.num_comments),
      posted_at: row.posted_at,
      link_flair_text: row.link_flair_text?.trim() || null,
      is_show_match: row.is_show_match === true,
      passes_flair_filter: true,
      match_score: typeof row.match_score === "number" && Number.isFinite(row.match_score) ? row.match_score : null,
      match_type: "flair",
    })),
  };
}
