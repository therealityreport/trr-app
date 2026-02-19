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
export type PlatformTab = "overview" | Platform | "reddit";
type Scope = "bravo" | "creator" | "community";
type SyncStrategy = "incremental" | "full_refresh";
type WeeklyMetric = "posts" | "comments";
export type SocialAnalyticsView = "bravo" | "sentiment" | "hashtags" | "advanced";

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
    total_posts: number;
    total_comments?: number;
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
  { key: "reddit", label: "Reddit" },
];

const SOCIAL_PLATFORM_QUERY_KEY = "social_platform";
const HASHTAG_REGEX = /(^|\s)#([a-z0-9_]+)/gi;
const HASHTAG_PLATFORMS: Platform[] = ["instagram", "tiktok", "twitter", "youtube"];

const isPlatformTab = (value: string | null | undefined): value is PlatformTab => {
  if (!value) return false;
  return PLATFORM_TABS.some((tab) => tab.key === value);
};

const platformFilterFromTab = (tab: PlatformTab): "all" | Platform =>
  tab === "overview" || tab === "reddit" ? "all" : tab;

const ACTIVE_RUN_STATUSES = new Set<SocialRun["status"]>(["queued", "pending", "retrying", "running"]);
const TERMINAL_RUN_STATUSES = new Set<SocialRun["status"]>(["completed", "failed", "cancelled"]);

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
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
  return `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
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
  const timestamp = Date.parse(`${dateLocal}T00:00:00`);
  if (Number.isNaN(timestamp)) return "-- --";
  const date = new Date(timestamp);
  const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = date.toLocaleDateString("en-US", { day: "numeric" });
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
  const isPlatformTabControlled = typeof controlledPlatformTab !== "undefined";
  const tabFromQuery = useMemo<PlatformTab>(() => {
    const value = searchParams.get(SOCIAL_PLATFORM_QUERY_KEY);
    return isPlatformTab(value) ? value : "overview";
  }, [searchParams]);
  const platformTab = controlledPlatformTab ?? uncontrolledPlatformTab;
  const platformFilter = useMemo(() => platformFilterFromTab(platformTab), [platformTab]);
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [targets, setTargets] = useState<SocialTarget[]>([]);
  const [runs, setRuns] = useState<SocialRun[]>([]);
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
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [runningIngest, setRunningIngest] = useState(false);
  const [cancellingRun, setCancellingRun] = useState(false);
  const [syncStrategy, setSyncStrategy] = useState<SyncStrategy>("incremental");
  const [weeklyMetric, setWeeklyMetric] = useState<WeeklyMetric>("posts");
  const [ingestingWeek, setIngestingWeek] = useState<number | null>(null);
  const [ingestingPlatform, setIngestingPlatform] = useState<string | null>(null);
  const [activeRunRequest, setActiveRunRequest] = useState<{ week: number | null; platform: "all" | Platform } | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [ingestStartedAt, setIngestStartedAt] = useState<Date | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [manualSourcesOpen, setManualSourcesOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [elapsedTick, setElapsedTick] = useState(0);
  const [pollingStatus, setPollingStatus] = useState<"idle" | "retrying" | "recovered">("idle");
  const pollGenerationRef = useRef(0);
  const showRouteSlug = (showSlug || showId).trim();

  const getAuthHeaders = useCallback(async () => getClientAuthHeaders(), []);

  const queryString = useMemo(() => {
    const search = new URLSearchParams();
    search.set("source_scope", scope);
    search.set("timezone", "America/New_York");
    if (platformFilter !== "all") search.set("platforms", platformFilter);
    if (weekFilter !== "all") search.set("week", String(weekFilter));
    return search.toString();
  }, [scope, platformFilter, weekFilter]);

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

  useEffect(() => {
    if (isPlatformTabControlled) return;
    setUncontrolledPlatformTab(tabFromQuery);
  }, [isPlatformTabControlled, tabFromQuery]);

  const fetchAnalytics = useCallback(async () => {
    const headers = await getAuthHeaders();
    const response = await fetchAdminWithAuth(
      `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics?${queryString}`,
      { headers, cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Failed to load social analytics"));
    }
    const data = (await response.json()) as AnalyticsResponse;
    setAnalytics(data);
    setLastUpdated(new Date());
    return data;
  }, [getAuthHeaders, queryString, readErrorMessage, seasonNumber, showId]);

  const fetchRuns = useCallback(async () => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ limit: "100" });
    params.set("source_scope", scope);
    const response = await fetchAdminWithAuth(
      `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/runs?${params.toString()}`,
      { headers, cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Failed to load social runs"));
    }
    const data = (await response.json()) as { runs?: SocialRun[] };
    const nextRuns = data.runs ?? [];
    setRuns(nextRuns);
    return nextRuns;
  }, [getAuthHeaders, readErrorMessage, scope, seasonNumber, showId]);

  const fetchTargets = useCallback(async () => {
    const headers = await getAuthHeaders();
    const response = await fetchAdminWithAuth(
      `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/targets?source_scope=${scope}`,
      { headers, cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Failed to load social targets"));
    }
    const data = (await response.json()) as { targets?: SocialTarget[] };
    setTargets(data.targets ?? []);
    return data.targets ?? [];
  }, [getAuthHeaders, readErrorMessage, scope, seasonNumber, showId]);

  const fetchJobs = useCallback(async (
    runId?: string | null,
    options?: { preserveLastGoodIfEmpty?: boolean },
  ) => {
    if (!runId) {
      setJobs([]);
      return [] as SocialJob[];
    }
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ limit: "250", run_id: runId });
    const response = await fetchAdminWithAuth(
      `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/jobs?${params.toString()}`,
      { headers, cache: "no-store" },
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
  }, [getAuthHeaders, readErrorMessage, seasonNumber, showId]);

  const refreshAll = useCallback(async () => {
    if (platformTab === "reddit") {
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

    const [analyticsResult, targetsResult, runsResult] = await Promise.allSettled([
      fetchAnalytics(),
      fetchTargets(),
      fetchRuns(),
    ]);

    if (analyticsResult.status === "rejected") {
      nextSectionErrors.analytics =
        analyticsResult.reason instanceof Error ? analyticsResult.reason.message : "Failed to load social analytics";
    }
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
      nextSectionErrors.runs = runsResult.reason instanceof Error ? runsResult.reason.message : "Failed to load social runs";
    }

    try {
      await fetchJobs(runIdToLoad);
    } catch (jobsError) {
      nextSectionErrors.jobs = jobsError instanceof Error ? jobsError.message : "Failed to load social jobs";
    }

    setSectionErrors(nextSectionErrors);
    setLoading(false);
  }, [fetchAnalytics, fetchJobs, fetchRuns, fetchTargets, platformTab, runningIngest, selectedRunId]);

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
    const fallbackWeek = activeRunRequest?.week ?? (weekFilter === "all" ? null : weekFilter);
    const fallbackPlatform = activeRunRequest?.platform ?? platformFilter;
    const fallbackWeekLabel = formatWeekScopeLabel(fallbackWeek);
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
      return {
        weekLabel: fallbackWeekLabel,
        platformLabel: fallbackPlatformLabel,
      };
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
    const weekLabel =
      hasUnboundedWeeks || sortedWeekLabels.length === 0 ? "All Weeks" : sortedWeekLabels.join(", ");

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
          timestampLabel: timestamp ? new Date(timestamp).toLocaleTimeString() : "--:--:--",
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
    setIngestingPlatform(null);
    setActiveRunRequest(null);
    setActiveRunId(null);
    setIngestStartedAt(null);
    void fetchAnalytics().catch(() => {});
    void fetchRuns().catch(() => {});
    void fetchJobs(completedRunId).catch(() => {});
  }, [activeRun, activeRunId, fetchAnalytics, fetchJobs, fetchRuns, ingestStartedAt, runningIngest]);

  // Poll for job + run updates using a single-flight loop (no overlapping requests).
  useEffect(() => {
    if (!activeRunId) return;
    if (!hasRunningJobs && !runningIngest) return;

    pollGenerationRef.current += 1;
    const generation = pollGenerationRef.current;
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
        const nextRuns = await fetchRuns();
        if (cancelled || generation !== pollGenerationRef.current) return;

        const currentRun = nextRuns.find((run) => run.id === activeRunId);
        const preserveJobs = Boolean(currentRun && ACTIVE_RUN_STATUSES.has(currentRun.status));
        await fetchJobs(activeRunId, { preserveLastGoodIfEmpty: preserveJobs });
        if (cancelled || generation !== pollGenerationRef.current) return;

        if (!runningIngest) {
          await fetchAnalytics();
        }
        setPollingStatus((current) => (current === "retrying" ? "recovered" : current));
        setSectionErrors((current) => ({ ...current, runs: null, jobs: null }));
      } catch {
        if (cancelled || generation !== pollGenerationRef.current) return;
        setPollingStatus("retrying");
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
        }
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to cancel run");
      }

      setIngestMessage(`Run ${activeRunId.slice(0, 8)} cancelled.`);
      setRunningIngest(false);
      setIngestingWeek(null);
      setIngestingPlatform(null);
      setActiveRunRequest(null);
      setSelectedRunId(activeRunId);
      setActiveRunId(null);
      setIngestStartedAt(null);
      await fetchJobs(activeRunId);
      await fetchAnalytics();
      await fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel run");
    } finally {
      setCancellingRun(false);
    }
  }, [activeRunId, fetchAnalytics, fetchJobs, fetchRuns, getAuthHeaders, seasonNumber, showId]);

  const runIngest = useCallback(async (override?: { week?: number; platform?: "all" | Platform }) => {
    setRunningIngest(true);
    setError(null);
    setIngestMessage(null);
    setJobs([]);
    setSelectedRunId(null);
    setActiveRunId(null);
    setIngestStartedAt(new Date());

    const effectivePlatform = override?.platform ?? platformFilter;
    const effectiveWeek = override?.week ?? (weekFilter === "all" ? null : weekFilter);
    setIngestingWeek(effectiveWeek);
    setIngestingPlatform(effectivePlatform);
    setActiveRunRequest({ week: effectiveWeek, platform: effectivePlatform });

    try {
      const headers = await getAuthHeaders();
      const payload: {
        source_scope: Scope;
        platforms?: Platform[];
        max_posts_per_target: number;
        max_comments_per_post: number;
        max_replies_per_post: number;
        fetch_replies: boolean;
        ingest_mode: "posts_only" | "posts_and_comments";
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
        ingest_mode: "posts_and_comments",
        sync_strategy: syncStrategy,
        allow_inline_dev_fallback: true,
      }

      if (effectivePlatform !== "all") {
        payload.platforms = [effectivePlatform];
      }
      if (effectiveWeek !== null) {
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

      const label = effectiveWeek !== null
        ? (effectiveWeek === 0 ? "Pre-Season" : `Week ${effectiveWeek}`)
        : "Full Season";
      const platformLabel = effectivePlatform === "all" ? "all platforms" : (PLATFORM_LABELS[effectivePlatform] ?? effectivePlatform);
      const modeLabel = syncStrategy === "full_refresh" ? "Full Refresh" : "Incremental";
      setIngestMessage(`Starting ${label} · ${platformLabel} · ${modeLabel}...`);

      console.log("[social-ingest] Sending payload:", JSON.stringify(payload, null, 2));

      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/ingest`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
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
      console.log("[social-ingest] Response:", JSON.stringify(result, null, 2));
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

      // The hasRunningJobs polling effect will handle ongoing updates.
      // We keep runningIngest=true until polling detects no more running jobs.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run social ingest");
      setIngestMessage(null);
      setRunningIngest(false);
      setCancellingRun(false);
      setIngestingWeek(null);
      setIngestingPlatform(null);
      setActiveRunRequest(null);
      setSelectedRunId(null);
      setActiveRunId(null);
      setIngestStartedAt(null);
    }
  }, [analytics, fetchJobs, fetchRuns, getAuthHeaders, platformFilter, scope, seasonNumber, showId, syncStrategy, weekFilter]);

  const downloadExport = useCallback(
    async (format: "csv" | "pdf") => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/export?format=${format}&${queryString}`,
          { headers }
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

  const weeklyPlatformRows = useMemo(() => analytics?.weekly_platform_posts ?? [], [analytics]);
  const sectionErrorItems = useMemo(() => {
    const labels: Record<keyof typeof sectionErrors, string> = {
      analytics: "Analytics",
      targets: "Targets",
      runs: "Runs",
      jobs: "Jobs",
    };
    return (Object.keys(sectionErrors) as Array<keyof typeof sectionErrors>)
      .filter((key) => Boolean(sectionErrors[key]))
      .map((key) => ({
        key,
        label: labels[key],
        message: sectionErrors[key] as string,
      }));
  }, [sectionErrors]);
  const weeklyDailyActivityRows = useMemo(
    () => analytics?.weekly_daily_activity ?? [],
    [analytics],
  );
  const heatmapPlatform: Platform | null = useMemo(() => {
    if (platformTab === "overview" || platformTab === "reddit") return null;
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
  const hashtagPlatformsInScope = useMemo(() => {
    if (platformTab === "overview" || platformTab === "reddit") return HASHTAG_PLATFORMS;
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
  const selectedRunLabel = selectedRunId ? (runOptionLabelById.get(selectedRunId) ?? null) : null;
  const ingestExportPanel = (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
        <button
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
      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                  Season Social Analytics
                </p>
                <p
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${
                    hasRunningJobs
                      ? "bg-zinc-300 text-zinc-800"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {hasRunningJobs ? "Run Active" : "Idle"}
                </p>
              </div>
              <h3 className="mt-3 text-2xl font-bold text-zinc-900">{showName} · Season {seasonNumber}</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Bravo-owned social analytics with viewer sentiment and weekly rollups.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm xl:max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Current Run</p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-800 break-words">
                {selectedRunLabel ?? "No run selected"}
              </p>
            </div>
          </div>

          {!hidePlatformTabs && (
            <nav className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 shadow-sm">
              {PLATFORM_TABS.map((tab) => {
                const isActive = platformTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setPlatformTabAndUrl(tab.key);
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:bg-white/50 hover:text-zinc-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          )}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
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
                    onChange={(event) =>
                      setWeekFilter(event.target.value === "all" ? "all" : Number.parseInt(event.target.value, 10))
                    }
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

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Season Details</p>
              <dl className="mt-3 space-y-2">
                <div className="rounded-lg bg-zinc-50 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Season ID</dt>
                  <dd className="mt-1 break-all text-sm font-medium text-zinc-800">{seasonId}</dd>
                </div>
                <div className="rounded-lg bg-zinc-50 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">Last Updated</dt>
                  <dd className="mt-1 text-sm font-medium text-zinc-800">
                    {lastUpdated ? lastUpdated.toLocaleString() : "-"}
                  </dd>
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
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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

      {sectionErrorItems.length > 0 && (
        <div className="space-y-2">
          {sectionErrorItems.map((item) => (
            <div key={item.key} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <span className="font-semibold">{item.label}:</span> {item.message}
            </div>
          ))}
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

      {platformTab === "reddit" ? (
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
              <div className="mb-4 flex items-center justify-between">
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
              <div className="space-y-3">
                {weeklyDailyActivityRows.map((weekRow) => {
                  const weekTotal = weeklyHeatmapTotals.get(weekRow.week_index) ?? 0;
                  return (
                    <div
                      key={weekRow.week_index}
                      className="space-y-1"
                      data-testid={`weekly-heatmap-row-${weekRow.week_index}`}
                    >
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{weekRow.label}</span>
                        <span>
                          <span data-testid={`weekly-heatmap-total-${weekRow.week_index}`}>
                            {weekTotal.toLocaleString()} {weeklyMetric}
                          </span>
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50 p-2">
                        {weekRow.days.map((day) => {
                          const value = getWeeklyDayValue(day, weeklyMetric, heatmapPlatform);
                          return (
                            <div
                              key={`${weekRow.week_index}-${day.day_index}`}
                              data-testid={`weekly-heatmap-day-${weekRow.week_index}-${day.day_index}`}
                              title={`${day.date_local} · ${value.toLocaleString()} ${weeklyMetric}`}
                            >
                              <div
                                className={`flex aspect-square items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums ${getHeatmapToneClass(value, weeklyHeatmapMaxValue)}`}
                              >
                                {getMonthDayLabel(day.date_local)}
                              </div>
                            </div>
                          );
                        })}
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
            <section className="grid gap-6 xl:grid-cols-1">
              {ingestExportPanel}
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
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyPlatformRows.map((week) => (
                    <tr key={`table-week-${week.week_index}`} className="border-b border-zinc-100 text-zinc-700">
                      <td className="px-3 py-2 font-semibold">
                        <Link
                          href={buildSeasonSocialWeekUrl({
                            showSlug: showRouteSlug,
                            seasonNumber,
                            weekIndex: week.week_index,
                            query: new URLSearchParams({ source_scope: scope }),
                          }) as "/admin/trr-shows"}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {week.label ?? (week.week_index === 0 ? "Pre-Season" : `Week ${week.week_index}`)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {formatDateTime(week.start)} to {formatDateTime(week.end)}
                      </td>
                      <td className="px-3 py-2">
                        <div>{week.posts.instagram}</div>
                        <div className="text-xs text-zinc-400">{week.comments?.instagram ?? 0} comments</div>
                      </td>
                      <td className="px-3 py-2">
                        <div>{week.posts.youtube}</div>
                        <div className="text-xs text-zinc-400">{week.comments?.youtube ?? 0} comments</div>
                      </td>
                      <td className="px-3 py-2">
                        <div>{week.posts.tiktok}</div>
                        <div className="text-xs text-zinc-400">{week.comments?.tiktok ?? 0} comments</div>
                      </td>
                      <td className="px-3 py-2">
                        <div>{week.posts.twitter}</div>
                        <div className="text-xs text-zinc-400">{week.comments?.twitter ?? 0} comments</div>
                      </td>
                      <td className="px-3 py-2 font-semibold text-zinc-900">
                        <div>{week.total_posts}</div>
                        <div className="text-xs font-normal text-zinc-400">{week.total_comments ?? 0} comments</div>
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
                  ))}
                  {weeklyPlatformRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-sm text-zinc-500" colSpan={8}>
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
