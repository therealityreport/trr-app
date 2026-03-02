"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchAdminWithAuth, getClientAuthHeaders } from "@/lib/admin/client-auth";
import { resolvePreferredShowRouteSlug } from "@/lib/admin/show-route-slug";
import {
  buildShowRedditCommunityWindowUrl,
  buildShowRedditCommunityUrl,
  buildShowRedditUrl,
} from "@/lib/admin/show-admin-routes";
import { toCanonicalFlairKey } from "@/lib/reddit/flair-key";

type ManagerMode = "season" | "global";

type RedditThreadSourceKind = "manual" | "episode_discussion";

interface RedditThread {
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
  created_at: string;
  updated_at: string;
}

interface RedditThreadResponse extends Omit<RedditThread, "source_kind"> {
  source_kind?: RedditThreadSourceKind | null;
}

interface RedditCommunity {
  id: string;
  trr_show_id: string;
  trr_show_name: string;
  subreddit: string;
  display_name: string | null;
  notes: string | null;
  post_flares: string[];
  analysis_flares: string[];
  analysis_all_flares: string[];
  is_show_focused: boolean;
  network_focus_targets: string[];
  franchise_focus_targets: string[];
  episode_title_patterns: string[];
  post_flares_updated_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_thread_count: number;
  assigned_threads: RedditThread[];
}

interface RedditCommunityResponse extends Omit<RedditCommunity, "assigned_thread_count" | "assigned_threads"> {
  assigned_thread_count?: number;
  assigned_threads?: RedditThreadResponse[];
}

interface DiscoveryThread {
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
  source_sorts: Array<"new" | "hot" | "top">;
  matched_terms: string[];
  matched_cast_terms: string[];
  cross_show_terms: string[];
  is_show_match: boolean;
  passes_flair_filter: boolean;
  flair_mode?: "all" | "scan_term" | "forced" | "show_match" | null;
  match_score: number;
  suggested_include_terms: string[];
  suggested_exclude_terms: string[];
}

interface DiscoveryPayload {
  subreddit: string;
  fetched_at: string;
  collection_mode?: "sample" | "exhaustive_window";
  listing_pages_fetched?: number;
  max_pages_applied?: number;
  window_exhaustive_complete?: boolean | null;
  totals?: {
    fetched_rows: number;
    matched_rows: number;
    tracked_flair_rows: number;
  };
  window_start?: string | null;
  window_end?: string | null;
  search_backfill?: {
    enabled: boolean;
    queries_run: number;
    pages_fetched: number;
    rows_fetched: number;
    rows_in_window: number;
    complete: boolean;
    query_diagnostics: Array<{
      flair: string;
      query: string;
      pages_fetched: number;
      rows_fetched: number;
      rows_in_window: number;
      reached_period_start: boolean;
      complete: boolean;
    }>;
  } | null;
  sources_fetched: Array<"new" | "hot" | "top">;
  terms: string[];
  hints: {
    suggested_include_terms: string[];
    suggested_exclude_terms: string[];
  };
  threads: DiscoveryThread[];
}

interface EpisodeDiscussionCandidate {
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
  discussion_type: "live" | "post" | "weekly";
  source_sorts: Array<"new" | "hot" | "top">;
  match_reasons: string[];
}

interface EpisodeDiscussionMatrixCell {
  post_count: number;
  total_comments: number;
  total_upvotes: number;
  top_post_id: string | null;
  top_post_url: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

interface EpisodeDiscussionMatrixRow {
  episode_number: number;
  episode_air_date?: string | null;
  live: EpisodeDiscussionMatrixCell;
  post: EpisodeDiscussionMatrixCell;
  weekly: EpisodeDiscussionMatrixCell;
  total_posts: number;
  total_comments: number;
  total_upvotes: number;
}

interface SeasonEpisodeRow {
  id: string;
  episode_number: number;
  title: string | null;
  air_date: string | null;
}

type SyncCandidateStatus = "auto_saved" | "skipped_conflict" | "not_eligible";

type SyncCandidateReasonCode =
  | "auto_saved_success"
  | "already_saved_other_community"
  | "author_not_automoderator"
  | "title_missing_episode_discussion"
  | "missing_episode_air_date"
  | "missing_post_timestamp"
  | "invalid_post_timestamp"
  | "posted_date_mismatch";

interface SyncCandidateResult {
  reddit_post_id: string;
  status: SyncCandidateStatus;
  reason_code?: SyncCandidateReasonCode;
  reason: string;
}

interface EpisodeDiscussionRefreshPayload {
  community?: RedditCommunityResponse;
  candidates?: EpisodeDiscussionCandidate[];
  episode_matrix?: EpisodeDiscussionMatrixRow[];
  meta?: {
    fetched_at?: string;
    total_found?: number;
    filters_applied?: Record<string, unknown>;
    effective_episode_title_patterns?: string[];
    effective_required_flares?: string[];
    auto_seeded_required_flares?: boolean;
    successful_sorts?: Array<"new" | "hot" | "top">;
    failed_sorts?: Array<"new" | "hot" | "top">;
    rate_limited_sorts?: Array<"new" | "hot" | "top">;
    expected_episode_count?: number;
    expected_episode_numbers?: number[];
    coverage_found_episode_count?: number;
    coverage_expected_slots?: number;
    coverage_found_slots?: number;
    coverage_missing_slots?: Array<{
      episode_number: number;
      discussion_type: "live" | "post" | "weekly";
    }>;
    discovery_source_summary?: {
      listing_count?: number;
      search_count?: number;
      search_pages_fetched?: number;
      gap_fill_queries_run?: number;
    };
    season_context?: {
      season_id?: string;
      season_number?: number;
    };
    period_context?: {
      selected_window_start?: string | null;
      selected_window_end?: string | null;
      selected_period_labels?: string[];
    };
    sync_requested?: boolean;
    sync_auto_saved_count?: number;
    sync_auto_saved_post_ids?: string[];
    sync_skipped_conflicts?: string[];
    sync_skipped_ineligible_count?: number;
    sync_candidate_results?: SyncCandidateResult[];
  };
  error?: string;
}

interface EpisodeDiscussionSavePayload {
  success?: boolean;
  saved_count?: number;
  skipped_conflicts?: string[];
  error?: string;
}

interface CoveredShow {
  trr_show_id: string;
  show_name: string;
}

interface ShowSeasonOption {
  id: string;
  season_number: number;
  title?: string | null;
  name?: string | null;
  air_date?: string | null;
  premiere_date?: string | null;
  has_scheduled_or_aired_episode?: boolean;
  episode_airdate_count?: number;
}

interface TrrShowMetadata {
  id: string;
  slug: string;
  canonical_slug?: string | null;
  alternative_names?: string[];
}

export interface RedditCommunityContext {
  communityLabel: string;
  communitySlug: string;
  showLabel: string;
  showFullName: string;
  showSlug: string | null;
  seasonLabel: string | null;
  showId: string;
  seasonId: string | null;
  seasonNumber: number | null;
}

interface SocialAnalyticsPeriodRow {
  week_index?: number;
  label?: string;
  start?: string;
  end?: string;
}

interface EpisodePeriodOption {
  key: string;
  label: string;
  start: string;
  end: string;
}

type CommunityContextSeed = Pick<RedditCommunity, "id" | "trr_show_id" | "trr_show_name" | "subreddit">;

interface CommunityFlaresRefreshResponse {
  community?: RedditCommunityResponse;
  flares?: string[];
  source?: "api" | "listing_fallback" | "none";
  warning?: string | null;
  error?: string;
}

interface DiscoveryFetchOptions {
  seasonId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  containerKey?: string | null;
  periodLabel?: string | null;
  coverageMode?: "standard" | "adaptive_deep" | "max_coverage";
  exhaustive?: boolean;
  searchBackfill?: boolean;
  refresh?: boolean;
  waitForCompletion?: boolean;
  forceFlair?: string | null;
  forceFlares?: string[];
  maxPages?: number;
  timeoutMs?: number;
}

interface DiscoveryFetchResult {
  discovery: DiscoveryPayload | null;
  warning: string | null;
  run: RefreshRunStatus | null;
  source: "cache" | "live_run" | null;
}

interface RefreshRunStatus {
  run_id: string;
  status: "queued" | "running" | "completed" | "partial" | "failed" | "cancelled";
  error?: string | null;
  totals?: {
    fetched_rows?: number;
    matched_rows?: number;
    tracked_flair_rows?: number;
  };
  diagnostics?: {
    coverage_mode?: "standard" | "adaptive_deep" | "max_coverage";
    passes_run?: number;
    passes?: Array<{
      pass_index?: number;
      max_pages?: number;
      backfill_queries?: number;
      backfill_pages_per_query?: number;
      listing_pages_fetched?: number;
      search_pages_fetched?: number;
      fetched_rows?: number;
      matched_rows?: number;
      tracked_flair_rows?: number;
      window_exhaustive_complete?: boolean | null;
      search_backfill_complete?: boolean | null;
    }>;
    final_completeness?: {
      listing_complete?: boolean;
      backfill_complete?: boolean;
    };
    listing_pages_fetched?: number;
    max_pages_applied?: number;
    search_backfill?: {
      pages_fetched?: number;
    };
    progress?: {
      stage?: string;
      listing_pages_fetched?: number;
      search_pages_fetched?: number;
      rows_discovered_raw?: number;
      rows_matched?: number;
      comments_targets_total?: number;
      comments_targets_done?: number;
      comments_rows_upserted?: number;
      updated_at?: string;
    };
  };
  queue?: {
    running_total?: number;
    queued_total?: number;
    other_running?: number;
    other_queued?: number;
    queued_ahead?: number;
  };
  queue_position?: number | null;
  active_jobs?: number | null;
  updated_at?: string | null;
}

interface ContainerRefreshProgress {
  runId: string;
  status: RefreshRunStatus["status"];
  message: string;
}

export interface RedditSourcesManagerProps {
  mode: ManagerMode;
  showId?: string;
  showSlug?: string;
  showName?: string;
  seasonId?: string | null;
  seasonNumber?: number | null;
  initialCommunityId?: string;
  hideCommunityList?: boolean;
  backHref?: string;
  episodeDiscussionsPlacement?: "settings" | "inline";
  enableEpisodeSync?: boolean;
  onCommunityContextChange?: (context: RedditCommunityContext | null) => void;
}

const fmtDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const fmtNum = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

const fmtDate = (value: string | null | undefined): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
};

const addDaysIso = (value: string | null | undefined, days: number): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString();
};

const parseDateMs = (value: string | null | undefined): number | null => {
  if (!value || typeof value !== "string") return null;
  const parsed = new Date(value);
  const ms = parsed.getTime();
  if (!Number.isFinite(ms)) return null;
  return ms;
};

const normalizeFlairKey = (value: string | null | undefined): string => toCanonicalFlairKey(value);

const describeFlairMode = (mode: DiscoveryThread["flair_mode"]): string | null => {
  if (!mode) return null;
  if (mode === "all") return "All-flair include";
  if (mode === "scan_term") return "Scan-flair term include";
  if (mode === "forced") return "Forced flair include";
  if (mode === "show_match") return "Show-match include";
  return null;
};

type SlotDiscussionType = "live" | "post" | "weekly";
const buildEpisodeSlotKey = (episodeNumber: number, discussionType: SlotDiscussionType): string =>
  `${episodeNumber}:${discussionType}`;

const EPISODE_FILTER_CATEGORY_RULES: Array<{ label: string; pattern: RegExp }> = [
  { label: "Live Episode Discussion", pattern: /\blive\b/i },
  { label: "Post Episode Discussion", pattern: /\bpost\b/i },
  { label: "Weekly Episode Discussion", pattern: /\bweekly\b/i },
  { label: "Pre-Season", pattern: /\b(pre[\s-]?season|trailer|premiere)\b/i },
  { label: "Post-Season", pattern: /\b(post[\s-]?season|reunion|finale)\b/i },
];

const resolveEpisodeFilterCategoryLabel = (pattern: string): string => {
  const trimmed = pattern.trim();
  if (!trimmed) return "General";
  const matched = EPISODE_FILTER_CATEGORY_RULES.find((rule) => rule.pattern.test(trimmed));
  return matched?.label ?? "General";
};

const REQUEST_TIMEOUT_DEFAULT_MS = 60_000;
const REQUEST_TIMEOUT_MS = {
  default: REQUEST_TIMEOUT_DEFAULT_MS,
  communities: 45_000,
  discover: 45_000,
  discoverRefresh: 180_000,
  runStatus: 30_000,
  seasonContext: 75_000,
  periodOptions: 20_000,
  episodeRefresh: 90_000,
  episodeSave: 90_000,
} as const;
const ENABLE_REDDIT_PERF_TIMINGS =
  process.env.NODE_ENV !== "test" && process.env.NEXT_PUBLIC_REDDIT_DEBUG_TIMINGS !== "0";

const CONTAINER_RUN_POLL_INTERVAL_MS = 3_000;
const CONTAINER_RUN_POLL_MAX_ATTEMPTS = 80;
const REFRESH_RUN_STATUSES: RefreshRunStatus["status"][] = [
  "queued",
  "running",
  "completed",
  "partial",
  "failed",
  "cancelled",
];
const TERMINAL_REFRESH_RUN_STATUSES = new Set<RefreshRunStatus["status"]>([
  "completed",
  "partial",
  "failed",
  "cancelled",
]);

const logRedditPerfTiming = (
  event: string,
  startedAtMs: number,
  context: Record<string, unknown> = {},
): void => {
  if (!ENABLE_REDDIT_PERF_TIMINGS) return;
  const now =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  console.info("[reddit_ui_perf]", {
    event,
    elapsed_ms: Math.max(0, Math.round(now - startedAtMs)),
    ...context,
  });
};
const isRefreshRunStatus = (value: unknown): value is RefreshRunStatus["status"] =>
  typeof value === "string" && REFRESH_RUN_STATUSES.includes(value as RefreshRunStatus["status"]);
const isRefreshRunActiveStatus = (status: RefreshRunStatus["status"]): boolean =>
  status === "queued" || status === "running";

const parseOptionalNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const parseRefreshRunQueue = (value: unknown): RefreshRunStatus["queue"] | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const queue = value as Record<string, unknown>;
  return {
    running_total: parseOptionalNumber(queue.running_total),
    queued_total: parseOptionalNumber(queue.queued_total),
    other_running: parseOptionalNumber(queue.other_running),
    other_queued: parseOptionalNumber(queue.other_queued),
    queued_ahead: parseOptionalNumber(queue.queued_ahead),
  };
};

const parseRefreshRunDiagnostics = (value: unknown): RefreshRunStatus["diagnostics"] | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const diagnostics = value as Record<string, unknown>;
  const searchBackfillRaw = diagnostics.search_backfill;
  const progressRaw = diagnostics.progress;
  const passesRaw = Array.isArray(diagnostics.passes) ? diagnostics.passes : [];
  const finalCompletenessRaw =
    diagnostics.final_completeness && typeof diagnostics.final_completeness === "object"
      ? (diagnostics.final_completeness as Record<string, unknown>)
      : null;
  const coverageModeRaw = diagnostics.coverage_mode;
  const coverageMode =
    coverageModeRaw === "adaptive_deep" || coverageModeRaw === "max_coverage" || coverageModeRaw === "standard"
      ? coverageModeRaw
      : undefined;
  const parsedPasses = passesRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const pass = item as Record<string, unknown>;
      return {
        pass_index: parseOptionalNumber(pass.pass_index),
        max_pages: parseOptionalNumber(pass.max_pages),
        backfill_queries: parseOptionalNumber(pass.backfill_queries),
        backfill_pages_per_query: parseOptionalNumber(pass.backfill_pages_per_query),
        listing_pages_fetched: parseOptionalNumber(pass.listing_pages_fetched),
        search_pages_fetched: parseOptionalNumber(pass.search_pages_fetched),
        fetched_rows: parseOptionalNumber(pass.fetched_rows),
        matched_rows: parseOptionalNumber(pass.matched_rows),
        tracked_flair_rows: parseOptionalNumber(pass.tracked_flair_rows),
        window_exhaustive_complete:
          typeof pass.window_exhaustive_complete === "boolean" ? pass.window_exhaustive_complete : null,
        search_backfill_complete:
          typeof pass.search_backfill_complete === "boolean" ? pass.search_backfill_complete : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  return {
    coverage_mode: coverageMode,
    passes_run: parseOptionalNumber(diagnostics.passes_run),
    passes: parsedPasses,
    final_completeness: finalCompletenessRaw
      ? {
          listing_complete:
            typeof finalCompletenessRaw.listing_complete === "boolean"
              ? finalCompletenessRaw.listing_complete
              : undefined,
          backfill_complete:
            typeof finalCompletenessRaw.backfill_complete === "boolean"
              ? finalCompletenessRaw.backfill_complete
              : undefined,
        }
      : undefined,
    listing_pages_fetched: parseOptionalNumber(diagnostics.listing_pages_fetched),
    max_pages_applied: parseOptionalNumber(diagnostics.max_pages_applied),
    search_backfill:
      searchBackfillRaw && typeof searchBackfillRaw === "object"
        ? {
            pages_fetched: parseOptionalNumber((searchBackfillRaw as Record<string, unknown>).pages_fetched),
          }
        : undefined,
    progress:
      progressRaw && typeof progressRaw === "object"
        ? {
            stage:
              typeof (progressRaw as Record<string, unknown>).stage === "string"
                ? ((progressRaw as Record<string, unknown>).stage as string)
                : undefined,
            listing_pages_fetched: parseOptionalNumber(
              (progressRaw as Record<string, unknown>).listing_pages_fetched,
            ),
            search_pages_fetched: parseOptionalNumber(
              (progressRaw as Record<string, unknown>).search_pages_fetched,
            ),
            rows_discovered_raw: parseOptionalNumber(
              (progressRaw as Record<string, unknown>).rows_discovered_raw,
            ),
            rows_matched: parseOptionalNumber((progressRaw as Record<string, unknown>).rows_matched),
            comments_targets_total: parseOptionalNumber(
              (progressRaw as Record<string, unknown>).comments_targets_total,
            ),
            comments_targets_done: parseOptionalNumber(
              (progressRaw as Record<string, unknown>).comments_targets_done,
            ),
            comments_rows_upserted: parseOptionalNumber(
              (progressRaw as Record<string, unknown>).comments_rows_upserted,
            ),
            updated_at:
              typeof (progressRaw as Record<string, unknown>).updated_at === "string"
                ? ((progressRaw as Record<string, unknown>).updated_at as string)
                : undefined,
          }
        : undefined,
  };
};

const isContainerRefreshActive = (progress: ContainerRefreshProgress | undefined): boolean =>
  Boolean(progress && isRefreshRunActiveStatus(progress.status));

const REQUEST_CANCELLED_ERROR_MESSAGE = "";

class RequestCancelledError extends Error {
  constructor(message: string = REQUEST_CANCELLED_ERROR_MESSAGE) {
    super(message);
    this.name = "RequestCancelledError";
  }
}

const isRequestCancelledError = (err: unknown): boolean =>
  err instanceof RequestCancelledError ||
  (typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "RequestCancelledError");

const toErrorMessage = (err: unknown, fallback: string): string =>
  isRequestCancelledError(err)
    ? ""
    : err instanceof Error && err.message.trim().length > 0
      ? err.message
      : fallback;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isTimeoutErrorMessage = (message: string): boolean => /\btimed out\b|\btimeout\b/i.test(message);
const isNoCacheYetWarning = (message: string | null | undefined): boolean =>
  typeof message === "string" && /no cached posts found yet/i.test(message);

const buildContainerRunProgressMessage = (label: string, run: RefreshRunStatus): string => {
  const liveProgress = run.diagnostics?.progress;
  const listingPages = liveProgress?.listing_pages_fetched ?? run.diagnostics?.listing_pages_fetched;
  const searchPages = liveProgress?.search_pages_fetched ?? run.diagnostics?.search_backfill?.pages_fetched;
  const discoveredRows = liveProgress?.rows_discovered_raw;
  const matchedRows = liveProgress?.rows_matched;
  const commentTargetsTotal = liveProgress?.comments_targets_total;
  const commentTargetsDone = liveProgress?.comments_targets_done;
  const commentsUpserted = liveProgress?.comments_rows_upserted;
  const listingText = typeof listingPages === "number" ? ` · listings ${fmtNum(listingPages)}` : "";
  const searchText = typeof searchPages === "number" ? ` · search pages ${fmtNum(searchPages)}` : "";
  const rowText =
    typeof discoveredRows === "number" || typeof matchedRows === "number"
      ? ` · rows ${fmtNum(discoveredRows ?? 0)} raw / ${fmtNum(matchedRows ?? 0)} matched`
      : "";
  const commentTargetText =
    typeof commentTargetsTotal === "number"
      ? ` · comments ${fmtNum(commentTargetsDone ?? 0)}/${fmtNum(commentTargetsTotal)} posts`
      : "";
  const commentsUpsertedText =
    typeof commentsUpserted === "number" ? ` · comment rows ${fmtNum(commentsUpserted)}` : "";
  const stageTextByKey: Record<string, string> = {
    discovering_posts: "discovering posts",
    persisting_posts: "saving posts",
    persisting_period_matches: "saving period matches",
    fetching_comments: "fetching comments",
    finalizing: "finalizing run",
  };
  const normalizedStage = (liveProgress?.stage ?? "").trim().toLowerCase();
  const stageText = stageTextByKey[normalizedStage] ?? "scraping in progress";
  const otherRunning = run.queue?.other_running;
  const queuedAhead = run.queue?.queued_ahead;
  const otherQueued = run.queue?.other_queued;
  const queuedHintParts: string[] = [];
  if (typeof otherRunning === "number" && otherRunning > 0) {
    queuedHintParts.push(`${fmtNum(otherRunning)} other running`);
  }
  if (typeof queuedAhead === "number") {
    if (queuedAhead > 0) {
      queuedHintParts.push(`${fmtNum(queuedAhead)} ahead`);
    } else if (run.status === "queued" && queuedHintParts.length === 0) {
      queuedHintParts.push("next up");
    }
  } else if (typeof otherQueued === "number" && otherQueued > 0) {
    queuedHintParts.push(`${fmtNum(otherQueued)} other queued`);
  }
  const queuedHintText = queuedHintParts.length > 0 ? ` · ${queuedHintParts.join(" · ")}` : "";
  if (run.status === "queued") {
    const queuePositionText =
      typeof run.queue_position === "number" && run.queue_position > 0
        ? ` · queue #${fmtNum(run.queue_position)}`
        : "";
    const activeJobsText =
      typeof run.active_jobs === "number" && run.active_jobs > 0
        ? ` · ${fmtNum(run.active_jobs)} active jobs`
        : "";
    return `${label}: refresh queued in backend (run ${run.run_id.slice(0, 8)})${queuePositionText}${activeJobsText}${queuedHintText}${listingText}${searchText}`;
  }
  if (run.status === "running") {
    const runningHintText =
      typeof otherRunning === "number" && otherRunning > 0
        ? ` · ${fmtNum(otherRunning)} other running`
        : "";
    return `${label}: ${stageText} (run ${run.run_id.slice(0, 8)})${runningHintText}${listingText}${searchText}${rowText}${commentTargetText}${commentsUpsertedText}`;
  }
  if (run.status === "completed" || run.status === "partial") {
    const tracked = run.totals?.tracked_flair_rows;
    const fetched = run.totals?.fetched_rows;
    const passesRun = run.diagnostics?.passes_run;
    const listingComplete = run.diagnostics?.final_completeness?.listing_complete;
    const backfillComplete = run.diagnostics?.final_completeness?.backfill_complete;
    const totalsText =
      typeof tracked === "number" || typeof fetched === "number"
        ? ` · tracked ${fmtNum(tracked ?? 0)} · fetched ${fmtNum(fetched ?? 0)}`
        : "";
    const passText =
      typeof passesRun === "number" && passesRun > 1
        ? ` after ${fmtNum(passesRun)} passes`
        : "";
    const completenessHints: string[] = [];
    if (run.status === "partial") {
      if (listingComplete === false) completenessHints.push("listing incomplete");
      if (backfillComplete === false) completenessHints.push("backfill incomplete");
    }
    const completenessText =
      completenessHints.length > 0 ? ` · ${completenessHints.join(" · ")}` : "";
    if (run.status === "partial") {
      return `${label}: refresh completed with partial coverage${passText}${completenessText}${totalsText}`;
    }
    return `${label}: refresh completed${passText}${totalsText}`;
  }
  if (run.status === "failed") {
    return `${label}: refresh failed${run.error ? ` · ${run.error}` : ""}`;
  }
  return `${label}: refresh cancelled${run.error ? ` · ${run.error}` : ""}`;
};

const mergeDiscoveryPayloads = (input: {
  payloads: DiscoveryPayload[];
  trackedFlairLabel: string | null;
}): DiscoveryPayload | null => {
  if (input.payloads.length === 0) return null;

  const threadsById = new Map<string, DiscoveryThread>();
  const sourceSorts = new Set<"new" | "hot" | "top">();
  const terms = new Set<string>();
  const suggestedIncludeTerms = new Set<string>();
  const suggestedExcludeTerms = new Set<string>();
  let listingPagesFetched = 0;
  let maxPagesApplied = 0;
  let anyIncompleteWindow = false;
  let minWindowStartMs: number | null = null;
  let maxWindowEndMs: number | null = null;

  for (const payload of input.payloads) {
    listingPagesFetched += payload.listing_pages_fetched ?? 0;
    maxPagesApplied = Math.max(maxPagesApplied, payload.max_pages_applied ?? 0);
    anyIncompleteWindow = anyIncompleteWindow || payload.window_exhaustive_complete === false;

    const windowStartMs = parseDateMs(payload.window_start ?? null);
    const windowEndMs = parseDateMs(payload.window_end ?? null);
    if (windowStartMs !== null) {
      minWindowStartMs = minWindowStartMs === null ? windowStartMs : Math.min(minWindowStartMs, windowStartMs);
    }
    if (windowEndMs !== null) {
      maxWindowEndMs = maxWindowEndMs === null ? windowEndMs : Math.max(maxWindowEndMs, windowEndMs);
    }

    for (const sort of payload.sources_fetched ?? []) {
      sourceSorts.add(sort);
    }
    for (const term of payload.terms ?? []) {
      terms.add(term);
    }
    for (const term of payload.hints?.suggested_include_terms ?? []) {
      suggestedIncludeTerms.add(term);
    }
    for (const term of payload.hints?.suggested_exclude_terms ?? []) {
      suggestedExcludeTerms.add(term);
    }

    for (const thread of payload.threads ?? []) {
      const existing = threadsById.get(thread.reddit_post_id);
      if (!existing) {
        threadsById.set(thread.reddit_post_id, thread);
        continue;
      }
      const mergedSorts = [...new Set([...(existing.source_sorts ?? []), ...(thread.source_sorts ?? [])])];
      const existingPostedMs = parseDateMs(existing.posted_at);
      const nextPostedMs = parseDateMs(thread.posted_at);
      const preferNext =
        (nextPostedMs ?? Number.NEGATIVE_INFINITY) > (existingPostedMs ?? Number.NEGATIVE_INFINITY) ||
        thread.num_comments > existing.num_comments ||
        thread.score > existing.score;
      const base = preferNext ? thread : existing;
      threadsById.set(thread.reddit_post_id, {
        ...base,
        source_sorts: mergedSorts,
      });
    }
  }

  const mergedThreads = [...threadsById.values()].sort((a, b) => {
    const postedDiff = (parseDateMs(b.posted_at) ?? 0) - (parseDateMs(a.posted_at) ?? 0);
    if (postedDiff !== 0) return postedDiff;
    if (b.num_comments !== a.num_comments) return b.num_comments - a.num_comments;
    return b.score - a.score;
  });

  const trackedFlairKey = normalizeFlairKey(input.trackedFlairLabel);
  const trackedFlairRows = trackedFlairKey
    ? mergedThreads.reduce((count, thread) => {
        const threadFlairKey = normalizeFlairKey(thread.link_flair_text);
        return threadFlairKey === trackedFlairKey ? count + 1 : count;
      }, 0)
    : mergedThreads.length;

  return {
    subreddit: input.payloads[0]?.subreddit ?? "",
    fetched_at: new Date().toISOString(),
    collection_mode: "exhaustive_window",
    sources_fetched: [...sourceSorts],
    terms: [...terms],
    hints: {
      suggested_include_terms: [...suggestedIncludeTerms].slice(0, 8),
      suggested_exclude_terms: [...suggestedExcludeTerms].slice(0, 8),
    },
    threads: mergedThreads,
    listing_pages_fetched: listingPagesFetched,
    max_pages_applied: maxPagesApplied,
    window_exhaustive_complete: !anyIncompleteWindow,
    totals: {
      fetched_rows: mergedThreads.length,
      matched_rows: mergedThreads.length,
      tracked_flair_rows: trackedFlairRows,
    },
    window_start: minWindowStartMs !== null ? new Date(minWindowStartMs).toISOString() : null,
    window_end: maxWindowEndMs !== null ? new Date(maxWindowEndMs).toISOString() : null,
    search_backfill: null,
  };
};

const isRedditHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  return (
    host === "reddit.com" ||
    host === "redd.it" ||
    host.endsWith(".reddit.com") ||
    host.endsWith(".redd.it")
  );
};

const normalizeFlairList = (value: unknown): string[] => {
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
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
};

const pushListValue = (list: string[], rawValue: string): string[] => normalizeFlairList([...list, rawValue]);

const toIsoDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const SHOW_ACRONYM_STOP_WORDS = new Set(["the", "and", "&", "a", "an"]);

const resolveShowLabel = (showName: string, alternatives: string[] | null | undefined): string => {
  const alias = (alternatives ?? [])
    .map((value) => value.trim())
    .find((value) => /^[A-Z0-9]{3,}$/.test(value));
  if (alias) return alias;

  const parts = showName
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((part) => part && !SHOW_ACRONYM_STOP_WORDS.has(part));
  if (parts.length === 0) return showName;
  const acronym = parts.map((part) => part[0]).join("").toUpperCase();
  return acronym || showName;
};

const getCommunityTypeBadges = (community: RedditCommunity): string[] => {
  const badges: string[] = [];
  if (community.is_show_focused) {
    badges.push("SHOW COMMUNITY");
  }
  if (community.network_focus_targets.length > 0) {
    badges.push("NETWORK COMMUNITY");
  }
  if (community.franchise_focus_targets.length > 0) {
    badges.push("FRANCHISE COMMUNITY");
  }
  return badges;
};

const getCommunityTitle = (community: Pick<RedditCommunity, "subreddit">): string =>
  `r/${community.subreddit.replace(/^\/?r\//i, "")}`;

const normalizeCommunityLookupKey = (value: string | null | undefined): string => {
  if (!value) return "";
  const raw = value.trim();
  if (!raw) return "";
  const withoutPrefix = raw.replace(/^r\//i, "");
  return withoutPrefix.toLowerCase();
};

const normalizeCommunitySlugForPath = (value: string | null | undefined): string => {
  if (!value) return "";
  const raw = value.trim();
  if (!raw) return "";

  let candidate = raw;
  const redditUrlMatch = candidate.match(
    /^https?:\/\/(?:www\.)?(?:old\.)?reddit\.com\/r\/([^/?#]+)/i,
  );
  if (redditUrlMatch?.[1]) {
    candidate = redditUrlMatch[1];
  }

  return candidate
    .replace(/^\/?r\//i, "")
    .replace(/^u\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .trim();
};

const calculateLevenshteinDistance = (source: string, target: string): number => {
  const sourceLength = source.length;
  const targetLength = target.length;
  if (sourceLength === 0) return targetLength;
  if (targetLength === 0) return sourceLength;

  const matrix = Array.from({ length: sourceLength + 1 }, () =>
    Array.from<number>({ length: targetLength + 1 }).fill(0),
  );
  for (let i = 0; i <= sourceLength; i += 1) matrix[i]![0] = i;
  for (let j = 0; j <= targetLength; j += 1) matrix[0]![j] = j;

  for (let i = 1; i <= sourceLength; i += 1) {
    for (let j = 1; j <= targetLength; j += 1) {
      const substitutionCost = source[i - 1] === target[j - 1] ? 0 : 1;
      const deletion = matrix[i - 1]![j]! + 1;
      const insertion = matrix[i]![j - 1]! + 1;
      const substitution = matrix[i - 1]![j - 1]! + substitutionCost;
      matrix[i]![j] = Math.min(deletion, insertion, substitution);
    }
  }
  return matrix[sourceLength]![targetLength]!;
};

const resolveInitialCommunityMatch = (
  communities: RedditCommunity[],
  initialCommunityId: string | null | undefined,
): RedditCommunity | null => {
  if (!initialCommunityId) return null;

  const exactId = communities.find((community) => community.id === initialCommunityId);
  if (exactId) return exactId;

  const lookupKey = normalizeCommunityLookupKey(initialCommunityId);
  if (!lookupKey) return null;

  const exactSubreddit = communities.find(
    (community) => normalizeCommunityLookupKey(community.subreddit) === lookupKey,
  );
  if (exactSubreddit) return exactSubreddit;

  const candidates = communities
    .map((community) => ({
      community,
      subredditKey: normalizeCommunityLookupKey(community.subreddit),
    }))
    .filter((entry) => entry.subredditKey.length > 0)
    .map((entry) => ({
      ...entry,
      distance: calculateLevenshteinDistance(lookupKey, entry.subredditKey),
      lengthDelta: Math.abs(lookupKey.length - entry.subredditKey.length),
    }))
    .filter((entry) => entry.lengthDelta <= 3);

  if (candidates.length === 0) return null;

  const minDistance = Math.min(...candidates.map((entry) => entry.distance));
  if (minDistance > 2) return null;

  const closest = candidates.filter((entry) => entry.distance === minDistance);
  if (closest.length !== 1) return null;
  return closest[0]!.community;
};

const toTitleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const isSeasonEligibleForRedditSelection = (
  season: ShowSeasonOption,
  options?: { maxSeasonNumber?: number | null; nowMs?: number },
): boolean => {
  const hasEpisodeSignal =
    typeof season.episode_airdate_count === "number" && season.episode_airdate_count > 0;
  if (!hasEpisodeSignal) return false;

  const maxSeasonNumber = options?.maxSeasonNumber;
  if (
    typeof maxSeasonNumber === "number" &&
    Number.isFinite(maxSeasonNumber) &&
    season.season_number > maxSeasonNumber
  ) {
    return false;
  }

  const nowMs = options?.nowMs ?? Date.now();
  const premiereMs = parseDateMs(season.premiere_date);
  if (premiereMs !== null) {
    return premiereMs <= nowMs;
  }
  const seasonAirDateMs = parseDateMs(season.air_date);
  if (seasonAirDateMs !== null) {
    return seasonAirDateMs <= nowMs;
  }

  return true;
};

const getRelevantPostFlares = (community: RedditCommunity): string[] => {
  const selectedFlairKeys = new Set(
    [...community.analysis_all_flares, ...community.analysis_flares].map((value) => normalizeFlairKey(value)),
  );
  if (selectedFlairKeys.size === 0) return [];

  const relevant: string[] = [];
  const seen = new Set<string>();

  for (const flair of community.post_flares) {
    const key = normalizeFlairKey(flair);
    if (!selectedFlairKeys.has(key) || seen.has(key)) continue;
    relevant.push(flair);
    seen.add(key);
  }

  for (const flair of [...community.analysis_all_flares, ...community.analysis_flares]) {
    const key = normalizeFlairKey(flair);
    if (seen.has(key)) continue;
    relevant.push(flair);
    seen.add(key);
  }

  return relevant;
};

const formatDiscussionTypeLabel = (type: "live" | "post" | "weekly"): string => {
  if (type === "live") return "Live";
  if (type === "post") return "Post";
  return "Weekly";
};

const formatDiscussionPeriodLabel = (type: "live" | "post" | "weekly"): string => {
  if (type === "live") return "Live Discussion";
  if (type === "post") return "Post Episode Discussion";
  return "Weekly Discussion";
};

const resolveDiscussionSlotDate = (
  episodeAirDate: string | null | undefined,
  discussionType: SlotDiscussionType,
): string | null => {
  if (!episodeAirDate) return null;
  if (discussionType === "weekly") {
    return addDaysIso(episodeAirDate, 1);
  }
  return episodeAirDate;
};

const buildWindowSlugFromContainerKey = (containerKey: string): string => {
  if (containerKey === "period-preseason") return "w0";
  const episodeMatch = containerKey.match(/^episode-(\d+)$/i);
  if (episodeMatch) {
    return `e${episodeMatch[1]}`;
  }
  if (containerKey === "period-postseason") return "w-postseason";
  return containerKey.replace(/^period-/, "w-");
};

const EASTERN_TIMEZONE = "America/New_York";

const getEasternDateParts = (
  value: Date,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } | null => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(value);
  const getPart = (type: Intl.DateTimeFormatPartTypes): number | null => {
    const raw = parts.find((part) => part.type === type)?.value;
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const second = getPart("second");
  if (year === null || month === null || day === null || hour === null || minute === null || second === null) {
    return null;
  }
  return { year, month, day, hour, minute, second };
};

const toEasternDateKey = (value: string | null | undefined): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const explicitDateMatch = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:$|T00:00:00(?:\.000)?Z$)/,
    );
    if (explicitDateMatch) {
      const year = explicitDateMatch[1];
      const month = explicitDateMatch[2];
      const day = explicitDateMatch[3];
      return `${year}-${month}-${day}`;
    }
  }
  const ms = parseDateMs(value);
  if (ms === null) return null;
  const parts = getEasternDateParts(new Date(ms));
  if (!parts) return null;
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
};

const toEasternMidnightIso = (value: string | null | undefined): string | null => {
  const dateKey = toEasternDateKey(value);
  if (!dateKey) return null;
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  const day = Number.parseInt(dayRaw ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  for (let utcHour = 0; utcHour <= 12; utcHour += 1) {
    const candidate = new Date(Date.UTC(year, month - 1, day, utcHour, 0, 0));
    const parts = getEasternDateParts(candidate);
    if (!parts) continue;
    if (parts.year === year && parts.month === month && parts.day === day && parts.hour === 0 && parts.minute === 0) {
      return candidate.toISOString();
    }
  }
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).toISOString();
};

const toEasternClockIso = (
  value: string | null | undefined,
  hour: number,
  minute: number,
  second: number,
): string | null => {
  const dateKey = toEasternDateKey(value);
  if (!dateKey) return null;
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  const day = Number.parseInt(dayRaw ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  // Search a small UTC window to map the intended Eastern wall-clock timestamp.
  for (let utcDayOffset = -1; utcDayOffset <= 1; utcDayOffset += 1) {
    for (let utcHour = 0; utcHour < 24; utcHour += 1) {
      const candidate = new Date(
        Date.UTC(year, month - 1, day + utcDayOffset, utcHour, minute, second),
      );
      const parts = getEasternDateParts(candidate);
      if (!parts) continue;
      if (
        parts.year === year &&
        parts.month === month &&
        parts.day === day &&
        parts.hour === hour &&
        parts.minute === minute &&
        parts.second === second
      ) {
        return candidate.toISOString();
      }
    }
  }
  return null;
};

const addDaysUtc = (value: string | null | undefined, days: number): string | null => {
  const ms = parseDateMs(value);
  if (ms === null) return null;
  return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString();
};

interface EpisodeWindowBounds {
  key: string;
  label: string;
  start: string | null;
  end: string | null;
  type: "episode" | "period";
  source?: "period" | "fallback" | "cache";
  episodeNumber?: number;
}

interface EpisodeWindowPostItem {
  redditPostId: string;
  title: string;
  text: string | null;
  url: string;
  score: number;
  numComments: number;
  postedAt: string | null;
  flair: string | null;
  discussionType?: SlotDiscussionType;
}

const createEmptyEpisodeDiscussionCell = (): EpisodeDiscussionMatrixCell => ({
  post_count: 0,
  total_comments: 0,
  total_upvotes: 0,
  top_post_id: null,
  top_post_url: null,
  period_start: null,
  period_end: null,
});

const renderEpisodeMatrixCards = (
  rows: EpisodeDiscussionMatrixRow[],
  options?: {
    episodeAirDateByNumber?: Map<number, string | null>;
    episodeWindowByContainer?: Map<string, EpisodeWindowBounds>;
    totalsLoading?: boolean;
    totalTrackedFlairCountByContainer?: Map<string, number>;
    unassignedFlairCountByContainer?: Map<string, number>;
    unassignedFlairCountBySlot?: Map<string, number>;
    totalTrackedFlairCountBySlot?: Map<string, number>;
    seasonalBoundaryPeriods?: Array<{
      key: string;
      label: string;
      start: string | null;
      end: string | null;
      source?: "period" | "fallback" | "cache";
    }>;
    unassignedFlairCountBySeasonBoundaryPeriod?: Map<string, number>;
    totalTrackedFlairCountBySeasonBoundaryPeriod?: Map<string, number>;
    linkedPostsByContainer?: Map<string, EpisodeDiscussionCandidate[]>;
    refreshProgressByContainer?: Record<string, ContainerRefreshProgress | undefined>;
    onOpenContainerPosts?: (containerKey: string) => void;
    onViewAllContainerPosts?: (containerKey: string) => void;
    onRefreshContainerPosts?: (containerKey: string) => void;
    refreshingContainerKey?: string | null;
    refreshPostsDisabled?: boolean;
    periodsLoading?: boolean;
  },
) => {
  const allBoundaryPeriods = options?.seasonalBoundaryPeriods ?? [];
  const preSeasonBoundaryPeriods = allBoundaryPeriods.filter((period) =>
    isPreSeasonPeriodLabel(period.label),
  );
  const trailingBoundaryPeriods = allBoundaryPeriods.filter(
    (period) => !isPreSeasonPeriodLabel(period.label),
  );

  const renderBoundaryPeriodCard = (period: {
    key: string;
    label: string;
    start: string | null;
    end: string | null;
    source?: "period" | "fallback" | "cache";
  }) => {
    const containerKey = `period-${period.key}`;
    const containerPosts = options?.linkedPostsByContainer?.get(containerKey) ?? [];
    const progress = options?.refreshProgressByContainer?.[containerKey];
    const totalTrackedCount = options?.totalTrackedFlairCountByContainer?.get(containerKey);
    const unassignedTrackedCount = options?.unassignedFlairCountByContainer?.get(containerKey);
    const viewAllCount =
      typeof totalTrackedCount === "number" ? totalTrackedCount : containerPosts.length;
    return (
      <article key={`episode-boundary-${period.key}`} className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-zinc-800">{period.label}</p>
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-zinc-600">
              {fmtDateTime(period.start)} to {fmtDateTime(period.end)}
            </p>
            <button
              type="button"
              disabled={
                options?.refreshPostsDisabled || options?.refreshingContainerKey === containerKey
              }
              onClick={() => options?.onRefreshContainerPosts?.(containerKey)}
              aria-label="Refresh Posts"
              title="Scrape posts for this window (add new and update existing)"
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {options?.refreshingContainerKey === containerKey ? "⏳" : "🕷️"}
            </button>
            <button
              type="button"
              onClick={() =>
                (options?.onViewAllContainerPosts ?? options?.onOpenContainerPosts)?.(containerKey)
              }
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {`View All Posts (${fmtNum(viewAllCount)})`}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          {options?.totalsLoading ? (
            "Refreshing flair totals…"
          ) : (
            <>
              {fmtNum(totalTrackedCount ?? options?.totalTrackedFlairCountBySeasonBoundaryPeriod?.get(period.key) ?? 0)}{" "}
              tracked flair posts ·{" "}
              {fmtNum(unassignedTrackedCount ?? options?.unassignedFlairCountBySeasonBoundaryPeriod?.get(period.key) ?? 0)}{" "}
              unassigned tracked posts
            </>
          )}
        </p>
        {isContainerRefreshActive(progress) && (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-blue-700" role="status">
            <span
              aria-hidden="true"
              className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
            />
            {progress?.status === "queued" ? "Refresh queued in backend…" : "Scraping posts…"}
          </p>
        )}
        {progress?.message && (
          <p className="mt-1 text-[11px] text-blue-700">{progress.message}</p>
        )}
      </article>
    );
  };

  return (
    <div className="space-y-2">
      {preSeasonBoundaryPeriods.map((period) => renderBoundaryPeriodCard(period))}
      {rows.map((row) => {
      const cells: Array<["live" | "post" | "weekly", EpisodeDiscussionMatrixCell]> = [
        ["live", row.live],
        ["post", row.post],
        ["weekly", row.weekly],
      ];
      const containerKey = `episode-${row.episode_number}`;
      const containerPosts = options?.linkedPostsByContainer?.get(containerKey) ?? [];
      const progress = options?.refreshProgressByContainer?.[containerKey];
      const episodeWindow = options?.episodeWindowByContainer?.get(containerKey) ?? null;
      const totalTrackedCount = options?.totalTrackedFlairCountByContainer?.get(containerKey);
      const unassignedTrackedCount = options?.unassignedFlairCountByContainer?.get(containerKey);
      const viewAllCount =
        typeof totalTrackedCount === "number" ? totalTrackedCount : containerPosts.length;
      const visibleCells = cells.filter(([, cell]) => cell.post_count > 0);
      const episodeAirDate =
        row.episode_air_date ??
        options?.episodeAirDateByNumber?.get(row.episode_number) ??
        null;
      return (
        <article
          key={`episode-matrix-${row.episode_number}`}
          className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <button
                type="button"
                onClick={() => options?.onOpenContainerPosts?.(containerKey)}
                className="text-left text-sm font-semibold text-zinc-800 underline-offset-4 hover:underline"
              >
                Episode {row.episode_number}
              </button>
              {episodeAirDate && (
                <p className="text-[11px] text-zinc-500">Air date {fmtDate(episodeAirDate)}</p>
              )}
              {episodeWindow && (
                <p className="text-[11px] text-zinc-500">
                  Window {fmtDateTime(episodeWindow.start)} to {fmtDateTime(episodeWindow.end)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {options?.totalsLoading ? (
                <p className="text-[11px] text-zinc-600">Refreshing flair totals…</p>
              ) : typeof totalTrackedCount === "number" ? (
                <p className="text-[11px] text-zinc-600">
                  {fmtNum(totalTrackedCount)} tracked flair posts in window ·{" "}
                  {fmtNum(unassignedTrackedCount ?? 0)} unassigned tracked posts
                </p>
              ) : (
                <p className="text-[11px] text-zinc-600">
                  {fmtNum(row.total_posts)} discussion posts · {fmtNum(row.total_comments)} comments
                </p>
              )}
              <button
                type="button"
                disabled={
                  options?.refreshPostsDisabled || options?.refreshingContainerKey === containerKey
                }
                onClick={() => options?.onRefreshContainerPosts?.(containerKey)}
                aria-label="Refresh Posts"
                title="Scrape posts for this episode window (add new and update existing)"
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                {options?.refreshingContainerKey === containerKey ? "⏳" : "🕷️"}
              </button>
              <button
                type="button"
                onClick={() =>
                  (options?.onViewAllContainerPosts ?? options?.onOpenContainerPosts)?.(containerKey)
                }
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                {`View All Posts (${fmtNum(viewAllCount)})`}
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleCells.length === 0 ? (
              <p className="text-xs text-zinc-500">No linked discussion posts found.</p>
            ) : (
              visibleCells.map(([cellKey, cell]) => {
              const slotDate = resolveDiscussionSlotDate(episodeAirDate, cellKey);
              const slotKey = buildEpisodeSlotKey(row.episode_number, cellKey);
              const unassignedCount = options?.unassignedFlairCountBySlot?.get(slotKey);
              const totalTrackedCount = options?.totalTrackedFlairCountBySlot?.get(slotKey);
              return (
                <div
                  key={`episode-matrix-pill-${row.episode_number}-${cellKey}`}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700"
                >
                  <span className="font-semibold">{formatDiscussionPeriodLabel(cellKey)}</span>
                  {slotDate && <span> · {fmtDate(slotDate)}</span>}
                  <span> · {fmtNum(cell.post_count)} posts</span>
                  <span> · {fmtNum(cell.total_comments)} comments</span>
                  {typeof totalTrackedCount === "number" && (
                    <span> · {fmtNum(totalTrackedCount)} tracked flair posts</span>
                  )}
                  {typeof totalTrackedCount === "number" && (
                    <span> · {fmtNum(unassignedCount ?? 0)} unassigned tracked posts</span>
                  )}
                  {cell.top_post_url && (
                    <a
                      href={cell.top_post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 font-semibold text-blue-700 hover:underline"
                    >
                      Top post
                    </a>
                  )}
                </div>
              );
            })
            )}
          </div>
          {isContainerRefreshActive(progress) && (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-700" role="status">
              <span
                aria-hidden="true"
                className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
              />
            {progress?.status === "queued" ? "Refresh queued in backend…" : "Scraping posts…"}
            </p>
          )}
          {progress?.message && (
            <p className="mt-2 text-[11px] text-blue-700">{progress.message}</p>
          )}
        </article>
      );
    })}
      {trailingBoundaryPeriods.map((period) => renderBoundaryPeriodCard(period))}
    </div>
  );
};

type EpisodeSyncStatusFilter =
  | "all"
  | "auto_saved"
  | "skipped_conflict"
  | "not_eligible"
  | "no_sync_result";

const SYNC_STATUS_FILTER_OPTIONS: Array<{ value: EpisodeSyncStatusFilter; label: string }> = [
  { value: "all", label: "All results" },
  { value: "auto_saved", label: "Auto-synced" },
  { value: "skipped_conflict", label: "Skipped conflict" },
  { value: "not_eligible", label: "Not eligible" },
  { value: "no_sync_result", label: "No sync result" },
];

const SYNC_REASON_LABELS: Record<SyncCandidateReasonCode, string> = {
  auto_saved_success: "Auto-saved successfully",
  already_saved_other_community: "Already saved in another community",
  author_not_automoderator: "Author is not AutoModerator",
  title_missing_episode_discussion: "Title missing 'Episode Discussion'",
  missing_episode_air_date: "No mapped episode air date",
  missing_post_timestamp: "Post timestamp missing",
  invalid_post_timestamp: "Post timestamp invalid",
  posted_date_mismatch: "Posted date does not match episode air date",
};

const formatSyncStatusLabel = (status: SyncCandidateStatus): string => {
  if (status === "auto_saved") return "Auto-synced";
  if (status === "skipped_conflict") return "Skipped conflict";
  return "Not auto-synced";
};

const formatSyncReasonCodeLabel = (reasonCode: SyncCandidateReasonCode | undefined): string => {
  if (!reasonCode) return "Unknown";
  return SYNC_REASON_LABELS[reasonCode] ?? reasonCode;
};

const toCsvCell = (value: string): string => `"${value.replace(/"/g, "\"\"")}"`;

const buildCsv = (rows: string[][]): string =>
  rows.map((row) => row.map((cell) => toCsvCell(cell)).join(",")).join("\n");

const formatCsvTimestamp = (date = new Date()): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}`;
};

const buildPeriodOptions = (weeklyRows: SocialAnalyticsPeriodRow[]): EpisodePeriodOption[] => {
  const weekly = weeklyRows
    .map((row) => {
      const start = toIsoDate(row.start);
      const end = toIsoDate(row.end);
      if (!start || !end) return null;
      return {
        key: `weekly-${row.week_index ?? `${start}-${end}`}`,
        label: row.label?.trim() || `Week ${row.week_index ?? "?"}`,
        start,
        end,
      } satisfies EpisodePeriodOption;
    })
    .filter((row): row is EpisodePeriodOption => Boolean(row))
    .sort((a, b) => {
      const aPreSeason = isPreSeasonPeriodLabel(a.label);
      const bPreSeason = isPreSeasonPeriodLabel(b.label);
      if (aPreSeason && !bPreSeason) return -1;
      if (!aPreSeason && bPreSeason) return 1;
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });

  if (weekly.length === 0) return [];

  const allStart = weekly[0]?.start;
  const allEnd = weekly[weekly.length - 1]?.end;
  if (!allStart || !allEnd) return weekly;

  return [
    {
      key: "all-periods",
      label: "All Periods",
      start: allStart,
      end: allEnd,
    },
    ...weekly,
  ];
};

const parseEpisodeNumberFromPeriodLabel = (label: string): number | null => {
  const episodeMatch = label.match(/\bepisode\s*(\d{1,3})\b/i);
  if (!episodeMatch?.[1]) return null;
  const parsed = Number.parseInt(episodeMatch[1], 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const isPreSeasonPeriodLabel = (label: string): boolean =>
  /\b(pre[\s-]?season|trailer|premiere)\b/i.test(label);

const isPostSeasonPeriodLabel = (label: string): boolean =>
  /\b(post[\s-]?season|reunion|finale)\b/i.test(label);

const toCommunityModel = (community: RedditCommunityResponse): RedditCommunity => ({
  ...community,
  assigned_thread_count:
    typeof community.assigned_thread_count === "number" && Number.isFinite(community.assigned_thread_count)
      ? community.assigned_thread_count
      : 0,
  assigned_threads: Array.isArray(community.assigned_threads)
    ? community.assigned_threads.map((thread) => ({
        ...thread,
        source_kind: thread.source_kind === "episode_discussion" ? "episode_discussion" : "manual",
      }))
    : [],
  post_flares: normalizeFlairList(community.post_flares),
  analysis_flares: normalizeFlairList(community.analysis_flares),
  analysis_all_flares: normalizeFlairList(community.analysis_all_flares),
  is_show_focused: community.is_show_focused ?? false,
  network_focus_targets: normalizeFlairList(community.network_focus_targets),
  franchise_focus_targets: normalizeFlairList(community.franchise_focus_targets),
  episode_title_patterns: normalizeFlairList(community.episode_title_patterns),
  post_flares_updated_at: community.post_flares_updated_at ?? null,
});

const sortCommunityList = (list: RedditCommunity[]): RedditCommunity[] =>
  [...list].sort((a, b) => {
    const showDiff = a.trr_show_name.localeCompare(b.trr_show_name);
    if (showDiff !== 0) return showDiff;
    return a.subreddit.localeCompare(b.subreddit, undefined, { sensitivity: "base" });
  });

const parseRedditUrl = (
  value: string,
): { redditPostId: string; canonicalUrl: string; permalink: string | null } | null => {
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase();
    if (!isRedditHost(host)) return null;
    const pathname = parsed.pathname.replace(/\/+$/, "");

    let redditPostId: string | null = null;
    if (host.endsWith("redd.it")) {
      const shortId = pathname.split("/").filter(Boolean)[0];
      if (shortId) redditPostId = shortId;
    } else {
      const commentsMatch = pathname.match(/\/comments\/([a-z0-9]+)(?:\/|$)/i);
      if (commentsMatch?.[1]) {
        redditPostId = commentsMatch[1];
      }
    }

    if (!redditPostId) return null;
    return {
      redditPostId,
      canonicalUrl: parsed.toString(),
      permalink: pathname ? pathname : null,
    };
  } catch {
    return null;
  }
};

const ROOT_SHOW_ROUTE_RESERVED_FIRST_SEGMENTS = new Set([
  "admin",
  "api",
  "auth",
  "brands",
  "bravodle",
  "hub",
  "login",
  "privacy-policy",
  "profile",
  "realations",
  "realitease",
  "shows",
  "surveys",
  "terms-of-sale",
  "terms-of-service",
  "test-auth",
]);

const resolveRouteShowSlugFromPath = (
  pathname: string | null | undefined,
): string | null => {
  if (!pathname) return null;
  const segments = pathname
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const first = segments[0]?.toLowerCase();
  if (!first) return null;
  if (ROOT_SHOW_ROUTE_RESERVED_FIRST_SEGMENTS.has(first)) return null;
  if (!/^[a-z0-9-]+$/i.test(first)) return null;
  return first;
};

const resolveRouteRedditCommunityContextFromPath = (
  pathname: string | null | undefined,
): { showSlug: string | null; communitySlug: string | null; seasonNumber: number | null } => {
  if (!pathname) {
    return { showSlug: null, communitySlug: null, seasonNumber: null };
  }
  const match = pathname.match(/^\/([^/]+)\/social\/reddit(?:\/([^/]+)(?:\/s(\d+))?)?/i);
  if (!match) {
    return { showSlug: null, communitySlug: null, seasonNumber: null };
  }
  const showSlug = match[1] ? decodeURIComponent(match[1]).trim() : null;
  const communitySlug = match[2] ? decodeURIComponent(match[2]).trim() : null;
  const seasonRaw = match[3] ?? null;
  const parsedSeason = seasonRaw ? Number.parseInt(seasonRaw, 10) : Number.NaN;
  return {
    showSlug: showSlug && showSlug.length > 0 ? showSlug : null,
    communitySlug: communitySlug && communitySlug.length > 0 ? communitySlug : null,
    seasonNumber: Number.isFinite(parsedSeason) && parsedSeason > 0 ? parsedSeason : null,
  };
};

export default function RedditSourcesManager({
  mode,
  showId,
  showSlug,
  showName,
  seasonId,
  seasonNumber,
  initialCommunityId,
  hideCommunityList = false,
  backHref,
  episodeDiscussionsPlacement = "settings",
  enableEpisodeSync = false,
  onCommunityContextChange,
}: RedditSourcesManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [communities, setCommunities] = useState<RedditCommunity[]>([]);
  const [coveredShows, setCoveredShows] = useState<CoveredShow[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    initialCommunityId ?? null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [refreshingFlaresCommunityId, setRefreshingFlaresCommunityId] = useState<string | null>(null);

  const [showCommunityForm, setShowCommunityForm] = useState(false);
  const [showThreadForm, setShowThreadForm] = useState(false);

  const [communitySubreddit, setCommunitySubreddit] = useState("");
  const [communityDisplayName, setCommunityDisplayName] = useState("");
  const [communityNotes, setCommunityNotes] = useState("");
  const [communityShowId, setCommunityShowId] = useState(showId ?? "");
  const [communityShowName, setCommunityShowName] = useState(showName ?? "");
  const [communityIsShowFocused, setCommunityIsShowFocused] = useState(mode === "season");
  const [communityNetworkTargets, setCommunityNetworkTargets] = useState<string[]>([]);
  const [communityFranchiseTargets, setCommunityFranchiseTargets] = useState<string[]>([]);
  const [communityNetworkTargetInput, setCommunityNetworkTargetInput] = useState("");
  const [communityFranchiseTargetInput, setCommunityFranchiseTargetInput] = useState("");

  const [threadTitle, setThreadTitle] = useState("");
  const [threadUrl, setThreadUrl] = useState("");
  const [threadNotes, setThreadNotes] = useState("");
  const [assignThreadToSeason, setAssignThreadToSeason] = useState(mode === "season");

  const [seasonDiscovery, setSeasonDiscovery] = useState<DiscoveryPayload | null>(null);
  const [windowDiscoveryByContainer, setWindowDiscoveryByContainer] = useState<
    Record<string, DiscoveryPayload | undefined>
  >({});
  const [showOnlyMatches, setShowOnlyMatches] = useState(true);
  const [selectedNetworkTargetInput, setSelectedNetworkTargetInput] = useState("");
  const [selectedFranchiseTargetInput, setSelectedFranchiseTargetInput] = useState("");
  const [episodePatternInput, setEpisodePatternInput] = useState("");
  const [seasonOptions, setSeasonOptions] = useState<ShowSeasonOption[]>([]);
  const [seasonEpisodes, setSeasonEpisodes] = useState<SeasonEpisodeRow[]>([]);
  const [episodeSeasonId, setEpisodeSeasonId] = useState<string | null>(seasonId ?? null);
  const [periodOptions, setPeriodOptions] = useState<EpisodePeriodOption[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>("all-periods");
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [episodeContextWarning, setEpisodeContextWarning] = useState<string | null>(null);
  const [episodeMatrix, setEpisodeMatrix] = useState<EpisodeDiscussionMatrixRow[]>([]);
  const [episodeCandidates, setEpisodeCandidates] = useState<EpisodeDiscussionCandidate[]>([]);
  const [episodeSelectedPostIds, setEpisodeSelectedPostIds] = useState<string[]>([]);
  const [episodeRefreshing, setEpisodeRefreshing] = useState(false);
  const [refreshingContainerKey, setRefreshingContainerKey] = useState<string | null>(null);
  const [containerRefreshProgressByKey, setContainerRefreshProgressByKey] = useState<
    Record<string, ContainerRefreshProgress | undefined>
  >({});
  const [episodeSaving, setEpisodeSaving] = useState(false);
  const [assignedThreadsExpanded, setAssignedThreadsExpanded] = useState(true);
  const [showCommunitySettingsModal, setShowCommunitySettingsModal] = useState(false);
  const [showDedicatedSeasonMenu, setShowDedicatedSeasonMenu] = useState(false);
  const [selectedShowLabel, setSelectedShowLabel] = useState<string | null>(null);
  const [selectedShowSlug, setSelectedShowSlug] = useState<string | null>(null);
  const [episodeMeta, setEpisodeMeta] = useState<EpisodeDiscussionRefreshPayload["meta"] | null>(
    null,
  );
  const [syncStatusFilter, setSyncStatusFilter] = useState<EpisodeSyncStatusFilter>("all");
  const [syncReasonCodeFilter, setSyncReasonCodeFilter] = useState<"all" | SyncCandidateReasonCode>(
    "all",
  );
  const [isTabVisible, setIsTabVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState === "visible";
  });
  const isBusy = busyAction !== null;
  const discovery = seasonDiscovery;
  const [communitiesIncludeAssignedThreads, setCommunitiesIncludeAssignedThreads] = useState(false);
  const seasonOptionsCacheRef = useRef<Map<string, ShowSeasonOption[]>>(new Map());
  const periodOptionsCacheRef = useRef<Map<string, EpisodePeriodOption[]>>(new Map());
  const periodOptionsByShowCacheRef = useRef<Map<string, EpisodePeriodOption[]>>(new Map());
  const periodOptionsRef = useRef<EpisodePeriodOption[]>([]);
  const seasonIdByShowAndNumberRef = useRef<Map<string, string>>(new Map());
  const showMetadataCacheRef = useRef<Map<string, { showLabel: string; showSlug: string | null }>>(
    new Map(),
  );
  const communitiesRequestInFlightRef = useRef<Map<string, Promise<void>>>(new Map());
  const coveredShowsRequestInFlightRef = useRef<Promise<void> | null>(null);
  const seasonOptionsRequestInFlightRef = useRef<Map<string, Promise<ShowSeasonOption[]>>>(new Map());
  const seasonEpisodesRequestInFlightRef = useRef<Map<string, Promise<SeasonEpisodeRow[]>>>(new Map());
  const periodOptionsRequestInFlightRef = useRef<Map<string, Promise<EpisodePeriodOption[] | null>>>(new Map());
  const seasonIdResolutionInFlightRef = useRef<Map<string, Promise<string | null>>>(new Map());
  const communityBootstrapStartedAtRef = useRef<number | null>(null);
  const bootstrapRequestEpochRef = useRef(0);
  const communityContextStartedAtRef = useRef<number | null>(null);
  const firstCachePayloadLoggedRef = useRef(false);
  const dedicatedSeasonMenuRef = useRef<HTMLDivElement | null>(null);
  const episodeContextRequestTokenRef = useRef(0);
  const windowCacheHydrationTokenRef = useRef(0);
  const hydratedWindowContainersRef = useRef<Set<string>>(new Set());
  const hydratingWindowContainersRef = useRef<Set<string>>(new Set());
  const discoveryRequestInFlightRef = useRef<Map<string, Promise<DiscoveryFetchResult>>>(new Map());
  const containerRefreshPollTokenRef = useRef<Record<string, number>>({});
  const routeShowSlugFromPath = useMemo(
    () => resolveRouteShowSlugFromPath(pathname),
    [pathname],
  );
  const routeRedditPathContext = useMemo(
    () => resolveRouteRedditCommunityContextFromPath(pathname),
    [pathname],
  );

  const getAuthHeaders = useCallback(
    async () =>
      getClientAuthHeaders({
        // Allow localhost/dev admin bypass when Firebase client auth is not hydrated yet.
        allowDevAdminBypass: true,
      }),
    [],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    periodOptionsRef.current = periodOptions;
  }, [periodOptions]);

  const fetchWithTimeout = useCallback(
    async (
      input: RequestInfo | URL,
      init?: RequestInit & { timeoutMs?: number },
    ): Promise<Response> => {
      const { timeoutMs, ...requestInit } = init ?? {};
      const controller = new AbortController();
      const timeoutMsValue = timeoutMs ?? REQUEST_TIMEOUT_MS.default;
      let timedOut = false;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      const upstreamSignal = requestInit.signal;
      const abortFromUpstream = () => {
        controller.abort();
      };
      if (upstreamSignal) {
        if (upstreamSignal.aborted) {
          controller.abort();
        } else {
          upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
        }
      }
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error("Request timed out. Please try again."));
          timedOut = true;
          controller.abort();
        }, timeoutMsValue);
      });
      try {
        const response = await Promise.race([
          fetchAdminWithAuth(
            input,
            { ...requestInit, signal: controller.signal },
            { allowDevAdminBypass: true },
          ),
          timeoutPromise,
        ]);
        return response;
      } catch (err) {
        if ((err as { name?: string } | null)?.name === "AbortError") {
          if (timedOut) {
            throw new Error("Request timed out. Please try again.");
          }
          throw new RequestCancelledError();
        }
        throw err;
      } finally {
        if (upstreamSignal) {
          upstreamSignal.removeEventListener("abort", abortFromUpstream);
        }
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    },
    [],
  );

  const mergeCommunityPatch = useCallback(
    (communityId: string, patch: Partial<RedditCommunity>) => {
      setCommunities((prev) =>
        sortCommunityList(
          prev.map((community) =>
            community.id === communityId
              ? {
                  ...community,
                  ...patch,
                  assigned_threads: patch.assigned_threads ?? community.assigned_threads,
                  assigned_thread_count: patch.assigned_thread_count ?? community.assigned_thread_count,
                  post_flares: patch.post_flares ?? community.post_flares,
                  analysis_flares: patch.analysis_flares ?? community.analysis_flares,
                  analysis_all_flares: patch.analysis_all_flares ?? community.analysis_all_flares,
                  is_show_focused: patch.is_show_focused ?? community.is_show_focused,
                  network_focus_targets:
                    patch.network_focus_targets ?? community.network_focus_targets,
                  franchise_focus_targets:
                    patch.franchise_focus_targets ?? community.franchise_focus_targets,
                  episode_title_patterns:
                    patch.episode_title_patterns ?? community.episode_title_patterns,
                  post_flares_updated_at: patch.post_flares_updated_at ?? community.post_flares_updated_at,
                }
              : community,
          ),
        ),
      );
    },
    [],
  );

  const refreshCommunityFlares = useCallback(
    async (communityId: string) => {
      setRefreshingFlaresCommunityId(communityId);
      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(`/api/admin/reddit/communities/${communityId}/flares/refresh`, {
          method: "POST",
          headers,
        });

        const payload = (await response.json().catch(() => ({}))) as CommunityFlaresRefreshResponse;
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to refresh community post flares");
        }

        if (payload.community) {
          const next = toCommunityModel(payload.community);
          mergeCommunityPatch(communityId, {
            post_flares: next.post_flares,
            post_flares_updated_at: next.post_flares_updated_at,
          });
          return;
        }

        if (Array.isArray(payload.flares)) {
          mergeCommunityPatch(communityId, {
            post_flares: normalizeFlairList(payload.flares),
            post_flares_updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn("[reddit] Failed to refresh community post flares", err);
      } finally {
        setRefreshingFlaresCommunityId((current) => (current === communityId ? null : current));
      }
    },
    [fetchWithTimeout, getAuthHeaders, mergeCommunityPatch],
  );

  const fetchCoveredShows = useCallback(async () => {
    if (mode !== "global" || hideCommunityList) return;
    if (coveredShowsRequestInFlightRef.current) {
      await coveredShowsRequestInFlightRef.current;
      return;
    }
    const requestPromise = (async () => {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout("/api/admin/covered-shows", {
        headers,
        cache: "no-store",
        timeoutMs: REQUEST_TIMEOUT_MS.communities,
      });
      if (!response.ok) {
        throw new Error("Failed to fetch covered shows");
      }
      const payload = (await response.json()) as { shows?: CoveredShow[] };
      const shows = payload.shows ?? [];
      setCoveredShows(shows);
      if (!communityShowId && shows.length > 0) {
        setCommunityShowId(shows[0].trr_show_id);
        setCommunityShowName(shows[0].show_name);
      }
    })();
    coveredShowsRequestInFlightRef.current = requestPromise;
    try {
      await requestPromise;
    } finally {
      if (coveredShowsRequestInFlightRef.current === requestPromise) {
        coveredShowsRequestInFlightRef.current = null;
      }
    }
  }, [communityShowId, fetchWithTimeout, getAuthHeaders, hideCommunityList, mode]);

  const fetchCommunities = useCallback(async (options?: { includeAssignedThreads?: boolean }) => {
    const includeAssignedThreads = options?.includeAssignedThreads ?? true;
    const requestKey = JSON.stringify({
      includeAssignedThreads,
      mode,
      showId: showId ?? null,
      seasonId: seasonId ?? null,
      initialCommunityId: initialCommunityId ?? null,
      hideCommunityList,
    });
    const inFlightRequests = communitiesRequestInFlightRef.current;
    const existing = inFlightRequests.get(requestKey);
    if (existing) {
      await existing;
      return;
    }

    const requestPromise = (async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("include_assigned_threads", includeAssignedThreads ? "1" : "0");
      if (mode === "season") {
        if (showId) params.set("trr_show_id", showId);
        if (seasonId) params.set("trr_season_id", seasonId);
        params.set("include_global_threads_for_season", "true");
      }
      const qs = params.toString();
      const response = await fetchWithTimeout(`/api/admin/reddit/communities${qs ? `?${qs}` : ""}`, {
        headers,
        cache: "no-store",
        timeoutMs: REQUEST_TIMEOUT_MS.communities,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to fetch reddit communities");
      }
      const payload = (await response.json()) as { communities?: RedditCommunityResponse[] };
      const list = sortCommunityList((payload.communities ?? []).map(toCommunityModel));
      setCommunities(list);
      setCommunitiesIncludeAssignedThreads(includeAssignedThreads);
      setSelectedCommunityId((prev) => {
        if (initialCommunityId) {
          const initialMatch = resolveInitialCommunityMatch(list, initialCommunityId);
          if (initialMatch) return initialMatch.id;
          // In dedicated community mode, do not silently jump to another community
          // if the requested slug/id is missing from the refreshed list.
          if (hideCommunityList) {
            if (prev && list.some((community) => community.id === prev)) return prev;
            return null;
          }
        }
        if (prev && list.some((community) => community.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    })();

    inFlightRequests.set(requestKey, requestPromise);
    try {
      await requestPromise;
    } finally {
      if (inFlightRequests.get(requestKey) === requestPromise) {
        inFlightRequests.delete(requestKey);
      }
    }
  }, [
    fetchWithTimeout,
    getAuthHeaders,
    hideCommunityList,
    initialCommunityId,
    mode,
    seasonId,
    showId,
  ]);

  const refreshData = useCallback(async () => {
    const requestEpoch = bootstrapRequestEpochRef.current + 1;
    bootstrapRequestEpochRef.current = requestEpoch;
    const startedAt =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    communityBootstrapStartedAtRef.current = startedAt;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchCommunities({ includeAssignedThreads: false }),
        fetchCoveredShows(),
      ]);
      if (bootstrapRequestEpochRef.current !== requestEpoch) return;
      logRedditPerfTiming("community_bootstrap_ready", startedAt, {
        include_assigned_threads: false,
      });
    } catch (err) {
      if (bootstrapRequestEpochRef.current !== requestEpoch) return;
      if (isRequestCancelledError(err)) {
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load reddit sources");
    } finally {
      if (bootstrapRequestEpochRef.current !== requestEpoch) return;
      setLoading(false);
    }
  }, [fetchCommunities, fetchCoveredShows]);

  useEffect(() => {
    void refreshData();
    return () => {
      bootstrapRequestEpochRef.current += 1;
    };
  }, [refreshData]);

  useEffect(() => {
    if (!initialCommunityId || communities.length === 0) return;
    const routeMatch = resolveInitialCommunityMatch(communities, initialCommunityId);
    if (!routeMatch) return;
    if (routeMatch.id === selectedCommunityId) return;
    setSelectedCommunityId(routeMatch.id);
  }, [communities, initialCommunityId, selectedCommunityId]);

  useEffect(() => {
    communityContextStartedAtRef.current =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    firstCachePayloadLoggedRef.current = false;
    setSelectedNetworkTargetInput("");
    setSelectedFranchiseTargetInput("");
    setEpisodePatternInput("");
    setEpisodeCandidates([]);
    setEpisodeSelectedPostIds([]);
    setEpisodeMeta(null);
    setSeasonOptions([]);
    setSeasonEpisodes([]);
    setPeriodOptions([]);
    setSelectedPeriodKey("all-periods");
    setEpisodeSeasonId(null);
    setEpisodeContextWarning(null);
    setEpisodeMatrix([]);
    setAssignedThreadsExpanded(true);
    setShowCommunitySettingsModal(false);
    setShowDedicatedSeasonMenu(false);
    setSelectedShowLabel(null);
    setSelectedShowSlug(null);
    setSeasonDiscovery(null);
    setWindowDiscoveryByContainer({});
    setSyncStatusFilter("all");
    setSyncReasonCodeFilter("all");
    setRefreshingContainerKey(null);
    setContainerRefreshProgressByKey({});
    containerRefreshPollTokenRef.current = {};
    hydratingWindowContainersRef.current.clear();
    discoveryRequestInFlightRef.current.clear();
    seasonOptionsRequestInFlightRef.current.clear();
    seasonEpisodesRequestInFlightRef.current.clear();
    periodOptionsRequestInFlightRef.current.clear();
    seasonIdResolutionInFlightRef.current.clear();
  }, [selectedCommunityId]);

  const selectedCommunity = useMemo(
    () => communities.find((community) => community.id === selectedCommunityId) ?? null,
    [communities, selectedCommunityId],
  );
  const selectedCommunityIdValue = selectedCommunity?.id ?? null;
  const selectedCommunityShowId = selectedCommunity?.trr_show_id ?? null;
  const selectedCommunityShowName = selectedCommunity?.trr_show_name ?? null;
  const selectedCommunitySubreddit = selectedCommunity?.subreddit ?? null;
  const selectedCommunityContextSeed = useMemo<CommunityContextSeed | null>(() => {
    if (
      !selectedCommunityIdValue ||
      !selectedCommunityShowId ||
      !selectedCommunityShowName ||
      !selectedCommunitySubreddit
    ) {
      return null;
    }
    return {
      id: selectedCommunityIdValue,
      trr_show_id: selectedCommunityShowId,
      trr_show_name: selectedCommunityShowName,
      subreddit: selectedCommunitySubreddit,
    };
  }, [
    selectedCommunityIdValue,
    selectedCommunityShowId,
    selectedCommunityShowName,
    selectedCommunitySubreddit,
  ]);

  useEffect(() => {
    if (!selectedCommunityContextSeed) return;
    if (loading) return;
    if (communitiesIncludeAssignedThreads) return;
    let cancelled = false;
    void (async () => {
      try {
        const startedAt =
          typeof performance !== "undefined" && typeof performance.now === "function"
            ? performance.now()
            : Date.now();
        await fetchCommunities({ includeAssignedThreads: true });
        if (cancelled) return;
        logRedditPerfTiming("communities_threads_hydrated", startedAt, {
          community_id: selectedCommunityContextSeed.id,
        });
      } catch (err) {
        if (cancelled) return;
        console.warn("[reddit] Failed to hydrate assigned threads payload", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [communitiesIncludeAssignedThreads, fetchCommunities, loading, selectedCommunityContextSeed]);

  const selectedRelevantPostFlares = useMemo(
    () => (selectedCommunity ? getRelevantPostFlares(selectedCommunity) : []),
    [selectedCommunity],
  );

  useEffect(() => {
    if (!showCommunitySettingsModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCommunitySettingsModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showCommunitySettingsModal]);

  useEffect(() => {
    if (!showDedicatedSeasonMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (dedicatedSeasonMenuRef.current?.contains(target)) return;
      setShowDedicatedSeasonMenu(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [showDedicatedSeasonMenu]);

  const selectedPeriod = useMemo(
    () => periodOptions.find((option) => option.key === selectedPeriodKey) ?? periodOptions[0] ?? null,
    [periodOptions, selectedPeriodKey],
  );

  const selectedSeasonNumber = useMemo(() => {
    const fromOption = seasonOptions.find((season) => season.id === episodeSeasonId)?.season_number;
    if (typeof fromOption === "number" && Number.isFinite(fromOption)) {
      return fromOption;
    }
    const fromMeta = episodeMeta?.season_context?.season_number;
    if (typeof fromMeta === "number" && Number.isFinite(fromMeta)) {
      return fromMeta;
    }
    return null;
  }, [episodeMeta?.season_context?.season_number, episodeSeasonId, seasonOptions]);

  const syncCandidateResults = useMemo(
    () => episodeMeta?.sync_candidate_results ?? [],
    [episodeMeta?.sync_candidate_results],
  );

  const syncCandidateResultByPostId = useMemo(
    () => new Map(syncCandidateResults.map((item) => [item.reddit_post_id, item])),
    [syncCandidateResults],
  );

  const episodeAirDateByNumber = useMemo(() => {
    const map = new Map<number, string | null>();
    for (const episode of seasonEpisodes) {
      map.set(episode.episode_number, episode.air_date ?? null);
    }
    return map;
  }, [seasonEpisodes]);

  const trackedUnassignedFlairLabel = useMemo(() => {
    if (selectedRelevantPostFlares.length === 0) return null;
    const slcFlair = selectedRelevantPostFlares.find((flair) => /salt lake city/i.test(flair));
    return slcFlair ?? selectedRelevantPostFlares[0] ?? null;
  }, [selectedRelevantPostFlares]);

  const unassignedFlairCountBySlot = useMemo(() => {
    const counts = new Map<string, number>();
    const targetFlairKey = normalizeFlairKey(trackedUnassignedFlairLabel);
    if (!targetFlairKey) return counts;
    for (const candidate of episodeCandidates) {
      const candidateFlairKey = normalizeFlairKey(candidate.link_flair_text);
      if (candidateFlairKey !== targetFlairKey) continue;
      const syncStatus = syncCandidateResultByPostId.get(candidate.reddit_post_id)?.status ?? null;
      if (syncStatus === "auto_saved") continue;
      const key = buildEpisodeSlotKey(candidate.episode_number, candidate.discussion_type);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [episodeCandidates, syncCandidateResultByPostId, trackedUnassignedFlairLabel]);

  const linkedDiscussionPostsByContainer = useMemo(() => {
    const byContainer = new Map<string, EpisodeDiscussionCandidate[]>();
    for (const candidate of episodeCandidates) {
      const key = `episode-${candidate.episode_number}`;
      const list = byContainer.get(key) ?? [];
      list.push(candidate);
      byContainer.set(key, list);
    }
    for (const [key, list] of byContainer.entries()) {
      byContainer.set(
        key,
        [...list].sort((a, b) => {
          const postedDiff = (parseDateMs(b.posted_at) ?? 0) - (parseDateMs(a.posted_at) ?? 0);
          if (postedDiff !== 0) return postedDiff;
          if (b.num_comments !== a.num_comments) return b.num_comments - a.num_comments;
          return b.score - a.score;
        }),
      );
    }
    return byContainer;
  }, [episodeCandidates]);

  const episodeMatrixRowsForDisplay = useMemo(() => {
    const existingRowsByEpisode = new Map(
      episodeMatrix.map((row) => [row.episode_number, row] as const),
    );
    const episodeNumbers = new Set<number>([
      ...episodeMatrix.map((row) => row.episode_number),
      ...seasonEpisodes.map((episode) => episode.episode_number),
    ]);
    if (episodeNumbers.size === 0) {
      return [...episodeMatrix].sort((a, b) => a.episode_number - b.episode_number);
    }

    return [...episodeNumbers]
      .sort((a, b) => a - b)
      .map((episodeNumber) => {
        const existing = existingRowsByEpisode.get(episodeNumber);
        if (existing) return existing;
        const airDate = episodeAirDateByNumber.get(episodeNumber) ?? null;
        return {
          episode_number: episodeNumber,
          episode_air_date: airDate,
          live: createEmptyEpisodeDiscussionCell(),
          post: createEmptyEpisodeDiscussionCell(),
          weekly: createEmptyEpisodeDiscussionCell(),
          total_posts: 0,
          total_comments: 0,
          total_upvotes: 0,
        } satisfies EpisodeDiscussionMatrixRow;
      });
  }, [episodeAirDateByNumber, episodeMatrix, seasonEpisodes]);

  const episodeWindowBoundsByContainer = useMemo(() => {
    const bounds = new Map<string, EpisodeWindowBounds>();
    const rows = [...episodeMatrixRowsForDisplay].sort((a, b) => a.episode_number - b.episode_number);

    const livePostedAtByEpisode = new Map<number, string>();
    for (const candidate of episodeCandidates) {
      if (candidate.discussion_type !== "live") continue;
      const postedMs = parseDateMs(candidate.posted_at);
      if (postedMs === null) continue;
      const existing = livePostedAtByEpisode.get(candidate.episode_number);
      if (!existing || postedMs < (parseDateMs(existing) ?? Number.POSITIVE_INFINITY)) {
        livePostedAtByEpisode.set(candidate.episode_number, candidate.posted_at as string);
      }
    }

    if (rows.length > 0) {
      const firstRow = rows[0];
      const lastRow = rows[rows.length - 1];
      const firstEpisodeAirDate = firstRow
        ? (firstRow.episode_air_date ?? episodeAirDateByNumber.get(firstRow.episode_number) ?? null)
        : null;
      const lastEpisodeAirDate = lastRow
        ? (lastRow.episode_air_date ?? episodeAirDateByNumber.get(lastRow.episode_number) ?? null)
        : null;
      const firstEpisodeAirMidnight = toEasternMidnightIso(firstEpisodeAirDate);
      const lastEpisodeAirMidnight = toEasternMidnightIso(lastEpisodeAirDate);

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        if (!row) continue;
        const nextRow = rows[index + 1];
        const rowAirMidnight = toEasternMidnightIso(
          row.episode_air_date ?? episodeAirDateByNumber.get(row.episode_number) ?? null,
        );
        const nextAirMidnight = nextRow
          ? toEasternMidnightIso(nextRow.episode_air_date ?? episodeAirDateByNumber.get(nextRow.episode_number) ?? null)
          : null;
        const start = livePostedAtByEpisode.get(row.episode_number) ?? rowAirMidnight ?? null;
        const end =
          (nextRow ? (livePostedAtByEpisode.get(nextRow.episode_number) ?? nextAirMidnight ?? null) : null) ??
          addDaysUtc(lastEpisodeAirMidnight ?? rowAirMidnight, 7);
        bounds.set(`episode-${row.episode_number}`, {
          key: `episode-${row.episode_number}`,
          label: `Episode ${row.episode_number}`,
          start,
          end,
          type: "episode",
          source: "fallback",
          episodeNumber: row.episode_number,
        });
      }

      const preseasonStart = firstEpisodeAirMidnight ?? null;
      const preseasonEnd =
        (firstRow ? (livePostedAtByEpisode.get(firstRow.episode_number) ?? firstEpisodeAirMidnight) : null) ?? null;
      if (preseasonStart || preseasonEnd) {
        bounds.set("period-preseason", {
          key: "period-preseason",
          label: "Pre-Season",
          start: preseasonStart,
          end: preseasonEnd,
          type: "period",
          source: "fallback",
        });
      }

      const postseasonStart = lastEpisodeAirMidnight ?? null;
      const postseasonEnd = addDaysUtc(postseasonStart, 7);
      if (postseasonStart || postseasonEnd) {
        bounds.set("period-postseason", {
          key: "period-postseason",
          label: "Post-Season",
          start: postseasonStart,
          end: postseasonEnd,
          type: "period",
          source: "fallback",
        });
      }
    }

    for (const period of periodOptions) {
      if (period.key === "all-periods") continue;
      const label = period.label.trim();
      const episodeNumber = parseEpisodeNumberFromPeriodLabel(label);
      if (episodeNumber !== null) {
        bounds.set(`episode-${episodeNumber}`, {
          key: `episode-${episodeNumber}`,
          label: `Episode ${episodeNumber}`,
          start: period.start,
          end: period.end,
          type: "episode",
          source: "period",
          episodeNumber,
        });
        continue;
      }
      if (isPreSeasonPeriodLabel(label)) {
        bounds.set("period-preseason", {
          key: "period-preseason",
          label: "Pre-Season",
          start: period.start,
          end: period.end,
          type: "period",
          source: "period",
        });
        continue;
      }
      if (isPostSeasonPeriodLabel(label)) {
        bounds.set("period-postseason", {
          key: "period-postseason",
          label: "Post-Season",
          start: period.start,
          end: period.end,
          type: "period",
          source: "period",
        });
      }
    }

    for (const [containerKey, payload] of Object.entries(windowDiscoveryByContainer)) {
      if (!payload) continue;
      if (containerKey !== "period-preseason" && containerKey !== "period-postseason" && !/^episode-\d+$/i.test(containerKey)) {
        continue;
      }
      const cachedWindowStart = toIsoDate(payload.window_start ?? null);
      const cachedWindowEnd = toIsoDate(payload.window_end ?? null);
      if (!cachedWindowStart && !cachedWindowEnd) continue;

      const existing = bounds.get(containerKey);
      const inferredEpisodeNumber =
        existing?.episodeNumber ??
        (containerKey.startsWith("episode-")
          ? Number.parseInt(containerKey.replace("episode-", ""), 10)
          : undefined);
      const inferredType: EpisodeWindowBounds["type"] =
        existing?.type ?? (containerKey.startsWith("episode-") ? "episode" : "period");
      const inferredLabel =
        existing?.label ??
        (containerKey === "period-preseason"
          ? "Pre-Season"
          : containerKey === "period-postseason"
            ? "Post-Season"
            : `Episode ${Number.isFinite(inferredEpisodeNumber ?? Number.NaN) ? inferredEpisodeNumber : "?"}`);

      bounds.set(containerKey, {
        key: containerKey,
        label: inferredLabel,
        start: cachedWindowStart ?? existing?.start ?? null,
        end: cachedWindowEnd ?? existing?.end ?? null,
        type: inferredType,
        source: "cache",
        episodeNumber: inferredType === "episode" ? inferredEpisodeNumber : undefined,
      });
    }

    const firstEpisodeAirDate =
      episodeAirDateByNumber.get(1) ??
      rows.find((row) => row.episode_number === 1)?.episode_air_date ??
      null;
    const secondEpisodeAirDate =
      episodeAirDateByNumber.get(2) ??
      rows.find((row) => row.episode_number === 2)?.episode_air_date ??
      null;

    if (firstEpisodeAirDate) {
      const preSeasonEndCutover = toEasternClockIso(firstEpisodeAirDate, 19, 0, 0);
      const episodeOneStartCutover = toEasternClockIso(firstEpisodeAirDate, 19, 1, 1);
      const episodeOneWindow = bounds.get("episode-1");
      const episodeOneEndAnchor =
        secondEpisodeAirDate ??
        episodeOneWindow?.end ??
        addDaysUtc(toEasternMidnightIso(firstEpisodeAirDate), 7);
      const episodeOneEndCutover = toEasternClockIso(episodeOneEndAnchor, 19, 1, 10);

      const preSeasonWindow = bounds.get("period-preseason");
      if (preSeasonWindow && preSeasonEndCutover) {
        bounds.set("period-preseason", {
          ...preSeasonWindow,
          end: preSeasonEndCutover,
        });
      }
      if (episodeOneWindow) {
        bounds.set("episode-1", {
          ...episodeOneWindow,
          start: episodeOneStartCutover ?? episodeOneWindow.start,
          end: episodeOneEndCutover ?? episodeOneWindow.end,
        });
      }
    }

    return bounds;
  }, [
    episodeAirDateByNumber,
    episodeCandidates,
    episodeMatrixRowsForDisplay,
    periodOptions,
    windowDiscoveryByContainer,
  ]);

  const seasonalBoundaryPeriods = useMemo(
    () =>
      [...episodeWindowBoundsByContainer.values()]
        .filter((bounds): bounds is EpisodeWindowBounds => bounds.type === "period")
        .map((bounds) => ({
          key: bounds.key.replace(/^period-/, ""),
          label: bounds.label,
          start: bounds.start,
          end: bounds.end,
          source: bounds.source,
        }))
        .sort((a, b) => {
          const aPreSeason = isPreSeasonPeriodLabel(a.label);
          const bPreSeason = isPreSeasonPeriodLabel(b.label);
          if (aPreSeason && !bPreSeason) return -1;
          if (!aPreSeason && bPreSeason) return 1;
          return (parseDateMs(a.start) ?? 0) - (parseDateMs(b.start) ?? 0);
        }),
    [episodeWindowBoundsByContainer],
  );

  const seasonDiscoveryWindow = useMemo(() => {
    const windows = [...episodeWindowBoundsByContainer.values()];
    const startCandidates = windows
      .map((window) => parseDateMs(window.start))
      .filter((value): value is number => value !== null);
    const endCandidates = windows
      .map((window) => parseDateMs(window.end))
      .filter((value): value is number => value !== null);
    if (startCandidates.length > 0 || endCandidates.length > 0) {
      const minStart = startCandidates.length > 0 ? Math.min(...startCandidates) : null;
      const maxEnd = endCandidates.length > 0 ? Math.max(...endCandidates) : null;
      return {
        start: minStart !== null ? new Date(minStart).toISOString() : null,
        end: maxEnd !== null ? new Date(maxEnd).toISOString() : null,
      };
    }
    const datedEpisodes = seasonEpisodes
      .filter((episode) => parseDateMs(episode.air_date) !== null)
      .sort((a, b) => a.episode_number - b.episode_number);
    if (datedEpisodes.length === 0) {
      return { start: null, end: null };
    }
    const firstEpisode = datedEpisodes[0];
    const lastEpisode = datedEpisodes[datedEpisodes.length - 1];
    const preSeasonOption = periodOptions.find((period) =>
      /pre[\s-]?season|trailer/i.test(period.label),
    );
    const firstEpisodeMidnight = toEasternMidnightIso(firstEpisode?.air_date ?? null);
    const lastEpisodeMidnight = toEasternMidnightIso(lastEpisode?.air_date ?? null);
    return {
      start: preSeasonOption?.start ?? firstEpisodeMidnight ?? null,
      end: addDaysUtc(lastEpisodeMidnight, 7),
    };
  }, [episodeWindowBoundsByContainer, periodOptions, seasonEpisodes]);

  const unassignedFlairCountBySeasonBoundaryPeriod = useMemo(() => {
    const counts = new Map<string, number>();
    const targetFlairKey = normalizeFlairKey(trackedUnassignedFlairLabel);
    if (!targetFlairKey || seasonalBoundaryPeriods.length === 0) return counts;

    for (const period of seasonalBoundaryPeriods) {
      const periodStartMs = parseDateMs(period.start);
      const periodEndMs = parseDateMs(period.end);
      let count = 0;
      for (const candidate of episodeCandidates) {
        const candidateFlairKey = normalizeFlairKey(candidate.link_flair_text);
        if (candidateFlairKey !== targetFlairKey) continue;
        const syncStatus = syncCandidateResultByPostId.get(candidate.reddit_post_id)?.status ?? null;
        if (syncStatus === "auto_saved") continue;
        const postedMs = parseDateMs(candidate.posted_at);
        if (postedMs === null) continue;
        if (periodStartMs !== null && postedMs < periodStartMs) continue;
        if (periodEndMs !== null && postedMs > periodEndMs) continue;
        count += 1;
      }
      counts.set(period.key, count);
    }
    return counts;
  }, [episodeCandidates, seasonalBoundaryPeriods, syncCandidateResultByPostId, trackedUnassignedFlairLabel]);

  const savedRedditPostIds = useMemo(
    () => new Set((selectedCommunity?.assigned_threads ?? []).map((thread) => thread.reddit_post_id)),
    [selectedCommunity],
  );

  const linkedDiscussionPostIdsByContainer = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [containerKey, posts] of linkedDiscussionPostsByContainer.entries()) {
      map.set(
        containerKey,
        new Set(posts.map((post) => post.reddit_post_id)),
      );
    }
    return map;
  }, [linkedDiscussionPostsByContainer]);

  const availableSyncReasonCodes = useMemo(() => {
    const codes = new Set<SyncCandidateReasonCode>();
    for (const item of syncCandidateResults) {
      if (item.reason_code) {
        codes.add(item.reason_code);
      }
    }
    return [...codes].sort((a, b) => formatSyncReasonCodeLabel(a).localeCompare(formatSyncReasonCodeLabel(b)));
  }, [syncCandidateResults]);

  const filteredEpisodeCandidates = useMemo(
    () =>
      episodeCandidates.filter((candidate) => {
        const syncResult = syncCandidateResultByPostId.get(candidate.reddit_post_id);
        if (syncStatusFilter === "no_sync_result" && syncResult) {
          return false;
        }
        if (syncStatusFilter !== "all" && syncStatusFilter !== "no_sync_result") {
          if (!syncResult || syncResult.status !== syncStatusFilter) {
            return false;
          }
        }
        const shouldApplyReasonFilter =
          syncReasonCodeFilter !== "all" && syncStatusFilter !== "no_sync_result";
        if (shouldApplyReasonFilter) {
          if (!syncResult || syncResult.reason_code !== syncReasonCodeFilter) {
            return false;
          }
        }
        return true;
      }),
    [episodeCandidates, syncCandidateResultByPostId, syncReasonCodeFilter, syncStatusFilter],
  );

  const filterTrackedDiscoveryPostsForContainer = useCallback(
    (threads: DiscoveryThread[], containerKey: string): EpisodeWindowPostItem[] => {
      const bounds = episodeWindowBoundsByContainer.get(containerKey);
      if (!bounds) return [];
      const relevantFlairKeys = new Set(
        selectedRelevantPostFlares
          .map((flair) => normalizeFlairKey(flair))
          .filter((value) => value.length > 0),
      );
      const startMs = parseDateMs(bounds.start);
      const endMs = parseDateMs(bounds.end);
      const filtered: EpisodeWindowPostItem[] = [];

      for (const thread of threads) {
        const postedMs = parseDateMs(thread.posted_at);
        if (postedMs === null) continue;
        if (startMs !== null && postedMs < startMs) continue;
        if (endMs !== null && postedMs >= endMs) continue;

        const flairKey = normalizeFlairKey(thread.link_flair_text);
        if (relevantFlairKeys.size > 0 && !relevantFlairKeys.has(flairKey)) {
          continue;
        }
        if (thread.passes_flair_filter === false) {
          continue;
        }

        filtered.push({
          redditPostId: thread.reddit_post_id,
          title: thread.title,
          text: thread.text,
          url: thread.url,
          score: thread.score,
          numComments: thread.num_comments,
          postedAt: thread.posted_at,
          flair: thread.link_flair_text,
        });
      }

      filtered.sort((a, b) => {
        const postedDiff = (parseDateMs(b.postedAt) ?? 0) - (parseDateMs(a.postedAt) ?? 0);
        if (postedDiff !== 0) return postedDiff;
        if (b.numComments !== a.numComments) return b.numComments - a.numComments;
        return b.score - a.score;
      });
      return filtered;
    },
    [
      episodeWindowBoundsByContainer,
      selectedRelevantPostFlares,
    ],
  );

  const filterUnassignedDiscoveryPostsForContainer = useCallback(
    (threads: DiscoveryThread[], containerKey: string): EpisodeWindowPostItem[] => {
      const linkedIds = linkedDiscussionPostIdsByContainer.get(containerKey) ?? new Set<string>();
      return filterTrackedDiscoveryPostsForContainer(threads, containerKey).filter((post) => {
        if (savedRedditPostIds.has(post.redditPostId)) return false;
        if (linkedIds.has(post.redditPostId)) return false;
        return true;
      });
    },
    [
      filterTrackedDiscoveryPostsForContainer,
      linkedDiscussionPostIdsByContainer,
      savedRedditPostIds,
    ],
  );

  const trackedFlairTotalCountByContainerWindow = useMemo(() => {
    const map = new Map<string, number>();
    for (const key of episodeWindowBoundsByContainer.keys()) {
      const threads = windowDiscoveryByContainer[key]?.threads ?? [];
      if (threads.length === 0) continue;
      map.set(key, filterTrackedDiscoveryPostsForContainer(threads, key).length);
    }
    return map;
  }, [episodeWindowBoundsByContainer, filterTrackedDiscoveryPostsForContainer, windowDiscoveryByContainer]);

  const unassignedFlairCountByContainerWindow = useMemo(() => {
    const map = new Map<string, number>();
    for (const key of episodeWindowBoundsByContainer.keys()) {
      const threads = windowDiscoveryByContainer[key]?.threads ?? [];
      if (threads.length === 0) continue;
      map.set(key, filterUnassignedDiscoveryPostsForContainer(threads, key).length);
    }
    return map;
  }, [episodeWindowBoundsByContainer, filterUnassignedDiscoveryPostsForContainer, windowDiscoveryByContainer]);

  const matrixUnassignedFlairCountBySlot = useMemo(() => {
    if (unassignedFlairCountByContainerWindow.size === 0) {
      return unassignedFlairCountBySlot;
    }
    const merged = new Map(unassignedFlairCountBySlot);
    for (const row of episodeMatrix) {
      const containerCount = unassignedFlairCountByContainerWindow.get(`episode-${row.episode_number}`);
      if (typeof containerCount !== "number") continue;
      merged.set(buildEpisodeSlotKey(row.episode_number, "live"), containerCount);
      merged.set(buildEpisodeSlotKey(row.episode_number, "post"), containerCount);
      merged.set(buildEpisodeSlotKey(row.episode_number, "weekly"), containerCount);
    }
    return merged;
  }, [episodeMatrix, unassignedFlairCountByContainerWindow, unassignedFlairCountBySlot]);

  const matrixTrackedFlairTotalCountBySlot = useMemo(() => {
    const totals = new Map<string, number>();
    if (trackedFlairTotalCountByContainerWindow.size === 0) {
      return totals;
    }
    for (const row of episodeMatrix) {
      const containerCount = trackedFlairTotalCountByContainerWindow.get(`episode-${row.episode_number}`);
      if (typeof containerCount !== "number") continue;
      totals.set(buildEpisodeSlotKey(row.episode_number, "live"), containerCount);
      totals.set(buildEpisodeSlotKey(row.episode_number, "post"), containerCount);
      totals.set(buildEpisodeSlotKey(row.episode_number, "weekly"), containerCount);
    }
    return totals;
  }, [episodeMatrix, trackedFlairTotalCountByContainerWindow]);

  const matrixUnassignedFlairCountBySeasonBoundaryPeriod = useMemo(() => {
    if (unassignedFlairCountByContainerWindow.size === 0) {
      return unassignedFlairCountBySeasonBoundaryPeriod;
    }
    const merged = new Map(unassignedFlairCountBySeasonBoundaryPeriod);
    for (const period of seasonalBoundaryPeriods) {
      const containerCount = unassignedFlairCountByContainerWindow.get(`period-${period.key}`);
      if (typeof containerCount !== "number") continue;
      merged.set(period.key, containerCount);
    }
    return merged;
  }, [
    seasonalBoundaryPeriods,
    unassignedFlairCountByContainerWindow,
    unassignedFlairCountBySeasonBoundaryPeriod,
  ]);

  const matrixTrackedFlairTotalCountBySeasonBoundaryPeriod = useMemo(() => {
    const totals = new Map<string, number>();
    if (trackedFlairTotalCountByContainerWindow.size === 0) {
      return totals;
    }
    for (const period of seasonalBoundaryPeriods) {
      const containerCount = trackedFlairTotalCountByContainerWindow.get(`period-${period.key}`);
      if (typeof containerCount !== "number") continue;
      totals.set(period.key, containerCount);
    }
    return totals;
  }, [seasonalBoundaryPeriods, trackedFlairTotalCountByContainerWindow]);

  const trackedFlairWindowPostCount = useMemo(() => {
    if (episodeWindowBoundsByContainer.size === 0) return 0;
    const postIds = new Set<string>();
    for (const key of episodeWindowBoundsByContainer.keys()) {
      const threads = windowDiscoveryByContainer[key]?.threads ?? [];
      if (threads.length === 0) continue;
      const posts = filterTrackedDiscoveryPostsForContainer(threads, key);
      for (const post of posts) {
        postIds.add(post.redditPostId);
      }
    }
    return postIds.size;
  }, [episodeWindowBoundsByContainer, filterTrackedDiscoveryPostsForContainer, windowDiscoveryByContainer]);

  useEffect(() => {
    if (syncStatusFilter === "no_sync_result" && syncReasonCodeFilter !== "all") {
      setSyncReasonCodeFilter("all");
      return;
    }
  }, [syncReasonCodeFilter, syncStatusFilter]);

  useEffect(() => {
    if (syncReasonCodeFilter === "all") return;
    if (!availableSyncReasonCodes.includes(syncReasonCodeFilter)) {
      setSyncReasonCodeFilter("all");
    }
  }, [availableSyncReasonCodes, syncReasonCodeFilter]);

  const isEpisodeContextRequestActive = useCallback(
    (requestToken: number, signal?: AbortSignal) =>
      episodeContextRequestTokenRef.current === requestToken && !signal?.aborted,
    [],
  );

  const loadPeriodOptionsForSeason = useCallback(
    async (
      community: CommunityContextSeed,
      season: ShowSeasonOption,
      options?: { signal?: AbortSignal; requestToken?: number },
    ) => {
      const requestToken = options?.requestToken ?? episodeContextRequestTokenRef.current;
      const periodCacheKey = `${community.trr_show_id}:${season.id}`;
      const cachedPeriods = periodOptionsCacheRef.current.get(periodCacheKey);
      if (cachedPeriods) {
        if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
          setPeriodOptions(cachedPeriods);
          setSelectedPeriodKey("all-periods");
        }
        periodOptionsByShowCacheRef.current.set(community.trr_show_id, cachedPeriods);
        return;
      }

      const headers = await getAuthHeaders();
      const analyticsParams = new URLSearchParams();
      analyticsParams.set("season_id", season.id);
      const inFlightPeriodOptions = periodOptionsRequestInFlightRef.current.get(periodCacheKey);
      const periodOptionsPromise =
        inFlightPeriodOptions ??
        (async (): Promise<EpisodePeriodOption[] | null> => {
          const analyticsResponse = await fetchWithTimeout(
            `/api/admin/trr-api/shows/${community.trr_show_id}/seasons/${season.season_number}/social/analytics?${analyticsParams.toString()}`,
            {
              headers,
              cache: "no-store",
              signal: options?.signal,
              timeoutMs: REQUEST_TIMEOUT_MS.periodOptions,
            },
          );
          if (!analyticsResponse.ok) {
            console.warn("[reddit_episode_period_context_fetch_failed]", {
              show_id: community.trr_show_id,
              season_id: season.id,
              season_number: season.season_number,
              status: analyticsResponse.status,
            });
            return null;
          }
          const analyticsPayload = (await analyticsResponse.json().catch(() => ({}))) as {
            weekly?: SocialAnalyticsPeriodRow[];
            summary?: {
              window?: {
                start?: string | null;
                end?: string | null;
              };
            };
            window?: {
              start?: string | null;
              end?: string | null;
            };
          };
          const periods = buildPeriodOptions(
            Array.isArray(analyticsPayload.weekly) ? analyticsPayload.weekly : [],
          );
          if (periods.length > 0) {
            return periods;
          }
          const fallbackStart =
            analyticsPayload.summary?.window?.start ?? analyticsPayload.window?.start ?? null;
          const fallbackEnd =
            analyticsPayload.summary?.window?.end ?? analyticsPayload.window?.end ?? null;
          const fallbackStartIso = toIsoDate(fallbackStart);
          const fallbackEndIso = toIsoDate(fallbackEnd);
          if (fallbackStartIso && fallbackEndIso) {
            return [
              {
                key: "all-periods",
                label: "All Periods",
                start: fallbackStartIso,
                end: fallbackEndIso,
              },
            ];
          }
          return [];
        })();
      if (!inFlightPeriodOptions) {
        periodOptionsRequestInFlightRef.current.set(periodCacheKey, periodOptionsPromise);
      }
      const preserveKnownPeriodsForSeason = (): boolean => {
        const cached = periodOptionsCacheRef.current.get(periodCacheKey);
        if (Array.isArray(cached) && cached.length > 0) {
          if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
            setPeriodOptions(cached);
            setSelectedPeriodKey((current) =>
              cached.some((period) => period.key === current) ? current : "all-periods",
            );
          }
          return true;
        }
        if (periodOptionsRef.current.length > 0) {
          if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
            setPeriodOptions(periodOptionsRef.current);
            setSelectedPeriodKey((current) =>
              periodOptionsRef.current.some((period) => period.key === current)
                ? current
                : "all-periods",
            );
          }
          return true;
        }
        const showCached = periodOptionsByShowCacheRef.current.get(community.trr_show_id);
        if (Array.isArray(showCached) && showCached.length > 0) {
          if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
            setPeriodOptions(showCached);
            setSelectedPeriodKey((current) =>
              showCached.some((period) => period.key === current) ? current : "all-periods",
            );
          }
          return true;
        }
        return false;
      };
      let resolvedPeriods: EpisodePeriodOption[] | null = null;
      try {
        resolvedPeriods = await periodOptionsPromise;
      } finally {
        if (
          !inFlightPeriodOptions &&
          periodOptionsRequestInFlightRef.current.get(periodCacheKey) === periodOptionsPromise
        ) {
          periodOptionsRequestInFlightRef.current.delete(periodCacheKey);
        }
      }

      if (resolvedPeriods === null) {
        if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
          const preserved = preserveKnownPeriodsForSeason();
          if (!preserved) {
            console.warn("[reddit_period_options_unavailable]", {
              show_id: community.trr_show_id,
              season_id: season.id,
              season_number: season.season_number,
              reason: "social_analytics_unavailable",
            });
          }
        }
        return;
      }
      const periods = resolvedPeriods;
      if (periods.length > 0) {
        periodOptionsCacheRef.current.set(periodCacheKey, periods);
        periodOptionsByShowCacheRef.current.set(community.trr_show_id, periods);
        if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
          setPeriodOptions(periods);
          setSelectedPeriodKey("all-periods");
        }
        return;
      }
      if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
        const preserved = preserveKnownPeriodsForSeason();
        if (!preserved) {
          console.warn("[reddit_period_options_empty]", {
            show_id: community.trr_show_id,
            season_id: season.id,
            season_number: season.season_number,
          });
        }
      }
    },
    [
      fetchWithTimeout,
      getAuthHeaders,
      isEpisodeContextRequestActive,
    ],
  );

  const loadShowMetadataForCommunity = useCallback(
    async (
      community: CommunityContextSeed,
      options?: { signal?: AbortSignal; requestToken?: number },
    ): Promise<{ showLabel: string; showSlug: string | null }> => {
      const cached = showMetadataCacheRef.current.get(community.trr_show_id);
      if (cached) {
        if (isEpisodeContextRequestActive(options?.requestToken ?? 0, options?.signal)) {
          setSelectedShowLabel(cached.showLabel);
          setSelectedShowSlug(cached.showSlug);
        }
        return cached;
      }

      let fallback = {
        showLabel: resolveShowLabel(community.trr_show_name, []),
        showSlug: resolvePreferredShowRouteSlug({
          fallback: community.trr_show_name,
        }),
      };
      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(`/api/admin/trr-api/shows/${community.trr_show_id}`, {
          headers,
          cache: "no-store",
          signal: options?.signal,
          timeoutMs: REQUEST_TIMEOUT_MS.seasonContext,
        });
        if (response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            show?: TrrShowMetadata;
          };
          const show = payload.show;
          if (show?.id) {
            fallback = {
              showLabel: resolveShowLabel(community.trr_show_name, show.alternative_names),
              showSlug: resolvePreferredShowRouteSlug({
                alternativeNames: show.alternative_names,
                canonicalSlug: show.canonical_slug,
                slug: show.slug,
                fallback: community.trr_show_name,
              }),
            };
          }
        }
      } catch {
        // Fallback label is acceptable when show metadata fetch fails.
      }

      showMetadataCacheRef.current.set(community.trr_show_id, fallback);
      if (isEpisodeContextRequestActive(options?.requestToken ?? 0, options?.signal)) {
        setSelectedShowLabel(fallback.showLabel);
        setSelectedShowSlug(fallback.showSlug);
      }
      return fallback;
    },
    [fetchWithTimeout, getAuthHeaders, isEpisodeContextRequestActive],
  );

  const loadSeasonEpisodesForSeason = useCallback(
    async (seasonIdToLoad: string, options?: { signal?: AbortSignal; requestToken?: number }) => {
      const seasonIdValue = seasonIdToLoad.trim();
      if (!seasonIdValue) {
        if (isEpisodeContextRequestActive(options?.requestToken ?? 0, options?.signal)) {
          setSeasonEpisodes([]);
        }
        return;
      }
      const inFlightEpisodes = seasonEpisodesRequestInFlightRef.current.get(seasonIdValue);
      const episodesPromise =
        inFlightEpisodes ??
        (async (): Promise<SeasonEpisodeRow[]> => {
          const headers = await getAuthHeaders();
          const response = await fetchWithTimeout(
            `/api/admin/trr-api/seasons/${seasonIdValue}/episodes?limit=250&offset=0`,
            {
              headers,
              cache: "no-store",
              signal: options?.signal,
              timeoutMs: REQUEST_TIMEOUT_MS.seasonContext,
            },
          );
          if (!response.ok) {
            throw new Error("Failed to load season episodes for discussion dates");
          }
          const payload = (await response.json().catch(() => ({}))) as {
            episodes?: Array<{
              id?: string | null;
              episode_number?: number | string | null;
              name?: string | null;
              title?: string | null;
              air_date?: string | null;
            }>;
          };
          return (Array.isArray(payload.episodes) ? payload.episodes : [])
            .map((episode) => {
              const parsedEpisodeNumber =
                typeof episode.episode_number === "number"
                  ? Math.trunc(episode.episode_number)
                  : typeof episode.episode_number === "string"
                    ? Number.parseInt(episode.episode_number, 10)
                    : Number.NaN;
              if (!Number.isFinite(parsedEpisodeNumber) || parsedEpisodeNumber <= 0) {
                return null;
              }
              return {
                id: typeof episode.id === "string" && episode.id.trim().length > 0
                  ? episode.id
                  : `episode-${parsedEpisodeNumber}`,
                episode_number: parsedEpisodeNumber,
                title:
                  typeof episode.name === "string" && episode.name.trim().length > 0
                    ? episode.name
                    : typeof episode.title === "string" && episode.title.trim().length > 0
                      ? episode.title
                      : null,
                air_date:
                  typeof episode.air_date === "string" && episode.air_date.trim().length > 0
                    ? episode.air_date
                    : null,
              } satisfies SeasonEpisodeRow;
            })
            .filter((episode): episode is SeasonEpisodeRow => Boolean(episode))
            .sort((a, b) => a.episode_number - b.episode_number);
        })();
      if (!inFlightEpisodes) {
        seasonEpisodesRequestInFlightRef.current.set(seasonIdValue, episodesPromise);
      }
      let normalizedEpisodes: SeasonEpisodeRow[] = [];
      try {
        normalizedEpisodes = await episodesPromise;
      } finally {
        if (
          !inFlightEpisodes &&
          seasonEpisodesRequestInFlightRef.current.get(seasonIdValue) === episodesPromise
        ) {
          seasonEpisodesRequestInFlightRef.current.delete(seasonIdValue);
        }
      }

      if (isEpisodeContextRequestActive(options?.requestToken ?? 0, options?.signal)) {
        setSeasonEpisodes(normalizedEpisodes);
      }
    },
    [fetchWithTimeout, getAuthHeaders, isEpisodeContextRequestActive],
  );

  const loadSeasonAndPeriodContext = useCallback(
    async (community: CommunityContextSeed, options?: { signal?: AbortSignal; requestToken?: number }) => {
      const requestToken = options?.requestToken ?? episodeContextRequestTokenRef.current;
      const startedAt =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      setPeriodsLoading(true);
      setEpisodeContextWarning(null);
      try {
        await loadShowMetadataForCommunity(community, { ...options, requestToken });
        const seasonCacheKey = community.trr_show_id;
        let seasons = seasonOptionsCacheRef.current.get(seasonCacheKey) ?? null;
        if (!seasons) {
          const headers = await getAuthHeaders();
          const showIdKey = community.trr_show_id;
          const inFlightSeasonOptions = seasonOptionsRequestInFlightRef.current.get(showIdKey);
          const seasonOptionsPromise =
            inFlightSeasonOptions ??
            (async (): Promise<ShowSeasonOption[]> => {
              const seasonsResponse = await fetchWithTimeout(
                `/api/admin/trr-api/shows/${showIdKey}/seasons?limit=100&include_episode_signal=true`,
                {
                  headers,
                  cache: "no-store",
                  signal: options?.signal,
                  timeoutMs: REQUEST_TIMEOUT_MS.seasonContext,
                },
              );
              if (!seasonsResponse.ok) {
                throw new Error("Failed to load seasons for episode discussions");
              }
              const seasonsPayload = (await seasonsResponse.json().catch(() => ({}))) as {
                seasons?: ShowSeasonOption[];
              };
              return Array.isArray(seasonsPayload.seasons)
                ? [...seasonsPayload.seasons]
                    .filter(
                      (season): season is ShowSeasonOption =>
                        Boolean(season?.id) &&
                        typeof season.season_number === "number" &&
                        Number.isFinite(season.season_number),
                    )
                    .sort((a, b) => b.season_number - a.season_number)
                : [];
            })();
          if (!inFlightSeasonOptions) {
            seasonOptionsRequestInFlightRef.current.set(showIdKey, seasonOptionsPromise);
          }
          try {
            seasons = await seasonOptionsPromise;
          } finally {
            if (
              !inFlightSeasonOptions &&
              seasonOptionsRequestInFlightRef.current.get(showIdKey) === seasonOptionsPromise
            ) {
              seasonOptionsRequestInFlightRef.current.delete(showIdKey);
            }
          }
          seasonOptionsCacheRef.current.set(seasonCacheKey, seasons);
        }
        if (!isEpisodeContextRequestActive(requestToken, options?.signal)) {
          return;
        }
        if (seasons.length === 0) {
          throw new Error("No seasons found for this show");
        }

        const maxSeasonNumberForContext =
          typeof seasonNumber === "number" && Number.isFinite(seasonNumber) && seasonNumber > 0
            ? seasonNumber
            : null;
        const eligibleSeasons = seasons
          .filter((season) =>
            isSeasonEligibleForRedditSelection(season, {
              maxSeasonNumber: maxSeasonNumberForContext,
            }),
          )
          .sort((a, b) => b.season_number - a.season_number);
        const selectableSeasons = eligibleSeasons.length > 0 ? eligibleSeasons : seasons;

        setSeasonOptions(selectableSeasons);

        const explicitSeason =
          (seasonId ? seasons.find((season) => season.id === seasonId) : null) ??
          (seasonNumber
            ? seasons.find((season) => season.season_number === seasonNumber)
            : null);
        const resolvedSeason =
          explicitSeason ??
          selectableSeasons[0] ??
          seasons[0];
        if (!resolvedSeason) {
          throw new Error("No season could be resolved for this community");
        }

        if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
          setEpisodeSeasonId(resolvedSeason.id);
        }
        const periodOptionsPromise = loadPeriodOptionsForSeason(
          community,
          resolvedSeason,
          options,
        ).catch((err) => {
          if (
            isRequestCancelledError(err) ||
            options?.signal?.aborted ||
            !isEpisodeContextRequestActive(requestToken, options?.signal)
          ) {
            return;
          }
          console.warn("[reddit_period_options_background_failed]", err);
        });
        await loadSeasonEpisodesForSeason(resolvedSeason.id, {
          ...options,
          requestToken,
        });
        logRedditPerfTiming("core_context_ready", startedAt, {
          community_id: community.id,
          season_id: resolvedSeason.id,
          season_number: resolvedSeason.season_number,
        });
        void periodOptionsPromise.then(() => {
          if (!isEpisodeContextRequestActive(requestToken, options?.signal)) return;
          logRedditPerfTiming("full_context_ready", startedAt, {
            community_id: community.id,
            season_id: resolvedSeason.id,
            season_number: resolvedSeason.season_number,
          });
        });
      } finally {
        if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
          setPeriodsLoading(false);
        }
      }
    },
    [
      fetchWithTimeout,
      getAuthHeaders,
      isEpisodeContextRequestActive,
      loadSeasonEpisodesForSeason,
      loadShowMetadataForCommunity,
      loadPeriodOptionsForSeason,
      seasonId,
      seasonNumber,
    ],
  );

  useEffect(() => {
    if (!selectedCommunityContextSeed) return;
    const requestToken = episodeContextRequestTokenRef.current + 1;
    episodeContextRequestTokenRef.current = requestToken;
    void (async () => {
      try {
        await loadSeasonAndPeriodContext(selectedCommunityContextSeed, {
          requestToken,
        });
      } catch (err) {
        if (isRequestCancelledError(err)) return;
        if (episodeContextRequestTokenRef.current === requestToken) {
          setEpisodeContextWarning(
            toErrorMessage(
              err,
              "Failed to load season context. Refresh can still run with latest season/all periods.",
            ),
          );
        }
      }
    })();
    return () => {
      setPeriodsLoading(false);
    };
  }, [loadSeasonAndPeriodContext, selectedCommunityContextSeed]);

  useEffect(() => {
    if (!selectedCommunityContextSeed) return;
    if (seasonEpisodes.length > 0) return;
    const requestToken = episodeContextRequestTokenRef.current;
    if (requestToken <= 0) return;
    const resolvedSeasonId = episodeSeasonId?.trim();
    if (!resolvedSeasonId) return;

    let cancelled = false;
    void loadSeasonEpisodesForSeason(resolvedSeasonId, { requestToken }).catch((err) => {
      if (cancelled || isRequestCancelledError(err)) return;
      console.warn("[reddit_episode_rows_recovery_failed]", err);
    });

    return () => {
      cancelled = true;
    };
  }, [episodeSeasonId, loadSeasonEpisodesForSeason, seasonEpisodes.length, selectedCommunityContextSeed]);

  const buildCommunityViewHref = useCallback((community: Pick<RedditCommunity, "id" | "subreddit" | "trr_show_id" | "trr_show_name">): string => {
    const selectedCommunityShowSlug =
      selectedCommunity?.trr_show_id === community.trr_show_id ? selectedShowSlug : null;
    const normalizedCommunitySlug = normalizeCommunitySlugForPath(community.subreddit);
    const inferredShowSlug = resolvePreferredShowRouteSlug({
      fallback: resolveShowLabel(community.trr_show_name ?? showName ?? "", null),
    });
    const normalizedInferredShowSlug = inferredShowSlug === "show" ? null : inferredShowSlug;
    const fallbackShowSlug =
      showSlug ??
      routeShowSlugFromPath ??
      selectedCommunityShowSlug ??
      normalizedInferredShowSlug;
    const fallbackSeasonNumber =
      typeof selectedSeasonNumber === "number" && Number.isFinite(selectedSeasonNumber)
        ? selectedSeasonNumber
        : typeof seasonNumber === "number" && Number.isFinite(seasonNumber)
          ? seasonNumber
          : null;

    if (fallbackShowSlug && normalizedCommunitySlug) {
      return buildShowRedditCommunityUrl({
        showSlug: fallbackShowSlug,
        communitySlug: normalizedCommunitySlug,
        seasonNumber: fallbackSeasonNumber,
      });
    }
    return `/admin/social-media/reddit/communities/${encodeURIComponent(community.id)}`;
  }, [
    routeShowSlugFromPath,
    seasonNumber,
    selectedCommunity?.trr_show_id,
    selectedSeasonNumber,
    selectedShowSlug,
    showName,
    showSlug,
  ]);

  const communityViewHref = useMemo(
    () => (selectedCommunity ? buildCommunityViewHref(selectedCommunity) : null),
    [buildCommunityViewHref, selectedCommunity],
  );

  useEffect(() => {
    if (!onCommunityContextChange) return;
    if (!selectedCommunity) {
      onCommunityContextChange(null);
      return;
    }
    onCommunityContextChange({
      communityLabel: `r/${selectedCommunity.subreddit}`,
      communitySlug: normalizeCommunitySlugForPath(selectedCommunity.subreddit),
      showLabel: selectedShowLabel ?? resolveShowLabel(selectedCommunity.trr_show_name, []),
      showFullName: selectedCommunity.trr_show_name,
      showSlug: selectedShowSlug,
      seasonLabel:
        typeof selectedSeasonNumber === "number" && selectedSeasonNumber > 0
          ? `S${selectedSeasonNumber}`
          : null,
      showId: selectedCommunity.trr_show_id,
      seasonId: episodeSeasonId,
      seasonNumber: selectedSeasonNumber,
    });
  }, [
    onCommunityContextChange,
    selectedCommunity,
    selectedSeasonNumber,
    episodeSeasonId,
    selectedShowLabel,
    selectedShowSlug,
  ]);

  const persistAnalysisFlareModes = useCallback(
    async (
      communityId: string,
      payload: { analysisFlares: string[]; analysisAllFlares: string[] },
    ) => {
      const previous = communities.find((community) => community.id === communityId);
      if (!previous) return;

      const nextScan = normalizeFlairList(payload.analysisFlares);
      const nextAll = normalizeFlairList(payload.analysisAllFlares);
      mergeCommunityPatch(communityId, {
        analysis_flares: nextScan,
        analysis_all_flares: nextAll,
      });
      setBusyAction("save-analysis-flares");
      setBusyLabel("Saving analysis flares...");
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(`/api/admin/reddit/communities/${communityId}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            analysis_flares: nextScan,
            analysis_all_flares: nextAll,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          community?: RedditCommunityResponse;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to save analysis flares");
        }
        if (payload.community) {
          mergeCommunityPatch(communityId, {
            analysis_flares: toCommunityModel(payload.community).analysis_flares,
            analysis_all_flares: toCommunityModel(payload.community).analysis_all_flares,
          });
        }
      } catch (err) {
        mergeCommunityPatch(communityId, {
          analysis_flares: previous.analysis_flares,
          analysis_all_flares: previous.analysis_all_flares,
        });
        setError(err instanceof Error ? err.message : "Failed to save analysis flares");
      } finally {
        setBusyAction(null);
        setBusyLabel(null);
      }
    },
    [communities, fetchWithTimeout, getAuthHeaders, mergeCommunityPatch],
  );

  const persistCommunityFocus = useCallback(
    async (
      communityId: string,
      payload: {
        isShowFocused: boolean;
        networkFocusTargets: string[];
        franchiseFocusTargets: string[];
      },
    ) => {
      const previous = communities.find((community) => community.id === communityId);
      if (!previous) return;

      const nextFocus = {
        is_show_focused: payload.isShowFocused,
        network_focus_targets: payload.isShowFocused
          ? []
          : normalizeFlairList(payload.networkFocusTargets),
        franchise_focus_targets: payload.isShowFocused
          ? []
          : normalizeFlairList(payload.franchiseFocusTargets),
      };

      mergeCommunityPatch(communityId, nextFocus);
      setBusyAction("save-community-focus");
      setBusyLabel("Saving community focus...");
      setError(null);

      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(`/api/admin/reddit/communities/${communityId}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            is_show_focused: nextFocus.is_show_focused,
            network_focus_targets: nextFocus.network_focus_targets,
            franchise_focus_targets: nextFocus.franchise_focus_targets,
          }),
        });
        const payloadBody = (await response.json().catch(() => ({}))) as {
          error?: string;
          community?: RedditCommunityResponse;
        };
        if (!response.ok) {
          throw new Error(payloadBody.error ?? "Failed to save community focus");
        }
        if (payloadBody.community) {
          const nextCommunity = toCommunityModel(payloadBody.community);
          mergeCommunityPatch(communityId, {
            is_show_focused: nextCommunity.is_show_focused,
            network_focus_targets: nextCommunity.network_focus_targets,
            franchise_focus_targets: nextCommunity.franchise_focus_targets,
          });
        }
      } catch (err) {
        mergeCommunityPatch(communityId, {
          is_show_focused: previous.is_show_focused,
          network_focus_targets: previous.network_focus_targets,
          franchise_focus_targets: previous.franchise_focus_targets,
        });
        setError(err instanceof Error ? err.message : "Failed to save community focus");
      } finally {
        setBusyAction(null);
        setBusyLabel(null);
      }
    },
    [communities, fetchWithTimeout, getAuthHeaders, mergeCommunityPatch],
  );

  const persistEpisodeRules = useCallback(
    async (
      communityId: string,
      payload: { episodeTitlePatterns: string[] },
    ) => {
      const previous = communities.find((community) => community.id === communityId);
      if (!previous) return;

      const nextEpisodeTitlePatterns = normalizeFlairList(payload.episodeTitlePatterns);
      mergeCommunityPatch(communityId, {
        episode_title_patterns: nextEpisodeTitlePatterns,
      });
      setBusyAction("save-episode-rules");
      setBusyLabel("Saving episode discussion rules...");
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(`/api/admin/reddit/communities/${communityId}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            episode_title_patterns: nextEpisodeTitlePatterns,
          }),
        });
        const payloadBody = (await response.json().catch(() => ({}))) as {
          error?: string;
          community?: RedditCommunityResponse;
        };
        if (!response.ok) {
          throw new Error(payloadBody.error ?? "Failed to save episode discussion rules");
        }
        if (payloadBody.community) {
          const nextCommunity = toCommunityModel(payloadBody.community);
          mergeCommunityPatch(communityId, {
            episode_title_patterns: nextCommunity.episode_title_patterns,
          });
        }
      } catch (err) {
        mergeCommunityPatch(communityId, {
          episode_title_patterns: previous.episode_title_patterns,
        });
        setError(err instanceof Error ? err.message : "Failed to save episode discussion rules");
      } finally {
        setBusyAction(null);
        setBusyLabel(null);
      }
    },
    [communities, fetchWithTimeout, getAuthHeaders, mergeCommunityPatch],
  );

  const groupedCommunities = useMemo(() => {
    const grouped = new Map<string, RedditCommunity[]>();
    for (const community of communities) {
      const key = community.trr_show_name || "Unknown Show";
      const list = grouped.get(key) ?? [];
      list.push(community);
      grouped.set(key, list);
    }
    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [communities]);

  const visibleDiscoveryThreads = useMemo(() => {
    const items = discovery?.threads ?? [];
    if (selectedCommunity?.is_show_focused) return items;
    if (!showOnlyMatches) return items;
    const hasAllPostsFlairMode = (selectedCommunity?.analysis_all_flares.length ?? 0) > 0;
    if (!hasAllPostsFlairMode) {
      return items.filter((thread) => thread.is_show_match);
    }
    return items.filter(
      (thread) => thread.is_show_match || Boolean(thread.passes_flair_filter),
    );
  }, [discovery, selectedCommunity, showOnlyMatches]);

  const isBravoRealHousewivesCommunity =
    normalizeCommunityLookupKey(selectedCommunity?.subreddit) === "bravorealhousewives";

  const episodeDiscussionTitlePatterns = useMemo(
    () =>
      normalizeFlairList([
        "Live Episode Discussion",
        "Post Episode Discussion",
        "Weekly Episode Discussion",
        ...(selectedCommunity?.episode_title_patterns ?? []),
      ]).map((value) => value.toLowerCase()),
    [selectedCommunity?.episode_title_patterns],
  );

  const nonEpisodeDiscoveryThreads = useMemo(() => {
    if (episodeDiscussionTitlePatterns.length === 0) return visibleDiscoveryThreads;
    return visibleDiscoveryThreads.filter((thread) => {
      const title = thread.title.trim().toLowerCase();
      return !episodeDiscussionTitlePatterns.some((pattern) => title.includes(pattern));
    });
  }, [episodeDiscussionTitlePatterns, visibleDiscoveryThreads]);

  const flairGroupedDiscoveryThreads = useMemo(() => {
    if (!hideCommunityList) return [];
    const groups = new Map<string, { flairLabel: string; threads: DiscoveryThread[] }>();
    for (const thread of nonEpisodeDiscoveryThreads) {
      const flairLabel = thread.link_flair_text?.trim();
      if (!flairLabel) continue;
      const flairKey = normalizeFlairKey(flairLabel);
      if (!flairKey) continue;
      const existing = groups.get(flairKey);
      if (existing) {
        existing.threads.push(thread);
        continue;
      }
      groups.set(flairKey, { flairLabel, threads: [thread] });
    }
    return [...groups.values()].sort(
      (a, b) => b.threads.length - a.threads.length || a.flairLabel.localeCompare(b.flairLabel),
    );
  }, [hideCommunityList, nonEpisodeDiscoveryThreads]);

  const networkFocusSuggestions = useMemo(() => {
    const values = communities.flatMap((community) => community.network_focus_targets);
    return normalizeFlairList(["Bravo", ...values]);
  }, [communities]);

  const franchiseFocusSuggestions = useMemo(() => {
    const values = communities.flatMap((community) => community.franchise_focus_targets);
    return normalizeFlairList(["Real Housewives", ...values]);
  }, [communities]);

  const episodePatternSuggestions = useMemo(() => {
    const values = communities.flatMap((community) => community.episode_title_patterns);
    return normalizeFlairList([
      "Live Episode Discussion",
      "Post Episode Discussion",
      "Weekly Episode Discussion",
      ...values,
    ]);
  }, [communities]);

  const communityGroups = useMemo<Array<[string, RedditCommunity[]]>>(
    () => (mode === "global" ? groupedCommunities : [[showName ?? "Show", communities]]),
    [communities, groupedCommunities, mode, showName],
  );
  const isSeasonLandingView = mode === "season" && !hideCommunityList;
  const isDedicatedCommunityView = hideCommunityList;
  const allowCreateActions = mode === "global" && !hideCommunityList;
  const seasonScopeLabel = isSeasonLandingView ? resolveShowLabel(showName?.trim() || "Show", null) : null;
  const dedicatedBackHref = backHref?.trim() || "/admin/social-media";
  const dedicatedCommunityTypeLabel = useMemo(() => {
    if (!isDedicatedCommunityView || !selectedCommunity) return "Community";
    const badges = getCommunityTypeBadges(selectedCommunity);
    if (badges.length === 0) return "Community";
    return toTitleCase(badges[0] ?? "Community");
  }, [isDedicatedCommunityView, selectedCommunity]);
  const seasonSelectionShowSlug = useMemo(() => {
    const fallbackName = selectedCommunity?.trr_show_name ?? showName ?? "";
    const fallbackLabel = selectedShowLabel ?? resolveShowLabel(fallbackName, null);
    if (!fallbackLabel && !selectedShowSlug && !showSlug && !routeShowSlugFromPath) return null;
    return (
      showSlug ??
      routeShowSlugFromPath ??
      selectedShowSlug ??
      resolvePreferredShowRouteSlug({ fallback: fallbackLabel })
    );
  }, [
    routeShowSlugFromPath,
    selectedCommunity?.trr_show_name,
    selectedShowLabel,
    selectedShowSlug,
    showName,
    showSlug,
  ]);
  const seasonSelectionCommunitySlug = useMemo(
    () => normalizeCommunitySlugForPath(selectedCommunity?.subreddit ?? null) || null,
    [selectedCommunity?.subreddit],
  );
  const seasonSelectionMaxSeasonNumber =
    typeof seasonNumber === "number" && Number.isFinite(seasonNumber) && seasonNumber > 0
      ? seasonNumber
      : null;
  const seasonSelectionOptions = useMemo(() => {
    const options = seasonOptions
      .filter(
        (season): season is ShowSeasonOption =>
          Boolean(season?.id) &&
          typeof season.season_number === "number" &&
          Number.isFinite(season.season_number) &&
          isSeasonEligibleForRedditSelection(season, {
            maxSeasonNumber: seasonSelectionMaxSeasonNumber,
          }),
      )
      .sort((a, b) => b.season_number - a.season_number);
    if (options.length > 0) return options;
    if (seasonSelectionMaxSeasonNumber !== null) {
      return [{ id: `season-${seasonSelectionMaxSeasonNumber}`, season_number: seasonSelectionMaxSeasonNumber }];
    }
    return [];
  }, [seasonOptions, seasonSelectionMaxSeasonNumber]);
  const activeSeasonSelectionCandidate =
    selectedSeasonNumber ??
    (typeof seasonNumber === "number" && Number.isFinite(seasonNumber) ? seasonNumber : null);
  const activeSeasonSelection = useMemo(() => {
    if (seasonSelectionOptions.length === 0) return null;
    if (
      typeof activeSeasonSelectionCandidate === "number" &&
      Number.isFinite(activeSeasonSelectionCandidate) &&
      seasonSelectionOptions.some((season) => season.season_number === activeSeasonSelectionCandidate)
    ) {
      return activeSeasonSelectionCandidate;
    }
    return seasonSelectionOptions[0]?.season_number ?? null;
  }, [activeSeasonSelectionCandidate, seasonSelectionOptions]);
  const buildSeasonSelectionHref = useCallback(
    (nextSeasonNumber: number): string | null => {
      if (!seasonSelectionShowSlug) return null;
      if (isDedicatedCommunityView && seasonSelectionCommunitySlug) {
        return buildShowRedditCommunityUrl({
          showSlug: seasonSelectionShowSlug,
          communitySlug: seasonSelectionCommunitySlug,
          seasonNumber: nextSeasonNumber,
        });
      }
      return buildShowRedditUrl({
        showSlug: seasonSelectionShowSlug,
        seasonNumber: nextSeasonNumber,
      });
    },
    [isDedicatedCommunityView, seasonSelectionCommunitySlug, seasonSelectionShowSlug],
  );

  useEffect(() => {
    if (!seasonSelectionShowSlug) return;
    const routeShowSlug = routeRedditPathContext.showSlug;
    if (!routeShowSlug) return;
    if (routeShowSlug.toLowerCase() !== seasonSelectionShowSlug.toLowerCase()) return;
    if (routeRedditPathContext.seasonNumber != null) return;
    if (
      typeof activeSeasonSelection !== "number" ||
      !Number.isFinite(activeSeasonSelection) ||
      activeSeasonSelection <= 0
    ) {
      return;
    }
    const currentHref = pathname;
    const canonicalHref = isDedicatedCommunityView
      ? seasonSelectionCommunitySlug
        ? buildShowRedditCommunityUrl({
            showSlug: seasonSelectionShowSlug,
            communitySlug: seasonSelectionCommunitySlug,
            seasonNumber: activeSeasonSelection,
          })
        : null
      : routeRedditPathContext.communitySlug
        ? null
        : buildShowRedditUrl({
            showSlug: seasonSelectionShowSlug,
            seasonNumber: activeSeasonSelection,
          });
    if (!canonicalHref) return;
    if (canonicalHref === currentHref) return;
    router.replace(canonicalHref as Parameters<typeof router.replace>[0]);
  }, [
    activeSeasonSelection,
    isDedicatedCommunityView,
    pathname,
    routeRedditPathContext.communitySlug,
    routeRedditPathContext.seasonNumber,
    routeRedditPathContext.showSlug,
    router,
    seasonSelectionCommunitySlug,
    seasonSelectionShowSlug,
  ]);

  const handleSeasonSelectionChange = useCallback(
    (rawValue: string) => {
      const nextSeasonNumber = Number.parseInt(rawValue, 10);
      if (!Number.isFinite(nextSeasonNumber) || nextSeasonNumber <= 0) return;
      setShowDedicatedSeasonMenu(false);
      const href = buildSeasonSelectionHref(nextSeasonNumber);
      if (!href || typeof window === "undefined") return;
      if (`${window.location.pathname}${window.location.search}` === href) return;
      window.location.assign(href);
    },
    [buildSeasonSelectionHref],
  );

  const resetCommunityForm = () => {
    setCommunitySubreddit("");
    setCommunityDisplayName("");
    setCommunityNotes("");
    setCommunityIsShowFocused(mode === "season");
    setCommunityNetworkTargets([]);
    setCommunityFranchiseTargets([]);
    setCommunityNetworkTargetInput("");
    setCommunityFranchiseTargetInput("");
    if (mode === "season") {
      setCommunityShowId(showId ?? "");
      setCommunityShowName(showName ?? "");
    }
  };

  const resetThreadForm = () => {
    setThreadTitle("");
    setThreadUrl("");
    setThreadNotes("");
    setAssignThreadToSeason(mode === "season");
  };

  const handleCreateCommunity = async (event: React.FormEvent) => {
    event.preventDefault();
    const effectiveShowId = mode === "season" ? showId : communityShowId;
    const effectiveShowName = mode === "season" ? showName : communityShowName;
    if (!effectiveShowId || !effectiveShowName) {
      setError("Show is required before creating a community");
      return;
    }

    setBusyAction("create-community");
    setBusyLabel("Creating community...");
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout("/api/admin/reddit/communities", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          trr_show_id: effectiveShowId,
          trr_show_name: effectiveShowName,
          subreddit: communitySubreddit,
          display_name: communityDisplayName || null,
          notes: communityNotes || null,
          is_show_focused: communityIsShowFocused,
          network_focus_targets: communityIsShowFocused ? [] : communityNetworkTargets,
          franchise_focus_targets: communityIsShowFocused ? [] : communityFranchiseTargets,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to create community");
      }
      const body = (await response.json()) as { community?: RedditCommunityResponse };
      if (!body.community) {
        throw new Error("Community created but response payload was empty");
      }

      const createdCommunity = toCommunityModel(body.community);
      setCommunities((prev) =>
        sortCommunityList([createdCommunity, ...prev.filter((community) => community.id !== createdCommunity.id)]),
      );
      setSelectedCommunityId(createdCommunity.id);
      setSeasonDiscovery(null);
      setWindowDiscoveryByContainer({});
      resetCommunityForm();
      setShowCommunityForm(false);
      void refreshCommunityFlares(createdCommunity.id);
      void fetchCommunities().catch((err) => {
        console.warn("[reddit] Failed to sync communities after create", err);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create community");
    } finally {
      setBusyAction(null);
      setBusyLabel(null);
    }
  };

  const handleDeleteCommunity = async (communityId: string) => {
    if (!confirm("Delete this community and all assigned threads?")) return;
    setBusyAction("delete-community");
    setBusyLabel("Deleting community...");
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(`/api/admin/reddit/communities/${communityId}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete community");
      }
      await fetchCommunities();
      if (selectedCommunityId === communityId) {
        setSeasonDiscovery(null);
        setWindowDiscoveryByContainer({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete community");
    } finally {
      setBusyAction(null);
      setBusyLabel(null);
    }
  };

  const handleCreateThread = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCommunity) {
      setError("Select a community before adding a thread");
      return;
    }
    const parsed = parseRedditUrl(threadUrl);
    if (!parsed) {
      setError("Enter a valid Reddit post URL");
      return;
    }

    setBusyAction("create-thread");
    setBusyLabel("Saving thread...");
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout("/api/admin/reddit/threads", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: selectedCommunity.id,
          trr_show_id: selectedCommunity.trr_show_id,
          trr_show_name: selectedCommunity.trr_show_name,
          trr_season_id: assignThreadToSeason ? seasonId ?? null : null,
          reddit_post_id: parsed.redditPostId,
          title: threadTitle,
          url: parsed.canonicalUrl,
          permalink: parsed.permalink,
          notes: threadNotes || null,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to create thread");
      }
      resetThreadForm();
      setShowThreadForm(false);
      await fetchCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create thread");
    } finally {
      setBusyAction(null);
      setBusyLabel(null);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm("Delete this assigned thread?")) return;
    setBusyAction("delete-thread");
    setBusyLabel("Deleting thread...");
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(`/api/admin/reddit/threads/${threadId}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete thread");
      }
      await fetchCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete thread");
    } finally {
      setBusyAction(null);
      setBusyLabel(null);
    }
  };

  const setContainerRefreshProgress = useCallback(
    (containerKey: string, progress: ContainerRefreshProgress | null) => {
      setContainerRefreshProgressByKey((current) => {
        if (!progress) {
          if (!(containerKey in current)) return current;
          const next = { ...current };
          delete next[containerKey];
          return next;
        }
        return {
          ...current,
          [containerKey]: progress,
        };
      });
    },
    [],
  );

  const resolveSeasonIdFastPath = useCallback(
    async (community: RedditCommunity): Promise<string | null> => {
      const targetSeasonNumber =
        typeof seasonNumber === "number" && Number.isFinite(seasonNumber) && seasonNumber > 0
          ? seasonNumber
          : null;
      if (!targetSeasonNumber) {
        return null;
      }
      const cacheKey = `${community.trr_show_id}:${targetSeasonNumber}`;
      const cachedSeasonId = seasonIdByShowAndNumberRef.current.get(cacheKey);
      if (cachedSeasonId) {
        return cachedSeasonId;
      }

      const cachedSeasonOptions = seasonOptionsCacheRef.current.get(community.trr_show_id);
      if (Array.isArray(cachedSeasonOptions) && cachedSeasonOptions.length > 0) {
        const matchedFromCache = cachedSeasonOptions.find(
          (season) => season.season_number === targetSeasonNumber && Boolean(season.id),
        );
        if (matchedFromCache?.id) {
          seasonIdByShowAndNumberRef.current.set(cacheKey, matchedFromCache.id);
          return matchedFromCache.id;
        }
      }

      const headers = await getAuthHeaders();
      const startedAt =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      const showIdKey = community.trr_show_id;
      const inFlightSeasonOptions = seasonOptionsRequestInFlightRef.current.get(showIdKey);
      const seasonOptionsPromise =
        inFlightSeasonOptions ??
        (async (): Promise<ShowSeasonOption[]> => {
          const response = await fetchWithTimeout(
            `/api/admin/trr-api/shows/${showIdKey}/seasons?limit=100&include_episode_signal=true`,
            {
              headers,
              cache: "no-store",
              timeoutMs: REQUEST_TIMEOUT_MS.seasonContext,
            },
          );
          if (!response.ok) {
            return [];
          }
          const payload = (await response.json().catch(() => ({}))) as { seasons?: ShowSeasonOption[] };
          return Array.isArray(payload.seasons)
            ? payload.seasons.filter(
                (season): season is ShowSeasonOption =>
                  Boolean(season?.id) &&
                  typeof season.season_number === "number" &&
                  Number.isFinite(season.season_number),
              )
            : [];
        })();
      if (!inFlightSeasonOptions) {
        seasonOptionsRequestInFlightRef.current.set(showIdKey, seasonOptionsPromise);
      }
      let seasons: ShowSeasonOption[] = [];
      try {
        seasons = await seasonOptionsPromise;
      } finally {
        if (!inFlightSeasonOptions && seasonOptionsRequestInFlightRef.current.get(showIdKey) === seasonOptionsPromise) {
          seasonOptionsRequestInFlightRef.current.delete(showIdKey);
        }
      }
      if (seasons.length === 0) {
        return null;
      }
      seasonOptionsCacheRef.current.set(showIdKey, seasons);
      for (const season of seasons) {
        seasonIdByShowAndNumberRef.current.set(`${showIdKey}:${season.season_number}`, season.id);
      }
      const matched = seasons.find((season) => season.season_number === targetSeasonNumber) ?? null;
      if (matched?.id) {
        logRedditPerfTiming("season_id_fast_resolved", startedAt, {
          show_id: showIdKey,
          season_number: targetSeasonNumber,
        });
      }
      return matched?.id ?? null;
    },
    [fetchWithTimeout, getAuthHeaders, seasonNumber],
  );

  const resolveSeasonIdForRequests = useCallback(
    async (communityId?: string): Promise<string | null> => {
      const startedAt =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      const maxSeasonNumberForContext =
        typeof seasonNumber === "number" && Number.isFinite(seasonNumber) && seasonNumber > 0
          ? seasonNumber
          : null;
      const pickSeasonId = (items: ShowSeasonOption[] | undefined | null): string | null => {
        if (!Array.isArray(items) || items.length === 0) return null;
        const candidates = items
          .filter(
            (season): season is ShowSeasonOption =>
              Boolean(season?.id) &&
              typeof season.season_number === "number" &&
              Number.isFinite(season.season_number),
          )
          .sort((a, b) => b.season_number - a.season_number);
        if (candidates.length === 0) return null;
        const eligible = candidates.filter((season) =>
          isSeasonEligibleForRedditSelection(season, {
            maxSeasonNumber: maxSeasonNumberForContext,
          }),
        );
        return (eligible.length > 0 ? eligible : candidates)[0]?.id ?? null;
      };

      const explicitSeasonId = episodeSeasonId ?? seasonId ?? null;
      if (explicitSeasonId) {
        return explicitSeasonId;
      }

      const firstSeasonOptionId = pickSeasonId(seasonOptions);
      if (firstSeasonOptionId) {
        return firstSeasonOptionId;
      }

      const activeCommunity =
        selectedCommunity && (!communityId || selectedCommunity.id === communityId)
          ? selectedCommunity
          : null;
      if (!activeCommunity) {
        return null;
      }

      const cachedSeasonId = pickSeasonId(
        seasonOptionsCacheRef.current.get(activeCommunity.trr_show_id),
      );
      if (cachedSeasonId) {
        logRedditPerfTiming("season_id_resolved_from_cache", startedAt, {
          show_id: activeCommunity.trr_show_id,
        });
        return cachedSeasonId;
      }
      const resolutionKey = `${activeCommunity.id}:${seasonId ?? "none"}:${seasonNumber ?? "none"}`;
      const inFlightResolution = seasonIdResolutionInFlightRef.current.get(resolutionKey);
      if (inFlightResolution) {
        return await inFlightResolution;
      }

      const resolutionPromise = (async (): Promise<string | null> => {
        try {
          const fastSeasonId = await resolveSeasonIdFastPath(activeCommunity);
          if (fastSeasonId) {
            if (!episodeSeasonId) {
              setEpisodeSeasonId(fastSeasonId);
            }
            logRedditPerfTiming("season_id_resolved_fast_path", startedAt, {
              show_id: activeCommunity.trr_show_id,
              season_id: fastSeasonId,
            });
            return fastSeasonId;
          }
        } catch {
          // Fall back to full context load below when fast path fails.
        }

        try {
          await loadSeasonAndPeriodContext(activeCommunity);
        } catch {
          return null;
        }

        const resolved = pickSeasonId(seasonOptionsCacheRef.current.get(activeCommunity.trr_show_id));
        if (resolved) {
          logRedditPerfTiming("season_id_resolved_full_context", startedAt, {
            show_id: activeCommunity.trr_show_id,
            season_id: resolved,
          });
        }
        return resolved;
      })();

      seasonIdResolutionInFlightRef.current.set(resolutionKey, resolutionPromise);
      try {
        return await resolutionPromise;
      } finally {
        if (seasonIdResolutionInFlightRef.current.get(resolutionKey) === resolutionPromise) {
          seasonIdResolutionInFlightRef.current.delete(resolutionKey);
        }
      }
    },
    [
      episodeSeasonId,
      loadSeasonAndPeriodContext,
      resolveSeasonIdFastPath,
      seasonId,
      seasonNumber,
      seasonOptions,
      seasonIdResolutionInFlightRef,
      selectedCommunity,
    ],
  );

  const fetchDiscoveryForCommunity = useCallback(
    async (
      communityId: string,
      options?: DiscoveryFetchOptions,
    ): Promise<DiscoveryFetchResult> => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      const requestedSeasonId = options?.seasonId ?? (await resolveSeasonIdForRequests(communityId));
      if (requestedSeasonId) {
        params.set("season_id", requestedSeasonId);
      }
      if (options?.periodStart) {
        params.set("period_start", options.periodStart);
      }
      if (options?.periodEnd) {
        params.set("period_end", options.periodEnd);
      }
      if (options?.containerKey) {
        params.set("container_key", options.containerKey);
      }
      if (options?.periodLabel) {
        params.set("period_label", options.periodLabel);
      }
      if (options?.coverageMode) {
        params.set("coverage_mode", options.coverageMode);
      }
      if (options?.exhaustive) {
        params.set("exhaustive", "true");
      }
      if (options?.searchBackfill) {
        params.set("search_backfill", "true");
      }
      if (options?.refresh) {
        params.set("refresh", "true");
        if (typeof options.waitForCompletion === "boolean") {
          params.set("wait", options.waitForCompletion ? "true" : "false");
        }
      }
      if (options?.forceFlares && options.forceFlares.length > 0) {
        for (const flair of options.forceFlares) {
          const normalized = flair.trim();
          if (!normalized) continue;
          params.append("force_flair", normalized);
        }
      } else if (options?.forceFlair) {
        params.set("force_flair", options.forceFlair);
      }
      if (typeof options?.maxPages === "number" && Number.isFinite(options.maxPages)) {
        params.set("max_pages", String(Math.max(1, Math.trunc(options.maxPages))));
      }
      const qs = params.toString();
      const requestUrl = `/api/admin/reddit/communities/${communityId}/discover${qs ? `?${qs}` : ""}`;
      const requestKey = `${communityId}::${qs}`;
      const shouldDedup = options?.refresh !== true;
      const inFlightRequests = discoveryRequestInFlightRef.current;
      if (shouldDedup) {
        const existing = inFlightRequests.get(requestKey);
        if (existing) return existing;
      }

      const requestPromise = (async (): Promise<DiscoveryFetchResult> => {
        const response = await fetchWithTimeout(requestUrl, {
          headers,
          cache: "no-store",
          timeoutMs: options?.timeoutMs ?? REQUEST_TIMEOUT_MS.discover,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to discover threads");
        }
        const payload = (await response.json()) as {
          discovery?: DiscoveryPayload | null;
          warning?: string;
          run?: Record<string, unknown>;
          source?: unknown;
        };
        const runPayload = payload.run;
        const runStatus = runPayload?.status;
        const source =
          payload.source === "cache" || payload.source === "live_run"
            ? payload.source
            : null;
        return {
          discovery: payload.discovery ?? null,
          warning: typeof payload.warning === "string" && payload.warning.trim() ? payload.warning : null,
          source,
          run:
            typeof runPayload?.run_id === "string" &&
            runPayload.run_id.trim().length > 0 &&
            isRefreshRunStatus(runStatus)
              ? {
                  run_id: runPayload.run_id,
                  status: runStatus,
                  error: typeof runPayload.error === "string" ? runPayload.error : null,
                  totals:
                    runPayload.totals && typeof runPayload.totals === "object"
                      ? {
                          fetched_rows:
                            typeof (runPayload.totals as Record<string, unknown>).fetched_rows === "number"
                              ? ((runPayload.totals as Record<string, unknown>).fetched_rows as number)
                              : undefined,
                          matched_rows:
                            typeof (runPayload.totals as Record<string, unknown>).matched_rows === "number"
                              ? ((runPayload.totals as Record<string, unknown>).matched_rows as number)
                              : undefined,
                          tracked_flair_rows:
                            typeof (runPayload.totals as Record<string, unknown>).tracked_flair_rows === "number"
                              ? ((runPayload.totals as Record<string, unknown>).tracked_flair_rows as number)
                              : undefined,
                        }
                      : undefined,
                  diagnostics:
                    runPayload.diagnostics && typeof runPayload.diagnostics === "object"
                      ? parseRefreshRunDiagnostics(runPayload.diagnostics)
                      : undefined,
                  queue: parseRefreshRunQueue(runPayload.queue),
                  queue_position:
                    typeof runPayload.queue_position === "number"
                      ? runPayload.queue_position
                      : null,
                  active_jobs:
                    typeof runPayload.active_jobs === "number"
                      ? runPayload.active_jobs
                      : null,
                  updated_at: typeof runPayload.updated_at === "string" ? runPayload.updated_at : null,
                }
              : null,
        };
      })();

      if (!shouldDedup) return requestPromise;
      inFlightRequests.set(requestKey, requestPromise);
      try {
        return await requestPromise;
      } finally {
        if (inFlightRequests.get(requestKey) === requestPromise) {
          inFlightRequests.delete(requestKey);
        }
      }
    },
    [fetchWithTimeout, getAuthHeaders, resolveSeasonIdForRequests],
  );

  const fetchRefreshRunStatus = useCallback(
    async (runId: string): Promise<RefreshRunStatus> => {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(`/api/admin/reddit/runs/${runId}`, {
        headers,
        cache: "no-store",
        timeoutMs: REQUEST_TIMEOUT_MS.runStatus,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to fetch reddit refresh status");
      }
      const payload = (await response.json()) as Record<string, unknown>;
      const status = payload.status;
      if (!isRefreshRunStatus(status)) {
        throw new Error("Invalid reddit refresh status payload");
      }
      return {
        run_id: String(payload.run_id ?? runId),
        status,
        error: typeof payload.error === "string" ? payload.error : null,
        totals:
          payload.totals && typeof payload.totals === "object"
            ? {
                fetched_rows:
                  typeof (payload.totals as Record<string, unknown>).fetched_rows === "number"
                    ? ((payload.totals as Record<string, unknown>).fetched_rows as number)
                    : undefined,
                matched_rows:
                  typeof (payload.totals as Record<string, unknown>).matched_rows === "number"
                    ? ((payload.totals as Record<string, unknown>).matched_rows as number)
                    : undefined,
                tracked_flair_rows:
                  typeof (payload.totals as Record<string, unknown>).tracked_flair_rows === "number"
                    ? ((payload.totals as Record<string, unknown>).tracked_flair_rows as number)
                    : undefined,
              }
            : undefined,
        diagnostics:
          payload.diagnostics && typeof payload.diagnostics === "object"
            ? parseRefreshRunDiagnostics(payload.diagnostics)
            : undefined,
        queue: parseRefreshRunQueue(payload.queue),
        queue_position: typeof payload.queue_position === "number" ? payload.queue_position : null,
        active_jobs: typeof payload.active_jobs === "number" ? payload.active_jobs : null,
        updated_at: typeof payload.updated_at === "string" ? payload.updated_at : null,
      };
    },
    [fetchWithTimeout, getAuthHeaders],
  );

  const pollContainerRefreshRun = useCallback(
    async (input: {
      communityId: string;
      containerKey: string;
      label: string;
      runId: string;
      periodStart: string | null;
      periodEnd: string | null;
    }): Promise<DiscoveryFetchResult> => {
      const nextToken = (containerRefreshPollTokenRef.current[input.containerKey] ?? 0) + 1;
      containerRefreshPollTokenRef.current[input.containerKey] = nextToken;
      let transientErrors = 0;

      for (let attempt = 0; attempt < CONTAINER_RUN_POLL_MAX_ATTEMPTS; attempt += 1) {
        let run: RefreshRunStatus;
        try {
          run = await fetchRefreshRunStatus(input.runId);
          transientErrors = 0;
        } catch (error) {
          const message = toErrorMessage(error, "Failed to fetch reddit refresh status");
          const isTransient = /\btimeout\b|\btimed out\b|could not reach trr-backend|failed to fetch/i.test(
            message.toLowerCase(),
          );
          if (isTransient && transientErrors < 5) {
            transientErrors += 1;
            setContainerRefreshProgress(input.containerKey, {
              runId: input.runId,
              status: "running",
              message: `${input.label}: waiting for backend run status… (${transientErrors}/5 retrying)`,
            });
            await sleep(CONTAINER_RUN_POLL_INTERVAL_MS);
            continue;
          }
          throw error;
        }
        if (containerRefreshPollTokenRef.current[input.containerKey] !== nextToken) {
          throw new Error("Refresh polling superseded by newer request");
        }
        setContainerRefreshProgress(input.containerKey, {
          runId: run.run_id,
          status: run.status,
          message: buildContainerRunProgressMessage(input.label, run),
        });

        if (!TERMINAL_REFRESH_RUN_STATUSES.has(run.status)) {
          await sleep(CONTAINER_RUN_POLL_INTERVAL_MS);
          continue;
        }

        if (run.status === "failed" || run.status === "cancelled") {
          throw new Error(run.error || `Refresh ${run.status} for ${input.label}.`);
        }

        const cachedResult = await fetchDiscoveryForCommunity(input.communityId, {
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          containerKey: input.containerKey,
          periodLabel: input.label,
          exhaustive: true,
          searchBackfill: true,
          refresh: false,
          maxPages: 500,
          timeoutMs: REQUEST_TIMEOUT_MS.discover,
        });
        if (containerRefreshPollTokenRef.current[input.containerKey] !== nextToken) {
          throw new Error("Refresh polling superseded by newer request");
        }
        return {
          discovery: cachedResult.discovery,
          warning: cachedResult.warning,
          run,
          source: cachedResult.source,
        };
      }

      throw new Error(
        `Refresh is still running for ${input.label}. Keep this page open or check again shortly.`,
      );
    },
    [fetchDiscoveryForCommunity, fetchRefreshRunStatus, setContainerRefreshProgress],
  );

  useEffect(() => {
    hydratedWindowContainersRef.current.clear();
    hydratingWindowContainersRef.current.clear();
  }, [selectedCommunity?.id, episodeSeasonId]);

  useEffect(() => {
    if (!selectedCommunityContextSeed) return;
    if (loading || episodeRefreshing) return;
    if (!isTabVisible) return;
    const token = windowCacheHydrationTokenRef.current + 1;
    windowCacheHydrationTokenRef.current = token;
    let isCancelled = false;

    const hydrateWindowCaches = async () => {
      const payloadByContainer: Record<string, DiscoveryPayload> = {};
      const warnings: string[] = [];

      const priorityKeys = new Set<string>([
        "period-preseason",
        "episode-1",
        "period-postseason",
      ]);
      if (selectedPeriodKey !== "all-periods") {
        priorityKeys.add(selectedPeriodKey);
      }

      const fallbackBoundsForKey = (containerKey: string): EpisodeWindowBounds => {
        if (containerKey === "period-preseason") {
          return {
            key: containerKey,
            label: "Pre-Season",
            start: null,
            end: null,
            type: "period",
            source: "fallback",
          };
        }
        if (containerKey === "period-postseason") {
          return {
            key: containerKey,
            label: "Post-Season",
            start: null,
            end: null,
            type: "period",
            source: "fallback",
          };
        }
        const episodeMatch = containerKey.match(/^episode-(\d+)$/i);
        if (episodeMatch) {
          const episodeNumber = Number.parseInt(episodeMatch[1] ?? "0", 10);
          return {
            key: containerKey,
            label: `Episode ${Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : "?"}`,
            start: null,
            end: null,
            type: "episode",
            source: "fallback",
            episodeNumber: Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : undefined,
          };
        }
        return {
          key: containerKey,
          label: containerKey,
          start: null,
          end: null,
          type: "period",
          source: "fallback",
        };
      };

      const windowCandidates =
        episodeWindowBoundsByContainer.size > 0
          ? [...episodeWindowBoundsByContainer.entries()]
          : [...priorityKeys].map(
              (key): [string, EpisodeWindowBounds] => [key, fallbackBoundsForKey(key)],
            );

      const windows = windowCandidates.filter(
        ([windowContainerKey]) =>
          priorityKeys.has(windowContainerKey) &&
          !hydratedWindowContainersRef.current.has(windowContainerKey) &&
          !hydratingWindowContainersRef.current.has(windowContainerKey),
      );
      if (windows.length === 0) return;

      let nextWindowIndex = 0;
      const runWorker = async () => {
        while (nextWindowIndex < windows.length) {
          const currentIndex = nextWindowIndex;
          nextWindowIndex += 1;
          const [windowContainerKey, bounds] = windows[currentIndex] ?? [];
          if (!windowContainerKey || !bounds) continue;
          hydratingWindowContainersRef.current.add(windowContainerKey);
          try {
            const cachedResult = await fetchDiscoveryForCommunity(selectedCommunityContextSeed.id, {
              periodStart: bounds.start ?? null,
              periodEnd: bounds.end ?? null,
              containerKey: windowContainerKey,
              periodLabel: bounds.label,
              exhaustive: true,
              searchBackfill: true,
              refresh: false,
              maxPages: 500,
              timeoutMs: REQUEST_TIMEOUT_MS.discover,
            });
            if (isCancelled || windowCacheHydrationTokenRef.current !== token) return;
            hydratedWindowContainersRef.current.add(windowContainerKey);
            if (cachedResult.discovery) {
              payloadByContainer[windowContainerKey] = cachedResult.discovery;
            } else if (cachedResult.warning && !isNoCacheYetWarning(cachedResult.warning)) {
              warnings.push(`${bounds.label}: ${cachedResult.warning}`);
            }
          } catch (err) {
            if (isCancelled || windowCacheHydrationTokenRef.current !== token) return;
            hydratedWindowContainersRef.current.add(windowContainerKey);
            warnings.push(
              `${bounds.label}: ${toErrorMessage(err, "Failed to load cached posts for this window.")}`,
            );
          } finally {
            hydratingWindowContainersRef.current.delete(windowContainerKey);
          }
        }
      };

      const workerCount = Math.min(2, windows.length);
      await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
      if (isCancelled || windowCacheHydrationTokenRef.current !== token) return;

      const discoveredContainerKeys = Object.keys(payloadByContainer);
      if (discoveredContainerKeys.length > 0) {
        setWindowDiscoveryByContainer((current) => ({
          ...current,
          ...payloadByContainer,
        }));
        if (!firstCachePayloadLoggedRef.current) {
          const startedAt = communityContextStartedAtRef.current ?? communityBootstrapStartedAtRef.current;
          if (typeof startedAt === "number") {
            logRedditPerfTiming("first_cached_window_payload", startedAt, {
              community_id: selectedCommunityContextSeed.id,
              containers: discoveredContainerKeys,
            });
          }
          firstCachePayloadLoggedRef.current = true;
        }
      }
      if (warnings.length > 0) {
        setEpisodeContextWarning(warnings[0] ?? null);
      }
    };

    void hydrateWindowCaches();

    return () => {
      isCancelled = true;
    };
  }, [
    episodeRefreshing,
    episodeWindowBoundsByContainer,
    fetchDiscoveryForCommunity,
    isTabVisible,
    loading,
    selectedPeriodKey,
    selectedCommunityContextSeed,
    episodeSeasonId,
  ]);

  const upsertWindowDiscovery = useCallback(
    (containerKey: string, nextPayload: DiscoveryPayload) => {
      setWindowDiscoveryByContainer((current) => {
        const existing = current[containerKey];
        if (!existing) {
          return {
            ...current,
            [containerKey]: nextPayload,
          };
        }
        const merged = mergeDiscoveryPayloads({
          payloads: [existing, nextPayload],
          trackedFlairLabel: trackedUnassignedFlairLabel,
        });
        return {
          ...current,
          [containerKey]: merged ?? nextPayload,
        };
      });
    },
    [trackedUnassignedFlairLabel],
  );

  const openContainerPostsPage = useCallback(
    (containerKey: string) => {
      if (!selectedCommunity) return;
      if (!episodeSeasonId) {
        setError("Select a season before opening container posts.");
        return;
      }
      const bounds = episodeWindowBoundsByContainer.get(containerKey);
      if (!bounds) {
        setError("No window bounds available for this container.");
        return;
      }
      const selectedCommunityShowSlug = selectedShowSlug;
      const inferredShowSlug = resolvePreferredShowRouteSlug({
        fallback: resolveShowLabel(selectedCommunity.trr_show_name ?? showName ?? "", null),
      });
      const normalizedInferredShowSlug = inferredShowSlug === "show" ? null : inferredShowSlug;
      const aliasCandidate =
        [selectedCommunityShowSlug, showSlug, routeShowSlugFromPath].find((candidate) =>
          typeof candidate === "string" && /^rh[a-z0-9]{2,}$/i.test(candidate) && !candidate.includes("-"),
        ) ?? null;
      const routeShowSlug =
        aliasCandidate ??
        selectedCommunityShowSlug ??
        showSlug ??
        routeShowSlugFromPath ??
        routeRedditPathContext.showSlug ??
        normalizedInferredShowSlug;
      const normalizedCommunitySlug =
        normalizeCommunitySlugForPath(selectedCommunity.subreddit) ||
        routeRedditPathContext.communitySlug ||
        "";
      const windowSlug = buildWindowSlugFromContainerKey(containerKey);
      const routeSeasonNumber =
        typeof selectedSeasonNumber === "number" && Number.isFinite(selectedSeasonNumber)
          ? selectedSeasonNumber
          : typeof seasonNumber === "number" && Number.isFinite(seasonNumber)
            ? seasonNumber
            : typeof activeSeasonSelection === "number" && Number.isFinite(activeSeasonSelection)
              ? activeSeasonSelection
            : routeRedditPathContext.seasonNumber ??
              (episodeSeasonId
                ? seasonOptions.find((season) => season.id === episodeSeasonId)?.season_number ?? null
                : null);
      const communityWindowHref =
        routeShowSlug && normalizedCommunitySlug && routeSeasonNumber
          ? buildShowRedditCommunityWindowUrl({
              showSlug: routeShowSlug,
              communitySlug: normalizedCommunitySlug,
              seasonNumber: routeSeasonNumber,
              windowKey: windowSlug,
            })
          : null;
      if (communityWindowHref) {
        router.push(communityWindowHref);
        return;
      }
      setError("Unable to resolve season context for this window yet. Wait for season data to finish loading and try again.");
      return;
    },
    [
      activeSeasonSelection,
      episodeSeasonId,
      episodeWindowBoundsByContainer,
      routeShowSlugFromPath,
      routeRedditPathContext,
      router,
      seasonNumber,
      seasonOptions,
      selectedCommunity,
      selectedSeasonNumber,
      selectedShowSlug,
      showName,
      showSlug,
    ],
  );

  const handleRefreshPostsForContainer = useCallback(
    async (containerKey: string) => {
      if (!selectedCommunity) return;
      const bounds = episodeWindowBoundsByContainer.get(containerKey);
      if (!bounds) return;
      let discovered: DiscoveryPayload | null = null;
      const coverageMode = containerKey === "period-preseason" ? "adaptive_deep" : "standard";
      const maxPagesForContainer = coverageMode === "adaptive_deep" ? 1000 : 500;

      containerRefreshPollTokenRef.current[containerKey] =
        (containerRefreshPollTokenRef.current[containerKey] ?? 0) + 1;
      setRefreshingContainerKey(containerKey);
      setContainerRefreshProgress(containerKey, {
        runId: "pending",
        status: "queued",
        message: `${bounds.label}: starting refresh…`,
      });
      setError(null);
      setEpisodeContextWarning(null);
      try {
        const discoveryResult = await fetchDiscoveryForCommunity(selectedCommunity.id, {
          periodStart: bounds.start ?? null,
          periodEnd: bounds.end ?? null,
          containerKey,
          periodLabel: bounds.label,
          exhaustive: true,
          searchBackfill: true,
          coverageMode,
          refresh: true,
          waitForCompletion: false,
          maxPages: maxPagesForContainer,
          timeoutMs: REQUEST_TIMEOUT_MS.discoverRefresh,
        });
        discovered = discoveryResult.discovery;
        if (!discovered) {
          const run = discoveryResult.run;
          if (run) {
            setContainerRefreshProgress(containerKey, {
              runId: run.run_id,
              status: run.status,
              message: buildContainerRunProgressMessage(bounds.label, run),
            });
          }
          if (
            run?.status === "queued" ||
            run?.status === "running"
          ) {
          const polled = await pollContainerRefreshRun({
              communityId: selectedCommunity.id,
              containerKey,
              label: bounds.label,
              runId: run.run_id,
              periodStart: bounds.start ?? null,
              periodEnd: bounds.end ?? null,
            });
            discovered = polled.discovery;
            if (discovered) {
              upsertWindowDiscovery(containerKey, discovered);
            }
            if (polled.warning && !discovered) {
              setEpisodeContextWarning(polled.warning);
            } else if (!discovered) {
              setEpisodeContextWarning(
                `${bounds.label}: refresh completed but no posts were found in this window.`,
              );
            }
            return;
          }
          if (run && (run.status === "failed" || run.status === "cancelled")) {
            throw new Error(run.error || `Refresh ${run.status} for ${bounds.label}.`);
          }
          throw new Error(
            discoveryResult.warning ?? `No discovery payload returned for ${bounds.label}.`,
          );
        }
        upsertWindowDiscovery(containerKey, discovered);
        if (discoveryResult.run) {
          setContainerRefreshProgress(containerKey, {
            runId: discoveryResult.run.run_id,
            status: discoveryResult.run.status,
            message: buildContainerRunProgressMessage(bounds.label, discoveryResult.run),
          });
          if (isRefreshRunActiveStatus(discoveryResult.run.status)) {
            const polled = await pollContainerRefreshRun({
              communityId: selectedCommunity.id,
              containerKey,
              label: bounds.label,
              runId: discoveryResult.run.run_id,
              periodStart: bounds.start ?? null,
              periodEnd: bounds.end ?? null,
            });
            discovered = polled.discovery;
            if (discovered) {
              upsertWindowDiscovery(containerKey, discovered);
            }
            if (polled.warning && !discovered) {
              setEpisodeContextWarning(polled.warning);
            } else if (!discovered) {
              setEpisodeContextWarning(
                `${bounds.label}: refresh completed but no posts were found in this window.`,
              );
            } else {
              setEpisodeContextWarning(null);
            }
            return;
          }
          if (discoveryResult.warning) {
            setEpisodeContextWarning(discoveryResult.warning);
          }
        } else {
          setContainerRefreshProgress(containerKey, null);
          if (discoveryResult.warning) {
            setEpisodeContextWarning(discoveryResult.warning);
          }
        }
      } catch (err) {
        const failedMessage = toErrorMessage(err, `Failed to refresh posts for ${bounds.label}.`);
        const isTimeoutFailure = isTimeoutErrorMessage(failedMessage);
        if (!isTimeoutFailure) {
          setContainerRefreshProgress(containerKey, {
            runId: "error",
            status: "failed",
            message: `${bounds.label}: ${failedMessage}`,
          });
          setEpisodeContextWarning(failedMessage);
          setError(failedMessage);
          return;
        }
        try {
          // Timeout fallback: return cached period-window rows when live Reddit refresh stalls.
          const cachedResult = await fetchDiscoveryForCommunity(selectedCommunity.id, {
            periodStart: bounds.start ?? null,
            periodEnd: bounds.end ?? null,
            containerKey,
            periodLabel: bounds.label,
            exhaustive: true,
            searchBackfill: true,
            refresh: false,
            maxPages: 500,
            timeoutMs: REQUEST_TIMEOUT_MS.discover,
          });
          discovered = cachedResult.discovery;
          if (!discovered) {
            throw new Error(
              cachedResult.warning ?? `No cached discovery payload returned for ${bounds.label}.`,
            );
          }
          upsertWindowDiscovery(containerKey, discovered);
          setContainerRefreshProgress(containerKey, {
            runId: "timeout-fallback",
            status: "partial",
            message: `${bounds.label}: live refresh timed out; showing cached Supabase posts.`,
          });
          setEpisodeContextWarning(
            `Live refresh timed out for ${bounds.label}; showing cached posts from Supabase.`,
          );
        } catch (cacheErr) {
          const cacheMessage = toErrorMessage(
            cacheErr,
            `Failed to refresh posts for ${bounds.label}.`,
          );
          setContainerRefreshProgress(containerKey, {
            runId: "error",
            status: "failed",
            message: `${bounds.label}: ${cacheMessage}`,
          });
          setEpisodeContextWarning(cacheMessage);
          setError(cacheMessage);
        }
      } finally {
        setRefreshingContainerKey((current) => (current === containerKey ? null : current));
      }
    },
    [
      episodeWindowBoundsByContainer,
      fetchDiscoveryForCommunity,
      pollContainerRefreshRun,
      setContainerRefreshProgress,
      selectedCommunity,
      upsertWindowDiscovery,
    ],
  );

  const saveDiscoveredThread = async (thread: DiscoveryThread) => {
    if (!selectedCommunity) return;
    setBusyAction("save-discovered-thread");
    setBusyLabel("Saving discovered thread...");
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout("/api/admin/reddit/threads", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: selectedCommunity.id,
          trr_show_id: selectedCommunity.trr_show_id,
          trr_show_name: selectedCommunity.trr_show_name,
          trr_season_id: assignThreadToSeason ? seasonId ?? null : null,
          reddit_post_id: thread.reddit_post_id,
          title: thread.title,
          url: thread.url,
          permalink: thread.permalink,
          author: thread.author,
          score: thread.score,
          num_comments: thread.num_comments,
          posted_at: thread.posted_at,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save discovered thread");
      }
      await fetchCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save discovered thread");
    } finally {
      setBusyAction(null);
      setBusyLabel(null);
    }
  };

  const handleRefreshEpisodeDiscussions = useCallback(async () => {
    if (!selectedCommunity) return;

    setEpisodeRefreshing(true);
    setRefreshingContainerKey(null);
    setError(null);
    setEpisodeContextWarning(null);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      const requestedSeasonId = await resolveSeasonIdForRequests(selectedCommunity.id);
      if (requestedSeasonId) {
        params.set("season_id", requestedSeasonId);
      }
      if (!isDedicatedCommunityView && selectedPeriod) {
        params.set("period_start", selectedPeriod.start);
        params.set("period_end", selectedPeriod.end);
        params.set("period_label", selectedPeriod.label);
      }
      if (enableEpisodeSync) {
        params.set("sync", "true");
      }
      const response = await fetchWithTimeout(
        `/api/admin/reddit/communities/${selectedCommunity.id}/episode-discussions/refresh?${params.toString()}`,
        {
          method: "GET",
          headers,
          cache: "no-store",
          timeoutMs: REQUEST_TIMEOUT_MS.episodeRefresh,
        },
      );
      const payload = (await response.json().catch(() => ({}))) as EpisodeDiscussionRefreshPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to refresh episode discussions");
      }

      if (payload.community) {
        const nextCommunity = toCommunityModel(payload.community);
        mergeCommunityPatch(selectedCommunity.id, {
          episode_title_patterns: nextCommunity.episode_title_patterns,
        });
      }

      const nextCandidates = Array.isArray(payload.candidates) ? payload.candidates : [];
      const nextMatrix = Array.isArray(payload.episode_matrix) ? payload.episode_matrix : [];
      setEpisodeMatrix(nextMatrix);
      setEpisodeCandidates(nextCandidates);
      setEpisodeSelectedPostIds(nextCandidates.map((candidate) => candidate.reddit_post_id));
      setEpisodeMeta(payload.meta ?? null);
      const resolvedSeasonId = payload.meta?.season_context?.season_id;
      if (typeof resolvedSeasonId === "string" && resolvedSeasonId.trim().length > 0) {
        setEpisodeSeasonId(resolvedSeasonId);
      }
      try {
        // Sync Posts triggers a backend scrape/update pass for the season window, then shows cached Supabase rows.
        const cachedResult = await fetchDiscoveryForCommunity(selectedCommunity.id, {
          periodStart: seasonDiscoveryWindow.start,
          periodEnd: seasonDiscoveryWindow.end,
          coverageMode: "max_coverage",
          exhaustive: true,
          searchBackfill: true,
          refresh: true,
          waitForCompletion: false,
          maxPages: 1000,
          timeoutMs: REQUEST_TIMEOUT_MS.discoverRefresh,
        });
        if (cachedResult.discovery) {
          setSeasonDiscovery(cachedResult.discovery);
        } else if (cachedResult.warning) {
          setEpisodeContextWarning(cachedResult.warning);
        }
        if (cachedResult.run && isRefreshRunActiveStatus(cachedResult.run.status)) {
          setEpisodeContextWarning(
            `Season sync running in backend (run ${cachedResult.run.run_id.slice(0, 8)}); showing cached Supabase posts while it updates.`,
          );
        }
      } catch (discoverErr) {
        const discoverMessage = toErrorMessage(
          discoverErr,
          "Episode discussions refreshed, but cached tracked-flair totals could not be loaded.",
        );
        setEpisodeContextWarning(discoverMessage);
      }
      if ((payload.meta?.sync_auto_saved_count ?? 0) > 0) {
        await fetchCommunities();
      }
    } catch (err) {
      setError(toErrorMessage(err, "Failed to refresh episode discussions"));
    } finally {
      setEpisodeRefreshing(false);
    }
  }, [
    enableEpisodeSync,
    fetchDiscoveryForCommunity,
    fetchCommunities,
    fetchWithTimeout,
    getAuthHeaders,
    isDedicatedCommunityView,
    mergeCommunityPatch,
    seasonDiscoveryWindow.end,
    seasonDiscoveryWindow.start,
    selectedPeriod,
    selectedCommunity,
    resolveSeasonIdForRequests,
  ]);

  const handleEpisodeSeasonChange = useCallback(
    (nextSeasonId: string | null) => {
      if (!selectedCommunity) return;
      setEpisodeSeasonId(nextSeasonId);
      setEpisodeContextWarning(null);
      const season = seasonOptions.find((item) => item.id === nextSeasonId);
      if (season) {
        const requestToken = episodeContextRequestTokenRef.current + 1;
        episodeContextRequestTokenRef.current = requestToken;
        if (!isDedicatedCommunityView) {
          setPeriodsLoading(true);
        }
        setSelectedPeriodKey("all-periods");
        void Promise.all([
          loadSeasonEpisodesForSeason(season.id, {
            requestToken,
          }),
          loadPeriodOptionsForSeason(selectedCommunity, season, {
            requestToken,
          }),
        ])
          .catch((err) => {
            if (isRequestCancelledError(err)) {
              return;
            }
            setEpisodeContextWarning(
              toErrorMessage(err, "Failed to load social periods for selected season"),
            );
          })
          .finally(() => {
            if (episodeContextRequestTokenRef.current === requestToken) {
              setPeriodsLoading(false);
            }
          });
      } else {
        setSeasonEpisodes([]);
        setPeriodOptions([]);
      }
    },
    [
      isDedicatedCommunityView,
      loadPeriodOptionsForSeason,
      loadSeasonEpisodesForSeason,
      seasonOptions,
      selectedCommunity,
    ],
  );

  const handleSaveSelectedEpisodeDiscussions = useCallback(async () => {
    if (!selectedCommunity) return;
    const selectedThreads = episodeCandidates.filter((candidate) =>
      episodeSelectedPostIds.includes(candidate.reddit_post_id),
    );
    if (selectedThreads.length === 0) {
      setError("Select at least one episode discussion candidate to save");
      return;
    }

    setEpisodeSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `/api/admin/reddit/communities/${selectedCommunity.id}/episode-discussions/save`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          timeoutMs: REQUEST_TIMEOUT_MS.episodeSave,
          body: JSON.stringify({
            season_id: episodeSeasonId ?? null,
            threads: selectedThreads.map((thread) => ({
              reddit_post_id: thread.reddit_post_id,
              title: thread.title,
              url: thread.url,
              permalink: thread.permalink,
              author: thread.author,
              score: thread.score,
              num_comments: thread.num_comments,
              posted_at: thread.posted_at,
            })),
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as EpisodeDiscussionSavePayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save selected episode discussions");
      }
      await fetchCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save selected episode discussions");
    } finally {
      setEpisodeSaving(false);
    }
  }, [
    episodeCandidates,
    episodeSeasonId,
    episodeSelectedPostIds,
    fetchCommunities,
    fetchWithTimeout,
    getAuthHeaders,
    selectedCommunity,
  ]);

  const handleExportSyncAuditCsv = useCallback(() => {
    if (!selectedCommunity || syncCandidateResults.length === 0) {
      return;
    }
    const candidateByPostId = new Map(
      episodeCandidates.map((candidate) => [candidate.reddit_post_id, candidate]),
    );
    const seasonIdForExport = episodeMeta?.season_context?.season_id ?? episodeSeasonId ?? "";
    const seasonNumberForExport = episodeMeta?.season_context?.season_number ?? selectedSeasonNumber;
    const primaryPeriodLabel = episodeMeta?.period_context?.selected_period_labels?.[0] ?? "";
    const rows: string[][] = [
      [
        "community_id",
        "subreddit",
        "show_id",
        "show_name",
        "season_id",
        "season_number",
        "period_label",
        "reddit_post_id",
        "title",
        "url",
        "permalink",
        "author",
        "posted_at",
        "episode_number",
        "discussion_type",
        "link_flair_text",
        "sync_status",
        "reason_code",
        "reason",
      ],
    ];

    for (const result of syncCandidateResults) {
      const candidate = candidateByPostId.get(result.reddit_post_id);
      rows.push([
        selectedCommunity.id,
        selectedCommunity.subreddit,
        selectedCommunity.trr_show_id,
        selectedCommunity.trr_show_name,
        seasonIdForExport,
        seasonNumberForExport != null ? String(seasonNumberForExport) : "",
        primaryPeriodLabel,
        result.reddit_post_id,
        candidate?.title ?? "",
        candidate?.url ?? "",
        candidate?.permalink ?? "",
        candidate?.author ?? "",
        candidate?.posted_at ?? "",
        typeof candidate?.episode_number === "number" ? String(candidate.episode_number) : "",
        candidate?.discussion_type ?? "",
        candidate?.link_flair_text ?? "",
        result.status,
        result.reason_code ?? "",
        result.reason ?? "",
      ]);
    }

    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const safeSubreddit = selectedCommunity.subreddit.replace(/[^a-z0-9_-]+/gi, "-");
    const seasonFragment =
      seasonNumberForExport != null && Number.isFinite(seasonNumberForExport)
        ? `s${seasonNumberForExport}`
        : "sna";
    const filename = `reddit-sync-audit-${safeSubreddit}-${seasonFragment}-${formatCsvTimestamp()}.csv`;
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  }, [
    episodeCandidates,
    episodeMeta?.period_context?.selected_period_labels,
    episodeMeta?.season_context?.season_id,
    episodeMeta?.season_context?.season_number,
    episodeSeasonId,
    selectedCommunity,
    selectedSeasonNumber,
    syncCandidateResults,
  ]);

  const renderDiscoveryThreadCard = (thread: DiscoveryThread) => {
    if (!selectedCommunity) return null;
    const flairModeLabel = describeFlairMode(thread.flair_mode);
    return (
      <div key={thread.reddit_post_id} className="rounded-lg border border-zinc-100 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <a
              href={thread.url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:underline"
            >
              {thread.title}
            </a>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>u/{thread.author ?? "unknown"}</span>
              <span>{fmtNum(thread.score)} score</span>
              <span>{fmtNum(thread.num_comments)} comments</span>
              <span>sort: {thread.source_sorts.join(", ")}</span>
              {thread.link_flair_text && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  Flair: {thread.link_flair_text}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {thread.is_show_match ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Show Match · score {thread.match_score}
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                  Non-match
                </span>
              )}
              {(thread.matched_terms ?? []).map((term) => (
                <span
                  key={`${thread.reddit_post_id}-m-${term}`}
                  className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
                >
                  + {term}
                </span>
              ))}
              {(thread.matched_cast_terms ?? []).map((term) => (
                <span
                  key={`${thread.reddit_post_id}-cast-${term}`}
                  className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-700"
                >
                  cast: {term}
                </span>
              ))}
              {(thread.cross_show_terms ?? []).map((term) => (
                <span
                  key={`${thread.reddit_post_id}-x-${term}`}
                  className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700"
                >
                  - {term}
                </span>
              ))}
              {(selectedCommunity.analysis_flares.length > 0 ||
                selectedCommunity.analysis_all_flares.length > 0) && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    (thread.passes_flair_filter ?? true)
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {(thread.passes_flair_filter ?? true) ? "Selected flair" : "Flair excluded"}
                </span>
              )}
              {flairModeLabel && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">
                  {flairModeLabel}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void saveDiscoveredThread(thread)}
            className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Thread
          </button>
        </div>
      </div>
    );
  };

  const renderEpisodeTitlePhraseSettings = () => {
    if (!selectedCommunity) return null;
    const categorizedPatterns = selectedCommunity.episode_title_patterns.map((pattern) => ({
      pattern,
      category: resolveEpisodeFilterCategoryLabel(pattern),
    }));

    return (
      <div className="rounded-lg border border-zinc-200 p-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Discussion Filters
        </p>
        <p className="mb-2 text-xs text-zinc-500">
          These keyword filters drive episode-discussion matching by category.
        </p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {EPISODE_FILTER_CATEGORY_RULES.map((rule) => (
            <span
              key={`episode-filter-category-${rule.label}`}
              className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-600"
            >
              {rule.label}
            </span>
          ))}
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {categorizedPatterns.length === 0 && (
            <span className="text-xs text-zinc-500">No discussion filters configured.</span>
          )}
          {categorizedPatterns.map(({ pattern, category }) => (
            <button
              key={`episode-pattern-${selectedCommunity.id}-${pattern}`}
              type="button"
              disabled={isBusy}
              onClick={() => {
                const nextPatterns = selectedCommunity.episode_title_patterns.filter(
                  (value) => value.toLowerCase() !== pattern.toLowerCase(),
                );
                void persistEpisodeRules(selectedCommunity.id, {
                  episodeTitlePatterns: nextPatterns,
                });
              }}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-60"
            >
              {category}: {pattern} ×
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={episodePatternInput}
            onChange={(event) => setEpisodePatternInput(event.target.value)}
            placeholder="Add episode title phrase"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              const nextPatterns = pushListValue(
                selectedCommunity.episode_title_patterns,
                episodePatternInput,
              );
              setEpisodePatternInput("");
              void persistEpisodeRules(selectedCommunity.id, {
                episodeTitlePatterns: nextPatterns,
              });
            }}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Add
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {episodePatternSuggestions
            .filter(
              (pattern) =>
                !selectedCommunity.episode_title_patterns.some(
                  (value) => value.toLowerCase() === pattern.toLowerCase(),
                ),
            )
            .map((pattern) => (
              <button
                key={`episode-pattern-suggestion-${selectedCommunity.id}-${pattern}`}
                type="button"
                disabled={isBusy}
                onClick={() => {
                  void persistEpisodeRules(selectedCommunity.id, {
                    episodeTitlePatterns: [
                      ...selectedCommunity.episode_title_patterns,
                      pattern,
                    ],
                  });
                }}
                className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
              >
                + {pattern}
              </button>
            ))}
        </div>
        {!selectedCommunity.is_show_focused && (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600">
            Required flares for episode refresh are sourced from{" "}
            <span className="font-semibold">All Posts With Flair</span>.
          </div>
        )}
      </div>
    );
  };

  const renderEpisodeDiscussionPanel = () => {
    if (!selectedCommunity) return null;

    return (
      <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        {!isDedicatedCommunityView && (
          <>
            <div className="mb-2">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Episode Discussions
              </p>
            </div>
            <p className="mb-2 text-xs text-zinc-500">
              Episode discussions are post types in this subreddit matched by title phrases.
            </p>
          </>
        )}
        {episodeContextWarning && (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            {episodeContextWarning}
          </div>
        )}

        {!isDedicatedCommunityView && (
          <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Season
              </span>
              <select
                value={episodeSeasonId ?? ""}
                disabled={isBusy || periodsLoading || seasonOptions.length === 0}
                onChange={(event) => handleEpisodeSeasonChange(event.target.value || null)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-60"
              >
                {seasonOptions.length === 0 ? (
                  <option value="">No seasons</option>
                ) : (
                  seasonOptions.map((season) => (
                    <option key={season.id} value={season.id}>
                      Season {season.season_number}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Period
              </span>
              <select
                value={selectedPeriodKey}
                disabled={isBusy || periodsLoading || periodOptions.length === 0}
                onChange={(event) => setSelectedPeriodKey(event.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-60"
              >
                {periodOptions.length === 0 ? (
                  <option value="all-periods">All Periods</option>
                ) : (
                  periodOptions.map((period) => (
                    <option key={period.key} value={period.key}>
                      {period.label}
                    </option>
                  ))
                )}
              </select>
            </label>
            <button
              type="button"
              disabled={isBusy || periodsLoading || episodeRefreshing}
              onClick={() => void handleRefreshEpisodeDiscussions()}
              className="self-end rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {episodeRefreshing ? "Refreshing..." : "Refresh Episode Discussions"}
            </button>
          </div>
        )}

        {episodeMeta?.auto_seeded_required_flares && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            Using temporary required flair: Salt Lake City (set in All Posts With Flair to persist).
          </div>
        )}

        {episodeMeta?.sync_requested && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
            Episode discussions auto-synced {episodeMeta.sync_auto_saved_count ?? 0} posts
            {episodeMeta.sync_skipped_conflicts && episodeMeta.sync_skipped_conflicts.length > 0
              ? ` · skipped conflicts: ${episodeMeta.sync_skipped_conflicts.length}`
              : ""}
            {typeof episodeMeta.sync_skipped_ineligible_count === "number"
              ? ` · skipped ineligible: ${episodeMeta.sync_skipped_ineligible_count}`
              : ""}
            <div className="mt-1 text-[11px] text-emerald-700/90">
              This count covers episode-discussion sync candidates only, not all tracked-flair posts.
            </div>
          </div>
        )}

        {syncCandidateResults.length > 0 && (
          <div className="mb-3">
            <button
              type="button"
              onClick={handleExportSyncAuditCsv}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Export Sync Audit CSV
            </button>
          </div>
        )}

        {episodeMeta && (
          <div className="mb-3 space-y-1">
            <p className="text-xs text-zinc-500">
              Found {episodeMeta.total_found ?? 0} episode-discussion candidates ·{" "}
              {typeof episodeMeta.fetched_at === "string" ? fmtDateTime(episodeMeta.fetched_at) : "-"}
              {episodeMeta.season_context?.season_number
                ? ` · Season ${episodeMeta.season_context.season_number}`
                : ""}
              {episodeMeta.period_context?.selected_period_labels?.[0]
                ? ` · ${episodeMeta.period_context.selected_period_labels[0]}`
                : ""}
              {episodeMeta.failed_sorts && episodeMeta.failed_sorts.length > 0
                ? ` · Failed sorts: ${episodeMeta.failed_sorts.join(", ")}`
                : ""}
              {episodeMeta.rate_limited_sorts && episodeMeta.rate_limited_sorts.length > 0
                ? ` · Rate-limited: ${episodeMeta.rate_limited_sorts.join(", ")}`
                : ""}
            </p>
            {typeof episodeMeta.coverage_expected_slots === "number" && (
              <p className="text-xs text-zinc-500">
                Episodes matched {episodeMeta.coverage_found_episode_count ?? 0}/
                {episodeMeta.expected_episode_count ?? 0} · thread slots matched{" "}
                {episodeMeta.coverage_found_slots ?? 0}/{episodeMeta.coverage_expected_slots}
              </p>
            )}
            {episodeMeta.discovery_source_summary && (
              <p className="text-xs text-zinc-500">
                Listings: {episodeMeta.discovery_source_summary.listing_count ?? 0} · Search hits:{" "}
                {episodeMeta.discovery_source_summary.search_count ?? 0} · Search pages:{" "}
                {episodeMeta.discovery_source_summary.search_pages_fetched ?? 0} · Gap-fill
                queries: {episodeMeta.discovery_source_summary.gap_fill_queries_run ?? 0}
              </p>
            )}
            {selectedRelevantPostFlares.length > 0 && (
              <p className="text-xs text-zinc-500">
                {episodeRefreshing ? (
                  "Refreshing tracked flair totals across episode windows..."
                ) : (
                  <>
                    Season total tracked flair posts across episode windows (
                    {discovery?.collection_mode === "exhaustive_window" ? "exhaustive" : "sample"}) ·{" "}
                    {fmtNum(trackedFlairWindowPostCount)}
                  </>
                )}
              </p>
            )}
            {discovery?.totals && (
              <p className="text-xs text-zinc-500">
                Discover totals · fetched {fmtNum(discovery.totals.fetched_rows)} · matched{" "}
                {fmtNum(discovery.totals.matched_rows)} · tracked flair{" "}
                {fmtNum(discovery.totals.tracked_flair_rows)}
              </p>
            )}
            {discovery?.collection_mode === "exhaustive_window" &&
              discovery.window_exhaustive_complete === false && (
                <p className="text-xs text-amber-700">
                  Exhaustive crawl hit max pages ({fmtNum(discovery.max_pages_applied ?? 0)}); totals may be incomplete.
                </p>
              )}
          </div>
        )}

        {!isDedicatedCommunityView && episodeMatrixRowsForDisplay.length > 0 && (
          <div className="mb-3">
            {renderEpisodeMatrixCards(episodeMatrixRowsForDisplay, {
              episodeAirDateByNumber,
              episodeWindowByContainer: episodeWindowBoundsByContainer,
              totalsLoading: episodeRefreshing,
              totalTrackedFlairCountByContainer: trackedFlairTotalCountByContainerWindow,
              unassignedFlairCountByContainer: unassignedFlairCountByContainerWindow,
              unassignedFlairCountBySlot: matrixUnassignedFlairCountBySlot,
              totalTrackedFlairCountBySlot: matrixTrackedFlairTotalCountBySlot,
              seasonalBoundaryPeriods: seasonalBoundaryPeriods,
              unassignedFlairCountBySeasonBoundaryPeriod: matrixUnassignedFlairCountBySeasonBoundaryPeriod,
              totalTrackedFlairCountBySeasonBoundaryPeriod:
                matrixTrackedFlairTotalCountBySeasonBoundaryPeriod,
              linkedPostsByContainer: linkedDiscussionPostsByContainer,
              refreshProgressByContainer: containerRefreshProgressByKey,
              onRefreshContainerPosts: (containerKey) => void handleRefreshPostsForContainer(containerKey),
              refreshingContainerKey,
              refreshPostsDisabled: isBusy || episodeRefreshing,
              periodsLoading,
              onOpenContainerPosts: (containerKey) => void openContainerPostsPage(containerKey),
              onViewAllContainerPosts: (containerKey) => void openContainerPostsPage(containerKey),
            })}
          </div>
        )}

        {!isDedicatedCommunityView && episodeCandidates.length > 0 && (
          <div className="mb-3 grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Auto-sync status
              </span>
              <select
                value={syncStatusFilter}
                onChange={(event) =>
                  setSyncStatusFilter(event.target.value as EpisodeSyncStatusFilter)
                }
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                {SYNC_STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={`sync-status-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Auto-sync reason
              </span>
              <select
                value={syncReasonCodeFilter}
                onChange={(event) =>
                  setSyncReasonCodeFilter(event.target.value as "all" | SyncCandidateReasonCode)
                }
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-60"
                disabled={
                  syncStatusFilter === "no_sync_result" || availableSyncReasonCodes.length === 0
                }
              >
                <option value="all">All reasons</option>
                {availableSyncReasonCodes.map((reasonCode) => (
                  <option key={`sync-reason-${reasonCode}`} value={reasonCode}>
                    {formatSyncReasonCodeLabel(reasonCode)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSyncStatusFilter("all");
                  setSyncReasonCodeFilter("all");
                }}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}

        {!isDedicatedCommunityView &&
          (episodeCandidates.length === 0 ? (
          episodeMeta ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
              <p>
                No episode discussion candidates found for the selected season
                {isDedicatedCommunityView ? "." : " and period."}
              </p>
              {typeof episodeMeta.coverage_expected_slots === "number" && (
                <p className="mt-1">
                  Episodes matched {episodeMeta.coverage_found_episode_count ?? 0}/
                  {episodeMeta.expected_episode_count ?? 0} · thread slots matched{" "}
                  {episodeMeta.coverage_found_slots ?? 0}/{episodeMeta.coverage_expected_slots}
                </p>
              )}
              {episodeMeta.discovery_source_summary && (
                <p className="mt-1">
                  Listings: {episodeMeta.discovery_source_summary.listing_count ?? 0} · Search hits:{" "}
                  {episodeMeta.discovery_source_summary.search_count ?? 0} · Search pages:{" "}
                  {episodeMeta.discovery_source_summary.search_pages_fetched ?? 0} · Gap-fill
                  queries: {episodeMeta.discovery_source_summary.gap_fill_queries_run ?? 0}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No episode discussion candidates loaded yet.</p>
          )
        ) : filteredEpisodeCandidates.length === 0 ? (
          <p className="text-xs text-zinc-500">No candidates match current filters.</p>
        ) : (
          <div className="space-y-2">
            {filteredEpisodeCandidates.map((candidate) => {
              const checked = episodeSelectedPostIds.includes(candidate.reddit_post_id);
              const syncResult = syncCandidateResultByPostId.get(candidate.reddit_post_id);
              return (
                <div
                  key={`episode-candidate-${candidate.reddit_post_id}`}
                  className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-2"
                >
                  <div className="flex items-start gap-2">
                    {!isDedicatedCommunityView && (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setEpisodeSelectedPostIds((current) =>
                            event.target.checked
                              ? [...current, candidate.reddit_post_id]
                              : current.filter((id) => id !== candidate.reddit_post_id),
                          );
                        }}
                      />
                    )}
                    <div className="min-w-0">
                      <a
                        href={candidate.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:underline"
                      >
                        {candidate.title}
                      </a>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                        <span>
                          Episode {candidate.episode_number} ·{" "}
                          {formatDiscussionTypeLabel(candidate.discussion_type)}
                        </span>
                        <span>{fmtNum(candidate.score)} upvotes</span>
                        <span>{fmtNum(candidate.num_comments)} comments</span>
                        <span>{fmtDateTime(candidate.posted_at)}</span>
                        {candidate.link_flair_text && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            Flair: {candidate.link_flair_text}
                          </span>
                        )}
                        {syncResult && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              syncResult.status === "auto_saved"
                                ? "bg-emerald-100 text-emerald-700"
                                : syncResult.status === "skipped_conflict"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {formatSyncStatusLabel(syncResult.status)}
                          </span>
                        )}
                      </div>
                      {syncResult && syncResult.status !== "auto_saved" && (
                        <>
                          <p className="mt-1 text-[11px] text-zinc-600">{syncResult.reason}</p>
                          {syncResult.reason_code && (
                            <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                              Reason code: {syncResult.reason_code}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {!isDedicatedCommunityView && (
          <div className="mt-3">
            <button
              type="button"
              disabled={episodeSaving || episodeSelectedPostIds.length === 0}
              onClick={() => void handleSaveSelectedEpisodeDiscussions()}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {episodeSaving ? "Saving..." : "Save Selected"}
            </button>
          </div>
        )}
      </article>
    );
  };

  if (mode === "season" && (!showId || !showName)) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Reddit manager requires `showId` and `showName` in season mode.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {isDedicatedCommunityView ? (
            selectedCommunity ? (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <a
                    href={dedicatedBackHref}
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-300 p-1.5 text-zinc-700 hover:bg-zinc-50"
                    aria-label="Back to communities"
                    title="Back to communities"
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setShowCommunitySettingsModal(true)}
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-300 p-1.5 text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Open community settings"
                    title="Settings"
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path d="M10 3.3 11.1 5.5l2.4.35.6 2.35 2 .9-.9 2 .9 2-2 .9-.6 2.35-2.4.35L10 18.7l-1.1-2.2-2.4-.35-.6-2.35-2-.9.9-2-.9-2 2-.9.6-2.35 2.4-.35L10 3.3Z" />
                      <circle cx="10" cy="10" r="2.4" />
                    </svg>
                  </button>
                  <div className="relative" ref={dedicatedSeasonMenuRef}>
                    <button
                      type="button"
                      disabled={seasonSelectionOptions.length === 0 || !seasonSelectionShowSlug}
                      onClick={() => setShowDedicatedSeasonMenu((current) => !current)}
                      className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {activeSeasonSelection ? `Season ${activeSeasonSelection}` : "Season"}
                    </button>
                    {showDedicatedSeasonMenu && seasonSelectionOptions.length > 0 && (
                      <div className="absolute left-0 z-20 mt-1 min-w-[112px] rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
                        {seasonSelectionOptions.map((season) => (
                          <button
                            key={`season-menu-dedicated-${season.id}`}
                            type="button"
                            onClick={() => handleSeasonSelectionChange(String(season.season_number))}
                            className={`block w-full rounded-md px-2 py-1 text-left text-xs font-semibold ${
                              activeSeasonSelection === season.season_number
                                ? "bg-zinc-900 text-white"
                                : "text-zinc-700 hover:bg-zinc-100"
                            }`}
                          >
                            Season {season.season_number}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                  {dedicatedCommunityTypeLabel}
                </p>
                <h3 className="text-xl font-bold text-zinc-900">{getCommunityTitle(selectedCommunity)}</h3>
                <p className="text-sm text-zinc-500">{selectedCommunity.trr_show_name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {selectedCommunity.analysis_all_flares.length} all-post ·{" "}
                  {selectedCommunity.analysis_flares.length} scan ·{" "}
                  {selectedRelevantPostFlares.length} relevant flares
                </p>
              </>
            ) : (
              <h3 className="text-xl font-bold text-zinc-900">Community</h3>
            )
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                {seasonScopeLabel ?? "Reddit Sources"}
              </p>
              <h3 className="text-xl font-bold text-zinc-900">Reddit Communities</h3>
              <p className="text-sm text-zinc-500">
                Review show, network, and franchise communities for this season.
              </p>
              <div className="mt-3 space-y-1.5">
                <label
                  htmlFor="reddit-season-selection-landing"
                  className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500"
                >
                  Season Selection
                </label>
                <select
                  id="reddit-season-selection-landing"
                  aria-label="Season Selection"
                  value={activeSeasonSelection != null ? String(activeSeasonSelection) : ""}
                  onChange={(event) => handleSeasonSelectionChange(event.target.value)}
                  disabled={seasonSelectionOptions.length === 0 || !seasonSelectionShowSlug}
                  className="w-full max-w-[180px] rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm font-semibold text-zinc-700 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                >
                  {seasonSelectionOptions.length > 0 ? (
                    seasonSelectionOptions.map((season) => (
                      <option key={`season-select-landing-${season.id}`} value={String(season.season_number)}>
                        S{season.season_number}
                      </option>
                    ))
                  ) : (
                    <option value="">Unavailable</option>
                  )}
                </select>
              </div>
            </>
          )}
        </div>
        {allowCreateActions && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setShowCommunityForm((prev) => !prev)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add Community
            </button>
            <button
              type="button"
              disabled={!selectedCommunity || isBusy}
              onClick={() => setShowThreadForm((prev) => !prev)}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Thread
            </button>
            {selectedCommunity && (
              <button
                type="button"
                disabled={isBusy || episodeRefreshing || periodsLoading}
                onClick={() => void handleRefreshEpisodeDiscussions()}
                aria-label="Sync Posts"
                title="Scrape posts, update metrics/comments, and sync discussion candidates"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {episodeRefreshing ? "Syncing… 🕷️" : "Sync Posts 🕷️"}
              </button>
            )}
          </div>
        )}
        {isDedicatedCommunityView && selectedCommunity && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isBusy || episodeRefreshing || periodsLoading}
              onClick={() => void handleRefreshEpisodeDiscussions()}
              aria-label="Sync Posts"
              title="Scrape posts, update metrics/comments, and sync discussion candidates"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {episodeRefreshing ? "Syncing… 🕷️" : "Sync Posts 🕷️"}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleDeleteCommunity(selectedCommunity.id)}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {busyLabel && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{busyLabel}</div>
      )}

      {allowCreateActions && showCommunityForm && (
        <form
          onSubmit={handleCreateCommunity}
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">Add Community</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {mode === "global" && (
              <>
                <div className="md:col-span-1">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                    Show
                  </label>
                  {coveredShows.length > 0 ? (
                    <select
                      value={communityShowId}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        const match = coveredShows.find((item) => item.trr_show_id === nextId);
                        setCommunityShowId(nextId);
                        setCommunityShowName(match?.show_name ?? communityShowName);
                      }}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    >
                      {coveredShows.map((item) => (
                        <option key={item.trr_show_id} value={item.trr_show_id}>
                          {item.show_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={communityShowId}
                      onChange={(event) => setCommunityShowId(event.target.value)}
                      placeholder="TRR show id"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  )}
                </div>
                {coveredShows.length === 0 && (
                  <div className="md:col-span-1">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                      Show Name
                    </label>
                    <input
                      value={communityShowName}
                      onChange={(event) => setCommunityShowName(event.target.value)}
                      placeholder="The Real Housewives of Salt Lake City"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Subreddit
              </label>
              <input
                value={communitySubreddit}
                onChange={(event) => setCommunitySubreddit(event.target.value)}
                placeholder="BravoRealHousewives or r/BravoRealHousewives"
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Display Name
              </label>
              <input
                value={communityDisplayName}
                onChange={(event) => setCommunityDisplayName(event.target.value)}
                placeholder="Bravo RH Main Subreddit"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Notes
              </label>
              <textarea
                value={communityNotes}
                onChange={(event) => setCommunityNotes(event.target.value)}
                rows={2}
                placeholder="Optional notes for this subreddit source."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="md:col-span-2 rounded-lg border border-zinc-200 p-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
                <input
                  type="checkbox"
                  checked={communityIsShowFocused}
                  onChange={(event) => setCommunityIsShowFocused(event.target.checked)}
                />
                Show-focused community
              </label>
              <p className="mt-1 text-xs text-zinc-500">
                Show-focused communities include all discovered posts and do not require flair assignment.
              </p>
            </div>

            {!communityIsShowFocused && (
              <>
                <div className="md:col-span-2 rounded-lg border border-zinc-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                    Network Targets
                  </p>
                  {communityNetworkTargets.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {communityNetworkTargets.map((target) => (
                        <button
                          key={`new-community-network-${target}`}
                          type="button"
                          onClick={() =>
                            setCommunityNetworkTargets((current) =>
                              current.filter((value) => value.toLowerCase() !== target.toLowerCase()),
                            )
                          }
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200"
                        >
                          {target} ×
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={communityNetworkTargetInput}
                      onChange={(event) => setCommunityNetworkTargetInput(event.target.value)}
                      placeholder="Add network target"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCommunityNetworkTargets((current) =>
                          pushListValue(current, communityNetworkTargetInput),
                        );
                        setCommunityNetworkTargetInput("");
                      }}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {networkFocusSuggestions
                      .filter(
                        (target) =>
                          !communityNetworkTargets.some(
                            (value) => value.toLowerCase() === target.toLowerCase(),
                          ),
                      )
                      .map((target) => (
                        <button
                          key={`new-community-network-suggestion-${target}`}
                          type="button"
                          onClick={() => setCommunityNetworkTargets((current) => pushListValue(current, target))}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          + {target}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="md:col-span-2 rounded-lg border border-zinc-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                    Franchise Targets
                  </p>
                  {communityFranchiseTargets.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {communityFranchiseTargets.map((target) => (
                        <button
                          key={`new-community-franchise-${target}`}
                          type="button"
                          onClick={() =>
                            setCommunityFranchiseTargets((current) =>
                              current.filter((value) => value.toLowerCase() !== target.toLowerCase()),
                            )
                          }
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200"
                        >
                          {target} ×
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={communityFranchiseTargetInput}
                      onChange={(event) => setCommunityFranchiseTargetInput(event.target.value)}
                      placeholder="Add franchise target"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCommunityFranchiseTargets((current) =>
                          pushListValue(current, communityFranchiseTargetInput),
                        );
                        setCommunityFranchiseTargetInput("");
                      }}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {franchiseFocusSuggestions
                      .filter(
                        (target) =>
                          !communityFranchiseTargets.some(
                            (value) => value.toLowerCase() === target.toLowerCase(),
                          ),
                      )
                      .map((target) => (
                        <button
                          key={`new-community-franchise-suggestion-${target}`}
                          type="button"
                          onClick={() =>
                            setCommunityFranchiseTargets((current) => pushListValue(current, target))
                          }
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          + {target}
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Community
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setShowCommunityForm(false);
                resetCommunityForm();
              }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {allowCreateActions && showThreadForm && (
        <form
          onSubmit={handleCreateThread}
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">Add Thread</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Reddit Post URL
              </label>
              <input
                value={threadUrl}
                onChange={(event) => setThreadUrl(event.target.value)}
                placeholder="https://www.reddit.com/r/BravoRealHousewives/comments/..."
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Thread Title
              </label>
              <input
                value={threadTitle}
                onChange={(event) => setThreadTitle(event.target.value)}
                placeholder="Episode Discussion Thread"
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            {seasonId && (
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={assignThreadToSeason}
                  onChange={(event) => setAssignThreadToSeason(event.target.checked)}
                />
                Assign to Season {seasonNumber ?? "current"}
              </label>
            )}
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Notes
              </label>
              <textarea
                value={threadNotes}
                onChange={(event) => setThreadNotes(event.target.value)}
                rows={2}
                placeholder="Optional notes about when to pull this thread."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Thread
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setShowThreadForm(false);
                resetThreadForm();
              }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
          Loading reddit communities...
        </div>
      ) : isSeasonLandingView ? (
        <section className="space-y-4">
          {communities.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
              No communities configured for this season yet.
            </div>
          ) : (
            <div className="space-y-4">
              {communities.map((community) => {
                const communityPageHref = buildCommunityViewHref(community);
                const communityTypeBadges = getCommunityTypeBadges(community);
                const communityTitle = getCommunityTitle(community);
                const relevantPostFlares = getRelevantPostFlares(community);
                return (
                  <article key={community.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Community</p>
                        <a
                          href={communityPageHref}
                          className="text-lg font-bold text-zinc-900 underline-offset-4 hover:underline"
                        >
                          {communityTitle}
                        </a>
                        <p className="text-sm text-zinc-500">{community.trr_show_name}</p>
                        {communityTypeBadges.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {communityTypeBadges.map((badge) => (
                              <span
                                key={`${community.id}-${badge}`}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {community.analysis_all_flares.length} all-post · {community.analysis_flares.length} scan ·{" "}
                      {relevantPostFlares.length} relevant flares
                    </p>
                    {relevantPostFlares.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {relevantPostFlares.map((flair) => (
                          <span
                            key={`${community.id}-post-flair-${flair}`}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                          >
                            {flair}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <div className={hideCommunityList ? "space-y-5" : "grid gap-5 xl:grid-cols-12"}>
          {!hideCommunityList && (
            <section className="xl:col-span-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Communities</h4>
            {communities.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                No communities yet. Use <span className="font-semibold">Add Community</span> to get started.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {communityGroups.map(([groupName, items]) => (
                  <div key={groupName} className="space-y-2">
                    {mode === "global" && (
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        {groupName}
                      </p>
                    )}
                    {items.map((community) => (
                      <button
                        key={community.id}
                        type="button"
                        onClick={() => {
                          setSelectedCommunityId(community.id);
                          setSeasonDiscovery(null);
                          setWindowDiscoveryByContainer({});
                        }}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          selectedCommunityId === community.id
                            ? "border-zinc-900 bg-zinc-900/5"
                            : "border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900">
                              {community.display_name || `r/${community.subreddit}`}
                            </p>
                            <p className="truncate text-xs text-zinc-500">{getCommunityTitle(community)}</p>
                          </div>
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                            {community.assigned_thread_count}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            </section>
          )}

          <section className={hideCommunityList ? "space-y-5" : "xl:col-span-8 space-y-5"}>
            {!selectedCommunity ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
                Select a community to view assigned threads and discovery hints.
              </div>
            ) : (
              <>
                {!isDedicatedCommunityView && (
                  <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                          Community
                        </p>
                        {communityViewHref ? (
                          <a
                            href={communityViewHref}
                            className="text-lg font-bold text-zinc-900 underline-offset-4 hover:underline"
                          >
                            {getCommunityTitle(selectedCommunity)}
                          </a>
                        ) : (
                          <h4 className="text-lg font-bold text-zinc-900">
                            {getCommunityTitle(selectedCommunity)}
                          </h4>
                        )}
                        <p className="text-sm text-zinc-500">{selectedCommunity.trr_show_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setShowCommunitySettingsModal(true)}
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Open community settings"
                        >
                          <svg
                            aria-hidden
                            viewBox="0 0 20 20"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          >
                            <path d="M10 3.3 11.1 5.5l2.4.35.6 2.35 2 .9-.9 2 .9 2-2 .9-.6 2.35-2.4.35L10 18.7l-1.1-2.2-2.4-.35-.6-2.35-2-.9.9-2-.9-2 2-.9.6-2.35 2.4-.35L10 3.3Z" />
                            <circle cx="10" cy="10" r="2.4" />
                          </svg>
                          Settings
                        </button>
                        {communityViewHref && (
                          <a
                            href={communityViewHref}
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                          >
                            Community View
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {selectedCommunity.analysis_all_flares.length} all-post ·{" "}
                      {selectedCommunity.analysis_flares.length} scan ·{" "}
                      {selectedRelevantPostFlares.length} relevant flares
                    </p>
                    {selectedCommunity.notes && (
                      <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                        {selectedCommunity.notes}
                      </p>
                    )}
                  </article>
                )}

                {episodeDiscussionsPlacement === "inline" && renderEpisodeDiscussionPanel()}

                {showCommunitySettingsModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setShowCommunitySettingsModal(false)}
                  >
                    <article
                      className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h5 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
                          Community Settings
                        </h5>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            disabled={isBusy}
                            onClick={() => void handleDeleteCommunity(selectedCommunity.id)}
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                            onClick={() => setShowCommunitySettingsModal(false)}
                          >
                            Close
                          </button>
                        </div>
                      </div>

                      <div className="mb-3 rounded-lg border border-zinc-200 p-3">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          Post Flares
                        </p>
                        {refreshingFlaresCommunityId === selectedCommunity.id ? (
                          <p className="text-xs text-zinc-500">Loading post flares...</p>
                        ) : selectedRelevantPostFlares.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedRelevantPostFlares.map((flair) => (
                              <span
                                key={`selected-flair-${selectedCommunity.id}-${flair}`}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                              >
                                {flair}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500">No relevant post flares selected yet.</p>
                        )}
                      </div>

                      <div className="space-y-3">
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          Community Focus
                        </p>
                        {selectedCommunity.is_show_focused ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Show-focused
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                            Network/Franchise-focused
                          </span>
                        )}
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                        <input
                          type="checkbox"
                          checked={selectedCommunity.is_show_focused}
                          disabled={isBusy}
                          onChange={(event) => {
                            void persistCommunityFocus(selectedCommunity.id, {
                              isShowFocused: event.target.checked,
                              networkFocusTargets: event.target.checked
                                ? []
                                : selectedCommunity.network_focus_targets,
                              franchiseFocusTargets: event.target.checked
                                ? []
                                : selectedCommunity.franchise_focus_targets,
                            });
                          }}
                        />
                        Show-focused community
                      </label>
                      <p className="mt-1 text-xs text-zinc-500">
                        Show-focused communities include all discovered posts and skip flair assignment.
                      </p>
                    </div>

                    {!selectedCommunity.is_show_focused && (
                      <>
                        <div className="rounded-lg border border-zinc-200 p-3">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            Network Targets
                          </p>
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {selectedCommunity.network_focus_targets.length === 0 && (
                              <span className="text-xs text-zinc-500">No network targets.</span>
                            )}
                            {selectedCommunity.network_focus_targets.map((target) => (
                              <button
                                key={`selected-network-target-${selectedCommunity.id}-${target}`}
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  const nextTargets = selectedCommunity.network_focus_targets.filter(
                                    (value) => value.toLowerCase() !== target.toLowerCase(),
                                  );
                                  void persistCommunityFocus(selectedCommunity.id, {
                                    isShowFocused: false,
                                    networkFocusTargets: nextTargets,
                                    franchiseFocusTargets: selectedCommunity.franchise_focus_targets,
                                  });
                                }}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-60"
                              >
                                {target} ×
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={selectedNetworkTargetInput}
                              onChange={(event) => setSelectedNetworkTargetInput(event.target.value)}
                              placeholder="Add network target"
                              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            />
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                const nextTargets = pushListValue(
                                  selectedCommunity.network_focus_targets,
                                  selectedNetworkTargetInput,
                                );
                                setSelectedNetworkTargetInput("");
                                void persistCommunityFocus(selectedCommunity.id, {
                                  isShowFocused: false,
                                  networkFocusTargets: nextTargets,
                                  franchiseFocusTargets: selectedCommunity.franchise_focus_targets,
                                });
                              }}
                              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                            >
                              Add
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {networkFocusSuggestions
                              .filter(
                                (target) =>
                                  !selectedCommunity.network_focus_targets.some(
                                    (value) => value.toLowerCase() === target.toLowerCase(),
                                  ),
                              )
                              .map((target) => (
                                <button
                                  key={`network-suggestion-${selectedCommunity.id}-${target}`}
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    void persistCommunityFocus(selectedCommunity.id, {
                                      isShowFocused: false,
                                      networkFocusTargets: [
                                        ...selectedCommunity.network_focus_targets,
                                        target,
                                      ],
                                      franchiseFocusTargets: selectedCommunity.franchise_focus_targets,
                                    });
                                  }}
                                  className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                                >
                                  + {target}
                                </button>
                              ))}
                          </div>
                        </div>

                        <div className="rounded-lg border border-zinc-200 p-3">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            Franchise Targets
                          </p>
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {selectedCommunity.franchise_focus_targets.length === 0 && (
                              <span className="text-xs text-zinc-500">No franchise targets.</span>
                            )}
                            {selectedCommunity.franchise_focus_targets.map((target) => (
                              <button
                                key={`selected-franchise-target-${selectedCommunity.id}-${target}`}
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  const nextTargets = selectedCommunity.franchise_focus_targets.filter(
                                    (value) => value.toLowerCase() !== target.toLowerCase(),
                                  );
                                  void persistCommunityFocus(selectedCommunity.id, {
                                    isShowFocused: false,
                                    networkFocusTargets: selectedCommunity.network_focus_targets,
                                    franchiseFocusTargets: nextTargets,
                                  });
                                }}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-60"
                              >
                                {target} ×
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={selectedFranchiseTargetInput}
                              onChange={(event) => setSelectedFranchiseTargetInput(event.target.value)}
                              placeholder="Add franchise target"
                              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            />
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                const nextTargets = pushListValue(
                                  selectedCommunity.franchise_focus_targets,
                                  selectedFranchiseTargetInput,
                                );
                                setSelectedFranchiseTargetInput("");
                                void persistCommunityFocus(selectedCommunity.id, {
                                  isShowFocused: false,
                                  networkFocusTargets: selectedCommunity.network_focus_targets,
                                  franchiseFocusTargets: nextTargets,
                                });
                              }}
                              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                            >
                              Add
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {franchiseFocusSuggestions
                              .filter(
                                (target) =>
                                  !selectedCommunity.franchise_focus_targets.some(
                                    (value) => value.toLowerCase() === target.toLowerCase(),
                                  ),
                              )
                              .map((target) => (
                                <button
                                  key={`franchise-suggestion-${selectedCommunity.id}-${target}`}
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    void persistCommunityFocus(selectedCommunity.id, {
                                      isShowFocused: false,
                                      networkFocusTargets: selectedCommunity.network_focus_targets,
                                      franchiseFocusTargets: [
                                        ...selectedCommunity.franchise_focus_targets,
                                        target,
                                      ],
                                    });
                                  }}
                                  className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                                >
                                  + {target}
                                </button>
                              ))}
                          </div>
                        </div>
                      </>
                    )}

                    {selectedCommunity.is_show_focused ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                        Show-focused mode enabled. All discovered posts are eligible (including no-flair posts).
                      </div>
                    ) : (
                      <div className="rounded-lg border border-zinc-200 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            Analysis Flares
                          </p>
                          <span className="text-[11px] font-semibold text-zinc-500">
                            {selectedCommunity.analysis_all_flares.length} all-post ·{" "}
                            {selectedCommunity.analysis_flares.length} scan
                          </span>
                        </div>
                        {selectedCommunity.post_flares.length === 0 ? (
                          <p className="text-xs text-zinc-500">
                            Refresh post flares first to assign analysis flares.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                All Posts With Flair
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedCommunity.post_flares.map((flair) => {
                                  const flairKey = normalizeFlairKey(flair);
                                  const isSelected = selectedCommunity.analysis_all_flares.some(
                                    (value) => normalizeFlairKey(value) === flairKey,
                                  );
                                  return (
                                    <button
                                      key={`analysis-all-flair-${selectedCommunity.id}-${flair}`}
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => {
                                        const nextAll = isSelected
                                          ? selectedCommunity.analysis_all_flares.filter(
                                              (value) => normalizeFlairKey(value) !== flairKey,
                                            )
                                          : [...selectedCommunity.analysis_all_flares, flair];
                                        const nextScan = selectedCommunity.analysis_flares.filter(
                                          (value) => normalizeFlairKey(value) !== flairKey,
                                        );
                                        void persistAnalysisFlareModes(selectedCommunity.id, {
                                          analysisAllFlares: nextAll,
                                          analysisFlares: nextScan,
                                        });
                                      }}
                                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                                        isSelected
                                          ? "bg-indigo-100 text-indigo-700"
                                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                                      } disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                      {isSelected ? "All posts · " : ""}
                                      {flair}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                Scan Flair For Relevant Terms
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedCommunity.post_flares.map((flair) => {
                                  const flairKey = normalizeFlairKey(flair);
                                  const isSelected = selectedCommunity.analysis_flares.some(
                                    (value) => normalizeFlairKey(value) === flairKey,
                                  );
                                  return (
                                    <button
                                      key={`analysis-scan-flair-${selectedCommunity.id}-${flair}`}
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => {
                                        const nextScan = isSelected
                                          ? selectedCommunity.analysis_flares.filter(
                                              (value) => normalizeFlairKey(value) !== flairKey,
                                            )
                                          : [...selectedCommunity.analysis_flares, flair];
                                        const nextAll = selectedCommunity.analysis_all_flares.filter(
                                          (value) => normalizeFlairKey(value) !== flairKey,
                                        );
                                        void persistAnalysisFlareModes(selectedCommunity.id, {
                                          analysisAllFlares: nextAll,
                                          analysisFlares: nextScan,
                                        });
                                      }}
                                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                                        isSelected
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                                      } disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                      {isSelected ? "Scan terms · " : ""}
                                      {flair}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {renderEpisodeTitlePhraseSettings()}
                    {episodeDiscussionsPlacement === "settings" && renderEpisodeDiscussionPanel()}
                  </div>
                    </article>
                  </div>
                )}

                <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setAssignedThreadsExpanded((current) => !current)}
                    className="mb-3 flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left hover:bg-zinc-100"
                    aria-expanded={assignedThreadsExpanded}
                  >
                    <h5 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
                      Assigned Threads
                    </h5>
                    <span className="text-xs font-semibold text-zinc-600">
                      {isDedicatedCommunityView
                        ? `${episodeMatrixRowsForDisplay.length} episodes`
                        : `${selectedCommunity.assigned_threads.length} saved`}
                    </span>
                  </button>
                  {assignedThreadsExpanded &&
                    (isDedicatedCommunityView ? (
                      episodeMatrixRowsForDisplay.length === 0 ? (
                        <p className="text-sm text-zinc-500">
                          No episode discussion rows found for this community yet.
                        </p>
                      ) : (
                        renderEpisodeMatrixCards(episodeMatrixRowsForDisplay, {
                          episodeAirDateByNumber,
                          episodeWindowByContainer: episodeWindowBoundsByContainer,
                          totalsLoading: episodeRefreshing,
                          totalTrackedFlairCountByContainer: trackedFlairTotalCountByContainerWindow,
                          unassignedFlairCountByContainer: unassignedFlairCountByContainerWindow,
                          unassignedFlairCountBySlot: matrixUnassignedFlairCountBySlot,
                          totalTrackedFlairCountBySlot: matrixTrackedFlairTotalCountBySlot,
                          seasonalBoundaryPeriods,
                          unassignedFlairCountBySeasonBoundaryPeriod: matrixUnassignedFlairCountBySeasonBoundaryPeriod,
                          totalTrackedFlairCountBySeasonBoundaryPeriod:
                            matrixTrackedFlairTotalCountBySeasonBoundaryPeriod,
                          linkedPostsByContainer: linkedDiscussionPostsByContainer,
                          refreshProgressByContainer: containerRefreshProgressByKey,
                          onRefreshContainerPosts: (containerKey) => void handleRefreshPostsForContainer(containerKey),
                          refreshingContainerKey,
                          refreshPostsDisabled: isBusy || episodeRefreshing,
                          periodsLoading,
                          onOpenContainerPosts: (containerKey) => void openContainerPostsPage(containerKey),
                          onViewAllContainerPosts: (containerKey) => void openContainerPostsPage(containerKey),
                        })
                      )
                    ) : selectedCommunity.assigned_threads.length === 0 ? (
                      <p className="text-sm text-zinc-500">No saved threads for this community.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedCommunity.assigned_threads.map((thread) => (
                          <div
                            key={thread.id}
                            className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <a
                                  href={thread.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:underline"
                                >
                                  {thread.title}
                                </a>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                  <span>u/{thread.author ?? "unknown"}</span>
                                  <span>{fmtNum(thread.score)} score</span>
                                  <span>{fmtNum(thread.num_comments)} comments</span>
                                  <span>{fmtDateTime(thread.posted_at)}</span>
                                </div>
                                <div className="mt-1">
                                  {thread.source_kind === "episode_discussion" ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                      EPISODE DISCUSSION
                                    </span>
                                  ) : thread.trr_season_id ? (
                                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                      Season-scoped
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                                      Show-level
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteThread(thread.id)}
                                className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                </article>

                <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h5 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
                      Discovered Threads
                    </h5>
                    {selectedCommunity.is_show_focused ? (
                      <span className="text-xs font-semibold text-emerald-700">
                        Show-focused: all discovered posts shown
                      </span>
                    ) : (
                      <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                        <input
                          type="checkbox"
                          checked={showOnlyMatches}
                          onChange={(event) => setShowOnlyMatches(event.target.checked)}
                        />
                        Show matched only
                      </label>
                    )}
                  </div>

                  {discovery?.hints && (
                    <div className="mb-4 space-y-2">
                      {discovery.hints.suggested_include_terms.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
                            Suggested Include Terms
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {discovery.hints.suggested_include_terms.map((term) => (
                              <span
                                key={`inc-${term}`}
                                className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {discovery.hints.suggested_exclude_terms.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-600">
                            Suggested Exclude Terms
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {discovery.hints.suggested_exclude_terms.map((term) => (
                              <span
                                key={`exc-${term}`}
                                className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!discovery ? (
                    <p className="text-sm text-zinc-500">
                      Run discovery to load recent `new`/`hot`/`top` threads and show-match hints.
                    </p>
                  ) : visibleDiscoveryThreads.length === 0 ? (
                    <p className="text-sm text-zinc-500">No threads matched the current filter.</p>
                  ) : isDedicatedCommunityView ? (
                    flairGroupedDiscoveryThreads.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        {isBravoRealHousewivesCommunity
                          ? "No additional tracked flair posts found outside episode discussions."
                          : "No non-episode posts with selected flairs matched the current filter."}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {flairGroupedDiscoveryThreads.map((group) => (
                          <details
                            key={`flair-group-${group.flairLabel.toLowerCase()}`}
                            open
                            className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3"
                          >
                            <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-800">
                              {group.flairLabel} · {fmtNum(group.threads.length)} posts
                            </summary>
                            <div className="mt-3 space-y-3">
                              {group.threads.map((thread) => renderDiscoveryThreadCard(thread))}
                            </div>
                          </details>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="space-y-3">
                      {visibleDiscoveryThreads.map((thread) => renderDiscoveryThreadCard(thread))}
                    </div>
                  )}
                </article>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
