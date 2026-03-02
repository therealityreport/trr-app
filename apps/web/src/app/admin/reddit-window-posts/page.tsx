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
  buildShowRedditCommunityWindowUrl,
  buildShowRedditUrl,
} from "@/lib/admin/show-admin-routes";

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
}

interface DiscoveryPayload {
  fetched_at: string;
  totals?: {
    fetched_rows: number;
    matched_rows: number;
    tracked_flair_rows: number;
  };
  threads: DiscoveryThread[];
}

interface RedditCommunityListItem {
  id: string;
  trr_show_id: string;
  trr_show_name: string;
  subreddit: string;
}

interface ShowSeasonOption {
  id: string;
  season_number: number;
}

interface SocialWeeklyWindow {
  week_index?: number;
  label?: string;
  start?: string | null;
  end?: string | null;
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

const parseEpisodeFromPeriodLabel = (label: string): number | null => {
  const match = label.match(/\bepisode\s*(\d{1,3})\b/i);
  if (!match) return null;
  const value = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(value) ? value : null;
};

const isPreSeasonLabel = (label: string): boolean => /pre[-\s]?season/i.test(label);
const isPostSeasonLabel = (label: string): boolean => /post[-\s]?season/i.test(label);

const findWindowForContainer = (
  weekly: SocialWeeklyWindow[],
  containerKey: string,
): { label: string; start: string | null; end: string | null } | null => {
  for (const window of weekly) {
    const label = (window.label ?? "").trim();
    if (!label) continue;
    const episodeNumber = parseEpisodeFromPeriodLabel(label);
    if (episodeNumber !== null && containerKey === `episode-${episodeNumber}`) {
      return { label: `Episode ${episodeNumber}`, start: window.start ?? null, end: window.end ?? null };
    }
    if (containerKey === "period-preseason" && isPreSeasonLabel(label)) {
      return { label: "Pre-Season", start: window.start ?? null, end: window.end ?? null };
    }
    if (containerKey === "period-postseason" && isPostSeasonLabel(label)) {
      return { label: "Post-Season", start: window.start ?? null, end: window.end ?? null };
    }
  }
  return null;
};

const parseWeeklyPayload = (payload: unknown): SocialWeeklyWindow[] => {
  if (!payload || typeof payload !== "object") return [];
  const value = (payload as { weekly?: unknown }).weekly;
  return Array.isArray(value) ? (value as SocialWeeklyWindow[]) : [];
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
      { preferredUser: preferredUser as never },
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
      const token = params.windowKey ?? queryWindowKey;
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

      const pathCommunitySlug = normalizeCommunitySlug(params.communitySlug ?? params.communityId ?? null);
      const queryCommunitySlugNormalized = normalizeCommunitySlug(queryCommunitySlug);
      const communitySlugCandidates = [pathCommunitySlug, queryCommunitySlugNormalized]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());
      const pathShowSlug = (params.showId ?? "").trim() || null;
      let showSlug = pathShowSlug ?? (queryShowSlug?.trim() || null);
      let seasonNumber = toInt(params.seasonNumber ?? querySeason);

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
      let resolvedStart = legacyPeriodStart?.trim() || "";
      let resolvedEnd = legacyPeriodEnd?.trim() || "";

      setResolverStage("loading_windows");
      try {
        const analyticsParams = new URLSearchParams({
          source_scope: "bravo",
          timeout_profile: "background",
          season_id: resolvedSeason.id,
        });
        const analyticsResponse = await fetchAdminJsonWithTimeout<{
          weekly?: SocialWeeklyWindow[];
          error?: string;
        }>({
          url: `/api/admin/trr-api/shows/${selectedCommunity.trr_show_id}/seasons/${resolvedSeason.season_number}/social/analytics?${analyticsParams.toString()}`,
          timeoutMs: 6_000,
          preferredUser: user,
          signal: resolveController.signal,
        });
        if (analyticsResponse.ok) {
          const match = findWindowForContainer(parseWeeklyPayload(analyticsResponse.payload), containerKey);
          if (match) {
            resolvedLabel = match.label;
            resolvedStart = match.start ?? "";
            resolvedEnd = match.end ?? "";
          }
        }
      } catch (analyticsError) {
        if (isRequestCancelledError(analyticsError)) throw analyticsError;
      }

      setResolverStage("finalizing");
      if (!resolvedLabel) {
        resolvedLabel = containerKey === "period-preseason"
          ? "Pre-Season"
          : containerKey === "period-postseason"
            ? "Post-Season"
            : containerKey.replace("episode-", "Episode ");
      }
      if (!resolvedStart || !resolvedEnd) {
        setWarning(
          "Season social period data is temporarily unavailable for this window; loading cached posts by container key.",
        );
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
          if (!context.periodStart || !context.periodEnd) {
            throw new Error(
              "Window boundaries are unavailable right now. Open the community season view and refresh from the period card.",
            );
          }
          paramsObj.set("refresh", "true");
          paramsObj.set("wait", "true");
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
        setDiscovery(response.payload.discovery ?? null);
        setWarning(response.payload.warning ?? null);
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
                <p className="text-sm text-zinc-600">
                  {fmtDateTime(context.periodStart)} to {fmtDateTime(context.periodEnd)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadWindowPosts(true)}
                  disabled={loading}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  {loading ? "Refreshing…" : "Refresh Posts"}
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
            ) : (
              <div className="space-y-2">
                {discovery.threads.map((thread) => (
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
                    </p>
                    {thread.text && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">{thread.text}</p>}
                  </article>
                ))}
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
