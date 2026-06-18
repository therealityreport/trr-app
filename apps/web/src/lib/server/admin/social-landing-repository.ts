import "server-only";

import {
  buildPersonExternalIdUrl,
  normalizePersonExternalIdValue,
  type PersonExternalIdRecord,
  type PersonExternalIdSource,
} from "@/lib/admin/person-external-ids";
import { SOCIAL_ACCOUNT_SOCIALBLADE_ENABLED_PLATFORMS } from "@/lib/admin/social-account-profile";
import {
  buildSocialAccountProfileUrl,
  normalizeSocialAccountProfileHandle,
} from "@/lib/admin/show-admin-routes";
import type {
  CastSocialBladeAccountSummary,
  CastSocialBladeMemberSummary,
  CastSocialBladePlatform,
  CastSocialBladeShowSummary,
  NetworkProfileSet,
  PersonProfileShowSummary,
  PersonProfileSummary,
  PersonTargetSummary,
  RedditDashboardSummary,
  ScrapeJobHealthSummary,
  SharedAccountSourceSummary,
  SharedAccountSourceSet,
  SharedAccountSourceSetScope,
  SharedAccountSourceLoadStatus,
  SharedPipelineSummary,
  SharedReviewItemSummary,
  SharedRunSummary,
  SocialAccountProgressLaneKey,
  SocialAccountProgressLaneSummary,
  SocialAccountProgressSummary,
  ShowProfileSet,
  SocialHandleSummary,
  SocialLandingPayload,
  SocialLandingPlatform,
  SocialLandingProgressStatus,
} from "@/lib/admin/social-landing";
import { listRedditCommunities } from "@/lib/server/admin/reddit-sources-repository";
import { parseCacheTtlMs } from "@/lib/server/admin/route-response-cache";
import {
  getCoveredShows,
  type CoveredShow,
} from "@/lib/server/admin/covered-shows-repository";
import { loadSharedAccountSourcesFromLocalDb } from "@/lib/server/admin/shared-account-sources";
import { query, queryWithStatementTimeout } from "@/lib/server/postgres";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import {
  fetchSocialBackendJson,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
  SOCIAL_PROXY_PROGRESS_TIMEOUT_MS,
} from "@/lib/server/trr-api/social-admin-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";
import {
  listPrimaryPersonExternalIdsByPersonIds,
  listEffectivePersonSocialHandlesByPersonIds,
  listShowExternalIdsByIds,
  type PersonEffectiveSocialHandles,
} from "@/lib/server/trr-api/trr-shows-repository";

type SharedSourcesPayload = {
  sources?: SharedAccountSourceSummary[];
};

type SharedReviewPayload = {
  items?: SharedReviewItemSummary[];
};

type ScrapeJobHealthRow = {
  generated_at?: string | Date | null;
  window_started_at?: string | Date | null;
  total_jobs?: number | string | null;
  active_jobs?: number | string | null;
  failed_jobs?: number | string | null;
  failure_signal_jobs?: number | string | null;
  in_failed_sql_transaction_hits?: number | string | null;
  latest_failure_at?: string | Date | null;
};

type CastSummaryMember = {
  person_id?: string | null;
  full_name?: string | null;
  photo_url?: string | null;
};

type CastSummaryShow = {
  show_id?: string | null;
  cast_members?: CastSummaryMember[];
};

type CastSummaryBatchPayload = {
  shows?: CastSummaryShow[];
};

type BackendLandingSummaryPayload = {
  covered_shows?: CoveredShow[];
  reddit_dashboard?: RedditDashboardSummary;
};

type SocialBladeRowsPayload = {
  rows?: SocialBladeSummaryRow[];
};

type SocialBladeProgressCountsPayload = {
  rows?: SocialBladeProgressCountRow[];
};

type SocialProgressRollupPayload = {
  rows?: SocialProgressRow[];
  cache_status?: string | null;
  generated_at?: string | Date | null;
  stale?: boolean | null;
  timing?: {
    backend_ms?: number | string | null;
    database_ms?: number | string | null;
    total_ms?: number | string | null;
  } | null;
};

const SCRAPE_JOB_HEALTH_WINDOW_HOURS = 8;
const EMPTY_SCRAPE_JOB_HEALTH: ScrapeJobHealthSummary = {
  window_hours: SCRAPE_JOB_HEALTH_WINDOW_HOURS,
  window_started_at: null,
  generated_at: null,
  total_jobs: 0,
  active_jobs: 0,
  failed_jobs: 0,
  failure_signal_jobs: 0,
  in_failed_sql_transaction_hits: 0,
  latest_failure_at: null,
};

type SocialBladeProgressCountRow = {
  platform: string | null;
  account_handle: string | null;
  socialblade_scraped_count: number | string | null;
  socialblade_saved_count: number | string | null;
  socialblade_supported?: boolean | null;
};

type SocialProgressRow = {
  platform: string | null;
  account_handle: string | null;
  saved_count: number | string | null;
  scraped_count: number | string | null;
  socialblade_scraped_count?: number | string | null;
  socialblade_saved_count?: number | string | null;
  socialblade_supported?: boolean | null;
  following_saved_count?: number | string | null;
  following_total_count?: number | string | null;
  comments_saved_count?: number | string | null;
  comments_total_count?: number | string | null;
  media_saved_count?: number | string | null;
  media_total_count?: number | string | null;
};

type SupportedPersonSocialSource = Extract<
  PersonExternalIdSource,
  "facebook" | "instagram" | "threads" | "twitter" | "tiktok" | "youtube"
>;

type SocialBladeSummaryRow = Record<string, unknown> & {
  id: string | null;
  person_id: string | null;
  platform: string | null;
  account_handle: string | null;
  scraped_at: string | Date | null;
  updated_at: string | Date | null;
  created_at: string | Date | null;
  stats_refreshed: boolean | null;
  socialblade_url: string | null;
};

export type SocialLandingPayloadResult = {
  payload: SocialLandingPayload;
  cacheable: boolean;
};

export type SocialLandingTimingCollector = {
  recordBackendMs: (durationMs: number) => void;
  recordDbMs: (durationMs: number) => void;
};

type CacheableValue<T> = {
  value: T;
  cacheable: boolean;
};

type SocialProgressSummaryResult = CacheableValue<ReadonlyMap<string, SocialAccountProgressSummary>> & {
  status: SocialLandingProgressStatus;
};

type SharedSourcesResult = CacheableValue<SharedAccountSourceSummary[]> & {
  status: SharedAccountSourceLoadStatus;
};

type LandingSummaryResult = {
  coveredShows: CoveredShow[];
  redditDashboard: RedditDashboardSummary;
  cacheable: boolean;
};

const cacheableValue = <T>(value: T): CacheableValue<T> => ({
  value,
  cacheable: true,
});

const uncacheableValue = <T>(value: T): CacheableValue<T> => ({
  value,
  cacheable: false,
});

const toCacheableValue = async <T>(promise: Promise<T>): Promise<CacheableValue<T>> =>
  cacheableValue(await promise);

const logSocialLandingTiming = (
  label: string,
  startedAt: number,
  status: "ok" | "timeout" | "error",
  extra?: Record<string, unknown>,
): void => {
  console.info("[social-landing] timing", {
    step: label,
    status,
    elapsed_ms: Date.now() - startedAt,
    ...(extra ?? {}),
  });
};

const withSocialLandingTiming = async <T>(
  label: string,
  promise: Promise<T>,
): Promise<T> => {
  const startedAt = Date.now();
  try {
    const value = await promise;
    logSocialLandingTiming(label, startedAt, "ok");
    return value;
  } catch (error) {
    logSocialLandingTiming(label, startedAt, "error", {
      error: error instanceof Error ? error.name : typeof error,
    });
    throw error;
  }
};

const withOptionalLandingTimeout = async <T>(
  label: string,
  promise: Promise<CacheableValue<T>>,
  fallbackValue: T,
  timeoutMs = SOCIAL_LANDING_OPTIONAL_ENRICHMENT_TIMEOUT_MS,
): Promise<CacheableValue<T>> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const startedAt = Date.now();
  const trackedPromise = promise.then(
    (value) => {
      if (!timedOut) {
        logSocialLandingTiming(label, startedAt, "ok", {
          cacheable: value.cacheable,
        });
      }
      return value;
    },
    (error) => {
      if (!timedOut) {
        logSocialLandingTiming(label, startedAt, "error", {
          error: error instanceof Error ? error.name : typeof error,
        });
      }
      throw error;
    },
  );
  try {
    return await Promise.race([
      trackedPromise,
      new Promise<CacheableValue<T>>((resolve) => {
        timeoutId = setTimeout(() => {
          timedOut = true;
          logSocialLandingTiming(label, startedAt, "timeout", {
            timeout_ms: timeoutMs,
          });
          console.warn(`[social-landing] Timed out optional ${label} enrichment`);
          resolve(uncacheableValue(fallbackValue));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const PERSON_SOCIAL_SOURCES: readonly SupportedPersonSocialSource[] = [
  "facebook",
  "instagram",
  "threads",
  "twitter",
  "tiktok",
  "youtube",
] as const;

const SHARED_SOURCE_SETS: readonly {
  key: string;
  title: string;
  source_scope: SharedAccountSourceSetScope;
  description: string;
}[] = [
  {
    key: "bravo-tv",
    title: "Bravo TV",
    source_scope: "network",
    description: "Configured network-level shared social accounts.",
  },
  {
    key: "news",
    title: "News",
    source_scope: "news",
    description: "Publication and news outlet social accounts.",
  },
  {
    key: "creators",
    title: "Creators",
    source_scope: "creator",
    description: "Independent content creator and fan account sources.",
  },
];

const LEGACY_NETWORK_SET_KEY = "bravo-tv";
const LEGACY_NETWORK_SET_TITLE = "Bravo TV";
const LEGACY_NETWORK_SET_DESCRIPTION =
  "Shared Bravo social handles used in sends and profile backfills.";

const CAST_SOCIALBLADE_PLATFORMS =
  SOCIAL_ACCOUNT_SOCIALBLADE_ENABLED_PLATFORMS.filter(
    (platform): platform is CastSocialBladePlatform =>
      platform === "instagram" ||
      platform === "tiktok" ||
      platform === "youtube" ||
      platform === "facebook",
  );

const SOCIAL_LANDING_PROGRESS_MAX_TARGETS = 96;
const SOCIAL_LANDING_PROGRESS_STATEMENT_TIMEOUT_MS = 1_200;
const SOCIAL_LANDING_OPTIONAL_ENRICHMENT_TIMEOUT_MS = parseCacheTtlMs(
  process.env.TRR_ADMIN_SOCIAL_LANDING_OPTIONAL_ENRICHMENT_TIMEOUT_MS,
  2_500,
);

const sqlJsonTextNonNegativeInt = (expr: string): string =>
  `coalesce(nullif(regexp_replace(coalesce(${expr}, ''), '[^0-9]', '', 'g'), '')::bigint, 0)`;

const instagramReportedCommentsSql = (alias: string): string => {
  const safeAlias = alias.trim() || "p";
  const raw = `coalesce(${safeAlias}.raw_data, '{}'::jsonb)`;
  const rawCandidates = [
    `${raw} ->> 'comments_count'`,
    `${raw} ->> 'comments'`,
    `${raw} ->> 'comment_count'`,
    `${raw} ->> 'commentsCount'`,
    `${raw} -> 'edge_media_to_comment' ->> 'count'`,
    `${raw} -> 'edge_media_to_parent_comment' ->> 'count'`,
    `${raw} -> 'edge_media_preview_comment' ->> 'count'`,
    `${raw} -> 'media' ->> 'comments_count'`,
    `${raw} -> 'media' ->> 'comments'`,
    `${raw} -> 'media' ->> 'comment_count'`,
    `${raw} -> 'media' ->> 'commentsCount'`,
    `${raw} -> 'metrics' ->> 'comments_count'`,
    `${raw} -> 'metrics' ->> 'comments'`,
  ];

  return `greatest(coalesce(${safeAlias}.comments_count, 0), ${rawCandidates
    .map(sqlJsonTextNonNegativeInt)
    .join(", ")}, 0)`;
};

const SHOW_EXTERNAL_ID_KEYS: Record<
  SupportedPersonSocialSource,
  readonly string[]
> = {
  facebook: ["facebook_handle", "facebook", "facebook_id"],
  instagram: ["instagram_handle", "instagram", "instagram_id"],
  threads: ["threads_handle", "threads", "threads_id"],
  twitter: ["twitter_handle", "twitter", "x_handle", "twitter_id", "x_id"],
  tiktok: ["tiktok_handle", "tiktok", "tiktok_id"],
  youtube: ["youtube_handle", "youtube", "youtube_id"],
};

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const normalizePlatform = (
  value: string | null | undefined,
): SocialLandingPlatform | null => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (
    normalized === "instagram" ||
    normalized === "tiktok" ||
    normalized === "twitter" ||
    normalized === "youtube" ||
    normalized === "facebook" ||
    normalized === "threads"
  ) {
    return normalized;
  }
  return null;
};

const formatHandleLabel = (
  platform: SocialLandingPlatform,
  value: string,
): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (platform === "youtube") return trimmed;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
};

const toCanonicalInternalHandle = (
  platform: SocialLandingPlatform,
  value: string,
): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (platform === "youtube") {
    const normalizedYoutube = normalizePersonExternalIdValue("youtube", trimmed);
    if (!normalizedYoutube) return null;
    if (
      normalizedYoutube.startsWith("channel/") ||
      normalizedYoutube.startsWith("user/") ||
      normalizedYoutube.startsWith("c/")
    ) {
      return null;
    }
    return normalizeSocialAccountProfileHandle(normalizedYoutube);
  }

  if (
    platform === "facebook" ||
    platform === "instagram" ||
    platform === "twitter" ||
    platform === "tiktok"
  ) {
    return normalizeSocialAccountProfileHandle(
      normalizePersonExternalIdValue(platform, trimmed),
    );
  }

  return normalizeSocialAccountProfileHandle(trimmed);
};

const toCanonicalPersonSocialHandle = (
  platform: SupportedPersonSocialSource,
  value: string,
): string | null => {
  const normalizedValue = normalizePersonExternalIdValue(platform, value);
  if (!normalizedValue) return null;

  if (platform === "youtube") {
    const routeMatch = normalizedValue.match(/^(?:user|c|channel)\/(.+)$/i);
    return normalizeSocialAccountProfileHandle(
      routeMatch?.[1] ?? normalizedValue,
    );
  }

  return (
    normalizeSocialAccountProfileHandle(normalizedValue) ??
    normalizedValue.replace(/^@+/, "")
  );
};

const buildInternalHandleSummary = (
  platform: SocialLandingPlatform,
  value: string,
): SocialHandleSummary | null => {
  const canonicalHandle = toCanonicalInternalHandle(platform, value);
  if (!canonicalHandle) return null;
  return {
    platform,
    handle: canonicalHandle,
    display_label: formatHandleLabel(platform, canonicalHandle),
    href: buildSocialAccountProfileUrl({ platform, handle: canonicalHandle }),
    external: false,
  };
};

const buildPersonHandleSummary = (
  record: PersonExternalIdRecord,
): SocialHandleSummary | null => {
  if (!PERSON_SOCIAL_SOURCES.includes(record.source_id as SupportedPersonSocialSource)) {
    return null;
  }

  const platform = record.source_id as SupportedPersonSocialSource;
  const normalizedValue = normalizePersonExternalIdValue(platform, record.external_id);
  if (!normalizedValue) return null;

  const canonicalHandle = toCanonicalPersonSocialHandle(platform, record.external_id);
  if (!canonicalHandle) return null;

  const displayValue =
    platform === "youtube" && normalizedValue.startsWith("@")
      ? `@${canonicalHandle}`
      : canonicalHandle;

  return {
    platform,
    handle: canonicalHandle,
    display_label: formatHandleLabel(platform, displayValue),
    href: buildPersonExternalIdUrl(platform, record.external_id),
    external: true,
  };
};

const buildPersonHandleSummaryFromSource = (
  source: SupportedPersonSocialSource,
  value: string | null | undefined,
): SocialHandleSummary | null => {
  if (typeof value !== "string") return null;
  const normalizedValue = normalizePersonExternalIdValue(source, value);
  if (!normalizedValue) return null;

  const canonicalHandle = toCanonicalPersonSocialHandle(source, value);
  if (!canonicalHandle) return null;

  const displayValue =
    source === "youtube" && normalizedValue.startsWith("@")
      ? `@${canonicalHandle}`
      : canonicalHandle;

  return {
    platform: source,
    handle: canonicalHandle,
    display_label: formatHandleLabel(source, displayValue),
    href: buildPersonExternalIdUrl(source, value),
    external: true,
  };
};

const buildFallbackPersonHandleSummaries = (
  handles: PersonEffectiveSocialHandles | null | undefined,
): SocialHandleSummary[] => {
  if (!handles) return [];
  return PERSON_SOCIAL_SOURCES.map((source) => {
    switch (source) {
      case "facebook":
        return buildPersonHandleSummaryFromSource(source, handles.facebook_handle);
      case "instagram":
        return buildPersonHandleSummaryFromSource(source, handles.instagram_handle);
      case "threads":
        return null;
      case "twitter":
        return buildPersonHandleSummaryFromSource(source, handles.twitter_handle);
      case "tiktok":
        return buildPersonHandleSummaryFromSource(source, handles.tiktok_handle);
      case "youtube":
        return buildPersonHandleSummaryFromSource(source, handles.youtube_handle);
      default:
        return null;
    }
  }).filter((handle): handle is SocialHandleSummary => handle !== null);
};

const dedupeHandles = (
  handles: readonly SocialHandleSummary[],
): SocialHandleSummary[] => {
  const seen = new Set<string>();
  return handles
    .filter((handle) => {
      const key = `${handle.platform}:${handle.handle}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      if (left.platform !== right.platform) {
        return left.platform.localeCompare(right.platform);
      }
      return left.handle.localeCompare(right.handle);
    });
};

const buildSocialProgressKey = (
  platform: SocialLandingPlatform,
  handle: string,
): string => `${platform}:${handle}`.toLowerCase();

const normalizeNonNegativeInteger = (value: unknown): number => {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;
  if (!Number.isFinite(numberValue) || numberValue <= 0) return 0;
  return Math.trunc(numberValue);
};

const normalizeProgressPercent = (count: number, total: number): number => {
  if (total <= 0 || count <= 0) return 0;
  return Math.min(100, Math.round((count / total) * 1000) / 10);
};

const buildProgressFromCounts = (
  savedCountInput: unknown,
  scrapedCountInput: unknown,
  row?: Partial<SocialProgressRow>,
): SocialAccountProgressSummary | null => {
  const savedCount = normalizeNonNegativeInteger(savedCountInput);
  const scrapedCount = normalizeNonNegativeInteger(scrapedCountInput);
  const totalCount = Math.max(savedCount, scrapedCount);
  if (totalCount <= 0) {
    const lanes = buildProgressLanes(row ?? {});
    return lanes.some((lane) => lane.total_count > 0 || lane.status)
      ? {
          saved_count: savedCount,
          scraped_count: scrapedCount,
          total_count: totalCount,
          saved_percent: 0,
          scraped_percent: 0,
          last_catalog_run_at: null,
          last_catalog_run_status: null,
          lanes,
        }
      : null;
  }

  const lanes = buildProgressLanes({
    ...(row ?? {}),
    saved_count: savedCount,
    scraped_count: scrapedCount,
  });

  return {
    saved_count: savedCount,
    scraped_count: scrapedCount,
    total_count: totalCount,
    saved_percent: normalizeProgressPercent(savedCount, totalCount),
    scraped_percent: normalizeProgressPercent(scrapedCount, totalCount),
    last_catalog_run_at: null,
    last_catalog_run_status: null,
    lanes,
  };
};

const buildLane = (
  key: SocialAccountProgressLaneKey,
  label: string,
  savedCountInput: unknown,
  scrapedCountInput: unknown,
  totalCountInput?: unknown,
  status?: SocialAccountProgressLaneSummary["status"],
  detail?: string | null,
): SocialAccountProgressLaneSummary => {
  const savedCount = normalizeNonNegativeInteger(savedCountInput);
  const scrapedCount = normalizeNonNegativeInteger(scrapedCountInput);
  const explicitTotalCount = normalizeNonNegativeInteger(totalCountInput);
  const totalCount = Math.max(explicitTotalCount, savedCount, scrapedCount);

  return {
    key,
    label,
    saved_count: savedCount,
    scraped_count: scrapedCount,
    total_count: totalCount,
    saved_percent: normalizeProgressPercent(savedCount, totalCount),
    scraped_percent: normalizeProgressPercent(scrapedCount, totalCount),
    status,
    detail,
  };
};

const buildProgressLanes = (
  row: Partial<SocialProgressRow>,
): SocialAccountProgressLaneSummary[] => {
  const platform = normalizePlatform(row.platform ?? "");
  const socialBladeSupported =
    row.socialblade_supported === true ||
    platform === "instagram" ||
    platform === "youtube" ||
    platform === "tiktok";
  const socialBladeScraped = normalizeNonNegativeInteger(row.socialblade_scraped_count);
  const socialBladeSaved = normalizeNonNegativeInteger(row.socialblade_saved_count);
  const followingSaved = normalizeNonNegativeInteger(row.following_saved_count);
  const followingTotal = Math.max(
    normalizeNonNegativeInteger(row.following_total_count),
    followingSaved,
  );
  const socialBladeUnitTotal = socialBladeSupported ? 1 : 0;
  const combinedSaved =
    (socialBladeSaved > 0 && socialBladeSupported ? 1 : 0) + followingSaved;
  const combinedScraped =
    (socialBladeScraped > 0 && socialBladeSupported ? 1 : 0) + followingSaved;
  const combinedTotal = socialBladeUnitTotal + followingTotal;
  const firstLaneHasData = combinedScraped > 0 || combinedSaved > 0;
  const firstLaneLabel = socialBladeSupported
    ? "Social Blade + Following List"
    : "Following List";
  return [
    buildLane(
      "socialblade",
      firstLaneLabel,
      combinedSaved,
      combinedScraped,
      combinedTotal,
      firstLaneHasData ? "ready" : "missing",
      firstLaneHasData
        ? null
        : socialBladeSupported
          ? "No SocialBlade or following-list snapshot"
          : "No following-list snapshot",
    ),
    buildLane("posts", "Posts", row.saved_count, row.scraped_count),
    buildLane("comments", "Comments", row.comments_saved_count, row.comments_saved_count, row.comments_total_count),
    buildLane("media", "Media", row.media_saved_count, row.media_saved_count, row.media_total_count),
  ];
};

type SocialProgressTarget = {
  platform: SocialLandingPlatform;
  handle: string;
};

const addProgressTarget = (
  targetsByKey: Map<string, SocialProgressTarget>,
  platform: SocialLandingPlatform,
  handle: string,
): void => {
  const normalizedHandle = toCanonicalInternalHandle(platform, handle);
  if (!normalizedHandle) return;
  const key = buildSocialProgressKey(platform, normalizedHandle);
  if (targetsByKey.has(key)) return;
  targetsByKey.set(key, { platform, handle: normalizedHandle });
};

const collectSocialProgressTargets = ({
  networkSets,
  showSets,
  sharedSourceSets,
}: {
  networkSets: readonly NetworkProfileSet[];
  showSets: readonly ShowProfileSet[];
  sharedSourceSets: readonly SharedAccountSourceSet[];
}): SocialProgressTarget[] => {
  const targetsByKey = new Map<string, SocialProgressTarget>();
  for (const set of networkSets) {
    for (const handle of set.handles) {
      if (!handle.external) {
        addProgressTarget(targetsByKey, handle.platform, handle.handle);
      }
    }
  }
  for (const set of showSets) {
    for (const handle of set.handles) {
      if (!handle.external) {
        addProgressTarget(targetsByKey, handle.platform, handle.handle);
      }
    }
  }
  for (const set of sharedSourceSets) {
    for (const source of set.sources) {
      addProgressTarget(targetsByKey, source.platform, source.account_handle);
    }
  }
  return [...targetsByKey.values()]
    .sort((left, right) => {
      if (left.platform !== right.platform) {
        return left.platform.localeCompare(right.platform);
      }
      return left.handle.localeCompare(right.handle);
    })
    .slice(0, SOCIAL_LANDING_PROGRESS_MAX_TARGETS);
};

const safeLoadSocialBladeProgressCounts = async (
  targets: readonly SocialProgressTarget[],
  adminContext?: VerifiedAdminContext,
): Promise<CacheableValue<ReadonlyMap<string, Partial<SocialProgressRow>>>> => {
  if (targets.length === 0) return cacheableValue(new Map());

  try {
    const payload = (await fetchSocialBackendJson("/landing-socialblade-progress-counts", {
      adminContext,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platforms: targets.map((target) => target.platform),
        account_handles: targets.map((target) => target.handle),
      }),
      fallbackError: "Failed to fetch social landing SocialBlade progress counts",
      retries: 0,
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    })) as SocialBladeProgressCountsPayload;
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const countsByKey = new Map<string, Partial<SocialProgressRow>>();
    for (const row of rows) {
      const platform = normalizePlatform(row.platform ?? "");
      const handle =
        typeof row.account_handle === "string"
          ? row.account_handle.trim().replace(/^@+/, "")
          : "";
      if (!platform || !handle) continue;
      countsByKey.set(buildSocialProgressKey(platform, handle), {
        socialblade_scraped_count: row.socialblade_scraped_count,
        socialblade_saved_count: row.socialblade_saved_count,
        socialblade_supported: row.socialblade_supported,
      });
    }
    return cacheableValue(countsByKey);
  } catch (error) {
    console.warn("[social-landing] Failed to load SocialBlade progress counts", error);
    return uncacheableValue(new Map());
  }
};

const buildSocialProgressMap = (
  rows: readonly SocialProgressRow[],
  overridesByKey: ReadonlyMap<string, Partial<SocialProgressRow>> = new Map(),
): ReadonlyMap<string, SocialAccountProgressSummary> => {
  const progressByKey = new Map<string, SocialAccountProgressSummary>();
  for (const row of rows) {
    const platform = normalizePlatform(row.platform ?? "");
    const handle =
      typeof row.account_handle === "string"
        ? row.account_handle.trim().replace(/^@+/, "")
        : "";
    if (!platform || !handle) continue;
    const key = buildSocialProgressKey(platform, handle);
    const progress = buildProgressFromCounts(row.saved_count, row.scraped_count, {
      ...row,
      ...(overridesByKey.get(key) ?? {}),
    });
    if (!progress) continue;
    progressByKey.set(key, progress);
  }
  return progressByKey;
};

const safeLoadBackendSocialProgressRollup = async (
  targets: readonly SocialProgressTarget[],
  adminContext: VerifiedAdminContext,
  timingCollector?: SocialLandingTimingCollector,
): Promise<SocialProgressSummaryResult> => {
  try {
    const payload = (await fetchSocialBackendJson("/landing-progress-rollup", {
      adminContext,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platforms: targets.map((target) => target.platform),
        account_handles: targets.map((target) => target.handle),
      }),
      fallbackError: "Failed to fetch social landing progress rollup",
      retries: 0,
      timeoutMs: SOCIAL_PROXY_PROGRESS_TIMEOUT_MS,
    })) as SocialProgressRollupPayload;
    const backendMs = normalizeNonNegativeInteger(payload.timing?.backend_ms);
    const databaseMs = normalizeNonNegativeInteger(payload.timing?.database_ms);
    if (backendMs > 0) timingCollector?.recordBackendMs(backendMs);
    if (databaseMs > 0) timingCollector?.recordDbMs(databaseMs);
    const cacheStatus = typeof payload.cache_status === "string" ? payload.cache_status : null;
    const generatedAt =
      typeof payload.generated_at === "string"
        ? payload.generated_at
        : payload.generated_at instanceof Date
          ? payload.generated_at.toISOString()
          : null;

    console.info("[social-landing] backend progress rollup", {
      cache_status: cacheStatus,
      row_count: Array.isArray(payload.rows) ? payload.rows.length : 0,
      backend_ms: backendMs || null,
      database_ms: databaseMs || null,
    });

    return {
      ...cacheableValue(buildSocialProgressMap(Array.isArray(payload.rows) ? payload.rows : [])),
      status: {
        source: "backend",
        cache_status: cacheStatus,
        generated_at: generatedAt,
        stale: Boolean(payload.stale) || cacheStatus === "stale",
      },
    };
  } catch (error) {
    console.warn("[social-landing] Failed to load backend social progress rollup", error);
    return {
      ...uncacheableValue(new Map()),
      status: {
        source: "fallback",
        cache_status: null,
        generated_at: null,
        stale: true,
        warning: error instanceof Error ? error.message : "Failed to load backend social progress rollup",
      },
    };
  }
};

const safeLoadSocialProgressSummaries = async (
  targets: readonly SocialProgressTarget[],
  adminContext?: VerifiedAdminContext,
  timingCollector?: SocialLandingTimingCollector,
): Promise<SocialProgressSummaryResult> => {
  if (targets.length === 0) {
    return {
      ...cacheableValue(new Map()),
      status: {
        source: "none",
        cache_status: null,
        generated_at: null,
        stale: false,
      },
    };
  }

  if (adminContext) {
    return safeLoadBackendSocialProgressRollup(targets, adminContext, timingCollector);
  }

  const platforms = targets.map((target) => target.platform);
  const handles = targets.map((target) => target.handle);
  const instagramMaterializedReportedCommentsSql =
    instagramReportedCommentsSql("p");
  const instagramCatalogReportedCommentsSql = instagramReportedCommentsSql("p");

  try {
    const [socialBladeCountsResult, result] = await Promise.all([
      safeLoadSocialBladeProgressCounts(targets, adminContext),
      queryWithStatementTimeout<SocialProgressRow>(
        `
        /* landing_social_progress */
        WITH targets AS (
          SELECT DISTINCT
            lower(input.platform) AS platform,
            lower(regexp_replace(input.account_handle, '^@+', '')) AS account_handle
          FROM unnest($1::text[], $2::text[]) AS input(platform, account_handle)
          WHERE input.platform IN ('instagram', 'tiktok', 'twitter', 'youtube', 'facebook', 'threads')
            AND nullif(trim(input.account_handle), '') IS NOT NULL
        ),
        materialized_rows AS (
          SELECT
            'instagram'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            id,
            nullif(shortcode, '') AS source_id,
            (${instagramMaterializedReportedCommentsSql})::bigint AS reported_comments,
            jsonb_array_length(coalesce(media_urls, '[]'::jsonb))::bigint AS source_media_files,
            (
              jsonb_array_length(coalesce(hosted_media_urls, '[]'::jsonb)) +
              case when nullif(hosted_thumbnail_url, '') is not null then 1 else 0 end
            )::bigint AS hosted_media_files
          FROM social.instagram_posts p
          UNION ALL
          SELECT
            'tiktok'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            id,
            nullif(video_id, '') AS source_id,
            greatest(coalesce(comments_count, 0), 0)::bigint AS reported_comments,
            jsonb_array_length(coalesce(media_urls, '[]'::jsonb))::bigint AS source_media_files,
            (
              jsonb_array_length(coalesce(hosted_media_urls, '[]'::jsonb)) +
              case when nullif(hosted_thumbnail_url, '') is not null then 1 else 0 end
            )::bigint AS hosted_media_files
          FROM social.tiktok_posts
          UNION ALL
          SELECT
            'twitter'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            id,
            nullif(tweet_id, '') AS source_id,
            0::bigint AS reported_comments,
            jsonb_array_length(coalesce(media_urls, '[]'::jsonb))::bigint AS source_media_files,
            (
              jsonb_array_length(coalesce(hosted_media_urls, '[]'::jsonb)) +
              case when nullif(hosted_thumbnail_url, '') is not null then 1 else 0 end
            )::bigint AS hosted_media_files
          FROM social.twitter_tweets
          UNION ALL
          SELECT
            'youtube'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            id,
            nullif(video_id, '') AS source_id,
            greatest(coalesce(comments_count, 0), 0)::bigint AS reported_comments,
            0::bigint AS source_media_files,
            case when nullif(hosted_thumbnail_url, '') is not null then 1 else 0 end::bigint AS hosted_media_files
          FROM social.youtube_videos
          UNION ALL
          SELECT
            'facebook'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            id,
            nullif(post_id, '') AS source_id,
            greatest(coalesce(comments_count, 0), 0)::bigint AS reported_comments,
            jsonb_array_length(coalesce(media_urls, '[]'::jsonb))::bigint AS source_media_files,
            (
              jsonb_array_length(coalesce(hosted_media_urls, '[]'::jsonb)) +
              case when nullif(hosted_thumbnail_url, '') is not null then 1 else 0 end
            )::bigint AS hosted_media_files
          FROM social.facebook_posts
          UNION ALL
          SELECT
            'threads'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            id,
            nullif(post_id, '') AS source_id,
            0::bigint AS reported_comments,
            jsonb_array_length(coalesce(media_urls, '[]'::jsonb))::bigint AS source_media_files,
            (
              jsonb_array_length(coalesce(hosted_media_urls, '[]'::jsonb)) +
              case when nullif(hosted_thumbnail_url, '') is not null then 1 else 0 end
            )::bigint AS hosted_media_files
          FROM social.meta_threads_posts
        ),
        catalog_rows AS (
          SELECT
            'instagram'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            nullif(source_id, '') AS source_id,
            (${instagramCatalogReportedCommentsSql})::bigint AS reported_comments,
            jsonb_array_length(coalesce(media_urls, '[]'::jsonb))::bigint AS source_media_files
          FROM social.instagram_account_catalog_posts p
          UNION ALL
          SELECT
            'tiktok'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            nullif(source_id, '') AS source_id,
            greatest(coalesce(comments_count, 0), 0)::bigint AS reported_comments,
            jsonb_array_length(coalesce(media_urls, '[]'::jsonb))::bigint AS source_media_files
          FROM social.tiktok_account_catalog_posts
          UNION ALL
          SELECT
            'twitter'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            nullif(source_id, '') AS source_id,
            greatest(coalesce(comments_count, 0), 0)::bigint + greatest(coalesce(quotes, 0), 0)::bigint AS reported_comments,
            jsonb_array_length(coalesce(media_urls, '[]'::jsonb))::bigint AS source_media_files
          FROM social.twitter_account_catalog_posts
          UNION ALL
          SELECT
            'youtube'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            nullif(source_id, '') AS source_id,
            greatest(coalesce(comments_count, 0), 0)::bigint AS reported_comments,
            jsonb_array_length(coalesce(media_urls, '[]'::jsonb))::bigint AS source_media_files
          FROM social.youtube_account_catalog_posts
          UNION ALL
          SELECT
            'facebook'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            nullif(source_id, '') AS source_id,
            greatest(coalesce(comments_count, 0), 0)::bigint AS reported_comments,
            jsonb_array_length(coalesce(media_urls, '[]'::jsonb))::bigint AS source_media_files
          FROM social.facebook_account_catalog_posts
          UNION ALL
          SELECT
            'threads'::text AS platform,
            lower(regexp_replace(coalesce(source_account, ''), '^@+', '')) AS account_handle,
            nullif(source_id, '') AS source_id,
            greatest(coalesce(comments_count, 0), 0)::bigint AS reported_comments,
            jsonb_array_length(coalesce(media_urls, '[]'::jsonb))::bigint AS source_media_files
          FROM social.threads_account_catalog_posts
        ),
        materialized_counts AS (
          SELECT
            rows.platform,
            rows.account_handle,
            count(*)::int AS saved_count,
            sum(rows.reported_comments)::int AS comments_total_count,
            sum(rows.hosted_media_files)::int AS media_saved_count
          FROM materialized_rows rows
          INNER JOIN targets
            ON targets.platform = rows.platform
           AND targets.account_handle = rows.account_handle
          WHERE rows.account_handle <> ''
          GROUP BY rows.platform, rows.account_handle
        ),
        catalog_counts AS (
          SELECT
            rows.platform,
            rows.account_handle,
            count(*)::int AS scraped_count,
            sum(rows.reported_comments)::int AS comments_total_count,
            sum(rows.source_media_files)::int AS media_total_count
          FROM catalog_rows rows
          INNER JOIN targets
            ON targets.platform = rows.platform
           AND targets.account_handle = rows.account_handle
          WHERE rows.account_handle <> ''
          GROUP BY rows.platform, rows.account_handle
        ),
        instagram_profile_targets AS (
          SELECT DISTINCT ON (targets.account_handle)
            targets.account_handle,
            profiles.id AS profile_id,
            greatest(coalesce(profiles.follows_count, 0), 0)::int AS following_total_count
          FROM targets
          INNER JOIN social.instagram_profiles profiles
            ON targets.platform = 'instagram'
           AND lower(regexp_replace(coalesce(profiles.normalized_username, profiles.username, profiles.source_account, ''), '^@+', '')) = targets.account_handle
          ORDER BY
            targets.account_handle,
            profiles.last_scraped_at DESC NULLS LAST,
            profiles.updated_at DESC NULLS LAST,
            profiles.id
        ),
        following_counts AS (
          SELECT
            'instagram'::text AS platform,
            profile_targets.account_handle,
            count(relationships.id) FILTER (WHERE coalesce(relationships.is_missing, false) = false)::int AS following_saved_count,
            max(profile_targets.following_total_count)::int AS following_total_count
          FROM instagram_profile_targets profile_targets
          LEFT JOIN social.instagram_profile_relationships relationships
            ON relationships.owner_profile_id = profile_targets.profile_id
           AND relationships.relationship_type = 'following'
          GROUP BY profile_targets.account_handle
        )
        SELECT
          targets.platform,
          targets.account_handle,
          coalesce(materialized_counts.saved_count, 0)::int AS saved_count,
          coalesce(catalog_counts.scraped_count, 0)::int AS scraped_count,
          (targets.platform IN ('instagram', 'youtube', 'tiktok'))::boolean AS socialblade_supported,
          0::int AS socialblade_scraped_count,
          0::int AS socialblade_saved_count,
          coalesce(following_counts.following_saved_count, 0)::int AS following_saved_count,
          coalesce(following_counts.following_total_count, 0)::int AS following_total_count,
          0::int AS comments_saved_count,
          greatest(
            coalesce(materialized_counts.comments_total_count, 0),
            coalesce(catalog_counts.comments_total_count, 0)
          )::int AS comments_total_count,
          coalesce(materialized_counts.media_saved_count, 0)::int AS media_saved_count,
          greatest(coalesce(catalog_counts.media_total_count, 0), coalesce(materialized_counts.media_saved_count, 0))::int AS media_total_count
        FROM targets
        LEFT JOIN materialized_counts
          ON materialized_counts.platform = targets.platform
         AND materialized_counts.account_handle = targets.account_handle
        LEFT JOIN catalog_counts
          ON catalog_counts.platform = targets.platform
         AND catalog_counts.account_handle = targets.account_handle
        LEFT JOIN following_counts
          ON following_counts.platform = targets.platform
         AND following_counts.account_handle = targets.account_handle
        `,
        [platforms, handles],
        SOCIAL_LANDING_PROGRESS_STATEMENT_TIMEOUT_MS,
      ),
    ]);

    const socialBladeCountsByKey = socialBladeCountsResult.value;
    return {
      value: buildSocialProgressMap(result.rows, socialBladeCountsByKey),
      cacheable: socialBladeCountsResult.cacheable,
      status: {
        source: "fallback",
        cache_status: null,
        generated_at: null,
        stale: !socialBladeCountsResult.cacheable,
      },
    };
  } catch (error) {
    console.warn("[social-landing] Failed to load social progress summaries", error);
    return {
      ...uncacheableValue(new Map()),
      status: {
        source: "fallback",
        cache_status: null,
        generated_at: null,
        stale: true,
        warning: error instanceof Error ? error.message : "Failed to load social progress summaries",
      },
    };
  }
};

const hydrateHandleProgress = (
  handle: SocialHandleSummary,
  progressByKey: ReadonlyMap<string, SocialAccountProgressSummary>,
): SocialHandleSummary => ({
  ...handle,
  progress:
    progressByKey.get(buildSocialProgressKey(handle.platform, handle.handle)) ?? null,
});

const hydrateNetworkSetProgress = (
  set: NetworkProfileSet,
  progressByKey: ReadonlyMap<string, SocialAccountProgressSummary>,
): NetworkProfileSet => ({
  ...set,
  handles: set.handles.map((handle) =>
    hydrateHandleProgress(handle, progressByKey),
  ),
});

const hydrateShowSetProgress = (
  set: ShowProfileSet,
  progressByKey: ReadonlyMap<string, SocialAccountProgressSummary>,
): ShowProfileSet => ({
  ...set,
  handles: set.handles.map((handle) =>
    hydrateHandleProgress(handle, progressByKey),
  ),
});

const hydrateSharedSourceProgress = (
  source: SharedAccountSourceSummary,
  progressByKey: ReadonlyMap<string, SocialAccountProgressSummary>,
): SharedAccountSourceSummary => ({
  ...source,
  progress:
    progressByKey.get(
      buildSocialProgressKey(source.platform, source.account_handle),
    ) ?? null,
});

const hydrateSharedSourceSetProgress = (
  set: SharedAccountSourceSet,
  progressByKey: ReadonlyMap<string, SocialAccountProgressSummary>,
): SharedAccountSourceSet => ({
  ...set,
  sources: set.sources.map((source) =>
    hydrateSharedSourceProgress(source, progressByKey),
  ),
});

const readSharedSourceErrorCode = (error: unknown): string | null => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && code.trim() ? code.trim() : null;
};

const readSharedSourceErrorMessage = (error: unknown): string | null =>
  error instanceof Error && error.message.trim() ? error.message.trim() : null;

const buildSharedSourcesBackendEndpoint = (
  sourceScope: SharedAccountSourceSetScope,
): string => `/shared/sources?source_scope=${sourceScope}&include_inactive=true`;

const safeLoadSharedSources = async (
  adminContext?: VerifiedAdminContext,
  sourceScope: SharedAccountSourceSetScope = "network",
): Promise<SharedSourcesResult> => {
  const backendEndpoint = buildSharedSourcesBackendEndpoint(sourceScope);
  try {
    const payload = await fetchSocialBackendJson("/shared/sources", {
      adminContext,
      queryString: `source_scope=${sourceScope}&include_inactive=true`,
      fallbackError: "Failed to fetch shared social account sources",
      retries: 0,
      timeoutMs: SOCIAL_PROXY_DEFAULT_TIMEOUT_MS,
    });
    const sources = Array.isArray((payload as SharedSourcesPayload).sources)
      ? ((payload as SharedSourcesPayload).sources ?? [])
          .map((source) => {
            const platform = normalizePlatform(source.platform);
            if (!platform || typeof source.account_handle !== "string") return null;
            return {
              ...source,
              platform,
              account_handle:
                toCanonicalInternalHandle(platform, source.account_handle) ??
                source.account_handle.trim().replace(/^@+/, ""),
            } satisfies SharedAccountSourceSummary;
          })
          .filter(
            (source): source is SharedAccountSourceSummary => source !== null,
          )
      : [];
    return {
      value: sources,
      cacheable: true,
      status: {
        source_scope: sourceScope,
        load_source: "backend",
        backend_endpoint: backendEndpoint,
        warning: null,
      },
    };
  } catch (error) {
    console.warn("[social-landing] Failed to load shared sources; using local fallback", error);
    const sources = await loadSharedAccountSourcesFromLocalDb({
      sourceScope,
      includeInactive: true,
    }).catch((fallbackError) => {
      console.warn("[social-landing] Failed to load local shared sources fallback", fallbackError);
      return [];
    });
    return {
      value: sources,
      cacheable: false,
      status: {
        source_scope: sourceScope,
        load_source: "local_db_fallback",
        backend_endpoint: backendEndpoint,
        warning: "TRR-Backend shared-source API is unavailable; showing saved Supabase rows.",
        error_code: readSharedSourceErrorCode(error),
        error_message: readSharedSourceErrorMessage(error),
      },
    };
  }
};

const safeLoadSharedRuns = async (
  adminContext?: VerifiedAdminContext,
): Promise<SharedRunSummary[]> => {
  try {
    const payload = await fetchSocialBackendJson("/shared/ingest/runs", {
      adminContext,
      queryString: "source_scope=network&limit=5",
      fallbackError: "Failed to fetch shared social ingest runs",
      retries: 0,
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    });
    return Array.isArray(payload)
      ? payload.filter(
          (run): run is SharedRunSummary =>
            Boolean(run) &&
            typeof run === "object" &&
            typeof (run as SharedRunSummary).id === "string" &&
            typeof (run as SharedRunSummary).status === "string",
        )
      : [];
  } catch (error) {
    console.warn("[social-landing] Failed to load shared runs", error);
    return [];
  }
};

const safeLoadSharedReviewItems = async (
  adminContext?: VerifiedAdminContext,
): Promise<SharedReviewItemSummary[]> => {
  try {
    const payload = await fetchSocialBackendJson("/shared/review-queue", {
      adminContext,
      queryString: "source_scope=network&review_status=open&limit=10",
      fallbackError: "Failed to fetch shared social review queue",
      retries: 0,
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    });
    return Array.isArray((payload as SharedReviewPayload).items)
      ? ((payload as SharedReviewPayload).items ?? []).filter(
          (item): item is SharedReviewItemSummary =>
            normalizePlatform(item.platform) !== null &&
            typeof item.id === "string" &&
            typeof item.source_id === "string",
        )
      : [];
  } catch (error) {
    console.warn("[social-landing] Failed to load shared review items", error);
    return [];
  }
};

const coerceCount = (value: number | string | null | undefined): number => {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
};

const safeLoadScrapeJobHealth = async (): Promise<ScrapeJobHealthSummary> => {
  try {
    const result = await query<ScrapeJobHealthRow>(
      `
        /* landing_social_scrape_job_health */
        WITH recent_jobs AS (
          SELECT
            status,
            error_message,
            last_error_code,
            metadata,
            created_at
          FROM social.scrape_jobs
          WHERE platform = ANY($2::text[])
            AND created_at >= now() - ($1::int * interval '1 hour')
        ),
        job_signals AS (
          SELECT
            status,
            created_at,
            coalesce(error_message, '') || ' ' ||
              coalesce(last_error_code, '') AS error_signal,
            coalesce(error_message, '') || ' ' ||
              coalesce(last_error_code, '') || ' ' ||
              coalesce(metadata::text, '') AS diagnostic_text
          FROM recent_jobs
        )
        SELECT
          now() AS generated_at,
          now() - ($1::int * interval '1 hour') AS window_started_at,
          count(*)::bigint AS total_jobs,
          count(*) FILTER (
            WHERE status IN ('queued', 'pending', 'running', 'retrying', 'cancelling')
          )::bigint AS active_jobs,
          count(*) FILTER (
            WHERE status IN ('failed', 'error')
          )::bigint AS failed_jobs,
          count(*) FILTER (
            WHERE status IN ('failed', 'error')
              OR nullif(trim(error_signal), '') IS NOT NULL
          )::bigint AS failure_signal_jobs,
          count(*) FILTER (
            WHERE diagnostic_text ILIKE '%InFailedSqlTransaction%'
          )::bigint AS in_failed_sql_transaction_hits,
          max(created_at) FILTER (
            WHERE status IN ('failed', 'error')
              OR nullif(trim(error_signal), '') IS NOT NULL
          ) AS latest_failure_at
        FROM job_signals
      `,
      [
        SCRAPE_JOB_HEALTH_WINDOW_HOURS,
        ["instagram", "tiktok", "twitter", "youtube"],
      ],
    );
    const row = result.rows[0] ?? {};
    return {
      window_hours: SCRAPE_JOB_HEALTH_WINDOW_HOURS,
      window_started_at: toIsoStringOrNull(row.window_started_at),
      generated_at: toIsoStringOrNull(row.generated_at),
      total_jobs: coerceCount(row.total_jobs),
      active_jobs: coerceCount(row.active_jobs),
      failed_jobs: coerceCount(row.failed_jobs),
      failure_signal_jobs: coerceCount(row.failure_signal_jobs),
      in_failed_sql_transaction_hits: coerceCount(row.in_failed_sql_transaction_hits),
      latest_failure_at: toIsoStringOrNull(row.latest_failure_at),
    };
  } catch (error) {
    console.warn("[social-landing] Failed to load scrape job health", error);
    return EMPTY_SCRAPE_JOB_HEALTH;
  }
};

const safeLoadRedditDashboardSummary = async (): Promise<RedditDashboardSummary> => {
  try {
    const communities = await listRedditCommunities({ includeInactive: true });
    const showIds = new Set(
      communities
        .map((community) => community.trr_show_id?.trim())
        .filter((value): value is string => Boolean(value)),
    );
    const activeCommunityCount = communities.filter((community) => community.is_active)
      .length;
    const archivedCommunityCount = communities.length - activeCommunityCount;

    return {
      active_community_count: activeCommunityCount,
      archived_community_count: archivedCommunityCount,
      show_count: showIds.size,
    };
  } catch (error) {
    console.warn("[social-landing] Failed to load reddit dashboard summary", error);
    return {
      active_community_count: 0,
      archived_community_count: 0,
      show_count: 0,
    };
  }
};

const safeLoadBackendLandingSummary = async (
  adminContext?: VerifiedAdminContext,
): Promise<LandingSummaryResult> => {
  const loadLocalFallback = async (): Promise<LandingSummaryResult> => {
    try {
      const [coveredShows, redditDashboard] = await Promise.all([
        getCoveredShows(),
        safeLoadRedditDashboardSummary(),
      ]);
      return { coveredShows, redditDashboard, cacheable: !adminContext };
    } catch (error) {
      console.warn("[social-landing] Failed to load local landing summary fallback", error);
      return {
        coveredShows: [],
        redditDashboard: {
          active_community_count: 0,
          archived_community_count: 0,
          show_count: 0,
        },
        cacheable: false,
      };
    }
  };

  if (!adminContext) {
    return loadLocalFallback();
  }

  try {
    const payload = (await fetchSocialBackendJson("/landing-summary", {
      adminContext,
      fallbackError: "Failed to fetch social landing summary",
      retries: 0,
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    })) as BackendLandingSummaryPayload;
    return {
      coveredShows: Array.isArray(payload.covered_shows) ? payload.covered_shows : [],
      redditDashboard: payload.reddit_dashboard ?? {
        active_community_count: 0,
        archived_community_count: 0,
        show_count: 0,
      },
      cacheable: true,
    };
  } catch (error) {
    console.warn("[social-landing] Failed to load backend landing summary; using local fallback", error);
    return loadLocalFallback();
  }
};

const safeLoadShowExternalIdsMap = async (
  showIds: readonly string[],
): Promise<CacheableValue<ReadonlyMap<string, Record<string, unknown> | null>>> => {
  try {
    return cacheableValue(await listShowExternalIdsByIds(showIds));
  } catch (error) {
    console.warn("[social-landing] Failed to load show external ids", { showIds, error });
    return uncacheableValue(new Map());
  }
};

const safeLoadShowCastSummaryMap = async (
  showIds: readonly string[],
  adminContext?: VerifiedAdminContext,
): Promise<CacheableValue<ReadonlyMap<string, CastSummaryMember[]>>> => {
  if (showIds.length === 0) return cacheableValue(new Map());

  try {
    const upstream = await fetchAdminBackendJson(
      "/admin/shows/cast-summary",
      {
        adminContext,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_ids: showIds }),
        timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
        routeName: "show-cast-summary",
      },
    );
    if (upstream.status !== 200) return uncacheableValue(new Map());

    const payload = upstream.data as CastSummaryBatchPayload;
    const shows = Array.isArray(payload.shows) ? payload.shows : [];
    return cacheableValue(new Map(
      shows
        .map((show) => {
          const showId = typeof show.show_id === "string" ? show.show_id.trim() : "";
          if (!showId) return null;
          return [
            showId,
            Array.isArray(show.cast_members) ? show.cast_members : [],
          ] as const;
        })
        .filter(
          (
            entry,
          ): entry is readonly [string, CastSummaryMember[]] => entry !== null,
        ),
    ));
  } catch (error) {
    console.warn("[social-landing] Failed to load show cast summary", {
      showIds,
      error,
    });
    return uncacheableValue(new Map());
  }
};

const safeLoadPrimaryPersonExternalIdsMap = async (
  personIds: readonly string[],
): Promise<ReadonlyMap<string, PersonExternalIdRecord[]>> => {
  try {
    return await listPrimaryPersonExternalIdsByPersonIds(personIds);
  } catch (error) {
    console.warn("[social-landing] Failed to load person external ids", { personIds, error });
    return new Map();
  }
};

const safeLoadEffectivePersonSocialHandlesMap = async (
  personIds: readonly string[],
): Promise<ReadonlyMap<string, PersonEffectiveSocialHandles>> => {
  try {
    return await listEffectivePersonSocialHandlesByPersonIds(personIds);
  } catch (error) {
    console.warn("[social-landing] Failed to load fallback person social handles", {
      personIds,
      error,
    });
    return new Map();
  }
};

const toIsoStringOrNull = (value: string | Date | null | undefined): string | null => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeCastSocialBladePlatform = (
  value: string | null | undefined,
): CastSocialBladePlatform | null => {
  const platform = normalizePlatform(value);
  return platform && CAST_SOCIALBLADE_PLATFORMS.includes(platform as CastSocialBladePlatform)
    ? (platform as CastSocialBladePlatform)
    : null;
};

const buildSocialBladeAccountKey = (
  platform: CastSocialBladePlatform,
  handle: string,
): string => `${platform}:${handle}`.toLowerCase();

const buildCompactTitleCaseNameHandle = (
  fullName: string,
  canonicalHandle: string,
): string | null => {
  const nameParts = fullName
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (nameParts.length < 2) return null;

  const compactName = nameParts
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
  if (
    !compactName ||
    compactName === canonicalHandle ||
    normalizeSocialAccountProfileHandle(compactName) !== canonicalHandle
  ) {
    return null;
  }

  return compactName;
};

type SocialBladeCurrentLookupEntry = {
  key: string;
  platform: CastSocialBladePlatform;
  handle: string;
  matchRank: number;
};

type NormalizedSocialBladeHandle = {
  platform: CastSocialBladePlatform;
  handle: string;
  rawValues: string[];
};

const normalizeSocialBladeCurrentHandles = (
  handles: readonly SocialHandleSummary[],
  rawHandleCandidatesByKey: ReadonlyMap<string, readonly string[]> | null,
): NormalizedSocialBladeHandle[] =>
  handles
    .map((handle) => {
      const platform = normalizeCastSocialBladePlatform(handle.platform);
      const normalizedHandle = normalizeSocialAccountProfileHandle(handle.handle);
      return platform && normalizedHandle
        ? {
            platform,
            handle: normalizedHandle,
            rawValues: [
              ...(rawHandleCandidatesByKey?.get(
                buildSocialBladeAccountKey(platform, normalizedHandle),
              ) ?? []),
            ],
          }
        : null;
    })
    .filter(
      (handle): handle is NormalizedSocialBladeHandle => handle !== null,
    );

const buildSocialBladeLegacyAliasKeys = (
  platform: CastSocialBladePlatform,
  handle: string,
): string[] => {
  if (platform !== "youtube") return [];
  return ["user", "c", "channel"].map((prefix) =>
    buildSocialBladeAccountKey(platform, `${prefix}${handle}`),
  );
};

const buildSocialBladeAccountHandleCandidates = (
  handles: readonly NormalizedSocialBladeHandle[],
): string[] => {
  const candidates = new Set<string>();
  const addCandidate = (value: string | null | undefined) => {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed) candidates.add(trimmed);
  };
  const addAtVariant = (value: string) => {
    const stripped = value.trim().replace(/^@+/, "");
    if (stripped) addCandidate(`@${stripped}`);
  };
  const addYoutubeRouteVariants = (value: string) => {
    const stripped = value.trim().replace(/^@+/, "");
    if (!stripped || /^(?:user|c|channel)\//i.test(stripped)) return;
    for (const prefix of ["user", "c", "channel"]) {
      addCandidate(`${prefix}/${stripped}`);
      addCandidate(`${prefix}${stripped}`);
    }
  };

  for (const handle of handles) {
    addCandidate(handle.handle);
    if (
      handle.platform === "youtube" ||
      handle.platform === "instagram" ||
      handle.platform === "facebook"
    ) {
      addAtVariant(handle.handle);
    }
    if (handle.platform === "youtube") {
      addYoutubeRouteVariants(handle.handle);
    }
    for (const rawValue of handle.rawValues) {
      addCandidate(rawValue);
      if (
        handle.platform === "youtube" ||
        handle.platform === "instagram" ||
        handle.platform === "facebook"
      ) {
        addAtVariant(rawValue);
      }
      if (handle.platform === "youtube") {
        const normalizedRaw = normalizePersonExternalIdValue("youtube", rawValue);
        const routeMatch = normalizedRaw.match(/^(?:user|c|channel)\/(.+)$/i);
        const rawHandle = routeMatch?.[1] ?? normalizedRaw;
        addYoutubeRouteVariants(rawHandle);
      }
    }
  }
  return [...candidates].sort((left, right) => left.localeCompare(right));
};

type SocialBladeCurrentLookup = {
  entriesByPersonId: ReadonlyMap<string, SocialBladeCurrentLookupEntry[]>;
  ownersByKey: ReadonlyMap<string, ReadonlySet<string>>;
  accountHandleCandidates: string[];
};

const buildCurrentSocialBladeLookup = (
  handlesByPersonId: ReadonlyMap<string, readonly SocialHandleSummary[]>,
  rawHandleCandidatesByPersonId: ReadonlyMap<
    string,
    ReadonlyMap<string, readonly string[]>
  >,
): SocialBladeCurrentLookup => {
  const normalizedHandlesByPersonId = new Map<
    string,
    NormalizedSocialBladeHandle[]
  >();
  const allCurrentHandles: NormalizedSocialBladeHandle[] = [];

  for (const [personId, handles] of handlesByPersonId) {
    const normalizedHandles = normalizeSocialBladeCurrentHandles(
      handles,
      rawHandleCandidatesByPersonId.get(personId) ?? null,
    );
    normalizedHandlesByPersonId.set(personId, normalizedHandles);
    allCurrentHandles.push(...normalizedHandles);
  }

  const exactKeys = new Set(
    allCurrentHandles.map((handle) =>
      buildSocialBladeAccountKey(handle.platform, handle.handle),
    ),
  );
  const aliasCounts = new Map<string, number>();
  for (const handle of allCurrentHandles) {
    for (const aliasKey of buildSocialBladeLegacyAliasKeys(
      handle.platform,
      handle.handle,
    )) {
      aliasCounts.set(aliasKey, (aliasCounts.get(aliasKey) ?? 0) + 1);
    }
  }

  const mutableOwnersByKey = new Map<string, Set<string>>();
  const entriesByPersonId = new Map<string, SocialBladeCurrentLookupEntry[]>();
  for (const [personId, handles] of normalizedHandlesByPersonId) {
    const entries = new Map<string, SocialBladeCurrentLookupEntry>();
    for (const handle of handles) {
      const exactKey = buildSocialBladeAccountKey(handle.platform, handle.handle);
      const owners = mutableOwnersByKey.get(exactKey) ?? new Set<string>();
      owners.add(personId);
      mutableOwnersByKey.set(exactKey, owners);
      entries.set(exactKey, { key: exactKey, ...handle, matchRank: 0 });
      for (const aliasKey of buildSocialBladeLegacyAliasKeys(
        handle.platform,
        handle.handle,
      )) {
        if (exactKeys.has(aliasKey)) continue;
        if ((aliasCounts.get(aliasKey) ?? 0) !== 1) continue;
        entries.set(aliasKey, { key: aliasKey, ...handle, matchRank: 1 });
      }
    }
    entriesByPersonId.set(personId, [...entries.values()]);
  }

  return {
    entriesByPersonId,
    ownersByKey: mutableOwnersByKey,
    accountHandleCandidates:
      buildSocialBladeAccountHandleCandidates(allCurrentHandles),
  };
};

const normalizeSocialBladeRowHandle = (
  platform: CastSocialBladePlatform,
  value: string,
): string | null => {
  if (platform !== "youtube") {
    return toCanonicalPersonSocialHandle(platform, value);
  }

  return toCanonicalPersonSocialHandle("youtube", value);
};

const buildSocialBladeRowAccountKey = (
  row: Pick<SocialBladeSummaryRow, "platform" | "account_handle">,
): string | null => {
  const platform = normalizeCastSocialBladePlatform(row.platform);
  if (!platform || typeof row.account_handle !== "string") return null;
  const handle = normalizeSocialBladeRowHandle(platform, row.account_handle);
  return handle ? buildSocialBladeAccountKey(platform, handle) : null;
};

const safeLoadCastSocialBladeRows = async (
  personIds: readonly string[],
  accountHandleCandidates: readonly string[],
  adminContext?: VerifiedAdminContext,
): Promise<CacheableValue<SocialBladeSummaryRow[]>> => {
  if (personIds.length === 0 && accountHandleCandidates.length === 0) {
    return cacheableValue([]);
  }

  const socialBladePlatforms = CAST_SOCIALBLADE_PLATFORMS.map((platform) =>
    platform.toLowerCase(),
  );
  const socialBladePersonIds = [...new Set(personIds)];
  const socialBladeAccountHandles = [...new Set(accountHandleCandidates)];

  try {
    const payload = (await fetchSocialBackendJson("/landing-socialblade-rows", {
      adminContext,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platforms: socialBladePlatforms,
        person_ids: socialBladePersonIds,
        account_handles: socialBladeAccountHandles,
      }),
      fallbackError: "Failed to fetch social landing SocialBlade rows",
      retries: 0,
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    })) as SocialBladeRowsPayload;
    return cacheableValue(Array.isArray(payload.rows) ? payload.rows : []);
  } catch (error) {
    console.warn("[social-landing] Failed to load cast SocialBlade rows", error);
    return uncacheableValue([]);
  }
};

const addRawSocialBladeHandleCandidate = (
  candidatesByKey: Map<string, string[]>,
  source: SupportedPersonSocialSource,
  value: string | null | undefined,
): void => {
  if (typeof value !== "string") return;
  const platform = normalizeCastSocialBladePlatform(source);
  if (!platform) return;
  const canonicalHandle = toCanonicalPersonSocialHandle(source, value);
  if (!canonicalHandle) return;

  const trimmed = value.trim();
  if (!trimmed) return;

  const key = buildSocialBladeAccountKey(platform, canonicalHandle);
  const candidates = candidatesByKey.get(key) ?? [];
  candidates.push(trimmed);
  candidatesByKey.set(key, candidates);
};

const addNameCasedSocialBladeHandleCandidate = (
  candidatesByKey: Map<string, string[]>,
  platform: CastSocialBladePlatform,
  canonicalHandle: string,
  fullName: string,
): void => {
  const nameCasedHandle = buildCompactTitleCaseNameHandle(
    fullName,
    canonicalHandle,
  );
  if (!nameCasedHandle) return;

  const key = buildSocialBladeAccountKey(platform, canonicalHandle);
  const candidates = candidatesByKey.get(key) ?? [];
  candidates.push(nameCasedHandle);
  candidatesByKey.set(key, candidates);
};

const extractShowHandles = (
  externalIdsValue: Record<string, unknown> | null | undefined,
): SocialHandleSummary[] => {
  const externalIds = toRecord(externalIdsValue);
  if (!externalIds) return [];

  const handles: SocialHandleSummary[] = [];
  for (const platform of PERSON_SOCIAL_SOURCES) {
    for (const key of SHOW_EXTERNAL_ID_KEYS[platform]) {
      const rawValue = externalIds[key];
      if (typeof rawValue !== "string" || !rawValue.trim()) continue;
      const handle = buildInternalHandleSummary(platform, rawValue);
      if (handle) handles.push(handle);
      break;
    }
  }
  return dedupeHandles(handles);
};

const getAssignedShowId = (source: SharedAccountSourceSummary): string | null => {
  const metadata = toRecord(source.metadata);
  const assignedShowId = metadata?.assigned_show_id;
  return typeof assignedShowId === "string" && assignedShowId.trim()
    ? assignedShowId.trim()
    : null;
};

const getMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string | null => {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

const normalizeIdentityKey = (value: unknown): string | null => {
  const rawValue =
    typeof value === "string"
      ? value
      : typeof value === "number"
        ? String(value)
        : "";
  const normalized = rawValue
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || null;
};

const formatIdentityTitle = (key: string): string => {
  if (key === LEGACY_NETWORK_SET_KEY) return LEGACY_NETWORK_SET_TITLE;
  return key
    .split("-")
    .filter(Boolean)
    .map((part) =>
      part.length <= 3
        ? part.toUpperCase()
        : `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
};

const getNetworkSetIdentityKey = (
  source: SharedAccountSourceSummary,
): string => {
  const metadata = toRecord(source.metadata);
  return (
    normalizeIdentityKey(metadata?.network_set_id) ||
    normalizeIdentityKey(metadata?.network_id) ||
    normalizeIdentityKey(metadata?.network_key) ||
    normalizeIdentityKey(source.source_scope) ||
    LEGACY_NETWORK_SET_KEY
  );
};

const getNetworkSetTitle = (
  source: SharedAccountSourceSummary,
  key: string,
): string => {
  const metadata = toRecord(source.metadata);
  return (
    getMetadataString(metadata, [
      "network_set_title",
      "network_title",
      "network_name",
      "network_label",
    ]) || formatIdentityTitle(key)
  );
};

const getNetworkSetDescription = (
  source: SharedAccountSourceSummary,
  key: string,
  title: string,
): string => {
  const metadata = toRecord(source.metadata);
  return (
    getMetadataString(metadata, [
      "network_set_description",
      "network_description",
    ]) ||
    (key === LEGACY_NETWORK_SET_KEY
      ? LEGACY_NETWORK_SET_DESCRIPTION
      : `${title} shared social handles used in sends and profile backfills.`)
  );
};

const isUnassignedNetworkSource = (source: SharedAccountSourceSummary): boolean => {
  const scopeKey = normalizeIdentityKey(source.source_scope);
  if (scopeKey === "creator" || scopeKey === "news") return false;
  if (getAssignedShowId(source)) return false;
  return source.is_active;
};

const getSharedSourceSortIdentity = (
  source: SharedAccountSourceSummary,
): string => {
  const sourceId = typeof source.id === "string" ? source.id.trim() : "";
  if (sourceId) return `source:${sourceId}`;
  const canonicalHandle =
    toCanonicalInternalHandle(source.platform, source.account_handle) ??
    source.account_handle.trim().replace(/^@+/, "");
  return `account:${source.platform}:${canonicalHandle}`.toLowerCase();
};

const sortSharedSources = (
  sources: readonly SharedAccountSourceSummary[],
): SharedAccountSourceSummary[] =>
  [...sources].sort((left, right) => {
    if (left.scrape_priority !== right.scrape_priority) {
      return left.scrape_priority - right.scrape_priority;
    }
    if (left.platform !== right.platform) {
      return left.platform.localeCompare(right.platform);
    }
    if (left.account_handle !== right.account_handle) {
      return left.account_handle.localeCompare(right.account_handle);
    }
    return getSharedSourceSortIdentity(left).localeCompare(
      getSharedSourceSortIdentity(right),
    );
  });

const getSharedSourceHandleDisplayLabel = (
  source: SharedAccountSourceSummary,
): string | null => {
  if (source.platform !== "youtube") return null;

  const metadata = toRecord(source.metadata);
  const sourceType = getMetadataString(metadata, [
    "youtube_source_type",
    "source_type",
  ]);
  const isPlaylistSource =
    sourceType === "playlist" ||
    typeof metadata?.playlist_id === "string" ||
    typeof metadata?.playlist_url === "string";
  if (!isPlaylistSource) return null;

  const profileSnapshot = toRecord(metadata?.profile_snapshot);
  return (
    getMetadataString(profileSnapshot, [
      "display_name",
      "playlist_title",
      "title",
      "name",
    ]) ||
    getMetadataString(metadata, [
      "playlist_title",
      "display_name",
      "title",
      "name",
    ])
  );
};

const buildSharedSourceHandleSummary = (
  source: SharedAccountSourceSummary,
): SocialHandleSummary | null => {
  const handle = buildInternalHandleSummary(source.platform, source.account_handle);
  if (!handle) return null;
  const displayLabel = getSharedSourceHandleDisplayLabel(source);
  return displayLabel ? { ...handle, display_label: displayLabel } : handle;
};

const buildHashtagCandidate = (value: string): string | null => {
  const normalized = value.replace(/[^a-zA-Z0-9]/g, "");
  if (normalized.length < 2) return null;
  return `#${normalized}`;
};

const buildShowHashtagSuggestions = (
  show: Pick<CoveredShow, "show_name" | "alternative_names">,
  sharedSources: readonly SharedAccountSourceSummary[],
): ShowProfileSet["hashtag_suggestions"] => {
  const activeNetworkSource = sharedSources.find(
    (source) => isUnassignedNetworkSource(source),
  );
  if (!activeNetworkSource) return [];

  const candidates = [show.show_name, ...(show.alternative_names ?? [])]
    .map((value) => buildHashtagCandidate(value))
    .filter((value): value is string => value !== null);
  const uniqueCandidates = [...new Set(candidates)].slice(0, 4);

  return uniqueCandidates.map((hashtag) => ({
    hashtag,
    platform: activeNetworkSource.platform,
    account_handle:
      normalizeSocialAccountProfileHandle(activeNetworkSource.account_handle) ||
      activeNetworkSource.account_handle,
    }));
};

type NetworkSetSourceGroup = {
  key: string;
  title: string;
  description: string;
  sources: SharedAccountSourceSummary[];
};

const buildEmptyLegacyNetworkSetGroup = (): NetworkSetSourceGroup => ({
  key: LEGACY_NETWORK_SET_KEY,
  title: LEGACY_NETWORK_SET_TITLE,
  description: LEGACY_NETWORK_SET_DESCRIPTION,
  sources: [],
});

const buildNetworkSetSourceGroups = (
  sharedSources: readonly SharedAccountSourceSummary[],
): NetworkSetSourceGroup[] => {
  const groups = new Map<string, NetworkSetSourceGroup>();
  for (const source of sharedSources.filter((item) => isUnassignedNetworkSource(item))) {
    const key = getNetworkSetIdentityKey(source);
    const title = getNetworkSetTitle(source, key);
    const description = getNetworkSetDescription(source, key, title);
    const existing = groups.get(key);
    if (existing) {
      existing.sources.push(source);
      continue;
    }
    groups.set(key, {
      key,
      title,
      description,
      sources: [source],
    });
  }

  const networkGroups = [...groups.values()].map((group) => ({
    ...group,
    sources: sortSharedSources(group.sources),
  }));
  if (networkGroups.length === 0) {
    return [buildEmptyLegacyNetworkSetGroup()];
  }
  return networkGroups.sort((left, right) => left.key.localeCompare(right.key));
};

const getSharedSourceHandleIdentity = (
  source: SharedAccountSourceSummary,
  handle: SocialHandleSummary,
): string => {
  const sourceId = typeof source.id === "string" ? source.id.trim() : "";
  if (sourceId) return `source:${sourceId}`;
  return `account:${handle.platform}:${handle.handle}`.toLowerCase();
};

const buildNetworkHandleSummaries = (
  sources: readonly SharedAccountSourceSummary[],
): SocialHandleSummary[] => {
  const handlesByIdentity = new Map<string, SocialHandleSummary>();
  for (const source of sortSharedSources(sources)) {
    const handle = buildInternalHandleSummary(source.platform, source.account_handle);
    if (!handle) continue;
    const identity = getSharedSourceHandleIdentity(source, handle);
    if (!handlesByIdentity.has(identity)) {
      handlesByIdentity.set(identity, handle);
    }
  }
  return dedupeHandles([...handlesByIdentity.values()]);
};

const buildNetworkSets = (
  sharedSources: readonly SharedAccountSourceSummary[],
): NetworkProfileSet[] =>
  buildNetworkSetSourceGroups(sharedSources).map((group) => ({
    key: group.key,
    title: group.title,
    description: group.description,
    handles: buildNetworkHandleSummaries(group.sources),
  }));

const buildSharedSourceSets = (
  sourcesByScope: ReadonlyMap<SharedAccountSourceSetScope, readonly SharedAccountSourceSummary[]>,
): SharedAccountSourceSet[] => {
  const networkSourceSets = buildNetworkSetSourceGroups(
    sourcesByScope.get("network") ?? [],
  ).map(
    (group): SharedAccountSourceSet => ({
      key: group.key,
      title: group.title,
      source_scope: "network",
      description: group.description,
      sources: group.sources,
    }),
  );
  const nonNetworkSourceSets = SHARED_SOURCE_SETS.filter(
    (set) => set.source_scope !== "network",
  ).map((set) => ({
    ...set,
    sources: sortSharedSources(sourcesByScope.get(set.source_scope) ?? []),
  }));
  return [...networkSourceSets, ...nonNetworkSourceSets];
};

const buildShowSets = (
  coveredShows: readonly CoveredShow[],
  showExternalIdsById: ReadonlyMap<string, Record<string, unknown> | null>,
  sharedSources: readonly SharedAccountSourceSummary[],
): ShowProfileSet[] => {
  return [...coveredShows]
    .sort((left, right) => left.show_name.localeCompare(right.show_name))
    .map((coveredShow) => {
      const directHandles = extractShowHandles(
        showExternalIdsById.get(coveredShow.trr_show_id) ?? null,
      );
      const assignedSharedHandles = sharedSources
        .filter(
          (source) =>
            source.is_active && getAssignedShowId(source) === coveredShow.trr_show_id,
        )
        .map((source) => buildSharedSourceHandleSummary(source))
        .filter((handle): handle is SocialHandleSummary => handle !== null);
      const handles = dedupeHandles([
        ...directHandles,
        ...assignedSharedHandles,
      ]);

      return {
        show_id: coveredShow.trr_show_id,
        show_name: coveredShow.show_name,
        canonical_slug: coveredShow.canonical_slug ?? null,
        alternative_names: coveredShow.alternative_names ?? null,
        handles,
        fallback_note: null,
        hashtag_suggestions:
          handles.length === 0
            ? buildShowHashtagSuggestions(coveredShow, sharedSources)
            : [],
      };
    });
};

const buildPeopleProfiles = async (
  coveredShows: readonly CoveredShow[],
  castByShowId: ReadonlyMap<string, CastSummaryMember[]>,
): Promise<{
  peopleProfiles: PersonProfileSummary[];
  personTargets: PersonTargetSummary[];
  personHandlesByPersonId: ReadonlyMap<string, SocialHandleSummary[]>;
  socialBladeRawHandleCandidatesByPersonId: ReadonlyMap<
    string,
    ReadonlyMap<string, readonly string[]>
  >;
}> => {
  const people = new Map<
    string,
    {
      person_id: string;
      full_name: string;
      shows: Map<string, PersonProfileShowSummary>;
    }
  >();

  for (const show of coveredShows) {
    const castMembers = castByShowId.get(show.trr_show_id) ?? [];
    for (const member of castMembers) {
      const personId =
        typeof member.person_id === "string" ? member.person_id.trim() : "";
      const fullName =
        typeof member.full_name === "string" ? member.full_name.trim() : "";
      if (!personId || !fullName) continue;

      const existing =
        people.get(personId) ??
        {
          person_id: personId,
          full_name: fullName,
          shows: new Map<string, PersonProfileShowSummary>(),
        };
      existing.shows.set(show.trr_show_id, {
        show_id: show.trr_show_id,
        show_name: show.show_name,
        canonical_slug: show.canonical_slug ?? null,
      });
      people.set(personId, existing);
    }
  }

  const peopleList = [...people.values()];
  const personIds = peopleList.map((person) => person.person_id);
  const [externalIdsByPersonId, fallbackHandlesByPersonId] = await Promise.all([
    safeLoadPrimaryPersonExternalIdsMap(personIds),
    safeLoadEffectivePersonSocialHandlesMap(personIds),
  ]);

  const personTargets = peopleList
    .map(
      (person) =>
        ({
          person_id: person.person_id,
          full_name: person.full_name,
          shows: [...person.shows.values()].sort((left, right) =>
            left.show_name.localeCompare(right.show_name),
          ),
        }) satisfies PersonTargetSummary,
    )
    .sort((left, right) => left.full_name.localeCompare(right.full_name));

  const personHandlesByPersonId = new Map<string, SocialHandleSummary[]>();
  const socialBladeRawHandleCandidatesByPersonId = new Map<
    string,
    ReadonlyMap<string, readonly string[]>
  >();
  const hydrated = personTargets.map((person) => {
    const records = externalIdsByPersonId.get(person.person_id) ?? [];
    const fallbackHandles = fallbackHandlesByPersonId.get(person.person_id);
    const rawSocialBladeHandleCandidates = new Map<string, string[]>();
    for (const record of records) {
      if (
        PERSON_SOCIAL_SOURCES.includes(
          record.source_id as SupportedPersonSocialSource,
        )
      ) {
        addRawSocialBladeHandleCandidate(
          rawSocialBladeHandleCandidates,
          record.source_id as SupportedPersonSocialSource,
          record.external_id,
        );
      }
    }
    if (fallbackHandles) {
      addRawSocialBladeHandleCandidate(
        rawSocialBladeHandleCandidates,
        "facebook",
        fallbackHandles.facebook_handle,
      );
      addRawSocialBladeHandleCandidate(
        rawSocialBladeHandleCandidates,
        "instagram",
        fallbackHandles.instagram_handle,
      );
      addRawSocialBladeHandleCandidate(
        rawSocialBladeHandleCandidates,
        "youtube",
        fallbackHandles.youtube_handle,
      );
    }
    const handles = dedupeHandles(
      [
        ...records
          .map((record) => buildPersonHandleSummary(record))
          .filter((handle): handle is SocialHandleSummary => handle !== null),
        ...buildFallbackPersonHandleSummaries(fallbackHandles),
      ],
    );
    for (const handle of handles) {
      const platform = normalizeCastSocialBladePlatform(handle.platform);
      if (!platform) continue;
      addNameCasedSocialBladeHandleCandidate(
        rawSocialBladeHandleCandidates,
        platform,
        handle.handle,
        person.full_name,
      );
    }
    socialBladeRawHandleCandidatesByPersonId.set(
      person.person_id,
      rawSocialBladeHandleCandidates,
    );
    personHandlesByPersonId.set(person.person_id, handles);
    if (handles.length === 0) return null;

    return {
      person_id: person.person_id,
      full_name: person.full_name,
      shows: person.shows,
      handles,
    } satisfies PersonProfileSummary;
  });

  return {
    peopleProfiles: hydrated
      .filter((person): person is PersonProfileSummary => person !== null)
      .sort((left, right) => left.full_name.localeCompare(right.full_name)),
    personTargets,
    personHandlesByPersonId,
    socialBladeRawHandleCandidatesByPersonId,
  };
};

const buildCastSocialBladeAccountSummary = (
  row: SocialBladeSummaryRow,
  matchedHandle?: string,
): CastSocialBladeAccountSummary | null => {
  const platform = normalizeCastSocialBladePlatform(row.platform);
  if (!platform || typeof row.account_handle !== "string") return null;
  const handle =
    (matchedHandle ? normalizeSocialAccountProfileHandle(matchedHandle) : null) ??
    normalizeSocialBladeRowHandle(platform, row.account_handle);
  if (!handle) return null;

  return {
    platform,
    handle,
    display_label: formatHandleLabel(platform, handle),
    account_href: buildSocialAccountProfileUrl({
      platform,
      handle,
    }),
    socialblade_url:
      typeof row.socialblade_url === "string" && row.socialblade_url.trim()
        ? row.socialblade_url.trim()
        : null,
    scraped_at: toIsoStringOrNull(row.scraped_at),
    updated_at: toIsoStringOrNull(row.updated_at),
    stats_refreshed: row.stats_refreshed === true,
  };
};

type CastSocialBladeRowCandidate = {
  row: SocialBladeSummaryRow;
  matchedHandle: string;
  matchRank: number;
};

const toTimestampMs = (value: string | Date | null | undefined): number => {
  const isoValue = toIsoStringOrNull(value);
  if (!isoValue) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(isoValue);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const compareCastSocialBladeRowCandidates = (
  personId: string,
  left: CastSocialBladeRowCandidate,
  right: CastSocialBladeRowCandidate,
): number => {
  if (left.matchRank !== right.matchRank) {
    return left.matchRank - right.matchRank;
  }

  const leftPersonRank = left.row.person_id === personId ? 0 : 1;
  const rightPersonRank = right.row.person_id === personId ? 0 : 1;
  if (leftPersonRank !== rightPersonRank) {
    return leftPersonRank - rightPersonRank;
  }

  for (const field of ["updated_at", "scraped_at", "created_at"] as const) {
    const leftTimestamp = toTimestampMs(left.row[field]);
    const rightTimestamp = toTimestampMs(right.row[field]);
    if (leftTimestamp !== rightTimestamp) {
      return rightTimestamp - leftTimestamp;
    }
  }

  const leftId = String(left.row.id ?? "");
  const rightId = String(right.row.id ?? "");
  if (leftId !== rightId) {
    return leftId.localeCompare(rightId);
  }

  const stableFields = [
    "platform",
    "account_handle",
    "person_id",
    "socialblade_url",
  ] as const;
  for (const field of stableFields) {
    const leftValue = String(left.row[field] ?? "");
    const rightValue = String(right.row[field] ?? "");
    if (leftValue !== rightValue) {
      return leftValue.localeCompare(rightValue);
    }
  }

  return 0;
};

const latestTimestamp = (values: readonly (string | null)[]): string | null => {
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp) || timestamp <= latestMs) continue;
    latest = value;
    latestMs = timestamp;
  }
  return latest;
};

const buildCastSocialBladeShows = async (
  coveredShows: readonly CoveredShow[],
  castByShowId: ReadonlyMap<string, CastSummaryMember[]>,
  personHandlesByPersonId: ReadonlyMap<string, SocialHandleSummary[]>,
  socialBladeRawHandleCandidatesByPersonId: ReadonlyMap<
    string,
    ReadonlyMap<string, readonly string[]>
  >,
  adminContext?: VerifiedAdminContext,
): Promise<CacheableValue<CastSocialBladeShowSummary[]>> => {
  const personIds = [...personHandlesByPersonId.keys()];
  const currentLookup = buildCurrentSocialBladeLookup(
    personHandlesByPersonId,
    socialBladeRawHandleCandidatesByPersonId,
  );
  const socialBladeRowsResult = await safeLoadCastSocialBladeRows(
    personIds,
    currentLookup.accountHandleCandidates,
    adminContext,
  );

  const rowsByAccountKey = new Map<string, SocialBladeSummaryRow[]>();
  for (const row of socialBladeRowsResult.value) {
    const rowAccountKey = buildSocialBladeRowAccountKey(row);
    if (!rowAccountKey) continue;
    const rows = rowsByAccountKey.get(rowAccountKey) ?? [];
    rows.push(row);
    rowsByAccountKey.set(rowAccountKey, rows);
  }

  const shows = [...coveredShows]
    .sort((left, right) => left.show_name.localeCompare(right.show_name))
    .map((show) => {
      const members = (castByShowId.get(show.trr_show_id) ?? [])
        .map((member): CastSocialBladeMemberSummary | null => {
          const personId =
            typeof member.person_id === "string" ? member.person_id.trim() : "";
          const fullName =
            typeof member.full_name === "string" ? member.full_name.trim() : "";
          if (!personId || !fullName) return null;

          const currentAccounts =
            currentLookup.entriesByPersonId.get(personId) ?? [];

          const rowCandidates: CastSocialBladeRowCandidate[] = [];
          for (const currentAccount of currentAccounts) {
            const owners = currentLookup.ownersByKey.get(currentAccount.key);
            const isAmbiguousCurrentHandle = owners ? owners.size > 1 : false;
            for (const row of rowsByAccountKey.get(currentAccount.key) ?? []) {
              if (isAmbiguousCurrentHandle && row.person_id !== personId) {
                continue;
              }
              rowCandidates.push({
                row,
                matchedHandle: currentAccount.handle,
                matchRank: currentAccount.matchRank,
              });
            }
          }

          const seenAccounts = new Set<string>();
          const accounts = rowCandidates
            .sort((left, right) =>
              compareCastSocialBladeRowCandidates(personId, left, right),
            )
            .map((candidate) =>
              buildCastSocialBladeAccountSummary(
                candidate.row,
                candidate.matchedHandle,
              ),
            )
            .filter((account): account is CastSocialBladeAccountSummary => {
              if (!account) return false;
              const key = buildSocialBladeAccountKey(account.platform, account.handle);
              if (seenAccounts.has(key)) return false;
              seenAccounts.add(key);
              return true;
            })
            .sort((left, right) => {
              if (left.platform !== right.platform) {
                return left.platform.localeCompare(right.platform);
              }
              return left.handle.localeCompare(right.handle);
            });

          if (accounts.length === 0) return null;
          return {
            person_id: personId,
            full_name: fullName,
            photo_url:
              typeof member.photo_url === "string" && member.photo_url.trim()
                ? member.photo_url.trim()
                : null,
            accounts,
          };
        })
        .filter(
          (member): member is CastSocialBladeMemberSummary => member !== null,
        )
        .sort((left, right) => left.full_name.localeCompare(right.full_name));

      if (members.length === 0) return null;

      const platformCounts: Partial<Record<CastSocialBladePlatform, number>> = {};
      for (const member of members) {
        for (const account of member.accounts) {
          platformCounts[account.platform] =
            (platformCounts[account.platform] ?? 0) + 1;
        }
      }

      return {
        show_id: show.trr_show_id,
        show_name: show.show_name,
        canonical_slug: show.canonical_slug ?? null,
        platform_counts: platformCounts,
        cast_member_count: members.length,
        latest_scraped_at: latestTimestamp(
          members.flatMap((member) =>
            member.accounts.map((account) => account.scraped_at),
          ),
        ),
        members,
      } satisfies CastSocialBladeShowSummary;
    })
    .filter((show): show is CastSocialBladeShowSummary => show !== null);

  return {
    value: shows,
    cacheable: socialBladeRowsResult.cacheable,
  };
};

export async function getSocialLandingPayloadResult(
  adminContext?: VerifiedAdminContext,
  timingCollector?: SocialLandingTimingCollector,
): Promise<SocialLandingPayloadResult> {
  const { coveredShows, redditDashboard, cacheable: landingSummaryCacheable } =
    await withSocialLandingTiming(
      "backend landing summary",
      safeLoadBackendLandingSummary(adminContext),
    );
  const scrapeJobHealthPromise = withSocialLandingTiming(
    "scrape job health",
    safeLoadScrapeJobHealth(),
  );
  const coveredShowIds = coveredShows.map((show) => show.trr_show_id);
  const [
    networkSharedSourcesResult,
    creatorSharedSourcesResult,
    newsSharedSourcesResult,
    sharedRunsResult,
    sharedReviewItemsResult,
    showExternalIdsByIdResult,
    castByShowIdResult,
  ] = await Promise.all([
    withSocialLandingTiming(
      "network shared sources",
      safeLoadSharedSources(adminContext, "network"),
    ),
    withSocialLandingTiming(
      "creator shared sources",
      safeLoadSharedSources(adminContext, "creator"),
    ),
    withSocialLandingTiming(
      "news shared sources",
      safeLoadSharedSources(adminContext, "news"),
    ),
    withOptionalLandingTimeout(
      "shared runs",
      toCacheableValue(safeLoadSharedRuns(adminContext)),
      [],
    ),
    withOptionalLandingTimeout(
      "shared review items",
      toCacheableValue(safeLoadSharedReviewItems(adminContext)),
      [],
    ),
    withOptionalLandingTimeout(
      "show external IDs",
      safeLoadShowExternalIdsMap(coveredShowIds),
      new Map(),
    ),
    withOptionalLandingTimeout(
      "show cast summary",
      safeLoadShowCastSummaryMap(coveredShowIds, adminContext),
      new Map(),
    ),
  ]);
  const networkSharedSources = networkSharedSourcesResult.value;
  const creatorSharedSources = creatorSharedSourcesResult.value;
  const newsSharedSources = newsSharedSourcesResult.value;
  const sharedRuns = sharedRunsResult.value;
  const sharedReviewItems = sharedReviewItemsResult.value;
  const sharedSourceStatus = [
    networkSharedSourcesResult.status,
    creatorSharedSourcesResult.status,
    newsSharedSourcesResult.status,
  ];
  const sourcesByScope = new Map<SharedAccountSourceSetScope, readonly SharedAccountSourceSummary[]>([
    ["network", networkSharedSources],
    ["creator", creatorSharedSources],
    ["news", newsSharedSources],
  ]);
  const showExternalIdsById = showExternalIdsByIdResult.value;
  const castByShowId = castByShowIdResult.value;
  const {
    peopleProfiles,
    personTargets,
    personHandlesByPersonId,
    socialBladeRawHandleCandidatesByPersonId,
  } = await withSocialLandingTiming(
    "people profiles",
    buildPeopleProfiles(coveredShows, castByShowId),
  );
  const castSocialBladeShowsResult = await withOptionalLandingTimeout(
    "cast SocialBlade",
    buildCastSocialBladeShows(
      coveredShows,
      castByShowId,
      personHandlesByPersonId,
      socialBladeRawHandleCandidatesByPersonId,
      adminContext,
    ),
    [],
  );
  const networkSets = buildNetworkSets(networkSharedSources);
  const showSets = buildShowSets(
    coveredShows,
    showExternalIdsById,
    networkSharedSources,
  );
  const sharedSourceSets = buildSharedSourceSets(sourcesByScope);
  const progressResult = await withOptionalLandingTimeout(
    "social progress",
    safeLoadSocialProgressSummaries(
      collectSocialProgressTargets({
        networkSets,
        showSets,
        sharedSourceSets,
      }),
      adminContext,
      timingCollector,
    ),
    new Map(),
  ) as SocialProgressSummaryResult;
  const progressByKey = progressResult.value;
  const hydratedNetworkSets = networkSets.map((set) =>
    hydrateNetworkSetProgress(set, progressByKey),
  );
  const hydratedShowSets = showSets.map((set) =>
    hydrateShowSetProgress(set, progressByKey),
  );
  const hydratedSharedSourceSets = sharedSourceSets.map((set) =>
    hydrateSharedSourceSetProgress(set, progressByKey),
  );
  const hydratedNetworkSharedSources = networkSharedSources.map((source) =>
    hydrateSharedSourceProgress(source, progressByKey),
  );
  const scrapeJobHealth = await scrapeJobHealthPromise;

  return {
    payload: {
      network_sets: hydratedNetworkSets,
      show_sets: hydratedShowSets,
      people_profiles: peopleProfiles,
      person_targets: personTargets,
      cast_socialblade_shows: castSocialBladeShowsResult.value,
      shared_source_sets: hydratedSharedSourceSets,
      shared_pipeline: {
        sources: hydratedNetworkSharedSources,
        runs: sharedRuns,
        review_items: sharedReviewItems,
      } satisfies SharedPipelineSummary,
      shared_source_status: sharedSourceStatus,
      social_progress_status: progressResult.status ?? {
        source: "fallback",
        cache_status: null,
        generated_at: null,
        stale: !progressResult.cacheable,
      },
      scrape_job_health: scrapeJobHealth,
      reddit_dashboard: redditDashboard,
    },
    cacheable:
      landingSummaryCacheable &&
      networkSharedSourcesResult.cacheable &&
      creatorSharedSourcesResult.cacheable &&
      newsSharedSourcesResult.cacheable &&
      sharedRunsResult.cacheable &&
      sharedReviewItemsResult.cacheable &&
      showExternalIdsByIdResult.cacheable &&
      castByShowIdResult.cacheable &&
      castSocialBladeShowsResult.cacheable &&
      progressResult.cacheable,
  };
}

export async function getSocialLandingPayload(
  adminContext?: VerifiedAdminContext,
): Promise<SocialLandingPayload> {
  const result = await getSocialLandingPayloadResult(adminContext);
  return result.payload;
}
