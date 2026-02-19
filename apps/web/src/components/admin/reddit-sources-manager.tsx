"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

interface CoveredShow {
  trr_show_id: string;
  show_name: string;
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

const REQUEST_TIMEOUT_MS = 20_000;

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
}: RedditSourcesManagerProps) {
  const [communities, setCommunities] = useState<RedditCommunity[]>([]);
  const [coveredShows, setCoveredShows] = useState<CoveredShow[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);

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

  const [threadTitle, setThreadTitle] = useState("");
  const [threadUrl, setThreadUrl] = useState("");
  const [threadNotes, setThreadNotes] = useState("");
  const [assignThreadToSeason, setAssignThreadToSeason] = useState(mode === "season");

  const [discovery, setDiscovery] = useState<DiscoveryPayload | null>(null);
  const [showOnlyMatches, setShowOnlyMatches] = useState(true);
  const isBusy = busyAction !== null;

  const getAuthHeaders = useCallback(async () => getClientAuthHeaders(), []);

  const fetchWithTimeout = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        return await fetchAdminWithAuth(input, { ...init, signal: controller.signal });
      } catch (err) {
        if ((err as { name?: string } | null)?.name === "AbortError") {
          throw new Error("Request timed out. Please try again.");
        }
        throw err;
      } finally {
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
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Failed to fetch reddit communities");
    }
    const payload = (await response.json()) as { communities?: RedditCommunityResponse[] };
    const list = sortCommunityList((payload.communities ?? []).map(toCommunityModel));
    setCommunities(list);
    setSelectedCommunityId((prev) => {
      if (prev && list.some((community) => community.id === prev)) return prev;
      return list[0]?.id ?? null;
    });
  }, [fetchWithTimeout, getAuthHeaders, mode, seasonId, showId]);

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

  const selectedCommunity = useMemo(
    () => communities.find((community) => community.id === selectedCommunityId) ?? null,
    [communities, selectedCommunityId],
  );

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
    if (!showOnlyMatches) return items;
    const hasAllPostsFlairMode = (selectedCommunity?.analysis_all_flares.length ?? 0) > 0;
    if (!hasAllPostsFlairMode) {
      return items.filter((thread) => thread.is_show_match);
    }
    return items.filter(
      (thread) => thread.is_show_match || Boolean(thread.passes_flair_filter),
    );
  }, [discovery, selectedCommunity, showOnlyMatches]);

  const communityGroups = useMemo<Array<[string, RedditCommunity[]]>>(
    () => (mode === "global" ? groupedCommunities : [[showName ?? "Show", communities]]),
    [communities, groupedCommunities, mode, showName],
  );

  const resetCommunityForm = () => {
    setCommunitySubreddit("");
    setCommunityDisplayName("");
    setCommunityNotes("");
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
        <div className="grid gap-5 xl:grid-cols-12">
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

          <section className="xl:col-span-8 space-y-5">
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
                        Selected Community
                      </p>
                      <h4 className="text-lg font-bold text-zinc-900">
                        {selectedCommunity.display_name || `r/${selectedCommunity.subreddit}`}
                      </h4>
                      <p className="text-sm text-zinc-500">{selectedCommunity.trr_show_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
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
                  <div className="mt-2">
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
                  <div className="mt-3">
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
                                  {isSelected ? "All posts · " : ""}{flair}
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
                                  {isSelected ? "Scan terms · " : ""}{flair}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedCommunity.notes && (
                    <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                      {selectedCommunity.notes}
                    </p>
                  )}
                </article>

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
                    <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                      <input
                        type="checkbox"
                        checked={showOnlyMatches}
                        onChange={(event) => setShowOnlyMatches(event.target.checked)}
                      />
                      Show matched only
                    </label>
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
