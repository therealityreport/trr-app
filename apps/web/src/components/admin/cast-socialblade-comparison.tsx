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

interface SocialGrowthData {
  username: string;
  platform: string;
  scraped_at: string;
  freshness_status?: "fresh" | "stale" | "missing" | "unknown";
  profile_stats: ProfileStats;
  rankings: Rankings;
  daily_total_followers_chart: {
    frequency: string;
    metric: string;
    total_data_points: number;
    date_range: { from: string; to: string };
    data: DailyFollowerPoint[];
  } | null;
}

interface CastMember {
  person_id: string;
  person_name: string | null;
  display_name: string | null;
  instagram_handle: string | null;
}

interface CastEntry {
  name: string;
  handle: string;
  personId: string;
  color: string;
  data: SocialGrowthData | null;
  error: string | null;
  loading: boolean;
  status: "loading" | "missing" | "fresh" | "stale" | "refreshing" | "failed";
}

interface CastSocialBladeComparisonProps {
  castMembers: CastMember[];
}

// ============================================================================
// Constants
// ============================================================================

const CAST_COLORS = [
  "#4f46e5", // indigo-600
  "#e11d48", // rose-600
  "#059669", // emerald-600
  "#d97706", // amber-600
  "#0891b2", // cyan-600
  "#9333ea", // purple-600
  "#ea580c", // orange-600
  "#0d9488", // teal-600
  "#be185d", // pink-700
  "#4338ca", // indigo-700
];

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10;

// ============================================================================
// Chart Helpers
// ============================================================================

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString();
}

function parseEngagementRate(rate: string): number {
  return parseFloat(rate.replace(/[^0-9.]/g, "")) || 0;
}

function parseRankNumber(rank: string): number {
  return parseInt(rank.replace(/[^0-9]/g, ""), 10) || 0;
}

// ============================================================================
// Horizontal Bar Chart
// ============================================================================

function HorizontalBarChart({
  entries,
  getValue,
  formatValue,
  label,
}: {
  entries: CastEntry[];
  getValue: (d: SocialGrowthData) => number;
  formatValue: (n: number) => string;
  label: string;
}) {
  const items = entries
    .filter((e) => e.data)
    .map((e) => ({ name: e.name, color: e.color, value: getValue(e.data!) }))
    .sort((a, b) => b.value - a.value);

  const max = Math.max(...items.map((i) => i.value), 1);
  const barHeight = 28;
  const nameWidth = 120;
  const valueWidth = 70;
  const gap = 6;
  const chartLeft = nameWidth + 8;
  const chartRight = valueWidth + 8;
  const totalWidth = 700;
  const barAreaWidth = totalWidth - chartLeft - chartRight;
  const totalHeight = items.length * (barHeight + gap) + 8;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </p>
      <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {items.map((item, i) => {
          const y = i * (barHeight + gap) + 4;
          const width = max > 0 ? (item.value / max) * barAreaWidth : 0;
          return (
            <g key={item.name}>
              {/* Name */}
              <text
                x={nameWidth}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                fontSize="11"
                fontWeight="600"
                fill="#3f3f46"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {item.name.length > 16 ? item.name.slice(0, 14) + "..." : item.name}
              </text>
              {/* Bar background */}
              <rect
                x={chartLeft}
                y={y}
                width={barAreaWidth}
                height={barHeight}
                rx="4"
                fill="#f4f4f5"
              />
              {/* Bar fill */}
              <rect
                x={chartLeft}
                y={y}
                width={Math.max(width, 2)}
                height={barHeight}
                rx="4"
                fill={item.color}
                opacity="0.85"
              >
                <animate
                  attributeName="width"
                  from="0"
                  to={Math.max(width, 2)}
                  dur="0.6s"
                  fill="freeze"
                  calcMode="spline"
                  keySplines="0.25 0.1 0.25 1"
                />
              </rect>
              {/* Value */}
              <text
                x={chartLeft + barAreaWidth + 8}
                y={y + barHeight / 2 + 4}
                fontSize="11"
                fontWeight="700"
                fill="#18181b"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {formatValue(item.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================================
// Growth Overlay Chart
// ============================================================================

function GrowthOverlayChart({ entries }: { entries: CastEntry[] }) {
  const [hoverInfo, setHoverInfo] = useState<{
    dateLabel: string;
    values: { name: string; color: string; followers: number }[];
    svgX: number;
  } | null>(null);

  const seriesWithData = entries.filter(
    (e) => e.data?.daily_total_followers_chart && e.data.daily_total_followers_chart.data.length > 10
  );

  const chartConfig = useMemo(() => {
    if (seriesWithData.length === 0) return null;

    const width = 800;
    const height = 300;
    const pad = { top: 20, right: 20, bottom: 36, left: 65 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    // Find common date range (last 365 days to keep it manageable)
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const cutoff = oneYearAgo.toISOString().slice(0, 10);

    // Build date index
    const allDates = new Set<string>();
    for (const entry of seriesWithData) {
      for (const pt of entry.data!.daily_total_followers_chart!.data) {
        if (pt.date >= cutoff) allDates.add(pt.date);
      }
    }
    const dateArray = [...allDates].sort();
    if (dateArray.length === 0) return null;

    // Normalize each series to the common date array
    let globalMin = Infinity;
    let globalMax = -Infinity;
    const seriesData = seriesWithData.map((entry) => {
      const dataMap = new Map<string, number>();
      for (const pt of entry.data!.daily_total_followers_chart!.data) {
        dataMap.set(pt.date, pt.followers);
      }
      const values: (number | null)[] = dateArray.map((d) => dataMap.get(d) ?? null);
      for (const v of values) {
        if (v !== null) {
          if (v < globalMin) globalMin = v;
          if (v > globalMax) globalMax = v;
        }
      }
      return { entry, values };
    });

    const range = globalMax - globalMin || 1;
    const bufMin = globalMin - range * 0.05;
    const bufMax = globalMax + range * 0.05;
    const yRange = bufMax - bufMin;

    // Build polyline points for each series
    const lines = seriesData.map(({ entry, values }) => {
      const segments: string[] = [];
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (v === null) continue;
        const x = pad.left + (i / (dateArray.length - 1)) * plotW;
        const y = pad.top + plotH - ((v - bufMin) / yRange) * plotH;
        segments.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      return { color: entry.color, name: entry.name, points: segments.join(" "), values };
    });

    // Y ticks
    const yTicks: { y: number; label: string }[] = [];
    for (let i = 0; i <= 4; i++) {
      const val = bufMin + (i / 4) * yRange;
      yTicks.push({
        y: pad.top + plotH - ((val - bufMin) / yRange) * plotH,
        label: formatCompact(Math.round(val)),
      });
    }

    // X ticks (monthly)
    const xTicks: { x: number; label: string }[] = [];
    const seenMonths = new Set<string>();
    const step = Math.max(1, Math.floor(dateArray.length / 10));
    for (let i = 0; i < dateArray.length; i += step) {
      const d = new Date(dateArray[i] + "T00:00:00");
      const key = `${d.getMonth()}-${d.getFullYear()}`;
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        xTicks.push({
          x: pad.left + (i / (dateArray.length - 1)) * plotW,
          label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        });
      }
    }

    return { width, height, pad, plotW, plotH, lines, yTicks, xTicks, dateArray, seriesData };
  }, [seriesWithData]);

  if (seriesWithData.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-zinc-500">No follower history data available for comparison</p>
      </div>
    );
  }

  if (!chartConfig) return null;

  const { width, height, pad, plotW, plotH, lines, yTicks, xTicks, dateArray, seriesData } = chartConfig;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          Follower Growth — Last 12 Months
        </p>
        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {lines.map((line) => (
            <div key={line.name} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: line.color }}
              />
              <span className="text-[10px] font-semibold text-zinc-500">{line.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={(e) => {
            const svg = e.currentTarget;
            const rect = svg.getBoundingClientRect();
            const scaleX = width / rect.width;
            const svgX = (e.clientX - rect.left) * scaleX;
            const idx = Math.round(((svgX - pad.left) / plotW) * (dateArray.length - 1));
            if (idx >= 0 && idx < dateArray.length) {
              const date = dateArray[idx];
              const d = new Date(date + "T00:00:00");
              const dateLabel = d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const values = seriesData
                .map(({ entry, values: vals }) => ({
                  name: entry.name,
                  color: entry.color,
                  followers: vals[idx] ?? 0,
                }))
                .filter((v) => v.followers > 0)
                .sort((a, b) => b.followers - a.followers);
              setHoverInfo({ dateLabel, values, svgX: pad.left + (idx / (dateArray.length - 1)) * plotW });
            }
          }}
          onMouseLeave={() => setHoverInfo(null)}
        >
          {/* Grid */}
          {yTicks.map((tick, i) => (
            <line
              key={`g-${i}`}
              x1={pad.left}
              y1={tick.y}
              x2={pad.left + plotW}
              y2={tick.y}
              stroke="#e4e4e7"
              strokeWidth="0.5"
              strokeDasharray="4,4"
            />
          ))}
          {/* Y labels */}
          {yTicks.map((tick, i) => (
            <text
              key={`yl-${i}`}
              x={pad.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#a1a1aa"
              fontFamily="system-ui"
            >
              {tick.label}
            </text>
          ))}
          {/* X labels */}
          {xTicks.map((tick, i) => (
            <text
              key={`xl-${i}`}
              x={tick.x}
              y={height - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#a1a1aa"
              fontFamily="system-ui"
            >
              {tick.label}
            </text>
          ))}
          {/* Lines */}
          {lines.map((line) => (
            <polyline
              key={line.name}
              points={line.points}
              fill="none"
              stroke={line.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.85"
            />
          ))}
          {/* Hover crosshair */}
          {hoverInfo && (
            <line
              x1={hoverInfo.svgX}
              y1={pad.top}
              x2={hoverInfo.svgX}
              y2={pad.top + plotH}
              stroke="#71717a"
              strokeWidth="0.75"
              strokeDasharray="3,3"
              opacity="0.5"
            />
          )}
        </svg>

        {/* Tooltip */}
        {hoverInfo && hoverInfo.values.length > 0 && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm"
            style={{
              left: `${(hoverInfo.svgX / width) * 100}%`,
              transform: hoverInfo.svgX > width / 2 ? "translateX(-110%)" : "translateX(10%)",
            }}
          >
            <p className="mb-1 text-[10px] font-bold text-zinc-400">{hoverInfo.dateLabel}</p>
            {hoverInfo.values.map((v) => (
              <div key={v.name} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: v.color }}
                />
                <span className="text-[10px] font-semibold text-zinc-600">{v.name}</span>
                <span className="ml-auto pl-3 text-[10px] font-bold tabular-nums text-zinc-900">
                  {v.followers.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Stats Comparison Table
// ============================================================================

function StatsComparisonTable({ entries }: { entries: CastEntry[] }) {
  const [sortKey, setSortKey] = useState<string>("followers");
  const [sortAsc, setSortAsc] = useState(false);

  const columns: { key: string; label: string; getValue: (d: SocialGrowthData) => number; format: (n: number) => string; lowerIsBetter?: boolean }[] = [
    { key: "followers", label: "Followers", getValue: (d) => d.profile_stats.followers, format: formatCompact },
    { key: "engagement", label: "Eng. Rate", getValue: (d) => parseEngagementRate(d.profile_stats.engagement_rate), format: (n) => `${n.toFixed(2)}%` },
    { key: "avg_likes", label: "Avg Likes", getValue: (d) => d.profile_stats.average_likes, format: (n) => formatCompact(Math.round(n)) },
    { key: "avg_comments", label: "Avg Comments", getValue: (d) => d.profile_stats.average_comments, format: (n) => formatCompact(Math.round(n)) },
    { key: "posts", label: "Posts", getValue: (d) => d.profile_stats.media_count, format: formatCompact },
    { key: "sb_rank", label: "SB Rank", getValue: (d) => parseRankNumber(d.rankings.sb_rank), format: (n) => n > 0 ? `#${n.toLocaleString()}` : "—", lowerIsBetter: true },
  ];

  const rows = entries
    .filter((e) => e.data)
    .map((e) => ({ ...e, data: e.data! }));

  const activeCol = columns.find((c) => c.key === sortKey) ?? columns[0];
  const sorted = [...rows].sort((a, b) => {
    const av = activeCol.getValue(a.data);
    const bv = activeCol.getValue(b.data);
    return sortAsc ? av - bv : bv - av;
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      const col = columns.find((c) => c.key === key);
      setSortAsc(col?.lowerIsBetter ?? false);
    }
  };

  // Find max for each column to highlight leaders
  const maxByCol = new Map<string, number>();
  for (const col of columns) {
    const values = rows.map((r) => col.getValue(r.data));
    if (col.lowerIsBetter) {
      const positiveValues = values.filter((v) => v > 0);
      maxByCol.set(col.key, positiveValues.length > 0 ? Math.min(...positiveValues) : 0);
    } else {
      maxByCol.set(col.key, Math.max(...values, 0));
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          Stats Comparison
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                Cast Member
              </th>
              <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                Grade
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer select-none px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 transition hover:text-zinc-600"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <svg
                        className={`h-3 w-3 ${sortAsc ? "" : "rotate-180"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {sorted.map((row) => (
              <tr key={row.personId} className="transition hover:bg-zinc-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="text-xs font-bold text-zinc-800">{row.name}</span>
                    <span className="text-[10px] text-zinc-400">@{row.handle}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className="inline-block rounded px-2 py-0.5 text-[11px] font-black"
                    style={{
                      backgroundColor: gradeColor(row.data.rankings.grade).bg,
                      color: gradeColor(row.data.rankings.grade).text,
                    }}
                  >
                    {row.data.rankings.grade || "—"}
                  </span>
                </td>
                {columns.map((col) => {
                  const val = col.getValue(row.data);
                  const best = maxByCol.get(col.key) ?? 0;
                  const isLeader =
                    val > 0 && (col.lowerIsBetter ? val === best && val > 0 : val === best);
                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-3 text-right text-xs tabular-nums ${isLeader ? "font-black text-zinc-900" : "font-medium text-zinc-600"}`}
                    >
                      {val > 0 ? col.format(val) : "—"}
                      {isLeader && rows.length > 1 && (
                        <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function gradeColor(grade: string): { bg: string; text: string } {
  const g = grade.replace(/[+-]/, "");
  if (g === "A") return { bg: "#dcfce7", text: "#166534" };
  if (g === "B") return { bg: "#dbeafe", text: "#1e40af" };
  if (g === "C") return { bg: "#fef9c3", text: "#854d0e" };
  if (g === "D") return { bg: "#fed7aa", text: "#9a3412" };
  if (g === "F") return { bg: "#fecaca", text: "#991b1b" };
  return { bg: "#f4f4f5", text: "#3f3f46" };
}

function entryKey(personId: string, handle: string): string {
  return `${personId}:${handle.toLowerCase()}`;
}

function deriveEntryStatus(data: SocialGrowthData | null, error: string | null): CastEntry["status"] {
  if (error) return "failed";
  if (!data) return "missing";
  return data.freshness_status === "stale" ? "stale" : "fresh";
}

function statusChipClass(status: CastEntry["status"]): string {
  switch (status) {
    case "fresh":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "stale":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "refreshing":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";
    case "missing":
      return "border-zinc-200 bg-zinc-100 text-zinc-600";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-500";
  }
}

function formatScrapedAtLabel(data: SocialGrowthData | null): string {
  if (!data?.scraped_at) return "No scrape yet";
  const date = new Date(data.scraped_at);
  return Number.isNaN(date.getTime())
    ? "Unknown scrape time"
    : `Last scraped ${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
}

// ============================================================================
// Main Component
// ============================================================================

export default function CastSocialBladeComparison({ castMembers }: CastSocialBladeComparisonProps) {
  const membersWithIG = useMemo(
    () => castMembers.filter((m) => m.instagram_handle),
    [castMembers]
  );

  const [entries, setEntries] = useState<CastEntry[]>([]);
  const [batchRefreshing, setBatchRefreshing] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [pendingRefreshKeys, setPendingRefreshKeys] = useState<string[]>([]);
  const [pollAttempt, setPollAttempt] = useState(0);

  const buildEntries = useCallback(
    () =>
      membersWithIG.map((m, i) => ({
        name: m.display_name || m.person_name || "Unknown",
        handle: m.instagram_handle!,
        personId: m.person_id,
        color: CAST_COLORS[i % CAST_COLORS.length],
        data: null,
        error: null,
        loading: true,
        status: "loading" as const,
      })),
    [membersWithIG]
  );

  const loadMembers = useCallback(async (targetMembers: CastMember[]) => {
    return Promise.all(
      targetMembers.map(async (member) => {
        const key = entryKey(member.person_id, member.instagram_handle!);
        try {
          const res = await fetchAdminWithAuth(
            `/api/admin/trr-api/people/${member.person_id}/social-growth?handle=${encodeURIComponent(member.instagram_handle!)}`
          );
          const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          if (!res.ok) {
            return {
              key,
              data: null,
              error:
                res.status === 404
                  ? "No SocialBlade data yet"
                  : typeof body.error === "string"
                    ? body.error
                    : `HTTP ${res.status}`,
              notFound: res.status === 404,
            };
          }
          return { key, data: body as SocialGrowthData, error: null, notFound: false };
        } catch (err) {
          return {
            key,
            data: null,
            error: err instanceof Error ? err.message : "Failed",
            notFound: false,
          };
        }
      })
    );
  }, []);

  const fetchAll = useCallback(async () => {
    const targetMembers = membersWithIG;
    const targetKeys = new Set(
      targetMembers.map((member) => entryKey(member.person_id, member.instagram_handle!))
    );
    setEntries((prev) =>
      prev.map((entry) =>
        targetKeys.has(entryKey(entry.personId, entry.handle))
          ? { ...entry, loading: true, error: null, status: "loading" }
          : entry
      )
    );

    const results = await loadMembers(targetMembers);
    const resultMap = new Map(results.map((result) => [result.key, result]));
    setEntries((prev) =>
      prev.map((entry) => {
        const result = resultMap.get(entryKey(entry.personId, entry.handle));
        if (!result) return { ...entry, loading: false };
        return {
          ...entry,
          data: result.data,
          error: result.notFound ? null : result.error,
          loading: false,
          status: deriveEntryStatus(result.data, result.notFound ? null : result.error),
        };
      })
    );
  }, [loadMembers, membersWithIG]);

  const pollPendingRefreshes = useCallback(async (currentPendingKeys: string[]) => {
    const pendingSet = new Set(currentPendingKeys);
    const targetMembers = membersWithIG.filter((member) =>
      pendingSet.has(entryKey(member.person_id, member.instagram_handle!))
    );
    if (targetMembers.length === 0) return [];

    const results = await loadMembers(targetMembers);
    const resultMap = new Map(results.map((result) => [result.key, result]));
    const nextPending = new Set<string>();

    setEntries((prev) =>
      prev.map((entry) => {
        const key = entryKey(entry.personId, entry.handle);
        const result = resultMap.get(key);
        if (!result) return entry;
        if (result.data) {
          const nextStatus = deriveEntryStatus(result.data, null);
          if (pendingSet.has(key) && nextStatus !== "fresh") {
            nextPending.add(key);
            return {
              ...entry,
              data: result.data,
              error: null,
              loading: false,
              status: "refreshing",
            };
          }
          return {
            ...entry,
            data: result.data,
            error: null,
            loading: false,
            status: nextStatus,
          };
        }
        if (pendingSet.has(key)) {
          nextPending.add(key);
          return {
            ...entry,
            error: null,
            loading: false,
            status: "refreshing",
          };
        }
        return entry;
      })
    );

    return [...nextPending];
  }, [loadMembers, membersWithIG]);

  const triggerBatchRefresh = useCallback(async (targetEntries: CastEntry[], force = false) => {
    if (targetEntries.length === 0 || batchRefreshing) return;
    const targetKeySet = new Set(targetEntries.map((entry) => entryKey(entry.personId, entry.handle)));
    setBatchRefreshing(true);
    setBatchError(null);
    setPollAttempt(0);
    setEntries((prev) =>
      prev.map((entry) =>
        targetKeySet.has(entryKey(entry.personId, entry.handle))
          ? { ...entry, status: "refreshing", error: null, loading: false }
          : entry
      )
    );

    try {
      const response = await fetchAdminWithAuth("/api/admin/trr-api/social-growth/refresh-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "cast_comparison",
          force,
          items: targetEntries.map((entry) => ({
            personId: entry.personId,
            handle: entry.handle,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : `HTTP ${response.status}`);
      }

      const acceptedKeys = new Set<string>(
        Array.isArray(payload.accepted)
          ? payload.accepted.map((item: { personId: string; handle: string }) => entryKey(item.personId, item.handle))
          : []
      );
      const skippedMap = new Map<string, { reason?: string }>(
        Array.isArray(payload.skipped)
          ? payload.skipped.map((item: { personId: string; handle: string; reason?: string }) => [
              entryKey(item.personId, item.handle),
              item,
            ])
          : []
      );
      const errorMap = new Map<string, { reason?: string }>(
        Array.isArray(payload.errors)
          ? payload.errors.map((item: { personId: string; handle: string; reason?: string }) => [
              entryKey(item.personId, item.handle),
              item,
            ])
          : []
      );

      setEntries((prev) =>
        prev.map((entry) => {
          const key = entryKey(entry.personId, entry.handle);
          if (acceptedKeys.has(key)) {
            return { ...entry, status: "refreshing", error: null };
          }
          if (skippedMap.has(key)) {
            return {
              ...entry,
              status: entry.data ? deriveEntryStatus(entry.data, null) : "missing",
              error: null,
            };
          }
          if (errorMap.has(key)) {
            return {
              ...entry,
              status: "failed",
              error: errorMap.get(key)?.reason ?? "Refresh failed",
            };
          }
          return entry;
        })
      );
      setPendingRefreshKeys([...acceptedKeys]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refresh failed";
      setBatchError(message);
      setEntries((prev) =>
        prev.map((entry) =>
          targetKeySet.has(entryKey(entry.personId, entry.handle))
            ? { ...entry, status: "failed", error: message }
            : entry
        )
      );
    } finally {
      setBatchRefreshing(false);
    }
  }, [batchRefreshing]);

  useEffect(() => {
    setEntries(buildEntries());
    setPendingRefreshKeys([]);
    setPollAttempt(0);
    setBatchError(null);
  }, [buildEntries]);

  useEffect(() => {
    if (membersWithIG.length > 0) fetchAll();
  }, [fetchAll, membersWithIG.length]);

  useEffect(() => {
    if (pendingRefreshKeys.length === 0) return;
    if (pollAttempt >= MAX_POLL_ATTEMPTS) {
      const pendingSet = new Set(pendingRefreshKeys);
      setEntries((prev) =>
        prev.map((entry) =>
          pendingSet.has(entryKey(entry.personId, entry.handle))
            ? {
                ...entry,
                status: "failed",
                error: "Timed out waiting for refreshed SocialBlade data",
              }
            : entry
        )
      );
      setPendingRefreshKeys([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      const nextPending = await pollPendingRefreshes(pendingRefreshKeys);
      setPendingRefreshKeys(nextPending);
      setPollAttempt((current) => current + 1);
    }, POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [pendingRefreshKeys, pollAttempt, pollPendingRefreshes]);

  const loadedEntries = entries.filter((e) => e.data);
  const allLoading = entries.every((e) => e.loading);
  const someLoading = entries.some((e) => e.loading);
  const failedEntries = entries.filter((entry) => entry.status === "failed");
  const refreshableEntries = entries.filter(
    (entry) => entry.status === "missing" || entry.status === "stale" || entry.status === "failed"
  );

  if (membersWithIG.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center">
        <p className="text-sm font-semibold text-zinc-600">No cast members with Instagram accounts</p>
      </div>
    );
  }

  if (allLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="h-3 w-40 animate-pulse rounded bg-zinc-200" />
            <div className="mt-4 h-48 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    );
  }

  if (loadedEntries.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center">
        <p className="text-sm font-semibold text-zinc-600">No SocialBlade data available</p>
        <p className="mt-1 text-xs text-zinc-500">
          Refresh SocialBlade here to backfill missing cast rows without visiting each person page.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => void triggerBatchRefresh(refreshableEntries.length > 0 ? refreshableEntries : entries)}
            disabled={batchRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {batchRefreshing ? "Refreshing SocialBlade..." : "Refresh SocialBlade"}
          </button>
          {failedEntries.length > 0 && (
            <button
              onClick={() => void triggerBatchRefresh(failedEntries, true)}
              disabled={batchRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retry Failed
            </button>
          )}
        </div>
        {batchError && (
          <p className="mt-3 text-xs text-red-600">{batchError}</p>
        )}
        <div className="mt-4 space-y-1">
          {entries.map((e) => (
            <div key={e.personId} className="flex items-center justify-center gap-2 text-xs text-zinc-400">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: e.color }}
              />
              <span>@{e.handle}</span>
              <span className={`rounded-full border px-2 py-0.5 font-semibold ${statusChipClass(e.status)}`}>
                {e.status}
              </span>
              <span>{e.error || formatScrapedAtLabel(e.data)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            SocialBlade Comparison
            <span className="ml-2 font-normal normal-case tracking-normal text-zinc-400">
              {loadedEntries.length} of {entries.length} members
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void triggerBatchRefresh(refreshableEntries.length > 0 ? refreshableEntries : entries)}
              disabled={batchRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {batchRefreshing ? "Refreshing..." : "Refresh SocialBlade"}
            </button>
            {failedEntries.length > 0 && (
              <button
                onClick={() => void triggerBatchRefresh(failedEntries, true)}
                disabled={batchRefreshing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Retry Failed
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {entries.map((entry) => (
            <div
              key={entry.personId}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] text-zinc-600"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-semibold">@{entry.handle}</span>
              <span className={`rounded-full border px-2 py-0.5 font-semibold ${statusChipClass(entry.status)}`}>
                {entry.status}
              </span>
              <span>{entry.error || formatScrapedAtLabel(entry.data)}</span>
            </div>
          ))}
        </div>
        {someLoading && (
          <span className="text-[10px] text-zinc-400 animate-pulse">Loading remaining...</span>
        )}
        {batchError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {batchError}
          </div>
        )}
      </div>

      {/* Follower Count Leaderboard */}
      <HorizontalBarChart
        entries={loadedEntries}
        getValue={(d) => d.profile_stats.followers}
        formatValue={formatCompact}
        label="Follower Count"
      />

      {/* Engagement Rate Comparison */}
      <HorizontalBarChart
        entries={loadedEntries}
        getValue={(d) => parseEngagementRate(d.profile_stats.engagement_rate)}
        formatValue={(n) => `${n.toFixed(2)}%`}
        label="Engagement Rate"
      />

      {/* Average Likes Comparison */}
      <HorizontalBarChart
        entries={loadedEntries}
        getValue={(d) => d.profile_stats.average_likes}
        formatValue={(n) => formatCompact(Math.round(n))}
        label="Average Likes"
      />

      {/* Growth Overlay Chart */}
      <GrowthOverlayChart entries={loadedEntries} />

      {/* Stats Table */}
      <StatsComparisonTable entries={loadedEntries} />
    </div>
  );
}
