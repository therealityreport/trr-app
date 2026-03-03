"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import SocialAdminPageHeader from "@/components/admin/SocialAdminPageHeader";
import { buildSeasonSocialBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import type { SeasonAdminTab, SocialAnalyticsViewSlug } from "@/lib/admin/show-admin-routes";
import {
  buildSeasonAdminUrl,
  buildShowAdminUrl,
  buildShowRedditCommunityUrl,
  buildShowRedditCommunityWindowPostUrl,
  buildShowRedditCommunityWindowUrl,
  buildShowRedditUrl,
} from "@/lib/admin/show-admin-routes";

type PeriodPostMatchType = "flair" | "scan" | "all";

interface DiscoveryThread {
  reddit_post_id: string;
  title: string;
  text: string | null;
  url: string;
  permalink: string | null;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string | null;
  link_flair_text: string | null;
  is_show_match?: boolean;
  passes_flair_filter?: boolean;
  match_score?: number;
  flair_mode?: string | null;
  match_type?: PeriodPostMatchType | null;
  admin_approved?: boolean | null;
  upvote_ratio?: number | null;
  post_type?: string | null;
  is_nsfw?: boolean | null;
  is_spoiler?: boolean | null;
  author_flair_text?: string | null;
}

interface DiscoveryPayload {
  fetched_at: string;
  totals?: {
    fetched_rows: number;
    matched_rows: number;
    tracked_flair_rows: number;
  };
  window_start?: string | null;
  window_end?: string | null;
  threads: DiscoveryThread[];
}

interface RedditCommunityListItem {
  id: string;
  trr_show_id: string;
  trr_show_name: string;
  subreddit: string;
  is_show_focused?: boolean;
  analysis_all_flairs?: string[];
}

interface ShowSeasonOption {
  id: string;
  season_number: number;
}

interface WindowContext {
  communityId: string;
  seasonId: string;
  seasonNumber: number;
  showSlug: string;
  showName: string;
  communitySlug: string;
  subreddit: string;
  containerKey: string;
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  isShowFocused: boolean;
  analysisAllFlairs: string[];
}

type ResolverStage =
  | "init"
  | "loading_communities"
  | "loading_seasons"
  | "loading_windows"
  | "loading_cache"
  | "finalizing";

const SEASON_TABS: Array<{ tab: SeasonAdminTab; label: string }> = [
  { tab: "overview", label: "Home" },
  { tab: "episodes", label: "Episodes" },
  { tab: "assets", label: "Assets" },
  { tab: "news", label: "News" },
  { tab: "fandom", label: "Fandom" },
  { tab: "cast", label: "Cast" },
  { tab: "surveys", label: "Surveys" },
  { tab: "social", label: "Social Media" },
];

const SOCIAL_TABS: Array<{ view: SocialAnalyticsViewSlug; label: string }> = [
  { view: "official", label: "OFFICIAL ANALYTICS" },
  { view: "sentiment", label: "SENTIMENT ANALYSIS" },
  { view: "hashtags", label: "HASHTAGS ANALYSIS" },
  { view: "advanced", label: "ADVANCED ANALYTICS" },
  { view: "reddit", label: "REDDIT ANALYTICS" },
];

const fmtNum = (value: number | null | undefined): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US").format(value);
};

const fmtDateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US");
};

const toInt = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const slugifyShowName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "show";

const normalizeCommunitySlug = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/^\/?r\//i, "")
    .replace(/^https?:\/\/(?:www\.)?reddit\.com\/r\//i, "")
    .replace(/^\/+|\/+$/g, "")
    .split(/[/?#]/, 1)[0];
  return cleaned || null;
};

/**
 * Parse reddit window context from a show-scoped pathname.  Used as a fallback
 * when the page is rendered from the s[seasonNumber] catch-all route where
 * useParams() returns { showId, seasonNumber: "ocial", rest: [...] } instead
 * of the expected { showId, communitySlug, seasonNumber, windowKey }.
 */
const parseRedditWindowFromPathname = (
  pathname: string,
): {
  showId: string;
  communitySlug: string;
  seasonNumber: number | null;
  windowKey: string;
} | null => {
  // /{showId}/social/reddit/{communitySlug}/s{season}/{windowKey}
  const withSeason = pathname.match(
    /^\/([^/]+)\/social\/reddit\/([^/]+)\/s(\d{1,3})\/([^/]+)$/,
  );
  if (withSeason) {
    const season = Number.parseInt(withSeason[3] ?? "", 10);
    return {
      showId: decodeURIComponent(withSeason[1] ?? ""),
      communitySlug: decodeURIComponent(withSeason[2] ?? ""),
      seasonNumber: Number.isFinite(season) && season > 0 ? season : null,
      windowKey: decodeURIComponent(withSeason[4] ?? ""),
    };
  }
  // /{showId}/social/reddit/{communitySlug}/{windowKey}
  const withoutSeason = pathname.match(
    /^\/([^/]+)\/social\/reddit\/([^/]+)\/([^/]+)$/,
  );
  if (withoutSeason) {
    return {
      showId: decodeURIComponent(withoutSeason[1] ?? ""),
      communitySlug: decodeURIComponent(withoutSeason[2] ?? ""),
      seasonNumber: null,
      windowKey: decodeURIComponent(withoutSeason[3] ?? ""),
    };
  }
  return null;
};

const resolveContainerKeyFromWindowToken = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "w0" || normalized === "period-preseason") return "period-preseason";
  if (normalized === "w-postseason" || normalized === "period-postseason") return "period-postseason";
  const episodeCanonical = normalized.match(/^e(\d+)$/);
  if (episodeCanonical) return `episode-${episodeCanonical[1]}`;
  const episodeLegacy = normalized.match(/^w(\d+)$/);
  if (episodeLegacy) return `episode-${episodeLegacy[1]}`;
  const episodeRaw = normalized.match(/^episode-(\d+)$/);
  if (episodeRaw) return `episode-${episodeRaw[1]}`;
  return null;
};

const toCanonicalWindowToken = (containerKey: string): string => {
  if (containerKey === "period-preseason") return "w0";
  if (containerKey === "period-postseason") return "w-postseason";
  const episode = containerKey.match(/^episode-(\d+)$/i);
  if (episode) return `e${episode[1]}`;
  return containerKey;
};

const isAbortLikeError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("request timed out") ||
    normalized.includes("request aborted") ||
    normalized.includes("operation was aborted") ||
    normalized.includes("signal is aborted")
  );
};

class RequestCancelledError extends Error {
  constructor() {
    super("Request cancelled.");
    this.name = "RequestCancelledError";
  }
}

class RequestTimeoutError extends Error {
  constructor() {
    super("Request timed out.");
    this.name = "RequestTimeoutError";
  }
}

const isRequestCancelledError = (error: unknown): boolean =>
  error instanceof RequestCancelledError ||
  (error instanceof Error && error.message.toLowerCase() === "request cancelled.");

const isRequestTimeoutError = (error: unknown): boolean =>
  error instanceof RequestTimeoutError ||
  (error instanceof Error && error.message.toLowerCase().includes("request timed out"));

const resolverStageMessage = (stage: ResolverStage): string => {
  switch (stage) {
    case "loading_communities":
      return "Resolving community…";
    case "loading_seasons":
      return "Resolving season…";
    case "loading_windows":
      return "Loading period window…";
    case "loading_cache":
      return "Loading cached posts…";
    case "finalizing":
      return "Finalizing week context…";
    case "init":
    default:
      return "Resolving window context…";
  }
};

const classifyResolverError = (error: unknown): string => {
  if (isRequestTimeoutError(error)) {
    return "Request timed out while resolving window context.";
  }
  const message = error instanceof Error ? error.message : "Failed to resolve window context.";
  const normalized = message.trim().toLowerCase();
  if (normalized.includes("not authenticated")) {
    return "Not authenticated. Sign in again.";
  }
  if (normalized.includes("invalid or missing window key")) {
    return "Invalid or missing window key.";
  }
  if (
    normalized.includes("unable to resolve reddit community") ||
    normalized.includes("community not found")
  ) {
    return "Community not found for this window.";
  }
  return message;
};

async function fetchAdminJsonWithTimeout<T>({
  url,
  method = "GET",
  preferredUser,
  timeoutMs,
  signal,
}: {
  url: string;
  method?: "GET" | "POST";
  preferredUser: unknown;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<{ ok: boolean; status: number; payload: T & { error?: string; detail?: string } }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "AbortError"));
  }, timeoutMs);
  const onAbort = () => {
    controller.abort((signal as AbortSignal & { reason?: unknown })?.reason ?? new DOMException("Request cancelled", "AbortError"));
  };
  if (signal) {
    if (signal.aborted) {
      controller.abort((signal as AbortSignal & { reason?: unknown })?.reason ?? new DOMException("Request cancelled", "AbortError"));
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  try {
    const response = await fetchAdminWithAuth(
      url,
      {
        method,
        signal: controller.signal,
      },
      { preferredUser: preferredUser as never, allowDevAdminBypass: true },
    );
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string; detail?: string };
    return { ok: response.ok, status: response.status, payload };
  } catch (error) {
    if (isAbortLikeError(error)) {
      if (signal?.aborted) throw new RequestCancelledError();
      throw new RequestTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onAbort);
    }
  }
}

function AdminRedditWindowPostsPageContent() {
  const { user, checking, hasAccess } = useAdminGuard();
  const params = useParams<{
    showId?: string;
    seasonNumber?: string;
    communitySlug?: string;
    communityId?: string;
    windowKey?: string;
  }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const canonicalRedirectRef = useRef<string | null>(null);
  const activeResolveAbortRef = useRef<AbortController | null>(null);
  const resolveInFlightRef = useRef(false);
  const activeResolveSignatureRef = useRef<string | null>(null);
  const lastResolvedSignatureRef = useRef<string | null>(null);
  const activeLoadAbortRef = useRef<AbortController | null>(null);

  const [context, setContext] = useState<WindowContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [resolverStage, setResolverStage] = useState<ResolverStage>("init");
  const [contextError, setContextError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryPayload | null>(null);

  const queryWindowKey = searchParams.get("windowKey") ?? searchParams.get("window_key");
  const queryContainerKey = searchParams.get("container_key");
  const queryCommunitySlug = searchParams.get("community_slug") ?? searchParams.get("communitySlug");
  const queryCommunityId = searchParams.get("community_id");
  const querySeasonId = searchParams.get("season_id");
  const querySeason = searchParams.get("season");
  const queryPeriodLabel = searchParams.get("period_label");
  const queryPeriodStart = searchParams.get("period_start");
  const queryPeriodEnd = searchParams.get("period_end");
  const queryShowSlug = searchParams.get("showSlug") ?? searchParams.get("show");

  const resolveSignature = useMemo(
    () =>
      [
        params.showId ?? "",
        params.seasonNumber ?? "",
        params.communitySlug ?? "",
        params.communityId ?? "",
        params.windowKey ?? "",
        queryShowSlug ?? "",
        querySeason ?? "",
        querySeasonId ?? "",
        queryCommunitySlug ?? "",
        queryCommunityId ?? "",
        queryWindowKey ?? "",
        queryContainerKey ?? "",
      ].join("|"),
    [
      params.communityId,
      params.communitySlug,
      params.seasonNumber,
      params.showId,
      params.windowKey,
      queryCommunityId,
      queryCommunitySlug,
      queryContainerKey,
      querySeason,
      querySeasonId,
      queryShowSlug,
      queryWindowKey,
    ],
  );

  const resolveWindowContext = useCallback(async () => {
    if (!user || !hasAccess) return;
    if (context && lastResolvedSignatureRef.current === resolveSignature) return;
    if (resolveInFlightRef.current && activeResolveSignatureRef.current === resolveSignature) return;
    if (activeResolveAbortRef.current && activeResolveSignatureRef.current !== resolveSignature) {
      activeResolveAbortRef.current.abort(new DOMException("Request cancelled", "AbortError"));
      activeResolveAbortRef.current = null;
    }

    const resolveController = new AbortController();
    activeResolveAbortRef.current = resolveController;
    activeResolveSignatureRef.current = resolveSignature;
    resolveInFlightRef.current = true;

    setContextLoading(true);
    setResolverStage("loading_communities");
    setContextError(null);
    setWarning(null);

    try {
      // Parse from pathname as fallback when rendered from the s[seasonNumber]
      // catch-all route where useParams() returns { showId, seasonNumber: "ocial",
      // rest: [...] } instead of { showId, communitySlug, seasonNumber, windowKey }.
      const parsedFromPathname = parseRedditWindowFromPathname(pathname);

      const token = params.windowKey ?? queryWindowKey ?? parsedFromPathname?.windowKey;
      const fallbackContainerKey = queryContainerKey;
      const containerKey =
        resolveContainerKeyFromWindowToken(fallbackContainerKey) ?? resolveContainerKeyFromWindowToken(token);
      if (!containerKey) {
        throw new Error("Invalid or missing window key.");
      }

      const legacyCommunityId = queryCommunityId;
      const pathCommunityId = params.communityId ? decodeURIComponent(params.communityId).trim() : null;
      const legacySeasonId = querySeasonId;
      const legacyPeriodLabel = queryPeriodLabel;
      const legacyPeriodStart = queryPeriodStart;
      const legacyPeriodEnd = queryPeriodEnd;

      const pathCommunitySlug = normalizeCommunitySlug(
        params.communitySlug ?? params.communityId ?? parsedFromPathname?.communitySlug ?? null,
      );
      const queryCommunitySlugNormalized = normalizeCommunitySlug(queryCommunitySlug);
      const communitySlugCandidates = [pathCommunitySlug, queryCommunitySlugNormalized]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());
      const pathShowSlug = (params.showId ?? "").trim() || parsedFromPathname?.showId || null;
      let showSlug = pathShowSlug ?? (queryShowSlug?.trim() || null);
      let seasonNumber = toInt(params.seasonNumber ?? querySeason) ?? parsedFromPathname?.seasonNumber ?? null;

      const communitiesResponse = await fetchAdminJsonWithTimeout<{
        communities?: RedditCommunityListItem[];
        error?: string;
      }>({
        url: "/api/admin/reddit/communities?include_inactive=1&include_assigned_threads=0",
        timeoutMs: 8_000,
        preferredUser: user,
        signal: resolveController.signal,
      });
      if (!communitiesResponse.ok) {
        throw new Error(communitiesResponse.payload.error ?? "Failed to load reddit communities");
      }
      const communities = Array.isArray(communitiesResponse.payload.communities)
        ? communitiesResponse.payload.communities
        : [];

      const selectedCommunity =
        communities.find((community) => community.id === legacyCommunityId) ??
        communities.find((community) => community.id === pathCommunityId) ??
        communities.find((community) => {
          const normalizedSubreddit = normalizeCommunitySlug(community.subreddit)?.toLowerCase() ?? "";
          return normalizedSubreddit.length > 0 && communitySlugCandidates.includes(normalizedSubreddit);
        }) ??
        null;
      if (!selectedCommunity) {
        throw new Error("Unable to resolve reddit community for this window.");
      }

      const communitySlug = normalizeCommunitySlug(selectedCommunity.subreddit) ?? selectedCommunity.subreddit;
      if (!showSlug) {
        showSlug = slugifyShowName(selectedCommunity.trr_show_name);
      }

      setResolverStage("loading_seasons");
      const seasonsResponse = await fetchAdminJsonWithTimeout<{
        seasons?: ShowSeasonOption[];
        error?: string;
      }>({
        url: `/api/admin/trr-api/shows/${selectedCommunity.trr_show_id}/seasons?limit=100&include_episode_signal=true`,
        timeoutMs: 8_000,
        preferredUser: user,
        signal: resolveController.signal,
      });
      if (!seasonsResponse.ok) {
        throw new Error(seasonsResponse.payload.error ?? "Failed to load show seasons");
      }
      const seasons = Array.isArray(seasonsResponse.payload.seasons) ? seasonsResponse.payload.seasons : [];
      if (seasons.length === 0) {
        throw new Error("No seasons found for this show.");
      }

      let resolvedSeason: ShowSeasonOption | null = null;
      if (legacySeasonId) {
        resolvedSeason = seasons.find((season) => season.id === legacySeasonId) ?? null;
      }
      if (!resolvedSeason && seasonNumber) {
        resolvedSeason = seasons.find((season) => season.season_number === seasonNumber) ?? null;
      }
      if (!resolvedSeason) {
        resolvedSeason = [...seasons].sort((a, b) => b.season_number - a.season_number)[0] ?? null;
      }
      if (!resolvedSeason?.id) {
        throw new Error("Unable to resolve season context for this window.");
      }
      seasonNumber = resolvedSeason.season_number;

      let resolvedLabel = legacyPeriodLabel?.trim() || "";
      const resolvedStart = legacyPeriodStart?.trim() || "";
      const resolvedEnd = legacyPeriodEnd?.trim() || "";

      // Analytics is deferred to avoid blocking the backend during discover.
      // The analytics endpoint can take 15-20s on cold cache which blocks the
      // single-worker backend, causing the discover call to 504.  Period dates
      // are backfilled lazily from the discovery payload's window_start/window_end
      // after posts load (see loadWindowPosts backfill logic).
      setResolverStage("finalizing");
      if (!resolvedLabel) {
        resolvedLabel = containerKey === "period-preseason"
          ? "Pre-Season"
          : containerKey === "period-postseason"
            ? "Post-Season"
            : containerKey.replace("episode-", "Episode ");
      }
      setContext({
        communityId: selectedCommunity.id,
        seasonId: resolvedSeason.id,
        seasonNumber: resolvedSeason.season_number,
        showSlug,
        showName: selectedCommunity.trr_show_name,
        communitySlug,
        subreddit: selectedCommunity.subreddit,
        containerKey,
        periodLabel: resolvedLabel,
        periodStart: resolvedStart || null,
        periodEnd: resolvedEnd || null,
        isShowFocused: selectedCommunity.is_show_focused !== false,
        analysisAllFlairs: Array.isArray(selectedCommunity.analysis_all_flairs)
          ? selectedCommunity.analysis_all_flairs
          : [],
      });
      lastResolvedSignatureRef.current = resolveSignature;
    } catch (resolveError) {
      if (isRequestCancelledError(resolveError)) return;
      setContextError(classifyResolverError(resolveError));
      setContext(null);
    } finally {
      if (activeResolveAbortRef.current === resolveController) {
        activeResolveAbortRef.current = null;
      }
      if (activeResolveSignatureRef.current === resolveSignature) {
        activeResolveSignatureRef.current = null;
      }
      resolveInFlightRef.current = false;
      setContextLoading(false);
      setResolverStage("init");
    }
  }, [
    context,
    hasAccess,
    params.communityId,
    params.communitySlug,
    params.seasonNumber,
    params.showId,
    params.windowKey,
    pathname,
    queryCommunityId,
    queryCommunitySlug,
    queryContainerKey,
    queryPeriodEnd,
    queryPeriodLabel,
    queryPeriodStart,
    querySeason,
    querySeasonId,
    queryShowSlug,
    queryWindowKey,
    resolveSignature,
    user,
  ]);

  const loadWindowPosts = useCallback(
    async (refresh: boolean) => {
      if (!user || !hasAccess || !context) return;
      activeLoadAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
      const loadController = new AbortController();
      activeLoadAbortRef.current = loadController;
      setLoading(true);
      setError(null);
      setWarning(null);
      if (!refresh) {
        setResolverStage("loading_cache");
      }
      try {
        const paramsObj = new URLSearchParams({
          season_id: context.seasonId,
          container_key: context.containerKey,
          period_label: context.periodLabel,
          exhaustive: "true",
          search_backfill: "true",
          max_pages: "500",
          coverage_mode: context.containerKey === "period-preseason" ? "adaptive_deep" : "standard",
        });
        if (context.periodStart) {
          paramsObj.set("period_start", context.periodStart);
        }
        if (context.periodEnd) {
          paramsObj.set("period_end", context.periodEnd);
        }
        if (refresh) {
          const isPreOrPostSeason =
            context.containerKey === "period-preseason" || context.containerKey === "period-postseason";
          if (!isPreOrPostSeason && !context.periodStart && !context.periodEnd) {
            throw new Error(
              "Window boundaries are unavailable right now. Open the community season view and sync from the period card.",
            );
          }
          paramsObj.set("refresh", "true");
          paramsObj.set("wait", "true");
          paramsObj.set("mode", "sync_posts");
        }

        const response = await fetchAdminJsonWithTimeout<{
          discovery?: DiscoveryPayload | null;
          warning?: string;
          error?: string;
        }>({
          url: `/api/admin/reddit/communities/${context.communityId}/discover?${paramsObj.toString()}`,
          timeoutMs: 12_000,
          preferredUser: user,
          signal: loadController.signal,
        });
        if (!response.ok) {
          throw new Error(response.payload.error ?? "Failed to load window posts");
        }
        const discoveryPayload = response.payload.discovery ?? null;
        setDiscovery(discoveryPayload);
        setWarning(response.payload.warning ?? null);

        // Backfill period dates from discovery window when context has no dates.
        if (discoveryPayload && (!context.periodStart || !context.periodEnd)) {
          const backfilledStart = discoveryPayload.window_start ?? null;
          const backfilledEnd = discoveryPayload.window_end ?? null;
          if (backfilledStart || backfilledEnd) {
            setContext((prev) =>
              prev
                ? {
                    ...prev,
                    periodStart: prev.periodStart || backfilledStart,
                    periodEnd: prev.periodEnd || backfilledEnd,
                  }
                : prev,
            );
          }
        }
      } catch (loadError) {
        if (isRequestCancelledError(loadError)) return;
        if (isRequestTimeoutError(loadError)) {
          setError("Request timed out while loading cached posts.");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Failed to load window posts");
      } finally {
        if (activeLoadAbortRef.current === loadController) {
          activeLoadAbortRef.current = null;
        }
        setLoading(false);
        if (!refresh) {
          setResolverStage("init");
        }
      }
    },
    [context, hasAccess, user],
  );

  const [detailsSyncing, setDetailsSyncing] = useState(false);

  const syncDetails = useCallback(
    async () => {
      if (!user || !hasAccess || !context) return;
      const isPreOrPostSeason =
        context.containerKey === "period-preseason" || context.containerKey === "period-postseason";
      if (!isPreOrPostSeason && !context.periodStart && !context.periodEnd) {
        setError("Window boundaries are unavailable. Open the community season view and sync from the period card.");
        return;
      }
      setDetailsSyncing(true);
      setError(null);
      try {
        const paramsObj = new URLSearchParams({
          season_id: context.seasonId,
          container_key: context.containerKey,
          period_label: context.periodLabel,
          refresh: "true",
          wait: "true",
          mode: "sync_details",
        });
        if (context.periodStart) {
          paramsObj.set("period_start", context.periodStart);
        }
        if (context.periodEnd) {
          paramsObj.set("period_end", context.periodEnd);
        }
        const response = await fetchAdminJsonWithTimeout<{
          discovery?: DiscoveryPayload | null;
          warning?: string;
          error?: string;
        }>({
          url: `/api/admin/reddit/communities/${context.communityId}/discover?${paramsObj.toString()}`,
          timeoutMs: 180_000,
          preferredUser: user,
        });
        if (!response.ok) {
          throw new Error(response.payload.error ?? "Failed to sync details");
        }
        if (response.payload.discovery) {
          setDiscovery(response.payload.discovery);
        }
        if (response.payload.warning) {
          setWarning(response.payload.warning);
        }
      } catch (syncError) {
        if (isRequestCancelledError(syncError)) return;
        setError(syncError instanceof Error ? syncError.message : "Failed to sync details");
      } finally {
        setDetailsSyncing(false);
      }
    },
    [context, hasAccess, user],
  );

  const [approvingPostIds, setApprovingPostIds] = useState<Set<string>>(new Set());

  const handleSetAdminApproved = useCallback(
    async (redditPostId: string, approved: boolean | null) => {
      if (!context || !user) return;
      setApprovingPostIds((prev) => new Set(prev).add(redditPostId));
      try {
        const headers = await (async () => {
          const token = await user.getIdToken();
          return { Authorization: `Bearer ${token}` };
        })();
        const response = await fetch("/api/admin/reddit/post-matches", {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            community_id: context.communityId,
            season_id: context.seasonId,
            period_key: context.containerKey,
            reddit_post_id: redditPostId,
            admin_approved: approved,
          }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to update approval");
        }
        // Optimistic update on the discovery threads
        setDiscovery((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            threads: prev.threads.map((t) =>
              t.reddit_post_id === redditPostId ? { ...t, admin_approved: approved } : t,
            ),
          };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update post approval");
      } finally {
        setApprovingPostIds((prev) => {
          const next = new Set(prev);
          next.delete(redditPostId);
          return next;
        });
      }
    },
    [context, user],
  );

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    void resolveWindowContext();
  }, [checking, hasAccess, resolveWindowContext, resolveSignature, user]);

  useEffect(
    () => () => {
      activeResolveAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
      activeResolveAbortRef.current = null;
      resolveInFlightRef.current = false;
      activeLoadAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
      activeLoadAbortRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!context || !hasAccess || !user) return;

    const canonicalPath = buildShowRedditCommunityWindowUrl({
      showSlug: context.showSlug,
      communitySlug: context.communitySlug,
      seasonNumber: context.seasonNumber,
      windowKey: toCanonicalWindowToken(context.containerKey),
    });
    if (pathname !== canonicalPath && canonicalRedirectRef.current !== canonicalPath) {
      canonicalRedirectRef.current = canonicalPath;
      router.replace(canonicalPath as Route);
      return;
    }
    void loadWindowPosts(false);
  }, [context, hasAccess, loadWindowPosts, pathname, router, user]);

  const showHref = context ? buildShowAdminUrl({ showSlug: context.showSlug }) : "/shows";
  const seasonHref = context
    ? buildSeasonAdminUrl({
        showSlug: context.showSlug,
        seasonNumber: context.seasonNumber,
      })
    : showHref;
  const redditHref = context
    ? buildShowRedditUrl({
        showSlug: context.showSlug,
        seasonNumber: context.seasonNumber,
      })
    : "/admin/social-media";
  const communityHref = context
    ? buildShowRedditCommunityUrl({
        showSlug: context.showSlug,
        communitySlug: context.communitySlug,
        seasonNumber: context.seasonNumber,
      })
    : redditHref;
  const buildPostDetailsHref = useCallback(
    (postId: string): string | null => {
      if (!context) return null;
      const normalizedPostId = postId.trim();
      if (!normalizedPostId) return null;
      const query = new URLSearchParams();
      query.set("community_id", context.communityId);
      query.set("season_id", context.seasonId);
      return buildShowRedditCommunityWindowPostUrl({
        showSlug: context.showSlug,
        communitySlug: context.communitySlug,
        seasonNumber: context.seasonNumber,
        windowKey: toCanonicalWindowToken(context.containerKey),
        postId: normalizedPostId,
        query,
      });
    },
    [context],
  );

  const breadcrumbs = useMemo(
    () =>
      buildSeasonSocialBreadcrumb(context?.showName ?? "Show", context?.seasonNumber ?? "", {
        showHref,
        seasonHref,
        socialHref: redditHref,
        subTabLabel: "Reddit Analytics",
        subTabHref: communityHref,
      }),
    [communityHref, context?.seasonNumber, context?.showName, redditHref, seasonHref, showHref],
  );

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-600">Loading admin access…</p>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Admin access is required to view window posts.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <SocialAdminPageHeader
        breadcrumbs={breadcrumbs}
        title={context ? `r/${context.subreddit}` : "Reddit Analytics"}
        backHref={showHref}
        backLabel="Back"
        bodyClassName="px-6 py-6"
      />

      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <nav className="flex flex-wrap gap-2 py-4" aria-label="Season tabs">
            {SEASON_TABS.map((tab) => {
              const href = context
                ? buildSeasonAdminUrl({
                    showSlug: context.showSlug,
                    seasonNumber: context.seasonNumber,
                    tab: tab.tab,
                  })
                : null;
              const isActive = tab.tab === "social";
              const classes = `rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`;
              if (!href) {
                return (
                  <span key={tab.tab} className={classes}>
                    {tab.label}
                  </span>
                );
              }
              return (
                <a key={tab.tab} href={href} className={classes}>
                  {tab.label}
                </a>
              );
            })}
          </nav>
          <nav className="flex flex-wrap gap-2 pb-4" aria-label="Social analytics tabs">
            {SOCIAL_TABS.map((tab) => {
              const href =
                context && tab.view === "reddit"
                  ? buildShowRedditUrl({
                      showSlug: context.showSlug,
                      seasonNumber: context.seasonNumber,
                    })
                  : context
                    ? buildSeasonAdminUrl({
                        showSlug: context.showSlug,
                        seasonNumber: context.seasonNumber,
                        tab: "social",
                        socialView: tab.view,
                      })
                    : null;
              const isActive = tab.view === "reddit";
              const classes = `rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${
                isActive
                  ? "border-zinc-800 bg-zinc-800 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`;
              if (!href) {
                return (
                  <span key={tab.view} className={classes}>
                    {tab.label}
                  </span>
                );
              }
              return (
                <a key={tab.view} href={href} className={classes}>
                  {tab.label}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        {contextLoading && (
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
            {resolverStageMessage(resolverStage)}
          </div>
        )}
        {contextError && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            <span>{contextError}</span>
            <button
              type="button"
              onClick={() => void resolveWindowContext()}
              className="rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        {context && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{context.periodLabel}</h2>
                {(context.periodStart || context.periodEnd) ? (
                  <p className="text-sm text-zinc-600">
                    {fmtDateTime(context.periodStart)} to {fmtDateTime(context.periodEnd)}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-400 italic">
                    {context.containerKey === "period-preseason"
                      ? "Before season premiere"
                      : context.containerKey === "period-postseason"
                        ? "After season finale"
                        : "Date range not yet available"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadWindowPosts(true)}
                  disabled={loading || detailsSyncing}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  {loading ? "Syncing…" : "Sync Posts"}
                </button>
                <button
                  type="button"
                  onClick={() => void syncDetails()}
                  disabled={loading || detailsSyncing}
                  aria-label="Sync Details"
                  title="Deep-scrape comment trees, media, and post details for this window"
                  className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                >
                  {detailsSyncing ? "Syncing Details…" : "Sync Details 🕷️"}
                </button>
                <a
                  href={communityHref}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Back to Community
                </a>
              </div>
            </div>

            {warning && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {warning}
              </div>
            )}
            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Window Posts</p>
              <p className="text-xs text-zinc-600">
                {discovery?.totals ? (
                  <>
                    {fmtNum(discovery.totals.tracked_flair_rows)} tracked flair posts · {" "}
                    {fmtNum(discovery.totals.matched_rows)} matched · {fmtNum(discovery.totals.fetched_rows)} fetched
                  </>
                ) : (
                  "No totals available"
                )}
              </p>
            </div>

            {loading && !discovery ? (
              <p className="text-sm text-zinc-500">Loading posts…</p>
            ) : !discovery || discovery.threads.length === 0 ? (
              <p className="text-sm text-zinc-500">No posts found for this window yet.</p>
            ) : context && !context.isShowFocused ? (
              (() => {
                const showFlairSet = new Set(
                  (context.analysisAllFlairs ?? []).map((f) => f.toLowerCase()),
                );
                // Posts with the show's flair (e.g., "Salt Lake City")
                const showFlairPosts = showFlairSet.size > 0
                  ? discovery.threads.filter(
                      (t) => t.link_flair_text && showFlairSet.has(t.link_flair_text.toLowerCase()),
                    )
                  : [];
                const showFlairPostIds = new Set(showFlairPosts.map((t) => t.reddit_post_id));
                // Scan-matched posts (title/text keyword matches, need admin review)
                const scanMatched = discovery.threads.filter(
                  (t) => t.match_type === "scan" && !showFlairPostIds.has(t.reddit_post_id),
                );
                // Other flair-matched posts (matched by non-show flair or match_type=flair but not the show's flair)
                const otherFlairMatched = discovery.threads.filter(
                  (t) =>
                    (t.match_type === "flair" || t.match_type === "all") &&
                    !showFlairPostIds.has(t.reddit_post_id),
                );
                // Everything else (no match_type)
                const untyped = discovery.threads.filter(
                  (t) =>
                    !showFlairPostIds.has(t.reddit_post_id) &&
                    t.match_type !== "scan" &&
                    t.match_type !== "flair" &&
                    t.match_type !== "all",
                );
                const showFlairLabel =
                  context.analysisAllFlairs.length === 1
                    ? context.analysisAllFlairs[0]
                    : context.analysisAllFlairs.join(" / ");
                return (
                  <div className="space-y-4">
                    {showFlairPosts.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
                          {showFlairLabel} ({fmtNum(showFlairPosts.length)})
                        </p>
                        <div className="space-y-2">
                          {showFlairPosts.map((thread) => {
                            const detailsHref = buildPostDetailsHref(thread.reddit_post_id);
                            return (
                            <article key={thread.reddit_post_id} className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                              <a href={thread.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-zinc-900 hover:underline">
                                {thread.title}
                              </a>
                              <p className="mt-1 text-xs text-zinc-600">
                                {fmtDateTime(thread.posted_at)} · {fmtNum(thread.score)} score · {fmtNum(thread.num_comments)} comments
                                {thread.link_flair_text ? ` · flair: ${thread.link_flair_text}` : ""}
                                {thread.upvote_ratio != null ? ` · ${Math.round(thread.upvote_ratio * 100)}% upvoted` : ""}
                                {thread.post_type ? ` · ${thread.post_type}` : ""}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {detailsHref && (
                                  <a
                                    href={detailsHref}
                                    className="rounded border border-indigo-300 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                  >
                                    View Details
                                  </a>
                                )}
                                <a
                                  href={thread.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  Open Post
                                </a>
                              </div>
                              {thread.text && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">{thread.text}</p>}
                            </article>
                          );
                          })}
                        </div>
                      </div>
                    )}
                    {scanMatched.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                          Scan-Matched Posts ({fmtNum(scanMatched.length)})
                        </p>
                        <div className="space-y-2">
                          {scanMatched.map((thread) => {
                            const detailsHref = buildPostDetailsHref(thread.reddit_post_id);
                            return (
                            <article key={thread.reddit_post_id} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <a href={thread.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-zinc-900 hover:underline">
                                    {thread.title}
                                  </a>
                                  <p className="mt-1 text-xs text-zinc-600">
                                    {fmtDateTime(thread.posted_at)} · {fmtNum(thread.score)} score · {fmtNum(thread.num_comments)} comments
                                    {thread.link_flair_text ? ` · flair: ${thread.link_flair_text}` : ""}
                                    {thread.upvote_ratio != null ? ` · ${Math.round(thread.upvote_ratio * 100)}% upvoted` : ""}
                                    {thread.post_type ? ` · ${thread.post_type}` : ""}
                                    {thread.author_flair_text ? ` · author flair: ${thread.author_flair_text}` : ""}
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {detailsHref && (
                                      <a
                                        href={detailsHref}
                                        className="rounded border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                      >
                                        View Details
                                      </a>
                                    )}
                                    <a
                                      href={thread.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                    >
                                      Open Post
                                    </a>
                                  </div>
                                  {thread.text && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">{thread.text}</p>}
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={approvingPostIds.has(thread.reddit_post_id)}
                                    onClick={() => void handleSetAdminApproved(thread.reddit_post_id, thread.admin_approved === true ? null : true)}
                                    className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
                                      thread.admin_approved === true
                                        ? "border-green-400 bg-green-100 text-green-800"
                                        : "border-zinc-300 bg-white text-zinc-600 hover:bg-green-50"
                                    }`}
                                    title={thread.admin_approved === true ? "Approved (click to reset)" : "Approve this post"}
                                  >
                                    {thread.admin_approved === true ? "Approved" : "Approve"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={approvingPostIds.has(thread.reddit_post_id)}
                                    onClick={() => void handleSetAdminApproved(thread.reddit_post_id, thread.admin_approved === false ? null : false)}
                                    className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
                                      thread.admin_approved === false
                                        ? "border-red-400 bg-red-100 text-red-800"
                                        : "border-zinc-300 bg-white text-zinc-600 hover:bg-red-50"
                                    }`}
                                    title={thread.admin_approved === false ? "Rejected (click to reset)" : "Reject this post"}
                                  >
                                    {thread.admin_approved === false ? "Rejected" : "Reject"}
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                          })}
                        </div>
                      </div>
                    )}
                    {otherFlairMatched.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                          Other Flair-Matched Posts ({fmtNum(otherFlairMatched.length)})
                        </p>
                        <div className="space-y-2">
                          {otherFlairMatched.map((thread) => {
                            const detailsHref = buildPostDetailsHref(thread.reddit_post_id);
                            return (
                            <article key={thread.reddit_post_id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                              <a href={thread.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-zinc-900 hover:underline">
                                {thread.title}
                              </a>
                              <p className="mt-1 text-xs text-zinc-600">
                                {fmtDateTime(thread.posted_at)} · {fmtNum(thread.score)} score · {fmtNum(thread.num_comments)} comments
                                {thread.link_flair_text ? ` · flair: ${thread.link_flair_text}` : ""}
                                {thread.upvote_ratio != null ? ` · ${Math.round(thread.upvote_ratio * 100)}% upvoted` : ""}
                                {thread.post_type ? ` · ${thread.post_type}` : ""}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {detailsHref && (
                                  <a
                                    href={detailsHref}
                                    className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                  >
                                    View Details
                                  </a>
                                )}
                                <a
                                  href={thread.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  Open Post
                                </a>
                              </div>
                              {thread.text && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">{thread.text}</p>}
                            </article>
                          );
                          })}
                        </div>
                      </div>
                    )}
                    {untyped.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                          Other Posts ({fmtNum(untyped.length)})
                        </p>
                        <div className="space-y-2">
                          {untyped.map((thread) => {
                            const detailsHref = buildPostDetailsHref(thread.reddit_post_id);
                            return (
                            <article key={thread.reddit_post_id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                              <a href={thread.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-zinc-900 hover:underline">
                                {thread.title}
                              </a>
                              <p className="mt-1 text-xs text-zinc-600">
                                {fmtDateTime(thread.posted_at)} · {fmtNum(thread.score)} score · {fmtNum(thread.num_comments)} comments
                                {thread.link_flair_text ? ` · flair: ${thread.link_flair_text}` : ""}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {detailsHref && (
                                  <a
                                    href={detailsHref}
                                    className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                  >
                                    View Details
                                  </a>
                                )}
                                <a
                                  href={thread.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  Open Post
                                </a>
                              </div>
                              {thread.text && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">{thread.text}</p>}
                            </article>
                          );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="space-y-2">
                {discovery.threads.map((thread) => {
                  const detailsHref = buildPostDetailsHref(thread.reddit_post_id);
                  return (
                  <article key={thread.reddit_post_id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <a
                      href={thread.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-zinc-900 hover:underline"
                    >
                      {thread.title}
                    </a>
                    <p className="mt-1 text-xs text-zinc-600">
                      {fmtDateTime(thread.posted_at)} · {fmtNum(thread.score)} score · {" "}
                      {fmtNum(thread.num_comments)} comments
                      {thread.link_flair_text ? ` · flair: ${thread.link_flair_text}` : ""}
                      {thread.upvote_ratio != null ? ` · ${Math.round(thread.upvote_ratio * 100)}% upvoted` : ""}
                      {thread.post_type ? ` · ${thread.post_type}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {detailsHref && (
                        <a
                          href={detailsHref}
                          className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                        >
                          View Details
                        </a>
                      )}
                      <a
                        href={thread.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                      >
                        Open Post
                      </a>
                    </div>
                    {thread.text && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">{thread.text}</p>}
                  </article>
                );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default function AdminRedditWindowPostsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-500">Loading...</div>}>
      <AdminRedditWindowPostsPageContent />
    </Suspense>
  );
}
