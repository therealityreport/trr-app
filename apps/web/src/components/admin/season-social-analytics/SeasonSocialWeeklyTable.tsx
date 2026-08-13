import Link from "next/link";
import { buildSeasonSocialWeekUrl } from "@/lib/admin/show-admin-routes";
import {
  PLATFORM_LABELS, PLATFORM_ORDER, SOCIAL_ALERTS_QUERY_KEY, SOCIAL_DENSITY_QUERY_KEY,
  SOCIAL_METRIC_MODE_QUERY_KEY, SOCIAL_TABLE_METRICS_QUERY_KEY, SOCIAL_TABLE_METRIC_KEYS,
  SOCIAL_TABLE_METRIC_OPTIONS, formatDateOnly, formatDateShort, formatDateTime,
  formatDurationLabel, formatFreshnessLabel, formatInteger, formatMetricCountLabel,
  formatPctLabel, getHeatmapToneClass, getHeatmapWeekSectionLabel, getMonthDayLabel,
  getPlatformCoverage, getTotalCoverage, getWeekEpisodeLabel, getWeekSyncActionLabel,
  getWeeklyDayValue, getWeeklyFlagToneClass, getWeeklyTableEpisodePrimaryLabel,
  getWeeklyTableEpisodeSecondaryLabel, isCoveragePctUpToDate,
} from "./section-helpers";
import type { Platform, WeekDetailTokenTriplet } from "./section-helpers";
import type {
  AnalyticsResponse,
  BenchmarkCompareMode,
  IngestMode,
  SocialDensity,
  SocialJob,
  SocialMetricMode,
  SocialAnalyticsView,
  SocialRunSummary,
  SocialTableMetric,
  StaleRunState,
  WeeklyMetric,
  WeekDetailTokenCounts,
} from "./section-helpers";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { Route } from "next";

export type SeasonSocialWeeklyTableProps = {
  Link: typeof Link;
  PLATFORM_LABELS: typeof PLATFORM_LABELS; PLATFORM_ORDER: typeof PLATFORM_ORDER;
  SOCIAL_ALERTS_QUERY_KEY: typeof SOCIAL_ALERTS_QUERY_KEY; SOCIAL_DENSITY_QUERY_KEY: typeof SOCIAL_DENSITY_QUERY_KEY;
  SOCIAL_METRIC_MODE_QUERY_KEY: typeof SOCIAL_METRIC_MODE_QUERY_KEY; SOCIAL_TABLE_METRICS_QUERY_KEY: typeof SOCIAL_TABLE_METRICS_QUERY_KEY;
  SOCIAL_TABLE_METRIC_KEYS: typeof SOCIAL_TABLE_METRIC_KEYS; SOCIAL_TABLE_METRIC_OPTIONS: typeof SOCIAL_TABLE_METRIC_OPTIONS;
  activeFailureErrorCounts: Array<{ code: string; count: number }>; analytics: AnalyticsResponse | null; analyticsView: SocialAnalyticsView; benchmarkCompareMode: BenchmarkCompareMode; benchmarkSummary: {
    weekIndex: number;
    comparisonLabel: string;
    postsDeltaPct: number | null;
    commentsDeltaPct: number | null;
    engagementDeltaPct: number | null;
    consistencyScorePct: Partial<Record<Platform, number | null>>;
  } | null;
  buildSeasonSocialWeekUrl: typeof buildSeasonSocialWeekUrl; buildWeekDetailHref: (weekIndex: number, dayLocal?: string) => Route; dataQuality: AnalyticsResponse["summary"]["data_quality"];
  formatDateOnly: typeof formatDateOnly; formatDateShort: typeof formatDateShort; formatDateTime: typeof formatDateTime;
  formatDurationLabel: typeof formatDurationLabel; formatFreshnessLabel: typeof formatFreshnessLabel; formatInteger: typeof formatInteger;
  formatMetricCountLabel: typeof formatMetricCountLabel; formatPctLabel: typeof formatPctLabel; getHeatmapToneClass: typeof getHeatmapToneClass;
  getHeatmapWeekSectionLabel: typeof getHeatmapWeekSectionLabel; getMonthDayLabel: typeof getMonthDayLabel; getPlatformCoverage: typeof getPlatformCoverage;
  getTotalCoverage: typeof getTotalCoverage; getWeekEpisodeLabel: typeof getWeekEpisodeLabel; getWeekSyncActionLabel: typeof getWeekSyncActionLabel;
  getWeeklyDayValue: typeof getWeeklyDayValue; getWeeklyFlagToneClass: typeof getWeeklyFlagToneClass;
  getWeeklyTableEpisodePrimaryLabel: typeof getWeeklyTableEpisodePrimaryLabel; getWeeklyTableEpisodeSecondaryLabel: typeof getWeeklyTableEpisodeSecondaryLabel;
  groupedFailureRows: Array<{
    code: string;
    stage: string;
    count: number;
    platforms: Set<string>;
    latestTimestamp: string | null;
    latestTimestampMs: number;
    sampleMessage: string | null;
    platformsLabel: string;
  }>;
  heatmapPlatform: Platform | null; ingestActionsBlockedReason: string | null; ingestingWeek: number | null;
  isAdvancedView: boolean; isBravoView: boolean; isCoveragePctUpToDate: typeof isCoveragePctUpToDate; latestFailureEvents: Array<{
    id: string;
    code: string;
    stage: string;
    platform: string;
    status: SocialJob["status"];
    message: string;
    timestamp: string | null;
    timestampMs: number;
  }>;
  needsWeekDetailTokenMetrics: boolean; platformFilter: "all" | Platform; platformTab: Platform | "overview"; router: AppRouterInstance; runHealth: { successRate: number | null; medianDurationSeconds: number | null }; runIngest: (override?: {
    week?: number;
    day?: string;
    platform?: "all" | Platform;
    ingestMode?: IngestMode;
    rowMissingOnly?: boolean;
  }) => Promise<void>; runSummaries: SocialRunSummary[];
  runSummariesLoading: boolean; runSummaryError: string | null; runningIngest: boolean; seasonNumber: number; selectedTableMetricSet: ReadonlySet<SocialTableMetric>; selectedTableMetrics: SocialTableMetric[];
  setBenchmarkCompareMode: Dispatch<SetStateAction<BenchmarkCompareMode>>; setSocialAlertsEnabled: Dispatch<SetStateAction<boolean>>; setSocialDensity: Dispatch<SetStateAction<SocialDensity>>; setSocialMetricMode: (nextMode: SocialMetricMode) => void; setSocialPreferenceInUrl: (key: string, value: string | null) => void;
  setWeeklyMetric: Dispatch<SetStateAction<WeeklyMetric>>; showRouteSlug: string; socialAlertsEnabled: boolean; socialDensity: SocialDensity; socialMetricMode: SocialMetricMode; socialMetricModeQueryValue: SocialMetricMode | null;
  socialRulePanels: ReactNode; socialTableMetricsQueryValue: string | null; staleRuns: StaleRunState[]; staleThresholdMinutes: number; toggleAllSocialTableMetrics: () => void;
  toggleSocialTableMetric: (metric: SocialTableMetric) => void; weekDetailTokenCountsByWeek: Record<number, WeekDetailTokenCounts>; weekDetailTokenCountsLoadingWeeks: ReadonlySet<number>; weeklyDailyActivityRows: NonNullable<AnalyticsResponse["weekly_daily_activity"]>;
  weeklyFlagsByWeek: ReadonlyMap<number, NonNullable<AnalyticsResponse["weekly_flags"]>[number][]>; weeklyHeatmapCommentTotals: ReadonlyMap<number, number>; weeklyHeatmapMaxValue: number; weeklyHeatmapPostTotals: ReadonlyMap<number, number>; weeklyMetric: WeeklyMetric;
  weeklyPlatformEngagementByWeek: ReadonlyMap<number, NonNullable<AnalyticsResponse["weekly_platform_engagement"]>[number]>; weeklyPlatformRows: NonNullable<AnalyticsResponse["weekly_platform_posts"]>; workerHealthUnavailableWarning: string | null;
};

/** Typed, stateless presentation for this Season Social Analytics region. */
export function SeasonSocialWeeklyTable({
  Link,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  SOCIAL_ALERTS_QUERY_KEY,
  SOCIAL_DENSITY_QUERY_KEY,
  SOCIAL_METRIC_MODE_QUERY_KEY,
  SOCIAL_TABLE_METRICS_QUERY_KEY,
  SOCIAL_TABLE_METRIC_KEYS,
  SOCIAL_TABLE_METRIC_OPTIONS,
  activeFailureErrorCounts,
  analytics,
  analyticsView,
  benchmarkCompareMode,
  benchmarkSummary,
  buildSeasonSocialWeekUrl,
  buildWeekDetailHref,
  dataQuality,
  formatDateOnly,
  formatDateShort,
  formatDateTime,
  formatDurationLabel,
  formatFreshnessLabel,
  formatInteger,
  formatMetricCountLabel,
  formatPctLabel,
  getHeatmapToneClass,
  getHeatmapWeekSectionLabel,
  getMonthDayLabel,
  getPlatformCoverage,
  getTotalCoverage,
  getWeekEpisodeLabel,
  getWeekSyncActionLabel,
  getWeeklyDayValue,
  getWeeklyFlagToneClass,
  getWeeklyTableEpisodePrimaryLabel,
  getWeeklyTableEpisodeSecondaryLabel,
  groupedFailureRows,
  heatmapPlatform,
  ingestActionsBlockedReason,
  ingestingWeek,
  isAdvancedView,
  isBravoView,
  isCoveragePctUpToDate,
  latestFailureEvents,
  needsWeekDetailTokenMetrics,
  platformFilter,
  platformTab,
  router,
  runHealth,
  runIngest,
  runSummaries,
  runSummariesLoading,
  runSummaryError,
  runningIngest,
  seasonNumber,
  selectedTableMetricSet,
  selectedTableMetrics,
  setBenchmarkCompareMode,
  setSocialAlertsEnabled,
  setSocialDensity,
  setSocialMetricMode,
  setSocialPreferenceInUrl,
  setWeeklyMetric,
  showRouteSlug,
  socialAlertsEnabled,
  socialDensity,
  socialMetricMode,
  socialMetricModeQueryValue,
  socialRulePanels,
  socialTableMetricsQueryValue,
  staleRuns,
  staleThresholdMinutes,
  toggleAllSocialTableMetrics,
  toggleSocialTableMetric,
  weekDetailTokenCountsByWeek,
  weekDetailTokenCountsLoadingWeeks,
  weeklyDailyActivityRows,
  weeklyFlagsByWeek,
  weeklyHeatmapCommentTotals,
  weeklyHeatmapMaxValue,
  weeklyHeatmapPostTotals,
  weeklyMetric,
  weeklyPlatformEngagementByWeek,
  weeklyPlatformRows,
  workerHealthUnavailableWarning,
}: SeasonSocialWeeklyTableProps) {
  return (
    <>
          {isBravoView && (
            <section className="space-y-6">
              {socialRulePanels}
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
                  <button
                    type="button"
                    onClick={() => setWeeklyMetric("completeness")}
                    className={`rounded px-2.5 py-1 transition ${
                      weeklyMetric === "completeness"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Completeness
                  </button>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setSocialDensity("compact");
                      setSocialPreferenceInUrl(SOCIAL_DENSITY_QUERY_KEY, "compact");
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
                      setSocialPreferenceInUrl(SOCIAL_DENSITY_QUERY_KEY, null);
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
              <div className="space-y-3">
                {weeklyDailyActivityRows.map((weekRow) => {
                  const weekPostTotal = weeklyHeatmapPostTotals.get(weekRow.week_index) ?? 0;
                  const weekCommentTotal = weeklyHeatmapCommentTotals.get(weekRow.week_index) ?? 0;
                  const weekEpisodeLabel = getWeekEpisodeLabel(weekRow, seasonNumber);
                  const heatmapWeekSectionLabel = getHeatmapWeekSectionLabel(weekRow);
                  const weekFlags = socialAlertsEnabled ? (weeklyFlagsByWeek.get(weekRow.week_index) ?? []) : [];
                  return (
                    <div
                      key={weekRow.week_index}
                      className="space-y-1"
                      data-testid={`weekly-heatmap-row-${weekRow.week_index}`}
                    >
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="flex flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span>{heatmapWeekSectionLabel}</span>
                            {weekEpisodeLabel && (
                              <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-700">
                                {weekEpisodeLabel}
                              </span>
                            )}
                          </span>
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
                        <span className="flex flex-col items-end text-right leading-tight">
                          <span data-testid={`weekly-heatmap-total-${weekRow.week_index}`}>
                            {formatInteger(weekPostTotal)} posts
                          </span>
                          <span data-testid={`weekly-heatmap-comments-total-${weekRow.week_index}`}>
                            {formatInteger(weekCommentTotal)} comments
                          </span>
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-zinc-100 bg-zinc-50 p-2">
                        <div
                          className={socialDensity === "comfortable" ? "grid grid-cols-7 gap-1.5" : "inline-grid grid-cols-7 gap-1.5"}
                        >
                        {weekRow.days.map((day) => {
                          const value = getWeeklyDayValue(day, weeklyMetric, heatmapPlatform);
                          const displayLabel =
                            weeklyMetric === "completeness"
                              ? value < 0
                                ? "N/A"
                                : `${(value * 100).toFixed(1)}%`
                              : formatInteger(value);
                          const monthDay = getMonthDayLabel(day.date_local);
                          const [monthLabel, dayLabel] = monthDay.split(" ");
                          return (
                            <div
                              key={`${weekRow.week_index}-${day.day_index}`}
                              data-testid={`weekly-heatmap-day-${weekRow.week_index}-${day.day_index}`}
                              title={`${day.date_local} · ${displayLabel} ${weeklyMetric}`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  router.replace(buildWeekDetailHref(weekRow.week_index, day.date_local) as Route, {
                                    scroll: false,
                                  });
                                }}
                                aria-label={`${weekRow.label} ${day.date_local} ${displayLabel} ${weeklyMetric}`}
                                className={`flex ${socialDensity === "comfortable" ? "h-12 w-full text-[10px]" : "h-9 w-9 sm:h-10 sm:w-10 text-[9px]"} flex-col items-center justify-center rounded px-1 font-semibold tabular-nums ${getHeatmapToneClass({ value, maxValue: weeklyHeatmapMaxValue, metric: weeklyMetric })}`}
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
                    Daily schedule unavailable for the current view.
                  </p>
                )}
                {(analytics?.weekly?.length ?? 0) === 0 && (
                  <p className="text-sm text-zinc-500">No weekly data for the current view.</p>
                )}
              </div>
              </article>
            </section>
          )}

          {isAdvancedView && (
            <section className="grid gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-1">
                {socialRulePanels}
              </div>
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-zinc-900">Run Health</h4>
                {runSummariesLoading && runSummaries.length === 0 ? (
                  <div className="mt-4 space-y-2">
                    {[0, 1, 2].map((index) => (
                      <div key={`run-health-skeleton-${index}`} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
                        <div className="mt-2 h-6 w-20 animate-pulse rounded bg-zinc-200" />
                      </div>
                    ))}
                  </div>
                ) : (
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
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Failure Groups</p>
                      {groupedFailureRows.length === 0 ? (
                        <p className="mt-1 text-xs text-zinc-500">No grouped failures for selected run.</p>
                      ) : (
                        <ul className="mt-1 space-y-1 text-xs">
                          {groupedFailureRows.slice(0, 6).map((group) => (
                            <li key={`${group.code}-${group.stage}`} className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
                              <p className="font-semibold">
                                {group.code} · {group.stage} · {group.count}
                              </p>
                              <p className="text-zinc-500">
                                {group.platformsLabel || "Unknown platform"}
                                {group.latestTimestamp ? ` · ${formatDateTime(group.latestTimestamp)}` : ""}
                              </p>
                              {group.sampleMessage && (
                                <p className="line-clamp-1 text-zinc-500">{group.sampleMessage}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2" data-testid="run-health-latest-failures">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Latest 5 Failure Events
                      </p>
                      {latestFailureEvents.length === 0 ? (
                        <p className="mt-1 text-xs text-zinc-500">No recent failure events.</p>
                      ) : (
                        <ul className="mt-1 space-y-1 text-xs">
                          {latestFailureEvents.map((event) => (
                            <li key={event.id} className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
                              <p className="font-semibold">
                                {event.code} · {event.platform} · {event.stage}
                              </p>
                              <p className="text-zinc-500">
                                {formatDateTime(event.timestamp)} · {event.status}
                              </p>
                              <p className="line-clamp-1 text-zinc-500">{event.message}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
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
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-zinc-900">Weekly Bravo Post Count Table</h4>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={toggleAllSocialTableMetrics}
                  className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  {selectedTableMetrics.length === SOCIAL_TABLE_METRIC_KEYS.length ? "Deselect all" : "Select All"}
                </button>
                <div className="flex flex-wrap items-center justify-end gap-1.5" data-testid="weekly-bravo-metric-filter">
                  {SOCIAL_TABLE_METRIC_OPTIONS.map((option) => {
                    const isSelected = selectedTableMetricSet.has(option.key);
                    return (
                      <button
                        key={`table-metric-${option.key}`}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleSocialTableMetric(option.key)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                          isSelected
                            ? "border-zinc-800 bg-zinc-800 text-white"
                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    aria-pressed={socialMetricMode === "total"}
                    onClick={() => setSocialMetricMode("total")}
                    className={`rounded-full px-2.5 py-1 transition ${
                      socialMetricMode === "total"
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                    }`}
                  >
                    Total
                  </button>
                  <button
                    type="button"
                    aria-pressed={socialMetricMode === "saved"}
                    onClick={() => setSocialMetricMode("saved")}
                    className={`rounded-full px-2.5 py-1 transition ${
                      socialMetricMode === "saved"
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                    }`}
                  >
                    Saved
                  </button>
                </div>
              </div>
            </div>
            {(ingestActionsBlockedReason || workerHealthUnavailableWarning || staleRuns.length > 0) && (
              <div className="mb-4 space-y-2">
                {ingestActionsBlockedReason && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <span className="font-semibold">Worker Health:</span> {ingestActionsBlockedReason}
                  </div>
                )}
                {workerHealthUnavailableWarning && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <span className="font-semibold">Worker Health:</span> {workerHealthUnavailableWarning}
                  </div>
                )}
                {staleRuns.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                    <p className="font-semibold text-zinc-800">
                      Potentially stalled ingest runs ({staleThresholdMinutes}+ minutes):
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-zinc-600">
                      {staleRuns.map((staleRun) => (
                        <li key={staleRun.runId}>
                          <span className="font-medium">{staleRun.runId.slice(0, 8)}</span> · {staleRun.ingestMode} ·{" "}
                          {staleRun.ageMinutes}m old · pending {staleRun.pendingJobs} · retrying {staleRun.retryingJobs}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-[0.12em] text-zinc-500">
                    <th className="px-3 py-2 font-semibold">Episode</th>
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
                    const engagementWeek = weeklyPlatformEngagementByWeek.get(week.week_index);
                    const weeklyEngagementTotal = Number(engagementWeek?.total_engagement ?? 0);
                    const detailTokenCounts = weekDetailTokenCountsByWeek[week.week_index];
                    const detailTokenCountsLoading =
                      needsWeekDetailTokenMetrics &&
                      !detailTokenCounts &&
                      weekDetailTokenCountsLoadingWeeks.has(week.week_index);
                    const weekLinkQuery = new URLSearchParams();
                    if (analyticsView !== "bravo") {
                      weekLinkQuery.set("social_view", analyticsView);
                    }
                    if (socialTableMetricsQueryValue) {
                      weekLinkQuery.set(SOCIAL_TABLE_METRICS_QUERY_KEY, socialTableMetricsQueryValue);
                    }
                    if (socialMetricModeQueryValue) {
                      weekLinkQuery.set(SOCIAL_METRIC_MODE_QUERY_KEY, socialMetricModeQueryValue);
                    }
                    const weekSecondaryLabel = getWeeklyTableEpisodeSecondaryLabel(week);
                    const totalCommentsValue =
                      socialMetricMode === "saved"
                        ? week.total_comments
                        : (week.total_reported_comments ?? week.total_comments);
                    const buildMetricTokens = ({
                      postsValue,
                      likesValue,
                      commentsValue,
                      tokenCounts,
                    }: {
                      postsValue: number | null | undefined;
                      likesValue: number | null | undefined;
                      commentsValue: number | null | undefined;
                      tokenCounts: WeekDetailTokenTriplet | null;
                    }): string[] => selectedTableMetrics.map((metric) => {
                      if (metric === "posts") {
                        return formatMetricCountLabel(postsValue, "post");
                      }
                      if (metric === "likes") {
                        return formatMetricCountLabel(likesValue, "like");
                      }
                      if (metric === "comments") {
                        return formatMetricCountLabel(commentsValue, "comment");
                      }
                      if (!tokenCounts) {
                        return `-- ${metric}`;
                      }
                      if (metric === "hashtags") {
                        return formatMetricCountLabel(tokenCounts.hashtags, "hashtag");
                      }
                      if (metric === "mentions") {
                        return formatMetricCountLabel(tokenCounts.mentions, "mention");
                      }
                      if (metric === "collaborators") {
                        return formatMetricCountLabel(tokenCounts.collaborators, "collaborator");
                      }
                      return formatMetricCountLabel(tokenCounts.tags, "tag");
                    });
                    const totalMetricTokens = buildMetricTokens({
                      postsValue: week.total_posts,
                      likesValue: weeklyEngagementTotal,
                      commentsValue: totalCommentsValue,
                      tokenCounts: detailTokenCounts?.total ?? null,
                    });
                    const selectedMetricProgressValues = selectedTableMetrics
                      .map((metric): number | null => {
                        if (metric === "posts") return totalCoverage.postsPct;
                        if (metric === "comments") return totalCoverage.commentsPct;
                        if (metric === "likes") {
                          if (week.total_posts <= 0 && weeklyEngagementTotal <= 0) return null;
                          return engagementWeek?.has_data === false ? 0 : 100;
                        }
                        if (!detailTokenCounts) {
                          return detailTokenCountsLoading ? null : week.total_posts > 0 ? 0 : null;
                        }
                        return week.total_posts > 0 ? 100 : null;
                      })
                      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
                    const selectedMetricProgressPct = selectedMetricProgressValues.length > 0
                      ? Math.min(
                          100,
                          selectedMetricProgressValues.reduce((sum, value) => sum + value, 0) / selectedMetricProgressValues.length,
                        )
                      : null;
                    const totalProgressValue = detailTokenCountsLoading
                      ? "--"
                      : selectedMetricProgressPct == null
                        ? "-"
                        : `${selectedMetricProgressPct.toFixed(1)}%`;
                    const inferredTotalReportedComments = PLATFORM_ORDER.reduce(
                      (sum, platform) => sum + Number(week.reported_comments?.[platform] ?? 0),
                      0,
                    );
                    const totalReportedCommentsForMissing = Number(
                      week.total_reported_comments ?? inferredTotalReportedComments,
                    );
                    const missingCommentsCount = Math.max(
                      0,
                      totalReportedCommentsForMissing - Number(week.total_comments ?? 0),
                    );
                    const missingMetricTokens = selectedTableMetrics
                      .map((metric): string => {
                        if (metric === "posts") {
                          const missingPostsCount = totalCoverage.postsUpToDate ? 0 : Number(week.total_posts ?? 0);
                          return formatMetricCountLabel(missingPostsCount, "post");
                        }
                        if (metric === "likes") {
                          const missingLikesCount = engagementWeek?.has_data === false ? weeklyEngagementTotal : 0;
                          return formatMetricCountLabel(missingLikesCount, "like");
                        }
                        if (metric === "comments") {
                          return formatMetricCountLabel(missingCommentsCount, "comment");
                        }
                        if (metric === "hashtags") {
                          return "-- hashtags";
                        }
                        if (metric === "mentions") {
                          return "-- mentions";
                        }
                        if (metric === "collaborators") {
                          return "-- collaborators";
                        }
                        return "-- tags";
                      });
                    const shouldShowMissingMetrics =
                      !detailTokenCountsLoading &&
                      typeof selectedMetricProgressPct === "number" &&
                      Number.isFinite(selectedMetricProgressPct) &&
                      !isCoveragePctUpToDate(selectedMetricProgressPct) &&
                      missingMetricTokens.length > 0;
                    return (
                      <tr key={`table-week-${week.week_index}`} className="border-b border-zinc-100 text-zinc-700">
                        <td className="px-3 py-2 align-top font-semibold">
                          <Link
                            href={buildSeasonSocialWeekUrl({
                              showSlug: showRouteSlug,
                              seasonNumber,
                              weekIndex: week.week_index,
                              platform: platformTab !== "overview" ? platformTab : undefined,
                              query: weekLinkQuery,
                            }) as Route}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <span className="flex flex-col gap-0.5 leading-tight">
                              <span>{getWeeklyTableEpisodePrimaryLabel(week, seasonNumber)}</span>
                              <span className="text-xs font-normal text-zinc-500">{weekSecondaryLabel}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-zinc-500">
                          {formatDateShort(week.start)} - {formatDateShort(week.end)}
                        </td>
                        {PLATFORM_ORDER.map((platform) => {
                          const coverage = getPlatformCoverage(week, platform);
                          const platformTokenCounts = detailTokenCounts?.byPlatform?.[platform] ?? null;
                          const platformCommentsValue =
                            socialMetricMode === "saved"
                              ? week.comments?.[platform]
                              : (week.reported_comments?.[platform] ?? week.comments?.[platform]);
                          const platformMetricTokens = buildMetricTokens({
                            postsValue: week.posts?.[platform],
                            likesValue: engagementWeek?.engagement?.[platform],
                            commentsValue: platformCommentsValue,
                            tokenCounts: platformTokenCounts,
                          });
                          return (
                            <td key={`${week.week_index}-${platform}`} className="px-3 py-2 align-top">
                              <div className="flex flex-col gap-0.5 leading-tight">
                                <div className="text-[11px] text-zinc-600" data-testid={`weekly-platform-metrics-${platform}-${week.week_index}`}>
                                  {platformMetricTokens.length > 0 ? (
                                    platformMetricTokens.map((token, index) => (
                                      <div key={`${platform}-${week.week_index}-metric-${index}`}>{token}</div>
                                    ))
                                  ) : (
                                    <div className="text-zinc-400">No metrics selected</div>
                                  )}
                                </div>
                                {coverage.upToDate ? (
                                  <div className="text-[11px] text-emerald-700 whitespace-nowrap">Up-to-Date</div>
                                ) : null}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 align-top font-semibold text-zinc-900">
                          <div className="flex flex-col gap-0.5 leading-tight">
                            <div className="text-[11px] font-normal text-zinc-600" data-testid={`weekly-total-metrics-${week.week_index}`}>
                              {totalMetricTokens.length > 0 ? (
                                totalMetricTokens.map((token, index) => (
                                  <div key={`total-${week.week_index}-metric-${index}`}>{token}</div>
                                ))
                              ) : (
                                <div className="text-zinc-400">No metrics selected</div>
                              )}
                            </div>
                            {totalCoverage.upToDate ? (
                              <div className="text-[11px] font-normal text-emerald-700 whitespace-nowrap">Up-to-Date</div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-0.5 text-xs leading-tight text-zinc-700">
                            <span className="whitespace-nowrap">
                              <span className="font-semibold">Total Progress:</span>{" "}
                              <span data-testid={`weekly-total-progress-${week.week_index}`}>{totalProgressValue}</span>
                            </span>
                            {shouldShowMissingMetrics ? (
                              <div className="mt-1 text-[11px] text-zinc-600" data-testid={`weekly-missing-metrics-${week.week_index}`}>
                                {missingMetricTokens.map((token, index) => (
                                  <div key={`missing-${week.week_index}-${index}`}>{token}</div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => runIngest({ week: week.week_index })}
                              disabled={runningIngest || Boolean(ingestActionsBlockedReason)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                runningIngest && ingestingWeek === week.week_index
                                  ? "animate-pulse border-blue-400 bg-blue-50 text-blue-700"
                                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                              }`}
                            >
                              {runningIngest && ingestingWeek === week.week_index ? "Syncing..." : "Run Week"}
                            </button>
                            <button
                              type="button"
                              onClick={() => runIngest({ week: week.week_index, ingestMode: "posts_and_comments" })}
                              disabled={runningIngest || Boolean(ingestActionsBlockedReason)}
                              className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {getWeekSyncActionLabel(platformFilter)}
                            </button>
                          </div>
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

    </>
  );
}
