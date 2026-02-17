"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SocialPostsSection from "@/components/admin/social-posts-section";
import RedditSourcesManager from "@/components/admin/reddit-sources-manager";
import { auth } from "@/lib/firebase";

type Platform = "instagram" | "tiktok" | "twitter" | "youtube";
type PlatformTab = "overview" | Platform | "reddit";
type Scope = "bravo" | "creator" | "community";

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
    }>;
    viewer_discussion: Array<{
      platform: string;
      source_id: string;
      text: string;
      engagement: number;
      url: string;
      timestamp: string;
      sentiment: "positive" | "neutral" | "negative";
    }>;
  };
  jobs: SocialJob[];
};

interface SeasonSocialAnalyticsSectionProps {
  showId: string;
  seasonNumber: number;
  seasonId: string;
  showName: string;
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

const WEEKLY_ENGAGEMENT_PLATFORMS: Platform[] = ["instagram", "youtube", "tiktok", "twitter"];

const WEEKLY_ENGAGEMENT_BAR_CLASS: Record<Platform, string> = {
  instagram: "bg-pink-500",
  youtube: "bg-red-500",
  tiktok: "bg-teal-400",
  twitter: "bg-sky-500",
};

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

const formatDateRangeLabel = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} to ${end}`;
  }
  return `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
};

const statusToLogVerb = (status: SocialJob["status"]): string => {
  if (status === "queued" || status === "pending") return "queued";
  if (status === "retrying") return "retrying";
  if (status === "running") return "running";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return "cancelled";
};

export default function SeasonSocialAnalyticsSection({
  showId,
  seasonNumber,
  seasonId,
  showName,
}: SeasonSocialAnalyticsSectionProps) {
  const [scope, setScope] = useState<Scope>("bravo");
  const [platformTab, setPlatformTab] = useState<PlatformTab>("overview");
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [targets, setTargets] = useState<SocialTarget[]>([]);
  const [jobs, setJobs] = useState<SocialJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [runningIngest, setRunningIngest] = useState(false);
  const [cancellingRun, setCancellingRun] = useState(false);
  const [ingestingWeek, setIngestingWeek] = useState<number | null>(null);
  const [ingestingPlatform, setIngestingPlatform] = useState<string | null>(null);
  const [activeRunRequest, setActiveRunRequest] = useState<{ week: number | null; platform: "all" | Platform } | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [hasObservedRunJobs, setHasObservedRunJobs] = useState(false);
  const [noRunningJobsCount, setNoRunningJobsCount] = useState(0);
  const [ingestStartedAt, setIngestStartedAt] = useState<Date | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [manualSourcesOpen, setManualSourcesOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [elapsedTick, setElapsedTick] = useState(0);

  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Not authenticated");
    }
    return { Authorization: `Bearer ${token}` };
  }, []);

  const queryString = useMemo(() => {
    const search = new URLSearchParams();
    search.set("source_scope", scope);
    search.set("timezone", "America/New_York");
    if (platformFilter !== "all") search.set("platforms", platformFilter);
    if (weekFilter !== "all") search.set("week", String(weekFilter));
    return search.toString();
  }, [scope, platformFilter, weekFilter]);

  const fetchAnalytics = useCallback(async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics?${queryString}`,
      { headers, cache: "no-store" }
    );
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Failed to load social analytics");
    }
    const data = (await response.json()) as AnalyticsResponse;
    setAnalytics(data);
    setLastUpdated(new Date());
  }, [getAuthHeaders, queryString, seasonNumber, showId]);

  const fetchTargets = useCallback(async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/targets?source_scope=${scope}`,
      { headers, cache: "no-store" }
    );
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Failed to load social targets");
    }
    const data = (await response.json()) as { targets?: SocialTarget[] };
    setTargets(data.targets ?? []);
  }, [getAuthHeaders, scope, seasonNumber, showId]);

  const fetchJobs = useCallback(async (runId?: string | null) => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ limit: "250" });
    if (runId) {
      params.set("run_id", runId);
    }
    const response = await fetch(
      `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/jobs?${params.toString()}`,
      { headers, cache: "no-store" }
    );
    if (!response.ok) return;
    const data = (await response.json()) as { jobs?: SocialJob[] };
    setJobs(data.jobs ?? []);
  }, [getAuthHeaders, seasonNumber, showId]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchAnalytics(), fetchTargets(), fetchJobs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load social dashboard");
    } finally {
      setLoading(false);
    }
  }, [fetchAnalytics, fetchTargets, fetchJobs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const runScopedJobs = useMemo(() => {
    if (!activeRunId) return jobs;
    return jobs.filter((job) => job.run_id === activeRunId);
  }, [activeRunId, jobs]);

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

  const activeRunScope = useMemo(() => {
    const fallbackWeek = activeRunRequest?.week ?? (weekFilter === "all" ? null : weekFilter);
    const fallbackPlatform = activeRunRequest?.platform ?? platformFilter;
    const fallbackWeekLabel = formatWeekScopeLabel(fallbackWeek);
    const fallbackPlatformLabel = formatPlatformScopeLabel(fallbackPlatform);

    if (!activeRunId || runScopedJobs.length === 0) {
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
  }, [activeRunId, activeRunRequest, platformFilter, runScopedJobs, weekFilter, weeklyWindowLookup]);

  const liveRunLogs = useMemo(() => {
    if (!activeRunId) return [];
    return [...runScopedJobs]
      .map((job) => {
        const stage =
          (typeof job.config?.stage === "string" ? job.config.stage : undefined) ??
          (typeof job.metadata?.stage === "string" ? job.metadata.stage : undefined) ??
          job.job_type ??
          "posts";
        const timestamp = job.completed_at ?? job.started_at ?? job.created_at ?? null;
        const ts = timestamp ? Date.parse(timestamp) : Number.NaN;
        const counters = (job.metadata as Record<string, unknown>)?.stage_counters as
          | Record<string, number>
          | undefined;
        const counterSummary =
          counters && (typeof counters.posts === "number" || typeof counters.comments === "number")
            ? ` · ${counters.posts ?? 0}p/${counters.comments ?? 0}c`
            : "";
        const account = typeof job.config?.account === "string" && job.config.account ? ` @${job.config.account}` : "";
        const itemCount = typeof job.items_found === "number" ? ` · ${job.items_found.toLocaleString()} items` : "";
        return {
          id: job.id,
          timestampMs: Number.isNaN(ts) ? 0 : ts,
          timestampLabel: timestamp ? new Date(timestamp).toLocaleTimeString() : "--:--:--",
          message: `${PLATFORM_LABELS[job.platform] ?? job.platform} ${stage}${account} ${statusToLogVerb(job.status)}${itemCount}${counterSummary}`,
        };
      })
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 8);
  }, [activeRunId, runScopedJobs]);

  const hasRunningJobs = useMemo(() => {
    const runningStatuses = new Set(["queued", "pending", "retrying", "running"]);
    const source = activeRunId ? runScopedJobs : jobs;
    return source.some((job) => runningStatuses.has(job.status));
  }, [activeRunId, runScopedJobs, jobs]);

  useEffect(() => {
    if (!activeRunId) {
      setHasObservedRunJobs(false);
      return;
    }
    if (runScopedJobs.length > 0) {
      setHasObservedRunJobs(true);
    }
  }, [activeRunId, runScopedJobs.length]);

  // Track consecutive polls with no running jobs (grace period for inter-job transitions)
  useEffect(() => {
    if (!runningIngest || !activeRunId || !hasObservedRunJobs) return;
    if (hasRunningJobs) {
      setNoRunningJobsCount(0);
      return;
    }
    setNoRunningJobsCount((prev) => prev + 1);
  }, [activeRunId, hasObservedRunJobs, hasRunningJobs, runningIngest]);

  // When polling detects no more running jobs for 2+ consecutive polls, clear the ingest UI state
  useEffect(() => {
    if (!runningIngest) return;
    if (!activeRunId) return;
    if (!hasObservedRunJobs) return;
    // Require 2 consecutive polls with no running jobs to avoid false positives
    // during inter-job transitions in execute_run
    if (noRunningJobsCount < 2) return;
    // Jobs finished — summarize from the latest jobs list
    const finishedJobs = runScopedJobs.filter(
      (j) => j.status === "completed" || j.status === "failed"
    );
    const completed = finishedJobs.filter((j) => j.status === "completed");
    const failed = finishedJobs.filter((j) => j.status === "failed");
    const totalItems = completed.reduce((s, j) => s + (j.items_found ?? 0), 0);

    const elapsed = ingestStartedAt
      ? ` in ${Math.round((Date.now() - ingestStartedAt.getTime()) / 1000)}s`
      : "";
    let msg = `Ingest complete${elapsed}: ${completed.length} job(s) finished, ${totalItems} items`;
    if (failed.length > 0) {
      msg += ` · ${failed.length} failed`;
    }
    setIngestMessage(msg);
    setRunningIngest(false);
    setIngestingWeek(null);
    setIngestingPlatform(null);
    setActiveRunRequest(null);
    setActiveRunId(null);
    setNoRunningJobsCount(0);
    setIngestStartedAt(null);
    // Refresh analytics to reflect new data
    fetchAnalytics().catch(() => {});
  }, [activeRunId, hasObservedRunJobs, noRunningJobsCount, runningIngest, runScopedJobs, fetchAnalytics, ingestStartedAt]);

  // Poll for job updates when there are running jobs or an active ingest
  useEffect(() => {
    if (!activeRunId) return;
    if (!hasRunningJobs && !runningIngest) return;
    const interval = runningIngest ? 3000 : 5000;
    const timer = window.setInterval(async () => {
      try {
        await fetchJobs(activeRunId);
        if (!runningIngest) {
          await fetchAnalytics();
        }
      } catch {
        // Polling errors are transient; silently retry on next interval
      }
    }, interval);
    return () => window.clearInterval(timer);
  }, [activeRunId, fetchAnalytics, fetchJobs, hasRunningJobs, runningIngest]);

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
      const response = await fetch(
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
      setActiveRunId(null);
      setNoRunningJobsCount(0);
      setIngestStartedAt(null);
      await fetchJobs(activeRunId);
      await fetchAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel run");
    } finally {
      setCancellingRun(false);
    }
  }, [activeRunId, fetchAnalytics, fetchJobs, getAuthHeaders, seasonNumber, showId]);

  const runIngest = useCallback(async (override?: { week?: number; platform?: "all" | Platform }) => {
    setRunningIngest(true);
    setError(null);
    setIngestMessage(null);
    setJobs([]);
    setActiveRunId(null);
    setHasObservedRunJobs(false);
    setNoRunningJobsCount(0);
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
        date_start?: string;
        date_end?: string;
      } = {
        source_scope: scope,
        max_posts_per_target: 100000,
        max_comments_per_post: 100000,
        max_replies_per_post: 100000,
        fetch_replies: true,
        ingest_mode: "posts_and_comments",
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
      setIngestMessage(`Starting ${label} · ${platformLabel}...`);

      console.log("[social-ingest] Sending payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(
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
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to run social ingest");
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

      // Backend returns queued/staged run metadata immediately.
      const stages = (result.stages ?? []).join(" -> ") || "posts -> comments";
      const jobCount = result.queued_or_started_jobs ?? 0;
      setIngestMessage(`${label} · ${platformLabel} — run ${runId} queued (${jobCount} jobs, stages: ${stages}).`);

      // Immediately fetch jobs to pick up the newly created running jobs
      await fetchJobs(runId);

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
      setActiveRunId(null);
      setNoRunningJobsCount(0);
      setIngestStartedAt(null);
    }
  }, [analytics, fetchJobs, getAuthHeaders, platformFilter, scope, seasonNumber, showId, weekFilter]);

  const downloadExport = useCallback(
    async (format: "csv" | "pdf") => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
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
  const weeklyPlatformEngagementRows = useMemo(
    () => analytics?.weekly_platform_engagement ?? [],
    [analytics]
  );
  const weeklyPlatformEngagementLookup = useMemo(() => {
    const lookup = new Map<number, NonNullable<AnalyticsResponse["weekly_platform_engagement"]>[number]>();
    for (const row of weeklyPlatformEngagementRows) {
      lookup.set(row.week_index, row);
    }
    return lookup;
  }, [weeklyPlatformEngagementRows]);
  const weeklyPlatformEngagementMax = useMemo(() => {
    const values = weeklyPlatformEngagementRows.flatMap((row) =>
      WEEKLY_ENGAGEMENT_PLATFORMS.map((platform) => row.engagement?.[platform] ?? 0)
    );
    return Math.max(1, ...values);
  }, [weeklyPlatformEngagementRows]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Season Social Analytics
            </p>
            <h3 className="text-2xl font-bold text-zinc-900">{showName} · Season {seasonNumber}</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Bravo-owned social analytics with viewer sentiment and weekly rollups.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Scope
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as Scope)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700"
              >
                <option value="bravo">Bravo</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Week
              <select
                value={weekFilter}
                onChange={(event) =>
                  setWeekFilter(event.target.value === "all" ? "all" : Number.parseInt(event.target.value, 10))
                }
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700"
              >
                <option value="all">All Weeks</option>
                {(analytics?.weekly ?? []).map((week) => (
                  <option key={week.week_index} value={week.week_index}>
                    {week.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="rounded-full bg-zinc-100 px-3 py-1">Season ID: {seasonId}</span>
          <span className="rounded-full bg-zinc-100 px-3 py-1">
            Last Updated: {lastUpdated ? lastUpdated.toLocaleString() : "-"}
          </span>
          {analytics?.window?.start && analytics?.window?.end && (
            <span className="rounded-full bg-zinc-100 px-3 py-1">
              Window: {formatDateTime(analytics.window.start)} to {formatDateTime(analytics.window.end)}
            </span>
          )}
        </div>
      </section>

      {/* Platform tabs */}
      <nav className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 shadow-sm">
        {PLATFORM_TABS.map((tab) => {
          const isActive = platformTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setPlatformTab(tab.key);
                setPlatformFilter(tab.key === "overview" || tab.key === "reddit" ? "all" : tab.key);
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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {ingestMessage && !error && (() => {
        const activeJobs = runScopedJobs.filter((j) =>
          activeRunId ? j.run_id === activeRunId : ["queued", "pending", "retrying", "running"].includes(j.status)
        );
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
                          const counters = (j.metadata as Record<string, unknown>)?.stage_counters as
                            | Record<string, number>
                            | undefined;
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
                              {(postsFound > 0 || commentsFound > 0) && (
                                <span className="tabular-nums text-zinc-600">{postsFound}p/{commentsFound}c</span>
                              )}
                              {j.items_found && j.items_found > 0 && !(postsFound > 0 || commentsFound > 0) ? (
                                <span className="tabular-nums text-zinc-600">{j.items_found}</span>
                              ) : null}
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

          <section className="grid gap-6 xl:grid-cols-3">
            <article className="xl:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-zinc-900">Weekly Trend</h4>
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Episode-air anchored</span>
              </div>
              <div className="space-y-3">
                {(analytics?.weekly ?? []).map((week) => {
                  const engagementRow = weeklyPlatformEngagementLookup.get(week.week_index);
                  const hasData = Boolean(engagementRow?.has_data);
                  const engagement = engagementRow?.engagement ?? {
                    instagram: 0,
                    youtube: 0,
                    tiktok: 0,
                    twitter: 0,
                  };
                  return (
                    <div
                      key={week.week_index}
                      className="space-y-1"
                      data-testid={`weekly-trend-row-${week.week_index}`}
                    >
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{week.label}</span>
                        <span>
                          {week.post_volume} posts · {week.comment_volume} comments · {week.engagement.toLocaleString()} engagement
                        </span>
                      </div>
                      {hasData ? (
                        <div className="space-y-1 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                          {WEEKLY_ENGAGEMENT_PLATFORMS.map((platform) => {
                            const value = engagement[platform] ?? 0;
                            const width =
                              value > 0
                                ? `${Math.max(0, (value / weeklyPlatformEngagementMax) * 100)}%`
                                : "0%";
                            return (
                              <div key={`${week.week_index}-${platform}`} className="flex items-center gap-2">
                                <span className="w-16 text-[11px] text-zinc-500">
                                  {PLATFORM_LABELS[platform]}
                                </span>
                                <div className="h-2 flex-1 rounded-full bg-zinc-200">
                                  {value > 0 ? (
                                    <div
                                      data-testid={`weekly-engagement-bar-${week.week_index}-${platform}`}
                                      className={`h-2 rounded-full ${WEEKLY_ENGAGEMENT_BAR_CLASS[platform]}`}
                                      style={{ width }}
                                    />
                                  ) : null}
                                </div>
                                <span className="w-16 text-right text-[11px] text-zinc-500">
                                  {value.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p
                          data-testid={`weekly-no-data-${week.week_index}`}
                          className="text-xs text-zinc-400"
                        >
                          No data yet
                        </p>
                      )}
                    </div>
                  );
                })}
                {(analytics?.weekly?.length ?? 0) === 0 && (
                  <p className="text-sm text-zinc-500">No weekly data for selected filters.</p>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h4 className="mb-4 text-lg font-semibold text-zinc-900">Ingest + Export</h4>
              <div className="space-y-2 text-sm text-zinc-600">
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
                {activeRunId && (
                  <>
                    {" · "}
                    <span className="font-semibold text-zinc-700">Run {activeRunId.slice(0, 8)}</span>
                  </>
                )}
              </p>
              {activeRunId && !runningIngest && liveRunLogs.length > 0 && (
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
          </section>

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
                          href={`/admin/trr-shows/${showId}/seasons/${seasonNumber}/social/week/${week.week_index}?source_scope=${scope}`}
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

          <section className="grid gap-6 xl:grid-cols-2">
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
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-zinc-900">{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
                      <span className="text-xs text-zinc-500">{item.engagement.toLocaleString()} engagement</span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700 line-clamp-2">{item.text || item.source_id}</p>
                  </a>
                ))}
                {(analytics?.leaderboards.bravo_content?.length ?? 0) === 0 && (
                  <p className="text-sm text-zinc-500">No content leaderboard entries yet.</p>
                )}
              </div>
            </article>

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
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.15em] text-zinc-500">
                      <span>{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
                      <span>{item.sentiment}</span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700 line-clamp-3">{item.text}</p>
                  </a>
                ))}
                {(analytics?.leaderboards.viewer_discussion?.length ?? 0) === 0 && (
                  <p className="text-sm text-zinc-500">No viewer discussion highlights yet.</p>
                )}
              </div>
            </article>
          </section>

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
                  void fetchJobs(activeRunId);
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
                  const counters = (job.metadata as Record<string, unknown>)?.stage_counters as
                    | Record<string, number>
                    | undefined;
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
                          {counters && (counters.posts > 0 || counters.comments > 0) ? (
                            <span className="font-semibold tabular-nums text-zinc-700">
                              {counters.posts ?? 0}p / {counters.comments ?? 0}c
                            </span>
                          ) : (
                            <span className="font-semibold tabular-nums text-zinc-700">{(job.items_found ?? 0).toLocaleString()} items</span>
                          )}
                          {duration && <span className="tabular-nums text-zinc-400">{duration}</span>}
                        </div>
                      </div>
                      {job.error_message && (
                        <p className="mt-1.5 rounded bg-red-100 px-2 py-1 text-xs text-red-700">{job.error_message}</p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">
                        {job.started_at ? `Started ${formatDateTime(job.started_at)}` : `Created ${formatDateTime(job.created_at)}`}
                        {job.completed_at ? ` · Done ${formatDateTime(job.completed_at)}` : ""}
                      </p>
                    </div>
                  );
                });
              })()}
              {runScopedJobs.length === 0 && <p className="text-sm text-zinc-500">No jobs found for this season. Run an ingest to get started.</p>}
            </div>
            </>)}
          </section>

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
        </>
      )}
    </div>
  );
}
