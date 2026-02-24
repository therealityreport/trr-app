"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SocialPostsSection from "@/components/admin/social-posts-section";
import RedditSourcesManager from "@/components/admin/reddit-sources-manager";
import { fetchAdminWithAuth, getClientAuthHeaders } from "@/lib/admin/client-auth";
import { buildSeasonSocialWeekUrl } from "@/lib/admin/show-admin-routes";

type Platform = "instagram" | "tiktok" | "twitter" | "youtube";
export type PlatformTab = "overview" | Platform;
type Scope = "bravo" | "creator" | "community";
type SyncStrategy = "incremental" | "full_refresh";
type WeeklyMetric = "posts" | "comments";
type BenchmarkCompareMode = "previous" | "trailing";
export type SocialAnalyticsView = "bravo" | "sentiment" | "hashtags" | "advanced" | "reddit";
type WeeklyPlatformRow = NonNullable<AnalyticsResponse["weekly_platform_posts"]>[number];

type SocialJob = {
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
  job_error_code?: "RATE_LIMIT" | "AUTH" | "PARSER" | "NETWORK" | "UNKNOWN" | string;
};

type SocialRun = {
  id: string;
  status: "queued" | "pending" | "retrying" | "running" | "completed" | "failed" | "cancelled";
  source_scope?: string;
  initiated_by?: string | null;
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
};

type SocialRunSummary = {
  run_id: string;
  status: SocialRun["status"];
  source_scope?: string;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_seconds?: number | null;
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
  affected_platforms?: string[];
  error_counts?: Record<string, number>;
  success_rate_pct?: number | null;
};

type SocialTarget = {
  platform: string;
  accounts?: string[];
  hashtags?: string[];
  keywords?: string[];
  is_active?: boolean;
};

type AnalyticsResponse = {
  window: {
    start: string;
    end: string;
    timezone: string;
    week_zero_start?: string;
    week?: number | null;
    source_scope?: string;
  };
  summary: {
    show_id: string;
    season_id: string;
    season_number: number;
    show_name: string | null;
    total_posts: number;
    total_comments: number;
    total_engagement: number;
    sentiment_mix: {
      positive: number;
      neutral: number;
      negative: number;
      counts: {
        positive: number;
        neutral: number;
        negative: number;
      };
    };
    data_quality?: {
      comments_saved_pct_overall: number | null;
      platform_comments_saved_pct: {
        instagram: number | null;
        youtube: number | null;
        tiktok: number | null;
        twitter: number | null;
      };
      last_post_at: string | null;
      last_comment_at: string | null;
      data_freshness_minutes: number | null;
    };
  };
  weekly: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    post_volume: number;
    comment_volume: number;
    engagement: number;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }>;
  weekly_platform_posts?: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    posts: {
      instagram: number;
      youtube: number;
      tiktok: number;
      twitter: number;
    };
    comments?: {
      instagram: number;
      youtube: number;
      tiktok: number;
      twitter: number;
    };
    reported_comments?: {
      instagram: number;
      youtube: number;
      tiktok: number;
      twitter: number;
    };
    total_posts: number;
    total_comments?: number;
    total_reported_comments?: number;
    comments_saved_pct?: number | null;
  }>;
  weekly_platform_engagement?: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    engagement: {
      instagram: number;
      youtube: number;
      tiktok: number;
      twitter: number;
    };
    total_engagement: number;
    has_data: boolean;
  }>;
  weekly_daily_activity?: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    days: Array<{
      day_index: number;
      date_local: string;
      posts: {
        instagram: number;
        youtube: number;
        tiktok: number;
        twitter: number;
      };
      comments: {
        instagram: number;
        youtube: number;
        tiktok: number;
        twitter: number;
      };
      total_posts: number;
      total_comments: number;
    }>;
  }>;
  weekly_flags?: Array<{
    week_index: number;
    code: "zero_activity" | "spike" | "drop" | "comment_gap";
    severity: "info" | "warn";
    message: string;
  }>;
  schedule_profile?: {
    timezone: string;
    platforms: Array<{
      platform: Platform;
      zero_days: number;
      peak_day_posts: number;
      median_day_posts: number;
      active_days: number;
    }>;
  };
  benchmark?: {
    week_index: number;
    current: {
      posts: number;
      comments: number;
      engagement: number;
    };
    previous_week: {
      week_index: number | null;
      metrics: {
        posts: number;
        comments: number;
        engagement: number;
      };
      delta_pct: {
        posts: number | null;
        comments: number | null;
        engagement: number | null;
      };
    };
    trailing_3_week_avg: {
      window_size: number;
      metrics: {
        posts: number;
        comments: number;
        engagement: number;
      };
      delta_pct: {
        posts: number | null;
        comments: number | null;
        engagement: number | null;
      };
    };
    consistency_score_pct?: Partial<Record<Platform, number | null>>;
  };
  platform_breakdown: Array<{
    platform: string;
    posts: number;
    comments: number;
    engagement: number;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }>;
  themes: {
    positive: Array<{ term: string; count: number; score: number }>;
    negative: Array<{ term: string; count: number; score: number }>;
  };
  leaderboards: {
    bravo_content: Array<{
      platform: string;
      source_id: string;
      text: string;
      engagement: number;
      url: string;
      timestamp: string;
      thumbnail_url?: string | null;
    }>;
    viewer_discussion: Array<{
      platform: string;
      source_id: string;
      text: string;
      engagement: number;
      url: string;
      timestamp: string;
      sentiment: "positive" | "neutral" | "negative";
      thumbnail_url?: string | null;
    }>;
  };
  jobs: SocialJob[];
};

type IngestProxyErrorPayload = {
  error?: string;
  detail?: string;
  code?: string;
  upstream_status?: number;
  upstream_detail?: unknown;
  upstream_detail_code?: string;
};

interface SeasonSocialAnalyticsSectionProps {
  showId: string;
  showSlug?: string;
  seasonNumber: number;
  seasonId: string;
  showName: string;
  platformTab?: PlatformTab;
  onPlatformTabChange?: (tab: PlatformTab) => void;
  hidePlatformTabs?: boolean;
  analyticsView?: SocialAnalyticsView;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter/X",
  youtube: "YouTube",
  reddit: "Reddit",
};

const PLATFORM_TABS: { key: PlatformTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter/X" },
  { key: "youtube", label: "YouTube" },
];

const SOCIAL_PLATFORM_QUERY_KEY = "social_platform";
const SOCIAL_DENSITY_QUERY_KEY = "social_density";
const SOCIAL_ALERTS_QUERY_KEY = "social_alerts";
type SocialDensity = "compact" | "comfortable";
const HASHTAG_REGEX = /(^|\s)#([a-z0-9_]+)/gi;
const HASHTAG_PLATFORMS: Platform[] = ["instagram", "tiktok", "twitter", "youtube"];

const isPlatformTab = (value: string | null | undefined): value is PlatformTab => {
  if (!value) return false;
  return PLATFORM_TABS.some((tab) => tab.key === value);
};

const platformFilterFromTab = (tab: PlatformTab): "all" | Platform =>
  tab === "overview" ? "all" : tab;

const ACTIVE_RUN_STATUSES = new Set<SocialRun["status"]>(["queued", "pending", "retrying", "running"]);
const TERMINAL_RUN_STATUSES = new Set<SocialRun["status"]>(["completed", "failed", "cancelled"]);
const PLATFORM_ORDER: Platform[] = ["instagram", "youtube", "tiktok", "twitter"];

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const SOCIAL_TIME_ZONE = "America/New_York";
const DATE_TOKEN_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseDateToken = (
  value: string,
): { year: number; month: number; day: number } | null => {
  const match = DATE_TOKEN_RE.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};

const getTimeZoneOffsetMs = (timestampMs: number, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestampMs));
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    values[part.type] = Number(part.value);
  }
  const zonedAsUtc = Date.UTC(
    values.year ?? 0,
    (values.month ?? 1) - 1,
    values.day ?? 1,
    values.hour ?? 0,
    values.minute ?? 0,
    values.second ?? 0,
  );
  return zonedAsUtc - timestampMs;
};

const toZonedUtcIso = (
  parts: { year: number; month: number; day: number },
  time: { hour: number; minute: number; second: number; millisecond?: number },
): string => {
  const baseUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    time.hour,
    time.minute,
    time.second,
    time.millisecond ?? 0,
  );
  const firstOffset = getTimeZoneOffsetMs(baseUtc, SOCIAL_TIME_ZONE);
  let correctedUtc = baseUtc - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(correctedUtc, SOCIAL_TIME_ZONE);
  if (secondOffset !== firstOffset) {
    correctedUtc = baseUtc - secondOffset;
  }
  return new Date(correctedUtc).toISOString();
};

const addDays = (
  parts: { year: number; month: number; day: number },
  days: number,
): { year: number; month: number; day: number } => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const DATE_TIME_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: SOCIAL_TIME_ZONE,
};

const DATE_ONLY_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  timeZone: SOCIAL_TIME_ZONE,
};

const TIME_ONLY_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: SOCIAL_TIME_ZONE,
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", DATE_TIME_DISPLAY_OPTIONS);
};

const formatDateTimeFromDate = (value: Date | null | undefined): string => {
  if (!value) return "-";
  if (Number.isNaN(value.getTime())) return "-";
  return value.toLocaleString("en-US", DATE_TIME_DISPLAY_OPTIONS);
};

const formatTime = (value: string | null | undefined): string => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("en-US", TIME_ONLY_DISPLAY_OPTIONS);
};

const formatDateOnly = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", DATE_ONLY_DISPLAY_OPTIONS);
};

const formatDayScopeLabel = (value: string): string => {
  if (!value) return "Specific Day";
  const parsed = parseDateToken(value);
  if (!parsed) return `Day ${value}`;
  const label = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0)).toLocaleDateString(
    "en-US",
    DATE_ONLY_DISPLAY_OPTIONS,
  );
  return `Day ${label}`;
};

const formatWeekScopeLabel = (week: number | "all" | null): string => {
  if (week === "all" || week === null) return "All Weeks";
  return week === 0 ? "Pre-Season" : `Week ${week}`;
};

const formatPlatformScopeLabel = (platform: "all" | Platform | null): string => {
  if (!platform || platform === "all") return "All Platforms";
  return PLATFORM_LABELS[platform] ?? platform;
};

const normalizeIsoInstant = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
};

const formatStatusLabel = (status: SocialRun["status"]): string => {
  if (!status) return "Unknown";
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
};

const formatRunProgressLabel = (run: SocialRun): string => {
  const summary = run.summary ?? {};
  const totalJobs = Number(summary.total_jobs ?? 0);
  const completedJobs = Number(summary.completed_jobs ?? 0);
  const failedJobs = Number(summary.failed_jobs ?? 0);
  const doneJobs = completedJobs + failedJobs;
  if (totalJobs > 0) {
    return `${formatStatusLabel(run.status)} ${doneJobs}/${totalJobs}`;
  }
  return formatStatusLabel(run.status);
};

const formatDateRangeLabel = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} to ${end}`;
  }
  const startDay = startDate.toLocaleDateString("en-US", { timeZone: SOCIAL_TIME_ZONE });
  const endDay = endDate.toLocaleDateString("en-US", { timeZone: SOCIAL_TIME_ZONE });
  if (startDay === endDay) {
    return `Day ${startDate.toLocaleDateString("en-US", DATE_ONLY_DISPLAY_OPTIONS)}`;
  }
  return `${startDate.toLocaleDateString("en-US", { timeZone: SOCIAL_TIME_ZONE })} to ${endDate.toLocaleDateString(
    "en-US",
    { timeZone: SOCIAL_TIME_ZONE },
  )}`;
};

const buildIsoDayRange = (dayLocal: string): { dateStart: string; dateEnd: string } | null => {
  const parsed = parseDateToken(dayLocal);
  if (!parsed) return null;
  const dateStart = toZonedUtcIso(parsed, { hour: 0, minute: 0, second: 0, millisecond: 0 });
  const nextDay = addDays(parsed, 1);
  const nextDateStart = toZonedUtcIso(nextDay, { hour: 0, minute: 0, second: 0, millisecond: 0 });
  return {
    dateStart,
    dateEnd: new Date(Date.parse(nextDateStart) - 1).toISOString(),
  };
};

type CoverageSummary = {
  commentsPctLabel: string | null;
  progressPctLabel: string | null;
  progressPct: number | null;
  upToDate: boolean;
};

const toNonNegative = (value: number | null | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const buildCoverageSummary = ({
  postsSaved,
  commentsSaved,
  reportedComments,
  explicitCommentsPct,
}: {
  postsSaved: number;
  commentsSaved: number;
  reportedComments: number;
  explicitCommentsPct?: number | null;
}): CoverageSummary => {
  const safePostsSaved = toNonNegative(postsSaved);
  const safeCommentsSaved = toNonNegative(commentsSaved);
  const safeReportedComments = toNonNegative(reportedComments);
  const expectedComments = Math.max(safeReportedComments, safeCommentsSaved);
  const commentsPctRaw =
    expectedComments > 0
      ? Math.min(100, (safeCommentsSaved * 100) / expectedComments)
      : typeof explicitCommentsPct === "number" && Number.isFinite(explicitCommentsPct) && explicitCommentsPct > 0
        ? Math.min(100, explicitCommentsPct)
        : safeCommentsSaved > 0
          ? 100
          : null;

  const totalExpectedUnits = safePostsSaved + expectedComments;
  const totalSavedUnits = safePostsSaved + safeCommentsSaved;
  const progressPctRaw = totalExpectedUnits > 0 ? Math.min(100, (totalSavedUnits * 100) / totalExpectedUnits) : null;
  const upToDate = typeof progressPctRaw === "number" && progressPctRaw >= 99.95;
  return {
    commentsPctLabel: commentsPctRaw == null ? null : `${commentsPctRaw.toFixed(1)}%`,
    progressPctLabel: progressPctRaw == null ? null : `${progressPctRaw.toFixed(1)}%`,
    progressPct: progressPctRaw,
    upToDate,
  };
};

const getPlatformCoverage = (week: WeeklyPlatformRow, platform: Platform): CoverageSummary => {
  const reportedComments = Number(week.reported_comments?.[platform] ?? 0);
  return buildCoverageSummary({
    postsSaved: Number(week.posts?.[platform] ?? 0),
    commentsSaved: Number(week.comments?.[platform] ?? 0),
    reportedComments,
  });
};

const getTotalCoverage = (week: WeeklyPlatformRow): CoverageSummary => {
  const inferredReported = PLATFORM_ORDER.reduce(
    (sum, platform) => sum + Number(week.reported_comments?.[platform] ?? 0),
    0,
  );
  const totalReported = Number(week.total_reported_comments ?? inferredReported);
  return buildCoverageSummary({
    postsSaved: Number(week.total_posts ?? 0),
    commentsSaved: Number(week.total_comments ?? 0),
    reportedComments: totalReported,
    explicitCommentsPct: typeof week.comments_saved_pct === "number" ? week.comments_saved_pct : null,
  });
};

const REQUEST_TIMEOUT_MS = {
  analytics: 22_000,
  runs: 20_000,
  targets: 12_000,
  jobs: 20_000,
} as const;
const ANALYTICS_POLL_REFRESH_MS = 30_000;

export const POLL_FAILURES_BEFORE_RETRY_BANNER = 2;
export const shouldSetPollingRetry = (consecutiveFailures: number): boolean =>
  consecutiveFailures >= POLL_FAILURES_BEFORE_RETRY_BANNER;

export const buildSocialRequestKey = ({
  seasonId,
  sourceScope,
  platformFilter,
  weekFilter,
  analyticsView,
}: {
  seasonId: string;
  sourceScope: string;
  platformFilter: string;
  weekFilter: number | "all";
  analyticsView?: string;
}): string => {
  const weekKey = weekFilter === "all" ? "all" : String(weekFilter);
  return `${seasonId}:${sourceScope}:${platformFilter}:${weekKey}:${analyticsView ?? "bravo"}`;
};

export const buildRunsRequestKey = ({
  seasonId,
  sourceScope,
}: {
  seasonId: string;
  sourceScope: string;
}): string => `${seasonId}:${sourceScope}`;

const SOCIAL_CACHE_VERSION = 1;
const SOCIAL_CACHE_PREFIX = "trr:season-social-analytics";

type SocialSectionCacheSnapshot = {
  version: number;
  saved_at: string;
  analytics?: AnalyticsResponse | null;
  runs?: SocialRun[];
  targets?: SocialTarget[];
  last_updated?: string | null;
  section_last_success_at?: {
    analytics?: string | null;
    targets?: string | null;
    runs?: string | null;
  };
};

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) return error.name === "AbortError";
  if (!error || typeof error !== "object") return false;
  return (error as { name?: string }).name === "AbortError";
};

const parseDateOrNull = (value: unknown): Date | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return null;
  return new Date(ts);
};

const isTransientBackendSectionError = (message: string | null | undefined): boolean => {
  const normalized = String(message ?? "").toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("timed out") ||
    normalized.includes("could not reach trr-backend") ||
    normalized.includes("headers timeout") ||
    normalized.includes("fetch failed")
  );
};

const fetchAdminWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchAdminWithAuth(
      input,
      {
        ...init,
        signal: controller.signal,
      },
      { allowDevAdminBypass: true },
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const formatIngestErrorMessage = (payload: IngestProxyErrorPayload): string => {
  const upstreamDetail =
    payload.upstream_detail && typeof payload.upstream_detail === "object"
      ? (payload.upstream_detail as Record<string, unknown>)
      : null;
  const fallbackWorkerCode =
    typeof payload.error === "string" && payload.error.includes("SOCIAL_WORKER_UNAVAILABLE")
      ? "SOCIAL_WORKER_UNAVAILABLE"
      : null;
  const upstreamCode =
    payload.upstream_detail_code ??
    (typeof upstreamDetail?.code === "string" ? upstreamDetail.code : null) ??
    fallbackWorkerCode;
  const upstreamMessage =
    (typeof upstreamDetail?.message === "string" && upstreamDetail.message.trim()
      ? upstreamDetail.message
      : null) ??
    payload.error ??
    payload.detail ??
    "Failed to run social ingest";

  if (upstreamCode === "SOCIAL_WORKER_UNAVAILABLE") {
    const workerHealth =
      upstreamDetail?.worker_health && typeof upstreamDetail.worker_health === "object"
        ? (upstreamDetail.worker_health as Record<string, unknown>)
        : null;
    const healthReason =
      typeof workerHealth?.reason === "string" && workerHealth.reason.trim()
        ? ` (${workerHealth.reason})`
        : "";
    return `${upstreamMessage}${healthReason}. Start the social worker and retry; inline fallback only works in local/dev backend runtime.`;
  }

  return upstreamMessage;
};

const getMonthDayLabel = (dateLocal: string): string => {
  const parsed = parseDateToken(dateLocal);
  if (!parsed) return "-- --";
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0));
  const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const day = date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
  return `${month} ${day}`;
};

const getHeatmapToneClass = (value: number, maxValue: number): string => {
  if (value <= 0 || maxValue <= 0) {
    return "bg-zinc-200 text-zinc-500";
  }
  const ratio = value / maxValue;
  if (ratio >= 0.8) return "bg-emerald-700 text-white";
  if (ratio >= 0.6) return "bg-emerald-600 text-white";
  if (ratio >= 0.4) return "bg-emerald-500 text-white";
  if (ratio >= 0.2) return "bg-emerald-400 text-white";
  return "bg-emerald-300 text-emerald-950";
};

const formatFreshnessLabel = (minutes: number | null | undefined): string => {
  if (minutes == null || Number.isNaN(minutes)) return "Unknown";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatPctLabel = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(1)}%`;
};

const formatDurationLabel = (seconds: number | null | undefined): string => {
  if (seconds == null || Number.isNaN(seconds)) return "N/A";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
};

const getWeeklyFlagToneClass = (severity: "info" | "warn"): string => {
  if (severity === "warn") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-zinc-300 bg-zinc-100 text-zinc-700";
};

const getHeatmapTileSizeClass = (density: SocialDensity): string => {
  if (density === "comfortable") return "h-11 w-11 sm:h-12 sm:w-12 text-[10px]";
  return "h-9 w-9 sm:h-10 sm:w-10 text-[9px]";
};

const getWeeklyDayValue = (
  day: NonNullable<AnalyticsResponse["weekly_daily_activity"]>[number]["days"][number],
  metric: WeeklyMetric,
  platform: Platform | null,
): number => {
  if (metric === "posts") {
    if (!platform) return Number(day.total_posts ?? 0);
    return Number(day.posts?.[platform] ?? 0);
  }
  if (!platform) return Number(day.total_comments ?? 0);
  return Number(day.comments?.[platform] ?? 0);
};

const normalizeHashtag = (value: string | null | undefined): string | null => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^#+/, "")
    .toUpperCase();
  if (!normalized) return null;
  if (!/^[A-Z0-9_]+$/.test(normalized)) return null;
  return normalized;
};

const extractHashtags = (text: string | null | undefined): string[] => {
  const source = String(text ?? "");
  const tags: string[] = [];
  HASHTAG_REGEX.lastIndex = 0;
  let match = HASHTAG_REGEX.exec(source);
  while (match) {
    const normalized = normalizeHashtag(match[2]);
    if (normalized) tags.push(normalized);
    match = HASHTAG_REGEX.exec(source);
  }
  return tags;
};

const statusToLogVerb = (status: SocialJob["status"]): string => {
  if (status === "queued" || status === "pending") return "queued";
  if (status === "retrying") return "retrying";
  if (status === "running") return "running";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return "cancelled";
};

const getJobStageCounters = (job: SocialJob): { posts: number; comments: number } | null => {
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
};

const getJobPersistCounters = (job: SocialJob): { posts_upserted: number; comments_upserted: number } | null => {
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
};

const getJobActivity = (job: SocialJob): Record<string, unknown> | null => {
  const activity = (job.metadata as Record<string, unknown> | undefined)?.activity as
    | Record<string, unknown>
    | undefined;
  if (!activity || typeof activity !== "object") return null;
  return activity;
};

const formatJobActivitySummary = (activity: Record<string, unknown> | null): string => {
  if (!activity) return "";
  const segments: string[] = [];
  if (typeof activity.phase === "string" && activity.phase.trim()) {
    segments.push(activity.phase.replaceAll("_", " "));
  }
  if (typeof activity.pages_scanned === "number") {
    segments.push(`${activity.pages_scanned}pg`);
  }
  if (typeof activity.posts_checked === "number") {
    segments.push(`${activity.posts_checked}chk`);
  }
  if (typeof activity.matched_posts === "number") {
    segments.push(`${activity.matched_posts}match`);
  }
  return segments.join(" · ");
};

const truncateIdentifier = (value: string, prefix = 8, suffix = 4): string => {
  if (value.length <= prefix + suffix + 1) return value;
  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
};

const copyTextToClipboard = async (value: string): Promise<boolean> => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  if (typeof document === "undefined") return false;
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "absolute";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  textArea.setSelectionRange(0, value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);
  return copied;
};

export default function SeasonSocialAnalyticsSection({
  showId,
  showSlug,
  seasonNumber,
  seasonId,
  showName,
  platformTab: controlledPlatformTab,
  onPlatformTabChange,
  hidePlatformTabs = false,
  analyticsView = "bravo",
}: SeasonSocialAnalyticsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [scope, setScope] = useState<Scope>("bravo");
  const [uncontrolledPlatformTab, setUncontrolledPlatformTab] = useState<PlatformTab>("overview");
  const [socialDensity, setSocialDensity] = useState<SocialDensity>("compact");
  const [socialAlertsEnabled, setSocialAlertsEnabled] = useState(true);
  const isPlatformTabControlled = typeof controlledPlatformTab !== "undefined";
  const tabFromQuery = useMemo<PlatformTab>(() => {
    const value = searchParams.get(SOCIAL_PLATFORM_QUERY_KEY);
    return isPlatformTab(value) ? value : "overview";
  }, [searchParams]);
  const densityFromQuery = useMemo<SocialDensity>(() => {
    const value = searchParams.get(SOCIAL_DENSITY_QUERY_KEY);
    return value === "comfortable" ? "comfortable" : "compact";
  }, [searchParams]);
  const alertsFromQuery = useMemo<boolean>(() => {
    const value = searchParams.get(SOCIAL_ALERTS_QUERY_KEY);
    return value !== "off";
  }, [searchParams]);
  const platformTab = controlledPlatformTab ?? uncontrolledPlatformTab;
  const platformFilter = useMemo(() => platformFilterFromTab(platformTab), [platformTab]);
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");
  const [dayFilter, setDayFilter] = useState<string>("");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [targets, setTargets] = useState<SocialTarget[]>([]);
  const [runs, setRuns] = useState<SocialRun[]>([]);
  const [runSummaries, setRunSummaries] = useState<SocialRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<SocialJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<{
    analytics: string | null;
    targets: string | null;
    runs: string | null;
    jobs: string | null;
  }>({
    analytics: null,
    targets: null,
    runs: null,
    jobs: null,
  });
  const [runSummaryError, setRunSummaryError] = useState<string | null>(null);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [runningIngest, setRunningIngest] = useState(false);
  const [cancellingRun, setCancellingRun] = useState(false);
  const [syncStrategy, setSyncStrategy] = useState<SyncStrategy>("incremental");
  const [weeklyMetric, setWeeklyMetric] = useState<WeeklyMetric>("posts");
  const [benchmarkCompareMode, setBenchmarkCompareMode] = useState<BenchmarkCompareMode>("previous");
  const [ingestingWeek, setIngestingWeek] = useState<number | null>(null);
  const [ingestingDay, setIngestingDay] = useState<string | null>(null);
  const [ingestingPlatform, setIngestingPlatform] = useState<string | null>(null);
  const [activeRunRequest, setActiveRunRequest] = useState<{
    week: number | null;
    day: string | null;
    platform: "all" | Platform;
  } | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [ingestStartedAt, setIngestStartedAt] = useState<Date | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [manualSourcesOpen, setManualSourcesOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [elapsedTick, setElapsedTick] = useState(0);
  const [seasonIdCopyNotice, setSeasonIdCopyNotice] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<"idle" | "retrying" | "recovered">("idle");
  const [sectionLastSuccessAt, setSectionLastSuccessAt] = useState<{
    analytics: Date | null;
    targets: Date | null;
    runs: Date | null;
  }>({
    analytics: null,
    targets: null,
    runs: null,
  });
  const pollGenerationRef = useRef(0);
  const pollFailureCountRef = useRef(0);
  const lastAnalyticsPollAtRef = useRef(0);
  const seasonIdCopyTimerRef = useRef<number | null>(null);
  const ingestPanelRef = useRef<HTMLElement | null>(null);
  const runSeasonIngestButtonRef = useRef<HTMLButtonElement | null>(null);
  const inFlightRef = useRef<{
    analyticsByKey: Map<string, Promise<AnalyticsResponse>>;
    runsByKey: Map<string, Promise<SocialRun[]>>;
    targetsByKey: Map<string, Promise<SocialTarget[]>>;
    jobsByKey: Map<string, Promise<SocialJob[]>>;
    refreshAll: Promise<void> | null;
  }>({
    analyticsByKey: new Map(),
    runsByKey: new Map(),
    targetsByKey: new Map(),
    jobsByKey: new Map(),
    refreshAll: null,
  });
  const showRouteSlug = (showSlug || showId).trim();
  const cacheKey = useMemo(() => {
    const weekKey = weekFilter === "all" ? "all" : String(weekFilter);
    return `${SOCIAL_CACHE_PREFIX}:v${SOCIAL_CACHE_VERSION}:${showId}:${seasonNumber}:${seasonId}:${scope}:${platformFilter}:${weekKey}`;
  }, [platformFilter, scope, seasonId, seasonNumber, showId, weekFilter]);

  const getAuthHeaders = useCallback(
    async () => getClientAuthHeaders({ allowDevAdminBypass: true }),
    [],
  );

  const queryString = useMemo(() => {
    const search = new URLSearchParams();
    search.set("season_id", seasonId);
    search.set("source_scope", scope);
    search.set("timezone", SOCIAL_TIME_ZONE);
    if (platformFilter !== "all") search.set("platforms", platformFilter);
    if (weekFilter !== "all") search.set("week", String(weekFilter));
    return search.toString();
  }, [platformFilter, scope, seasonId, weekFilter]);
  const analyticsRequestKey = useMemo(
    () =>
      buildSocialRequestKey({
        seasonId,
        sourceScope: scope,
        platformFilter,
        weekFilter,
        analyticsView,
      }),
    [analyticsView, platformFilter, scope, seasonId, weekFilter],
  );
  const runsRequestKey = useMemo(
    () =>
      buildRunsRequestKey({
        seasonId,
        sourceScope: scope,
      }),
    [scope, seasonId],
  );

  const readErrorMessage = useCallback(async (response: Response, fallback: string): Promise<string> => {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
    };
    return data.error ?? data.detail ?? fallback;
  }, []);

  const setPlatformTabAndUrl = useCallback(
    (nextTab: PlatformTab) => {
      if (isPlatformTabControlled) {
        onPlatformTabChange?.(nextTab);
        return;
      }

      setUncontrolledPlatformTab(nextTab);
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      if (nextTab === "overview") {
        nextSearchParams.delete(SOCIAL_PLATFORM_QUERY_KEY);
      } else {
        nextSearchParams.set(SOCIAL_PLATFORM_QUERY_KEY, nextTab);
      }
      const queryString = nextSearchParams.toString();
      const nextHref = `${pathname}${queryString ? `?${queryString}` : ""}`;
      router.replace(nextHref as Route, { scroll: false });
    },
    [isPlatformTabControlled, onPlatformTabChange, pathname, router, searchParams],
  );

  const setSocialPreferenceInUrl = useCallback(
    (key: string, value: string | null) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      if (value == null || value.length === 0) {
        nextSearchParams.delete(key);
      } else {
        nextSearchParams.set(key, value);
      }
      const nextQueryString = nextSearchParams.toString();
      const nextHref = `${pathname}${nextQueryString ? `?${nextQueryString}` : ""}`;
      router.replace(nextHref as Route, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const buildWeekDetailHref = useCallback(
    (weekIndex: number, dayLocal?: string) => {
      const weekLinkQuery = new URLSearchParams({
        source_scope: scope,
        season_id: seasonId,
      });
      if (platformTab !== "overview") {
        weekLinkQuery.set(SOCIAL_PLATFORM_QUERY_KEY, platformTab);
      }
      if (analyticsView !== "bravo") {
        weekLinkQuery.set("social_view", analyticsView);
      }
      if (socialDensity !== "compact") {
        weekLinkQuery.set(SOCIAL_DENSITY_QUERY_KEY, socialDensity);
      }
      if (!socialAlertsEnabled) {
        weekLinkQuery.set(SOCIAL_ALERTS_QUERY_KEY, "off");
      }
      if (dayLocal) {
        weekLinkQuery.set("day", dayLocal);
      }
      return buildSeasonSocialWeekUrl({
        showSlug: showRouteSlug,
        seasonNumber,
        weekIndex,
        query: weekLinkQuery,
      });
    },
    [analyticsView, platformTab, scope, seasonId, seasonNumber, showRouteSlug, socialAlertsEnabled, socialDensity],
  );

  useEffect(() => {
    if (isPlatformTabControlled) return;
    setUncontrolledPlatformTab(tabFromQuery);
  }, [isPlatformTabControlled, tabFromQuery]);

  useEffect(() => {
    setSocialDensity(densityFromQuery);
  }, [densityFromQuery]);

  useEffect(() => {
    setSocialAlertsEnabled(alertsFromQuery);
  }, [alertsFromQuery]);

  useEffect(() => {
    if (analyticsView === "reddit") return;
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return;
    let parsed: SocialSectionCacheSnapshot | null = null;
    try {
      parsed = JSON.parse(raw) as SocialSectionCacheSnapshot;
    } catch {
      return;
    }
    if (!parsed || parsed.version !== SOCIAL_CACHE_VERSION) return;

    if (parsed.analytics) {
      setAnalytics(parsed.analytics);
    }
    if (Array.isArray(parsed.targets)) {
      setTargets(parsed.targets);
    }
    if (Array.isArray(parsed.runs)) {
      setRuns(parsed.runs);
    }

    const cachedLastUpdated = parseDateOrNull(parsed.last_updated);
    if (cachedLastUpdated) {
      setLastUpdated(cachedLastUpdated);
    }

    const sectionLastSuccessRaw = parsed.section_last_success_at ?? {};
    setSectionLastSuccessAt((current) => ({
      analytics: parseDateOrNull(sectionLastSuccessRaw.analytics) ?? current.analytics,
      targets: parseDateOrNull(sectionLastSuccessRaw.targets) ?? current.targets,
      runs: parseDateOrNull(sectionLastSuccessRaw.runs) ?? current.runs,
    }));
  }, [analyticsView, cacheKey]);

  useEffect(() => {
    if (analyticsView === "reddit") return;
    if (typeof window === "undefined") return;

    const hasAnyData =
      Boolean(analytics) ||
      targets.length > 0 ||
      runs.length > 0 ||
      Boolean(lastUpdated) ||
      Boolean(sectionLastSuccessAt.analytics || sectionLastSuccessAt.targets || sectionLastSuccessAt.runs);
    if (!hasAnyData) {
      return;
    }

    const payload: SocialSectionCacheSnapshot = {
      version: SOCIAL_CACHE_VERSION,
      saved_at: new Date().toISOString(),
      analytics,
      targets,
      runs,
      last_updated: lastUpdated ? lastUpdated.toISOString() : null,
      section_last_success_at: {
        analytics: sectionLastSuccessAt.analytics ? sectionLastSuccessAt.analytics.toISOString() : null,
        targets: sectionLastSuccessAt.targets ? sectionLastSuccessAt.targets.toISOString() : null,
        runs: sectionLastSuccessAt.runs ? sectionLastSuccessAt.runs.toISOString() : null,
      },
    };
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch {
      // Ignore storage quota/serialization errors; runtime data remains in memory.
    }
  }, [
    analytics,
    analyticsView,
    cacheKey,
    lastUpdated,
    runs,
    sectionLastSuccessAt.analytics,
    sectionLastSuccessAt.runs,
    sectionLastSuccessAt.targets,
    targets,
  ]);

  const fetchAnalytics = useCallback(async () => {
    const existingRequest = inFlightRef.current.analyticsByKey.get(analyticsRequestKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      const headers = await getAuthHeaders();
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics?${queryString}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.analytics,
        "Social analytics request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load social analytics"));
      }
      const data = (await response.json()) as AnalyticsResponse;
      const now = new Date();
      setAnalytics(data);
      setLastUpdated(now);
      setSectionLastSuccessAt((current) => ({ ...current, analytics: now }));
      return data;
    })();

    inFlightRef.current.analyticsByKey.set(analyticsRequestKey, request);
    try {
      return await request;
    } finally {
      const activeRequest = inFlightRef.current.analyticsByKey.get(analyticsRequestKey);
      if (activeRequest === request) {
        inFlightRef.current.analyticsByKey.delete(analyticsRequestKey);
      }
    }
  }, [analyticsRequestKey, getAuthHeaders, queryString, readErrorMessage, seasonNumber, showId]);

  const fetchRuns = useCallback(async (options?: { runId?: string | null; limit?: number }) => {
    const runId = options?.runId?.trim() || null;
    const requestedLimit = Number.isFinite(options?.limit) ? Number(options?.limit) : 100;
    const safeLimit = Math.max(1, Math.min(250, requestedLimit));
    const scopedRunsKey = `${runsRequestKey}:run=${runId ?? "all"}:limit=${safeLimit}`;
    const existingRequest = inFlightRef.current.runsByKey.get(scopedRunsKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ limit: String(safeLimit) });
      params.set("source_scope", scope);
      params.set("season_id", seasonId);
      if (runId) {
        params.set("run_id", runId);
      }
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/runs?${params.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.runs,
        "Social runs request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load social runs"));
      }
      const data = (await response.json()) as { runs?: SocialRun[] };
      const nextRuns = data.runs ?? [];
      if (!runId) {
        setRuns(nextRuns);
      } else {
        setRuns((current) => {
          if (nextRuns.length === 0) return current;
          const merged = [...current];
          for (const nextRun of nextRuns) {
            const existingIndex = merged.findIndex((run) => run.id === nextRun.id);
            if (existingIndex >= 0) {
              merged[existingIndex] = nextRun;
            } else {
              merged.unshift(nextRun);
            }
          }
          return merged;
        });
      }
      setSectionLastSuccessAt((current) => ({ ...current, runs: new Date() }));
      return nextRuns;
    })();

    inFlightRef.current.runsByKey.set(scopedRunsKey, request);
    try {
      return await request;
    } finally {
      const activeRequest = inFlightRef.current.runsByKey.get(scopedRunsKey);
      if (activeRequest === request) {
        inFlightRef.current.runsByKey.delete(scopedRunsKey);
      }
    }
  }, [getAuthHeaders, readErrorMessage, runsRequestKey, scope, seasonId, seasonNumber, showId]);

  const fetchRunSummaries = useCallback(async () => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ limit: "20" });
    params.set("source_scope", scope);
    params.set("season_id", seasonId);
    const response = await fetchAdminWithTimeout(
      `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/runs/summary?${params.toString()}`,
      { headers, cache: "no-store" },
      REQUEST_TIMEOUT_MS.runs,
      "Social run summary request timed out",
    );
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Failed to load social run summary"));
    }
    const data = (await response.json()) as { summaries?: SocialRunSummary[] };
    const nextSummaries = data.summaries ?? [];
    setRunSummaries(nextSummaries);
    setRunSummaryError(null);
    return nextSummaries;
  }, [getAuthHeaders, readErrorMessage, scope, seasonId, seasonNumber, showId]);

  const fetchTargets = useCallback(async () => {
    const existingRequest = inFlightRef.current.targetsByKey.get(runsRequestKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("source_scope", scope);
      params.set("season_id", seasonId);
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/targets?${params.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.targets,
        "Social targets request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load social targets"));
      }
      const data = (await response.json()) as { targets?: SocialTarget[] };
      setTargets(data.targets ?? []);
      setSectionLastSuccessAt((current) => ({ ...current, targets: new Date() }));
      return data.targets ?? [];
    })();

    inFlightRef.current.targetsByKey.set(runsRequestKey, request);
    try {
      return await request;
    } finally {
      const activeRequest = inFlightRef.current.targetsByKey.get(runsRequestKey);
      if (activeRequest === request) {
        inFlightRef.current.targetsByKey.delete(runsRequestKey);
      }
    }
  }, [getAuthHeaders, readErrorMessage, runsRequestKey, scope, seasonId, seasonNumber, showId]);

  const fetchJobs = useCallback(async (
    runId?: string | null,
    options?: { preserveLastGoodIfEmpty?: boolean },
  ) => {
    if (!runId) {
      setJobs([]);
      return [] as SocialJob[];
    }
    const jobsRequestKey = `${seasonId}:${runId}:250`;
    const existingRequest = inFlightRef.current.jobsByKey.get(jobsRequestKey);
    if (existingRequest) {
      return existingRequest;
    }
    const request = (async () => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ limit: "250", run_id: runId });
    params.set("season_id", seasonId);
    const response = await fetchAdminWithTimeout(
      `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/jobs?${params.toString()}`,
      { headers, cache: "no-store" },
      REQUEST_TIMEOUT_MS.jobs,
      "Social jobs request timed out",
    );
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Failed to load social jobs"));
    }
    const data = (await response.json()) as { jobs?: SocialJob[] };
    const nextJobs = data.jobs ?? [];
    setJobs((current) => {
      if (options?.preserveLastGoodIfEmpty && nextJobs.length === 0) {
        const hasCurrentForRun = current.some((job) => job.run_id === runId);
        if (hasCurrentForRun) {
          return current;
        }
      }
      return nextJobs;
    });
    return nextJobs;
    })();
    inFlightRef.current.jobsByKey.set(jobsRequestKey, request);
    try {
      return await request;
    } finally {
      const activeRequest = inFlightRef.current.jobsByKey.get(jobsRequestKey);
      if (activeRequest === request) {
        inFlightRef.current.jobsByKey.delete(jobsRequestKey);
      }
    }
  }, [getAuthHeaders, readErrorMessage, seasonId, seasonNumber, showId]);

  const refreshAll = useCallback(async () => {
    if (inFlightRef.current.refreshAll) {
      return inFlightRef.current.refreshAll;
    }

    const request = (async () => {
      if (analyticsView === "reddit") {
        setLoading(false);
        setSectionErrors({
          analytics: null,
          targets: null,
          runs: null,
          jobs: null,
        });
        return;
      }

      setLoading(true);
      setError(null);
      const nextSectionErrors = {
        analytics: null as string | null,
        targets: null as string | null,
        runs: null as string | null,
        jobs: null as string | null,
      };

      const [targetsResult, runsResult, runSummariesResult] = await Promise.allSettled([
        fetchTargets(),
        fetchRuns(),
        fetchRunSummaries(),
      ]);

      if (targetsResult.status === "rejected") {
        nextSectionErrors.targets =
          targetsResult.reason instanceof Error ? targetsResult.reason.message : "Failed to load social targets";
      }

      let runIdToLoad = selectedRunId;
      if (runsResult.status === "fulfilled") {
        const loadedRuns = runsResult.value;
        const activeRun = loadedRuns.find((run) => ACTIVE_RUN_STATUSES.has(run.status));
        if (activeRun) {
          setActiveRunId(activeRun.id);
        } else if (!runningIngest) {
          setActiveRunId(null);
        }

        if (runIdToLoad && !loadedRuns.some((run) => run.id === runIdToLoad)) {
          runIdToLoad = null;
        }
        if (!runIdToLoad && selectedRunId) {
          setSelectedRunId(null);
        }
      } else {
        nextSectionErrors.runs =
          runsResult.reason instanceof Error ? runsResult.reason.message : "Failed to load social runs";
      }
      if (runSummariesResult.status === "rejected") {
        setRunSummaryError(
          runSummariesResult.reason instanceof Error
            ? runSummariesResult.reason.message
            : "Failed to load social run summary",
        );
      } else {
        setRunSummaryError(null);
      }

      try {
        await fetchJobs(runIdToLoad);
      } catch (jobsError) {
        nextSectionErrors.jobs = jobsError instanceof Error ? jobsError.message : "Failed to load social jobs";
      }

      setSectionErrors(nextSectionErrors);
      setLoading(false);

      void fetchAnalytics()
        .then(() => {
          setSectionErrors((current) => ({ ...current, analytics: null }));
        })
        .catch((analyticsError) => {
          setSectionErrors((current) => ({
            ...current,
            analytics:
              analyticsError instanceof Error ? analyticsError.message : "Failed to load social analytics",
          }));
        });
    })();

    inFlightRef.current.refreshAll = request;
    try {
      await request;
    } finally {
      if (inFlightRef.current.refreshAll === request) {
        inFlightRef.current.refreshAll = null;
      }
    }
  }, [analyticsView, fetchAnalytics, fetchJobs, fetchRunSummaries, fetchRuns, fetchTargets, runningIngest, selectedRunId]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!selectedRunId) {
      setJobs([]);
      return;
    }
    void fetchJobs(selectedRunId)
      .then(() => {
        setSectionErrors((current) => ({ ...current, jobs: null }));
      })
      .catch((jobsError) => {
        setSectionErrors((current) => ({
          ...current,
          jobs: jobsError instanceof Error ? jobsError.message : "Failed to load social jobs",
        }));
      });
  }, [fetchJobs, selectedRunId]);

  const refreshSelectedRunJobs = useCallback(async () => {
    const runId = selectedRunId;
    if (!runId) {
      return;
    }
    try {
      await fetchJobs(runId);
      setSectionErrors((current) => ({ ...current, jobs: null }));
    } catch (jobsError) {
      setSectionErrors((current) => ({
        ...current,
        jobs: jobsError instanceof Error ? jobsError.message : "Failed to load social jobs",
      }));
    }
  }, [fetchJobs, selectedRunId]);

  const runScopedJobs = useMemo(() => {
    if (!selectedRunId) return [];
    return jobs.filter((job) => job.run_id === selectedRunId);
  }, [jobs, selectedRunId]);

  const selectedRun = useMemo(
    () => (selectedRunId ? runs.find((run) => run.id === selectedRunId) ?? null : null),
    [runs, selectedRunId],
  );
  const activeRun = useMemo(
    () => (activeRunId ? runs.find((run) => run.id === activeRunId) ?? null : null),
    [activeRunId, runs],
  );


  const weeklyWindowLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const week of analytics?.weekly ?? []) {
      const start = normalizeIsoInstant(week.start);
      const end = normalizeIsoInstant(week.end);
      if (!start || !end) continue;
      map.set(`${start}|${end}`, week.label ?? formatWeekScopeLabel(week.week_index));
    }
    for (const week of analytics?.weekly_platform_posts ?? []) {
      const start = normalizeIsoInstant(week.start);
      const end = normalizeIsoInstant(week.end);
      if (!start || !end) continue;
      if (!map.has(`${start}|${end}`)) {
        map.set(`${start}|${end}`, week.label ?? formatWeekScopeLabel(week.week_index));
      }
    }
    return map;
  }, [analytics]);

  const runOptionLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    for (const run of runs) {
      const config = (run.config ?? {}) as Record<string, unknown>;
      const dateStartRaw = typeof config.date_start === "string" ? config.date_start : null;
      const dateEndRaw = typeof config.date_end === "string" ? config.date_end : null;

      let weekLabel = "All Weeks";
      if (dateStartRaw && dateEndRaw) {
        const startIso = normalizeIsoInstant(dateStartRaw);
        const endIso = normalizeIsoInstant(dateEndRaw);
        if (startIso && endIso) {
          weekLabel = weeklyWindowLookup.get(`${startIso}|${endIso}`) ?? formatDateRangeLabel(dateStartRaw, dateEndRaw);
        } else {
          weekLabel = formatDateRangeLabel(dateStartRaw, dateEndRaw);
        }
      }

      let platformLabel = "All Platforms";
      const platformsRaw = config.platforms;
      const configuredPlatforms =
        Array.isArray(platformsRaw)
          ? platformsRaw.map((item) => String(item).toLowerCase()).filter((item) => item in PLATFORM_LABELS)
          : typeof platformsRaw === "string" && platformsRaw !== "all"
            ? [platformsRaw.toLowerCase()].filter((item) => item in PLATFORM_LABELS)
            : [];
      if (configuredPlatforms.length === 1) {
        platformLabel = PLATFORM_LABELS[configuredPlatforms[0]] ?? configuredPlatforms[0];
      } else if (configuredPlatforms.length > 1 && configuredPlatforms.length < 4) {
        platformLabel = configuredPlatforms.map((item) => PLATFORM_LABELS[item] ?? item).join(", ");
      }

      const progressLabel = formatRunProgressLabel(run);
      const totalItems = Number(run.summary?.items_found_total ?? 0);
      const timestamp = run.started_at ?? run.created_at ?? run.completed_at ?? run.cancelled_at;
      const timestampLabel = formatDateTime(timestamp);
      labels.set(
        run.id,
        `${weekLabel} · ${platformLabel} · ${progressLabel} · ${totalItems.toLocaleString()} items · ${timestampLabel} · ${run.id.slice(0, 8)}`,
      );
    }
    return labels;
  }, [runs, weeklyWindowLookup]);

  const activeRunScope = useMemo(() => {
    const fallbackDay = activeRunRequest?.day ?? null;
    const fallbackWeek = activeRunRequest?.week ?? (weekFilter === "all" ? null : weekFilter);
    const fallbackPlatform = activeRunRequest?.platform ?? platformFilter;
    const fallbackWeekLabel = fallbackDay ? formatDayScopeLabel(fallbackDay) : formatWeekScopeLabel(fallbackWeek);
    const fallbackPlatformLabel = formatPlatformScopeLabel(fallbackPlatform);

    if (!selectedRunId || runScopedJobs.length === 0) {
      if (selectedRun?.config) {
        const config = selectedRun.config as Record<string, unknown>;
        const dateStartRaw = typeof config.date_start === "string" ? config.date_start : null;
        const dateEndRaw = typeof config.date_end === "string" ? config.date_end : null;
        let weekLabel = fallbackWeekLabel;
        if (dateStartRaw && dateEndRaw) {
          const dateStartIso = normalizeIsoInstant(dateStartRaw);
          const dateEndIso = normalizeIsoInstant(dateEndRaw);
          weekLabel =
            dateStartIso && dateEndIso
              ? weeklyWindowLookup.get(`${dateStartIso}|${dateEndIso}`) ?? formatDateRangeLabel(dateStartRaw, dateEndRaw)
              : formatDateRangeLabel(dateStartRaw, dateEndRaw);
        } else {
          weekLabel = "All Weeks";
        }

        const platformsRaw = config.platforms;
        const configuredPlatforms =
          Array.isArray(platformsRaw)
            ? platformsRaw.map((item) => String(item).toLowerCase()).filter((item) => item in PLATFORM_LABELS)
            : typeof platformsRaw === "string" && platformsRaw !== "all"
              ? [platformsRaw.toLowerCase()].filter((item) => item in PLATFORM_LABELS)
              : [];

        let platformLabel = "All Platforms";
        if (configuredPlatforms.length === 1) {
          platformLabel = PLATFORM_LABELS[configuredPlatforms[0]] ?? configuredPlatforms[0];
        } else if (configuredPlatforms.length > 1 && configuredPlatforms.length < 4) {
          platformLabel = configuredPlatforms.map((item) => PLATFORM_LABELS[item] ?? item).join(", ");
        }

        return { weekLabel, platformLabel };
      }
      return { weekLabel: fallbackWeekLabel, platformLabel: fallbackPlatformLabel };
    }

    const platformSet = new Set<string>();
    const weekLabelSet = new Set<string>();
    let hasUnboundedWeeks = false;
    for (const job of runScopedJobs) {
      if (job.platform) platformSet.add(job.platform);
      const dateStartRaw = typeof job.config?.date_start === "string" ? job.config.date_start : null;
      const dateEndRaw = typeof job.config?.date_end === "string" ? job.config.date_end : null;
      if (!dateStartRaw || !dateEndRaw) {
        hasUnboundedWeeks = true;
        continue;
      }
      const dateStartIso = normalizeIsoInstant(dateStartRaw);
      const dateEndIso = normalizeIsoInstant(dateEndRaw);
      if (!dateStartIso || !dateEndIso) {
        weekLabelSet.add(formatDateRangeLabel(dateStartRaw, dateEndRaw));
        continue;
      }
      const matchedWeekLabel = weeklyWindowLookup.get(`${dateStartIso}|${dateEndIso}`);
      weekLabelSet.add(matchedWeekLabel ?? formatDateRangeLabel(dateStartRaw, dateEndRaw));
    }

    const sortedPlatforms = Array.from(platformSet).sort((a, b) =>
      (PLATFORM_LABELS[a] ?? a).localeCompare(PLATFORM_LABELS[b] ?? b)
    );
    const platformLabel =
      sortedPlatforms.length === 0
        ? fallbackPlatformLabel
        : sortedPlatforms.length >= Object.keys(PLATFORM_LABELS).length
          ? "All Platforms"
          : sortedPlatforms.map((platform) => PLATFORM_LABELS[platform] ?? platform).join(", ");

    const sortedWeekLabels = Array.from(weekLabelSet).sort((a, b) => a.localeCompare(b));
    const weekLabel = hasUnboundedWeeks || sortedWeekLabels.length === 0 ? "All Weeks" : sortedWeekLabels.join(", ");

    return {
      weekLabel,
      platformLabel,
    };
  }, [activeRunRequest, platformFilter, runScopedJobs, selectedRun, selectedRunId, weekFilter, weeklyWindowLookup]);

  const liveRunLogs = useMemo(() => {
    if (!selectedRunId) return [];
    return [...runScopedJobs]
      .map((job) => {
        const stage =
          (typeof job.config?.stage === "string" ? job.config.stage : undefined) ??
          (typeof job.metadata?.stage === "string" ? job.metadata.stage : undefined) ??
          job.job_type ??
          "posts";
        const timestamp = job.completed_at ?? job.started_at ?? job.created_at ?? null;
        const ts = timestamp ? Date.parse(timestamp) : Number.NaN;
        const counters = getJobStageCounters(job);
        const persistCounters = getJobPersistCounters(job);
        const activity = getJobActivity(job);
        const counterSummary = counters
          ? ` · ${counters.posts}p/${counters.comments}c`
          : typeof job.items_found === "number"
            ? ` · ${job.items_found.toLocaleString()} items`
            : "";
        const persistSummary = persistCounters
          ? ` · saved ${persistCounters.posts_upserted}p/${persistCounters.comments_upserted}c`
          : "";
        const activitySummary = formatJobActivitySummary(activity);
        const account = typeof job.config?.account === "string" && job.config.account ? ` @${job.config.account}` : "";
        return {
          id: job.id,
          timestampMs: Number.isNaN(ts) ? 0 : ts,
          timestampLabel: formatTime(timestamp),
          message: `${PLATFORM_LABELS[job.platform] ?? job.platform} ${stage}${account} ${statusToLogVerb(job.status)}${counterSummary}${persistSummary}${activitySummary ? ` · ${activitySummary}` : ""}`,
        };
      })
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 8);
  }, [runScopedJobs, selectedRunId]);

  const hasRunningJobs = useMemo(() => {
    if (activeRun && ACTIVE_RUN_STATUSES.has(activeRun.status)) {
      return true;
    }
    return runScopedJobs.some((job) => ACTIVE_RUN_STATUSES.has(job.status as SocialRun["status"]));
  }, [activeRun, runScopedJobs]);

  useEffect(() => {
    if (!runningIngest || !activeRunId || !activeRun) return;
    if (!TERMINAL_RUN_STATUSES.has(activeRun.status)) return;

    const summary = activeRun.summary ?? {};
    const completedJobs = Number(summary.completed_jobs ?? 0);
    const failedJobs = Number(summary.failed_jobs ?? 0);
    const totalJobs = Math.max(Number(summary.total_jobs ?? 0), completedJobs + failedJobs);
    const totalItems = Number(summary.items_found_total ?? 0);
    const elapsed = ingestStartedAt ? ` in ${Math.round((Date.now() - ingestStartedAt.getTime()) / 1000)}s` : "";
    const finalVerb = activeRun.status === "cancelled" ? "cancelled" : activeRun.status === "failed" ? "failed" : "complete";
    let msg = `Ingest ${finalVerb}${elapsed}: ${completedJobs} job(s) finished`;
    if (totalJobs > 0) {
      msg += ` of ${totalJobs}`;
    }
    msg += `, ${totalItems.toLocaleString()} items`;
    if (failedJobs > 0) {
      msg += ` · ${failedJobs} failed`;
    }

    const completedRunId = activeRunId;
    setIngestMessage(msg);
    setRunningIngest(false);
    setIngestingWeek(null);
    setIngestingDay(null);
    setIngestingPlatform(null);
    setActiveRunRequest(null);
    setActiveRunId(null);
    setIngestStartedAt(null);
    void fetchAnalytics().catch(() => {});
    void fetchRuns().catch(() => {});
    void fetchRunSummaries().catch(() => {});
    void fetchJobs(completedRunId).catch(() => {});
  }, [activeRun, activeRunId, fetchAnalytics, fetchJobs, fetchRunSummaries, fetchRuns, ingestStartedAt, runningIngest]);

  // Poll for job + run updates using a single-flight loop (no overlapping requests).
  useEffect(() => {
    if (!activeRunId) return;
    if (!hasRunningJobs && !runningIngest) return;

    pollGenerationRef.current += 1;
    const generation = pollGenerationRef.current;
    pollFailureCountRef.current = 0;
    const interval = runningIngest ? 3000 : 5000;
    let timer: number | null = null;
    let cancelled = false;
    let inFlight = false;

    const scheduleNext = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => {
        void poll();
      }, interval);
    };

    const poll = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const nextRuns = await fetchRuns({ runId: activeRunId, limit: 1 });
        if (cancelled || generation !== pollGenerationRef.current) return;

        const currentRun = nextRuns.find((run) => run.id === activeRunId);
        const preserveJobs = Boolean(currentRun && ACTIVE_RUN_STATUSES.has(currentRun.status));
        await fetchJobs(activeRunId, { preserveLastGoodIfEmpty: preserveJobs });
        if (cancelled || generation !== pollGenerationRef.current) return;

        if (!runningIngest) {
          const now = Date.now();
          if (now - lastAnalyticsPollAtRef.current >= ANALYTICS_POLL_REFRESH_MS) {
            lastAnalyticsPollAtRef.current = now;
            void fetchAnalytics()
              .then(() => {
                setSectionErrors((current) => ({ ...current, analytics: null }));
              })
              .catch((analyticsError) => {
                setSectionErrors((current) => ({
                  ...current,
                  analytics:
                    analyticsError instanceof Error ? analyticsError.message : "Failed to load social analytics",
                }));
              });
          }
        }
        pollFailureCountRef.current = 0;
        setPollingStatus((current) => (current === "retrying" ? "recovered" : current));
        setSectionErrors((current) => ({ ...current, runs: null, jobs: null }));
      } catch {
        if (cancelled || generation !== pollGenerationRef.current) return;
        pollFailureCountRef.current += 1;
        if (shouldSetPollingRetry(pollFailureCountRef.current)) {
          setPollingStatus("retrying");
        }
      } finally {
        inFlight = false;
        scheduleNext();
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [activeRunId, fetchAnalytics, fetchJobs, fetchRuns, hasRunningJobs, runningIngest]);

  useEffect(() => {
    if (pollingStatus !== "recovered") return;
    const timer = window.setTimeout(() => setPollingStatus("idle"), 3000);
    return () => window.clearTimeout(timer);
  }, [pollingStatus]);

  // Tick elapsed timer every second for smooth display
  useEffect(() => {
    if (!runningIngest || !ingestStartedAt) {
      setElapsedTick(0);
      return;
    }
    setElapsedTick(Date.now() - ingestStartedAt.getTime());
    const timer = window.setInterval(() => {
      setElapsedTick(Date.now() - ingestStartedAt.getTime());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runningIngest, ingestStartedAt]);

  const cancelActiveRun = useCallback(async () => {
    if (!activeRunId) return;
    setCancellingRun(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/ingest/runs/${activeRunId}/cancel`,
        {
          method: "POST",
          headers,
        },
        { allowDevAdminBypass: true },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to cancel run");
      }

      setIngestMessage(`Run ${activeRunId.slice(0, 8)} cancelled.`);
      setRunningIngest(false);
      setIngestingWeek(null);
      setIngestingDay(null);
      setIngestingPlatform(null);
      setActiveRunRequest(null);
      setSelectedRunId(activeRunId);
      setActiveRunId(null);
      setIngestStartedAt(null);
      await fetchJobs(activeRunId);
      await fetchAnalytics();
      await fetchRuns();
      await fetchRunSummaries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel run");
    } finally {
      setCancellingRun(false);
    }
  }, [activeRunId, fetchAnalytics, fetchJobs, fetchRunSummaries, fetchRuns, getAuthHeaders, seasonNumber, showId]);

  const runIngest = useCallback(async (override?: {
    week?: number;
    day?: string;
    platform?: "all" | Platform;
    ingestMode?: "posts_only" | "posts_and_comments" | "comments_only";
  }) => {
    setRunningIngest(true);
    setError(null);
    setIngestMessage(null);
    setJobs([]);
    setSelectedRunId(null);
    setActiveRunId(null);
    setIngestStartedAt(new Date());

    const effectivePlatform = override?.platform ?? platformFilter;
    const effectiveDay = override?.day?.trim() ? override.day.trim() : null;
    const effectiveWeek = effectiveDay ? null : (override?.week ?? (weekFilter === "all" ? null : weekFilter));
    setIngestingWeek(effectiveWeek);
    setIngestingDay(effectiveDay);
    setIngestingPlatform(effectivePlatform);
    setActiveRunRequest({ week: effectiveWeek, day: effectiveDay, platform: effectivePlatform });

    try {
      const headers = await getAuthHeaders();
      const payload: {
        source_scope: Scope;
        platforms?: Platform[];
        max_posts_per_target: number;
        max_comments_per_post: number;
        max_replies_per_post: number;
        fetch_replies: boolean;
        ingest_mode: "posts_only" | "posts_and_comments" | "comments_only";
        sync_strategy: SyncStrategy;
        allow_inline_dev_fallback: boolean;
        date_start?: string;
        date_end?: string;
      } = {
        source_scope: scope,
        max_posts_per_target: 100000,
        max_comments_per_post: 100000,
        max_replies_per_post: 100000,
        fetch_replies: true,
        ingest_mode: override?.ingestMode ?? "posts_and_comments",
        sync_strategy: syncStrategy,
        allow_inline_dev_fallback: true,
      }

      if (effectivePlatform !== "all") {
        payload.platforms = [effectivePlatform];
      }
      if (effectiveDay) {
        const dayRange = buildIsoDayRange(effectiveDay);
        if (!dayRange) {
          throw new Error("Choose a valid day before starting a day ingest.");
        }
        payload.date_start = dayRange.dateStart;
        payload.date_end = dayRange.dateEnd;
      } else if (effectiveWeek !== null) {
        const weekWindow =
          (analytics?.weekly ?? []).find((item) => item.week_index === effectiveWeek) ??
          (analytics?.weekly_platform_posts ?? []).find((item) => item.week_index === effectiveWeek);
        if (weekWindow) {
          payload.date_start = weekWindow.start;
          payload.date_end = weekWindow.end;
        } else {
          throw new Error(`Could not resolve date range for week ${effectiveWeek}. Try refreshing the page.`);
        }
      }

      const label = effectiveDay
        ? formatDayScopeLabel(effectiveDay)
        : effectiveWeek !== null
          ? (effectiveWeek === 0 ? "Pre-Season" : `Week ${effectiveWeek}`)
          : "Full Season";
      const platformLabel = effectivePlatform === "all" ? "all platforms" : (PLATFORM_LABELS[effectivePlatform] ?? effectivePlatform);
      const modeLabel = syncStrategy === "full_refresh" ? "Full Refresh" : "Incremental";
      setIngestMessage(`Starting ${label} · ${platformLabel} · ${modeLabel}...`);

      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/ingest?season_id=${encodeURIComponent(seasonId)}`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        { allowDevAdminBypass: true },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as IngestProxyErrorPayload;
        throw new Error(formatIngestErrorMessage(data));
      }

      const result = (await response.json().catch(() => ({}))) as {
        status?: string;
        message?: string;
        run_id?: string;
        stages?: string[];
        queued_or_started_jobs?: number;
      };
      const runId = typeof result.run_id === "string" && result.run_id ? result.run_id : null;
      if (!runId) {
        throw new Error(result.message ?? "Ingest started without a run id");
      }
      setActiveRunId(runId);
      setSelectedRunId(runId);

      // Backend returns queued/staged run metadata immediately.
      const stages = (result.stages ?? []).join(" -> ") || "posts -> comments";
      const jobCount = result.queued_or_started_jobs ?? 0;
      setIngestMessage(`${label} · ${platformLabel} · ${modeLabel} — run ${runId} queued (${jobCount} jobs, stages: ${stages}).`);

      // Immediately fetch jobs to pick up the newly created running jobs
      await fetchJobs(runId);
      await fetchRuns();
      await fetchRunSummaries();

      // The hasRunningJobs polling effect will handle ongoing updates.
      // We keep runningIngest=true until polling detects no more running jobs.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run social ingest");
      setIngestMessage(null);
      setRunningIngest(false);
      setCancellingRun(false);
      setIngestingWeek(null);
      setIngestingDay(null);
      setIngestingPlatform(null);
      setActiveRunRequest(null);
      setSelectedRunId(null);
      setActiveRunId(null);
      setIngestStartedAt(null);
    }
  }, [
    analytics,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    getAuthHeaders,
    platformFilter,
    scope,
    seasonId,
    seasonNumber,
    showId,
    syncStrategy,
    weekFilter,
  ]);

  const downloadExport = useCallback(
    async (format: "csv" | "pdf") => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/export?format=${format}&${queryString}`,
          { headers },
          { allowDevAdminBypass: true },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `Failed to export ${format.toUpperCase()}`);
        }

        const blob = await response.blob();
        const fallbackName = `social_report_${showId}_s${seasonNumber}.${format}`;
        const disposition = response.headers.get("content-disposition") ?? "";
        const filenameMatch = disposition.match(/filename="?([^\";]+)"?/i);
        const filename = filenameMatch?.[1] ?? fallbackName;

        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(objectUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to export ${format.toUpperCase()}`);
      }
    },
    [getAuthHeaders, queryString, seasonNumber, showId]
  );

  const weeklyPlatformRows = useMemo(
    () => [...(analytics?.weekly_platform_posts ?? [])].sort((a, b) => a.week_index - b.week_index),
    [analytics],
  );
  const { sectionErrorItems, staleFallbackItems } = useMemo(() => {
    const labels: Record<keyof typeof sectionErrors, string> = {
      analytics: "Analytics",
      targets: "Targets",
      runs: "Runs",
      jobs: "Jobs",
    };
    const items = (Object.keys(sectionErrors) as Array<keyof typeof sectionErrors>)
      .filter((key) => Boolean(sectionErrors[key]))
      .map((key) => ({
        key,
        label: labels[key],
        message: sectionErrors[key] as string,
        staleAt:
          key === "analytics" || key === "targets" || key === "runs"
            ? sectionLastSuccessAt[key]
            : null,
      }));
    const staleFallback = items.filter(
      (item) => Boolean(item.staleAt) && isTransientBackendSectionError(item.message),
    );
    const surfaced = items.filter(
      (item) => !Boolean(item.staleAt) || !isTransientBackendSectionError(item.message),
    );
    return { sectionErrorItems: surfaced, staleFallbackItems: staleFallback };
  }, [sectionErrors, sectionLastSuccessAt]);
  const weeklyDailyActivityRows = useMemo(
    () => analytics?.weekly_daily_activity ?? [],
    [analytics],
  );
  const heatmapPlatform: Platform | null = useMemo(() => {
    if (platformTab === "overview") return null;
    return platformTab;
  }, [platformTab]);
  const weeklyHeatmapMaxValue = useMemo(() => {
    const values = weeklyDailyActivityRows.flatMap((weekRow) =>
      weekRow.days.map((day) => getWeeklyDayValue(day, weeklyMetric, heatmapPlatform))
    );
    return Math.max(0, ...values);
  }, [heatmapPlatform, weeklyDailyActivityRows, weeklyMetric]);
  const weeklyHeatmapTotals = useMemo(() => {
    const totals = new Map<number, number>();
    for (const weekRow of weeklyDailyActivityRows) {
      const total = weekRow.days.reduce(
        (sum, day) => sum + getWeeklyDayValue(day, weeklyMetric, heatmapPlatform),
        0,
      );
      totals.set(weekRow.week_index, total);
    }
    return totals;
  }, [heatmapPlatform, weeklyDailyActivityRows, weeklyMetric]);
  const weeklyFlagsByWeek = useMemo(() => {
    const grouped = new Map<number, Array<NonNullable<AnalyticsResponse["weekly_flags"]>[number]>>();
    for (const flag of analytics?.weekly_flags ?? []) {
      const current = grouped.get(flag.week_index) ?? [];
      current.push(flag);
      grouped.set(flag.week_index, current);
    }
    return grouped;
  }, [analytics]);
  const dataQuality = analytics?.summary.data_quality;
  const heatmapTileSizeClass = useMemo(() => getHeatmapTileSizeClass(socialDensity), [socialDensity]);
  const runHealth = useMemo(() => {
    if (runSummaries.length === 0) {
      return {
        successRate: null as number | null,
        medianDurationSeconds: null as number | null,
      };
    }
    const successCandidates = runSummaries
      .map((item) => item.success_rate_pct)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const successRate =
      successCandidates.length > 0
        ? Number((successCandidates.reduce((sum, value) => sum + value, 0) / successCandidates.length).toFixed(1))
        : null;
    const durations = runSummaries
      .map((item) => item.duration_seconds)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0)
      .sort((a, b) => a - b);
    const medianDurationSeconds =
      durations.length === 0
        ? null
        : durations.length % 2 === 1
          ? durations[Math.floor(durations.length / 2)]
          : Math.round((durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2);
    return {
      successRate,
      medianDurationSeconds,
    };
  }, [runSummaries]);
  const activeFailureErrorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of runScopedJobs) {
      if (job.status !== "failed" && job.status !== "retrying") continue;
      const code =
        job.job_error_code ??
        ((job.metadata as Record<string, unknown> | undefined)?.job_error_code as string | undefined) ??
        "UNKNOWN";
      const key = String(code || "UNKNOWN").toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  }, [runScopedJobs]);
  const commentGapFlagCount = useMemo(
    () => (analytics?.weekly_flags ?? []).filter((flag) => flag.code === "comment_gap").length,
    [analytics],
  );
  const benchmarkSummary = useMemo(() => {
    const benchmark = analytics?.benchmark;
    if (!benchmark) {
      return null;
    }
    const comparison =
      benchmarkCompareMode === "previous"
        ? benchmark.previous_week?.delta_pct
        : benchmark.trailing_3_week_avg?.delta_pct;
    const comparisonLabel = benchmarkCompareMode === "previous"
      ? benchmark.previous_week.week_index == null
        ? "No previous week"
        : `vs Week ${benchmark.previous_week.week_index}`
      : `vs trailing ${benchmark.trailing_3_week_avg.window_size}-week avg`;
    const postsDeltaPct = typeof comparison?.posts === "number" ? comparison.posts : null;
    const commentsDeltaPct = typeof comparison?.comments === "number" ? comparison.comments : null;
    const engagementDeltaPct = typeof comparison?.engagement === "number" ? comparison.engagement : null;
    return {
      weekIndex: benchmark.week_index,
      comparisonLabel,
      postsDeltaPct,
      commentsDeltaPct,
      engagementDeltaPct,
      consistencyScorePct: benchmark.consistency_score_pct ?? {},
    };
  }, [analytics, benchmarkCompareMode]);
  const hashtagPlatformsInScope = useMemo(() => {
    if (platformTab === "overview") return HASHTAG_PLATFORMS;
    return [platformTab];
  }, [platformTab]);
  const configuredHashtagSections = useMemo(() => {
    return hashtagPlatformsInScope
      .map((platform) => {
        const tags = new Set<string>();
        for (const target of targets) {
          if (target.platform !== platform) continue;
          for (const rawTag of target.hashtags ?? []) {
            const normalized = normalizeHashtag(rawTag);
            if (normalized) tags.add(normalized);
          }
        }
        return {
          platform,
          tags: Array.from(tags).sort((a, b) => a.localeCompare(b)),
        };
      })
      .filter((section) => section.tags.length > 0);
  }, [hashtagPlatformsInScope, targets]);
  const observedHashtagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const increment = (tag: string) => counts.set(tag, (counts.get(tag) ?? 0) + 1);
    const includePlatform = new Set<string>(hashtagPlatformsInScope);
    for (const item of analytics?.leaderboards.bravo_content ?? []) {
      if (!includePlatform.has(item.platform)) continue;
      for (const tag of extractHashtags(item.text)) increment(tag);
    }
    for (const item of analytics?.leaderboards.viewer_discussion ?? []) {
      if (!includePlatform.has(item.platform)) continue;
      for (const tag of extractHashtags(item.text)) increment(tag);
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [analytics, hashtagPlatformsInScope]);
  const isBravoView = analyticsView === "bravo";
  const isSentimentView = analyticsView === "sentiment";
  const isHashtagsView = analyticsView === "hashtags";
  const isAdvancedView = analyticsView === "advanced";
  const isRedditView = analyticsView === "reddit";
  const selectedRunLabel = selectedRunId ? (runOptionLabelById.get(selectedRunId) ?? null) : null;
  const truncatedSeasonId = useMemo(() => truncateIdentifier(seasonId), [seasonId]);
  const selectLatestRun = useCallback(() => {
    if (!runs.length) return;
    const preferredRun = runs.find((run) => ACTIVE_RUN_STATUSES.has(run.status)) ?? runs[0];
    setSelectedRunId(preferredRun?.id ?? null);
    setSectionErrors((current) => ({ ...current, jobs: null }));
  }, [runs]);
  const focusIngestControls = useCallback(() => {
    ingestPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.requestAnimationFrame(() => {
      runSeasonIngestButtonRef.current?.focus();
    });
  }, []);
  const copySeasonId = useCallback(async () => {
    try {
      const copied = await copyTextToClipboard(seasonId);
      setSeasonIdCopyNotice(copied ? "Copied" : "Copy failed");
    } catch {
      setSeasonIdCopyNotice("Copy failed");
    }
  }, [seasonId]);

  useEffect(() => {
    if (!seasonIdCopyNotice) return;
    if (seasonIdCopyTimerRef.current !== null) {
      window.clearTimeout(seasonIdCopyTimerRef.current);
    }
    seasonIdCopyTimerRef.current = window.setTimeout(() => {
      setSeasonIdCopyNotice(null);
      seasonIdCopyTimerRef.current = null;
    }, 1800);
    return () => {
      if (seasonIdCopyTimerRef.current !== null) {
        window.clearTimeout(seasonIdCopyTimerRef.current);
      }
    };
  }, [seasonIdCopyNotice]);

  const ingestExportPanel = (
    <article
      ref={ingestPanelRef}
      tabIndex={-1}
      aria-label="Ingest and export controls"
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
    >
      <h4 className="mb-4 text-lg font-semibold text-zinc-900">Ingest + Export</h4>
      <div className="space-y-2 text-sm text-zinc-600">
        <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Sync Mode
          <select
            value={syncStrategy}
            onChange={(event) => setSyncStrategy(event.target.value as SyncStrategy)}
            disabled={runningIngest}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="incremental">Incremental (Recommended)</option>
            <option value="full_refresh">Full Refresh</option>
          </select>
        </label>
        <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Specific Day
          <input
            type="date"
            value={dayFilter}
            onChange={(event) => setDayFilter(event.target.value)}
            disabled={runningIngest}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!dayFilter) {
              setError("Choose a day before running a day-specific ingest.");
              return;
            }
            void runIngest({ day: dayFilter, platform: "all" });
          }}
          disabled={runningIngest || !dayFilter}
          className={`w-full rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            runningIngest && ingestingDay
              ? "animate-pulse border-blue-400 bg-blue-50 text-blue-700"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          {runningIngest && ingestingDay ? `Running ${formatDayScopeLabel(ingestingDay)}...` : "Run Specific Day (All Platforms)"}
        </button>
        <button
          ref={runSeasonIngestButtonRef}
          type="button"
          onClick={() => runIngest()}
          disabled={runningIngest}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {runningIngest ? "Running Ingest..." : "Run Season Ingest (All)"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          {(["instagram", "youtube", "tiktok", "twitter"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => runIngest({ platform: p })}
              disabled={runningIngest}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                runningIngest && ingestingPlatform === p
                  ? "animate-pulse border-blue-400 bg-blue-50 text-blue-700"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {runningIngest && ingestingPlatform === p ? `${PLATFORM_LABELS[p]}...` : PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["instagram", "youtube", "tiktok", "twitter"] as const).map((p) => (
            <button
              key={`day-${p}`}
              type="button"
              onClick={() => {
                if (!dayFilter) {
                  setError("Choose a day before running a day-specific ingest.");
                  return;
                }
                void runIngest({ day: dayFilter, platform: p });
              }}
              disabled={runningIngest || !dayFilter}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                runningIngest && ingestingPlatform === p && Boolean(ingestingDay)
                  ? "animate-pulse border-blue-400 bg-blue-50 text-blue-700"
                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {runningIngest && ingestingPlatform === p && Boolean(ingestingDay) ? `${PLATFORM_LABELS[p]} Day...` : `${PLATFORM_LABELS[p]} Day`}
            </button>
          ))}
        </div>
        {activeRunId && hasRunningJobs && (
          <button
            type="button"
            onClick={() => {
              void cancelActiveRun();
            }}
            disabled={cancellingRun}
            className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancellingRun ? "Cancelling Run..." : `Cancel Active Run (${activeRunId.slice(0, 8)})`}
          </button>
        )}
        <button
          type="button"
          onClick={() => downloadExport("csv")}
          className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => downloadExport("pdf")}
          className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
        >
          Export PDF
        </button>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Run scope:{" "}
        <span className="font-semibold text-zinc-700">
          {activeRunScope.weekLabel}
        </span>
        {" · "}
        <span className="font-semibold text-zinc-700">
          {activeRunScope.platformLabel}
        </span>
        {selectedRunId && (
          <>
            {" · "}
            <span className="font-semibold text-zinc-700">Run {selectedRunId.slice(0, 8)}</span>
          </>
        )}
      </p>
      {selectedRunId && !runningIngest && liveRunLogs.length > 0 && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
          <p className="font-semibold text-zinc-700">Last Run Log</p>
          <div className="mt-1 space-y-0.5">
            {liveRunLogs.slice(0, 4).map((entry) => (
              <p key={entry.id} className="flex items-center gap-2">
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-400">{entry.timestampLabel}</span>
                <span>{entry.message}</span>
              </p>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
        <p className="font-semibold text-zinc-700">Configured Targets</p>
        <ul className="mt-1 space-y-1">
          {targets.map((target) => (
            <li key={target.platform}>
              {(PLATFORM_LABELS[target.platform] ?? target.platform) + ": "}
              {(target.accounts ?? []).join(", ") || "(none)"}
            </li>
          ))}
          {targets.length === 0 && <li>No active targets configured.</li>}
        </ul>
      </div>
    </article>
  );

  return (
    <div className="space-y-6">
      <section
        aria-label="Season social analytics controls"
        className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <header className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                  Season Social Analytics
                </p>
                <p
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${
                    hasRunningJobs ? "bg-zinc-300 text-zinc-800" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {hasRunningJobs ? "Run Active" : "Idle"}
                </p>
              </div>
              <h3 className="text-2xl font-bold leading-tight text-zinc-900 sm:text-[28px]">
                {showName} · Season {seasonNumber}
              </h3>
              <p className="max-w-2xl text-sm text-zinc-500">
                Bravo-owned social analytics with viewer sentiment and weekly rollups.
              </p>
            </header>

            <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-100 shadow-sm sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300">Current Run</p>
              {selectedRunLabel ? (
                <p className="mt-2 break-words text-sm font-medium leading-relaxed text-zinc-100">{selectedRunLabel}</p>
              ) : (
                <div className="mt-2 space-y-3">
                  <p className="text-sm font-medium text-zinc-100">No run selected.</p>
                  <p className="text-xs text-zinc-300">Pick the latest run or jump to ingest controls to start one.</p>
                  <div className="flex flex-wrap gap-2">
                    {runs.length > 0 && (
                      <button
                        type="button"
                        onClick={selectLatestRun}
                        disabled={runningIngest}
                        className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Select Latest Run
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={focusIngestControls}
                      className="rounded-lg border border-zinc-500 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition hover:bg-zinc-700"
                    >
                      Start New Ingest
                    </button>
                  </div>
                </div>
              )}
            </article>
          </div>

          <aside className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Season Details</p>
            <dl className="mt-3 space-y-2">
              <div className="rounded-lg bg-zinc-50 px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Season ID</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-zinc-800" title={seasonId}>
                    {truncatedSeasonId}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void copySeasonId();
                    }}
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Copy
                  </button>
                  <span
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500"
                  >
                    {seasonIdCopyNotice}
                  </span>
                </dd>
              </div>
              <div className="rounded-lg bg-zinc-50 px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Last Updated</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-800">{formatDateTimeFromDate(lastUpdated)}</dd>
              </div>
              {analytics?.window?.start && analytics?.window?.end && (
                <div className="rounded-lg bg-zinc-50 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Window</dt>
                  <dd className="mt-1 text-sm font-medium text-zinc-800">
                    {formatDateTime(analytics.window.start)} to {formatDateTime(analytics.window.end)}
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>

        {!hidePlatformTabs && (
          <nav className="mt-4 flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100/70 p-1" aria-label="Social platform tabs">
            {PLATFORM_TABS.map((tab) => {
              const isActive = platformTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setPlatformTabAndUrl(tab.key);
                  }}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                    isActive
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-600 hover:bg-white/80 hover:text-zinc-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}

        <div aria-label="Social analytics filters" className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Filters</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Scope
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as Scope)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <option value="bravo">Bravo</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Week
              <select
                value={weekFilter}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (nextValue === "all") {
                    setWeekFilter("all");
                    return;
                  }
                  const parsed = Number.parseInt(nextValue, 10);
                  setWeekFilter(Number.isFinite(parsed) ? parsed : "all");
                }}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <option value="all">All Weeks</option>
                {(analytics?.weekly ?? []).map((week) => (
                  <option key={week.week_index} value={week.week_index}>
                    {week.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Run
              <select
                value={selectedRunId ?? ""}
                onChange={(event) => {
                  const nextRunId = event.target.value || null;
                  setSelectedRunId(nextRunId);
                  setSectionErrors((current) => ({ ...current, jobs: null }));
                }}
                disabled={runningIngest}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">No Run Selected</option>
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {runOptionLabelById.get(run.id) ??
                      `${run.id.slice(0, 8)} · ${run.status} · ${formatDateTime(run.created_at ?? run.started_at ?? run.completed_at)}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {(pollingStatus !== "idle" || staleFallbackItems.length > 0 || sectionErrorItems.length > 0) && (
          <div className="mt-4 space-y-2">
            {pollingStatus === "retrying" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Live updates temporarily unavailable. Retrying...
              </div>
            )}
            {pollingStatus === "recovered" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Live updates connection restored.
              </div>
            )}
            {staleFallbackItems.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                Showing last successful social data while live refresh retries.
              </div>
            )}
            {sectionErrorItems.map((item) => (
              <div key={item.key} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <span className="font-semibold">{item.label}:</span> {item.message}
                {item.staleAt && (
                  <p className="mt-1 text-xs font-medium text-amber-800">
                    Showing last successful data from {formatDateTimeFromDate(item.staleAt)}.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {ingestMessage && !error && (() => {
        const activeJobs = runScopedJobs;
        const totalJobs = activeJobs.length;
        const completedJobs = activeJobs.filter((j) => j.status === "completed");
        const failedJobs = activeJobs.filter((j) => j.status === "failed");
        const finishedCount = completedJobs.length + failedJobs.length;
        const progressPct = totalJobs > 0 ? Math.round((finishedCount / totalJobs) * 100) : 0;
        const totalItemsFound = activeJobs.reduce((s, j) => s + (j.items_found ?? 0), 0);
        const elapsedSec = Math.floor(elapsedTick / 1000);
        const elapsedMin = Math.floor(elapsedSec / 60);
        const elapsedStr = elapsedMin > 0 ? `${elapsedMin}m ${String(elapsedSec % 60).padStart(2, "0")}s` : `${elapsedSec}s`;

        const getStage = (j: SocialJob) =>
          (typeof j.config?.stage === "string" ? j.config.stage : undefined) ??
          (typeof j.metadata?.stage === "string" ? j.metadata.stage : "unknown");

        const getAccount = (j: SocialJob) =>
          typeof j.config?.account === "string" && j.config.account ? j.config.account : null;

        const postsStageJobs = activeJobs.filter((j) => getStage(j) === "posts");
        const commentsStageJobs = activeJobs.filter((j) => getStage(j) === "comments");

        const stageProgress = (stageJobs: SocialJob[], label: string) => {
          if (stageJobs.length === 0) return null;
          const done = stageJobs.filter((j) => j.status === "completed" || j.status === "failed").length;
          const pct = Math.round((done / stageJobs.length) * 100);
          const items = stageJobs.reduce((s, j) => s + (j.items_found ?? 0), 0);
          return { label, total: stageJobs.length, done, pct, items, jobs: stageJobs };
        };

        const stages = [stageProgress(postsStageJobs, "Posts"), stageProgress(commentsStageJobs, "Comments")].filter(Boolean) as
          NonNullable<ReturnType<typeof stageProgress>>[];

        // Per-platform completion stats for summary
        const platformStats = new Map<string, { posts: number; comments: number }>();
        for (const j of completedJobs) {
          const counters = (j.metadata as Record<string, unknown>)?.stage_counters as Record<string, number> | undefined;
          const existing = platformStats.get(j.platform) ?? { posts: 0, comments: 0 };
          existing.posts += counters?.posts ?? 0;
          existing.comments += counters?.comments ?? 0;
          platformStats.set(j.platform, existing);
        }

        const statusDotClass: Record<string, string> = {
          running: "bg-blue-500 animate-pulse",
          completed: "bg-green-500",
          failed: "bg-red-500",
          queued: "bg-zinc-300",
          pending: "bg-zinc-300",
          retrying: "bg-amber-400 animate-pulse",
          cancelled: "bg-zinc-300",
        };
        const statusTextClass: Record<string, string> = {
          running: "text-blue-700",
          completed: "text-green-700",
          failed: "text-red-600",
          queued: "text-zinc-500",
          pending: "text-zinc-500",
          retrying: "text-amber-600",
          cancelled: "text-zinc-400",
        };
        const statusVerb: Record<string, string> = {
          running: "scraping",
          completed: "done",
          failed: "failed",
          queued: "queued",
          pending: "queued",
          retrying: "retrying",
          cancelled: "cancelled",
        };

        return (
          <div className={`rounded-xl border px-5 py-4 text-sm ${
            runningIngest
              ? "border-blue-200 bg-blue-50 text-blue-800"
              : failedJobs.length > 0
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-green-200 bg-green-50 text-green-700"
          }`}>
            {/* Header row: message + elapsed */}
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{ingestMessage}</p>
              {runningIngest && ingestStartedAt && (
                <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-mono font-semibold text-blue-700 tabular-nums">
                  {elapsedStr}
                </span>
              )}
            </div>

            {/* Overall progress bar */}
            {runningIngest && totalJobs > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {finishedCount}/{totalJobs} jobs · {totalItemsFound.toLocaleString()} items
                  </span>
                  <span className="font-semibold tabular-nums">{progressPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-blue-200">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${Math.max(2, progressPct)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Per-stage progress */}
            {runningIngest && stages.length > 0 && (
              <div className="mt-4 space-y-4">
                {stages.map((s) => {
                  const allDone = s.done === s.total;
                  const hasActive = s.jobs.some((j) => j.status === "running" || j.status === "retrying");
                  return (
                    <div key={s.label}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase tracking-wide">{s.label}</span>
                          {hasActive && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                              Active
                            </span>
                          )}
                          {allDone && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                              Complete
                            </span>
                          )}
                        </div>
                        <span className="tabular-nums">{s.done}/{s.total} · {s.items.toLocaleString()} items</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-blue-200">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${Math.max(2, s.pct)}%` }}
                        />
                      </div>
                      {/* Per-platform rows within stage */}
                      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {s.jobs.map((j) => {
                          const counters = getJobStageCounters(j);
                          const persistCounters = getJobPersistCounters(j);
                          const activitySummary = formatJobActivitySummary(getJobActivity(j));
                          const postsFound = counters?.posts ?? 0;
                          const commentsFound = counters?.comments ?? 0;
                          const account = getAccount(j);
                          const jobDuration = j.started_at
                            ? `${Math.round(((j.completed_at ? new Date(j.completed_at).getTime() : Date.now()) - new Date(j.started_at).getTime()) / 1000)}s`
                            : null;
                          return (
                            <div key={j.id} className="flex items-center gap-1.5 rounded bg-white/50 px-2 py-1 text-xs">
                              <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusDotClass[j.status] ?? "bg-zinc-300"}`} />
                              <span className="font-semibold">{PLATFORM_LABELS[j.platform] ?? j.platform}</span>
                              {account && <span className="text-blue-600">@{account}</span>}
                              <span className={`ml-auto ${statusTextClass[j.status] ?? "text-zinc-500"}`}>
                                {statusVerb[j.status] ?? j.status}
                              </span>
                              {counters ? (
                                <span className="tabular-nums text-zinc-700">{postsFound}p/{commentsFound}c</span>
                              ) : (
                                <span className="tabular-nums text-zinc-700">{(j.items_found ?? 0).toLocaleString()} items</span>
                              )}
                              {persistCounters && (
                                <span className="tabular-nums text-zinc-500">
                                  saved {persistCounters.posts_upserted}p/{persistCounters.comments_upserted}c
                                </span>
                              )}
                              {activitySummary && <span className="text-zinc-400">{activitySummary}</span>}
                              {jobDuration && j.status !== "queued" && j.status !== "pending" && (
                                <span className="tabular-nums text-zinc-400">{jobDuration}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Live activity log (latest events) */}
            {runningIngest && liveRunLogs.length > 0 && (
              <div className="mt-4 border-t border-blue-200 pt-3">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600">Activity Log</p>
                <div className="space-y-0.5">
                  {liveRunLogs.slice(0, 6).map((entry) => (
                    <p key={entry.id} className="flex items-center gap-2 text-xs">
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-blue-500">{entry.timestampLabel}</span>
                      <span className="text-blue-900">{entry.message}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Completed summary with per-platform breakdown */}
            {!runningIngest && completedJobs.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  {Array.from(platformStats.entries())
                    .sort(([a], [b]) => (PLATFORM_LABELS[a] ?? a).localeCompare(PLATFORM_LABELS[b] ?? b))
                    .map(([platform, stats]) => (
                      <span key={platform} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        failedJobs.some((j) => j.platform === platform)
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {PLATFORM_LABELS[platform] ?? platform}
                        <span className="font-semibold tabular-nums">{stats.posts}p / {stats.comments}c</span>
                      </span>
                    ))}
                </div>
                {failedJobs.length > 0 && (
                  <div className="text-xs text-red-600">
                    {failedJobs.length} job{failedJobs.length !== 1 ? "s" : ""} failed:{" "}
                    {failedJobs.map((j) => `${PLATFORM_LABELS[j.platform] ?? j.platform} ${getStage(j)}`).join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {isRedditView ? (
        <RedditSourcesManager
          mode="season"
          showId={showId}
          showName={showName}
          seasonId={seasonId}
          seasonNumber={seasonNumber}
        />
      ) : loading && !analytics ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 shadow-sm">
          Loading social analytics...
        </div>
      ) : (
        <>
          {(isBravoView || isSentimentView) && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Content Volume</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{analytics?.summary.total_posts ?? 0}</p>
              <p className="mt-1 text-xs text-zinc-500">Bravo posts/videos captured</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Viewer Comments</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{analytics?.summary.total_comments ?? 0}</p>
              <p className="mt-1 text-xs text-zinc-500">Comment/reply records persisted</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Engagement</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">
                {(analytics?.summary.total_engagement ?? 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Cross-platform interactions</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Sentiment Mix</p>
              <div className="mt-2 space-y-1 text-sm">
                <p className="font-semibold text-emerald-700">
                  Positive {formatPercent(analytics?.summary.sentiment_mix.positive ?? 0)}
                </p>
                <p className="font-semibold text-zinc-600">
                  Neutral {formatPercent(analytics?.summary.sentiment_mix.neutral ?? 0)}
                </p>
                <p className="font-semibold text-red-700">
                  Negative {formatPercent(analytics?.summary.sentiment_mix.negative ?? 0)}
                </p>
              </div>
            </article>
            </section>
          )}

          {isBravoView && (
            <section className="grid gap-6 xl:grid-cols-3">
            <article className="xl:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-lg font-semibold text-zinc-900">Weekly Trend</h4>
                  <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                    {platformTab === "youtube" && weeklyMetric === "posts"
                      ? "YouTube Posts Schedule"
                      : "Episode-air anchored"}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setWeeklyMetric("posts")}
                    className={`rounded px-2.5 py-1 transition ${
                      weeklyMetric === "posts"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Post Count
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeeklyMetric("comments")}
                    className={`rounded px-2.5 py-1 transition ${
                      weeklyMetric === "comments"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Comment Count
                  </button>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setSocialDensity("compact");
                      setSocialPreferenceInUrl(SOCIAL_DENSITY_QUERY_KEY, null);
                    }}
                    className={`rounded px-2.5 py-1 transition ${
                      socialDensity === "compact"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSocialDensity("comfortable");
                      setSocialPreferenceInUrl(SOCIAL_DENSITY_QUERY_KEY, "comfortable");
                    }}
                    className={`rounded px-2.5 py-1 transition ${
                      socialDensity === "comfortable"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Comfortable
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !socialAlertsEnabled;
                    setSocialAlertsEnabled(next);
                    setSocialPreferenceInUrl(SOCIAL_ALERTS_QUERY_KEY, next ? null : "off");
                  }}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Alerts {socialAlertsEnabled ? "On" : "Off"}
                </button>
              </div>
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Coverage</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {formatPctLabel(dataQuality?.comments_saved_pct_overall)}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Freshness</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {formatFreshnessLabel(dataQuality?.data_freshness_minutes)}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Last Ingest</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {formatDateTime(dataQuality?.last_post_at)}
                  </p>
                </div>
              </div>
              {commentGapFlagCount > 0 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Comment capture gaps detected in {commentGapFlagCount} week
                  {commentGapFlagCount === 1 ? "" : "s"}.
                  {" "}
                  <button
                    type="button"
                    onClick={() => {
                      void runIngest({ ingestMode: "comments_only" });
                    }}
                    disabled={runningIngest}
                    className="font-semibold underline disabled:opacity-60"
                  >
                    Run comments-only backfill
                  </button>
                  .
                </div>
              )}
              <div className="space-y-3">
                {weeklyDailyActivityRows.map((weekRow) => {
                  const weekTotal = weeklyHeatmapTotals.get(weekRow.week_index) ?? 0;
                  const weekFlags = socialAlertsEnabled ? (weeklyFlagsByWeek.get(weekRow.week_index) ?? []) : [];
                  return (
                    <div
                      key={weekRow.week_index}
                      className="space-y-1"
                      data-testid={`weekly-heatmap-row-${weekRow.week_index}`}
                    >
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="flex flex-col gap-1">
                          <span>{weekRow.label}</span>
                          <span className="text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                            {formatDateOnly(weekRow.start)} to {formatDateOnly(weekRow.end)}
                          </span>
                          {weekFlags.length > 0 && (
                            <span className="flex flex-wrap items-center gap-1">
                              {weekFlags.map((flag) => (
                                <button
                                  key={`${weekRow.week_index}-${flag.code}`}
                                  type="button"
                                  onClick={() => {
                                    setWeekFilter(weekRow.week_index);
                                    router.replace(buildWeekDetailHref(weekRow.week_index) as Route, { scroll: false });
                                  }}
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getWeeklyFlagToneClass(flag.severity)}`}
                                  title={flag.message}
                                >
                                  {flag.code.replaceAll("_", " ")}
                                </button>
                              ))}
                            </span>
                          )}
                        </span>
                        <span>
                          <span data-testid={`weekly-heatmap-total-${weekRow.week_index}`}>
                            {weekTotal.toLocaleString()} {weeklyMetric}
                          </span>
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-zinc-100 bg-zinc-50 p-2">
                        <div className="inline-grid grid-cols-7 gap-1.5">
                        {weekRow.days.map((day) => {
                          const value = getWeeklyDayValue(day, weeklyMetric, heatmapPlatform);
                          const monthDay = getMonthDayLabel(day.date_local);
                          const [monthLabel, dayLabel] = monthDay.split(" ");
                          return (
                            <div
                              key={`${weekRow.week_index}-${day.day_index}`}
                              data-testid={`weekly-heatmap-day-${weekRow.week_index}-${day.day_index}`}
                              title={`${day.date_local} · ${value.toLocaleString()} ${weeklyMetric}`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  router.replace(buildWeekDetailHref(weekRow.week_index, day.date_local) as Route, {
                                    scroll: false,
                                  });
                                }}
                                aria-label={`${weekRow.label} ${day.date_local} ${value.toLocaleString()} ${weeklyMetric}`}
                                className={`flex ${heatmapTileSizeClass} flex-col items-center justify-center rounded px-1 font-semibold tabular-nums ${getHeatmapToneClass(value, weeklyHeatmapMaxValue)}`}
                              >
                                <span className="sr-only">{monthDay}</span>
                                <span className="leading-none">{monthLabel}</span>
                                <span className="leading-none">{dayLabel}</span>
                              </button>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(analytics?.weekly?.length ?? 0) > 0 && weeklyDailyActivityRows.length === 0 && (
                  <p data-testid="weekly-heatmap-unavailable" className="text-sm text-zinc-500">
                    Daily schedule unavailable for selected filters.
                  </p>
                )}
                {(analytics?.weekly?.length ?? 0) === 0 && (
                  <p className="text-sm text-zinc-500">No weekly data for selected filters.</p>
                )}
              </div>
            </article>
            {ingestExportPanel}
            </section>
          )}

          {isAdvancedView && (
            <section className="grid gap-6 xl:grid-cols-3">
              {ingestExportPanel}
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-zinc-900">Run Health</h4>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Success Rate</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900">
                      {formatPctLabel(runHealth.successRate)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Median Duration</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900">
                      {formatDurationLabel(runHealth.medianDurationSeconds)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Active Failures</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {activeFailureErrorCounts.length === 0 && (
                        <span className="text-xs text-zinc-500">No active failures</span>
                      )}
                      {activeFailureErrorCounts.map((item) => (
                        <span
                          key={item.code}
                          className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700"
                        >
                          {item.code}: {item.count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {runSummaryError && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {runSummaryError}
                  </p>
                )}
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-lg font-semibold text-zinc-900">Consistency &amp; Momentum</h4>
                  <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setBenchmarkCompareMode("previous")}
                      className={`rounded px-2 py-1 ${
                        benchmarkCompareMode === "previous"
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500"
                      }`}
                    >
                      Vs Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setBenchmarkCompareMode("trailing")}
                      className={`rounded px-2 py-1 ${
                        benchmarkCompareMode === "trailing"
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500"
                      }`}
                    >
                      Vs 3wk
                    </button>
                  </div>
                </div>
                {!benchmarkSummary ? (
                  <p className="mt-4 text-sm text-zinc-500">Benchmark data unavailable.</p>
                ) : (
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                      Week {benchmarkSummary.weekIndex} {benchmarkSummary.comparisonLabel}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Posts</p>
                        <p className="mt-1 font-semibold text-zinc-900">
                          {benchmarkSummary.postsDeltaPct == null ? "N/A" : `${benchmarkSummary.postsDeltaPct}%`}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Comments</p>
                        <p className="mt-1 font-semibold text-zinc-900">
                          {benchmarkSummary.commentsDeltaPct == null ? "N/A" : `${benchmarkSummary.commentsDeltaPct}%`}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Engagement</p>
                        <p className="mt-1 font-semibold text-zinc-900">
                          {benchmarkSummary.engagementDeltaPct == null ? "N/A" : `${benchmarkSummary.engagementDeltaPct}%`}
                        </p>
                      </div>
                    </div>
                    <p className="pt-1 text-xs text-zinc-500">
                      Consistency:
                      {" "}
                      {Object.entries(benchmarkSummary.consistencyScorePct)
                        .map(([platform, value]) => `${PLATFORM_LABELS[platform] ?? platform} ${formatPctLabel(value ?? null)}`)
                        .join(" · ") || "N/A"}
                    </p>
                  </div>
                )}
              </article>
            </section>
          )}

          {(isBravoView || isAdvancedView) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-zinc-900">Weekly Bravo Post Count Table</h4>
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Trailer to Finale</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-[0.12em] text-zinc-500">
                    <th className="px-3 py-2 font-semibold">Week</th>
                    <th className="px-3 py-2 font-semibold">Window</th>
                    <th className="px-3 py-2 font-semibold">Instagram</th>
                    <th className="px-3 py-2 font-semibold">YouTube</th>
                    <th className="px-3 py-2 font-semibold">TikTok</th>
                    <th className="px-3 py-2 font-semibold">Twitter/X</th>
                    <th className="px-3 py-2 font-semibold">Total</th>
                    <th className="px-3 py-2 font-semibold">PROGRESS</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyPlatformRows.map((week) => {
                    const totalCoverage = getTotalCoverage(week);
                    const weekLinkQuery = new URLSearchParams({
                      source_scope: scope,
                      season_id: seasonId,
                    });
                    if (platformTab !== "overview") {
                      weekLinkQuery.set("social_platform", platformTab);
                    }
                    if (analyticsView !== "bravo") {
                      weekLinkQuery.set("social_view", analyticsView);
                    }
                    return (
                      <tr key={`table-week-${week.week_index}`} className="border-b border-zinc-100 text-zinc-700">
                        <td className="px-3 py-2 font-semibold">
                          <Link
                            href={buildSeasonSocialWeekUrl({
                              showSlug: showRouteSlug,
                              seasonNumber,
                              weekIndex: week.week_index,
                              query: weekLinkQuery,
                            }) as "/admin/trr-shows"}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {week.label ?? (week.week_index === 0 ? "Pre-Season" : `Week ${week.week_index}`)}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-500">
                          {formatDateTime(week.start)} to {formatDateTime(week.end)}
                        </td>
                        {PLATFORM_ORDER.map((platform) => {
                          const coverage = getPlatformCoverage(week, platform);
                          return (
                            <td key={`${week.week_index}-${platform}`} className="px-3 py-2">
                              <div>{week.posts[platform]}</div>
                              <div className="text-xs text-zinc-400">{week.comments?.[platform] ?? 0} comments</div>
                              {coverage.upToDate ? (
                                <div className="text-[11px] text-emerald-700">Up-to-Date</div>
                              ) : coverage.commentsPctLabel ? (
                                <div className="text-[11px] text-zinc-500">{coverage.commentsPctLabel} saved to DB</div>
                              ) : null}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 font-semibold text-zinc-900">
                          <div>{week.total_posts}</div>
                          <div className="text-xs font-normal text-zinc-400">{week.total_comments ?? 0} comments</div>
                          {totalCoverage.upToDate ? (
                            <div className="text-[11px] font-normal text-emerald-700">Up-to-Date</div>
                          ) : totalCoverage.commentsPctLabel ? (
                            <div className="text-[11px] font-normal text-zinc-500">{totalCoverage.commentsPctLabel} saved to DB</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          {totalCoverage.upToDate ? (
                            <span className="text-xs font-semibold text-emerald-700">Up-to-Date</span>
                          ) : totalCoverage.progressPctLabel ? (
                            <span className="text-xs font-semibold text-zinc-700">{totalCoverage.progressPctLabel} saved</span>
                          ) : (
                            <span className="text-xs text-zinc-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => runIngest({ week: week.week_index })}
                            disabled={runningIngest}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              runningIngest && ingestingWeek === week.week_index
                                ? "animate-pulse border-blue-400 bg-blue-50 text-blue-700"
                                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                            }`}
                          >
                            {runningIngest && ingestingWeek === week.week_index ? "Ingesting..." : "Run Week"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {weeklyPlatformRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-sm text-zinc-500" colSpan={9}>
                        No weekly post counts yet for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </section>
          )}

          {(isBravoView || isSentimentView) && (
            <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h4 className="mb-4 text-lg font-semibold text-zinc-900">Platform Sentiment Breakdown</h4>
              <div className="space-y-2">
                {(analytics?.platform_breakdown ?? []).map((platform) => {
                  const label = PLATFORM_LABELS[platform.platform] ?? platform.platform;
                  return (
                    <div
                      key={platform.platform}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between text-sm font-semibold text-zinc-900">
                        <span>{label}</span>
                        <span>{platform.engagement.toLocaleString()} engagement</span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {platform.posts} posts · {platform.comments} comments · P {platform.sentiment.positive} / N {platform.sentiment.neutral} / Neg {platform.sentiment.negative}
                      </p>
                    </div>
                  );
                })}
                {(analytics?.platform_breakdown?.length ?? 0) === 0 && (
                  <p className="text-sm text-zinc-500">No platform data available.</p>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h4 className="mb-4 text-lg font-semibold text-zinc-900">Top Sentiment Drivers</h4>
              <p className="-mt-2 mb-4 text-xs text-zinc-500">
                Cast names and social handles are excluded from driver terms.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Positive</p>
                  <ul className="space-y-1 text-sm text-zinc-700">
                    {(analytics?.themes.positive ?? []).slice(0, 8).map((driver) => (
                      <li key={`p-${driver.term}`} className="rounded bg-emerald-50 px-2 py-1">
                        {driver.term} · {driver.count}
                      </li>
                    ))}
                    {(analytics?.themes.positive?.length ?? 0) === 0 && <li className="text-zinc-500">No positive drivers.</li>}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Negative</p>
                  <ul className="space-y-1 text-sm text-zinc-700">
                    {(analytics?.themes.negative ?? []).slice(0, 8).map((driver) => (
                      <li key={`n-${driver.term}`} className="rounded bg-red-50 px-2 py-1">
                        {driver.term} · {driver.count}
                      </li>
                    ))}
                    {(analytics?.themes.negative?.length ?? 0) === 0 && <li className="text-zinc-500">No negative drivers.</li>}
                  </ul>
                </div>
              </div>
            </article>
            </section>
          )}

          {(isBravoView || isSentimentView) && (
            <section className="grid gap-6 xl:grid-cols-2">
              {isBravoView && (
                <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h4 className="mb-4 text-lg font-semibold text-zinc-900">Bravo Content Leaderboard</h4>
                  <div className="space-y-2">
                    {(analytics?.leaderboards.bravo_content ?? []).slice(0, 10).map((item) => (
                      <a
                        key={`${item.platform}-${item.source_id}`}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:bg-zinc-100"
                      >
                        <div className="flex items-start gap-3">
                          {item.thumbnail_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.thumbnail_url}
                              alt={`${PLATFORM_LABELS[item.platform] ?? item.platform} leaderboard thumbnail`}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="h-12 w-12 shrink-0 rounded-md border border-zinc-200 object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-semibold text-zinc-900">
                                {PLATFORM_LABELS[item.platform] ?? item.platform}
                              </span>
                              <span className="text-xs text-zinc-500">{item.engagement.toLocaleString()} engagement</span>
                            </div>
                            <p className="mt-1 text-sm text-zinc-700 line-clamp-2">{item.text || item.source_id}</p>
                          </div>
                        </div>
                      </a>
                    ))}
                    {(analytics?.leaderboards.bravo_content?.length ?? 0) === 0 && (
                      <p className="text-sm text-zinc-500">No content leaderboard entries yet.</p>
                    )}
                  </div>
                </article>
              )}

              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-4 text-lg font-semibold text-zinc-900">Viewer Discussion Highlights</h4>
                <div className="space-y-2">
                  {(analytics?.leaderboards.viewer_discussion ?? []).slice(0, 10).map((item) => (
                    <a
                      key={`${item.platform}-${item.source_id}`}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:bg-zinc-100"
                    >
                      <div className="flex items-start gap-3">
                        {item.thumbnail_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnail_url}
                            alt={`${PLATFORM_LABELS[item.platform] ?? item.platform} discussion thumbnail`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-12 w-12 shrink-0 rounded-md border border-zinc-200 object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-xs uppercase tracking-[0.15em] text-zinc-500">
                            <span>{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
                            <span>{item.sentiment}</span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-700 line-clamp-3">{item.text}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                  {(analytics?.leaderboards.viewer_discussion?.length ?? 0) === 0 && (
                    <p className="text-sm text-zinc-500">No viewer discussion highlights yet.</p>
                  )}
                </div>
              </article>
            </section>
          )}

          {isHashtagsView && (
            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-3 text-lg font-semibold text-zinc-900">Configured Hashtags</h4>
                <p className="-mt-1 mb-4 text-xs text-zinc-500">
                  {platformTab === "overview"
                    ? "Grouped by platform from configured social targets."
                    : `Configured hashtags for ${PLATFORM_LABELS[platformTab] ?? platformTab}.`}
                </p>
                {configuredHashtagSections.length === 0 ? (
                  <p className="text-sm text-zinc-500">No configured hashtags found for the selected platform scope.</p>
                ) : (
                  <div className="space-y-3">
                    {configuredHashtagSections.map((section) => (
                      <div key={section.platform} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
                          {PLATFORM_LABELS[section.platform] ?? section.platform}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {section.tags.map((tag) => (
                            <span key={`${section.platform}-${tag}`} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-3 text-lg font-semibold text-zinc-900">Observed Hashtags</h4>
                <p className="-mt-1 mb-4 text-xs text-zinc-500">
                  Extracted from leaderboard text in the selected platform scope.
                </p>
                {observedHashtagCounts.length === 0 ? (
                  <p className="text-sm text-zinc-500">No observed hashtags found in current leaderboard content.</p>
                ) : (
                  <ul className="space-y-2">
                    {observedHashtagCounts.slice(0, 30).map((item) => (
                      <li key={item.tag} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                        <span className="font-semibold text-zinc-800">#{item.tag}</span>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          {item.count} mention{item.count === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </section>
          )}

          {(isBravoView || isAdvancedView) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={() => setJobsOpen((c) => !c)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-semibold text-zinc-900">Ingest Job Status</h4>
                {runScopedJobs.length > 0 && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                    {runScopedJobs.length} job{runScopedJobs.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-zinc-500">{jobsOpen ? "Hide" : "Show"}</span>
            </button>
            {jobsOpen && (<>
            <div className="mt-4 mb-4 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void refreshSelectedRunJobs();
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Refresh Jobs
              </button>
            </div>
            <div className="space-y-2">
              {(() => {
                const statusOrder: Record<string, number> = { running: 0, retrying: 1, queued: 2, pending: 3, failed: 4, completed: 5, cancelled: 6 };
                const statusBadge: Record<string, string> = {
                  completed: "bg-green-100 text-green-700",
                  failed: "bg-red-100 text-red-700",
                  running: "bg-blue-100 text-blue-700 animate-pulse",
                  pending: "bg-zinc-100 text-zinc-600",
                  queued: "bg-zinc-100 text-zinc-600",
                  retrying: "bg-amber-100 text-amber-700 animate-pulse",
                  cancelled: "bg-zinc-100 text-zinc-400",
                };
                const sorted = [...runScopedJobs].sort(
                  (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
                );
                return sorted.map((job) => {
                  const stage =
                    (typeof job.config?.stage === "string" ? job.config.stage : undefined) ??
                    (typeof job.metadata?.stage === "string" ? job.metadata.stage : undefined) ??
                    job.job_type ?? "posts";
                  const account = typeof job.config?.account === "string" && job.config.account ? job.config.account : null;
                  const counters = getJobStageCounters(job);
                  const persistCounters = getJobPersistCounters(job);
                  const activitySummary = formatJobActivitySummary(getJobActivity(job));
                  const retrievalMeta = (job.metadata as Record<string, unknown>)?.retrieval_meta as
                    | Record<string, unknown>
                    | undefined;
                  const missingMarked =
                    typeof retrievalMeta?.comments_marked_missing === "number"
                      ? retrievalMeta.comments_marked_missing
                      : null;
                  const incompleteFetches =
                    typeof retrievalMeta?.incomplete_comment_fetches === "number"
                      ? retrievalMeta.incomplete_comment_fetches
                      : null;
                  const refreshDecisionCount = (() => {
                    const value = retrievalMeta?.comment_refresh_decisions;
                    if (!value || typeof value !== "object") return 0;
                    return Object.keys(value as Record<string, unknown>).length;
                  })();
                  const duration =
                    job.started_at && job.completed_at
                      ? `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s`
                      : job.started_at
                        ? `${Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)}s`
                        : null;
                  const isActive = job.status === "running" || job.status === "retrying";
                  return (
                    <div key={job.id} className={`rounded-lg border px-3 py-2 ${
                      isActive ? "border-blue-200 bg-blue-50" : job.status === "failed" ? "border-red-200 bg-red-50" : "border-zinc-200 bg-zinc-50"
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900">
                            {PLATFORM_LABELS[job.platform] ?? job.platform}
                          </span>
                          {account && <span className="text-xs text-zinc-500">@{account}</span>}
                          <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
                            {stage}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[job.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          {counters ? (
                            <span className="font-semibold tabular-nums text-zinc-700">
                              {counters.posts}p / {counters.comments}c
                            </span>
                          ) : (
                            <span className="font-semibold tabular-nums text-zinc-700">{(job.items_found ?? 0).toLocaleString()} items</span>
                          )}
                          {persistCounters && (
                            <span className="tabular-nums text-zinc-500">
                              saved {persistCounters.posts_upserted}p/{persistCounters.comments_upserted}c
                            </span>
                          )}
                          {activitySummary && <span className="text-zinc-400">{activitySummary}</span>}
                          {duration && <span className="tabular-nums text-zinc-400">{duration}</span>}
                        </div>
                      </div>
                      {job.error_message && (
                        <p className="mt-1.5 rounded bg-red-100 px-2 py-1 text-xs text-red-700">{job.error_message}</p>
                      )}
                      {job.status === "failed" && (
                        <div className="mt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const retryPlatform = PLATFORM_ORDER.includes(job.platform as Platform)
                                ? (job.platform as Platform)
                                : "all";
                              const retryMode = stage === "comments" ? "comments_only" : "posts_only";
                              void runIngest({ platform: retryPlatform, ingestMode: retryMode });
                            }}
                            disabled={runningIngest}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
                          >
                            Retry Failed Stage
                          </button>
                        </div>
                      )}
                      {(missingMarked !== null || incompleteFetches !== null || refreshDecisionCount > 0) && (
                        <p className="mt-1.5 text-xs text-zinc-500">
                          {missingMarked !== null ? `Missing flagged: ${missingMarked}` : "Missing flagged: 0"}
                          {incompleteFetches !== null ? ` · Incomplete fetches: ${incompleteFetches}` : ""}
                          {refreshDecisionCount > 0 ? ` · Decision reasons: ${refreshDecisionCount}` : ""}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">
                        {job.started_at ? `Started ${formatDateTime(job.started_at)}` : `Created ${formatDateTime(job.created_at)}`}
                        {job.completed_at ? ` · Done ${formatDateTime(job.completed_at)}` : ""}
                      </p>
                    </div>
                  );
                });
              })()}
              {!selectedRunId && (
                <p className="text-sm text-zinc-500">No run selected. Pick a run above or start a new ingest.</p>
              )}
              {selectedRunId && runScopedJobs.length === 0 && (
                <p className="text-sm text-zinc-500">No jobs found for the selected run yet.</p>
              )}
            </div>
            </>)}
            </section>
          )}

          {(isBravoView || isAdvancedView) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={() => setManualSourcesOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              <span>Manual Sources (Fallback)</span>
              <span>{manualSourcesOpen ? "Hide" : "Show"}</span>
            </button>
            {manualSourcesOpen && (
              <div className="mt-4">
                <SocialPostsSection showId={showId} showName={showName} seasonId={seasonId} />
              </div>
            )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
