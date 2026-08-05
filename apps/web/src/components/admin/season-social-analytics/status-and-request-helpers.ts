import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { SOCIAL_TIME_ZONE } from "@/lib/admin/social-timezone";
import type {
  CommentsCoverageResponse,
  CoverageSummary,
  IngestProxyErrorPayload,
  MirrorCoverageResponse,
  Platform,
  PlatformTab,
  SeasonWindowDraft,
  SeasonWindowRow,
  SharedPipelineStageStatus,
  SocialRun,
  SocialTableMetric,
  SocialTarget,
  SyncStatusPayload,
  WeekDetailPost,
  WorkerHealthPayload,
  WorkerHealthState,
  WeeklyPlatformRow,
} from "./section-types";

export const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter/X",
  youtube: "YouTube",
  facebook: "Facebook",
  threads: "Threads",
  reddit: "Reddit",
};
export const SOCIAL_SOURCE_COLORS: Record<string, string> = {
  instagram: "#f43f5e",
  tiktok: "#111827",
  twitter: "#0284c7",
  youtube: "#dc2626",
  facebook: "#1d4ed8",
  threads: "#27272a",
  reddit: "#f97316",
};
export const SOCIAL_MEDIA_VIDEO_EXT_RE = /\.(mp4|mov|m4v|webm|m3u8|mpd)(\?|$)/i;
export const PLATFORM_TABS: { key: PlatformTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter/X" },
  { key: "youtube", label: "YouTube" },
  { key: "facebook", label: "Facebook" },
  { key: "threads", label: "Threads" },
];

export const SOCIAL_PLATFORM_QUERY_KEY = "social_platform";
export const SOCIAL_DENSITY_QUERY_KEY = "social_density";
export const SOCIAL_ALERTS_QUERY_KEY = "social_alerts";
export const SOCIAL_TABLE_METRICS_QUERY_KEY = "social_metrics";
export const SOCIAL_METRIC_MODE_QUERY_KEY = "social_metric_mode";

export const SOCIAL_TABLE_METRIC_OPTIONS: Array<{ key: SocialTableMetric; label: string }> = [
  { key: "posts", label: "Posts" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "hashtags", label: "Hashtags" },
  { key: "mentions", label: "Mentions" },
  { key: "tags", label: "Tags" },
  { key: "collaborators", label: "Collaborators" },
];
export const SOCIAL_TABLE_METRIC_KEYS = SOCIAL_TABLE_METRIC_OPTIONS.map((item) => item.key);
export const SOCIAL_TABLE_DEFAULT_METRIC_KEYS = SOCIAL_TABLE_METRIC_KEYS.filter((key) => key !== "collaborators");
export const SOCIAL_TABLE_DETAIL_METRICS = new Set<SocialTableMetric>(["hashtags", "mentions", "tags", "collaborators"]);

export const HASHTAG_REGEX = /(^|\s)#([a-z0-9_]+)/gi;
export const MENTION_REGEX = /(^|\s)@([a-z0-9_.]+)/gi;
export const HASHTAG_PLATFORMS: Platform[] = ["instagram", "tiktok", "twitter", "youtube", "facebook", "threads"];

export const isPlatformTab = (value: string | null | undefined): value is PlatformTab => {
  if (!value) return false;
  return PLATFORM_TABS.some((tab) => tab.key === value);
};

export const platformFilterFromTab = (tab: PlatformTab): "all" | Platform =>
  tab === "overview" ? "all" : tab;

export const ACTIVE_RUN_STATUSES = new Set<SocialRun["status"]>(["queued", "pending", "retrying", "running", "cancelling"]);
export const TERMINAL_RUN_STATUSES = new Set<SocialRun["status"]>(["completed", "failed", "cancelled"]);
export const COMMENT_SYNC_MAX_PASSES = 8;
export const COMMENT_SYNC_MAX_DURATION_MS = 90 * 60 * 1000;
export const SOCIAL_FULL_SYNC_MIRROR_ENABLED =
  process.env.NEXT_PUBLIC_SOCIAL_FULL_SYNC_MIRROR_ENABLED === "true" ||
  process.env.SOCIAL_FULL_SYNC_MIRROR_ENABLED === "true";
export const getSyncActionPlatformLabel = (platform: Platform): string =>
  platform === "twitter" ? "X" : (PLATFORM_LABELS[platform] ?? platform);
export const getWeekSyncActionLabel = (platformFilter: "all" | Platform): string => {
  const selectedPlatform = platformFilter === "all" ? null : platformFilter;
  const platformLabel = selectedPlatform ? getSyncActionPlatformLabel(selectedPlatform) : null;
  if (SOCIAL_FULL_SYNC_MIRROR_ENABLED) {
    return selectedPlatform
      ? `Full Sync ${platformLabel} + Mirror`
      : "Full Sync All + Mirror";
  }
  return selectedPlatform ? `Sync ${platformLabel}` : "Sync All";
};
export const PLATFORM_ORDER: Platform[] = ["instagram", "youtube", "tiktok", "twitter", "facebook", "threads"];

export const formatSyncStatusLabel = (value: string | null | undefined): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Idle";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/_/g, " ");
};

export const getSyncStatusTone = (value: string | null | undefined, stale = false): string => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "failed") return "bg-red-100 text-red-700";
  if (normalized === "running" || normalized === "queued") return "bg-blue-100 text-blue-700";
  if (normalized === "partial" || stale) return "bg-amber-100 text-amber-700";
  if (normalized === "complete") return "bg-emerald-100 text-emerald-700";
  return "bg-zinc-100 text-zinc-600";
};

export const getCombinedSyncStatus = (status: SyncStatusPayload): NonNullable<SyncStatusPayload["sync_status"]> => {
  const values = [
    String(status.active_job_summary?.sync_status ?? "").trim().toLowerCase(),
    String(status.sync_status ?? "").trim().toLowerCase(),
    String(status.comment_sync_status?.status ?? "").trim().toLowerCase(),
    String(status.media_mirror_status?.status ?? "").trim().toLowerCase(),
  ];
  if (values.includes("running")) return "running";
  if (values.includes("queued") || values.includes("pending")) return "queued";
  if (values.includes("failed")) return "failed";
  if (values.includes("partial") || values.includes("unknown") || values.includes("not_attempted") || status.stale) {
    return "partial";
  }
  if (values.includes("complete")) return "complete";
  return "idle";
};

export const mergeSyncStatusPayloads = (
  commentPlatform: NonNullable<CommentsCoverageResponse["by_platform"]>[string] | undefined,
  mirrorPlatform: NonNullable<MirrorCoverageResponse["by_platform"]>[string] | undefined,
): SyncStatusPayload => {
  const commentStatus = commentPlatform?.comment_sync_status ?? null;
  const mirrorStatus = mirrorPlatform?.media_mirror_status ?? commentPlatform?.media_mirror_status ?? null;
  const activeJobSummary =
    commentPlatform?.active_job_summary ?? mirrorPlatform?.active_job_summary ?? null;
  const status: SyncStatusPayload = {
    comment_sync_status: commentStatus,
    media_mirror_status: mirrorStatus,
    active_job_summary: activeJobSummary,
    last_refresh_at: commentPlatform?.last_refresh_at ?? mirrorPlatform?.last_refresh_at ?? null,
    last_refresh_reason:
      commentStatus?.failure_reason ??
      mirrorStatus?.failure_reason ??
      commentPlatform?.last_refresh_reason ??
      mirrorPlatform?.last_refresh_reason ??
      null,
    stale: Boolean(commentPlatform?.stale || mirrorPlatform?.stale),
    worker_run_id: commentPlatform?.worker_run_id ?? mirrorPlatform?.worker_run_id ?? null,
  };
  status.sync_status = getCombinedSyncStatus(status);
  if (status.sync_status === "queued" || status.sync_status === "running") {
    status.stale = false;
  }
  return status;
};

export const ACTIVE_JOB_STAGE_ORDER: Array<NonNullable<NonNullable<SyncStatusPayload["active_job_summary"]>["dominant_stage"]>> = [
  "posts",
  "comments",
  "media_mirror",
  "comment_media_mirror",
];

export const formatActiveJobSummary = (status: SyncStatusPayload): string | null => {
  const summary = status.active_job_summary;
  if (!summary?.sync_status) return null;
  const stageLabel = summary.dominant_stage?.replaceAll("_", " ") ?? "sync";
  const jobCount = Number(summary.job_count ?? 0);
  const countLabel = Number.isFinite(jobCount) && jobCount > 0 ? ` · ${formatInteger(jobCount)} jobs` : "";
  const stageStatuses = Object.entries(summary.stage_statuses ?? {})
    .filter((entry): entry is [string, { status?: "queued" | "running"; job_count?: number }] => Boolean(entry[0]))
    .sort(
      ([stageA], [stageB]) =>
        ACTIVE_JOB_STAGE_ORDER.indexOf(stageA as (typeof ACTIVE_JOB_STAGE_ORDER)[number]) -
        ACTIVE_JOB_STAGE_ORDER.indexOf(stageB as (typeof ACTIVE_JOB_STAGE_ORDER)[number]),
    )
    .map(([stage, payload]) => {
      const stageJobCount = Number(payload?.job_count ?? 0);
      const countSuffix =
        Number.isFinite(stageJobCount) && stageJobCount > 0 ? ` ${formatInteger(stageJobCount)}` : "";
      return `${formatSyncStatusLabel(payload?.status)} ${stage.replaceAll("_", " ")}${countSuffix}`;
    });
  const detailLabel = stageStatuses.length > 1 ? ` · ${stageStatuses.join(", ")}` : "";
  return `${formatSyncStatusLabel(summary.sync_status)} ${stageLabel}${countLabel}${detailLabel}`;
};

export const formatSharedPipelineStageSummary = (stage: SharedPipelineStageStatus | null | undefined): string => {
  if (!stage) return "Idle";
  const statusLabel = formatSyncStatusLabel(stage.status);
  const jobCount = Number(stage.job_count ?? 0);
  const activeJobs = Number(stage.active_jobs ?? 0);
  if (jobCount > 0 && activeJobs > 0) {
    return `${statusLabel} · ${formatInteger(activeJobs)}/${formatInteger(jobCount)} active`;
  }
  if (jobCount > 0) {
    return `${statusLabel} · ${formatInteger(jobCount)} jobs`;
  }
  return statusLabel;
};

export const formatClassificationRuleSummary = (target: SocialTarget): string => {
  const parts: string[] = [];
  if ((target.hashtags ?? []).length > 0) {
    parts.push(
      `hashtags ${(target.hashtags ?? []).map((tag) => (String(tag).startsWith("#") ? String(tag) : `#${String(tag)}`)).join(", ")}`,
    );
  }
  if ((target.keywords ?? []).length > 0) {
    parts.push(`keywords ${(target.keywords ?? []).join(", ")}`);
  }
  return parts.join(" · ") || "No rule signals configured.";
};

export const buildPreviewPlatformStatuses = (
  commentsCoverage: CommentsCoverageResponse | null,
  mirrorCoverage: MirrorCoverageResponse | null,
): Array<{ platform: Platform; status: SyncStatusPayload }> =>
  PLATFORM_ORDER.map((platform) => {
    const commentPlatform = commentsCoverage?.by_platform?.[platform];
    const mirrorPlatform = mirrorCoverage?.by_platform?.[platform];
    const status = mergeSyncStatusPayloads(commentPlatform, mirrorPlatform);
    return { platform, status };
  }).filter(({ status }) => Boolean(status.comment_sync_status || status.media_mirror_status));
export const STALE_RUN_THRESHOLD_DEFAULT_MINUTES = 45;
export const MAX_COMMENT_ANCHOR_SOURCE_IDS_PER_PLATFORM = 5000;
export const INTEGER_FORMATTER = new Intl.NumberFormat("en-US");
export const COMPACT_INTEGER_FORMATTER = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
export const formatInteger = (value: number | null | undefined): string => INTEGER_FORMATTER.format(Number(value ?? 0));
export const formatCompactInteger = (value: number | null | undefined): string =>
  COMPACT_INTEGER_FORMATTER.format(Math.max(0, Number(value ?? 0)));
export const DATE_TOKEN_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseDateToken = (
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

export const DATE_TIME_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: SOCIAL_TIME_ZONE,
};

export const DATE_ONLY_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  timeZone: SOCIAL_TIME_ZONE,
};

export const TIME_ONLY_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: SOCIAL_TIME_ZONE,
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", DATE_TIME_DISPLAY_OPTIONS);
};

export const formatDateTimeFromDate = (value: Date | null | undefined): string => {
  if (!value) return "-";
  if (Number.isNaN(value.getTime())) return "-";
  return value.toLocaleString("en-US", DATE_TIME_DISPLAY_OPTIONS);
};

export const formatTime = (value: string | null | undefined): string => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("en-US", TIME_ONLY_DISPLAY_OPTIONS);
};

export const formatDateOnly = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", DATE_ONLY_DISPLAY_OPTIONS);
};

export const formatDateShort = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    timeZone: SOCIAL_TIME_ZONE,
  });
};

export const SEASON_WINDOW_PRESEASON_CONFIG_KEYS = [
  "trailer_drop_at",
  "preseason_start",
  "preseason_start_at",
  "week_zero_start",
] as const;
export const SEASON_WINDOW_POSTSEASON_END_CONFIG_KEYS = [
  "postseason_end_at",
  "postseason_end",
  "postseason_end_date",
] as const;

export const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const seasonWindowDateInputFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: SOCIAL_TIME_ZONE,
});

export const formatDateTimeLocalInput = (value: string | null | undefined): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(
    seasonWindowDateInputFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute) return "";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const readSeasonWindowConfigValue = (
  targets: SocialTarget[],
  keys: readonly string[],
): string | null => {
  for (const target of targets) {
    const config = isRecordValue(target.config) ? target.config : null;
    if (!config) continue;
    for (const key of keys) {
      const value = config[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }
  return null;
};

export const deriveSeasonWindowDraft = (targets: SocialTarget[]): SeasonWindowDraft => ({
  trailerDropAt: formatDateTimeLocalInput(readSeasonWindowConfigValue(targets, SEASON_WINDOW_PRESEASON_CONFIG_KEYS)),
  postseasonEndAt: formatDateTimeLocalInput(readSeasonWindowConfigValue(targets, SEASON_WINDOW_POSTSEASON_END_CONFIG_KEYS)),
});

export const seasonWindowTypeLabel = (windowType: SeasonWindowRow["week_type"]): string => {
  if (windowType === "preseason") return "Pre-Season";
  if (windowType === "postseason") return "Post-Season";
  if (windowType === "bye") return "Bye Week";
  return "Episode";
};

export const seasonWindowEpisodeLabel = (window: SeasonWindowRow): string => {
  if (window.week_type === "preseason") return "Trailer to premiere";
  if (window.week_type === "postseason") return "After finale";
  if (window.week_type === "bye") return window.label || "Bye Week";
  return typeof window.episode_number === "number" ? `Episode ${window.episode_number}` : window.label;
};

export const formatDayScopeLabel = (value: string): string => {
  if (!value) return "Specific Day";
  const parsed = parseDateToken(value);
  if (!parsed) return `Day ${value}`;
  const label = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0)).toLocaleDateString(
    "en-US",
    DATE_ONLY_DISPLAY_OPTIONS,
  );
  return `Day ${label}`;
};

export const formatWeekScopeLabel = (week: number | "all" | null): string => {
  if (week === "all" || week === null) return "All Weeks";
  return week === 0 ? "Pre-Season" : `Week ${week}`;
};

export const formatPlatformScopeLabel = (platform: "all" | Platform | null): string => {
  if (!platform || platform === "all") return "All Platforms";
  return PLATFORM_LABELS[platform] ?? platform;
};

export const normalizeIsoInstant = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
};

export const formatStatusLabel = (status: SocialRun["status"]): string => {
  if (!status) return "Unknown";
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
};

export const formatRunProgressLabel = (run: SocialRun): string => {
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

export const formatDateRangeLabel = (start: string, end: string): string => {
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

export const toNonNegative = (value: number | null | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

export const isCoveragePctUpToDate = (value: number | null): boolean =>
  typeof value === "number" && value >= 98;

export const buildCoverageSummary = ({
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
  const postsPctRaw = safePostsSaved > 0 ? 100 : null;
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
  const postsUpToDate = isCoveragePctUpToDate(postsPctRaw);
  const commentsUpToDate = isCoveragePctUpToDate(commentsPctRaw);
  const progressUpToDate = isCoveragePctUpToDate(progressPctRaw);
  return {
    postsPct: postsPctRaw,
    postsPctLabel: postsPctRaw == null ? null : `${postsPctRaw.toFixed(1)}%`,
    postsUpToDate,
    commentsPct: commentsPctRaw,
    commentsPctLabel: commentsPctRaw == null ? null : `${commentsPctRaw.toFixed(1)}%`,
    commentsUpToDate,
    progressPctLabel: progressPctRaw == null ? null : `${progressPctRaw.toFixed(1)}%`,
    progressPct: progressPctRaw,
    progressUpToDate,
    upToDate: progressUpToDate,
  };
};

export const getPlatformCoverage = (week: WeeklyPlatformRow, platform: Platform): CoverageSummary => {
  const reportedComments = Number(week.reported_comments?.[platform] ?? 0);
  return buildCoverageSummary({
    postsSaved: Number(week.posts?.[platform] ?? 0),
    commentsSaved: Number(week.comments?.[platform] ?? 0),
    reportedComments,
  });
};

export const getTotalCoverage = (week: WeeklyPlatformRow): CoverageSummary => {
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

export const getReportedCommentsForWeekPost = (platform: Platform, post: WeekDetailPost): number => {
  if (platform === "twitter") {
    return Number(post.replies_count ?? post.comments_count ?? 0);
  }
  return Number(post.comments_count ?? 0);
};

export const formatMirrorCoverageLabel = (readyCount: number, scannedCount: number): string => {
  const safeScanned = Math.max(0, Number(scannedCount) || 0);
  const safeReady = Math.max(0, Math.min(safeScanned, Number(readyCount) || 0));
  const pct = safeScanned > 0 ? (safeReady / safeScanned) * 100 : 100;
  return `${safeReady.toLocaleString()}/${safeScanned.toLocaleString()} (${pct.toFixed(1)}%)`;
};

export const REQUEST_TIMEOUT_MS = {
  analytics: 35_000,
  runs: 15_000,
  targets: 12_000,
  jobs: 15_000,
  commentsCoverage: 35_000,
  mirrorCoverage: 35_000,
  weekDetail: 35_000,
} as const;
export const WEEK_DETAIL_FETCH_CONCURRENCY = 2;
export const WEEK_DETAIL_TARGETS_PAGE_LIMIT = 100;
export const WEEK_DETAIL_TARGETS_MAX_PAGES = 20;
export const BACKEND_SATURATION_MESSAGE = "Local TRR-Backend is saturated. Showing last successful data while retrying.";

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

export const SOCIAL_CACHE_VERSION = 1;
export const SOCIAL_CACHE_PREFIX = "trr:season-social-analytics";

export const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) return error.name === "AbortError";
  if (!error || typeof error !== "object") return false;
  return (error as { name?: string }).name === "AbortError";
};

export const buildCanonicalRoute = (relativeUrl: string): string => {
  try {
    const url = new URL(relativeUrl, "http://localhost");
    const sortedParams = new URLSearchParams(url.search);
    sortedParams.sort();
    const query = sortedParams.toString();
    return `${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return relativeUrl;
  }
};

export const parseDateOrNull = (value: unknown): Date | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return null;
  return new Date(ts);
};

export const parseTimestampMs = (value: unknown): number | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return null;
  return ts;
};

export const normalizeWorkerHealth = (value: unknown): WorkerHealthState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const payload = value as WorkerHealthPayload;
  const queueEnabled = typeof payload.queue_enabled === "boolean" ? payload.queue_enabled : null;
  const healthy = typeof payload.healthy === "boolean" ? payload.healthy : null;
  const healthyWorkers =
    typeof payload.healthy_workers === "number" && Number.isFinite(payload.healthy_workers)
      ? payload.healthy_workers
      : null;
  const reason = typeof payload.reason === "string" && payload.reason.trim() ? payload.reason.trim() : null;
  const checkedAt =
    typeof payload.checked_at === "string" && payload.checked_at.trim()
      ? payload.checked_at
      : typeof (payload as Record<string, unknown>).updated_at === "string" &&
          String((payload as Record<string, unknown>).updated_at).trim()
        ? String((payload as Record<string, unknown>).updated_at)
        : null;
  return {
    queueEnabled,
    healthy,
    healthyWorkers,
    reason,
    checkedAt,
  };
};

export const isTransientBackendSectionError = (message: string | null | undefined): boolean => {
  const normalized = String(message ?? "").toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("backend is saturated") ||
    normalized.includes("connection pool exhausted") ||
    normalized.includes("database pool initialization failed") ||
    normalized.includes("timed out") ||
    normalized.includes("could not reach trr-backend") ||
    normalized.includes("headers timeout") ||
    normalized.includes("fetch failed")
  );
};

export const isBackendSaturationSectionError = (message: string | null | undefined): boolean => {
  const normalized = String(message ?? "").toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("backend is saturated") ||
    normalized.includes("connection pool exhausted") ||
    normalized.includes("database pool initialization failed")
  );
};

export const readProxyErrorText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  const record = value as Record<string, unknown>;
  return [record.message, record.error, record.detail]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join(" ");
};

export const TRANSIENT_DEV_RESTART_PATTERNS = [
  "failed to fetch",
  "networkerror when attempting to fetch resource",
  "fetch failed",
  "unexpected end of json input",
  "invalid json",
  "load failed",
  "connection closed",
] as const;

export const isTransientDevRestartMessage = (message: string | null | undefined): boolean => {
  const normalized = String(message ?? "").toLowerCase();
  if (!normalized) return false;
  return TRANSIENT_DEV_RESTART_PATTERNS.some((pattern) => normalized.includes(pattern));
};

export async function parseResponseJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${fallbackMessage}. Response payload unavailable.`);
  }
}

export const fetchAdminWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort();
  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort();
    } else {
      upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
    }
  }
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
    if (upstreamSignal) {
      upstreamSignal.removeEventListener("abort", abortFromUpstream);
    }
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
    "Failed to run social sync";

  if (upstreamCode === "SOCIAL_WORKER_UNAVAILABLE") {
    const workerHealth =
      upstreamDetail?.worker_health && typeof upstreamDetail.worker_health === "object"
        ? (upstreamDetail.worker_health as Record<string, unknown>)
        : null;
  const healthReason =
      typeof workerHealth?.reason === "string" && workerHealth.reason.trim()
        ? ` (${workerHealth.reason})`
        : "";
    return `${upstreamMessage}${healthReason}. Start the remote social executor and retry; inline fallback only works in local/dev backend runtime.`;
  }
  if (upstreamCode === "SOCIAL_REMOTE_WORKER_REQUIRED") {
    return `${upstreamMessage}. This ingest is remote-only for Instagram/TikTok. Start the configured remote executor and retry.`;
  }

  return upstreamMessage;
};
