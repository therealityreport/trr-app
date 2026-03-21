"use client";

import { useMemo } from "react";
import type {
  SocialAccountProfileHashtagTimeline,
  SocialAccountProfileHashtagTimelinePoint,
  SocialAccountProfileHashtagTimelineSeries,
} from "@/lib/admin/social-account-profile";
import { FONT_FAMILY, PALETTE } from "@/lib/design-system/tokens";

type Props = {
  timeline: SocialAccountProfileHashtagTimeline | null;
  loading?: boolean;
  error?: string | null;
};

const COLOR_SWATCHES = [
  PALETTE.deepCrimson,
  PALETTE.magenta,
  PALETTE.red,
  PALETTE.vermillion,
  PALETTE.amber,
  PALETTE.tangerine,
  PALETTE.sienna,
  PALETTE.gold,
  PALETTE.butterscotch,
  PALETTE.ochre,
  PALETTE.walnut,
  PALETTE.olive,
  PALETTE.fern,
  PALETTE.forest,
  PALETTE.teal,
  PALETTE.lime,
  PALETTE.slate,
  PALETTE.petrol,
  PALETTE.cobalt,
  PALETTE.navy,
  PALETTE.royal,
  PALETTE.indigo,
  PALETTE.sapphire,
  PALETTE.lavender,
  PALETTE.plum,
  PALETTE.eggplant,
  PALETTE.rose,
  PALETTE.orchid,
  PALETTE.aubergine,
  PALETTE.wine,
  PALETTE.mauve,
  PALETTE.carnation,
  PALETTE.graphite,
  PALETTE.espresso,
  PALETTE.charcoal,
  PALETTE.mahogany,
] as const;

const buildSeriesColorMap = (series: SocialAccountProfileHashtagTimelineSeries[]): Map<string, string> => {
  const uniqueHashtags = Array.from(new Set(series.map((item) => item.hashtag))).sort((left, right) => left.localeCompare(right));
  return new Map(
    uniqueHashtags.map((hashtag, index) => [hashtag, COLOR_SWATCHES[index] ?? COLOR_SWATCHES[index % COLOR_SWATCHES.length] ?? PALETTE.red]),
  );
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const buildSmoothPath = (points: Array<{ x: number; y: number }>): string => {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0]!.x} ${points[0]!.y}`;
  }
  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const delta = (current.x - previous.x) / 2;
    path += ` C ${previous.x + delta} ${previous.y}, ${current.x - delta} ${current.y}, ${current.x} ${current.y}`;
  }
  return path;
};

const activeSegmentsForSeries = (
  series: SocialAccountProfileHashtagTimelineSeries,
  xByOrder: Map<number, number>,
  yForRank: (rank: number) => number,
): Array<{ id: number; points: Array<{ x: number; y: number }> }> => {
  const segments = new Map<number, Array<{ x: number; y: number }>>();
  for (const point of series.points) {
    if (!point.in_top_ten || !point.segment_id) continue;
    const x = xByOrder.get(point.order);
    if (x === undefined) continue;
    const existing = segments.get(point.segment_id) ?? [];
    existing.push({ x, y: yForRank(point.rank) });
    segments.set(point.segment_id, existing);
  }
  return Array.from(segments.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([id, points]) => ({ id, points }));
};

const finalVisiblePoint = (
  series: SocialAccountProfileHashtagTimelineSeries,
): SocialAccountProfileHashtagTimelinePoint | null => {
  for (let index = series.points.length - 1; index >= 0; index -= 1) {
    const point = series.points[index];
    if (point?.in_top_ten) return point;
  }
  return null;
};

const firstVisiblePoint = (
  series: SocialAccountProfileHashtagTimelineSeries,
): SocialAccountProfileHashtagTimelinePoint | null => {
  return series.points.find((point) => point.in_top_ten) ?? null;
};

export default function SocialAccountProfileHashtagTimelineChart({ timeline, loading = false, error }: Props) {
  const chartModel = useMemo(() => {
    if (!timeline || timeline.years.length === 0) return null;
    const leftRail = 78;
    const rightRail = 152;
    const topRail = 52;
    const bottomRail = 68;
    const columnGap = Math.max(130, Math.round(760 / Math.max(timeline.years.length, 2)));
    const width = leftRail + rightRail + Math.max(columnGap * Math.max(timeline.years.length - 1, 1), 520);
    const height = topRail + bottomRail + 10 * 42;
    const plotWidth = width - leftRail - rightRail;
    const plotHeight = height - topRail - bottomRail;
    const rankStep = plotHeight / 9;
    const xByOrder = new Map<number, number>();
    for (const year of timeline.years) {
      const denominator = Math.max(timeline.years.length - 1, 1);
      xByOrder.set(year.order, leftRail + ((year.order - 1) / denominator) * plotWidth);
    }
    const yForRank = (rank: number) => topRail + (clamp(rank, 1, 10) - 1) * rankStep;
    return {
      leftRail,
      rightRail,
      topRail,
      bottomRail,
      width,
      height,
      plotWidth,
      plotHeight,
      rankStep,
      xByOrder,
      yForRank,
    };
  }, [timeline]);

  const hasRenderableTimeline = Boolean(timeline && timeline.years.length >= 2 && (timeline.series?.length ?? 0) > 0);
  const displaySeries = useMemo(() => timeline?.series ?? [], [timeline?.series]);
  const colorByHashtag = useMemo(() => buildSeriesColorMap(displaySeries), [displaySeries]);
  const latestOrder = timeline && timeline.years.length > 0 ? (timeline.years[timeline.years.length - 1]?.order ?? 0) : 0;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-zinc-200 bg-white px-5 py-5 shadow-[0_24px_60px_rgba(24,24,27,0.08)] sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            `radial-gradient(circle at 12% 18%, ${PALETTE.blush}22 0, transparent 30%), ` +
            `radial-gradient(circle at 82% 12%, ${PALETTE.powderBlue}33 0, transparent 32%), ` +
            `radial-gradient(circle at 72% 82%, ${PALETTE.sunflower}1f 0, transparent 28%)`,
        }}
      />
      <div className="relative">
        <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500"
              style={{ fontFamily: FONT_FAMILY.body }}
            >
              Instagram Timeline
            </p>
            <h2
              className="mt-2 text-[1.85rem] leading-none text-zinc-950 sm:text-[2.15rem]"
              style={{ fontFamily: FONT_FAMILY.display, letterSpacing: "-0.03em" }}
            >
              Yearly Top 10 Hashtags
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600" style={{ fontFamily: FONT_FAMILY.body }}>
              A rank-over-time view of the hashtags that break into this account&apos;s yearly top ten. Lines fade when a
              hashtag drops out, then reappear when it climbs back in.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 text-xs text-zinc-500 backdrop-blur">
            <p className="font-semibold uppercase tracking-[0.18em] text-zinc-400">Palette</p>
            <p className="mt-1 leading-5">Each hashtag gets its own TRR token color drawn from the admin palette set.</p>
          </div>
        </div>

        {loading ? <p className="mt-5 text-sm text-zinc-500">Loading hashtag timeline…</p> : null}
        {error ? <p className="mt-5 text-sm text-red-700">{error}</p> : null}
        {!loading && !error && !hasRenderableTimeline ? (
          <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-5">
            <p className="text-sm font-medium text-zinc-700">Not enough multi-year top-10 hashtag history to chart yet.</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              This visualization appears once the account has at least two calendar years with ranked hashtag activity.
            </p>
          </div>
        ) : null}

        {!loading && !error && hasRenderableTimeline && chartModel ? (
          <>
            <div className="mt-6 overflow-x-auto pb-2">
              <svg
                role="img"
                aria-label="Bump chart showing yearly top ten Instagram hashtags"
                viewBox={`0 0 ${chartModel.width} ${chartModel.height}`}
                className="h-auto min-w-[840px] w-full"
              >
                <defs>
                  <linearGradient id="timeline-surface" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#fafafa" />
                  </linearGradient>
                </defs>
                <rect
                  x={0}
                  y={0}
                  width={chartModel.width}
                  height={chartModel.height}
                  rx={28}
                  fill="url(#timeline-surface)"
                />

                {Array.from({ length: 10 }, (_, index) => {
                  const rank = index + 1;
                  const y = chartModel.yForRank(rank);
                  return (
                    <g key={`grid-${rank}`}>
                      <line
                        x1={chartModel.leftRail}
                        x2={chartModel.width - chartModel.rightRail}
                        y1={y}
                        y2={y}
                        stroke={rank === 1 ? `${PALETTE.red}22` : "#e4e4e7"}
                        strokeWidth={rank === 1 ? 1.5 : 1}
                        strokeDasharray={rank === 1 ? "0" : "4 8"}
                      />
                      <circle cx={40} cy={y} r={15} fill="#ffffff" stroke="#d4d4d8" />
                      <text
                        x={40}
                        y={y + 4}
                        textAnchor="middle"
                        fill="#18181b"
                        fontSize="12"
                        fontWeight="700"
                        style={{ fontFamily: FONT_FAMILY.body }}
                      >
                        {rank}
                      </text>
                    </g>
                  );
                })}

                {timeline?.years.map((year) => {
                  const x = chartModel.xByOrder.get(year.order) ?? 0;
                  return (
                    <g key={`year-${year.year}`}>
                      <line
                        x1={x}
                        x2={x}
                        y1={chartModel.topRail - 16}
                        y2={chartModel.height - chartModel.bottomRail + 10}
                        stroke="#f4f4f5"
                        strokeWidth={1}
                      />
                      <text
                        x={x}
                        y={chartModel.height - 22}
                        textAnchor="middle"
                        fill="#52525b"
                        fontSize="13"
                        fontWeight="700"
                        style={{ fontFamily: FONT_FAMILY.body, letterSpacing: "0.04em" }}
                      >
                        {year.label}
                      </text>
                    </g>
                  );
                })}

                {displaySeries.map((series) => {
                  const color = colorByHashtag.get(series.hashtag) ?? PALETTE.red;
                  const allPoints = series.points
                    .map((point) => {
                      const x = chartModel.xByOrder.get(point.order);
                      if (x === undefined) return null;
                      return { x, y: chartModel.yForRank(point.rank), point };
                    })
                    .filter(Boolean) as Array<{ x: number; y: number; point: SocialAccountProfileHashtagTimelinePoint }>;
                  const activeSegments = activeSegmentsForSeries(series, chartModel.xByOrder, chartModel.yForRank);
                  return (
                    <g key={series.hashtag}>
                      <path
                        d={buildSmoothPath(allPoints.map(({ x, y }) => ({ x, y })))}
                        fill="none"
                        stroke={color}
                        strokeOpacity={0.18}
                        strokeWidth={4}
                        strokeLinecap="round"
                      />
                      {activeSegments.map((segment) =>
                        segment.points.length === 1 ? (
                          <line
                            key={`${series.hashtag}-segment-${segment.id}`}
                            x1={segment.points[0]!.x - 15}
                            x2={segment.points[0]!.x + 15}
                            y1={segment.points[0]!.y}
                            y2={segment.points[0]!.y}
                            stroke={color}
                            strokeWidth={5}
                            strokeLinecap="round"
                          />
                        ) : (
                          <path
                            key={`${series.hashtag}-segment-${segment.id}`}
                            d={buildSmoothPath(segment.points)}
                            fill="none"
                            stroke={color}
                            strokeWidth={5}
                            strokeLinecap="round"
                          />
                        ),
                      )}
                      {allPoints
                        .filter(({ point }) => point.in_top_ten)
                        .map(({ x, y, point }) => (
                          <circle
                            key={`${series.hashtag}-${point.order}`}
                            cx={x}
                            cy={y}
                            r={5.5}
                            fill="#ffffff"
                            stroke={color}
                            strokeWidth={3}
                          />
                        ))}
                    </g>
                  );
                })}

                {displaySeries.map((series) => {
                  const latestPoint = finalVisiblePoint(series);
                  if (!latestPoint || latestPoint.order !== latestOrder) return null;
                  const x = chartModel.xByOrder.get(latestPoint.order);
                  if (x === undefined) return null;
                  const y = chartModel.yForRank(latestPoint.rank);
                  return (
                    <g key={`${series.hashtag}-latest-label`}>
                      <rect
                        x={x + 12}
                        y={y - 13}
                        width={Math.max(series.display_hashtag.length * 7.8, 82)}
                        height={26}
                        rx={13}
                        fill="#ffffff"
                        stroke="#e4e4e7"
                      />
                      <text
                        x={x + 24}
                        y={y + 4}
                        fill={colorByHashtag.get(series.hashtag) ?? PALETTE.red}
                        fontSize="12"
                        fontWeight="700"
                        style={{ fontFamily: FONT_FAMILY.body }}
                      >
                        {series.display_hashtag}
                      </text>
                    </g>
                  );
                })}

                {displaySeries.map((series) => {
                  const firstPoint = firstVisiblePoint(series);
                  const latestPoint = finalVisiblePoint(series);
                  if (!firstPoint || !latestPoint || firstPoint.order === latestPoint.order) return null;
                  const x = chartModel.xByOrder.get(firstPoint.order);
                  if (x === undefined) return null;
                  const y = chartModel.yForRank(firstPoint.rank);
                  return (
                    <text
                      key={`${series.hashtag}-first-label`}
                      x={x - 14}
                      y={y - 10}
                      textAnchor="end"
                      fill="#71717a"
                      fontSize="11"
                      fontWeight="700"
                      style={{ fontFamily: FONT_FAMILY.body, letterSpacing: "0.03em" }}
                    >
                      {series.display_hashtag}
                    </text>
                  );
                })}
              </svg>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
              <p className="leading-5">
                Rank 1 sits at the top. Faded arcs show the full span between a hashtag&apos;s first and last top-ten year,
                including the years when it slipped outside the chart.
              </p>
              <p className="font-semibold uppercase tracking-[0.18em] text-zinc-400">
                {timeline?.series.length ?? 0} tracked hashtags
              </p>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
