import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requireAdmin } from "@/lib/server/auth";
import { getCastByShowId, getShowById } from "@/lib/server/trr-api/trr-shows-repository";
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
  return Math.min(parsed, 500);
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

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
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
      timeoutMs: 20_000,
      retries: 1,
    });
    const payload = data.discovery;
    return payload && typeof payload === "object" ? (payload as DiscoveryPayload) : null;
  } catch {
    return null;
  }
};

const fetchCachedDiscoveryByPeriodKeys = async (input: {
  communityId: string;
  seasonId: string;
  periodKeys: string[];
}): Promise<{ discovery: DiscoveryPayload | null; matchedPeriodKey: string | null }> => {
  const tried = new Set<string>();
  for (const periodKey of input.periodKeys) {
    const key = periodKey.trim();
    if (!key || tried.has(key)) continue;
    tried.add(key);
    const discovery = await fetchCachedDiscovery({
      communityId: input.communityId,
      seasonId: input.seasonId,
      periodKey: key,
    });
    if (discovery) {
      return { discovery, matchedPeriodKey: key };
    }
  }
  return { discovery: null, matchedPeriodKey: null };
};

const waitForRunCompletion = async (runId: string, timeoutMs: number): Promise<RedditRunPayload> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const data = await fetchSocialBackendJson(`/reddit/runs/${runId}`, {
      fallbackError: "Failed to fetch reddit refresh run status",
      timeoutMs: 20_000,
      retries: 1,
    });

    const run = data as RedditRunPayload;
    if (TERMINAL_RUN_STATUSES.has(run.status)) {
      return run;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Request timed out. Please try again.");
};

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const show = await getShowById(community.trr_show_id).catch(() => null);
    const cast = await getCastByShowId(community.trr_show_id, { limit: 200 }).catch(() => []);
    const castNames = cast
      .map((member) => member.full_name ?? member.cast_member_name ?? "")
      .filter((name): name is string => name.trim().length > 0);

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
    const periodKey = buildPeriodKey(periodKeyInput);
    const legacyPeriodKey = buildLegacyPeriodKey(periodKeyInput);
    const cacheLookupPeriodKeys = legacyPeriodKey === periodKey ? [periodKey] : [periodKey, legacyPeriodKey];

    const canUsePeriodWindowCache = Boolean(parsedPeriodStart.value || parsedPeriodEnd.value);
    if (canUsePeriodWindowCache && !forceRefresh) {
      const cachedLookup = await fetchCachedDiscoveryByPeriodKeys({
        communityId,
        seasonId: resolvedSeasonId,
        periodKeys: cacheLookupPeriodKeys,
      });
      if (cachedLookup.discovery) {
        return NextResponse.json({
          community,
          discovery: cachedLookup.discovery,
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
        cache: {
          hit_used: false,
          fallback_used: false,
          forced_refresh: forceRefresh,
        },
      });
    }

    const runStartPayload = {
      community_id: communityId,
      season_id: resolvedSeasonId,
      period_key: periodKey,
      subreddit: community.subreddit,
      show_name: show?.name ?? community.trr_show_name,
      show_aliases: show?.alternative_names ?? [],
      cast_names: castNames,
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
      fetch_comments: false,
      max_pages: maxPages ?? undefined,
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

    const shouldWaitForCompletion = forceRefresh ? waitForCompletion : true;
    if (!shouldWaitForCompletion) {
      const cachedFallback = canUsePeriodWindowCache
        ? (
            await fetchCachedDiscoveryByPeriodKeys({
              communityId,
              seasonId: resolvedSeasonId,
              periodKeys: cacheLookupPeriodKeys,
            })
          ).discovery
        : null;
      const discovery = cachedFallback ?? run.discovery ?? null;
      return NextResponse.json({
        community,
        discovery,
        run,
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
        })
      ).discovery;
      if (!cachedFallback) {
        throw pollError;
      }
      return NextResponse.json({
        community,
        discovery: cachedFallback,
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
        })
      ).discovery;
      if (!cachedFallback) {
        throw new Error("No discovery payload returned");
      }
      return NextResponse.json({
        community,
        discovery: cachedFallback,
        cache: {
          hit_used: false,
          fallback_used: true,
          forced_refresh: forceRefresh,
        },
      });
    }

    return NextResponse.json({
      community,
      discovery,
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
