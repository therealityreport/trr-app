"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";
import SocialPostsSection from "@/components/admin/social-posts-section";
import SurveysSection from "@/components/admin/surveys-section";
import ShowBrandEditor from "@/components/admin/ShowBrandEditor";
import { ExternalLinks, TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import { ImageScrapeDrawer, type SeasonContext } from "@/components/admin/ImageScrapeDrawer";
import { AdvancedFilterDrawer } from "@/components/admin/AdvancedFilterDrawer";
import { mapSeasonAssetToMetadata } from "@/lib/photo-metadata";
import {
  readAdvancedFilters,
  writeAdvancedFilters,
  type AdvancedFilterState,
} from "@/lib/admin/advanced-filters";
import {
  inferHasTextOverlay,
} from "@/lib/gallery-filter-utils";
import { applyAdvancedFiltersToSeasonAssets } from "@/lib/gallery-advanced-filtering";
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
  total_episodes?: number | null;
}

type TabId = "seasons" | "assets" | "cast" | "surveys" | "social" | "details";
type ShowRefreshTarget = "details" | "seasons_episodes" | "photos" | "cast_credits";

const SEASON_PAGE_TABS = [
  { tab: "episodes", label: "Seasons & Episodes" },
  { tab: "assets", label: "Assets" },
  { tab: "cast", label: "Cast" },
  { tab: "surveys", label: "Surveys" },
  { tab: "social", label: "Social Media" },
  { tab: "details", label: "Details" },
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const looksLikeUuid = (value: string) => UUID_RE.test(value);

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatFixed1 = (value: unknown): string | null => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? null : parsed.toFixed(1);
};

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
        unoptimized
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
  stage,
  message,
  current,
  total,
}: {
  show: boolean;
  stage?: string | null;
  message?: string | null;
  current?: number | null;
  total?: number | null;
}) {
  if (!show) return null;
  const hasCounts =
    typeof current === "number" &&
    Number.isFinite(current) &&
    typeof total === "number" &&
    Number.isFinite(total) &&
    total >= 0 &&
    current >= 0;
  const safeTotal = hasCounts ? Math.max(0, Math.floor(total)) : null;
  const safeCurrent = hasCounts
    ? Math.max(
        0,
        Math.floor(
          safeTotal !== null && safeTotal > 0 ? Math.min(current, safeTotal) : current
        )
      )
    : null;
  const hasProgressBar = safeCurrent !== null && safeTotal !== null && safeTotal > 0;
  const percent = hasProgressBar
    ? Math.min(100, Math.round((safeCurrent / safeTotal) * 100))
    : 0;
  const stageLabel =
    typeof stage === "string" && stage.trim()
      ? stage.replace(/[_-]+/g, " ").trim()
      : null;

  return (
    <div className="mt-2 w-full">
      {(message || stageLabel || hasCounts) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
            {message || stageLabel || "Working..."}
          </p>
          {hasProgressBar && safeCurrent !== null && safeTotal !== null && (
            <p className="text-[11px] tabular-nums text-zinc-500">
              {safeCurrent.toLocaleString()}/{safeTotal.toLocaleString()} ({percent}%)
            </p>
          )}
        </div>
      )}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
        {hasProgressBar ? (
          <div
            className="h-full rounded-full bg-zinc-700 transition-all"
            style={{ width: `${percent}%` }}
          />
        ) : safeTotal === 0 ? null : (
          <div className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-zinc-700/70" />
        )}
      </div>
    </div>
  );
}


export default function TrrShowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showId = params.showId as string;
  const { user, checking, hasAccess } = useAdminGuard();

  const [show, setShow] = useState<TrrShow | null>(null);
  const [seasons, setSeasons] = useState<TrrSeason[]>([]);
  const [cast, setCast] = useState<TrrCastMember[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("seasons");
  const [assetsView, setAssetsView] = useState<"media" | "brand">("media");
  const [openSeasonId, setOpenSeasonId] = useState<string | null>(null);
  const hasAutoOpenedSeasonRef = useRef(false);
  const [seasonEpisodeSummaries, setSeasonEpisodeSummaries] = useState<
    Record<string, { count: number; premiereDate: string | null; finaleDate: string | null }>
  >({});
  const [seasonSummariesLoading, setSeasonSummariesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lightbox state (for cast photos)
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  // Gallery state
  const [galleryAssets, setGalleryAssets] = useState<SeasonAsset[]>([]);
  const [selectedGallerySeason, setSelectedGallerySeason] = useState<
    number | "all"
  >("all");
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [textOverlayDetectError, setTextOverlayDetectError] = useState<string | null>(null);
  const advancedFilters = useMemo(
    () =>
      readAdvancedFilters(new URLSearchParams(searchParams.toString()), {
        sort: "newest",
      }),
    [searchParams]
  );

  const setAdvancedFilters = useCallback(
    (next: AdvancedFilterState) => {
      const out = writeAdvancedFilters(
        new URLSearchParams(searchParams.toString()),
        next,
        { sort: "newest" }
      );
      router.replace(`?${out.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const availableGallerySources = useMemo(() => {
    const sources = new Set(galleryAssets.map((a) => a.source).filter(Boolean));
    return Array.from(sources).sort();
  }, [galleryAssets]);

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

  // Refresh show sync state (uses TRR-Backend scripts, proxied via Next API routes)
  const [refreshingTargets, setRefreshingTargets] = useState<Record<ShowRefreshTarget, boolean>>({
    details: false,
    seasons_episodes: false,
    photos: false,
    cast_credits: false,
  });
  const [refreshTargetNotice, setRefreshTargetNotice] = useState<
    Partial<Record<ShowRefreshTarget, string>>
  >({});
  const [refreshTargetError, setRefreshTargetError] = useState<
    Partial<Record<ShowRefreshTarget, string>>
  >({});
  const [refreshTargetProgress, setRefreshTargetProgress] = useState<
    Partial<
      Record<
        ShowRefreshTarget,
        {
          stage?: string | null;
          message?: string | null;
          current: number | null;
          total: number | null;
        }
      >
    >
  >({});

  // Image scrape drawer state
  const [scrapeDrawerOpen, setScrapeDrawerOpen] = useState(false);
  const [scrapeDrawerContext, setScrapeDrawerContext] = useState<SeasonContext | null>(null);

  // Refresh images state
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshingPersonIds, setRefreshingPersonIds] = useState<Record<string, boolean>>({});

  const tabParam = searchParams.get("tab");
  useEffect(() => {
    const allowedTabs: TabId[] = ["seasons", "assets", "cast", "surveys", "social", "details"];
    if (!tabParam) return;

    // Back-compat alias: ?tab=gallery -> ASSETS (Media)
    if (tabParam === "gallery") {
      setActiveTab("assets");
      setAssetsView("media");
      return;
    }

    if (allowedTabs.includes(tabParam as TabId)) {
      setActiveTab(tabParam as TabId);
    }
  }, [tabParam]);

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
        body: JSON.stringify({ skip_mirror: false, show_id: showId }),
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
  }, [getAuthHeaders, showId]);

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
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : `Failed to fetch seasons (HTTP ${response.status})`;
        throw new Error(message);
      }
      const seasons = (data as { seasons?: unknown }).seasons;
      const nextSeasons = Array.isArray(seasons) ? (seasons as TrrSeason[]) : [];
      setSeasons(nextSeasons);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch seasons";
      console.warn("Failed to fetch seasons:", message);
      setError(message);
    }
  }, [showId, getAuthHeaders]);

  const fetchSeasonEpisodeSummaries = useCallback(
    async (seasonList: TrrSeason[]) => {
      if (seasonList.length === 0) {
        setSeasonEpisodeSummaries({});
        setSeasonSummariesLoading(false);
        return;
      }
      setSeasonSummariesLoading(true);
      try {
        const headers = await getAuthHeaders();
        const results = await Promise.all(
          seasonList.map(async (season) => {
            try {
              const response = await fetch(
                `/api/admin/trr-api/seasons/${season.id}/episodes?limit=500`,
                { headers }
              );
              if (!response.ok) throw new Error("Failed to fetch episodes");
              const data = await response.json();
              const episodes = (data.episodes ?? []) as Array<{ air_date: string | null }>;
              const dates = episodes
                .map((ep) => ep.air_date)
                .filter((date): date is string => Boolean(date))
                .map((date) => new Date(date))
                .filter((date) => !Number.isNaN(date.getTime()));
              const premiere =
                dates.length > 0
                  ? new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString()
                  : null;
              const finale =
                dates.length > 0
                  ? new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString()
                  : null;
              return {
                seasonId: season.id,
                summary: {
                  count: episodes.length,
                  premiereDate: premiere,
                  finaleDate: finale,
                },
              };
            } catch (error) {
              console.error("Failed to fetch season episodes:", error);
              return null;
            }
          })
        );

        const nextSummaries: Record<
          string,
          { count: number; premiereDate: string | null; finaleDate: string | null }
        > = {};
        for (const result of results) {
          if (result) {
            nextSummaries[result.seasonId] = result.summary;
          }
        }
        setSeasonEpisodeSummaries(nextSummaries);
      } catch (error) {
        console.error("Failed to compute season episode summaries:", error);
      } finally {
        setSeasonSummariesLoading(false);
      }
    },
    [getAuthHeaders]
  );

  // Fetch cast
  const fetchCast = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      // Fetch all cast without filters - photo filtering done client-side if needed
      const response = await fetch(
        `/api/admin/trr-api/shows/${showId}/cast?limit=500`,
        { headers }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : `Failed to fetch cast (HTTP ${response.status})`;
        throw new Error(message);
      }
      const cast = (data as { cast?: unknown }).cast;
      setCast(Array.isArray(cast) ? (cast as TrrCastMember[]) : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch cast";
      console.warn("Failed to fetch cast:", message);
      setError(message);
    }
  }, [showId, getAuthHeaders]);

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

  useEffect(() => {
    if (seasons.length > 0) {
      fetchSeasonEpisodeSummaries(seasons);
    }
  }, [seasons, fetchSeasonEpisodeSummaries]);

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString() : "TBD";

  const formatDateRange = (premiere: string | null, finale: string | null) => {
    if (!premiere && !finale) return "Dates unavailable";
    return `${formatDate(premiere)} – ${formatDate(finale)}`;
  };

  const isSeasonBackdrop = (asset: SeasonAsset) => {
    return (asset.kind ?? "").toLowerCase().trim() === "backdrop";
  };

  const filteredGalleryAssets = useMemo(() => {
    return applyAdvancedFiltersToSeasonAssets(galleryAssets, advancedFilters, {
      showName: show?.name ?? undefined,
      getSeasonNumber: (asset) =>
        selectedGallerySeason === "all"
          ? typeof asset.season_number === "number"
            ? asset.season_number
            : undefined
          : selectedGallerySeason,
    });
  }, [galleryAssets, advancedFilters, selectedGallerySeason, show?.name]);

  const isTextFilterActive = useMemo(() => {
    const wantsText = advancedFilters.text.includes("text");
    const wantsNoText = advancedFilters.text.includes("no_text");
    return wantsText !== wantsNoText;
  }, [advancedFilters.text]);

  const unknownTextCount = useMemo(() => {
    if (!isTextFilterActive) return 0;
    return galleryAssets.filter(
      (a) => looksLikeUuid(a.id) && inferHasTextOverlay(a.metadata ?? null) === null
    ).length;
  }, [isTextFilterActive, galleryAssets]);

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const isSeasonAired = useCallback(
    (season: TrrSeason) => {
      const summary = seasonEpisodeSummaries[season.id];
      const episodeCount = summary?.count ?? null;

      // Hide placeholder seasons (e.g. "1 episode") once we know the episode count.
      if (typeof episodeCount === "number" && episodeCount <= 1) return false;

      const premiereDate = summary?.premiereDate ?? season.air_date;
      const finaleDate = summary?.finaleDate ?? season.air_date;

      // Hide seasons that don't have any dates available yet.
      if (!premiereDate && !finaleDate) return false;

      const dateToCheck = premiereDate ?? finaleDate;
      if (!dateToCheck) return false;

      const airDate = new Date(dateToCheck);
      if (Number.isNaN(airDate.getTime())) return true;
      airDate.setHours(0, 0, 0, 0);
      return airDate <= today;
    },
    [seasonEpisodeSummaries, today]
  );

  const visibleSeasons = useMemo(
    () => seasons.filter((season) => isSeasonAired(season)),
    [seasons, isSeasonAired]
  );

  useEffect(() => {
    if (visibleSeasons.length === 0) return;

    // If the open season disappears (filtered out), fall back to the newest visible.
    if (openSeasonId && !visibleSeasons.some((season) => season.id === openSeasonId)) {
      setOpenSeasonId(visibleSeasons[0].id);
      hasAutoOpenedSeasonRef.current = true;
      return;
    }

    // Auto-open one season once (initial load), but allow the user to close all afterwards.
    if (!hasAutoOpenedSeasonRef.current && !openSeasonId) {
      setOpenSeasonId(visibleSeasons[0].id);
      hasAutoOpenedSeasonRef.current = true;
    }
  }, [visibleSeasons, openSeasonId]);

  useEffect(() => {
    if (selectedGallerySeason === "all") return;
    if (!visibleSeasons.some((season) => season.season_number === selectedGallerySeason)) {
      setSelectedGallerySeason("all");
    }
  }, [selectedGallerySeason, visibleSeasons]);

  // Load gallery assets for a season (or all seasons)
  const loadGalleryAssets = useCallback(
    async (seasonNumber: number | "all") => {
      setGalleryLoading(true);
      try {
        const headers = await getAuthHeaders();
        const dedupe = (rows: SeasonAsset[]) => {
          const seen = new Set<string>();
          const out: SeasonAsset[] = [];
          for (const row of rows) {
            const key = (row.hosted_url ?? "").trim();
            if (!key) continue;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(row);
          }
          return out;
        };

        const fetchShowAssets = async (): Promise<SeasonAsset[]> => {
          const res = await fetch(`/api/admin/trr-api/shows/${showId}/assets`, { headers });
          if (!res.ok) return [];
          const data = await res.json().catch(() => ({}));
          const assets = (data as { assets?: unknown }).assets;
          return Array.isArray(assets) ? (assets as SeasonAsset[]) : [];
        };

        if (seasonNumber === "all") {
          // Fetch show-level assets once + season assets for all seasons.
          const [showAssets, ...seasonResults] = await Promise.all([
            fetchShowAssets(),
            ...visibleSeasons.map(async (season) => {
              const res = await fetch(
                `/api/admin/trr-api/shows/${showId}/seasons/${season.season_number}/assets`,
                { headers }
              );
              if (!res.ok) return [];
              const data = await res.json().catch(() => ({}));
              const assets = (data as { assets?: unknown }).assets;
              return Array.isArray(assets) ? (assets as SeasonAsset[]) : [];
            }),
          ]);
          setGalleryAssets(dedupe([...(showAssets ?? []), ...seasonResults.flat()]));
        } else {
          const [showAssets, seasonAssets] = await Promise.all([
            fetchShowAssets(),
            (async () => {
              const res = await fetch(
                `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/assets`,
                { headers }
              );
              if (!res.ok) return [];
              const data = await res.json().catch(() => ({}));
              const assets = (data as { assets?: unknown }).assets;
              return Array.isArray(assets) ? (assets as SeasonAsset[]) : [];
            })(),
          ]);
          setGalleryAssets(dedupe([...(showAssets ?? []), ...(seasonAssets ?? [])]));
        }
      } finally {
        setGalleryLoading(false);
      }
    },
    [showId, visibleSeasons, getAuthHeaders]
  );

  const refreshShow = useCallback(
    async (target: ShowRefreshTarget) => {
      const label = (() => {
        switch (target) {
          case "details":
            return "Show Details";
          case "seasons_episodes":
            return "Seasons & Episodes";
          case "photos":
            return "Photos";
          case "cast_credits":
            return "Cast/Credits";
          default:
            return target;
        }
      })();

      setRefreshingTargets((prev) => ({ ...prev, [target]: true }));
      setRefreshTargetProgress((prev) => ({
        ...prev,
        [target]: {
          stage: "starting",
          message: `Refreshing ${label}...`,
          current: 0,
          total: null,
        },
      }));
      setRefreshTargetNotice((prev) => {
        const next = { ...prev };
        delete next[target];
        return next;
      });
      setRefreshTargetError((prev) => {
        const next = { ...prev };
        delete next[target];
        return next;
      });

      try {
        let streamFailed = false;
        let sawComplete = false;

        try {
          const headers = await getAuthHeaders();
          const streamUrl =
            target === "photos"
              ? `/api/admin/trr-api/shows/${showId}/refresh-photos/stream`
              : `/api/admin/trr-api/shows/${showId}/refresh/stream`;
          const streamBody =
            target === "photos" ? {} : { targets: [target] };
          const response = await fetch(streamUrl, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(streamBody),
          });

          if (!response.ok || !response.body) {
            const data = await response.json().catch(() => ({}));
            const message =
              data.error && data.detail
                ? `${data.error}: ${data.detail}`
                : data.error || data.detail || "Refresh failed";
            throw new Error(message);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // Some environments send SSE with CRLF delimiters. Normalize to LF so our
            // "\n\n" boundary detection works reliably and progress updates stream live.
            buffer = buffer.replace(/\r\n/g, "\n");

            let boundaryIndex = buffer.indexOf("\n\n");
            while (boundaryIndex !== -1) {
              const rawEvent = buffer.slice(0, boundaryIndex);
              buffer = buffer.slice(boundaryIndex + 2);

              const lines = rawEvent.split("\n").filter(Boolean);
              let eventType = "message";
              const dataLines: string[] = [];
              for (const line of lines) {
                if (line.startsWith("event:")) {
                  eventType = line.slice(6).trim();
                } else if (line.startsWith("data:")) {
                  dataLines.push(line.slice(5).trim());
                }
              }

              const dataStr = dataLines.join("\n");
              let payload: Record<string, unknown> | string = dataStr;
              try {
                payload = JSON.parse(dataStr) as Record<string, unknown>;
              } catch {
                payload = dataStr;
              }

              if (eventType === "progress" && payload && typeof payload === "object") {
                const stageRaw = (payload as { stage?: unknown; step?: unknown; target?: unknown }).stage
                  ?? (payload as { stage?: unknown; step?: unknown; target?: unknown }).step
                  ?? (payload as { stage?: unknown; step?: unknown; target?: unknown }).target;
                const messageRaw = (payload as { message?: unknown }).message;
                const currentRaw = (payload as { current?: unknown }).current;
                const totalRaw = (payload as { total?: unknown }).total;
                const current =
                  typeof currentRaw === "number"
                    ? currentRaw
                    : typeof currentRaw === "string"
                      ? Number.parseInt(currentRaw, 10)
                      : null;
                const total =
                  typeof totalRaw === "number"
                    ? totalRaw
                  : typeof totalRaw === "string"
                      ? Number.parseInt(totalRaw, 10)
                      : null;

                setRefreshTargetProgress((prev) => ({
                  ...prev,
                  [target]: {
                    stage: typeof stageRaw === "string" ? stageRaw : prev[target]?.stage ?? null,
                    message: typeof messageRaw === "string" ? messageRaw : prev[target]?.message ?? null,
                    current: typeof current === "number" && Number.isFinite(current) ? current : null,
                    total: typeof total === "number" && Number.isFinite(total) ? total : null,
                  },
                }));
              } else if (eventType === "complete") {
                sawComplete = true;

                if (
                  target === "photos" &&
                  payload &&
                  typeof payload === "object" &&
                  ("cast_photos_upserted" in payload || "cast_photos_fetched" in payload)
                ) {
                  const asNum = (value: unknown): number | null =>
                    typeof value === "number" && Number.isFinite(value) ? value : null;
                  const durationMs = asNum((payload as { duration_ms?: unknown }).duration_ms);
                  const castFetched = asNum((payload as { cast_photos_fetched?: unknown }).cast_photos_fetched);
                  const castUpserted = asNum((payload as { cast_photos_upserted?: unknown }).cast_photos_upserted);
                  const castMirrored = asNum((payload as { cast_photos_mirrored?: unknown }).cast_photos_mirrored);
                  const castFailed = asNum((payload as { cast_photos_failed?: unknown }).cast_photos_failed);
                  const castPruned = asNum((payload as { cast_photos_pruned?: unknown }).cast_photos_pruned);
                  const autoAttempted = asNum((payload as { auto_counts_attempted?: unknown }).auto_counts_attempted);
                  const autoSucceeded = asNum((payload as { auto_counts_succeeded?: unknown }).auto_counts_succeeded);
                  const autoFailed = asNum((payload as { auto_counts_failed?: unknown }).auto_counts_failed);
                  const wordAttempted = asNum((payload as { text_overlay_attempted?: unknown }).text_overlay_attempted);
                  const wordSucceeded = asNum((payload as { text_overlay_succeeded?: unknown }).text_overlay_succeeded);
                  const wordFailed = asNum((payload as { text_overlay_failed?: unknown }).text_overlay_failed);

                  if (activeTab === "assets" && assetsView === "media") {
                    await loadGalleryAssets(selectedGallerySeason);
                  }

                  setRefreshTargetNotice((prev) => ({
                    ...prev,
                    photos: [
                      `Photos refreshed${durationMs !== null ? ` (${durationMs}ms)` : ""}.`,
                      castFetched !== null ? `photos fetched: ${castFetched}` : null,
                      castUpserted !== null ? `photos upserted: ${castUpserted}` : null,
                      castMirrored !== null ? `photos mirrored: ${castMirrored}` : null,
                      castFailed !== null ? `photos failed: ${castFailed}` : null,
                      castPruned !== null ? `photos pruned: ${castPruned}` : null,
                      autoAttempted !== null ? `auto counts attempted: ${autoAttempted}` : null,
                      autoSucceeded !== null ? `auto counts succeeded: ${autoSucceeded}` : null,
                      autoFailed !== null ? `auto counts failed: ${autoFailed}` : null,
                      wordAttempted !== null ? `word id attempted: ${wordAttempted}` : null,
                      wordSucceeded !== null ? `word id succeeded: ${wordSucceeded}` : null,
                      wordFailed !== null ? `word id failed: ${wordFailed}` : null,
                    ]
                      .filter(Boolean)
                      .join(", "),
                  }));
                } else {
                  const resultsRaw = (payload as { results?: unknown }).results;
                  const results =
                    resultsRaw && typeof resultsRaw === "object"
                      ? (resultsRaw as Record<string, unknown>)
                      : null;
                  const stepRaw = results ? results[target] : null;
                  const step =
                    stepRaw && typeof stepRaw === "object"
                      ? (stepRaw as { status?: unknown; duration_ms?: unknown; error?: unknown })
                      : null;
                  if (step?.status === "failed") {
                    const stepError =
                      typeof step.error === "string" && step.error
                        ? step.error
                        : "Refresh failed";
                    throw new Error(stepError);
                  }

                  if (target === "details") {
                    await fetchShow();
                  } else if (target === "seasons_episodes") {
                    await Promise.all([fetchShow(), fetchSeasons()]);
                  } else if (target === "photos") {
                    if (activeTab === "assets" && assetsView === "media") {
                      await loadGalleryAssets(selectedGallerySeason);
                    }
                  } else if (target === "cast_credits") {
                    await fetchCast();
                  }

                  const durationMs =
                    typeof step?.duration_ms === "number" ? step.duration_ms : null;
                  setRefreshTargetNotice((prev) => ({
                    ...prev,
                    [target]: `Refreshed ${label}${durationMs !== null ? ` (${durationMs}ms)` : ""}.`,
                  }));
                }
              } else if (eventType === "error") {
                const message =
                  payload && typeof payload === "object"
                    ? (payload as { error?: string; detail?: string })
                    : null;
                const errorText =
                  message?.error && message?.detail
                    ? `${message.error}: ${message.detail}`
                    : message?.error || "Refresh failed";
                throw new Error(errorText);
              }

              boundaryIndex = buffer.indexOf("\n\n");
            }
          }
        } catch (streamErr) {
          streamFailed = true;
          console.warn("Show refresh stream failed, falling back to non-stream.", streamErr);
        }

        if (streamFailed) {
          if (target === "photos") {
            throw new Error("Photo refresh stream failed.");
          }
          const headers = await getAuthHeaders();
          const response = await fetch(`/api/admin/trr-api/shows/${showId}/refresh`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ targets: [target] }),
          });
          const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

          if (!response.ok) {
            const message =
              typeof data.error === "string" && typeof data.detail === "string"
                ? `${data.error}: ${data.detail}`
                : (typeof data.error === "string" && data.error) ||
                  (typeof data.detail === "string" && data.detail) ||
                  "Refresh failed";
            throw new Error(message);
          }

          const resultsRaw = (data as { results?: unknown }).results;
          const results =
            resultsRaw && typeof resultsRaw === "object"
              ? (resultsRaw as Record<string, unknown>)
              : null;
          const stepRaw = results ? results[target] : null;
          const step =
            stepRaw && typeof stepRaw === "object"
              ? (stepRaw as { status?: unknown; duration_ms?: unknown; error?: unknown })
              : null;
          if (step?.status === "failed") {
            const stepError =
              typeof step.error === "string" && step.error ? step.error : "Refresh failed";
            throw new Error(stepError);
          }

          if (target === "details") {
            await fetchShow();
          } else if (target === "seasons_episodes") {
            await Promise.all([fetchShow(), fetchSeasons()]);
          } else if (target === "cast_credits") {
            await fetchCast();
          }

          const durationMs = typeof step?.duration_ms === "number" ? step.duration_ms : null;
          setRefreshTargetNotice((prev) => ({
            ...prev,
            [target]: `Refreshed ${label}${durationMs !== null ? ` (${durationMs}ms)` : ""}.`,
          }));
        } else if (!sawComplete) {
          setRefreshTargetNotice((prev) => ({ ...prev, [target]: `Refreshed ${label}.` }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Refresh failed";
        setRefreshTargetError((prev) => ({ ...prev, [target]: message }));
      } finally {
        setRefreshingTargets((prev) => ({ ...prev, [target]: false }));
        setRefreshTargetProgress((prev) => {
          const next = { ...prev };
          delete next[target];
          return next;
        });
      }
    },
    [
      activeTab,
      assetsView,
      fetchCast,
      fetchSeasons,
      fetchShow,
      getAuthHeaders,
      loadGalleryAssets,
      selectedGallerySeason,
      showId,
    ]
  );

  const detectTextOverlayForUnknown = useCallback(async () => {
    const targets = galleryAssets
      .filter((a) => looksLikeUuid(a.id) && inferHasTextOverlay(a.metadata ?? null) === null)
      .slice(0, 25);
    if (targets.length === 0) return;

    setTextOverlayDetectError(null);
    const headers = await getAuthHeaders();
    for (const asset of targets) {
      try {
        const response = await fetch(`/api/admin/trr-api/media-assets/${asset.id}/detect-text-overlay`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: false }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errorText =
            typeof data.error === "string" ? data.error : "Detect text overlay failed";
          const detailText = typeof data.detail === "string" ? data.detail : null;
          setTextOverlayDetectError(detailText ? `${errorText}: ${detailText}` : errorText);
          // Non-recoverable for this batch; avoid spamming 25 failing requests.
          if (response.status === 401 || response.status === 403 || response.status === 503) {
            break;
          }
        }
      } catch (err) {
        setTextOverlayDetectError(
          err instanceof Error ? err.message : "Detect text overlay failed"
        );
        break;
      }
    }

    if (activeTab === "assets" && assetsView === "media") {
      await loadGalleryAssets(selectedGallerySeason);
    }
  }, [galleryAssets, getAuthHeaders, activeTab, assetsView, loadGalleryAssets, selectedGallerySeason]);

  // Load gallery when tab becomes active or season filter changes
  useEffect(() => {
    if (activeTab === "assets" && assetsView === "media" && visibleSeasons.length > 0) {
      loadGalleryAssets(selectedGallerySeason);
    }
  }, [activeTab, assetsView, selectedGallerySeason, loadGalleryAssets, visibleSeasons.length]);

  const handleRefreshCastMember = useCallback(
    async (personId: string, label: string) => {
      if (!personId) return;

      setRefreshingPersonIds((prev) => ({ ...prev, [personId]: true }));
      setRefreshNotice(null);
      setRefreshError(null);

      try {
        await refreshPersonImages(personId);
        await fetchCast();
        setRefreshNotice(`Refreshed person for ${label}.`);
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

  const archiveGalleryAsset = useCallback(
    async (asset: SeasonAsset) => {
      const origin = asset.origin_table ?? null;
      if (!origin) throw new Error("Cannot archive: missing origin_table");
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/trr-api/assets/archive", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ origin, asset_id: asset.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail ? `${data.error}: ${data.detail}` : data?.detail || data?.error || "Archive failed";
        throw new Error(message);
      }

      // Clear from UI immediately (hosted_url will also be cleared server-side).
      setGalleryAssets((prev) => prev.filter((a) => a.hosted_url !== asset.hosted_url));
      closeAssetLightbox();
    },
    [getAuthHeaders]
  );

  const toggleStarGalleryAsset = useCallback(
    async (asset: SeasonAsset, starred: boolean) => {
      const origin = asset.origin_table ?? null;
      if (!origin) throw new Error("Cannot star: missing origin_table");
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/trr-api/assets/star", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ origin, asset_id: asset.id, starred }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail ? `${data.error}: ${data.detail}` : data?.detail || data?.error || "Star failed";
        throw new Error(message);
      }

      setGalleryAssets((prev) =>
        prev.map((a) => {
          if (a.hosted_url !== asset.hosted_url) return a;
          const meta = (a.metadata && typeof a.metadata === "object") ? { ...(a.metadata as Record<string, unknown>) } : {};
          meta.starred = starred;
          if (starred) meta.starred_at = new Date().toISOString();
          else delete meta.starred_at;
          return { ...a, metadata: meta };
        })
      );
    },
    [getAuthHeaders]
  );

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

  const tmdbVoteAverageText = formatFixed1(show.tmdb_vote_average);
  const imdbRatingText = formatFixed1(show.imdb_rating_value);

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
                  {visibleSeasons.length > 0 && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                      {visibleSeasons.length} seasons
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
                    {coverageLoading ? "..." : "In Shows"}
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

                {/* Ratings */}
                {tmdbVoteAverageText && (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold">
                      {tmdbVoteAverageText}
                    </span>
                    <span className="text-zinc-500">TMDB</span>
                  </div>
                )}
                {imdbRatingText && (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold">
                      {imdbRatingText}
                    </span>
                    <span className="text-zinc-500">IMDB</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="hidden">
          <div className="mx-auto max-w-6xl px-6">
            <nav className="flex flex-wrap gap-2 py-4">
              {(
                [
                  { id: "seasons", label: "Seasons & Episodes" },
                  { id: "assets", label: "Assets" },
                  { id: "cast", label: "Cast" },
                  { id: "surveys", label: "Surveys" },
                  { id: "social", label: "Social Media" },
                  { id: "details", label: "Details" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
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
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Seasons
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">{show.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => refreshShow("seasons_episodes")}
                  disabled={refreshingTargets.seasons_episodes}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  {refreshingTargets.seasons_episodes
                    ? "Refreshing..."
                    : "Refresh Seasons & Episodes"}
                </button>
              </div>

              {(refreshTargetNotice.seasons_episodes ||
                refreshTargetError.seasons_episodes) && (
                <p
                  className={`mb-4 text-sm ${
                    refreshTargetError.seasons_episodes ? "text-red-600" : "text-zinc-500"
                  }`}
                >
                  {refreshTargetError.seasons_episodes ||
                    refreshTargetNotice.seasons_episodes}
                </p>
              )}
              <RefreshProgressBar
                show={refreshingTargets.seasons_episodes}
                stage={refreshTargetProgress.seasons_episodes?.stage}
                message={refreshTargetProgress.seasons_episodes?.message}
                current={refreshTargetProgress.seasons_episodes?.current}
                total={refreshTargetProgress.seasons_episodes?.total}
              />
              {seasonSummariesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900" />
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleSeasons.map((season) => {
                    const summary = seasonEpisodeSummaries[season.id];
                    const isOpen = openSeasonId === season.id;
                    const countLabel = summary
                      ? `${summary.count} episodes`
                      : "Episodes: —";
                    const premiereDate = summary?.premiereDate ?? season.air_date;
                    const finaleDate = summary?.finaleDate ?? season.air_date;
                    const dateRange = formatDateRange(premiereDate, finaleDate);
                    return (
                      <div
                        key={season.id}
                        className="rounded-xl border border-zinc-200 bg-white shadow-sm"
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenSeasonId((prev) => (prev === season.id ? null : season.id))
                          }
                          onKeyDown={(event) => {
                            if (event.currentTarget !== event.target) return;
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            setOpenSeasonId((prev) => (prev === season.id ? null : season.id));
                          }}
                          className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left"
                        >
                          <div>
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/admin/trr-shows/${showId}/seasons/${season.season_number}?tab=episodes`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-lg font-semibold text-zinc-900 hover:underline"
                              >
                                Season {season.season_number}
                              </Link>
                              {season.tmdb_season_id && show.tmdb_id && (
                                <span onClick={(e) => e.stopPropagation()} className="inline-flex">
                                  <TmdbLinkIcon
                                    showTmdbId={show.tmdb_id}
                                    seasonNumber={season.season_number}
                                    type="season"
                                  />
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                              <span>{countLabel}</span>
                              <span>{dateRange}</span>
                            </div>
                          </div>
                          <span
                            className={`text-zinc-400 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M6 9l6 6 6-6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        </div>
                        <div className="border-t border-zinc-100 px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {SEASON_PAGE_TABS.map((tab) => (
                              <Link
                                key={tab.tab}
                                href={`/admin/trr-shows/${showId}/seasons/${season.season_number}?tab=${tab.tab}`}
                                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                              >
                                {tab.label}
                              </Link>
                            ))}
                          </div>
                          {isOpen && season.overview && (
                            <p className="mt-4 text-sm text-zinc-600">
                              {season.overview}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {visibleSeasons.length === 0 && (
                    <p className="text-sm text-zinc-500">No seasons found</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ASSETS Tab */}
          {activeTab === "assets" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  {assetsView === "media" ? "Season Gallery" : "Brand"}
                </p>
                <h3 className="text-xl font-bold text-zinc-900">{show.name}</h3>
                </div>

                <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                  <button
                    type="button"
                    onClick={() => setAssetsView("media")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      assetsView === "media"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Media
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssetsView("brand")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      assetsView === "brand"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Brand
                  </button>
                </div>
              </div>

              {assetsView === "media" ? (
                <>
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
                        {visibleSeasons.map((s) => (
                          <option key={s.id} value={s.season_number}>
                            Season {s.season_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => refreshShow("photos")}
                        disabled={refreshingTargets.photos}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-4M4 16a8 8 0 0014 4"
                          />
                        </svg>
                        {refreshingTargets.photos ? "Refreshing..." : "Refresh Photos"}
                      </button>

                      <button
                        onClick={() => setAdvancedFiltersOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M7 12h10M10 18h4" />
                        </svg>
                        Filters
                      </button>

                      {/* Import Images button - only show when a specific season is selected */}
                      {selectedGallerySeason !== "all" && (
                        <button
                          onClick={() => {
                            const selectedSeason = visibleSeasons.find(
                              (season) => season.season_number === selectedGallerySeason
                            );
                            setScrapeDrawerContext({
                              type: "season",
                              showId: showId,
                              showName: show.name,
                              seasonNumber: selectedGallerySeason,
                              seasonId: selectedSeason?.id,
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
                  </div>

                  {(refreshTargetNotice.photos || refreshTargetError.photos) && (
                    <p
                      className={`mb-4 text-sm ${
                        refreshTargetError.photos ? "text-red-600" : "text-zinc-500"
                      }`}
                    >
                      {refreshTargetError.photos || refreshTargetNotice.photos}
                    </p>
                  )}
                  <RefreshProgressBar
                    show={refreshingTargets.photos}
                    stage={refreshTargetProgress.photos?.stage}
                    message={refreshTargetProgress.photos?.message}
                    current={refreshTargetProgress.photos?.current}
                    total={refreshTargetProgress.photos?.total}
                  />

                  {galleryLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-500" />
                    </div>
                  ) : filteredGalleryAssets.length === 0 ? (
                    <p className="py-8 text-center text-zinc-500">
                      No images found for this selection.
                    </p>
                  ) : (
                    <div className="space-y-8">
                  {/* Show Backdrops (TMDb backdrops) */}
                  {filteredGalleryAssets.filter(
                    (a) => a.type === "show" && isSeasonBackdrop(a) && (a.source ?? "").toLowerCase() === "tmdb"
                  )
                    .length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Backdrops
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            {filteredGalleryAssets
                              .filter(
                                (a) =>
                                  a.type === "show" &&
                                  isSeasonBackdrop(a) &&
                                  (a.source ?? "").toLowerCase() === "tmdb"
                              )
                              .map((asset, i, arr) => (
                                <button
                                  key={`${asset.id}-${i}`}
                                  onClick={(e) =>
                                    openAssetLightbox(asset, i, arr, e.currentTarget)
                                  }
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

                      {/* Show Posters */}
                      {filteredGalleryAssets.filter(
                        (a) =>
                          a.type === "show" && !isSeasonBackdrop(a) && (a.kind ?? "").toLowerCase().trim() === "poster"
                      ).length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Show Posters
                          </h4>
                          <div className="grid grid-cols-4 gap-4">
                            {filteredGalleryAssets
                              .filter(
                                (a) =>
                                  a.type === "show" &&
                                  !isSeasonBackdrop(a) &&
                                  (a.kind ?? "").toLowerCase().trim() === "poster"
                              )
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
                                    alt={asset.caption || "Show poster"}
                                    sizes="200px"
                                  />
                                </button>
                              ))}
                          </div>
                        </section>
                      )}

                      {/* Show Logos */}
                      {filteredGalleryAssets.filter(
                        (a) => a.type === "show" && (a.kind ?? "").toLowerCase().trim() === "logo"
                      ).length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Logos
                          </h4>
                          <div className="grid grid-cols-4 gap-4">
                            {filteredGalleryAssets
                              .filter(
                                (a) =>
                                  a.type === "show" &&
                                  (a.kind ?? "").toLowerCase().trim() === "logo"
                              )
                              .map((asset, i, arr) => (
                                <button
                                  key={`${asset.id}-${i}`}
                                  onClick={(e) =>
                                    openAssetLightbox(asset, i, arr, e.currentTarget)
                                  }
                                  className="relative aspect-[2/1] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <GalleryImage
                                    src={asset.hosted_url}
                                    alt={asset.caption || "Show logo"}
                                    sizes="250px"
                                    className="object-contain"
                                  />
                                </button>
                              ))}
                          </div>
                        </section>
                      )}

                      {/* Season Posters */}
                      {filteredGalleryAssets.filter((a) => a.type === "season").length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Season Posters
                          </h4>
                          <div className="grid grid-cols-4 gap-4">
                            {filteredGalleryAssets
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
                      {filteredGalleryAssets.filter((a) => a.type === "episode").length >
                        0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Episode Stills
                          </h4>
                          <div className="grid grid-cols-6 gap-3">
                            {filteredGalleryAssets
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
                      {filteredGalleryAssets.filter((a) => a.type === "cast").length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Cast Photos
                          </h4>
                          <div className="grid grid-cols-5 gap-4">
                            {filteredGalleryAssets
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
                </>
              ) : (
                <ShowBrandEditor
                  trrShowId={showId}
                  trrShowName={show.name}
                  trrSeasons={seasons}
                  trrCast={cast}
                />
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
                    type="button"
                    onClick={() => refreshShow("cast_credits")}
                    disabled={refreshingTargets.cast_credits}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {refreshingTargets.cast_credits ? "Refreshing..." : "Refresh Cast/Credits"}
                  </button>
                </div>
              </div>
              {(refreshTargetNotice.cast_credits ||
                refreshTargetError.cast_credits) && (
                <p
                  className={`mb-4 text-sm ${
                    refreshTargetError.cast_credits ? "text-red-600" : "text-zinc-500"
                  }`}
                >
                  {refreshTargetError.cast_credits ||
                    refreshTargetNotice.cast_credits}
                </p>
              )}
              <RefreshProgressBar
                show={refreshingTargets.cast_credits}
                stage={refreshTargetProgress.cast_credits?.stage}
                message={refreshTargetProgress.cast_credits?.message}
                current={refreshTargetProgress.cast_credits?.current}
                total={refreshTargetProgress.cast_credits?.total}
              />
              {(refreshNotice || refreshError) && (
                <p className={`mb-4 text-sm ${refreshError ? "text-red-600" : "text-zinc-500"}`}>
                  {refreshError || refreshNotice}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cast.map((member) => {
                  const thumbnailUrl = member.cover_photo_url || member.photo_url;
                  const episodeLabel =
                    typeof member.total_episodes === "number"
                      ? `${member.total_episodes} episodes`
                      : null;

                  return (
                    <Link
                      key={member.id}
                      href={`/admin/trr-shows/people/${member.person_id}?showId=${show.id}`}
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
                      {episodeLabel && (
                        <p className="text-sm text-zinc-600">{episodeLabel}</p>
                      )}
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
                          : "Refresh Person"}
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
              totalSeasons={visibleSeasons.length || show.show_total_seasons}
            />
          )}

          {/* Social Media Tab */}
          {activeTab === "social" && (
            <SocialPostsSection showId={showId} showName={show.name} />
          )}

          {/* Details Tab - External IDs */}
          {activeTab === "details" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Show Information
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    External IDs & Links
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => refreshShow("details")}
                  disabled={refreshingTargets.details}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  {refreshingTargets.details ? "Refreshing..." : "Refresh Show Details"}
                </button>
              </div>

              {(refreshTargetNotice.details || refreshTargetError.details) && (
                <p
                  className={`mb-4 text-sm ${
                    refreshTargetError.details ? "text-red-600" : "text-zinc-500"
                  }`}
                >
                  {refreshTargetError.details || refreshTargetNotice.details}
                </p>
              )}
              <RefreshProgressBar
                show={refreshingTargets.details}
                stage={refreshTargetProgress.details?.stage}
                message={refreshTargetProgress.details?.message}
                current={refreshTargetProgress.details?.current}
                total={refreshTargetProgress.details?.total}
              />

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

        {/* Lightbox for gallery assets */}
        {assetLightbox && (
          <ImageLightbox
            src={assetLightbox.asset.hosted_url}
            alt={assetLightbox.asset.caption || "Gallery image"}
            isOpen={true}
            onClose={closeAssetLightbox}
            metadata={mapSeasonAssetToMetadata(assetLightbox.asset, selectedGallerySeason !== "all" ? selectedGallerySeason : undefined, show?.name)}
            canManage={true}
            isStarred={Boolean((assetLightbox.asset.metadata as Record<string, unknown> | null)?.starred)}
            onToggleStar={(starred) => toggleStarGalleryAsset(assetLightbox.asset, starred)}
            onArchive={() => archiveGalleryAsset(assetLightbox.asset)}
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
              if (activeTab === "assets" && assetsView === "media") {
                loadGalleryAssets(selectedGallerySeason);
              }
            }}
          />
        )}

        <AdvancedFilterDrawer
          isOpen={advancedFiltersOpen}
          onClose={() => setAdvancedFiltersOpen(false)}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          availableSources={availableGallerySources}
          sortOptions={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "source", label: "Source" },
          ]}
          defaults={{ sort: "newest" }}
          unknownTextCount={unknownTextCount}
          onDetectTextForVisible={detectTextOverlayForUnknown}
          textOverlayDetectError={textOverlayDetectError}
        />
      </div>
    </ClientOnly>
  );
}
