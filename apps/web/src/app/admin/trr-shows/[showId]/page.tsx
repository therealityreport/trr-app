"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";
import SocialPostsSection from "@/components/admin/social-posts-section";
import SeasonSocialAnalyticsSection from "@/components/admin/season-social-analytics-section";
import SurveysSection from "@/components/admin/surveys-section";
import ShowBrandEditor from "@/components/admin/ShowBrandEditor";
import { ExternalLinks, TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import { ImageScrapeDrawer, type EntityContext } from "@/components/admin/ImageScrapeDrawer";
import { AdvancedFilterDrawer } from "@/components/admin/AdvancedFilterDrawer";
import { mapSeasonAssetToMetadata } from "@/lib/photo-metadata";
import {
  clearAdvancedFilters,
  countActiveAdvancedFilters,
  readAdvancedFilters,
  writeAdvancedFilters,
  type AdvancedFilterState,
} from "@/lib/admin/advanced-filters";
import {
  inferHasTextOverlay,
} from "@/lib/gallery-filter-utils";
import { applyAdvancedFiltersToSeasonAssets } from "@/lib/gallery-advanced-filtering";
import {
  isThumbnailCropMode,
  resolveThumbnailPresentation,
} from "@/lib/thumbnail-crop";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

// Types
interface TrrShow {
  id: string;
  name: string;
  alternative_names: string[];
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
  logo_url?: string | null;
  streaming_providers?: string[] | null;
  watch_providers?: string[] | null;
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
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
  total_episodes?: number | null;
  archive_episode_count?: number | null;
  latest_season?: number | null;
  seasons_appeared?: number[] | null;
}

type EntityLinkType = "show" | "season" | "person";
type EntityLinkGroup = "official" | "social" | "knowledge" | "cast_announcements" | "other";
type EntityLinkStatus = "pending" | "approved" | "rejected";

interface EntityLink {
  id: string;
  show_id: string;
  entity_type: EntityLinkType;
  entity_id: string;
  season_number: number;
  link_group: EntityLinkGroup;
  link_kind: string;
  label: string | null;
  url: string;
  status: EntityLinkStatus;
  confidence: number | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ShowRole {
  id: string;
  show_id: string;
  name: string;
  normalized_name: string;
  sort_order: number;
  is_active: boolean;
}
interface BravoPersonTag {
  person_id?: string | null;
  person_name?: string | null;
  person_url?: string | null;
}

interface BravoVideoItem {
  title?: string | null;
  runtime?: string | null;
  kicker?: string | null;
  image_url?: string | null;
  clip_url: string;
  season_number?: number | null;
  published_at?: string | null;
  person_tags?: BravoPersonTag[];
}

interface BravoNewsItem {
  headline?: string | null;
  image_url?: string | null;
  article_url: string;
  published_at?: string | null;
  person_tags?: BravoPersonTag[];
}

interface BravoPreviewPerson {
  name?: string | null;
  canonical_url?: string | null;
}

type BravoImportImageKind =
  | "poster"
  | "backdrop"
  | "logo"
  | "episode_still"
  | "cast"
  | "promo"
  | "intro"
  | "reunion"
  | "other";

type TabId = "seasons" | "assets" | "news" | "cast" | "surveys" | "social" | "details";
type ShowCastSource = "episode_evidence" | "show_fallback";
type ShowRefreshTarget = "details" | "seasons_episodes" | "photos" | "cast_credits";
type ShowTab = { id: TabId; label: string };
type RefreshProgressState = {
  stage?: string | null;
  message?: string | null;
  current: number | null;
  total: number | null;
};

type RefreshLogEntry = {
  id: string;
  at: string;
  category: string;
  message: string;
  current: number | null;
  total: number | null;
};

type ShowRefreshRunOptions = {
  photoMode?: "fast" | "full";
  includeCastProfiles?: boolean;
};

type RefreshLogTopicKey =
  | "shows"
  | "seasons"
  | "episodes"
  | "people"
  | "media"
  | "bravotv";

type RefreshLogTopicDefinition = {
  key: RefreshLogTopicKey;
  label: string;
  description: string;
};

type HealthStatus = "ready" | "missing" | "stale";

const REFRESH_LOG_TOPIC_DEFINITIONS: RefreshLogTopicDefinition[] = [
  { key: "shows", label: "SHOWS", description: "Show info, entities, providers" },
  { key: "seasons", label: "SEASONS", description: "Season-level sync progress" },
  { key: "episodes", label: "EPISODES", description: "Episode-level sync and credits" },
  { key: "people", label: "PEOPLE", description: "Cast/member profile and person jobs" },
  { key: "media", label: "MEDIA", description: "Images, mirroring, auto-count, cleanup" },
  { key: "bravotv", label: "BRAVOTV", description: "Bravo preview/commit actions" },
];

const SHOW_PAGE_TABS: ShowTab[] = [
  { id: "details", label: "Overview" },
  { id: "seasons", label: "Seasons" },
  { id: "assets", label: "Assets" },
  { id: "news", label: "News" },
  { id: "cast", label: "Cast" },
  { id: "surveys", label: "Surveys" },
  { id: "social", label: "Social" },
];

const ENTITY_LINK_GROUP_LABELS: Record<EntityLinkGroup, string> = {
  official: "Official",
  social: "Social",
  knowledge: "Knowledge",
  cast_announcements: "Cast Announcements",
  other: "Other",
};

const ENTITY_LINK_GROUP_ORDER: EntityLinkGroup[] = [
  "official",
  "social",
  "knowledge",
  "cast_announcements",
  "other",
];

const SHOW_REFRESH_TARGET_LABELS: Record<ShowRefreshTarget, string> = {
  details: "Show Info",
  seasons_episodes: "Seasons & Episodes",
  photos: "Show/Season/Episode Media",
  cast_credits: "Cast & Credits",
};

const SHOW_REFRESH_STAGE_LABELS: Record<string, string> = {
  starting: "Initializing",
  details_sync_shows: "Show Info",
  details_tmdb_show_entities: "Show Entities",
  details_tmdb_watch_providers: "Watch Providers",
  seasons_episodes_seasons: "Seasons",
  seasons_episodes_episodes: "Episodes",
  photos_show_images: "Show Media",
  photos_season_episode_images: "Season/Episode Media",
  cast_credits_show_cast: "Cast Credits",
  cast_credits_episode_appearances: "Episode Credits",
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
};

const PERSON_REFRESH_STAGE_LABELS: Record<string, string> = {
  starting: "Initializing",
  tmdb_profile: "TMDb Profile",
  fandom_profile: "Fandom Profile",
  sync_imdb: "Cast Media (IMDb)",
  sync_tmdb: "Cast Media (TMDb)",
  sync_fandom: "Cast Media (Fandom)",
  fetching: "Fetching",
  upserting: "Upserting",
  mirroring: "S3 Mirroring",
  pruning: "Cleanup",
  auto_count: "Auto Count",
  word_id: "Word Detection",
};

const SEASON_PAGE_TABS = [
  { tab: "episodes", label: "Seasons & Episodes" },
  { tab: "assets", label: "Assets" },
  { tab: "videos", label: "Videos" },
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

const parseProgressNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseAltNamesText = (value: string): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(/\r?\n|,/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
};

const inferBravoShowUrl = (showName: string | null | undefined): string | null => {
  if (typeof showName !== "string") return null;
  const slug = showName
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) return null;
  return `https://www.bravotv.com/${slug}`;
};

const BRAVO_IMPORT_IMAGE_KIND_OPTIONS: Array<{ value: BravoImportImageKind; label: string }> = [
  { value: "poster", label: "Poster" },
  { value: "backdrop", label: "Backdrop" },
  { value: "logo", label: "Logo" },
  { value: "episode_still", label: "Episode Still" },
  { value: "cast", label: "Cast" },
  { value: "promo", label: "Promo" },
  { value: "intro", label: "Intro" },
  { value: "reunion", label: "Reunion" },
  { value: "other", label: "Other" },
];

const inferBravoImportImageKind = (
  image: { url: string; alt?: string | null }
): BravoImportImageKind => {
  const haystack = `${image.alt ?? ""} ${image.url}`.toLowerCase();
  if (haystack.includes("logo")) return "logo";
  if (haystack.includes("key art") || haystack.includes("poster")) return "poster";
  if (haystack.includes("backdrop") || haystack.includes("background")) return "backdrop";
  if (haystack.includes("cast")) return "cast";
  if (haystack.includes("still")) return "episode_still";
  if (haystack.includes("intro")) return "intro";
  if (haystack.includes("reunion")) return "reunion";
  return "promo";
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

const getShowRefreshTargetLabel = (target: ShowRefreshTarget): string => {
  return SHOW_REFRESH_TARGET_LABELS[target] ?? target;
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

const UUID_LIKE_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

const normalizeRefreshLogMessage = (value: string): string => {
  return value
    .replace(UUID_LIKE_RE, "person")
    .replace(/\s+/g, " ")
    .trim();
};

const resolveRefreshLogTopic = (category: string, message: string): RefreshLogTopicKey => {
  const haystack = `${category} ${message}`.toLowerCase();

  if (haystack.includes("bravo")) return "bravotv";
  if (haystack.includes("seasons & episodes") || haystack.includes("seasons_episodes")) {
    return "seasons";
  }
  if (haystack.includes("episode")) return "episodes";
  if (
    haystack.includes("media") ||
    haystack.includes("image") ||
    haystack.includes("photo") ||
    haystack.includes("mirror") ||
    haystack.includes("auto-count") ||
    haystack.includes("auto count") ||
    haystack.includes("word detection") ||
    haystack.includes("cleanup") ||
    haystack.includes("prune")
  ) {
    return "media";
  }
  if (
    haystack.includes("person") ||
    haystack.includes("cast profile") ||
    haystack.includes("cast member") ||
    haystack.includes("cast credits") ||
    haystack.includes("fandom profile") ||
    haystack.includes("tmdb profile")
  ) {
    return "people";
  }
  if (haystack.includes("season")) return "seasons";
  return "shows";
};

const extractRefreshLogSubJob = (entry: RefreshLogEntry): { subJob: string; details: string } => {
  const normalizedMessage = normalizeRefreshLogMessage(entry.message);
  const prefixMatch = normalizedMessage.match(/^([^:]{2,50}):\s+(.+)$/);
  if (prefixMatch) {
    return {
      subJob: prefixMatch[1].trim(),
      details: prefixMatch[2].trim(),
    };
  }
  const fallbackSubJob = entry.category.trim() || "Update";
  return {
    subJob: fallbackSubJob,
    details: normalizedMessage,
  };
};

const isRefreshTopicDone = (entry: RefreshLogEntry | null): boolean => {
  if (!entry) return false;
  if (
    typeof entry.current === "number" &&
    typeof entry.total === "number" &&
    entry.total > 0 &&
    entry.current >= entry.total
  ) {
    return true;
  }
  const message = entry.message.toLowerCase();
  return (
    message.includes("complete") ||
    message.includes("completed") ||
    message.includes("done") ||
    message.includes("synced") ||
    message.includes("skipping")
  );
};

const isRefreshTopicFailed = (entry: RefreshLogEntry | null): boolean => {
  if (!entry) return false;
  const message = entry.message.toLowerCase();
  return message.includes("failed") || message.includes("error");
};

// Generic gallery image with error handling - falls back to placeholder on broken images
function GalleryImage({
  src,
  alt,
  sizes = "200px",
  className = "object-cover",
  style,
  children,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
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
        style={style}
        sizes={sizes}
        unoptimized
        onError={() => setHasError(true)}
      />
      {children}
    </>
  );
}

// Cast photo with error handling - falls back to placeholder on broken images
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
  const display =
    typeof asset.display_url === "string" && asset.display_url.trim().length > 0
      ? asset.display_url.trim()
      : null;
  return cropDisplay ?? display ?? asset.hosted_url;
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

const NETWORK_LOGO_DOMAIN_BY_NAME: Record<string, string> = {
  bravo: "bravotv.com",
  nbc: "nbc.com",
  peacock: "peacocktv.com",
  "paramount+": "paramountplus.com",
  "e!": "eonline.com",
  mtv: "mtv.com",
  vh1: "vh1.com",
  abc: "abc.com",
  cbs: "cbs.com",
  fox: "fox.com",
  netflix: "netflix.com",
  hulu: "hulu.com",
  max: "max.com",
};

const getNetworkLogoUrl = (network: string | null | undefined): string | null => {
  if (!network) return null;
  const normalized = network.trim().toLowerCase();
  if (!normalized) return null;
  const domain = NETWORK_LOGO_DOMAIN_BY_NAME[normalized];
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
};

function NetworkNameOrLogo({
  network,
  fallbackLabel,
}: {
  network: string | null;
  fallbackLabel: string;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = getNetworkLogoUrl(network);

  if (logoUrl && !logoFailed) {
    return (
      <img
        src={logoUrl}
        alt={network ? `${network} logo` : "Network logo"}
        className="h-6 w-auto object-contain"
        loading="lazy"
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return (
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
      {fallbackLabel}
    </p>
  );
}

function ShowNameOrLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const trimmedLogo = typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : null;

  if (trimmedLogo && !logoFailed) {
    return (
      <img
        src={trimmedLogo}
        alt={`${name} logo`}
        className="h-14 w-auto max-w-[28rem] object-contain"
        loading="lazy"
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return <h1 className="text-3xl font-bold text-zinc-900">{name}</h1>;
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
  const showRouteParam = params.showId as string;
  const [resolvedShowId, setResolvedShowId] = useState<string | null>(
    looksLikeUuid(showRouteParam) ? showRouteParam : null
  );
  const [slugResolutionLoading, setSlugResolutionLoading] = useState(!looksLikeUuid(showRouteParam));
  const [slugResolutionError, setSlugResolutionError] = useState<string | null>(null);
  const showId = resolvedShowId ?? "";
  const { user, checking, hasAccess } = useAdminGuard();

  const [show, setShow] = useState<TrrShow | null>(null);
  const [seasons, setSeasons] = useState<TrrSeason[]>([]);
  const [cast, setCast] = useState<TrrCastMember[]>([]);
  const [castSource, setCastSource] = useState<ShowCastSource>("episode_evidence");
  const [castEligibilityWarning, setCastEligibilityWarning] = useState<string | null>(null);
  const [castRoleMembers, setCastRoleMembers] = useState<
    Array<{
      person_id: string;
      person_name: string | null;
      total_episodes: number | null;
      seasons_appeared: number | null;
      latest_season: number | null;
      roles: string[];
      photo_url: string | null;
    }>
  >([]);
  const [castRoleMembersLoading, setCastRoleMembersLoading] = useState(false);
  const [castRoleMembersError, setCastRoleMembersError] = useState<string | null>(null);
  const [archiveFootageCast, setArchiveFootageCast] = useState<TrrCastMember[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [selectedSocialSeasonId, setSelectedSocialSeasonId] = useState<string | null>(null);
  const [assetsView, setAssetsView] = useState<"images" | "videos" | "brand">("images");
  const [bravoVideos, setBravoVideos] = useState<BravoVideoItem[]>([]);
  const [bravoNews, setBravoNews] = useState<BravoNewsItem[]>([]);
  const [bravoLoading, setBravoLoading] = useState(false);
  const [bravoError, setBravoError] = useState<string | null>(null);
  const [bravoLoaded, setBravoLoaded] = useState(false);
  const bravoLoadInFlightRef = useRef<Promise<void> | null>(null);
  const [syncBravoOpen, setSyncBravoOpen] = useState(false);
  const [syncBravoUrl, setSyncBravoUrl] = useState("");
  const [syncBravoDescription, setSyncBravoDescription] = useState("");
  const [syncBravoAirs, setSyncBravoAirs] = useState("");
  const [syncBravoStep, setSyncBravoStep] = useState<"preview" | "confirm">("preview");
  const [syncBravoImages, setSyncBravoImages] = useState<Array<{ url: string; alt?: string | null }>>([]);
  const [syncBravoPreviewPeople, setSyncBravoPreviewPeople] = useState<BravoPreviewPerson[]>([]);
  const [syncBravoDiscoveredPersonUrls, setSyncBravoDiscoveredPersonUrls] = useState<string[]>([]);
  const [syncBravoPreviewVideos, setSyncBravoPreviewVideos] = useState<BravoVideoItem[]>([]);
  const [syncBravoPreviewNews, setSyncBravoPreviewNews] = useState<BravoNewsItem[]>([]);
  const [syncBravoTargetSeasonNumber, setSyncBravoTargetSeasonNumber] = useState<number | null>(null);
  const [syncBravoPreviewSeasonFilter, setSyncBravoPreviewSeasonFilter] = useState<number | "all">("all");
  const [syncBravoSelectedImages, setSyncBravoSelectedImages] = useState<Set<string>>(new Set());
  const [syncBravoImageKinds, setSyncBravoImageKinds] = useState<Record<string, BravoImportImageKind>>({});
  const [syncBravoPreviewLoading, setSyncBravoPreviewLoading] = useState(false);
  const [syncBravoCommitLoading, setSyncBravoCommitLoading] = useState(false);
  const [syncBravoError, setSyncBravoError] = useState<string | null>(null);
  const [syncBravoNotice, setSyncBravoNotice] = useState<string | null>(null);
  const [openSeasonId, setOpenSeasonId] = useState<string | null>(null);
  const hasAutoOpenedSeasonRef = useRef(false);
  const [seasonEpisodeSummaries, setSeasonEpisodeSummaries] = useState<
    Record<string, { count: number; premiereDate: string | null; finaleDate: string | null }>
  >({});
  const [seasonSummariesLoading, setSeasonSummariesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsForm, setDetailsForm] = useState<{
    displayName: string;
    nickname: string;
    altNamesText: string;
    description: string;
    premiereDate: string;
  }>({
    displayName: "",
    nickname: "",
    altNamesText: "",
    description: "",
    premiereDate: "",
  });
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsNotice, setDetailsNotice] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsEditing, setDetailsEditing] = useState(false);

  const [showLinks, setShowLinks] = useState<EntityLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [linksNotice, setLinksNotice] = useState<string | null>(null);

  const [showRoles, setShowRoles] = useState<ShowRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");

  const [castSortBy, setCastSortBy] = useState<"episodes" | "season" | "name">("episodes");
  const [castSortOrder, setCastSortOrder] = useState<"desc" | "asc">("desc");
  const [castSeasonFilters, setCastSeasonFilters] = useState<number[]>([]);
  const [castRoleFilters, setCastRoleFilters] = useState<string[]>([]);
  const [castCreditFilters, setCastCreditFilters] = useState<string[]>([]);
  const [castHasImageFilter, setCastHasImageFilter] = useState<"all" | "yes" | "no">("all");

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

  const activeAdvancedFilterCount = useMemo(
    () => countActiveAdvancedFilters(advancedFilters, { sort: "newest" }),
    [advancedFilters]
  );
  const hasActiveAdvancedFilters = activeAdvancedFilterCount > 0;
  const clearGalleryFilters = useCallback(() => {
    setAdvancedFilters(clearAdvancedFilters({ sort: "newest" }));
  }, [setAdvancedFilters]);

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
  const [refreshingShowAll, setRefreshingShowAll] = useState(false);
  const [refreshAllNotice, setRefreshAllNotice] = useState<string | null>(null);
  const [refreshAllError, setRefreshAllError] = useState<string | null>(null);
  const [refreshAllProgress, setRefreshAllProgress] = useState<RefreshProgressState | null>(
    null
  );
  const [refreshLogEntries, setRefreshLogEntries] = useState<RefreshLogEntry[]>([]);
  const [refreshLogOpen, setRefreshLogOpen] = useState(false);

  // Image scrape drawer state
  const [scrapeDrawerOpen, setScrapeDrawerOpen] = useState(false);
  const [scrapeDrawerContext, setScrapeDrawerContext] = useState<EntityContext | null>(null);

  // Refresh images state
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshingPersonIds, setRefreshingPersonIds] = useState<Record<string, boolean>>({});
  const [refreshingPersonProgress, setRefreshingPersonProgress] = useState<
    Record<string, RefreshProgressState>
  >({});

  const tabParam = searchParams.get("tab");
  const assetsParam = searchParams.get("assets");
  useEffect(() => {
    const allowedTabs: TabId[] = ["seasons", "assets", "news", "cast", "surveys", "social", "details"];
    if (!tabParam) return;

    // Back-compat alias: ?tab=gallery -> ASSETS (Images)
    if (tabParam === "gallery") {
      setActiveTab("assets");
      setAssetsView("images");
      return;
    }
    if (tabParam === "overview") {
      setActiveTab("details");
      return;
    }

    if (allowedTabs.includes(tabParam as TabId)) {
      setActiveTab(tabParam as TabId);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!assetsParam) return;
    if (assetsParam === "images" || assetsParam === "videos" || assetsParam === "brand") {
      setAssetsView(assetsParam);
    }
  }, [assetsParam]);

  const setTab = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", tab);
      if (tab !== "assets") {
        next.delete("assets");
      }
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const setAssetsSubTab = useCallback(
    (view: "images" | "videos" | "brand") => {
      setAssetsView(view);
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", "assets");
      next.set("assets", view);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Helper to get auth headers
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

  const appendRefreshLog = useCallback(
    (entry: { category: string; message: string; current?: number | null; total?: number | null }) => {
      const normalizedMessage = normalizeRefreshLogMessage(entry.message);
      if (!normalizedMessage) return;
      setRefreshLogEntries((prev) => {
        const nextEntry: RefreshLogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          at: new Date().toISOString(),
          category: entry.category.trim() || "Refresh",
          message: normalizedMessage,
          current:
            typeof entry.current === "number" && Number.isFinite(entry.current)
              ? entry.current
              : null,
          total:
            typeof entry.total === "number" && Number.isFinite(entry.total) ? entry.total : null,
        };
        const previous = prev[prev.length - 1];
        if (
          previous &&
          previous.category === nextEntry.category &&
          previous.message === nextEntry.message &&
          previous.current === nextEntry.current &&
          previous.total === nextEntry.total
        ) {
          return prev;
        }
        return [...prev.slice(-149), nextEntry];
      });
    },
    []
  );

  const refreshLogTopicGroups = useMemo(() => {
    const grouped = new Map<RefreshLogTopicKey, RefreshLogEntry[]>();
    for (const topic of REFRESH_LOG_TOPIC_DEFINITIONS) {
      grouped.set(topic.key, []);
    }
    for (const entry of refreshLogEntries) {
      const topicKey = resolveRefreshLogTopic(entry.category, entry.message);
      grouped.get(topicKey)?.push(entry);
    }

    const groups = REFRESH_LOG_TOPIC_DEFINITIONS.map((topic) => {
      const entries = grouped.get(topic.key) ?? [];
      const latest = entries.length > 0 ? entries[entries.length - 1] : null;
      const failed = isRefreshTopicFailed(latest);
      const done = !failed && isRefreshTopicDone(latest);
      const status: "pending" | "active" | "done" | "failed" = failed
        ? "failed"
        : done
          ? "done"
          : entries.length > 0
            ? "active"
            : "pending";
      return {
        topic,
        entries,
        entriesForView: [...entries].reverse(),
        latest,
        status,
      };
    });

    return [
      ...groups.filter((group) => group.status !== "done"),
      ...groups.filter((group) => group.status === "done"),
    ];
  }, [refreshLogEntries]);

  // Refresh images for a person with streaming progress when available.
  const refreshPersonImages = useCallback(
    async (
      personId: string,
      onProgress?: (progress: RefreshProgressState) => void
    ) => {
      const headers = await getAuthHeaders();
      const body = { skip_mirror: false, show_id: showId };

      let streamFailed = false;
      try {
        const streamResponse = await fetch(
          `/api/admin/trr-api/people/${personId}/refresh-images/stream`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );

        if (!streamResponse.ok || !streamResponse.body) {
          throw new Error("Person refresh stream unavailable");
        }

        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let completePayload: Record<string, unknown> | null = null;

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
                (payload as { stage?: unknown }).stage,
                PERSON_REFRESH_STAGE_LABELS
              );
              const current = parseProgressNumber((payload as { current?: unknown }).current);
              const total = parseProgressNumber((payload as { total?: unknown }).total);
              onProgress?.({
                stage: stageLabel,
                message: buildProgressMessage(
                  stageLabel,
                  (payload as { message?: unknown }).message,
                  "Refreshing cast media..."
                ),
                current,
                total,
              });
            } else if (eventType === "error") {
              const message =
                payload && typeof payload === "object"
                  ? (payload as { error?: unknown; detail?: unknown })
                  : null;
              const errorText =
                typeof message?.error === "string" && message.error
                  ? message.error
                  : "Failed to refresh person images";
              const detailText =
                typeof message?.detail === "string" && message.detail ? message.detail : null;
              throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
            } else if (eventType === "complete") {
              completePayload =
                payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
            }

            boundaryIndex = buffer.indexOf("\n\n");
          }
        }

        return completePayload ?? {};
      } catch (streamErr) {
        streamFailed = true;
        console.warn("Person refresh stream failed, falling back to non-stream.", streamErr);
      }

      if (streamFailed) {
        onProgress?.({
          stage: "Fallback",
          message: "Refreshing cast media...",
          current: null,
          total: null,
        });
      }

      const response = await fetch(`/api/admin/trr-api/people/${personId}/refresh-images`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to refresh images";
        throw new Error(message);
      }

      onProgress?.({
        stage: "Complete",
        message: "Cast media refresh complete.",
        current: 1,
        total: 1,
      });
      return data;
    },
    [getAuthHeaders, showId]
  );

  const refreshCastProfilesAndMedia = useCallback(
    async (members: TrrCastMember[]) => {
      const uniqueMembers = Array.from(
        new Map(
          members
            .filter((member) => typeof member.person_id === "string" && member.person_id.trim())
            .map((member) => [member.person_id, member] as const)
        ).values()
      );

      const total = uniqueMembers.length;
      if (total === 0) {
        return { attempted: 0, succeeded: 0, failed: 0 };
      }

      let succeeded = 0;
      let failed = 0;

      setRefreshTargetProgress((prev) => ({
        ...prev,
        cast_credits: {
          stage: "Cast Profiles & Media",
          message: "Syncing cast profiles and media from TMDb/IMDb/Fandom...",
          current: 0,
          total,
        },
      }));
      appendRefreshLog({
        category: "Cast Profiles",
        message: `Syncing cast profiles and media (${total} members)...`,
        current: 0,
        total,
      });

      for (const [index, member] of uniqueMembers.entries()) {
        const label =
          member.full_name || member.cast_member_name || `Cast member ${index + 1}`;
        setRefreshTargetProgress((prev) => ({
          ...prev,
          cast_credits: {
            stage: "Cast Profiles & Media",
            message: `Syncing ${label} (${index + 1}/${total})...`,
            current: index,
            total,
          },
        }));
        appendRefreshLog({
          category: "Cast Profiles",
          message: `Syncing ${label}...`,
          current: index,
          total,
        });

        try {
          await refreshPersonImages(member.person_id, (progress) => {
            setRefreshTargetProgress((prev) => ({
              ...prev,
              cast_credits: {
                stage: progress.stage ?? "Cast Profiles & Media",
                message:
                  progress.message ??
                  `Syncing ${label} (${index + 1}/${total})...`,
                current: index,
                total,
              },
            }));
          });
          succeeded += 1;
        } catch (err) {
          console.warn(`Failed to refresh cast profile/media for ${label}:`, err);
          appendRefreshLog({
            category: "Cast Profiles",
            message: `Failed to sync ${label}.`,
            current: index + 1,
            total,
          });
          failed += 1;
        } finally {
          setRefreshTargetProgress((prev) => ({
            ...prev,
            cast_credits: {
              stage: "Cast Profiles & Media",
              message: `Synced ${index + 1}/${total} cast profiles/media...`,
              current: index + 1,
              total,
            },
          }));
          appendRefreshLog({
            category: "Cast Profiles",
            message: `Synced ${index + 1}/${total} cast members.`,
            current: index + 1,
            total,
          });
        }
      }

      appendRefreshLog({
        category: "Cast Profiles",
        message: `Completed cast profile/media sync (${succeeded}/${total} succeeded${failed > 0 ? `, ${failed} failed` : ""}).`,
        current: total,
        total,
      });
      return { attempted: total, succeeded, failed };
    },
    [appendRefreshLog, refreshPersonImages]
  );

  // Fetch show details
  const fetchShow = useCallback(async () => {
    if (!showId) return;
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

  const saveShowDetails = useCallback(async () => {
    if (!show) return;
    const displayName = detailsForm.displayName.trim();
    if (!displayName) {
      setDetailsError("Display Name is required.");
      return;
    }

    const nickname = detailsForm.nickname.trim();
    const altNames = parseAltNamesText(detailsForm.altNamesText);
    const allAltNames = [
      ...(nickname ? [nickname] : []),
      ...altNames.filter((name) => name.toLowerCase() !== nickname.toLowerCase()),
    ].filter((name) => name.toLowerCase() !== displayName.toLowerCase());

    setDetailsSaving(true);
    setDetailsError(null);
    setDetailsNotice(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          nickname: nickname || "",
          alternative_names: allAltNames,
          description: detailsForm.description.trim() || "",
          premiere_date: detailsForm.premiereDate || "",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          (data as { error?: string }).error ||
          `Failed to save show details (HTTP ${response.status})`;
        throw new Error(message);
      }
      const nextShow = (data as { show?: TrrShow }).show ?? null;
      if (nextShow) {
        setShow(nextShow);
      }
      setDetailsNotice("Show details saved.");
      setDetailsEditing(false);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to save show details");
    } finally {
      setDetailsSaving(false);
    }
  }, [detailsForm, getAuthHeaders, show, showId]);

  useEffect(() => {
    if (!show) return;
    const alternatives = Array.isArray(show.alternative_names)
      ? show.alternative_names.filter((name) => typeof name === "string" && name.trim().length > 0)
      : [];
    const [nickname = "", ...restAlt] = alternatives;
    setDetailsForm({
      displayName: show.name ?? "",
      nickname,
      altNamesText: restAlt.join("\n"),
      description: show.description ?? "",
      premiereDate: show.premiere_date ?? "",
    });
  }, [show]);

  const startDetailsEdit = useCallback(() => {
    setDetailsNotice(null);
    setDetailsError(null);
    setDetailsEditing(true);
  }, []);

  const cancelDetailsEdit = useCallback(() => {
    if (show) {
      const alternatives = Array.isArray(show.alternative_names)
        ? show.alternative_names.filter((name) => typeof name === "string" && name.trim().length > 0)
        : [];
      const [nickname = "", ...restAlt] = alternatives;
      setDetailsForm({
        displayName: show.name ?? "",
        nickname,
        altNamesText: restAlt.join("\n"),
        description: show.description ?? "",
        premiereDate: show.premiere_date ?? "",
      });
    }
    setDetailsNotice(null);
    setDetailsError(null);
    setDetailsEditing(false);
  }, [show]);

  // Fetch seasons
  const fetchSeasons = useCallback(async () => {
    if (!showId) return;
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
  const fetchCast = useCallback(async (): Promise<TrrCastMember[]> => {
    if (!showId) return [];
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
      const castRaw = (data as { cast?: unknown }).cast;
      const archiveCastRaw = (data as { archive_footage_cast?: unknown }).archive_footage_cast;
      const castSourceRaw = (data as { cast_source?: unknown }).cast_source;
      const eligibilityWarningRaw = (data as { eligibility_warning?: unknown }).eligibility_warning;
      const nextCast = Array.isArray(castRaw) ? (castRaw as TrrCastMember[]) : [];
      const nextArchiveCast = Array.isArray(archiveCastRaw)
        ? (archiveCastRaw as TrrCastMember[])
        : [];
      setCast(nextCast);
      setArchiveFootageCast(nextArchiveCast);
      setCastSource(castSourceRaw === "show_fallback" ? "show_fallback" : "episode_evidence");
      setCastEligibilityWarning(
        typeof eligibilityWarningRaw === "string" && eligibilityWarningRaw.trim()
          ? eligibilityWarningRaw
          : null
      );
      return nextCast;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch cast";
      console.warn("Failed to fetch cast:", message);
      setError(message);
      setArchiveFootageCast([]);
      setCastSource("episode_evidence");
      setCastEligibilityWarning(null);
      return [];
    }
  }, [showId, getAuthHeaders]);

  const fetchShowLinks = useCallback(async () => {
    if (!showId) return;
    setLinksLoading(true);
    setLinksError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}/links?status=all`, {
        headers,
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      } & { 0?: EntityLink };
      if (!response.ok) {
        throw new Error(data.error || "Failed to load links");
      }
      setShowLinks(Array.isArray(data) ? (data as EntityLink[]) : []);
    } catch (err) {
      setLinksError(err instanceof Error ? err.message : "Failed to load links");
    } finally {
      setLinksLoading(false);
    }
  }, [getAuthHeaders, showId]);

  const discoverShowLinks = useCallback(async () => {
    if (!showId) return;
    setLinksNotice(null);
    setLinksError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}/links/discover`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ include_seasons: true, include_people: true }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        discovered?: number;
      };
      if (!response.ok) throw new Error(data.error || "Failed to discover links");
      setLinksNotice(
        `Discovered ${typeof data.discovered === "number" ? data.discovered : 0} links. Review pending items before publish.`
      );
      await fetchShowLinks();
    } catch (err) {
      setLinksError(err instanceof Error ? err.message : "Failed to discover links");
    }
  }, [fetchShowLinks, getAuthHeaders, showId]);

  const patchShowLink = useCallback(
    async (linkId: string, payload: Record<string, unknown>) => {
      if (!showId) return false;
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}/links/${linkId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to update link");
      return true;
    },
    [getAuthHeaders, showId]
  );

  const setShowLinkStatus = useCallback(
    async (linkId: string, status: EntityLinkStatus) => {
      setLinksError(null);
      try {
        await patchShowLink(linkId, { status });
        await fetchShowLinks();
      } catch (err) {
        setLinksError(err instanceof Error ? err.message : "Failed to update link");
      }
    },
    [fetchShowLinks, patchShowLink]
  );

  const editShowLink = useCallback(
    async (link: EntityLink) => {
      const nextLabel = window.prompt("Link label", link.label ?? "") ?? link.label ?? "";
      const nextUrl = window.prompt("Link URL", link.url) ?? link.url;
      if (!nextUrl || nextUrl.trim().length === 0) return;
      setLinksError(null);
      try {
        await patchShowLink(link.id, {
          label: nextLabel.trim() || null,
          url: nextUrl.trim(),
        });
        await fetchShowLinks();
      } catch (err) {
        setLinksError(err instanceof Error ? err.message : "Failed to edit link");
      }
    },
    [fetchShowLinks, patchShowLink]
  );

  const deleteShowLink = useCallback(
    async (linkId: string) => {
      if (!showId) return;
      setLinksError(null);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/admin/trr-api/shows/${showId}/links/${linkId}`, {
          method: "DELETE",
          headers,
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(data.error || "Failed to delete link");
        await fetchShowLinks();
      } catch (err) {
        setLinksError(err instanceof Error ? err.message : "Failed to delete link");
      }
    },
    [fetchShowLinks, getAuthHeaders, showId]
  );

  const fetchShowRoles = useCallback(async () => {
    if (!showId) return;
    setRolesLoading(true);
    setRolesError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}/roles`, {
        headers,
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to load roles");
      setShowRoles(Array.isArray(data) ? (data as ShowRole[]) : []);
    } catch (err) {
      setRolesError(err instanceof Error ? err.message : "Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  }, [getAuthHeaders, showId]);

  const createShowRole = useCallback(async () => {
    const roleName = newRoleName.trim();
    if (!roleName || !showId) return;
    setRolesError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}/roles`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: roleName }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to create role");
      setNewRoleName("");
      await fetchShowRoles();
    } catch (err) {
      setRolesError(err instanceof Error ? err.message : "Failed to create role");
    }
  }, [fetchShowRoles, getAuthHeaders, newRoleName, showId]);

  const patchShowRole = useCallback(
    async (roleId: string, payload: Record<string, unknown>) => {
      if (!showId) return;
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}/roles/${roleId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Failed to update role");
    },
    [getAuthHeaders, showId]
  );

  const fetchCastRoleMembers = useCallback(async () => {
    if (!showId) return;
    setCastRoleMembersLoading(true);
    setCastRoleMembersError(null);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("sort_by", castSortBy);
      params.set("order", castSortOrder);
      if (castSeasonFilters.length > 0) {
        params.set("seasons", castSeasonFilters.join(","));
      }
      if (castRoleFilters.length > 0) {
        params.set("roles", castRoleFilters.join(","));
      }
      if (castHasImageFilter === "yes") params.set("has_image", "true");
      if (castHasImageFilter === "no") params.set("has_image", "false");

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
            seasons_appeared:
              typeof (row as { seasons_appeared?: unknown }).seasons_appeared === "number"
                ? (row as { seasons_appeared: number }).seasons_appeared
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
  }, [
    castHasImageFilter,
    castRoleFilters,
    castSeasonFilters,
    castSortBy,
    castSortOrder,
    getAuthHeaders,
    showId,
  ]);

  const renameShowRole = useCallback(
    async (role: ShowRole) => {
      const nextName = window.prompt("Rename role", role.name);
      if (!nextName || nextName.trim().length === 0 || nextName.trim() === role.name) return;
      try {
        setRolesError(null);
        await patchShowRole(role.id, { name: nextName.trim() });
        await fetchShowRoles();
        await fetchCastRoleMembers();
      } catch (err) {
        setRolesError(err instanceof Error ? err.message : "Failed to rename role");
      }
    },
    [fetchCastRoleMembers, fetchShowRoles, patchShowRole]
  );

  const toggleShowRoleActive = useCallback(
    async (role: ShowRole) => {
      try {
        setRolesError(null);
        await patchShowRole(role.id, { is_active: !role.is_active });
        await fetchShowRoles();
        await fetchCastRoleMembers();
      } catch (err) {
        setRolesError(err instanceof Error ? err.message : "Failed to update role");
      }
    },
    [fetchCastRoleMembers, fetchShowRoles, patchShowRole]
  );

  const assignRolesToCastMember = useCallback(
    async (personId: string, personName: string) => {
      if (!showId) return;
      const currentRoles =
        castRoleMembers.find((member) => member.person_id === personId)?.roles ?? [];
      const input = window.prompt(
        `Assign roles for ${personName}. Enter comma-separated role names.`,
        currentRoles.join(", ")
      );
      if (input === null) return;
      const roleNames = Array.from(
        new Set(
          input
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        )
      );
      try {
        setRolesError(null);
        setCastRoleMembersError(null);
        const headers = await getAuthHeaders();
        let nextRoles = [...showRoles];
        for (const roleName of roleNames) {
          if (nextRoles.some((role) => role.name.toLowerCase() === roleName.toLowerCase())) continue;
          const createResponse = await fetch(`/api/admin/trr-api/shows/${showId}/roles`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ name: roleName }),
          });
          const created = (await createResponse.json().catch(() => ({}))) as {
            error?: string;
            id?: string;
          };
          if (!createResponse.ok) {
            throw new Error(created.error || `Failed to create role "${roleName}"`);
          }
        }

        await fetchShowRoles();
        nextRoles = await (async () => {
          const response = await fetch(`/api/admin/trr-api/shows/${showId}/roles`, {
            headers,
            cache: "no-store",
          });
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          if (!response.ok) throw new Error(data.error || "Failed to refresh roles");
          return Array.isArray(data) ? (data as ShowRole[]) : [];
        })();

        const roleIds = nextRoles
          .filter((role) => roleNames.some((name) => name.toLowerCase() === role.name.toLowerCase()))
          .map((role) => role.id);
        const seasonNumber = castSeasonFilters.length === 1 ? castSeasonFilters[0] : 0;
        const assignResponse = await fetch(
          `/api/admin/trr-api/shows/${showId}/cast/${personId}/roles`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ season_number: seasonNumber, role_ids: roleIds }),
          }
        );
        const assigned = (await assignResponse.json().catch(() => ({}))) as { error?: string };
        if (!assignResponse.ok) throw new Error(assigned.error || "Failed to assign roles");
        await fetchCastRoleMembers();
      } catch (err) {
        setCastRoleMembersError(err instanceof Error ? err.message : "Failed to assign roles");
      }
    },
    [castRoleMembers, castSeasonFilters, fetchCastRoleMembers, fetchShowRoles, getAuthHeaders, showId, showRoles]
  );

  const loadBravoData = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!showId) return;
    if (!force && bravoLoaded) return;
    if (bravoLoadInFlightRef.current) {
      await bravoLoadInFlightRef.current;
      return;
    }

    const request = (async () => {
      try {
        setBravoLoading(true);
        setBravoError(null);
        const headers = await getAuthHeaders();

        const [videosResponse, newsResponse] = await Promise.all([
          fetch(`/api/admin/trr-api/shows/${showId}/bravo/videos?merge_person_sources=true`, {
            headers,
            cache: "no-store",
          }),
          fetch(`/api/admin/trr-api/shows/${showId}/bravo/news`, {
            headers,
            cache: "no-store",
          }),
        ]);

        const videosData = (await videosResponse.json().catch(() => ({}))) as {
          videos?: BravoVideoItem[];
          error?: string;
        };
        const newsData = (await newsResponse.json().catch(() => ({}))) as {
          news?: BravoNewsItem[];
          error?: string;
        };

        if (!videosResponse.ok) {
          throw new Error(videosData.error || "Failed to fetch Bravo videos");
        }
        if (!newsResponse.ok) {
          throw new Error(newsData.error || "Failed to fetch Bravo news");
        }

        setBravoVideos(Array.isArray(videosData.videos) ? videosData.videos : []);
        setBravoNews(Array.isArray(newsData.news) ? newsData.news : []);
        setBravoLoaded(true);
      } catch (err) {
        setBravoLoaded(false);
        setBravoError(err instanceof Error ? err.message : "Failed to load Bravo data");
      } finally {
        setBravoLoading(false);
      }
    })();

    bravoLoadInFlightRef.current = request;
    try {
      await request;
    } finally {
      if (bravoLoadInFlightRef.current === request) {
        bravoLoadInFlightRef.current = null;
      }
    }
  }, [bravoLoaded, getAuthHeaders, showId]);

  const syncBravoSeasonOptions = useMemo(() => {
    const numbers = seasons
      .filter((season) => {
        const summary = seasonEpisodeSummaries[season.id];
        const episodeCount = summary?.count;
        const hasEpisodeEvidence = typeof episodeCount === "number" && Number.isFinite(episodeCount) && episodeCount > 1;
        const hasPremiereDate = Boolean((summary?.premiereDate ?? season.air_date)?.trim());
        return hasEpisodeEvidence || hasPremiereDate;
      })
      .map((season) => season.season_number)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return [...new Set(numbers)].sort((a, b) => b - a);
  }, [seasonEpisodeSummaries, seasons]);

  const defaultSyncBravoSeasonNumber = useMemo(() => {
    if (syncBravoSeasonOptions.length === 0) return null;
    return syncBravoSeasonOptions[0];
  }, [syncBravoSeasonOptions]);

  const syncBravoSeasonEligibilityError =
    "No eligible seasons for Bravo sync. A season must have more than 1 episode or a premiere date.";

  useEffect(() => {
    setSyncBravoTargetSeasonNumber((prev) => {
      if (
        typeof prev === "number" &&
        Number.isFinite(prev) &&
        syncBravoSeasonOptions.includes(prev)
      ) {
        return prev;
      }
      return defaultSyncBravoSeasonNumber;
    });
  }, [defaultSyncBravoSeasonNumber, syncBravoSeasonOptions]);

  const previewSyncByBravo = useCallback(async (urlOverride?: string) => {
    const hasEpisodeEvidence =
      (show?.show_total_episodes ?? 0) > 0 ||
      Object.values(seasonEpisodeSummaries).some((summary) => (summary?.count ?? 0) > 0);
    if (seasons.length === 0 || !hasEpisodeEvidence || cast.length === 0) {
      appendRefreshLog({
        category: "BravoTV",
        message: "Blocked: sync seasons, episodes, and cast first.",
      });
      setSyncBravoError(
        "Sync seasons, episodes, and cast first. Run Refresh and wait for completion."
      );
      return;
    }
    if (syncBravoSeasonOptions.length === 0) {
      setSyncBravoError(syncBravoSeasonEligibilityError);
      appendRefreshLog({
        category: "BravoTV",
        message: `Blocked: ${syncBravoSeasonEligibilityError}`,
      });
      return;
    }
    const targetUrl = (typeof urlOverride === "string" ? urlOverride : syncBravoUrl).trim();
    if (!targetUrl) {
      setSyncBravoError("Show URL is required.");
      return;
    }
    if (targetUrl !== syncBravoUrl) {
      setSyncBravoUrl(targetUrl);
    }
    setSyncBravoPreviewLoading(true);
    setSyncBravoError(null);
    setSyncBravoNotice(null);
    appendRefreshLog({
      category: "BravoTV",
      message: "Loading Bravo preview...",
    });
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}/import-bravo/preview`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          show_url: targetUrl,
          include_people: true,
          include_videos: true,
          include_news: true,
          season_number: syncBravoTargetSeasonNumber ?? defaultSyncBravoSeasonNumber ?? undefined,
        }),
      });
      const clone = response.clone();
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        detail?: string;
        show?: { description?: string | null; airs_text?: string | null };
        image_candidates?: Array<{ url?: string; alt?: string | null }>;
        people?: BravoPreviewPerson[];
        discovered_person_urls?: string[];
        videos?: BravoVideoItem[];
        news?: BravoNewsItem[];
      } | null;
      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.detail ||
            `Bravo preview failed (HTTP ${response.status})`
        );
      }

      if (!data || typeof data !== "object") {
        const fallbackText = (await clone.text().catch(() => "")).trim();
        const message = fallbackText
          ? `Bravo preview returned a non-JSON payload: ${fallbackText.slice(0, 180)}`
          : "Bravo preview returned an empty response.";
        throw new Error(message);
      }

      const nextDescription =
        typeof data.show?.description === "string" ? data.show.description : "";
      const nextAirs =
        typeof data.show?.airs_text === "string" ? data.show.airs_text : "";
      const nextImages = Array.isArray(data.image_candidates)
        ? data.image_candidates
            .map((image) => ({
              url: typeof image.url === "string" ? image.url : "",
              alt: typeof image.alt === "string" ? image.alt : null,
            }))
            .filter((image) => image.url)
        : [];
      const nextVideos = Array.isArray(data.videos)
        ? data.videos.filter((video): video is BravoVideoItem => typeof video?.clip_url === "string")
        : [];
      const nextNews = Array.isArray(data.news)
        ? data.news.filter((item): item is BravoNewsItem => typeof item?.article_url === "string")
        : [];
      const nextPeople = Array.isArray(data.people)
        ? data.people.filter((person): person is BravoPreviewPerson => {
            const personUrl = person?.canonical_url;
            return typeof personUrl === "string" && personUrl.trim().length > 0;
          })
        : [];
      const nextDiscoveredUrls = Array.isArray(data.discovered_person_urls)
        ? data.discovered_person_urls
            .filter((url): url is string => typeof url === "string")
            .map((url) => url.trim())
            .filter((url) => url.length > 0)
        : [];
      const excludedShowImageUrls = new Set<string>();
      for (const video of nextVideos) {
        if (typeof video.image_url === "string" && video.image_url.trim()) {
          excludedShowImageUrls.add(video.image_url.trim());
        }
      }
      for (const newsItem of nextNews) {
        if (typeof newsItem.image_url === "string" && newsItem.image_url.trim()) {
          excludedShowImageUrls.add(newsItem.image_url.trim());
        }
      }
      const filteredShowImages = nextImages.filter((image) => !excludedShowImageUrls.has(image.url));
      const nextImageKinds: Record<string, BravoImportImageKind> = {};
      for (const image of filteredShowImages) {
        nextImageKinds[image.url] = inferBravoImportImageKind(image);
      }

      const seasonFromPreview = nextVideos
        .map((video) => video.season_number)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const seasonFromShow = seasons
        .map((season) => season.season_number)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const latestSeason = [...seasonFromPreview, ...seasonFromShow].sort((a, b) => b - a)[0] ?? null;
      const defaultPreviewSeason =
        typeof syncBravoTargetSeasonNumber === "number" &&
        seasonFromPreview.includes(syncBravoTargetSeasonNumber)
          ? syncBravoTargetSeasonNumber
          : latestSeason !== null && seasonFromPreview.includes(latestSeason)
            ? latestSeason
            : seasonFromPreview.length > 0
              ? [...seasonFromPreview].sort((a, b) => b - a)[0]
              : "all";

      setSyncBravoDescription(nextDescription);
      setSyncBravoAirs(nextAirs);
      setSyncBravoImages(filteredShowImages);
      setSyncBravoImageKinds(nextImageKinds);
      setSyncBravoPreviewPeople(nextPeople);
      setSyncBravoDiscoveredPersonUrls(nextDiscoveredUrls);
      setSyncBravoPreviewVideos(nextVideos);
      setSyncBravoPreviewNews(nextNews);
      setSyncBravoPreviewSeasonFilter(defaultPreviewSeason);
      setSyncBravoSelectedImages(new Set(filteredShowImages.map((image) => image.url)));
      setSyncBravoNotice("Preview loaded from persisted Bravo parse output.");
      appendRefreshLog({
        category: "BravoTV",
        message: `Preview ready: ${nextPeople.length} cast URLs, ${nextVideos.length} videos, ${nextNews.length} news, ${filteredShowImages.length} show images.`,
      });
    } catch (err) {
      appendRefreshLog({
        category: "BravoTV",
        message: `Preview failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
      setSyncBravoError(err instanceof Error ? err.message : "Bravo preview failed");
    } finally {
      setSyncBravoPreviewLoading(false);
    }
  }, [
    appendRefreshLog,
    cast.length,
    defaultSyncBravoSeasonNumber,
    getAuthHeaders,
    seasonEpisodeSummaries,
    seasons,
    showId,
    show?.show_total_episodes,
    syncBravoSeasonEligibilityError,
    syncBravoSeasonOptions.length,
    syncBravoTargetSeasonNumber,
    syncBravoUrl,
  ]);

  const commitSyncByBravo = useCallback(async () => {
    if (!syncBravoUrl.trim()) {
      setSyncBravoError("Show URL is required.");
      return;
    }
    if (syncBravoSeasonOptions.length === 0) {
      setSyncBravoError(syncBravoSeasonEligibilityError);
      appendRefreshLog({
        category: "BravoTV",
        message: `Blocked: ${syncBravoSeasonEligibilityError}`,
      });
      return;
    }

    setSyncBravoCommitLoading(true);
    setSyncBravoError(null);
    setSyncBravoNotice(null);
    appendRefreshLog({
      category: "BravoTV",
      message: "Committing Bravo sync...",
    });

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/shows/${showId}/import-bravo/commit`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          show_url: syncBravoUrl.trim(),
          selected_show_images: Array.from(syncBravoSelectedImages).map((url) => ({
            url,
            kind: syncBravoImageKinds[url] ?? "promo",
          })),
          selected_show_image_urls: Array.from(syncBravoSelectedImages),
          description_override: syncBravoDescription.trim() || undefined,
          airs_override: syncBravoAirs.trim() || undefined,
          season_number:
            syncBravoTargetSeasonNumber ?? defaultSyncBravoSeasonNumber ?? undefined,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        counts?: { imported_show_images?: number; people_updated?: number };
      };
      if (!response.ok) {
        throw new Error(data.error || data.detail || "Bravo sync failed");
      }

      setSyncBravoNotice(
        `Synced Bravo data${typeof data.counts?.people_updated === "number" ? `; people updated: ${data.counts.people_updated}` : ""}${typeof data.counts?.imported_show_images === "number" ? `; images imported: ${data.counts.imported_show_images}` : ""}.`
      );
      appendRefreshLog({
        category: "BravoTV",
        message: `Bravo sync complete: ${data.counts?.people_updated ?? 0} people updated, ${data.counts?.imported_show_images ?? 0} show images imported.`,
      });

      await Promise.all([fetchShow(), fetchCast()]);
      setBravoLoaded(false);
      void loadBravoData({ force: true });
    } catch (err) {
      appendRefreshLog({
        category: "BravoTV",
        message: `Bravo sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
      setSyncBravoError(err instanceof Error ? err.message : "Bravo sync failed");
    } finally {
      setSyncBravoCommitLoading(false);
    }
  }, [
    appendRefreshLog,
    fetchCast,
    fetchShow,
    getAuthHeaders,
    loadBravoData,
    showId,
    syncBravoDescription,
    syncBravoImageKinds,
    defaultSyncBravoSeasonNumber,
    syncBravoSeasonEligibilityError,
    syncBravoSeasonOptions.length,
    syncBravoSelectedImages,
    syncBravoAirs,
    syncBravoTargetSeasonNumber,
    syncBravoUrl,
  ]);

  const syncBravoLoading = syncBravoPreviewLoading || syncBravoCommitLoading;

  // Check if show is covered
  const checkCoverage = useCallback(async () => {
    if (!showId) return;
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
    if (!show || !showId) return;
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
    if (!showId) return;
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
    if (!showId) return;

    const loadData = async () => {
      setLoading(true);
      await fetchShow();
      await Promise.all([fetchSeasons(), fetchCast(), checkCoverage(), loadBravoData()]);
      setLoading(false);
    };

    loadData();
  }, [hasAccess, showId, fetchShow, fetchSeasons, fetchCast, checkCoverage]);

  useEffect(() => {
    if (!hasAccess || !showId || activeTab !== "details") return;
    void fetchShowLinks();
  }, [activeTab, fetchShowLinks, hasAccess, showId]);

  useEffect(() => {
    if (!hasAccess || !showId || activeTab !== "cast") return;
    void fetchShowRoles();
  }, [activeTab, fetchShowRoles, hasAccess, showId]);

  useEffect(() => {
    if (!hasAccess || !showId || activeTab !== "cast") return;
    void fetchCastRoleMembers();
  }, [activeTab, fetchCastRoleMembers, hasAccess, showId]);

  useEffect(() => {
    setBravoVideos([]);
    setBravoNews([]);
    setBravoError(null);
    setBravoLoaded(false);
    bravoLoadInFlightRef.current = null;
    setShowLinks([]);
    setShowRoles([]);
    setCastRoleMembers([]);
    setCastRoleMembersError(null);
    setLinksError(null);
    setLinksNotice(null);
    setDetailsEditing(false);
  }, [showId]);

  useEffect(() => {
    if (!hasAccess || !showId) return;
    const shouldLoadBravo =
      refreshLogOpen || activeTab === "news" || (activeTab === "assets" && assetsView === "videos");
    if (!shouldLoadBravo) return;
    void loadBravoData();
  }, [activeTab, assetsView, hasAccess, loadBravoData, refreshLogOpen, showId]);

  useEffect(() => {
    if (seasons.length > 0) {
      fetchSeasonEpisodeSummaries(seasons);
    }
  }, [seasons, fetchSeasonEpisodeSummaries]);

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString() : "TBD";

  const formatBravoPublishedDate = (value: string | null | undefined): string | null => {
    if (!value || typeof value !== "string") return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
  };

  const formatDateRange = (premiere: string | null, finale: string | null) => {
    if (!premiere && !finale) return "Dates unavailable";
    return `${formatDate(premiere)} – ${formatDate(finale)}`;
  };

  const castRoleMemberByPersonId = useMemo(
    () => new Map(castRoleMembers.map((member) => [member.person_id, member] as const)),
    [castRoleMembers]
  );

  const availableCastRoles = useMemo(() => {
    const values = new Set<string>();
    for (const role of showRoles) {
      if (role.is_active) values.add(role.name);
    }
    for (const member of castRoleMembers) {
      for (const role of member.roles) values.add(role);
    }
    for (const member of cast) {
      if (typeof member.role === "string" && member.role.trim()) values.add(member.role.trim());
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [cast, castRoleMembers, showRoles]);

  const availableCastCreditCategories = useMemo(() => {
    const values = new Set<string>();
    for (const member of cast) {
      if (typeof member.credit_category === "string" && member.credit_category.trim()) {
        values.add(member.credit_category.trim());
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [cast]);

  const availableCastSeasons = useMemo(() => {
    const values = new Set<number>();
    for (const member of castRoleMembers) {
      if (typeof member.latest_season === "number" && Number.isFinite(member.latest_season)) {
        values.add(member.latest_season);
      }
    }
    return Array.from(values).sort((a, b) => b - a);
  }, [castRoleMembers]);

  const castDisplayMembers = useMemo(() => {
    const merged = cast.map((member) => {
      const enriched = castRoleMemberByPersonId.get(member.person_id);
      const mergedRoles =
        enriched && enriched.roles.length > 0
          ? enriched.roles
          : typeof member.role === "string" && member.role.trim().length > 0
            ? [member.role.trim()]
            : [];
      const mergedLatestSeason =
        enriched && typeof enriched.latest_season === "number" ? enriched.latest_season : null;
      const mergedTotalEpisodes =
        enriched && typeof enriched.total_episodes === "number"
          ? enriched.total_episodes
          : typeof member.total_episodes === "number"
            ? member.total_episodes
            : null;
      const mergedPhotoUrl =
        enriched?.photo_url || member.photo_url || member.cover_photo_url || null;
      return {
        ...member,
        roles: mergedRoles,
        latest_season: mergedLatestSeason,
        total_episodes: mergedTotalEpisodes,
        merged_photo_url: mergedPhotoUrl,
      };
    });

    const filtered = merged.filter((member) => {
      if (
        castSeasonFilters.length > 0 &&
        (!member.latest_season || !castSeasonFilters.includes(member.latest_season))
      ) {
        return false;
      }
      if (
        castRoleFilters.length > 0 &&
        !member.roles.some((role) =>
          castRoleFilters.some((selected) => selected.toLowerCase() === role.toLowerCase())
        )
      ) {
        return false;
      }
      if (
        castCreditFilters.length > 0 &&
        !castCreditFilters.some(
          (value) => value.toLowerCase() === (member.credit_category ?? "").toLowerCase()
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
        const aName = (a.full_name || a.cast_member_name || "").toLowerCase();
        const bName = (b.full_name || b.cast_member_name || "").toLowerCase();
        return castSortOrder === "asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }
      if (castSortBy === "season") {
        const aSeason = a.latest_season ?? -1;
        const bSeason = b.latest_season ?? -1;
        return castSortOrder === "asc" ? aSeason - bSeason : bSeason - aSeason;
      }
      const aEpisodes = a.total_episodes ?? 0;
      const bEpisodes = b.total_episodes ?? 0;
      return castSortOrder === "asc" ? aEpisodes - bEpisodes : bEpisodes - aEpisodes;
    });
    return sorted;
  }, [
    cast,
    castCreditFilters,
    castHasImageFilter,
    castRoleFilters,
    castRoleMemberByPersonId,
    castSeasonFilters,
    castSortBy,
    castSortOrder,
  ]);

  const linksByGroup = useMemo(() => {
    const grouped = new Map<EntityLinkGroup, EntityLink[]>();
    for (const group of ENTITY_LINK_GROUP_ORDER) grouped.set(group, []);
    for (const link of showLinks) {
      const list = grouped.get(link.link_group as EntityLinkGroup);
      if (!list) continue;
      list.push(link);
    }
    for (const group of ENTITY_LINK_GROUP_ORDER) {
      const list = grouped.get(group) ?? [];
      list.sort((a, b) => {
        if (group === "cast_announcements") {
          if (a.season_number !== b.season_number) return b.season_number - a.season_number;
        }
        return (a.label || a.url).localeCompare(b.label || b.url);
      });
    }
    return grouped;
  }, [showLinks]);

  const pendingLinkCount = useMemo(
    () => showLinks.filter((link) => link.status === "pending").length,
    [showLinks]
  );

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

  const gallerySectionAssets = useMemo(() => {
    const showBackdrops: SeasonAsset[] = [];
    const showPosters: SeasonAsset[] = [];
    const seasonPosters: SeasonAsset[] = [];
    const episodeStills: SeasonAsset[] = [];
    const castAndPromos: SeasonAsset[] = [];
    const other: SeasonAsset[] = [];

    for (const asset of filteredGalleryAssets) {
      const normalizedKind = (asset.kind ?? "").toLowerCase().trim();
      const normalizedSource = (asset.source ?? "").toLowerCase().trim();
      const isBackdropKind = normalizedKind === "backdrop";
      const isTmdbBackdrop =
        asset.type === "show" &&
        isBackdropKind &&
        normalizedSource === "tmdb";
      const isShowPoster =
        asset.type === "show" &&
        !isBackdropKind &&
        normalizedKind === "poster";
      const isLogo = normalizedKind === "logo";
      const isCastOrPromo = normalizedKind === "cast" || normalizedKind === "promo";

      if (isTmdbBackdrop) {
        showBackdrops.push(asset);
        continue;
      }
      if (isShowPoster) {
        showPosters.push(asset);
        continue;
      }
      if (asset.type === "season") {
        seasonPosters.push(asset);
        continue;
      }
      if (asset.type === "episode") {
        episodeStills.push(asset);
        continue;
      }
      if (isCastOrPromo) {
        castAndPromos.push(asset);
        continue;
      }
      if (isLogo) continue;
      other.push(asset);
    }

    return {
      showBackdrops,
      showPosters,
      seasonPosters,
      episodeStills,
      castAndPromos,
      other,
    };
  }, [filteredGalleryAssets]);

  const brandLogoAssets = useMemo(
    () =>
      galleryAssets.filter(
        (asset) =>
          asset.type === "show" &&
          (asset.kind ?? "").toLowerCase().trim() === "logo"
      ),
    [galleryAssets]
  );

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

  const socialSeasonOptions = useMemo(() => {
    const sortByMostRecentSeason = (a: TrrSeason, b: TrrSeason) => {
      if (a.season_number !== b.season_number) {
        return b.season_number - a.season_number;
      }
      return String(b.id).localeCompare(String(a.id));
    };

    const aired = [...visibleSeasons].sort(sortByMostRecentSeason);
    if (aired.length > 0) return aired;
    return [...seasons].sort(sortByMostRecentSeason);
  }, [seasons, visibleSeasons]);

  const defaultSocialSeasonId = useMemo(
    () => socialSeasonOptions[0]?.id ?? null,
    [socialSeasonOptions]
  );

  useEffect(() => {
    setSelectedSocialSeasonId((prev) => {
      if (prev && socialSeasonOptions.some((season) => season.id === prev)) {
        return prev;
      }
      return defaultSocialSeasonId;
    });
  }, [defaultSocialSeasonId, socialSeasonOptions]);

  const selectedSocialSeason = useMemo(
    () => socialSeasonOptions.find((season) => season.id === selectedSocialSeasonId) ?? null,
    [selectedSocialSeasonId, socialSeasonOptions]
  );

  const syncBravoPreviewSeasonOptions = useMemo(() => {
    const set = new Set<number>();
    for (const video of syncBravoPreviewVideos) {
      if (typeof video.season_number === "number" && Number.isFinite(video.season_number)) {
        set.add(video.season_number);
      }
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [syncBravoPreviewVideos]);

  const syncBravoFilteredPreviewVideos = useMemo(() => {
    if (syncBravoPreviewSeasonFilter === "all") return syncBravoPreviewVideos;
    return syncBravoPreviewVideos.filter(
      (video) =>
        typeof video.season_number === "number" &&
        video.season_number === syncBravoPreviewSeasonFilter
    );
  }, [syncBravoPreviewSeasonFilter, syncBravoPreviewVideos]);

  const syncBravoPreviewCastLinks = useMemo(() => {
    const byUrl = new Map<string, { name: string | null; url: string }>();

    for (const person of syncBravoPreviewPeople) {
      const url =
        typeof person.canonical_url === "string" && person.canonical_url.trim()
          ? person.canonical_url.trim()
          : "";
      if (!url) continue;
      const name =
        typeof person.name === "string" && person.name.trim() ? person.name.trim() : null;
      byUrl.set(url, { name, url });
    }

    for (const discoveredUrl of syncBravoDiscoveredPersonUrls) {
      const url = typeof discoveredUrl === "string" ? discoveredUrl.trim() : "";
      if (!url || byUrl.has(url)) continue;
      byUrl.set(url, { name: null, url });
    }

    return Array.from(byUrl.values()).sort((a, b) => {
      const aKey = (a.name || a.url).toLowerCase();
      const bKey = (b.name || b.url).toLowerCase();
      return aKey.localeCompare(bKey);
    });
  }, [syncBravoDiscoveredPersonUrls, syncBravoPreviewPeople]);

  const syncBravoSelectedImageSummaries = useMemo(() => {
    const byUrl = new Map(syncBravoImages.map((image) => [image.url, image]));
    return Array.from(syncBravoSelectedImages)
      .map((url) => {
        const image = byUrl.get(url);
        return {
          url,
          alt: image?.alt ?? null,
          kind: syncBravoImageKinds[url] ?? inferBravoImportImageKind({ url, alt: image?.alt ?? null }),
        };
      })
      .sort((a, b) => {
        const aKey = (a.alt || a.url).toLowerCase();
        const bKey = (b.alt || b.url).toLowerCase();
        return aKey.localeCompare(bKey);
      });
  }, [syncBravoImageKinds, syncBravoImages, syncBravoSelectedImages]);

  const openSyncBravoConfirmStep = useCallback(() => {
    const missing: string[] = [];
    const hasEpisodeEvidence =
      (show?.show_total_episodes ?? 0) > 0 ||
      Object.values(seasonEpisodeSummaries).some((summary) => (summary?.count ?? 0) > 0);
    if (seasons.length <= 0) missing.push("seasons");
    if (!hasEpisodeEvidence) missing.push("episodes");
    if (cast.length <= 0) missing.push("cast");
    if (missing.length > 0) {
      setSyncBravoError(
        `Sync seasons, episodes, and cast first (missing: ${missing.join(", ")}).`
      );
      return;
    }
    const hasPreviewData =
      syncBravoImages.length > 0 ||
      syncBravoPreviewCastLinks.length > 0 ||
      syncBravoPreviewNews.length > 0 ||
      syncBravoPreviewVideos.length > 0 ||
      Boolean(syncBravoDescription.trim()) ||
      Boolean(syncBravoAirs.trim());
    if (!hasPreviewData) {
      setSyncBravoError("Run Preview first before moving to the next step.");
      return;
    }
    setSyncBravoError(null);
    setSyncBravoNotice(null);
    setSyncBravoStep("confirm");
  }, [
    syncBravoAirs,
    syncBravoDescription,
    syncBravoImages.length,
    syncBravoPreviewCastLinks.length,
    syncBravoPreviewNews.length,
    syncBravoPreviewVideos.length,
    cast.length,
    seasonEpisodeSummaries,
    seasons.length,
    show?.show_total_episodes,
  ]);

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
      if (!showId) return;
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
    async (
      target: ShowRefreshTarget,
      options?: ShowRefreshRunOptions
    ): Promise<boolean> => {
      const label = getShowRefreshTargetLabel(target);
      const includeCastProfiles = options?.includeCastProfiles ?? true;
      const fastPhotoMode = options?.photoMode === "fast";

      let success = false;
      let castProfilesSummary: { attempted: number; succeeded: number; failed: number } | null =
        null;

      setRefreshingTargets((prev) => ({ ...prev, [target]: true }));
      setRefreshTargetProgress((prev) => ({
        ...prev,
        [target]: {
          stage: "Initializing",
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
      appendRefreshLog({
        category: label,
        message: `Starting ${label} refresh...`,
        current: 0,
        total: null,
      });
      if (target === "photos" && fastPhotoMode) {
        appendRefreshLog({
          category: label,
          message: "Fast mode enabled: reduced media crawl pages and skipped auto-count/word-detection.",
          current: null,
          total: null,
        });
      }

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
            target === "photos"
              ? {
                  skip_mirror: false,
                  limit_per_source: fastPhotoMode ? 20 : 50,
                  imdb_mediaindex_max_pages: fastPhotoMode ? 6 : 25,
                  skip_auto_count: fastPhotoMode,
                  skip_word_detection: fastPhotoMode,
                }
              : { targets: [target] };
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
                const stageCurrentRaw = (payload as { stage_current?: unknown }).stage_current;
                const stageTotalRaw = (payload as { stage_total?: unknown }).stage_total;
                const currentRaw = (payload as { current?: unknown }).current;
                const totalRaw = (payload as { total?: unknown }).total;
                const current = parseProgressNumber(stageCurrentRaw ?? currentRaw);
                const total = parseProgressNumber(stageTotalRaw ?? totalRaw);
                const stageLabel = resolveStageLabel(stageRaw, SHOW_REFRESH_STAGE_LABELS);
                const progressMessage = buildProgressMessage(
                  stageLabel,
                  messageRaw,
                  `Refreshing ${label}...`
                );

                setRefreshTargetProgress((prev) => ({
                  ...prev,
                  [target]: {
                    stage: stageLabel ?? prev[target]?.stage ?? null,
                    message: progressMessage || prev[target]?.message || null,
                    current: typeof current === "number" && Number.isFinite(current) ? current : null,
                    total: typeof total === "number" && Number.isFinite(total) ? total : null,
                  },
                }));
                appendRefreshLog({
                  category: label,
                  message: progressMessage,
                  current: typeof current === "number" && Number.isFinite(current) ? current : null,
                  total: typeof total === "number" && Number.isFinite(total) ? total : null,
                });
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
                  const autoSucceeded = asNum((payload as { auto_counts_succeeded?: unknown }).auto_counts_succeeded);
                  const autoFailed = asNum((payload as { auto_counts_failed?: unknown }).auto_counts_failed);
                  const wordSucceeded = asNum((payload as { text_overlay_succeeded?: unknown }).text_overlay_succeeded);
                  const wordFailed = asNum((payload as { text_overlay_failed?: unknown }).text_overlay_failed);

                  if (activeTab === "assets" && assetsView === "images") {
                    await loadGalleryAssets(selectedGallerySeason);
                  }

                  const successParts = [
                    castFetched !== null ? `photos fetched: ${castFetched}` : null,
                    castUpserted !== null ? `photos upserted: ${castUpserted}` : null,
                    castMirrored !== null ? `photos mirrored: ${castMirrored}` : null,
                    castPruned !== null ? `photos pruned: ${castPruned}` : null,
                    autoSucceeded !== null ? `auto counts set: ${autoSucceeded}` : null,
                    wordSucceeded !== null ? `text-overlay classified: ${wordSucceeded}` : null,
                  ].filter((part): part is string => Boolean(part));
                  const failParts = [
                    castFailed !== null && castFailed > 0 ? `photos failed: ${castFailed}` : null,
                    autoFailed !== null && autoFailed > 0
                      ? `auto counts failed: ${autoFailed}`
                      : null,
                    wordFailed !== null && wordFailed > 0
                      ? `text-overlay failed: ${wordFailed}`
                      : null,
                  ].filter((part): part is string => Boolean(part));

                  setRefreshTargetNotice((prev) => ({
                    ...prev,
                    photos: [
                      successParts.length > 0
                        ? `SUCCESS: ${successParts.join(", ")}`
                        : "SUCCESS: photos refresh complete",
                      failParts.length > 0 ? `FAILS: ${failParts.join(", ")}` : null,
                      durationMs !== null ? `duration: ${durationMs}ms` : null,
                    ]
                      .filter(Boolean)
                      .join(" | "),
                  }));
                  appendRefreshLog({
                    category: label,
                    message:
                      successParts.length > 0
                        ? `Photos refresh complete: ${successParts.join(", ")}.`
                        : "Photos refresh complete.",
                    current: null,
                    total: null,
                  });
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
                    const photosOk = await refreshShow("photos", {
                      photoMode: fastPhotoMode ? "fast" : "full",
                      includeCastProfiles: false,
                    });
                    if (!photosOk) {
                      throw new Error("Seasons & Episodes refreshed, but photo mirroring failed.");
                    }
                  } else if (target === "photos") {
                    if (activeTab === "assets" && assetsView === "images") {
                      await loadGalleryAssets(selectedGallerySeason);
                    }
                  } else if (target === "cast_credits") {
                    if (includeCastProfiles) {
                      const castMembers = await fetchCast();
                      castProfilesSummary = await refreshCastProfilesAndMedia(castMembers);
                    }
                    await fetchCast();
                  }

                  const durationMs =
                    typeof step?.duration_ms === "number" ? step.duration_ms : null;
                  const castSuffix =
                    target === "cast_credits" && castProfilesSummary
                      ? `, cast profiles/media: ${castProfilesSummary.succeeded}/${castProfilesSummary.attempted}${
                          castProfilesSummary.failed > 0
                            ? ` (${castProfilesSummary.failed} failed)`
                            : ""
                        }`
                      : "";
                  setRefreshTargetNotice((prev) => ({
                    ...prev,
                    [target]: `Refreshed ${label}${durationMs !== null ? ` (${durationMs}ms)` : ""}${castSuffix}.`,
                  }));
                  appendRefreshLog({
                    category: label,
                    message: `Completed ${label}${durationMs !== null ? ` in ${durationMs}ms` : ""}${castSuffix}.`,
                    current: null,
                    total: null,
                  });
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
                appendRefreshLog({
                  category: label,
                  message: `Failed: ${errorText}`,
                  current: null,
                  total: null,
                });
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
          appendRefreshLog({
            category: label,
            message: "Live stream unavailable; retrying with fallback refresh.",
            current: null,
            total: null,
          });
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
            const photosOk = await refreshShow("photos", {
              photoMode: fastPhotoMode ? "fast" : "full",
              includeCastProfiles: false,
            });
            if (!photosOk) {
              throw new Error("Seasons & Episodes refreshed, but photo mirroring failed.");
            }
          } else if (target === "cast_credits") {
            if (includeCastProfiles) {
              const castMembers = await fetchCast();
              castProfilesSummary = await refreshCastProfilesAndMedia(castMembers);
            }
            await fetchCast();
          }

          const durationMs = typeof step?.duration_ms === "number" ? step.duration_ms : null;
          const castSuffix =
            target === "cast_credits" && castProfilesSummary
              ? `, cast profiles/media: ${castProfilesSummary.succeeded}/${castProfilesSummary.attempted}${
                  castProfilesSummary.failed > 0 ? ` (${castProfilesSummary.failed} failed)` : ""
                }`
              : "";
          setRefreshTargetNotice((prev) => ({
            ...prev,
            [target]: `Refreshed ${label}${durationMs !== null ? ` (${durationMs}ms)` : ""}${castSuffix}.`,
          }));
          appendRefreshLog({
            category: label,
            message: `Completed ${label}${durationMs !== null ? ` in ${durationMs}ms` : ""}${castSuffix}.`,
            current: null,
            total: null,
          });
        } else if (!sawComplete) {
          setRefreshTargetNotice((prev) => ({ ...prev, [target]: `Refreshed ${label}.` }));
          appendRefreshLog({
            category: label,
            message: `Completed ${label}.`,
            current: null,
            total: null,
          });
        }
        success = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Refresh failed";
        setRefreshTargetError((prev) => ({ ...prev, [target]: message }));
        appendRefreshLog({
          category: label,
          message: `Failed: ${message}`,
          current: null,
          total: null,
        });
        success = false;
      } finally {
        setRefreshingTargets((prev) => ({ ...prev, [target]: false }));
        setRefreshTargetProgress((prev) => {
          const next = { ...prev };
          delete next[target];
          return next;
        });
      }

      return success;
    },
    [
      activeTab,
      appendRefreshLog,
      assetsView,
      fetchCast,
      refreshCastProfilesAndMedia,
      fetchSeasons,
      fetchShow,
      getAuthHeaders,
      loadGalleryAssets,
      selectedGallerySeason,
      showId,
    ]
  );

  const refreshAllShowData = useCallback(async () => {
    if (!showId) return;
    if (refreshingShowAll) return;

    setRefreshLogEntries([]);
    setRefreshLogOpen(true);
    setRefreshingShowAll(true);
    setRefreshAllError(null);
    setRefreshAllNotice(null);
    setRefreshAllProgress({
      stage: "Initializing",
      message: "Starting full show refresh...",
      current: 0,
      total: 3,
    });
    appendRefreshLog({
      category: "Refresh",
      message: "Starting full refresh.",
      current: 0,
      total: 3,
    });

    try {
      const targets: ShowRefreshTarget[] = ["details", "seasons_episodes", "cast_credits"];
      const failedLabels: string[] = [];

      for (const [index, target] of targets.entries()) {
        const targetLabel = getShowRefreshTargetLabel(target);
        const targetOptions: ShowRefreshRunOptions | undefined =
          target === "seasons_episodes"
            ? { photoMode: "fast", includeCastProfiles: false }
            : target === "cast_credits"
              ? { includeCastProfiles: false }
              : undefined;
        setRefreshAllProgress({
          stage: targetLabel,
          message: `Refreshing ${targetLabel}...`,
          current: index,
          total: targets.length,
        });
        appendRefreshLog({
          category: targetLabel,
          message: `Refreshing ${targetLabel}...`,
          current: index,
          total: targets.length,
        });
        const ok = await refreshShow(target, targetOptions);
        setRefreshAllProgress({
          stage: targetLabel,
          message: ok ? `${targetLabel} complete.` : `${targetLabel} failed.`,
          current: index + 1,
          total: targets.length,
        });
        appendRefreshLog({
          category: targetLabel,
          message: ok ? `${targetLabel} complete.` : `${targetLabel} failed.`,
          current: index + 1,
          total: targets.length,
        });
        if (!ok) {
          if (target === "details") failedLabels.push("show info");
          if (target === "seasons_episodes") failedLabels.push("seasons/episodes/media");
          if (target === "cast_credits") failedLabels.push("cast/credits");
        }
      }

      if (failedLabels.length > 0) {
        setRefreshAllError(`Refresh completed with issues in: ${failedLabels.join(", ")}.`);
        appendRefreshLog({
          category: "Refresh",
          message: `Completed with issues: ${failedLabels.join(", ")}.`,
          current: targets.length,
          total: targets.length,
        });
        return;
      }

      setRefreshAllNotice(
        "Refreshed show info, seasons/episodes, media/photos, and cast/credits."
      );
      appendRefreshLog({
        category: "Refresh",
        message: "Completed full refresh successfully.",
        current: targets.length,
        total: targets.length,
      });
    } catch (err) {
      setRefreshAllError(err instanceof Error ? err.message : "Refresh failed");
      appendRefreshLog({
        category: "Refresh",
        message: `Refresh failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        current: null,
        total: null,
      });
    } finally {
      setRefreshingShowAll(false);
      setRefreshAllProgress(null);
    }
  }, [appendRefreshLog, refreshShow, refreshingShowAll, showId]);

  const refreshShowCast = useCallback(async () => {
    if (refreshingShowAll || Object.values(refreshingTargets).some(Boolean)) return;
    await refreshShow("cast_credits", { includeCastProfiles: true });
  }, [refreshShow, refreshingShowAll, refreshingTargets]);

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

    if (activeTab === "assets" && assetsView === "images") {
      await loadGalleryAssets(selectedGallerySeason);
    }
  }, [galleryAssets, getAuthHeaders, activeTab, assetsView, loadGalleryAssets, selectedGallerySeason]);

  // Load gallery for image/brand views when Assets tab is active.
  useEffect(() => {
    if (activeTab !== "assets") return;
    if (assetsView === "images" && visibleSeasons.length > 0) {
      loadGalleryAssets(selectedGallerySeason);
      return;
    }
    if (assetsView === "brand") {
      loadGalleryAssets("all");
    }
  }, [activeTab, assetsView, selectedGallerySeason, loadGalleryAssets, visibleSeasons.length]);

  const handleRefreshCastMember = useCallback(
    async (personId: string, label: string) => {
      if (!personId) return;

      setRefreshingPersonIds((prev) => ({ ...prev, [personId]: true }));
      setRefreshingPersonProgress((prev) => ({
        ...prev,
        [personId]: {
          stage: "Initializing",
          message: `Refreshing cast media for ${label}...`,
          current: 0,
          total: null,
        },
      }));
      setRefreshNotice(null);
      setRefreshError(null);

      try {
        await refreshPersonImages(personId, (progress) => {
          setRefreshingPersonProgress((prev) => ({
            ...prev,
            [personId]: progress,
          }));
        });
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
        setRefreshingPersonProgress((prev) => {
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
  const primaryNetwork = show.networks?.[0] ?? null;
  const networkLabel = show.networks?.slice(0, 2).join(" · ") || "TRR Core";
  const isShowRefreshBusy =
    refreshingShowAll || Object.values(refreshingTargets).some((value) => value);
  const activeRefreshTarget =
    (Object.entries(refreshingTargets).find(([, isRefreshing]) => isRefreshing)?.[0] as
      | ShowRefreshTarget
      | undefined) ?? null;
  const activeTargetProgress = activeRefreshTarget
    ? refreshTargetProgress[activeRefreshTarget]
    : null;
  const globalRefreshProgress = activeTargetProgress ?? refreshAllProgress;
  const globalRefreshStage = activeTargetProgress?.stage ?? refreshAllProgress?.stage ?? null;
  const globalRefreshMessage =
    activeTargetProgress?.message ??
    (activeRefreshTarget
      ? `Refreshing ${getShowRefreshTargetLabel(activeRefreshTarget)}...`
      : refreshAllProgress?.message ?? null);
  const globalRefreshCurrent =
    activeTargetProgress?.current ?? refreshAllProgress?.current ?? null;
  const globalRefreshTotal = activeTargetProgress?.total ?? refreshAllProgress?.total ?? null;
  const castTabProgress =
    refreshingTargets.cast_credits && refreshTargetProgress.cast_credits
      ? refreshTargetProgress.cast_credits
      : globalRefreshProgress;
  const showCastTabProgress =
    isShowRefreshBusy &&
    Boolean(castTabProgress?.message || castTabProgress?.stage || castTabProgress?.total !== null);
  const syncedSeasonCount = seasons.length;
  const syncedEpisodeCount = Object.values(seasonEpisodeSummaries).reduce(
    (sum, summary) => sum + (summary?.count ?? 0),
    0
  );
  const syncedCastCount = cast.length;
  const syncBravoReadinessIssues: string[] = [];
  if (syncedSeasonCount <= 0) syncBravoReadinessIssues.push("seasons");
  if (syncedEpisodeCount <= 0 && (show.show_total_episodes ?? 0) <= 0) {
    syncBravoReadinessIssues.push("episodes");
  }
  if (syncedCastCount <= 0) syncBravoReadinessIssues.push("cast");
  const canSyncByBravo = syncBravoReadinessIssues.length === 0;
  const syncBravoReadinessMessage = canSyncByBravo
    ? null
    : `Sync seasons, episodes, and cast first (missing: ${syncBravoReadinessIssues.join(", ")}).`;
  const autoGeneratedBravoUrl = inferBravoShowUrl(show?.name) || syncBravoUrl.trim() || "";

  const refreshTopicStatusByKey = new Map(
    refreshLogTopicGroups.map((group) => [group.topic.key, group.status] as const)
  );

  const pipelineSteps = REFRESH_LOG_TOPIC_DEFINITIONS.map((topic) => {
    const status = refreshTopicStatusByKey.get(topic.key) ?? "pending";
    const latest = refreshLogTopicGroups.find((group) => group.topic.key === topic.key)?.latest ?? null;
    return { topic, status, latest };
  });

  const healthBadgeClassName = (status: HealthStatus): string => {
    if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status === "stale") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-rose-200 bg-rose-50 text-rose-700";
  };

  const showHealthStatus: HealthStatus = refreshingTargets.details
    ? "stale"
    : show.description || show.tmdb_id || show.imdb_id
      ? "ready"
      : "missing";
  const seasonsHealthStatus: HealthStatus = refreshingTargets.seasons_episodes
    ? "stale"
    : visibleSeasons.length > 0
      ? "ready"
      : "missing";
  const episodesHealthStatus: HealthStatus = refreshingTargets.seasons_episodes
    ? "stale"
    : syncedEpisodeCount > 0
      ? "ready"
      : "missing";
  const castHealthStatus: HealthStatus = refreshingTargets.cast_credits
    ? "stale"
    : cast.length > 0
      ? "ready"
      : "missing";
  const imageHealthStatus: HealthStatus = refreshingTargets.photos || galleryLoading
    ? "stale"
    : galleryAssets.length > 0
      ? "ready"
      : "missing";
  const videoHealthStatus: HealthStatus = bravoLoading
    ? "stale"
    : bravoVideos.length > 0
      ? "ready"
      : "missing";
  const newsHealthStatus: HealthStatus = bravoLoading
    ? "stale"
    : bravoNews.length > 0
      ? "ready"
      : "missing";

  const contentHealthItems: Array<{
    key: string;
    label: string;
    countLabel: string;
    status: HealthStatus;
    onClick: () => void;
  }> = [
    {
      key: "show",
      label: "Show",
      countLabel: show.description?.trim() ? "Info set" : "Info missing",
      status: showHealthStatus,
      onClick: () => setTab("details"),
    },
    {
      key: "seasons",
      label: "Seasons",
      countLabel: `${visibleSeasons.length}`,
      status: seasonsHealthStatus,
      onClick: () => setTab("seasons"),
    },
    {
      key: "episodes",
      label: "Episodes",
      countLabel: `${syncedEpisodeCount}`,
      status: episodesHealthStatus,
      onClick: () => setTab("seasons"),
    },
    {
      key: "cast",
      label: "Cast",
      countLabel: `${cast.length}`,
      status: castHealthStatus,
      onClick: () => setTab("cast"),
    },
    {
      key: "images",
      label: "Images",
      countLabel: `${galleryAssets.length}`,
      status: imageHealthStatus,
      onClick: () => {
        setTab("assets");
        setAssetsSubTab("images");
      },
    },
    {
      key: "videos",
      label: "Videos",
      countLabel: `${bravoVideos.length}`,
      status: videoHealthStatus,
      onClick: () => {
        setTab("assets");
        setAssetsSubTab("videos");
      },
    },
    {
      key: "news",
      label: "News",
      countLabel: `${bravoNews.length}`,
      status: newsHealthStatus,
      onClick: () => setTab("news"),
    },
  ];

  const operationsInboxItems: Array<{
    id: string;
    title: string;
    detail: string;
    onClick: () => void;
  }> = [];
  if (!canSyncByBravo) {
    operationsInboxItems.push({
      id: "bravo-readiness",
      title: "Sync prerequisites missing",
      detail:
        syncBravoReadinessMessage ??
        "Run Show Info, Seasons/Episodes, and Cast sync before Bravo import.",
      onClick: refreshAllShowData,
    });
  }
  if (galleryAssets.length === 0) {
    operationsInboxItems.push({
      id: "no-gallery-assets",
      title: "No gallery images imported",
      detail: "Import or sync images so show/season galleries can render.",
      onClick: () => {
        setTab("assets");
        setAssetsSubTab("images");
      },
    });
  }
  if (bravoVideos.length === 0) {
    operationsInboxItems.push({
      id: "no-bravo-videos",
      title: "No Bravo videos persisted",
      detail: "Run Sync by Bravo and verify the target season has watch/videos content.",
      onClick: () => {
        setTab("assets");
        setAssetsSubTab("videos");
      },
    });
  }
  if (bravoNews.length === 0) {
    operationsInboxItems.push({
      id: "no-bravo-news",
      title: "No Bravo news persisted",
      detail: "Run Sync by Bravo so show and person news can be tagged and displayed.",
      onClick: () => setTab("news"),
    });
  }
  if (cast.length === 0) {
    operationsInboxItems.push({
      id: "cast-missing",
      title: "Cast has no eligible members",
      detail:
        "Cast eligibility requires real episode evidence. Check episode credits sync and appearance types.",
      onClick: () => setTab("cast"),
    });
  }

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
                <NetworkNameOrLogo network={primaryNetwork} fallbackLabel={networkLabel} />
                <div className="mt-2 flex items-center gap-3">
                  <ShowNameOrLogo name={show.name} logoUrl={show.logo_url} />
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
                <button
                  type="button"
                  onClick={() => {
                    if (isShowRefreshBusy) {
                      setRefreshLogOpen((prev) => !prev);
                      return;
                    }
                    void refreshAllShowData();
                  }}
                  onMouseEnter={() => {
                    if (isShowRefreshBusy) setRefreshLogOpen(true);
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  {isShowRefreshBusy
                    ? `Refreshing... ${refreshLogOpen ? "(Hide Health)" : "(View Health)"}`
                    : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canSyncByBravo) {
                      setSyncBravoError(
                        syncBravoReadinessMessage ||
                          "Sync seasons, episodes, and cast first."
                      );
                      return;
                    }
                    const inferredBravoUrl =
                      inferBravoShowUrl(show?.name) || syncBravoUrl.trim();
                    const initialSeason =
                      syncBravoTargetSeasonNumber ?? defaultSyncBravoSeasonNumber ?? null;
                    setSyncBravoTargetSeasonNumber(initialSeason);
                    setSyncBravoOpen(true);
                    setSyncBravoStep("preview");
                    setSyncBravoError(null);
                    setSyncBravoNotice(null);
                    setSyncBravoUrl(inferredBravoUrl);
                    void previewSyncByBravo(inferredBravoUrl);
                  }}
                  disabled={!canSyncByBravo || syncBravoLoading}
                  title={syncBravoReadinessMessage || undefined}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sync by Bravo
                </button>
                <button
                  type="button"
                  onClick={() => setRefreshLogOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  title="Open Health Center"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 12h-4l-3 8-4-16-3 8H2" />
                  </svg>
                  Health
                </button>
                {syncBravoReadinessMessage && (
                  <p className="max-w-xs text-right text-[11px] text-amber-700">
                    {syncBravoReadinessMessage}
                  </p>
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
                {refreshAllNotice && (
                  <p className="max-w-xs text-right text-xs text-zinc-500">{refreshAllNotice}</p>
                )}
                {refreshAllError && (
                  <p className="max-w-xs text-right text-xs text-red-600">{refreshAllError}</p>
                )}
                {globalRefreshProgress && (
                  <div className="w-full max-w-xs">
                    <RefreshProgressBar
                      show={isShowRefreshBusy}
                      stage={globalRefreshStage}
                      message={globalRefreshMessage}
                      current={globalRefreshCurrent}
                      total={globalRefreshTotal}
                    />
                  </div>
                )}
                {refreshLogOpen && (
                  <div className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Refresh Log
                      </p>
                      <button
                        type="button"
                        onClick={() => setRefreshLogOpen(false)}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                      >
                        Close
                      </button>
                    </div>
                    {refreshLogEntries.length === 0 ? (
                      <p className="text-xs text-zinc-500">No refresh activity yet.</p>
                    ) : (
                      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                        {refreshLogTopicGroups.map(({ topic, entries, entriesForView, latest, status }) => {
                          const latestParts = latest ? extractRefreshLogSubJob(latest) : null;
                          const latestPercent =
                            latest &&
                            typeof latest.current === "number" &&
                            typeof latest.total === "number" &&
                            latest.total > 0
                              ? Math.min(100, Math.round((latest.current / latest.total) * 100))
                              : null;

                          if (status === "done") {
                            return (
                              <article
                                key={topic.key}
                                className="rounded-lg border border-green-200 bg-green-50 px-3 py-2"
                              >
                                <p className="text-xs font-semibold text-green-800">
                                  {topic.label}: Done ✔️
                                </p>
                              </article>
                            );
                          }

                          return (
                            <article key={topic.key} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                                    {topic.label}
                                  </p>
                                  <p className="text-[11px] text-zinc-500">{topic.description}</p>
                                </div>
                                {latest && (
                                  <p className="text-[10px] text-zinc-400">
                                    {new Date(latest.at).toLocaleTimeString()}
                                  </p>
                                )}
                              </div>

                              {status === "failed" && (
                                <p className="mt-2 text-xs font-semibold text-red-700">
                                  {topic.label}: Failed ✖
                                </p>
                              )}

                              {latest ? (
                                <div className="mt-2 rounded-md border border-zinc-200 bg-white p-2">
                                  <p className="text-xs font-semibold text-zinc-800">{latestParts?.subJob}</p>
                                  <p className="mt-1 text-xs text-zinc-600">{latestParts?.details}</p>
                                  {typeof latest.current === "number" &&
                                    typeof latest.total === "number" && (
                                      <p className="mt-1 text-[11px] text-zinc-500">
                                        {latest.current.toLocaleString()}/{latest.total.toLocaleString()}
                                        {latestPercent !== null ? ` (${latestPercent}%)` : ""}
                                      </p>
                                    )}
                                </div>
                              ) : (
                                <p className="mt-2 text-xs text-zinc-500">No updates yet.</p>
                              )}

                              {entries.length > 0 && (
                                <details className="mt-2" open={entries.length <= 3}>
                                  <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Sub-jobs ({entries.length})
                                  </summary>
                                  <div className="mt-2 space-y-1">
                                    {entriesForView.slice(0, 30).map((entry) => {
                                      const parts = extractRefreshLogSubJob(entry);
                                      const percent =
                                        typeof entry.current === "number" &&
                                        typeof entry.total === "number" &&
                                        entry.total > 0
                                          ? Math.min(100, Math.round((entry.current / entry.total) * 100))
                                          : null;
                                      return (
                                        <div
                                          key={entry.id}
                                          className="rounded border border-zinc-100 bg-white px-2 py-1.5"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] font-semibold text-zinc-700">
                                              {parts.subJob}
                                            </p>
                                            <p className="text-[10px] text-zinc-400">
                                              {new Date(entry.at).toLocaleTimeString()}
                                            </p>
                                          </div>
                                          <p className="mt-0.5 text-[11px] text-zinc-600">{parts.details}</p>
                                          {typeof entry.current === "number" &&
                                            typeof entry.total === "number" && (
                                              <p className="mt-0.5 text-[10px] text-zinc-500">
                                                {entry.current.toLocaleString()}/{entry.total.toLocaleString()}
                                                {percent !== null ? ` (${percent}%)` : ""}
                                              </p>
                                            )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </details>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <nav className="flex flex-wrap gap-2">
                {SHOW_PAGE_TABS.map((tab) => (
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
        </header>

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
                  onClick={refreshAllShowData}
                  disabled={isShowRefreshBusy}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  {isShowRefreshBusy ? "Refreshing..." : "Refresh"}
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
                  {assetsView === "images" ? "Show Gallery" : assetsView === "videos" ? "Videos" : "Brand"}
                </p>
                <h3 className="text-xl font-bold text-zinc-900">{show.name}</h3>
                </div>

                <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                  <button
                    type="button"
                    onClick={() => setAssetsSubTab("images")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      assetsView === "images"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Images
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssetsSubTab("videos")}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      assetsView === "videos"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Videos
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
              </div>

              {assetsView === "images" ? (
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
                        onClick={refreshAllShowData}
                        disabled={isShowRefreshBusy}
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
                        {isShowRefreshBusy ? "Refreshing..." : "Refresh"}
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
                      {hasActiveAdvancedFilters && (
                        <button
                          type="button"
                          onClick={clearGalleryFilters}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Clear Filters ({activeAdvancedFilterCount})
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (selectedGallerySeason !== "all") {
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
                          } else {
                            setScrapeDrawerContext({
                              type: "show",
                              showId: showId,
                              showName: show.name,
                              seasons: visibleSeasons.map((season) => ({
                                seasonNumber: season.season_number,
                                seasonId: season.id,
                              })),
                              defaultSeasonNumber: null,
                            });
                          }
                          setScrapeDrawerOpen(true);
                        }}
                        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Import Images
                      </button>
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
                      {gallerySectionAssets.showBackdrops.length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Backdrops
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            {gallerySectionAssets.showBackdrops.map((asset, i, arr) => (
                                <button
                                  key={`${asset.id}-${i}`}
                                  onClick={(e) =>
                                    openAssetLightbox(asset, i, arr, e.currentTarget)
                                  }
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

                      {/* Show Posters */}
                      {gallerySectionAssets.showPosters.length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Show Posters
                          </h4>
                          <div className="grid grid-cols-4 gap-4">
                            {gallerySectionAssets.showPosters.map((asset, i, arr) => (
                                <button
                                  key={`${asset.id}-${i}`}
                                  onClick={(e) =>
                                    openAssetLightbox(asset, i, arr, e.currentTarget)
                                  }
                                  className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <GalleryImage
                                    src={getAssetDisplayUrl(asset)}
                                    alt={asset.caption || "Show poster"}
                                    sizes="200px"
                                  />
                                </button>
                              ))}
                          </div>
                        </section>
                      )}

                      {/* Season Posters */}
                      {gallerySectionAssets.seasonPosters.length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Season Posters
                          </h4>
                          <div className="grid grid-cols-4 gap-4">
                            {gallerySectionAssets.seasonPosters.map((asset, i, arr) => (
                                <button
                                  key={`${asset.id}-${i}`}
                                  onClick={(e) =>
                                    openAssetLightbox(asset, i, arr, e.currentTarget)
                                  }
                                  className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <GalleryImage
                                    src={getAssetDisplayUrl(asset)}
                                    alt={asset.caption || "Season poster"}
                                    sizes="200px"
                                  />
                                </button>
                              ))}
                          </div>
                        </section>
                      )}

                      {/* Episode Stills */}
                      {gallerySectionAssets.episodeStills.length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Episode Stills
                          </h4>
                          <div className="grid grid-cols-6 gap-3">
                            {gallerySectionAssets.episodeStills.map((asset, i, arr) => (
                                <button
                                  key={`${asset.id}-${i}`}
                                  onClick={(e) =>
                                    openAssetLightbox(asset, i, arr, e.currentTarget)
                                  }
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

                      {/* Cast Photos / Promos */}
                      {gallerySectionAssets.castAndPromos.length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Cast Photos & Promos
                          </h4>
                          <div className="grid grid-cols-5 gap-4">
                            {gallerySectionAssets.castAndPromos.map((asset, i, arr) => (
                                <button
                                  key={`${asset.id}-${i}`}
                                  onClick={(e) =>
                                    openAssetLightbox(asset, i, arr, e.currentTarget)
                                  }
                                  className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <GalleryImage
                                    src={getAssetDisplayUrl(asset)}
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

                      {/* Other */}
                      {gallerySectionAssets.other.length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                            Other
                          </h4>
                          <div className="grid grid-cols-5 gap-4">
                            {gallerySectionAssets.other.map((asset, i, arr) => (
                              <button
                                key={`${asset.id}-${i}`}
                                onClick={(e) =>
                                  openAssetLightbox(asset, i, arr, e.currentTarget)
                                }
                                className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <GalleryImage
                                  src={getAssetDisplayUrl(asset)}
                                  alt={asset.caption || "Gallery image"}
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
              ) : assetsView === "videos" ? (
                <div className="space-y-4">
                  {(bravoError || bravoLoading) && (
                    <p className={`text-sm ${bravoError ? "text-red-600" : "text-zinc-500"}`}>
                      {bravoError || "Loading Bravo videos..."}
                    </p>
                  )}
                  {!bravoLoading && bravoVideos.length === 0 && !bravoError && (
                    <p className="text-sm text-zinc-500">No persisted Bravo videos found for this show.</p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {bravoVideos.map((video, index) => (
                      <article key={`${video.clip_url}-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <a
                          href={video.clip_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block"
                        >
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
                          {typeof video.season_number === "number" && <span>Season {video.season_number}</span>}
                          {video.kicker && <span>{video.kicker}</span>}
                          {formatBravoPublishedDate(video.published_at) && (
                            <span>Posted {formatBravoPublishedDate(video.published_at)}</span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Logos</h4>
                    {brandLogoAssets.length === 0 ? (
                      <p className="text-sm text-zinc-500">No show logos found.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {brandLogoAssets.map((asset, i) => (
                          <button
                            key={`${asset.id}-${i}`}
                            onClick={(e) =>
                              openAssetLightbox(asset, i, brandLogoAssets, e.currentTarget)
                            }
                            className="relative aspect-[2/1] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <GalleryImage
                              src={getAssetDisplayUrl(asset)}
                              alt={asset.caption || "Show logo"}
                              sizes="250px"
                              className="object-contain"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </section>

                  <ShowBrandEditor
                    trrShowId={showId}
                    trrShowName={show.name}
                    trrSeasons={seasons}
                    trrCast={cast}
                  />
                </div>
              )}
            </div>
          )}

          {/* NEWS Tab */}
          {activeTab === "news" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Bravo News
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">{show.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => void loadBravoData({ force: true })}
                  disabled={bravoLoading}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  {bravoLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {bravoError && <p className="mb-4 text-sm text-red-600">{bravoError}</p>}
              {!bravoLoading && bravoNews.length === 0 && !bravoError && (
                <p className="text-sm text-zinc-500">No persisted Bravo news found for this show.</p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {bravoNews.map((item, index) => (
                  <article key={`${item.article_url}-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <a
                      href={item.article_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <div className="relative mb-3 aspect-[16/9] overflow-hidden rounded-lg bg-zinc-200">
                        {item.image_url ? (
                          <GalleryImage
                            src={item.image_url}
                            alt={item.headline || "Bravo news"}
                            sizes="400px"
                            className="object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-400">No image</div>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-700">
                        {item.headline || "Untitled story"}
                      </h4>
                    </a>
                    {Array.isArray(item.person_tags) && item.person_tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.person_tags.map((tag, tagIndex) => (
                          <span
                            key={`${tag.person_id || tag.person_name || "tag"}-${tagIndex}`}
                            className="rounded-full border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700"
                          >
                            {tag.person_name || "Person"}
                          </span>
                        ))}
                      </div>
                    )}
                    {formatBravoPublishedDate(item.published_at) && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Posted {formatBravoPublishedDate(item.published_at)}
                      </p>
                    )}
                  </article>
                ))}
              </div>
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
                    {castDisplayMembers.length} shown · {cast.length} total
                  </span>
                  <button
                    type="button"
                    onClick={refreshShowCast}
                    disabled={isShowRefreshBusy}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {isShowRefreshBusy ? "Refreshing..." : "Refresh"}
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
                show={showCastTabProgress}
                stage={castTabProgress?.stage}
                message={castTabProgress?.message}
                current={castTabProgress?.current}
                total={castTabProgress?.total}
              />
              {(refreshNotice || refreshError) && (
                <p className={`mb-4 text-sm ${refreshError ? "text-red-600" : "text-zinc-500"}`}>
                  {refreshError || refreshNotice}
                </p>
              )}
              {(castRoleMembersError || rolesError) && (
                <p className="mb-4 text-sm text-red-600">
                  {castRoleMembersError || rolesError}
                </p>
              )}
              {castSource === "show_fallback" && castEligibilityWarning && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {castEligibilityWarning}
                </div>
              )}
              <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="grid gap-3 md:grid-cols-5">
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
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    New Role
                    <div className="mt-1 flex gap-2">
                      <input
                        value={newRoleName}
                        onChange={(event) => setNewRoleName(event.target.value)}
                        placeholder="Housewife"
                        className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm normal-case tracking-normal text-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={createShowRole}
                        disabled={rolesLoading}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCastSeasonFilters([]);
                      setCastRoleFilters([]);
                      setCastCreditFilters([]);
                      setCastHasImageFilter("all");
                      setCastSortBy("episodes");
                      setCastSortOrder("desc");
                    }}
                    className="self-end rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                  >
                    Clear Filters
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Seasons
                    </span>
                    {availableCastSeasons.length === 0 ? (
                      <span className="text-xs text-zinc-500">No season recency data yet.</span>
                    ) : (
                      availableCastSeasons.map((seasonNumber) => {
                        const active = castSeasonFilters.includes(seasonNumber);
                        return (
                          <button
                            key={`season-filter-${seasonNumber}`}
                            type="button"
                            onClick={() =>
                              setCastSeasonFilters((prev) =>
                                prev.includes(seasonNumber)
                                  ? prev.filter((value) => value !== seasonNumber)
                                  : [...prev, seasonNumber]
                              )
                            }
                            className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                              active
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-600"
                            }`}
                          >
                            S{seasonNumber}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Roles
                    </span>
                    {availableCastRoles.length === 0 ? (
                      <span className="text-xs text-zinc-500">No roles configured.</span>
                    ) : (
                      availableCastRoles.map((role) => {
                        const active = castRoleFilters.some(
                          (value) => value.toLowerCase() === role.toLowerCase()
                        );
                        return (
                          <button
                            key={`role-filter-${role}`}
                            type="button"
                            onClick={() =>
                              setCastRoleFilters((prev) =>
                                active
                                  ? prev.filter((value) => value.toLowerCase() !== role.toLowerCase())
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
                            key={`credit-filter-${category}`}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Role Catalog
                    </span>
                    {showRoles.length === 0 ? (
                      <span className="text-xs text-zinc-500">No roles yet.</span>
                    ) : (
                      showRoles.map((role) => (
                        <div
                          key={`role-catalog-${role.id}`}
                          className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1"
                        >
                          <span
                            className={`text-xs font-semibold ${
                              role.is_active ? "text-zinc-700" : "text-zinc-400 line-through"
                            }`}
                          >
                            {role.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => void renameShowRole(role)}
                            className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleShowRoleActive(role)}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              role.is_active
                                ? "border border-amber-200 bg-amber-50 text-amber-700"
                                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {role.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              {castRoleMembersLoading && (
                <p className="mb-4 text-sm text-zinc-500">Refreshing cast intelligence...</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {castDisplayMembers.map((member) => {
                  const thumbnailUrl = member.merged_photo_url;
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
                      <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                        {thumbnailUrl ? (
                          <CastPhoto
                            src={thumbnailUrl}
                            alt={member.full_name || member.cast_member_name || "Cast member"}
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
                        {member.full_name || member.cast_member_name || "Unknown"}
                      </p>
                      {episodeLabel && (
                        <p className="text-sm text-zinc-600">{episodeLabel}</p>
                      )}
                      {member.latest_season && (
                        <p className="text-xs text-zinc-500">Latest season: {member.latest_season}</p>
                      )}
                      {member.roles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {member.roles.map((role) => (
                            <span
                              key={`${member.person_id}-${role}`}
                              className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
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
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void assignRolesToCastMember(
                            member.person_id,
                            member.full_name || member.cast_member_name || "Cast member"
                          );
                        }}
                        className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                      >
                        Edit Roles
                      </button>
                      <RefreshProgressBar
                        show={Boolean(refreshingPersonIds[member.person_id])}
                        stage={refreshingPersonProgress[member.person_id]?.stage}
                        message={refreshingPersonProgress[member.person_id]?.message}
                        current={refreshingPersonProgress[member.person_id]?.current}
                        total={refreshingPersonProgress[member.person_id]?.total}
                      />
                    </Link>
                  );
                })}
              </div>
              {archiveFootageCast.length > 0 && (
                <div className="mt-8">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                    Archive Footage
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {archiveFootageCast.map((member) => {
                      const thumbnailUrl = member.cover_photo_url || member.photo_url;
                      const archiveLabel =
                        typeof member.archive_episode_count === "number"
                          ? `${member.archive_episode_count} archive footage episodes`
                          : "Archive footage appearance";

                      return (
                        <Link
                          key={`archive-${member.id}`}
                          href={`/admin/trr-shows/people/${member.person_id}?showId=${show.id}`}
                          className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 transition hover:border-amber-300 hover:bg-amber-100/40"
                        >
                          <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                            {thumbnailUrl ? (
                              <CastPhoto
                                src={thumbnailUrl}
                                alt={member.full_name || member.cast_member_name || "Cast member"}
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
                            {member.full_name || member.cast_member_name || "Unknown"}
                          </p>
                          <p className="text-sm text-amber-700">{archiveLabel}</p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              {cast.length === 0 && archiveFootageCast.length === 0 && (
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
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                      Social Scope
                    </p>
                    <p className="text-sm text-zinc-600">
                      Defaulting to the most recent aired/airing season.
                    </p>
                  </div>
                  {socialSeasonOptions.length > 1 ? (
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Season
                      <select
                        value={selectedSocialSeasonId ?? ""}
                        onChange={(event) =>
                          setSelectedSocialSeasonId(event.target.value || null)
                        }
                        className="mt-1 block min-w-[220px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
                      >
                        {socialSeasonOptions.map((season) => (
                          <option key={season.id} value={season.id}>
                            Season {season.season_number}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="text-sm font-semibold text-zinc-700">
                      {selectedSocialSeason
                        ? `Season ${selectedSocialSeason.season_number}`
                        : "All Seasons"}
                    </p>
                  )}
                </div>
              </div>
              {selectedSocialSeason ? (
                <SeasonSocialAnalyticsSection
                  showId={showId}
                  seasonNumber={selectedSocialSeason.season_number}
                  seasonId={selectedSocialSeason.id}
                  showName={show.name}
                />
              ) : (
                <SocialPostsSection
                  showId={showId}
                  showName={show.name}
                  seasonId={selectedSocialSeasonId}
                />
              )}
            </div>
          )}

          {/* Details Tab - External IDs */}
          {activeTab === "details" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Show Overview
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    Details, Links, and Metadata
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {detailsEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={cancelDetailsEdit}
                        disabled={detailsSaving}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveShowDetails}
                        disabled={detailsSaving}
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {detailsSaving ? "Saving..." : "Save"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={startDetailsEdit}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={refreshAllShowData}
                    disabled={isShowRefreshBusy}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {isShowRefreshBusy ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
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
              {(detailsNotice || detailsError) && (
                <p className={`mb-4 text-sm ${detailsError ? "text-red-600" : "text-zinc-500"}`}>
                  {detailsError || detailsNotice}
                </p>
              )}

              <div className="space-y-6">
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">Editable Info</h4>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Display Name
                        </span>
                        <input
                          type="text"
                          value={detailsForm.displayName}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({ ...prev, displayName: e.target.value }))
                          }
                          disabled={!detailsEditing}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                          placeholder="Real Housewives of Beverly Hills"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Nickname
                        </span>
                        <input
                          type="text"
                          value={detailsForm.nickname}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({ ...prev, nickname: e.target.value }))
                          }
                          disabled={!detailsEditing}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                          placeholder="RHOBH"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Premiere Date
                        </span>
                        <input
                          type="date"
                          value={detailsForm.premiereDate}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({ ...prev, premiereDate: e.target.value }))
                          }
                          disabled={!detailsEditing}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Alt Names
                        </span>
                        <textarea
                          value={detailsForm.altNamesText}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({ ...prev, altNamesText: e.target.value }))
                          }
                          rows={3}
                          disabled={!detailsEditing}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                          placeholder={"One per line (or comma-separated)\nThe Real Housewives of Beverly Hills"}
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Description
                        </span>
                        <textarea
                          value={detailsForm.description}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({ ...prev, description: e.target.value }))
                          }
                          rows={4}
                          disabled={!detailsEditing}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                          placeholder="Short show description"
                        />
                      </label>
                    </div>
                  </div>
                </div>

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

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                    Networks & Streaming
                  </h4>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Networks
                    </p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {(show.networks ?? []).length > 0 ? (
                        show.networks.map((network) => (
                          <span
                            key={network}
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700"
                          >
                            {network}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500">No network metadata.</p>
                      )}
                    </div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Streaming
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        (Array.isArray(show.streaming_providers) ? show.streaming_providers : null) ??
                        (Array.isArray(show.watch_providers) ? show.watch_providers : []) ??
                        []
                      ).length > 0 ? (
                        (
                          (Array.isArray(show.streaming_providers)
                            ? show.streaming_providers
                            : Array.isArray(show.watch_providers)
                              ? show.watch_providers
                              : []) ?? []
                        ).map((provider) => (
                          <span
                            key={provider}
                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700"
                          >
                            {provider}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500">No streaming providers on this record.</p>
                      )}
                    </div>
                  </div>
                </div>

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

                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-zinc-700">Links</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                        Pending {pendingLinkCount}
                      </span>
                      <button
                        type="button"
                        onClick={discoverShowLinks}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                      >
                        Discover
                      </button>
                      <button
                        type="button"
                        onClick={() => void fetchShowLinks()}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    {(linksError || linksNotice) && (
                      <p className={`mb-3 text-xs ${linksError ? "text-red-600" : "text-zinc-600"}`}>
                        {linksError || linksNotice}
                      </p>
                    )}
                    {linksLoading ? (
                      <p className="text-sm text-zinc-500">Loading links...</p>
                    ) : showLinks.length === 0 ? (
                      <p className="text-sm text-zinc-500">No links yet. Run discovery or add links manually.</p>
                    ) : (
                      <div className="space-y-4">
                        {ENTITY_LINK_GROUP_ORDER.map((group) => {
                          const groupLinks = linksByGroup.get(group) ?? [];
                          if (groupLinks.length === 0) return null;
                          const linksBySeason = new Map<number, EntityLink[]>();
                          if (group === "cast_announcements") {
                            for (const link of groupLinks) {
                              const key = link.season_number > 0 ? link.season_number : 0;
                              const list = linksBySeason.get(key) ?? [];
                              list.push(link);
                              linksBySeason.set(key, list);
                            }
                          }

                          return (
                            <section key={group}>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                {ENTITY_LINK_GROUP_LABELS[group]}
                              </p>

                              {group === "cast_announcements" && linksBySeason.size > 0 ? (
                                <div className="space-y-2">
                                  {Array.from(linksBySeason.entries())
                                    .sort((a, b) => b[0] - a[0])
                                    .map(([seasonNumber, seasonLinks]) => (
                                      <div
                                        key={`season-${seasonNumber}`}
                                        className="rounded-md border border-zinc-200 bg-white p-2"
                                      >
                                        <p className="mb-1 text-xs font-semibold text-zinc-600">
                                          {seasonNumber > 0 ? `Season ${seasonNumber}` : "General"}
                                        </p>
                                        <div className="space-y-1">
                                          {seasonLinks.map((link) => (
                                            <div
                                              key={link.id}
                                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-100 px-2 py-1.5"
                                            >
                                              <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="min-w-0 flex-1 truncate text-sm font-medium text-blue-700 hover:underline"
                                              >
                                                {link.label || link.url}
                                              </a>
                                              <div className="flex flex-wrap items-center gap-1">
                                                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                                                  {link.status}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => void setShowLinkStatus(link.id, "approved")}
                                                  className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                                >
                                                  Approve
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => void setShowLinkStatus(link.id, "rejected")}
                                                  className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                                                >
                                                  Reject
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => void editShowLink(link)}
                                                  className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => void deleteShowLink(link.id)}
                                                  className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {groupLinks.map((link) => (
                                    <div
                                      key={link.id}
                                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1.5"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <a
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block truncate text-sm font-medium text-blue-700 hover:underline"
                                        >
                                          {link.label || link.url}
                                        </a>
                                        <p className="text-[11px] text-zinc-500">
                                          {link.link_kind}
                                          {link.season_number > 0 ? ` · Season ${link.season_number}` : ""}
                                          {link.entity_type !== "show" ? ` · ${link.entity_type}` : ""}
                                        </p>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                                          {link.status}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => void setShowLinkStatus(link.id, "approved")}
                                          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void setShowLinkStatus(link.id, "rejected")}
                                          className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                                        >
                                          Reject
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void editShowLink(link)}
                                          className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void deleteShowLink(link.id)}
                                          className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Internal ID */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                    Internal ID
                  </h4>
                  <code className="text-xs bg-zinc-100 rounded px-2 py-1 text-zinc-600 font-mono">
                    {show.id}
                  </code>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Show Visibility
                  </p>
                  {isCovered ? (
                    <button
                      onClick={removeFromCoveredShows}
                      disabled={coverageLoading}
                      className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {coverageLoading ? "..." : "Remove from Shows"}
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
            src={getAssetDetailUrl(assetLightbox.asset)}
            fallbackSrc={assetLightbox.asset.original_url ?? assetLightbox.asset.hosted_url}
            alt={assetLightbox.asset.caption || "Gallery image"}
            isOpen={true}
            onClose={closeAssetLightbox}
            metadata={mapSeasonAssetToMetadata(assetLightbox.asset, selectedGallerySeason !== "all" ? selectedGallerySeason : undefined, show?.name)}
            canManage={assetLightbox.asset.source?.toLowerCase?.().startsWith("web_scrape:")}
            isStarred={Boolean((assetLightbox.asset.metadata as Record<string, unknown> | null)?.starred)}
            onToggleStar={(starred) => toggleStarGalleryAsset(assetLightbox.asset, starred)}
            onArchive={() => archiveGalleryAsset(assetLightbox.asset)}
            onDelete={async () => {
              const asset = assetLightbox.asset;
              const headers = await getAuthHeaders();
              const response = await fetch(`/api/admin/trr-api/media-assets/${asset.id}`, {
                method: "DELETE",
                headers,
              });
              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.detail || "Delete failed");
              }
              setGalleryAssets((prev) => prev.filter((a) => a.id !== asset.id));
              closeAssetLightbox();
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
              if (activeTab === "assets" && assetsView === "images") {
                loadGalleryAssets(selectedGallerySeason);
              }
            }}
          />
        )}

        {refreshLogOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Health Center</h3>
                  <p className="text-sm text-zinc-500">
                    Content Health, Sync Pipeline, Operations Inbox, and Refresh Log.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRefreshLogOpen(false)}
                  className="rounded-md border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Close
                </button>
              </div>

              <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Content Health
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                  {contentHealthItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={item.onClick}
                      className={`rounded-xl border px-3 py-2 text-left transition hover:shadow-sm ${healthBadgeClassName(
                        item.status
                      )}`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {item.status === "ready"
                          ? "Ready"
                          : item.status === "stale"
                            ? "Stale"
                            : "Missing"}
                      </p>
                      <p className="mt-1 text-xs opacity-80">{item.countLabel}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Sync Pipeline
                  </p>
                  <div className="space-y-2">
                    {pipelineSteps.map((step) => {
                      const statusPillClass =
                        step.status === "done"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : step.status === "active"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : step.status === "failed"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600";
                      const statusText =
                        step.status === "done"
                          ? "Done"
                          : step.status === "active"
                            ? "Running"
                            : step.status === "failed"
                              ? "Failed"
                              : "Queued";
                      return (
                        <div
                          key={step.topic.key}
                          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700">
                              {step.topic.label}
                            </p>
                            <p className="truncate text-[11px] text-zinc-500">{step.topic.description}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass}`}>
                              {statusText}
                            </span>
                            {step.latest && (
                              <p className="mt-1 text-[10px] text-zinc-400">
                                {new Date(step.latest.at).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Operations Inbox
                  </p>
                  {operationsInboxItems.length === 0 ? (
                    <p className="mt-3 text-sm text-emerald-700">No blocking tasks.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {operationsInboxItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left transition hover:bg-amber-100"
                        >
                          <p className="text-sm font-semibold text-amber-800">{item.title}</p>
                          <p className="mt-1 text-xs text-amber-700">{item.detail}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Refresh Log
                </p>
                {refreshLogEntries.length === 0 ? (
                  <p className="text-xs text-zinc-500">No refresh activity yet.</p>
                ) : (
                  <div className="max-h-[44vh] space-y-3 overflow-y-auto pr-1">
                    {refreshLogTopicGroups.map(({ topic, entries, entriesForView, latest, status }) => {
                      const latestParts = latest ? extractRefreshLogSubJob(latest) : null;
                      const latestPercent =
                        latest &&
                        typeof latest.current === "number" &&
                        typeof latest.total === "number" &&
                        latest.total > 0
                          ? Math.min(100, Math.round((latest.current / latest.total) * 100))
                          : null;

                      if (status === "done") {
                        return (
                          <article
                            key={topic.key}
                            className="rounded-lg border border-green-200 bg-green-50 px-3 py-2"
                          >
                            <p className="text-xs font-semibold text-green-800">
                              {topic.label}: Done ✔️
                            </p>
                          </article>
                        );
                      }

                      return (
                        <article key={topic.key} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                                {topic.label}
                              </p>
                              <p className="text-[11px] text-zinc-500">{topic.description}</p>
                            </div>
                            {latest && (
                              <p className="text-[10px] text-zinc-400">
                                {new Date(latest.at).toLocaleTimeString()}
                              </p>
                            )}
                          </div>

                          {status === "failed" && (
                            <p className="mt-2 text-xs font-semibold text-red-700">
                              {topic.label}: Failed ✖
                            </p>
                          )}

                          {latest ? (
                            <div className="mt-2 rounded-md border border-zinc-200 bg-white p-2">
                              <p className="text-xs font-semibold text-zinc-800">{latestParts?.subJob}</p>
                              <p className="mt-1 text-xs text-zinc-600">{latestParts?.details}</p>
                              {typeof latest.current === "number" &&
                                typeof latest.total === "number" && (
                                  <p className="mt-1 text-[11px] text-zinc-500">
                                    {latest.current.toLocaleString()}/{latest.total.toLocaleString()}
                                    {latestPercent !== null ? ` (${latestPercent}%)` : ""}
                                  </p>
                                )}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-zinc-500">No updates yet.</p>
                          )}

                          {entries.length > 0 && (
                            <details className="mt-2" open={entries.length <= 3}>
                              <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                Sub-jobs ({entries.length})
                              </summary>
                              <div className="mt-2 space-y-1">
                                {entriesForView.slice(0, 30).map((entry) => {
                                  const parts = extractRefreshLogSubJob(entry);
                                  const percent =
                                    typeof entry.current === "number" &&
                                    typeof entry.total === "number" &&
                                    entry.total > 0
                                      ? Math.min(100, Math.round((entry.current / entry.total) * 100))
                                      : null;
                                  return (
                                    <div
                                      key={entry.id}
                                      className="rounded border border-zinc-100 bg-white px-2 py-1.5"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-[11px] font-semibold text-zinc-700">
                                          {parts.subJob}
                                        </p>
                                        <p className="text-[10px] text-zinc-400">
                                          {new Date(entry.at).toLocaleTimeString()}
                                        </p>
                                      </div>
                                      <p className="mt-0.5 text-[11px] text-zinc-600">{parts.details}</p>
                                      {typeof entry.current === "number" &&
                                        typeof entry.total === "number" && (
                                          <p className="mt-0.5 text-[10px] text-zinc-500">
                                            {entry.current.toLocaleString()}/{entry.total.toLocaleString()}
                                            {percent !== null ? ` (${percent}%)` : ""}
                                          </p>
                                        )}
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {syncBravoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Import by Bravo</h3>
                  <p className="text-sm text-zinc-500">Preview and commit persisted Bravo snapshots for this show.</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Step {syncBravoStep === "preview" ? "1" : "2"} of 2
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSyncBravoOpen(false);
                    setSyncBravoStep("preview");
                  }}
                  disabled={syncBravoLoading}
                  className="rounded-md border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Close
                </button>
              </div>

              <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Sync Season
                  <select
                    value={syncBravoTargetSeasonNumber ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      const parsed = Number.parseInt(raw, 10);
                      setSyncBravoTargetSeasonNumber(
                        Number.isFinite(parsed) ? parsed : defaultSyncBravoSeasonNumber
                      );
                    }}
                    disabled={syncBravoLoading || syncBravoSeasonOptions.length === 0}
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-zinc-800 disabled:opacity-50"
                  >
                    {syncBravoSeasonOptions.length === 0 ? (
                      <option value="">No eligible seasons</option>
                    ) : (
                      syncBravoSeasonOptions.map((seasonNumber) => (
                        <option key={seasonNumber} value={seasonNumber}>
                          Season {seasonNumber}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <p className="mt-2 text-xs text-zinc-500">
                  Bravo profile images from this run will be assigned as season promos for the selected season. Eligible seasons require more than 1 episode or a premiere date.
                </p>
              </div>

              {syncBravoStep === "preview" ? (
                <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Show Name
                  </p>
                  <p className="text-sm font-semibold text-zinc-900">{show.name}</p>
                  <p className="mt-2 mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Bravo Show URL
                  </p>
                  {autoGeneratedBravoUrl ? (
                    <a
                      href={autoGeneratedBravoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all text-xs text-blue-700 hover:underline"
                    >
                      {autoGeneratedBravoUrl}
                    </a>
                  ) : (
                    <p className="text-xs text-zinc-500">Could not infer URL yet.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void previewSyncByBravo()}
                  disabled={syncBravoLoading}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {syncBravoPreviewLoading ? "Refreshing..." : "Refresh Preview"}
                </button>
              </div>

              {(syncBravoError || syncBravoNotice) && (
                <p className={`mb-4 text-sm ${syncBravoError ? "text-red-600" : "text-zinc-600"}`}>
                  {syncBravoError || syncBravoNotice}
                </p>
              )}

              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Description
                  </span>
                  <textarea
                    value={syncBravoDescription}
                    onChange={(event) => setSyncBravoDescription(event.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Airs / Tune-In
                  </span>
                  <textarea
                    value={syncBravoAirs}
                    onChange={(event) => setSyncBravoAirs(event.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />
                </label>
              </div>

              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Show Images
                </p>
                {syncBravoImages.length === 0 ? (
                  <p className="text-sm text-zinc-500">Run preview to load image candidates.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {syncBravoImages.map((image) => {
                      const checked = syncBravoSelectedImages.has(image.url);
                      const selectedKind = syncBravoImageKinds[image.url] ?? inferBravoImportImageKind(image);
                      return (
                        <div key={image.url} className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setSyncBravoSelectedImages((prev) => {
                                const next = new Set(prev);
                                if (event.target.checked) next.add(image.url);
                                else next.delete(image.url);
                                return next;
                              })
                            }
                            className="mt-1"
                          />
                          <div className="relative h-16 w-28 overflow-hidden rounded bg-zinc-100">
                            <GalleryImage src={image.url} alt={image.alt || "Bravo image"} sizes="120px" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-xs text-zinc-600">{image.alt || image.url}</span>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                Type
                              </span>
                              <select
                                value={selectedKind}
                                onChange={(event) =>
                                  setSyncBravoImageKinds((prev) => ({
                                    ...prev,
                                    [image.url]: event.target.value as BravoImportImageKind,
                                  }))
                                }
                                className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
                              >
                                {BRAVO_IMPORT_IMAGE_KIND_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Cast Member URLs
                </p>
                {syncBravoPreviewCastLinks.length === 0 ? (
                  <p className="text-sm text-zinc-500">No cast member URLs found in this preview.</p>
                ) : (
                  <div className="space-y-2">
                    {syncBravoPreviewCastLinks.map((person, index) => (
                      <article
                        key={`${person.url}-${index}`}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                      >
                        <p className="text-sm font-semibold text-zinc-900">
                          {person.name || "Unresolved cast member"}
                        </p>
                        <a
                          href={person.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                        >
                          {person.url}
                        </a>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  News
                </p>
                {syncBravoPreviewNews.length === 0 ? (
                  <p className="text-sm text-zinc-500">No news items found in this preview.</p>
                ) : (
                  <div className="space-y-2">
                    {syncBravoPreviewNews.map((item, index) => (
                      <article
                        key={`${item.article_url}-${index}`}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                      >
                        <div className="flex gap-3">
                          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-zinc-100">
                            {item.image_url ? (
                              <GalleryImage
                                src={item.image_url}
                                alt={item.headline || "Bravo news"}
                                sizes="120px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <a
                              href={item.article_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:text-blue-700"
                            >
                              {item.headline || "Untitled story"}
                            </a>
                            {formatBravoPublishedDate(item.published_at) && (
                              <p className="mt-1 text-xs text-zinc-500">
                                Posted {formatBravoPublishedDate(item.published_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Videos
                  </p>
                  {syncBravoPreviewSeasonOptions.length > 0 && (
                    <label className="flex items-center gap-2 text-xs text-zinc-600">
                      <span>Season</span>
                      <select
                        value={syncBravoPreviewSeasonFilter}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setSyncBravoPreviewSeasonFilter(
                            nextValue === "all" ? "all" : Number.parseInt(nextValue, 10)
                          );
                        }}
                        className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
                      >
                        <option value="all">All</option>
                        {syncBravoPreviewSeasonOptions.map((season) => (
                          <option key={season} value={season}>
                            Season {season}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                {syncBravoFilteredPreviewVideos.length === 0 ? (
                  <p className="text-sm text-zinc-500">No videos found for this preview/season filter.</p>
                ) : (
                  <div className="space-y-2">
                    {syncBravoFilteredPreviewVideos.map((video, index) => (
                      <article
                        key={`${video.clip_url}-${index}`}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                      >
                        <div className="flex gap-3">
                          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-zinc-100">
                            {video.image_url ? (
                              <GalleryImage
                                src={video.image_url}
                                alt={video.title || "Bravo video"}
                                sizes="120px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <a
                              href={video.clip_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:text-blue-700"
                            >
                              {video.title || "Untitled video"}
                            </a>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                              {video.runtime && <span>{video.runtime}</span>}
                              {typeof video.season_number === "number" && (
                                <span>Season {video.season_number}</span>
                              )}
                              {formatBravoPublishedDate(video.published_at) && (
                                <span>Posted {formatBravoPublishedDate(video.published_at)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Show Name
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-800">{show.name}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Bravo Show URL
                    </p>
                    {autoGeneratedBravoUrl ? (
                      <a
                        href={autoGeneratedBravoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                      >
                        {autoGeneratedBravoUrl}
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">Could not infer URL yet.</p>
                    )}
                    {syncBravoDescription.trim() && (
                      <>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Description
                        </p>
                        <p className="mt-1 text-sm text-zinc-700">{syncBravoDescription.trim()}</p>
                      </>
                    )}
                    {syncBravoAirs.trim() && (
                      <>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Airs / Tune-In
                        </p>
                        <p className="mt-1 text-sm text-zinc-700">{syncBravoAirs.trim()}</p>
                      </>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Cast Members Being Synced ({syncBravoPreviewCastLinks.length})
                    </p>
                    {syncBravoPreviewCastLinks.length === 0 ? (
                      <p className="text-sm text-zinc-500">No cast member URLs found in this preview.</p>
                    ) : (
                      <div className="space-y-2">
                        {syncBravoPreviewCastLinks.map((person, index) => (
                          <article
                            key={`${person.url}-${index}`}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <p className="text-sm font-semibold text-zinc-900">
                              {person.name || "Unresolved cast member"}
                            </p>
                            <p className="mt-1 break-all text-xs text-zinc-600">{person.url}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Show Images Being Synced ({syncBravoSelectedImageSummaries.length})
                    </p>
                    {syncBravoSelectedImageSummaries.length === 0 ? (
                      <p className="text-sm text-zinc-500">No show images selected for sync.</p>
                    ) : (
                      <div className="space-y-2">
                        {syncBravoSelectedImageSummaries.map((image) => (
                          <article
                            key={image.url}
                            className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-zinc-100">
                              <GalleryImage src={image.url} alt={image.alt || "Selected show image"} sizes="120px" />
                            </div>
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-semibold text-zinc-900">
                                {image.alt || "Show image"}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">
                                Type: {image.kind}
                              </p>
                              <p className="mt-1 break-all text-xs text-zinc-600">{image.url}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {syncBravoStep === "confirm" && (syncBravoError || syncBravoNotice) && (
                <p className={`mb-4 text-sm ${syncBravoError ? "text-red-600" : "text-zinc-600"}`}>
                  {syncBravoError || syncBravoNotice}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (syncBravoStep === "confirm") {
                      setSyncBravoStep("preview");
                      return;
                    }
                    setSyncBravoOpen(false);
                    setSyncBravoStep("preview");
                  }}
                  disabled={syncBravoLoading}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  {syncBravoStep === "confirm" ? "Back" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={syncBravoStep === "confirm" ? commitSyncByBravo : openSyncBravoConfirmStep}
                  disabled={syncBravoLoading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {syncBravoStep === "confirm"
                    ? syncBravoCommitLoading
                      ? "Syncing..."
                      : "Sync by Bravo"
                    : "Next"}
                </button>
              </div>
            </div>
          </div>
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
