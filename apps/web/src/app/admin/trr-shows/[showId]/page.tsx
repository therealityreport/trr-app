"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";
import SocialPostsSection from "@/components/admin/social-posts-section";
import SurveysSection from "@/components/admin/surveys-section";
import { ExternalLinks, TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import { ImageScrapeDrawer, type SeasonContext } from "@/components/admin/ImageScrapeDrawer";
import type { PhotoMetadata } from "@/lib/photo-metadata";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

// Types
interface TrrShow {
  id: string;
  name: string;
  imdb_id: string | null;
  tmdb_id: number | null;
  show_total_seasons: number | null;
  show_total_episodes: number | null;
  description: string | null;
  premiere_date: string | null;
  networks: string[];
  genres: string[];
  tags: string[];
  tmdb_status: string | null;
  tmdb_vote_average: number | null;
  imdb_rating_value: number | null;
}

interface TrrSeason {
  id: string;
  show_id: string;
  season_number: number;
  name: string | null;
  title: string | null;
  overview: string | null;
  air_date: string | null;
  url_original_poster: string | null;
  tmdb_season_id: number | null;
}

interface TrrEpisode {
  id: string;
  season_number: number;
  episode_number: number;
  title: string | null;
  synopsis: string | null;
  air_date: string | null;
  runtime: number | null;
  imdb_rating: number | null;
  url_original_still: string | null;
  tmdb_episode_id: number | null;
  imdb_episode_id: string | null;
}

interface TrrCastMember {
  id: string;
  person_id: string;
  full_name: string | null;
  cast_member_name: string | null;
  role: string | null;
  billing_order: number | null;
  credit_category: string;
  photo_url: string | null;
  cover_photo_url: string | null;
}

type TabId = "seasons" | "gallery" | "cast" | "surveys" | "social" | "details";

// Generic gallery image with error handling - falls back to placeholder on broken images
function GalleryImage({
  src,
  alt,
  sizes = "200px",
  className = "object-cover",
  children,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  children?: React.ReactNode;
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
    <>
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        onError={() => setHasError(true)}
      />
      {children}
    </>
  );
}

// Cast photo with error handling - falls back to placeholder on broken images
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

function RefreshProgressBar({
  show,
  current,
  total,
}: {
  show: boolean;
  current?: number | null;
  total?: number | null;
}) {
  if (!show) return null;
  const hasProgress =
    typeof current === "number" &&
    typeof total === "number" &&
    total > 0 &&
    current >= 0;
  const percent = hasProgress
    ? Math.min(100, Math.round((current / total) * 100))
    : 0;

  return (
    <div className="mt-2 w-full">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
        {hasProgress ? (
          <div
            className="h-full rounded-full bg-zinc-700 transition-all"
            style={{ width: `${percent}%` }}
          />
        ) : (
          <div className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-zinc-700/70" />
        )}
      </div>
      {hasProgress && (
        <p className="mt-1 text-[11px] text-zinc-500">
          {current}/{total}
        </p>
      )}
    </div>
  );
}

// Helper to map episode to metadata format for lightbox display
function mapEpisodeToMetadata(episode: TrrEpisode, showName?: string): PhotoMetadata {
  const fileTypeMatch = episode.url_original_still?.match(/\.([a-z0-9]+)$/i);
  const fileType = fileTypeMatch ? fileTypeMatch[1].toLowerCase() : null;
  return {
    source: "tmdb",
    sourceBadgeColor: "#01d277",
    fileType,
    caption: episode.title || `Episode ${episode.episode_number}`,
    dimensions: null,
    season: episode.season_number,
    contextType: `Episode ${episode.episode_number}`,
    people: [],
    titles: showName ? [showName] : [],
    fetchedAt: null,
  };
}

export default function TrrShowDetailPage() {
  const params = useParams();
  const showId = params.showId as string;
  const { user, checking, hasAccess } = useAdminGuard();

  const [show, setShow] = useState<TrrShow | null>(null);
  const [seasons, setSeasons] = useState<TrrSeason[]>([]);
  const [cast, setCast] = useState<TrrCastMember[]>([]);
  const [episodes, setEpisodes] = useState<TrrEpisode[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("seasons");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lightbox state (for cast photos)
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  // Episode lightbox state - track episode and position within season
  const [episodeLightbox, setEpisodeLightbox] = useState<{
    episode: TrrEpisode;
    index: number;
    seasonEpisodes: TrrEpisode[];
  } | null>(null);
  const episodeTriggerRef = useRef<HTMLElement | null>(null);

  // Gallery state
  const [galleryAssets, setGalleryAssets] = useState<SeasonAsset[]>([]);
  const [selectedGallerySeason, setSelectedGallerySeason] = useState<
    number | "all"
  >("all");
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Gallery asset lightbox state
  const [assetLightbox, setAssetLightbox] = useState<{
    asset: SeasonAsset;
    index: number;
    filteredAssets: SeasonAsset[];
  } | null>(null);
  const assetTriggerRef = useRef<HTMLElement | null>(null);

  // Covered shows state
  const [isCovered, setIsCovered] = useState(false);
  const [coverageLoading, setCoverageLoading] = useState(false);

  // Image scrape drawer state
  const [scrapeDrawerOpen, setScrapeDrawerOpen] = useState(false);
  const [scrapeDrawerContext, setScrapeDrawerContext] = useState<SeasonContext | null>(null);

  // Refresh images state
  const [refreshingCastImages, setRefreshingCastImages] = useState(false);
  const [refreshCastProgress, setRefreshCastProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshingPersonIds, setRefreshingPersonIds] = useState<Record<string, boolean>>({});

  // Helper to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  // Refresh images for a person
  const refreshPersonImages = useCallback(async (personId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `/api/admin/trr-api/people/${personId}/refresh-images`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ skip_mirror: false }),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        data.error && data.detail
          ? `${data.error}: ${data.detail}`
          : data.error || data.detail || "Failed to refresh images";
      throw new Error(message);
    }

    return data;
  }, [getAuthHeaders]);

  const autoCountShowImages = useCallback(
    async (seasonNumber: number | "all") => {
      const headers = await getAuthHeaders();
      const payload: Record<string, unknown> = {};
      if (seasonNumber !== "all") {
        payload.season_number = seasonNumber;
      }

      const response = await fetch(
        `/api/admin/trr-api/shows/${showId}/auto-count-images`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to auto-count images";
        throw new Error(message);
      }
      return data as {
        assets_total?: number;
        assets_counted?: number;
        assets_skipped?: number;
        assets_failed?: number;
      };
    },
    [getAuthHeaders, showId]
  );

  // Fetch show details
  const fetchShow = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}`, { headers });
      if (!response.ok) throw new Error("Failed to fetch show");
      const data = await response.json();
      setShow(data.show);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load show");
    }
  }, [showId, getAuthHeaders]);

  // Fetch seasons
  const fetchSeasons = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/shows/${showId}/seasons?limit=50`,
        { headers }
      );
      if (!response.ok) throw new Error("Failed to fetch seasons");
      const data = await response.json();
      setSeasons(data.seasons);
      if (data.seasons.length > 0 && !selectedSeasonId) {
        setSelectedSeasonId(data.seasons[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch seasons:", err);
    }
  }, [showId, selectedSeasonId, getAuthHeaders]);

  // Fetch cast
  const fetchCast = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/shows/${showId}/cast?limit=50`,
        { headers }
      );
      if (!response.ok) throw new Error("Failed to fetch cast");
      const data = await response.json();
      setCast(data.cast);
    } catch (err) {
      console.error("Failed to fetch cast:", err);
    }
  }, [showId, getAuthHeaders]);

  // Fetch episodes for selected season
  const fetchEpisodes = useCallback(async (seasonId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/seasons/${seasonId}/episodes?limit=50`,
        { headers }
      );
      if (!response.ok) throw new Error("Failed to fetch episodes");
      const data = await response.json();
      setEpisodes(data.episodes);
    } catch (err) {
      console.error("Failed to fetch episodes:", err);
    }
  }, [getAuthHeaders]);

  // Check if show is covered
  const checkCoverage = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/covered-shows/${showId}`, { headers });
      setIsCovered(response.ok);
    } catch {
      setIsCovered(false);
    }
  }, [showId, getAuthHeaders]);

  // Add show to covered shows
  const addToCoveredShows = async () => {
    if (!show) return;
    setCoverageLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/covered-shows", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ trr_show_id: showId, show_name: show.name }),
      });
      if (response.ok) {
        setIsCovered(true);
      }
    } catch (err) {
      console.error("Failed to add to covered shows:", err);
    } finally {
      setCoverageLoading(false);
    }
  };

  // Remove show from covered shows
  const removeFromCoveredShows = async () => {
    setCoverageLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/covered-shows/${showId}`, {
        method: "DELETE",
        headers,
      });
      if (response.ok) {
        setIsCovered(false);
      }
    } catch (err) {
      console.error("Failed to remove from covered shows:", err);
    } finally {
      setCoverageLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!hasAccess) return;

    const loadData = async () => {
      setLoading(true);
      await fetchShow();
      await Promise.all([fetchSeasons(), fetchCast(), checkCoverage()]);
      setLoading(false);
    };

    loadData();
  }, [hasAccess, fetchShow, fetchSeasons, fetchCast, checkCoverage]);

  // Load episodes when season changes
  useEffect(() => {
    if (selectedSeasonId) {
      fetchEpisodes(selectedSeasonId);
    }
  }, [selectedSeasonId, fetchEpisodes]);

  // Open lightbox for cast photo
  const openLightbox = (src: string, alt: string) => {
    setLightboxImage({ src, alt });
    setLightboxOpen(true);
  };

  // Open lightbox for episode still
  const openEpisodeLightbox = (
    episode: TrrEpisode,
    index: number,
    seasonEpisodes: TrrEpisode[],
    triggerElement: HTMLElement
  ) => {
    episodeTriggerRef.current = triggerElement;
    setEpisodeLightbox({ episode, index, seasonEpisodes });
  };

  // Navigate between episodes in lightbox
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

  // Close episode lightbox
  const closeEpisodeLightbox = () => {
    setEpisodeLightbox(null);
  };

  // Load gallery assets for a season (or all seasons)
  const loadGalleryAssets = useCallback(
    async (seasonNumber: number | "all") => {
      setGalleryLoading(true);
      try {
        const headers = await getAuthHeaders();
        if (seasonNumber === "all") {
          // Fetch for all seasons
          const allAssets: SeasonAsset[] = [];
          for (const season of seasons) {
            const res = await fetch(
              `/api/admin/trr-api/shows/${showId}/seasons/${season.season_number}/assets`,
              { headers }
            );
            if (res.ok) {
              const data = await res.json();
              allAssets.push(...(data.assets || []));
            }
          }
          setGalleryAssets(allAssets);
        } else {
          const res = await fetch(
            `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/assets`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            setGalleryAssets(data.assets || []);
          }
        }
      } finally {
        setGalleryLoading(false);
      }
    },
    [showId, seasons, getAuthHeaders]
  );

  // Load gallery when tab becomes active or season filter changes
  useEffect(() => {
    if (activeTab === "gallery" && seasons.length > 0) {
      loadGalleryAssets(selectedGallerySeason);
    }
  }, [activeTab, selectedGallerySeason, loadGalleryAssets, seasons.length]);

  const refreshCastImages = useCallback(async () => {
    if (refreshingCastImages) return;

    const personIds = Array.from(
      new Set(cast.map((member) => member.person_id).filter(Boolean))
    );

    if (personIds.length === 0) {
      setRefreshError("No cast members available to refresh.");
      return;
    }

    setRefreshingCastImages(true);
    setRefreshCastProgress({ current: 0, total: personIds.length });
    setRefreshNotice(null);
    setRefreshError(null);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < personIds.length; i += 1) {
      const personId = personIds[i];
      setRefreshCastProgress({ current: i + 1, total: personIds.length });
      try {
        await refreshPersonImages(personId);
        successCount += 1;
      } catch (err) {
        failureCount += 1;
        console.error("Failed to refresh cast member images:", err);
      }
    }

    setRefreshingCastImages(false);
    setRefreshCastProgress(null);

    if (successCount > 0) {
      await fetchCast();
      if (activeTab === "gallery") {
        await loadGalleryAssets(selectedGallerySeason);
      }
    }

    let autoCountSummary: string | null = null;
    if (activeTab === "gallery") {
      try {
        const autoCount = await autoCountShowImages(selectedGallerySeason);
        if (autoCount && typeof autoCount === "object") {
          const total = typeof autoCount.assets_total === "number" ? autoCount.assets_total : null;
          const counted =
            typeof autoCount.assets_counted === "number" ? autoCount.assets_counted : null;
          if (total !== null && counted !== null) {
            autoCountSummary = `People counts: ${counted}/${total}`;
          }
        }
      } catch (err) {
        console.error("Failed to auto-count show images:", err);
        setRefreshError(
          err instanceof Error ? err.message : "Failed to auto-count show images"
        );
      }
    }

    setRefreshNotice(
      `Refreshed ${successCount}/${personIds.length} cast members${
        failureCount ? ` (${failureCount} failed)` : ""
      }.${autoCountSummary ? ` ${autoCountSummary}.` : ""}`
    );
  }, [
    cast,
    refreshPersonImages,
    refreshingCastImages,
    fetchCast,
    activeTab,
    loadGalleryAssets,
    selectedGallerySeason,
    autoCountShowImages,
  ]);

  const handleRefreshCastMember = useCallback(
    async (personId: string, label: string) => {
      if (!personId) return;

      setRefreshingPersonIds((prev) => ({ ...prev, [personId]: true }));
      setRefreshNotice(null);
      setRefreshError(null);

      try {
        await refreshPersonImages(personId);
        await fetchCast();
        setRefreshNotice(`Refreshed images for ${label}.`);
      } catch (err) {
        console.error("Failed to refresh person images:", err);
        setRefreshError(
          err instanceof Error ? err.message : "Failed to refresh images"
        );
      } finally {
        setRefreshingPersonIds((prev) => {
          const next = { ...prev };
          delete next[personId];
          return next;
        });
      }
    },
    [refreshPersonImages, fetchCast]
  );

  // Open lightbox for gallery asset
  const openAssetLightbox = (
    asset: SeasonAsset,
    index: number,
    filteredAssets: SeasonAsset[],
    triggerElement: HTMLElement
  ) => {
    assetTriggerRef.current = triggerElement;
    setAssetLightbox({ asset, index, filteredAssets });
  };

  // Navigate between assets in lightbox
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

  // Close asset lightbox
  const closeAssetLightbox = () => {
    setAssetLightbox(null);
  };

  // Map gallery asset to metadata for lightbox
  const mapAssetToMetadata = (asset: SeasonAsset): PhotoMetadata => {
    const SOURCE_COLORS: Record<string, string> = {
      imdb: "#f5c518",
      tmdb: "#01d277",
    };
    const fileTypeMatch = asset.hosted_url.match(/\.([a-z0-9]+)$/i);
    const fileType = fileTypeMatch ? fileTypeMatch[1].toLowerCase() : null;
    return {
      source: asset.source,
      sourceBadgeColor:
        SOURCE_COLORS[asset.source.toLowerCase()] ?? "#6b7280",
      fileType,
      caption: asset.caption,
      dimensions:
        asset.width && asset.height
          ? { width: asset.width, height: asset.height }
          : null,
      season: null, // SeasonAsset doesn't include season number
      contextType:
        asset.type === "episode"
          ? `Episode ${asset.episode_number}`
          : asset.type === "season"
            ? "Season Poster"
            : "Cast Photo",
      people: asset.person_name ? [asset.person_name] : [],
      titles: show?.name ? [show.name] : [],
      fetchedAt: null,
    };
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
          <p className="text-sm text-zinc-600">Loading show data...</p>
        </div>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">
            {error || "Show not found"}
          </p>
          <Link
            href="/admin/trr-shows"
            className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Back to Shows
          </Link>
        </div>
      </div>
    );
  }

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <header className="border-b border-zinc-200 bg-white px-6 py-5">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <Link
                href="/admin/trr-shows"
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                ← Back to Shows
              </Link>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  {show.networks?.slice(0, 2).join(" · ") || "TRR Core"}
                </p>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-zinc-900">
                    {show.name}
                  </h1>
                  {/* TMDb and IMDb links */}
                  <div className="flex items-center gap-2">
                    <TmdbLinkIcon tmdbId={show.tmdb_id} type="show" />
                    <ImdbLinkIcon imdbId={show.imdb_id} type="title" />
                  </div>
                </div>
                {show.description && (
                  <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                    {show.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {show.show_total_seasons && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                      {show.show_total_seasons} seasons
                    </span>
                  )}
                  {show.show_total_episodes && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                      {show.show_total_episodes} episodes
                    </span>
                  )}
                  {show.tmdb_status && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        show.tmdb_status === "Returning Series"
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {show.tmdb_status}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                {/* Add/Remove from Shows button */}
                {isCovered ? (
                  <button
                    onClick={removeFromCoveredShows}
                    disabled={coverageLoading}
                    className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {coverageLoading ? "..." : "Covered"}
                  </button>
                ) : (
                  <button
                    onClick={addToCoveredShows}
                    disabled={coverageLoading}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {coverageLoading ? "..." : "Add to Shows"}
                  </button>
                )}

                <button
                  onClick={refreshCastImages}
                  disabled={refreshingCastImages || cast.length === 0}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-4M4 16a8 8 0 0014 4" />
                  </svg>
                  {refreshingCastImages
                    ? refreshCastProgress
                      ? `Refreshing ${refreshCastProgress.current}/${refreshCastProgress.total}`
                      : "Refreshing..."
                    : "Refresh Cast Images"}
                </button>
                <RefreshProgressBar
                  show={refreshingCastImages}
                  current={refreshCastProgress?.current}
                  total={refreshCastProgress?.total}
                />
                {(refreshNotice || refreshError) && (
                  <p className={`text-xs ${refreshError ? "text-red-600" : "text-zinc-500"}`}>
                    {refreshError || refreshNotice}
                  </p>
                )}

                {/* Ratings */}
                {show.tmdb_vote_average && (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold">
                      {show.tmdb_vote_average.toFixed(1)}
                    </span>
                    <span className="text-zinc-500">TMDB</span>
                  </div>
                )}
                {show.imdb_rating_value && (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold">
                      {show.imdb_rating_value.toFixed(1)}
                    </span>
                    <span className="text-zinc-500">IMDB</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <nav className="flex gap-6">
              {(
                [
                  { id: "seasons", label: "Seasons & Episodes" },
                  { id: "gallery", label: "Gallery" },
                  { id: "cast", label: "Cast" },
                  { id: "surveys", label: "Surveys" },
                  { id: "social", label: "Social Posts" },
                  { id: "details", label: "Details" },
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

        {/* Content */}
        <main className="mx-auto max-w-6xl px-6 py-8">
          {/* Seasons Tab */}
          {activeTab === "seasons" && (
            <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
              {/* Season List */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm h-fit">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Seasons
                </h3>
                <div className="flex flex-col gap-2">
                  {seasons.map((season) => (
                    <button
                      key={season.id}
                      onClick={() => setSelectedSeasonId(season.id)}
                      className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                        selectedSeasonId === season.id
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">Season {season.season_number}</p>
                          {season.air_date && (
                            <p className="text-xs opacity-70">
                              {new Date(season.air_date).getFullYear()}
                            </p>
                          )}
                        </div>
                        {season.tmdb_season_id && show.tmdb_id && (
                          <TmdbLinkIcon
                            showTmdbId={show.tmdb_id}
                            seasonNumber={season.season_number}
                            type="season"
                            className={selectedSeasonId === season.id ? "text-white/70 hover:text-white" : ""}
                          />
                        )}
                      </div>
                    </button>
                  ))}
                  {seasons.length === 0 && (
                    <p className="text-sm text-zinc-500">No seasons found</p>
                  )}
                </div>
              </div>

              {/* Episode List */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                {selectedSeason ? (
                  <>
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="text-xl font-bold text-zinc-900">
                            Season {selectedSeason.season_number}
                          </h3>
                          {selectedSeason.overview && (
                            <p className="mt-1 text-sm text-zinc-600">
                              {selectedSeason.overview}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                          {episodes.length} episodes
                        </span>
                        <button
                          onClick={refreshCastImages}
                          disabled={refreshingCastImages || cast.length === 0}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                        >
                          {refreshingCastImages ? "Refreshing..." : "Refresh Cast Images"}
                        </button>
                      </div>
                    </div>
                    <RefreshProgressBar
                      show={refreshingCastImages}
                      current={refreshCastProgress?.current}
                      total={refreshCastProgress?.total}
                    />
                    <div className="space-y-3">
                      {episodes.map((episode) => (
                        <div
                          key={episode.id}
                          className="flex items-start gap-4 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4"
                        >
                          {episode.url_original_still && (
                            <button
                              onClick={(e) => {
                                const episodesWithStills = episodes.filter(
                                  (ep) => ep.url_original_still
                                );
                                const idx = episodesWithStills.findIndex(
                                  (ep) => ep.id === episode.id
                                );
                                openEpisodeLightbox(
                                  episode,
                                  idx,
                                  episodesWithStills,
                                  e.currentTarget
                                );
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
                            {episode.synopsis && (
                              <p className="mt-1 text-sm text-zinc-600 line-clamp-2">
                                {episode.synopsis}
                              </p>
                            )}
                            <div className="mt-2 flex gap-3 text-xs text-zinc-500">
                              {episode.air_date && (
                                <span>
                                  {new Date(episode.air_date).toLocaleDateString()}
                                </span>
                              )}
                              {episode.runtime && (
                                <span>{episode.runtime} min</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {episodes.length === 0 && (
                        <p className="text-sm text-zinc-500">
                          No episodes found for this season.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Select a season to view episodes.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === "gallery" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Season Gallery
                </p>
                <h3 className="text-xl font-bold text-zinc-900">{show.name}</h3>
              </div>

              {/* Season filter and Import button */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-zinc-700">
                    Filter by season:
                  </label>
                  <select
                    value={selectedGallerySeason}
                    onChange={(e) =>
                      setSelectedGallerySeason(
                        e.target.value === "all" ? "all" : parseInt(e.target.value)
                      )
                    }
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                  >
                    <option value="all">All Seasons</option>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.season_number}>
                        Season {s.season_number}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Import Images button - only show when a specific season is selected */}
                {selectedGallerySeason !== "all" && (
                  <button
                    onClick={() => {
                      setScrapeDrawerContext({
                        type: "season",
                        showId: showId,
                        showName: show.name,
                        seasonNumber: selectedGallerySeason,
                      });
                      setScrapeDrawerOpen(true);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Import Images
                  </button>
                )}
              </div>

              {galleryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-500" />
                </div>
              ) : galleryAssets.length === 0 ? (
                <p className="py-8 text-center text-zinc-500">
                  No images found for this selection.
                </p>
              ) : (
                <div className="space-y-8">
                  {/* Season Posters */}
                  {galleryAssets.filter((a) => a.type === "season").length > 0 && (
                    <section>
                      <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                        Season Posters
                      </h4>
                      <div className="grid grid-cols-4 gap-4">
                        {galleryAssets
                          .filter((a) => a.type === "season")
                          .map((asset, i, arr) => (
                            <button
                              key={`${asset.id}-${i}`}
                              onClick={(e) =>
                                openAssetLightbox(asset, i, arr, e.currentTarget)
                              }
                              className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <GalleryImage
                                src={asset.hosted_url}
                                alt={asset.caption || "Season poster"}
                                sizes="200px"
                              />
                            </button>
                          ))}
                      </div>
                    </section>
                  )}

                  {/* Episode Stills */}
                  {galleryAssets.filter((a) => a.type === "episode").length >
                    0 && (
                    <section>
                      <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                        Episode Stills
                      </h4>
                      <div className="grid grid-cols-6 gap-3">
                        {galleryAssets
                          .filter((a) => a.type === "episode")
                          .map((asset, i, arr) => (
                            <button
                              key={`${asset.id}-${i}`}
                              onClick={(e) =>
                                openAssetLightbox(asset, i, arr, e.currentTarget)
                              }
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

                  {/* Cast Photos */}
                  {galleryAssets.filter((a) => a.type === "cast").length > 0 && (
                    <section>
                      <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                        Cast Photos
                      </h4>
                      <div className="grid grid-cols-5 gap-4">
                        {galleryAssets
                          .filter((a) => a.type === "cast")
                          .map((asset, i, arr) => (
                            <button
                              key={`${asset.id}-${i}`}
                              onClick={(e) =>
                                openAssetLightbox(asset, i, arr, e.currentTarget)
                              }
                              className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <GalleryImage
                                src={asset.hosted_url}
                                alt={asset.caption || "Cast photo"}
                                sizes="180px"
                              />
                              {asset.person_name && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                  <p className="truncate text-xs text-white">
                                    {asset.person_name}
                                  </p>
                                </div>
                              )}
                            </button>
                          ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cast Tab */}
          {activeTab === "cast" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Cast Members
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    {show.name}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {cast.length} members
                  </span>
                  <button
                    onClick={refreshCastImages}
                    disabled={refreshingCastImages || cast.length === 0}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {refreshingCastImages ? "Refreshing..." : "Refresh Cast Images"}
                  </button>
                </div>
              </div>
              <RefreshProgressBar
                show={refreshingCastImages}
                current={refreshCastProgress?.current}
                total={refreshCastProgress?.total}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cast.map((member) => {
                  const thumbnailUrl = member.cover_photo_url || member.photo_url;

                  return (
                    <Link
                      key={member.id}
                      href={`/admin/trr-shows/people/${member.person_id}`}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 transition hover:border-zinc-300 hover:bg-zinc-100/50"
                    >
                      <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-zinc-200">
                        {thumbnailUrl ? (
                          <CastPhoto
                            src={thumbnailUrl}
                            alt={member.full_name || member.cast_member_name || "Cast member"}
                          />
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
                        {member.full_name || member.cast_member_name || "Unknown"}
                      </p>
                      {member.role && (
                        <p className="text-sm text-zinc-600">{member.role}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                          {member.credit_category}
                        </span>
                        {member.billing_order && (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                            #{member.billing_order}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleRefreshCastMember(
                            member.person_id,
                            member.full_name || member.cast_member_name || "Cast member"
                          );
                        }}
                        disabled={Boolean(refreshingPersonIds[member.person_id])}
                        className="mt-3 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
                      >
                        {refreshingPersonIds[member.person_id]
                          ? "Refreshing..."
                          : "Refresh Images"}
                      </button>
                    </Link>
                  );
                })}
              </div>
              {cast.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No cast members found for this show.
                </p>
              )}
            </div>
          )}

          {/* Surveys Tab */}
          {activeTab === "surveys" && (
            <SurveysSection
              showId={showId}
              showName={show.name}
              totalSeasons={show.show_total_seasons}
            />
          )}

          {/* Social Posts Tab */}
          {activeTab === "social" && (
            <SocialPostsSection showId={showId} showName={show.name} />
          )}

          {/* Details Tab - External IDs */}
          {activeTab === "details" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Show Information
                </p>
                <h3 className="text-xl font-bold text-zinc-900">
                  External IDs & Links
                </h3>
              </div>

              <div className="space-y-6">
                {/* External IDs */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                    External Identifiers
                  </h4>
                  <ExternalLinks
                    externalIds={null}
                    tmdbId={show.tmdb_id}
                    imdbId={show.imdb_id}
                    type="show"
                    className="bg-zinc-50 rounded-lg p-4"
                  />
                  {!show.tmdb_id && !show.imdb_id && (
                    <p className="text-sm text-zinc-500">
                      No external IDs available for this show.
                    </p>
                  )}
                </div>

                {/* Genres */}
                {show.genres && show.genres.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                      Genres
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {show.genres.map((genre) => (
                        <span
                          key={genre}
                          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Networks */}
                {show.networks && show.networks.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                      Networks
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {show.networks.map((network) => (
                        <span
                          key={network}
                          className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
                        >
                          {network}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {show.tags && show.tags.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {show.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Premiere Date */}
                {show.premiere_date && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                      Premiere Date
                    </h4>
                    <p className="text-sm text-zinc-700">
                      {new Date(show.premiere_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}

                {/* Internal ID */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                    Internal ID
                  </h4>
                  <code className="text-xs bg-zinc-100 rounded px-2 py-1 text-zinc-600 font-mono">
                    {show.id}
                  </code>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Lightbox for cast photos */}
        {lightboxImage && (
          <ImageLightbox
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            isOpen={lightboxOpen}
            onClose={() => {
              setLightboxOpen(false);
              setLightboxImage(null);
            }}
          />
        )}

        {/* Lightbox for episode stills */}
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

        {/* Lightbox for gallery assets */}
        {assetLightbox && (
          <ImageLightbox
            src={assetLightbox.asset.hosted_url}
            alt={assetLightbox.asset.caption || "Gallery image"}
            isOpen={true}
            onClose={closeAssetLightbox}
            metadata={mapAssetToMetadata(assetLightbox.asset)}
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

        {/* Image scrape drawer */}
        {scrapeDrawerContext && (
          <ImageScrapeDrawer
            isOpen={scrapeDrawerOpen}
            onClose={() => {
              setScrapeDrawerOpen(false);
              setScrapeDrawerContext(null);
            }}
            entityContext={scrapeDrawerContext}
            onImportComplete={() => {
              // Refresh gallery after import
              if (activeTab === "gallery") {
                loadGalleryAssets(selectedGallerySeason);
              }
            }}
          />
        )}
      </div>
    </ClientOnly>
  );
}
