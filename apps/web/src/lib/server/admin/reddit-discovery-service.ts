import { fetchSocialBackendJson } from "@/lib/server/trr-api/social-admin-proxy";

export type RedditListingSort = "new" | "hot" | "top";
export type EpisodeDiscussionType = "live" | "post" | "weekly";
export type DiscoveryCollectionMode = "sample" | "exhaustive_window";

export type RedditEpisodeSyncReasonCode = "auto_saved_success" | "already_saved_other_community" | "author_not_automoderator" | "title_missing_episode_discussion" | "missing_episode_air_date" | "missing_post_timestamp" | "invalid_post_timestamp" | "posted_date_mismatch";

export interface RedditEpisodeDiscussionCandidate {
  sync_eligibility?: { eligible: boolean; reason: string; reason_code: RedditEpisodeSyncReasonCode };
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
  episode_number: number;
  discussion_type: EpisodeDiscussionType;
  source_sorts: RedditListingSort[];
  match_reasons: string[];
}

export interface EpisodeDiscussionMatrixCell {
  post_count: number;
  total_comments: number;
  total_upvotes: number;
  top_post_id: string | null;
  top_post_url: string | null;
}

export interface EpisodeDiscussionMatrixRow {
  episode_number: number;
  live: EpisodeDiscussionMatrixCell;
  post: EpisodeDiscussionMatrixCell;
  weekly: EpisodeDiscussionMatrixCell;
  total_posts: number;
  total_comments: number;
  total_upvotes: number;
}

export interface DiscoverEpisodeDiscussionThreadsInput {
  communityId: string;
  rules: { subreddit: string; showName: string; showAliases?: string[] | null; isShowFocused?: boolean; episodeTitlePatterns?: string[] | null; analysisAllFlairs?: string[] | null };
  subreddit: string;
  showName: string;
  showAliases?: string[] | null;
  seasonNumber: number;
  resolvedSeasonId?: string | null;
  seasonEpisodes?: Array<{ id?: string | null; episode_number: number; air_date: string | null }> | null;
  episodeTitlePatterns?: string[] | null;
  episodeRequiredFlairs?: string[] | null;
  episodeFlairAssignments?: Record<string, { season_ids: string[]; episode_ids: string[] }> | null;
  isShowFocused?: boolean;
  periodStart?: string | null;
  periodEnd?: string | null;
  sortModes?: RedditListingSort[];
  limitPerMode?: number;
}

export interface DiscoverEpisodeDiscussionThreadsResult {
  resolved_rules: { effectiveEpisodeTitlePatterns: string[]; effectiveRequiredFlairs: string[]; autoSeededRequiredFlairs: string[] };
  subreddit: string;
  fetched_at: string;
  sources_fetched: RedditListingSort[];
  successful_sorts: RedditListingSort[];
  failed_sorts: RedditListingSort[];
  rate_limited_sorts: RedditListingSort[];
  candidates: RedditEpisodeDiscussionCandidate[];
  episode_matrix: EpisodeDiscussionMatrixRow[];
  expected_episode_count: number;
  expected_episode_numbers: number[];
  coverage_found_episode_count: number;
  coverage_expected_slots: number;
  coverage_found_slots: number;
  coverage_missing_slots: Array<{
    episode_number: number;
    discussion_type: EpisodeDiscussionType;
  }>;
  discovery_source_summary: {
    listing_count: number;
    search_count: number;
    search_pages_fetched: number;
    gap_fill_queries_run: number;
  };
  filters_applied: {
    season_number: number;
    title_patterns: string[];
    required_flairs: string[];
    show_focused: boolean;
    period_start: string | null;
    period_end: string | null;
  };
}


/** Reddit transport and matching execute in the backend's durable workflow. */
export async function discoverEpisodeDiscussionThreads(input: DiscoverEpisodeDiscussionThreadsInput): Promise<DiscoverEpisodeDiscussionThreadsResult> {
  const { communityId, ...payload } = input;
  const started = await fetchSocialBackendJson(`/reddit/communities/${communityId}/episode-discussions/discover`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    fallbackError: "Failed to discover Reddit episode discussions",
    timeoutMs: 15_000,
    retries: 0,
  });
  if (Array.isArray(started.candidates)) return started as unknown as DiscoverEpisodeDiscussionThreadsResult;
  if (started.result && typeof started.result === "object") return started.result as unknown as DiscoverEpisodeDiscussionThreadsResult;
  const jobId = started.job_id;
  if (typeof jobId !== "string") throw new Error("Episode discovery did not return a workflow identifier.");
  const deadline = Date.now() + 70_000;
  while (Date.now() < deadline) {
    const response = await fetchSocialBackendJson(`/reddit/jobs/${encodeURIComponent(jobId)}`, {
      fallbackError: "Unable to check episode discovery progress",
      timeoutMs: Math.max(1, Math.min(10_000, deadline - Date.now())),
      retries: 0,
    });
    const job = (response.job ?? response) as Record<string, unknown>;
    const state = job.state ?? job.status;
    if (state === "completed" && job.result && typeof job.result === "object") return job.result as DiscoverEpisodeDiscussionThreadsResult;
    if (state === "failed" || state === "cancelled") throw new Error(typeof job.error === "string" ? job.error : "Episode discovery failed.");
    await new Promise(resolve => setTimeout(resolve, Math.min(2_000, Math.max(0, deadline - Date.now()))));
  }
  throw new Error(`Episode discovery is still running (job ${jobId}). Refresh again to check the result.`);
}
