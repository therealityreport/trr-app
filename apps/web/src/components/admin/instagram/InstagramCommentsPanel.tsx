"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from "lucide-react";
import InstagramCommentsPostModal from "@/components/admin/instagram/InstagramCommentsPostModal";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminWithAuth as fetchAdminWithAuthBase } from "@/lib/admin/client-auth";
import { useSharedPollingResource } from "@/lib/admin/shared-live-resource";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import {
  readInstagramCommentsErrorMessage,
  type InstagramCommentsProxyErrorPayload,
} from "@/components/admin/instagram/comments-scrape-error";
import type {
  CatalogBackfillLaunchResponse,
  CatalogBackfillRequest,
  SocialAccountCommentsCancelResponse,
  SocialAccountCommentsRunProgress,
  SocialAccountCommentsShardProgress,
  SocialAccountCommentsScrapeRequest,
  SocialAccountCommentsScrapeResponse,
  SocialAccountCommentBreakdown,
  SocialAccountProfilePost,
  SocialAccountProfilePostsResponse,
  SocialAccountProfileSummary,
  SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";
import {
  SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS,
  SOCIAL_ACCOUNT_PLATFORM_LABELS,
} from "@/lib/admin/social-account-profile";

type Props = {
  platform: SocialPlatformSlug;
  handle: string;
  summary: SocialAccountProfileSummary | null;
  onSummaryRefresh?: () => Promise<void> | void;
  hideActiveRunProgress?: boolean;
};

type ProxyErrorPayload = InstagramCommentsProxyErrorPayload & {
  code?: string;
  retryable?: boolean;
  retry_after_seconds?: number;
};

type CommentsPostFilter = "commentable" | "incomplete" | "not_commentable";
type CommentsSortField =
  | "post"
  | "created"
  | "caption"
  | "post_total"
  | "saved_comments"
  | "missing_comments"
  | "likes";
type CommentsSortDirection = "asc" | "desc";
type CommentsSortState = {
  field: CommentsSortField;
  direction: CommentsSortDirection;
};

const ACTIVE_RUN_STATUSES = new Set(["queued", "pending", "retrying", "running"]);
const TERMINAL_RUN_STATUSES = new Set(["completed", "failed", "cancelled"]);
// P2-8: 2s matches the existing admin polling cadence used elsewhere on the profile page.
const COMMENTS_PROGRESS_POLL_INTERVAL_MS = 2_000;
const POSTS_LOAD_RETRY_DELAY_MS = 200;
const PRIMARY_BUTTON_CLASS =
  "inline-flex rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY_BUTTON_CLASS =
  "inline-flex rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50";
const COMMENTS_REFRESH_SELECTED_TASKS: CatalogBackfillRequest["selected_tasks"] = ["post_details", "comments", "media"];
const RETRYABLE_POSTS_PROXY_CODES = new Set([
  "UPSTREAM_TIMEOUT",
  "BACKEND_REQUEST_TIMEOUT",
  "BACKEND_SATURATED",
  "BACKEND_UNREACHABLE",
]);
const COMMENTS_SORT_COLUMNS: Array<{ key: CommentsSortField; label: string }> = [
  { key: "post", label: "Post" },
  { key: "created", label: "Created" },
  { key: "caption", label: "Caption" },
  { key: "post_total", label: "Reported Comments" },
  { key: "saved_comments", label: "Instagram Saved" },
  { key: "missing_comments", label: "Missing Comments" },
  { key: "likes", label: "Likes" },
];
const DEFAULT_COMMENTS_SORT: CommentsSortState = { field: "missing_comments", direction: "desc" };
const TEXT_COMMENTS_SORT_FIELDS = new Set<CommentsSortField>(["post", "caption"]);
type NormalizedPostCommentBreakdown = {
  reportedComments: number;
  savedInstagramComments: number;
  parentComments: number | null;
  childReplies: number | null;
  facebookComments: number;
  missingComments: number;
  hasThreadBreakdown: boolean;
  hasFacebookData: boolean;
};

const COMMENT_PHASE_LABELS: Record<string, string> = {
  ranked: "ranked",
  headload: "headload",
  fb_crosspost: "FB crosspost",
  child: "child",
};

const formatInteger = (value: number | null | undefined): string => {
  return new Intl.NumberFormat("en-US").format(Number.isFinite(Number(value)) ? Number(value) : 0);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatStatusLabel = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Idle";
  return normalized.replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
};

const getCaptionPreview = (post: SocialAccountProfilePost): string => {
  const text = String(post.content || post.excerpt || post.title || "").trim();
  if (!text) return "No caption saved for this post.";
  if (text.length <= 220) return text;
  return `${text.slice(0, 217).trimEnd()}...`;
};

const normalizeRunStatus = (value?: string | null): string => String(value || "").trim().toLowerCase();
const readFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readNonNegativeInteger = (value: unknown): number | null => {
  const parsed = readFiniteNumber(value);
  return parsed === null ? null : Math.max(0, Math.trunc(parsed));
};

const firstNonNegativeInteger = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = readNonNegativeInteger(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const formatCaptureRate = (value: unknown): string | null => {
  const parsed = readFiniteNumber(value);
  if (parsed === null) return null;
  const percent = parsed <= 1 ? parsed * 100 : parsed;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: percent < 10 ? 1 : 0 }).format(percent)}%`;
};

const formatCaptureHealthKey = (value: string, labels: Record<string, string> = {}): string => {
  const normalized = value.trim();
  return labels[normalized] ?? normalized.replace(/_/g, " ");
};

const formatCaptureCountRecord = (
  value: Record<string, number | null | undefined> | null | undefined,
  labels: Record<string, string> = {},
): string | null => {
  const items = Object.entries(value ?? {})
    .map(([key, count]) => ({
      label: formatCaptureHealthKey(key, labels),
      count: readNonNegativeInteger(count),
    }))
    .filter((item): item is { label: string; count: number } => Boolean(item.label) && item.count !== null && item.count > 0)
    .map((item) => `${formatInteger(item.count)} ${item.label}`);
  return items.length ? items.join(", ") : null;
};

const formatPostCaptureHealthSummary = (breakdown?: SocialAccountCommentBreakdown | null): string | null => {
  const health = breakdown?.capture_health;
  if (!health) return null;
  const phaseLabel = formatCaptureCountRecord(health.phase_counts, COMMENT_PHASE_LABELS);
  const captureRateLabel = formatCaptureRate(health.capture_rate);
  const coveredComments = firstNonNegativeInteger(health.covered_comments);
  const bits = [
    phaseLabel ? `Phases: ${phaseLabel}` : null,
    captureRateLabel ? `Capture ${captureRateLabel}` : null,
    coveredComments !== null && coveredComments > 0 ? `${formatInteger(coveredComments)} covered` : null,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "Capture health present";
};

const getPostReportedComments = (post: SocialAccountProfilePost): number => {
  return (
    firstNonNegativeInteger(
      post.comment_breakdown?.reported_comments,
      post.comment_completeness?.reported_comments,
      post.metrics?.comments_count,
    ) ?? 0
  );
};

const getPostSavedInstagramComments = (post: SocialAccountProfilePost): number => {
  return (
    firstNonNegativeInteger(
      post.comment_breakdown?.saved_instagram_comments,
      post.comment_completeness?.saved_instagram_comments,
      post.saved_comments,
    ) ?? 0
  );
};

const getPostCommentBreakdown = (post: SocialAccountProfilePost): NormalizedPostCommentBreakdown => {
  const savedInstagramComments = getPostSavedInstagramComments(post);
  const reportedComments = getPostReportedComments(post);
  const parentComments = firstNonNegativeInteger(post.comment_breakdown?.saved_parent_comments);
  const childReplies = firstNonNegativeInteger(post.comment_breakdown?.saved_child_replies);
  const facebookComments =
    firstNonNegativeInteger(
      post.comment_breakdown?.facebook_comments,
      post.facebook_crosspost?.comments_count,
      post.comment_completeness?.external_facebook_comments,
    ) ?? 0;
  const missingComments =
    firstNonNegativeInteger(
      post.comment_breakdown?.missing_comments,
      post.comment_completeness?.missing_instagram_comments,
    ) ?? Math.max(reportedComments - savedInstagramComments - facebookComments, 0);
  return {
    reportedComments,
    savedInstagramComments,
    parentComments,
    childReplies,
    facebookComments,
    missingComments,
    hasThreadBreakdown: parentComments !== null || childReplies !== null,
    hasFacebookData:
      post.comment_breakdown?.facebook_comments != null ||
      post.facebook_crosspost?.comments_count != null ||
      post.comment_completeness?.external_facebook_comments != null,
  };
};

const getDefaultCommentsSortDirection = (field: CommentsSortField): CommentsSortDirection => {
  return TEXT_COMMENTS_SORT_FIELDS.has(field) ? "asc" : "desc";
};

const formatCommentsShardJobSummary = (progress: SocialAccountCommentsRunProgress): string | null => {
  const shardCount = readFiniteNumber(progress.comments_shard_count);
  const activeJobs = readFiniteNumber(progress.active_comment_jobs);
  const queuedJobs = readFiniteNumber(progress.queued_comment_jobs);
  const completedJobs = readFiniteNumber(progress.completed_comment_jobs);
  const failedJobs = readFiniteNumber(progress.failed_comment_jobs);
  const jobBits = [
    activeJobs !== null ? `${formatInteger(activeJobs)} active` : null,
    queuedJobs !== null ? `${formatInteger(queuedJobs)} queued` : null,
    completedJobs !== null ? `${formatInteger(completedJobs)} complete` : null,
    failedJobs !== null ? `${formatInteger(failedJobs)} failed` : null,
  ].filter(Boolean);
  if (jobBits.length === 0) {
    return shardCount !== null && shardCount > 1 ? `${formatInteger(shardCount)} shards` : null;
  }
  if (shardCount !== null && shardCount > 1) {
    return `${formatInteger(shardCount)} shards: ${jobBits.join(", ")}`;
  }
  return `Jobs: ${jobBits.join(", ")}`;
};

const formatCommentsProgressMessage = (progress: SocialAccountCommentsRunProgress, runId: string, status: string): string => {
  const completedPosts =
    readFiniteNumber(progress.post_progress?.completed_posts) ??
    readFiniteNumber(progress.post_progress?.matched_posts) ??
    0;
  const totalPosts =
    readFiniteNumber(progress.post_progress?.total_posts) ??
    readFiniteNumber(progress.target_source_ids_count);
  const completePosts =
    readFiniteNumber(progress.post_progress?.complete_posts) ??
    readFiniteNumber(progress.summary?.complete_posts_total);
  const incompletePosts =
    readFiniteNumber(progress.post_progress?.incomplete_posts) ??
    readFiniteNumber(progress.summary?.incomplete_posts_total);
  const shardJobSummary = formatCommentsShardJobSummary(progress);
  const postsPerMinute = readFiniteNumber(progress.throughput?.posts_per_minute);
  const commentsPerMinute = readFiniteNumber(progress.throughput?.comments_per_minute);
  const throughputBits = [
    postsPerMinute !== null ? `${postsPerMinute.toFixed(1)} posts/min` : null,
    commentsPerMinute !== null ? `${commentsPerMinute.toFixed(1)} comments/min` : null,
  ].filter(Boolean);
  const progressBits = [
    shardJobSummary,
    totalPosts !== null && totalPosts > 0 ? `${completedPosts} / ${totalPosts} posts checked` : null,
    completePosts !== null || incompletePosts !== null
      ? [
          completePosts !== null ? `${formatInteger(completePosts)} complete` : null,
          incompletePosts !== null ? `${formatInteger(incompletePosts)} incomplete` : null,
        ]
          .filter(Boolean)
          .join(", ")
      : null,
    throughputBits.length ? throughputBits.join(", ") : null,
  ].filter(Boolean);
  return `Comments sync ${status}. Run ${runId.slice(0, 8)}${progressBits.length ? ` · ${progressBits.join(" · ")}` : ""}.`;
};

const formatCommentsTerminalError = (progress: SocialAccountCommentsRunProgress, status: string): string => {
  const baseMessage = progress.error_message || `Comments sync ${status}.`;
  if (progress.cancellation_summary?.resume_recommendation !== "stale_or_missing") {
    return baseMessage;
  }
  const remainingTargets = readFiniteNumber(progress.cancellation_summary.remaining_target_source_ids_count) ?? 0;
  const resumeHint =
    remainingTargets > 0
      ? `${formatInteger(remainingTargets)} targets remain; run Sync Comments to resume.`
      : "Run Sync Comments to resume.";
  return `${baseMessage} ${resumeHint}`;
};

const getCommentsShardProgressRows = (
  progress?: SocialAccountCommentsRunProgress | null,
): SocialAccountCommentsShardProgress[] => {
  const rows = progress?.comment_shards ?? progress?.shards ?? progress?.shard_progress ?? [];
  return Array.isArray(rows) ? rows.slice(0, 8) : [];
};

const formatShardProgressLabel = (row: SocialAccountCommentsShardProgress, index: number): string => {
  const shardIndex = readFiniteNumber(row.shard_index) ?? index + 1;
  const shardCount = readFiniteNumber(row.shard_count);
  const jobId = typeof row.job_id === "string" && row.job_id.trim() ? row.job_id.trim().slice(0, 8) : null;
  const jobLabel = jobId && row.job_id && row.job_id.length <= 12 ? row.job_id : jobId;
  return `Shard ${formatInteger(shardIndex)}${shardCount ? ` of ${formatInteger(shardCount)}` : ""}${
    jobLabel ? ` · job ${jobLabel}` : ""
  }`;
};

const formatReasonCounts = (
  counts?: Record<string, number | null | undefined> | null,
  limit = 3,
): string | null => {
  if (!counts) return null;
  const entries = Object.entries(counts)
    .map(([reason, count]) => [reason, readFiniteNumber(count)] as const)
    .filter((entry): entry is readonly [string, number] => Boolean(entry[0]) && entry[1] !== null && entry[1] > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  if (entries.length === 0) return null;
  return entries.map(([reason, count]) => `${reason} ${formatInteger(count)}`).join(", ");
};

const formatShardProgressMetrics = (row: SocialAccountCommentsShardProgress): string => {
  const rawStatus = String(row.status ?? row.job_status ?? "").trim().toLowerCase();
  const status = formatStatusLabel(row.status ?? row.job_status);
  const canHaveUncheckedTargets = ["queued", "pending", "retrying", "running"].includes(rawStatus);
  const targetCount =
    readFiniteNumber(row.target_count) ??
    readFiniteNumber(row.target_source_ids_count) ??
    readFiniteNumber(row.comments_shard_target_count);
  const completedPosts =
    readFiniteNumber(row.processed_post_count) ??
    readFiniteNumber(row.completed_posts) ??
    readFiniteNumber(row.matched_posts);
  const completePosts = readFiniteNumber(row.complete_posts);
  const incompletePosts = readFiniteNumber(row.incomplete_posts);
  const savedPosts = readFiniteNumber(row.saved_posts);
  const remainingTargets = readFiniteNumber(row.remaining_target_count);
  const retryTargets = readFiniteNumber(row.retry_target_count);
  const itemsFound = readFiniteNumber(row.items_found_total);
  const commentsProcessed =
    readFiniteNumber(row.comments_processed) ??
    (itemsFound !== null && completedPosts !== null ? Math.max(itemsFound - completedPosts, 0) : itemsFound);
  const commentsWritten = readFiniteNumber(row.comments_upserted);
  const commentsInserted = readFiniteNumber(row.comments_inserted);
  const commentsRefreshed = readFiniteNumber(row.comments_refreshed);
  const repliesUpserted = readFiniteNumber(row.replies_upserted);
  const queueWaitSeconds = readFiniteNumber(row.queue_wait_seconds);
  const postsPerMinute = readFiniteNumber(row.posts_per_minute);
  const commentsPerMinute = readFiniteNumber(row.comments_per_minute);
  const fetchReasons = formatReasonCounts(row.fetch_reason_counts);
  const stopReasons = formatReasonCounts(row.stop_reason_counts);
  return [
    status,
    targetCount !== null ? `${formatInteger(targetCount)} targets` : null,
    completedPosts !== null ? `${formatInteger(completedPosts)} checked` : null,
    completePosts !== null ? `${formatInteger(completePosts)} complete` : null,
    incompletePosts !== null ? `${formatInteger(incompletePosts)} incomplete` : null,
    canHaveUncheckedTargets && remainingTargets !== null && remainingTargets > 0
      ? `${formatInteger(remainingTargets)} unchecked`
      : null,
    retryTargets !== null && retryTargets > 0 ? `${formatInteger(retryTargets)} retry targets` : null,
    savedPosts !== null ? `${formatInteger(savedPosts)} saved posts` : null,
    commentsProcessed !== null ? `${formatInteger(commentsProcessed)} fetched` : null,
    commentsInserted !== null ? `${formatInteger(commentsInserted)} new comments saved` : null,
    commentsRefreshed !== null ? `${formatInteger(commentsRefreshed)} existing comments seen` : null,
    commentsWritten !== null ? `${formatInteger(commentsWritten)} comments upserted` : null,
    repliesUpserted !== null ? `${formatInteger(repliesUpserted)} replies` : null,
    row.latest_fetch_reason ? `fetch ${row.latest_fetch_reason}` : null,
    fetchReasons ? `fetch reasons ${fetchReasons}` : null,
    row.latest_stop_reason ? `stop ${row.latest_stop_reason}` : null,
    stopReasons ? `stop reasons ${stopReasons}` : null,
    queueWaitSeconds !== null ? `${formatInteger(queueWaitSeconds)}s queue wait` : null,
    postsPerMinute !== null ? `${postsPerMinute.toFixed(1)} posts/min` : null,
    commentsPerMinute !== null ? `${commentsPerMinute.toFixed(1)} comments/min` : null,
  ]
    .filter(Boolean)
    .join(" · ");
};

const formatCommentsProgressWarning = (progress?: SocialAccountCommentsRunProgress | null): string | null => {
  if (!progress) return null;
  const explicitWarning =
    (typeof progress.warning_message === "string" && progress.warning_message.trim()) ||
    (progress.warnings ?? []).filter((warning) => typeof warning === "string" && warning.trim()).slice(0, 2).join(" ");
  if (explicitWarning) return explicitWarning;
  const targetCount =
    readFiniteNumber(progress.target_source_ids_count) ??
    readFiniteNumber(progress.post_progress?.total_posts) ??
    (progress.target_source_ids?.length ? progress.target_source_ids.length : null);
  const shardCount = readFiniteNumber(progress.comments_shard_count);
  const isPreSharding =
    Boolean(progress.pre_sharding_run || progress.stale_pre_sharding_run) ||
    (progress.comments_sharding_enabled === false &&
      targetCount !== null &&
      targetCount > 25 &&
      (shardCount === null || shardCount <= 1));
  if (!isPreSharding) return null;
  return targetCount !== null
    ? `Pre-sharding run: one comments job is covering ${formatInteger(targetCount)} targets. New launches should use sharded workers.`
    : "Pre-sharding run: this older comments job may not include shard-level progress.";
};

const readProgressString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const formatCommentsLaunchQueuedMessage = (
  data: Pick<SocialAccountCommentsScrapeResponse, "auth_repair_attempted" | "auth_repair_status">,
  fallback: string,
): string => {
  if (data.auth_repair_attempted && data.auth_repair_status === "succeeded") {
    return `Instagram auth repaired. ${fallback}`;
  }
  return fallback;
};

const readProgressBoolean = (value: unknown): boolean | null => {
  return typeof value === "boolean" ? value : null;
};

const readProgressMetadata = (progress?: SocialAccountCommentsRunProgress | null): Record<string, unknown> => {
  return progress?.job_metadata && typeof progress.job_metadata === "object" ? progress.job_metadata : {};
};

const getCommentsRunScopeNotice = (progress?: SocialAccountCommentsRunProgress | null): string | null => {
  if (!progress) return null;
  const metadata = readProgressMetadata(progress);
  const mode = readProgressString(progress.mode) ?? readProgressString(metadata.mode);
  const targetFilter = readProgressString(progress.target_filter) ?? readProgressString(metadata.target_filter);
  const incompleteFill =
    readProgressBoolean(progress.incomplete_fill) ?? readProgressBoolean(metadata.incomplete_fill) ?? false;
  const targetCount =
    readFiniteNumber(progress.target_source_ids_count) ??
    readFiniteNumber(metadata.target_source_ids_count) ??
    readFiniteNumber(progress.post_progress?.total_posts);
  const sourceIds =
    progress.target_source_ids ??
    (Array.isArray(metadata.target_source_ids)
      ? metadata.target_source_ids.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : []);
  const firstSourceId = sourceIds[0];

  if (mode === "single_post") {
    const targetLabel = firstSourceId ? ` for ${firstSourceId}` : "";
    return `Single-post repair${targetLabel}: this run only updates one post and will not close the account-wide comments gap. Run Incomplete Fill after it finishes to target every incomplete post.`;
  }
  if (targetFilter === "incomplete" || incompleteFill) {
    return targetCount && targetCount > 0
      ? `Incomplete Fill active: this run is targeting ${formatInteger(targetCount)} incomplete posts.`
      : "Incomplete Fill active: this run is targeting incomplete posts.";
  }
  if (mode === "profile" && targetCount && targetCount > 0) {
    return `Profile comments sync active: this run is targeting ${formatInteger(targetCount)} posts.`;
  }
  return null;
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isRetryablePostsLoadFailure = (
  payload: ProxyErrorPayload | null | undefined,
  message: string,
  status?: number,
): boolean => {
  if (payload?.retryable) return true;
  if (payload?.code && RETRYABLE_POSTS_PROXY_CODES.has(payload.code)) return true;
  if (status === 408 || status === 429 || status === 502 || status === 504) return true;
  const normalized = message.toLowerCase();
  return normalized.includes("timed out") || normalized.includes("backend is saturated");
};

const normalizeRunId = (value: unknown): string | null => {
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const readCommentsRunId = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return (
    normalizeRunId(record.run_id) ??
    normalizeRunId(record.active_run_id) ??
    readCommentsRunId(record.detail)
  );
};

export default function InstagramCommentsPanel({
  platform,
  handle,
  summary,
  onSummaryRefresh,
  hideActiveRunProgress = false,
}: Props) {
  const { user, checking, hasAccess } = useAdminGuard();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetchAdminWithAuth = useCallback(
    (
      input: RequestInfo | URL,
      init?: RequestInit,
      options?: Parameters<typeof fetchAdminWithAuthBase>[2],
    ) =>
      fetchAdminWithAuthBase(input, init, {
        ...options,
        preferredUser: options?.preferredUser ?? user,
        allowDevAdminBypass: options?.allowDevAdminBypass ?? true,
      }),
    [user],
  );
  const [posts, setPosts] = useState<SocialAccountProfilePostsResponse | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [commentsPostFilter, setCommentsPostFilter] = useState<CommentsPostFilter>("commentable");
  const [commentsSearch, setCommentsSearch] = useState("");
  const [commentsSort, setCommentsSort] = useState<CommentsSortState>(DEFAULT_COMMENTS_SORT);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeRunId, setScrapeRunId] = useState<string | null>(null);
  const [commentsLaunchPending, setCommentsLaunchPending] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [catalogRefreshPending, setCatalogRefreshPending] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialAccountProfilePost | null>(null);
  const [modalRefreshKey, setModalRefreshKey] = useState(0);
  const handledTerminalRunRef = useRef<string | null>(null);
  const terminalCoverageRefreshRunRef = useRef<string | null>(null);
  const mountedAtMsRef = useRef(Date.now());
  const supportsComments = SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS.includes(platform);
  const supportsInlineCommentsSync = platform === "instagram";
  const platformLabel = SOCIAL_ACCOUNT_PLATFORM_LABELS[platform] ?? platform;
  const selectedPostParam = searchParams.get("post");

  const replacePostParam = useCallback(
    (sourceId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sourceId) {
        params.set("post", sourceId);
      } else {
        params.delete("post");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const refreshPosts = useCallback(async () => {
    if (checking || !user || !hasAccess) return;
    setPostsLoading(true);
    setPostsError(null);
    try {
      const trimmedSearch = commentsSearch.trim();
      const searchQuery = trimmedSearch ? `&search=${encodeURIComponent(trimmedSearch)}` : "";
      const filterQuery = supportsInlineCommentsSync ? `&comment_filter=${commentsPostFilter}` : "";
      const sortQuery = `&sort_by=${encodeURIComponent(commentsSort.field)}&sort_dir=${encodeURIComponent(commentsSort.direction)}`;
      const postsUrl = `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/posts?page=${page}&page_size=25&comments_only=true${filterQuery}${sortQuery}${searchQuery}`;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const response = await fetchAdminWithAuth(postsUrl, undefined, { preferredUser: user });
        const data = (await response.json().catch(() => ({}))) as SocialAccountProfilePostsResponse & ProxyErrorPayload;
        if (response.ok) {
          setPosts(data);
          return;
        }

        const errorMessage = readInstagramCommentsErrorMessage(data, "Failed to load Instagram posts with comments");
        if (attempt < 2 && isRetryablePostsLoadFailure(data, errorMessage, response.status)) {
          const retryAfterMs =
            typeof data.retry_after_seconds === "number" && data.retry_after_seconds > 0
              ? data.retry_after_seconds * 1000
              : POSTS_LOAD_RETRY_DELAY_MS;
          await sleep(retryAfterMs);
          continue;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      setPostsError(error instanceof Error ? error.message : "Failed to load Instagram posts with comments");
    } finally {
      setPostsLoading(false);
    }
  }, [
    checking,
    commentsPostFilter,
    commentsSearch,
    commentsSort.direction,
    commentsSort.field,
    fetchAdminWithAuth,
    handle,
    hasAccess,
    page,
    platform,
    supportsInlineCommentsSync,
    user,
  ]);

  useEffect(() => {
    if (!supportsComments) return;
    void refreshPosts();
  }, [refreshPosts, supportsComments]);

  useEffect(() => {
    if (!selectedPost || !posts) return;
    const refreshedSelection =
      posts.items.find((item) => item.id === selectedPost.id) ??
      posts.items.find((item) => item.source_id === selectedPost.source_id);
    if (refreshedSelection && refreshedSelection !== selectedPost) {
      setSelectedPost(refreshedSelection);
    }
  }, [posts, selectedPost]);

  useEffect(() => {
    const sourceId = String(selectedPostParam || "").trim();
    if (!sourceId || !posts) return;
    if (selectedPost?.source_id === sourceId) return;
    const postFromUrl = posts.items.find((item) => item.source_id === sourceId);
    if (postFromUrl) {
      setSelectedPost(postFromUrl);
    }
  }, [posts, selectedPost?.source_id, selectedPostParam]);

  const runProgress = useSharedPollingResource<SocialAccountCommentsRunProgress>({
    key: `instagram-comments-run:${platform}:${handle}:${scrapeRunId ?? "none"}`,
    shouldRun: !checking && Boolean(user) && hasAccess && supportsInlineCommentsSync && Boolean(scrapeRunId),
    intervalMs: COMMENTS_PROGRESS_POLL_INTERVAL_MS,
    fetchData: async (signal) => {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/runs/${encodeURIComponent(scrapeRunId || "")}/progress`,
        { signal },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as SocialAccountCommentsRunProgress & ProxyErrorPayload;
      if (!response.ok) {
        throw new Error(readInstagramCommentsErrorMessage(data, "Failed to load comments scrape progress"));
      }
      return data;
    },
  });
  const refetchRunProgress = runProgress.refetch;

  const startProfileScrape = useCallback(async () => {
    if (!user) return;
    setScrapeError(null);
    setScrapeMessage("Repairing Instagram auth if needed...");
    setCommentsLaunchPending(true);
    handledTerminalRunRef.current = null;
    const body: SocialAccountCommentsScrapeRequest = {
      mode: "profile",
      source_scope: "network",
      refresh_policy: "stale_or_missing",
    };
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/scrape`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as SocialAccountCommentsScrapeResponse & ProxyErrorPayload;
      if (!response.ok) {
        const activeRunId =
          (response.status === 409 && readCommentsRunId(data.upstream_detail)) ||
          (response.status === 409 && readCommentsRunId(data));
        if (activeRunId) {
          setScrapeRunId(activeRunId);
          setScrapeMessage(`Comments sync already running. Run ${activeRunId.slice(0, 8)}.`);
          return;
        }
        throw new Error(readInstagramCommentsErrorMessage(data, "Failed to start comments sync"));
      }
      const runId = String(data.run_id || "").trim();
      setScrapeRunId(runId || null);
      setScrapeMessage(
        formatCommentsLaunchQueuedMessage(
          data,
          runId ? `Comments sync queued. Run ${runId.slice(0, 8)}.` : "Comments sync queued.",
        ),
      );
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : "Failed to start comments sync");
    } finally {
      setCommentsLaunchPending(false);
    }
  }, [fetchAdminWithAuth, handle, platform, user]);

  const startIncompleteFillScrape = useCallback(async () => {
    if (!user) return;
    setScrapeError(null);
    setScrapeMessage("Repairing Instagram auth if needed...");
    setCommentsLaunchPending(true);
    handledTerminalRunRef.current = null;
    const body: SocialAccountCommentsScrapeRequest = {
      mode: "profile",
      source_scope: "network",
      refresh_policy: "stale_or_missing",
      target_filter: "incomplete",
    };
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/scrape`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as SocialAccountCommentsScrapeResponse & ProxyErrorPayload;
      if (!response.ok) {
        const activeRunId =
          (response.status === 409 && readCommentsRunId(data.upstream_detail)) ||
          (response.status === 409 && readCommentsRunId(data));
        if (activeRunId) {
          setScrapeRunId(activeRunId);
          setScrapeMessage(`Comments sync already running. Run ${activeRunId.slice(0, 8)}.`);
          return;
        }
        throw new Error(readInstagramCommentsErrorMessage(data, "Failed to start incomplete fill"));
      }
      const runId = String(data.run_id || "").trim();
      setScrapeRunId(runId || null);
      setScrapeMessage(
        formatCommentsLaunchQueuedMessage(
          data,
          runId ? `Incomplete Fill queued. Run ${runId.slice(0, 8)}.` : "Incomplete Fill queued.",
        ),
      );
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : "Failed to start incomplete fill");
    } finally {
      setCommentsLaunchPending(false);
    }
  }, [fetchAdminWithAuth, handle, platform, user]);

  const startCatalogRefresh = useCallback(async () => {
    if (!user) return;
    setScrapeError(null);
    setScrapeMessage("Repairing Instagram auth if needed before queueing refresh...");
    setCatalogRefreshPending(true);
    const body: CatalogBackfillRequest = {
      source_scope: "network",
      backfill_scope: "full_history",
      selected_tasks: COMMENTS_REFRESH_SELECTED_TASKS,
    };
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/backfill`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as CatalogBackfillLaunchResponse & ProxyErrorPayload;
      if (!response.ok) {
        throw new Error(readInstagramCommentsErrorMessage(data, "Failed to queue discussion refresh"));
      }
      const runId = String(data.catalog_run_id || data.run_id || "").trim();
      const queuedMessage = runId
        ? `Refresh queued. Run ${runId.slice(0, 8)}.`
        : "Refresh queued for saved posts and discussion.";
      setScrapeMessage(
        data.auth_repair_attempted && data.auth_repair_status === "succeeded"
          ? `Instagram auth repaired. ${queuedMessage}`
          : queuedMessage,
      );
      void refreshPosts();
      void onSummaryRefresh?.();
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : "Failed to queue discussion refresh");
    } finally {
      setCatalogRefreshPending(false);
    }
  }, [fetchAdminWithAuth, handle, onSummaryRefresh, platform, refreshPosts, user]);

  const cancelCommentsRun = useCallback(async () => {
    if (!user || !scrapeRunId) return;
    const runId = scrapeRunId;
    setScrapeError(null);
    setScrapeMessage(`Cancelling comments sync. Run ${runId.slice(0, 8)}.`);
    setCancelPending(true);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/runs/${encodeURIComponent(runId)}/cancel`,
        { method: "POST" },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as SocialAccountCommentsCancelResponse &
        ProxyErrorPayload;
      if (!response.ok) {
        throw new Error(readInstagramCommentsErrorMessage(data, "Failed to cancel comments sync"));
      }
      const cancelledRunId = String(data.run_id || runId).trim() || runId;
      handledTerminalRunRef.current = cancelledRunId;
      terminalCoverageRefreshRunRef.current = null;
      setScrapeRunId(null);
      setScrapeMessage(`Comments sync cancelled. Run ${cancelledRunId.slice(0, 8)}.`);
      void refreshPosts();
      void onSummaryRefresh?.();
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : "Failed to cancel comments sync");
    } finally {
      setCancelPending(false);
    }
  }, [fetchAdminWithAuth, handle, onSummaryRefresh, platform, refreshPosts, scrapeRunId, user]);

  const coverage = summary?.comments_coverage;
  const savedSummary = summary?.comments_saved_summary;
  const coverageStatus = normalizeRunStatus(coverage?.effective_status ?? coverage?.last_comments_run_status);
  const coverageActiveRunId = useMemo(() => {
    if (!ACTIVE_RUN_STATUSES.has(coverageStatus)) return null;
    return readCommentsRunId(coverage);
  }, [coverage, coverageStatus]);
  const rawRunProgressStatus = normalizeRunStatus(runProgress.data?.run_status);
  const rawRunProgressRunId = String(runProgress.data?.run_id || "").trim();
  const runProgressLastSuccessMs = runProgress.lastSuccessAt?.getTime() ?? 0;
  const rawRunProgressFromThisMount = runProgressLastSuccessMs >= mountedAtMsRef.current;
  const suppressStaleTerminalProgress =
    Boolean(coverageActiveRunId) &&
    rawRunProgressRunId === coverageActiveRunId &&
    TERMINAL_RUN_STATUSES.has(rawRunProgressStatus) &&
    !rawRunProgressFromThisMount;
  const displayedRunProgress = suppressStaleTerminalProgress ? null : runProgress.data;

  useEffect(() => {
    const progress = runProgress.data;
    if (!progress) return;
    const runId = String(progress.run_id || "").trim();
    const status = normalizeRunStatus(progress.run_status);
    if (!runId) return;
    if (ACTIVE_RUN_STATUSES.has(status)) {
      setScrapeMessage(formatCommentsProgressMessage(progress, runId, status));
      setScrapeError(null);
      return;
    }
    if (coverageActiveRunId === runId && TERMINAL_RUN_STATUSES.has(status) && !rawRunProgressFromThisMount) {
      setScrapeMessage(`Comments sync running. Run ${runId.slice(0, 8)}.`);
      setScrapeError(null);
      return;
    }
    if (!TERMINAL_RUN_STATUSES.has(status)) return;
    const coverageStillClaimsRunActive = coverageActiveRunId === runId;
    const terminalRefreshKey = `${runId}:${status}`;
    if (coverageStillClaimsRunActive && terminalCoverageRefreshRunRef.current === terminalRefreshKey) return;
    if (!coverageStillClaimsRunActive && handledTerminalRunRef.current === runId) {
      if (scrapeRunId === runId) {
        setScrapeRunId(null);
      }
      return;
    }
    if (coverageStillClaimsRunActive) {
      terminalCoverageRefreshRunRef.current = terminalRefreshKey;
    } else {
      handledTerminalRunRef.current = runId;
      terminalCoverageRefreshRunRef.current = null;
    }
    if (status === "completed") {
      setScrapeMessage(`Comments sync completed. Run ${runId.slice(0, 8)}.`);
      setScrapeError(null);
      void refreshPosts();
      setModalRefreshKey((current) => current + 1);
      void onSummaryRefresh?.();
    } else {
      setScrapeError(formatCommentsTerminalError(progress, status));
    }
    if (coverageStillClaimsRunActive) {
      void onSummaryRefresh?.();
      return;
    }
    setScrapeRunId(null);
  }, [
    coverageActiveRunId,
    onSummaryRefresh,
    rawRunProgressFromThisMount,
    refreshPosts,
    runProgress.data,
    scrapeRunId,
  ]);

  useEffect(() => {
    if (!runProgress.error) return;
    if (displayedRunProgress && ACTIVE_RUN_STATUSES.has(normalizeRunStatus(displayedRunProgress.run_status))) {
      return;
    }
    setScrapeError(runProgress.error);
    if (!coverageActiveRunId) {
      setScrapeRunId(null);
    }
  }, [coverageActiveRunId, displayedRunProgress, runProgress.error]);

  useEffect(() => {
    if (!suppressStaleTerminalProgress || scrapeRunId !== coverageActiveRunId) return;
    refetchRunProgress({ cause: "manual", forceRefresh: true });
  }, [coverageActiveRunId, refetchRunProgress, scrapeRunId, suppressStaleTerminalProgress]);
  // P0-1: `Available Posts` must match the saved-post total shown by the Posts card —
  // `live_catalog_total_posts` first, falling back to `catalog_total_posts`. Do NOT
  // derive from `coverage.available_posts`; that field conflates the commentable subset
  // with the saved-post inventory. `Commentable now` stays on `coverage.eligible_posts`.
  const availablePosts = Number(summary?.live_catalog_total_posts ?? summary?.catalog_total_posts ?? 0);
  const commentablePosts = Number(coverage?.eligible_posts ?? savedSummary?.retrieved_comment_posts ?? 0);
  const activePostsFilterTotal = posts?.pagination.total ?? null;
  const incompletePosts =
    commentsPostFilter === "incomplete" && activePostsFilterTotal !== null ? activePostsFilterTotal : null;
  const notCommentablePosts =
    commentsPostFilter === "not_commentable" && activePostsFilterTotal !== null
      ? activePostsFilterTotal
      : Math.max(availablePosts - commentablePosts, 0);
  const effectiveCoverageLabel = String(coverage?.effective_label || "").trim()
    || (savedSummary ? "Rows saved" : formatStatusLabel(coverage?.effective_status ?? coverage?.last_comments_run_status));
  const historicalFailure = Boolean(coverage?.historical_failure);
  const lastAttemptStatus = normalizeRunStatus(coverage?.last_attempt_status);
  const lastAttemptAt = coverage?.last_attempt_at ?? coverage?.last_comments_run_at;
  const isScraping = Boolean(scrapeRunId);
  const commentsActionDisabled = commentsLaunchPending || isScraping || checking || !user || !hasAccess;
  const catalogActionDisabled = catalogRefreshPending || checking || !user || !hasAccess;
  const primaryActionPending = supportsInlineCommentsSync ? commentsLaunchPending || isScraping : catalogRefreshPending;
  const emptyPostsLabel = supportsInlineCommentsSync
    ? commentsPostFilter === "incomplete"
      ? `No incomplete ${platformLabel} comment totals are saved for this account.`
      : commentsPostFilter === "not_commentable"
        ? `No saved ${platformLabel} posts without reported comments are available for this account.`
      : `No ${platformLabel} posts with comments are saved for this account yet.`
    : `No saved ${platformLabel} posts with discussion are available for this account yet.`;
  const panelTitle = supportsInlineCommentsSync ? `${platformLabel} Comments` : `${platformLabel} Discussion`;
  const panelDescription = supportsInlineCommentsSync
    ? `Review parent-thread coverage and run a full-account comments sync across saved ${platformLabel} posts.`
    : `Review saved discussion coverage and queue a catalog-driven refresh for post details, comments, and media across saved ${platformLabel} posts.`;
  const primaryActionLabel = supportsInlineCommentsSync
    ? primaryActionPending
      ? commentsLaunchPending
        ? "Starting..."
        : "Syncing Comments..."
      : "Sync Comments"
    : primaryActionPending
      ? "Queuing Refresh..."
      : "Refresh Details + Comments + Media";
  const progressWarning = useMemo(
    () => (hideActiveRunProgress ? null : formatCommentsProgressWarning(displayedRunProgress)),
    [displayedRunProgress, hideActiveRunProgress],
  );
  const progressScopeNotice = useMemo(
    () => (hideActiveRunProgress ? null : getCommentsRunScopeNotice(displayedRunProgress)),
    [displayedRunProgress, hideActiveRunProgress],
  );
  const shardProgressRows = useMemo(
    () => (hideActiveRunProgress ? [] : getCommentsShardProgressRows(displayedRunProgress)),
    [displayedRunProgress, hideActiveRunProgress],
  );
  const openPostComments = useCallback(
    (post: SocialAccountProfilePost, event?: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      event?.preventDefault();
      setSelectedPost(post);
      replacePostParam(String(post.source_id || "").trim() || null);
    },
    [replacePostParam],
  );
  const closePostComments = useCallback(() => {
    setSelectedPost(null);
    replacePostParam(null);
  }, [replacePostParam]);
  const selectCommentsPostFilter = useCallback((filter: CommentsPostFilter) => {
    setCommentsPostFilter(filter);
    setPage(1);
  }, []);
  const updateCommentsSearch = useCallback((value: string) => {
    setCommentsSearch(value);
    setPage(1);
  }, []);
  const selectCommentsSort = useCallback((field: CommentsSortField) => {
    setCommentsSort((current) => {
      if (current.field === field) {
        return { field, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { field, direction: getDefaultCommentsSortDirection(field) };
    });
    setPage(1);
  }, []);
  const renderSortableHeader = useCallback(
    (column: (typeof COMMENTS_SORT_COLUMNS)[number]) => {
      const active = commentsSort.field === column.key;
      const nextDirection =
        active
          ? commentsSort.direction === "asc"
            ? "desc"
            : "asc"
          : getDefaultCommentsSortDirection(column.key);
      const SortIcon = active ? (commentsSort.direction === "asc" ? ArrowUpIcon : ArrowDownIcon) : ArrowUpDownIcon;
      return (
        <TableHead
          key={column.key}
          aria-sort={active ? (commentsSort.direction === "asc" ? "ascending" : "descending") : "none"}
          className="pb-3 pr-4"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Sort by ${column.label} ${nextDirection === "asc" ? "ascending" : "descending"}`}
            onClick={() => selectCommentsSort(column.key)}
            className="-ml-2 h-auto min-h-0 justify-start gap-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 [&_svg]:size-3"
          >
            <span>{column.label}</span>
            <SortIcon aria-hidden="true" data-icon="inline-end" />
            {active ? <span className="sr-only">sorted {commentsSort.direction}</span> : null}
          </Button>
        </TableHead>
      );
    },
    [commentsSort.direction, commentsSort.field, selectCommentsSort],
  );

  useEffect(() => {
    if (!supportsInlineCommentsSync || !coverageActiveRunId) return;
    if (scrapeRunId === coverageActiveRunId) return;
    if (handledTerminalRunRef.current === coverageActiveRunId) return;
    handledTerminalRunRef.current = null;
    terminalCoverageRefreshRunRef.current = null;
    setScrapeRunId(coverageActiveRunId);
  }, [coverageActiveRunId, scrapeRunId, supportsInlineCommentsSync]);

  return (
    <>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">{panelTitle}</h2>
            <p className="text-sm text-zinc-500">{panelDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {supportsInlineCommentsSync ? (
              <>
                <button
                  type="button"
                  onClick={() => void startIncompleteFillScrape()}
                  disabled={commentsActionDisabled}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  Incomplete Fill
                </button>
                <button
                  type="button"
                  onClick={() => void startProfileScrape()}
                  disabled={commentsActionDisabled}
                  className={PRIMARY_BUTTON_CLASS}
                >
                  {primaryActionLabel}
                </button>
                {isScraping || scrapeRunId ? (
                  <button
                    type="button"
                    onClick={() => void cancelCommentsRun()}
                    disabled={cancelPending || !scrapeRunId || checking || !user || !hasAccess}
                    className={SECONDARY_BUTTON_CLASS}
                  >
                    {cancelPending ? "Cancelling..." : "Cancel"}
                  </button>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                onClick={() => void startCatalogRefresh()}
                disabled={catalogActionDisabled}
                className={PRIMARY_BUTTON_CLASS}
              >
                {primaryActionLabel}
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Available Posts</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(availablePosts)}</p>
            <p className="mt-1 text-xs text-zinc-500">Commentable now: {formatInteger(commentablePosts)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Missing</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(coverage?.missing_posts)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Stale</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(coverage?.stale_posts)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Last Run</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{formatDateTime(coverage?.last_comments_run_at)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Status</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{effectiveCoverageLabel}</p>
            {historicalFailure && lastAttemptStatus === "failed" ? (
              <p className="mt-1 text-xs text-amber-700">
                Last attempt failed at {formatDateTime(lastAttemptAt)}. Saved discussion remains available.
              </p>
            ) : null}
          </div>
        </div>

        {scrapeMessage ? <p className="mt-4 text-sm text-zinc-600">{scrapeMessage}</p> : null}
        {progressScopeNotice ? <p className="mt-3 text-sm font-medium text-sky-700">{progressScopeNotice}</p> : null}
        {progressWarning ? <p className="mt-3 text-sm font-medium text-amber-700">{progressWarning}</p> : null}
        {scrapeError ? <p className="mt-4 text-sm text-red-700">{scrapeError}</p> : null}
        {shardProgressRows.length > 0 ? (
          <div className="mt-4 border-l-2 border-sky-200 pl-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Shard progress</p>
            <div className="mt-2 grid gap-2 text-sm">
              {shardProgressRows.map((row, index) => (
                <div key={`${row.job_id ?? "shard"}-${row.shard_index ?? index}`}>
                  <p className="font-semibold text-zinc-800">{formatShardProgressLabel(row, index)}</p>
                  <p className="mt-0.5 text-zinc-600">{formatShardProgressMetrics(row)}</p>
                  {row.error_message || row.latest_failure_reason ? (
                    <p className="mt-0.5 text-red-700">{row.error_message ?? row.latest_failure_reason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {supportsInlineCommentsSync ? (
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Commentable", value: "commentable" as const, count: commentablePosts },
                { label: "Incomplete", value: "incomplete" as const, count: incompletePosts },
                { label: "Not Commentable", value: "not_commentable" as const, count: notCommentablePosts },
              ].map((filter) => {
                const active = commentsPostFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => selectCommentsPostFilter(filter.value)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    <span>{filter.label}</span>
                    {filter.count !== null ? (
                      <span className={active ? "text-zinc-200" : "text-zinc-500"}>{formatInteger(filter.count)}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <label className="relative block w-full max-w-sm">
              <span className="sr-only">Search comments posts</span>
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="search"
                value={commentsSearch}
                onChange={(event) => updateCommentsSearch(event.target.value)}
                placeholder="Search post, caption, tag..."
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </label>
          </div>
        ) : null}

        <div className={supportsInlineCommentsSync ? "mt-4" : "mt-6"}>
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>{COMMENTS_SORT_COLUMNS.map(renderSortableHeader)}</TableRow>
            </TableHeader>
            <TableBody>
              {postsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-sm text-zinc-500">
                    Loading posts with comments...
                  </TableCell>
                </TableRow>
              ) : postsError ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-sm text-red-700">
                    {postsError}
                  </TableCell>
                </TableRow>
              ) : (posts?.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-sm text-zinc-500">
                    {emptyPostsLabel}
                  </TableCell>
                </TableRow>
              ) : (
                (posts?.items ?? []).map((item) => {
                  const breakdown = getPostCommentBreakdown(item);
                  const captureHealthSummary = formatPostCaptureHealthSummary(item.comment_breakdown);
                  const incomplete = breakdown.missingComments > 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="py-4 pr-4 align-top text-zinc-700">
                        {item.url ? (
                          <a
                            href={item.url}
                            onClick={(event) => openPostComments(item, event)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {item.source_id || "Open post"}
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => openPostComments(item, event)}
                            className="text-left text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {item.source_id || "Open post"}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="py-4 pr-4 align-top text-xs text-zinc-500">
                        {formatDateTime(item.posted_at)}
                      </TableCell>
                      <TableCell className="whitespace-normal py-4 pr-4 align-top text-zinc-700">
                        <div className="max-w-xl">
                          <p className="whitespace-pre-wrap break-words leading-5 text-zinc-700">
                            {getCaptionPreview(item)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 pr-4 align-top tabular-nums text-zinc-700">
                        {formatInteger(breakdown.reportedComments)}
                      </TableCell>
                      <TableCell className="py-4 pr-4 align-top text-zinc-700">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {breakdown.hasThreadBreakdown ? (
                              <>
                                <span className="tabular-nums">{formatInteger(breakdown.parentComments ?? 0)} parent</span>
                                <span className="tabular-nums">{formatInteger(breakdown.childReplies ?? 0)} replies</span>
                              </>
                            ) : (
                              <span className="tabular-nums">{formatInteger(breakdown.savedInstagramComments)} saved comments</span>
                            )}
                          {incomplete ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                              Incomplete
                            </span>
                          ) : null}
                          </div>
                          {breakdown.hasFacebookData ? (
                            <p className="text-xs text-zinc-500">
                              {formatInteger(breakdown.facebookComments)} Facebook accounted
                            </p>
                          ) : null}
                          {captureHealthSummary ? (
                            <p className="text-xs text-zinc-500">{captureHealthSummary}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        className={`py-4 pr-4 align-top tabular-nums ${
                          breakdown.missingComments > 0 ? "font-semibold text-amber-700" : "text-zinc-700"
                        }`}
                      >
                        {formatInteger(breakdown.missingComments)}
                      </TableCell>
                      <TableCell className="py-4 align-top tabular-nums text-zinc-700">
                        {formatInteger(item.metrics.likes)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || postsLoading}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <div className="text-sm text-zinc-500">
            Page {posts?.pagination.page ?? page} of {posts?.pagination.total_pages ?? 1}
          </div>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={Boolean(posts && page >= posts.pagination.total_pages) || postsLoading}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      <InstagramCommentsPostModal
        isOpen={Boolean(selectedPost)}
        onClose={closePostComments}
        platform={platform}
        handle={handle}
        post={selectedPost}
        fetchAdmin={(input, init) => fetchAdminWithAuth(input, init, { preferredUser: user })}
        refreshKey={modalRefreshKey}
      />
    </>
  );
}
