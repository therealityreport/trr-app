"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";

// ============================================================================
// Types
// ============================================================================

interface ProfileStats {
  followers: number;
  following: number;
  media_count: number;
  engagement_rate: string;
  average_likes: number;
  average_comments: number;
}

interface Rankings {
  sb_rank: string;
  followers_rank: string;
  engagement_rate_rank: string;
  grade: string;
}

interface DailyFollowerPoint {
  date: string;
  followers: number;
}

interface DailyChannelMetrics {
  period: string;
  row_count: number;
  headers: string[];
  data: Array<Record<string, string>>;
}

interface SocialGrowthData {
  username: string;
  platform: string;
  scraped_at: string;
  freshness_status?: "fresh" | "stale" | "missing" | "unknown";
  is_stale?: boolean;
  age_hours?: number | null;
  refresh_status?: "refreshed" | "skipped";
  refresh_skipped_reason?: string;
  profile_stats: ProfileStats;
  rankings: Rankings;
  daily_channel_metrics_60day: DailyChannelMetrics;
  daily_total_followers_chart: {
    frequency: string;
    metric: string;
    total_data_points: number;
    date_range: { from: string; to: string };
    data: DailyFollowerPoint[];
  };
}

interface SocialGrowthSectionProps {
  personId: string;
  instagramHandle: string | null;
}

// ============================================================================
// Chart Helpers
// ============================================================================

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeAge(ageHours: number | null | undefined): string {
  if (typeof ageHours !== "number" || !Number.isFinite(ageHours)) return "unknown age";
  if (ageHours < 1) return `${Math.max(1, Math.round(ageHours * 60))}m ago`;
  if (ageHours < 48) return `${ageHours.toFixed(ageHours >= 10 ? 0 : 1)}h ago`;
  return `${Math.round(ageHours / 24)}d ago`;
}

function getFreshnessChip(data: SocialGrowthData | null): { label: string; className: string } {
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

// ============================================================================
// SVG Follower Growth Chart
// ============================================================================

function FollowerGrowthChart({ data }: { data: DailyFollowerPoint[] }) {
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
      const x = padding.left + (i / (data.length - 1)) * plotWidth;
      const y = padding.top + plotHeight - ((d.followers - bufferMin) / (bufferMax - bufferMin)) * plotHeight;
      return `${x},${y}`;
    });

    // Y-axis ticks
    const yTickCount = 5;
    const yTickValues: number[] = [];
    for (let i = 0; i <= yTickCount; i++) {
      yTickValues.push(bufferMin + (i / yTickCount) * (bufferMax - bufferMin));
    }

    // X-axis ticks — monthly labels
    const xTickEntries: { x: number; label: string }[] = [];
    const seenMonths = new Set<string>();
    const step = Math.max(1, Math.floor(data.length / 12));
    for (let i = 0; i < data.length; i += step) {
      const label = formatDate(data[i].date);
      if (!seenMonths.has(label)) {
        seenMonths.add(label);
        const x = padding.left + (i / (data.length - 1)) * plotWidth;
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
    const x = padding.left + (hoverIndex / (data.length - 1)) * plotWidth;
    const y = padding.top + plotHeight - ((d.followers - minY) / range) * plotHeight;
    return { x, y, date: d.date, followers: d.followers };
  }, [hoverIndex, data, chartDimensions, minY, maxY]);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-400">
        No follower history data available
      </div>
    );
  }

  const { width, height, padding } = chartDimensions;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Build area fill path
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
          const idx = Math.round(
            ((svgX - padding.left) / plotWidth) * (data.length - 1)
          );
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

        {/* Grid lines */}
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

        {/* Y-axis labels */}
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

        {/* X-axis labels */}
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

        {/* Area fill */}
        <path d={areaPath} fill="url(#follower-gradient)" />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Hover crosshair */}
        {hoverPoint && (
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
        )}
      </svg>

      {/* Tooltip */}
      {hoverPoint && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: `${(hoverPoint.x / width) * 100}%`,
            top: `${((hoverPoint.y - 50) / height) * 100}%`,
          }}
        >
          <p className="text-[11px] font-semibold text-zinc-500">{formatFullDate(hoverPoint.date)}</p>
          <p className="text-sm font-bold text-indigo-600">{hoverPoint.followers.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export default function SocialGrowthSection({ personId, instagramHandle }: SocialGrowthSectionProps) {
  const [data, setData] = useState<SocialGrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!instagramHandle) {
      setLoading(false);
      return;
    }
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminWithAuth(
        `/api/admin/trr-api/people/${personId}/social-growth?handle=${encodeURIComponent(instagramHandle)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json: SocialGrowthData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [personId, instagramHandle]);

  const handleRefresh = useCallback(async () => {
    if (!instagramHandle || refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    setRefreshNotice(null);
    try {
      const res = await fetchAdminWithAuth(
        `/api/admin/trr-api/people/${personId}/social-growth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: instagramHandle }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || `Refresh failed (${res.status})`);
      }
      const json: SocialGrowthData = await res.json();
      setData(json);
      setError(null);
      setRefreshNotice(
        json.refresh_status === "skipped"
          ? "Using the latest stored SocialBlade snapshot because it is still within the freshness window."
          : "SocialBlade data refreshed."
      );
      await fetchData({ silent: true });
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [fetchData, personId, instagramHandle, refreshing]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!instagramHandle) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center">
        <p className="text-sm font-semibold text-zinc-600">No Instagram account linked</p>
        <p className="mt-1 text-xs text-zinc-500">
          Assign an Instagram handle to this person to view social growth data.
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
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
        {refreshError && (
          <p className="mt-2 text-xs text-amber-700">{refreshError}</p>
        )}
      </div>
    );
  }

  if (!data) return null;

  const { profile_stats: stats, rankings, daily_total_followers_chart: chart, daily_channel_metrics_60day: metrics } = data;
  const freshnessChip = getFreshnessChip(data);

  // Compute growth summary from chart data
  const growthSummary = (() => {
    const pts = chart.data;
    if (pts.length < 2) return null;
    const latest = pts[pts.length - 1].followers;
    const earliest = pts[0].followers;
    const net = latest - earliest;
    const pct = earliest > 0 ? ((net / earliest) * 100).toFixed(1) : "0";
    // 30-day
    const thirtyDayAgo = pts.length > 30 ? pts[pts.length - 31].followers : pts[0].followers;
    const net30 = latest - thirtyDayAgo;
    return { net, pct, net30, totalDays: pts.length, earliest, latest };
  })();

  return (
    <div className="space-y-6">
      {/* Account Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400">
          <span className="text-sm font-black text-white">IG</span>
        </div>
        <div>
          <a
            href={`https://instagram.com/${data.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-zinc-900 hover:text-indigo-600 transition"
          >
            @{data.username}
          </a>
          <p className="text-xs text-zinc-500">
            Last scraped {formatFullDate(data.scraped_at.split("T")[0])} · {formatRelativeAge(data.age_hours)}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${freshnessChip.className}`}
          >
            {freshnessChip.label}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Re-scrape SocialBlade data. Historical follower counts (>1 day old) are preserved."
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
          {rankings.grade && (
            <span className="rounded-lg bg-indigo-100 px-3 py-1.5 text-lg font-black text-indigo-700">
              {rankings.grade}
            </span>
          )}
        </div>
      </div>
      {refreshError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <span className="font-semibold">Refresh failed:</span> {refreshError}
        </div>
      )}
      {refreshNotice && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-800">
          {refreshNotice}
        </div>
      )}

      {/* Profile Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Followers", value: formatCompactNumber(stats.followers), raw: stats.followers.toLocaleString() },
          { label: "Following", value: formatCompactNumber(stats.following), raw: stats.following.toLocaleString() },
          { label: "Posts", value: formatCompactNumber(stats.media_count), raw: stats.media_count.toLocaleString() },
          { label: "Engagement", value: stats.engagement_rate, raw: stats.engagement_rate },
          { label: "Avg Likes", value: formatCompactNumber(Math.round(stats.average_likes)), raw: Math.round(stats.average_likes).toLocaleString() },
          { label: "Avg Comments", value: formatCompactNumber(Math.round(stats.average_comments)), raw: Math.round(stats.average_comments).toLocaleString() },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            title={stat.raw}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
              {stat.label}
            </p>
            <p className="mt-1 text-lg font-bold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Rankings */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "SB Rank", value: rankings.sb_rank },
          { label: "Followers Rank", value: rankings.followers_rank },
          { label: "Engagement Rate Rank", value: rankings.engagement_rate_rank },
        ].map((rank) => (
          <div
            key={rank.label}
            className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3"
          >
            <span className="text-xs font-semibold text-zinc-500">{rank.label}</span>
            <span className="text-sm font-bold text-zinc-800">{rank.value}</span>
          </div>
        ))}
      </div>

      {/* Follower Growth Chart */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Follower Growth
            </p>
            <p className="mt-0.5 text-sm text-zinc-500">
              {chart.date_range.from} — {chart.date_range.to}
              <span className="ml-2 text-zinc-400">
                ({chart.total_data_points.toLocaleString()} days)
              </span>
            </p>
          </div>
          {growthSummary && (
            <div className="text-right">
              <p className={`text-sm font-bold ${growthSummary.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {growthSummary.net >= 0 ? "+" : ""}{formatCompactNumber(growthSummary.net)}
                <span className="ml-1 text-xs font-normal text-zinc-400">
                  ({growthSummary.pct}%)
                </span>
              </p>
              <p className="text-[10px] text-zinc-400">
                30d: {growthSummary.net30 >= 0 ? "+" : ""}{formatCompactNumber(growthSummary.net30)}
              </p>
            </div>
          )}
        </div>
        <FollowerGrowthChart data={chart.data} />
      </div>

      {/* 60-Day Daily Channel Metrics Table */}
      {metrics && metrics.data.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
              Daily Channel Metrics
            </p>
            <p className="mt-0.5 text-sm text-zinc-500">
              {metrics.period} — {metrics.row_count} days
            </p>
          </div>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-200">
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
                  <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                    {metrics.headers.map((header) => (
                      <td key={header} className="px-4 py-2 text-xs text-zinc-700 tabular-nums">
                        {row[header] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
