"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SocialPostsSection from "@/components/admin/social-posts-section";
import { auth } from "@/lib/firebase";

type Platform = "instagram" | "tiktok" | "twitter" | "youtube";
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
    total_posts: number;
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
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export default function SeasonSocialAnalyticsSection({
  showId,
  seasonNumber,
  seasonId,
  showName,
}: SeasonSocialAnalyticsSectionProps) {
  const [scope, setScope] = useState<Scope>("bravo");
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
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [hasObservedRunJobs, setHasObservedRunJobs] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [manualSourcesOpen, setManualSourcesOpen] = useState(false);

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
    if (!runId) {
      setJobs([]);
      return;
    }
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ limit: "250" });
    params.set("run_id", runId);
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
      await Promise.all([fetchAnalytics(), fetchTargets()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load social dashboard");
    } finally {
      setLoading(false);
    }
  }, [fetchAnalytics, fetchTargets]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const runScopedJobs = useMemo(() => {
    if (!activeRunId) return [];
    return jobs.filter((job) => job.run_id === activeRunId);
  }, [activeRunId, jobs]);

  const hasRunningJobs = useMemo(() => {
    const runningStatuses = new Set(["queued", "pending", "retrying", "running"]);
    return runScopedJobs.some((job) => runningStatuses.has(job.status));
  }, [runScopedJobs]);

  useEffect(() => {
    if (!activeRunId) {
      setHasObservedRunJobs(false);
      return;
    }
    if (runScopedJobs.length > 0) {
      setHasObservedRunJobs(true);
    }
  }, [activeRunId, runScopedJobs.length]);

  // When polling detects no more running jobs, clear the ingest UI state
  useEffect(() => {
    if (!runningIngest) return;
    if (!activeRunId) return;
    if (!hasObservedRunJobs) return;
    if (hasRunningJobs) return;
    // Jobs finished — summarize from the latest jobs list
    const recentJobs = runScopedJobs.filter(
      (j) => j.status === "completed" || j.status === "failed"
    ).slice(0, 10);
    const completed = recentJobs.filter((j) => j.status === "completed");
    const failed = recentJobs.filter((j) => j.status === "failed");
    const totalItems = completed.reduce((s, j) => s + (j.items_found ?? 0), 0);

    let msg = `Ingest complete: ${completed.length} job(s) finished, ${totalItems} items`;
    if (failed.length > 0) {
      msg += ` (${failed.length} failed)`;
    }
    setIngestMessage(msg);
    setRunningIngest(false);
    setIngestingWeek(null);
    setIngestingPlatform(null);
    setActiveRunId(null);
    // Refresh analytics to reflect new data
    fetchAnalytics().catch(() => {});
  }, [activeRunId, hasObservedRunJobs, hasRunningJobs, runningIngest, runScopedJobs, fetchAnalytics]);

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
      setActiveRunId(null);
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

    const effectivePlatform = override?.platform ?? platformFilter;
    const effectiveWeek = override?.week ?? (weekFilter === "all" ? null : weekFilter);
    setIngestingWeek(effectiveWeek);
    setIngestingPlatform(effectivePlatform);

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
      setActiveRunId(null);
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

  const weeklyMax = useMemo(() => {
    if (!analytics?.weekly?.length) return 1;
    return Math.max(
      1,
      ...analytics.weekly.map((week) => Math.max(week.post_volume + week.comment_volume, week.engagement))
    );
  }, [analytics]);

  const weeklyPlatformRows = useMemo(() => analytics?.weekly_platform_posts ?? [], [analytics]);

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
          <div className="grid gap-2 sm:grid-cols-3">
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
              Platform
              <select
                value={platformFilter}
                onChange={(event) => setPlatformFilter(event.target.value as "all" | Platform)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700"
              >
                <option value="all">All Platforms</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter/X</option>
                <option value="youtube">YouTube</option>
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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {ingestMessage && !error && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          runningIngest
            ? "animate-pulse border-blue-200 bg-blue-50 text-blue-700"
            : "border-green-200 bg-green-50 text-green-700"
        }`}>
              <p>{ingestMessage}</p>
              {runningIngest && hasObservedRunJobs && (
                <div className="mt-2 space-y-1 text-xs">
                  {runScopedJobs.filter((j) => ["queued", "pending", "retrying", "running"].includes(j.status)).map((j) => {
                    const stage =
                      (typeof j.config?.stage === "string" ? j.config.stage : undefined) ??
                      (typeof j.metadata?.stage === "string" ? j.metadata.stage : "stage");
                    return (
                    <div key={j.id} className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                      <span className="font-semibold">{PLATFORM_LABELS[j.platform] ?? j.platform}</span>
                      <span className="text-blue-500">{stage} {j.status} — {j.items_found ?? 0} items so far</span>
                    </div>
                    );
                  })}
                  {runScopedJobs.filter((j) => j.status === "completed").slice(0, 5).map((j) => {
                    const stage =
                      (typeof j.config?.stage === "string" ? j.config.stage : undefined) ??
                      (typeof j.metadata?.stage === "string" ? j.metadata.stage : "stage");
                    return (
                    <div key={j.id} className="flex items-center gap-2 text-green-700">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                      <span className="font-semibold">{PLATFORM_LABELS[j.platform] ?? j.platform}</span>
                      <span>{stage} done — {j.items_found ?? 0} items</span>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

      {loading && !analytics ? (
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
                  const activity = week.post_volume + week.comment_volume;
                  const width = `${Math.max(5, (activity / weeklyMax) * 100)}%`;
                  return (
                    <div key={week.week_index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{week.label}</span>
                        <span>
                          {week.post_volume} posts · {week.comment_volume} comments · {week.engagement.toLocaleString()} engagement
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100">
                        <div className="h-2 rounded-full bg-zinc-800" style={{ width }} />
                      </div>
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
                  {weekFilter === "all" ? "All Weeks" : weekFilter === 0 ? "Pre-Season" : `Week ${weekFilter}`}
                </span>
                {" · "}
                <span className="font-semibold text-zinc-700">
                  {platformFilter === "all" ? "All Platforms" : PLATFORM_LABELS[platformFilter]}
                </span>
                {activeRunId && (
                  <>
                    {" · "}
                    <span className="font-semibold text-zinc-700">Run {activeRunId.slice(0, 8)}</span>
                  </>
                )}
              </p>
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
                      <td className="px-3 py-2 font-semibold text-zinc-900">{week.label ?? (week.week_index === 0 ? "Pre-Season" : `Week ${week.week_index}`)}</td>
                      <td className="px-3 py-2 text-xs text-zinc-500">
                        {formatDateTime(week.start)} to {formatDateTime(week.end)}
                      </td>
                      <td className="px-3 py-2">{week.posts.instagram}</td>
                      <td className="px-3 py-2">{week.posts.youtube}</td>
                      <td className="px-3 py-2">{week.posts.tiktok}</td>
                      <td className="px-3 py-2">{week.posts.twitter}</td>
                      <td className="px-3 py-2 font-semibold text-zinc-900">{week.total_posts}</td>
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
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-zinc-900">Ingest Job Status</h4>
              <button
                type="button"
                onClick={() => {
                  void fetchJobs(activeRunId);
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Refresh Jobs
              </button>
            </div>
            <div className="space-y-2">
              {runScopedJobs.slice(0, 10).map((job) => (
                <div key={job.id} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-zinc-900">
                      {PLATFORM_LABELS[job.platform] ?? job.platform} · {job.status}
                    </span>
                    <span className="text-xs text-zinc-500">{job.items_found ?? 0} items</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Started {formatDateTime(job.started_at ?? job.created_at)}
                    {job.completed_at ? ` · Completed ${formatDateTime(job.completed_at)}` : ""}
                  </p>
                  {job.error_message && <p className="mt-1 text-xs text-red-600">{job.error_message}</p>}
                </div>
              ))}
              {runScopedJobs.length === 0 && <p className="text-sm text-zinc-500">No jobs found for this season.</p>}
            </div>
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
