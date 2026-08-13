"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import SocialPlatformTabIcon from "@/components/admin/SocialPlatformTabIcon";
import SocialPostsSection from "@/components/admin/social-posts-section";
import RedditSourcesManager from "@/components/admin/reddit-sources-manager";
import CastContentSection from "@/components/admin/cast-content-section";
import { SeasonSocialIngestControls } from "./season-social-analytics/SeasonSocialIngestControls";
import { SeasonSocialInsightPanels } from "./season-social-analytics/SeasonSocialInsightPanels";
import { SeasonSocialOverview } from "./season-social-analytics/SeasonSocialOverview";
import { SeasonSocialRunStatus } from "./season-social-analytics/SeasonSocialRunStatus";
import { SeasonSocialWeeklyTable } from "./season-social-analytics/SeasonSocialWeeklyTable";
import { invalidateAdminSnapshotFamilies } from "@/lib/admin/admin-snapshot-client";
import { fetchAdminWithAuth, getClientAuthHeaders } from "@/lib/admin/client-auth";
import {
  buildSocialAccountProfileUrl,
  buildSeasonSocialWeekUrl,
  parseSeasonEpisodeNumberFromPath,
  parseSeasonSocialPathSegment,
} from "@/lib/admin/show-admin-routes";
import { deriveCastComparisonWindow } from "@/lib/admin/cast-socialblade-charting";
import {
  buildSocialSyncSessionRequest,
  consumeSocialSyncSessionStream,
  type SocialSyncSessionProgressSnapshot,
  type SocialSyncSessionStreamPayload,
} from "@/lib/admin/social-sync-session";
import { buildIsoDayRange, SOCIAL_TIME_ZONE } from "@/lib/admin/social-timezone";
import { useSharedPollingResource, useSharedSseResource } from "@/lib/admin/shared-live-resource";
import { logAdminPageReadDiagnostic, measurePayloadBytes } from "@/lib/admin/page-read-diagnostics";
import {
  type Platform,
  type PlatformTab,
  type Scope,
  type SyncStrategy,
  type WeeklyMetric,
  type BenchmarkCompareMode,
  type SocialAnalyticsView,
  type SocialJob,
  type SocialRun,
  type SocialRunSummary,
  type SeasonSocialAnalyticsSnapshot,
  type SocialTarget,
  type LinkedAccountProfileSummary,
  type WorkerHealthState,
  type StaleRunState,
  type AnalyticsResponse,
  type IngestProxyErrorPayload,
  type SharedSeasonStatus,
  type CommentsCoverageResponse,
  type MirrorCoverageResponse,
  type CommentRefreshPolicy,
  type IngestMode,
  type WeekDetailPost,
  type WeekDetailResponse,
  type WeekDetailHashtagUsage,
  type MissingCommentTargets,
  type SocialStatsItem,
  type SocialLeaderboardLightboxEntry,
  type SeasonSocialAnalyticsSectionProps,
  PLATFORM_LABELS,
  PLATFORM_TABS,
  SOCIAL_PLATFORM_QUERY_KEY,
  SOCIAL_DENSITY_QUERY_KEY,
  SOCIAL_ALERTS_QUERY_KEY,
  SOCIAL_TABLE_METRICS_QUERY_KEY,
  SOCIAL_METRIC_MODE_QUERY_KEY,
  type SocialTableMetric,
  type SocialMetricMode,
  type WeekDetailTokenCounts,
  type DisplayThumbnailVariants,
  SOCIAL_TABLE_METRIC_OPTIONS,
  SOCIAL_TABLE_METRIC_KEYS,
  SOCIAL_TABLE_DETAIL_METRICS,
  type SocialDensity,
  HASHTAG_PLATFORMS,
  isPlatformTab,
  platformFilterFromTab,
  ACTIVE_RUN_STATUSES,
  TERMINAL_RUN_STATUSES,
  COMMENT_SYNC_MAX_PASSES,
  COMMENT_SYNC_MAX_DURATION_MS,
  SOCIAL_FULL_SYNC_MIRROR_ENABLED,
  getWeekSyncActionLabel,
  PLATFORM_ORDER,
  formatSyncStatusLabel,
  getSyncStatusTone,
  formatActiveJobSummary,
  formatSharedPipelineStageSummary,
  formatClassificationRuleSummary,
  buildPreviewPlatformStatuses,
  STALE_RUN_THRESHOLD_DEFAULT_MINUTES,
  MAX_COMMENT_ANCHOR_SOURCE_IDS_PER_PLATFORM,
  formatPercent,
  formatInteger,
  formatCompactInteger,
  formatDateTime,
  formatDateTimeFromDate,
  formatTime,
  formatDateOnly,
  formatDateShort,
  SEASON_WINDOW_PRESEASON_CONFIG_KEYS,
  SEASON_WINDOW_POSTSEASON_END_CONFIG_KEYS,
  type SeasonWindowDraft,
  type SeasonWindowRow,
  isRecordValue,
  deriveSeasonWindowDraft,
  seasonWindowTypeLabel,
  seasonWindowEpisodeLabel,
  formatDayScopeLabel,
  formatWeekScopeLabel,
  formatPlatformScopeLabel,
  normalizeIsoInstant,
  formatRunProgressLabel,
  formatDateRangeLabel,
  isCoveragePctUpToDate,
  getPlatformCoverage,
  getTotalCoverage,
  getReportedCommentsForWeekPost,
  formatMirrorCoverageLabel,
  REQUEST_TIMEOUT_MS,
  WEEK_DETAIL_FETCH_CONCURRENCY,
  WEEK_DETAIL_TARGETS_PAGE_LIMIT,
  WEEK_DETAIL_TARGETS_MAX_PAGES,
  BACKEND_SATURATION_MESSAGE,
  shouldSetPollingRetry,
  buildSocialRequestKey,
  buildRunsRequestKey,
  SOCIAL_CACHE_VERSION,
  SOCIAL_CACHE_PREFIX,
  type SocialSectionCacheSnapshot,
  isAbortError,
  buildCanonicalRoute,
  parseDateOrNull,
  parseTimestampMs,
  normalizeWorkerHealth,
  isTransientBackendSectionError,
  isBackendSaturationSectionError,
  readProxyErrorText,
  isTransientDevRestartMessage,
  parseResponseJson,
  fetchAdminWithTimeout,
  formatIngestErrorMessage,
  getMonthDayLabel,
  getHeatmapToneClass,
  formatFreshnessLabel,
  formatPctLabel,
  formatDurationLabel,
  type CastAttitudePrototypeRow,
  type ViewerAttitudePlatformRow,
  extractCastEntityCandidates,
  getWeeklyFlagToneClass,
  getWeekEpisodeLabel,
  getHeatmapWeekSectionLabel,
  getWeeklyTableEpisodePrimaryLabel,
  getWeeklyTableEpisodeSecondaryLabel,
  formatMetricCountLabel,
  getWeeklyDayValue,
  normalizeSocialTableMetrics,
  serializeSocialTableMetrics,
  normalizeSocialMetricMode,
  createEmptyHashtagUsageByPlatform,
  createEmptyWeekDetailTokenCounts,
  deriveWeekDetailTokenCounts,
  createEmptyWeekDetailHashtagUsage,
  deriveWeekDetailHashtagUsage,
  getJobStageLabel,
  statusToLogVerb,
  getJobStageCounters,
  getJobPersistCounters,
  getJobActivity,
  formatJobActivitySummary,
  STAGE_LABELS_PLAIN,
  JOB_STATUS_PLAIN,
  formatCountersPlain,
  formatJobOutcomeNote,
  isVideoLikeThumbnailUrl,
  detectSocialMediaType,
  getCanonicalLeaderboardThumbnailImage,
  getCanonicalLeaderboardThumbnailUrl,
  buildLeaderboardMediaMetadata,
  SocialStatsPanel,
} from "./season-social-analytics/section-helpers";
export {
  buildPreviewPlatformStatuses,
  buildRunsRequestKey,
  buildSocialRequestKey,
  formatIngestErrorMessage,
  formatJobOutcomeNote,
  POLL_FAILURES_BEFORE_RETRY_BANNER,
  shouldSetPollingRetry,
} from "./season-social-analytics/section-helpers";
export type {
  PlatformTab,
  SocialAnalyticsView,
  SocialTarget,
} from "./season-social-analytics/section-helpers";
const DEV_LOW_HEAT_MODE = process.env.NODE_ENV !== "production";
const DEV_VISIBLE_POLL_INTERVAL_MS = 8_000;
export default function SeasonSocialAnalyticsSection({
  showId,
  showSlug,
  seasonNumber,
  seasonId,
  showName,
  platformTab: controlledPlatformTab,
  onPlatformTabChange,
  hidePlatformTabs = false,
  externalControlsTarget = null,
  analyticsView = "bravo",
  onTargetsChange,
}: SeasonSocialAnalyticsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope: Scope = "network";
  const [uncontrolledPlatformTab, setUncontrolledPlatformTab] = useState<PlatformTab>("overview");
  const [socialDensity, setSocialDensity] = useState<SocialDensity>("comfortable");
  const [socialAlertsEnabled, setSocialAlertsEnabled] = useState(true);
  const isPlatformTabControlled = typeof controlledPlatformTab !== "undefined";
  const tabFromQuery = useMemo<PlatformTab>(() => {
    const value = searchParams.get(SOCIAL_PLATFORM_QUERY_KEY);
    return isPlatformTab(value) ? value : "overview";
  }, [searchParams]);
  const densityFromQuery = useMemo<SocialDensity>(() => {
    const value = searchParams.get(SOCIAL_DENSITY_QUERY_KEY);
    return value === "compact" ? "compact" : "comfortable";
  }, [searchParams]);
  const alertsFromQuery = useMemo<boolean>(() => {
    const value = searchParams.get(SOCIAL_ALERTS_QUERY_KEY);
    return value !== "off";
  }, [searchParams]);
  const selectedTableMetrics = useMemo<SocialTableMetric[]>(
    () => normalizeSocialTableMetrics(searchParams.get(SOCIAL_TABLE_METRICS_QUERY_KEY)),
    [searchParams],
  );
  const socialMetricMode = useMemo<SocialMetricMode>(
    () => normalizeSocialMetricMode(searchParams.get(SOCIAL_METRIC_MODE_QUERY_KEY)),
    [searchParams],
  );
  const socialMetricModeQueryValue = socialMetricMode === "total" ? null : socialMetricMode;
  const selectedTableMetricSet = useMemo(() => new Set(selectedTableMetrics), [selectedTableMetrics]);
  const socialTableMetricsQueryValue = useMemo(
    () => serializeSocialTableMetrics(selectedTableMetrics),
    [selectedTableMetrics],
  );
  const needsWeekDetailTokenMetrics = useMemo(
    () => selectedTableMetrics.some((metric) => SOCIAL_TABLE_DETAIL_METRICS.has(metric)),
    [selectedTableMetrics],
  );
  const needsWeekDetailHashtagAnalytics = analyticsView === "hashtags";
  const platformTab = controlledPlatformTab ?? uncontrolledPlatformTab;
  const platformFilter = useMemo(() => platformFilterFromTab(platformTab), [platformTab]);
  const [weekFilter] = useState<number | "all">("all");
  const [weeklyRunWeek, setWeeklyRunWeek] = useState<number | null>(null);
  const [weeklyRunPlatform, setWeeklyRunPlatform] = useState<"all" | Platform>("all");
  const [dayFilter, setDayFilter] = useState<string>("");
  const [dailyRunPlatform, setDailyRunPlatform] = useState<"all" | Platform>("all");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [targets, setTargets] = useState<SocialTarget[]>([]);
  const [seasonWindowDraft, setSeasonWindowDraft] = useState<SeasonWindowDraft>({
    trailerDropAt: "",
    postseasonEndAt: "",
  });
  const [seasonWindowSaving, setSeasonWindowSaving] = useState(false);
  const [seasonWindowMessage, setSeasonWindowMessage] = useState<string | null>(null);
  const [seasonWindowError, setSeasonWindowError] = useState<string | null>(null);
  const [linkedAccountSummaries, setLinkedAccountSummaries] = useState<Record<string, LinkedAccountProfileSummary>>({});
  const [runs, setRuns] = useState<SocialRun[]>([]);
  const [runSummaries, setRunSummaries] = useState<SocialRunSummary[]>([]);
  const [sharedStatus, setSharedStatus] = useState<SharedSeasonStatus | null>(null);
  const [runSummariesLoading, setRunSummariesLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<SocialJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryBootstrapReady, setPrimaryBootstrapReady] = useState(analyticsView === "reddit");
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
  const [workerHealth, setWorkerHealth] = useState<WorkerHealthState | null>(null);
  const [workerHealthError, setWorkerHealthError] = useState<string | null>(null);
  const [sharedStatusError, setSharedStatusError] = useState<string | null>(null);
  const [staleThresholdMinutes] = useState<number>(STALE_RUN_THRESHOLD_DEFAULT_MINUTES);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [syncCommentsCoveragePreview, setSyncCommentsCoveragePreview] = useState<CommentsCoverageResponse | null>(null);
  const [syncMirrorCoveragePreview, setSyncMirrorCoveragePreview] = useState<MirrorCoverageResponse | null>(null);
  const [runningIngest, setRunningIngest] = useState(false);
  const [syncDetailsExpanded, setSyncDetailsExpanded] = useState(false);
  const [cancellingRun, setCancellingRun] = useState(false);
  const [syncStrategy, setSyncStrategy] = useState<SyncStrategy>("incremental");
  const [weeklyMetric, setWeeklyMetric] = useState<WeeklyMetric>("posts");
  const [benchmarkCompareMode, setBenchmarkCompareMode] = useState<BenchmarkCompareMode>("previous");
  const [weekDetailTokenCountsByWeek, setWeekDetailTokenCountsByWeek] = useState<
    Record<number, WeekDetailTokenCounts>
  >({});
  const [weekDetailHashtagUsageByWeek, setWeekDetailHashtagUsageByWeek] = useState<
    Record<number, WeekDetailHashtagUsage>
  >({});
  const [weekDetailTokenCountsLoadingWeeks, setWeekDetailTokenCountsLoadingWeeks] = useState<Set<number>>(
    new Set(),
  );
  const [leaderboardLightbox, setLeaderboardLightbox] = useState<{
    entries: SocialLeaderboardLightboxEntry[];
    index: number;
  } | null>(null);
  const [ingestingWeek, setIngestingWeek] = useState<number | null>(null);
  const [ingestingDay, setIngestingDay] = useState<string | null>(null);
  const [activeRunRequest, setActiveRunRequest] = useState<{
    week: number | null;
    day: string | null;
    platform: "all" | Platform;
  } | null>(null);
  const [activeSyncSessionId, setActiveSyncSessionId] = useState<string | null>(null);
  const [activeSyncSession, setActiveSyncSession] = useState<SocialSyncSessionProgressSnapshot | null>(null);
  const [activeSyncSessionRetryKind, setActiveSyncSessionRetryKind] = useState<string | null>(null);
  const [activeSyncSessionStreamConnected, setActiveSyncSessionStreamConnected] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [ingestStartedAt, setIngestStartedAt] = useState<Date | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [ingestExportOpen, setIngestExportOpen] = useState(false);
  const [manualSourcesOpen, setManualSourcesOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [expandedJobErrors, setExpandedJobErrors] = useState<Set<string>>(new Set());
  const [elapsedTick, setElapsedTick] = useState(0);
  const [pollingStatus, setPollingStatus] = useState<"idle" | "retrying" | "recovered">("idle");
  const [isDocumentVisible, setIsDocumentVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState === "visible";
  });
  const [sectionLastSuccessAt, setSectionLastSuccessAt] = useState<{
    analytics: Date | null;
    targets: Date | null;
    runs: Date | null;
  }>({
    analytics: null,
    targets: null,
    runs: null,
  });
  const pollFailureCountRef = useRef(0);
  const autoSyncGenerationRef = useRef(0);
  const autoSyncSessionRef = useRef<{
    week: number | null;
    day: string | null;
    platform: "all" | Platform;
    ingestMode: IngestMode;
    rowMissingOnly: boolean;
    dateStart?: string;
    dateEnd?: string;
    pass: number;
    maxPasses: number;
    maxDurationMs: number;
    startedAtMs: number;
    enabled: boolean;
  } | null>(null);
  const runSeasonIngestButtonRef = useRef<HTMLButtonElement | null>(null);
  const ingestExportTriggerRef = useRef<HTMLButtonElement | null>(null);
  const ingestExportPopoverRef = useRef<HTMLDivElement | null>(null);
  const weekDetailTokenRequestsRef = useRef<Set<string>>(new Set());
  const weekDetailAbortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const weekDetailTokenCountsByWeekRef = useRef<Record<number, WeekDetailTokenCounts>>({});
  const weekDetailTokenCountsLoadingWeeksRef = useRef<Set<number>>(new Set());
  const episodeWeekRedirectRef = useRef<string | null>(null);
  const componentMountedRef = useRef(true);
  const activeAnalyticsViewRef = useRef<SocialAnalyticsView>(analyticsView);
  const refreshGenerationRef = useRef(0);
  const inFlightRef = useRef<{
    analyticsByKey: Map<string, Promise<AnalyticsResponse>>;
    runsByKey: Map<string, Promise<SocialRun[]>>;
    jobsByKey: Map<string, Promise<SocialJob[]>>;
    refreshAllByView: Map<SocialAnalyticsView, Promise<void>>;
  }>({
    analyticsByKey: new Map(),
    runsByKey: new Map(),
    jobsByKey: new Map(),
    refreshAllByView: new Map(),
  });
  const activeSyncSessionLastRefreshAtRef = useRef(0);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => setIsDocumentVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  const showRouteSlug = (showSlug || showId).trim();
  const seasonEpisodeNumberFromPath = useMemo(
    () => parseSeasonEpisodeNumberFromPath(pathname),
    [pathname],
  );
  const seasonSocialPathSegment = useMemo(
    () => parseSeasonSocialPathSegment(pathname),
    [pathname],
  );
  const cacheKey = useMemo(() => {
    const weekKey = weekFilter === "all" ? "all" : String(weekFilter);
    return `${SOCIAL_CACHE_PREFIX}:v${SOCIAL_CACHE_VERSION}:${showId}:${seasonNumber}:${seasonId}:${scope}:${platformFilter}:${weekKey}`;
  }, [platformFilter, scope, seasonId, seasonNumber, showId, weekFilter]);
  const getAuthHeaders = useCallback(
    async () => getClientAuthHeaders({ allowDevAdminBypass: true }),
    [],
  );
  const normalizeLinkedAccountHandle = useCallback((value: string | null | undefined): string => {
    return String(value || "").trim().replace(/^@+/, "").toLowerCase();
  }, []);
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
  useLayoutEffect(() => {
    const viewActuallyChanged = activeAnalyticsViewRef.current !== analyticsView;
    activeAnalyticsViewRef.current = analyticsView;
    if (viewActuallyChanged) {
      refreshGenerationRef.current += 1;
      inFlightRef.current.refreshAllByView.clear();
      inFlightRef.current.analyticsByKey.clear();
      inFlightRef.current.runsByKey.clear();
      inFlightRef.current.jobsByKey.clear();
    }
    if (analyticsView !== "reddit") {
      return;
    }
    setPrimaryBootstrapReady(true);
    setLoading(false);
    setError(null);
    setSectionErrors({
      analytics: null,
      targets: null,
      runs: null,
      jobs: null,
    });
    setWorkerHealth(null);
    setWorkerHealthError(null);
    setSharedStatus(null);
    setSharedStatusError(null);
    setRunSummaryError(null);
  }, [analyticsView]);
  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (!ingestExportOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (ingestExportPopoverRef.current?.contains(target)) return;
      if (ingestExportTriggerRef.current?.contains(target)) return;
      setIngestExportOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIngestExportOpen(false);
        ingestExportTriggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ingestExportOpen]);
  useEffect(() => {
    weekDetailTokenCountsByWeekRef.current = weekDetailTokenCountsByWeek;
  }, [weekDetailTokenCountsByWeek]);
  useEffect(() => {
    weekDetailTokenCountsLoadingWeeksRef.current = weekDetailTokenCountsLoadingWeeks;
  }, [weekDetailTokenCountsLoadingWeeks]);
  const isActiveView = useCallback(
    (expectedView: SocialAnalyticsView) =>
      componentMountedRef.current && activeAnalyticsViewRef.current === expectedView,
    [],
  );
  const isCurrentRefreshRequest = useCallback(
    (requestView: SocialAnalyticsView, requestId: number) =>
      componentMountedRef.current &&
      activeAnalyticsViewRef.current === requestView &&
      refreshGenerationRef.current === requestId,
    [],
  );

  const readErrorMessage = useCallback(async (response: Response, fallback: string): Promise<string> => {
    const data = (await response.json().catch(() => ({}))) as IngestProxyErrorPayload;
    const upstreamDetailText = readProxyErrorText(data.upstream_detail);
    if (
      data.code === "BACKEND_SATURATED" ||
      isBackendSaturationSectionError(data.error) ||
      isBackendSaturationSectionError(data.detail) ||
      isBackendSaturationSectionError(upstreamDetailText)
    ) {
      return BACKEND_SATURATION_MESSAGE;
    }
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

  const toggleSocialTableMetric = useCallback(
    (metric: SocialTableMetric) => {
      const currentlySelected = selectedTableMetricSet.has(metric);
      const nextMetrics = currentlySelected
        ? selectedTableMetrics.filter((item) => item !== metric)
        : [...selectedTableMetrics, metric];
      const serialized = serializeSocialTableMetrics(nextMetrics);
      setSocialPreferenceInUrl(SOCIAL_TABLE_METRICS_QUERY_KEY, serialized);
    },
    [selectedTableMetricSet, selectedTableMetrics, setSocialPreferenceInUrl],
  );

  const toggleAllSocialTableMetrics = useCallback(() => {
    if (selectedTableMetrics.length === SOCIAL_TABLE_METRIC_KEYS.length) {
      setSocialPreferenceInUrl(SOCIAL_TABLE_METRICS_QUERY_KEY, "none");
      return;
    }
    setSocialPreferenceInUrl(SOCIAL_TABLE_METRICS_QUERY_KEY, SOCIAL_TABLE_METRIC_KEYS.join(","));
  }, [selectedTableMetrics.length, setSocialPreferenceInUrl]);

  const setSocialMetricMode = useCallback(
    (nextMode: SocialMetricMode) => {
      setSocialPreferenceInUrl(SOCIAL_METRIC_MODE_QUERY_KEY, nextMode === "total" ? null : nextMode);
    },
    [setSocialPreferenceInUrl],
  );

  const buildWeekDetailHref = useCallback(
    (weekIndex: number, dayLocal?: string) => {
      const weekLinkQuery = new URLSearchParams();
      if (analyticsView !== "bravo") {
        weekLinkQuery.set("social_view", analyticsView);
      }
      if (socialDensity !== "comfortable") {
        weekLinkQuery.set(SOCIAL_DENSITY_QUERY_KEY, socialDensity);
      }
      if (!socialAlertsEnabled) {
        weekLinkQuery.set(SOCIAL_ALERTS_QUERY_KEY, "off");
      }
      if (socialTableMetricsQueryValue) {
        weekLinkQuery.set(SOCIAL_TABLE_METRICS_QUERY_KEY, socialTableMetricsQueryValue);
      }
      if (socialMetricModeQueryValue) {
        weekLinkQuery.set(SOCIAL_METRIC_MODE_QUERY_KEY, socialMetricModeQueryValue);
      }
      if (dayLocal) {
        weekLinkQuery.set("day", dayLocal);
      }
      return buildSeasonSocialWeekUrl({
        showSlug: showRouteSlug,
        seasonNumber,
        weekIndex,
        platform: platformTab !== "overview" ? platformTab : undefined,
        query: weekLinkQuery,
      });
    },
    [
      analyticsView,
      platformTab,
      seasonNumber,
      showRouteSlug,
      socialAlertsEnabled,
      socialDensity,
      socialMetricModeQueryValue,
      socialTableMetricsQueryValue,
    ],
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
    if (!seasonEpisodeNumberFromPath) return;
    if (!seasonSocialPathSegment) return;
    if (!analytics) return;
    const weeklyCandidates = [
      ...(analytics.weekly ?? []),
      ...(analytics.weekly_platform_posts ?? []),
    ];
    const matchedWeek = weeklyCandidates.find((row) => {
      const episodeNumber = Number(row.episode_number ?? NaN);
      return Number.isFinite(episodeNumber) && episodeNumber === seasonEpisodeNumberFromPath;
    });
    if (!matchedWeek || !Number.isFinite(matchedWeek.week_index)) return;

    const platformFromPath =
      seasonSocialPathSegment === "instagram" ||
      seasonSocialPathSegment === "tiktok" ||
      seasonSocialPathSegment === "twitter" ||
      seasonSocialPathSegment === "youtube" ||
      seasonSocialPathSegment === "facebook" ||
      seasonSocialPathSegment === "threads"
        ? seasonSocialPathSegment
        : null;
    const platformForWeek =
      platformFromPath ?? (platformTab !== "overview" ? platformTab : undefined);
    const nextQuery = new URLSearchParams(searchParams.toString());
    nextQuery.delete("social_platform");
    const nextHref = buildSeasonSocialWeekUrl({
      showSlug: showRouteSlug,
      seasonNumber,
      weekIndex: matchedWeek.week_index,
      platform: platformForWeek,
      query: nextQuery,
    });
    const currentHref = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (buildCanonicalRoute(nextHref) === buildCanonicalRoute(currentHref)) return;
    const redirectKey = `${pathname}|${nextHref}|${seasonEpisodeNumberFromPath}`;
    if (episodeWeekRedirectRef.current === redirectKey) return;
    episodeWeekRedirectRef.current = redirectKey;
    router.replace(nextHref as Route, { scroll: false });
  }, [
    analytics,
    pathname,
    platformTab,
    router,
    searchParams,
    seasonEpisodeNumberFromPath,
    seasonNumber,
    seasonSocialPathSegment,
    showRouteSlug,
  ]);

  useEffect(() => {
    setWeekDetailTokenCountsByWeek({});
    setWeekDetailHashtagUsageByWeek({});
    setWeekDetailTokenCountsLoadingWeeks(new Set());
    weekDetailTokenRequestsRef.current.clear();
  }, [seasonId, scope, platformFilter]);

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

  useEffect(() => {
    onTargetsChange?.(targets);
  }, [onTargetsChange, targets]);

  const savedSeasonWindowDraft = useMemo(() => deriveSeasonWindowDraft(targets), [targets]);

  useEffect(() => {
    if (seasonWindowSaving) return;
    setSeasonWindowDraft(savedSeasonWindowDraft);
  }, [savedSeasonWindowDraft, seasonWindowSaving]);

  const fetchAnalytics = useCallback(async () => {
    const existingRequest = inFlightRef.current.analyticsByKey.get(analyticsRequestKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      try {
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
        const data = await parseResponseJson<AnalyticsResponse>(response, "Failed to load social analytics");
        if (!isActiveView(analyticsView)) {
          return data;
        }
        const now = new Date();
        setAnalytics(data);
        setLastUpdated(now);
        setSectionLastSuccessAt((current) => ({ ...current, analytics: now }));
        return data;
      } catch (analyticsError) {
        const message =
          analyticsError instanceof Error ? analyticsError.message : "Failed to load social analytics";
        if (isActiveView(analyticsView)) {
          setSectionErrors((current) => ({ ...current, analytics: message }));
        }
        throw analyticsError;
      }
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
  }, [
    analyticsRequestKey,
    analyticsView,
    getAuthHeaders,
    isActiveView,
    queryString,
    readErrorMessage,
    seasonNumber,
    showId,
  ]);

  const appendCurrentRunScopeParams = useCallback(
    (
      params: URLSearchParams,
      options?: {
        platform?: "all" | Platform | null;
        week?: number | null;
        day?: string | null;
      },
    ) => {
      const effectivePlatform = options?.platform ?? activeRunRequest?.platform ?? platformFilter;
      const effectiveDay = options?.day?.trim() || activeRunRequest?.day?.trim() || "";
      const effectiveWeek =
        effectiveDay.length > 0
          ? null
          : (options?.week ?? activeRunRequest?.week ?? (weekFilter === "all" ? null : weekFilter));

      if (effectivePlatform && effectivePlatform !== "all") {
        params.set("platforms", effectivePlatform);
      }
      if (effectiveDay) {
        const dayRange = buildIsoDayRange(effectiveDay);
        if (dayRange) {
          params.set("date_start", dayRange.dateStart);
          params.set("date_end", dayRange.dateEnd);
        }
        return;
      }
      if (effectiveWeek !== null) {
        params.set("week_index", String(effectiveWeek));
        const weekWindow =
          (analytics?.weekly ?? []).find((item) => item.week_index === effectiveWeek) ??
          (analytics?.weekly_platform_posts ?? []).find((item) => item.week_index === effectiveWeek);
        if (weekWindow) {
          params.set("date_start", weekWindow.start);
          params.set("date_end", weekWindow.end);
        }
      }
    },
    [activeRunRequest, analytics, platformFilter, weekFilter],
  );

  const fetchRuns = useCallback(async (options?: { runId?: string | null; limit?: number }) => {
    const runId = options?.runId?.trim() || null;
    const requestedLimit = Number.isFinite(options?.limit) ? Number(options?.limit) : 100;
    const safeLimit = Math.max(1, Math.min(250, requestedLimit));
    const scopePlatformKey = activeRunRequest?.platform ?? platformFilter;
    const scopeDayKey = activeRunRequest?.day?.trim() || "all";
    const scopeWeekKey =
      scopeDayKey !== "all"
        ? "day"
        : String(activeRunRequest?.week ?? (weekFilter === "all" ? "all" : weekFilter));
    const scopedRunsKey =
      `${runsRequestKey}:platform=${scopePlatformKey}:week=${scopeWeekKey}:day=${scopeDayKey}:run=${runId ?? "all"}:limit=${safeLimit}`;
    const existingRequest = inFlightRef.current.runsByKey.get(scopedRunsKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      if (!isActiveView(analyticsView)) {
        return [] as SocialRun[];
      }

      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ limit: String(safeLimit) });
      params.set("source_scope", scope);
      params.set("season_id", seasonId);
      appendCurrentRunScopeParams(params);
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
      const data = await parseResponseJson<{ runs?: SocialRun[] }>(response, "Failed to load social runs");
      const nextRuns = data.runs ?? [];
      if (!runId) {
        if (isActiveView(analyticsView)) {
          setRuns(nextRuns);
        }
      } else {
        if (isActiveView(analyticsView)) {
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
      }
      if (isActiveView(analyticsView)) {
        setSectionLastSuccessAt((current) => ({ ...current, runs: new Date() }));
      }
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
  }, [
    activeRunRequest,
    analyticsView,
    appendCurrentRunScopeParams,
    getAuthHeaders,
    isActiveView,
    platformFilter,
    readErrorMessage,
    runsRequestKey,
    scope,
    seasonId,
    seasonNumber,
    showId,
    weekFilter,
  ]);

  const fetchRunSummaries = useCallback(async () => {
    if (!isActiveView(analyticsView)) return [] as SocialRunSummary[];
    setRunSummariesLoading(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ limit: "20" });
      params.set("source_scope", scope);
      params.set("season_id", seasonId);
      appendCurrentRunScopeParams(params);
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/runs/summary?${params.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.runs,
        "Social run summary request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load social run summary"));
      }
      const data = await parseResponseJson<{ summaries?: SocialRunSummary[] }>(
        response,
        "Failed to load social run summary",
      );
      const nextSummaries = data.summaries ?? [];
      if (isActiveView(analyticsView)) {
        setRunSummaries(nextSummaries);
        setRunSummaryError(null);
      }
      return nextSummaries;
    } finally {
      if (isActiveView(analyticsView)) {
        setRunSummariesLoading(false);
      }
    }
  }, [
    analyticsView,
    appendCurrentRunScopeParams,
    getAuthHeaders,
    isActiveView,
    readErrorMessage,
    scope,
    seasonId,
    seasonNumber,
    showId,
  ]);

  const buildTargetOverrides = useCallback(
    (platforms?: Platform[] | null): {
      accounts_override: string[];
      hashtags_override: string[];
      keywords_override: string[];
    } => {
      const platformSet = platforms && platforms.length > 0 ? new Set(platforms) : null;
      const accountsOverride: string[] = [];
      const hashtagsOverride: string[] = [];
      const keywordsOverride: string[] = [];
      const seenAccounts = new Set<string>();
      const seenHashtags = new Set<string>();
      const seenKeywords = new Set<string>();

      for (const target of targets) {
        const platform = String(target.platform || "").trim().toLowerCase();
        if (!PLATFORM_ORDER.includes(platform as Platform)) continue;
        if (target.is_active === false) continue;
        if (platformSet && !platformSet.has(platform as Platform)) continue;

        for (const rawAccount of target.accounts ?? []) {
          const normalized = String(rawAccount ?? "").trim();
          const key = normalized.toLowerCase();
          if (!normalized || seenAccounts.has(key)) continue;
          seenAccounts.add(key);
          accountsOverride.push(normalized);
        }
        for (const rawHashtag of target.hashtags ?? []) {
          const normalized = String(rawHashtag ?? "").trim().replace(/^#+/, "");
          const key = normalized.toLowerCase();
          if (!normalized || seenHashtags.has(key)) continue;
          seenHashtags.add(key);
          hashtagsOverride.push(normalized);
        }
        for (const rawKeyword of target.keywords ?? []) {
          const normalized = String(rawKeyword ?? "").trim();
          const key = normalized.toLowerCase();
          if (!normalized || seenKeywords.has(key)) continue;
          seenKeywords.add(key);
          keywordsOverride.push(normalized);
        }
      }

      return {
        accounts_override: accountsOverride,
        hashtags_override: hashtagsOverride,
        keywords_override: keywordsOverride,
      };
    },
    [targets],
  );

  const fetchJobs = useCallback(async (
    runId?: string | null,
    options?: { preserveLastGoodIfEmpty?: boolean; limit?: number },
  ) => {
    if (!isActiveView(analyticsView)) {
      return [] as SocialJob[];
    }

    if (!runId) {
      setJobs([]);
      return [] as SocialJob[];
    }
    const requestedLimit = Number.isFinite(options?.limit) ? Number(options?.limit) : 100;
    const safeLimit = Math.max(1, Math.min(250, requestedLimit));
    const jobsRequestKey = `${seasonId}:${runId}:${safeLimit}`;
    const existingRequest = inFlightRef.current.jobsByKey.get(jobsRequestKey);
    if (existingRequest) {
      return existingRequest;
    }
    const request = (async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ limit: String(safeLimit), run_id: runId });
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
      const data = await parseResponseJson<{ jobs?: SocialJob[] }>(response, "Failed to load social jobs");
      const nextJobs = data.jobs ?? [];
      if (isActiveView(analyticsView)) {
        setJobs((current) => {
          if (options?.preserveLastGoodIfEmpty && nextJobs.length === 0) {
            const hasCurrentForRun = current.some((job) => job.run_id === runId);
            if (hasCurrentForRun) {
              return current;
            }
          }
          return nextJobs;
        });
      }
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
  }, [analyticsView, getAuthHeaders, isActiveView, readErrorMessage, seasonId, seasonNumber, showId]);

  const applySeasonSnapshot = useCallback(
    (
      snapshot: SeasonSocialAnalyticsSnapshot,
      options?: {
        preserveLastGoodJobsIfEmpty?: boolean;
      },
    ) => {
      const generatedAt = parseDateOrNull(snapshot.generated_at ?? null) ?? new Date();
      if (snapshot.analytics) {
        setAnalytics(snapshot.analytics);
      }
      if (Array.isArray(snapshot.targets)) {
        setTargets(snapshot.targets);
      }
      if (Array.isArray(snapshot.runs)) {
        setRuns(snapshot.runs);
      }
      if (Array.isArray(snapshot.run_summaries)) {
        setRunSummaries(snapshot.run_summaries);
        setRunSummaryError(null);
      }
      if (snapshot.worker_health && typeof snapshot.worker_health === "object") {
        setWorkerHealth(normalizeWorkerHealth(snapshot.worker_health));
        setWorkerHealthError(null);
      }
      if (snapshot.shared_status && typeof snapshot.shared_status === "object") {
        setSharedStatus(snapshot.shared_status);
        setSharedStatusError(null);
      }
      if (Array.isArray(snapshot.jobs)) {
        const nextJobs = snapshot.jobs;
        setJobs((current) => {
          if (
            options?.preserveLastGoodJobsIfEmpty &&
            nextJobs.length === 0 &&
            activeRunId &&
            current.some((job) => job.run_id === activeRunId)
          ) {
            return current;
          }
          return nextJobs;
        });
      }
      setLastUpdated(generatedAt);
      setSectionLastSuccessAt((current) => ({
        analytics: snapshot.analytics ? generatedAt : current.analytics,
        targets: Array.isArray(snapshot.targets) ? generatedAt : current.targets,
        runs: Array.isArray(snapshot.runs) ? generatedAt : current.runs,
      }));
    },
    [activeRunId],
  );

  const fetchSeasonSnapshot = useCallback(
    async (options?: { forceRefresh?: boolean; signal?: AbortSignal }) => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams(queryString);
      params.set("season_id", seasonId);
      params.set("source_scope", scope);
      params.set("runs_limit", activeRunId ? "1" : "100");
      params.set("run_summaries_limit", "20");
      params.set("jobs_limit", "100");
      if (activeRunId) {
        params.set("run_id", activeRunId);
      } else {
        params.delete("run_id");
      }
      if (options?.forceRefresh) {
        params.set("refresh", "1");
      }

      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/snapshot?${params.toString()}`,
        { headers, cache: "no-store", signal: options?.signal },
        REQUEST_TIMEOUT_MS.analytics,
        "Social analytics snapshot request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load season social analytics snapshot"));
      }
      const envelope = await parseResponseJson<
        | SeasonSocialAnalyticsSnapshot
        | {
            data?: SeasonSocialAnalyticsSnapshot;
            generated_at?: string | null;
            cache_age_ms?: number;
            stale?: boolean;
          }
      >(
        response,
        "Failed to load season social analytics snapshot",
      );
      const payload =
        envelope && typeof envelope === "object" && "data" in envelope && envelope.data
          ? {
              ...envelope.data,
              generated_at: envelope.generated_at ?? envelope.data.generated_at,
              cache_age_ms:
                typeof envelope.cache_age_ms === "number"
                  ? envelope.cache_age_ms
                  : envelope.data.cache_age_ms,
              stale: typeof envelope.stale === "boolean" ? envelope.stale : envelope.data.stale,
            }
          : (envelope as SeasonSocialAnalyticsSnapshot);
      return {
        payload,
        cacheStatus: response.headers.get("x-trr-cache") ?? "miss",
      };
    },
    [activeRunId, getAuthHeaders, queryString, readErrorMessage, scope, seasonId, seasonNumber, showId],
  );

  const fetchCommentsCoverage = useCallback(
    async (scopeWindow: {
      platform: "all" | Platform;
      dateStart?: string;
      dateEnd?: string;
      sourceScope: Scope;
    }) => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("season_id", seasonId);
      params.set("source_scope", scopeWindow.sourceScope);
      params.set("timezone", SOCIAL_TIME_ZONE);
      if (scopeWindow.platform !== "all") {
        params.set("platforms", scopeWindow.platform);
      }
      if (scopeWindow.dateStart) params.set("date_start", scopeWindow.dateStart);
      if (scopeWindow.dateEnd) params.set("date_end", scopeWindow.dateEnd);
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/comments-coverage?${params.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.commentsCoverage,
        "Comments coverage request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load comments coverage"));
      }
      return await parseResponseJson<CommentsCoverageResponse>(response, "Failed to load comments coverage");
    },
    [getAuthHeaders, readErrorMessage, seasonId, seasonNumber, showId],
  );

  const fetchMirrorCoverage = useCallback(
    async (scopeWindow: {
      platform: "all" | Platform;
      dateStart?: string;
      dateEnd?: string;
      sourceScope: Scope;
    }) => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("season_id", seasonId);
      params.set("source_scope", scopeWindow.sourceScope);
      params.set("timezone", SOCIAL_TIME_ZONE);
      if (scopeWindow.platform !== "all") {
        params.set("platforms", scopeWindow.platform);
      }
      if (scopeWindow.dateStart) params.set("date_start", scopeWindow.dateStart);
      if (scopeWindow.dateEnd) params.set("date_end", scopeWindow.dateEnd);
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/mirror-coverage?${params.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.mirrorCoverage,
        "Mirror coverage request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load mirror coverage"));
      }
      return await parseResponseJson<MirrorCoverageResponse>(response, "Failed to load mirror coverage");
    },
    [getAuthHeaders, readErrorMessage, seasonId, seasonNumber, showId],
  );

  const requeueMirrorJobs = useCallback(
    async (scopeWindow: {
      platforms: Platform[];
      sourceScope: Scope;
      dateStart?: string;
      dateEnd?: string;
    }): Promise<{ queuedJobs: number; failed: number }> => {
      if (scopeWindow.platforms.length === 0) {
        return { queuedJobs: 0, failed: 0 };
      }
      const headers = await getAuthHeaders();
      let queuedJobs = 0;
      let failed = 0;
      for (const platform of scopeWindow.platforms) {
        const params = new URLSearchParams({
          season_id: seasonId,
          platform,
          source_scope: scopeWindow.sourceScope,
          failed_only: "false",
        });
        if (scopeWindow.dateStart) params.set("date_start", scopeWindow.dateStart);
        if (scopeWindow.dateEnd) params.set("date_end", scopeWindow.dateEnd);
        const response = await fetchAdminWithTimeout(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/mirror/requeue?${params.toString()}`,
          {
            method: "POST",
            headers,
          },
          REQUEST_TIMEOUT_MS.mirrorCoverage,
          "Mirror requeue request timed out",
        );
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, `Failed to requeue mirror jobs for ${platform}`));
        }
        const payload = (await response.json().catch(() => ({}))) as {
          queued_jobs?: unknown;
          failed?: unknown;
        };
        queuedJobs += Number(payload.queued_jobs ?? 0) || 0;
        failed += Number(payload.failed ?? 0) || 0;
      }
      return { queuedJobs, failed };
    },
    [getAuthHeaders, readErrorMessage, seasonId, seasonNumber, showId],
  );

  const fetchWeekDetail = useCallback(
    async (scopeWindow: {
      weekIndex: number;
      platform: "all" | Platform;
      sourceScope: Scope;
      postLimit?: number;
      postOffset?: number;
      signal?: AbortSignal;
    }) => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("season_id", seasonId);
      params.set("source_scope", scopeWindow.sourceScope);
      params.set("timezone", SOCIAL_TIME_ZONE);
      params.set("max_comments_per_post", "0");
      params.set("post_limit", String(Math.max(1, Number(scopeWindow.postLimit ?? WEEK_DETAIL_TARGETS_PAGE_LIMIT))));
      params.set("post_offset", String(Math.max(0, Number(scopeWindow.postOffset ?? 0))));
      if (scopeWindow.platform !== "all") {
        params.set("platforms", scopeWindow.platform);
      }
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/week/${scopeWindow.weekIndex}?${params.toString()}`,
        { headers, cache: "no-store", signal: scopeWindow.signal },
        REQUEST_TIMEOUT_MS.weekDetail,
        "Week detail request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load week detail"));
      }
      return await parseResponseJson<WeekDetailResponse>(response, "Failed to load week detail");
    },
    [getAuthHeaders, readErrorMessage, seasonId, seasonNumber, showId],
  );

  const buildMissingCommentTargets = useCallback(
    async (scopeWindow: {
      weekIndex: number;
      platform: "all" | Platform;
      sourceScope: Scope;
    }): Promise<MissingCommentTargets> => {
      const aggregatedPlatforms: Partial<Record<Platform, { posts?: WeekDetailPost[] }>> = {};
      let pageOffset = 0;
      let pageCount = 0;
      let hasMore = true;

      while (hasMore && pageCount < WEEK_DETAIL_TARGETS_MAX_PAGES) {
        const page = await fetchWeekDetail({
          ...scopeWindow,
          postLimit: WEEK_DETAIL_TARGETS_PAGE_LIMIT,
          postOffset: pageOffset,
        });
        for (const platform of PLATFORM_ORDER) {
          const pagePlatformPayload = page.platforms?.[platform];
          if (!pagePlatformPayload?.posts?.length) continue;
          const existingPlatformPayload = aggregatedPlatforms[platform] ?? {
            posts: [],
          };
          existingPlatformPayload.posts = [
            ...(existingPlatformPayload.posts ?? []),
            ...(pagePlatformPayload.posts ?? []),
          ];
          aggregatedPlatforms[platform] = existingPlatformPayload;
        }
        const returnedCount = Number(
          page.pagination?.returned ??
            Object.values(page.platforms ?? {}).reduce(
              (sum, platformPayload) => sum + (platformPayload?.posts?.length ?? 0),
              0,
            ),
        );
        hasMore = Boolean(page.pagination?.has_more) && returnedCount > 0;
        pageOffset =
          page.pagination && Number.isFinite(Number(page.pagination.offset))
            ? Number(page.pagination.offset) + returnedCount
            : pageOffset + returnedCount;
        pageCount += 1;
      }
      const sourceIdsByPlatform: Partial<Record<Platform, string[]>> = {};
      const stalePlatforms = new Set<Platform>();
      const overflowPlatforms = new Set<Platform>();
      let staleAnchorsCount = 0;

      for (const platform of PLATFORM_ORDER) {
        const posts = aggregatedPlatforms[platform]?.posts ?? [];
        const staleSourceIds = new Set<string>();
        for (const post of posts) {
          const sourceId = String(post?.source_id ?? "").trim();
          if (!sourceId) continue;
          const reportedComments = getReportedCommentsForWeekPost(platform, post);
          const savedComments = Number(post?.total_comments_available ?? 0);
          if (reportedComments > savedComments) {
            staleSourceIds.add(sourceId);
          }
        }

        if (staleSourceIds.size === 0) continue;
        stalePlatforms.add(platform);
        staleAnchorsCount += staleSourceIds.size;
        if (staleSourceIds.size > MAX_COMMENT_ANCHOR_SOURCE_IDS_PER_PLATFORM) {
          overflowPlatforms.add(platform);
          continue;
        }
        sourceIdsByPlatform[platform] = [...staleSourceIds].sort();
      }

      return {
        platforms: [...stalePlatforms],
        sourceIdsByPlatform,
        staleAnchorsCount,
        overflowPlatforms: [...overflowPlatforms],
      };
    },
    [fetchWeekDetail],
  );

  const refreshAll = useCallback(async (options?: { forceRefresh?: boolean }) => {
    const requestView: SocialAnalyticsView = analyticsView;
    const existingRequest = inFlightRef.current.refreshAllByView.get(requestView);
    if (existingRequest) {
      return existingRequest;
    }

    const requestId = refreshGenerationRef.current;
    const isCurrentRequest = () => isCurrentRefreshRequest(requestView, requestId);

    const request = (async () => {
      if (!isCurrentRequest()) {
        return;
      }

      if (requestView === "reddit") {
        setPrimaryBootstrapReady(true);
        setLoading(false);
        setSectionErrors({
          analytics: null,
          targets: null,
          runs: null,
          jobs: null,
        });
        setWorkerHealth(null);
        setWorkerHealthError(null);
        setSharedStatus(null);
        setSharedStatusError(null);
        setRunSummaryError(null);
        return;
      }

      setLoading(true);
      setPrimaryBootstrapReady(false);
      setError(null);
      const primaryStartedAt = Date.now();
      logAdminPageReadDiagnostic({
        pageFamily: "season-social-analytics",
        resource: "primary-bootstrap",
        requestRole: "primary",
        phase: "start",
      });
      const nextSectionErrors = {
        analytics: null as string | null,
        targets: null as string | null,
        runs: null as string | null,
        jobs: null as string | null,
      };
      let snapshotPayload: SeasonSocialAnalyticsSnapshot | null = null;
      let snapshotCacheStatus = "miss";
      try {
        const snapshot = await fetchSeasonSnapshot({ forceRefresh: options?.forceRefresh });
        snapshotPayload = snapshot.payload;
        snapshotCacheStatus = snapshot.cacheStatus;
        applySeasonSnapshot(snapshot.payload, { preserveLastGoodJobsIfEmpty: true });
        const loadedRuns = Array.isArray(snapshot.payload.runs) ? snapshot.payload.runs : [];
        const activeRun = loadedRuns.find((run) => ACTIVE_RUN_STATUSES.has(run.status));
        if (activeRun) {
          setActiveRunId(activeRun.id);
        } else if (!runningIngest) {
          setActiveRunId(null);
        }
        if (selectedRunId && !loadedRuns.some((run) => run.id === selectedRunId)) {
          setSelectedRunId(null);
        }
        setWorkerHealthError(null);
        setSharedStatusError(null);
        setRunSummaryError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load season social analytics snapshot";
        nextSectionErrors.analytics = message;
        nextSectionErrors.targets = message;
        nextSectionErrors.runs = message;
        nextSectionErrors.jobs = message;
        setWorkerHealthError(message);
        setSharedStatusError(message);
        setRunSummaryError(message);
      }

      if (!isCurrentRequest()) {
        return;
      }

      if (!isCurrentRequest()) {
        return;
      }

      setSectionErrors(nextSectionErrors);
      setLoading(false);
      setPrimaryBootstrapReady(true);
      logAdminPageReadDiagnostic({
        pageFamily: "season-social-analytics",
        resource: "primary-bootstrap",
        requestRole: "primary",
        phase: nextSectionErrors.analytics || nextSectionErrors.targets || nextSectionErrors.runs ? "error" : "success",
        cacheStatus:
          snapshotCacheStatus === "refresh" ? "refresh" : snapshotCacheStatus === "hit" ? "hit" : "miss",
        cacheHit: snapshotCacheStatus === "hit",
        stale: Boolean(snapshotPayload?.stale),
        refreshCause: options?.forceRefresh ? "manual" : "bootstrap",
        durationMs: Date.now() - primaryStartedAt,
        payloadBytes: measurePayloadBytes(snapshotPayload),
        message: [nextSectionErrors.analytics, nextSectionErrors.targets, nextSectionErrors.runs]
          .filter((value): value is string => Boolean(value))
          .join(" | "),
      });
    })();

    inFlightRef.current.refreshAllByView.set(requestView, request);
    try {
      await request;
    } finally {
      const activeRequest = inFlightRef.current.refreshAllByView.get(requestView);
      if (activeRequest === request) {
        inFlightRef.current.refreshAllByView.delete(requestView);
      }
    }
  }, [
    applySeasonSnapshot,
    fetchSeasonSnapshot,
    isCurrentRefreshRequest,
    runningIngest,
    selectedRunId,
    analyticsView,
  ]);

  const invalidateSeasonSnapshotFamily = useCallback(async () => {
    try {
      await invalidateAdminSnapshotFamilies([
        {
          pageFamily: "season-social-analytics",
          scope: `${showId}:${seasonNumber}`,
        },
      ]);
    } catch {
      // Best-effort only.
    }
  }, [seasonNumber, showId]);

  const seasonWindowDraftChanged =
    seasonWindowDraft.trailerDropAt !== savedSeasonWindowDraft.trailerDropAt ||
    seasonWindowDraft.postseasonEndAt !== savedSeasonWindowDraft.postseasonEndAt;

  const saveSeasonWindowSettings = useCallback(async () => {
    if (targets.length === 0) {
      setSeasonWindowError("Add at least one social target before saving season windows.");
      setSeasonWindowMessage(null);
      return;
    }

    setSeasonWindowSaving(true);
    setSeasonWindowError(null);
    setSeasonWindowMessage(null);
    try {
      const trailerDropAt = seasonWindowDraft.trailerDropAt.trim();
      const postseasonEndAt = seasonWindowDraft.postseasonEndAt.trim();
      const nextTargets = targets.map((target) => {
        const nextConfig = isRecordValue(target.config) ? { ...target.config } : {};
        for (const key of SEASON_WINDOW_PRESEASON_CONFIG_KEYS) {
          delete nextConfig[key];
        }
        for (const key of SEASON_WINDOW_POSTSEASON_END_CONFIG_KEYS) {
          delete nextConfig[key];
        }
        if (trailerDropAt) {
          for (const key of SEASON_WINDOW_PRESEASON_CONFIG_KEYS) {
            nextConfig[key] = trailerDropAt;
          }
        }
        if (postseasonEndAt) {
          nextConfig.postseason_end_at = postseasonEndAt;
        }
        return {
          ...target,
          timezone: target.timezone || SOCIAL_TIME_ZONE,
          config: nextConfig,
        };
      });

      const authHeaders = await getAuthHeaders();
      const requestHeaders = new Headers(authHeaders);
      requestHeaders.set("content-type", "application/json");
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/targets?season_id=${seasonId}`,
        {
          method: "PUT",
          headers: requestHeaders,
          cache: "no-store",
          body: JSON.stringify({
            source_scope: scope,
            targets: nextTargets,
          }),
        },
        { allowDevAdminBypass: true },
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to save season windows"));
      }
      const payload = await parseResponseJson<{ targets?: SocialTarget[] }>(response, "Failed to save season windows");
      if (Array.isArray(payload.targets)) {
        setTargets(payload.targets);
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(cacheKey);
      }
      await invalidateSeasonSnapshotFamily();
      await refreshAll({ forceRefresh: true });
      setSeasonWindowMessage("Season windows saved.");
    } catch (error) {
      setSeasonWindowError(error instanceof Error ? error.message : "Failed to save season windows");
    } finally {
      setSeasonWindowSaving(false);
    }
  }, [
    cacheKey,
    getAuthHeaders,
    invalidateSeasonSnapshotFamily,
    readErrorMessage,
    refreshAll,
    scope,
    seasonId,
    seasonNumber,
    seasonWindowDraft.postseasonEndAt,
    seasonWindowDraft.trailerDropAt,
    showId,
    targets,
  ]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!primaryBootstrapReady) {
      return;
    }
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
  }, [fetchJobs, primaryBootstrapReady, selectedRunId]);

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

  const weekLabelByIndex = useMemo(() => {
    const map = new Map<number, string>();
    for (const week of analytics?.weekly ?? []) {
      if (!Number.isFinite(week.week_index)) continue;
      map.set(week.week_index, week.label ?? formatWeekScopeLabel(week.week_index));
    }
    for (const week of analytics?.weekly_platform_posts ?? []) {
      if (!Number.isFinite(week.week_index) || map.has(week.week_index)) continue;
      map.set(week.week_index, week.label ?? formatWeekScopeLabel(week.week_index));
    }
    return map;
  }, [analytics]);

  const resolveWeekScopeLabel = useCallback(
    (week: number | "all" | null): string => {
      if (week === "all" || week === null) return "All Weeks";
      return weekLabelByIndex.get(week) ?? formatWeekScopeLabel(week);
    },
    [weekLabelByIndex],
  );

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
    const fallbackWeekLabel = fallbackDay
      ? formatDayScopeLabel(fallbackDay)
      : resolveWeekScopeLabel(fallbackWeek);
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
  }, [
    activeRunRequest,
    platformFilter,
    resolveWeekScopeLabel,
    runScopedJobs,
    selectedRun,
    selectedRunId,
    weekFilter,
    weeklyWindowLookup,
  ]);

  const liveRunLogs = useMemo(() => {
    if (!selectedRunId) return [];
    return [...runScopedJobs]
      .map((job) => {
        const stage = getJobStageLabel(job);
        const timestamp = job.completed_at ?? job.started_at ?? job.created_at ?? null;
        const ts = timestamp ? Date.parse(timestamp) : Number.NaN;
        const counters = getJobStageCounters(job);
        const persistCounters = getJobPersistCounters(job);
        const activity = getJobActivity(job);
        const outcomeNote = formatJobOutcomeNote(job);
        const account = typeof job.config?.account === "string" && job.config.account ? ` @${job.config.account}` : "";
        const stagePlain = STAGE_LABELS_PLAIN[stage] ?? stage;
        const statusPlain = JOB_STATUS_PLAIN[statusToLogVerb(job.status)] ?? statusToLogVerb(job.status);

        let msg = `${PLATFORM_LABELS[job.platform] ?? job.platform}${account} \u2014 ${stagePlain}: ${statusPlain}`;
        if (counters) {
          msg += `. Observed ${formatCountersPlain(counters.posts, counters.comments)}`;
        } else if (typeof job.items_found === "number" && job.items_found > 0) {
          msg += `. ${job.items_found.toLocaleString()} items found`;
        }
        if (persistCounters) {
          msg += `. Saved ${formatCountersPlain(persistCounters.posts_upserted, persistCounters.comments_upserted)}`;
        }
        const actPlain = formatJobActivitySummary(activity);
        if (actPlain) {
          msg += `. ${actPlain}`;
        }
        if (outcomeNote) {
          msg += `. ${outcomeNote}`;
        }
        return {
          id: job.id,
          timestampMs: Number.isNaN(ts) ? 0 : ts,
          timestampLabel: formatTime(timestamp),
          message: msg,
        };
      })
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 8);
  }, [runScopedJobs, selectedRunId]);

  const hasRunningJobs = useMemo(() => {
    const jobLevelActiveWork = runScopedJobs.some((job) => ACTIVE_RUN_STATUSES.has(job.status as SocialRun["status"]));
    if (jobLevelActiveWork) return true;
    if (runScopedJobs.length > 0) return false;
    return Boolean(activeRun && ACTIVE_RUN_STATUSES.has(activeRun.status));
  }, [activeRun, runScopedJobs]);

  useEffect(() => {
    if (activeSyncSessionId) return;
    if (!runningIngest || !activeRunId || !activeRun) return;
    if (!TERMINAL_RUN_STATUSES.has(activeRun.status)) return;
    let cancelled = false;
    const completedRunId = activeRunId;

    const finalizeRun = (message: string) => {
      setIngestMessage(message);
      setRunningIngest(false);
      setIngestingWeek(null);
      setIngestingDay(null);
      setActiveRunRequest(null);
      setActiveRunId(null);
      setIngestStartedAt(null);
      autoSyncSessionRef.current = null;
      void fetchAnalytics().catch(() => {});
      void fetchRuns().catch(() => {});
      void fetchRunSummaries().catch(() => {});
      void fetchJobs(completedRunId).catch(() => {});
    };

    void (async () => {
      const summary = activeRun.summary ?? {};
      const completedJobs = Number(summary.completed_jobs ?? 0);
      const failedJobs = Number(summary.failed_jobs ?? 0);
      const totalJobs = Math.max(Number(summary.total_jobs ?? 0), completedJobs + failedJobs);
      const totalItems = Number(summary.items_found_total ?? 0);
      const elapsed = ingestStartedAt ? ` in ${Math.round((Date.now() - ingestStartedAt.getTime()) / 1000)}s` : "";
      const finalVerb = activeRun.status === "cancelled" ? "cancelled" : activeRun.status === "failed" ? "failed" : "complete";
      let terminalMessage = `Sync ${finalVerb}${elapsed}: ${completedJobs} job(s) finished`;
      if (totalJobs > 0) {
        terminalMessage += ` of ${totalJobs}`;
      }
      terminalMessage += `, ${totalItems.toLocaleString()} items`;
      if (failedJobs > 0) {
        terminalMessage += ` · ${failedJobs} failed`;
      }

      const session = autoSyncSessionRef.current;
      if (!session || !session.enabled || activeRun.status === "cancelled") {
        if (!cancelled) finalizeRun(terminalMessage);
        return;
      }

      try {
        const coverage = await fetchCommentsCoverage({
          platform: session.platform,
          dateStart: session.dateStart,
          dateEnd: session.dateEnd,
          sourceScope: scope,
        });
        const mirrorCoverage = SOCIAL_FULL_SYNC_MIRROR_ENABLED
          ? await fetchMirrorCoverage({
              platform: session.platform,
              dateStart: session.dateStart,
              dateEnd: session.dateEnd,
              sourceScope: scope,
            })
          : {
              up_to_date: true,
              needs_mirror_count: 0,
              mirrored_count: 0,
              failed_count: 0,
              partial_count: 0,
              pending_count: 0,
              posts_scanned: 0,
            };
        if (cancelled) return;
        setSyncCommentsCoveragePreview(coverage);
        setSyncMirrorCoveragePreview(SOCIAL_FULL_SYNC_MIRROR_ENABLED ? mirrorCoverage : null);
        const coverageSaved = Number(coverage.total_saved_comments ?? 0);
        const coverageReported = Number(coverage.total_reported_comments ?? 0);
        const coveragePct = coverageReported > 0 ? Math.max(0, Math.min(100, (coverageSaved / coverageReported) * 100)) : 100;
        const coverageLabel = `${coverageSaved.toLocaleString()}/${coverageReported.toLocaleString()} (${coveragePct.toFixed(1)}%)`;
        const mirrorTotal = Number(mirrorCoverage.posts_scanned ?? 0);
        const mirrorNeeds = Number(mirrorCoverage.needs_mirror_count ?? 0);
        const mirrorReady = Math.max(0, mirrorTotal - mirrorNeeds);
        const mirrorLabel = formatMirrorCoverageLabel(mirrorReady, mirrorTotal);
        const strictRunSuccess = activeRun.status === "completed" && failedJobs === 0;
        const mirrorIsReady = !SOCIAL_FULL_SYNC_MIRROR_ENABLED || mirrorCoverage.up_to_date;
        if (coverage.up_to_date && mirrorIsReady && strictRunSuccess) {
          const mirrorToken = SOCIAL_FULL_SYNC_MIRROR_ENABLED ? ` · Mirror ${mirrorLabel}` : "";
          finalizeRun(`${terminalMessage} · Coverage ${coverageLabel}${mirrorToken} · Up-to-Date.`);
          return;
        }

        const elapsedMs = Date.now() - session.startedAtMs;
        const nextPass = session.pass + 1;
        if (nextPass > session.maxPasses || elapsedMs >= session.maxDurationMs) {
          if (SOCIAL_FULL_SYNC_MIRROR_ENABLED) {
            finalizeRun(
              `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Incomplete (guardrail reached after ${session.pass}/${session.maxPasses} passes; pending=${mirrorCoverage.pending_count ?? 0}, failed=${mirrorCoverage.failed_count ?? 0}).`,
            );
          } else {
            finalizeRun(
              `${terminalMessage} · Coverage ${coverageLabel} · Stalled (guardrail reached after ${session.pass}/${session.maxPasses} passes).`,
            );
          }
          return;
        }

        const staleCommentPlatforms = Object.entries(coverage.by_platform ?? {})
          .filter(([, value]) => !value.up_to_date)
          .map(([platform]) => platform)
          .filter((platform): platform is Platform => PLATFORM_ORDER.includes(platform as Platform));
        const staleMirrorPlatforms = Object.entries(mirrorCoverage.by_platform ?? {})
          .filter(([, value]) => !value.up_to_date || Number(value.needs_mirror_count ?? 0) > 0)
          .map(([platform]) => platform)
          .filter((platform): platform is Platform => PLATFORM_ORDER.includes(platform as Platform));
        const mergedStalePlatforms = Array.from(new Set([...staleCommentPlatforms, ...staleMirrorPlatforms]));
        if (SOCIAL_FULL_SYNC_MIRROR_ENABLED && staleMirrorPlatforms.length > 0) {
          const requeueResult = await requeueMirrorJobs({
            platforms: staleMirrorPlatforms,
            sourceScope: scope,
            dateStart: session.dateStart,
            dateEnd: session.dateEnd,
          });
          if (cancelled) return;
          setIngestMessage(
            `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Requeued ${requeueResult.queuedJobs} mirror job(s) for ${staleMirrorPlatforms.length} platform(s).`,
          );
        }

        const headers = await getAuthHeaders();
        if (cancelled) return;
        // Only switch to comments_only if every post-stage job found items.
        // If any account had 0 results, keep doing full ingest so it gets scraped.
        const postJobs = jobs.filter(
          (j) => j.run_id === completedRunId && (j.job_type === "posts" || j.job_type === "shared_account_posts"),
        );
        const allAccountsCovered = postJobs.length > 0 && postJobs.every((j) => (j.items_found ?? 0) > 0);
        const nextIngestMode: IngestMode =
          session.ingestMode === "posts_and_comments" && allAccountsCovered
            ? "comments_only"
            : session.ingestMode;
        const payload: {
          source_scope: Scope;
          platforms?: Platform[];
          accounts_override?: string[];
          hashtags_override?: string[];
          keywords_override?: string[];
          max_posts_per_target: number;
          max_comments_per_post: number;
          max_replies_per_post: number;
          fetch_replies: boolean;
          ingest_mode: IngestMode;
          sync_strategy: "incremental";
          runner_strategy?: "single_runner" | "adaptive_dual_runner";
          runner_count?: number;
          window_shard_hours?: number;
          comment_refresh_policy?: CommentRefreshPolicy;
          comment_anchor_source_ids?: Partial<Record<Platform, string[]>>;
          allow_inline_dev_fallback: boolean;
          date_start?: string;
          date_end?: string;
        } = {
          source_scope: scope,
          max_posts_per_target: 0,
          max_comments_per_post: 5000,
          max_replies_per_post: 1000,
          fetch_replies: false,
          ingest_mode: nextIngestMode,
          sync_strategy: "incremental",
          runner_strategy: "single_runner",
          runner_count: 1,
          window_shard_hours: 12,
          allow_inline_dev_fallback: false,
        };
        const nextPlatforms = mergedStalePlatforms.length > 0
          ? mergedStalePlatforms
          : session.platform !== "all"
            ? [session.platform]
            : null;
        if (nextPlatforms && nextPlatforms.length > 0) {
          payload.platforms = nextPlatforms;
        }
        const targetOverrides = buildTargetOverrides(nextPlatforms);
        payload.accounts_override = targetOverrides.accounts_override;
        payload.hashtags_override = targetOverrides.hashtags_override;
        payload.keywords_override = targetOverrides.keywords_override;
        if (session.rowMissingOnly && session.ingestMode === "comments_only" && session.week !== null && !session.day) {
          const missingTargets = await buildMissingCommentTargets({
            weekIndex: session.week,
            platform: session.platform,
            sourceScope: scope,
          });
          if (cancelled) return;
          if (missingTargets.platforms.length === 0 || missingTargets.staleAnchorsCount <= 0) {
            finalizeRun(`${terminalMessage} · Coverage ${coverageLabel} · Up-to-Date.`);
            return;
          }
          payload.platforms = missingTargets.platforms;
          payload.comment_refresh_policy = "missing_only";
          if (Object.keys(missingTargets.sourceIdsByPlatform).length > 0) {
            payload.comment_anchor_source_ids = missingTargets.sourceIdsByPlatform;
          }
        }
        if (session.dateStart) payload.date_start = session.dateStart;
        if (session.dateEnd) payload.date_end = session.dateEnd;

        setIngestMessage(
          SOCIAL_FULL_SYNC_MIRROR_ENABLED
            ? `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Auto-continuing pass ${nextPass}/${session.maxPasses}...`
            : `${terminalMessage} · Coverage ${coverageLabel} · Auto-continuing pass ${nextPass}/${session.maxPasses}...`,
        );
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
          run_id?: string;
          queued_or_started_jobs?: number;
        };
        const runId = typeof result.run_id === "string" && result.run_id ? result.run_id : null;
        if (!runId) {
          throw new Error("Auto-continue pass started without a run id");
        }
        if (cancelled) return;
        session.pass = nextPass;
        session.ingestMode = nextIngestMode;
        setActiveRunId(runId);
        setSelectedRunId(runId);
        setJobs([]);
        const jobCount = Number(result.queued_or_started_jobs ?? 0);
        setIngestMessage(
          SOCIAL_FULL_SYNC_MIRROR_ENABLED
            ? `Pass ${nextPass}/${session.maxPasses} queued · run ${runId.slice(0, 8)} · ${jobCount} jobs · Coverage ${coverageLabel} · Mirror ${mirrorLabel}.`
            : `Pass ${nextPass}/${session.maxPasses} queued · run ${runId.slice(0, 8)} · ${jobCount} jobs · Coverage ${coverageLabel}.`,
        );
        await fetchJobs(runId);
        await fetchRuns();
        await fetchRunSummaries();
      } catch (autoContinueError) {
        if (cancelled) return;
        const message = autoContinueError instanceof Error ? autoContinueError.message : "Auto-continue failed";
        finalizeRun(`${terminalMessage} · ${message}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeRun,
    activeRunId,
    activeSyncSessionId,
    fetchAnalytics,
    buildTargetOverrides,
    buildMissingCommentTargets,
    fetchCommentsCoverage,
    fetchMirrorCoverage,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    requeueMirrorJobs,
    getAuthHeaders,
    ingestStartedAt,
    jobs,
    runningIngest,
    scope,
    seasonId,
    seasonNumber,
    showId,
  ]);

  const activeSyncSessionStream = useSharedSseResource<SocialSyncSessionStreamPayload>({
    key: `season-social-sync:${showId}:${seasonNumber}:${seasonId}:${activeSyncSessionId ?? "idle"}`,
    shouldRun: Boolean(activeSyncSessionId && runningIngest),
    reconnectIntervalMs: 5_000,
    connect: async ({ signal, publish }) => {
      const headers = await getAuthHeaders();
      await consumeSocialSyncSessionStream({
        url: `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/sync-sessions/${activeSyncSessionId}/stream?season_id=${encodeURIComponent(seasonId)}`,
        headers,
        signal,
        onOpen: () => {
          publish({ connected: true, error: null });
        },
        onMessage: async (event) => {
          publish({
            data: event,
            error: null,
            connected: true,
            lastSuccessAtMs: Date.now(),
          });
        },
      });
    },
  });

  useEffect(() => {
    if (!activeSyncSessionId || !runningIngest) {
      setActiveSyncSessionStreamConnected(false);
      return;
    }
    setActiveSyncSessionStreamConnected(activeSyncSessionStream.connected);
  }, [activeSyncSessionId, activeSyncSessionStream.connected, runningIngest]);

  useEffect(() => {
    const event = activeSyncSessionStream.data;
    if (!activeSyncSessionId || !runningIngest || !event) {
      return;
    }
    const refreshLiveData = async (
      payload: SocialSyncSessionProgressSnapshot,
      event: SocialSyncSessionStreamPayload,
    ) => {
      const now = Date.now();
      if (now - activeSyncSessionLastRefreshAtRef.current < 2_500) return;
      activeSyncSessionLastRefreshAtRef.current = now;

      const refreshTasks: Promise<unknown>[] = [fetchAnalytics()];
      const nextRunId =
        (typeof payload.current_run_id === "string" && payload.current_run_id.trim().length > 0
          ? payload.current_run_id
          : typeof payload.current_run?.id === "string" && payload.current_run.id.trim().length > 0
            ? payload.current_run.id
            : null) ?? null;
      if (nextRunId) {
        refreshTasks.push(fetchJobs(nextRunId, { preserveLastGoodIfEmpty: true, limit: 100 }));
      }
      if (event.run_progress && typeof event.run_progress === "object") {
        refreshTasks.push(fetchRuns({ runId: nextRunId ?? activeRunId ?? undefined, limit: 1 }));
      }
      await Promise.allSettled(refreshTasks);
    };

    const payload = event.sync_session;
    setError(null);
    setActiveSyncSession(payload);
    const snapshot = payload.completeness_snapshot ?? {};
    if (snapshot.comments_coverage && typeof snapshot.comments_coverage === "object") {
      setSyncCommentsCoveragePreview(snapshot.comments_coverage as unknown as CommentsCoverageResponse);
    }
    if (snapshot.asset_coverage && typeof snapshot.asset_coverage === "object") {
      setSyncMirrorCoveragePreview(snapshot.asset_coverage as unknown as MirrorCoverageResponse);
    }
    const nextRunId =
      (typeof payload.current_run_id === "string" && payload.current_run_id.trim().length > 0
        ? payload.current_run_id
        : typeof payload.current_run?.id === "string" && payload.current_run.id.trim().length > 0
          ? payload.current_run.id
          : null) ?? null;

    const applyStreamEvent = async () => {
      if (nextRunId && nextRunId !== activeRunId) {
        setActiveRunId(nextRunId);
        setSelectedRunId(nextRunId);
        setJobs([]);
        await fetchJobs(nextRunId);
        await fetchRuns({ runId: nextRunId, limit: 1 });
        await fetchRunSummaries();
      }
      void refreshLiveData(payload, event);
      const sessionStatus = String(payload.status || "").toLowerCase();
      const passLabel = String(payload.current_pass_kind || "sync").replaceAll("_", " ");
      if (sessionStatus === "completed") {
        setIngestMessage(
          `Sync complete · pass ${Math.max(1, Number(payload.pass_sequence ?? 1) || 1)}/3 · ${passLabel}.`,
        );
        setRunningIngest(false);
        setActiveSyncSessionId(null);
        setActiveSyncSessionStreamConnected(false);
        return;
      }
      if (sessionStatus === "failed" || sessionStatus === "cancelled") {
        setIngestMessage(
          sessionStatus === "cancelled" ? "Sync cancelled." : `Sync failed during ${passLabel}.`,
        );
        setRunningIngest(false);
        setActiveSyncSessionId(null);
        setActiveSyncSessionStreamConnected(false);
        return;
      }
      setIngestMessage(
        `Sync session running · pass ${Math.max(1, Number(payload.pass_sequence ?? 1) || 1)}/3 · ${passLabel}.`,
      );
    };

    void applyStreamEvent();
  }, [
    activeRunId,
    activeSyncSessionId,
    activeSyncSessionStream.data,
    fetchAnalytics,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    runningIngest,
    seasonId,
    seasonNumber,
    showId,
  ]);

  useEffect(() => {
    if (!activeSyncSessionId || !runningIngest) return;
    if (activeSyncSessionStream.connected || !activeSyncSessionStream.error) return;
    setActiveSyncSessionStreamConnected(false);
    setError(activeSyncSessionStream.error);
  }, [activeSyncSessionId, activeSyncSessionStream.connected, activeSyncSessionStream.error, runningIngest]);

  useEffect(() => {
    if (!primaryBootstrapReady) return;
    if (!activeSyncSessionId || !runningIngest) return;
    if (activeSyncSessionStreamConnected) return;
    if (DEV_LOW_HEAT_MODE && !isDocumentVisible) return;
    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      if (cancelled) return;
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/sync-sessions/${activeSyncSessionId}?season_id=${encodeURIComponent(seasonId)}`,
          {
            headers: await getAuthHeaders(),
          },
          { allowDevAdminBypass: true },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Failed to fetch sync session");
        }
        const payload = (await response.json().catch(() => ({}))) as SocialSyncSessionProgressSnapshot;
        if (cancelled) return;
        setActiveSyncSession(payload);
        const snapshot = payload.completeness_snapshot ?? {};
        if (snapshot.comments_coverage && typeof snapshot.comments_coverage === "object") {
          setSyncCommentsCoveragePreview(snapshot.comments_coverage as unknown as CommentsCoverageResponse);
        }
        if (snapshot.asset_coverage && typeof snapshot.asset_coverage === "object") {
          setSyncMirrorCoveragePreview(snapshot.asset_coverage as unknown as MirrorCoverageResponse);
        }
        const nextRunId =
          (typeof payload.current_run_id === "string" && payload.current_run_id.trim().length > 0
            ? payload.current_run_id
            : typeof payload.current_run?.id === "string" && payload.current_run.id.trim().length > 0
              ? payload.current_run.id
              : null) ?? null;
        if (nextRunId && nextRunId !== activeRunId) {
          setActiveRunId(nextRunId);
          setSelectedRunId(nextRunId);
          setJobs([]);
          await fetchJobs(nextRunId);
          await fetchRuns();
          await fetchRunSummaries();
        }
        const sessionStatus = String(payload.status || "").toLowerCase();
        const passLabel = String(payload.current_pass_kind || "sync").replaceAll("_", " ");
        if (sessionStatus === "completed") {
          setIngestMessage(
            `Sync complete · pass ${Math.max(1, Number(payload.pass_sequence ?? 1) || 1)}/3 · ${passLabel}.`,
          );
          setRunningIngest(false);
          setActiveSyncSessionId(null);
          return;
        }
        if (sessionStatus === "failed" || sessionStatus === "cancelled") {
          setIngestMessage(
            sessionStatus === "cancelled"
              ? "Sync cancelled."
              : `Sync failed during ${passLabel}.`,
          );
          setRunningIngest(false);
          setActiveSyncSessionId(null);
          return;
        }
        setIngestMessage(
          `Sync session running · pass ${Math.max(1, Number(payload.pass_sequence ?? 1) || 1)}/3 · ${passLabel}.`,
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to refresh sync session");
      }
      if (cancelled) return;
      timer = window.setTimeout(() => {
        void poll();
      }, 3_000);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [
    activeRunId,
    activeSyncSessionId,
    activeSyncSessionStreamConnected,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    getAuthHeaders,
    runningIngest,
    primaryBootstrapReady,
    isDocumentVisible,
    seasonId,
    seasonNumber,
    showId,
  ]);

  const retryActiveSyncSession = useCallback(
    async (retryKind: "retry_missing_comments" | "retry_failed_media" | "retry_missing_avatars" | "retry_missing_comment_media") => {
      if (!activeSyncSessionId) return;
      setActiveSyncSessionRetryKind(retryKind);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/sync-sessions/${activeSyncSessionId}/retry?season_id=${encodeURIComponent(seasonId)}`,
          {
            method: "POST",
            headers: {
              ...(await getAuthHeaders()),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ retry_kind: retryKind }),
          },
          { allowDevAdminBypass: true },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Failed to retry sync session");
        }
        const payload = (await response.json().catch(() => ({}))) as SocialSyncSessionProgressSnapshot;
        setActiveSyncSession(payload);
        setIngestMessage(`Retry queued for ${retryKind.replaceAll("_", " ")}.`);
        setError(null);
        setRunningIngest(true);
        const nextRunId =
          typeof payload.current_run_id === "string" && payload.current_run_id.trim().length > 0
            ? payload.current_run_id
            : typeof payload.current_run?.id === "string" && payload.current_run.id.trim().length > 0
              ? payload.current_run.id
              : null;
        if (nextRunId) {
          setActiveRunId(nextRunId);
          setSelectedRunId(nextRunId);
          setJobs([]);
          await invalidateSeasonSnapshotFamily();
          await fetchJobs(nextRunId);
          await fetchRuns();
          await fetchRunSummaries();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to retry sync session");
      } finally {
        setActiveSyncSessionRetryKind(null);
      }
    },
    [
      activeSyncSessionId,
      fetchJobs,
      fetchRunSummaries,
      fetchRuns,
      getAuthHeaders,
      invalidateSeasonSnapshotFamily,
      seasonId,
      seasonNumber,
      showId,
    ],
  );

  const liveSeasonSnapshot = useSharedPollingResource<{
    payload: SeasonSocialAnalyticsSnapshot;
    cacheStatus: string;
  }>({
    key: `season-social-analytics-snapshot:${showId}:${seasonNumber}:${seasonId}:${analyticsView}:${scope}:${platformFilter}:${weekFilter}:${activeRunId ?? "none"}`,
    shouldRun:
      analyticsView !== "reddit" &&
      primaryBootstrapReady &&
      Boolean(activeRunId) &&
      (hasRunningJobs || runningIngest),
    intervalMs: DEV_LOW_HEAT_MODE ? DEV_VISIBLE_POLL_INTERVAL_MS : runningIngest ? 3_000 : 5_000,
    fetchData: async (signal, request) => await fetchSeasonSnapshot({ signal, forceRefresh: request?.forceRefresh }),
  });

  useEffect(() => {
    if (!liveSeasonSnapshot.data) return;
    applySeasonSnapshot(liveSeasonSnapshot.data.payload, { preserveLastGoodJobsIfEmpty: true });
    setSectionErrors((current) => ({
      ...current,
      analytics: null,
      runs: null,
      jobs: null,
    }));
    pollFailureCountRef.current = 0;
    setPollingStatus((current) => (current === "retrying" ? "recovered" : current));
    logAdminPageReadDiagnostic({
      pageFamily: "season-social-analytics",
      resource: "live-snapshot",
      requestRole: "polling",
      phase: "success",
      cacheHit: liveSeasonSnapshot.data.cacheStatus === "hit",
      payloadBytes: measurePayloadBytes(liveSeasonSnapshot.data.payload),
      message: liveSeasonSnapshot.data.payload.stale ? "served stale snapshot" : undefined,
    });
  }, [applySeasonSnapshot, liveSeasonSnapshot.data]);

  useEffect(() => {
    if (!liveSeasonSnapshot.error) return;
    const message = isTransientDevRestartMessage(liveSeasonSnapshot.error) ? null : liveSeasonSnapshot.error;
    setSectionErrors((current) => ({
      ...current,
      analytics: message,
      runs: message,
      jobs: message,
    }));
    setWorkerHealthError(message);
    if (isTransientDevRestartMessage(liveSeasonSnapshot.error)) {
      pollFailureCountRef.current = Math.max(1, pollFailureCountRef.current);
    } else {
      pollFailureCountRef.current += 1;
    }
    if (shouldSetPollingRetry(pollFailureCountRef.current)) {
      setPollingStatus("retrying");
    }
    logAdminPageReadDiagnostic({
      pageFamily: "season-social-analytics",
      resource: "live-snapshot",
      requestRole: "polling",
      phase: "error",
      message: liveSeasonSnapshot.error,
    });
  }, [liveSeasonSnapshot.error]);

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
    if (!activeRunId && !activeSyncSessionId) return;
    setCancellingRun(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchAdminWithAuth(
        activeSyncSessionId
          ? `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/sync-sessions/${activeSyncSessionId}/cancel`
          : `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/ingest/runs/${activeRunId}/cancel`,
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

      setIngestMessage(
        activeSyncSessionId ? `Sync session ${activeSyncSessionId.slice(0, 8)} cancelled.` : `Run ${activeRunId?.slice(0, 8)} cancelled.`,
      );
      setRunningIngest(false);
      setIngestingWeek(null);
      setIngestingDay(null);
      setActiveRunRequest(null);
      setSelectedRunId(activeRunId);
      setActiveSyncSessionId(null);
      setActiveSyncSession(null);
      setActiveRunId(null);
      setIngestStartedAt(null);
      setSyncCommentsCoveragePreview(null);
      setSyncMirrorCoveragePreview(null);
      autoSyncSessionRef.current = null;
      await invalidateSeasonSnapshotFamily();
      await fetchJobs(activeRunId);
      await fetchAnalytics();
      await fetchRuns();
      await fetchRunSummaries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel run");
    } finally {
      setCancellingRun(false);
    }
  }, [
    activeRunId,
    activeSyncSessionId,
    fetchAnalytics,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    getAuthHeaders,
    invalidateSeasonSnapshotFamily,
    seasonNumber,
    showId,
  ]);

  const triggerSeasonRunSocialBladeRefresh = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const castResponse = await fetchAdminWithAuth(
        `/api/admin/trr-api/shows/${showId}/cast-role-members?seasons=${seasonNumber}&exclude_zero_episode_members=1`,
        { headers },
        { allowDevAdminBypass: true },
      );
      if (!castResponse.ok) {
        return;
      }

      const castRows = (await castResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
      const items = castRows
        .map((row) => ({
          personId: typeof row.person_id === "string" ? row.person_id : "",
          handle: typeof row.instagram_handle === "string" ? row.instagram_handle.trim() : "",
        }))
        .filter((item) => item.personId && item.handle);
      if (items.length === 0) {
        return;
      }

      await fetchAdminWithAuth(
        "/api/admin/trr-api/social-growth/refresh-batch",
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "season_run",
            source_scope: scope,
            items,
          }),
        },
        { allowDevAdminBypass: true },
      );
    } catch (error) {
      console.warn("[season-social-analytics] SocialBlade sidecar refresh failed", error);
    }
  }, [getAuthHeaders, scope, seasonNumber, showId]);

  const runIngest = useCallback(async (override?: {
    week?: number;
    day?: string;
    platform?: "all" | Platform;
    ingestMode?: IngestMode;
    rowMissingOnly?: boolean;
  }) => {
    setRunningIngest(true);
    setError(null);
    setIngestMessage(null);
    setSyncCommentsCoveragePreview(null);
    setSyncMirrorCoveragePreview(null);
    setJobs([]);
    setSelectedRunId(null);
    setActiveRunId(null);
    setActiveSyncSessionId(null);
    setActiveSyncSession(null);
    setIngestStartedAt(new Date());

    const effectivePlatform = override?.platform ?? platformFilter;
    const effectiveDay = override?.day?.trim() ? override.day.trim() : null;
    const effectiveWeek = effectiveDay ? null : (override?.week ?? (weekFilter === "all" ? null : weekFilter));
    const effectiveIngestMode = override?.ingestMode ?? "posts_and_comments";
    const runRowMissingOnly =
      Boolean(override?.rowMissingOnly) &&
      effectiveIngestMode === "comments_only" &&
      effectiveWeek !== null &&
      !effectiveDay;
    setIngestingWeek(effectiveWeek);
    setIngestingDay(effectiveDay);
    setActiveRunRequest({ week: effectiveWeek, day: effectiveDay, platform: effectivePlatform });

    try {
      const headers = await getAuthHeaders();
      const payload: {
        source_scope: Scope;
        platforms?: Platform[];
        accounts_override?: string[];
        hashtags_override?: string[];
        keywords_override?: string[];
        week_index?: number;
        max_posts_per_target: number;
        max_comments_per_post: number;
        max_replies_per_post: number;
        fetch_replies: boolean;
        ingest_mode: IngestMode;
        sync_strategy: SyncStrategy;
        runner_strategy?: "single_runner" | "adaptive_dual_runner";
        runner_count?: number;
        window_shard_hours?: number;
        comment_refresh_policy?: CommentRefreshPolicy;
        comment_anchor_source_ids?: Partial<Record<Platform, string[]>>;
        allow_inline_dev_fallback: boolean;
        date_start?: string;
        date_end?: string;
      } = {
        source_scope: scope,
        max_posts_per_target: 0,
        max_comments_per_post: 5000,
        max_replies_per_post: 1000,
        fetch_replies: false,
        ingest_mode: effectiveIngestMode,
        sync_strategy: syncStrategy,
        allow_inline_dev_fallback: false,
      };
      const label = effectiveDay
        ? formatDayScopeLabel(effectiveDay)
        : effectiveWeek !== null
          ? resolveWeekScopeLabel(effectiveWeek)
          : "Full Season";
      const platformLabel = effectivePlatform === "all" ? "all platforms" : (PLATFORM_LABELS[effectivePlatform] ?? effectivePlatform);
      const modeLabel = syncStrategy === "full_refresh" ? "Full Refresh" : "Incremental";
      let targetedPlatformLabel = platformLabel;
      let rowMissingTargets: MissingCommentTargets | null = null;

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
        payload.week_index = effectiveWeek;
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

      if (runRowMissingOnly) {
        rowMissingTargets = await buildMissingCommentTargets({
          weekIndex: effectiveWeek,
          platform: effectivePlatform,
          sourceScope: scope,
        });
        if (rowMissingTargets.platforms.length === 0 || rowMissingTargets.staleAnchorsCount <= 0) {
          setIngestMessage(`${label} · ${platformLabel} · Comments already Up-to-Date.`);
          setRunningIngest(false);
          setIngestingWeek(null);
          setIngestingDay(null);
          setActiveRunRequest(null);
          setActiveRunId(null);
          setIngestStartedAt(null);
          autoSyncSessionRef.current = null;
          return;
        }
        payload.platforms = rowMissingTargets.platforms;
        payload.comment_refresh_policy = "missing_only";
        if (Object.keys(rowMissingTargets.sourceIdsByPlatform).length > 0) {
          payload.comment_anchor_source_ids = rowMissingTargets.sourceIdsByPlatform;
        }
        targetedPlatformLabel =
          rowMissingTargets.platforms.length === 1
            ? (PLATFORM_LABELS[rowMissingTargets.platforms[0]] ?? rowMissingTargets.platforms[0])
            : `${rowMissingTargets.platforms.length} targeted platforms`;
      }
      const targetOverrides = buildTargetOverrides(payload.platforms ?? null);
      payload.accounts_override = targetOverrides.accounts_override;
      payload.hashtags_override = targetOverrides.hashtags_override;
      payload.keywords_override = targetOverrides.keywords_override;
      const requestedPlatforms =
        payload.platforms && payload.platforms.length > 0
          ? payload.platforms
          : (["instagram", "tiktok", "twitter", "youtube", "facebook", "threads"] as Platform[]);
      const singlePlatform = requestedPlatforms.length === 1;
      const singlePlatformTarget = singlePlatform ? requestedPlatforms[0] : null;
      const igTikTokOnly = requestedPlatforms.every((platform) => platform === "instagram" || platform === "tiktok");
      if (effectiveIngestMode === "comments_only") {
        payload.runner_strategy = "single_runner";
        payload.runner_count = 1;
        payload.window_shard_hours = 12;
      } else if (singlePlatform || igTikTokOnly) {
        payload.runner_strategy = "single_runner";
        payload.runner_count = 1;
        payload.window_shard_hours =
          singlePlatformTarget === "instagram" || singlePlatformTarget === "tiktok" ? 12 : 24;
      } else {
        payload.runner_strategy = "adaptive_dual_runner";
        payload.runner_count = 2;
        payload.window_shard_hours = 6;
      }
      setIngestMessage(`Starting ${label} · ${platformLabel} · ${modeLabel}...`);

      const useSyncSession =
        effectiveIngestMode === "posts_and_comments" &&
        typeof payload.date_start === "string" &&
        payload.date_start.length > 0 &&
        typeof payload.date_end === "string" &&
        payload.date_end.length > 0;

      if (useSyncSession) {
        const syncDateStart = payload.date_start ?? "";
        const syncDateEnd = payload.date_end ?? "";
        const syncSessionPayload = buildSocialSyncSessionRequest({
          sourceScope: payload.source_scope,
          platforms: payload.platforms ?? null,
          dateStart: syncDateStart,
          dateEnd: syncDateEnd,
          accountsOverride: payload.accounts_override,
          hashtagsOverride: payload.hashtags_override,
          keywordsOverride: payload.keywords_override,
        });
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/sync-sessions?season_id=${encodeURIComponent(seasonId)}`,
          {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(syncSessionPayload),
          },
          { allowDevAdminBypass: true },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Failed to start sync session");
        }

        const result = (await response.json().catch(() => ({}))) as {
          status?: string;
          sync_session_id?: string;
          current_pass_kind?: string | null;
          current_pass_attempt?: number;
          current_run_id?: string | null;
          follow_up_reason?: string | null;
          completeness_snapshot?: SocialSyncSessionProgressSnapshot["completeness_snapshot"];
          current_run?: {
            id?: string | null;
            status?: string;
            summary?: Record<string, unknown>;
          } | null;
        };
        if (result.status === "already_up_to_date") {
          setIngestMessage(`${label} · ${targetedPlatformLabel} · Already up to date.`);
          setRunningIngest(false);
          setIngestingWeek(null);
          setIngestingDay(null);
          setActiveRunRequest(null);
          setActiveRunId(null);
          setIngestStartedAt(null);
          autoSyncSessionRef.current = null;
          return;
        }

        const syncSessionId =
          typeof result.sync_session_id === "string" && result.sync_session_id.trim().length > 0
            ? result.sync_session_id
            : null;
        if (!syncSessionId) {
          throw new Error("Sync session started without a session id");
        }

        const runId =
          typeof result.current_run_id === "string" && result.current_run_id.trim().length > 0
            ? result.current_run_id
            : typeof result.current_run?.id === "string" && result.current_run.id.trim().length > 0
              ? result.current_run.id
              : null;
        const jobCount =
          typeof result.current_run?.summary === "object" && result.current_run?.summary
            ? Number(result.current_run.summary.total_jobs ?? 0)
            : 0;
        const statusLabel = result.status === "attached" ? "attached" : "queued";
        setActiveSyncSessionId(syncSessionId);
        setActiveSyncSession({
          sync_session_id: syncSessionId,
          status: typeof result.status === "string" ? result.status : "created",
          season_id: seasonId,
          source_scope: payload.source_scope,
          platforms: (payload.platforms ??
            ["instagram", "tiktok", "twitter", "youtube", "facebook", "threads"]) as SocialSyncSessionProgressSnapshot["platforms"],
          date_start: syncDateStart || null,
          date_end: syncDateEnd || null,
          current_pass_kind: typeof result.current_pass_kind === "string" ? result.current_pass_kind : "posts_and_comments",
          current_pass_attempt:
            typeof result.current_pass_attempt === "number" && Number.isFinite(result.current_pass_attempt)
              ? result.current_pass_attempt
              : 1,
          current_run_id: runId,
          pass_sequence: 1,
          follow_up_reason:
            typeof result.follow_up_reason === "string" && result.follow_up_reason.trim().length > 0
              ? result.follow_up_reason
              : null,
          pass_history: [],
          completeness_snapshot: result.completeness_snapshot ?? {},
          current_run: runId
            ? {
                id: runId,
                status: typeof result.current_run?.status === "string" ? result.current_run.status : "queued",
                summary: result.current_run?.summary,
              }
            : null,
        });
        autoSyncSessionRef.current = null;
        await invalidateSeasonSnapshotFamily();
        if (runId) {
          setActiveRunId(runId);
          setSelectedRunId(runId);
          await fetchJobs(runId);
        } else {
          setActiveRunId(null);
          setSelectedRunId(null);
        }
        await fetchRuns();
        await fetchRunSummaries();
        void triggerSeasonRunSocialBladeRefresh();
        setIngestMessage(
          `${label} · ${targetedPlatformLabel} · ${modeLabel} — sync session ${syncSessionId.slice(0, 8)} ${statusLabel}${runId ? ` (run ${runId.slice(0, 8)}, ${jobCount} jobs)` : ""}.`,
        );
        return;
      }

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
        operation_id?: string;
        execution_owner?: string;
        execution_backend_canonical?: string;
        execution_mode_canonical?: string;
        stages?: string[];
        queued_or_started_jobs?: number;
      };
      const runId = typeof result.run_id === "string" && result.run_id ? result.run_id : null;
      if (!runId) {
        throw new Error(result.message ?? "Sync started without a run id");
      }
      const executionMetaParts: string[] = [];
      if (typeof result.execution_owner === "string" && result.execution_owner.trim()) {
        executionMetaParts.push(
          result.execution_owner.trim() === "remote_worker"
            ? "remote executor"
            : result.execution_owner.trim()
        );
      }
      if (typeof result.execution_backend_canonical === "string" && result.execution_backend_canonical.trim()) {
        executionMetaParts.push(`backend ${result.execution_backend_canonical.trim()}`);
      }
      if (typeof result.execution_mode_canonical === "string" && result.execution_mode_canonical.trim()) {
        executionMetaParts.push(`mode ${result.execution_mode_canonical.trim()}`);
      }
      if (typeof result.operation_id === "string" && result.operation_id.trim()) {
        executionMetaParts.push(`op ${result.operation_id.trim().slice(0, 8)}`);
      }
      const executionMeta = executionMetaParts.length > 0 ? ` · ${executionMetaParts.join(" · ")}` : "";

      const autoContinueEnabled =
        effectiveIngestMode === "posts_and_comments" ||
        effectiveIngestMode === "comments_only" ||
        effectiveIngestMode === "details_refresh";
      autoSyncGenerationRef.current += 1;
      autoSyncSessionRef.current = {
        week: effectiveWeek,
        day: effectiveDay,
        platform: effectivePlatform,
        ingestMode: effectiveIngestMode,
        rowMissingOnly: runRowMissingOnly,
        dateStart: payload.date_start,
        dateEnd: payload.date_end,
        pass: 1,
        maxPasses: COMMENT_SYNC_MAX_PASSES,
        maxDurationMs: COMMENT_SYNC_MAX_DURATION_MS,
        startedAtMs: Date.now(),
        enabled: autoContinueEnabled,
      };
      if (autoContinueEnabled) {
      }
      setActiveRunId(runId);
      setSelectedRunId(runId);
      void triggerSeasonRunSocialBladeRefresh();

      // Backend returns queued/staged run metadata immediately.
      const stages = (result.stages ?? []).join(" -> ") || "posts -> comments";
      const jobCount = result.queued_or_started_jobs ?? 0;
      if (autoContinueEnabled) {
        setIngestMessage(
          `Pass 1/${COMMENT_SYNC_MAX_PASSES} · ${label} · ${targetedPlatformLabel} · ${modeLabel} — run ${runId} queued (${jobCount} jobs, stages: ${stages})${executionMeta}.`,
        );
      } else {
        setIngestMessage(`${label} · ${targetedPlatformLabel} · ${modeLabel} — run ${runId} queued (${jobCount} jobs, stages: ${stages})${executionMeta}.`);
      }

      // Immediately fetch jobs to pick up the newly created running jobs
      await invalidateSeasonSnapshotFamily();
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
      setActiveRunRequest(null);
      setSelectedRunId(null);
      setActiveRunId(null);
      setIngestStartedAt(null);
      setSyncCommentsCoveragePreview(null);
      setSyncMirrorCoveragePreview(null);
      autoSyncSessionRef.current = null;
    }
  }, [
    analytics,
    buildTargetOverrides,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    getAuthHeaders,
    buildMissingCommentTargets,
    platformFilter,
    resolveWeekScopeLabel,
    scope,
    seasonId,
    seasonNumber,
    showId,
    syncStrategy,
    triggerSeasonRunSocialBladeRefresh,
    invalidateSeasonSnapshotFamily,
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
  const officialSeasonWindows = useMemo<SeasonWindowRow[]>(() => {
    const rows = analytics?.weekly && analytics.weekly.length > 0 ? analytics.weekly : (analytics?.weekly_platform_posts ?? []);
    const seen = new Set<string>();
    return rows
      .filter((row) => typeof row.week_index === "number" && row.start && row.end)
      .map((row) => ({
        week_index: row.week_index,
        label: row.label,
        start: row.start,
        end: row.end,
        week_type: row.week_type,
        episode_number: row.episode_number,
      }))
      .filter((row) => {
        const key = `${row.week_index}:${row.start}:${row.end}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.week_index - b.week_index);
  }, [analytics?.weekly, analytics?.weekly_platform_posts]);
  const weeklyPlatformEngagementByWeek = useMemo(() => {
    const map = new Map<number, NonNullable<AnalyticsResponse["weekly_platform_engagement"]>[number]>();
    for (const row of analytics?.weekly_platform_engagement ?? []) {
      map.set(row.week_index, row);
    }
    return map;
  }, [analytics]);
  const hasActiveBackendSaturationError = useMemo(() => {
    return (
      Object.values(sectionErrors).some((message) => isBackendSaturationSectionError(message)) ||
      isBackendSaturationSectionError(runSummaryError) ||
      isBackendSaturationSectionError(workerHealthError) ||
      isBackendSaturationSectionError(sharedStatusError)
    );
  }, [runSummaryError, sectionErrors, sharedStatusError, workerHealthError]);

  useEffect(() => {
    const activeWeeks = new Set(weeklyPlatformRows.map((row) => row.week_index));
    setWeekDetailTokenCountsByWeek((current) => {
      const nextEntries = Object.entries(current).filter(([week]) => activeWeeks.has(Number(week)));
      if (nextEntries.length === Object.keys(current).length) return current;
      return Object.fromEntries(nextEntries) as Record<number, WeekDetailTokenCounts>;
    });
    setWeekDetailHashtagUsageByWeek((current) => {
      const nextEntries = Object.entries(current).filter(([week]) => activeWeeks.has(Number(week)));
      if (nextEntries.length === Object.keys(current).length) return current;
      return Object.fromEntries(nextEntries) as Record<number, WeekDetailHashtagUsage>;
    });
    setWeekDetailTokenCountsLoadingWeeks((current) => {
      const next = new Set([...current].filter((week) => activeWeeks.has(week)));
      if (next.size === current.size) return current;
      return next;
    });
  }, [weeklyPlatformRows]);

  useEffect(() => {
    const requiresTokenMetrics = needsWeekDetailTokenMetrics && (analyticsView === "bravo" || analyticsView === "advanced");
    if (!requiresTokenMetrics && !needsWeekDetailHashtagAnalytics) return;
    if (hasActiveBackendSaturationError) return;
    if (weeklyPlatformRows.length === 0) return;
    const abortControllers = weekDetailAbortControllersRef.current;

    const currentTokenCounts = weekDetailTokenCountsByWeekRef.current;
    const currentLoadingWeeks = weekDetailTokenCountsLoadingWeeksRef.current;
    const missingWeeks = weeklyPlatformRows
      .map((row) => row.week_index)
      .filter(
        (weekIndex) =>
          !(weekIndex in currentTokenCounts) && !currentLoadingWeeks.has(weekIndex),
      );
    if (missingWeeks.length === 0) return;

    let cancelled = false;
    let nextWeekIndex = 0;

    const runWorker = async () => {
      while (nextWeekIndex < missingWeeks.length) {
        const currentIndex = nextWeekIndex;
        nextWeekIndex += 1;
        const weekIndex = missingWeeks[currentIndex];
        if (typeof weekIndex !== "number") continue;

        const requestKey = `${seasonId}:${scope}:${platformFilter}:${weekIndex}`;
        if (weekDetailTokenRequestsRef.current.has(requestKey)) {
          continue;
        }
        weekDetailTokenRequestsRef.current.add(requestKey);
        setWeekDetailTokenCountsLoadingWeeks((current) => {
          const next = new Set(current);
          next.add(weekIndex);
          return next;
        });

        const controller = new AbortController();
        abortControllers.set(requestKey, controller);

        try {
          const detail = await fetchWeekDetail({
            weekIndex,
            platform: platformFilter,
            sourceScope: scope,
            signal: controller.signal,
          });
          if (cancelled) return;
          if (requiresTokenMetrics) {
            const counts = deriveWeekDetailTokenCounts(detail);
            setWeekDetailTokenCountsByWeek((current) => ({
              ...current,
              [weekIndex]: counts,
            }));
          }
          if (needsWeekDetailHashtagAnalytics) {
            const hashtagUsage = deriveWeekDetailHashtagUsage(detail);
            setWeekDetailHashtagUsageByWeek((current) => ({
              ...current,
              [weekIndex]: hashtagUsage,
            }));
          }
        } catch (error) {
          if (cancelled || isAbortError(error)) {
            return;
          }
          if (requiresTokenMetrics) {
            setWeekDetailTokenCountsByWeek((current) => ({
              ...current,
              [weekIndex]: createEmptyWeekDetailTokenCounts(),
            }));
          }
          if (needsWeekDetailHashtagAnalytics) {
            setWeekDetailHashtagUsageByWeek((current) => ({
              ...current,
              [weekIndex]: createEmptyWeekDetailHashtagUsage(),
            }));
          }
        } finally {
          abortControllers.delete(requestKey);
          weekDetailTokenRequestsRef.current.delete(requestKey);
          setWeekDetailTokenCountsLoadingWeeks((current) => {
            const next = new Set(current);
            next.delete(weekIndex);
            return next;
          });
        }
      }
    };

    void Promise.all(
      Array.from({ length: Math.min(WEEK_DETAIL_FETCH_CONCURRENCY, missingWeeks.length) }, () => runWorker()),
    );

    return () => {
      cancelled = true;
      for (const controller of abortControllers.values()) {
        controller.abort();
      }
      abortControllers.clear();
    };
  }, [
    analyticsView,
    fetchWeekDetail,
    hasActiveBackendSaturationError,
    needsWeekDetailHashtagAnalytics,
    needsWeekDetailTokenMetrics,
    platformFilter,
    scope,
    seasonId,
    weeklyPlatformRows,
  ]);

  useEffect(() => {
    const availableWeeks = (analytics?.weekly ?? []).map((row) => row.week_index);
    if (availableWeeks.length === 0) {
      if (weeklyRunWeek !== null) setWeeklyRunWeek(null);
      return;
    }
    if (weeklyRunWeek == null || !availableWeeks.includes(weeklyRunWeek)) {
      setWeeklyRunWeek(availableWeeks[0]);
    }
  }, [analytics, weeklyRunWeek]);
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
  const staleFallbackMessage = useMemo(() => {
    if (staleFallbackItems.some((item) => isBackendSaturationSectionError(item.message))) {
      return "Local TRR-Backend is saturated. Showing last successful social data while retrying.";
    }
    return "Showing last successful social data while live refresh retries.";
  }, [staleFallbackItems]);
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
  const weeklyHeatmapPostTotals = useMemo(() => {
    const totals = new Map<number, number>();
    for (const weekRow of weeklyDailyActivityRows) {
      const total = weekRow.days.reduce((sum, day) => sum + getWeeklyDayValue(day, "posts", heatmapPlatform), 0);
      totals.set(weekRow.week_index, total);
    }
    return totals;
  }, [heatmapPlatform, weeklyDailyActivityRows]);
  const weeklyHeatmapCommentTotals = useMemo(() => {
    const totals = new Map<number, number>();
    for (const weekRow of weeklyDailyActivityRows) {
      const total = weekRow.days.reduce((sum, day) => sum + getWeeklyDayValue(day, "comments", heatmapPlatform), 0);
      totals.set(weekRow.week_index, total);
    }
    return totals;
  }, [heatmapPlatform, weeklyDailyActivityRows]);
  const weeklyFlagsByWeek = useMemo(() => {
    const grouped = new Map<number, Array<NonNullable<AnalyticsResponse["weekly_flags"]>[number]>>();
    const hiddenCodes = new Set(["drop", "comment_gap"]);
    for (const flag of analytics?.weekly_flags ?? []) {
      if (hiddenCodes.has(flag.code)) continue;
      const current = grouped.get(flag.week_index) ?? [];
      current.push(flag);
      grouped.set(flag.week_index, current);
    }
    return grouped;
  }, [analytics]);
  const dataQuality = analytics?.summary.data_quality;
  const youtubeContentBreakdown = dataQuality?.youtube_content_breakdown;
  const postMetadata = dataQuality?.post_metadata;
  const postMetadataTotalPosts = Math.max(0, Number(postMetadata?.total_posts ?? analytics?.summary.total_posts ?? 0));
  const postMetadataMetricCards = useMemo(
    () => [
      { key: "captions", label: "Captions", value: postMetadata?.captions },
      { key: "tags", label: "Tags", value: postMetadata?.tags },
      { key: "mentions", label: "Mentions", value: postMetadata?.mentions },
      { key: "collaborators", label: "Collaborators", value: postMetadata?.collaborators },
    ],
    [postMetadata?.captions, postMetadata?.collaborators, postMetadata?.mentions, postMetadata?.tags],
  );
  const contentTypeDistributionLines = useMemo(() => {
    const buckets = Array.isArray(postMetadata?.content_types?.buckets) ? postMetadata.content_types.buckets : [];
    return buckets
      .filter((bucket) => bucket && typeof bucket.key === "string")
      .map((bucket) => {
        const key = String(bucket.key || "").toLowerCase();
        const label = key === "photo" ? "Photo" : key === "album" ? "Album" : key === "video" ? "Video" : key === "post" ? "Post" : "Other";
        const pctLabel = formatPctLabel(typeof bucket.pct === "number" ? bucket.pct : null);
        const countLabel = formatInteger(Number(bucket.count ?? 0));
        return `${label} ${pctLabel} (${countLabel})`;
      });
  }, [postMetadata?.content_types?.buckets]);
  const commentsSavedActualSummary = useMemo(() => {
    const totals = weeklyPlatformRows.reduce(
      (acc, week) => {
        const saved = Math.max(0, Number(week.total_comments ?? 0));
        const inferredReported = PLATFORM_ORDER.reduce(
          (sum, platform) => sum + Number(week.reported_comments?.[platform] ?? 0),
          0,
        );
        const reported = Math.max(0, Number(week.total_reported_comments ?? inferredReported));
        return {
          saved: acc.saved + saved,
          reported: acc.reported + reported,
        };
      },
      { saved: 0, reported: 0 },
    );
    const actual = Math.max(totals.saved, totals.reported);
    const pct = actual > 0 ? Math.min(100, (totals.saved * 100) / actual) : null;
    return {
      saved: totals.saved,
      actual,
      pct,
    };
  }, [weeklyPlatformRows]);
  const commentsSavedPctCard = useMemo(() => {
    if (typeof dataQuality?.comments_saved_pct_overall === "number") {
      return dataQuality.comments_saved_pct_overall;
    }
    return commentsSavedActualSummary.pct;
  }, [commentsSavedActualSummary.pct, dataQuality?.comments_saved_pct_overall]);
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
  const castAttitudePrototypeRows = useMemo<CastAttitudePrototypeRow[]>(() => {
    const rows = new Map<string, CastAttitudePrototypeRow>();
    for (const item of analytics?.leaderboards.viewer_discussion ?? []) {
      const entities = extractCastEntityCandidates(String(item.text ?? ""));
      for (const entity of entities) {
        const current =
          rows.get(entity) ??
          {
            entity,
            mentions: 0,
            engagement: 0,
            positive: 0,
            neutral: 0,
            negative: 0,
            netSentiment: 0,
          };
        current.mentions += 1;
        current.engagement += Number(item.engagement ?? 0);
        if (item.sentiment === "positive") current.positive += 1;
        else if (item.sentiment === "negative") current.negative += 1;
        else current.neutral += 1;
        current.netSentiment = current.positive - current.negative;
        rows.set(entity, current);
      }
    }
    return [...rows.values()]
      .filter((row) => row.mentions > 0)
      .sort((a, b) => {
        if (b.mentions !== a.mentions) return b.mentions - a.mentions;
        if (b.engagement !== a.engagement) return b.engagement - a.engagement;
        return a.entity.localeCompare(b.entity);
      })
      .slice(0, 10);
  }, [analytics?.leaderboards.viewer_discussion]);
  const viewerAttitudeByPlatformRows = useMemo<ViewerAttitudePlatformRow[]>(() => {
    const rows = new Map<string, ViewerAttitudePlatformRow>();
    for (const item of analytics?.leaderboards.viewer_discussion ?? []) {
      const key = item.platform;
      const current =
        rows.get(key) ??
        {
          platform: key,
          total: 0,
          positive: 0,
          neutral: 0,
          negative: 0,
        };
      current.total += 1;
      if (item.sentiment === "positive") current.positive += 1;
      else if (item.sentiment === "negative") current.negative += 1;
      else current.neutral += 1;
      rows.set(key, current);
    }
    return [...rows.values()].sort((a, b) => b.total - a.total || a.platform.localeCompare(b.platform));
  }, [analytics?.leaderboards.viewer_discussion]);
  const workerHealthWarning = useMemo(() => {
    if (!workerHealth) {
      return null;
    }
    if (workerHealth.queueEnabled !== true) {
      return null;
    }
    const healthyWorkers = workerHealth.healthyWorkers ?? 0;
    const hasHealthyWorker = workerHealth.healthy === true || healthyWorkers > 0;
    if (hasHealthyWorker) {
      return null;
    }
    const reason = workerHealth.reason ? ` (${workerHealth.reason})` : "";
    return `Queue mode is enabled but no healthy remote executors are reporting${reason}.`;
  }, [workerHealth]);
  const workerHealthUnavailableWarning = useMemo(() => {
    if (!workerHealthError) {
      return null;
    }
    if (isTransientBackendSectionError(workerHealthError)) {
      return `Remote executor health check is temporarily unavailable: ${workerHealthError}`;
    }
    return `Remote executor health check failed: ${workerHealthError}`;
  }, [workerHealthError]);
  const ingestActionsBlockedReason = workerHealthWarning
          ? `${workerHealthWarning} Run Week and ${getWeekSyncActionLabel(platformFilter)} are disabled until executor health recovers.`
    : null;
  const staleRuns = useMemo<StaleRunState[]>(() => {
    const thresholdMs = staleThresholdMinutes * 60_000;
    if (thresholdMs <= 0) {
      return [];
    }
    const jobsByRunId = new Map<string, SocialJob[]>();
    for (const job of jobs) {
      if (!job.run_id) continue;
      const current = jobsByRunId.get(job.run_id) ?? [];
      current.push(job);
      jobsByRunId.set(job.run_id, current);
    }

    const now = Date.now();
    const staleItems: StaleRunState[] = [];
    for (const run of runs) {
      if (!ACTIVE_RUN_STATUSES.has(run.status)) continue;
      const runJobs = jobsByRunId.get(run.id) ?? [];
      const timestamps = [
        parseTimestampMs(run.updated_at),
        parseTimestampMs(run.started_at),
        parseTimestampMs(run.created_at),
        ...runJobs.map((job) => parseTimestampMs(job.updated_at)),
        ...runJobs.map((job) => parseTimestampMs(job.started_at)),
        ...runJobs.map((job) => parseTimestampMs(job.created_at)),
      ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      if (timestamps.length === 0) continue;
      const latestActivityMs = Math.max(...timestamps);
      const ageMs = now - latestActivityMs;
      if (ageMs < thresholdMs) continue;

      const pendingJobs =
        runJobs.length > 0
          ? runJobs.filter((job) => job.status === "queued" || job.status === "pending").length
          : Math.max(0, Number(run.summary?.active_jobs ?? 0));
      const retryingJobs =
        runJobs.length > 0 ? runJobs.filter((job) => job.status === "retrying").length : 0;
      const config = run.config as Record<string, unknown> | undefined;
      const ingestMode =
        typeof config?.ingest_mode === "string" && config.ingest_mode.trim()
          ? config.ingest_mode
          : "unknown";
      staleItems.push({
        runId: run.id,
        ingestMode,
        ageMinutes: Math.max(1, Math.floor(ageMs / 60_000)),
        pendingJobs,
        retryingJobs,
      });
    }
    return staleItems.sort((a, b) => b.ageMinutes - a.ageMinutes || a.runId.localeCompare(b.runId));
  }, [jobs, runs, staleThresholdMinutes]);
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
  const groupedFailureRows = useMemo(() => {
    const groups = new Map<
      string,
      {
        code: string;
        stage: string;
        count: number;
        platforms: Set<string>;
        latestTimestamp: string | null;
        latestTimestampMs: number;
        sampleMessage: string | null;
      }
    >();
    for (const job of runScopedJobs) {
      if (job.status !== "failed" && job.status !== "retrying") continue;
      const code =
        job.job_error_code ??
        ((job.metadata as Record<string, unknown> | undefined)?.job_error_code as string | undefined) ??
        "UNKNOWN";
      const normalizedCode = String(code || "UNKNOWN").toUpperCase();
      const stage = getJobStageLabel(job);
      const key = `${normalizedCode}:${stage}`;
      const timestamp = job.completed_at ?? job.started_at ?? job.created_at ?? null;
      const timestampMs = timestamp ? Date.parse(timestamp) : Number.NaN;
      const current = groups.get(key) ?? {
        code: normalizedCode,
        stage,
        count: 0,
        platforms: new Set<string>(),
        latestTimestamp: null,
        latestTimestampMs: Number.NaN,
        sampleMessage: null,
      };
      current.count += 1;
      current.platforms.add(job.platform);
      if (!Number.isNaN(timestampMs) && (Number.isNaN(current.latestTimestampMs) || timestampMs > current.latestTimestampMs)) {
        current.latestTimestamp = timestamp;
        current.latestTimestampMs = timestampMs;
      }
      if (!current.sampleMessage && typeof job.error_message === "string" && job.error_message.trim()) {
        current.sampleMessage = job.error_message.trim();
      }
      groups.set(key, current);
    }
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        platformsLabel: Array.from(group.platforms)
          .sort((a, b) => (PLATFORM_LABELS[a] ?? a).localeCompare(PLATFORM_LABELS[b] ?? b))
          .map((platform) => PLATFORM_LABELS[platform] ?? platform)
          .join(", "),
      }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          (Number.isNaN(b.latestTimestampMs) ? 0 : b.latestTimestampMs) -
            (Number.isNaN(a.latestTimestampMs) ? 0 : a.latestTimestampMs),
      );
  }, [runScopedJobs]);
  const latestFailureEvents = useMemo(() => {
    return runScopedJobs
      .filter((job) => job.status === "failed" || job.status === "retrying")
      .map((job) => {
        const timestamp = job.completed_at ?? job.started_at ?? job.created_at ?? null;
        const timestampMs = timestamp ? Date.parse(timestamp) : Number.NaN;
        const code =
          job.job_error_code ??
          ((job.metadata as Record<string, unknown> | undefined)?.job_error_code as string | undefined) ??
          "UNKNOWN";
        return {
          id: job.id,
          code: String(code || "UNKNOWN").toUpperCase(),
          stage: getJobStageLabel(job),
          platform: PLATFORM_LABELS[job.platform] ?? job.platform,
          status: job.status,
          message:
            typeof job.error_message === "string" && job.error_message.trim()
              ? job.error_message.trim()
              : "No error message provided",
          timestamp,
          timestampMs: Number.isNaN(timestampMs) ? 0 : timestampMs,
        };
      })
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 5);
  }, [runScopedJobs]);
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
  const hashtagPlatformScope = useMemo(() => new Set<Platform>(hashtagPlatformsInScope), [hashtagPlatformsInScope]);
  const hashtagWeeklyUsage = useMemo(() => {
    return weeklyPlatformRows.map((week) => {
      const usage = weekDetailHashtagUsageByWeek[week.week_index];
      if (!usage) {
        return {
          weekIndex: week.week_index,
          label: week.label ?? formatWeekScopeLabel(week.week_index),
          totalTokens: 0,
          uniqueTokens: 0,
        };
      }
      const scopedTags = new Set<string>();
      let totalTokens = 0;
      for (const platform of HASHTAG_PLATFORMS) {
        if (!hashtagPlatformScope.has(platform)) continue;
        totalTokens += Number(usage.byPlatform[platform] ?? 0);
        for (const tag of Object.keys(usage.tagCountsByPlatform[platform] ?? {})) {
          scopedTags.add(tag);
        }
      }
      return {
        weekIndex: week.week_index,
        label: week.label ?? formatWeekScopeLabel(week.week_index),
        totalTokens,
        uniqueTokens: scopedTags.size,
      };
    });
  }, [hashtagPlatformScope, weekDetailHashtagUsageByWeek, weeklyPlatformRows]);
  const hashtagSeasonCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const week of weeklyPlatformRows) {
      const usage = weekDetailHashtagUsageByWeek[week.week_index];
      if (!usage) continue;
      for (const platform of HASHTAG_PLATFORMS) {
        if (!hashtagPlatformScope.has(platform)) continue;
        for (const [tag, count] of Object.entries(usage.tagCountsByPlatform[platform] ?? {})) {
          counts.set(tag, (counts.get(tag) ?? 0) + Number(count));
        }
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [hashtagPlatformScope, weekDetailHashtagUsageByWeek, weeklyPlatformRows]);
  const hashtagPlatformUsage = useMemo(() => {
    const totals = createEmptyHashtagUsageByPlatform();
    for (const week of weeklyPlatformRows) {
      const usage = weekDetailHashtagUsageByWeek[week.week_index];
      if (!usage) continue;
      for (const platform of HASHTAG_PLATFORMS) {
        if (!hashtagPlatformScope.has(platform)) continue;
        totals[platform] += Number(usage.byPlatform[platform] ?? 0);
      }
    }
    return HASHTAG_PLATFORMS
      .filter((platform) => hashtagPlatformScope.has(platform))
      .map((platform) => ({
        platform,
        label: PLATFORM_LABELS[platform] ?? platform,
        count: totals[platform],
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [hashtagPlatformScope, weekDetailHashtagUsageByWeek, weeklyPlatformRows]);
  const hashtagTotalTokens = useMemo(
    () => hashtagSeasonCounts.reduce((sum, item) => sum + item.count, 0),
    [hashtagSeasonCounts],
  );
  const hashtagTopTag = hashtagSeasonCounts[0] ?? null;
  const hashtagPeakWeek = useMemo(() => {
    if (hashtagWeeklyUsage.length === 0) return null;
    return [...hashtagWeeklyUsage].sort((a, b) => b.totalTokens - a.totalTokens || a.weekIndex - b.weekIndex)[0];
  }, [hashtagWeeklyUsage]);
  const hashtagMaxWeeklyTokens = useMemo(
    () => Math.max(0, ...hashtagWeeklyUsage.map((item) => item.totalTokens)),
    [hashtagWeeklyUsage],
  );
  const hashtagMaxPlatformTokens = useMemo(
    () => Math.max(0, ...hashtagPlatformUsage.map((item) => item.count)),
    [hashtagPlatformUsage],
  );
  const hashtagUsageLoading = useMemo(() => {
    if (!needsWeekDetailHashtagAnalytics) return false;
    return weeklyPlatformRows.some(
      (row) =>
        !(row.week_index in weekDetailHashtagUsageByWeek) && weekDetailTokenCountsLoadingWeeks.has(row.week_index),
    );
  }, [needsWeekDetailHashtagAnalytics, weekDetailHashtagUsageByWeek, weekDetailTokenCountsLoadingWeeks, weeklyPlatformRows]);
  const hashtagUniqueCount = hashtagSeasonCounts.length;
  const isBravoView = analyticsView === "bravo";
  const isSentimentView = analyticsView === "sentiment";
  const isHashtagsView = needsWeekDetailHashtagAnalytics;
  const isAdvancedView = analyticsView === "advanced";
  const isRedditView = analyticsView === "reddit";
  const isCastContentView = analyticsView === "cast-content";
  const castComparisonWindow = useMemo(
    () => deriveCastComparisonWindow(analytics?.weekly),
    [analytics?.weekly],
  );
  const selectedRunLabel = selectedRunId ? (runOptionLabelById.get(selectedRunId) ?? null) : null;
  const platformHandleCounts = useMemo(() => {
    const counts: Record<Platform, number> = {
      instagram: 0,
      tiktok: 0,
      twitter: 0,
      youtube: 0,
      facebook: 0,
      threads: 0,
    };

    for (const platform of Object.keys(counts) as Platform[]) {
      const handles = new Set<string>();
      for (const target of targets) {
        if (target.is_active === false) continue;
        if (String(target.platform || "").trim().toLowerCase() !== platform) continue;
        for (const account of target.accounts ?? []) {
          const normalized = normalizeLinkedAccountHandle(account);
          if (normalized) {
            handles.add(normalized);
          }
        }
      }
      counts[platform] = handles.size;
    }

    return counts;
  }, [normalizeLinkedAccountHandle, targets]);
  const displayedTargets = useMemo(() => {
    if (platformTab === "overview") return targets;
    return targets.filter((target) => target.platform === platformTab);
  }, [platformTab, targets]);
  const selectedPlatformHandles = useMemo(() => {
    if (platformTab === "overview") return [] as string[];

    const handles = new Set<string>();
    for (const target of displayedTargets) {
      if (target.is_active === false) continue;
      for (const account of target.accounts ?? []) {
        const normalized = normalizeLinkedAccountHandle(account);
        if (normalized) {
          handles.add(normalized);
        }
      }
    }
    return [...handles].sort((left, right) => left.localeCompare(right));
  }, [displayedTargets, normalizeLinkedAccountHandle, platformTab]);
  const selectedPlatformHandleTabs = useMemo(
    () =>
      selectedPlatformHandles.map((handle) => {
        const cacheKey = `${platformTab}:${handle}`;
        const summary = linkedAccountSummaries[cacheKey] ?? {};
        return {
          handle,
          avatarUrl: summary.avatar_url ?? null,
          href: buildSocialAccountProfileUrl({ platform: platformTab, handle }),
        };
      }),
    [linkedAccountSummaries, platformTab, selectedPlatformHandles],
  );

  useEffect(() => {
    if (!isActiveView(analyticsView) || platformTab === "overview" || selectedPlatformHandles.length === 0) {
      return;
    }

    const missingHandles = selectedPlatformHandles.filter((handle) => !linkedAccountSummaries[`${platformTab}:${handle}`]);
    if (missingHandles.length === 0) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const headers = await getAuthHeaders();
      const nextEntries: Record<string, LinkedAccountProfileSummary> = {};
      await Promise.allSettled(
        missingHandles.map(async (handle) => {
          const response = await fetchAdminWithAuth(
            `/api/admin/trr-api/social/profiles/${encodeURIComponent(platformTab)}/${encodeURIComponent(handle)}/summary`,
            { headers, cache: "no-store" },
            { allowDevAdminBypass: true },
          );
          if (!response.ok) {
            throw new Error(`Failed to load linked handle summary for ${handle}`);
          }
          const data = (await response.json().catch(() => ({}))) as LinkedAccountProfileSummary;
          nextEntries[`${platformTab}:${handle}`] = {
            avatar_url: typeof data.avatar_url === "string" ? data.avatar_url : null,
            profile_url: typeof data.profile_url === "string" ? data.profile_url : null,
          };
        }),
      );
      if (cancelled || Object.keys(nextEntries).length === 0) {
        return;
      }
      setLinkedAccountSummaries((current) => ({ ...current, ...nextEntries }));
    })();

    return () => {
      cancelled = true;
    };
  }, [analyticsView, getAuthHeaders, isActiveView, linkedAccountSummaries, platformTab, selectedPlatformHandles]);
  const openLeaderboardLightbox = useCallback(
    (
      item: {
        platform: string;
        source_id: string;
        text: string;
        engagement: number;
        url: string;
        timestamp: string;
        hosted_thumbnail_url?: string | null;
        source_thumbnail_url?: string | null;
        thumbnail_url?: string | null;
        display_thumbnail_url?: string | null;
        display_thumbnail_variants?: DisplayThumbnailVariants;
        display_thumbnail_status?: string | Record<string, unknown> | null;
        display_thumbnail_srcset?: string | null;
      },
      sectionTitle: string,
      extraStats: SocialStatsItem[] = [],
    ) => {
      const canonicalThumbnailUrl = getCanonicalLeaderboardThumbnailUrl(item);
      if (!canonicalThumbnailUrl) return;
      const mediaType = detectSocialMediaType(canonicalThumbnailUrl);
      const metadata = buildLeaderboardMediaMetadata({
        item,
        sourceScope: scope,
        showName,
        seasonNumber,
        sectionTitle,
      });
      const stats: SocialStatsItem[] = [
        { label: "Platform", value: PLATFORM_LABELS[item.platform] ?? item.platform },
        { label: "Engagement", value: formatInteger(item.engagement) },
        ...extraStats,
      ];
      const entry: SocialLeaderboardLightboxEntry = {
        id: `${item.platform}-${item.source_id}`,
        src: canonicalThumbnailUrl,
        mediaType,
        posterSrc: canonicalThumbnailUrl,
        alt: `${PLATFORM_LABELS[item.platform] ?? item.platform} social media`,
        metadata,
        stats,
      };
      setLeaderboardLightbox({ entries: [entry], index: 0 });
    },
    [scope, seasonNumber, showName],
  );
  const closeLeaderboardLightbox = useCallback(() => {
    setLeaderboardLightbox(null);
  }, []);

  const ingestExportPopover = (
    <div
      ref={ingestExportPopoverRef}
      role="dialog"
      aria-label="Ingest + Export"
      className="absolute left-0 top-full z-30 mt-3 w-[min(30rem,calc(100vw-3rem))] rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-zinc-900">Ingest + Export</h4>
          <p className="mt-1 text-xs text-zinc-500">
            Run scoped sync jobs or export the current season social dataset.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIngestExportOpen(false)}
          className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
        >
          Close
        </button>
      </div>
      <div className="mt-4 space-y-3 text-sm text-zinc-600">
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
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Weekly Run</p>
          <div className="mt-2 grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Week
              <select
                value={weeklyRunWeek == null ? "" : String(weeklyRunWeek)}
                onChange={(event) => {
                  const rawValue = event.target.value;
                  if (!rawValue) {
                    setWeeklyRunWeek(null);
                    return;
                  }
                  const parsed = Number.parseInt(rawValue, 10);
                  setWeeklyRunWeek(Number.isFinite(parsed) ? parsed : null);
                }}
                disabled={runningIngest}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select a week</option>
                {(analytics?.weekly ?? []).map((week) => (
                  <option key={`ingest-week-${week.week_index}`} value={week.week_index}>
                    {week.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Platform
              <select
                value={weeklyRunPlatform}
                onChange={(event) => setWeeklyRunPlatform(event.target.value as "all" | Platform)}
                disabled={runningIngest}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="all">All Platforms</option>
                {PLATFORM_ORDER.map((platform) => (
                  <option key={`weekly-platform-${platform}`} value={platform}>
                    {PLATFORM_LABELS[platform]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                if (weeklyRunWeek == null) {
                  setError("Choose a week before running a week ingest.");
                  return;
                }
                void runIngest({ week: weeklyRunWeek, platform: weeklyRunPlatform });
              }}
              disabled={runningIngest || weeklyRunWeek == null}
              className={`w-full rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                runningIngest && ingestingWeek === weeklyRunWeek
                  ? "animate-pulse border-blue-400 bg-blue-50 text-blue-700"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {runningIngest && ingestingWeek === weeklyRunWeek
                ? `Running ${resolveWeekScopeLabel(weeklyRunWeek)}...`
                : "Run Selected Week"}
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Daily Run</p>
          <div className="mt-2 grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Day
              <input
                type="date"
                value={dayFilter}
                onChange={(event) => setDayFilter(event.target.value)}
                disabled={runningIngest}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Platform
              <select
                value={dailyRunPlatform}
                onChange={(event) => setDailyRunPlatform(event.target.value as "all" | Platform)}
                disabled={runningIngest}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="all">All Platforms</option>
                {PLATFORM_ORDER.map((platform) => (
                  <option key={`daily-platform-${platform}`} value={platform}>
                    {PLATFORM_LABELS[platform]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                if (!dayFilter) {
                  setError("Choose a day before running a day-specific sync.");
                  return;
                }
                void runIngest({ day: dayFilter, platform: dailyRunPlatform });
              }}
              disabled={runningIngest || !dayFilter}
              className={`w-full rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                runningIngest && ingestingDay === dayFilter
                  ? "animate-pulse border-blue-400 bg-blue-50 text-blue-700"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {runningIngest && ingestingDay === dayFilter
                ? `Running ${formatDayScopeLabel(dayFilter)}...`
                : "Run Selected Day"}
            </button>
          </div>
        </div>
        <button
          ref={runSeasonIngestButtonRef}
          type="button"
          onClick={() => runIngest()}
          disabled={runningIngest}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {runningIngest ? "Syncing..." : "Run Season Sync (All)"}
        </button>
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
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => downloadExport("csv")}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => downloadExport("pdf")}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Export PDF
          </button>
        </div>
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Run scope:{" "}
        <span className="font-semibold text-zinc-700">{activeRunScope.weekLabel}</span>
        {" · "}
        <span className="font-semibold text-zinc-700">{activeRunScope.platformLabel}</span>
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
    </div>
  );
  const seasonWindowTargetsAvailable = targets.length > 0;
  const seasonWindowSettingsPanel = (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-xs text-zinc-600 shadow-sm" data-testid="season-window-settings">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-zinc-700">Season Windows</p>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
          {officialSeasonWindows.length} official
        </span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="space-y-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Trailer Drop</span>
          <input
            type="datetime-local"
            value={seasonWindowDraft.trailerDropAt}
            onChange={(event) => {
              setSeasonWindowDraft((current) => ({ ...current, trailerDropAt: event.target.value }));
              setSeasonWindowError(null);
              setSeasonWindowMessage(null);
            }}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Post-Season End Override
          </span>
          <input
            type="datetime-local"
            value={seasonWindowDraft.postseasonEndAt}
            onChange={(event) => {
              setSeasonWindowDraft((current) => ({ ...current, postseasonEndAt: event.target.value }));
              setSeasonWindowError(null);
              setSeasonWindowMessage(null);
            }}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              void saveSeasonWindowSettings();
            }}
            disabled={!seasonWindowTargetsAvailable || !seasonWindowDraftChanged || seasonWindowSaving}
            className="w-full rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400 md:w-auto"
          >
            {seasonWindowSaving ? "Saving..." : "Save Windows"}
          </button>
        </div>
      </div>
      {seasonWindowError && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {seasonWindowError}
        </p>
      )}
      {seasonWindowMessage && !seasonWindowError && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          {seasonWindowMessage}
        </p>
      )}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              <th className="py-2 pr-4 font-semibold">Window</th>
              <th className="py-2 pr-4 font-semibold">Type</th>
              <th className="py-2 pr-4 font-semibold">Dates</th>
            </tr>
          </thead>
          <tbody>
            {officialSeasonWindows.map((window) => (
              <tr key={`season-window-${window.week_index}-${window.start}`} className="border-b border-zinc-100 last:border-0">
                <td className="py-2 pr-4 align-top font-semibold text-zinc-800">
                  {seasonWindowEpisodeLabel(window)}
                </td>
                <td className="py-2 pr-4 align-top text-zinc-600">
                  {seasonWindowTypeLabel(window.week_type)}
                </td>
                <td className="py-2 pr-4 align-top text-zinc-600">
                  {formatDateTime(window.start)} to {formatDateTime(window.end)}
                </td>
              </tr>
            ))}
            {officialSeasonWindows.length === 0 && (
              <tr>
                <td className="py-3 pr-4 text-zinc-500" colSpan={3}>
                  No official season windows yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
  const classificationRulesPanel = (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-xs text-zinc-600 shadow-sm">
      <p className="font-semibold text-zinc-700">
        {platformTab === "overview"
          ? "Classification Rules"
          : `${PLATFORM_LABELS[platformTab] ?? platformTab} Classification Rules`}
      </p>
      <ul className="mt-2 space-y-1">
        {displayedTargets.map((target) => (
          <li key={target.platform}>
            <span className="font-semibold text-zinc-700">{(PLATFORM_LABELS[target.platform] ?? target.platform) + ":"}</span>{" "}
            {(target.accounts ?? []).length > 0 ? (
              <>
                accounts{" "}
                {(target.accounts ?? []).map((account, index) => (
                  <span key={`${target.platform}-${account}`}>
                    {index > 0 ? ", " : ""}
                    <Link
                      href={buildSocialAccountProfileUrl({
                        platform: target.platform,
                        handle: account,
                      }) as Route}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      @{String(account).replace(/^@+/, "")}
                    </Link>
                  </span>
                ))}
                {formatClassificationRuleSummary(target) ? ` · ${formatClassificationRuleSummary(target)}` : ""}
              </>
            ) : (
              formatClassificationRuleSummary(target)
            )}
          </li>
        ))}
        {displayedTargets.length === 0 && (
          <li>
            {platformTab === "overview"
              ? "No active classification rules configured."
              : `No active ${(PLATFORM_LABELS[platformTab] ?? platformTab).toLowerCase()} classification rules configured.`}
          </li>
        )}
      </ul>
    </div>
  );
  const sharedAsyncPipelinePanel =
    sharedStatus || sharedStatusError ? (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-xs text-zinc-600 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-zinc-700">Shared Async Pipeline</p>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
              sharedStatus?.ingest_mode === "shared_account_async" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {sharedStatus?.ingest_mode === "shared_account_async" ? "Production Path" : "Unavailable"}
          </span>
        </div>
        {sharedStatusError ? (
          <p className="mt-2 text-amber-700">{sharedStatusError}</p>
        ) : (
          <>
            <p className="mt-2 text-zinc-600">
              Shared Bravo-owned account scraping feeds this season. These classification rules decide which posts materialize into the existing season tables.
            </p>
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <dt className="font-semibold text-zinc-700">Matched posts</dt>
                <dd>{formatInteger(sharedStatus?.matched_posts ?? 0)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="font-semibold text-zinc-700">Review queue</dt>
                <dd>{formatInteger(sharedStatus?.review_queue_count ?? 0)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="font-semibold text-zinc-700">Retained unassigned</dt>
                <dd>{formatInteger(sharedStatus?.retained_unassigned_count ?? 0)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="font-semibold text-zinc-700">Latest match</dt>
                <dd>{formatDateTime(sharedStatus?.latest_match_at)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "Shared scrape", value: sharedStatus?.shared_scrape_status },
                { label: "Classification", value: sharedStatus?.classification_status },
                { label: "Materialization", value: sharedStatus?.materialization_status },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getSyncStatusTone(item.value?.status)}`}
                >
                  <span>{item.label}</span>
                  <span>{formatSharedPipelineStageSummary(item.value)}</span>
                </span>
              ))}
            </div>
            {sharedStatus?.latest_shared_run?.run_id && (
              <p className="mt-3 text-xs text-zinc-500">
                Latest shared run {sharedStatus.latest_shared_run.run_id.slice(0, 8)} ·{" "}
                {formatSyncStatusLabel(sharedStatus.latest_shared_run.status)} ·{" "}
                {formatDateTime(
                  sharedStatus.latest_shared_run.completed_at ??
                    sharedStatus.latest_shared_run.started_at ??
                    sharedStatus.latest_shared_run.created_at,
                )}
              </p>
            )}
          </>
        )}
      </div>
    ) : null;
  const socialRulePanels = (
    <div className="space-y-4">
      {seasonWindowSettingsPanel}
      <div className={`grid gap-4 ${sharedAsyncPipelinePanel ? "xl:grid-cols-2" : ""}`}>
        {classificationRulesPanel}
        {sharedAsyncPipelinePanel}
      </div>
    </div>
  );
  const socialControlsRail = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <button
          ref={ingestExportTriggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={ingestExportOpen}
          onClick={() => {
            setIngestExportOpen((open) => !open);
            if (!ingestExportOpen) {
              window.requestAnimationFrame(() => {
                runSeasonIngestButtonRef.current?.focus();
              });
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
        >
          <span>Ingest + Export</span>
          <svg
            className={`h-4 w-4 transition-transform ${ingestExportOpen ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {ingestExportOpen && ingestExportPopover}
      </div>
      <label className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 shadow-sm">
        <span>Run</span>
        <select
          aria-label="Run"
          value={selectedRunId ?? ""}
          onChange={(event) => {
            const nextRunId = event.target.value || null;
            setSelectedRunId(nextRunId);
            setSectionErrors((current) => ({ ...current, jobs: null }));
          }}
          disabled={runningIngest}
          title={selectedRunLabel ?? "No Run Selected"}
          className="min-w-[15rem] appearance-none bg-transparent pr-5 text-sm font-semibold normal-case tracking-normal text-zinc-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
  );
  const linkedHandleTabs =
    platformTab !== "overview" && selectedPlatformHandleTabs.length > 0 ? (
      <nav
        className="flex flex-wrap items-center gap-2"
        aria-label={`${PLATFORM_LABELS[platformTab] ?? platformTab} linked handles`}
      >
        <span className="inline-flex items-center rounded-full border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          ALL
        </span>
        {selectedPlatformHandleTabs.map((tab) => (
          <Link
            key={`${platformTab}-${tab.handle}`}
            href={tab.href as Route}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            {tab.avatarUrl ? (
              <Image
                src={tab.avatarUrl}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded-full border border-zinc-200 object-cover"
                unoptimized
              />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[10px] font-bold uppercase text-zinc-500">
                {tab.handle.slice(0, 2)}
              </span>
            )}
            <span>@{tab.handle}</span>
          </Link>
        ))}
      </nav>
    ) : null;
  const shouldRenderInlineControls = !hidePlatformTabs && !externalControlsTarget;
  const shouldRenderPortaledControls = Boolean(hidePlatformTabs && externalControlsTarget);
  const portaledHeaderRail = (
    <div className="space-y-3">
      {linkedHandleTabs}
      {socialControlsRail}
    </div>
  );

  return (
    <div className="space-y-6">
      {!isRedditView && !isCastContentView && (
        // Sync-session presentation, including "Missing comment media" and
        // `missing_comment_media_count`, is owned by SeasonSocialIngestControls.
        <SeasonSocialIngestControls
          JOB_STATUS_PLAIN={JOB_STATUS_PLAIN}
          PLATFORM_LABELS={PLATFORM_LABELS}
          PLATFORM_TABS={PLATFORM_TABS}
          SOCIAL_FULL_SYNC_MIRROR_ENABLED={SOCIAL_FULL_SYNC_MIRROR_ENABLED}
          STAGE_LABELS_PLAIN={STAGE_LABELS_PLAIN}
          SocialPlatformTabIcon={SocialPlatformTabIcon}
          activeSyncSession={activeSyncSession}
          activeSyncSessionRetryKind={activeSyncSessionRetryKind}
          analytics={analytics}
          buildPreviewPlatformStatuses={buildPreviewPlatformStatuses}
          createPortal={createPortal}
          elapsedTick={elapsedTick}
          error={error}
          externalControlsTarget={externalControlsTarget}
          formatActiveJobSummary={formatActiveJobSummary}
          formatCountersPlain={formatCountersPlain}
          formatDateTime={formatDateTime}
          formatDateTimeFromDate={formatDateTimeFromDate}
          formatInteger={formatInteger}
          formatJobActivitySummary={formatJobActivitySummary}
          formatMirrorCoverageLabel={formatMirrorCoverageLabel}
          formatSyncStatusLabel={formatSyncStatusLabel}
          getJobActivity={getJobActivity}
          getJobPersistCounters={getJobPersistCounters}
          getJobStageCounters={getJobStageCounters}
          getJobStageLabel={getJobStageLabel}
          getSyncStatusTone={getSyncStatusTone}
          hidePlatformTabs={hidePlatformTabs}
          ingestMessage={ingestMessage}
          ingestStartedAt={ingestStartedAt}
          lastUpdated={lastUpdated}
          linkedHandleTabs={linkedHandleTabs}
          liveRunLogs={liveRunLogs}
          platformHandleCounts={platformHandleCounts}
          platformTab={platformTab}
          pollingStatus={pollingStatus}
          portaledHeaderRail={portaledHeaderRail}
          retryActiveSyncSession={retryActiveSyncSession}
          runScopedJobs={runScopedJobs}
          runningIngest={runningIngest}
          sectionErrorItems={sectionErrorItems}
          setPlatformTabAndUrl={setPlatformTabAndUrl}
          setSyncDetailsExpanded={setSyncDetailsExpanded}
          shouldRenderInlineControls={shouldRenderInlineControls}
          shouldRenderPortaledControls={shouldRenderPortaledControls}
          socialControlsRail={socialControlsRail}
          staleFallbackItems={staleFallbackItems}
          staleFallbackMessage={staleFallbackMessage}
          syncCommentsCoveragePreview={syncCommentsCoveragePreview}
          syncDetailsExpanded={syncDetailsExpanded}
          syncMirrorCoveragePreview={syncMirrorCoveragePreview}
          workerHealth={workerHealth}
        />
      )}

      {isCastContentView ? (
        <CastContentSection
          showId={showId}
          showSlug={showRouteSlug}
          seasonNumber={seasonNumber}
          comparisonWindow={castComparisonWindow}
        />
      ) : isRedditView ? (
        <RedditSourcesManager
          mode="season"
          showId={showId}
          showSlug={showRouteSlug}
          showName={showName}
          seasonId={seasonId}
          seasonNumber={seasonNumber}
        />
      ) : loading && !analytics ? (
        <div data-testid="social-analytics-skeleton" className="space-y-4">
          <SeasonSocialOverview
            variant={"skeleton"}
            Link={Link}
            analytics={analytics}
            commentsSavedActualSummary={commentsSavedActualSummary}
            commentsSavedPctCard={commentsSavedPctCard}
            contentTypeDistributionLines={contentTypeDistributionLines}
            formatCompactInteger={formatCompactInteger}
            formatDateTime={formatDateTime}
            formatInteger={formatInteger}
            formatPctLabel={formatPctLabel}
            formatPercent={formatPercent}
            isAdvancedView={isAdvancedView}
            isBravoView={isBravoView}
            isHashtagsView={isHashtagsView}
            isSentimentView={isSentimentView}
            platformTab={platformTab}
            postMetadataMetricCards={postMetadataMetricCards}
            postMetadataTotalPosts={postMetadataTotalPosts}
            youtubeContentBreakdown={youtubeContentBreakdown}
          />
        </div>
      ) : (
        <>
          <SeasonSocialOverview
            variant={"content"}
            Link={Link}
            analytics={analytics}
            commentsSavedActualSummary={commentsSavedActualSummary}
            commentsSavedPctCard={commentsSavedPctCard}
            contentTypeDistributionLines={contentTypeDistributionLines}
            formatCompactInteger={formatCompactInteger}
            formatDateTime={formatDateTime}
            formatInteger={formatInteger}
            formatPctLabel={formatPctLabel}
            formatPercent={formatPercent}
            isAdvancedView={isAdvancedView}
            isBravoView={isBravoView}
            isHashtagsView={isHashtagsView}
            isSentimentView={isSentimentView}
            platformTab={platformTab}
            postMetadataMetricCards={postMetadataMetricCards}
            postMetadataTotalPosts={postMetadataTotalPosts}
            youtubeContentBreakdown={youtubeContentBreakdown}
          />

        <SeasonSocialWeeklyTable
          Link={Link}
          PLATFORM_LABELS={PLATFORM_LABELS}
          PLATFORM_ORDER={PLATFORM_ORDER}
          SOCIAL_ALERTS_QUERY_KEY={SOCIAL_ALERTS_QUERY_KEY}
          SOCIAL_DENSITY_QUERY_KEY={SOCIAL_DENSITY_QUERY_KEY}
          SOCIAL_METRIC_MODE_QUERY_KEY={SOCIAL_METRIC_MODE_QUERY_KEY}
          SOCIAL_TABLE_METRICS_QUERY_KEY={SOCIAL_TABLE_METRICS_QUERY_KEY}
          SOCIAL_TABLE_METRIC_KEYS={SOCIAL_TABLE_METRIC_KEYS}
          SOCIAL_TABLE_METRIC_OPTIONS={SOCIAL_TABLE_METRIC_OPTIONS}
          activeFailureErrorCounts={activeFailureErrorCounts}
          analytics={analytics}
          analyticsView={analyticsView}
          benchmarkCompareMode={benchmarkCompareMode}
          benchmarkSummary={benchmarkSummary}
          buildSeasonSocialWeekUrl={buildSeasonSocialWeekUrl}
          buildWeekDetailHref={buildWeekDetailHref}
          dataQuality={dataQuality}
          formatDateOnly={formatDateOnly}
          formatDateShort={formatDateShort}
          formatDateTime={formatDateTime}
          formatDurationLabel={formatDurationLabel}
          formatFreshnessLabel={formatFreshnessLabel}
          formatInteger={formatInteger}
          formatMetricCountLabel={formatMetricCountLabel}
          formatPctLabel={formatPctLabel}
          getHeatmapToneClass={getHeatmapToneClass}
          getHeatmapWeekSectionLabel={getHeatmapWeekSectionLabel}
          getMonthDayLabel={getMonthDayLabel}
          getPlatformCoverage={getPlatformCoverage}
          getTotalCoverage={getTotalCoverage}
          getWeekEpisodeLabel={getWeekEpisodeLabel}
          getWeekSyncActionLabel={getWeekSyncActionLabel}
          getWeeklyDayValue={getWeeklyDayValue}
          getWeeklyFlagToneClass={getWeeklyFlagToneClass}
          getWeeklyTableEpisodePrimaryLabel={getWeeklyTableEpisodePrimaryLabel}
          getWeeklyTableEpisodeSecondaryLabel={getWeeklyTableEpisodeSecondaryLabel}
          groupedFailureRows={groupedFailureRows}
          heatmapPlatform={heatmapPlatform}
          ingestActionsBlockedReason={ingestActionsBlockedReason}
          ingestingWeek={ingestingWeek}
          isAdvancedView={isAdvancedView}
          isBravoView={isBravoView}
          isCoveragePctUpToDate={isCoveragePctUpToDate}
          latestFailureEvents={latestFailureEvents}
          needsWeekDetailTokenMetrics={needsWeekDetailTokenMetrics}
          platformFilter={platformFilter}
          platformTab={platformTab}
          router={router}
          runHealth={runHealth}
          runIngest={runIngest}
          runSummaries={runSummaries}
          runSummariesLoading={runSummariesLoading}
          runSummaryError={runSummaryError}
          runningIngest={runningIngest}
          seasonNumber={seasonNumber}
          selectedTableMetricSet={selectedTableMetricSet}
          selectedTableMetrics={selectedTableMetrics}
          setBenchmarkCompareMode={setBenchmarkCompareMode}
          setSocialAlertsEnabled={setSocialAlertsEnabled}
          setSocialDensity={setSocialDensity}
          setSocialMetricMode={setSocialMetricMode}
          setSocialPreferenceInUrl={setSocialPreferenceInUrl}
          setWeeklyMetric={setWeeklyMetric}
          showRouteSlug={showRouteSlug}
          socialAlertsEnabled={socialAlertsEnabled}
          socialDensity={socialDensity}
          socialMetricMode={socialMetricMode}
          socialMetricModeQueryValue={socialMetricModeQueryValue}
          socialRulePanels={socialRulePanels}
          socialTableMetricsQueryValue={socialTableMetricsQueryValue}
          staleRuns={staleRuns}
          staleThresholdMinutes={staleThresholdMinutes}
          toggleAllSocialTableMetrics={toggleAllSocialTableMetrics}
          toggleSocialTableMetric={toggleSocialTableMetric}
          weekDetailTokenCountsByWeek={weekDetailTokenCountsByWeek}
          weekDetailTokenCountsLoadingWeeks={weekDetailTokenCountsLoadingWeeks}
          weeklyDailyActivityRows={weeklyDailyActivityRows}
          weeklyFlagsByWeek={weeklyFlagsByWeek}
          weeklyHeatmapCommentTotals={weeklyHeatmapCommentTotals}
          weeklyHeatmapMaxValue={weeklyHeatmapMaxValue}
          weeklyHeatmapPostTotals={weeklyHeatmapPostTotals}
          weeklyMetric={weeklyMetric}
          weeklyPlatformEngagementByWeek={weeklyPlatformEngagementByWeek}
          weeklyPlatformRows={weeklyPlatformRows}
          workerHealthUnavailableWarning={workerHealthUnavailableWarning}
        />

        <SeasonSocialInsightPanels
          PLATFORM_LABELS={PLATFORM_LABELS}
          analytics={analytics}
          castAttitudePrototypeRows={castAttitudePrototypeRows}
          formatInteger={formatInteger}
          getCanonicalLeaderboardThumbnailImage={getCanonicalLeaderboardThumbnailImage}
          hashtagMaxPlatformTokens={hashtagMaxPlatformTokens}
          hashtagMaxWeeklyTokens={hashtagMaxWeeklyTokens}
          hashtagPeakWeek={hashtagPeakWeek}
          hashtagPlatformUsage={hashtagPlatformUsage}
          hashtagSeasonCounts={hashtagSeasonCounts}
          hashtagTopTag={hashtagTopTag}
          hashtagTotalTokens={hashtagTotalTokens}
          hashtagUniqueCount={hashtagUniqueCount}
          hashtagUsageLoading={hashtagUsageLoading}
          hashtagWeeklyUsage={hashtagWeeklyUsage}
          isBravoView={isBravoView}
          isHashtagsView={isHashtagsView}
          isSentimentView={isSentimentView}
          isVideoLikeThumbnailUrl={isVideoLikeThumbnailUrl}
          openLeaderboardLightbox={openLeaderboardLightbox}
          viewerAttitudeByPlatformRows={viewerAttitudeByPlatformRows}
        />

        <SeasonSocialRunStatus
          JOB_STATUS_PLAIN={JOB_STATUS_PLAIN}
          PLATFORM_LABELS={PLATFORM_LABELS}
          PLATFORM_ORDER={PLATFORM_ORDER}
          STAGE_LABELS_PLAIN={STAGE_LABELS_PLAIN}
          SocialPostsSection={SocialPostsSection}
          expandedJobErrors={expandedJobErrors}
          formatCountersPlain={formatCountersPlain}
          formatDateTime={formatDateTime}
          formatJobActivitySummary={formatJobActivitySummary}
          getJobActivity={getJobActivity}
          getJobPersistCounters={getJobPersistCounters}
          getJobStageCounters={getJobStageCounters}
          getJobStageLabel={getJobStageLabel}
          isAdvancedView={isAdvancedView}
          isBravoView={isBravoView}
          jobsOpen={jobsOpen}
          manualSourcesOpen={manualSourcesOpen}
          refreshSelectedRunJobs={refreshSelectedRunJobs}
          runIngest={runIngest}
          runScopedJobs={runScopedJobs}
          runningIngest={runningIngest}
          seasonId={seasonId}
          selectedRunId={selectedRunId}
          setExpandedJobErrors={setExpandedJobErrors}
          setJobsOpen={setJobsOpen}
          setManualSourcesOpen={setManualSourcesOpen}
          showId={showId}
          showName={showName}
        />
        </>
      )}
      {leaderboardLightbox && leaderboardLightbox.entries[leaderboardLightbox.index] && (
        <ImageLightbox
          src={leaderboardLightbox.entries[leaderboardLightbox.index].src}
          alt={leaderboardLightbox.entries[leaderboardLightbox.index].alt}
          mediaType={leaderboardLightbox.entries[leaderboardLightbox.index].mediaType}
          videoPosterSrc={leaderboardLightbox.entries[leaderboardLightbox.index].posterSrc}
          isOpen={true}
          onClose={closeLeaderboardLightbox}
          metadata={leaderboardLightbox.entries[leaderboardLightbox.index].metadata}
          metadataExtras={
            <SocialStatsPanel stats={leaderboardLightbox.entries[leaderboardLightbox.index].stats} />
          }
          position={{
            current: leaderboardLightbox.index + 1,
            total: leaderboardLightbox.entries.length,
          }}
          hasPrevious={false}
          hasNext={false}
        />
      )}
    </div>
  );
}
