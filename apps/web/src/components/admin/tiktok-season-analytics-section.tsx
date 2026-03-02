"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";

type TikTokAnalyticsView =
  | "tiktok-overview"
  | "tiktok-cast"
  | "tiktok-hashtags"
  | "tiktok-sounds"
  | "tiktok-health"
  | "tiktok-sentiment";

type TimeSeriesPoint = {
  period_start: string;
  posts: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate: number;
};

type TikTokOverviewPayload = {
  season_id: string;
  kpis: {
    post_count: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagement_rate: number;
    follower_delta: number | null;
  };
  wow_delta_pct: Record<string, number | null>;
  time_series?: {
    hourly?: TimeSeriesPoint[];
    daily?: TimeSeriesPoint[];
    weekly?: TimeSeriesPoint[];
  };
};

type TikTokCastMember = {
  cast_member_id: string | null;
  cast_member_name: string;
  post_count: number;
  avg_engagement: number;
  top_post_engagement: number;
};

type TikTokCastPayload = {
  season_id: string;
  cast_members: TikTokCastMember[];
};

type TikTokTokenPayload = {
  season_id: string;
  token_type: "hashtag" | "keyword" | "mention";
  tokens: Array<{
    token: string;
    normalized_token: string;
    use_count: number;
    post_count: number;
  }>;
};

type TikTokSoundsPayload = {
  season_id: string;
  sounds: Array<{
    sound_id: string;
    title: string | null;
    artist_name: string | null;
    usage_count: number;
    creator_post_count: number;
    creator_views: number;
    creator_likes: number;
    creator_comments: number;
    creator_shares: number;
    creator_saves: number;
    creator_engagement_rate: number;
    related_post_count: number;
    last_creator_post_at: string | null;
    last_seen_at: string | null;
  }>;
};

type TikTokSoundDetailPayload = {
  season_id: string;
  sound: {
    sound_id: string;
    title: string | null;
    artist_name: string | null;
    usage_count: number;
    source_url: string | null;
    creator_post_count: number;
  } | null;
};

type TikTokSoundPostsPayload = {
  season_id: string;
  sound_id: string;
  posts: Array<{
    platform_post_id: string;
    creator_handle: string | null;
    posted_at: string | null;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    thumbnail_url: string | null;
    caption: string | null;
  }>;
};

type TikTokContentHealthPayload = {
  season_id: string;
  thresholds: Record<string, number>;
  posts: Array<{
    post_id: string;
    source_account: string | null;
    posted_at: string | null;
    caption: string | null;
    thumbnail_url: string | null;
    url: string | null;
    sound_id: string | null;
    sound_title: string | null;
    sound_author: string | null;
    metrics: {
      views: number;
      likes: number;
      comments: number;
      shares: number;
      saves: number;
      velocity_24h: number;
      quality_score: number;
      engagement_rate: number;
    };
    reason_flags: string[];
    health_score: number;
  }>;
};

type TikTokSentimentPayload = {
  season_id: string;
  timeline: Array<{
    day: string;
    positive_count: number;
    neutral_count: number;
    negative_count: number;
    toxicity_count: number;
    cast_mentions_count: number;
    controversy_score: number;
  }>;
};

const PRESET_STORAGE_KEY = "trr:tiktok-cast-presets:v1";

interface TikTokSeasonAnalyticsSectionProps {
  showId: string;
  seasonNumber: number;
  seasonId: string;
  showName: string;
  analyticsView: TikTokAnalyticsView;
}

const numberFormatter = new Intl.NumberFormat("en-US");

const asQueryValue = (value: string | null | undefined): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
};

const pct = (value: number | null | undefined): string => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${value.toFixed(1)}%`;
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const readErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const data = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };
  return data.error ?? data.detail ?? fallback;
};

const queryWithFilters = (
  base: URLSearchParams,
  filters: {
    dateStart: string;
    dateEnd: string;
    castMemberId: string;
    hashtag: string;
    keyword: string;
    soundId: string;
  },
): URLSearchParams => {
  const next = new URLSearchParams(base.toString());
  const dateStart = asQueryValue(filters.dateStart);
  const dateEnd = asQueryValue(filters.dateEnd);
  const castMemberId = asQueryValue(filters.castMemberId);
  const hashtag = asQueryValue(filters.hashtag);
  const keyword = asQueryValue(filters.keyword);
  const soundId = asQueryValue(filters.soundId);
  if (dateStart) next.set("date_start", dateStart);
  if (dateEnd) next.set("date_end", dateEnd);
  if (castMemberId) next.set("cast_member_id", castMemberId);
  if (hashtag) next.set("hashtag", hashtag);
  if (keyword) next.set("keyword", keyword);
  if (soundId) next.set("sound_id", soundId);
  return next;
};

export default function TikTokSeasonAnalyticsSection({
  showId,
  seasonNumber,
  seasonId,
  showName,
  analyticsView,
}: TikTokSeasonAnalyticsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [castMemberId, setCastMemberId] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [keyword, setKeyword] = useState("");
  const [soundId, setSoundId] = useState("");

  const [savedPresets, setSavedPresets] = useState<Array<{ name: string; castMemberId: string }>>([]);
  const [tokenType, setTokenType] = useState<"hashtag" | "keyword" | "mention">("hashtag");
  const [tokenSearch, setTokenSearch] = useState("");
  const [timeGranularity, setTimeGranularity] = useState<"hourly" | "daily" | "weekly">("daily");
  const [soundSearch, setSoundSearch] = useState("");
  const [selectedSoundId, setSelectedSoundId] = useState("");

  const [overview, setOverview] = useState<TikTokOverviewPayload | null>(null);
  const [castPayload, setCastPayload] = useState<TikTokCastPayload | null>(null);
  const [tokenPayload, setTokenPayload] = useState<TikTokTokenPayload | null>(null);
  const [soundsPayload, setSoundsPayload] = useState<TikTokSoundsPayload | null>(null);
  const [soundDetailPayload, setSoundDetailPayload] = useState<TikTokSoundDetailPayload | null>(null);
  const [soundPostsPayload, setSoundPostsPayload] = useState<TikTokSoundPostsPayload | null>(null);
  const [healthPayload, setHealthPayload] = useState<TikTokContentHealthPayload | null>(null);
  const [sentimentPayload, setSentimentPayload] = useState<TikTokSentimentPayload | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPostDetail, setSelectedPostDetail] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Array<{ name: string; castMemberId: string }>;
      if (!Array.isArray(parsed)) return;
      setSavedPresets(parsed.filter((item) => item && item.name && item.castMemberId));
    } catch {
      // ignore malformed client state
    }
  }, []);

  const savePresets = useCallback((next: Array<{ name: string; castMemberId: string }>) => {
    setSavedPresets(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // best effort only
    }
  }, []);

  const basePath = `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/tiktok`;

  const fetchJson = useCallback(async (path: string, params: URLSearchParams): Promise<Record<string, unknown>> => {
    params.set("season_id", seasonId);
    const response = await fetchAdminWithAuth(`${basePath}${path}?${params.toString()}`, {
      cache: "no-store",
    }, {
      allowDevAdminBypass: true,
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "TikTok analytics request failed"));
    }
    return (await response.json()) as Record<string, unknown>;
  }, [basePath, seasonId]);

  const refreshCastMembers = useCallback(async () => {
    const params = queryWithFilters(new URLSearchParams(), {
      dateStart,
      dateEnd,
      castMemberId: "",
      hashtag: "",
      keyword: "",
      soundId: "",
    });
    const payload = (await fetchJson("/cast-members", params)) as unknown as TikTokCastPayload;
    setCastPayload(payload);
  }, [dateEnd, dateStart, fetchJson]);

  const refreshByView = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshCastMembers();
      if (analyticsView === "tiktok-overview") {
        const params = queryWithFilters(new URLSearchParams(), {
          dateStart,
          dateEnd,
          castMemberId,
          hashtag,
          keyword,
          soundId,
        });
        const payload = (await fetchJson("/overview", params)) as unknown as TikTokOverviewPayload;
        setOverview(payload);
      } else if (analyticsView === "tiktok-hashtags") {
        const params = queryWithFilters(new URLSearchParams(), {
          dateStart,
          dateEnd,
          castMemberId: "",
          hashtag: "",
          keyword: "",
          soundId: "",
        });
        params.set("token_type", tokenType);
        const payload = (await fetchJson("/hashtags", params)) as unknown as TikTokTokenPayload;
        setTokenPayload(payload);
      } else if (analyticsView === "tiktok-sounds") {
        const params = queryWithFilters(new URLSearchParams(), {
          dateStart,
          dateEnd,
          castMemberId: "",
          hashtag: "",
          keyword: "",
          soundId: "",
        });
        if (asQueryValue(soundSearch)) {
          params.set("search", soundSearch.trim());
        }
        params.set("limit", "100");
        const payload = (await fetchJson("/sounds", params)) as unknown as TikTokSoundsPayload;
        setSoundsPayload(payload);
      } else if (analyticsView === "tiktok-health") {
        const params = queryWithFilters(new URLSearchParams(), {
          dateStart,
          dateEnd,
          castMemberId,
          hashtag,
          keyword,
          soundId,
        });
        params.set("limit", "100");
        const payload = (await fetchJson("/content-health", params)) as unknown as TikTokContentHealthPayload;
        setHealthPayload(payload);
      } else if (analyticsView === "tiktok-sentiment") {
        const params = queryWithFilters(new URLSearchParams(), {
          dateStart,
          dateEnd,
          castMemberId: "",
          hashtag: "",
          keyword: "",
          soundId: "",
        });
        const payload = (await fetchJson("/sentiment-trends", params)) as unknown as TikTokSentimentPayload;
        setSentimentPayload(payload);
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to load TikTok analytics");
    } finally {
      setLoading(false);
    }
  }, [
    analyticsView,
    castMemberId,
    dateEnd,
    dateStart,
    fetchJson,
    hashtag,
    keyword,
    refreshCastMembers,
    soundId,
    soundSearch,
    tokenType,
  ]);

  useEffect(() => {
    void refreshByView();
  }, [refreshByView]);

  useEffect(() => {
    if (analyticsView !== "tiktok-sounds") return;
    const activeSoundId = asQueryValue(selectedSoundId) ?? asQueryValue(soundId);
    if (!activeSoundId) {
      setSoundDetailPayload(null);
      setSoundPostsPayload(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const [detail, posts] = await Promise.all([
          fetchJson(`/sounds/${encodeURIComponent(activeSoundId)}`, new URLSearchParams()),
          fetchJson(`/sounds/${encodeURIComponent(activeSoundId)}/posts`, new URLSearchParams("limit=120")),
        ]);
        if (cancelled) return;
        setSoundDetailPayload(detail as unknown as TikTokSoundDetailPayload);
        setSoundPostsPayload(posts as unknown as TikTokSoundPostsPayload);
      } catch {
        if (!cancelled) {
          setSoundDetailPayload(null);
          setSoundPostsPayload(null);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [analyticsView, fetchJson, selectedSoundId, soundId]);

  const tokenRows = useMemo(() => {
    const rows = tokenPayload?.tokens ?? [];
    const query = tokenSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => row.token.toLowerCase().includes(query) || row.normalized_token.includes(query));
  }, [tokenPayload, tokenSearch]);

  const timeSeriesRows = useMemo(() => {
    if (!overview?.time_series) return [] as TimeSeriesPoint[];
    return (
      (timeGranularity === "hourly"
        ? overview.time_series.hourly
        : timeGranularity === "weekly"
          ? overview.time_series.weekly
          : overview.time_series.daily) ?? []
    );
  }, [overview, timeGranularity]);

  const applyPreset = useCallback((presetCastMemberId: string) => {
    setCastMemberId(presetCastMemberId);
  }, []);

  const saveCurrentPreset = useCallback(() => {
    const selectedId = asQueryValue(castMemberId);
    if (!selectedId) return;
    const selectedCast = (castPayload?.cast_members ?? []).find((item) => item.cast_member_id === selectedId);
    const name = selectedCast?.cast_member_name ?? `Cast ${selectedId.slice(0, 8)}`;
    const deduped = savedPresets.filter((item) => item.castMemberId !== selectedId);
    savePresets([{ name, castMemberId: selectedId }, ...deduped].slice(0, 8));
  }, [castMemberId, castPayload?.cast_members, savePresets, savedPresets]);

  const removePreset = useCallback((presetCastMemberId: string) => {
    savePresets(savedPresets.filter((item) => item.castMemberId !== presetCastMemberId));
  }, [savePresets, savedPresets]);

  const openPostDetail = useCallback(async (postId: string) => {
    setDetailLoading(true);
    try {
      const payload = await fetchJson(`/posts/${encodeURIComponent(postId)}/detail`, new URLSearchParams());
      setSelectedPostDetail(payload);
    } catch {
      setSelectedPostDetail({ error: "Failed to load post detail" });
    } finally {
      setDetailLoading(false);
    }
  }, [fetchJson]);

  const totalTokenUses = tokenRows.reduce((sum, row) => sum + Number(row.use_count || 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">TikTok Analytics</p>
            <h3 className="text-xl font-bold text-zinc-900">{showName} · Season {seasonNumber}</h3>
          </div>
          <button
            type="button"
            onClick={() => void refreshByView()}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Date Start
            <input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} className="mt-1 block w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Date End
            <input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} className="mt-1 block w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Cast Member
            <select value={castMemberId} onChange={(event) => setCastMemberId(event.target.value)} className="mt-1 block w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800">
              <option value="">All Cast</option>
              {(castPayload?.cast_members ?? []).map((item) => (
                <option key={item.cast_member_id ?? item.cast_member_name} value={item.cast_member_id ?? ""}>
                  {item.cast_member_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Hashtag
            <input value={hashtag} onChange={(event) => setHashtag(event.target.value)} placeholder="#RHOSLC" className="mt-1 block w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Keyword
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Lisa" className="mt-1 block w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800" />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Sound ID
            <input value={soundId} onChange={(event) => setSoundId(event.target.value)} placeholder="7540327234013301517" className="mt-1 block w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800" />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(castPayload?.cast_members ?? []).slice(0, 8).map((member) => (
            <button
              key={`chip-${member.cast_member_id ?? member.cast_member_name}`}
              type="button"
              onClick={() => setCastMemberId(member.cast_member_id ?? "")}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${castMemberId === (member.cast_member_id ?? "") ? "border-zinc-800 bg-zinc-800 text-white" : "border-zinc-300 bg-white text-zinc-700"}`}
            >
              {member.cast_member_name}
            </button>
          ))}
          <button
            type="button"
            onClick={saveCurrentPreset}
            disabled={!asQueryValue(castMemberId)}
            className="rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 disabled:opacity-40"
          >
            Save Cast Preset
          </button>
          {savedPresets.map((preset) => (
            <span key={`preset-${preset.castMemberId}`} className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs">
              <button type="button" onClick={() => applyPreset(preset.castMemberId)} className="font-semibold text-zinc-700">{preset.name}</button>
              <button type="button" onClick={() => removePreset(preset.castMemberId)} className="text-zinc-400 hover:text-zinc-700">x</button>
            </span>
          ))}
        </div>
      </section>

      {loading && <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">Loading TikTok analytics...</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!loading && analyticsView === "tiktok-overview" && overview && (
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Views", overview.kpis.views, overview.wow_delta_pct.views],
              ["Likes", overview.kpis.likes, overview.wow_delta_pct.likes],
              ["Comments", overview.kpis.comments, overview.wow_delta_pct.comments],
              ["Saves", overview.kpis.saves, overview.wow_delta_pct.saves],
            ].map(([label, value, delta]) => (
              <article key={String(label)} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{numberFormatter.format(Number(value || 0))}</p>
                <p className="mt-1 text-xs text-zinc-500">WoW {pct(delta as number | null)}</p>
              </article>
            ))}
          </div>
          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-zinc-900">Time Series</h4>
              <div className="inline-flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                {(["hourly", "daily", "weekly"] as const).map((value) => (
                  <button key={value} type="button" onClick={() => setTimeGranularity(value)} className={`rounded px-2 py-1 ${timeGranularity === value ? "bg-white text-zinc-900" : "text-zinc-600"}`}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
            {timeSeriesRows.length === 0 ? (
              <p className="text-sm text-zinc-500">No {timeGranularity} performance data for this filter set.</p>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500">
                      <th className="px-2 py-1">Period</th>
                      <th className="px-2 py-1">Posts</th>
                      <th className="px-2 py-1">Views</th>
                      <th className="px-2 py-1">Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSeriesRows.map((row) => (
                      <tr key={row.period_start} className="border-t border-zinc-100">
                        <td className="px-2 py-1 text-zinc-700">{formatDate(row.period_start)}</td>
                        <td className="px-2 py-1 text-zinc-700">{numberFormatter.format(row.posts)}</td>
                        <td className="px-2 py-1 text-zinc-700">{numberFormatter.format(row.views)}</td>
                        <td className="px-2 py-1 text-zinc-700">{(row.engagement_rate * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      )}

      {!loading && analyticsView === "tiktok-cast" && castPayload && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h4 className="mb-3 text-lg font-semibold text-zinc-900">Cast Member Performance Matrix</h4>
          {(castPayload.cast_members ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No cast member attributions found for this range.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="px-2 py-1">Cast Member</th>
                    <th className="px-2 py-1">Post Count</th>
                    <th className="px-2 py-1">Avg Engagement</th>
                    <th className="px-2 py-1">Top Post Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {castPayload.cast_members.map((member) => (
                    <tr key={member.cast_member_id ?? member.cast_member_name} className="border-t border-zinc-100">
                      <td className="px-2 py-1 font-semibold text-zinc-800">{member.cast_member_name}</td>
                      <td className="px-2 py-1">{numberFormatter.format(member.post_count)}</td>
                      <td className="px-2 py-1">{numberFormatter.format(Math.round(member.avg_engagement))}</td>
                      <td className="px-2 py-1">{numberFormatter.format(member.top_post_engagement)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!loading && analyticsView === "tiktok-hashtags" && tokenPayload && (
        <section className="space-y-4">
          <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Token Type
                <select value={tokenType} onChange={(event) => setTokenType(event.target.value as "hashtag" | "keyword" | "mention")} className="ml-2 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700">
                  <option value="hashtag">Hashtags</option>
                  <option value="keyword">Keywords</option>
                  <option value="mention">Mentions</option>
                </select>
              </label>
              <input value={tokenSearch} onChange={(event) => setTokenSearch(event.target.value)} placeholder="Search token" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-700" />
            </div>
            {tokenRows.length === 0 ? (
              <p className="text-sm text-zinc-500">No token data for this filter set.</p>
            ) : (
              <div className="space-y-2">
                {tokenRows.slice(0, 120).map((row) => {
                  const contribution = totalTokenUses > 0 ? (row.use_count / totalTokenUses) * 100 : 0;
                  return (
                    <div key={`${row.token}-${row.normalized_token}`} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-zinc-800">{row.token}</span>
                        <span className="text-zinc-600">{row.use_count} uses · {row.post_count} posts · {contribution.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>
      )}

      {!loading && analyticsView === "tiktok-sounds" && (
        <section className="grid gap-4 xl:grid-cols-5">
          <article className="xl:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-lg font-semibold text-zinc-900">Sound Reuse Intelligence</h4>
              <input value={soundSearch} onChange={(event) => setSoundSearch(event.target.value)} placeholder="Search sound" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-700" />
            </div>
            <div className="space-y-2">
              {(soundsPayload?.sounds ?? []).map((sound) => (
                <button
                  key={sound.sound_id}
                  type="button"
                  onClick={() => {
                    setSelectedSoundId(sound.sound_id);
                    setSoundId(sound.sound_id);
                  }}
                  className={`block w-full rounded-lg border px-3 py-2 text-left ${
                    (selectedSoundId || soundId) === sound.sound_id ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-zinc-50 text-zinc-800"
                  }`}
                >
                  <p className="text-sm font-semibold">{sound.title ?? sound.sound_id}</p>
                  <p className="text-xs opacity-80">Usage {numberFormatter.format(sound.usage_count)} · Creator posts {numberFormatter.format(sound.creator_post_count)}</p>
                </button>
              ))}
              {(soundsPayload?.sounds?.length ?? 0) === 0 && (
                <p className="text-sm text-zinc-500">No sounds found for this season filter.</p>
              )}
            </div>
          </article>
          <article className="xl:col-span-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            {soundDetailPayload?.sound ? (
              <div className="space-y-3">
                <div>
                  <h4 className="text-lg font-semibold text-zinc-900">{soundDetailPayload.sound.title ?? soundDetailPayload.sound.sound_id}</h4>
                  <p className="text-sm text-zinc-500">{soundDetailPayload.sound.artist_name ?? "Unknown artist"}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm"><p className="text-xs text-zinc-500">Usage on Other Posts</p><p className="font-semibold text-zinc-900">{numberFormatter.format(soundDetailPayload.sound.usage_count)}</p></div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm"><p className="text-xs text-zinc-500">Creator Posts</p><p className="font-semibold text-zinc-900">{numberFormatter.format(soundDetailPayload.sound.creator_post_count)}</p></div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm"><p className="text-xs text-zinc-500">Related Posts Ingested</p><p className="font-semibold text-zinc-900">{numberFormatter.format(soundPostsPayload?.posts.length ?? 0)}</p></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(soundPostsPayload?.posts ?? []).slice(0, 30).map((post) => (
                    <div key={post.platform_post_id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                      {post.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.thumbnail_url} alt="TikTok post thumbnail" loading="lazy" className="h-36 w-full rounded object-cover" />
                      ) : (
                        <div className="flex h-36 items-center justify-center rounded bg-zinc-200 text-xs text-zinc-600">No thumbnail</div>
                      )}
                      <p className="mt-2 line-clamp-2 text-xs text-zinc-700">{post.caption ?? "(No caption)"}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">Views {numberFormatter.format(post.views)} · Likes {numberFormatter.format(post.likes)}</p>
                      <button type="button" onClick={() => void openPostDetail(post.platform_post_id)} className="mt-2 rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100">
                        Post Detail
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Select a sound to load sound usage and related posts from the TikTok sound page ingest.</p>
            )}
          </article>
        </section>
      )}

      {!loading && analyticsView === "tiktok-health" && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h4 className="mb-3 text-lg font-semibold text-zinc-900">Content Health Board</h4>
          {(healthPayload?.posts ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No underperforming posts matched the selected filter set.</p>
          ) : (
            <div className="space-y-2">
              {(healthPayload?.posts ?? []).map((post) => (
                <div key={post.post_id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-900">{post.source_account ? `@${post.source_account}` : "Creator"} · {formatDate(post.posted_at)}</p>
                    <p className="text-xs text-zinc-500">Health {post.health_score.toFixed(1)}</p>
                  </div>
                  <p className="mt-1 text-sm text-zinc-700 line-clamp-2">{post.caption ?? "(No caption)"}</p>
                  <p className="mt-1 text-xs text-zinc-500">Views {numberFormatter.format(post.metrics.views)} · Saves {numberFormatter.format(post.metrics.saves)} · Comments {numberFormatter.format(post.metrics.comments)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {post.reason_flags.map((flag) => (
                      <span key={`${post.post_id}-${flag}`} className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">{flag.replaceAll("_", " ")}</span>
                    ))}
                  </div>
                  <button type="button" onClick={() => void openPostDetail(post.post_id)} className="mt-2 rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100">
                    Post Detail
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && analyticsView === "tiktok-sentiment" && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h4 className="mb-3 text-lg font-semibold text-zinc-900">Sentiment and Controversy Trends</h4>
          {(sentimentPayload?.timeline ?? []).length === 0 ? (
            <p className="text-sm text-zinc-500">No sentiment timeline records available for this date range.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="px-2 py-1">Day</th>
                    <th className="px-2 py-1">Positive</th>
                    <th className="px-2 py-1">Negative</th>
                    <th className="px-2 py-1">Toxicity</th>
                    <th className="px-2 py-1">Controversy</th>
                  </tr>
                </thead>
                <tbody>
                  {(sentimentPayload?.timeline ?? []).map((point) => (
                    <tr key={point.day} className="border-t border-zinc-100">
                      <td className="px-2 py-1 text-zinc-700">{point.day}</td>
                      <td className="px-2 py-1">{numberFormatter.format(point.positive_count)}</td>
                      <td className="px-2 py-1">{numberFormatter.format(point.negative_count)}</td>
                      <td className="px-2 py-1">{numberFormatter.format(point.toxicity_count)}</td>
                      <td className="px-2 py-1 font-semibold text-zinc-900">{point.controversy_score.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {selectedPostDetail && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-zinc-200 bg-white p-5 shadow-2xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-lg font-semibold text-zinc-900">Post Detail</h4>
            <button type="button" onClick={() => setSelectedPostDetail(null)} className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700">Close</button>
          </div>
          {detailLoading ? (
            <p className="text-sm text-zinc-500">Loading post detail...</p>
          ) : (
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
              {JSON.stringify(selectedPostDetail, null, 2)}
            </pre>
          )}
        </aside>
      )}
    </div>
  );
}
