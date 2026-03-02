import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requireAdmin } from "@/lib/server/auth";
import { getCastNamesByShowId, getShowById } from "@/lib/server/trr-api/trr-shows-repository";
import {
  fetchSocialBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";
import { getRedditCommunityById } from "@/lib/server/admin/reddit-sources-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ communityId: string }>;
}

type RedditListingSort = "new" | "hot" | "top";
type CoverageMode = "standard" | "adaptive_deep" | "max_coverage";

interface DiscoveryPayload {
  subreddit: string;
  fetched_at: string;
  collection_mode: "sample" | "exhaustive_window";
  sources_fetched: RedditListingSort[];
  successful_sorts: RedditListingSort[];
  failed_sorts: RedditListingSort[];
  rate_limited_sorts: RedditListingSort[];
  listing_pages_fetched: number;
  max_pages_applied: number;
  window_exhaustive_complete: boolean | null;
  totals: {
    fetched_rows: number;
    matched_rows: number;
    tracked_flair_rows: number;
  };
  window_start: string | null;
  window_end: string | null;
  search_backfill?: {
    enabled: boolean;
    queries_run: number;
    pages_fetched: number;
    rows_fetched: number;
    rows_in_window: number;
    complete: boolean;
    query_diagnostics: Array<{
      flair: string;
      query: string;
      pages_fetched: number;
      rows_fetched: number;
      rows_in_window: number;
      reached_period_start: boolean;
      complete: boolean;
    }>;
  } | null;
  terms: string[];
  hints: {
    suggested_include_terms: string[];
    suggested_exclude_terms: string[];
  };
  threads: Array<Record<string, unknown>>;
}

type RedditRunPayload = {
  run_id: string;
  status: "queued" | "running" | "completed" | "partial" | "failed" | "cancelled";
  error?: string | null;
  queue?: {
    running_total?: number;
    queued_total?: number;
    other_running?: number;
    other_queued?: number;
    queued_ahead?: number;
  };
  queue_position?: number | null;
  active_jobs?: number | null;
  discovery?: DiscoveryPayload | null;
};

const TERMINAL_RUN_STATUSES = new Set<RedditRunPayload["status"]>([
  "completed",
  "partial",
  "failed",
  "cancelled",
]);

const SORTS: RedditListingSort[] = ["new", "hot", "top"];
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS_DEFAULT = 24_000;
const POLL_TIMEOUT_MS_REFRESH = 170_000;
const CACHE_LOOKUP_TIMEOUT_MS = 8_000;
const CACHE_LOOKUP_RETRIES = 0;
const SHOW_CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000;
const DISCOVERY_NEGATIVE_CACHE_TTL_MS = 60 * 1000;
const ENABLE_DISCOVERY_TIMINGS =
  process.env.NODE_ENV !== "test" && process.env.REDDIT_DISCOVERY_DEBUG_TIMINGS !== "0";

type ShowDiscoveryContext = {
  showName: string;
  showAliases: string[];
  castNames: string[];
};

const showDiscoveryContextCache = new Map<
  string,
  { expiresAt: number; value: ShowDiscoveryContext }
>();
const redditDiscoveryNegativeCache = new Map<string, number>();

const logDiscoveryTiming = (
  event: string,
  startedAtMs: number,
  context: Record<string, unknown> = {},
): void => {
  if (!ENABLE_DISCOVERY_TIMINGS) return;
  const elapsedMs = Date.now() - startedAtMs;
  console.info("[reddit_discover_timing]", {
    event,
    elapsed_ms: elapsedMs,
    ...context,
  });
};

const parseSortModes = (input: string | null): RedditListingSort[] => {
  if (!input) return SORTS;
  const values = input
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is RedditListingSort => SORTS.includes(value as RedditListingSort));
  const deduped = [...new Set(values)];
  return deduped.length > 0 ? deduped : SORTS;
};

const parseLimit = (value: string | null): number => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 35;
  return Math.min(parsed, 80);
};

const parseIsoDateParam = (
  value: string | null,
  field: "period_start" | "period_end",
): { value: string | null; error?: string } => {
  if (!value) return { value: null };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { value: null, error: `${field} must be a valid ISO datetime` };
  }
  return { value: parsed.toISOString() };
};

const parseBoolean = (value: string | null): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const parseMaxPages = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.min(parsed, 1000);
};

const parseCoverageMode = (value: string | null): CoverageMode | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "adaptive_deep") return "adaptive_deep";
  if (normalized === "max_coverage") return "max_coverage";
  if (normalized === "standard") return "standard";
  return null;
};

const parseForceFlares = (values: string[]): string[] => {
  const deduped = new Map<string, string>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (deduped.has(key)) continue;
    deduped.set(key, normalized);
  }
  return [...deduped.values()];
};

const parseSeedPostUrls = (values: string[]): string[] => {
  const deduped = new Map<string, string>();
  for (const value of values) {
    const chunks = value
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    for (const chunk of chunks) {
      const key = chunk.toLowerCase();
      if (deduped.has(key)) continue;
      deduped.set(key, chunk);
    }
  }
  return [...deduped.values()];
};

const parseContainerKey = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9:_-]+/g, "-");
  if (!normalized) return null;
  return normalized.slice(0, 96);
};

const buildRunConfigHash = (input: {
  coverageMode: CoverageMode;
  maxPages: number | null;
  exhaustiveWindow: boolean;
  searchBackfill: boolean;
  analysisFlares: string[];
  analysisAllFlares: string[];
  forceIncludeFlares: string[];
  seedPostUrls: string[];
  periodStart: string | null;
  periodEnd: string | null;
  fetchComments: boolean;
  commentDeltaOnly: boolean;
}): string => {
  const canonical = {
    coverage_mode: input.coverageMode,
    max_pages: input.maxPages ?? null,
    exhaustive_window: input.exhaustiveWindow,
    search_backfill: input.searchBackfill,
    analysis_flares: [...input.analysisFlares].map((value) => value.trim()).filter(Boolean).sort(),
    analysis_all_flares: [...input.analysisAllFlares].map((value) => value.trim()).filter(Boolean).sort(),
    force_include_flares: [...input.forceIncludeFlares].map((value) => value.trim()).filter(Boolean).sort(),
    seed_post_urls: [...input.seedPostUrls].map((value) => value.trim()).filter(Boolean).sort(),
    period_start: input.periodStart,
    period_end: input.periodEnd,
    fetch_comments: input.fetchComments,
    comment_delta_only: input.commentDeltaOnly,
  };
  return createHash("sha1").update(JSON.stringify(canonical)).digest("hex");
};

const parsePeriodLabel = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, 120);
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const buildStableContainerPeriodKey = (input: {
  communityId: string;
  seasonId: string;
  containerKey: string;
  forceFlares: string[];
}): string => {
  const flaresCanonical = input.forceFlares.map((value) => value.trim().toLowerCase()).sort().join(",");
  const flaresSuffix = flaresCanonical
    ? `:f:${createHash("sha1").update(flaresCanonical).digest("hex").slice(0, 12)}`
    : "";
  return `community:${input.communityId}:season:${input.seasonId}:container:${input.containerKey}${flaresSuffix}`;
};

const buildPeriodKey = (input: {
  communityId: string;
  seasonId: string;
  periodStart: string | null;
  periodEnd: string | null;
  forceFlares: string[];
}): string => {
  const start = input.periodStart ?? "none";
  const end = input.periodEnd ?? "none";
  const flares = input.forceFlares.map((value) => value.trim().toLowerCase()).sort().join(",") || "none";
  const canonical = `window:${start}:${end}:flares:${flares}`;
  const digest = createHash("sha1").update(canonical).digest("hex");
  return `community:${input.communityId}:season:${input.seasonId}:window:${digest}`;
};

const buildLegacyPeriodKey = (input: {
  communityId: string;
  seasonId: string;
  periodStart: string | null;
  periodEnd: string | null;
  forceFlares: string[];
}): string => {
  const start = input.periodStart ?? "none";
  const end = input.periodEnd ?? "none";
  const flares = input.forceFlares.map((value) => value.trim().toLowerCase()).sort().join(",") || "none";
  return `community:${input.communityId}:season:${input.seasonId}:window:${start}:${end}:flares:${flares}`;
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toTimestamp = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const toThreadLookupKey = (thread: Record<string, unknown>): string | null => {
  const redditPostId = thread.reddit_post_id;
  if (typeof redditPostId === "string" && redditPostId.trim()) {
    return `id:${redditPostId.trim().toLowerCase()}`;
  }
  const permalink = thread.permalink;
  if (typeof permalink === "string" && permalink.trim()) {
    return `permalink:${permalink.trim().toLowerCase()}`;
  }
  const url = thread.url;
  if (typeof url === "string" && url.trim()) {
    return `url:${url.trim().toLowerCase()}`;
  }
  const title = thread.title;
  const postedAt = thread.posted_at;
  if (typeof title === "string" && title.trim() && typeof postedAt === "string" && postedAt.trim()) {
    return `fallback:${title.trim().toLowerCase()}::${postedAt.trim()}`;
  }
  return null;
};

const sortMergedThreads = (left: Record<string, unknown>, right: Record<string, unknown>): number => {
  const leftMatchScore = toFiniteNumber(left.match_score);
  const rightMatchScore = toFiniteNumber(right.match_score);
  if (rightMatchScore !== leftMatchScore) return rightMatchScore - leftMatchScore;
  const leftComments = toFiniteNumber(left.num_comments);
  const rightComments = toFiniteNumber(right.num_comments);
  if (rightComments !== leftComments) return rightComments - leftComments;
  const leftScore = toFiniteNumber(left.score);
  const rightScore = toFiniteNumber(right.score);
  if (rightScore !== leftScore) return rightScore - leftScore;
  const leftPostedAt = toTimestamp(typeof left.posted_at === "string" ? left.posted_at : null);
  const rightPostedAt = toTimestamp(typeof right.posted_at === "string" ? right.posted_at : null);
  return rightPostedAt - leftPostedAt;
};

const mergeStringArrays = (values: string[][]): string[] => {
  const deduped = new Set<string>();
  for (const list of values) {
    for (const value of list) {
      if (!value) continue;
      deduped.add(value);
    }
  }
  return [...deduped];
};

const mergeDiscoveryPayloads = (items: Array<{ periodKey: string; discovery: DiscoveryPayload }>): {
  discovery: DiscoveryPayload;
  matchedPeriodKey: string;
} => {
  if (items.length === 0) {
    throw new Error("mergeDiscoveryPayloads requires at least one item");
  }
  if (items.length === 1) {
    return { discovery: items[0].discovery, matchedPeriodKey: items[0].periodKey };
  }

  const sortedByFetchedAt = [...items].sort((left, right) => {
    const leftTs = toTimestamp(left.discovery.fetched_at);
    const rightTs = toTimestamp(right.discovery.fetched_at);
    return leftTs - rightTs;
  });
  const newest = sortedByFetchedAt[sortedByFetchedAt.length - 1];
  const mergedThreads = new Map<string, Record<string, unknown>>();
  let anonymousThreadIndex = 0;

  for (const entry of sortedByFetchedAt) {
    for (const rawThread of entry.discovery.threads ?? []) {
      if (!rawThread || typeof rawThread !== "object") continue;
      const thread = rawThread as Record<string, unknown>;
      const key = toThreadLookupKey(thread) ?? `anonymous:${anonymousThreadIndex++}`;
      const existing = mergedThreads.get(key);
      mergedThreads.set(key, existing ? { ...existing, ...thread } : thread);
    }
  }

  const threads = [...mergedThreads.values()].sort(sortMergedThreads);
  const trackedFlairRows = threads.reduce((count, thread) => {
    return thread.passes_flair_filter === false ? count : count + 1;
  }, 0);
  const minWindowStart = sortedByFetchedAt
    .map((entry) => entry.discovery.window_start)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort()[0] ?? null;
  const maxWindowEnd = sortedByFetchedAt
    .map((entry) => entry.discovery.window_end)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort()
    .at(-1) ?? null;
  const listingPagesFetched = Math.max(
    ...sortedByFetchedAt.map((entry) => toFiniteNumber(entry.discovery.listing_pages_fetched)),
  );
  const maxPagesApplied = Math.max(
    ...sortedByFetchedAt.map((entry) => toFiniteNumber(entry.discovery.max_pages_applied)),
  );
  const windowCompletenessValues = sortedByFetchedAt
    .map((entry) => entry.discovery.window_exhaustive_complete)
    .filter((value): value is boolean => typeof value === "boolean");
  const windowExhaustiveComplete =
    windowCompletenessValues.length === 0 ? null : windowCompletenessValues.every(Boolean);
  const includeTerms = mergeStringArrays(
    sortedByFetchedAt.map((entry) => entry.discovery.hints?.suggested_include_terms ?? []),
  );
  const excludeTerms = mergeStringArrays(
    sortedByFetchedAt.map((entry) => entry.discovery.hints?.suggested_exclude_terms ?? []),
  );
  const mergedDiscovery: DiscoveryPayload = {
    ...newest.discovery,
    fetched_at: newest.discovery.fetched_at,
    sources_fetched: mergeStringArrays(sortedByFetchedAt.map((entry) => entry.discovery.sources_fetched)) as Array<
      "new" | "hot" | "top"
    >,
    successful_sorts: mergeStringArrays(
      sortedByFetchedAt.map((entry) => entry.discovery.successful_sorts),
    ) as Array<"new" | "hot" | "top">,
    failed_sorts: mergeStringArrays(sortedByFetchedAt.map((entry) => entry.discovery.failed_sorts)) as Array<
      "new" | "hot" | "top"
    >,
    rate_limited_sorts: mergeStringArrays(
      sortedByFetchedAt.map((entry) => entry.discovery.rate_limited_sorts),
    ) as Array<"new" | "hot" | "top">,
    listing_pages_fetched: listingPagesFetched,
    max_pages_applied: maxPagesApplied,
    window_exhaustive_complete: windowExhaustiveComplete,
    totals: {
      fetched_rows: threads.length,
      matched_rows: threads.length,
      tracked_flair_rows: trackedFlairRows,
    },
    window_start: minWindowStart,
    window_end: maxWindowEnd,
    terms: mergeStringArrays(sortedByFetchedAt.map((entry) => entry.discovery.terms)),
    hints: {
      suggested_include_terms: includeTerms.slice(0, 12),
      suggested_exclude_terms: excludeTerms.slice(0, 12),
    },
    threads,
  };

  return { discovery: mergedDiscovery, matchedPeriodKey: newest.periodKey };
};

const buildLegacySingleFlairFallbackPeriodKeys = (input: {
  communityId: string;
  seasonId: string;
  periodStart: string | null;
  periodEnd: string | null;
  trackedFlares: string[];
}): string[] => {
  if (!input.periodStart || !input.periodEnd) return [];
  const normalizedFlares = parseForceFlares(input.trackedFlares);
  if (normalizedFlares.length === 0) return [];
  const preferredFlair =
    normalizedFlares.find((flair) => /\bsalt\s+lake\s+city\b|\brhoslc\b|\bslc\b/i.test(flair)) ??
    normalizedFlares[0];
  if (!preferredFlair) return [];
  return [
    buildPeriodKey({
      communityId: input.communityId,
      seasonId: input.seasonId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      forceFlares: [preferredFlair],
    }),
    buildLegacyPeriodKey({
      communityId: input.communityId,
      seasonId: input.seasonId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      forceFlares: [preferredFlair],
    }),
  ];
};

const isBulkCacheLookupEnabled = (): boolean =>
  process.env.SOCIAL_DISCOVER_BULK_CACHE_LOOKUP !== "0";

const getErrorStatus = (error: unknown): number | null => {
  if (!error || typeof error !== "object") return null;
  const record = error as { status?: unknown; upstreamStatus?: unknown };
  if (typeof record.status === "number") return record.status;
  if (typeof record.upstreamStatus === "number") return record.upstreamStatus;
  return null;
};

const isBulkCacheUnsupportedError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  if (status === 404 || status === 405) return true;
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("not found");
};

const buildNegativeCacheKey = (input: { communityId: string; seasonId: string; periodKey: string }): string =>
  `${input.communityId}:${input.seasonId}:${input.periodKey.trim().toLowerCase()}`;

const pruneNegativeCache = (): void => {
  const now = Date.now();
  for (const [key, expiresAt] of redditDiscoveryNegativeCache.entries()) {
    if (expiresAt <= now) redditDiscoveryNegativeCache.delete(key);
  }
};

const filterNegativeCacheMisses = (input: {
  communityId: string;
  seasonId: string;
  periodKeys: string[];
}): string[] => {
  pruneNegativeCache();
  const deduped = new Set<string>();
  const keys: string[] = [];
  for (const periodKey of input.periodKeys) {
    const key = periodKey.trim();
    if (!key || deduped.has(key)) continue;
    deduped.add(key);
    const missCacheKey = buildNegativeCacheKey({
      communityId: input.communityId,
      seasonId: input.seasonId,
      periodKey: key,
    });
    if (redditDiscoveryNegativeCache.has(missCacheKey)) continue;
    keys.push(key);
  }
  return keys;
};

const markNegativeMisses = (input: { communityId: string; seasonId: string; misses: string[] }): void => {
  const expiresAt = Date.now() + DISCOVERY_NEGATIVE_CACHE_TTL_MS;
  for (const periodKey of input.misses) {
    const key = periodKey.trim();
    if (!key) continue;
    redditDiscoveryNegativeCache.set(
      buildNegativeCacheKey({ communityId: input.communityId, seasonId: input.seasonId, periodKey: key }),
      expiresAt,
    );
  }
};

const clearNegativeMiss = (input: { communityId: string; seasonId: string; periodKey: string | null }): void => {
  if (!input.periodKey) return;
  redditDiscoveryNegativeCache.delete(
    buildNegativeCacheKey({ communityId: input.communityId, seasonId: input.seasonId, periodKey: input.periodKey }),
  );
};

const fetchCachedDiscovery = async (input: {
  communityId: string;
  seasonId: string;
  periodKey: string;
}): Promise<DiscoveryPayload | null> => {
  try {
    const params = new URLSearchParams({
      community_id: input.communityId,
      season_id: input.seasonId,
      period_key: input.periodKey,
    });
    const data = await fetchSocialBackendJson("/reddit/cache", {
      queryString: params.toString(),
      fallbackError: "Failed to fetch cached reddit discovery payload",
      timeoutMs: CACHE_LOOKUP_TIMEOUT_MS,
      retries: CACHE_LOOKUP_RETRIES,
    });
    const payload = data.discovery;
    return payload && typeof payload === "object" ? (payload as DiscoveryPayload) : null;
  } catch {
    return null;
  }
};

const fetchCachedDiscoveryByPeriodKeysSerial = async (input: {
  communityId: string;
  seasonId: string;
  periodKeys: string[];
}): Promise<{ discovery: DiscoveryPayload | null; matchedPeriodKey: string | null; misses: string[] }> => {
  const matches: Array<{ periodKey: string; discovery: DiscoveryPayload }> = [];
  const misses: string[] = [];
  for (const periodKey of input.periodKeys) {
    const discovery = await fetchCachedDiscovery({
      communityId: input.communityId,
      seasonId: input.seasonId,
      periodKey,
    });
    if (discovery) {
      matches.push({ periodKey, discovery });
      continue;
    }
    misses.push(periodKey);
  }
  if (matches.length > 0) {
    const merged = mergeDiscoveryPayloads(matches);
    return { ...merged, misses };
  }
  return { discovery: null, matchedPeriodKey: null, misses };
};

const fetchCachedDiscoveryByPeriodKeysBulk = async (input: {
  communityId: string;
  seasonId: string;
  periodKeys: string[];
  containerKeys?: string[];
}): Promise<{ discovery: DiscoveryPayload | null; matchedPeriodKey: string | null; misses: string[] }> => {
  const data = await fetchSocialBackendJson("/reddit/cache/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      community_id: input.communityId,
      season_id: input.seasonId,
      period_keys: input.periodKeys,
      container_keys: input.containerKeys ?? [],
    }),
    fallbackError: "Failed to fetch cached reddit discovery payloads",
    timeoutMs: CACHE_LOOKUP_TIMEOUT_MS,
    retries: CACHE_LOOKUP_RETRIES,
  });
  const payload = data.discovery;
  const misses = Array.isArray(data.misses)
    ? data.misses.map((item) => String(item)).filter((item) => item.trim().length > 0)
    : [];
  return {
    discovery: payload && typeof payload === "object" ? (payload as DiscoveryPayload) : null,
    matchedPeriodKey: typeof data.matched_period_key === "string" ? data.matched_period_key : null,
    misses,
  };
};

const fetchCachedDiscoveryByPeriodKeys = async (input: {
  communityId: string;
  seasonId: string;
  periodKeys: string[];
  containerKeys?: string[];
}): Promise<{ discovery: DiscoveryPayload | null; matchedPeriodKey: string | null }> => {
  const candidateKeys = filterNegativeCacheMisses(input);
  if (candidateKeys.length === 0) {
    return { discovery: null, matchedPeriodKey: null };
  }

  let result:
    | { discovery: DiscoveryPayload | null; matchedPeriodKey: string | null; misses: string[] }
    | null = null;

  if (isBulkCacheLookupEnabled()) {
    try {
      result = await fetchCachedDiscoveryByPeriodKeysBulk({
        communityId: input.communityId,
        seasonId: input.seasonId,
        periodKeys: candidateKeys,
        containerKeys: input.containerKeys,
      });
    } catch (error) {
      if (!isBulkCacheUnsupportedError(error)) {
        throw error;
      }
    }
  }

  if (!result) {
    result = await fetchCachedDiscoveryByPeriodKeysSerial({
      communityId: input.communityId,
      seasonId: input.seasonId,
      periodKeys: candidateKeys,
    });
  }

  const missesToCache =
    result.misses.length > 0 ? result.misses : (result.discovery ? [] : candidateKeys);
  if (missesToCache.length > 0) {
    markNegativeMisses({
      communityId: input.communityId,
      seasonId: input.seasonId,
      misses: missesToCache,
    });
  }
  clearNegativeMiss({
    communityId: input.communityId,
    seasonId: input.seasonId,
    periodKey: result.matchedPeriodKey,
  });

  return {
    discovery: result.discovery,
    matchedPeriodKey: result.matchedPeriodKey,
  };
};

const getShowDiscoveryContext = async (
  showId: string,
  fallbackShowName: string,
): Promise<ShowDiscoveryContext> => {
  const now = Date.now();
  const cached = showDiscoveryContextCache.get(showId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const [show, castNames] = await Promise.all([
    getShowById(showId).catch(() => null),
    getCastNamesByShowId(showId, { limit: 200 }).catch(() => []),
  ]);

  const context: ShowDiscoveryContext = {
    showName: show?.name ?? fallbackShowName,
    showAliases: Array.isArray(show?.alternative_names) ? show.alternative_names : [],
    castNames: castNames.filter((name) => name.trim().length > 0),
  };
  showDiscoveryContextCache.set(showId, {
    expiresAt: now + SHOW_CONTEXT_CACHE_TTL_MS,
    value: context,
  });
  return context;
};

const isRetryableRunPollError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("could not reach trr-backend") ||
    message.includes("fetch reddit refresh run status")
  );
};

const waitForRunCompletion = async (runId: string, timeoutMs: number): Promise<RedditRunPayload> => {
  const startedAt = Date.now();
  let transientFailures = 0;

  while (Date.now() - startedAt <= timeoutMs) {
    let data: Record<string, unknown>;
    try {
      data = await fetchSocialBackendJson(`/reddit/runs/${runId}`, {
        fallbackError: "Failed to fetch reddit refresh run status",
        timeoutMs: 20_000,
        retries: 1,
      });
      transientFailures = 0;
    } catch (error) {
      if (isRetryableRunPollError(error) && transientFailures < 4) {
        transientFailures += 1;
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      throw error;
    }

    const run = data as RedditRunPayload;
    if (TERMINAL_RUN_STATUSES.has(run.status)) {
      return run;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Request timed out. Please try again.");
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestStartedAtMs = Date.now();
  try {
    await requireAdmin(request);

    const { communityId } = await params;
    if (!communityId) {
      return NextResponse.json({ error: "communityId is required" }, { status: 400 });
    }
    if (!isValidUuid(communityId)) {
      return NextResponse.json({ error: "communityId must be a valid UUID" }, { status: 400 });
    }

    const community = await getRedditCommunityById(communityId);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const seasonIdParam = request.nextUrl.searchParams.get("season_id");
    const resolvedSeasonId = seasonIdParam && isValidUuid(seasonIdParam) ? seasonIdParam : null;
    if (!resolvedSeasonId) {
      return NextResponse.json(
        { error: "season_id is required for backend reddit refresh" },
        { status: 400 },
      );
    }

    const sortModes = parseSortModes(request.nextUrl.searchParams.get("sort"));
    const limitPerMode = parseLimit(request.nextUrl.searchParams.get("limit"));
    const parsedPeriodStart = parseIsoDateParam(
      request.nextUrl.searchParams.get("period_start"),
      "period_start",
    );
    if (parsedPeriodStart.error) {
      return NextResponse.json({ error: parsedPeriodStart.error }, { status: 400 });
    }
    const parsedPeriodEnd = parseIsoDateParam(
      request.nextUrl.searchParams.get("period_end"),
      "period_end",
    );
    if (parsedPeriodEnd.error) {
      return NextResponse.json({ error: parsedPeriodEnd.error }, { status: 400 });
    }
    if (
      parsedPeriodStart.value &&
      parsedPeriodEnd.value &&
      new Date(parsedPeriodStart.value).getTime() > new Date(parsedPeriodEnd.value).getTime()
    ) {
      return NextResponse.json(
        { error: "period_start must be before period_end" },
        { status: 400 },
      );
    }

    const exhaustiveWindow = parseBoolean(request.nextUrl.searchParams.get("exhaustive"));
    const searchBackfill = parseBoolean(request.nextUrl.searchParams.get("search_backfill"));
    const forceRefresh = parseBoolean(request.nextUrl.searchParams.get("refresh"));
    const waitForCompletion = parseBoolean(request.nextUrl.searchParams.get("wait"));
    const maxPages = parseMaxPages(request.nextUrl.searchParams.get("max_pages"));
    const requestedCoverageMode = parseCoverageMode(request.nextUrl.searchParams.get("coverage_mode"));
    const containerKey = parseContainerKey(request.nextUrl.searchParams.get("container_key"));
    const periodLabel = parsePeriodLabel(request.nextUrl.searchParams.get("period_label"));
    const coverageMode =
      requestedCoverageMode ??
      (containerKey === "period-preseason" ? "adaptive_deep" : "standard");
    const forceIncludeFlares = parseForceFlares(
      request.nextUrl.searchParams.getAll("force_flair"),
    );
    const seedPostUrls = parseSeedPostUrls([
      ...request.nextUrl.searchParams.getAll("seed_post_url"),
      ...request.nextUrl.searchParams.getAll("seed_post_urls"),
    ]);
    const forceFlairOnlyMode = forceIncludeFlares.length > 0;
    const analysisFlares = forceFlairOnlyMode ? [] : community.analysis_flares ?? [];
    const analysisAllFlares = forceFlairOnlyMode
      ? forceIncludeFlares
      : community.analysis_all_flares ?? [];

    const periodKeyInput = {
      communityId,
      seasonId: resolvedSeasonId,
      periodStart: parsedPeriodStart.value,
      periodEnd: parsedPeriodEnd.value,
      forceFlares: forceIncludeFlares,
    };
    const periodKey = containerKey
      ? buildStableContainerPeriodKey({
          communityId,
          seasonId: resolvedSeasonId,
          containerKey,
          forceFlares: forceIncludeFlares,
        })
      : buildPeriodKey(periodKeyInput);
    const legacyPeriodKey = buildLegacyPeriodKey(periodKeyInput);
    const hashedPeriodKey = buildPeriodKey(periodKeyInput);
    const legacySingleFlairFallbackKeys =
      forceIncludeFlares.length === 0
        ? buildLegacySingleFlairFallbackPeriodKeys({
            communityId,
            seasonId: resolvedSeasonId,
            periodStart: parsedPeriodStart.value,
            periodEnd: parsedPeriodEnd.value,
            trackedFlares: [...(community.analysis_all_flares ?? []), ...(community.analysis_flares ?? [])],
          })
        : [];
    const cacheLookupPeriodKeys = Array.from(
      new Set(
        [periodKey, hashedPeriodKey, legacyPeriodKey, ...legacySingleFlairFallbackKeys].filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0,
        ),
      ),
    );

    const canUsePeriodWindowCache = Boolean(containerKey || parsedPeriodStart.value || parsedPeriodEnd.value);
    if (canUsePeriodWindowCache && !forceRefresh) {
      const cachedLookup = await fetchCachedDiscoveryByPeriodKeys({
        communityId,
        seasonId: resolvedSeasonId,
        periodKeys: cacheLookupPeriodKeys,
        containerKeys: containerKey ? [containerKey] : [],
      });
      if (cachedLookup.discovery) {
        logDiscoveryTiming("cache_hit", requestStartedAtMs, {
          community_id: communityId,
          season_id: resolvedSeasonId,
          period_key: cachedLookup.matchedPeriodKey,
        });
        return NextResponse.json({
          community,
          discovery: cachedLookup.discovery,
          source: "cache",
          cache: {
            hit_used: true,
            fallback_used: false,
            forced_refresh: forceRefresh,
          },
        });
      }
      return NextResponse.json({
        community,
        discovery: null,
        warning: "No cached posts found yet for this window. Use Refresh Posts to run a live scrape.",
        source: "cache",
        cache: {
          hit_used: false,
          fallback_used: false,
          forced_refresh: forceRefresh,
        },
      });
    }

    const showContext = await getShowDiscoveryContext(community.trr_show_id, community.trr_show_name);
    const effectiveMaxPages =
      maxPages ??
      (coverageMode === "adaptive_deep" || coverageMode === "max_coverage" ? 1000 : 500);
    const fetchComments = true;
    const commentDeltaOnly = true;
    const runConfigHash = buildRunConfigHash({
      coverageMode,
      maxPages: effectiveMaxPages,
      exhaustiveWindow,
      searchBackfill,
      analysisFlares,
      analysisAllFlares,
      forceIncludeFlares,
      seedPostUrls,
      periodStart: parsedPeriodStart.value,
      periodEnd: parsedPeriodEnd.value,
      fetchComments,
      commentDeltaOnly,
    });

    const runStartPayload = {
      community_id: communityId,
      season_id: resolvedSeasonId,
      period_key: periodKey,
      period_stable_key: containerKey ?? undefined,
      container_key: containerKey ?? undefined,
      period_label: periodLabel ?? undefined,
      subreddit: community.subreddit,
      show_name: showContext.showName,
      show_aliases: showContext.showAliases,
      cast_names: showContext.castNames,
      is_show_focused: community.is_show_focused,
      analysis_flares: analysisFlares,
      analysis_all_flares: analysisAllFlares,
      force_include_flares: forceIncludeFlares,
      sort_modes: sortModes,
      limit_per_mode: limitPerMode,
      period_start: parsedPeriodStart.value,
      period_end: parsedPeriodEnd.value,
      exhaustive_window: exhaustiveWindow,
      search_backfill: searchBackfill,
      seed_post_urls: seedPostUrls,
      coverage_mode: coverageMode,
      run_config_hash: runConfigHash,
      fetch_comments: fetchComments,
      comment_delta_only: commentDeltaOnly,
      max_pages: effectiveMaxPages,
    };

    const started = await fetchSocialBackendJson("/reddit/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(runStartPayload),
      fallbackError: "Failed to start reddit refresh run",
      timeoutMs: 25_000,
      retries: 1,
    });

    const run = started.run as RedditRunPayload | undefined;
    if (!run?.run_id) {
      throw new Error("Failed to start reddit refresh run");
    }
    logDiscoveryTiming("run_started", requestStartedAtMs, {
      community_id: communityId,
      season_id: resolvedSeasonId,
      run_id: run.run_id,
      run_status: run.status,
      period_key: periodKey,
    });

    const shouldWaitForCompletion = forceRefresh ? waitForCompletion : true;
    if (!shouldWaitForCompletion) {
      const cachedFallback = canUsePeriodWindowCache
        ? (
            await fetchCachedDiscoveryByPeriodKeys({
              communityId,
              seasonId: resolvedSeasonId,
              periodKeys: cacheLookupPeriodKeys,
              containerKeys: containerKey ? [containerKey] : [],
            })
          ).discovery
        : null;
      const discovery = cachedFallback ?? run.discovery ?? null;
      return NextResponse.json({
        community,
        discovery,
        run,
        source: "live_run",
        warning: discovery
          ? run.status === "running"
            ? "Refresh running in backend; showing latest cached posts while scraping this window."
            : "Refresh queued in backend; showing latest cached posts while scraping this window."
          : run.status === "running"
            ? "Refresh running; no cached posts found yet for this window."
            : "Refresh queued; no cached posts found yet for this window.",
        cache: {
          hit_used: Boolean(cachedFallback),
          fallback_used: false,
          forced_refresh: forceRefresh,
        },
      });
    }

    const pollTimeout = forceRefresh ? POLL_TIMEOUT_MS_REFRESH : POLL_TIMEOUT_MS_DEFAULT;

    let finalRun: RedditRunPayload;
    try {
      finalRun = TERMINAL_RUN_STATUSES.has(run.status) ? run : await waitForRunCompletion(run.run_id, pollTimeout);
    } catch (pollError) {
      const cachedFallback = (
        await fetchCachedDiscoveryByPeriodKeys({
          communityId,
          seasonId: resolvedSeasonId,
          periodKeys: cacheLookupPeriodKeys,
          containerKeys: containerKey ? [containerKey] : [],
        })
      ).discovery;
      if (!cachedFallback) {
        throw pollError;
      }
      return NextResponse.json({
        community,
        discovery: cachedFallback,
        source: "live_run",
        cache: {
          hit_used: false,
          fallback_used: true,
          forced_refresh: forceRefresh,
        },
      });
    }

    if (finalRun.status === "failed" || finalRun.status === "cancelled") {
      throw new Error(finalRun.error || "Reddit refresh failed");
    }

    const discovery = finalRun.discovery;
    if (!discovery) {
      const cachedFallback = (
        await fetchCachedDiscoveryByPeriodKeys({
          communityId,
          seasonId: resolvedSeasonId,
          periodKeys: cacheLookupPeriodKeys,
          containerKeys: containerKey ? [containerKey] : [],
        })
      ).discovery;
      if (!cachedFallback) {
        throw new Error("No discovery payload returned");
      }
      return NextResponse.json({
        community,
        discovery: cachedFallback,
        source: "live_run",
        cache: {
          hit_used: false,
          fallback_used: true,
          forced_refresh: forceRefresh,
        },
      });
    }

    logDiscoveryTiming("run_completed", requestStartedAtMs, {
      community_id: communityId,
      season_id: resolvedSeasonId,
      run_id: finalRun.run_id,
      run_status: finalRun.status,
      fetched_rows: finalRun.totals?.fetched_rows ?? null,
      matched_rows: finalRun.totals?.matched_rows ?? null,
      tracked_flair_rows: finalRun.totals?.tracked_flair_rows ?? null,
    });
    return NextResponse.json({
      community,
      discovery,
      source: "live_run",
      cache: {
        hit_used: false,
        fallback_used: false,
        forced_refresh: forceRefresh,
      },
    });
  } catch (error) {
    return socialProxyErrorResponse(error, "[api] Failed to discover reddit threads via TRR-Backend");
  }
}
