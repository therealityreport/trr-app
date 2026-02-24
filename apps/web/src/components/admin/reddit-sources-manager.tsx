"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAdminWithAuth, getClientAuthHeaders } from "@/lib/admin/client-auth";

type ManagerMode = "season" | "global";

interface RedditThread {
  id: string;
  community_id: string;
  trr_show_id: string;
  trr_show_name: string;
  trr_season_id: string | null;
  reddit_post_id: string;
  title: string;
  url: string;
  permalink: string | null;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RedditCommunity {
  id: string;
  trr_show_id: string;
  trr_show_name: string;
  subreddit: string;
  display_name: string | null;
  notes: string | null;
  post_flares: string[];
  analysis_flares: string[];
  analysis_all_flares: string[];
  is_show_focused: boolean;
  network_focus_targets: string[];
  franchise_focus_targets: string[];
  episode_title_patterns: string[];
  post_flares_updated_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_thread_count: number;
  assigned_threads: RedditThread[];
}

interface RedditCommunityResponse extends Omit<RedditCommunity, "assigned_thread_count" | "assigned_threads"> {
  assigned_thread_count?: number;
  assigned_threads?: RedditThread[];
}

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
  source_sorts: Array<"new" | "hot" | "top">;
  matched_terms: string[];
  matched_cast_terms: string[];
  cross_show_terms: string[];
  is_show_match: boolean;
  passes_flair_filter: boolean;
  match_score: number;
  suggested_include_terms: string[];
  suggested_exclude_terms: string[];
}

interface DiscoveryPayload {
  subreddit: string;
  fetched_at: string;
  sources_fetched: Array<"new" | "hot" | "top">;
  terms: string[];
  hints: {
    suggested_include_terms: string[];
    suggested_exclude_terms: string[];
  };
  threads: DiscoveryThread[];
}

interface EpisodeDiscussionCandidate {
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
  episode_number: number;
  discussion_type: "live" | "post" | "weekly";
  source_sorts: Array<"new" | "hot" | "top">;
  match_reasons: string[];
}

interface EpisodeDiscussionMatrixCell {
  post_count: number;
  total_comments: number;
  total_upvotes: number;
  top_post_id: string | null;
  top_post_url: string | null;
}

interface EpisodeDiscussionMatrixRow {
  episode_number: number;
  live: EpisodeDiscussionMatrixCell;
  post: EpisodeDiscussionMatrixCell;
  weekly: EpisodeDiscussionMatrixCell;
  total_posts: number;
  total_comments: number;
  total_upvotes: number;
}

interface EpisodeDiscussionRefreshPayload {
  community?: RedditCommunityResponse;
  candidates?: EpisodeDiscussionCandidate[];
  episode_matrix?: EpisodeDiscussionMatrixRow[];
  meta?: {
    fetched_at?: string;
    total_found?: number;
    filters_applied?: Record<string, unknown>;
    effective_episode_title_patterns?: string[];
    effective_required_flares?: string[];
    auto_seeded_required_flares?: boolean;
    successful_sorts?: Array<"new" | "hot" | "top">;
    failed_sorts?: Array<"new" | "hot" | "top">;
    rate_limited_sorts?: Array<"new" | "hot" | "top">;
    season_context?: {
      season_id?: string;
      season_number?: number;
    };
    period_context?: {
      selected_window_start?: string | null;
      selected_window_end?: string | null;
      selected_period_labels?: string[];
    };
  };
  error?: string;
}

interface EpisodeDiscussionSavePayload {
  success?: boolean;
  saved_count?: number;
  skipped_conflicts?: string[];
  error?: string;
}

interface CoveredShow {
  trr_show_id: string;
  show_name: string;
}

interface ShowSeasonOption {
  id: string;
  season_number: number;
  title?: string | null;
  name?: string | null;
  has_scheduled_or_aired_episode?: boolean;
  episode_airdate_count?: number;
}

interface TrrShowMetadata {
  id: string;
  slug: string;
  alternative_names?: string[];
}

export interface RedditCommunityContext {
  communityLabel: string;
  showLabel: string;
  showSlug: string | null;
  seasonLabel: string | null;
  showId: string;
  seasonId: string | null;
  seasonNumber: number | null;
}

interface SocialAnalyticsPeriodRow {
  week_index?: number;
  label?: string;
  start?: string;
  end?: string;
}

interface EpisodePeriodOption {
  key: string;
  label: string;
  start: string;
  end: string;
}

interface CommunityFlaresRefreshResponse {
  community?: RedditCommunityResponse;
  flares?: string[];
  source?: "api" | "listing_fallback" | "none";
  warning?: string | null;
  error?: string;
}

export interface RedditSourcesManagerProps {
  mode: ManagerMode;
  showId?: string;
  showName?: string;
  seasonId?: string | null;
  seasonNumber?: number | null;
  initialCommunityId?: string;
  hideCommunityList?: boolean;
  backHref?: string;
  onCommunityContextChange?: (context: RedditCommunityContext | null) => void;
}

const fmtDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const fmtNum = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

const REQUEST_TIMEOUT_DEFAULT_MS = 60_000;
const REQUEST_TIMEOUT_MS = {
  default: REQUEST_TIMEOUT_DEFAULT_MS,
  communities: 45_000,
  discover: 45_000,
  seasonContext: 75_000,
  episodeRefresh: 90_000,
  episodeSave: 90_000,
} as const;

const toErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message.trim().length > 0 ? err.message : fallback;

const isRedditHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  return (
    host === "reddit.com" ||
    host === "redd.it" ||
    host.endsWith(".reddit.com") ||
    host.endsWith(".redd.it")
  );
};

const normalizeFlairList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const flair = item.trim();
    if (!flair) continue;
    const key = flair.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(flair);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
};

const pushListValue = (list: string[], rawValue: string): string[] => normalizeFlairList([...list, rawValue]);

const toIsoDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const SHOW_ACRONYM_STOP_WORDS = new Set(["the", "of", "and", "&", "a", "an"]);

const resolveShowLabel = (showName: string, alternatives: string[] | null | undefined): string => {
  const alias = (alternatives ?? [])
    .map((value) => value.trim())
    .find((value) => /^[A-Z0-9]{3,}$/.test(value));
  if (alias) return alias;

  const parts = showName
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((part) => part && !SHOW_ACRONYM_STOP_WORDS.has(part));
  if (parts.length === 0) return showName;
  const acronym = parts.map((part) => part[0]).join("").toUpperCase();
  return acronym || showName;
};

const formatDiscussionTypeLabel = (type: "live" | "post" | "weekly"): string => {
  if (type === "live") return "Live";
  if (type === "post") return "Post";
  return "Weekly";
};

const buildPeriodOptions = (weeklyRows: SocialAnalyticsPeriodRow[]): EpisodePeriodOption[] => {
  const weekly = weeklyRows
    .map((row) => {
      const start = toIsoDate(row.start);
      const end = toIsoDate(row.end);
      if (!start || !end) return null;
      return {
        key: `weekly-${row.week_index ?? `${start}-${end}`}`,
        label: row.label?.trim() || `Week ${row.week_index ?? "?"}`,
        start,
        end,
      } satisfies EpisodePeriodOption;
    })
    .filter((row): row is EpisodePeriodOption => Boolean(row))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  if (weekly.length === 0) return [];

  const allStart = weekly[0]?.start;
  const allEnd = weekly[weekly.length - 1]?.end;
  if (!allStart || !allEnd) return weekly;

  return [
    {
      key: "all-periods",
      label: "All Periods",
      start: allStart,
      end: allEnd,
    },
    ...weekly,
  ];
};

const toCommunityModel = (community: RedditCommunityResponse): RedditCommunity => ({
  ...community,
  assigned_thread_count:
    typeof community.assigned_thread_count === "number" && Number.isFinite(community.assigned_thread_count)
      ? community.assigned_thread_count
      : 0,
  assigned_threads: Array.isArray(community.assigned_threads) ? community.assigned_threads : [],
  post_flares: normalizeFlairList(community.post_flares),
  analysis_flares: normalizeFlairList(community.analysis_flares),
  analysis_all_flares: normalizeFlairList(community.analysis_all_flares),
  is_show_focused: community.is_show_focused ?? false,
  network_focus_targets: normalizeFlairList(community.network_focus_targets),
  franchise_focus_targets: normalizeFlairList(community.franchise_focus_targets),
  episode_title_patterns: normalizeFlairList(community.episode_title_patterns),
  post_flares_updated_at: community.post_flares_updated_at ?? null,
});

const sortCommunityList = (list: RedditCommunity[]): RedditCommunity[] =>
  [...list].sort((a, b) => {
    const showDiff = a.trr_show_name.localeCompare(b.trr_show_name);
    if (showDiff !== 0) return showDiff;
    return a.subreddit.localeCompare(b.subreddit, undefined, { sensitivity: "base" });
  });

const parseRedditUrl = (
  value: string,
): { redditPostId: string; canonicalUrl: string; permalink: string | null } | null => {
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase();
    if (!isRedditHost(host)) return null;
    const pathname = parsed.pathname.replace(/\/+$/, "");

    let redditPostId: string | null = null;
    if (host.endsWith("redd.it")) {
      const shortId = pathname.split("/").filter(Boolean)[0];
      if (shortId) redditPostId = shortId;
    } else {
      const commentsMatch = pathname.match(/\/comments\/([a-z0-9]+)(?:\/|$)/i);
      if (commentsMatch?.[1]) {
        redditPostId = commentsMatch[1];
      }
    }

    if (!redditPostId) return null;
    return {
      redditPostId,
      canonicalUrl: parsed.toString(),
      permalink: pathname ? pathname : null,
    };
  } catch {
    return null;
  }
};

export default function RedditSourcesManager({
  mode,
  showId,
  showName,
  seasonId,
  seasonNumber,
  initialCommunityId,
  hideCommunityList = false,
  backHref,
  onCommunityContextChange,
}: RedditSourcesManagerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [communities, setCommunities] = useState<RedditCommunity[]>([]);
  const [coveredShows, setCoveredShows] = useState<CoveredShow[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    initialCommunityId ?? null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [refreshingFlaresCommunityId, setRefreshingFlaresCommunityId] = useState<string | null>(null);

  const [showCommunityForm, setShowCommunityForm] = useState(false);
  const [showThreadForm, setShowThreadForm] = useState(false);

  const [communitySubreddit, setCommunitySubreddit] = useState("");
  const [communityDisplayName, setCommunityDisplayName] = useState("");
  const [communityNotes, setCommunityNotes] = useState("");
  const [communityShowId, setCommunityShowId] = useState(showId ?? "");
  const [communityShowName, setCommunityShowName] = useState(showName ?? "");
  const [communityIsShowFocused, setCommunityIsShowFocused] = useState(mode === "season");
  const [communityNetworkTargets, setCommunityNetworkTargets] = useState<string[]>([]);
  const [communityFranchiseTargets, setCommunityFranchiseTargets] = useState<string[]>([]);
  const [communityNetworkTargetInput, setCommunityNetworkTargetInput] = useState("");
  const [communityFranchiseTargetInput, setCommunityFranchiseTargetInput] = useState("");

  const [threadTitle, setThreadTitle] = useState("");
  const [threadUrl, setThreadUrl] = useState("");
  const [threadNotes, setThreadNotes] = useState("");
  const [assignThreadToSeason, setAssignThreadToSeason] = useState(mode === "season");

  const [discovery, setDiscovery] = useState<DiscoveryPayload | null>(null);
  const [showOnlyMatches, setShowOnlyMatches] = useState(true);
  const [selectedNetworkTargetInput, setSelectedNetworkTargetInput] = useState("");
  const [selectedFranchiseTargetInput, setSelectedFranchiseTargetInput] = useState("");
  const [episodePatternInput, setEpisodePatternInput] = useState("");
  const [seasonOptions, setSeasonOptions] = useState<ShowSeasonOption[]>([]);
  const [episodeSeasonId, setEpisodeSeasonId] = useState<string | null>(seasonId ?? null);
  const [periodOptions, setPeriodOptions] = useState<EpisodePeriodOption[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>("all-periods");
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [episodeContextWarning, setEpisodeContextWarning] = useState<string | null>(null);
  const [episodeMatrix, setEpisodeMatrix] = useState<EpisodeDiscussionMatrixRow[]>([]);
  const [episodeCandidates, setEpisodeCandidates] = useState<EpisodeDiscussionCandidate[]>([]);
  const [episodeSelectedPostIds, setEpisodeSelectedPostIds] = useState<string[]>([]);
  const [episodeRefreshing, setEpisodeRefreshing] = useState(false);
  const [episodeSaving, setEpisodeSaving] = useState(false);
  const [showCommunitySettingsModal, setShowCommunitySettingsModal] = useState(false);
  const [selectedShowLabel, setSelectedShowLabel] = useState<string | null>(null);
  const [selectedShowSlug, setSelectedShowSlug] = useState<string | null>(null);
  const [episodeMeta, setEpisodeMeta] = useState<EpisodeDiscussionRefreshPayload["meta"] | null>(
    null,
  );
  const isBusy = busyAction !== null;
  const seasonOptionsCacheRef = useRef<Map<string, ShowSeasonOption[]>>(new Map());
  const periodOptionsCacheRef = useRef<Map<string, EpisodePeriodOption[]>>(new Map());
  const showMetadataCacheRef = useRef<Map<string, { showLabel: string; showSlug: string | null }>>(
    new Map(),
  );
  const episodeContextRequestTokenRef = useRef(0);
  const episodeContextAbortRef = useRef<AbortController | null>(null);

  const getAuthHeaders = useCallback(async () => getClientAuthHeaders(), []);

  const fetchWithTimeout = useCallback(
    async (
      input: RequestInfo | URL,
      init?: RequestInit & { timeoutMs?: number },
    ): Promise<Response> => {
      const { timeoutMs, ...requestInit } = init ?? {};
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        timeoutMs ?? REQUEST_TIMEOUT_MS.default,
      );
      const upstreamSignal = requestInit.signal;
      const abortFromUpstream = () => controller.abort();
      if (upstreamSignal) {
        if (upstreamSignal.aborted) {
          controller.abort();
        } else {
          upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
        }
      }
      try {
        return await fetchAdminWithAuth(input, { ...requestInit, signal: controller.signal });
      } catch (err) {
        if ((err as { name?: string } | null)?.name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }
        throw err;
      } finally {
        if (upstreamSignal) {
          upstreamSignal.removeEventListener("abort", abortFromUpstream);
        }
        clearTimeout(timeout);
      }
    },
    [],
  );

  const mergeCommunityPatch = useCallback(
    (communityId: string, patch: Partial<RedditCommunity>) => {
      setCommunities((prev) =>
        sortCommunityList(
          prev.map((community) =>
            community.id === communityId
              ? {
                  ...community,
                  ...patch,
                  assigned_threads: patch.assigned_threads ?? community.assigned_threads,
                  assigned_thread_count: patch.assigned_thread_count ?? community.assigned_thread_count,
                  post_flares: patch.post_flares ?? community.post_flares,
                  analysis_flares: patch.analysis_flares ?? community.analysis_flares,
                  analysis_all_flares: patch.analysis_all_flares ?? community.analysis_all_flares,
                  is_show_focused: patch.is_show_focused ?? community.is_show_focused,
                  network_focus_targets:
                    patch.network_focus_targets ?? community.network_focus_targets,
                  franchise_focus_targets:
                    patch.franchise_focus_targets ?? community.franchise_focus_targets,
                  episode_title_patterns:
                    patch.episode_title_patterns ?? community.episode_title_patterns,
                  post_flares_updated_at: patch.post_flares_updated_at ?? community.post_flares_updated_at,
                }
              : community,
          ),
        ),
      );
    },
    [],
  );

  const refreshCommunityFlares = useCallback(
    async (communityId: string) => {
      setRefreshingFlaresCommunityId(communityId);
      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(`/api/admin/reddit/communities/${communityId}/flares/refresh`, {
          method: "POST",
          headers,
        });

        const payload = (await response.json().catch(() => ({}))) as CommunityFlaresRefreshResponse;
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to refresh community post flares");
        }

        if (payload.community) {
          const next = toCommunityModel(payload.community);
          mergeCommunityPatch(communityId, {
            post_flares: next.post_flares,
            post_flares_updated_at: next.post_flares_updated_at,
          });
          return;
        }

        if (Array.isArray(payload.flares)) {
          mergeCommunityPatch(communityId, {
            post_flares: normalizeFlairList(payload.flares),
            post_flares_updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn("[reddit] Failed to refresh community post flares", err);
      } finally {
        setRefreshingFlaresCommunityId((current) => (current === communityId ? null : current));
      }
    },
    [fetchWithTimeout, getAuthHeaders, mergeCommunityPatch],
  );

  const fetchCoveredShows = useCallback(async () => {
    if (mode !== "global") return;
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout("/api/admin/covered-shows", {
      headers,
      cache: "no-store",
      timeoutMs: REQUEST_TIMEOUT_MS.communities,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch covered shows");
    }
    const payload = (await response.json()) as { shows?: CoveredShow[] };
    const shows = payload.shows ?? [];
    setCoveredShows(shows);
    if (!communityShowId && shows.length > 0) {
      setCommunityShowId(shows[0].trr_show_id);
      setCommunityShowName(shows[0].show_name);
    }
  }, [communityShowId, fetchWithTimeout, getAuthHeaders, mode]);

  const fetchCommunities = useCallback(async () => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (mode === "season") {
      if (showId) params.set("trr_show_id", showId);
      if (seasonId) params.set("trr_season_id", seasonId);
      params.set("include_global_threads_for_season", "true");
    }
    const qs = params.toString();
    const response = await fetchWithTimeout(`/api/admin/reddit/communities${qs ? `?${qs}` : ""}`, {
      headers,
      cache: "no-store",
      timeoutMs: REQUEST_TIMEOUT_MS.communities,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Failed to fetch reddit communities");
    }
    const payload = (await response.json()) as { communities?: RedditCommunityResponse[] };
    const list = sortCommunityList((payload.communities ?? []).map(toCommunityModel));
    setCommunities(list);
    setSelectedCommunityId((prev) => {
      if (initialCommunityId && list.some((community) => community.id === initialCommunityId)) {
        return initialCommunityId;
      }
      if (prev && list.some((community) => community.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, [fetchWithTimeout, getAuthHeaders, initialCommunityId, mode, seasonId, showId]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchCommunities(), fetchCoveredShows()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reddit sources");
    } finally {
      setLoading(false);
    }
  }, [fetchCommunities, fetchCoveredShows]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    setSelectedNetworkTargetInput("");
    setSelectedFranchiseTargetInput("");
    setEpisodePatternInput("");
    setEpisodeCandidates([]);
    setEpisodeSelectedPostIds([]);
    setEpisodeMeta(null);
    setSeasonOptions([]);
    setPeriodOptions([]);
    setSelectedPeriodKey("all-periods");
    setEpisodeSeasonId(null);
    setEpisodeContextWarning(null);
    setEpisodeMatrix([]);
    setShowCommunitySettingsModal(false);
    setSelectedShowLabel(null);
    setSelectedShowSlug(null);
  }, [selectedCommunityId]);

  const selectedCommunity = useMemo(
    () => communities.find((community) => community.id === selectedCommunityId) ?? null,
    [communities, selectedCommunityId],
  );

  useEffect(() => {
    if (!showCommunitySettingsModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCommunitySettingsModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showCommunitySettingsModal]);

  const selectedPeriod = useMemo(
    () => periodOptions.find((option) => option.key === selectedPeriodKey) ?? periodOptions[0] ?? null,
    [periodOptions, selectedPeriodKey],
  );

  const selectedSeasonNumber = useMemo(() => {
    const fromOption = seasonOptions.find((season) => season.id === episodeSeasonId)?.season_number;
    if (typeof fromOption === "number" && Number.isFinite(fromOption)) {
      return fromOption;
    }
    const fromMeta = episodeMeta?.season_context?.season_number;
    if (typeof fromMeta === "number" && Number.isFinite(fromMeta)) {
      return fromMeta;
    }
    return null;
  }, [episodeMeta?.season_context?.season_number, episodeSeasonId, seasonOptions]);

  const isEpisodeContextRequestActive = useCallback(
    (requestToken: number, signal?: AbortSignal) =>
      episodeContextRequestTokenRef.current === requestToken && !signal?.aborted,
    [],
  );

  const loadPeriodOptionsForSeason = useCallback(
    async (
      community: RedditCommunity,
      season: ShowSeasonOption,
      options?: { signal?: AbortSignal; requestToken?: number },
    ) => {
      const requestToken = options?.requestToken ?? episodeContextRequestTokenRef.current;
      const periodCacheKey = `${community.trr_show_id}:${season.id}`;
      const cachedPeriods = periodOptionsCacheRef.current.get(periodCacheKey);
      if (cachedPeriods) {
        if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
          setPeriodOptions(cachedPeriods);
          setSelectedPeriodKey("all-periods");
        }
        return;
      }

      const headers = await getAuthHeaders();
      const analyticsParams = new URLSearchParams();
      analyticsParams.set("season_id", season.id);
      const analyticsResponse = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${community.trr_show_id}/seasons/${season.season_number}/social/analytics?${analyticsParams.toString()}`,
        {
          headers,
          cache: "no-store",
          signal: options?.signal,
          timeoutMs: REQUEST_TIMEOUT_MS.seasonContext,
        },
      );
      if (!analyticsResponse.ok) {
        throw new Error("Failed to load social periods for episode discussions");
      }
      const analyticsPayload = (await analyticsResponse.json().catch(() => ({}))) as {
        weekly?: SocialAnalyticsPeriodRow[];
        summary?: {
          window?: {
            start?: string | null;
            end?: string | null;
          };
        };
        window?: {
          start?: string | null;
          end?: string | null;
        };
      };

      const periods = buildPeriodOptions(Array.isArray(analyticsPayload.weekly) ? analyticsPayload.weekly : []);
      if (periods.length > 0) {
        periodOptionsCacheRef.current.set(periodCacheKey, periods);
        if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
          setPeriodOptions(periods);
          setSelectedPeriodKey("all-periods");
        }
        return;
      }

      const fallbackStart =
        analyticsPayload.summary?.window?.start ?? analyticsPayload.window?.start ?? null;
      const fallbackEnd =
        analyticsPayload.summary?.window?.end ?? analyticsPayload.window?.end ?? null;
      const fallbackStartIso = toIsoDate(fallbackStart);
      const fallbackEndIso = toIsoDate(fallbackEnd);
      if (fallbackStartIso && fallbackEndIso) {
        const fallbackPeriods: EpisodePeriodOption[] = [
          {
            key: "all-periods",
            label: "All Periods",
            start: fallbackStartIso,
            end: fallbackEndIso,
          },
        ];
        periodOptionsCacheRef.current.set(periodCacheKey, fallbackPeriods);
        if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
          setPeriodOptions(fallbackPeriods);
          setSelectedPeriodKey("all-periods");
        }
      } else {
        periodOptionsCacheRef.current.set(periodCacheKey, []);
        if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
          setPeriodOptions([]);
        }
      }
    },
    [fetchWithTimeout, getAuthHeaders, isEpisodeContextRequestActive],
  );

  const loadShowMetadataForCommunity = useCallback(
    async (
      community: RedditCommunity,
      options?: { signal?: AbortSignal; requestToken?: number },
    ): Promise<{ showLabel: string; showSlug: string | null }> => {
      const cached = showMetadataCacheRef.current.get(community.trr_show_id);
      if (cached) {
        if (isEpisodeContextRequestActive(options?.requestToken ?? 0, options?.signal)) {
          setSelectedShowLabel(cached.showLabel);
          setSelectedShowSlug(cached.showSlug);
        }
        return cached;
      }

      let fallback = {
        showLabel: resolveShowLabel(community.trr_show_name, []),
        showSlug: null as string | null,
      };
      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(`/api/admin/trr-api/shows/${community.trr_show_id}`, {
          headers,
          cache: "no-store",
          signal: options?.signal,
          timeoutMs: REQUEST_TIMEOUT_MS.seasonContext,
        });
        if (response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            show?: TrrShowMetadata;
          };
          const show = payload.show;
          if (show?.id) {
            fallback = {
              showLabel: resolveShowLabel(community.trr_show_name, show.alternative_names),
              showSlug: typeof show.slug === "string" && show.slug.trim().length > 0 ? show.slug : null,
            };
          }
        }
      } catch {
        // Fallback label is acceptable when show metadata fetch fails.
      }

      showMetadataCacheRef.current.set(community.trr_show_id, fallback);
      if (isEpisodeContextRequestActive(options?.requestToken ?? 0, options?.signal)) {
        setSelectedShowLabel(fallback.showLabel);
        setSelectedShowSlug(fallback.showSlug);
      }
      return fallback;
    },
    [fetchWithTimeout, getAuthHeaders, isEpisodeContextRequestActive],
  );

  const loadSeasonAndPeriodContext = useCallback(
    async (community: RedditCommunity, options?: { signal?: AbortSignal; requestToken?: number }) => {
      const requestToken = options?.requestToken ?? episodeContextRequestTokenRef.current;
      setPeriodsLoading(true);
      setEpisodeContextWarning(null);
      try {
        await loadShowMetadataForCommunity(community, { ...options, requestToken });
        const seasonCacheKey = community.trr_show_id;
        let seasons = seasonOptionsCacheRef.current.get(seasonCacheKey) ?? null;
        if (!seasons) {
          const headers = await getAuthHeaders();
          const seasonsResponse = await fetchWithTimeout(
            `/api/admin/trr-api/shows/${community.trr_show_id}/seasons?limit=100&include_episode_signal=true`,
            {
              headers,
              cache: "no-store",
              signal: options?.signal,
              timeoutMs: REQUEST_TIMEOUT_MS.seasonContext,
            },
          );
          if (!seasonsResponse.ok) {
            throw new Error("Failed to load seasons for episode discussions");
          }
          const seasonsPayload = (await seasonsResponse.json().catch(() => ({}))) as {
            seasons?: ShowSeasonOption[];
          };
          seasons = Array.isArray(seasonsPayload.seasons)
            ? [...seasonsPayload.seasons]
                .filter(
                  (season): season is ShowSeasonOption =>
                    Boolean(season?.id) &&
                    typeof season.season_number === "number" &&
                    Number.isFinite(season.season_number),
                )
                .sort((a, b) => b.season_number - a.season_number)
            : [];
          seasonOptionsCacheRef.current.set(seasonCacheKey, seasons);
        }
        if (!isEpisodeContextRequestActive(requestToken, options?.signal)) {
          return;
        }
        setSeasonOptions(seasons ?? []);
        if (seasons.length === 0) {
          throw new Error("No seasons found for this show");
        }

        const explicitSeason =
          (seasonId ? seasons.find((season) => season.id === seasonId) : null) ??
          (seasonNumber
            ? seasons.find((season) => season.season_number === seasonNumber)
            : null);
        const resolvedSeason =
          explicitSeason ??
          seasons.find((season) => season.has_scheduled_or_aired_episode === true) ??
          seasons[0];
        if (!resolvedSeason) {
          throw new Error("No season could be resolved for this community");
        }

        if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
          setEpisodeSeasonId(resolvedSeason.id);
        }
        await loadPeriodOptionsForSeason(community, resolvedSeason, options);
      } finally {
        if (isEpisodeContextRequestActive(requestToken, options?.signal)) {
          setPeriodsLoading(false);
        }
      }
    },
    [
      fetchWithTimeout,
      getAuthHeaders,
      isEpisodeContextRequestActive,
      loadShowMetadataForCommunity,
      loadPeriodOptionsForSeason,
      seasonId,
      seasonNumber,
    ],
  );

  useEffect(() => {
    if (!selectedCommunity) return;
    const requestToken = episodeContextRequestTokenRef.current + 1;
    episodeContextRequestTokenRef.current = requestToken;
    episodeContextAbortRef.current?.abort();
    const controller = new AbortController();
    episodeContextAbortRef.current = controller;
    void (async () => {
      try {
        await loadSeasonAndPeriodContext(selectedCommunity, {
          signal: controller.signal,
          requestToken,
        });
      } catch (err) {
        if (
          !controller.signal.aborted &&
          episodeContextRequestTokenRef.current === requestToken
        ) {
          setEpisodeContextWarning(
            toErrorMessage(
              err,
              "Failed to load season context. Refresh can still run with latest season/all periods.",
            ),
          );
        }
      }
    })();
    return () => {
      controller.abort();
      if (episodeContextAbortRef.current === controller) {
        episodeContextAbortRef.current = null;
      }
    };
  }, [loadSeasonAndPeriodContext, selectedCommunity]);

  const returnToValue = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const communityViewHref = useMemo(() => {
    if (!selectedCommunity || hideCommunityList) return null;
    const params = new URLSearchParams();
    if (mode === "season" && returnToValue) {
      params.set("return_to", returnToValue);
    }

    const qs = params.toString();
    return `/admin/social-media/reddit/communities/${selectedCommunity.id}${qs ? `?${qs}` : ""}`;
  }, [hideCommunityList, mode, returnToValue, selectedCommunity]);

  useEffect(() => {
    if (!onCommunityContextChange) return;
    if (!selectedCommunity) {
      onCommunityContextChange(null);
      return;
    }
    onCommunityContextChange({
      communityLabel: `r/${selectedCommunity.subreddit}`,
      showLabel: selectedShowLabel ?? resolveShowLabel(selectedCommunity.trr_show_name, []),
      showSlug: selectedShowSlug,
      seasonLabel:
        typeof selectedSeasonNumber === "number" && selectedSeasonNumber > 0
          ? `S${selectedSeasonNumber}`
          : null,
      showId: selectedCommunity.trr_show_id,
      seasonId: episodeSeasonId,
      seasonNumber: selectedSeasonNumber,
    });
  }, [
    onCommunityContextChange,
    selectedCommunity,
    selectedSeasonNumber,
    episodeSeasonId,
    selectedShowLabel,
    selectedShowSlug,
  ]);

  const persistAnalysisFlareModes = useCallback(
    async (
      communityId: string,
      payload: { analysisFlares: string[]; analysisAllFlares: string[] },
    ) => {
      const previous = communities.find((community) => community.id === communityId);
      if (!previous) return;

      const nextScan = normalizeFlairList(payload.analysisFlares);
      const nextAll = normalizeFlairList(payload.analysisAllFlares);
      mergeCommunityPatch(communityId, {
        analysis_flares: nextScan,
        analysis_all_flares: nextAll,
      });
      setBusyAction("save-analysis-flares");
      setBusyLabel("Saving analysis flares...");
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(`/api/admin/reddit/communities/${communityId}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            analysis_flares: nextScan,
            analysis_all_flares: nextAll,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          community?: RedditCommunityResponse;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to save analysis flares");
        }
        if (payload.community) {
          mergeCommunityPatch(communityId, {
            analysis_flares: toCommunityModel(payload.community).analysis_flares,
            analysis_all_flares: toCommunityModel(payload.community).analysis_all_flares,
          });
        }
      } catch (err) {
        mergeCommunityPatch(communityId, {
          analysis_flares: previous.analysis_flares,
          analysis_all_flares: previous.analysis_all_flares,
        });
        setError(err instanceof Error ? err.message : "Failed to save analysis flares");
      } finally {
        setBusyAction(null);
        setBusyLabel(null);
      }
    },
    [communities, fetchWithTimeout, getAuthHeaders, mergeCommunityPatch],
  );

  const persistCommunityFocus = useCallback(
    async (
      communityId: string,
      payload: {
        isShowFocused: boolean;
        networkFocusTargets: string[];
        franchiseFocusTargets: string[];
      },
    ) => {
      const previous = communities.find((community) => community.id === communityId);
      if (!previous) return;

      const nextFocus = {
        is_show_focused: payload.isShowFocused,
        network_focus_targets: payload.isShowFocused
          ? []
          : normalizeFlairList(payload.networkFocusTargets),
        franchise_focus_targets: payload.isShowFocused
          ? []
          : normalizeFlairList(payload.franchiseFocusTargets),
      };

      mergeCommunityPatch(communityId, nextFocus);
      setBusyAction("save-community-focus");
      setBusyLabel("Saving community focus...");
      setError(null);

      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(`/api/admin/reddit/communities/${communityId}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            is_show_focused: nextFocus.is_show_focused,
            network_focus_targets: nextFocus.network_focus_targets,
            franchise_focus_targets: nextFocus.franchise_focus_targets,
          }),
        });
        const payloadBody = (await response.json().catch(() => ({}))) as {
          error?: string;
          community?: RedditCommunityResponse;
        };
        if (!response.ok) {
          throw new Error(payloadBody.error ?? "Failed to save community focus");
        }
        if (payloadBody.community) {
          const nextCommunity = toCommunityModel(payloadBody.community);
          mergeCommunityPatch(communityId, {
            is_show_focused: nextCommunity.is_show_focused,
            network_focus_targets: nextCommunity.network_focus_targets,
            franchise_focus_targets: nextCommunity.franchise_focus_targets,
          });
        }
      } catch (err) {
        mergeCommunityPatch(communityId, {
          is_show_focused: previous.is_show_focused,
          network_focus_targets: previous.network_focus_targets,
          franchise_focus_targets: previous.franchise_focus_targets,
        });
        setError(err instanceof Error ? err.message : "Failed to save community focus");
      } finally {
        setBusyAction(null);
        setBusyLabel(null);
      }
    },
    [communities, fetchWithTimeout, getAuthHeaders, mergeCommunityPatch],
  );

  const persistEpisodeRules = useCallback(
    async (
      communityId: string,
      payload: { episodeTitlePatterns: string[] },
    ) => {
      const previous = communities.find((community) => community.id === communityId);
      if (!previous) return;

      const nextEpisodeTitlePatterns = normalizeFlairList(payload.episodeTitlePatterns);
      mergeCommunityPatch(communityId, {
        episode_title_patterns: nextEpisodeTitlePatterns,
      });
      setBusyAction("save-episode-rules");
      setBusyLabel("Saving episode discussion rules...");
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithTimeout(`/api/admin/reddit/communities/${communityId}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            episode_title_patterns: nextEpisodeTitlePatterns,
          }),
        });
        const payloadBody = (await response.json().catch(() => ({}))) as {
          error?: string;
          community?: RedditCommunityResponse;
        };
        if (!response.ok) {
          throw new Error(payloadBody.error ?? "Failed to save episode discussion rules");
        }
        if (payloadBody.community) {
          const nextCommunity = toCommunityModel(payloadBody.community);
          mergeCommunityPatch(communityId, {
            episode_title_patterns: nextCommunity.episode_title_patterns,
          });
        }
      } catch (err) {
        mergeCommunityPatch(communityId, {
          episode_title_patterns: previous.episode_title_patterns,
        });
        setError(err instanceof Error ? err.message : "Failed to save episode discussion rules");
      } finally {
        setBusyAction(null);
        setBusyLabel(null);
      }
    },
    [communities, fetchWithTimeout, getAuthHeaders, mergeCommunityPatch],
  );

  const groupedCommunities = useMemo(() => {
    const grouped = new Map<string, RedditCommunity[]>();
    for (const community of communities) {
      const key = community.trr_show_name || "Unknown Show";
      const list = grouped.get(key) ?? [];
      list.push(community);
      grouped.set(key, list);
    }
    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [communities]);

  const visibleDiscoveryThreads = useMemo(() => {
    const items = discovery?.threads ?? [];
    if (selectedCommunity?.is_show_focused) return items;
    if (!showOnlyMatches) return items;
    const hasAllPostsFlairMode = (selectedCommunity?.analysis_all_flares.length ?? 0) > 0;
    if (!hasAllPostsFlairMode) {
      return items.filter((thread) => thread.is_show_match);
    }
    return items.filter(
      (thread) => thread.is_show_match || Boolean(thread.passes_flair_filter),
    );
  }, [discovery, selectedCommunity, showOnlyMatches]);

  const networkFocusSuggestions = useMemo(() => {
    const values = communities.flatMap((community) => community.network_focus_targets);
    return normalizeFlairList(["Bravo", ...values]);
  }, [communities]);

  const franchiseFocusSuggestions = useMemo(() => {
    const values = communities.flatMap((community) => community.franchise_focus_targets);
    return normalizeFlairList(["Real Housewives", ...values]);
  }, [communities]);

  const episodePatternSuggestions = useMemo(() => {
    const values = communities.flatMap((community) => community.episode_title_patterns);
    return normalizeFlairList([
      "Live Episode Discussion",
      "Post Episode Discussion",
      "Weekly Episode Discussion",
      ...values,
    ]);
  }, [communities]);

  const communityGroups = useMemo<Array<[string, RedditCommunity[]]>>(
    () => (mode === "global" ? groupedCommunities : [[showName ?? "Show", communities]]),
    [communities, groupedCommunities, mode, showName],
  );

  const resetCommunityForm = () => {
    setCommunitySubreddit("");
    setCommunityDisplayName("");
    setCommunityNotes("");
    setCommunityIsShowFocused(mode === "season");
    setCommunityNetworkTargets([]);
    setCommunityFranchiseTargets([]);
    setCommunityNetworkTargetInput("");
    setCommunityFranchiseTargetInput("");
    if (mode === "season") {
      setCommunityShowId(showId ?? "");
      setCommunityShowName(showName ?? "");
    }
  };

  const resetThreadForm = () => {
    setThreadTitle("");
    setThreadUrl("");
    setThreadNotes("");
    setAssignThreadToSeason(mode === "season");
  };

  const handleCreateCommunity = async (event: React.FormEvent) => {
    event.preventDefault();
    const effectiveShowId = mode === "season" ? showId : communityShowId;
    const effectiveShowName = mode === "season" ? showName : communityShowName;
    if (!effectiveShowId || !effectiveShowName) {
      setError("Show is required before creating a community");
      return;
    }

    setBusyAction("create-community");
    setBusyLabel("Creating community...");
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout("/api/admin/reddit/communities", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          trr_show_id: effectiveShowId,
          trr_show_name: effectiveShowName,
          subreddit: communitySubreddit,
          display_name: communityDisplayName || null,
          notes: communityNotes || null,
          is_show_focused: communityIsShowFocused,
          network_focus_targets: communityIsShowFocused ? [] : communityNetworkTargets,
          franchise_focus_targets: communityIsShowFocused ? [] : communityFranchiseTargets,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to create community");
      }
      const body = (await response.json()) as { community?: RedditCommunityResponse };
      if (!body.community) {
        throw new Error("Community created but response payload was empty");
      }

      const createdCommunity = toCommunityModel(body.community);
      setCommunities((prev) =>
        sortCommunityList([createdCommunity, ...prev.filter((community) => community.id !== createdCommunity.id)]),
      );
      setSelectedCommunityId(createdCommunity.id);
      setDiscovery(null);
      resetCommunityForm();
      setShowCommunityForm(false);
      void refreshCommunityFlares(createdCommunity.id);
      void fetchCommunities().catch((err) => {
        console.warn("[reddit] Failed to sync communities after create", err);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create community");
    } finally {
      setBusyAction(null);
      setBusyLabel(null);
    }
  };

  const handleDeleteCommunity = async (communityId: string) => {
    if (!confirm("Delete this community and all assigned threads?")) return;
    setBusyAction("delete-community");
    setBusyLabel("Deleting community...");
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(`/api/admin/reddit/communities/${communityId}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete community");
      }
      await fetchCommunities();
      if (selectedCommunityId === communityId) {
        setDiscovery(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete community");
    } finally {
      setBusyAction(null);
      setBusyLabel(null);
    }
  };

  const handleCreateThread = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCommunity) {
      setError("Select a community before adding a thread");
      return;
    }
    const parsed = parseRedditUrl(threadUrl);
    if (!parsed) {
      setError("Enter a valid Reddit post URL");
      return;
    }

    setBusyAction("create-thread");
    setBusyLabel("Saving thread...");
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout("/api/admin/reddit/threads", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: selectedCommunity.id,
          trr_show_id: selectedCommunity.trr_show_id,
          trr_show_name: selectedCommunity.trr_show_name,
          trr_season_id: assignThreadToSeason ? seasonId ?? null : null,
          reddit_post_id: parsed.redditPostId,
          title: threadTitle,
          url: parsed.canonicalUrl,
          permalink: parsed.permalink,
          notes: threadNotes || null,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to create thread");
      }
      resetThreadForm();
      setShowThreadForm(false);
      await fetchCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create thread");
    } finally {
      setBusyAction(null);
      setBusyLabel(null);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm("Delete this assigned thread?")) return;
    setBusyAction("delete-thread");
    setBusyLabel("Deleting thread...");
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(`/api/admin/reddit/threads/${threadId}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete thread");
      }
      await fetchCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete thread");
    } finally {
      setBusyAction(null);
      setBusyLabel(null);
    }
  };

  const handleDiscover = async () => {
    if (!selectedCommunity) return;
    setBusyAction("discover");
    setBusyLabel("Discovering threads...");
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `/api/admin/reddit/communities/${selectedCommunity.id}/discover`,
        {
          headers,
          cache: "no-store",
          timeoutMs: REQUEST_TIMEOUT_MS.discover,
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to discover threads");
      }
      const payload = (await response.json()) as { discovery?: DiscoveryPayload };
      setDiscovery(payload.discovery ?? null);
      void refreshCommunityFlares(selectedCommunity.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover threads");
    } finally {
      setBusyAction(null);
      setBusyLabel(null);
    }
  };

  const saveDiscoveredThread = async (thread: DiscoveryThread) => {
    if (!selectedCommunity) return;
    setBusyAction("save-discovered-thread");
    setBusyLabel("Saving discovered thread...");
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout("/api/admin/reddit/threads", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: selectedCommunity.id,
          trr_show_id: selectedCommunity.trr_show_id,
          trr_show_name: selectedCommunity.trr_show_name,
          trr_season_id: assignThreadToSeason ? seasonId ?? null : null,
          reddit_post_id: thread.reddit_post_id,
          title: thread.title,
          url: thread.url,
          permalink: thread.permalink,
          author: thread.author,
          score: thread.score,
          num_comments: thread.num_comments,
          posted_at: thread.posted_at,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save discovered thread");
      }
      await fetchCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save discovered thread");
    } finally {
      setBusyAction(null);
      setBusyLabel(null);
    }
  };

  const handleRefreshEpisodeDiscussions = useCallback(async () => {
    if (!selectedCommunity) return;

    setEpisodeRefreshing(true);
    setError(null);
    setEpisodeContextWarning(null);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (episodeSeasonId) {
        params.set("season_id", episodeSeasonId);
      }
      if (selectedPeriod) {
        params.set("period_start", selectedPeriod.start);
        params.set("period_end", selectedPeriod.end);
        params.set("period_label", selectedPeriod.label);
      }
      const response = await fetchWithTimeout(
        `/api/admin/reddit/communities/${selectedCommunity.id}/episode-discussions/refresh?${params.toString()}`,
        {
          method: "GET",
          headers,
          cache: "no-store",
          timeoutMs: REQUEST_TIMEOUT_MS.episodeRefresh,
        },
      );
      const payload = (await response.json().catch(() => ({}))) as EpisodeDiscussionRefreshPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to refresh episode discussions");
      }

      if (payload.community) {
        const nextCommunity = toCommunityModel(payload.community);
        mergeCommunityPatch(selectedCommunity.id, {
          episode_title_patterns: nextCommunity.episode_title_patterns,
        });
      }

      const nextCandidates = Array.isArray(payload.candidates) ? payload.candidates : [];
      const nextMatrix = Array.isArray(payload.episode_matrix) ? payload.episode_matrix : [];
      setEpisodeMatrix(nextMatrix);
      setEpisodeCandidates(nextCandidates);
      setEpisodeSelectedPostIds(nextCandidates.map((candidate) => candidate.reddit_post_id));
      setEpisodeMeta(payload.meta ?? null);
      const resolvedSeasonId = payload.meta?.season_context?.season_id;
      if (typeof resolvedSeasonId === "string" && resolvedSeasonId.trim().length > 0) {
        setEpisodeSeasonId(resolvedSeasonId);
      }
    } catch (err) {
      setError(toErrorMessage(err, "Failed to refresh episode discussions"));
    } finally {
      setEpisodeRefreshing(false);
    }
  }, [
    episodeSeasonId,
    fetchWithTimeout,
    getAuthHeaders,
    mergeCommunityPatch,
    selectedPeriod,
    selectedCommunity,
  ]);

  const handleSaveSelectedEpisodeDiscussions = useCallback(async () => {
    if (!selectedCommunity) return;
    const selectedThreads = episodeCandidates.filter((candidate) =>
      episodeSelectedPostIds.includes(candidate.reddit_post_id),
    );
    if (selectedThreads.length === 0) {
      setError("Select at least one episode discussion candidate to save");
      return;
    }

    setEpisodeSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `/api/admin/reddit/communities/${selectedCommunity.id}/episode-discussions/save`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          timeoutMs: REQUEST_TIMEOUT_MS.episodeSave,
          body: JSON.stringify({
            season_id: episodeSeasonId ?? null,
            threads: selectedThreads.map((thread) => ({
              reddit_post_id: thread.reddit_post_id,
              title: thread.title,
              url: thread.url,
              permalink: thread.permalink,
              author: thread.author,
              score: thread.score,
              num_comments: thread.num_comments,
              posted_at: thread.posted_at,
            })),
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as EpisodeDiscussionSavePayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save selected episode discussions");
      }
      await fetchCommunities();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save selected episode discussions");
    } finally {
      setEpisodeSaving(false);
    }
  }, [
    episodeCandidates,
    episodeSeasonId,
    episodeSelectedPostIds,
    fetchCommunities,
    fetchWithTimeout,
    getAuthHeaders,
    selectedCommunity,
  ]);

  if (mode === "season" && (!showId || !showName)) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Reddit manager requires `showId` and `showName` in season mode.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Reddit Sources</p>
          <h3 className="text-xl font-bold text-zinc-900">
            {mode === "season" ? `${showName} Reddit Communities` : "Reddit Communities"}
          </h3>
          <p className="text-sm text-zinc-500">
            Add communities, discover likely show-matched threads, and save thread sources.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setShowCommunityForm((prev) => !prev)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Community
          </button>
          <button
            type="button"
            disabled={!selectedCommunity || isBusy}
            onClick={() => setShowThreadForm((prev) => !prev)}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add Thread
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {busyLabel && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{busyLabel}</div>
      )}

      {hideCommunityList && backHref && (
        <div>
          <a
            href={backHref}
            className="inline-flex rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Back
          </a>
        </div>
      )}

      {showCommunityForm && (
        <form
          onSubmit={handleCreateCommunity}
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">Add Community</h4>
          <div className="grid gap-3 md:grid-cols-2">
            {mode === "global" && (
              <>
                <div className="md:col-span-1">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                    Show
                  </label>
                  {coveredShows.length > 0 ? (
                    <select
                      value={communityShowId}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        const match = coveredShows.find((item) => item.trr_show_id === nextId);
                        setCommunityShowId(nextId);
                        setCommunityShowName(match?.show_name ?? communityShowName);
                      }}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    >
                      {coveredShows.map((item) => (
                        <option key={item.trr_show_id} value={item.trr_show_id}>
                          {item.show_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={communityShowId}
                      onChange={(event) => setCommunityShowId(event.target.value)}
                      placeholder="TRR show id"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  )}
                </div>
                {coveredShows.length === 0 && (
                  <div className="md:col-span-1">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                      Show Name
                    </label>
                    <input
                      value={communityShowName}
                      onChange={(event) => setCommunityShowName(event.target.value)}
                      placeholder="The Real Housewives of Salt Lake City"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Subreddit
              </label>
              <input
                value={communitySubreddit}
                onChange={(event) => setCommunitySubreddit(event.target.value)}
                placeholder="BravoRealHousewives or r/BravoRealHousewives"
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Display Name
              </label>
              <input
                value={communityDisplayName}
                onChange={(event) => setCommunityDisplayName(event.target.value)}
                placeholder="Bravo RH Main Subreddit"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Notes
              </label>
              <textarea
                value={communityNotes}
                onChange={(event) => setCommunityNotes(event.target.value)}
                rows={2}
                placeholder="Optional notes for this subreddit source."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="md:col-span-2 rounded-lg border border-zinc-200 p-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
                <input
                  type="checkbox"
                  checked={communityIsShowFocused}
                  onChange={(event) => setCommunityIsShowFocused(event.target.checked)}
                />
                Show-focused community
              </label>
              <p className="mt-1 text-xs text-zinc-500">
                Show-focused communities include all discovered posts and do not require flair assignment.
              </p>
            </div>

            {!communityIsShowFocused && (
              <>
                <div className="md:col-span-2 rounded-lg border border-zinc-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                    Network Targets
                  </p>
                  {communityNetworkTargets.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {communityNetworkTargets.map((target) => (
                        <button
                          key={`new-community-network-${target}`}
                          type="button"
                          onClick={() =>
                            setCommunityNetworkTargets((current) =>
                              current.filter((value) => value.toLowerCase() !== target.toLowerCase()),
                            )
                          }
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200"
                        >
                          {target} ×
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={communityNetworkTargetInput}
                      onChange={(event) => setCommunityNetworkTargetInput(event.target.value)}
                      placeholder="Add network target"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCommunityNetworkTargets((current) =>
                          pushListValue(current, communityNetworkTargetInput),
                        );
                        setCommunityNetworkTargetInput("");
                      }}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {networkFocusSuggestions
                      .filter(
                        (target) =>
                          !communityNetworkTargets.some(
                            (value) => value.toLowerCase() === target.toLowerCase(),
                          ),
                      )
                      .map((target) => (
                        <button
                          key={`new-community-network-suggestion-${target}`}
                          type="button"
                          onClick={() => setCommunityNetworkTargets((current) => pushListValue(current, target))}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          + {target}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="md:col-span-2 rounded-lg border border-zinc-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                    Franchise Targets
                  </p>
                  {communityFranchiseTargets.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {communityFranchiseTargets.map((target) => (
                        <button
                          key={`new-community-franchise-${target}`}
                          type="button"
                          onClick={() =>
                            setCommunityFranchiseTargets((current) =>
                              current.filter((value) => value.toLowerCase() !== target.toLowerCase()),
                            )
                          }
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200"
                        >
                          {target} ×
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={communityFranchiseTargetInput}
                      onChange={(event) => setCommunityFranchiseTargetInput(event.target.value)}
                      placeholder="Add franchise target"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCommunityFranchiseTargets((current) =>
                          pushListValue(current, communityFranchiseTargetInput),
                        );
                        setCommunityFranchiseTargetInput("");
                      }}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {franchiseFocusSuggestions
                      .filter(
                        (target) =>
                          !communityFranchiseTargets.some(
                            (value) => value.toLowerCase() === target.toLowerCase(),
                          ),
                      )
                      .map((target) => (
                        <button
                          key={`new-community-franchise-suggestion-${target}`}
                          type="button"
                          onClick={() =>
                            setCommunityFranchiseTargets((current) => pushListValue(current, target))
                          }
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          + {target}
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Community
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setShowCommunityForm(false);
                resetCommunityForm();
              }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showThreadForm && (
        <form
          onSubmit={handleCreateThread}
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">Add Thread</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Reddit Post URL
              </label>
              <input
                value={threadUrl}
                onChange={(event) => setThreadUrl(event.target.value)}
                placeholder="https://www.reddit.com/r/BravoRealHousewives/comments/..."
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Thread Title
              </label>
              <input
                value={threadTitle}
                onChange={(event) => setThreadTitle(event.target.value)}
                placeholder="Episode Discussion Thread"
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            {mode === "season" && (
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={assignThreadToSeason}
                  onChange={(event) => setAssignThreadToSeason(event.target.checked)}
                />
                Assign to Season {seasonNumber ?? "current"}
              </label>
            )}
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Notes
              </label>
              <textarea
                value={threadNotes}
                onChange={(event) => setThreadNotes(event.target.value)}
                rows={2}
                placeholder="Optional notes about when to pull this thread."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Thread
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setShowThreadForm(false);
                resetThreadForm();
              }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
          Loading reddit communities...
        </div>
      ) : (
        <div className={hideCommunityList ? "space-y-5" : "grid gap-5 xl:grid-cols-12"}>
          {!hideCommunityList && (
            <section className="xl:col-span-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">Communities</h4>
            {communities.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                No communities yet. Use <span className="font-semibold">Add Community</span> to get started.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {communityGroups.map(([groupName, items]) => (
                  <div key={groupName} className="space-y-2">
                    {mode === "global" && (
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        {groupName}
                      </p>
                    )}
                    {items.map((community) => (
                      <button
                        key={community.id}
                        type="button"
                        onClick={() => {
                          setSelectedCommunityId(community.id);
                          setDiscovery(null);
                        }}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          selectedCommunityId === community.id
                            ? "border-zinc-900 bg-zinc-900/5"
                            : "border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900">
                              {community.display_name || `r/${community.subreddit}`}
                            </p>
                            <p className="truncate text-xs text-zinc-500">r/{community.subreddit}</p>
                          </div>
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                            {community.assigned_thread_count}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            </section>
          )}

          <section className={hideCommunityList ? "space-y-5" : "xl:col-span-8 space-y-5"}>
            {!selectedCommunity ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
                Select a community to view assigned threads and discovery hints.
              </div>
            ) : (
              <>
                <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                        Community
                      </p>
                      {communityViewHref ? (
                        <a
                          href={communityViewHref}
                          className="text-lg font-bold text-zinc-900 underline-offset-4 hover:underline"
                        >
                          {selectedCommunity.display_name || `r/${selectedCommunity.subreddit}`}
                        </a>
                      ) : (
                        <h4 className="text-lg font-bold text-zinc-900">
                          {selectedCommunity.display_name || `r/${selectedCommunity.subreddit}`}
                        </h4>
                      )}
                      <p className="text-sm text-zinc-500">{selectedCommunity.trr_show_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setShowCommunitySettingsModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Open community settings"
                      >
                        <svg
                          aria-hidden
                          viewBox="0 0 20 20"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        >
                          <path d="M10 3.3 11.1 5.5l2.4.35.6 2.35 2 .9-.9 2 .9 2-2 .9-.6 2.35-2.4.35L10 18.7l-1.1-2.2-2.4-.35-.6-2.35-2-.9.9-2-.9-2 2-.9.6-2.35 2.4-.35L10 3.3Z" />
                          <circle cx="10" cy="10" r="2.4" />
                        </svg>
                        Settings
                      </button>
                      {communityViewHref && (
                        <a
                          href={communityViewHref}
                          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          Community View
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={handleDiscover}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Discover Threads
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeleteCommunity(selectedCommunity.id)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {selectedCommunity.analysis_all_flares.length} all-post ·{" "}
                    {selectedCommunity.analysis_flares.length} scan ·{" "}
                    {selectedCommunity.post_flares.length} post flares
                  </p>
                  {selectedCommunity.notes && (
                    <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                      {selectedCommunity.notes}
                    </p>
                  )}
                </article>

                {showCommunitySettingsModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setShowCommunitySettingsModal(false)}
                  >
                    <article
                      className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h5 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
                          Community Settings
                        </h5>
                        <button
                          type="button"
                          className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          onClick={() => setShowCommunitySettingsModal(false)}
                        >
                          Close
                        </button>
                      </div>

                      <div className="mb-3 rounded-lg border border-zinc-200 p-3">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          Post Flares
                        </p>
                        {refreshingFlaresCommunityId === selectedCommunity.id ? (
                          <p className="text-xs text-zinc-500">Loading post flares...</p>
                        ) : selectedCommunity.post_flares.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedCommunity.post_flares.map((flair) => (
                              <span
                                key={`selected-flair-${selectedCommunity.id}-${flair}`}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                              >
                                {flair}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500">No post flairs available yet.</p>
                        )}
                      </div>

                      <div className="space-y-3">
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          Community Focus
                        </p>
                        {selectedCommunity.is_show_focused ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Show-focused
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                            Network/Franchise-focused
                          </span>
                        )}
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                        <input
                          type="checkbox"
                          checked={selectedCommunity.is_show_focused}
                          disabled={isBusy}
                          onChange={(event) => {
                            void persistCommunityFocus(selectedCommunity.id, {
                              isShowFocused: event.target.checked,
                              networkFocusTargets: event.target.checked
                                ? []
                                : selectedCommunity.network_focus_targets,
                              franchiseFocusTargets: event.target.checked
                                ? []
                                : selectedCommunity.franchise_focus_targets,
                            });
                          }}
                        />
                        Show-focused community
                      </label>
                      <p className="mt-1 text-xs text-zinc-500">
                        Show-focused communities include all discovered posts and skip flair assignment.
                      </p>
                    </div>

                    {!selectedCommunity.is_show_focused && (
                      <>
                        <div className="rounded-lg border border-zinc-200 p-3">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            Network Targets
                          </p>
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {selectedCommunity.network_focus_targets.length === 0 && (
                              <span className="text-xs text-zinc-500">No network targets.</span>
                            )}
                            {selectedCommunity.network_focus_targets.map((target) => (
                              <button
                                key={`selected-network-target-${selectedCommunity.id}-${target}`}
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  const nextTargets = selectedCommunity.network_focus_targets.filter(
                                    (value) => value.toLowerCase() !== target.toLowerCase(),
                                  );
                                  void persistCommunityFocus(selectedCommunity.id, {
                                    isShowFocused: false,
                                    networkFocusTargets: nextTargets,
                                    franchiseFocusTargets: selectedCommunity.franchise_focus_targets,
                                  });
                                }}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-60"
                              >
                                {target} ×
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={selectedNetworkTargetInput}
                              onChange={(event) => setSelectedNetworkTargetInput(event.target.value)}
                              placeholder="Add network target"
                              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            />
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                const nextTargets = pushListValue(
                                  selectedCommunity.network_focus_targets,
                                  selectedNetworkTargetInput,
                                );
                                setSelectedNetworkTargetInput("");
                                void persistCommunityFocus(selectedCommunity.id, {
                                  isShowFocused: false,
                                  networkFocusTargets: nextTargets,
                                  franchiseFocusTargets: selectedCommunity.franchise_focus_targets,
                                });
                              }}
                              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                            >
                              Add
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {networkFocusSuggestions
                              .filter(
                                (target) =>
                                  !selectedCommunity.network_focus_targets.some(
                                    (value) => value.toLowerCase() === target.toLowerCase(),
                                  ),
                              )
                              .map((target) => (
                                <button
                                  key={`network-suggestion-${selectedCommunity.id}-${target}`}
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    void persistCommunityFocus(selectedCommunity.id, {
                                      isShowFocused: false,
                                      networkFocusTargets: [
                                        ...selectedCommunity.network_focus_targets,
                                        target,
                                      ],
                                      franchiseFocusTargets: selectedCommunity.franchise_focus_targets,
                                    });
                                  }}
                                  className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                                >
                                  + {target}
                                </button>
                              ))}
                          </div>
                        </div>

                        <div className="rounded-lg border border-zinc-200 p-3">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            Franchise Targets
                          </p>
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {selectedCommunity.franchise_focus_targets.length === 0 && (
                              <span className="text-xs text-zinc-500">No franchise targets.</span>
                            )}
                            {selectedCommunity.franchise_focus_targets.map((target) => (
                              <button
                                key={`selected-franchise-target-${selectedCommunity.id}-${target}`}
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  const nextTargets = selectedCommunity.franchise_focus_targets.filter(
                                    (value) => value.toLowerCase() !== target.toLowerCase(),
                                  );
                                  void persistCommunityFocus(selectedCommunity.id, {
                                    isShowFocused: false,
                                    networkFocusTargets: selectedCommunity.network_focus_targets,
                                    franchiseFocusTargets: nextTargets,
                                  });
                                }}
                                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-60"
                              >
                                {target} ×
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              value={selectedFranchiseTargetInput}
                              onChange={(event) => setSelectedFranchiseTargetInput(event.target.value)}
                              placeholder="Add franchise target"
                              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            />
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                const nextTargets = pushListValue(
                                  selectedCommunity.franchise_focus_targets,
                                  selectedFranchiseTargetInput,
                                );
                                setSelectedFranchiseTargetInput("");
                                void persistCommunityFocus(selectedCommunity.id, {
                                  isShowFocused: false,
                                  networkFocusTargets: selectedCommunity.network_focus_targets,
                                  franchiseFocusTargets: nextTargets,
                                });
                              }}
                              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                            >
                              Add
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {franchiseFocusSuggestions
                              .filter(
                                (target) =>
                                  !selectedCommunity.franchise_focus_targets.some(
                                    (value) => value.toLowerCase() === target.toLowerCase(),
                                  ),
                              )
                              .map((target) => (
                                <button
                                  key={`franchise-suggestion-${selectedCommunity.id}-${target}`}
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    void persistCommunityFocus(selectedCommunity.id, {
                                      isShowFocused: false,
                                      networkFocusTargets: selectedCommunity.network_focus_targets,
                                      franchiseFocusTargets: [
                                        ...selectedCommunity.franchise_focus_targets,
                                        target,
                                      ],
                                    });
                                  }}
                                  className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                                >
                                  + {target}
                                </button>
                              ))}
                          </div>
                        </div>
                      </>
                    )}

                    {selectedCommunity.is_show_focused ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                        Show-focused mode enabled. All discovered posts are eligible (including no-flair posts).
                      </div>
                    ) : (
                      <div className="rounded-lg border border-zinc-200 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            Analysis Flares
                          </p>
                          <span className="text-[11px] font-semibold text-zinc-500">
                            {selectedCommunity.analysis_all_flares.length} all-post ·{" "}
                            {selectedCommunity.analysis_flares.length} scan
                          </span>
                        </div>
                        {selectedCommunity.post_flares.length === 0 ? (
                          <p className="text-xs text-zinc-500">
                            Refresh post flares first to assign analysis flares.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                All Posts With Flair
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedCommunity.post_flares.map((flair) => {
                                  const flairKey = flair.toLowerCase();
                                  const isSelected = selectedCommunity.analysis_all_flares.some(
                                    (value) => value.toLowerCase() === flairKey,
                                  );
                                  return (
                                    <button
                                      key={`analysis-all-flair-${selectedCommunity.id}-${flair}`}
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => {
                                        const nextAll = isSelected
                                          ? selectedCommunity.analysis_all_flares.filter(
                                              (value) => value.toLowerCase() !== flairKey,
                                            )
                                          : [...selectedCommunity.analysis_all_flares, flair];
                                        const nextScan = selectedCommunity.analysis_flares.filter(
                                          (value) => value.toLowerCase() !== flairKey,
                                        );
                                        void persistAnalysisFlareModes(selectedCommunity.id, {
                                          analysisAllFlares: nextAll,
                                          analysisFlares: nextScan,
                                        });
                                      }}
                                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                                        isSelected
                                          ? "bg-indigo-100 text-indigo-700"
                                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                                      } disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                      {isSelected ? "All posts · " : ""}
                                      {flair}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                Scan Flair For Relevant Terms
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedCommunity.post_flares.map((flair) => {
                                  const flairKey = flair.toLowerCase();
                                  const isSelected = selectedCommunity.analysis_flares.some(
                                    (value) => value.toLowerCase() === flairKey,
                                  );
                                  return (
                                    <button
                                      key={`analysis-scan-flair-${selectedCommunity.id}-${flair}`}
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => {
                                        const nextScan = isSelected
                                          ? selectedCommunity.analysis_flares.filter(
                                              (value) => value.toLowerCase() !== flairKey,
                                            )
                                          : [...selectedCommunity.analysis_flares, flair];
                                        const nextAll = selectedCommunity.analysis_all_flares.filter(
                                          (value) => value.toLowerCase() !== flairKey,
                                        );
                                        void persistAnalysisFlareModes(selectedCommunity.id, {
                                          analysisAllFlares: nextAll,
                                          analysisFlares: nextScan,
                                        });
                                      }}
                                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                                        isSelected
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                                      } disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                      {isSelected ? "Scan terms · " : ""}
                                      {flair}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-lg border border-zinc-200 p-3">
                      <div className="mb-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          Episode Discussion Communities
                        </p>
                      </div>

                      <p className="mb-2 text-xs text-zinc-500">
                        Episode Discussions are post types in this subreddit matched by title phrases.
                      </p>
                      {episodeContextWarning && (
                        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                          {episodeContextWarning}
                        </div>
                      )}

                      <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            Season
                          </span>
                          <select
                            value={episodeSeasonId ?? ""}
                            disabled={isBusy || periodsLoading || seasonOptions.length === 0}
                            onChange={(event) => {
                              const nextSeasonId = event.target.value || null;
                              setEpisodeSeasonId(nextSeasonId);
                              const season = seasonOptions.find((item) => item.id === nextSeasonId);
                              if (season) {
                                const requestToken = episodeContextRequestTokenRef.current + 1;
                                episodeContextRequestTokenRef.current = requestToken;
                                episodeContextAbortRef.current?.abort();
                                const controller = new AbortController();
                                episodeContextAbortRef.current = controller;
                                setPeriodsLoading(true);
                                void loadPeriodOptionsForSeason(selectedCommunity, season, {
                                  signal: controller.signal,
                                  requestToken,
                                })
                                  .catch((err) => {
                                    setEpisodeContextWarning(
                                      toErrorMessage(
                                        err,
                                        "Failed to load social periods for selected season",
                                      ),
                                    );
                                  })
                                  .finally(() => {
                                    if (
                                      !controller.signal.aborted &&
                                      episodeContextRequestTokenRef.current === requestToken
                                    ) {
                                      setPeriodsLoading(false);
                                    }
                                  });
                              } else {
                                setPeriodOptions([]);
                              }
                            }}
                            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-60"
                          >
                            {seasonOptions.length === 0 ? (
                              <option value="">No seasons</option>
                            ) : (
                              seasonOptions.map((season) => (
                                <option key={season.id} value={season.id}>
                                  Season {season.season_number}
                                </option>
                              ))
                            )}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            Period
                          </span>
                          <select
                            value={selectedPeriodKey}
                            disabled={isBusy || periodsLoading || periodOptions.length === 0}
                            onChange={(event) => setSelectedPeriodKey(event.target.value)}
                            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-60"
                          >
                            {periodOptions.length === 0 ? (
                              <option value="all-periods">All Periods</option>
                            ) : (
                              periodOptions.map((period) => (
                                <option key={period.key} value={period.key}>
                                  {period.label}
                                </option>
                              ))
                            )}
                          </select>
                        </label>
                        <button
                          type="button"
                          disabled={isBusy || periodsLoading}
                          onClick={() => void handleRefreshEpisodeDiscussions()}
                          className="self-end rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                        >
                          Refresh Episode Discussions
                        </button>
                      </div>

                      <div className="mb-3">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          Title Phrases
                        </p>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {selectedCommunity.episode_title_patterns.length === 0 && (
                            <span className="text-xs text-zinc-500">No episode title patterns.</span>
                          )}
                          {selectedCommunity.episode_title_patterns.map((pattern) => (
                            <button
                              key={`episode-pattern-${selectedCommunity.id}-${pattern}`}
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                const nextPatterns = selectedCommunity.episode_title_patterns.filter(
                                  (value) => value.toLowerCase() !== pattern.toLowerCase(),
                                );
                                void persistEpisodeRules(selectedCommunity.id, {
                                  episodeTitlePatterns: nextPatterns,
                                });
                              }}
                              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-60"
                            >
                              {pattern} ×
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={episodePatternInput}
                            onChange={(event) => setEpisodePatternInput(event.target.value)}
                            placeholder="Add episode title phrase"
                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                          />
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              const nextPatterns = pushListValue(
                                selectedCommunity.episode_title_patterns,
                                episodePatternInput,
                              );
                              setEpisodePatternInput("");
                              void persistEpisodeRules(selectedCommunity.id, {
                                episodeTitlePatterns: nextPatterns,
                              });
                            }}
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                          >
                            Add
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {episodePatternSuggestions
                            .filter(
                              (pattern) =>
                                !selectedCommunity.episode_title_patterns.some(
                                  (value) => value.toLowerCase() === pattern.toLowerCase(),
                                ),
                            )
                            .map((pattern) => (
                              <button
                                key={`episode-pattern-suggestion-${selectedCommunity.id}-${pattern}`}
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  void persistEpisodeRules(selectedCommunity.id, {
                                    episodeTitlePatterns: [
                                      ...selectedCommunity.episode_title_patterns,
                                      pattern,
                                    ],
                                  });
                                }}
                                className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                              >
                                + {pattern}
                              </button>
                            ))}
                        </div>
                      </div>

                      {!selectedCommunity.is_show_focused && (
                        <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600">
                          Required flares for episode refresh are sourced from
                          {" "}
                          <span className="font-semibold">All Posts With Flair</span>.
                          {selectedCommunity.analysis_all_flares.length === 0 &&
                            !episodeMeta?.auto_seeded_required_flares && (
                            <span className="block pt-1 text-amber-700">
                              No all-post flares selected. Episode refresh may be less strict for this multi-show community.
                            </span>
                          )}
                        </div>
                      )}

                      {episodeMeta?.auto_seeded_required_flares && (
                        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                          Using temporary required flair: Salt Lake City (set in All Posts With Flair to persist).
                        </div>
                      )}

                      {episodeMeta && (
                        <p className="mb-3 text-xs text-zinc-500">
                          Found {episodeMeta.total_found ?? 0} candidates ·{" "}
                          {typeof episodeMeta.fetched_at === "string"
                            ? fmtDateTime(episodeMeta.fetched_at)
                            : "-"}
                          {episodeMeta.season_context?.season_number
                            ? ` · Season ${episodeMeta.season_context.season_number}`
                            : ""}
                          {episodeMeta.period_context?.selected_period_labels?.[0]
                            ? ` · ${episodeMeta.period_context.selected_period_labels[0]}`
                            : ""}
                          {episodeMeta.failed_sorts && episodeMeta.failed_sorts.length > 0
                            ? ` · Failed sorts: ${episodeMeta.failed_sorts.join(", ")}`
                            : ""}
                          {episodeMeta.rate_limited_sorts &&
                          episodeMeta.rate_limited_sorts.length > 0
                            ? ` · Rate-limited: ${episodeMeta.rate_limited_sorts.join(", ")}`
                            : ""}
                        </p>
                      )}

                      {episodeMatrix.length > 0 && (
                        <div className="mb-3 overflow-x-auto rounded-lg border border-zinc-200">
                          <table className="min-w-full text-left text-xs">
                            <thead className="bg-zinc-50 text-zinc-600">
                              <tr>
                                <th className="px-2 py-2 font-semibold uppercase tracking-[0.12em]">Episode</th>
                                <th className="px-2 py-2 font-semibold uppercase tracking-[0.12em]">Live</th>
                                <th className="px-2 py-2 font-semibold uppercase tracking-[0.12em]">Post</th>
                                <th className="px-2 py-2 font-semibold uppercase tracking-[0.12em]">Weekly</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                              {episodeMatrix.map((row) => {
                                const cells: Array<["live" | "post" | "weekly", EpisodeDiscussionMatrixCell]> = [
                                  ["live", row.live],
                                  ["post", row.post],
                                  ["weekly", row.weekly],
                                ];
                                return (
                                  <tr key={`episode-matrix-${row.episode_number}`}>
                                    <td className="whitespace-nowrap px-2 py-2 font-semibold text-zinc-800">
                                      Episode {row.episode_number}
                                    </td>
                                    {cells.map(([cellKey, cell]) => (
                                      <td
                                        key={`episode-matrix-cell-${row.episode_number}-${cellKey}`}
                                        className="px-2 py-2 text-zinc-600"
                                      >
                                        <div>{fmtNum(cell.post_count)} posts</div>
                                        <div>{fmtNum(cell.total_comments)} comments</div>
                                        {(() => {
                                          if (!cell.top_post_url) return null;
                                          return (
                                            <a
                                              href={cell.top_post_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[11px] font-semibold text-blue-700 hover:underline"
                                            >
                                              Top post
                                            </a>
                                          );
                                        })()}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {episodeCandidates.length === 0 ? (
                        <p className="text-xs text-zinc-500">
                          No episode discussion candidates loaded yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {episodeCandidates.map((candidate) => {
                            const checked = episodeSelectedPostIds.includes(candidate.reddit_post_id);
                            return (
                              <div
                                key={`episode-candidate-${candidate.reddit_post_id}`}
                                className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-2"
                              >
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => {
                                      setEpisodeSelectedPostIds((current) =>
                                        event.target.checked
                                          ? [...current, candidate.reddit_post_id]
                                          : current.filter((id) => id !== candidate.reddit_post_id),
                                      );
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <a
                                      href={candidate.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:underline"
                                    >
                                      {candidate.title}
                                    </a>
                                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                                      <span>
                                        Episode {candidate.episode_number} ·{" "}
                                        {formatDiscussionTypeLabel(candidate.discussion_type)}
                                      </span>
                                      <span>{fmtNum(candidate.score)} upvotes</span>
                                      <span>{fmtNum(candidate.num_comments)} comments</span>
                                      <span>{fmtDateTime(candidate.posted_at)}</span>
                                      {candidate.link_flair_text && (
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                          Flair: {candidate.link_flair_text}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={episodeSaving || episodeSelectedPostIds.length === 0}
                          onClick={() => void handleSaveSelectedEpisodeDiscussions()}
                          className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                        >
                          {episodeSaving ? "Saving..." : "Save Selected"}
                        </button>
                      </div>
                    </div>
                  </div>
                    </article>
                  </div>
                )}

                <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h5 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
                      Assigned Threads
                    </h5>
                    <span className="text-xs font-semibold text-zinc-600">
                      {selectedCommunity.assigned_threads.length} saved
                    </span>
                  </div>
                  {selectedCommunity.assigned_threads.length === 0 ? (
                    <p className="text-sm text-zinc-500">No saved threads for this community.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedCommunity.assigned_threads.map((thread) => (
                        <div
                          key={thread.id}
                          className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <a
                                href={thread.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:underline"
                              >
                                {thread.title}
                              </a>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                <span>u/{thread.author ?? "unknown"}</span>
                                <span>{fmtNum(thread.score)} score</span>
                                <span>{fmtNum(thread.num_comments)} comments</span>
                                <span>{fmtDateTime(thread.posted_at)}</span>
                              </div>
                              <div className="mt-1">
                                {thread.trr_season_id ? (
                                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                    Season-scoped
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                                    Show-level
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeleteThread(thread.id)}
                              className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h5 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
                      Discovered Threads
                    </h5>
                    {selectedCommunity.is_show_focused ? (
                      <span className="text-xs font-semibold text-emerald-700">
                        Show-focused: all discovered posts shown
                      </span>
                    ) : (
                      <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                        <input
                          type="checkbox"
                          checked={showOnlyMatches}
                          onChange={(event) => setShowOnlyMatches(event.target.checked)}
                        />
                        Show matched only
                      </label>
                    )}
                  </div>

                  {discovery?.hints && (
                    <div className="mb-4 space-y-2">
                      {discovery.hints.suggested_include_terms.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
                            Suggested Include Terms
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {discovery.hints.suggested_include_terms.map((term) => (
                              <span
                                key={`inc-${term}`}
                                className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {discovery.hints.suggested_exclude_terms.length > 0 && (
                        <div>
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-600">
                            Suggested Exclude Terms
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {discovery.hints.suggested_exclude_terms.map((term) => (
                              <span
                                key={`exc-${term}`}
                                className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!discovery ? (
                    <p className="text-sm text-zinc-500">
                      Run discovery to load recent `new`/`hot`/`top` threads and show-match hints.
                    </p>
                  ) : visibleDiscoveryThreads.length === 0 ? (
                    <p className="text-sm text-zinc-500">No threads matched the current filter.</p>
                  ) : (
                    <div className="space-y-3">
                      {visibleDiscoveryThreads.map((thread) => (
                        <div key={thread.reddit_post_id} className="rounded-lg border border-zinc-100 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <a
                                href={thread.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:underline"
                              >
                                {thread.title}
                              </a>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                <span>u/{thread.author ?? "unknown"}</span>
                                <span>{fmtNum(thread.score)} score</span>
                                <span>{fmtNum(thread.num_comments)} comments</span>
                                <span>sort: {thread.source_sorts.join(", ")}</span>
                                {thread.link_flair_text && (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                    Flair: {thread.link_flair_text}
                                  </span>
                                )}
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {thread.is_show_match ? (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    Show Match · score {thread.match_score}
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                                    Non-match
                                  </span>
                                )}
                                {(thread.matched_terms ?? []).map((term) => (
                                  <span
                                    key={`${thread.reddit_post_id}-m-${term}`}
                                    className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
                                  >
                                    + {term}
                                  </span>
                                ))}
                                {(thread.matched_cast_terms ?? []).map((term) => (
                                  <span
                                    key={`${thread.reddit_post_id}-cast-${term}`}
                                    className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-700"
                                  >
                                    cast: {term}
                                  </span>
                                ))}
                                {(thread.cross_show_terms ?? []).map((term) => (
                                  <span
                                    key={`${thread.reddit_post_id}-x-${term}`}
                                    className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700"
                                  >
                                    - {term}
                                  </span>
                                ))}
                                {(selectedCommunity.analysis_flares.length > 0 ||
                                  selectedCommunity.analysis_all_flares.length > 0) && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                      (thread.passes_flair_filter ?? true)
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-rose-50 text-rose-700"
                                    }`}
                                  >
                                    {(thread.passes_flair_filter ?? true) ? "Selected flair" : "Flair excluded"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void saveDiscoveredThread(thread)}
                              className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Add Thread
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
