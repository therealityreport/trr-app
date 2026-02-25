"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import {
  buildSeasonWeekBreadcrumb,
  humanizeSlug,
} from "@/lib/admin/admin-breadcrumbs";
import { recordAdminRecentShow } from "@/lib/admin/admin-recent-shows";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { buildSeasonAdminUrl, buildSeasonSocialWeekUrl, buildShowAdminUrl } from "@/lib/admin/show-admin-routes";
import { getClientAuthHeaders } from "@/lib/admin/client-auth";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Comment {
  comment_id: string;
  author: string;
  text: string;
  likes: number;
  is_reply: boolean;
  reply_count: number;
  created_at: string | null;
}

interface ThreadedComment extends Comment {
  replies: ThreadedComment[];
}

interface BasePost {
  source_id: string;
  author: string;
  text: string;
  url: string;
  posted_at: string | null;
  engagement: number;
  total_comments_available: number;
  comments: Comment[];
}

interface InstagramPost extends BasePost {
  likes: number;
  comments_count: number;
  views: number;
  media_type?: string | null;
  post_format?: "reel" | "post" | "carousel" | null;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  profile_tags?: string[];
  collaborators?: string[];
  hashtags?: string[];
  mentions: string[];
  duration_seconds?: number | null;
}

interface TikTokPost extends BasePost {
  nickname: string;
  likes: number;
  comments_count: number;
  shares: number;
  views: number;
  hashtags: string[];
  duration_seconds?: number | null;
  thumbnail_url?: string | null;
  mentions: string[];
}

interface YouTubePost extends BasePost {
  title: string;
  views: number;
  likes: number;
  comments_count: number;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
}

interface TwitterPost extends BasePost {
  display_name: string;
  likes: number;
  retweets: number;
  replies_count: number;
  quotes: number;
  views: number;
  hashtags: string[];
  mentions: string[];
  media_urls?: string[] | null;
}

type AnyPost = InstagramPost | TikTokPost | YouTubePost | TwitterPost;

interface PlatformData {
  posts: AnyPost[];
  totals: {
    posts: number;
    total_comments: number;
    total_engagement: number;
  };
}

interface WeekDetailResponse {
  week: {
    week_index: number;
    label: string;
    start: string;
    end: string;
  };
  season: {
    season_id: string;
    show_id: string;
    show_name: string | null;
    season_number: number;
  };
  source_scope: string;
  platforms: Record<string, PlatformData>;
  totals: {
    posts: number;
    total_comments: number;
    total_engagement: number;
  };
}

interface PostDetailResponse {
  platform: string;
  source_id: string;
  author: string;
  text: string;
  url: string;
  posted_at: string | null;
  title?: string;
  display_name?: string;
  thumbnail_url?: string | null;
  post_format?: "reel" | "post" | "carousel" | null;
  profile_tags?: string[];
  collaborators?: string[];
  hashtags?: string[];
  mentions?: string[];
  duration_seconds?: number | null;
  stats: Record<string, number>;
  total_comments_in_db: number;
  comments: ThreadedComment[];
}

interface SocialJob {
  id: string;
  run_id?: string | null;
  platform: string;
  status: "queued" | "pending" | "retrying" | "running" | "completed" | "failed" | "cancelled";
  job_type?: string;
  items_found?: number;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface SocialRun {
  id: string;
  status: "queued" | "pending" | "retrying" | "running" | "completed" | "failed" | "cancelled";
  source_scope?: string;
  config?: Record<string, unknown>;
  summary?: {
    total_jobs?: number;
    completed_jobs?: number;
    failed_jobs?: number;
    active_jobs?: number;
    items_found_total?: number;
    stage_counts?: Record<
      string,
      {
        total?: number;
        completed?: number;
        failed?: number;
        active?: number;
      }
    >;
  };
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
}

interface CommentsCoverageResponse {
  total_saved_comments: number;
  total_reported_comments: number;
  coverage_pct: number | null;
  up_to_date: boolean;
  stale_posts_count: number;
  posts_scanned: number;
  by_platform?: Record<
    string,
    {
      saved_comments: number;
      reported_comments: number;
      coverage_pct: number | null;
      up_to_date: boolean;
      stale_posts_count: number;
      posts_scanned: number;
    }
  >;
}

interface MirrorCoverageResponse {
  up_to_date: boolean;
  needs_mirror_count: number;
  mirrored_count: number;
  failed_count: number;
  partial_count: number;
  pending_count: number;
  posts_scanned: number;
  by_platform?: Record<
    string,
    {
      up_to_date: boolean;
      needs_mirror_count: number;
      mirrored_count: number;
      failed_count: number;
      partial_count: number;
      pending_count: number;
      posts_scanned: number;
    }
  >;
}

interface WorkerHealthPayload {
  queue_enabled?: boolean;
  healthy?: boolean;
  healthy_workers?: number;
  reason?: string | null;
}

type PlatformFilter = "all" | "instagram" | "tiktok" | "twitter" | "youtube";
type SortField = "engagement" | "likes" | "views" | "comments_count" | "shares" | "retweets" | "posted_at";
type SortDir = "desc" | "asc";
type SourceScope = "bravo" | "creator" | "community";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PLATFORM_FILTERS: { key: PlatformFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter/X" },
  { key: "youtube", label: "YouTube" },
];

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: "engagement", label: "Engagement" },
  { key: "likes", label: "Likes" },
  { key: "views", label: "Views" },
  { key: "comments_count", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "retweets", label: "Retweets" },
  { key: "posted_at", label: "Date" },
];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800",
  tiktok: "bg-gray-100 text-gray-800",
  twitter: "bg-sky-100 text-sky-800",
  youtube: "bg-red-100 text-red-800",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter/X",
  youtube: "YouTube",
};

const STAT_LABELS: Record<string, string> = {
  likes: "Likes",
  comments_count: "Comments",
  views: "Views",
  shares: "Shares",
  retweets: "Retweets",
  replies_count: "Replies",
  quotes: "Quotes",
  engagement: "Total Engagement",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const looksLikeUuid = (value: string): boolean => UUID_RE.test(value);
const ACTIVE_RUN_STATUSES = new Set<SocialRun["status"]>(["queued", "pending", "retrying", "running"]);
const TERMINAL_RUN_STATUSES = new Set<SocialRun["status"]>(["completed", "failed", "cancelled"]);
const SOCIAL_TIME_ZONE = "America/New_York";
const DATE_TOKEN_RE = /^\d{4}-\d{2}-\d{2}$/;
const COMMENT_SYNC_MAX_PASSES = 8;
const COMMENT_SYNC_MAX_DURATION_MS = 90 * 60 * 1000;
const SOCIAL_FULL_SYNC_MIRROR_ENABLED =
  process.env.NEXT_PUBLIC_SOCIAL_FULL_SYNC_MIRROR_ENABLED === "true" ||
  process.env.SOCIAL_FULL_SYNC_MIRROR_ENABLED === "true";
const REQUEST_TIMEOUT_MS = {
  weekDetail: 45_000,
  syncRuns: 15_000,
  syncJobs: 15_000,
  commentsCoverage: 35_000,
  mirrorCoverage: 35_000,
  workerHealth: 12_000,
} as const;
const SYNC_POLL_BACKOFF_MS = [3_000, 6_000, 10_000, 15_000] as const;
const TRANSIENT_DEV_RESTART_PATTERNS = [
  "failed to fetch",
  "networkerror when attempting to fetch resource",
  "fetch failed",
  "unexpected end of json input",
  "invalid json",
  "load failed",
  "connection closed",
] as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) return error.name === "AbortError";
  if (!error || typeof error !== "object") return false;
  return (error as { name?: string }).name === "AbortError";
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const isTransientDevRestartMessage = (message: string | null | undefined): boolean => {
  const normalized = String(message ?? "").toLowerCase();
  if (!normalized) return false;
  return TRANSIENT_DEV_RESTART_PATTERNS.some((pattern) => normalized.includes(pattern));
};

const parseResponseJson = async <T,>(response: Response, fallbackMessage: string): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${fallbackMessage}. Response payload unavailable.`);
  }
};

const fmtNum = (n: number | null | undefined): string => {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: SOCIAL_TIME_ZONE,
  });
};

const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: SOCIAL_TIME_ZONE,
  });
};

const dateTokenFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SOCIAL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SOCIAL_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const toLocalDateToken = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = dateTokenFormatter.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    values[part.type] = part.value;
  }
  if (!values.year || !values.month || !values.day) return null;
  return `${values.year}-${values.month}-${values.day}`;
};

const toDayFilterLabel = (token: string | null): string | null => {
  if (!token || !DATE_TOKEN_RE.test(token)) return null;
  const [yearRaw, monthRaw, dayRaw] = token.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return dayLabelFormatter.format(date);
};

function getNum(post: AnyPost, key: string): number {
  return (post as unknown as Record<string, number>)[key] ?? 0;
}

function getStrArr(post: AnyPost, key: string): string[] {
  const val = (post as unknown as Record<string, unknown>)[key];
  return Array.isArray(val) ? (val as string[]) : [];
}

function getStr(post: AnyPost, key: string): string {
  const val = (post as unknown as Record<string, unknown>)[key];
  return typeof val === "string" ? val : "";
}

function getActualCommentsForPost(platform: string, post: AnyPost): number {
  if (platform === "twitter") {
    return Math.max(0, getNum(post, "replies_count"));
  }
  return Math.max(0, getNum(post, "comments_count"));
}

function getSavedCommentsForPost(post: AnyPost): number {
  const value = Number(post.total_comments_available ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function formatSavedVsActualComments(saved: number, actual: number): string {
  return `${fmtNum(saved)}/${fmtNum(actual)}`;
}

function isCommentsCoverageIncomplete(saved: number, actual: number): boolean {
  return saved < actual;
}

function formatCoverageLabel(saved: number, actual: number): string {
  const pct = actual > 0 ? Math.max(0, Math.min(100, (saved / actual) * 100)) : 100;
  return `${fmtNum(saved)}/${fmtNum(actual)} (${pct.toFixed(1)}%)`;
}

function formatMirrorCoverageLabel(readyCount: number, total: number): string {
  const pct = total > 0 ? Math.max(0, Math.min(100, (readyCount / total) * 100)) : 100;
  return `${fmtNum(readyCount)}/${fmtNum(total)} (${pct.toFixed(1)}%)`;
}

function getReportedCommentCountFromStats(platform: string, stats: Record<string, number>): number {
  const raw =
    platform === "twitter"
      ? Number(stats.replies_count ?? stats.comments_count ?? 0)
      : Number(stats.comments_count ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, raw);
}

function getPostThumbnailUrl(platform: string, post: AnyPost): string | null {
  if (platform === "twitter") {
    return null;
  }
  if (platform === "youtube") return getStr(post, "thumbnail_url") || null;
  if (platform === "instagram") {
    const thumbnail = getStr(post, "thumbnail_url");
    if (thumbnail) return thumbnail;
    const mediaUrls = getStrArr(post, "media_urls");
    return mediaUrls[0] || null;
  }
  return getStr(post, "thumbnail_url") || null;
}

function getJobStage(job: SocialJob): string {
  if (typeof job.config?.stage === "string" && job.config.stage) return job.config.stage;
  if (typeof job.metadata?.stage === "string" && job.metadata.stage) return job.metadata.stage;
  if (typeof job.job_type === "string" && job.job_type) return job.job_type;
  return "posts";
}

function getJobStageCounters(job: SocialJob): { posts: number; comments: number } | null {
  const counters = (job.metadata as Record<string, unknown> | undefined)?.stage_counters as
    | Record<string, unknown>
    | undefined;
  const hasPosts = typeof counters?.posts === "number";
  const hasComments = typeof counters?.comments === "number";
  if (!hasPosts && !hasComments) return null;
  return {
    posts: Number(counters?.posts ?? 0),
    comments: Number(counters?.comments ?? 0),
  };
}

function getJobPersistCounters(job: SocialJob): { posts_upserted: number; comments_upserted: number } | null {
  const counters = (job.metadata as Record<string, unknown> | undefined)?.persist_counters as
    | Record<string, unknown>
    | undefined;
  const hasPosts = typeof counters?.posts_upserted === "number";
  const hasComments = typeof counters?.comments_upserted === "number";
  if (!hasPosts && !hasComments) return null;
  return {
    posts_upserted: Number(counters?.posts_upserted ?? 0),
    comments_upserted: Number(counters?.comments_upserted ?? 0),
  };
}

function getJobActivity(job: SocialJob): Record<string, unknown> | null {
  const activity = (job.metadata as Record<string, unknown> | undefined)?.activity as
    | Record<string, unknown>
    | undefined;
  if (!activity || typeof activity !== "object") return null;
  return activity;
}

function getJobActivitySummary(job: SocialJob): string {
  const activity = getJobActivity(job);
  if (!activity) return "";
  const parts: string[] = [];
  if (typeof activity.phase === "string" && activity.phase.trim()) {
    parts.push(activity.phase.replaceAll("_", " "));
  }
  if (typeof activity.pages_scanned === "number") {
    parts.push(`${activity.pages_scanned}pg`);
  }
  if (typeof activity.posts_checked === "number") {
    parts.push(`${activity.posts_checked}chk`);
  }
  if (typeof activity.matched_posts === "number") {
    parts.push(`${activity.matched_posts}match`);
  }
  return parts.join(" · ");
}

function formatRunStatus(status: SocialRun["status"]): string {
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

/* ------------------------------------------------------------------ */
/* Threaded comment component                                          */
/* ------------------------------------------------------------------ */

function ThreadedCommentItem({
  comment,
  depth = 0,
}: {
  comment: ThreadedComment;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={depth > 0 ? "ml-4 pl-3 border-l-2 border-gray-100" : ""}>
      <div className="py-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">@{comment.author || "unknown"}</span>
          {comment.created_at && <span>{fmtDateTime(comment.created_at)}</span>}
          {comment.likes > 0 && (
            <span className="font-medium text-gray-600">{fmtNum(comment.likes)} likes</span>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
          {comment.text}
        </p>
        {hasReplies && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            {expanded ? "Hide" : "Show"} {comment.replies.length}{" "}
            {comment.replies.length === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>
      {expanded && hasReplies && (
        <div>
          {comment.replies.map((reply) => (
            <ThreadedCommentItem
              key={reply.comment_id}
              comment={reply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post Stats Drawer                                                   */
/* ------------------------------------------------------------------ */

function PostStatsDrawer({
  showId,
  seasonNumber,
  seasonId,
  platform,
  sourceId,
  onClose,
}: {
  showId: string;
  seasonNumber: string;
  seasonId?: string | null;
  platform: string;
  sourceId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const fetchPostStats = useCallback(async (): Promise<PostDetailResponse> => {
    const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
    const params = new URLSearchParams();
    if (seasonId) {
      params.set("season_id", seasonId);
    }
    const url = `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/posts/${platform}/${sourceId}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    const res = await fetchWithTimeout(
      url,
      {
        headers,
        cache: "no-store",
      },
      REQUEST_TIMEOUT_MS.weekDetail,
      "Post detail request timed out",
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as Record<string, string>).error || `HTTP ${res.status}`,
      );
    }
    return await parseResponseJson<PostDetailResponse>(res, "Failed to load post detail");
  }, [seasonId, seasonNumber, showId, platform, sourceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchPostStats();
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPostStats]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleRefreshComments = useCallback(async () => {
    try {
      setRefreshing(true);
      setRefreshError(null);
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const params = new URLSearchParams();
      if (seasonId) {
        params.set("season_id", seasonId);
      }
      const url = `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/posts/${platform}/${sourceId}${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            max_comments_per_post: 100000,
            fetch_replies: true,
          }),
        },
        REQUEST_TIMEOUT_MS.weekDetail,
        "Post comments refresh request timed out",
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as Record<string, string>).error || `HTTP ${res.status}`);
      }
      setData(await parseResponseJson<PostDetailResponse>(res, "Failed to refresh post comments"));
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Failed to refresh comments");
    } finally {
      setRefreshing(false);
    }
  }, [seasonId, showId, seasonNumber, platform, sourceId]);

  const reportedCommentsCount = data
    ? getReportedCommentCountFromStats(data.platform, data.stats)
    : 0;
  const savedCommentsCount = data ? Math.max(0, Number(data.total_comments_in_db ?? 0)) : 0;
  const commentsIncomplete = isCommentsCoverageIncomplete(savedCommentsCount, reportedCommentsCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Post Stats</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshComments}
              disabled={refreshing}
              className="text-xs font-semibold tracking-wide px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {refreshing ? "Refreshing..." : "REFRESH"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="text-center text-gray-500 py-12">Loading all comments...</div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}
          {refreshError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">
              {refreshError}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Post info */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${PLATFORM_COLORS[data.platform] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {PLATFORM_LABELS[data.platform] ?? data.platform}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    @{data.author}
                  </span>
                  <span className="text-xs text-gray-500">{fmtDateTime(data.posted_at)}</span>
                </div>
                {data.thumbnail_url && (
                  <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.thumbnail_url}
                      alt={`${PLATFORM_LABELS[data.platform] ?? data.platform} post thumbnail`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                      className={`w-full ${
                        data.platform === "youtube"
                          ? "max-h-[360px] object-contain bg-black/5"
                          : "max-h-72 object-cover"
                      }`}
                    />
                  </div>
                )}
                {data.title && (
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{data.title}</h3>
                )}
                {data.text && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-3">
                    {data.text}
                  </p>
                )}
                {data.platform === "instagram" && (
                  <div className="mb-3 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {data.post_format && (
                        <span className="text-xs rounded bg-pink-50 px-1.5 py-0.5 text-pink-700">
                          {data.post_format.toUpperCase()}
                        </span>
                      )}
                      {typeof data.duration_seconds === "number" && data.duration_seconds > 0 && (
                        <span className="text-xs rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                          {data.duration_seconds}s
                        </span>
                      )}
                    </div>
                    {(data.profile_tags?.length || data.collaborators?.length) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(data.profile_tags ?? []).map((tag) => (
                          <span key={`profile-${tag}`} className="text-xs rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
                            {tag}
                          </span>
                        ))}
                        {(data.collaborators ?? []).map((collab) => (
                          <span key={`collab-${collab}`} className="text-xs rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                            {collab}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {(data.hashtags?.length || data.mentions?.length) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(data.hashtags ?? []).map((tag) => (
                          <span key={`hashtag-${tag}`} className="text-xs rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                            #{tag}
                          </span>
                        ))}
                        {(data.mentions ?? []).map((mention) => (
                          <span key={`mention-${mention}`} className="text-xs rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">
                            {mention}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
                {data.url && (
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    View on {PLATFORM_LABELS[data.platform] ?? data.platform} ↗
                  </a>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {Object.entries(data.stats).map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-gray-50 rounded-lg p-3 text-center"
                  >
                    <div className="text-lg font-bold text-gray-900">{fmtNum(value)}</div>
                    <div className="text-xs text-gray-500">{STAT_LABELS[key] ?? key}</div>
                  </div>
                ))}
              </div>

              {/* Comments section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  All Comments ({formatSavedVsActualComments(savedCommentsCount, reportedCommentsCount)}
                  {commentsIncomplete ? "*" : ""})
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  {commentsIncomplete
                    ? `Saved in Supabase: ${fmtNum(savedCommentsCount)} of ${fmtNum(reportedCommentsCount)} platform-reported comments. Use Full Sync + Mirror in Week view (or REFRESH here) to backfill.`
                    : `${fmtNum(savedCommentsCount)} comments saved in Supabase.`}
                </p>

                {data.comments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-4">No comments in database.</p>
                ) : (
                  <div className="space-y-1 divide-y divide-gray-100">
                    {data.comments.map((c) => (
                      <ThreadedCommentItem key={c.comment_id} comment={c} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Engagement row                                                      */
/* ------------------------------------------------------------------ */

function EngagementRow({ platform, post }: { platform: string; post: AnyPost }) {
  const items: { label: string; value: string }[] = [];
  const savedComments = getSavedCommentsForPost(post);
  const actualComments = getActualCommentsForPost(platform, post);
  const commentsCoverageIncomplete = isCommentsCoverageIncomplete(savedComments, actualComments);
  const commentsValue = `${formatSavedVsActualComments(savedComments, actualComments)}${
    commentsCoverageIncomplete ? "*" : ""
  }`;

  const pushMetric = (label: string, value: number) => {
    items.push({ label, value: fmtNum(value) });
  };

  if (platform === "instagram") {
    pushMetric("Likes", getNum(post, "likes"));
    items.push({ label: "Comments", value: commentsValue });
    pushMetric("Views", getNum(post, "views"));
  } else if (platform === "tiktok") {
    pushMetric("Likes", getNum(post, "likes"));
    items.push({ label: "Comments", value: commentsValue });
    pushMetric("Shares", getNum(post, "shares"));
    pushMetric("Views", getNum(post, "views"));
  } else if (platform === "youtube") {
    pushMetric("Views", getNum(post, "views"));
    pushMetric("Likes", getNum(post, "likes"));
    items.push({ label: "Comments", value: commentsValue });
  } else if (platform === "twitter") {
    pushMetric("Likes", getNum(post, "likes"));
    pushMetric("Retweets", getNum(post, "retweets"));
    items.push({ label: "Replies", value: commentsValue });
    pushMetric("Quotes", getNum(post, "quotes"));
    pushMetric("Views", getNum(post, "views"));
  }
  return (
    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
      {items.map((item) => (
        <span key={item.label}>
          <span className="font-medium text-gray-800">{item.value}</span>{" "}
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post card                                                           */
/* ------------------------------------------------------------------ */

function PostCard({
  platform,
  post,
  showId,
  seasonNumber,
  seasonId,
}: {
  platform: string;
  post: AnyPost;
  showId: string;
  seasonNumber: string;
  seasonId?: string | null;
}) {
  const [statsOpen, setStatsOpen] = useState(false);
  const hashtags = getStrArr(post, "hashtags");
  const mentions = getStrArr(post, "mentions");
  const profileTags = getStrArr(post, "profile_tags");
  const collaborators = getStrArr(post, "collaborators");
  const postFormat = getStr(post, "post_format");
  const durationSeconds = getNum(post, "duration_seconds");
  const actualComments = getActualCommentsForPost(platform, post);
  const savedComments = getSavedCommentsForPost(post);
  const commentsCoverageIncomplete = isCommentsCoverageIncomplete(savedComments, actualComments);
  const thumbnailUrl = getPostThumbnailUrl(platform, post);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${PLATFORM_COLORS[platform] ?? "bg-gray-100 text-gray-800"}`}
            >
              {PLATFORM_LABELS[platform] ?? platform}
            </span>
            <span className="text-sm font-medium text-gray-900">
              @{post.author || "unknown"}
            </span>
            {platform === "twitter" && getStr(post, "display_name") && (
              <span className="text-xs text-gray-500">{getStr(post, "display_name")}</span>
            )}
          </div>
          <span className="text-xs text-gray-500">{fmtDateTime(post.posted_at)}</span>
        </div>

        {/* Title (YouTube) */}
        {platform === "youtube" && getStr(post, "title") && (
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{getStr(post, "title")}</h3>
        )}

        {/* Thumbnail preview */}
        {thumbnailUrl && (
          <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={`${PLATFORM_LABELS[platform] ?? platform} post thumbnail`}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              className={`w-full ${
                platform === "youtube"
                  ? "max-h-[360px] object-contain bg-black/5"
                  : "h-44 object-cover"
              }`}
            />
          </div>
        )}

        {/* Post text */}
        {post.text && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-3 line-clamp-6">
            {post.text}
          </p>
        )}

        {/* Engagement metrics */}
        <EngagementRow platform={platform} post={post} />

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {hashtags.map((tag) => (
              <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Mentions / tagged accounts */}
        {mentions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {mentions.map((m) => (
              <span key={m} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                {m}
              </span>
            ))}
          </div>
        )}

        {platform === "instagram" &&
          (postFormat || durationSeconds > 0 || profileTags.length > 0 || collaborators.length > 0) && (
            <div className="mt-2 space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {postFormat && (
                  <span className="text-xs rounded bg-pink-50 px-1.5 py-0.5 text-pink-700">
                    {postFormat.toUpperCase()}
                  </span>
                )}
                {durationSeconds > 0 && (
                  <span className="text-xs rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                    {durationSeconds}s
                  </span>
                )}
              </div>
              {(profileTags.length > 0 || collaborators.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {profileTags.map((tag) => (
                    <span key={`profile-${tag}`} className="text-xs rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
                      {tag}
                    </span>
                  ))}
                  {collaborators.map((collab) => (
                    <span key={`collab-${collab}`} className="text-xs rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                      {collab}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

        {/* Actions row */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              >
                View on {PLATFORM_LABELS[platform] ?? platform} ↗
              </a>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              Post Stats
              {actualComments > 0 && (
                <span className="ml-1 opacity-70">
                  · {formatSavedVsActualComments(savedComments, actualComments)}
                  {commentsCoverageIncomplete ? "*" : ""} comments
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Post Stats Drawer */}
      {statsOpen && (
        <PostStatsDrawer
          showId={showId}
          seasonNumber={seasonNumber}
          seasonId={seasonId}
          platform={platform}
          sourceId={post.source_id}
          onClose={() => setStatsOpen(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function WeekDetailPage() {
  const { hasAccess: isAdmin, checking: authLoading } = useAdminGuard();
  const router = useRouter();
  const params = useParams<{ showId: string; seasonNumber: string; weekIndex: string }>();
  const searchParams = useSearchParams();
  const { showId: showRouteParam, seasonNumber, weekIndex } = params;
  const seasonNumberInt = Number.parseInt(seasonNumber, 10);
  const weekIndexInt = Number.parseInt(weekIndex, 10);
  const hasValidNumericPathParams =
    Number.isFinite(seasonNumberInt) &&
    seasonNumberInt > 0 &&
    Number.isFinite(weekIndexInt) &&
    weekIndexInt >= 0;
  const invalidPathParamsError = hasValidNumericPathParams
    ? null
    : "Invalid season/week URL. Season and week must be numeric values.";
  const [resolvedShowId, setResolvedShowId] = useState<string | null>(
    looksLikeUuid(showRouteParam) ? showRouteParam : null
  );
  const [slugResolutionLoading, setSlugResolutionLoading] = useState(
    !looksLikeUuid(showRouteParam)
  );
  const [slugResolutionError, setSlugResolutionError] = useState<string | null>(null);
  const showIdForApi = resolvedShowId ?? "";
  const showSlugForRouting = showRouteParam;
  const sourceScope: SourceScope = (() => {
    const raw = searchParams.get("source_scope") ?? searchParams.get("scope") ?? "bravo";
    if (raw === "creator" || raw === "community") return raw;
    return "bravo";
  })();
  const seasonIdHint = (() => {
    const raw = searchParams.get("season_id");
    if (!raw || !looksLikeUuid(raw)) return null;
    return raw;
  })();
  const socialPlatform = searchParams.get("social_platform");
  const socialView = searchParams.get("social_view");
  const dayParam = searchParams.get("day");
  const dayFilterFromQuery = dayParam && DATE_TOKEN_RE.test(dayParam) ? dayParam : null;
  const socialPlatformFilterFromQuery: PlatformFilter =
    socialPlatform === "instagram" || socialPlatform === "tiktok" || socialPlatform === "twitter" || socialPlatform === "youtube"
      ? socialPlatform
      : "all";

  const [data, setData] = useState<WeekDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [sortField, setSortField] = useState<SortField>("engagement");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchText, setSearchText] = useState("");
  const [syncingComments, setSyncingComments] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRunId, setSyncRunId] = useState<string | null>(null);
  const [syncRun, setSyncRun] = useState<SocialRun | null>(null);
  const [syncJobs, setSyncJobs] = useState<SocialJob[]>([]);
  const [syncPollError, setSyncPollError] = useState<string | null>(null);
  const [syncLastSuccessAt, setSyncLastSuccessAt] = useState<Date | null>(null);
  const [syncStartedAt, setSyncStartedAt] = useState<Date | null>(null);
  const [syncPass, setSyncPass] = useState(0);
  const [syncCoveragePreview, setSyncCoveragePreview] = useState<CommentsCoverageResponse | null>(null);
  const [syncMirrorCoveragePreview, setSyncMirrorCoveragePreview] = useState<MirrorCoverageResponse | null>(null);
  const [syncWorkerHealth, setSyncWorkerHealth] = useState<WorkerHealthPayload | null>(null);
  const syncPollGenerationRef = useRef(0);
  const syncPollFailureCountRef = useRef(0);
  const syncSessionGenerationRef = useRef(0);
  const syncSessionStateRef = useRef<{
    dateStart: string;
    dateEnd: string;
    platforms: Array<Exclude<PlatformFilter, "all">> | null;
    maxPasses: number;
    maxDurationMs: number;
    startedAtMs: number;
    pass: number;
  } | null>(null);
  const resolvedSeasonId = useMemo(() => {
    if (data?.season?.season_id && looksLikeUuid(data.season.season_id)) {
      return data.season.season_id;
    }
    return seasonIdHint;
  }, [data, seasonIdHint]);

  useEffect(() => {
    setPlatformFilter(socialPlatformFilterFromQuery);
  }, [socialPlatformFilterFromQuery]);

  const activeDayFilter = useMemo(() => {
    if (!dayFilterFromQuery || !data?.week) return null;
    const weekStartToken = toLocalDateToken(data.week.start);
    const weekEndToken = toLocalDateToken(data.week.end);
    if (!weekStartToken || !weekEndToken) return null;
    if (dayFilterFromQuery < weekStartToken || dayFilterFromQuery > weekEndToken) return null;
    return dayFilterFromQuery;
  }, [data, dayFilterFromQuery]);

  const recentShowLabel = useMemo(() => {
    const showName = data?.season.show_name?.trim();
    return showName || humanizeSlug(showSlugForRouting);
  }, [data?.season.show_name, showSlugForRouting]);

  useEffect(() => {
    if (!showSlugForRouting || !recentShowLabel) return;
    recordAdminRecentShow({
      slug: showSlugForRouting,
      label: recentShowLabel,
    });
  }, [recentShowLabel, showSlugForRouting]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    const raw = showRouteParam?.trim() ?? "";
    if (!raw) {
      setResolvedShowId(null);
      setSlugResolutionLoading(false);
      setSlugResolutionError("Missing show identifier.");
      return;
    }
    if (looksLikeUuid(raw)) {
      setResolvedShowId(raw);
      setSlugResolutionLoading(false);
      setSlugResolutionError(null);
      return;
    }

    let cancelled = false;
    const resolveSlug = async () => {
      setSlugResolutionLoading(true);
      setSlugResolutionError(null);
      try {
        const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
        const response = await fetch(
          `/api/admin/trr-api/shows/resolve-slug?slug=${encodeURIComponent(raw)}`,
          { headers, cache: "no-store" }
        );
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          resolved?: { show_id?: string | null };
        };
        if (!response.ok) throw new Error(data.error || "Failed to resolve show slug");
        const showId =
          typeof data.resolved?.show_id === "string" && looksLikeUuid(data.resolved.show_id)
            ? data.resolved.show_id
            : null;
        if (!showId) throw new Error("Resolved show slug did not return a valid show id.");
        if (cancelled) return;
        setResolvedShowId(showId);
      } catch (err) {
        if (cancelled) return;
        setResolvedShowId(null);
        setSlugResolutionError(err instanceof Error ? err.message : "Could not resolve show URL slug.");
      } finally {
        if (!cancelled) setSlugResolutionLoading(false);
      }
    };
    void resolveSlug();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin, showRouteParam]);

  const fetchData = useCallback(async () => {
    if (!showIdForApi || !seasonNumber || !weekIndex || !hasValidNumericPathParams) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const weekParams = new URLSearchParams({
        source_scope: sourceScope,
        timezone: SOCIAL_TIME_ZONE,
      });
      if (resolvedSeasonId) {
        weekParams.set("season_id", resolvedSeasonId);
      }
      const url = `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/week/${weekIndex}?${weekParams.toString()}`;
      const res = await fetchWithTimeout(
        url,
        {
          headers,
          cache: "no-store",
        },
        REQUEST_TIMEOUT_MS.weekDetail,
        "Week detail request timed out",
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as Record<string, string>).error || `HTTP ${res.status}`,
        );
      }
      setData(await parseResponseJson<WeekDetailResponse>(res, "Failed to load week detail"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load week detail");
    } finally {
      setLoading(false);
    }
  }, [hasValidNumericPathParams, resolvedSeasonId, showIdForApi, seasonNumber, sourceScope, weekIndex]);

  useEffect(() => {
    if (!hasValidNumericPathParams) {
      setLoading(false);
      setError(invalidPathParamsError);
      return;
    }
    if (isAdmin) fetchData();
  }, [fetchData, hasValidNumericPathParams, invalidPathParamsError, isAdmin]);

  useEffect(() => {
    return () => {
      syncSessionGenerationRef.current += 1;
      syncSessionStateRef.current = null;
    };
  }, []);

  const fetchSyncProgress = useCallback(
    async (
      runId: string,
      options?: { preserveLastGoodJobsIfEmpty?: boolean; preserveLastGoodRunIfMissing?: boolean },
    ) => {
      if (!hasValidNumericPathParams) {
        throw new Error(invalidPathParamsError ?? "Invalid season/week URL");
      }
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const runParams = new URLSearchParams({
        source_scope: sourceScope,
        run_id: runId,
        limit: "1",
      });
      if (resolvedSeasonId) {
        runParams.set("season_id", resolvedSeasonId);
      }
      const jobsParams = new URLSearchParams({
        run_id: runId,
        limit: "100",
      });
      if (resolvedSeasonId) {
        jobsParams.set("season_id", resolvedSeasonId);
      }
      const [runsResult, jobsResult] = await Promise.allSettled([
        fetchWithTimeout(
          `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/runs?${runParams.toString()}`,
          { headers, cache: "no-store" },
          REQUEST_TIMEOUT_MS.syncRuns,
          "Sync runs request timed out",
        ),
        fetchWithTimeout(
          `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/jobs?${jobsParams.toString()}`,
          { headers, cache: "no-store" },
          REQUEST_TIMEOUT_MS.syncJobs,
          "Sync jobs request timed out",
        ),
      ]);
      let runsError: string | null = null;
      let jobsError: string | null = null;
      let nextRun: SocialRun | null = null;
      let nextJobs: SocialJob[] = [];
      let runsLoaded = false;
      let jobsLoaded = false;

      if (runsResult.status === "fulfilled") {
        const runsResponse = runsResult.value;
        if (!runsResponse.ok) {
          const body = (await runsResponse.json().catch(() => ({}))) as { error?: string };
          runsError = body.error ?? "Failed to load sync runs";
        } else {
          const runsPayload = await parseResponseJson<{ runs?: SocialRun[] }>(
            runsResponse,
            "Failed to load sync runs",
          );
          nextRun = (runsPayload.runs ?? []).find((run) => run.id === runId) ?? null;
          runsLoaded = true;
        }
      } else {
        runsError = runsResult.reason instanceof Error ? runsResult.reason.message : "Failed to load sync runs";
      }

      if (jobsResult.status === "fulfilled") {
        const jobsResponse = jobsResult.value;
        if (!jobsResponse.ok) {
          const body = (await jobsResponse.json().catch(() => ({}))) as { error?: string };
          jobsError = body.error ?? "Failed to load sync jobs";
        } else {
          const jobsPayload = await parseResponseJson<{ jobs?: SocialJob[] }>(
            jobsResponse,
            "Failed to load sync jobs",
          );
          nextJobs = jobsPayload.jobs ?? [];
          jobsLoaded = true;
        }
      } else {
        jobsError = jobsResult.reason instanceof Error ? jobsResult.reason.message : "Failed to load sync jobs";
      }

      if (!runsLoaded && !jobsLoaded) {
        throw new Error(
          runsError && jobsError ? `${runsError}; ${jobsError}` : runsError ?? jobsError ?? "Failed to load sync progress",
        );
      }

      let effectiveRun: SocialRun | null = nextRun;
      let effectiveJobs = nextJobs;
      if (runsLoaded) {
        setSyncRun((current) => {
          const resolved =
            options?.preserveLastGoodRunIfMissing && !nextRun && current?.id === runId ? current : nextRun;
          effectiveRun = resolved;
          return resolved;
        });
      }
      if (jobsLoaded) {
        setSyncJobs((current) => {
          const resolved =
            options?.preserveLastGoodJobsIfEmpty && nextJobs.length === 0 && current.length > 0 ? current : nextJobs;
          effectiveJobs = resolved;
          return resolved;
        });
      }
      return { run: effectiveRun, jobs: effectiveJobs };
    },
    [hasValidNumericPathParams, invalidPathParamsError, resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const queueSyncPass = useCallback(
    async ({
      pass,
      dateStart,
      dateEnd,
      platforms,
    }: {
      pass: number;
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">> | null;
    }) => {
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const payload: {
        source_scope: SourceScope;
        platforms?: Array<Exclude<PlatformFilter, "all">>;
        max_posts_per_target: number;
        max_comments_per_post: number;
        max_replies_per_post: number;
        fetch_replies: boolean;
        ingest_mode: "posts_and_comments" | "comments_only";
        sync_strategy: "incremental";
        allow_inline_dev_fallback: boolean;
        date_start: string;
        date_end: string;
      } = {
        source_scope: sourceScope,
        max_posts_per_target: 100000,
        max_comments_per_post: 100000,
        max_replies_per_post: 100000,
        fetch_replies: true,
        ingest_mode: SOCIAL_FULL_SYNC_MIRROR_ENABLED ? "posts_and_comments" : "comments_only",
        sync_strategy: "incremental",
        allow_inline_dev_fallback: true,
        date_start: dateStart,
        date_end: dateEnd,
      };
      if (platforms && platforms.length > 0) {
        payload.platforms = platforms;
      }

      const ingestParams = new URLSearchParams();
      if (resolvedSeasonId) {
        ingestParams.set("season_id", resolvedSeasonId);
      }
      const response = await fetch(
        `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/ingest${ingestParams.toString() ? `?${ingestParams.toString()}` : ""}`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to start sync pass ${pass}`);
      }

      const result = (await response.json().catch(() => ({}))) as {
        run_id?: string;
        queued_or_started_jobs?: number;
      };
      const runId = typeof result.run_id === "string" ? result.run_id : null;
      const jobs = Number(result.queued_or_started_jobs ?? 0);
      if (!runId) {
        throw new Error(`Sync pass ${pass} started without a run id`);
      }
      setSyncRunId(runId);
      setSyncRun(null);
      setSyncJobs([]);
      syncPollFailureCountRef.current = 0;
      setSyncPass(pass);
      void fetchSyncProgress(runId).catch(() => {});
      return { runId, jobs };
    },
    [fetchSyncProgress, resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const fetchCommentsCoverage = useCallback(
    async ({
      dateStart,
      dateEnd,
      platforms,
    }: {
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">> | null;
    }) => {
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const coverageParams = new URLSearchParams({
        source_scope: sourceScope,
        timezone: SOCIAL_TIME_ZONE,
        date_start: dateStart,
        date_end: dateEnd,
      });
      if (platforms && platforms.length > 0) {
        coverageParams.set("platforms", platforms.join(","));
      }
      if (resolvedSeasonId) {
        coverageParams.set("season_id", resolvedSeasonId);
      }
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/comments-coverage?${coverageParams.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.commentsCoverage,
        "Comments coverage request timed out",
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to fetch comments coverage");
      }
      return await parseResponseJson<CommentsCoverageResponse>(response, "Failed to fetch comments coverage");
    },
    [resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const fetchMirrorCoverage = useCallback(
    async ({
      dateStart,
      dateEnd,
      platforms,
    }: {
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">> | null;
    }) => {
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const coverageParams = new URLSearchParams({
        source_scope: sourceScope,
        timezone: SOCIAL_TIME_ZONE,
        date_start: dateStart,
        date_end: dateEnd,
      });
      if (platforms && platforms.length > 0) {
        coverageParams.set("platforms", platforms.join(","));
      }
      if (resolvedSeasonId) {
        coverageParams.set("season_id", resolvedSeasonId);
      }
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/mirror-coverage?${coverageParams.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.mirrorCoverage,
        "Mirror coverage request timed out",
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to fetch mirror coverage");
      }
      return await parseResponseJson<MirrorCoverageResponse>(response, "Failed to fetch mirror coverage");
    },
    [resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const requeueMirrorJobs = useCallback(
    async ({
      dateStart,
      dateEnd,
      platforms,
    }: {
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">>;
    }) => {
      if (platforms.length === 0) {
        return { queuedJobs: 0, failed: 0 };
      }
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      let queuedJobs = 0;
      let failed = 0;
      for (const platform of platforms) {
        const params = new URLSearchParams({
          platform,
          source_scope: sourceScope,
          failed_only: "false",
          date_start: dateStart,
          date_end: dateEnd,
        });
        if (resolvedSeasonId) {
          params.set("season_id", resolvedSeasonId);
        }
        const response = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/mirror/requeue?${params.toString()}`,
          {
            method: "POST",
            headers,
          },
          REQUEST_TIMEOUT_MS.mirrorCoverage,
          "Mirror requeue request timed out",
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to requeue mirror jobs for ${platform}`);
        }
        const payload = (await response.json().catch(() => ({}))) as {
          queued_jobs?: unknown;
          failed?: unknown;
        };
        queuedJobs += Number(payload.queued_jobs ?? 0) || 0;
        failed += Number(payload.failed ?? 0) || 0;
      }
      return { queuedJobs, failed };
    },
    [resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const fetchSyncWorkerHealth = useCallback(async () => {
    const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
    const params = new URLSearchParams();
    if (resolvedSeasonId) {
      params.set("season_id", resolvedSeasonId);
    }
    const response = await fetchWithTimeout(
      `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/ingest/worker-health${params.toString() ? `?${params.toString()}` : ""}`,
      { headers, cache: "no-store" },
      REQUEST_TIMEOUT_MS.workerHealth,
      "Social worker health request timed out",
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Failed to fetch social worker health");
    }
    return await parseResponseJson<WorkerHealthPayload>(response, "Failed to fetch social worker health");
  }, [resolvedSeasonId, seasonNumber, showIdForApi]);

  const syncAllCommentsForWeek = useCallback(async () => {
    if (!data) return;
    const generation = ++syncSessionGenerationRef.current;
    try {
      setSyncingComments(true);
      setSyncError(null);
      setSyncPollError(null);
      setSyncMessage(null);
      setSyncCoveragePreview(null);
      setSyncMirrorCoveragePreview(null);
      if (!hasValidNumericPathParams) {
        throw new Error(invalidPathParamsError ?? "Invalid season/week URL");
      }

      const selectedPlatforms: Array<Exclude<PlatformFilter, "all">> | null =
        platformFilter === "all" ? null : [platformFilter];

      syncSessionStateRef.current = {
        dateStart: data.week.start,
        dateEnd: data.week.end,
        platforms: selectedPlatforms,
        maxPasses: COMMENT_SYNC_MAX_PASSES,
        maxDurationMs: COMMENT_SYNC_MAX_DURATION_MS,
        startedAtMs: Date.now(),
        pass: 1,
      };

      const platformLabel = platformFilter === "all" ? "all platforms" : PLATFORM_LABELS[platformFilter];
      const weekLabel = data.week.label || (data.week.week_index === 0 ? "Pre-Season" : `Week ${data.week.week_index}`);
      let localSavedComments = 0;
      let localReportedComments = 0;
      const platformEntries =
        platformFilter === "all"
          ? Object.entries(data.platforms)
          : [[platformFilter, data.platforms[platformFilter]] as [string, PlatformData | undefined]];
      for (const [platform, platformData] of platformEntries) {
        if (!platformData) continue;
        for (const post of platformData.posts) {
          localSavedComments += getSavedCommentsForPost(post);
          localReportedComments += getActualCommentsForPost(platform, post);
        }
      }
      if (!SOCIAL_FULL_SYNC_MIRROR_ENABLED && !isCommentsCoverageIncomplete(localSavedComments, localReportedComments)) {
        setSyncMessage(`${weekLabel} (${platformLabel}) is already up to date.`);
        setSyncingComments(false);
        syncSessionStateRef.current = null;
        return;
      }
      setSyncStartedAt(new Date(syncSessionStateRef.current.startedAtMs));
      setSyncPass(1);
      try {
        const health = await fetchSyncWorkerHealth();
        if (generation === syncSessionGenerationRef.current) {
          setSyncWorkerHealth(health);
        }
      } catch {
        if (generation === syncSessionGenerationRef.current) {
          setSyncWorkerHealth(null);
        }
      }
      const kickoff = await queueSyncPass({
        pass: 1,
        dateStart: data.week.start,
        dateEnd: data.week.end,
        platforms: selectedPlatforms,
      });
      if (generation !== syncSessionGenerationRef.current) return;
      setSyncMessage(
        `Pass 1/${COMMENT_SYNC_MAX_PASSES} queued for ${weekLabel} (${platformLabel}) · run ${kickoff.runId.slice(0, 8)} · ${kickoff.jobs} job(s) · ${
          SOCIAL_FULL_SYNC_MIRROR_ENABLED ? "Full Sync + Mirror started." : "Comment sync started."
        }`,
      );
    } catch (err) {
      setSyncError(
        err instanceof Error
          ? err.message
          : SOCIAL_FULL_SYNC_MIRROR_ENABLED
            ? "Failed to run full sync + mirror"
            : "Failed to sync comments",
      );
      setSyncingComments(false);
      syncSessionStateRef.current = null;
    }
  }, [
    data,
    fetchSyncWorkerHealth,
    hasValidNumericPathParams,
    invalidPathParamsError,
    platformFilter,
    queueSyncPass,
  ]);

  useEffect(() => {
    if (!syncRunId || !syncingComments) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const generation = ++syncPollGenerationRef.current;

    const nextPollDelayMs = (failureCount: number): number => {
      const index = Math.min(failureCount, SYNC_POLL_BACKOFF_MS.length - 1);
      return SYNC_POLL_BACKOFF_MS[index];
    };

    const poll = async () => {
      if (cancelled || generation !== syncPollGenerationRef.current) return;
      try {
        const snapshot = await fetchSyncProgress(syncRunId, {
          preserveLastGoodJobsIfEmpty: true,
          preserveLastGoodRunIfMissing: true,
        });
        if (cancelled || generation !== syncPollGenerationRef.current) return;
        syncPollFailureCountRef.current = 0;
        setSyncPollError(null);
        setSyncLastSuccessAt(new Date());
        const currentRun = snapshot.run;
        if (currentRun && TERMINAL_RUN_STATUSES.has(currentRun.status)) {
          const session = syncSessionStateRef.current;
          const summary = currentRun.summary ?? {};
          const completedJobs = Number(summary.completed_jobs ?? 0);
          const failedJobs = Number(summary.failed_jobs ?? 0);
          const totalJobs = Math.max(Number(summary.total_jobs ?? 0), completedJobs + failedJobs);
          const totalItems = Number(summary.items_found_total ?? 0);
          const elapsed = syncStartedAt ? ` in ${Math.round((Date.now() - syncStartedAt.getTime()) / 1000)}s` : "";
          const finalVerb =
            currentRun.status === "cancelled"
              ? "cancelled"
              : currentRun.status === "failed"
                ? "failed"
                : "complete";
          let terminalMessage = `Pass ${session?.pass ?? 1}/${session?.maxPasses ?? COMMENT_SYNC_MAX_PASSES} ingest ${finalVerb}${elapsed}: ${completedJobs} job(s) finished`;
          if (totalJobs > 0) {
            terminalMessage += ` of ${totalJobs}`;
          }
          terminalMessage += `, ${totalItems.toLocaleString()} scraped`;
          if (failedJobs > 0) {
            terminalMessage += ` · ${failedJobs} failed`;
          }

          if (!session || currentRun.status === "cancelled") {
            setSyncMessage(terminalMessage);
            setSyncingComments(false);
            syncSessionStateRef.current = null;
            void fetchData();
            return;
          }

          const coverage = await fetchCommentsCoverage({
            dateStart: session.dateStart,
            dateEnd: session.dateEnd,
            platforms: session.platforms,
          });
          const mirrorCoverage = SOCIAL_FULL_SYNC_MIRROR_ENABLED
            ? await fetchMirrorCoverage({
                dateStart: session.dateStart,
                dateEnd: session.dateEnd,
                platforms: session.platforms,
              })
            : {
                up_to_date: true,
                needs_mirror_count: 0,
                mirrored_count: 0,
                failed_count: 0,
                partial_count: 0,
                pending_count: 0,
                posts_scanned: 0,
              };
          if (cancelled || generation !== syncPollGenerationRef.current) return;
          setSyncCoveragePreview(coverage);
          setSyncMirrorCoveragePreview(SOCIAL_FULL_SYNC_MIRROR_ENABLED ? mirrorCoverage : null);

          const coverageSaved = Number(coverage.total_saved_comments ?? 0);
          const coverageReported = Number(coverage.total_reported_comments ?? 0);
          const coverageLabel = formatCoverageLabel(coverageSaved, coverageReported);
          const mirrorTotal = Number(mirrorCoverage.posts_scanned ?? 0);
          const mirrorNeeds = Number(mirrorCoverage.needs_mirror_count ?? 0);
          const mirrorReadyCount = Math.max(0, mirrorTotal - mirrorNeeds);
          const mirrorLabel = formatMirrorCoverageLabel(mirrorReadyCount, mirrorTotal);

          const strictRunSuccess = currentRun.status === "completed" && failedJobs === 0;
          const mirrorIsReady = !SOCIAL_FULL_SYNC_MIRROR_ENABLED || mirrorCoverage.up_to_date;
          if (coverage.up_to_date && mirrorIsReady && strictRunSuccess) {
            const mirrorToken = SOCIAL_FULL_SYNC_MIRROR_ENABLED ? ` · Mirror ${mirrorLabel}` : "";
            setSyncMessage(`${terminalMessage} · Coverage ${coverageLabel}${mirrorToken} · Up-to-Date.`);
            setSyncingComments(false);
            syncSessionStateRef.current = null;
            void fetchData();
            return;
          }

          const elapsedMs = Date.now() - session.startedAtMs;
          const nextPass = session.pass + 1;
          const withinGuardrail = nextPass <= session.maxPasses && elapsedMs < session.maxDurationMs;
          if (!withinGuardrail) {
            setSyncMessage(
              SOCIAL_FULL_SYNC_MIRROR_ENABLED
                ? `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Incomplete (guardrail reached after ${session.pass}/${session.maxPasses} passes; pending=${mirrorCoverage.pending_count ?? 0}, failed=${mirrorCoverage.failed_count ?? 0}).`
                : `${terminalMessage} · Coverage ${coverageLabel} · Stalled (guardrail reached after ${session.pass}/${session.maxPasses} passes).`,
            );
            setSyncingComments(false);
            syncSessionStateRef.current = null;
            void fetchData();
            return;
          }

          const staleCommentPlatforms = Object.entries(coverage.by_platform ?? {})
            .filter(([, value]) => !value.up_to_date)
            .map(([platform]) => platform)
            .filter((platform): platform is Exclude<PlatformFilter, "all"> =>
              platform === "instagram" || platform === "tiktok" || platform === "twitter" || platform === "youtube",
            );
          const staleMirrorPlatforms = Object.entries(mirrorCoverage.by_platform ?? {})
            .filter(([, value]) => !value.up_to_date || Number(value.needs_mirror_count ?? 0) > 0)
            .map(([platform]) => platform)
            .filter((platform): platform is Exclude<PlatformFilter, "all"> =>
              platform === "instagram" || platform === "tiktok" || platform === "twitter" || platform === "youtube",
            );
          const mergedStalePlatforms = Array.from(new Set([...staleCommentPlatforms, ...staleMirrorPlatforms]));
          if (SOCIAL_FULL_SYNC_MIRROR_ENABLED && staleMirrorPlatforms.length > 0) {
            const requeueResult = await requeueMirrorJobs({
              dateStart: session.dateStart,
              dateEnd: session.dateEnd,
              platforms: staleMirrorPlatforms,
            });
            if (cancelled || generation !== syncPollGenerationRef.current) return;
            setSyncMessage(
              `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Requeued ${requeueResult.queuedJobs} mirror job(s) for ${staleMirrorPlatforms.length} platform(s).`,
            );
          }

          session.pass = nextPass;
          session.platforms = mergedStalePlatforms.length > 0 ? mergedStalePlatforms : session.platforms;
          setSyncPass(session.pass);
          setSyncMessage(
            SOCIAL_FULL_SYNC_MIRROR_ENABLED
              ? `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Auto-continuing pass ${session.pass}/${session.maxPasses}...`
              : `${terminalMessage} · Coverage ${coverageLabel} · Auto-continuing pass ${session.pass}/${session.maxPasses}...`,
          );

          const kickoff = await queueSyncPass({
            pass: session.pass,
            dateStart: session.dateStart,
            dateEnd: session.dateEnd,
            platforms: session.platforms,
          });
          if (cancelled || generation !== syncPollGenerationRef.current) return;
          setSyncMessage(
            SOCIAL_FULL_SYNC_MIRROR_ENABLED
              ? `Pass ${session.pass}/${session.maxPasses} queued · run ${kickoff.runId.slice(0, 8)} · ${kickoff.jobs} job(s) · Coverage ${coverageLabel} · Mirror ${mirrorLabel}.`
              : `Pass ${session.pass}/${session.maxPasses} queued · run ${kickoff.runId.slice(0, 8)} · ${kickoff.jobs} job(s) · Coverage ${coverageLabel}.`,
          );
          return;
        }
      } catch (err) {
        if (cancelled || generation !== syncPollGenerationRef.current) return;
        const message = err instanceof Error ? err.message : "Failed to refresh sync progress";
        if (isTransientDevRestartMessage(message)) {
          syncPollFailureCountRef.current = Math.max(1, syncPollFailureCountRef.current);
        } else {
          syncPollFailureCountRef.current += 1;
        }
        if (syncPollFailureCountRef.current >= 2 && !isTransientDevRestartMessage(message)) {
          setSyncPollError(message);
        }
      }

      if (cancelled || generation !== syncPollGenerationRef.current) return;
      const delayMs = nextPollDelayMs(syncPollFailureCountRef.current);
      timeoutId = setTimeout(() => {
        void poll();
      }, delayMs);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    fetchCommentsCoverage,
    fetchData,
    fetchMirrorCoverage,
    fetchSyncProgress,
    queueSyncPass,
    requeueMirrorJobs,
    syncRunId,
    syncStartedAt,
    syncingComments,
  ]);

  useEffect(() => {
    if (!syncingComments && syncPass !== 0) {
      setSyncPass(0);
    }
  }, [syncPass, syncingComments]);

  useEffect(() => {
    if (!syncingComments) {
      syncSessionStateRef.current = null;
    }
  }, [syncingComments]);

  // Build merged post list with sort + search
  const allPosts = useMemo(() => {
    if (!data) return [];
    const entries: { platform: string; post: AnyPost }[] = [];
    const needle = searchText.trim().toLowerCase();
    for (const [plat, pdata] of Object.entries(data.platforms)) {
      if (platformFilter !== "all" && plat !== platformFilter) continue;
      for (const post of pdata.posts) {
        if (activeDayFilter) {
          const postDayToken = toLocalDateToken(post.posted_at);
          if (!postDayToken || postDayToken !== activeDayFilter) {
            continue;
          }
        }
        if (needle) {
          const text = (post.text ?? "").toLowerCase();
          const author = (post.author ?? "").toLowerCase();
          const title = getStr(post, "title").toLowerCase();
          if (!text.includes(needle) && !author.includes(needle) && !title.includes(needle)) {
            continue;
          }
        }
        entries.push({ platform: plat, post });
      }
    }
    const dir = sortDir === "desc" ? -1 : 1;
    if (sortField === "posted_at") {
      entries.sort((a, b) => {
        const ta = a.post.posted_at ? new Date(a.post.posted_at).getTime() : 0;
        const tb = b.post.posted_at ? new Date(b.post.posted_at).getTime() : 0;
        return (ta - tb) * dir;
      });
    } else {
      entries.sort((a, b) => {
        const va = getNum(a.post, sortField);
        const vb = getNum(b.post, sortField);
        return (va - vb) * dir;
      });
    }
    return entries;
  }, [activeDayFilter, data, platformFilter, sortField, sortDir, searchText]);

  // Filtered totals
  const filteredTotals = useMemo(() => {
    if (!data) return { posts: 0, total_comments: 0, total_engagement: 0 };
    if (activeDayFilter) {
      let posts = 0;
      let totalComments = 0;
      let totalEngagement = 0;
      const platformEntries =
        platformFilter === "all"
          ? Object.entries(data.platforms)
          : [[platformFilter, data.platforms[platformFilter]] as [string, PlatformData | undefined]];
      for (const [platform, platformData] of platformEntries) {
        if (!platformData) continue;
        for (const post of platformData.posts) {
          const postDayToken = toLocalDateToken(post.posted_at);
          if (!postDayToken || postDayToken !== activeDayFilter) continue;
          posts += 1;
          totalComments += getActualCommentsForPost(platform, post);
          totalEngagement += Number(post.engagement ?? 0);
        }
      }
      return { posts, total_comments: totalComments, total_engagement: totalEngagement };
    }
    if (platformFilter === "all") {
      return {
        posts: data.totals.posts,
        total_comments: data.totals.total_comments,
        total_engagement: data.totals.total_engagement,
      };
    }
    const pd = data.platforms[platformFilter];
    return pd?.totals
      ? { posts: pd.totals.posts, total_comments: pd.totals.total_comments, total_engagement: pd.totals.total_engagement }
      : { posts: 0, total_comments: 0, total_engagement: 0 };
  }, [activeDayFilter, data, platformFilter]);

  const filteredCommentCoverage = useMemo(() => {
    if (!data) return { saved: 0, actual: 0, incomplete: false };
    let saved = 0;
    let actual = 0;
    const platformEntries =
      platformFilter === "all"
        ? Object.entries(data.platforms)
        : [[platformFilter, data.platforms[platformFilter]] as [string, PlatformData | undefined]];
    for (const [platform, platformData] of platformEntries) {
      if (!platformData) continue;
      for (const post of platformData.posts) {
        if (activeDayFilter) {
          const postDayToken = toLocalDateToken(post.posted_at);
          if (!postDayToken || postDayToken !== activeDayFilter) continue;
        }
        saved += getSavedCommentsForPost(post);
        actual += getActualCommentsForPost(platform, post);
      }
    }
    return {
      saved,
      actual,
      incomplete: isCommentsCoverageIncomplete(saved, actual),
    };
  }, [activeDayFilter, data, platformFilter]);

  const commentsSavedPct = useMemo(() => {
    const effectiveCoverage =
      syncingComments && syncCoveragePreview
        ? {
            saved: Number(syncCoveragePreview.total_saved_comments ?? 0),
            actual: Number(syncCoveragePreview.total_reported_comments ?? 0),
            incomplete: !Boolean(syncCoveragePreview.up_to_date),
          }
        : filteredCommentCoverage;
    if (effectiveCoverage.actual <= 0) return 100;
    const ratio = (effectiveCoverage.saved / effectiveCoverage.actual) * 100;
    return Math.max(0, Math.min(100, ratio));
  }, [filteredCommentCoverage, syncCoveragePreview, syncingComments]);

  const displayedCommentCoverage = useMemo(() => {
    if (syncingComments && syncCoveragePreview) {
      const saved = Number(syncCoveragePreview.total_saved_comments ?? 0);
      const actual = Number(syncCoveragePreview.total_reported_comments ?? 0);
      return {
        saved,
        actual,
        incomplete: isCommentsCoverageIncomplete(saved, actual),
      };
    }
    return filteredCommentCoverage;
  }, [filteredCommentCoverage, syncCoveragePreview, syncingComments]);

  const syncProgress = useMemo(() => {
    const summary = syncRun?.summary ?? {};
    const fallbackCompleted = syncJobs.filter((job) => job.status === "completed").length;
    const fallbackFailed = syncJobs.filter((job) => job.status === "failed").length;
    const fallbackActive = syncJobs.filter((job) => ACTIVE_RUN_STATUSES.has(job.status)).length;
    const fallbackTotal = syncJobs.length;
    const fallbackItems = syncJobs.reduce((sum, job) => sum + Number(job.items_found ?? 0), 0);
    const completed = Number(summary.completed_jobs ?? fallbackCompleted);
    const failed = Number(summary.failed_jobs ?? fallbackFailed);
    const total = Number(summary.total_jobs ?? fallbackTotal);
    const active = Number(summary.active_jobs ?? fallbackActive);
    const items = Number(summary.items_found_total ?? fallbackItems);
    const finished = completed + failed;
    const pct = total > 0 ? Math.round((finished / total) * 100) : syncingComments ? 5 : 100;
    return {
      completed,
      failed,
      total,
      active,
      items,
      finished,
      pct: Math.max(0, Math.min(100, pct)),
    };
  }, [syncJobs, syncRun, syncingComments]);

  const syncStageProgress = useMemo(() => {
    const fromSummary = syncRun?.summary?.stage_counts ?? {};
    const parseStage = (stageName: string) => {
      const stage = fromSummary[stageName] ?? {};
      return {
        total: Number(stage.total ?? 0),
        completed: Number(stage.completed ?? 0),
        failed: Number(stage.failed ?? 0),
        active: Number(stage.active ?? 0),
        scraped: 0,
        saved: 0,
      };
    };
    let posts = parseStage("posts");
    let comments = parseStage("comments");
    let mediaMirror = parseStage("media_mirror");
    const fallback = {
      posts: { total: 0, completed: 0, failed: 0, active: 0, scraped: 0, saved: 0 },
      comments: { total: 0, completed: 0, failed: 0, active: 0, scraped: 0, saved: 0 },
      mediaMirror: { total: 0, completed: 0, failed: 0, active: 0, scraped: 0, saved: 0 },
    };
    for (const job of syncJobs) {
      const stageName = getJobStage(job);
      const stage =
        stageName === "comments"
          ? "comments"
          : stageName === "media_mirror"
            ? "mediaMirror"
            : "posts";
      const current = fallback[stage];
      current.total += 1;
      if (job.status === "completed") current.completed += 1;
      else if (job.status === "failed") current.failed += 1;
      else if (ACTIVE_RUN_STATUSES.has(job.status)) current.active += 1;

      const stageCounters = getJobStageCounters(job);
      if (stageCounters) {
        current.scraped += stageCounters.posts + stageCounters.comments;
      } else {
        current.scraped += Number(job.items_found ?? 0);
      }

      const persistCounters = getJobPersistCounters(job);
      if (persistCounters) {
        current.saved += persistCounters.posts_upserted + persistCounters.comments_upserted;
      }
    }
    if (posts.total === 0 && comments.total === 0 && mediaMirror.total === 0) {
      posts = fallback.posts;
      comments = fallback.comments;
      mediaMirror = fallback.mediaMirror;
    } else {
      posts.scraped = fallback.posts.scraped;
      posts.saved = fallback.posts.saved;
      comments.scraped = fallback.comments.scraped;
      comments.saved = fallback.comments.saved;
      mediaMirror.scraped = fallback.mediaMirror.scraped;
      mediaMirror.saved = fallback.mediaMirror.saved;
    }
    return { posts, comments, mediaMirror };
  }, [syncJobs, syncRun?.summary?.stage_counts]);

  const syncLogs = useMemo(() => {
    return [...syncJobs]
      .sort((a, b) => {
        const aTs = Date.parse(a.completed_at ?? a.started_at ?? a.created_at ?? "");
        const bTs = Date.parse(b.completed_at ?? b.started_at ?? b.created_at ?? "");
        return (Number.isNaN(bTs) ? 0 : bTs) - (Number.isNaN(aTs) ? 0 : aTs);
      })
      .slice(0, 10)
      .map((job) => {
        const stageName = getJobStage(job);
        const stage = stageName === "comments" ? "comments" : stageName === "media_mirror" ? "media_mirror" : "posts";
        const platform = PLATFORM_LABELS[job.platform] ?? job.platform;
        const account =
          typeof job.config?.account === "string" && job.config.account ? ` @${job.config.account}` : "";
        const timestampRaw = job.completed_at ?? job.started_at ?? job.created_at ?? null;
        const timestamp = timestampRaw
          ? new Date(timestampRaw).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone: SOCIAL_TIME_ZONE,
            })
          : "--:--";
        const counters = getJobStageCounters(job);
        const persistCounters = getJobPersistCounters(job);
        const activitySummary = getJobActivitySummary(job);
        const retrievalMeta = (job.metadata as Record<string, unknown> | undefined)?.retrieval_meta as
          | Record<string, unknown>
          | undefined;
        const refreshDecisions = retrievalMeta?.comment_refresh_decisions as Record<string, unknown> | undefined;
        const upToDateCount =
          refreshDecisions && typeof refreshDecisions.up_to_date === "number" ? Number(refreshDecisions.up_to_date) : 0;
        const countersLabel = counters ? ` · ${counters.posts}p/${counters.comments}c` : "";
        const persistLabel = persistCounters
          ? ` · saved ${persistCounters.posts_upserted}p/${persistCounters.comments_upserted}c`
          : "";
        const activityLabel = activitySummary ? ` · ${activitySummary}` : "";
        const skippedLabel = upToDateCount > 0 ? ` · ${upToDateCount} up-to-date skipped` : "";
        const itemsLabel =
          !counters && typeof job.items_found === "number" ? ` · ${job.items_found.toLocaleString()} items` : "";
        const errorLabel = job.status === "failed" && job.error_message ? ` · ${job.error_message}` : "";
        return {
          id: job.id,
          line: `${timestamp} · ${platform}${account} ${stage} ${job.status}${countersLabel}${itemsLabel}${persistLabel}${activityLabel}${skippedLabel}${errorLabel}`,
        };
      });
  }, [syncJobs]);

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Checking access...
      </div>
    );
  }

  if (slugResolutionError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {slugResolutionError}
        </div>
      </div>
    );
  }

  if (slugResolutionLoading || !showIdForApi) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Resolving show URL...
      </div>
    );
  }

  const breadcrumbShowName = recentShowLabel;
  const breadcrumbWeekLabel = data?.week.label?.trim() || `Week ${weekIndexInt}`;
  const breadcrumbShowHref = buildShowAdminUrl({ showSlug: showSlugForRouting });
  const breadcrumbQuery = (() => {
    const query = new URLSearchParams({ source_scope: sourceScope });
    if (socialPlatform) query.set("social_platform", socialPlatform);
    if (socialView) query.set("social_view", socialView);
    if (resolvedSeasonId) query.set("season_id", resolvedSeasonId);
    return query;
  })();
  const breadcrumbSeasonHref = buildSeasonAdminUrl({
    showSlug: showSlugForRouting,
    seasonNumber,
  });
  const breadcrumbSocialHref = buildSeasonAdminUrl({
    showSlug: showSlugForRouting,
    seasonNumber,
    tab: "social",
    query: breadcrumbQuery,
  });
  const breadcrumbWeekHref = buildSeasonSocialWeekUrl({
    showSlug: showSlugForRouting,
    seasonNumber,
    weekIndex: weekIndexInt,
    query: breadcrumbQuery,
  });
  const breadcrumbSubTabLabel = socialView
    ? `${humanizeSlug(socialView)} Analytics`
    : socialPlatform
      ? PLATFORM_LABELS[socialPlatform] ?? humanizeSlug(socialPlatform)
      : undefined;

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminGlobalHeader bodyClassName="px-6 py-5">
        <div className="mx-auto max-w-6xl">
          <AdminBreadcrumbs
            items={buildSeasonWeekBreadcrumb(breadcrumbShowName, seasonNumber, breadcrumbWeekLabel, {
              showHref: breadcrumbShowHref,
              seasonHref: breadcrumbSeasonHref,
              socialHref: breadcrumbSocialHref,
              subTabLabel: breadcrumbSubTabLabel,
              subTabHref: breadcrumbSocialHref,
              weekHref: breadcrumbWeekHref,
            })}
            className="mb-2"
          />
          <Link
            href={buildSeasonAdminUrl({
              showSlug: showSlugForRouting,
              seasonNumber,
              tab: "social",
              query: (() => {
                const query = new URLSearchParams({ source_scope: sourceScope });
                if (socialPlatform) query.set("social_platform", socialPlatform);
                if (socialView) query.set("social_view", socialView);
                if (resolvedSeasonId) query.set("season_id", resolvedSeasonId);
                return query;
              })(),
            }) as Route}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back to Season Social Analytics
          </Link>

          {data && (
            <div className="mt-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {data.week.label}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {data.season.show_name} — Season {data.season.season_number} ·{" "}
                {fmtDate(data.week.start)} – {fmtDate(data.week.end)}
              </p>
            </div>
          )}
        </div>
      </AdminGlobalHeader>

      <main className="mx-auto max-w-6xl px-4 py-6">

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center h-40 text-gray-500">
          Loading week detail...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {activeDayFilter && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              <span className="font-semibold">
                Day filter: {toDayFilterLabel(activeDayFilter) ?? activeDayFilter}
              </span>
              <span className="text-xs text-zinc-500">
                Showing posts captured on this local day only.
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextQuery = new URLSearchParams(searchParams.toString());
                  nextQuery.delete("day");
                  router.replace(
                    buildSeasonSocialWeekUrl({
                      showSlug: showSlugForRouting,
                      seasonNumber,
                      weekIndex: weekIndexInt,
                      query: nextQuery,
                    }) as Route,
                    { scroll: false },
                  );
                }}
                className="ml-auto rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Clear day filter
              </button>
            </div>
          )}

          {/* Platform filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PLATFORM_FILTERS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPlatformFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  platformFilter === tab.key
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
                {tab.key !== "all" && data.platforms[tab.key] && (
                  <span className="ml-1 text-xs opacity-70">
                    ({data.platforms[tab.key].totals.posts})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort & search controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Sort field */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="sort-field" className="text-xs font-medium text-gray-500">
                Sort by
              </label>
              <select
                id="sort-field"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort direction toggle */}
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={sortDir === "desc" ? "Highest first" : "Lowest first"}
            >
              {sortDir === "desc" ? "↓ High to Low" : "↑ Low to High"}
            </button>

            {/* Text search */}
            <div className="flex-1 min-w-[180px]">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                void fetchData();
              }}
              disabled={loading || syncingComments}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                void syncAllCommentsForWeek();
              }}
              disabled={syncingComments}
              className="text-sm rounded-md px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncingComments
                ? "Syncing..."
                : platformFilter === "all"
                  ? SOCIAL_FULL_SYNC_MIRROR_ENABLED
                    ? "Full Sync + Mirror"
                    : "Sync All Comments"
                  : SOCIAL_FULL_SYNC_MIRROR_ENABLED
                    ? `Full Sync ${PLATFORM_LABELS[platformFilter]} + Mirror`
                    : `Sync ${PLATFORM_LABELS[platformFilter]} Comments`}
            </button>

            {/* Result count */}
            <span className="text-xs text-gray-500">
              {allPosts.length} {allPosts.length === 1 ? "post" : "posts"}
            </span>
          </div>

          {(syncMessage || syncError) && (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                syncError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {syncError ?? syncMessage}
            </div>
          )}

          {(syncRun || syncingComments) && (
            <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Sync Progress</h3>
                  <p className="text-xs text-gray-500">
                    {syncRunId
                      ? `Run ${syncRunId.slice(0, 8)} · ${
                          syncRun ? formatRunStatus(syncRun.status) : syncingComments ? "Running" : "Unknown"
                        }`
                      : "Preparing run"}
                  </p>
                  {syncWorkerHealth && (
                    <p className="mt-1 text-xs text-gray-500">
                      Workers:{" "}
                      {syncWorkerHealth.queue_enabled
                        ? `${syncWorkerHealth.healthy_workers ?? 0} healthy${syncWorkerHealth.reason ? ` (${syncWorkerHealth.reason})` : ""}`
                        : "queue disabled"}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900 tabular-nums">{syncProgress.pct}%</div>
                  <div className="text-xs text-gray-500 tabular-nums">
                    {syncProgress.finished}/{syncProgress.total || "?"} jobs · {fmtNum(syncProgress.items)} scraped
                  </div>
                </div>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    syncRun?.status === "failed"
                      ? "bg-red-500"
                      : syncRun?.status === "cancelled"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.max(2, syncProgress.pct)}%` }}
                />
              </div>

              <div className={`mt-3 grid gap-2 ${SOCIAL_FULL_SYNC_MIRROR_ENABLED ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                  <div className="font-medium text-gray-700">Step 1: Queue + Start</div>
                  <div className="mt-1 text-gray-600">
                    {syncRun
                      ? `${formatRunStatus(syncRun.status)}${syncProgress.active > 0 ? ` · ${syncProgress.active} active` : ""}`
                      : "Queued"}
                  </div>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                  <div className="font-medium text-gray-700">Step 2: Posts Stage</div>
                  <div className="mt-1 text-gray-600 tabular-nums">
                    {syncStageProgress.posts.completed + syncStageProgress.posts.failed}/
                    {syncStageProgress.posts.total || "?"} complete
                    {syncStageProgress.posts.active > 0 ? ` · ${syncStageProgress.posts.active} active` : ""}
                    {` · ${fmtNum(syncStageProgress.posts.scraped)} scraped`}
                    {syncStageProgress.posts.saved > 0 ? ` · saved ${fmtNum(syncStageProgress.posts.saved)}` : ""}
                  </div>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                  <div className="font-medium text-gray-700">Step 3: Comments Stage</div>
                  <div className="mt-1 text-gray-600 tabular-nums">
                    {syncStageProgress.comments.completed + syncStageProgress.comments.failed}/
                    {syncStageProgress.comments.total || "?"} complete
                    {syncStageProgress.comments.active > 0 ? ` · ${syncStageProgress.comments.active} active` : ""}
                    {` · ${fmtNum(syncStageProgress.comments.scraped)} scraped`}
                    {syncStageProgress.comments.saved > 0 ? ` · saved ${fmtNum(syncStageProgress.comments.saved)}` : ""}
                  </div>
                </div>
                {SOCIAL_FULL_SYNC_MIRROR_ENABLED && (
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                    <div className="font-medium text-gray-700">Step 4: Mirror Stage</div>
                    <div className="mt-1 text-gray-600 tabular-nums">
                      {syncStageProgress.mediaMirror.completed + syncStageProgress.mediaMirror.failed}/
                      {syncStageProgress.mediaMirror.total || "?"} complete
                      {syncStageProgress.mediaMirror.active > 0 ? ` · ${syncStageProgress.mediaMirror.active} active` : ""}
                    </div>
                  </div>
                )}
              </div>

              {syncMirrorCoveragePreview && (
                <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  Mirror Coverage:{" "}
                  {formatMirrorCoverageLabel(
                    Math.max(
                      0,
                      Number(syncMirrorCoveragePreview.posts_scanned ?? 0) -
                        Number(syncMirrorCoveragePreview.needs_mirror_count ?? 0),
                    ),
                    Number(syncMirrorCoveragePreview.posts_scanned ?? 0),
                  )}
                  {` · pending ${fmtNum(Number(syncMirrorCoveragePreview.pending_count ?? 0))}`}
                  {` · failed ${fmtNum(Number(syncMirrorCoveragePreview.failed_count ?? 0))}`}
                  {` · partial ${fmtNum(Number(syncMirrorCoveragePreview.partial_count ?? 0))}`}
                </div>
              )}

              {syncPollError && (
                <p className="mt-3 text-xs text-amber-700">
                  Progress refresh issue: {syncPollError}. Retrying automatically.
                </p>
              )}
              {syncingComments && syncLastSuccessAt && (
                <p className="mt-1 text-xs text-gray-500">
                  Last successful progress refresh: {fmtDateTime(syncLastSuccessAt.toISOString())}
                </p>
              )}

              {syncLogs.length > 0 && (
                <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-700">Recent Run Log</p>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {syncLogs.map((entry) => (
                      <p key={entry.id} className="text-xs text-gray-600">
                        {entry.line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary bar */}
          <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {fmtNum(filteredTotals.posts)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Posts</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {fmtNum(filteredTotals.total_comments)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Comments</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {fmtNum(filteredTotals.total_engagement)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Engagement</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{commentsSavedPct.toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">of Comments Saved</div>
              <div className="text-xs text-gray-500 mt-1">
                {formatSavedVsActualComments(displayedCommentCoverage.saved, displayedCommentCoverage.actual)}
                {displayedCommentCoverage.incomplete ? "*" : ""} Comments (Saved/Actual)
              </div>
            </div>
          </div>
          {displayedCommentCoverage.incomplete && (
            <p className="mb-5 -mt-3 text-xs text-gray-500">
              * Not all platform-reported comments are saved in Supabase yet.
            </p>
          )}

          {/* Post cards */}
          {allPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              {activeDayFilter ? "No posts found for this day." : "No posts found for this week."}
            </div>
          ) : (
            <div className="space-y-4">
              {allPosts.map(({ platform, post }) => (
                <PostCard
                  key={`${platform}-${post.source_id}`}
                  platform={platform}
                  post={post}
                  showId={showIdForApi}
                  seasonNumber={seasonNumber}
                  seasonId={resolvedSeasonId}
                />
              ))}
            </div>
          )}
        </>
      )}
      </main>
    </div>
  );
}
