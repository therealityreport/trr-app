"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { buildPersonExternalIdUrl } from "@/lib/admin/person-external-ids";
import {
  type SocialBladeGrowthData,
  type SocialBladeProfileStatsLabels,
  type SocialPlatformSlug,
  SOCIAL_ACCOUNT_PLATFORM_LABELS,
} from "@/lib/admin/social-account-profile";

type SupportedSocialBladePlatform = Extract<SocialPlatformSlug, "instagram" | "facebook" | "youtube">;

type SocialGrowthSectionProps = {
  platform: SupportedSocialBladePlatform;
  handle: string | null;
  personId?: string | null;
};

const DEFAULT_PROFILE_STATS_LABELS: Record<SupportedSocialBladePlatform, SocialBladeProfileStatsLabels> = {
  instagram: {
    followers: "Followers",
    following: "Following",
    media_count: "Posts",
    engagement_rate: "Engagement",
    average_likes: "Avg Likes",
    average_comments: "Avg Comments",
    chart_metric_label: "Followers",
  },
  facebook: {
    followers: "Likes",
    following: "Talking About",
    media_count: "Posts",
    engagement_rate: "Engagement",
    average_likes: "Avg Reactions",
    average_comments: "Avg Comments",
    chart_metric_label: "Likes",
  },
  youtube: {
    followers: "Subscribers",
    following: "Views",
    media_count: "Videos",
    engagement_rate: "Engagement",
    average_likes: "Avg Views",
    average_comments: "Avg Comments",
    chart_metric_label: "Subscribers",
  },
};

const PLATFORM_BADGE_TONES: Record<SupportedSocialBladePlatform, string> = {
  instagram: "from-fuchsia-500 via-rose-500 to-amber-400",
  facebook: "from-sky-500 via-blue-600 to-indigo-700",
  youtube: "from-red-500 via-rose-600 to-orange-500",
};

const PLATFORM_BADGE_LABELS: Record<SupportedSocialBladePlatform, string> = {
  instagram: "IG",
  facebook: "FB",
  youtube: "YT",
};

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString();
}

function formatSignedCompactDelta(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${formatCompactNumber(Math.abs(n))}`;
}

function parsePercentValue(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value.replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSignedPercentDelta(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0%";
  const sign = n > 0 ? "+" : "-";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatFullDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeAge(ageHours: number | null | undefined): string {
  if (typeof ageHours !== "number" || !Number.isFinite(ageHours)) return "unknown age";
  if (ageHours < 1) return `${Math.max(1, Math.round(ageHours * 60))}m ago`;
  if (ageHours < 48) return `${ageHours.toFixed(ageHours >= 10 ? 0 : 1)}h ago`;
  return `${Math.round(ageHours / 24)}d ago`;
}

function getFreshnessChip(data: SocialBladeGrowthData | null): { label: string; className: string } {
  if (!data) {
    return {
      label: "Missing",
      className: "border-zinc-200 bg-zinc-100 text-zinc-600",
    };
  }
  if (data.freshness_status === "fresh") {
    return {
      label: "Fresh",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (data.freshness_status === "stale" || data.is_stale) {
    return {
      label: "Stale",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    label: "Unknown",
    className: "border-zinc-200 bg-zinc-100 text-zinc-600",
  };
}

function parseErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const detail = typeof record.detail === "string" ? record.detail : null;
    const error = typeof record.error === "string" ? record.error : null;
    return detail || error || `HTTP ${status}`;
  }
  return `HTTP ${status}`;
}

function FollowerGrowthChart({
  data,
  metricLabel,
}: {
  data: Array<{ date: string; followers: number }>;
  metricLabel: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartDimensions = useMemo(() => {
    const width = 800;
    const height = 280;
    const padding = { top: 20, right: 20, bottom: 40, left: 65 };
    return { width, height, padding };
  }, []);

  const { points, yTicks, xTicks, minY, maxY } = useMemo(() => {
    if (data.length === 0) return { points: "", yTicks: [], xTicks: [], minY: 0, maxY: 0 };

    const { width, height, padding } = chartDimensions;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const followers = data.map((d) => d.followers);
    const min = Math.min(...followers);
    const max = Math.max(...followers);
    const range = max - min || 1;
    const bufferMin = min - range * 0.05;
    const bufferMax = max + range * 0.05;

    const pts = data.map((d, i) => {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * plotWidth;
      const y = padding.top + plotHeight - ((d.followers - bufferMin) / (bufferMax - bufferMin)) * plotHeight;
      return `${x},${y}`;
    });

    const yTickCount = 5;
    const yTickValues: number[] = [];
    for (let i = 0; i <= yTickCount; i += 1) {
      yTickValues.push(bufferMin + (i / yTickCount) * (bufferMax - bufferMin));
    }

    const xTickEntries: { x: number; label: string }[] = [];
    const seenMonths = new Set<string>();
    const step = Math.max(1, Math.floor(data.length / 12));
    for (let i = 0; i < data.length; i += step) {
      const label = formatDate(data[i].date);
      if (!seenMonths.has(label)) {
        seenMonths.add(label);
        const x = padding.left + (i / Math.max(data.length - 1, 1)) * plotWidth;
        xTickEntries.push({ x, label });
      }
    }

    return {
      points: pts.join(" "),
      yTicks: yTickValues.map((v) => ({
        y: padding.top + plotHeight - ((v - bufferMin) / (bufferMax - bufferMin)) * plotHeight,
        label: formatCompactNumber(Math.round(v)),
      })),
      xTicks: xTickEntries,
      minY: bufferMin,
      maxY: bufferMax,
    };
  }, [data, chartDimensions]);

  const hoverPoint = useMemo(() => {
    if (hoverIndex === null || !data[hoverIndex]) return null;
    const { width, height, padding } = chartDimensions;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const range = maxY - minY || 1;
    const d = data[hoverIndex];
    const x = padding.left + (hoverIndex / Math.max(data.length - 1, 1)) * plotWidth;
    const y = padding.top + plotHeight - ((d.followers - minY) / range) * plotHeight;
    return { x, y, date: d.date, followers: d.followers };
  }, [hoverIndex, data, chartDimensions, minY, maxY]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
        No {metricLabel.toLowerCase()} history data available
      </div>
    );
  }

  const { width, height, padding } = chartDimensions;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const areaPath = `M${padding.left},${padding.top + plotHeight} ${points
    .split(" ")
    .map((pt, i) => (i === 0 ? `L${pt}` : `${pt}`))
    .join(" ")} L${padding.left + plotWidth},${padding.top + plotHeight} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={(e) => {
          const svg = e.currentTarget;
          const rect = svg.getBoundingClientRect();
          const clientX = e.clientX - rect.left;
          const scaleX = width / rect.width;
          const svgX = clientX * scaleX;
          const idx = Math.round(((svgX - padding.left) / plotWidth) * (data.length - 1));
          if (idx >= 0 && idx < data.length) setHoverIndex(idx);
        }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="follower-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => (
          <line
            key={`grid-${i}`}
            x1={padding.left}
            y1={tick.y}
            x2={padding.left + plotWidth}
            y2={tick.y}
            stroke="#e4e4e7"
            strokeWidth="0.5"
            strokeDasharray="4,4"
          />
        ))}

        {yTicks.map((tick, i) => (
          <text
            key={`ylabel-${i}`}
            x={padding.left - 8}
            y={tick.y + 4}
            textAnchor="end"
            className="fill-zinc-400"
            fontSize="10"
            fontFamily="system-ui"
          >
            {tick.label}
          </text>
        ))}

        {xTicks.map((tick, i) => (
          <text
            key={`xlabel-${i}`}
            x={tick.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-zinc-400"
            fontSize="10"
            fontFamily="system-ui"
          >
            {tick.label}
          </text>
        ))}

        <path d={areaPath} fill="url(#follower-gradient)" />
        <polyline
          points={points}
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hoverPoint ? (
          <>
            <line
              x1={hoverPoint.x}
              y1={padding.top}
              x2={hoverPoint.x}
              y2={padding.top + plotHeight}
              stroke="#6366f1"
              strokeWidth="0.75"
              strokeDasharray="3,3"
              opacity="0.5"
            />
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r="4" fill="#6366f1" stroke="#fff" strokeWidth="2" />
          </>
        ) : null}
      </svg>

      {hoverPoint ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: `${(hoverPoint.x / width) * 100}%`,
            top: `${((hoverPoint.y - 50) / height) * 100}%`,
          }}
        >
          <p className="text-[11px] font-semibold text-zinc-500">{formatFullDate(hoverPoint.date)}</p>
          <p className="text-sm font-bold text-indigo-600">
            {hoverPoint.followers.toLocaleString()} {metricLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function SocialGrowthSection({ platform, handle, personId = null }: SocialGrowthSectionProps) {
  const [data, setData] = useState<SocialBladeGrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const platformLabel = SOCIAL_ACCOUNT_PLATFORM_LABELS[platform];
  const canonicalHandle = handle?.trim() || null;
  const useLegacyPersonInstagramRoutes = Boolean(personId && platform === "instagram");

  const readUrl = useMemo(() => {
    if (!canonicalHandle) return null;
    if (useLegacyPersonInstagramRoutes && personId) {
      return `/api/admin/trr-api/people/${personId}/social-growth?handle=${encodeURIComponent(canonicalHandle)}`;
    }
    return `/api/admin/trr-api/social/profiles/${platform}/${encodeURIComponent(canonicalHandle)}/socialblade`;
  }, [canonicalHandle, personId, platform, useLegacyPersonInstagramRoutes]);

  const refreshUrl = useMemo(() => {
    if (!canonicalHandle) return null;
    if (useLegacyPersonInstagramRoutes && personId) {
      return `/api/admin/trr-api/people/${personId}/social-growth/refresh`;
    }
    return `/api/admin/trr-api/social/profiles/${platform}/${encodeURIComponent(canonicalHandle)}/socialblade/refresh`;
  }, [canonicalHandle, personId, platform, useLegacyPersonInstagramRoutes]);

  const fetchData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!readUrl) {
        setData(null);
        setLoading(false);
        return;
      }
      if (!options?.silent) setLoading(true);
      setError(null);
      try {
        const res = await fetchAdminWithAuth(readUrl, undefined, { allowDevAdminBypass: true });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(parseErrorMessage(body, res.status));
        }
        const json: SocialBladeGrowthData = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [readUrl],
  );

  const handleRefresh = useCallback(async () => {
    if (!canonicalHandle || !refreshUrl || refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    setRefreshNotice(null);
    try {
      const res = await fetchAdminWithAuth(
        refreshUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            useLegacyPersonInstagramRoutes
              ? { handle: canonicalHandle }
              : { force: false },
          ),
        },
        { allowDevAdminBypass: true },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(parseErrorMessage(body, res.status));
      }
      const json: SocialBladeGrowthData = await res.json();
      setData(json);
      setError(null);
      setRefreshNotice(
        json.refresh_status === "skipped"
          ? "Using the latest stored SocialBlade snapshot because it is still within the freshness window."
          : json.previous_run?.scraped_at
            ? `SocialBlade data refreshed. Card deltas now compare against the previous scrape from ${formatFullDate(json.previous_run.scraped_at.split("T")[0])}.`
            : "SocialBlade data refreshed.",
      );
      await fetchData({ silent: true });
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [canonicalHandle, fetchData, refreshUrl, refreshing, useLegacyPersonInstagramRoutes]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const statsLabels = useMemo(() => {
    return {
      ...DEFAULT_PROFILE_STATS_LABELS[platform],
      ...(data?.profile_stats_labels ?? {}),
    };
  }, [data?.profile_stats_labels, platform]);
  const previousRun = data?.previous_run ?? null;
  const previousRunDateLabel = useMemo(() => {
    const rawDate = previousRun?.scraped_at;
    if (!rawDate) return null;
    const datePart = rawDate.split("T")[0];
    return datePart ? formatFullDate(datePart) : null;
  }, [previousRun?.scraped_at]);

  const metricLabel = data?.chart_metric_label || statsLabels.chart_metric_label || statsLabels.followers || "Followers";
  const accountHref = buildPersonExternalIdUrl(platform, data?.account_handle ?? canonicalHandle ?? data?.username ?? null);
  const socialbladeHref = data?.socialblade_url ?? null;

  if (!canonicalHandle) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center">
        <p className="text-sm font-semibold text-zinc-600">No {platformLabel} account linked</p>
        <p className="mt-1 text-xs text-zinc-500">
          Assign a {platformLabel} handle to view SocialBlade growth data.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
              <div className="mt-3 h-6 w-20 animate-pulse rounded bg-zinc-200" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
          <div className="mt-4 h-64 animate-pulse rounded bg-zinc-100" />
        </div>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.toLowerCase().includes("no socialblade data found");
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-800">
          {isNotFound ? "No SocialBlade data yet" : "Failed to load social growth data"}
        </p>
        <p className="mt-1 text-xs text-red-600">{error}</p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {refreshing ? "Scraping SocialBlade..." : isNotFound ? "Scrape from SocialBlade" : "Retry via SocialBlade"}
        </button>
        {refreshError ? <p className="mt-2 text-xs text-amber-700">{refreshError}</p> : null}
      </div>
    );
  }

  if (!data) return null;

  const { profile_stats: stats, rankings, daily_total_followers_chart: chart, daily_channel_metrics_60day: metrics } = data;
  const freshnessChip = getFreshnessChip(data);
  const chartPoints = chart?.data ?? [];
  const statsCards = [
    {
      label: statsLabels.followers || "Followers",
      value: formatCompactNumber(stats.followers),
      raw: stats.followers.toLocaleString(),
      delta:
        typeof previousRun?.profile_stats?.followers === "number"
          ? {
              value: stats.followers - previousRun.profile_stats.followers,
              text: formatSignedCompactDelta(stats.followers - previousRun.profile_stats.followers),
            }
          : null,
    },
    {
      label: statsLabels.following || "Following",
      value: formatCompactNumber(stats.following),
      raw: stats.following.toLocaleString(),
      delta:
        typeof previousRun?.profile_stats?.following === "number"
          ? {
              value: stats.following - previousRun.profile_stats.following,
              text: formatSignedCompactDelta(stats.following - previousRun.profile_stats.following),
            }
          : null,
    },
    {
      label: statsLabels.media_count || "Posts",
      value: formatCompactNumber(stats.media_count),
      raw: stats.media_count.toLocaleString(),
      delta:
        typeof previousRun?.profile_stats?.media_count === "number"
          ? {
              value: stats.media_count - previousRun.profile_stats.media_count,
              text: formatSignedCompactDelta(stats.media_count - previousRun.profile_stats.media_count),
            }
          : null,
    },
    {
      label: statsLabels.engagement_rate || "Engagement",
      value: stats.engagement_rate,
      raw: stats.engagement_rate,
      delta: (() => {
        const current = parsePercentValue(stats.engagement_rate);
        const previous = parsePercentValue(previousRun?.profile_stats?.engagement_rate);
        if (current === null || previous === null) return null;
        const delta = current - previous;
        return { value: delta, text: formatSignedPercentDelta(delta) };
      })(),
    },
    {
      label: statsLabels.average_likes || "Avg Likes",
      value: formatCompactNumber(Math.round(stats.average_likes)),
      raw: Math.round(stats.average_likes).toLocaleString(),
      delta:
        typeof previousRun?.profile_stats?.average_likes === "number"
          ? {
              value: Math.round(stats.average_likes) - Math.round(previousRun.profile_stats.average_likes),
              text: formatSignedCompactDelta(
                Math.round(stats.average_likes) - Math.round(previousRun.profile_stats.average_likes),
              ),
            }
          : null,
    },
    {
      label: statsLabels.average_comments || "Avg Comments",
      value: formatCompactNumber(Math.round(stats.average_comments)),
      raw: Math.round(stats.average_comments).toLocaleString(),
      delta:
        typeof previousRun?.profile_stats?.average_comments === "number"
          ? {
              value: Math.round(stats.average_comments) - Math.round(previousRun.profile_stats.average_comments),
              text: formatSignedCompactDelta(
                Math.round(stats.average_comments) - Math.round(previousRun.profile_stats.average_comments),
              ),
            }
          : null,
    },
  ];
  const growthSummary = (() => {
    if (chartPoints.length < 2) return null;
    const latest = chartPoints[chartPoints.length - 1].followers;
    const earliest = chartPoints[0].followers;
    const net = latest - earliest;
    const pct = earliest > 0 ? ((net / earliest) * 100).toFixed(1) : "0";
    const thirtyDayAgo = chartPoints.length > 30 ? chartPoints[chartPoints.length - 31].followers : chartPoints[0].followers;
    const net30 = latest - thirtyDayAgo;
    return { net, pct, net30 };
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${PLATFORM_BADGE_TONES[platform]}`}>
          <span className="text-sm font-black text-white">{PLATFORM_BADGE_LABELS[platform]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {accountHref ? (
              <a
                href={accountHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-zinc-900 transition hover:text-indigo-600"
              >
                @{data.account_handle ?? data.username}
              </a>
            ) : (
              <p className="text-sm font-bold text-zinc-900">@{data.account_handle ?? data.username}</p>
            )}
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
              {platformLabel}
            </span>
            {socialbladeHref ? (
              <a
                href={socialbladeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-zinc-500 underline underline-offset-4 hover:text-zinc-900"
              >
                Open SocialBlade
              </a>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Last scraped {formatFullDate(data.scraped_at.split("T")[0])} · {formatRelativeAge(data.age_hours)}
          </p>
          {previousRunDateLabel ? (
            <p className="mt-1 text-xs text-zinc-500">Card deltas compare against the previous scrape on {previousRunDateLabel}.</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${freshnessChip.className}`}>
            {freshnessChip.label}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Re-scrape SocialBlade data. Historical totals older than one day are preserved."
          >
            <svg
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          {rankings.grade ? (
            <span className="rounded-lg bg-indigo-100 px-3 py-1.5 text-lg font-black text-indigo-700">{rankings.grade}</span>
          ) : null}
        </div>
      </div>

      {refreshError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <span className="font-semibold">Refresh failed:</span> {refreshError}
        </div>
      ) : null}
      {refreshNotice ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-800">{refreshNotice}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statsCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm" title={stat.raw}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">{stat.label}</p>
            <p className="mt-1 text-lg font-bold text-zinc-900">{stat.value}</p>
            {stat.delta ? (
              <p className={`mt-1 text-xs font-semibold ${stat.delta.value >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {stat.delta.text}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "SB Rank", value: rankings.sb_rank },
          { label: `${statsLabels.followers || "Followers"} Rank`, value: rankings.followers_rank },
          { label: `${statsLabels.engagement_rate || "Engagement"} Rank`, value: rankings.engagement_rate_rank },
        ].map((rank) => (
          <div
            key={rank.label}
            className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3"
          >
            <span className="text-xs font-semibold text-zinc-500">{rank.label}</span>
            <span className="text-sm font-bold text-zinc-800">{rank.value || "—"}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">{metricLabel} Growth</p>
            {chart ? (
              <p className="mt-0.5 text-sm text-zinc-500">
                {chart.date_range.from} — {chart.date_range.to}
                <span className="ml-2 text-zinc-400">({chart.total_data_points.toLocaleString()} days)</span>
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-zinc-500">
                No {metricLabel.toLowerCase()} chart is stored yet. A fresh scrape will start building history from the
                daily metrics table.
              </p>
            )}
          </div>
          {growthSummary ? (
            <div className="text-right">
              <p className={`text-sm font-bold ${growthSummary.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {growthSummary.net >= 0 ? "+" : ""}
                {formatCompactNumber(growthSummary.net)}
                <span className="ml-1 text-xs font-normal text-zinc-400">({growthSummary.pct}%)</span>
              </p>
              <p className="text-[10px] text-zinc-400">
                30d: {growthSummary.net30 >= 0 ? "+" : ""}
                {formatCompactNumber(growthSummary.net30)}
              </p>
            </div>
          ) : null}
        </div>
        <FollowerGrowthChart data={chartPoints} metricLabel={metricLabel} />
      </div>

      {metrics?.data.length ? (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Daily Channel Metrics</p>
            <p className="mt-0.5 text-sm text-zinc-500">
              {metrics.period} — {metrics.row_count} days
            </p>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50">
                <tr>
                  {metrics.headers.map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {metrics.data.map((row, i) => (
                  <tr key={`${row.Date ?? "row"}-${i}`} className="transition-colors hover:bg-zinc-50/50">
                    {metrics.headers.map((header) => (
                      <td key={header} className="px-4 py-2 text-xs tabular-nums text-zinc-700">
                        {row[header] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
