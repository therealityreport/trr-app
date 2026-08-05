import "server-only";

import {
  normalizeRedditFlairAssignments,
  type RedditFlairAssignment,
} from "@/lib/admin/reddit-flair-targeting";
import type { AuthContext } from "@/lib/server/postgres";
import { sanitizeRedditFlairList } from "@/lib/server/admin/reddit-flair-normalization";
import { sanitizeFocusTargets } from "@/lib/server/admin/reddit-community-focus";
import {
  sanitizeEpisodeTitlePatterns,
} from "@/lib/server/admin/reddit-episode-rules";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

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

const REDDIT_COMMUNITIES_BACKEND_PATH = "/admin/reddit/communities";
const REDDIT_THREADS_BACKEND_PATH = "/admin/reddit/threads";

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

const toFlairAssignmentsMap = (value: unknown): Record<string, RedditFlairAssignment> => {
  return normalizeRedditFlairAssignments(value);
};

const toNumberOrZero = (value: number | null | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
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

const toCommunityRows = (value: unknown): RedditCommunityRow[] => {
  if (!Array.isArray(value)) return [];
  return value.map((row) => toCommunityRow(row as RedditCommunityRowRaw));
};

const toCommunityWithThreadsRows = (value: unknown): RedditCommunityWithThreads[] => {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const record = row as CommunitiesWithThreadsRow;
    return {
      ...toCommunityRow(record),
      assigned_threads: toThreadsArray(record.assigned_threads),
      assigned_thread_count: toNumberOrZero(record.assigned_thread_count),
    };
  });
};

const toThreadRows = (value: unknown): RedditThreadRow[] => {
  if (!Array.isArray(value)) return [];
  return value as RedditThreadRow[];
};

const toThreadRow = (value: unknown): RedditThreadRow | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as RedditThreadRow;
};

const compactPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
};

const authHeaders = (
  authContext: AuthContext,
  includeJson = false,
): Record<string, string> => {
  const headers: Record<string, string> = {
    "X-TRR-Admin-User-Uid": authContext.firebaseUid,
  };
  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

const backendErrorMessage = (
  data: Record<string, unknown>,
  fallback: string,
): string => {
  if (typeof data.error === "string") return data.error;
  if (typeof data.detail === "string") return data.detail;
  return fallback;
};

const backendError = (
  status: number,
  data: Record<string, unknown>,
  fallback: string,
): Error => {
  const error = new Error(backendErrorMessage(data, fallback));
  if (status === 409) {
    (error as Error & { code?: string }).code = "23505";
  }
  return error;
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
  const queryString = new URLSearchParams();
  if (options.trrShowId) queryString.set("trr_show_id", options.trrShowId);
  queryString.set("include_inactive", includeInactive ? "true" : "false");
  queryString.set("include_assigned_threads", "false");

  const result = await fetchAdminBackendJson(REDDIT_COMMUNITIES_BACKEND_PATH, {
    queryString: queryString.toString(),
    routeName: "reddit-sources:list-communities",
  });
  if (result.status !== 200) {
    throw backendError(result.status, result.data, "Failed to list reddit communities");
  }
  return toCommunityRows(result.data.communities);
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
  const queryString = new URLSearchParams();
  if (options.trrShowId) queryString.set("trr_show_id", options.trrShowId);
  if (options.trrSeasonId) queryString.set("trr_season_id", options.trrSeasonId);
  queryString.set("include_inactive", includeInactive ? "true" : "false");
  queryString.set(
    "include_global_threads_for_season",
    includeGlobalThreadsForSeason ? "true" : "false",
  );
  queryString.set("include_assigned_threads", "true");

  const result = await fetchAdminBackendJson(REDDIT_COMMUNITIES_BACKEND_PATH, {
    queryString: queryString.toString(),
    routeName: "reddit-sources:list-communities-with-threads",
  });
  if (result.status !== 200) {
    throw backendError(result.status, result.data, "Failed to list reddit communities");
  }
  return toCommunityWithThreadsRows(result.data.communities);
}

export async function getRedditCommunityById(id: string): Promise<RedditCommunityRow | null> {
  const result = await fetchAdminBackendJson(`${REDDIT_COMMUNITIES_BACKEND_PATH}/${id}`, {
    routeName: "reddit-sources:get-community",
  });
  if (result.status === 404) return null;
  if (result.status !== 200) {
    throw backendError(result.status, result.data, "Failed to get reddit community");
  }
  const community = result.data.community;
  if (typeof community !== "object" || community === null || Array.isArray(community)) {
    return null;
  }
  return toCommunityRow(community as RedditCommunityRowRaw);
}

export async function createRedditCommunity(
  authContext: AuthContext,
  input: CreateRedditCommunityInput,
): Promise<RedditCommunityRow> {
  const payload = compactPayload({
    trr_show_id: input.trrShowId,
    trr_show_name: input.trrShowName,
    subreddit: input.subreddit,
    display_name: input.displayName ?? null,
    notes: input.notes ?? null,
    is_active: input.isActive ?? true,
    is_show_focused: input.isShowFocused,
    network_focus_targets: input.networkFocusTargets,
    franchise_focus_targets: input.franchiseFocusTargets,
    episode_title_patterns: input.episodeTitlePatterns,
  });
  const result = await fetchAdminBackendJson(REDDIT_COMMUNITIES_BACKEND_PATH, {
    method: "POST",
    headers: authHeaders(authContext, true),
    body: JSON.stringify(payload),
    routeName: "reddit-sources:create-community",
  });
  if (result.status !== 201) {
    throw backendError(result.status, result.data, "Failed to create reddit community");
  }
  return toCommunityRow(result.data.community as RedditCommunityRowRaw);
}

export async function updateRedditCommunity(
  authContext: AuthContext,
  id: string,
  input: UpdateRedditCommunityInput,
): Promise<RedditCommunityRow | null> {
  const payload = compactPayload({
    subreddit: input.subreddit,
    display_name: input.displayName,
    notes: input.notes,
    is_active: input.isActive,
    analysis_flairs: input.analysisFlairs,
    analysis_all_flairs: input.analysisAllFlairs,
    is_show_focused: input.isShowFocused,
    network_focus_targets: input.networkFocusTargets,
    franchise_focus_targets: input.franchiseFocusTargets,
    episode_title_patterns: input.episodeTitlePatterns,
    post_flair_categories: input.postFlairCategories,
    post_flair_assignments: input.postFlairAssignments,
  });
  if (Object.keys(payload).length === 0) {
    return getRedditCommunityById(id);
  }

  const result = await fetchAdminBackendJson(`${REDDIT_COMMUNITIES_BACKEND_PATH}/${id}`, {
    method: "PATCH",
    headers: authHeaders(authContext, true),
    body: JSON.stringify(payload),
    routeName: "reddit-sources:update-community",
  });
  if (result.status === 404) return null;
  if (result.status !== 200) {
    throw backendError(result.status, result.data, "Failed to update reddit community");
  }
  return toCommunityRow(result.data.community as RedditCommunityRowRaw);
}

export async function updateRedditCommunityPostFlairs(
  authContext: AuthContext,
  id: string,
  postFlairs: string[],
  postFlairsUpdatedAt: string,
): Promise<RedditCommunityRow | null> {
  const result = await fetchAdminBackendJson(
    `${REDDIT_COMMUNITIES_BACKEND_PATH}/${id}/post-flairs`,
    {
      method: "PATCH",
      headers: authHeaders(authContext, true),
      body: JSON.stringify({
        post_flairs: postFlairs,
        post_flairs_updated_at: postFlairsUpdatedAt,
      }),
      routeName: "reddit-sources:update-community-post-flairs",
    },
  );
  if (result.status === 404) return null;
  if (result.status !== 200) {
    throw backendError(result.status, result.data, "Failed to update reddit community post flairs");
  }
  const community = result.data.community;
  if (typeof community !== "object" || community === null || Array.isArray(community)) {
    return null;
  }
  return toCommunityRow(community as RedditCommunityRowRaw);
}

export async function deleteRedditCommunity(
  authContext: AuthContext,
  id: string,
): Promise<boolean> {
  const result = await fetchAdminBackendJson(`${REDDIT_COMMUNITIES_BACKEND_PATH}/${id}`, {
    method: "DELETE",
    headers: authHeaders(authContext),
    routeName: "reddit-sources:delete-community",
  });
  if (result.status === 404) return false;
  if (result.status !== 200) {
    throw backendError(result.status, result.data, "Failed to delete reddit community");
  }
  return result.data.success === true;
}

export async function listRedditThreads(
  options: ListRedditThreadsOptions = {},
): Promise<RedditThreadRow[]> {
  const includeGlobalThreadsForSeason = options.includeGlobalThreadsForSeason ?? true;
  const queryString = new URLSearchParams();
  if (options.communityId) queryString.set("community_id", options.communityId);
  if (options.trrShowId) queryString.set("trr_show_id", options.trrShowId);
  if (options.trrSeasonId) queryString.set("trr_season_id", options.trrSeasonId);
  queryString.set(
    "include_global_threads_for_season",
    includeGlobalThreadsForSeason ? "true" : "false",
  );

  const result = await fetchAdminBackendJson(REDDIT_THREADS_BACKEND_PATH, {
    queryString: queryString.toString(),
    routeName: "reddit-sources:list-threads",
  });
  if (result.status !== 200) {
    throw backendError(result.status, result.data, "Failed to list reddit threads");
  }
  return toThreadRows(result.data.threads);
}

export async function getRedditThreadById(id: string): Promise<RedditThreadRow | null> {
  const result = await fetchAdminBackendJson(`${REDDIT_THREADS_BACKEND_PATH}/${id}`, {
    routeName: "reddit-sources:get-thread",
  });
  if (result.status === 404) return null;
  if (result.status !== 200) {
    throw backendError(result.status, result.data, "Failed to get reddit thread");
  }
  return toThreadRow(result.data.thread);
}

export async function createRedditThread(
  authContext: AuthContext,
  input: CreateRedditThreadInput,
): Promise<RedditThreadRow> {
  const payload = compactPayload({
    community_id: input.communityId,
    trr_show_id: input.trrShowId,
    trr_show_name: input.trrShowName,
    trr_season_id: input.trrSeasonId ?? null,
    source_kind: input.sourceKind ?? "manual",
    reddit_post_id: input.redditPostId,
    title: input.title,
    url: input.url,
    permalink: input.permalink ?? null,
    author: input.author ?? null,
    score: toNumberOrZero(input.score ?? 0),
    num_comments: toNumberOrZero(input.numComments ?? 0),
    posted_at: input.postedAt ?? null,
    notes: input.notes ?? null,
  });
  const result = await fetchAdminBackendJson(REDDIT_THREADS_BACKEND_PATH, {
    method: "POST",
    headers: authHeaders(authContext, true),
    body: JSON.stringify(payload),
    routeName: "reddit-sources:create-thread",
  });
  if (result.status !== 201) {
    throw backendError(result.status, result.data, "Failed to create reddit thread");
  }
  const thread = toThreadRow(result.data.thread);
  if (!thread) throw new Error("Failed to create reddit thread");
  return thread;
}

export async function updateRedditThread(
  authContext: AuthContext,
  id: string,
  input: UpdateRedditThreadInput,
): Promise<RedditThreadRow | null> {
  const payload = compactPayload({
    community_id: input.communityId,
    trr_show_id: input.trrShowId,
    trr_show_name: input.trrShowName,
    trr_season_id: input.trrSeasonId,
    source_kind: input.sourceKind,
    title: input.title,
    url: input.url,
    permalink: input.permalink,
    author: input.author,
    score: input.score === undefined ? undefined : toNumberOrZero(input.score),
    num_comments:
      input.numComments === undefined ? undefined : toNumberOrZero(input.numComments),
    posted_at: input.postedAt,
    notes: input.notes,
  });
  if (Object.keys(payload).length === 0) {
    return getRedditThreadById(id);
  }

  const result = await fetchAdminBackendJson(`${REDDIT_THREADS_BACKEND_PATH}/${id}`, {
    method: "PATCH",
    headers: authHeaders(authContext, true),
    body: JSON.stringify(payload),
    routeName: "reddit-sources:update-thread",
  });
  if (result.status === 404) return null;
  if (result.status !== 200) {
    throw backendError(result.status, result.data, "Failed to update reddit thread");
  }
  return toThreadRow(result.data.thread);
}

export async function deleteRedditThread(
  authContext: AuthContext,
  id: string,
): Promise<boolean> {
  const result = await fetchAdminBackendJson(`${REDDIT_THREADS_BACKEND_PATH}/${id}`, {
    method: "DELETE",
    headers: authHeaders(authContext),
    routeName: "reddit-sources:delete-thread",
  });
  if (result.status === 404) return false;
  if (result.status !== 200) {
    throw backendError(result.status, result.data, "Failed to delete reddit thread");
  }
  return result.data.success === true;
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

export interface StoredPostCountsResult {
  counts: Record<string, number>;
  total_posts: number;
  tracked_total_posts: number;
  tracked_flair_counts: StoredTrackedFlairCount[];
  pending_tracked_flair_counts: StoredPendingTrackedFlairCount[];
  flair_counts: Array<{ flair: string; post_count: number }>;
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

type RedditReadOptions = {
  adminContext: VerifiedAdminContext;
};

const REDDIT_POST_RESOLVE_BACKEND_PATH = "/admin/reddit/posts/resolve";
const REDDIT_POST_WINDOW_COUNTS_BACKEND_PATH = "/admin/reddit/post-window-counts";
const REDDIT_POST_WINDOWS_BACKEND_PATH = "/admin/reddit/post-windows";
const CANONICAL_CONTAINER_KEY_RE = /^(episode-\d+|period-preseason|period-postseason)$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const optionalString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const throwForRedditReadStatus = (
  status: number,
  data: Record<string, unknown>,
  fallbackMessage: string,
  routeName: string,
): never => {
  throw buildAdminBackendStatusError({
    status,
    data,
    fallbackMessage,
    routeName,
  });
};

export async function resolveRedditPostDetailBySlug(input: {
  communityId: string;
  seasonId: string;
  windowKey: string;
  titleSlug?: string | null;
  authorSlug?: string | null;
  redditPostId?: string | null;
  adminContext: VerifiedAdminContext;
}): Promise<ResolvedRedditPostDetail | null> {
  const query = new URLSearchParams({
    community_id: input.communityId,
    season_id: input.seasonId,
    window_key: input.windowKey,
  });
  if (input.titleSlug) query.set("slug", input.titleSlug);
  if (input.authorSlug) query.set("author", input.authorSlug);
  if (input.redditPostId) query.set("post_id", input.redditPostId);

  const upstream = await fetchAdminBackendJson(REDDIT_POST_RESOLVE_BACKEND_PATH, {
    apiVersion: "v2",
    adminContext: input.adminContext,
    queryString: query.toString(),
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName: "reddit-sources:resolve-post",
  });
  if (upstream.status === 404) return null;
  if (upstream.status !== 200) {
    throwForRedditReadStatus(
      upstream.status,
      upstream.data,
      "Failed to resolve Reddit post detail",
      "reddit-sources:resolve-post",
    );
  }

  const post = isRecord(upstream.data.post) ? upstream.data.post : {};
  return {
    reddit_post_id: String(upstream.data.reddit_post_id ?? ""),
    detail_slug: String(upstream.data.detail_slug ?? ""),
    collision: upstream.data.collision === true,
    title: typeof post.title === "string" ? post.title : "",
    author: optionalString(post.author),
    posted_at: optionalString(post.posted_at),
    url: optionalString(post.url),
    permalink: optionalString(post.permalink),
  };
}

export async function getStoredPostCountsByCommunityAndSeason(
  communityId: string,
  seasonId: string,
  options: RedditReadOptions,
): Promise<StoredPostCountsResult> {
  const query = new URLSearchParams({
    community_id: communityId,
    season_id: seasonId,
  });
  const upstream = await fetchAdminBackendJson(REDDIT_POST_WINDOW_COUNTS_BACKEND_PATH, {
    apiVersion: "v2",
    adminContext: options.adminContext,
    queryString: query.toString(),
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName: "reddit-sources:post-window-counts",
  });
  if (upstream.status !== 200) {
    throwForRedditReadStatus(
      upstream.status,
      upstream.data,
      "Failed to load Reddit post-window counts",
      "reddit-sources:post-window-counts",
    );
  }
  return upstream.data as unknown as StoredPostCountsResult;
}

export async function getStoredWindowPostsByCommunityAndSeason(
  communityId: string,
  seasonId: string,
  containerKey: string,
  page: number,
  perPage: number,
  options: RedditReadOptions,
): Promise<StoredWindowPostsResult> {
  const normalizedContainerKey = String(containerKey ?? "").trim().toLowerCase();
  if (!CANONICAL_CONTAINER_KEY_RE.test(normalizedContainerKey)) {
    throw new Error("container_key must be a canonical season window key");
  }
  const normalizedPage =
    Number.isFinite(page) && page > 0 ? Math.max(1, Math.trunc(page)) : 1;
  const normalizedPerPage =
    Number.isFinite(perPage) && perPage > 0
      ? Math.min(200, Math.max(1, Math.trunc(perPage)))
      : 200;

  const query = new URLSearchParams({
    community_id: communityId,
    season_id: seasonId,
    container_key: normalizedContainerKey,
    page: String(normalizedPage),
    per_page: String(normalizedPerPage),
  });
  const upstream = await fetchAdminBackendJson(REDDIT_POST_WINDOWS_BACKEND_PATH, {
    apiVersion: "v2",
    adminContext: options.adminContext,
    queryString: query.toString(),
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName: "reddit-sources:post-windows",
  });
  if (upstream.status !== 200) {
    throwForRedditReadStatus(
      upstream.status,
      upstream.data,
      "Failed to load stored Reddit posts",
      "reddit-sources:post-windows",
    );
  }
  return upstream.data as unknown as StoredWindowPostsResult;
}
