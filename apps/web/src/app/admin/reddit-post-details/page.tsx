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

interface RedditThread {
  id: string;
  source_kind: string;
  trr_season_id: string | null;
  reddit_post_id: string;
  title: string;
  url: string;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string | null;
}

interface RedditPostMatchContext {
  period_key: string;
  period_start: string | null;
  period_end: string | null;
  is_show_match: boolean;
  passes_flair_filter: boolean;
  match_score: number;
  match_type: string | null;
  admin_approved: boolean | null;
  flair_mode: string | null;
  source_sorts: string[];
  matched_terms: string[];
  matched_cast_terms: string[];
  cross_show_terms: string[];
  link_flair_text: string | null;
  canonical_flair_key: string | null;
  created_at: string;
  updated_at: string;
}

interface RedditPostComment {
  reddit_comment_id: string;
  parent_comment_id: string | null;
  author: string | null;
  body: string;
  score: number;
  depth: number;
  created_at_utc: string | null;
  author_flair_text: string | null;
  is_submitter: boolean | null;
  controversiality: number | null;
  ups: number | null;
  downs: number | null;
}

interface RedditPostMedia {
  id: string;
  reddit_comment_id: string | null;
  source_url: string;
  media_type: string | null;
  hosted_url: string | null;
  status: string;
  content_type: string | null;
  size_bytes: number | null;
  error_message: string | null;
  created_at: string;
}

interface RedditPostDetailsPayload {
  reddit_post_id: string;
  subreddit: string;
  title: string;
  text: string | null;
  url: string;
  permalink: string | null;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string | null;
  link_flair_text: string | null;
  canonical_flair_key: string | null;
  upvote_ratio: number | null;
  is_self: boolean | null;
  post_type: string | null;
  thumbnail: string | null;
  content_url: string | null;
  is_nsfw: boolean | null;
  is_spoiler: boolean | null;
  author_flair_text: string | null;
  detail_scraped_at: string | null;
  source_sorts: string[];
  matches: RedditPostMatchContext[];
  comments: RedditPostComment[];
  comment_summary: {
    total_comments: number;
    top_level_comments: number;
    reply_comments: number;
    earliest_comment_at: string | null;
    latest_comment_at: string | null;
  };
  media: RedditPostMedia[];
  media_summary: {
    total_media: number;
    mirrored_media: number;
    pending_media: number;
    failed_media: number;
  };
  assigned_threads: RedditThread[];
}

interface PostContext {
  communityId: string;
  seasonId: string;
  seasonNumber: number;
  showSlug: string;
  showName: string;
  communitySlug: string;
  subreddit: string;
  containerKey: string;
  postId: string;
}

type ResolverStage = "init" | "loading_communities" | "loading_seasons" | "finalizing";

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

const fmtRatio = (value: number | null | undefined): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
};

const fmtBytes = (value: number | null | undefined): string => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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

const parsePostRouteFromPathname = (
  pathname: string,
): {
  showId?: string | null;
  communitySlug?: string | null;
  communityId?: string | null;
  seasonNumber?: number | null;
  windowKey: string | null;
  postId: string | null;
} | null => {
  const showSeasonWindow = pathname.match(
    /^\/([^/]+)\/social\/reddit\/([^/]+)\/s(\d{1,3})\/([^/]+)\/post\/([^/]+)$/,
  );
  if (showSeasonWindow) {
    return {
      showId: decodeURIComponent(showSeasonWindow[1] ?? ""),
      communitySlug: decodeURIComponent(showSeasonWindow[2] ?? ""),
      seasonNumber: Number.parseInt(showSeasonWindow[3] ?? "", 10),
      windowKey: decodeURIComponent(showSeasonWindow[4] ?? ""),
      postId: decodeURIComponent(showSeasonWindow[5] ?? ""),
    };
  }

  const showWindow = pathname.match(/^\/([^/]+)\/social\/reddit\/([^/]+)\/([^/]+)\/post\/([^/]+)$/);
  if (showWindow) {
    return {
      showId: decodeURIComponent(showWindow[1] ?? ""),
      communitySlug: decodeURIComponent(showWindow[2] ?? ""),
      seasonNumber: null,
      windowKey: decodeURIComponent(showWindow[3] ?? ""),
      postId: decodeURIComponent(showWindow[4] ?? ""),
    };
  }

  const showSeasonPrefixWindow = pathname.match(
    /^\/([^/]+)\/s(\d{1,3})\/social\/reddit\/([^/]+)\/([^/]+)\/post\/([^/]+)$/,
  );
  if (showSeasonPrefixWindow) {
    return {
      showId: decodeURIComponent(showSeasonPrefixWindow[1] ?? ""),
      seasonNumber: Number.parseInt(showSeasonPrefixWindow[2] ?? "", 10),
      communitySlug: decodeURIComponent(showSeasonPrefixWindow[3] ?? ""),
      windowKey: decodeURIComponent(showSeasonPrefixWindow[4] ?? ""),
      postId: decodeURIComponent(showSeasonPrefixWindow[5] ?? ""),
    };
  }

  const adminWindow = pathname.match(
    /^\/admin\/social-media\/reddit\/communities\/([^/]+)\/([^/]+)\/post\/([^/]+)$/,
  );
  if (adminWindow) {
    return {
      communityId: decodeURIComponent(adminWindow[1] ?? ""),
      windowKey: decodeURIComponent(adminWindow[2] ?? ""),
      postId: decodeURIComponent(adminWindow[3] ?? ""),
      seasonNumber: null,
    };
  }
  return null;
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
    controller.abort(
      (signal as AbortSignal & { reason?: unknown })?.reason ??
        new DOMException("Request cancelled", "AbortError"),
    );
  };
  if (signal) {
    if (signal.aborted) {
      controller.abort(
        (signal as AbortSignal & { reason?: unknown })?.reason ??
          new DOMException("Request cancelled", "AbortError"),
      );
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
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

const resolverStageMessage = (stage: ResolverStage): string => {
  switch (stage) {
    case "loading_communities":
      return "Resolving community…";
    case "loading_seasons":
      return "Resolving season…";
    case "finalizing":
      return "Finalizing post context…";
    case "init":
    default:
      return "Resolving post context…";
  }
};

function AdminRedditPostDetailsPageContent() {
  const { user, checking, hasAccess } = useAdminGuard();
  const params = useParams<{
    showId?: string;
    seasonNumber?: string;
    communitySlug?: string;
    communityId?: string;
    windowKey?: string;
    postId?: string;
  }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const canonicalRedirectRef = useRef<string | null>(null);
  const activeResolveAbortRef = useRef<AbortController | null>(null);
  const activeLoadAbortRef = useRef<AbortController | null>(null);

  const [context, setContext] = useState<PostContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [resolverStage, setResolverStage] = useState<ResolverStage>("init");
  const [contextError, setContextError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<RedditPostDetailsPayload | null>(null);

  const queryCommunityId = searchParams.get("community_id");
  const querySeasonId = searchParams.get("season_id");
  const querySeason = searchParams.get("season");
  const queryWindowKey = searchParams.get("windowKey") ?? searchParams.get("window_key");
  const queryShowSlug = searchParams.get("showSlug") ?? searchParams.get("show");
  const queryPostId = searchParams.get("post_id");
  const queryCommentsLimit = searchParams.get("comments_limit");

  const resolveWindowContext = useCallback(async () => {
    if (!user || !hasAccess) return;
    activeResolveAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
    const resolveController = new AbortController();
    activeResolveAbortRef.current = resolveController;

    setContextLoading(true);
    setResolverStage("loading_communities");
    setContextError(null);

    try {
      const parsedFromPathname = parsePostRouteFromPathname(pathname);
      const postId = (params.postId ?? queryPostId ?? parsedFromPathname?.postId ?? "").trim();
      if (!postId) throw new Error("Invalid or missing post id.");

      const token = params.windowKey ?? queryWindowKey ?? parsedFromPathname?.windowKey;
      const containerKey = resolveContainerKeyFromWindowToken(token);
      if (!containerKey) throw new Error("Invalid or missing window key.");

      const pathCommunityId = params.communityId ? decodeURIComponent(params.communityId).trim() : null;
      const pathCommunitySlug = normalizeCommunitySlug(
        params.communitySlug ?? parsedFromPathname?.communitySlug ?? null,
      );
      const queryCommunitySlug = normalizeCommunitySlug(searchParams.get("community_slug"));
      const communitySlugCandidates = [pathCommunitySlug, queryCommunitySlug]
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
        communities.find((community) => community.id === queryCommunityId) ??
        communities.find((community) => community.id === pathCommunityId) ??
        communities.find((community) => {
          const normalizedSubreddit = normalizeCommunitySlug(community.subreddit)?.toLowerCase() ?? "";
          return normalizedSubreddit.length > 0 && communitySlugCandidates.includes(normalizedSubreddit);
        }) ??
        null;
      if (!selectedCommunity) {
        throw new Error("Unable to resolve reddit community for this post.");
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
      if (seasons.length === 0) throw new Error("No seasons found for this show.");

      let resolvedSeason: ShowSeasonOption | null = null;
      if (querySeasonId) {
        resolvedSeason = seasons.find((season) => season.id === querySeasonId) ?? null;
      }
      if (!resolvedSeason && seasonNumber) {
        resolvedSeason = seasons.find((season) => season.season_number === seasonNumber) ?? null;
      }
      if (!resolvedSeason) {
        resolvedSeason = [...seasons].sort((a, b) => b.season_number - a.season_number)[0] ?? null;
      }
      if (!resolvedSeason?.id) throw new Error("Unable to resolve season context for this post.");
      seasonNumber = resolvedSeason.season_number;

      setResolverStage("finalizing");
      setContext({
        communityId: selectedCommunity.id,
        seasonId: resolvedSeason.id,
        seasonNumber: resolvedSeason.season_number,
        showSlug,
        showName: selectedCommunity.trr_show_name,
        communitySlug,
        subreddit: selectedCommunity.subreddit,
        containerKey,
        postId,
      });
    } catch (resolveError) {
      if (isRequestCancelledError(resolveError)) return;
      if (isRequestTimeoutError(resolveError)) {
        setContextError("Request timed out while resolving post context.");
      } else {
        setContextError(
          resolveError instanceof Error ? resolveError.message : "Failed to resolve post context.",
        );
      }
      setContext(null);
    } finally {
      if (activeResolveAbortRef.current === resolveController) {
        activeResolveAbortRef.current = null;
      }
      setContextLoading(false);
      setResolverStage("init");
    }
  }, [
    hasAccess,
    params.communityId,
    params.communitySlug,
    params.postId,
    params.seasonNumber,
    params.showId,
    params.windowKey,
    pathname,
    queryCommunityId,
    queryPostId,
    querySeason,
    querySeasonId,
    queryShowSlug,
    queryWindowKey,
    searchParams,
    user,
  ]);

  const loadPostDetails = useCallback(async () => {
    if (!user || !hasAccess || !context) return;
    activeLoadAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
    const loadController = new AbortController();
    activeLoadAbortRef.current = loadController;
    setLoading(true);
    setError(null);
    try {
      const paramsObj = new URLSearchParams({
        season_id: context.seasonId,
      });
      const commentsLimit = toInt(queryCommentsLimit);
      if (commentsLimit) paramsObj.set("comments_limit", String(commentsLimit));
      const response = await fetchAdminJsonWithTimeout<{
        post?: RedditPostDetailsPayload;
        error?: string;
      }>({
        url: `/api/admin/reddit/communities/${context.communityId}/posts/${encodeURIComponent(
          context.postId,
        )}/details?${paramsObj.toString()}`,
        timeoutMs: 20_000,
        preferredUser: user,
        signal: loadController.signal,
      });
      if (!response.ok || !response.payload.post) {
        throw new Error(response.payload.error ?? "Failed to load post details");
      }
      setPost(response.payload.post);
    } catch (loadError) {
      if (isRequestCancelledError(loadError)) return;
      if (isRequestTimeoutError(loadError)) {
        setError("Request timed out while loading post details.");
      } else {
        setError(loadError instanceof Error ? loadError.message : "Failed to load post details");
      }
      setPost(null);
    } finally {
      if (activeLoadAbortRef.current === loadController) activeLoadAbortRef.current = null;
      setLoading(false);
    }
  }, [context, hasAccess, queryCommentsLimit, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    void resolveWindowContext();
  }, [checking, hasAccess, resolveWindowContext, user]);

  useEffect(
    () => () => {
      activeResolveAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
      activeResolveAbortRef.current = null;
      activeLoadAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
      activeLoadAbortRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!context || !hasAccess || !user) return;
    const canonicalPath = buildShowRedditCommunityWindowPostUrl({
      showSlug: context.showSlug,
      communitySlug: context.communitySlug,
      seasonNumber: context.seasonNumber,
      windowKey: toCanonicalWindowToken(context.containerKey),
      postId: context.postId,
    });
    if (pathname !== canonicalPath && canonicalRedirectRef.current !== canonicalPath) {
      canonicalRedirectRef.current = canonicalPath;
      router.replace(canonicalPath as Route);
      return;
    }
    void loadPostDetails();
  }, [context, hasAccess, loadPostDetails, pathname, router, user]);

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
  const windowHref = context
    ? buildShowRedditCommunityWindowUrl({
        showSlug: context.showSlug,
        communitySlug: context.communitySlug,
        seasonNumber: context.seasonNumber,
        windowKey: toCanonicalWindowToken(context.containerKey),
      })
    : communityHref;

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
          Admin access is required to view post details.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <SocialAdminPageHeader
        breadcrumbs={breadcrumbs}
        title={context ? `r/${context.subreddit}` : "Reddit Post Details"}
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
              return href ? (
                <a key={tab.tab} href={href} className={classes}>
                  {tab.label}
                </a>
              ) : (
                <span key={tab.tab} className={classes}>
                  {tab.label}
                </span>
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
              return href ? (
                <a key={tab.view} href={href} className={classes}>
                  {tab.label}
                </a>
              ) : (
                <span key={tab.view} className={classes}>
                  {tab.label}
                </span>
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
                <h2 className="text-xl font-bold text-zinc-900">Post Details</h2>
                <p className="text-sm text-zinc-600">
                  {context.postId} · {context.containerKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadPostDetails()}
                  disabled={loading}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  {loading ? "Refreshing…" : "Refresh"}
                </button>
                <a
                  href={windowHref}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Back to Window
                </a>
              </div>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            {loading && !post ? (
              <p className="text-sm text-zinc-500">Loading post details…</p>
            ) : post ? (
              <div className="space-y-4">
                <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900">{post.title}</h3>
                      <p className="mt-1 text-xs text-zinc-600">
                        {fmtDateTime(post.posted_at)} · u/{post.author ?? "unknown"} · flair {post.link_flair_text ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Score {fmtNum(post.score)} · Comments {fmtNum(post.num_comments)} · Upvoted {fmtRatio(post.upvote_ratio)}
                        {post.post_type ? ` · ${post.post_type}` : ""}
                        {post.is_nsfw ? " · NSFW" : ""}
                        {post.is_spoiler ? " · Spoiler" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                      >
                        Open on Reddit
                      </a>
                    </div>
                  </div>
                  {post.text && <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-700">{post.text}</p>}
                </article>

                <section className="grid gap-4 xl:grid-cols-2">
                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-zinc-900">Thread Assignments</h4>
                    <p className="mb-2 text-xs text-zinc-600">
                      {fmtNum(post.assigned_threads.length)} assigned thread rows
                    </p>
                    {post.assigned_threads.length === 0 ? (
                      <p className="text-sm text-zinc-500">No assigned thread rows.</p>
                    ) : (
                      <div className="space-y-2">
                        {post.assigned_threads.map((thread) => (
                          <div key={thread.id} className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-zinc-900">{thread.title}</span>
                              <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] uppercase tracking-[0.06em] text-zinc-700">
                                {thread.source_kind}
                              </span>
                            </div>
                            <p className="mt-1 text-zinc-600">
                              {fmtDateTime(thread.posted_at)} · score {fmtNum(thread.score)} · comments {fmtNum(thread.num_comments)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>

                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-zinc-900">Match Contexts</h4>
                    <p className="mb-2 text-xs text-zinc-600">
                      {fmtNum(post.matches.length)} period match rows
                    </p>
                    {post.matches.length === 0 ? (
                      <p className="text-sm text-zinc-500">No match rows found.</p>
                    ) : (
                      <div className="space-y-2">
                        {post.matches.map((match) => (
                          <div key={`${match.period_key}-${match.updated_at}`} className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs">
                            <p className="font-semibold text-zinc-900">{match.period_key}</p>
                            <p className="mt-1 text-zinc-600">
                              show_match {match.is_show_match ? "yes" : "no"} · tracked_flair{" "}
                              {match.passes_flair_filter ? "yes" : "no"} · score {fmtNum(match.match_score)}
                            </p>
                            <p className="mt-1 text-zinc-600">
                              type {match.match_type ?? "—"} · mode {match.flair_mode ?? "—"} · admin{" "}
                              {match.admin_approved === null ? "unset" : match.admin_approved ? "approved" : "rejected"}
                            </p>
                            {(match.matched_terms.length > 0 || match.matched_cast_terms.length > 0) && (
                              <p className="mt-1 text-zinc-600">
                                terms {match.matched_terms.join(", ") || "—"} · cast {match.matched_cast_terms.join(", ") || "—"}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-zinc-900">Media</h4>
                    <p className="mb-2 text-xs text-zinc-600">
                      Total {fmtNum(post.media_summary.total_media)} · Mirrored {fmtNum(post.media_summary.mirrored_media)} · Pending{" "}
                      {fmtNum(post.media_summary.pending_media)} · Failed {fmtNum(post.media_summary.failed_media)}
                    </p>
                    {post.media.length === 0 ? (
                      <p className="text-sm text-zinc-500">No media rows.</p>
                    ) : (
                      <div className="space-y-2">
                        {post.media.map((item) => (
                          <div key={item.id} className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-zinc-900">{item.media_type ?? "media"}</span>
                              <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] uppercase tracking-[0.06em] text-zinc-700">
                                {item.status}
                              </span>
                            </div>
                            <p className="mt-1 break-all text-zinc-600">source {item.source_url}</p>
                            {item.hosted_url && (
                              <p className="mt-1 break-all text-zinc-600">
                                hosted <a className="text-zinc-900 underline" href={item.hosted_url} target="_blank" rel="noreferrer">{item.hosted_url}</a>
                              </p>
                            )}
                            <p className="mt-1 text-zinc-600">
                              type {item.content_type ?? "—"} · size {fmtBytes(item.size_bytes)} · created {fmtDateTime(item.created_at)}
                            </p>
                            {item.error_message && <p className="mt-1 text-red-700">{item.error_message}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>

                  <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-zinc-900">Scrape Status</h4>
                    <div className="space-y-1 text-xs text-zinc-700">
                      <p>detail_scraped_at {fmtDateTime(post.detail_scraped_at)}</p>
                      <p>source_sorts {post.source_sorts.length > 0 ? post.source_sorts.join(", ") : "—"}</p>
                      <p>canonical_flair_key {post.canonical_flair_key ?? "—"}</p>
                      <p>author_flair {post.author_flair_text ?? "—"}</p>
                    </div>
                  </article>
                </section>

                <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-zinc-900">Comments</h4>
                  <p className="mb-2 text-xs text-zinc-600">
                    Loaded {fmtNum(post.comments.length)} comments · total {fmtNum(post.comment_summary.total_comments)} · top-level{" "}
                    {fmtNum(post.comment_summary.top_level_comments)} · replies {fmtNum(post.comment_summary.reply_comments)}
                  </p>
                  {post.comments.length === 0 ? (
                    <p className="text-sm text-zinc-500">No comments loaded.</p>
                  ) : (
                    <div className="space-y-2">
                      {post.comments.map((comment) => (
                        <div
                          key={comment.reddit_comment_id}
                          className="rounded border border-zinc-200 bg-white px-3 py-2 text-xs"
                          style={{ marginLeft: `${Math.min(comment.depth, 8) * 12}px` }}
                        >
                          <p className="font-semibold text-zinc-900">
                            u/{comment.author ?? "unknown"} · depth {comment.depth} · score {fmtNum(comment.score)}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-zinc-700">{comment.body || "(empty body)"}</p>
                          <p className="mt-1 text-zinc-500">{fmtDateTime(comment.created_at_utc)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No post details loaded.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default function AdminRedditPostDetailsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-500">Loading...</div>}>
      <AdminRedditPostDetailsPageContent />
    </Suspense>
  );
}
