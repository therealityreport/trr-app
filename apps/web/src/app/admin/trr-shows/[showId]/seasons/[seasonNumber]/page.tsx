"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import { ImageScrapeDrawer } from "@/components/admin/ImageScrapeDrawer";
import { TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import { mapSeasonAssetToMetadata, type PhotoMetadata } from "@/lib/photo-metadata";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

interface TrrShow {
  id: string;
  name: string;
  imdb_id: string | null;
  tmdb_id: number | null;
}

interface TrrSeason {
  id: string;
  show_id: string;
  season_number: number;
  name: string | null;
  title: string | null;
  overview: string | null;
  air_date: string | null;
  premiere_date: string | null;
  tmdb_season_id: number | null;
}

interface TrrEpisode {
  id: string;
  season_number: number;
  episode_number: number;
  title: string | null;
  synopsis: string | null;
  overview: string | null;
  air_date: string | null;
  runtime: number | null;
  imdb_rating: number | null;
  imdb_vote_count: number | null;
  tmdb_vote_average: number | null;
  tmdb_vote_count: number | null;
  url_original_still: string | null;
  tmdb_episode_id: number | null;
  imdb_episode_id: string | null;
}

interface SeasonCastMember {
  person_id: string;
  person_name: string | null;
  episodes_in_season: number;
  total_episodes: number | null;
  photo_url: string | null;
}

type TabId = "episodes" | "media" | "cast";

function GalleryImage({
  src,
  alt,
  sizes = "200px",
  className = "object-cover",
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-100 text-zinc-400">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      unoptimized
      onError={() => setHasError(true)}
    />
  );
}

function CastPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <GalleryImage
      src={src}
      alt={alt}
      sizes="200px"
      className="object-cover transition hover:scale-105"
    />
  );
}

function mapEpisodeToMetadata(episode: TrrEpisode, showName?: string): PhotoMetadata {
  const fileTypeMatch = episode.url_original_still?.match(/\.([a-z0-9]+)$/i);
  const fileType = fileTypeMatch ? fileTypeMatch[1].toLowerCase() : null;
  const createdAt = episode.air_date ? new Date(episode.air_date) : null;
  return {
    source: "tmdb",
    sourceBadgeColor: "#01d277",
    fileType,
    caption: episode.title || `Episode ${episode.episode_number}`,
    dimensions: null,
    createdAt,
    season: episode.season_number,
    contextType: `Episode ${episode.episode_number}`,
    people: [],
    titles: showName ? [showName] : [],
    fetchedAt: null,
  };
}

export default function SeasonDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const showId = params.showId as string;
  const seasonNumberParam = params.seasonNumber as string;
  const seasonNumber = Number.parseInt(seasonNumberParam, 10);
  const { user, checking, hasAccess } = useAdminGuard();

  const [show, setShow] = useState<TrrShow | null>(null);
  const [season, setSeason] = useState<TrrSeason | null>(null);
  const [episodes, setEpisodes] = useState<TrrEpisode[]>([]);
  const [assets, setAssets] = useState<SeasonAsset[]>([]);
  const [cast, setCast] = useState<SeasonCastMember[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("episodes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingAssets, setRefreshingAssets] = useState(false);

  const [episodeLightbox, setEpisodeLightbox] = useState<{
    episode: TrrEpisode;
    index: number;
    seasonEpisodes: TrrEpisode[];
  } | null>(null);
  const episodeTriggerRef = useRef<HTMLElement | null>(null);

  const [assetLightbox, setAssetLightbox] = useState<{
    asset: SeasonAsset;
    index: number;
    filteredAssets: SeasonAsset[];
  } | null>(null);
  const assetTriggerRef = useRef<HTMLElement | null>(null);

  const [scrapeDrawerOpen, setScrapeDrawerOpen] = useState(false);

  const tabParam = searchParams.get("tab");
  useEffect(() => {
    const allowedTabs: TabId[] = ["episodes", "media", "cast"];
    if (tabParam && allowedTabs.includes(tabParam as TabId)) {
      setActiveTab(tabParam as TabId);
    }
  }, [tabParam]);

  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const loadSeasonData = useCallback(async () => {
    if (!Number.isFinite(seasonNumber)) {
      setError("Invalid season number");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const headers = await getAuthHeaders();

      const [showResponse, seasonsResponse] = await Promise.all([
        fetch(`/api/admin/trr-api/shows/${showId}`, { headers }),
        fetch(`/api/admin/trr-api/shows/${showId}/seasons?limit=50`, { headers }),
      ]);

      if (!showResponse.ok) throw new Error("Failed to fetch show");
      if (!seasonsResponse.ok) throw new Error("Failed to fetch seasons");

      const showData = await showResponse.json();
      const seasonsData = await seasonsResponse.json();
      setShow(showData.show);

      const foundSeason = (seasonsData.seasons as TrrSeason[]).find(
        (s) => s.season_number === seasonNumber
      );

      if (!foundSeason) {
        setError("Season not found");
        setSeason(null);
        setEpisodes([]);
        setAssets([]);
        setCast([]);
        setLoading(false);
        return;
      }

      setSeason(foundSeason);

      const [episodesResponse, assetsResponse, castResponse] = await Promise.all([
        fetch(`/api/admin/trr-api/seasons/${foundSeason.id}/episodes?limit=500`, { headers }),
        fetch(`/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/assets`, { headers }),
        fetch(`/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/cast?limit=500`, { headers }),
      ]);

      if (!episodesResponse.ok) throw new Error("Failed to fetch episodes");
      if (!assetsResponse.ok) throw new Error("Failed to fetch season media");
      if (!castResponse.ok) throw new Error("Failed to fetch season cast");

      const episodesData = await episodesResponse.json();
      const assetsData = await assetsResponse.json();
      const castData = await castResponse.json();

      setEpisodes(episodesData.episodes ?? []);
      setAssets(assetsData.assets ?? []);
      setCast(castData.cast ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load season");
    } finally {
      setLoading(false);
    }
  }, [showId, seasonNumber, getAuthHeaders]);

  useEffect(() => {
    if (!hasAccess) return;
    loadSeasonData();
  }, [hasAccess, loadSeasonData]);

  const fetchAssets = useCallback(async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/assets`,
      { headers }
    );
    if (!response.ok) throw new Error("Failed to fetch season media");
    const data = await response.json();
    setAssets(data.assets ?? []);
  }, [showId, seasonNumber, getAuthHeaders]);

  const handleRefreshImages = useCallback(async () => {
    if (refreshingAssets) return;
    setRefreshingAssets(true);
    try {
      await fetchAssets();
    } catch (err) {
      console.error("Failed to refresh images:", err);
    } finally {
      setRefreshingAssets(false);
    }
  }, [refreshingAssets, fetchAssets]);

  const openEpisodeLightbox = (
    episode: TrrEpisode,
    index: number,
    seasonEpisodes: TrrEpisode[],
    triggerElement: HTMLElement
  ) => {
    episodeTriggerRef.current = triggerElement;
    setEpisodeLightbox({ episode, index, seasonEpisodes });
  };

  const navigateEpisodeLightbox = (direction: "prev" | "next") => {
    if (!episodeLightbox) return;
    const { index, seasonEpisodes } = episodeLightbox;
    const newIndex = direction === "prev" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < seasonEpisodes.length) {
      setEpisodeLightbox({
        episode: seasonEpisodes[newIndex],
        index: newIndex,
        seasonEpisodes,
      });
    }
  };

  const closeEpisodeLightbox = () => {
    setEpisodeLightbox(null);
  };

  const openAssetLightbox = (
    asset: SeasonAsset,
    index: number,
    filteredAssets: SeasonAsset[],
    triggerElement: HTMLElement
  ) => {
    assetTriggerRef.current = triggerElement;
    setAssetLightbox({ asset, index, filteredAssets });
  };

  const navigateAssetLightbox = (direction: "prev" | "next") => {
    if (!assetLightbox) return;
    const { index, filteredAssets } = assetLightbox;
    const newIndex = direction === "prev" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < filteredAssets.length) {
      setAssetLightbox({
        asset: filteredAssets[newIndex],
        index: newIndex,
        filteredAssets,
      });
    }
  };

  const closeAssetLightbox = () => {
    setAssetLightbox(null);
  };

  const totalEpisodes = episodes.length;
  const groupedCast = useMemo(() => {
    const main: SeasonCastMember[] = [];
    const recurring: SeasonCastMember[] = [];
    const guest: SeasonCastMember[] = [];

    for (const member of cast) {
      if (totalEpisodes > 0 && member.episodes_in_season > totalEpisodes / 2) {
        main.push(member);
      } else if (
        member.episodes_in_season >= 3 &&
        (totalEpisodes === 0 || member.episodes_in_season < totalEpisodes / 2)
      ) {
        recurring.push(member);
      } else {
        guest.push(member);
      }
    }

    return { main, recurring, guest };
  }, [cast, totalEpisodes]);

  const hasEpisodeCounts = useMemo(
    () => cast.some((member) => member.episodes_in_season > 0),
    [cast]
  );

  const formatEpisodesLabel = (count: number) =>
    count > 0 ? `${count} episodes this season` : "Appeared this season";

  const isSeasonBackdrop = (asset: SeasonAsset) => {
    if (asset.kind === "backdrop") return true;
    const metadata = asset.metadata;
    if (!metadata || typeof metadata !== "object") return false;
    const meta = metadata as Record<string, unknown>;
    if (meta.season_backdrop === true) return true;
    const roles = meta.image_roles;
    return Array.isArray(roles) && roles.includes("backdrop");
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading season data...</p>
        </div>
      </div>
    );
  }

  if (error || !show || !season) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">
            {error || "Season not found"}
          </p>
          <Link
            href={`/admin/trr-shows/${showId}?tab=seasons`}
            className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Back to Show
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white px-6 py-5">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <Link
                href={`/admin/trr-shows/${showId}?tab=seasons`}
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                ← Back to Show
              </Link>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Season
                </p>
                <h1 className="text-3xl font-bold text-zinc-900">
                  {show.name} · Season {season.season_number}
                </h1>
                {season.overview && (
                  <p className="mt-2 text-sm text-zinc-600 max-w-3xl">
                    {season.overview}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {show.tmdb_id && (
                  <TmdbLinkIcon
                    showTmdbId={show.tmdb_id}
                    seasonNumber={season.season_number}
                    type="season"
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <nav className="flex gap-6">
              {(
                [
                  { id: "episodes", label: "Episodes" },
                  { id: "media", label: "Media" },
                  { id: "cast", label: "Cast" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 py-4 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {activeTab === "episodes" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Episodes
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    Season {season.season_number}
                  </h3>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                  {episodes.length} episodes
                </span>
              </div>

              <div className="space-y-3">
                {episodes.map((episode) => (
                  <div
                    key={episode.id}
                    className="flex items-start gap-4 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4"
                  >
                    {episode.url_original_still && (
                      <button
                        onClick={(e) => {
                          const episodesWithStills = episodes.filter((ep) => ep.url_original_still);
                          const idx = episodesWithStills.findIndex((ep) => ep.id === episode.id);
                          openEpisodeLightbox(episode, idx, episodesWithStills, e.currentTarget);
                        }}
                        className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <GalleryImage
                          src={episode.url_original_still}
                          alt={episode.title || `Episode ${episode.episode_number}`}
                          sizes="112px"
                        />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-zinc-500">
                              Episode {episode.episode_number}
                            </p>
                            {show.tmdb_id && episode.tmdb_episode_id && (
                              <TmdbLinkIcon
                                showTmdbId={show.tmdb_id}
                                seasonNumber={episode.season_number}
                                episodeNumber={episode.episode_number}
                                type="episode"
                              />
                            )}
                            {episode.imdb_episode_id && (
                              <ImdbLinkIcon imdbId={episode.imdb_episode_id} type="title" />
                            )}
                          </div>
                          <p className="font-semibold text-zinc-900">
                            {episode.title || "Untitled"}
                          </p>
                        </div>
                        {episode.imdb_rating && (
                          <span className="flex items-center gap-1 text-sm text-zinc-600">
                            <span className="text-yellow-500">★</span>
                            {episode.imdb_rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {(episode.synopsis || episode.overview) && (
                        <p className="mt-1 text-sm text-zinc-600 line-clamp-2">
                          {episode.synopsis || episode.overview}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                        {episode.air_date && (
                          <span>{new Date(episode.air_date).toLocaleDateString()}</span>
                        )}
                        {episode.runtime && <span>{episode.runtime} min</span>}
                        {episode.tmdb_vote_average && (
                          <span>TMDB {episode.tmdb_vote_average.toFixed(1)}</span>
                        )}
                        {episode.imdb_vote_count && (
                          <span>IMDB votes {episode.imdb_vote_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {episodes.length === 0 && (
                  <p className="text-sm text-zinc-500">No episodes found for this season.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "media" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Season Media
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    {show.name} · Season {season.season_number}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleRefreshImages}
                    disabled={refreshingAssets}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-4M4 16a8 8 0 0014 4" />
                    </svg>
                    {refreshingAssets ? "Refreshing..." : "Refresh Images"}
                  </button>
                  <button
                    onClick={() => setScrapeDrawerOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Import Images
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                {assets.filter((a) => a.type === "season" && isSeasonBackdrop(a)).length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Season Backdrops</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {assets
                        .filter((a) => a.type === "season" && isSeasonBackdrop(a))
                        .map((asset, i, arr) => (
                          <button
                            key={`${asset.id}-${i}`}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-[16/9] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={asset.hosted_url}
                              alt={asset.caption || "Season backdrop"}
                              sizes="300px"
                              className="object-cover"
                            />
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {assets.filter((a) => a.type === "season").length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Season Posters</h4>
                    <div className="grid grid-cols-4 gap-4">
                      {assets
                        .filter((a) => a.type === "season")
                        .map((asset, i, arr) => (
                          <button
                            key={`${asset.id}-${i}`}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={asset.hosted_url}
                              alt={asset.caption || "Season poster"}
                              sizes="180px"
                            />
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {assets.filter((a) => a.type === "episode").length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Episode Stills</h4>
                    <div className="grid grid-cols-6 gap-3">
                      {assets
                        .filter((a) => a.type === "episode")
                        .map((asset, i, arr) => (
                          <button
                            key={`${asset.id}-${i}`}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-video overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={asset.hosted_url}
                              alt={asset.caption || "Episode still"}
                              sizes="150px"
                            />
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {assets.filter((a) => a.type === "cast").length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Cast Photos</h4>
                    <div className="grid grid-cols-5 gap-4">
                      {assets
                        .filter((a) => a.type === "cast")
                        .map((asset, i, arr) => (
                          <button
                            key={`${asset.id}-${i}`}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={asset.hosted_url}
                              alt={asset.caption || "Cast photo"}
                              sizes="180px"
                            />
                            {asset.person_name && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <p className="truncate text-xs text-white">{asset.person_name}</p>
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {assets.length === 0 && (
                  <p className="text-sm text-zinc-500">No media found for this season.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "cast" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Cast
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    Season {season.season_number}
                  </h3>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                  {cast.length} members
                </span>
              </div>

              <div className="space-y-8">
                {!hasEpisodeCounts && cast.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Cast</h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {cast.map((member) => (
                        <Link
                          key={member.person_id}
                          href={`/admin/trr-shows/people/${member.person_id}?showId=${show.id}`}
                          className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 transition hover:border-zinc-300 hover:bg-zinc-100/50"
                        >
                          <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-200">
                            {member.photo_url ? (
                              <CastPhoto src={member.photo_url} alt={member.person_name || "Cast"} />
                            ) : (
                              <div className="flex h-full items-center justify-center text-zinc-400">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="font-semibold text-zinc-900">
                            {member.person_name || "Unknown"}
                          </p>
                          <p className="text-sm text-zinc-600">
                            {formatEpisodesLabel(member.episodes_in_season)}
                          </p>
                          {typeof member.total_episodes === "number" && (
                            <p className="text-xs text-zinc-500">
                              {member.total_episodes} total episodes
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {hasEpisodeCounts && groupedCast.main.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Main Cast</h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {groupedCast.main.map((member) => (
                        <Link
                          key={member.person_id}
                          href={`/admin/trr-shows/people/${member.person_id}?showId=${show.id}`}
                          className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 transition hover:border-zinc-300 hover:bg-zinc-100/50"
                        >
                          <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-200">
                            {member.photo_url ? (
                              <CastPhoto src={member.photo_url} alt={member.person_name || "Cast"} />
                            ) : (
                              <div className="flex h-full items-center justify-center text-zinc-400">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="font-semibold text-zinc-900">
                            {member.person_name || "Unknown"}
                          </p>
                          <p className="text-sm text-zinc-600">
                            {formatEpisodesLabel(member.episodes_in_season)}
                          </p>
                          {typeof member.total_episodes === "number" && (
                            <p className="text-xs text-zinc-500">
                              {member.total_episodes} total episodes
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {hasEpisodeCounts && groupedCast.recurring.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Recurring Cast</h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {groupedCast.recurring.map((member) => (
                        <Link
                          key={member.person_id}
                          href={`/admin/trr-shows/people/${member.person_id}?showId=${show.id}`}
                          className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 transition hover:border-zinc-300 hover:bg-zinc-100/50"
                        >
                          <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-200">
                            {member.photo_url ? (
                              <CastPhoto src={member.photo_url} alt={member.person_name || "Cast"} />
                            ) : (
                              <div className="flex h-full items-center justify-center text-zinc-400">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="font-semibold text-zinc-900">
                            {member.person_name || "Unknown"}
                          </p>
                          <p className="text-sm text-zinc-600">
                            {formatEpisodesLabel(member.episodes_in_season)}
                          </p>
                          {typeof member.total_episodes === "number" && (
                            <p className="text-xs text-zinc-500">
                              {member.total_episodes} total episodes
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {hasEpisodeCounts && groupedCast.guest.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Guest Appearances</h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {groupedCast.guest.map((member) => (
                        <Link
                          key={member.person_id}
                          href={`/admin/trr-shows/people/${member.person_id}?showId=${show.id}`}
                          className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 transition hover:border-zinc-300 hover:bg-zinc-100/50"
                        >
                          <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-200">
                            {member.photo_url ? (
                              <CastPhoto src={member.photo_url} alt={member.person_name || "Cast"} />
                            ) : (
                              <div className="flex h-full items-center justify-center text-zinc-400">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="font-semibold text-zinc-900">
                            {member.person_name || "Unknown"}
                          </p>
                          <p className="text-sm text-zinc-600">
                            {formatEpisodesLabel(member.episodes_in_season)}
                          </p>
                          {typeof member.total_episodes === "number" && (
                            <p className="text-xs text-zinc-500">
                              {member.total_episodes} total episodes
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {cast.length === 0 && (
                  <p className="text-sm text-zinc-500">No cast found for this season.</p>
                )}
              </div>
            </div>
          )}
        </main>

        {episodeLightbox && (
          <ImageLightbox
            src={episodeLightbox.episode.url_original_still || ""}
            alt={
              episodeLightbox.episode.title ||
              `Episode ${episodeLightbox.episode.episode_number}`
            }
            isOpen={true}
            onClose={closeEpisodeLightbox}
            metadata={mapEpisodeToMetadata(episodeLightbox.episode, show?.name)}
            position={{
              current: episodeLightbox.index + 1,
              total: episodeLightbox.seasonEpisodes.length,
            }}
            onPrevious={() => navigateEpisodeLightbox("prev")}
            onNext={() => navigateEpisodeLightbox("next")}
            hasPrevious={episodeLightbox.index > 0}
            hasNext={episodeLightbox.index < episodeLightbox.seasonEpisodes.length - 1}
            triggerRef={episodeTriggerRef as React.RefObject<HTMLElement | null>}
          />
        )}

        {assetLightbox && (
          <ImageLightbox
            src={assetLightbox.asset.hosted_url}
            alt={assetLightbox.asset.caption || "Gallery image"}
            isOpen={true}
            onClose={closeAssetLightbox}
            metadata={mapSeasonAssetToMetadata(assetLightbox.asset, seasonNumber, show?.name)}
            position={{
              current: assetLightbox.index + 1,
              total: assetLightbox.filteredAssets.length,
            }}
            onPrevious={() => navigateAssetLightbox("prev")}
            onNext={() => navigateAssetLightbox("next")}
            hasPrevious={assetLightbox.index > 0}
            hasNext={assetLightbox.index < assetLightbox.filteredAssets.length - 1}
            triggerRef={assetTriggerRef as React.RefObject<HTMLElement | null>}
          />
        )}

        <ImageScrapeDrawer
          isOpen={scrapeDrawerOpen}
          onClose={() => setScrapeDrawerOpen(false)}
          entityContext={{
            type: "season",
            showId: showId,
            showName: show?.name ?? "",
            seasonNumber: seasonNumber,
            seasonId: season?.id,
          }}
          onImportComplete={() => {
            loadSeasonData();
          }}
        />
      </div>
    </ClientOnly>
  );
}
