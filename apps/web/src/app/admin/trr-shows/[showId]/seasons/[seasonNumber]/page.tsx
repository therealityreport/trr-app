"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import { GalleryAssetEditTools } from "@/components/admin/GalleryAssetEditTools";
import { ImageScrapeDrawer } from "@/components/admin/ImageScrapeDrawer";
import { AdvancedFilterDrawer } from "@/components/admin/AdvancedFilterDrawer";
import { ExternalLinks, TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import SeasonSocialAnalyticsSection from "@/components/admin/season-social-analytics-section";
import SurveysSection from "@/components/admin/surveys-section";
import ShowBrandEditor from "@/components/admin/ShowBrandEditor";
import { resolveGalleryAssetCapabilities } from "@/lib/admin/gallery-asset-capabilities";
import {
  canonicalizeCastRoleName,
  castRoleMatchesFilter,
  normalizeCastRoleList,
} from "@/lib/admin/cast-role-normalization";
import { mapSeasonAssetToMetadata, type PhotoMetadata } from "@/lib/photo-metadata";
import {
  readAdvancedFilters,
  writeAdvancedFilters,
  type AdvancedFilterState,
} from "@/lib/admin/advanced-filters";
import {
  inferHasTextOverlay,
  matchesContentTypesForSeasonAsset,
} from "@/lib/gallery-filter-utils";
import {
  buildMissingVariantBreakdown,
  getMissingVariantKeys,
  hasMissingVariants,
} from "@/lib/admin/gallery-diagnostics";
import { applyAdvancedFiltersToSeasonAssets } from "@/lib/gallery-advanced-filtering";
import {
  isThumbnailCropMode,
  resolveThumbnailPresentation,
} from "@/lib/thumbnail-crop";
import {
  buildShowAdminUrl,
  buildSeasonAdminUrl,
  cleanLegacyRoutingQuery,
  parseSeasonRouteState,
} from "@/lib/admin/show-admin-routes";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

interface TrrShow {
  id: string;
  name: string;
  slug: string;
  canonical_slug: string;
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
  archive_episodes_in_season?: number | null;
  total_episodes: number | null;
  photo_url: string | null;
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
}

interface TrrShowCastMember {
  person_id: string;
  full_name: string | null;
  cast_member_name: string | null;
  role: string | null;
  credit_category: string;
  photo_url: string | null;
  cover_photo_url: string | null;
}

interface CastRoleMember {
  person_id: string;
  person_name: string | null;
  total_episodes: number | null;
  latest_season: number | null;
  roles: string[];
  photo_url: string | null;
}

interface BravoVideoItem {
  title?: string | null;
  runtime?: string | null;
  kicker?: string | null;
  image_url?: string | null;
  clip_url: string;
  season_number?: number | null;
  published_at?: string | null;
}

type TabId = "episodes" | "assets" | "videos" | "cast" | "surveys" | "social" | "details";
type SeasonCastSource = "season_evidence" | "show_fallback";
type GalleryDiagnosticFilter = "all" | "missing-variants" | "oversized" | "unclassified";
type RefreshProgressState = {
  stage?: string | null;
  message?: string | null;
  current: number | null;
  total: number | null;
};

type EpisodeCoverageRow = {
  episodeId: string;
  episodeNumber: number;
  title: string | null;
  hasStill: boolean;
  hasDescription: boolean;
  hasAirDate: boolean;
  hasRuntime: boolean;
};

const SEASON_REFRESH_STAGE_LABELS: Record<string, string> = {
  starting: "Initializing",
  sync_show_images: "Show Media",
  sync_imdb_mediaindex: "Show Media",
  sync_tmdb_seasons: "Season Media",
  sync_tmdb_episodes: "Episode Media",
  mirror_show_images: "Show Media Mirroring",
  mirror_season_images: "Season Media Mirroring",
  mirror_episode_images: "Episode Media Mirroring",
  sync_cast_photos: "Cast Media",
  sync_imdb: "Cast Media (IMDb)",
  sync_tmdb: "Cast Media (TMDb)",
  sync_fandom: "Cast Media (Fandom)",
  mirror_cast_photos: "Cast Media Mirroring",
  auto_count: "Auto Count",
  word_id: "Word Detection",
  prune: "Cleanup",
  mirroring: "S3 Mirroring",
  mirror: "S3 Mirroring",
  cast_credits_show_cast: "Cast Credits",
  cast_credits_episode_appearances: "Episode Credits",
};

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const looksLikeUuid = (value: string): boolean => UUID_RE.test(value);

const formatFixed1 = (value: unknown): string | null => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? null : parsed.toFixed(1);
};

const parseProgressNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const humanizeStage = (value: string): string => {
  const normalized = value.replace(/[_-]+/g, " ").trim();
  if (!normalized) return "Working";
  return normalized
    .split(" ")
    .map((token) =>
      token.length > 0 ? token.charAt(0).toUpperCase() + token.slice(1) : token
    )
    .join(" ");
};

const resolveStageLabel = (
  stageValue: unknown,
  stageLabels: Record<string, string>
): string | null => {
  if (typeof stageValue !== "string") return null;
  const normalized = stageValue.trim().toLowerCase();
  if (!normalized) return null;
  return stageLabels[normalized] ?? humanizeStage(normalized);
};

const buildProgressMessage = (
  stageLabel: string | null,
  rawMessage: unknown,
  fallback: string
): string => {
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (!message) return stageLabel ? `Working on ${stageLabel}...` : fallback;
  if (stageLabel) return `${stageLabel}: ${message}`;
  return message;
};

function GalleryImage({
  src,
  alt,
  sizes = "200px",
  className = "object-cover",
  style,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
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
      style={style}
      sizes={sizes}
      unoptimized
      onError={() => setHasError(true)}
    />
  );
}

function CastPhoto({
  src,
  alt,
  thumbnail_focus_x,
  thumbnail_focus_y,
  thumbnail_zoom,
  thumbnail_crop_mode,
}: {
  src: string;
  alt: string;
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
}) {
  const hasPersistedCrop =
    isThumbnailCropMode(thumbnail_crop_mode) &&
    typeof thumbnail_focus_x === "number" &&
    Number.isFinite(thumbnail_focus_x) &&
    typeof thumbnail_focus_y === "number" &&
    Number.isFinite(thumbnail_focus_y) &&
    typeof thumbnail_zoom === "number" &&
    Number.isFinite(thumbnail_zoom);

  const presentation = resolveThumbnailPresentation({
    width: null,
    height: null,
    crop: hasPersistedCrop
      ? {
          x: thumbnail_focus_x,
          y: thumbnail_focus_y,
          zoom: thumbnail_zoom,
          mode: thumbnail_crop_mode,
        }
      : null,
  });

  return (
    <GalleryImage
      src={src}
      alt={alt}
      sizes="200px"
      className="object-cover transition-transform duration-300"
      style={{
        objectPosition: presentation.objectPosition,
        transformOrigin: presentation.objectPosition,
        transform: presentation.zoom !== 1 ? `scale(${presentation.zoom})` : undefined,
      }}
    />
  );
}

const getAssetDisplayUrl = (asset: SeasonAsset): string => {
  const cropDisplay =
    typeof asset.crop_display_url === "string" && asset.crop_display_url.trim().length > 0
      ? asset.crop_display_url.trim()
      : null;
  const thumb =
    typeof asset.thumb_url === "string" && asset.thumb_url.trim().length > 0
      ? asset.thumb_url.trim()
      : null;
  const display =
    typeof asset.display_url === "string" && asset.display_url.trim().length > 0
      ? asset.display_url.trim()
      : null;
  return cropDisplay ?? thumb ?? display ?? asset.hosted_url;
};

const getAssetDetailUrl = (asset: SeasonAsset): string => {
  const cropDetail =
    typeof asset.crop_detail_url === "string" && asset.crop_detail_url.trim().length > 0
      ? asset.crop_detail_url.trim()
      : null;
  const detail =
    typeof asset.detail_url === "string" && asset.detail_url.trim().length > 0
      ? asset.detail_url.trim()
      : null;
  return cropDetail ?? detail ?? asset.hosted_url;
};

const normalizeContentTypeToken = (contentType: string): string =>
  contentType.trim().toUpperCase().replace(/[_-]+/g, " ");

const contentTypeToAssetKind = (contentType: string): string => {
  const normalized = normalizeContentTypeToken(contentType);
  switch (normalized) {
    case "PROMO":
      return "promo";
    case "CONFESSIONAL":
      return "confessional";
    case "REUNION":
      return "reunion";
    case "INTRO":
      return "intro";
    case "EPISODE STILL":
      return "episode_still";
    case "CAST PHOTOS":
      return "cast";
    case "BACKDROP":
      return "backdrop";
    case "POSTER":
      return "poster";
    case "LOGO":
      return "logo";
    default:
      return "other";
  }
};

const contentTypeToContextType = (contentType: string): string => {
  const normalized = normalizeContentTypeToken(contentType);
  switch (normalized) {
    case "EPISODE STILL":
      return "episode still";
    case "CAST PHOTOS":
      return "cast photos";
    default:
      return normalized.toLowerCase();
  }
};

const isCrewCreditCategory = (value: string | null | undefined): boolean => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === "crew" ||
    normalized.includes("crew") ||
    normalized.includes("producer") ||
    normalized.includes("production")
  );
};

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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showRouteParam = params.showId as string;
  const [resolvedShowId, setResolvedShowId] = useState<string | null>(
    looksLikeUuid(showRouteParam) ? showRouteParam : null
  );
  const [slugResolutionLoading, setSlugResolutionLoading] = useState(!looksLikeUuid(showRouteParam));
  const [slugResolutionError, setSlugResolutionError] = useState<string | null>(null);
  const showId = resolvedShowId ?? "";
  const seasonNumberParam = params.seasonNumber as string;
  const seasonNumber = Number.parseInt(seasonNumberParam, 10);
  const { user, checking, hasAccess } = useAdminGuard();

  const [show, setShow] = useState<TrrShow | null>(null);
  const [season, setSeason] = useState<TrrSeason | null>(null);
  const [showSeasons, setShowSeasons] = useState<TrrSeason[]>([]);
  const [episodes, setEpisodes] = useState<TrrEpisode[]>([]);
  const [assets, setAssets] = useState<SeasonAsset[]>([]);
  const [assetsVisibleCount, setAssetsVisibleCount] = useState(120);
  const [cast, setCast] = useState<SeasonCastMember[]>([]);
  const [seasonCastSource, setSeasonCastSource] = useState<SeasonCastSource>("season_evidence");
  const [seasonCastEligibilityWarning, setSeasonCastEligibilityWarning] = useState<string | null>(null);
  const [archiveCast, setArchiveCast] = useState<SeasonCastMember[]>([]);
  const [bravoVideos, setBravoVideos] = useState<BravoVideoItem[]>([]);
  const [bravoVideosLoading, setBravoVideosLoading] = useState(false);
  const [bravoVideosError, setBravoVideosError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("episodes");
  const [assetsView, setAssetsView] = useState<"media" | "brand">("media");
  const [allowPlaceholderMediaOverride, setAllowPlaceholderMediaOverride] = useState(false);
  const [galleryDiagnosticFilter, setGalleryDiagnosticFilter] =
    useState<GalleryDiagnosticFilter>("all");
  const [galleryDiagnosticsOpen, setGalleryDiagnosticsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingAssets, setRefreshingAssets] = useState(false);
  const [assetsRefreshNotice, setAssetsRefreshNotice] = useState<string | null>(null);
  const [assetsRefreshError, setAssetsRefreshError] = useState<string | null>(null);
  const [assetsRefreshProgress, setAssetsRefreshProgress] = useState<RefreshProgressState | null>(
    null
  );
  const [refreshingCast, setRefreshingCast] = useState(false);
  const [castRefreshNotice, setCastRefreshNotice] = useState<string | null>(null);
  const [castRefreshError, setCastRefreshError] = useState<string | null>(null);
  const [castRefreshProgress, setCastRefreshProgress] = useState<RefreshProgressState | null>(
    null
  );
  const [trrShowCast, setTrrShowCast] = useState<TrrShowCastMember[]>([]);
  const [trrShowCastLoading, setTrrShowCastLoading] = useState(false);
  const [trrShowCastError, setTrrShowCastError] = useState<string | null>(null);
  const [castRoleMembers, setCastRoleMembers] = useState<CastRoleMember[]>([]);
  const [castRoleMembersLoading, setCastRoleMembersLoading] = useState(false);
  const [castRoleMembersError, setCastRoleMembersError] = useState<string | null>(null);
  const [castSortBy, setCastSortBy] = useState<"episodes" | "season" | "name">("episodes");
  const [castSortOrder, setCastSortOrder] = useState<"desc" | "asc">("desc");
  const [castRoleFilters, setCastRoleFilters] = useState<string[]>([]);
  const [castCreditFilters, setCastCreditFilters] = useState<string[]>([]);
  const [castHasImageFilter, setCastHasImageFilter] = useState<"all" | "yes" | "no">("all");
  const showCastFetchAttemptedRef = useRef(false);

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

  const seasonRouteState = useMemo(
    () => parseSeasonRouteState(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams]
  );

  useEffect(() => {
    setActiveTab(seasonRouteState.tab);
    if (seasonRouteState.tab === "assets") {
      setAssetsView(seasonRouteState.assetsSubTab);
    }
  }, [seasonRouteState.assetsSubTab, seasonRouteState.tab]);

  const showSlugForRouting = useMemo(() => {
    const canonical = show?.canonical_slug?.trim();
    if (canonical) return canonical;
    const base = show?.slug?.trim();
    if (base) return base;
    return showRouteParam.trim();
  }, [show?.canonical_slug, show?.slug, showRouteParam]);

  const setTab = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      const preservedQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
      router.replace(
        buildSeasonAdminUrl({
          showSlug: showSlugForRouting,
          seasonNumber,
          tab,
          assetsSubTab: tab === "assets" ? assetsView : undefined,
          query: preservedQuery,
        }) as Route,
        { scroll: false }
      );
    },
    [assetsView, router, searchParams, seasonNumber, showSlugForRouting]
  );

  const setAssetsSubTab = useCallback(
    (view: "media" | "brand") => {
      setAssetsView(view);
      const preservedQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
      router.replace(
        buildSeasonAdminUrl({
          showSlug: showSlugForRouting,
          seasonNumber,
          tab: "assets",
          assetsSubTab: view,
          query: preservedQuery,
        }) as Route,
        { scroll: false }
      );
    },
    [router, searchParams, seasonNumber, showSlugForRouting]
  );

  const [addBackdropsOpen, setAddBackdropsOpen] = useState(false);
  const [unassignedBackdrops, setUnassignedBackdrops] = useState<
    Array<{
      media_asset_id: string;
      hosted_url: string | null;
      source_url: string | null;
      display_url: string;
      width: number | null;
      height: number | null;
      caption: string | null;
      fetched_at: string | null;
      metadata: Record<string, unknown> | null;
    }>
  >([]);
  const [backdropsLoading, setBackdropsLoading] = useState(false);
  const [backdropsError, setBackdropsError] = useState<string | null>(null);
  const [selectedBackdropIds, setSelectedBackdropIds] = useState<Set<string>>(new Set());
  const [assigningBackdrops, setAssigningBackdrops] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    if (checking || !hasAccess) return;
    const raw = typeof showRouteParam === "string" ? showRouteParam.trim() : "";
    if (!raw) {
      setResolvedShowId(null);
      setSlugResolutionLoading(false);
      setSlugResolutionError("Missing show identifier.");
      return;
    }
    if (looksLikeUuid(raw)) {
      setResolvedShowId(raw);
      setSlugResolutionLoading(false);
      setSlugResolutionError(null);
      return;
    }

    let cancelled = false;
    const resolveSlug = async () => {
      setSlugResolutionLoading(true);
      setSlugResolutionError(null);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/shows/resolve-slug?slug=${encodeURIComponent(raw)}`,
          { headers, cache: "no-store" }
        );
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          resolved?: { show_id?: string | null };
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to resolve show slug");
        }
        const nextShowId =
          typeof data.resolved?.show_id === "string" && looksLikeUuid(data.resolved.show_id)
            ? data.resolved.show_id
            : null;
        if (!nextShowId) throw new Error("Resolved show slug did not return a valid show id.");
        if (cancelled) return;
        setResolvedShowId(nextShowId);
      } catch (err) {
        if (cancelled) return;
        setResolvedShowId(null);
        setSlugResolutionError(
          err instanceof Error ? err.message : "Could not resolve show URL slug."
        );
      } finally {
        if (!cancelled) setSlugResolutionLoading(false);
      }
    };

    void resolveSlug();
    return () => {
      cancelled = true;
    };
  }, [checking, getAuthHeaders, hasAccess, showRouteParam]);

  useEffect(() => {
    const canonicalSlug = show?.canonical_slug?.trim() || show?.slug?.trim();
    if (!canonicalSlug) return;

    const preservedQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
    const canonicalUrl = buildSeasonAdminUrl({
      showSlug: canonicalSlug,
      seasonNumber,
      tab: seasonRouteState.tab,
      assetsSubTab: seasonRouteState.assetsSubTab,
      query: preservedQuery,
    });
    const currentQuery = searchParams.toString();
    const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;
    if (currentUrl === canonicalUrl) return;
    router.replace(canonicalUrl as Route, { scroll: false });
  }, [
    pathname,
    router,
    searchParams,
    seasonNumber,
    seasonRouteState.assetsSubTab,
    seasonRouteState.tab,
    show?.canonical_slug,
    show?.slug,
  ]);

  useEffect(() => {
    const routeSlug = showRouteParam.trim();
    if (!routeSlug) return;
    if (!Number.isFinite(seasonNumber)) return;

    const preservedQuery = cleanLegacyRoutingQuery(new URLSearchParams(searchParams.toString()));
    const canonicalRouteUrl = buildSeasonAdminUrl({
      showSlug: routeSlug,
      seasonNumber,
      tab: seasonRouteState.tab,
      assetsSubTab: seasonRouteState.assetsSubTab,
      query: preservedQuery,
    });
    const currentQuery = searchParams.toString();
    const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;
    if (currentUrl === canonicalRouteUrl) return;
    router.replace(canonicalRouteUrl as Route, { scroll: false });
  }, [
    pathname,
    router,
    searchParams,
    seasonNumber,
    seasonRouteState.assetsSubTab,
    seasonRouteState.tab,
    showRouteParam,
  ]);
  const fetchShowCastForBrand = useCallback(async () => {
    if (!showId) return;
    setTrrShowCastError(null);
    setTrrShowCastLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}/cast?limit=500`, {
        headers,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || "Failed to fetch show cast");
      }
      const nextCast = Array.isArray((data as { cast?: unknown }).cast)
        ? ((data as { cast: unknown[] }).cast as TrrShowCastMember[])
        : [];
      setTrrShowCast(nextCast);
    } catch (err) {
      setTrrShowCastError(err instanceof Error ? err.message : "Failed to fetch show cast");
      setTrrShowCast([]);
    } finally {
      showCastFetchAttemptedRef.current = true;
      setTrrShowCastLoading(false);
    }
  }, [getAuthHeaders, showId]);

  const fetchCastRoleMembers = useCallback(async () => {
    if (!showId) return;
    if (!Number.isFinite(seasonNumber)) return;
    setCastRoleMembersLoading(true);
    setCastRoleMembersError(null);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("seasons", String(seasonNumber));
      const response = await fetch(
        `/api/admin/trr-api/shows/${showId}/cast-role-members?${params.toString()}`,
        { headers, cache: "no-store" }
      );
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to load cast role members");
      setCastRoleMembers(
        (Array.isArray(data) ? data : []).map((row) => {
          const roles = Array.isArray((row as { roles?: unknown }).roles)
            ? ((row as { roles: unknown[] }).roles.filter(
                (value): value is string => typeof value === "string" && value.trim().length > 0
              ) as string[])
            : [];
          return {
            person_id: String((row as { person_id?: unknown }).person_id ?? ""),
            person_name:
              typeof (row as { person_name?: unknown }).person_name === "string"
                ? (row as { person_name: string }).person_name
                : null,
            total_episodes:
              typeof (row as { total_episodes?: unknown }).total_episodes === "number"
                ? (row as { total_episodes: number }).total_episodes
                : null,
            latest_season:
              typeof (row as { latest_season?: unknown }).latest_season === "number"
                ? (row as { latest_season: number }).latest_season
                : null,
            roles,
            photo_url:
              typeof (row as { photo_url?: unknown }).photo_url === "string"
                ? (row as { photo_url: string }).photo_url
                : null,
          };
        })
      );
    } catch (err) {
      setCastRoleMembers([]);
      setCastRoleMembersError(err instanceof Error ? err.message : "Failed to load cast role members");
    } finally {
      setCastRoleMembersLoading(false);
    }
  }, [getAuthHeaders, seasonNumber, showId]);

  const fetchSeasonBravoVideos = useCallback(async () => {
    if (!showId) return;
    if (!Number.isFinite(seasonNumber)) return;
    setBravoVideosLoading(true);
    setBravoVideosError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/shows/${showId}/bravo/videos?season_number=${seasonNumber}&merge_person_sources=true`,
        {
          headers,
          cache: "no-store",
        }
      );
      const data = (await response.json().catch(() => ({}))) as {
        videos?: BravoVideoItem[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch season videos");
      }
      setBravoVideos(Array.isArray(data.videos) ? data.videos : []);
    } catch (err) {
      setBravoVideosError(err instanceof Error ? err.message : "Failed to fetch season videos");
    } finally {
      setBravoVideosLoading(false);
    }
  }, [getAuthHeaders, seasonNumber, showId]);

  const loadSeasonData = useCallback(async () => {
    if (!showId) return;
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

      const seasonList = Array.isArray(seasonsData.seasons)
        ? (seasonsData.seasons as TrrSeason[])
        : [];
      setShowSeasons(seasonList);

      const foundSeason = seasonList.find(
        (s) => s.season_number === seasonNumber
      );

      if (!foundSeason) {
        setError("Season not found");
        setSeason(null);
        setEpisodes([]);
        setAssets([]);
        setCast([]);
        setSeasonCastSource("season_evidence");
        setSeasonCastEligibilityWarning(null);
        setArchiveCast([]);
        setLoading(false);
        return;
      }

      setSeason(foundSeason);
      const [episodesResponse, assetsResponse, castResponse, castWithArchiveResponse] = await Promise.all([
        fetch(`/api/admin/trr-api/seasons/${foundSeason.id}/episodes?limit=500`, { headers }),
        fetch(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/assets?limit=250&offset=0`,
          { headers }
        ),
        fetch(`/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/cast?limit=500`, { headers }),
        fetch(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/cast?limit=500&include_archive_only=true`,
          { headers }
        ),
      ]);

      if (!episodesResponse.ok) throw new Error("Failed to fetch episodes");
      if (!assetsResponse.ok) throw new Error("Failed to fetch season media");
      if (!castResponse.ok) throw new Error("Failed to fetch season cast");
      if (!castWithArchiveResponse.ok) throw new Error("Failed to fetch season archive cast");

      const episodesData = await episodesResponse.json();
      const assetsData = await assetsResponse.json();
      const castData = await castResponse.json();
      const castWithArchiveData = await castWithArchiveResponse.json();

      setEpisodes(episodesData.episodes ?? []);
      setAssets(assetsData.assets ?? []);
      setCast(castData.cast ?? []);
      setSeasonCastSource(
        castData.cast_source === "show_fallback" ? "show_fallback" : "season_evidence"
      );
      setSeasonCastEligibilityWarning(
        typeof castData.eligibility_warning === "string" && castData.eligibility_warning.trim()
          ? castData.eligibility_warning
          : null
      );
      const allSeasonCast = Array.isArray(castWithArchiveData.cast)
        ? (castWithArchiveData.cast as SeasonCastMember[])
        : [];
      setArchiveCast(
        allSeasonCast.filter(
          (member) =>
            (member.episodes_in_season ?? 0) <= 0 &&
            ((member.archive_episodes_in_season as number | null | undefined) ?? 0) > 0
        )
      );
      await fetchSeasonBravoVideos();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load season");
      setSeasonCastSource("season_evidence");
      setSeasonCastEligibilityWarning(null);
    } finally {
      setLoading(false);
    }
  }, [fetchSeasonBravoVideos, getAuthHeaders, seasonNumber, showId]);

  useEffect(() => {
    if (!hasAccess) return;
    if (!showId) return;
    loadSeasonData();
  }, [hasAccess, loadSeasonData, showId]);

  useEffect(() => {
    setAllowPlaceholderMediaOverride(false);
    setGalleryDiagnosticFilter("all");
    setCastSortBy("episodes");
    setCastSortOrder("desc");
    setCastRoleFilters([]);
    setCastCreditFilters([]);
    setCastHasImageFilter("all");
    setCastRoleMembers([]);
    setCastRoleMembersError(null);
  }, [season?.id]);

  useEffect(() => {
    if (!hasAccess) return;
    if (activeTab !== "assets" || assetsView !== "brand") return;
    if (showCastFetchAttemptedRef.current) return;
    fetchShowCastForBrand();
  }, [hasAccess, activeTab, assetsView, fetchShowCastForBrand]);

  useEffect(() => {
    if (!hasAccess || !showId) return;
    if (activeTab !== "cast") return;
    void fetchCastRoleMembers();
    if (!showCastFetchAttemptedRef.current) {
      void fetchShowCastForBrand();
    }
  }, [activeTab, fetchCastRoleMembers, fetchShowCastForBrand, hasAccess, showId]);

  const fetchAssets = useCallback(async () => {
    if (!showId) return;
    const headers = await getAuthHeaders();
    const sourcesParam = advancedFilters.sources.length
      ? `&sources=${encodeURIComponent(advancedFilters.sources.join(","))}`
      : "";
    const response = await fetch(
      `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/assets?limit=250&offset=0${sourcesParam}`,
      { headers }
    );
    if (!response.ok) throw new Error("Failed to fetch season media");
    const data = await response.json();
    setAssets(data.assets ?? []);
  }, [showId, seasonNumber, getAuthHeaders, advancedFilters.sources]);

  useEffect(() => {
    if (!hasAccess || !showId) return;
    if (activeTab !== "assets" || assetsView !== "media") return;
    void fetchAssets().catch((err) => {
      console.error("Failed to refresh filtered season media:", err);
    });
  }, [hasAccess, showId, activeTab, assetsView, fetchAssets]);

  const handleRefreshImages = useCallback(async () => {
    if (!showId) return;
    if (refreshingAssets) return;
    setRefreshingAssets(true);
    setAssetsRefreshError(null);
    setAssetsRefreshNotice(null);
    setAssetsRefreshProgress({
      stage: "Initializing",
      message: "Refreshing show/season/episode media...",
      current: 0,
      total: null,
    });
    try {
      const headers = await getAuthHeaders();
      let sawComplete = false;
      let streamFailed = false;

      try {
        const streamResponse = await fetch(`/api/admin/trr-api/shows/${showId}/refresh-photos/stream`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ skip_mirror: false }),
        });

        if (!streamResponse.ok || !streamResponse.body) {
          throw new Error("Media refresh stream unavailable");
        }

        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
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
              const stageLabel = resolveStageLabel(
                (payload as { stage?: unknown; step?: unknown }).stage ??
                  (payload as { stage?: unknown; step?: unknown }).step,
                SEASON_REFRESH_STAGE_LABELS
              );
              const stageCurrent = parseProgressNumber(
                (payload as { stage_current?: unknown }).stage_current
              );
              const stageTotal = parseProgressNumber(
                (payload as { stage_total?: unknown }).stage_total
              );
              const current = parseProgressNumber(
                (payload as { current?: unknown }).current
              );
              const total = parseProgressNumber(
                (payload as { total?: unknown }).total
              );

              setAssetsRefreshProgress({
                stage: stageLabel,
                message: buildProgressMessage(
                  stageLabel,
                  (payload as { message?: unknown }).message,
                  "Refreshing media..."
                ),
                current: stageCurrent ?? current,
                total: stageTotal ?? total,
              });
            } else if (eventType === "complete") {
              sawComplete = true;
            } else if (eventType === "error") {
              const errorPayload =
                payload && typeof payload === "object"
                  ? (payload as { error?: unknown; detail?: unknown })
                  : null;
              const errorText =
                typeof errorPayload?.error === "string" && errorPayload.error
                  ? errorPayload.error
                  : "Failed to refresh media";
              const detailText =
                typeof errorPayload?.detail === "string" && errorPayload.detail
                  ? errorPayload.detail
                  : null;
              throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
            }

            boundaryIndex = buffer.indexOf("\n\n");
          }
        }
      } catch (streamErr) {
        streamFailed = true;
        console.warn("Season media refresh stream failed, falling back to non-stream.", streamErr);
      }

      if (streamFailed) {
        setAssetsRefreshProgress({
          stage: "Fallback",
          message: "Refreshing media...",
          current: null,
          total: null,
        });
        const fallbackResponse = await fetch(`/api/admin/trr-api/shows/${showId}/refresh`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ targets: ["photos"] }),
        });
        const fallbackData = await fallbackResponse.json().catch(() => ({}));
        if (!fallbackResponse.ok) {
          const message =
            typeof (fallbackData as { error?: unknown }).error === "string"
              ? (fallbackData as { error: string }).error
              : "Failed to refresh media";
          throw new Error(message);
        }
      }

      await fetchAssets();
      setAssetsRefreshNotice(
        streamFailed
          ? "Refreshed media."
          : sawComplete
          ? "Refreshed show, season, episode, and cast media."
          : "Refreshed media."
      );
    } catch (err) {
      console.error("Failed to refresh media:", err);
      setAssetsRefreshError(err instanceof Error ? err.message : "Failed to refresh media");
    } finally {
      setRefreshingAssets(false);
      setAssetsRefreshProgress(null);
    }
  }, [refreshingAssets, fetchAssets, getAuthHeaders, showId]);

  const refreshSeasonCast = useCallback(async () => {
    if (!showId) return;
    if (refreshingCast) return;

    setRefreshingCast(true);
    setCastRefreshError(null);
    setCastRefreshNotice(null);
    setCastRefreshProgress({
      stage: "Initializing",
      message: "Refreshing cast credits and cast media...",
      current: 0,
      total: null,
    });

    try {
      const headers = await getAuthHeaders();
      let streamFailed = false;

      try {
        const refreshResponse = await fetch(`/api/admin/trr-api/shows/${showId}/refresh/stream`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ targets: ["cast_credits"] }),
        });

        if (!refreshResponse.ok || !refreshResponse.body) {
          throw new Error("Cast refresh stream unavailable");
        }

        const reader = refreshResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
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
              const stageLabel = resolveStageLabel(
                (payload as { step?: unknown; stage?: unknown }).step ??
                  (payload as { step?: unknown; stage?: unknown }).stage,
                SEASON_REFRESH_STAGE_LABELS
              );
              const current = parseProgressNumber(
                (payload as { current?: unknown }).current
              );
              const total = parseProgressNumber((payload as { total?: unknown }).total);
              setCastRefreshProgress({
                stage: stageLabel,
                message: buildProgressMessage(
                  stageLabel,
                  (payload as { message?: unknown }).message,
                  "Refreshing cast..."
                ),
                current,
                total,
              });
            } else if (eventType === "error") {
              const errorPayload =
                payload && typeof payload === "object"
                  ? (payload as { error?: unknown; detail?: unknown })
                  : null;
              const errorText =
                typeof errorPayload?.error === "string" && errorPayload.error
                  ? errorPayload.error
                  : "Failed to refresh cast credits";
              const detailText =
                typeof errorPayload?.detail === "string" && errorPayload.detail
                  ? errorPayload.detail
                  : null;
              throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
            }

            boundaryIndex = buffer.indexOf("\n\n");
          }
        }
      } catch (streamErr) {
        streamFailed = true;
        console.warn("Season cast refresh stream failed, falling back to non-stream.", streamErr);
      }

      if (streamFailed) {
        setCastRefreshProgress({
          stage: "Fallback",
          message: "Refreshing cast credits...",
          current: null,
          total: null,
        });
        const fallbackResponse = await fetch(`/api/admin/trr-api/shows/${showId}/refresh`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ targets: ["cast_credits"] }),
        });
        const fallbackData = await fallbackResponse.json().catch(() => ({}));
        if (!fallbackResponse.ok) {
          const message =
            typeof (fallbackData as { error?: unknown }).error === "string"
              ? (fallbackData as { error: string }).error
              : "Failed to refresh cast credits";
          throw new Error(message);
        }
      }

      const castResponse = await fetch(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/cast?limit=500`,
        { headers }
      );
      const castData = await castResponse.json().catch(() => ({}));
      if (!castResponse.ok) {
        const message =
          typeof (castData as { error?: unknown }).error === "string"
            ? (castData as { error: string }).error
            : "Failed to fetch refreshed season cast";
        throw new Error(message);
      }

      const refreshedCast = (castData as { cast?: unknown }).cast;
      const refreshedCastSource = (castData as { cast_source?: unknown }).cast_source;
      const refreshedCastWarning = (castData as { eligibility_warning?: unknown }).eligibility_warning;
      const refreshedCastMembers = Array.isArray(refreshedCast)
        ? (refreshedCast as SeasonCastMember[])
        : [];
      setCast(refreshedCastMembers);
      setSeasonCastSource(
        refreshedCastSource === "show_fallback" ? "show_fallback" : "season_evidence"
      );
      setSeasonCastEligibilityWarning(
        typeof refreshedCastWarning === "string" && refreshedCastWarning.trim()
          ? refreshedCastWarning
          : null
      );

      const archiveCastResponse = await fetch(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/cast?limit=500&include_archive_only=true`,
        { headers }
      );
      const archiveCastData = await archiveCastResponse.json().catch(() => ({}));
      if (!archiveCastResponse.ok) {
        const message =
          typeof (archiveCastData as { error?: unknown }).error === "string"
            ? (archiveCastData as { error: string }).error
            : "Failed to fetch archive-footage cast";
        throw new Error(message);
      }
      const archiveRows = Array.isArray((archiveCastData as { cast?: unknown }).cast)
        ? ((archiveCastData as { cast: unknown[] }).cast as SeasonCastMember[])
        : [];
      setArchiveCast(
        archiveRows.filter(
          (member) =>
            (member.episodes_in_season ?? 0) <= 0 &&
            ((member.archive_episodes_in_season as number | null | undefined) ?? 0) > 0
        )
      );

      const castMembersToSync = Array.from(
        new Map(
          refreshedCastMembers
            .filter(
              (member) => typeof member.person_id === "string" && member.person_id.trim()
            )
            .map((member) => [member.person_id, member] as const)
        ).values()
      );

      let castProfilesFailed = 0;
      const castProfilesTotal = castMembersToSync.length;

      for (const [index, member] of castMembersToSync.entries()) {
        const displayName = member.person_name || `Cast member ${index + 1}`;
        setCastRefreshProgress({
          stage: "Cast Profiles & Media",
          message: `Syncing ${displayName} from TMDb/IMDb/Fandom (${index + 1}/${castProfilesTotal})...`,
          current: index,
          total: castProfilesTotal,
        });

        const requestBody = {
          skip_mirror: false,
          show_id: showId,
          show_name: show?.name ?? undefined,
        };

        try {
          let personStreamFailed = false;
          try {
            const personStreamResponse = await fetch(
              `/api/admin/trr-api/people/${member.person_id}/refresh-images/stream`,
              {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
              }
            );

            if (!personStreamResponse.ok || !personStreamResponse.body) {
              throw new Error("Person refresh stream unavailable");
            }

            const personReader = personStreamResponse.body.getReader();
            const personDecoder = new TextDecoder();
            let personBuffer = "";

            while (true) {
              const { value, done } = await personReader.read();
              if (done) break;
              personBuffer += personDecoder.decode(value, { stream: true });
              personBuffer = personBuffer.replace(/\r\n/g, "\n");

              let boundaryIndex = personBuffer.indexOf("\n\n");
              while (boundaryIndex !== -1) {
                const rawEvent = personBuffer.slice(0, boundaryIndex);
                personBuffer = personBuffer.slice(boundaryIndex + 2);

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
                  const stageLabel = resolveStageLabel(
                    (payload as { stage?: unknown; step?: unknown }).stage ??
                      (payload as { stage?: unknown; step?: unknown }).step,
                    SEASON_REFRESH_STAGE_LABELS
                  );
                  setCastRefreshProgress({
                    stage: stageLabel ?? "Cast Profiles & Media",
                    message: buildProgressMessage(
                      stageLabel,
                      (payload as { message?: unknown }).message,
                      `Syncing ${displayName}...`
                    ),
                    current: index,
                    total: castProfilesTotal,
                  });
                } else if (eventType === "error") {
                  throw new Error("Failed to sync cast member profile/media");
                }

                boundaryIndex = personBuffer.indexOf("\n\n");
              }
            }
          } catch (personStreamErr) {
            personStreamFailed = true;
            console.warn(
              `Season cast member stream refresh failed for ${displayName}; using non-stream fallback.`,
              personStreamErr
            );
          }

          if (personStreamFailed) {
            const personFallbackResponse = await fetch(
              `/api/admin/trr-api/people/${member.person_id}/refresh-images`,
              {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
              }
            );
            const personFallbackData = await personFallbackResponse.json().catch(() => ({}));
            if (!personFallbackResponse.ok) {
              const message =
                typeof (personFallbackData as { error?: unknown }).error === "string"
                  ? (personFallbackData as { error: string }).error
                  : "Failed to sync cast member profile/media";
              throw new Error(message);
            }
          }
        } catch (castProfileErr) {
          console.warn(
            `Failed syncing season cast profile/media for ${displayName}:`,
            castProfileErr
          );
          castProfilesFailed += 1;
        } finally {
          setCastRefreshProgress({
            stage: "Cast Profiles & Media",
            message: `Synced ${index + 1}/${castProfilesTotal} cast profiles/media...`,
            current: index + 1,
            total: castProfilesTotal,
          });
        }
      }

      await Promise.all([fetchCastRoleMembers(), fetchShowCastForBrand()]);

      setCastRefreshNotice(
        castProfilesTotal > 0
          ? `Refreshed season cast, then synced cast profiles/media from TMDb/IMDb/Fandom (${castProfilesTotal - castProfilesFailed}/${castProfilesTotal}${castProfilesFailed > 0 ? `, ${castProfilesFailed} failed` : ""}).`
          : "Refreshed season cast."
      );
    } catch (err) {
      setCastRefreshError(err instanceof Error ? err.message : "Failed to refresh season cast");
    } finally {
      setRefreshingCast(false);
      setCastRefreshProgress(null);
    }
  }, [
    refreshingCast,
    getAuthHeaders,
    showId,
    seasonNumber,
    show?.name,
    fetchCastRoleMembers,
    fetchShowCastForBrand,
  ]);

  const openAddBackdrops = useCallback(async () => {
    if (!season?.id) return;
    const mediaEligible =
      Boolean(
        (season.premiere_date && season.premiere_date.trim()) ||
          (season.air_date && season.air_date.trim())
      ) || episodes.length > 1;
    if (!mediaEligible && !allowPlaceholderMediaOverride) {
      setBackdropsError(
        "Season is marked as placeholder. Add a premiere date or more than one episode, or enable override to continue."
      );
      return;
    }
    setAddBackdropsOpen(true);
    setBackdropsError(null);
    setBackdropsLoading(true);
    setSelectedBackdropIds(new Set());
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/seasons/${season.id}/unassigned-backdrops`,
        { headers }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to load backdrops");
      }
      setUnassignedBackdrops(data.backdrops ?? []);
    } catch (err) {
      setUnassignedBackdrops([]);
      setBackdropsError(err instanceof Error ? err.message : "Failed to load backdrops");
    } finally {
      setBackdropsLoading(false);
    }
  }, [
    allowPlaceholderMediaOverride,
    episodes.length,
    getAuthHeaders,
    season?.air_date,
    season?.id,
    season?.premiere_date,
  ]);

  const assignSelectedBackdrops = useCallback(async () => {
    if (!season?.id) return;
    const ids = Array.from(selectedBackdropIds);
    if (ids.length === 0) return;
    setAssigningBackdrops(true);
    setBackdropsError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/seasons/${season.id}/assign-backdrops`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ media_asset_ids: ids }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to assign backdrops");
      }
      const failedIds = Array.isArray(data.mirrored_failed_ids)
        ? (data.mirrored_failed_ids.filter((v: unknown) => typeof v === "string") as string[])
        : [];
      if (failedIds.length > 0) {
        setBackdropsError(
          `Assigned, but failed to mirror ${failedIds.length} image(s). Try again in a moment.`
        );
      } else {
        setAddBackdropsOpen(false);
      }
      setSelectedBackdropIds(new Set());
      await fetchAssets();
    } catch (err) {
      setBackdropsError(err instanceof Error ? err.message : "Failed to assign backdrops");
    } finally {
      setAssigningBackdrops(false);
    }
  }, [season?.id, selectedBackdropIds, getAuthHeaders, fetchAssets]);

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

  const applyAssetPatch = useCallback((target: SeasonAsset, patch: Partial<SeasonAsset>) => {
    const applyPatch = (candidate: SeasonAsset): SeasonAsset => {
      const sameAsset =
        candidate.id === target.id ||
        (candidate.media_asset_id &&
          target.media_asset_id &&
          candidate.media_asset_id === target.media_asset_id) ||
        candidate.hosted_url === target.hosted_url;
      if (!sameAsset) return candidate;
      return {
        ...candidate,
        ...patch,
        metadata: patch.metadata === undefined ? candidate.metadata : patch.metadata,
      };
    };

    setAssets((prev) => prev.map(applyPatch));
    setAssetLightbox((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        asset: applyPatch(prev.asset),
        filteredAssets: prev.filteredAssets.map(applyPatch),
      };
    });
  }, []);

  const refreshAssetPipeline = useCallback(
    async (asset: SeasonAsset) => {
      const headers = await getAuthHeaders();
      const base =
        asset.origin_table === "media_assets"
          ? { kind: "media" as const, id: asset.media_asset_id ?? asset.id }
          : asset.origin_table === "cast_photos"
            ? { kind: "cast" as const, id: asset.id }
            : null;

      if (!base) {
        throw new Error("Full pipeline refresh is only available for media assets and cast photos.");
      }

      const callStep = async (endpoint: string, payload: Record<string, unknown>) => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message =
            data?.error && data?.detail
              ? `${data.error}: ${data.detail}`
              : data?.error || data?.detail || "Pipeline step failed";
          throw new Error(message);
        }
        return data as Record<string, unknown>;
      };

      const prefix =
        base.kind === "media"
          ? `/api/admin/trr-api/media-assets/${base.id}`
          : `/api/admin/trr-api/cast-photos/${base.id}`;

      await callStep(`${prefix}/mirror`, { force: true });
      const countPayload = await callStep(`${prefix}/auto-count`, { force: true });
      const textPayload = await callStep(`${prefix}/detect-text-overlay`, { force: true });
      await callStep(`${prefix}/variants`, { force: true });
      const hasTextOverlay =
        typeof textPayload.has_text_overlay === "boolean"
          ? textPayload.has_text_overlay
          : typeof textPayload.hasTextOverlay === "boolean"
            ? textPayload.hasTextOverlay
            : null;

      const hasManualCrop =
        asset.thumbnail_crop_mode === "manual" &&
        typeof asset.thumbnail_focus_x === "number" &&
        typeof asset.thumbnail_focus_y === "number" &&
        typeof asset.thumbnail_zoom === "number";
      if (hasManualCrop) {
        await callStep(`${prefix}/variants`, {
          force: true,
          crop: {
            x: asset.thumbnail_focus_x,
            y: asset.thumbnail_focus_y,
            zoom: asset.thumbnail_zoom,
            mode: "manual",
          },
        });
      }

      applyAssetPatch(asset, {
        people_count:
          typeof countPayload.people_count === "number"
            ? countPayload.people_count
            : asset.people_count ?? null,
        people_count_source:
          countPayload.people_count_source === "auto" ||
          countPayload.people_count_source === "manual"
            ? countPayload.people_count_source
            : asset.people_count_source ?? null,
        metadata: {
          ...((asset.metadata ?? {}) as Record<string, unknown>),
          ...(hasTextOverlay === null ? {} : { has_text_overlay: hasTextOverlay }),
        },
      });

      await fetchAssets();
    },
    [applyAssetPatch, fetchAssets, getAuthHeaders]
  );

  const deleteMediaAsset = useCallback(
    async (asset: SeasonAsset) => {
      if (asset.origin_table !== "media_assets") {
        throw new Error("Delete is currently supported only for imported media assets.");
      }
      const headers = await getAuthHeaders();
      const assetId = asset.media_asset_id ?? asset.id;
      const response = await fetch(`/api/admin/trr-api/media-assets/${assetId}`, {
        method: "DELETE",
        headers,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete image");
      }
      setAssetLightbox(null);
      await fetchAssets();
    },
    [getAuthHeaders, fetchAssets]
  );

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
      setAssets((prev) => prev.filter((a) => a.hosted_url !== asset.hosted_url));
      setAssetLightbox(null);
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
      setAssets((prev) =>
        prev.map((a) => {
          if (a.hosted_url !== asset.hosted_url) return a;
          const meta =
            a.metadata && typeof a.metadata === "object"
              ? { ...(a.metadata as Record<string, unknown>) }
              : {};
          meta.starred = starred;
          if (starred) meta.starred_at = new Date().toISOString();
          else delete meta.starred_at;
          return { ...a, metadata: meta };
        })
      );
    },
    [getAuthHeaders]
  );

  const updateGalleryAssetContentType = useCallback(
    async (asset: SeasonAsset, contentType: string) => {
      const origin = asset.origin_table ?? null;
      if (!origin) throw new Error("Cannot update content type: missing origin_table");
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/trr-api/assets/content-type", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ origin, asset_id: asset.id, content_type: contentType }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail
            ? `${data.error}: ${data.detail}`
            : data?.detail || data?.error || "Content type update failed";
        throw new Error(message);
      }

      const normalizedContentType =
        typeof data.content_type === "string" && data.content_type.trim().length > 0
          ? data.content_type.trim().toUpperCase()
          : normalizeContentTypeToken(contentType);
      const nextKind =
        typeof data.kind === "string" && data.kind.trim().length > 0
          ? data.kind.trim()
          : contentTypeToAssetKind(normalizedContentType);
      const nextContextType =
        typeof data.context_type === "string" && data.context_type.trim().length > 0
          ? data.context_type.trim()
          : contentTypeToContextType(normalizedContentType);

      const applyUpdate = (candidate: SeasonAsset): SeasonAsset => {
        const metadata =
          candidate.metadata && typeof candidate.metadata === "object"
            ? { ...(candidate.metadata as Record<string, unknown>) }
            : {};
        metadata.fandom_section_tag = normalizedContentType;
        metadata.content_type = normalizedContentType;
        return {
          ...candidate,
          kind: nextKind,
          context_type: nextContextType,
          metadata,
        };
      };

      setAssets((prev) =>
        prev.map((candidate) =>
          candidate.id === asset.id ? applyUpdate(candidate) : candidate
        )
      );
      setAssetLightbox((prev) =>
        prev && prev.asset.id === asset.id
          ? { ...prev, asset: applyUpdate(prev.asset) }
          : prev
      );
    },
    [getAuthHeaders]
  );

  const lightboxAssetCapabilities = assetLightbox
    ? resolveGalleryAssetCapabilities(assetLightbox.asset)
    : null;
  const episodeLightboxAsset: SeasonAsset | null = episodeLightbox
    ? {
        id: episodeLightbox.episode.id,
        type: "episode",
        origin_table: "episode_images",
        source: "episode_images",
        kind: "episode_still",
        hosted_url: episodeLightbox.episode.url_original_still ?? "",
        width: null,
        height: null,
        caption:
          episodeLightbox.episode.title ??
          `Episode ${episodeLightbox.episode.episode_number}`,
        episode_number: episodeLightbox.episode.episode_number,
        season_number: seasonNumber,
        metadata: null,
        ingest_status: null,
        hosted_content_type: null,
        link_id: null,
        media_asset_id: null,
        people_count: null,
        people_count_source: null,
        thumbnail_focus_x: null,
        thumbnail_focus_y: null,
        thumbnail_zoom: null,
        thumbnail_crop_mode: null,
      }
    : null;
  const episodeLightboxCapabilities = episodeLightboxAsset
    ? resolveGalleryAssetCapabilities(episodeLightboxAsset)
    : null;

  const totalEpisodes = episodes.length;
  const seasonHasPremiereDate = Boolean(
    (season?.premiere_date && season.premiere_date.trim()) ||
      (season?.air_date && season.air_date.trim())
  );
  const seasonEligibleForMedia = seasonHasPremiereDate || totalEpisodes > 1;
  const seasonEligibilityReason = seasonEligibleForMedia
    ? seasonHasPremiereDate
      ? "Eligible: season has a premiere/air date."
      : "Eligible: season has more than one episode."
    : "Placeholder season: requires a premiere date or more than one episode before media assignment.";

  const episodeCoverageRows = useMemo<EpisodeCoverageRow[]>(
    () =>
      episodes
        .map((episode) => ({
          episodeId: episode.id,
          episodeNumber: episode.episode_number,
          title: episode.title,
          hasStill: Boolean(episode.url_original_still),
          hasDescription: Boolean((episode.synopsis ?? episode.overview ?? "").trim()),
          hasAirDate: Boolean(episode.air_date),
          hasRuntime: typeof episode.runtime === "number" && episode.runtime > 0,
        }))
        .sort((a, b) => a.episodeNumber - b.episodeNumber),
    [episodes]
  );

  const coverageSummary = useMemo(() => {
    const total = episodeCoverageRows.length;
    const count = (selector: (row: EpisodeCoverageRow) => boolean): number =>
      episodeCoverageRows.reduce((acc, row) => (selector(row) ? acc + 1 : acc), 0);
    return {
      total,
      stills: count((row) => row.hasStill),
      descriptions: count((row) => row.hasDescription),
      airDates: count((row) => row.hasAirDate),
      runtimes: count((row) => row.hasRuntime),
    };
  }, [episodeCoverageRows]);

  const castRoleMemberByPersonId = useMemo(
    () => new Map(castRoleMembers.map((member) => [member.person_id, member] as const)),
    [castRoleMembers]
  );

  const showCastByPersonId = useMemo(() => {
    const byPersonId = new Map<string, TrrShowCastMember>();
    for (const member of trrShowCast) {
      if (typeof member.person_id === "string" && member.person_id.trim().length > 0) {
        byPersonId.set(member.person_id, member);
      }
    }
    return byPersonId;
  }, [trrShowCast]);

  const availableCastRoles = useMemo(() => {
    const values = new Set<string>();
    for (const member of cast) {
      const scoped = castRoleMemberByPersonId.get(member.person_id);
      if (scoped?.roles.length) {
        for (const role of scoped.roles) {
          const canonical = canonicalizeCastRoleName(role);
          if (canonical) values.add(canonical);
        }
        continue;
      }
      const showRole = showCastByPersonId.get(member.person_id)?.role;
      const canonical = canonicalizeCastRoleName(showRole);
      if (canonical) {
        values.add(canonical);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [cast, castRoleMemberByPersonId, showCastByPersonId]);

  const availableCastCreditCategories = useMemo(() => {
    const values = new Set<string>();
    for (const member of cast) {
      const category = showCastByPersonId.get(member.person_id)?.credit_category;
      if (typeof category === "string" && category.trim().length > 0) {
        values.add(category.trim());
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [cast, showCastByPersonId]);

  const castDisplayMembers = useMemo(() => {
    const merged = cast.map((member) => {
      const scoped = castRoleMemberByPersonId.get(member.person_id);
      const showCastMember = showCastByPersonId.get(member.person_id);
      const fallbackRole =
        typeof showCastMember?.role === "string" && showCastMember.role.trim().length > 0
          ? showCastMember.role.trim()
          : null;
      const roles = scoped?.roles.length
        ? normalizeCastRoleList(scoped.roles)
        : fallbackRole
          ? normalizeCastRoleList([fallbackRole])
          : [];
      const creditCategory =
        typeof showCastMember?.credit_category === "string" &&
        showCastMember.credit_category.trim().length > 0
          ? showCastMember.credit_category.trim()
          : null;
      return {
        ...member,
        roles,
        latest_season: typeof scoped?.latest_season === "number" ? scoped.latest_season : null,
        merged_photo_url:
          member.photo_url ||
          scoped?.photo_url ||
          showCastMember?.photo_url ||
          showCastMember?.cover_photo_url ||
          null,
        merged_total_episodes:
          typeof member.total_episodes === "number"
            ? member.total_episodes
            : typeof scoped?.total_episodes === "number"
              ? scoped.total_episodes
              : null,
        credit_category: creditCategory,
      };
    });

    const filtered = merged.filter((member) => {
      if (
        castRoleFilters.length > 0 &&
        !member.roles.some((role) =>
          castRoleFilters.some((selected) => castRoleMatchesFilter(role, selected))
        )
      ) {
        return false;
      }
      if (
        castCreditFilters.length > 0 &&
        !castCreditFilters.some(
          (selected) => selected.toLowerCase() === (member.credit_category ?? "").toLowerCase()
        )
      ) {
        return false;
      }
      if (castHasImageFilter === "yes" && !member.merged_photo_url) return false;
      if (castHasImageFilter === "no" && member.merged_photo_url) return false;
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (castSortBy === "name") {
        const aName = (a.person_name || "").toLowerCase();
        const bName = (b.person_name || "").toLowerCase();
        return castSortOrder === "asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }
      if (castSortBy === "season") {
        const aSeason = a.latest_season ?? -1;
        const bSeason = b.latest_season ?? -1;
        return castSortOrder === "asc" ? aSeason - bSeason : bSeason - aSeason;
      }
      const aEpisodes = a.episodes_in_season ?? 0;
      const bEpisodes = b.episodes_in_season ?? 0;
      return castSortOrder === "asc" ? aEpisodes - bEpisodes : bEpisodes - aEpisodes;
    });
    return sorted;
  }, [
    cast,
    castCreditFilters,
    castHasImageFilter,
    castRoleFilters,
    castRoleMemberByPersonId,
    castSortBy,
    castSortOrder,
    showCastByPersonId,
  ]);

  const showFallbackCastWarning =
    seasonCastSource === "show_fallback" &&
    Boolean(seasonCastEligibilityWarning) &&
    cast.every((member) => (member.episodes_in_season ?? 0) <= 0);

  const castSeasonMembers = useMemo(
    () => castDisplayMembers.filter((member) => !isCrewCreditCategory(member.credit_category)),
    [castDisplayMembers]
  );
  const crewSeasonMembers = useMemo(
    () => castDisplayMembers.filter((member) => isCrewCreditCategory(member.credit_category)),
    [castDisplayMembers]
  );

  const formatEpisodesLabel = (count: number) => {
    const normalized = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
    return `${normalized} ${normalized === 1 ? "episode" : "episodes"} this season`;
  };

  const formatBravoPublishedDate = (value: string | null | undefined): string | null => {
    if (!value || typeof value !== "string") return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
  };

  const isSeasonBackdrop = useCallback((asset: SeasonAsset) => {
    // Only trust the normalized "kind" field. Some historical metadata flags were incorrect
    // (e.g. season posters tagged as backdrops). Kind is the source-of-truth for grouping.
    return (asset.kind ?? "").toLowerCase().trim() === "backdrop";
  }, []);

  const advancedFilteredMediaAssets = useMemo(() => {
    return applyAdvancedFiltersToSeasonAssets(assets, advancedFilters, {
      showName: show?.name ?? undefined,
      getSeasonNumber: () => seasonNumber,
    });
  }, [assets, advancedFilters, seasonNumber, show?.name]);

  const galleryDiagnostics = useMemo(() => {
    const sourceCounts = new Map<string, number>();
    let missingVariants = 0;
    let oversized = 0;
    let unclassified = 0;

    for (const asset of advancedFilteredMediaAssets) {
      const sourceKey = (asset.source || "unknown").trim().toLowerCase() || "unknown";
      sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) ?? 0) + 1);

      const missingKeys = getMissingVariantKeys(asset.metadata ?? null);
      if (missingKeys.length > 0) {
        missingVariants += 1;
      }
      const pixelCount =
        typeof asset.width === "number" && typeof asset.height === "number"
          ? asset.width * asset.height
          : 0;
      if (pixelCount > 6_000_000) oversized += 1;
      if (!asset.kind || asset.kind.trim().toLowerCase() === "other") unclassified += 1;
    }

    const topSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      total: advancedFilteredMediaAssets.length,
      missingVariants,
      missingVariantBreakdown: buildMissingVariantBreakdown(
        advancedFilteredMediaAssets.map((asset) => asset.metadata ?? null)
      ),
      oversized,
      unclassified,
      topSources,
    };
  }, [advancedFilteredMediaAssets]);

  const filteredMediaAssets = useMemo(() => {
    if (galleryDiagnosticFilter === "all") return advancedFilteredMediaAssets;
    return advancedFilteredMediaAssets.filter((asset) => {
      if (galleryDiagnosticFilter === "missing-variants") {
        return hasMissingVariants(asset.metadata ?? null);
      }
      if (galleryDiagnosticFilter === "oversized") {
        const pixelCount =
          typeof asset.width === "number" && typeof asset.height === "number"
            ? asset.width * asset.height
            : 0;
        return pixelCount > 6_000_000;
      }
      if (galleryDiagnosticFilter === "unclassified") {
        return !asset.kind || asset.kind.trim().toLowerCase() === "other";
      }
      return true;
    });
  }, [advancedFilteredMediaAssets, galleryDiagnosticFilter]);

  useEffect(() => {
    setAssetsVisibleCount(120);
  }, [advancedFilters, galleryDiagnosticFilter]);

  const mediaSections = useMemo(() => {
    const backdrops: SeasonAsset[] = [];
    const posters: SeasonAsset[] = [];
    const episodeStills: SeasonAsset[] = [];
    const profilePictures: SeasonAsset[] = [];
    const castPhotos: SeasonAsset[] = [];

    for (const asset of filteredMediaAssets.slice(0, assetsVisibleCount)) {
      const normalizedKind = (asset.kind ?? "").toLowerCase().trim();
      const normalizedContextSection = (asset.context_section ?? "").toLowerCase().trim();
      const normalizedContextType = (asset.context_type ?? "").toLowerCase().trim();
      const isProfilePicture =
        normalizedContextType === "profile_picture" ||
        normalizedContextType === "profile" ||
        normalizedContextSection === "bravo_profile";
      const isCastLike =
        asset.type === "cast" || normalizedKind === "cast" || normalizedKind === "promo";

      if (isProfilePicture) {
        profilePictures.push(asset);
        continue;
      }

      if (isCastLike) {
        castPhotos.push(asset);
        continue;
      }

      if (asset.type === "episode") {
        episodeStills.push(asset);
        continue;
      }

      if (asset.type !== "season") continue;

      if (isSeasonBackdrop(asset)) {
        backdrops.push(asset);
        continue;
      }

      const isEpisodeStill = matchesContentTypesForSeasonAsset(
        asset,
        ["episode_still"],
        seasonNumber,
        show?.name ?? undefined
      );
      if (isEpisodeStill) {
        episodeStills.push(asset);
        continue;
      }

      if (normalizedKind === "poster") {
        posters.push(asset);
      }
    }

    return { backdrops, posters, episodeStills, profilePictures, castPhotos };
  }, [filteredMediaAssets, assetsVisibleCount, isSeasonBackdrop, seasonNumber, show?.name]);

  const isTextFilterActive = useMemo(() => {
    const wantsText = advancedFilters.text.includes("text");
    const wantsNoText = advancedFilters.text.includes("no_text");
    return wantsText !== wantsNoText;
  }, [advancedFilters.text]);

  const unknownTextCount = useMemo(() => {
    if (!isTextFilterActive) return 0;
    return assets.filter((a) => inferHasTextOverlay(a.metadata ?? null) === null).length;
  }, [isTextFilterActive, assets]);

  const detectTextOverlayForUnknown = useCallback(async () => {
    const targets = assets
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

    await fetchAssets();
  }, [assets, getAuthHeaders, fetchAssets]);

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

  if (slugResolutionLoading || (!showId && !slugResolutionError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Resolving show URL...</p>
        </div>
      </div>
    );
  }

  if (slugResolutionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">{slugResolutionError}</p>
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
            href={buildShowAdminUrl({ showSlug: showSlugForRouting }) as "/admin/trr-shows"}
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
                href={buildShowAdminUrl({ showSlug: showSlugForRouting }) as "/admin/trr-shows"}
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
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      seasonEligibleForMedia
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {seasonEligibleForMedia ? "Eligible Season" : "Placeholder Season"}
                  </span>
                  <span className="text-xs text-zinc-500">{seasonEligibilityReason}</span>
                </div>
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
            <nav className="flex flex-wrap gap-2 py-4">
              {(
                [
                  { id: "episodes", label: "Seasons & Episodes" },
                  { id: "assets", label: "Assets" },
                  { id: "videos", label: "Videos" },
                  { id: "cast", label: "Cast" },
                  { id: "surveys", label: "Surveys" },
                  { id: "social", label: "Social Media" },
                  { id: "details", label: "Details" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
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
                {episodes.map((episode) => {
                  const imdbRatingText = formatFixed1(episode.imdb_rating);
                  const tmdbVoteAverageText = formatFixed1(episode.tmdb_vote_average);

                  return (
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
                          {imdbRatingText && (
                            <span className="flex items-center gap-1 text-sm text-zinc-600">
                              <span className="text-yellow-500">★</span>
                              {imdbRatingText}
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
                          {tmdbVoteAverageText && (
                            <span>TMDB {tmdbVoteAverageText}</span>
                          )}
                          {episode.imdb_vote_count && (
                            <span>IMDB votes {episode.imdb_vote_count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {episodes.length === 0 && (
                  <p className="text-sm text-zinc-500">No episodes found for this season.</p>
                )}
              </div>

              <section className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Episode Coverage Matrix
                    </p>
                    <p className="text-xs text-zinc-500">
                      Missing data is surfaced per episode for stills, copy, air date, and runtime.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                      Stills {coverageSummary.stills}/{coverageSummary.total}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                      Descriptions {coverageSummary.descriptions}/{coverageSummary.total}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                      Air Dates {coverageSummary.airDates}/{coverageSummary.total}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                      Runtime {coverageSummary.runtimes}/{coverageSummary.total}
                    </span>
                  </div>
                </div>
                {episodeCoverageRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-zinc-100 text-zinc-600">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Episode</th>
                          <th className="px-3 py-2 font-semibold">Still</th>
                          <th className="px-3 py-2 font-semibold">Description</th>
                          <th className="px-3 py-2 font-semibold">Air Date</th>
                          <th className="px-3 py-2 font-semibold">Runtime</th>
                        </tr>
                      </thead>
                      <tbody>
                        {episodeCoverageRows.map((row) => (
                          <tr key={row.episodeId} className="border-t border-zinc-100">
                            <td className="px-3 py-2 text-zinc-700">
                              E{row.episodeNumber} {row.title ? `· ${row.title}` : ""}
                            </td>
                            {[row.hasStill, row.hasDescription, row.hasAirDate, row.hasRuntime].map(
                              (ok, idx) => (
                                <td key={`${row.episodeId}-${idx}`} className="px-3 py-2">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                                      ok
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {ok ? "Ready" : "Missing"}
                                  </span>
                                </td>
                              )
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No episodes available for coverage matrix.</p>
                )}
              </section>
            </div>
          )}

          {activeTab === "assets" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    {assetsView === "media" ? "Season Media" : "Brand"}
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    {show.name} · Season {season.season_number}
                  </h3>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                    <button
                      type="button"
                      onClick={() => setAssetsSubTab("media")}
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
                      onClick={() => setAssetsSubTab("brand")}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                        assetsView === "brand"
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-700"
                      }`}
                    >
                      Brand
                    </button>
                  </div>

                  {assetsView === "media" && (
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
                        onClick={() => setAdvancedFiltersOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M7 12h10M10 18h4" />
                        </svg>
                        Filters
                      </button>
                      <button
                        onClick={openAddBackdrops}
                        disabled={!seasonEligibleForMedia && !allowPlaceholderMediaOverride}
                        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Assign TMDb Backdrops
                      </button>
                      <button
                        onClick={() => setScrapeDrawerOpen(true)}
                        disabled={!seasonEligibleForMedia && !allowPlaceholderMediaOverride}
                        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Import Images
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {(assetsRefreshNotice || assetsRefreshError) && (
                <p
                  className={`mb-4 text-sm ${
                    assetsRefreshError ? "text-red-600" : "text-zinc-500"
                  }`}
                >
                  {assetsRefreshError || assetsRefreshNotice}
                </p>
              )}
              <RefreshProgressBar
                show={refreshingAssets}
                stage={assetsRefreshProgress?.stage}
                message={assetsRefreshProgress?.message}
                current={assetsRefreshProgress?.current}
                total={assetsRefreshProgress?.total}
              />

              {!seasonEligibleForMedia && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">Placeholder season guardrail</p>
                  <p className="mt-1 text-xs text-amber-700">
                    This season has no premiere date and not enough episodes yet. Media imports are blocked by
                    default to avoid assigning assets to placeholder seasons.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAllowPlaceholderMediaOverride((prev) => !prev)}
                    className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    {allowPlaceholderMediaOverride ? "Disable Override" : "Enable Override"}
                  </button>
                </div>
              )}

              {assetsView === "media" ? (
                <div className="space-y-8">
                <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <button
                    type="button"
                    onClick={() => setGalleryDiagnosticsOpen((prev) => !prev)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                    aria-expanded={galleryDiagnosticsOpen}
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Gallery Diagnostics
                      </p>
                      <p className="text-xs text-zinc-500">
                        Source quality, variant status, and quick risk filters.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap justify-end gap-2 text-xs">
                        <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                          Assets {galleryDiagnostics.total}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                          Missing variants {galleryDiagnostics.missingVariants}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                          Oversized {galleryDiagnostics.oversized}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-zinc-600">
                          Unclassified {galleryDiagnostics.unclassified}
                        </span>
                      </div>
                      <svg
                        className={`h-4 w-4 text-zinc-500 transition-transform ${
                          galleryDiagnosticsOpen ? "rotate-180" : ""
                        }`}
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                      >
                        <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>
                  {galleryDiagnosticsOpen && (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(
                          [
                            { key: "all", label: "All" },
                            { key: "missing-variants", label: "Missing Variants" },
                            { key: "oversized", label: "Oversized" },
                            { key: "unclassified", label: "Unclassified" },
                          ] as const
                        ).map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setGalleryDiagnosticFilter(option.key)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              galleryDiagnosticFilter === option.key
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {galleryDiagnostics.topSources.length > 0 && (
                        <p className="mt-3 text-xs text-zinc-500">
                          Top sources:{" "}
                          {galleryDiagnostics.topSources
                            .map(([source, count]) => `${source} (${count})`)
                            .join(", ")}
                        </p>
                      )}
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Missing Variant Breakdown
                        </p>
                        {galleryDiagnostics.missingVariantBreakdown.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {galleryDiagnostics.missingVariantBreakdown.map((item) => (
                              <span
                                key={item.key}
                                className="rounded-full bg-white px-2 py-1 text-xs text-zinc-700"
                              >
                                {item.key} ({item.count})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-zinc-500">
                            No missing variants detected.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </section>
                {mediaSections.backdrops.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Backdrops</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {mediaSections.backdrops.map((asset, i, arr) => (
                          <button
                            key={`${asset.id}-${i}`}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-[16/9] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={getAssetDisplayUrl(asset)}
                              alt={asset.caption || "Season backdrop"}
                              sizes="300px"
                              className="object-cover"
                            />
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {mediaSections.posters.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Posters</h4>
                    <div className="grid grid-cols-4 gap-4">
                      {mediaSections.posters.map((asset, i, arr) => (
                          <button
                            key={`${asset.id}-${i}`}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={getAssetDisplayUrl(asset)}
                              alt={asset.caption || "Poster"}
                              sizes="180px"
                            />
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {mediaSections.episodeStills.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Episode Stills</h4>
                    <div className="grid grid-cols-6 gap-3">
                      {mediaSections.episodeStills.map((asset, i, arr) => (
                          <button
                            key={`${asset.id}-${i}`}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-video overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={getAssetDisplayUrl(asset)}
                              alt={asset.caption || "Episode still"}
                              sizes="150px"
                            />
                          </button>
                        ))}
                    </div>
                  </section>
                )}

                {mediaSections.profilePictures.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Profile Pictures</h4>
                    <div className="grid grid-cols-5 gap-4">
                      {mediaSections.profilePictures.map((asset, i, arr) => (
                          <button
                            key={`${asset.id}-${i}`}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={getAssetDisplayUrl(asset)}
                              alt={asset.caption || "Profile picture"}
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

                {mediaSections.castPhotos.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Cast Photos</h4>
                    <div className="grid grid-cols-5 gap-4">
                      {mediaSections.castPhotos.map((asset, i, arr) => (
                          <button
                            key={`${asset.id}-${i}`}
                            onClick={(e) => openAssetLightbox(asset, i, arr, e.currentTarget)}
                            className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={getAssetDisplayUrl(asset)}
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

                {filteredMediaAssets.length > assetsVisibleCount && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAssetsVisibleCount((prev) => prev + 120)}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Load More Images
                    </button>
                  </div>
                )}

                {filteredMediaAssets.length === 0 && (
                  <p className="text-sm text-zinc-500">No media found for this season.</p>
                )}
              </div>
              ) : (
                <div className="space-y-4">
                  {trrShowCastLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
                    </div>
                  ) : trrShowCastError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-700">{trrShowCastError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          showCastFetchAttemptedRef.current = false;
                          fetchShowCastForBrand();
                        }}
                        className="mt-2 text-xs font-semibold text-red-600 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <ShowBrandEditor
                      trrShowId={showId}
                      trrShowName={show.name}
                      trrSeasons={showSeasons}
                      trrCast={trrShowCast}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "videos" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Bravo Videos
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    Season {season.season_number}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={fetchSeasonBravoVideos}
                  disabled={bravoVideosLoading}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  {bravoVideosLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {bravoVideosError && <p className="mb-4 text-sm text-red-600">{bravoVideosError}</p>}
              {!bravoVideosLoading && bravoVideos.length === 0 && !bravoVideosError && (
                <p className="text-sm text-zinc-500">No persisted Bravo videos found for this season.</p>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bravoVideos.map((video, index) => (
                  <article key={`${video.clip_url}-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <a href={video.clip_url} target="_blank" rel="noopener noreferrer" className="group block">
                      <div className="relative mb-3 aspect-video overflow-hidden rounded-lg bg-zinc-200">
                        {video.image_url ? (
                          <GalleryImage
                            src={video.image_url}
                            alt={video.title || "Bravo video"}
                            sizes="400px"
                            className="object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-400">No image</div>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-700">
                        {video.title || "Untitled video"}
                      </h4>
                    </a>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                      {video.runtime && <span>{video.runtime}</span>}
                      {video.kicker && <span>{video.kicker}</span>}
                      {formatBravoPublishedDate(video.published_at) && (
                        <span>Posted {formatBravoPublishedDate(video.published_at)}</span>
                      )}
                    </div>
                  </article>
                ))}
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
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {castSeasonMembers.length} cast · {crewSeasonMembers.length} crew · {cast.length} active
                    {archiveCast.length > 0 ? ` · ${archiveCast.length} archive-only` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={refreshSeasonCast}
                    disabled={refreshingCast}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {refreshingCast ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>
              {(castRefreshNotice || castRefreshError) && (
                <p className={`mb-4 text-sm ${castRefreshError ? "text-red-600" : "text-zinc-500"}`}>
                  {castRefreshError || castRefreshNotice}
                </p>
              )}
              {showFallbackCastWarning && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Season cast evidence is still syncing. Showing show-level cast fallback until
                  episode-level cast sync completes.
                </div>
              )}
              <RefreshProgressBar
                show={refreshingCast}
                stage={castRefreshProgress?.stage}
                message={castRefreshProgress?.message}
                current={castRefreshProgress?.current}
                total={castRefreshProgress?.total}
              />

              {(castRoleMembersError || trrShowCastError) && (
                <p className="mb-4 text-sm text-red-600">{castRoleMembersError || trrShowCastError}</p>
              )}

              <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Sort By
                    <select
                      value={castSortBy}
                      onChange={(event) =>
                        setCastSortBy(event.target.value as "episodes" | "season" | "name")
                      }
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
                    >
                      <option value="episodes">Episodes</option>
                      <option value="season">Season Recency</option>
                      <option value="name">Name</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Order
                    <select
                      value={castSortOrder}
                      onChange={(event) => setCastSortOrder(event.target.value as "desc" | "asc")}
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
                    >
                      <option value="desc">Desc</option>
                      <option value="asc">Asc</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Has Image
                    <select
                      value={castHasImageFilter}
                      onChange={(event) =>
                        setCastHasImageFilter(event.target.value as "all" | "yes" | "no")
                      }
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
                    >
                      <option value="all">All</option>
                      <option value="yes">With Image</option>
                      <option value="no">Without Image</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCastSortBy("episodes");
                      setCastSortOrder("desc");
                      setCastRoleFilters([]);
                      setCastCreditFilters([]);
                      setCastHasImageFilter("all");
                    }}
                    className="self-end rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                  >
                    Clear Filters
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Roles
                    </span>
                    {availableCastRoles.length === 0 ? (
                      <span className="text-xs text-zinc-500">No roles configured.</span>
                    ) : (
                      availableCastRoles.map((role) => {
                        const active = castRoleFilters.some((value) =>
                          castRoleMatchesFilter(value, role)
                        );
                        return (
                          <button
                            key={`season-role-filter-${role}`}
                            type="button"
                            onClick={() =>
                              setCastRoleFilters((prev) =>
                                active
                                  ? prev.filter((value) => !castRoleMatchesFilter(value, role))
                                  : [...prev, role]
                              )
                            }
                            className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                              active
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-600"
                            }`}
                          >
                            {role}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Credit
                    </span>
                    {availableCastCreditCategories.length === 0 ? (
                      <span className="text-xs text-zinc-500">No categories.</span>
                    ) : (
                      availableCastCreditCategories.map((category) => {
                        const active = castCreditFilters.some(
                          (value) => value.toLowerCase() === category.toLowerCase()
                        );
                        return (
                          <button
                            key={`season-credit-filter-${category}`}
                            type="button"
                            onClick={() =>
                              setCastCreditFilters((prev) =>
                                active
                                  ? prev.filter((value) => value.toLowerCase() !== category.toLowerCase())
                                  : [...prev, category]
                              )
                            }
                            className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                              active
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-600"
                            }`}
                          >
                            {category}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {(castRoleMembersLoading || trrShowCastLoading) && (
                <p className="mb-4 text-sm text-zinc-500">Refreshing cast intelligence...</p>
              )}

              <div className="space-y-8">
                <section>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                    Cast
                  </p>
                  {castSeasonMembers.length === 0 ? (
                    <p className="text-sm text-zinc-500">No cast members match the selected filters.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {castSeasonMembers.map((member) => (
                        <Link
                          key={member.person_id}
                          href={`/admin/trr-shows/people/${member.person_id}?showId=${encodeURIComponent(showSlugForRouting)}&seasonNumber=${seasonNumber}`}
                          className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 transition hover:border-zinc-300 hover:bg-zinc-100/50"
                        >
                          <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                            {member.merged_photo_url ? (
                              <CastPhoto
                                src={member.merged_photo_url}
                                alt={member.person_name || "Cast"}
                                thumbnail_focus_x={member.thumbnail_focus_x}
                                thumbnail_focus_y={member.thumbnail_focus_y}
                                thumbnail_zoom={member.thumbnail_zoom}
                                thumbnail_crop_mode={member.thumbnail_crop_mode}
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
                          <p className="font-semibold text-zinc-900">{member.person_name || "Unknown"}</p>
                          <p className="text-sm text-zinc-600">
                            {formatEpisodesLabel(member.episodes_in_season)}
                          </p>
                          {typeof member.merged_total_episodes === "number" && (
                            <p className="text-xs text-zinc-500">
                              {member.merged_total_episodes} total episodes
                            </p>
                          )}
                          {member.latest_season && (
                            <p className="text-xs text-zinc-500">Latest season: {member.latest_season}</p>
                          )}
                          {member.credit_category && (
                            <p className="text-xs text-zinc-500">Credit: {member.credit_category}</p>
                          )}
                          {member.roles.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {member.roles.map((role) => (
                                <span
                                  key={`${member.person_id}-season-role-${role}`}
                                  className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                {crewSeasonMembers.length > 0 && (
                  <section>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Crew
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {crewSeasonMembers.map((member) => (
                        <Link
                          key={`crew-${member.person_id}`}
                          href={`/admin/trr-shows/people/${member.person_id}?showId=${encodeURIComponent(showSlugForRouting)}&seasonNumber=${seasonNumber}`}
                          className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 transition hover:border-blue-300 hover:bg-blue-100/40"
                        >
                          <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                            {member.merged_photo_url ? (
                              <CastPhoto
                                src={member.merged_photo_url}
                                alt={member.person_name || "Crew"}
                                thumbnail_focus_x={member.thumbnail_focus_x}
                                thumbnail_focus_y={member.thumbnail_focus_y}
                                thumbnail_zoom={member.thumbnail_zoom}
                                thumbnail_crop_mode={member.thumbnail_crop_mode}
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
                          <p className="font-semibold text-zinc-900">{member.person_name || "Unknown"}</p>
                          {member.credit_category && (
                            <p className="text-sm text-blue-700">{member.credit_category}</p>
                          )}
                          <p className="text-xs text-zinc-600">
                            {formatEpisodesLabel(member.episodes_in_season)}
                          </p>
                          {member.roles.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {member.roles.map((role) => (
                                <span
                                  key={`${member.person_id}-season-crew-role-${role}`}
                                  className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {archiveCast.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                      Archive Footage Credits
                    </h4>
                    <p className="mb-3 text-xs text-zinc-500">
                      These credits are excluded from actual season-episode counts.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {archiveCast.map((member) => (
                        <Link
                          key={`archive-${member.person_id}`}
                          href={`/admin/trr-shows/people/${member.person_id}?showId=${encodeURIComponent(showSlugForRouting)}&seasonNumber=${seasonNumber}`}
                          className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 transition hover:border-amber-300 hover:bg-amber-100/50"
                        >
                          <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                            {member.photo_url ? (
                              <CastPhoto
                                src={member.photo_url}
                                alt={member.person_name || "Cast"}
                                thumbnail_focus_x={member.thumbnail_focus_x}
                                thumbnail_focus_y={member.thumbnail_focus_y}
                                thumbnail_zoom={member.thumbnail_zoom}
                                thumbnail_crop_mode={member.thumbnail_crop_mode}
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
                            {member.person_name || "Unknown"}
                          </p>
                          <p className="text-sm text-amber-800">
                            {((member.archive_episodes_in_season as number | null | undefined) ?? 0)} archive credits
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

                {castSeasonMembers.length === 0 && crewSeasonMembers.length === 0 && cast.length > 0 && (
                  <p className="text-sm text-zinc-500">No cast members match the selected filters.</p>
                )}

                {cast.length === 0 && archiveCast.length === 0 && (
                  <p className="text-sm text-zinc-500">No cast found for this season.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "surveys" && (
            <SurveysSection
              showId={showId}
              showName={show.name}
              totalSeasons={showSeasons.length > 0 ? showSeasons.length : null}
              seasonNumber={Number.isFinite(seasonNumber) ? seasonNumber : null}
            />
          )}

          {activeTab === "social" && (
            <SeasonSocialAnalyticsSection
              showId={showId}
              showSlug={showSlugForRouting}
              seasonNumber={season.season_number}
              seasonId={season.id}
              showName={show.name}
            />
          )}

          {activeTab === "details" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Details
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    {show.name} · Season {season.season_number}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {show.tmdb_id && (
                    <TmdbLinkIcon
                      showTmdbId={show.tmdb_id}
                      seasonNumber={season.season_number}
                      type="season"
                    />
                  )}
                  {show.imdb_id && <ImdbLinkIcon imdbId={show.imdb_id} type="title" />}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-zinc-500">TRR Show ID:</span>
                    <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{showId}</code>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-zinc-500">TRR Season ID:</span>
                    <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{season.id}</code>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-zinc-500">Season Number:</span>
                    <span className="font-semibold text-zinc-900">{season.season_number}</span>
                  </div>
                  {season.air_date && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-zinc-500">First Air Date:</span>
                      <span className="text-zinc-900">
                        {new Date(season.air_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <ExternalLinks
                    externalIds={null}
                    tmdbId={show.tmdb_id}
                    imdbId={show.imdb_id}
                    type="show"
                  />
                </div>
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
            canManage={true}
            metadataExtras={
              episodeLightboxAsset && episodeLightboxCapabilities ? (
                <GalleryAssetEditTools
                  asset={episodeLightboxAsset}
                  capabilities={episodeLightboxCapabilities}
                  getAuthHeaders={getAuthHeaders}
                />
              ) : null
            }
            actionDisabledReasons={{
              refresh: "Full pipeline refresh is unavailable for episode still records from this origin.",
              archive: "Archive is unavailable for episode still records from this origin.",
              star: "Star/Flag is unavailable for episode still records from this origin.",
              delete: "Delete is unavailable for episode still records from this origin.",
            }}
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

        {assetLightbox && lightboxAssetCapabilities && (
          <ImageLightbox
            src={getAssetDetailUrl(assetLightbox.asset)}
            fallbackSrc={assetLightbox.asset.original_url ?? assetLightbox.asset.hosted_url}
            alt={assetLightbox.asset.caption || "Gallery image"}
            isOpen={true}
            onClose={closeAssetLightbox}
            metadata={mapSeasonAssetToMetadata(assetLightbox.asset, seasonNumber, show?.name)}
            canManage={true}
            metadataExtras={
              <GalleryAssetEditTools
                asset={assetLightbox.asset}
                capabilities={lightboxAssetCapabilities}
                getAuthHeaders={getAuthHeaders}
                onAssetUpdated={(patch) => applyAssetPatch(assetLightbox.asset, patch)}
                onReload={fetchAssets}
              />
            }
            isStarred={Boolean((assetLightbox.asset.metadata as Record<string, unknown> | null)?.starred)}
            actionDisabledReasons={{
              refresh: lightboxAssetCapabilities.canEdit
                ? undefined
                : lightboxAssetCapabilities.reasons.edit,
              archive: lightboxAssetCapabilities.canArchive
                ? undefined
                : lightboxAssetCapabilities.reasons.archive ?? "Archive is unavailable for this image.",
              star: lightboxAssetCapabilities.canStar
                ? undefined
                : lightboxAssetCapabilities.reasons.star ?? "Star/Flag is unavailable for this image.",
              delete:
                assetLightbox.asset.origin_table === "media_assets"
                  ? undefined
                  : "Delete is only available for imported media assets.",
            }}
            onRefresh={() => refreshAssetPipeline(assetLightbox.asset)}
            onToggleStar={(starred) => toggleStarGalleryAsset(assetLightbox.asset, starred)}
            onArchive={() => archiveGalleryAsset(assetLightbox.asset)}
            onUpdateContentType={(contentType) =>
              updateGalleryAssetContentType(assetLightbox.asset, contentType)
            }
            onDelete={async () => {
              try {
                await deleteMediaAsset(assetLightbox.asset);
              } catch (err) {
                alert(err instanceof Error ? err.message : "Failed to delete image");
              }
            }}
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

        <AdvancedFilterDrawer
          isOpen={advancedFiltersOpen}
          onClose={() => setAdvancedFiltersOpen(false)}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          availableSources={[...new Set(assets.map((a) => a.source))].sort()}
          showSeeded={false}
          sortOptions={[
            { value: "newest", label: "Newest First" },
            { value: "oldest", label: "Oldest First" },
            { value: "source", label: "By Source" },
          ]}
          defaults={{ sort: "newest" }}
          unknownTextCount={isTextFilterActive ? unknownTextCount : undefined}
          onDetectTextForVisible={isTextFilterActive ? detectTextOverlayForUnknown : undefined}
          textOverlayDetectError={textOverlayDetectError}
        />

        {/* Add Backdrops drawer */}
        {addBackdropsOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={assigningBackdrops ? undefined : () => setAddBackdropsOpen(false)}
            />
            <div
              className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl overflow-y-auto bg-white shadow-xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                      Backdrops
                    </p>
                    <h3 className="text-lg font-bold text-zinc-900">
                      Assign TMDb Backdrops
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {selectedBackdropIds.size} selected
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAddBackdropsOpen(false)}
                      disabled={assigningBackdrops}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const all = new Set(unassignedBackdrops.map((b) => b.media_asset_id));
                        if (selectedBackdropIds.size === all.size) {
                          setSelectedBackdropIds(new Set());
                        } else {
                          setSelectedBackdropIds(all);
                        }
                      }}
                      disabled={backdropsLoading || unassignedBackdrops.length === 0 || assigningBackdrops}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      {selectedBackdropIds.size === unassignedBackdrops.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                    <button
                      type="button"
                      onClick={assignSelectedBackdrops}
                      disabled={assigningBackdrops || selectedBackdropIds.size === 0}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {assigningBackdrops
                        ? "Assigning..."
                        : `Assign ${selectedBackdropIds.size}`}
                    </button>
                  </div>
                </div>
                {backdropsError && (
                  <p className="mt-3 text-sm text-red-600">{backdropsError}</p>
                )}
              </div>

              <div className="p-6">
                {backdropsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900" />
                  </div>
                ) : unassignedBackdrops.length === 0 ? (
                  <p className="text-sm text-zinc-500">No unassigned TMDb backdrops found.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {unassignedBackdrops.map((b) => {
                      const selected = selectedBackdropIds.has(b.media_asset_id);
                      return (
                        <button
                          key={b.media_asset_id}
                          type="button"
                          onClick={() => {
                            setSelectedBackdropIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(b.media_asset_id)) next.delete(b.media_asset_id);
                              else next.add(b.media_asset_id);
                              return next;
                            });
                          }}
                          className={`relative aspect-[16/9] overflow-hidden rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            selected ? "border-zinc-900" : "border-zinc-200"
                          }`}
                        >
                          <GalleryImage
                            src={b.display_url ?? b.hosted_url ?? b.source_url ?? ""}
                            alt={b.caption || "Backdrop"}
                            sizes="420px"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 transition hover:bg-black/10" />
                          {selected && (
                            <div className="absolute left-2 top-2 rounded-full bg-zinc-900 px-2 py-1 text-xs font-semibold text-white shadow">
                              Selected
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ClientOnly>
  );
}
