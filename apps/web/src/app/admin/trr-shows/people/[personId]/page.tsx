"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";
import { ExternalLinks, TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import { ImageScrapeDrawer, type PersonContext } from "@/components/admin/ImageScrapeDrawer";
import { AdvancedFilterDrawer } from "@/components/admin/AdvancedFilterDrawer";
import { mapPhotoToMetadata, resolveMetadataDimensions } from "@/lib/photo-metadata";
import {
  THUMBNAIL_CROP_LIMITS,
  THUMBNAIL_DEFAULTS,
  isThumbnailCropMode,
  resolveThumbnailPresentation,
  resolveThumbnailViewportRect,
  type ThumbnailCrop,
} from "@/lib/thumbnail-crop";
import {
  readAdvancedFilters,
  writeAdvancedFilters,
  type AdvancedFilterState,
} from "@/lib/admin/advanced-filters";
import {
  inferHasTextOverlay,
  inferPeopleCountForPersonPhoto,
  matchesContentTypesForPersonPhoto,
} from "@/lib/gallery-filter-utils";
import {
  applyFacebankSeedUpdateToLightbox,
  applyFacebankSeedUpdateToPhotos,
} from "./facebank-seed-state";
import {
  applyThumbnailCropUpdateToLightbox,
  applyThumbnailCropUpdateToPhotos,
} from "./thumbnail-crop-state";
import {
  createSyncProgressTracker,
  formatPersonRefreshPhaseLabel,
  mapPersonRefreshStage,
  PERSON_REFRESH_PHASES,
  updateSyncProgressTracker,
} from "./refresh-progress";

// Types
interface TrrPerson {
  id: string;
  full_name: string;
  known_for: string | null;
  external_ids: Record<string, unknown>;
  // Canonical multi-source fields (jsonb, keyed by source: tmdb/fandom/manual)
  birthday?: Record<string, unknown>;
  gender?: Record<string, unknown>;
  biography?: Record<string, unknown>;
  place_of_birth?: Record<string, unknown>;
  homepage?: Record<string, unknown>;
  profile_image_url?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

type MultiSourceField = Record<string, unknown> | null | undefined;
type ResolvedField = {
  value: string | null;
  source: string | null;
  sources: Array<{ source: string; value: string }>;
};

const CANONICAL_SOURCE_ORDER = ["tmdb", "fandom", "manual"] as const;

const resolveMultiSourceField = (field: MultiSourceField): ResolvedField => {
  if (!field || typeof field !== "object") {
    return { value: null, source: null, sources: [] };
  }

  const entries = Object.entries(field)
    .map(([source, value]) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? { source, value: trimmed } : null;
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return { source, value: String(value) };
      }
      return null;
    })
    .filter((row): row is { source: string; value: string } => Boolean(row));

  if (entries.length === 0) {
    return { value: null, source: null, sources: [] };
  }

  for (const preferred of CANONICAL_SOURCE_ORDER) {
    const hit = entries.find((e) => e.source === preferred);
    if (hit) {
      return { value: hit.value, source: hit.source, sources: entries };
    }
  }

  // Fallback to first available source (stable order by source name).
  const stable = [...entries].sort((a, b) => a.source.localeCompare(b.source));
  return { value: stable[0].value, source: stable[0].source, sources: stable };
};

interface TrrPersonPhoto {
  id: string;
  person_id: string;
  source: string;
  url: string | null;
  hosted_url: string | null;
  hosted_content_type?: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  context_section: string | null;
  context_type: string | null;
  season: number | null;
  // Metadata fields for lightbox display
  people_names: string[] | null;
  people_ids: string[] | null;
  people_count?: number | null;
  people_count_source?: "auto" | "manual" | null;
  ingest_status?: string | null;
  title_names: string[] | null;
  metadata: Record<string, unknown> | null;
  fetched_at: string | null;
  created_at: string | null;
  // Origin metadata
  origin: "cast_photos" | "media_links";
  link_id?: string | null;
  media_asset_id?: string | null;
  facebank_seed: boolean;
  thumbnail_focus_x: number | null;
  thumbnail_focus_y: number | null;
  thumbnail_zoom: number | null;
  thumbnail_crop_mode: "manual" | "auto" | null;
}

type GallerySortOption = "newest" | "oldest" | "source" | "season-asc" | "season-desc";
type GalleryShowFilter = "all" | "this-show" | "wwhl" | "other-shows";

interface TrrPersonCredit {
  id: string;
  show_id: string;
  person_id: string;
  show_name: string | null;
  role: string | null;
  billing_order: number | null;
  credit_category: string;
}

interface CoverPhoto {
  person_id: string;
  photo_id: string;
  photo_url: string;
}

interface TrrCastFandom {
  id: string;
  person_id: string;
  source: string;
  source_url: string;
  page_title: string | null;
  scraped_at: string;
  full_name: string | null;
  birthdate: string | null;
  birthdate_display: string | null;
  gender: string | null;
  resides_in: string | null;
  hair_color: string | null;
  eye_color: string | null;
  height_display: string | null;
  weight_display: string | null;
  romances: string[] | null;
  family: Record<string, unknown> | null;
  friends: Record<string, unknown> | null;
  enemies: Record<string, unknown> | null;
  installment: string | null;
  installment_url: string | null;
  main_seasons_display: string | null;
  summary: string | null;
  taglines: Record<string, unknown> | null;
  reunion_seating: Record<string, unknown> | null;
  trivia: Record<string, unknown> | null;
}

type TabId = "overview" | "gallery" | "credits" | "fandom";

const parsePeopleCount = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatRefreshSummary = (summary: unknown): string | null => {
  if (typeof summary === "string") return summary;
  if (summary && typeof summary === "object") {
    const parts = Object.entries(summary as Record<string, unknown>)
      .filter(([, value]) => typeof value === "number")
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return null;
};

const parseDimensionValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
};

const resolvePhotoDimensions = (
  photo: TrrPersonPhoto | null | undefined
): { width: number | null; height: number | null } => {
  if (!photo) return { width: null, height: null };
  const metadata = photo.metadata as Record<string, unknown> | null;
  const metaDims = resolveMetadataDimensions(metadata);
  const metaWidth = parseDimensionValue(metaDims.width);
  const metaHeight = parseDimensionValue(metaDims.height);
  return {
    width: parseDimensionValue(photo.width) ?? metaWidth,
    height: parseDimensionValue(photo.height) ?? metaHeight,
  };
};

const buildThumbnailCropPreview = (
  photo: TrrPersonPhoto | null | undefined
): {
  focusX: number;
  focusY: number;
  zoom: number;
  imageWidth: number | null;
  imageHeight: number | null;
  aspectRatio: number;
} | null => {
  if (!photo) return null;
  const dims = resolvePhotoDimensions(photo);
  return {
    focusX: photo.thumbnail_focus_x ?? THUMBNAIL_DEFAULTS.x,
    focusY: photo.thumbnail_focus_y ?? THUMBNAIL_DEFAULTS.y,
    zoom: photo.thumbnail_zoom ?? THUMBNAIL_DEFAULTS.zoom,
    imageWidth: dims.width,
    imageHeight: dims.height,
    aspectRatio: 4 / 5,
  };
};

type ThumbnailCropPreview = {
  focusX: number;
  focusY: number;
  zoom: number;
  imageWidth: number | null;
  imageHeight: number | null;
  aspectRatio: number;
};

type ThumbnailCropOverlayUpdate = ThumbnailCropPreview & {
  photoId: string;
  nonce: number;
};

const SHOW_ACRONYM_RE = /\bRH[A-Z0-9]{2,6}\b/g;
const WWHL_LABEL = "WWHL";
const WWHL_NAME_RE = /watch\s+what\s+happens\s+live|wwhl/i;

const buildShowAcronym = (name: string | null | undefined): string | null => {
  if (!name) return null;
  const words = name
    .replace(/[^a-z0-9 ]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return null;
  const filtered = words.filter(
    (word) => !["the", "and", "a", "an", "to", "for"].includes(word.toLowerCase())
  );
  const acronym = (filtered.length > 0 ? filtered : words)
    .map((word) => word[0]?.toUpperCase?.() ?? "")
    .join("");
  return acronym || null;
};

const extractShowAcronyms = (text: string): Set<string> => {
  const matches = text.toUpperCase().match(SHOW_ACRONYM_RE) ?? [];
  return new Set(matches);
};

const isWwhlShowName = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return WWHL_NAME_RE.test(value);
};

const isLikelyImdbEpisodeCaption = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const text = value.trim();
  if (!text) return false;
  return /\bin\s+.+\(\d{4}\)\s*$/i.test(text);
};

// Profile photo with error handling
function ProfilePhoto({ url, name }: { url: string | null | undefined; name: string }) {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(url ?? null);

  useEffect(() => {
    setHasError(false);
    setCurrentSrc(url ?? null);
  }, [url]);

  if (!currentSrc || hasError) {
    return (
      <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-200">
        <div className="flex h-full items-center justify-center text-zinc-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-200">
      <Image
        src={currentSrc}
        alt={name}
        fill
        className="object-cover"
        sizes="128px"
        unoptimized
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function RefreshProgressBar({
  show,
  phase,
  message,
  current,
  total,
}: {
  show: boolean;
  phase?: string | null;
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
  const phaseLabel = formatPersonRefreshPhaseLabel(phase);
  const countLabel =
    safeCurrent !== null && safeTotal !== null
      ? `${safeCurrent.toLocaleString()}/${safeTotal.toLocaleString()}`
      : null;
  const detailMessage =
    typeof message === "string" && message.trim()
      ? message.trim()
      : null;

  return (
    <div className="w-full">
      {(phaseLabel || message || hasCounts) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
            {countLabel ? `${phaseLabel || "WORKING"} ${countLabel}` : phaseLabel || "WORKING"}
          </p>
          {hasProgressBar && safeCurrent !== null && safeTotal !== null && (
            <p className="text-[11px] tabular-nums text-zinc-500">
              {safeCurrent.toLocaleString()}/{safeTotal.toLocaleString()} ({percent}%)
            </p>
          )}
        </div>
      )}
      {detailMessage && (
        <p className="mb-1 text-[11px] text-zinc-500">{detailMessage}</p>
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

// Photo with error handling
function GalleryPhoto({
  photo,
  onClick,
  isCover,
  onSetCover,
  settingCover,
}: {
  photo: TrrPersonPhoto;
  onClick: () => void;
  isCover?: boolean;
  onSetCover?: () => void;
  settingCover?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(photo.hosted_url || photo.url || null);
  const triedFallbackRef = useRef(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const presentation = useMemo(() => {
    const persistedCrop: ThumbnailCrop | null =
      isThumbnailCropMode(photo.thumbnail_crop_mode) &&
      photo.thumbnail_focus_x !== null &&
      photo.thumbnail_focus_y !== null &&
      photo.thumbnail_zoom !== null
        ? {
            x: photo.thumbnail_focus_x ?? THUMBNAIL_DEFAULTS.x,
            y: photo.thumbnail_focus_y ?? THUMBNAIL_DEFAULTS.y,
            zoom: photo.thumbnail_zoom ?? THUMBNAIL_DEFAULTS.zoom,
            mode: photo.thumbnail_crop_mode,
          }
        : null;

    return resolveThumbnailPresentation({
      width: photo.width,
      height: photo.height,
      peopleCount: inferPeopleCountForPersonPhoto(photo),
      crop: persistedCrop,
    });
  }, [
    photo,
  ]);

  useEffect(() => {
    setHasError(false);
    triedFallbackRef.current = false;
    setCurrentSrc(photo.hosted_url || photo.url || null);
    setNaturalDimensions(null);
  }, [photo.hosted_url, photo.url]);

  const focusPoint = useMemo(() => {
    const match = presentation.objectPosition.match(
      /^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/,
    );
    if (!match) {
      return { x: THUMBNAIL_DEFAULTS.x, y: THUMBNAIL_DEFAULTS.y };
    }
    return {
      x: Number.parseFloat(match[1]),
      y: Number.parseFloat(match[2]),
    };
  }, [presentation.objectPosition]);

  const imageDimensions = useMemo(() => {
    const resolvedWidth = naturalDimensions?.width ?? parseDimensionValue(photo.width) ?? null;
    const resolvedHeight = naturalDimensions?.height ?? parseDimensionValue(photo.height) ?? null;
    return { width: resolvedWidth, height: resolvedHeight };
  }, [photo.height, photo.width, naturalDimensions?.height, naturalDimensions?.width]);

  const viewportRect = useMemo(() => {
    return resolveThumbnailViewportRect({
      imageWidth: imageDimensions.width,
      imageHeight: imageDimensions.height,
      focusX: focusPoint.x,
      focusY: focusPoint.y,
      zoom: presentation.zoom,
      aspectRatio: 4 / 5,
    });
  }, [focusPoint.x, focusPoint.y, imageDimensions.height, imageDimensions.width, presentation.zoom]);

  const exactViewportStyle = useMemo(() => {
    if (!viewportRect) return null;
    if (viewportRect.widthPct <= 0 || viewportRect.heightPct <= 0) return null;
    const widthScale = 100 / viewportRect.widthPct;
    const heightScale = 100 / viewportRect.heightPct;
    return {
      width: `${(widthScale * 100).toFixed(4)}%`,
      height: `${(heightScale * 100).toFixed(4)}%`,
      left: `${(-(viewportRect.leftPct / viewportRect.widthPct) * 100).toFixed(4)}%`,
      top: `${(-(viewportRect.topPct / viewportRect.heightPct) * 100).toFixed(4)}%`,
    };
  }, [viewportRect]);

  const handleError = () => {
    if (!triedFallbackRef.current && photo.url && currentSrc !== photo.url) {
      triedFallbackRef.current = true;
      setCurrentSrc(photo.url);
      return;
    }
    setHasError(true);
  };

  if (hasError || !currentSrc) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-200 text-zinc-400">
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
        src={currentSrc}
        alt={photo.caption || "Photo"}
        width={imageDimensions.width ?? 1200}
        height={imageDimensions.height ?? 1200}
        className={
          exactViewportStyle
            ? "absolute max-w-none cursor-zoom-in select-none"
            : "absolute inset-0 h-full w-full object-cover cursor-zoom-in select-none transition-transform duration-200"
        }
        style={{
          ...(exactViewportStyle ?? {
            objectPosition: presentation.objectPosition,
            transform: presentation.zoom === 1 ? undefined : `scale(${presentation.zoom})`,
            transformOrigin: presentation.objectPosition,
          }),
        }}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
        unoptimized
        onClick={onClick}
        onError={handleError}
        onLoad={(event) => {
          const element = event.currentTarget as HTMLImageElement;
          if (element.naturalWidth > 0 && element.naturalHeight > 0) {
            setNaturalDimensions({
              width: element.naturalWidth,
              height: element.naturalHeight,
            });
          }
        }}
      />
      {/* Cover badge */}
      {isCover && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white shadow">
          Cover
        </div>
      )}
      {photo.facebank_seed && (
        <div className="absolute top-2 right-2 z-10 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
          Seed
        </div>
      )}
      {/* Set as Cover button */}
      {onSetCover && !isCover && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetCover();
          }}
          disabled={settingCover}
          className="absolute bottom-2 right-2 z-10 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 hover:bg-black disabled:opacity-50"
        >
          {settingCover ? "..." : "Set as Cover"}
        </button>
      )}
    </>
  );
}

type TagPerson = { id?: string; name: string };

function TagPeoplePanel({
  photo,
  defaultPersonTag,
  getAuthHeaders,
  onTagsUpdated,
  onMirrorUpdated,
  onFacebankSeedUpdated,
  onThumbnailCropUpdated,
  onThumbnailCropPreviewChange,
  externalThumbnailCropOverlayUpdate,
  onRefreshAutoThumbnailCrop,
}: {
  photo: TrrPersonPhoto;
  defaultPersonTag: TagPerson | null;
  getAuthHeaders: () => Promise<{ Authorization: string }>;
  onTagsUpdated: (payload: {
    mediaAssetId: string | null;
    castPhotoId: string | null;
    peopleNames: string[];
    peopleIds: string[];
    peopleCount: number | null;
    peopleCountSource: "auto" | "manual" | null;
  }) => void;
  onMirrorUpdated: (payload: {
    mediaAssetId: string | null;
    castPhotoId: string | null;
    hostedUrl: string;
  }) => void;
  onFacebankSeedUpdated: (payload: {
    linkId: string;
    facebankSeed: boolean;
  }) => void;
  onThumbnailCropUpdated: (payload: {
    origin: "cast_photos" | "media_links";
    photoId: string;
    linkId: string | null;
    thumbnailFocusX: number | null;
    thumbnailFocusY: number | null;
    thumbnailZoom: number | null;
    thumbnailCropMode: "manual" | "auto" | null;
  }) => void;
  onThumbnailCropPreviewChange: (preview: ThumbnailCropPreview | null) => void;
  externalThumbnailCropOverlayUpdate: ThumbnailCropOverlayUpdate | null;
  onRefreshAutoThumbnailCrop: (photo: TrrPersonPhoto) => Promise<void>;
}) {
  const isCastPhoto = photo.origin === "cast_photos";
  const isMediaLink = photo.origin === "media_links";
  const hasSourceTags =
    isCastPhoto &&
    (photo.people_names?.length ?? 0) > 0 &&
    photo.people_count_source !== "manual";
  const isEditable = (isMediaLink && Boolean(photo.link_id)) || (isCastPhoto && !hasSourceTags);
  const [taggedPeople, setTaggedPeople] = useState<TagPerson[]>([]);
  const [readonlyNames, setReadonlyNames] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrrPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peopleCountInput, setPeopleCountInput] = useState<string>("");
  const [recounting, setRecounting] = useState(false);
  const [recountError, setRecountError] = useState<string | null>(null);
  const [mirroring, setMirroring] = useState(false);
  const [mirrorError, setMirrorError] = useState<string | null>(null);
  const [facebankSeedSaving, setFacebankSeedSaving] = useState(false);
  const [facebankSeedError, setFacebankSeedError] = useState<string | null>(null);
  const [cropX, setCropX] = useState<number>(
    photo.thumbnail_focus_x ?? THUMBNAIL_DEFAULTS.x
  );
  const [cropY, setCropY] = useState<number>(
    photo.thumbnail_focus_y ?? THUMBNAIL_DEFAULTS.y
  );
  const [cropZoom, setCropZoom] = useState<number>(
    photo.thumbnail_zoom ?? THUMBNAIL_DEFAULTS.zoom
  );
  const [cropSaving, setCropSaving] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const autoTagRequestedPhotoIdRef = useRef<string | null>(null);
  const currentPeopleCount = parsePeopleCount(photo.people_count);
  const originalCropMode = photo.thumbnail_crop_mode;
  const originalCropX = photo.thumbnail_focus_x ?? THUMBNAIL_DEFAULTS.x;
  const originalCropY = photo.thumbnail_focus_y ?? THUMBNAIL_DEFAULTS.y;
  const originalCropZoom = photo.thumbnail_zoom ?? THUMBNAIL_DEFAULTS.zoom;
  const manualCropDirty =
    originalCropMode !== "manual" ||
    Math.abs(cropX - originalCropX) >= 1 ||
    Math.abs(cropY - originalCropY) >= 1 ||
    Math.abs(cropZoom - originalCropZoom) >= 0.01;
  const clampCropZoom = useCallback((value: number) => {
    return Math.min(
      THUMBNAIL_CROP_LIMITS.zoomMax,
      Math.max(THUMBNAIL_CROP_LIMITS.zoomMin, value),
    );
  }, []);
  const clampCropPercent = useCallback((value: number) => {
    return Math.min(100, Math.max(0, value));
  }, []);

  useEffect(() => {
    const ids = photo.people_ids ?? [];
    const names = photo.people_names ?? [];
    const fallbackTagName = defaultPersonTag?.name?.trim() || null;
    if (isEditable) {
      if (ids.length > 0) {
        setTaggedPeople(
          ids.map((id, i) => ({ id, name: names[i] ?? id }))
        );
      } else if (names.length > 0) {
        setTaggedPeople(names.map((name) => ({ name })));
      } else if (fallbackTagName) {
        setTaggedPeople([{ id: defaultPersonTag?.id, name: fallbackTagName }]);
      } else {
        setTaggedPeople([]);
      }
      setReadonlyNames([]);
    } else {
      setTaggedPeople([]);
      setReadonlyNames(names.length > 0 ? names : fallbackTagName ? [fallbackTagName] : []);
    }
    setPeopleCountInput(
      currentPeopleCount !== null && currentPeopleCount !== undefined
        ? String(currentPeopleCount)
        : ""
    );
  }, [
    currentPeopleCount,
    defaultPersonTag?.id,
    defaultPersonTag?.name,
    isEditable,
    photo.id,
    photo.people_ids,
    photo.people_names,
  ]);

  useEffect(() => {
    setCropX(photo.thumbnail_focus_x ?? THUMBNAIL_DEFAULTS.x);
    setCropY(photo.thumbnail_focus_y ?? THUMBNAIL_DEFAULTS.y);
    setCropZoom(clampCropZoom(photo.thumbnail_zoom ?? THUMBNAIL_DEFAULTS.zoom));
    setCropError(null);
  }, [
    clampCropZoom,
    photo.id,
    photo.thumbnail_crop_mode,
    photo.thumbnail_focus_x,
    photo.thumbnail_focus_y,
    photo.thumbnail_zoom,
  ]);

  useEffect(() => {
    if (!externalThumbnailCropOverlayUpdate) return;
    if (externalThumbnailCropOverlayUpdate.photoId !== photo.id) return;
    setCropX(clampCropPercent(externalThumbnailCropOverlayUpdate.focusX));
    setCropY(clampCropPercent(externalThumbnailCropOverlayUpdate.focusY));
    setCropZoom(clampCropZoom(externalThumbnailCropOverlayUpdate.zoom));
  }, [
    clampCropPercent,
    clampCropZoom,
    externalThumbnailCropOverlayUpdate,
    photo.id,
  ]);

  useEffect(() => {
    const dims = resolvePhotoDimensions(photo);
    onThumbnailCropPreviewChange({
      focusX: cropX,
      focusY: cropY,
      zoom: cropZoom,
      imageWidth: dims.width,
      imageHeight: dims.height,
      aspectRatio: 4 / 5,
    });
  }, [
    cropX,
    cropY,
    cropZoom,
    photo,
    onThumbnailCropPreviewChange,
  ]);

  useEffect(() => {
    return () => onThumbnailCropPreviewChange(null);
  }, [onThumbnailCropPreviewChange]);

  useEffect(() => {
    if (!isEditable) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/people?q=${encodeURIComponent(trimmed)}&limit=8`,
          { headers }
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const data = await response.json();
        setResults(data.people ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isEditable, getAuthHeaders]);

  const updateTags = useCallback(
    async (nextPeople: TagPerson[], peopleCountOverride?: number | null) => {
      if (!isEditable) return;
      if (isMediaLink && !photo.link_id) return;
      setSaving(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const endpoint = isMediaLink
          ? `/api/admin/trr-api/media-links/${photo.link_id}/tags`
          : `/api/admin/trr-api/cast-photos/${photo.id}/tags`;
        const payload: Record<string, unknown> = { people: nextPeople };
        if (peopleCountOverride !== undefined) {
          payload.people_count = peopleCountOverride;
        }
        const response = await fetch(endpoint, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.detail || "Failed to update tags");
        }
        const normalizedNextPeopleNames = [
          ...new Set(
            nextPeople
              .map((person) => person.name.trim())
              .filter((name) => name.length > 0),
          ),
        ];
        const normalizedNextPeopleIds = [
          ...new Set(
            nextPeople
              .map((person) => person.id?.trim() ?? "")
              .filter((id) => id.length > 0),
          ),
        ];
        const responsePeopleNames = Array.isArray(data.people_names)
          ? (data.people_names as string[])
          : [];
        const peopleNames = Array.isArray(data.people_names)
          ? normalizedNextPeopleNames
          : normalizedNextPeopleNames.length > 0
            ? normalizedNextPeopleNames
            : responsePeopleNames;
        const responsePeopleIds = Array.isArray(data.people_ids)
          ? (data.people_ids as string[])
          : [];
        const peopleIds = Array.isArray(data.people_ids)
          ? normalizedNextPeopleIds
          : normalizedNextPeopleIds.length > 0
            ? normalizedNextPeopleIds
            : responsePeopleIds;
        const peopleCountFromResponse = parsePeopleCount(data.people_count);
        const peopleCount =
          peopleCountFromResponse !== null
            ? peopleCountFromResponse
            : peopleCountOverride ?? null;
        const hasManualInput =
          nextPeople.length > 0 ||
          (peopleCountOverride !== undefined && peopleCountOverride !== null);
        const fallbackSource = hasManualInput ? "manual" : null;
        const peopleCountSource =
          typeof data.people_count_source === "string"
            ? (data.people_count_source as "auto" | "manual")
            : fallbackSource;
        setTaggedPeople(nextPeople);
        setReadonlyNames([]);
        setPeopleCountInput(
          peopleCount !== null && peopleCount !== undefined
            ? String(peopleCount)
            : ""
        );
        onTagsUpdated({
          mediaAssetId: photo.media_asset_id ?? null,
          castPhotoId: isCastPhoto ? photo.id : null,
          peopleNames,
          peopleIds,
          peopleCount,
          peopleCountSource,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update tags");
      } finally {
        setSaving(false);
      }
    },
    [
      getAuthHeaders,
      isEditable,
      isMediaLink,
      isCastPhoto,
      onTagsUpdated,
      photo.id,
      photo.link_id,
      photo.media_asset_id,
    ]
  );

  useEffect(() => {
    if (!isEditable) return;
    const fallbackTagName = defaultPersonTag?.name?.trim();
    if (!fallbackTagName) return;
    const hasStoredTags =
      (photo.people_ids?.length ?? 0) > 0 || (photo.people_names?.length ?? 0) > 0;
    if (hasStoredTags) return;
    if (autoTagRequestedPhotoIdRef.current === photo.id) return;
    autoTagRequestedPhotoIdRef.current = photo.id;
    const next = [{ id: defaultPersonTag?.id, name: fallbackTagName }];
    setTaggedPeople(next);
    void updateTags(next);
  }, [
    defaultPersonTag?.id,
    defaultPersonTag?.name,
    isEditable,
    photo.id,
    photo.people_ids,
    photo.people_names,
    updateTags,
  ]);

  const handleAddPerson = (person: TrrPerson) => {
    if (!person.id || !person.full_name) return;
    if (taggedPeople.some((p) => p.id === person.id)) return;
    const next = [...taggedPeople, { id: person.id, name: person.full_name }];
    setQuery("");
    setResults([]);
    void updateTags(next);
  };

  const handleAddFreeText = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (taggedPeople.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setQuery("");
      setResults([]);
      return;
    }
    const next = [...taggedPeople, { name: trimmed }];
    setQuery("");
    setResults([]);
    void updateTags(next);
  };

  const handleRemovePerson = (person: TagPerson) => {
    const next = taggedPeople.filter((p) => {
      if (person.id) return p.id !== person.id;
      return p.name.toLowerCase() !== person.name.toLowerCase();
    });
    void updateTags(next);
  };

  const displayTags = useMemo(() => {
    const names =
      taggedPeople.length > 0 ? taggedPeople.map((person) => person.name) : readonlyNames;
    return [...new Set(names.filter((name) => typeof name === "string" && name.trim().length > 0))];
  }, [readonlyNames, taggedPeople]);

  const normalizeCountInput = (value: string) => {
    const raw = value.trim();
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const isCountDirty =
    normalizeCountInput(peopleCountInput) !== currentPeopleCount;

  const handleSaveCount = () => {
    if (!isCountDirty) return;
    const raw = peopleCountInput.trim();
    if (!raw) {
      void updateTags(taggedPeople, null);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("People count must be a positive number.");
      return;
    }
    void updateTags(taggedPeople, parsed);
  };

  const canRecount =
    photo.people_count_source !== "manual" &&
    (isCastPhoto || Boolean(photo.media_asset_id));

  const canMirror = isMediaLink && Boolean(photo.media_asset_id);
  const canToggleFacebankSeed = isMediaLink && Boolean(photo.link_id);

  const mirrorForRecount = async () => {
    if (isMediaLink && photo.media_asset_id) {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/media-assets/${photo.media_asset_id}/mirror`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to mirror image";
        throw new Error(message);
      }
      if (typeof data.hosted_url === "string") {
        onMirrorUpdated({
          mediaAssetId: photo.media_asset_id,
          castPhotoId: null,
          hostedUrl: data.hosted_url,
        });
      }
      return;
    }

    if (isCastPhoto) {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/cast-photos/${photo.id}/mirror`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to mirror image";
        throw new Error(message);
      }
      if (typeof data.hosted_url === "string") {
        onMirrorUpdated({
          mediaAssetId: null,
          castPhotoId: photo.id,
          hostedUrl: data.hosted_url,
        });
      }
    }
  };

  const handleRecount = async () => {
    if (!canRecount) return;
    setRecounting(true);
    setRecountError(null);
    const runRecount = async () => {
      const headers = await getAuthHeaders();
      const endpoint = isCastPhoto
        ? `/api/admin/trr-api/cast-photos/${photo.id}/auto-count`
        : `/api/admin/trr-api/media-assets/${photo.media_asset_id}/auto-count`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to auto-count people";
        throw new Error(message);
      }
      return data;
    };

    const applyRecount = (data: Record<string, unknown>) => {
      const peopleCount = parsePeopleCount(data.people_count);
      const peopleCountSource =
        (data.people_count_source as "auto" | "manual" | null) ?? "auto";
      setPeopleCountInput(
        peopleCount !== null && peopleCount !== undefined
          ? String(peopleCount)
          : ""
      );
      onTagsUpdated({
        mediaAssetId: photo.media_asset_id ?? null,
        castPhotoId: isCastPhoto ? photo.id : null,
        peopleNames: photo.people_names ?? [],
        peopleIds: photo.people_ids ?? [],
        peopleCount,
        peopleCountSource,
      });
    };

    try {
      const data = await runRecount();
      applyRecount(data);
    } catch (err) {
      const initialErrorMessage =
        err instanceof Error ? err.message : "Failed to auto-count people";
      let mirrorFallbackError: string | null = null;
      try {
        setMirroring(true);
        await mirrorForRecount();
      } catch (mirrorErr) {
        mirrorFallbackError =
          mirrorErr instanceof Error ? mirrorErr.message : "Mirror fallback failed";
      } finally {
        setMirroring(false);
      }

      try {
        const retryData = await runRecount();
        applyRecount(retryData);
        setRecountError(null);
      } catch (retryErr) {
        const retryErrorMessage =
          retryErr instanceof Error ? retryErr.message : "Failed to auto-count people";
        if (mirrorFallbackError) {
          setRecountError(
            `${retryErrorMessage} | Mirror fallback failed: ${mirrorFallbackError}`
          );
          return;
        }
        if (initialErrorMessage && initialErrorMessage !== retryErrorMessage) {
          setRecountError(`${retryErrorMessage} | Initial error: ${initialErrorMessage}`);
          return;
        }
        setRecountError(retryErrorMessage);
      }
    } finally {
      setRecounting(false);
    }
  };

  const handleMirror = async () => {
    if (!canMirror || !photo.media_asset_id) return;
    setMirroring(true);
    setMirrorError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/media-assets/${photo.media_asset_id}/mirror`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to mirror image";
        throw new Error(message);
      }
      const hostedUrl =
        typeof data.hosted_url === "string" ? data.hosted_url : null;
      if (hostedUrl) {
        onMirrorUpdated({
          mediaAssetId: photo.media_asset_id,
          castPhotoId: null,
          hostedUrl,
        });
      }
    } catch (err) {
      setMirrorError(err instanceof Error ? err.message : "Failed to mirror image");
    } finally {
      setMirroring(false);
    }
  };

  const handleToggleFacebankSeed = async () => {
    if (!canToggleFacebankSeed || !photo.link_id) return;
    setFacebankSeedSaving(true);
    setFacebankSeedError(null);
    try {
      const headers = await getAuthHeaders();
      const nextValue = !Boolean(photo.facebank_seed);
      const response = await fetch(
        `/api/admin/trr-api/people/${photo.person_id}/gallery/${photo.link_id}/facebank-seed`,
        {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ facebank_seed: nextValue }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to update facebank seed";
        throw new Error(message);
      }
      onFacebankSeedUpdated({
        linkId: photo.link_id,
        facebankSeed: Boolean(
          typeof data.facebank_seed === "boolean" ? data.facebank_seed : nextValue
        ),
      });
    } catch (err) {
      setFacebankSeedError(
        err instanceof Error ? err.message : "Failed to update facebank seed"
      );
    } finally {
      setFacebankSeedSaving(false);
    }
  };

  const persistThumbnailCrop = useCallback(
    async (crop: ThumbnailCrop | null) => {
      if (isMediaLink && !photo.link_id) {
        throw new Error("Cannot update crop: media link id is missing");
      }

      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${photo.person_id}/photos/${photo.id}/thumbnail-crop`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: photo.origin,
            link_id: photo.link_id ?? undefined,
            crop,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to update thumbnail crop";
        throw new Error(message);
      }

      const nextPhotoId =
        typeof data.photo_id === "string" && data.photo_id.trim().length > 0
          ? data.photo_id
          : photo.id;
      const nextLinkId =
        typeof data.link_id === "string" && data.link_id.trim().length > 0
          ? data.link_id
          : photo.link_id ?? null;
      const nextOrigin =
        data.origin === "cast_photos" || data.origin === "media_links"
          ? data.origin
          : photo.origin;
      const nextMode =
        data.thumbnail_crop_mode === "manual" || data.thumbnail_crop_mode === "auto"
          ? data.thumbnail_crop_mode
          : null;
      const nextX =
        typeof data.thumbnail_focus_x === "number" && Number.isFinite(data.thumbnail_focus_x)
          ? data.thumbnail_focus_x
          : null;
      const nextY =
        typeof data.thumbnail_focus_y === "number" && Number.isFinite(data.thumbnail_focus_y)
          ? data.thumbnail_focus_y
          : null;
      const nextZoom =
        typeof data.thumbnail_zoom === "number" && Number.isFinite(data.thumbnail_zoom)
          ? data.thumbnail_zoom
          : null;

      onThumbnailCropUpdated({
        origin: nextOrigin,
        photoId: nextPhotoId,
        linkId: nextLinkId,
        thumbnailFocusX: nextX,
        thumbnailFocusY: nextY,
        thumbnailZoom: nextZoom,
        thumbnailCropMode: nextMode,
      });

      if (nextMode === "manual") {
        setCropX(nextX ?? THUMBNAIL_DEFAULTS.x);
        setCropY(nextY ?? THUMBNAIL_DEFAULTS.y);
        setCropZoom(clampCropZoom(nextZoom ?? THUMBNAIL_DEFAULTS.zoom));
      } else {
        setCropX(THUMBNAIL_DEFAULTS.x);
        setCropY(THUMBNAIL_DEFAULTS.y);
        setCropZoom(THUMBNAIL_DEFAULTS.zoom);
      }
    },
    [
      clampCropZoom,
      getAuthHeaders,
      isMediaLink,
      onThumbnailCropUpdated,
      photo.id,
      photo.link_id,
      photo.origin,
      photo.person_id,
    ],
  );

  const handleSaveManualThumbnailCrop = async () => {
    setCropSaving(true);
    setCropError(null);
    try {
      await persistThumbnailCrop({
        x: Math.round(cropX),
        y: Math.round(cropY),
        zoom: Number(cropZoom.toFixed(2)),
        mode: "manual",
      });
    } catch (err) {
      setCropError(err instanceof Error ? err.message : "Failed to update thumbnail crop");
    } finally {
      setCropSaving(false);
    }
  };

  const handleResetThumbnailCrop = async () => {
    setCropSaving(true);
    setCropError(null);
    try {
      await persistThumbnailCrop(null);
      await onRefreshAutoThumbnailCrop(photo);
    } catch (err) {
      setCropError(err instanceof Error ? err.message : "Failed to refresh auto thumbnail crop");
    } finally {
      setCropSaving(false);
    }
  };

  return (
    <div>
      <span className="tracking-widest text-[10px] uppercase text-white/50">
        Tags
      </span>
      <div className="mt-2 flex flex-wrap gap-2">
        {displayTags.length === 0 && (
          <span className="text-xs text-white/60">No tags</span>
        )}
        {taggedPeople.length > 0
          ? taggedPeople.map((person) => (
              <span
                key={person.id ?? person.name}
                className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white"
              >
                {person.name}
                {isEditable && (
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(person)}
                    disabled={saving}
                    className="ml-1 rounded-full px-1 text-white/70 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </span>
            ))
          : readonlyNames.map((name) => (
              <span
                key={name}
                className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white"
              >
                {name}
              </span>
            ))}
      </div>

      {!isEditable && hasSourceTags && (
        <p className="mt-2 text-xs text-white/60">
          Tags from source metadata are read-only here.
        </p>
      )}

      {isEditable && readonlyNames.length > 0 && taggedPeople.length === 0 && (
        <p className="mt-2 text-xs text-white/60">
          Existing tags are read-only. Re-add people to edit tags.
        </p>
      )}

      {isEditable && (
        <div className="mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people to tag"
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddFreeText();
              }
            }}
          />
          {searching && (
            <p className="mt-1 text-xs text-white/60">Searching...</p>
          )}
          {results.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-white/10 bg-black/60">
              {results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleAddPerson(person)}
                  disabled={saving || taggedPeople.some((p) => p.id === person.id)}
                  className="flex w-full items-center justify-between px-2 py-1 text-left text-xs text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <span>{person.full_name}</span>
                  {taggedPeople.some((p) => p.id === person.id) && (
                    <span className="text-white/50">Added</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {results.length === 0 && query.trim().length > 0 && (
            <button
              type="button"
              onClick={handleAddFreeText}
              disabled={saving}
              className="mt-2 text-xs text-white/70 hover:text-white"
            >
              Add “{query.trim()}”
            </button>
          )}
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      )}

      <div className="mt-4">
        <span className="tracking-widest text-[10px] uppercase text-white/50">
          People Count
        </span>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={peopleCountInput}
            onChange={(e) => setPeopleCountInput(e.target.value)}
            className="w-20 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            disabled={!isEditable || saving}
            placeholder="Auto"
          />
          {isEditable && isCountDirty && (
            <button
              type="button"
              onClick={handleSaveCount}
              disabled={saving}
              className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
          <button
            type="button"
            onClick={handleRecount}
            disabled={!canRecount || recounting}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
          >
            {recounting ? "Recounting..." : "Recount"}
          </button>
        </div>
        {photo.people_count_source && (
          <p className="mt-1 text-xs text-white/60">
            Count source: {photo.people_count_source}
          </p>
        )}
        {recountError && (
          <p className="mt-2 text-xs text-red-300">{recountError}</p>
        )}
        {canMirror && !photo.hosted_url && (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleMirror}
              disabled={mirroring}
              className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
            >
              {mirroring ? "Mirroring..." : "Mirror to CDN"}
            </button>
            {mirrorError && (
              <p className="mt-2 text-xs text-red-300">{mirrorError}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <span className="tracking-widest text-[10px] uppercase text-white/50">
          Thumbnail Crop
        </span>
        <p className="mt-1 text-xs text-white/60">
          Mode: {photo.thumbnail_crop_mode === "manual" ? "Manual" : "Auto"}
        </p>
        <div className="mt-2 space-y-2">
          <label className="block text-xs text-white/70">
            Horizontal ({Math.round(cropX)}%)
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={cropX}
              onChange={(e) => setCropX(Number(e.target.value))}
              className="mt-1 w-full"
              disabled={cropSaving}
            />
          </label>
          <label className="block text-xs text-white/70">
            Vertical ({Math.round(cropY)}%)
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={cropY}
              onChange={(e) => setCropY(Number(e.target.value))}
              className="mt-1 w-full"
              disabled={cropSaving}
            />
          </label>
          <label className="block text-xs text-white/70">
            Zoom ({cropZoom.toFixed(2)}x)
            <input
              type="range"
              min={1}
              max={THUMBNAIL_CROP_LIMITS.zoomMax}
              step={0.01}
              value={cropZoom}
              onChange={(e) => setCropZoom(clampCropZoom(Number(e.target.value)))}
              className="mt-1 w-full"
              disabled={cropSaving}
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveManualThumbnailCrop}
            disabled={cropSaving || !manualCropDirty}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
          >
            {cropSaving ? "Saving..." : "Save Manual Crop"}
          </button>
          <button
            type="button"
            onClick={handleResetThumbnailCrop}
            disabled={cropSaving}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
          >
            {cropSaving ? "Refreshing..." : "Refresh Auto Crop"}
          </button>
        </div>
        {cropError && <p className="mt-2 text-xs text-red-300">{cropError}</p>}
      </div>

      {canToggleFacebankSeed && (
        <div className="mt-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Facebank Seed
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                photo.facebank_seed
                  ? "bg-blue-600/80 text-white"
                  : "bg-white/10 text-white/80"
              }`}
            >
              {photo.facebank_seed ? "Seeded" : "Not seeded"}
            </span>
            <button
              type="button"
              onClick={handleToggleFacebankSeed}
              disabled={facebankSeedSaving}
              className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
            >
              {facebankSeedSaving
                ? "Saving..."
                : photo.facebank_seed
                  ? "Unset Seed"
                  : "Set as Seed"}
            </button>
          </div>
          {facebankSeedError && (
            <p className="mt-2 text-xs text-red-300">{facebankSeedError}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PersonProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const personId = params.personId as string;
  const showIdParam = searchParams.get("showId");
  const seasonNumberParam = searchParams.get("seasonNumber");
  const seasonNumberRaw = seasonNumberParam ? Number.parseInt(seasonNumberParam, 10) : Number.NaN;
  const seasonNumber = Number.isFinite(seasonNumberRaw) ? seasonNumberRaw : null;

  const backHref = showIdParam
    ? seasonNumber !== null
      ? `/admin/trr-shows/${showIdParam}/seasons/${seasonNumber}?tab=cast`
      : `/admin/trr-shows/${showIdParam}`
    : "/admin/trr-shows";
  const backLabel = showIdParam
    ? seasonNumber !== null
      ? "← Back to Season Cast"
      : "← Back to Show"
    : "← Back to Shows";
  const { user, checking, hasAccess } = useAdminGuard();

  const [person, setPerson] = useState<TrrPerson | null>(null);
  const [photos, setPhotos] = useState<TrrPersonPhoto[]>([]);
  const [credits, setCredits] = useState<TrrPersonCredit[]>([]);
  const [fandomData, setFandomData] = useState<TrrCastFandom[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lightbox state - track full photo object + index for navigation
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    photo: TrrPersonPhoto;
    index: number;
  } | null>(null);
  const [thumbnailCropPreview, setThumbnailCropPreview] = useState<ThumbnailCropPreview | null>(null);
  const [thumbnailCropOverlayUpdate, setThumbnailCropOverlayUpdate] =
    useState<ThumbnailCropOverlayUpdate | null>(null);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);

  // Cover photo state
  const [coverPhoto, setCoverPhoto] = useState<CoverPhoto | null>(null);
  const [settingCover, setSettingCover] = useState(false);

  // Image scrape drawer state
  const [scrapeDrawerOpen, setScrapeDrawerOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [textOverlayDetectError, setTextOverlayDetectError] = useState<string | null>(null);

  // Refresh images state
  const [refreshingImages, setRefreshingImages] = useState(false);
  const [reprocessingImages, setReprocessingImages] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{
    current?: number | null;
    total?: number | null;
    phase?: string | null;
    message?: string | null;
    rawStage?: string | null;
    detailMessage?: string | null;
    runId?: string | null;
    lastEventAt?: number | null;
  } | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [photosError, setPhotosError] = useState<string | null>(null);

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

  // Gallery filter/sort state
  const [galleryShowFilter, setGalleryShowFilter] = useState<GalleryShowFilter>(
    showIdParam ? "this-show" : "all"
  );
  const [selectedOtherShowKey, setSelectedOtherShowKey] = useState<string>("all");
  const [seasonPremiereMap, setSeasonPremiereMap] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!showIdParam) {
      setGalleryShowFilter("all");
      return;
    }
    setGalleryShowFilter((prev) => (prev === "all" ? "this-show" : prev));
  }, [showIdParam]);

  const activeShow = useMemo(
    () => (showIdParam ? credits.find((credit) => credit.show_id === showIdParam) ?? null : null),
    [credits, showIdParam]
  );
  const activeShowName = activeShow?.show_name ?? null;
  const activeShowAcronym = useMemo(
    () => buildShowAcronym(activeShowName),
    [activeShowName]
  );
  const activeShowFilterLabel = activeShowAcronym ?? activeShowName ?? "Current Show";
  const otherShowOptions = useMemo(() => {
    const byKey = new Map<
      string,
      { key: string; showId: string | null; showName: string; acronym: string | null }
    >();
    for (const credit of credits) {
      if (credit.show_id === showIdParam) continue;
      const showName = credit.show_name?.trim() ?? "";
      if (!showName || isWwhlShowName(showName)) continue;
      const key = credit.show_id ? `id:${credit.show_id}` : `name:${showName.toLowerCase()}`;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        key,
        showId: credit.show_id ?? null,
        showName,
        acronym: buildShowAcronym(showName),
      });
    }
    return Array.from(byKey.values()).sort((a, b) => a.showName.localeCompare(b.showName));
  }, [credits, showIdParam]);
  const otherShowNameMatches = useMemo(
    () => otherShowOptions.map((option) => option.showName.toLowerCase()),
    [otherShowOptions]
  );
  const otherShowAcronymMatches = useMemo(() => {
    const acronyms = new Set<string>();
    for (const option of otherShowOptions) {
      if (option.acronym) acronyms.add(option.acronym.toUpperCase());
    }
    return acronyms;
  }, [otherShowOptions]);
  const selectedOtherShow = useMemo(
    () => otherShowOptions.find((option) => option.key === selectedOtherShowKey) ?? null,
    [otherShowOptions, selectedOtherShowKey]
  );

  useEffect(() => {
    if (selectedOtherShowKey === "all") return;
    if (otherShowOptions.some((option) => option.key === selectedOtherShowKey)) return;
    setSelectedOtherShowKey("all");
  }, [otherShowOptions, selectedOtherShowKey]);

  // Compute unique sources from photos
  const uniqueSources = useMemo(() => {
    const sources = new Set(photos.map(p => p.source).filter(Boolean));
    return Array.from(sources).sort();
  }, [photos]);

  const isTextFilterActive = useMemo(() => {
    const wantsText = advancedFilters.text.includes("text");
    const wantsNoText = advancedFilters.text.includes("no_text");
    return wantsText !== wantsNoText;
  }, [advancedFilters.text]);

  const unknownTextCount = useMemo(() => {
    if (!isTextFilterActive) return 0;
    return photos.filter((p) => inferHasTextOverlay(p.metadata ?? null) === null)
      .length;
  }, [isTextFilterActive, photos]);

  const getPhotoSortDate = useCallback(
    (photo: TrrPersonPhoto): number => {
      const metadata = mapPhotoToMetadata(photo);
      if (metadata.createdAt) return metadata.createdAt.getTime();
      if (metadata.addedAt) return metadata.addedAt.getTime();
      const seasonNumber = typeof photo.season === "number" ? photo.season : null;
      if (seasonNumber && seasonPremiereMap[seasonNumber]) {
        const date = new Date(seasonPremiereMap[seasonNumber]);
        if (!Number.isNaN(date.getTime())) return date.getTime();
      }
      return 0;
    },
    [seasonPremiereMap]
  );

  // Filter and sort photos for gallery
  const filteredPhotos = useMemo(() => {
    let result = [...photos];

    // Apply show filter (if coming from a show context)
    if (showIdParam && galleryShowFilter !== "all") {
      const showNameLower = activeShowName?.toLowerCase?.() ?? null;
      const showAcronym = activeShowAcronym?.toUpperCase?.() ?? null;
      result = result.filter((photo) => {
        const metadata = (photo.metadata ?? {}) as Record<string, unknown>;
        const metaShowId = typeof metadata.show_id === "string" ? metadata.show_id : null;
        const metaShowIdMatches = Boolean(showIdParam && metaShowId && metaShowId === showIdParam);
        const text = [
          photo.caption,
          photo.context_section,
          photo.context_type,
          typeof metadata.fandom_section_label === "string"
            ? metadata.fandom_section_label
            : null,
          ...(photo.title_names ?? []),
        ]
          .filter(Boolean)
          .join(" ");
        const textLower = text.toLowerCase();
        const matchesShowName = showNameLower ? textLower.includes(showNameLower) : false;
        const acronyms = extractShowAcronyms(text);
        const matchesShowAcronym = showAcronym ? acronyms.has(showAcronym) : false;
        const metadataShowNameRaw =
          typeof metadata.show_name === "string" ? metadata.show_name : null;
        const metadataShowName = metadataShowNameRaw?.toLowerCase() ?? null;
        const metadataShowAcronym = buildShowAcronym(metadataShowNameRaw)?.toUpperCase() ?? null;
        const matchesWwhl = isWwhlShowName(text) || isWwhlShowName(metadataShowNameRaw) || acronyms.has(WWHL_LABEL);
        const metadataMatchesThisShow =
          Boolean(metadataShowName && showNameLower && metadataShowName.includes(showNameLower));
        const metadataMatchesOtherShow =
          Boolean(
            metadataShowName &&
              showNameLower &&
              !metadataShowName.includes(showNameLower) &&
              !isWwhlShowName(metadataShowNameRaw)
          );
        const matchesOtherShowName = otherShowNameMatches.some((name) =>
          textLower.includes(name.toLowerCase())
        );
        const matchesOtherShowAcronym = Array.from(acronyms).some((acro) =>
          otherShowAcronymMatches.has(acro)
        );
        const isImdbSource = (photo.source ?? "").toLowerCase() === "imdb";
        const imdbEpisodeTitleFallbackForThisShow =
          isImdbSource &&
          !metaShowId &&
          !matchesWwhl &&
          !matchesOtherShowName &&
          !matchesOtherShowAcronym &&
          !metadataMatchesOtherShow &&
          isLikelyImdbEpisodeCaption(photo.caption);

        if (galleryShowFilter === "this-show") {
          return (
            metaShowIdMatches ||
            matchesShowName ||
            matchesShowAcronym ||
            metadataMatchesThisShow ||
            imdbEpisodeTitleFallbackForThisShow
          );
        }
        if (galleryShowFilter === "wwhl") {
          return matchesWwhl;
        }
        if (galleryShowFilter === "other-shows") {
          if (selectedOtherShow) {
            const selectedOtherName = selectedOtherShow.showName.toLowerCase();
            const selectedOtherAcronym = selectedOtherShow.acronym?.toUpperCase() ?? null;
            const matchesSelectedById = Boolean(
              selectedOtherShow.showId && metaShowId === selectedOtherShow.showId
            );
            const matchesSelectedByName =
              textLower.includes(selectedOtherName) ||
              Boolean(metadataShowName?.includes(selectedOtherName));
            const matchesSelectedByAcronym = selectedOtherAcronym
              ? acronyms.has(selectedOtherAcronym) || metadataShowAcronym === selectedOtherAcronym
              : false;
            return matchesSelectedById || matchesSelectedByName || matchesSelectedByAcronym;
          }
          return (
            ((!metaShowIdMatches && Boolean(metaShowId)) && !matchesWwhl) ||
            matchesOtherShowName ||
            matchesOtherShowAcronym ||
            metadataMatchesOtherShow
          );
        }
        return true;
      });
    }

    // Apply sources filter (OR within category)
    if (advancedFilters.sources.length > 0) {
      result = result.filter((p) => advancedFilters.sources.includes(p.source));
    }

    // Apply text overlay filter (if exactly one of TEXT/NO TEXT is selected)
    const wantsText = advancedFilters.text.includes("text");
    const wantsNoText = advancedFilters.text.includes("no_text");
    const textFilterActive = wantsText !== wantsNoText;
    if (textFilterActive) {
      result = result.filter((photo) => {
        const v = inferHasTextOverlay(photo.metadata ?? null);
        if (v === null) return false;
        return wantsText ? v === true : v === false;
      });
    }

    // Apply SOLO/GROUP filter (if exactly one is selected)
    const wantsSolo = advancedFilters.people.includes("solo");
    const wantsGroup = advancedFilters.people.includes("group");
    const peopleFilterActive = wantsSolo !== wantsGroup;
    if (peopleFilterActive) {
      result = result.filter((photo) => {
        const count = inferPeopleCountForPersonPhoto(photo);
        if (count === null) return false;
        return wantsSolo ? count <= 1 : count >= 2;
      });
    }

    // Apply seeded filter (if exactly one is selected)
    const wantsSeeded = advancedFilters.seeded.includes("seeded");
    const wantsNotSeeded = advancedFilters.seeded.includes("not_seeded");
    const seededFilterActive = wantsSeeded !== wantsNotSeeded;
    if (seededFilterActive) {
      result = result.filter((photo) =>
        wantsSeeded ? Boolean(photo.facebank_seed) : !Boolean(photo.facebank_seed)
      );
    }

    // Apply content type filter
    if (advancedFilters.contentTypes.length > 0) {
      result = result.filter((photo) =>
        matchesContentTypesForPersonPhoto(photo, advancedFilters.contentTypes)
      );
    }

    // Apply sort
    switch (advancedFilters.sort as GallerySortOption) {
      case "newest":
        result.sort((a, b) => getPhotoSortDate(b) - getPhotoSortDate(a));
        break;
      case "oldest":
        result.sort((a, b) => getPhotoSortDate(a) - getPhotoSortDate(b));
        break;
      case "season-asc":
        result.sort((a, b) => {
          const seasonA = typeof a.season === "number" ? a.season : null;
          const seasonB = typeof b.season === "number" ? b.season : null;
          if (seasonA === null && seasonB === null) {
            return getPhotoSortDate(b) - getPhotoSortDate(a);
          }
          if (seasonA === null) return 1;
          if (seasonB === null) return -1;
          if (seasonA !== seasonB) return seasonA - seasonB;
          return getPhotoSortDate(b) - getPhotoSortDate(a);
        });
        break;
      case "season-desc":
        result.sort((a, b) => {
          const seasonA = typeof a.season === "number" ? a.season : null;
          const seasonB = typeof b.season === "number" ? b.season : null;
          if (seasonA === null && seasonB === null) {
            return getPhotoSortDate(b) - getPhotoSortDate(a);
          }
          if (seasonA === null) return 1;
          if (seasonB === null) return -1;
          if (seasonA !== seasonB) return seasonB - seasonA;
          return getPhotoSortDate(b) - getPhotoSortDate(a);
        });
        break;
      case "source":
        result.sort((a, b) => (a.source || "").localeCompare(b.source || ""));
        break;
    }

    return result;
  }, [
    photos,
    galleryShowFilter,
    advancedFilters.sources,
    advancedFilters.text,
    advancedFilters.people,
    advancedFilters.contentTypes,
    advancedFilters.seeded,
    advancedFilters.sort,
    showIdParam,
    activeShowName,
    activeShowAcronym,
    otherShowNameMatches,
    otherShowAcronymMatches,
    selectedOtherShow,
    getPhotoSortDate,
  ]);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    if (!showIdParam || !hasAccess) {
      setSeasonPremiereMap({});
      return;
    }

    let cancelled = false;

    const loadSeasonPremieres = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          if (!cancelled) {
            setSeasonPremiereMap({});
          }
          return;
        }
        const response = await fetch(
          `/api/admin/trr-api/shows/${showIdParam}/seasons?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Failed to fetch seasons");
        const data = await response.json();
        const nextMap: Record<number, string> = {};
        for (const season of (data.seasons ?? []) as Array<{
          season_number: number;
          premiere_date?: string | null;
          air_date?: string | null;
        }>) {
          const date = season.premiere_date ?? season.air_date ?? null;
          if (date && Number.isFinite(season.season_number)) {
            nextMap[season.season_number] = date;
          }
        }
        if (!cancelled) {
          setSeasonPremiereMap(nextMap);
        }
      } catch (err) {
        console.error("Failed to fetch season premiere dates:", err);
        if (!cancelled) {
          setSeasonPremiereMap({});
        }
      }
    };

    loadSeasonPremieres();
    return () => {
      cancelled = true;
    };
  }, [showIdParam, hasAccess]);

  // Fetch person details
  const fetchPerson = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/people/${personId}`, { headers });
      if (!response.ok) throw new Error("Failed to fetch person");
      const data = await response.json();
      setPerson(data.person);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load person");
    }
  }, [personId, getAuthHeaders]);

  // Fetch photos
  const fetchPhotos = useCallback(async (): Promise<TrrPersonPhoto[]> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/photos?limit=500`,
        { headers }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || "Failed to fetch photos";
        throw new Error(message);
      }
      const fetchedPhotos = Array.isArray(data.photos)
        ? (data.photos as TrrPersonPhoto[])
        : [];
      setPhotos(fetchedPhotos);
      setPhotosError(null);
      return fetchedPhotos;
    } catch (err) {
      console.error("Failed to fetch photos:", err);
      setPhotosError(err instanceof Error ? err.message : "Failed to fetch photos");
      return [];
    }
  }, [personId, getAuthHeaders]);

  const detectTextOverlayForUnknown = useCallback(async () => {
    // Best-effort batch for the current gallery set (capped to reduce cost).
    const targets = photos
      .filter(
        (p) =>
          inferHasTextOverlay(p.metadata ?? null) === null
      )
      .slice(0, 25);
    if (targets.length === 0) return;

    setTextOverlayDetectError(null);
    const headers = await getAuthHeaders();
    for (const photo of targets) {
      try {
        if (photo.origin === "media_links") {
          const assetId = photo.media_asset_id;
          if (!assetId) continue;
          const response = await fetch(`/api/admin/trr-api/media-assets/${assetId}/detect-text-overlay`, {
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
        } else {
          const response = await fetch(`/api/admin/trr-api/cast-photos/${photo.id}/detect-text-overlay`, {
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
        }
      } catch (err) {
        setTextOverlayDetectError(
          err instanceof Error ? err.message : "Detect text overlay failed"
        );
        break;
      }
    }

    await fetchPhotos();
  }, [photos, getAuthHeaders, fetchPhotos]);

  // Fetch credits
  const fetchCredits = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/credits?limit=50`,
        { headers }
      );
      if (!response.ok) throw new Error("Failed to fetch credits");
      const data = await response.json();
      setCredits(data.credits);
    } catch (err) {
      console.error("Failed to fetch credits:", err);
    }
  }, [personId, getAuthHeaders]);

  // Fetch cover photo
  const fetchCoverPhoto = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/cover-photo`,
        { headers }
      );
      if (!response.ok) return;
      const data = await response.json();
      setCoverPhoto(data.coverPhoto);
    } catch (err) {
      console.error("Failed to fetch cover photo:", err);
    }
  }, [personId, getAuthHeaders]);

  // Fetch fandom data
  const fetchFandomData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/fandom`,
        { headers }
      );
      if (!response.ok) return;
      const data = await response.json();
      setFandomData(data.fandomData ?? []);
    } catch (err) {
      console.error("Failed to fetch fandom data:", err);
    }
  }, [personId, getAuthHeaders]);

  // Set cover photo
  const handleSetCover = async (photo: TrrPersonPhoto) => {
    if (!photo.hosted_url) return;
    setSettingCover(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/cover-photo`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            photo_id: photo.id,
            photo_url: photo.hosted_url,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCoverPhoto(data.coverPhoto);
      }
    } catch (err) {
      console.error("Failed to set cover photo:", err);
    } finally {
      setSettingCover(false);
    }
  };

  const handleTagsUpdated = useCallback(
    (payload: {
      mediaAssetId: string | null;
      castPhotoId: string | null;
      peopleNames: string[];
      peopleIds: string[];
      peopleCount: number | null;
      peopleCountSource: "auto" | "manual" | null;
    }) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          payload.mediaAssetId && photo.media_asset_id === payload.mediaAssetId
            ? {
                ...photo,
                people_names: payload.peopleNames,
                people_ids: payload.peopleIds,
                people_count: payload.peopleCount,
                people_count_source: payload.peopleCountSource,
              }
            : payload.castPhotoId && photo.id === payload.castPhotoId
              ? {
                  ...photo,
                  people_names: payload.peopleNames,
                  people_ids: payload.peopleIds,
                  people_count: payload.peopleCount,
                  people_count_source: payload.peopleCountSource,
                }
              : photo
        )
      );
      setLightboxPhoto((prev) => {
        if (!prev) return prev;
        if (
          payload.mediaAssetId &&
          prev.photo.media_asset_id === payload.mediaAssetId
        ) {
          return {
            ...prev,
            photo: {
              ...prev.photo,
              people_names: payload.peopleNames,
              people_ids: payload.peopleIds,
              people_count: payload.peopleCount,
              people_count_source: payload.peopleCountSource,
            },
          };
        }
        if (payload.castPhotoId && prev.photo.id === payload.castPhotoId) {
          return {
            ...prev,
            photo: {
              ...prev.photo,
              people_names: payload.peopleNames,
              people_ids: payload.peopleIds,
              people_count: payload.peopleCount,
              people_count_source: payload.peopleCountSource,
            },
          };
        }
        return prev;
      });
    },
    []
  );

  const handleMirrorUpdated = useCallback(
    (payload: { mediaAssetId: string | null; castPhotoId: string | null; hostedUrl: string }) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          payload.mediaAssetId && photo.media_asset_id === payload.mediaAssetId
            ? { ...photo, hosted_url: payload.hostedUrl }
            : payload.castPhotoId && photo.id === payload.castPhotoId
              ? { ...photo, hosted_url: payload.hostedUrl }
            : photo
        )
      );
      setLightboxPhoto((prev) => {
        if (!prev) return prev;
        if (payload.mediaAssetId && prev.photo.media_asset_id === payload.mediaAssetId) {
          return {
            ...prev,
            photo: { ...prev.photo, hosted_url: payload.hostedUrl },
          };
        }
        if (payload.castPhotoId && prev.photo.id === payload.castPhotoId) {
          return {
            ...prev,
            photo: { ...prev.photo, hosted_url: payload.hostedUrl },
          };
        }
        return prev;
      });
    },
    []
  );

  const handleFacebankSeedUpdated = useCallback(
    (payload: { linkId: string; facebankSeed: boolean }) => {
      setPhotos((prev) => applyFacebankSeedUpdateToPhotos(prev, payload));
      setLightboxPhoto((prev) => applyFacebankSeedUpdateToLightbox(prev, payload));
    },
    []
  );

  const runPhotoMetadataJob = useCallback(
    async (endpoint: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorText =
          typeof data.error === "string" ? data.error : "Job failed";
        const detailText = typeof data.detail === "string" ? data.detail : null;
        throw new Error(detailText ? `${errorText}: ${detailText}` : errorText);
      }
      return data;
    },
    [getAuthHeaders]
  );

  const handleRefreshLightboxPhotoMetadata = useCallback(
    async (photo: TrrPersonPhoto) => {
      const errors: string[] = [];

      if (photo.origin === "media_links") {
        if (!photo.media_asset_id) {
          throw new Error("Cannot refresh jobs: media asset id is missing");
        }
        const jobs = [
          {
            label: "People count",
            endpoint: `/api/admin/trr-api/media-assets/${photo.media_asset_id}/auto-count`,
          },
          {
            label: "Text overlay",
            endpoint: `/api/admin/trr-api/media-assets/${photo.media_asset_id}/detect-text-overlay`,
          },
        ];
        for (const job of jobs) {
          try {
            await runPhotoMetadataJob(job.endpoint);
          } catch (error) {
            errors.push(
              `${job.label}: ${error instanceof Error ? error.message : "failed"}`
            );
          }
        }
      } else {
        const jobs = [
          {
            label: "People count",
            endpoint: `/api/admin/trr-api/cast-photos/${photo.id}/auto-count`,
          },
          {
            label: "Text overlay",
            endpoint: `/api/admin/trr-api/cast-photos/${photo.id}/detect-text-overlay`,
          },
        ];
        for (const job of jobs) {
          try {
            await runPhotoMetadataJob(job.endpoint);
          } catch (error) {
            errors.push(
              `${job.label}: ${error instanceof Error ? error.message : "failed"}`
            );
          }
        }
      }

      const refreshedPhotos = await fetchPhotos();
      const refreshedPhoto = refreshedPhotos.find((candidate) => candidate.id === photo.id) ?? null;
      if (refreshedPhoto) {
        setThumbnailCropPreview(buildThumbnailCropPreview(refreshedPhoto));
      }
      setLightboxPhoto((prev) => {
        if (!prev || !refreshedPhoto) return prev;
        if (prev.photo.id !== refreshedPhoto.id) return prev;
        return { ...prev, photo: refreshedPhoto };
      });

      if (errors.length > 0) {
        throw new Error(errors.join(" | "));
      }

      setRefreshNotice("Photo metadata refreshed.");
      setRefreshError(null);
    },
    [fetchPhotos, runPhotoMetadataJob]
  );

  const handleRefreshAutoThumbnailCrop = useCallback(
    async (photo: TrrPersonPhoto) => {
      const endpoint =
        photo.origin === "media_links"
          ? photo.media_asset_id
            ? `/api/admin/trr-api/media-assets/${photo.media_asset_id}/auto-count`
            : null
          : `/api/admin/trr-api/cast-photos/${photo.id}/auto-count`;

      if (!endpoint) {
        throw new Error("Cannot refresh auto crop: media asset id is missing");
      }

      await runPhotoMetadataJob(endpoint);

      const refreshedPhotos = await fetchPhotos();
      const refreshedPhoto = refreshedPhotos.find((candidate) => candidate.id === photo.id) ?? null;
      if (!refreshedPhoto) return;

      setThumbnailCropPreview(buildThumbnailCropPreview(refreshedPhoto));
      setLightboxPhoto((prev) => {
        if (!prev) return prev;
        if (prev.photo.id !== refreshedPhoto.id) return prev;
        return { ...prev, photo: refreshedPhoto };
      });
      setRefreshNotice("Auto thumbnail crop refreshed.");
      setRefreshError(null);
    },
    [fetchPhotos, runPhotoMetadataJob],
  );

  const handleThumbnailCropUpdated = useCallback(
    (payload: {
      origin: "cast_photos" | "media_links";
      photoId: string;
      linkId: string | null;
      thumbnailFocusX: number | null;
      thumbnailFocusY: number | null;
      thumbnailZoom: number | null;
      thumbnailCropMode: "manual" | "auto" | null;
    }) => {
      setPhotos((prev) => applyThumbnailCropUpdateToPhotos(prev, payload));
      setLightboxPhoto((prev) => applyThumbnailCropUpdateToLightbox(prev, payload));
    },
    []
  );

  const handleRefreshImages = useCallback(async () => {
    if (refreshingImages || reprocessingImages) return;

    setRefreshingImages(true);
    setRefreshProgress({
      phase: PERSON_REFRESH_PHASES.syncing,
      message: "Syncing person images...",
      detailMessage: "Syncing person images...",
      current: null,
      total: null,
      rawStage: "syncing",
      runId: null,
      lastEventAt: Date.now(),
    });
    setRefreshNotice(null);
    setRefreshError(null);
    setPhotosError(null);

    try {
      const runStreamAttempt = async () => {
        const syncProgressTracker = createSyncProgressTracker();
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/people/${personId}/refresh-images/stream`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              skip_mirror: false,
              force_mirror: true,
              limit_per_source: 200,
              show_id: showIdParam ?? undefined,
              show_name: activeShowName ?? undefined,
            }),
          }
        );

        if (!response.ok || !response.body) {
          const data = await response.json().catch(() => ({}));
          const message =
            data.error && data.detail
              ? `${data.error}: ${data.detail}`
              : data.error || "Failed to refresh images";
          throw new Error(message);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let sawComplete = false;
        let lastEventAt = Date.now();
        const staleInterval = setInterval(() => {
          const now = Date.now();
          if (now - lastEventAt < 12000) return;
          setRefreshProgress((prev) => {
            if (!prev) return prev;
            const stageLabel = formatPersonRefreshPhaseLabel(prev.rawStage ?? prev.phase) ?? "WORKING";
            return {
              ...prev,
              detailMessage: `Still running: ${stageLabel}`,
              lastEventAt: now,
            };
          });
          lastEventAt = now;
        }, 2000);

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            lastEventAt = Date.now();
            buffer += decoder.decode(value, { stream: true });
            // Normalize CRLF to LF so "\n\n" boundary splitting works in all runtimes.
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
                const rawStage =
                  typeof (payload as { stage?: unknown }).stage === "string"
                    ? ((payload as { stage: string }).stage)
                    : typeof (payload as { phase?: unknown }).phase === "string"
                      ? ((payload as { phase: string }).phase)
                      : null;
                const mappedPhase = mapPersonRefreshStage(rawStage);
                const message =
                  typeof (payload as { message?: unknown }).message === "string"
                    ? ((payload as { message: string }).message)
                    : null;
                const runId =
                  typeof (payload as { run_id?: unknown }).run_id === "string"
                    ? ((payload as { run_id: string }).run_id)
                    : null;
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
                const numericCurrent =
                  typeof current === "number" && Number.isFinite(current) ? current : null;
                const numericTotal =
                  typeof total === "number" && Number.isFinite(total) ? total : null;
                const syncCounts =
                  mappedPhase === PERSON_REFRESH_PHASES.syncing
                    ? updateSyncProgressTracker(syncProgressTracker, {
                        rawStage,
                        message,
                        current: numericCurrent,
                        total: numericTotal,
                      })
                    : null;
                setRefreshProgress({
                  current: syncCounts?.current ?? numericCurrent,
                  total: syncCounts?.total ?? numericTotal,
                  phase: mappedPhase ?? rawStage,
                  rawStage,
                  message,
                  detailMessage: message,
                  runId,
                  lastEventAt: Date.now(),
                });
              } else if (eventType === "complete") {
                sawComplete = true;
                const summary = payload && typeof payload === "object" && "summary" in payload
                  ? (payload as { summary?: unknown }).summary
                  : payload;
                const summaryText = formatRefreshSummary(summary);
                setRefreshNotice(summaryText || "Images refreshed.");
              } else if (eventType === "error") {
                const errorPayload =
                  payload && typeof payload === "object"
                    ? (payload as { stage?: string; error?: string; detail?: string })
                    : null;
                const stage = errorPayload?.stage ? `[${errorPayload.stage}] ` : "";
                const errorText =
                  errorPayload?.error && errorPayload?.detail
                    ? `${stage}${errorPayload.error}: ${errorPayload.detail}`
                    : `${stage}${errorPayload?.error || "Failed to refresh images"}`;
                throw new Error(errorText);
              }

              boundaryIndex = buffer.indexOf("\n\n");
            }
          }
        } finally {
          clearInterval(staleInterval);
        }

        if (!sawComplete) {
          throw new Error("Refresh stream ended before completion.");
        }
      };

      let streamError: string | null = null;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          await runStreamAttempt();
          streamError = null;
          break;
        } catch (streamErr) {
          streamError = streamErr instanceof Error ? streamErr.message : String(streamErr);
          if (attempt < 2) {
            setRefreshProgress((prev) =>
              prev
                ? {
                    ...prev,
                    detailMessage: `Stream disconnected, retrying... (${streamError})`,
                    lastEventAt: Date.now(),
                  }
                : prev
            );
            continue;
          }
        }
      }
      if (streamError) {
        throw new Error(`Stream refresh failed: ${streamError}`);
      }

      await Promise.all([
        fetchPerson(),
        fetchCredits(),
        fetchFandomData(),
        fetchPhotos(),
        fetchCoverPhoto(),
      ]);
    } catch (err) {
      console.error("Failed to refresh images:", err);
      setRefreshError(
        err instanceof Error ? err.message : "Failed to refresh images"
      );
    } finally {
      setRefreshingImages(false);
      setRefreshProgress(null);
    }
  }, [
    refreshingImages,
    reprocessingImages,
    fetchPerson,
    fetchCredits,
    fetchFandomData,
    fetchPhotos,
    fetchCoverPhoto,
    getAuthHeaders,
    personId,
    showIdParam,
    activeShowName,
  ]);

  const handleReprocessImages = useCallback(async () => {
    if (refreshingImages || reprocessingImages) return;

    setReprocessingImages(true);
    setRefreshProgress({
      phase: PERSON_REFRESH_PHASES.counting,
      message: "Reprocessing existing images...",
      current: null,
      total: null,
    });
    setRefreshNotice(null);
    setRefreshError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/reprocess-images/stream`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: "{}",
        }
      );

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || "Failed to reprocess images";
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hadError = false;
      let sawComplete = false;

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
            const rawPhase =
              typeof (payload as { stage?: unknown }).stage === "string"
                ? ((payload as { stage: string }).stage)
                : null;
            const mappedPhase = mapPersonRefreshStage(rawPhase);
            const message =
              typeof (payload as { message?: unknown }).message === "string"
                ? ((payload as { message: string }).message)
                : null;
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
            const numericCurrent =
              typeof current === "number" && Number.isFinite(current) ? current : null;
            const numericTotal =
              typeof total === "number" && Number.isFinite(total) ? total : null;
            setRefreshProgress({
              current: numericCurrent,
              total: numericTotal,
              phase: mappedPhase ?? rawPhase,
              message,
            });
          } else if (eventType === "complete") {
            sawComplete = true;
            const summary = payload && typeof payload === "object" && "summary" in payload
              ? (payload as { summary?: unknown }).summary
              : payload;
            const summaryText = formatRefreshSummary(summary);
            setRefreshNotice(summaryText || "Reprocessing complete.");
          } else if (eventType === "error") {
            hadError = true;
            const message =
              payload && typeof payload === "object"
                ? (payload as { error?: string; detail?: string })
                : null;
            const errorText =
              message?.error && message?.detail
                ? `${message.error}: ${message.detail}`
                : message?.error || "Failed to reprocess images";
            setRefreshError(errorText);
          }

          boundaryIndex = buffer.indexOf("\n\n");
        }
      }

      if (!sawComplete && !hadError) {
        setRefreshNotice("Reprocessing complete.");
      }

      // Reload photos to show updated crops/counts
      await fetchPhotos();
    } catch (err) {
      console.error("Failed to reprocess images:", err);
      setRefreshError(
        err instanceof Error ? err.message : "Failed to reprocess images"
      );
    } finally {
      setReprocessingImages(false);
      setRefreshProgress(null);
    }
  }, [
    refreshingImages,
    reprocessingImages,
    fetchPhotos,
    getAuthHeaders,
    personId,
  ]);

  // Initial load
  useEffect(() => {
    if (!hasAccess) return;

    const loadData = async () => {
      setLoading(true);
      await fetchPerson();
      await Promise.all([fetchPhotos(), fetchCredits(), fetchCoverPhoto(), fetchFandomData()]);
      setLoading(false);
    };

    loadData();
  }, [hasAccess, fetchPerson, fetchPhotos, fetchCredits, fetchCoverPhoto, fetchFandomData]);

  // Open lightbox with photo, index, and trigger element for focus restoration
  const openLightbox = (
    photo: TrrPersonPhoto,
    index: number,
    triggerElement: HTMLElement
  ) => {
    lightboxTriggerRef.current = triggerElement;
    setThumbnailCropPreview(buildThumbnailCropPreview(photo));
    setThumbnailCropOverlayUpdate(null);
    setLightboxPhoto({ photo, index });
    setLightboxOpen(true);
  };

  // Navigate between photos in lightbox (uses filteredPhotos)
  const navigateLightbox = (direction: "prev" | "next") => {
    if (!lightboxPhoto) return;
    const newIndex =
      direction === "prev" ? lightboxPhoto.index - 1 : lightboxPhoto.index + 1;
    if (newIndex >= 0 && newIndex < filteredPhotos.length) {
      const nextPhoto = filteredPhotos[newIndex];
      setThumbnailCropPreview(buildThumbnailCropPreview(nextPhoto));
      setThumbnailCropOverlayUpdate(null);
      setLightboxPhoto({ photo: nextPhoto, index: newIndex });
    }
  };

  // Close lightbox and clean up state
  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxPhoto(null);
    setThumbnailCropPreview(null);
    setThumbnailCropOverlayUpdate(null);
  };

  const handleThumbnailCropOverlayAdjust = useCallback(
    (nextPreview: ThumbnailCropPreview) => {
      if (!lightboxPhoto) return;
      setThumbnailCropPreview(nextPreview);
      setThumbnailCropOverlayUpdate({
        ...nextPreview,
        photoId: lightboxPhoto.photo.id,
        nonce: Date.now(),
      });
    },
    [lightboxPhoto],
  );

  const archiveGalleryPhoto = useCallback(
    async (photo: TrrPersonPhoto) => {
      const origin = photo.origin === "cast_photos" ? "cast_photos" : "media_assets";
      const assetId =
        photo.origin === "cast_photos" ? photo.id : photo.media_asset_id ?? null;
      if (!assetId) throw new Error("Cannot archive: missing asset id");

      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/trr-api/assets/archive", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ origin, asset_id: assetId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail
            ? `${data.error}: ${data.detail}`
            : data?.detail || data?.error || "Archive failed";
        throw new Error(message);
      }

      // Hide immediately; backend clears hosted_url as well.
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      closeLightbox();
    },
    [getAuthHeaders]
  );

  const toggleStarGalleryPhoto = useCallback(
    async (photo: TrrPersonPhoto, starred: boolean) => {
      const origin = photo.origin === "cast_photos" ? "cast_photos" : "media_assets";
      const assetId =
        photo.origin === "cast_photos" ? photo.id : photo.media_asset_id ?? null;
      if (!assetId) throw new Error("Cannot star: missing asset id");

      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/trr-api/assets/star", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ origin, asset_id: assetId, starred }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data?.error && data?.detail
            ? `${data.error}: ${data.detail}`
            : data?.detail || data?.error || "Star failed";
        throw new Error(message);
      }

      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== photo.id) return p;
          const meta =
            p.metadata && typeof p.metadata === "object"
              ? { ...(p.metadata as Record<string, unknown>) }
              : {};
          meta.starred = starred;
          if (starred) meta.starred_at = new Date().toISOString();
          else delete meta.starred_at;
          return { ...p, metadata: meta };
        })
      );
    },
    [getAuthHeaders]
  );

  // Get primary photo - use cover photo if set, otherwise first hosted photo
  const primaryPhotoUrl = coverPhoto?.photo_url || photos.find(p => p.hosted_url)?.hosted_url;

  // Extract external IDs - database uses 'imdb'/'tmdb' keys, not 'imdb_id'/'tmdb_id'
  const rawExternalIds = person?.external_ids as {
    imdb?: string;
    tmdb?: number;
    tvdb?: number;
  } | undefined;
  const externalIds = rawExternalIds ? {
    imdb_id: rawExternalIds.imdb,
    tmdb_id: rawExternalIds.tmdb,
    tvdb_id: rawExternalIds.tvdb,
  } : undefined;

  const canonical = useMemo(() => {
    return {
      birthday: resolveMultiSourceField(person?.birthday),
      gender: resolveMultiSourceField(person?.gender),
      biography: resolveMultiSourceField(person?.biography),
      placeOfBirth: resolveMultiSourceField(person?.place_of_birth),
      homepage: resolveMultiSourceField(person?.homepage),
      profileImageUrl: resolveMultiSourceField(person?.profile_image_url),
    };
  }, [person]);

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
          <p className="text-sm text-zinc-600">Loading person data...</p>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">
            {error || "Person not found"}
          </p>
          <Link
            href={backHref as "/admin/trr-shows"}
            className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <header className="border-b border-zinc-200 bg-white px-6 py-5">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <Link
                href={backHref as "/admin/trr-shows"}
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                {backLabel}
              </Link>
            </div>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Profile Photo */}
              <ProfilePhoto url={primaryPhotoUrl} name={person.full_name} />

              {/* Person Info */}
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Person
                </p>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-zinc-900">
                    {person.full_name}
                  </h1>
                  {/* External links */}
                  <div className="flex items-center gap-2">
                    <TmdbLinkIcon tmdbId={externalIds?.tmdb_id} type="person" />
                    <ImdbLinkIcon imdbId={externalIds?.imdb_id} type="person" />
                  </div>
                </div>
                {person.known_for && (
                  <p className="mt-2 text-sm text-zinc-600">
                    Known for: {person.known_for}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {photos.length} photos
                  </span>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {credits.length} credits
                  </span>
                </div>
                {photosError && (
                  <div className="mt-2">
                    <p className="text-xs text-red-600">{photosError}</p>
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
                  { id: "overview", label: "Overview" },
                  { id: "gallery", label: `Gallery (${photos.length})` },
                  { id: "credits", label: `Credits (${credits.length})` },
                  { id: "fandom", label: fandomData.length > 0 ? `Fandom (${fandomData.length})` : "Fandom" },
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
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* External IDs */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-zinc-900">
                  External IDs
                </h3>
                <ExternalLinks
                  externalIds={person.external_ids}
                  type="person"
                  className="bg-zinc-50 rounded-lg p-4"
                />
                {Object.keys(person.external_ids || {}).length === 0 && (
                  <p className="text-sm text-zinc-500">No external IDs available.</p>
                )}
              </div>

              {/* Recent Photos Preview */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-900">Photos</h3>
                  {photos.length > 6 && (
                    <button
                      onClick={() => setActiveTab("gallery")}
                      className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      View all →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.slice(0, 6).map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={(e) => openLightbox(photo, index, e.currentTarget)}
                      className="relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <GalleryPhoto
                        photo={photo}
                        onClick={() => {}}
                      />
                    </button>
                  ))}
                </div>
                {photos.length === 0 && (
                  <p className="text-sm text-zinc-500">No photos available.</p>
                )}
              </div>

              {/* Canonical Profile (multi-source fields on core.people) */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="text-lg font-bold text-zinc-900">Canonical Profile</h3>
                  <span className="text-xs text-zinc-400">
                    Source order: tmdb → fandom → manual
                  </span>
                </div>

                {(() => {
                  const rows: Array<{ label: string; field: ResolvedField; isLink: boolean }> = [
                    { label: "Birthday", field: canonical.birthday, isLink: false },
                    { label: "Gender", field: canonical.gender, isLink: false },
                    { label: "Place of Birth", field: canonical.placeOfBirth, isLink: false },
                    { label: "Homepage", field: canonical.homepage, isLink: true },
                    { label: "Profile Image URL", field: canonical.profileImageUrl, isLink: true },
                  ];

                  const hasAny =
                    rows.some((r) => Boolean(r.field.value)) ||
                    Boolean(canonical.biography.value);

                  if (!hasAny) {
                    return (
                      <p className="text-sm text-zinc-500">
                        No canonical fields available yet.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {rows.map(({ label, field, isLink }) => (
                          <div
                            key={label}
                            className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                                  {label}
                                </p>
                                {field.value ? (
                                  isLink ? (
                                    <a
                                      href={field.value}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 block break-words text-sm font-medium text-blue-700 hover:text-blue-900"
                                    >
                                      {field.value}
                                    </a>
                                  ) : (
                                    <p className="mt-1 break-words text-sm text-zinc-900">
                                      {field.value}
                                    </p>
                                  )
                                ) : (
                                  <p className="mt-1 text-sm text-zinc-500">—</p>
                                )}
                              </div>
                              {field.source && (
                                <span className="flex-shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                                  {field.source}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {canonical.biography.value && (
                        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                              Biography
                            </p>
                            {canonical.biography.source && (
                              <span className="flex-shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                                {canonical.biography.source}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
                            {canonical.biography.value}
                          </p>
                        </div>
                      )}

                      <details className="rounded-xl border border-zinc-200 bg-white p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
                          Raw Sources
                        </summary>
                        <pre className="mt-3 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100">
                          {JSON.stringify(
                            {
                              birthday: person.birthday ?? {},
                              gender: person.gender ?? {},
                              biography: person.biography ?? {},
                              place_of_birth: person.place_of_birth ?? {},
                              homepage: person.homepage ?? {},
                              profile_image_url: person.profile_image_url ?? {},
                            },
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    </div>
                  );
                })()}
              </div>

              {/* Credits Preview */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-900">Show Credits</h3>
                  {credits.length > 5 && (
                    <button
                      onClick={() => setActiveTab("credits")}
                      className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      View all →
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {credits.slice(0, 5).map((credit) => (
                    <Link
                      key={credit.id}
                      href={`/admin/trr-shows/${credit.show_id}`}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 transition hover:bg-zinc-100"
                    >
                      <div>
                        <p className="font-semibold text-zinc-900">
                          {credit.show_name || "Unknown Show"}
                        </p>
                        {credit.role && (
                          <p className="text-sm text-zinc-600">{credit.role}</p>
                        )}
                      </div>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                        {credit.credit_category}
                      </span>
                    </Link>
                  ))}
                </div>
                {credits.length === 0 && (
                  <p className="text-sm text-zinc-500">No credits available.</p>
                )}
              </div>

              {/* Fandom Preview */}
              {fandomData.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-900">Fandom Info</h3>
                    <button
                      onClick={() => setActiveTab("fandom")}
                      className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      View all →
                    </button>
                  </div>
                  {fandomData[0]?.summary && (
                    <p className="text-sm text-zinc-600 mb-4 line-clamp-3">
                      {fandomData[0].summary}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {fandomData[0]?.resides_in && (
                      <div>
                        <span className="text-zinc-500">Lives in:</span>{" "}
                        <span className="text-zinc-900">{fandomData[0].resides_in}</span>
                      </div>
                    )}
                    {fandomData[0]?.birthdate_display && (
                      <div>
                        <span className="text-zinc-500">Birthday:</span>{" "}
                        <span className="text-zinc-900">{fandomData[0].birthdate_display}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === "gallery" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Photo Gallery
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    {person.full_name}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleRefreshImages}
                    disabled={refreshingImages || reprocessingImages}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-4M4 16a8 8 0 0014 4" />
                    </svg>
                    {refreshingImages ? "Refreshing..." : "Refresh Images"}
                  </button>
                  <button
                    onClick={handleReprocessImages}
                    disabled={refreshingImages || reprocessingImages}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {reprocessingImages ? "Processing..." : "Count & Crop"}
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
              <div className="mb-4 space-y-2">
                <RefreshProgressBar
                  show={refreshingImages || reprocessingImages}
                  phase={refreshProgress?.phase}
                  message={refreshProgress?.detailMessage ?? refreshProgress?.message}
                  current={refreshProgress?.current}
                  total={refreshProgress?.total}
                />
                {refreshError && (
                  <p className="text-xs text-red-600">{refreshError}</p>
                )}
                {refreshNotice && !refreshError && (
                  <p className="text-xs text-zinc-500">{refreshNotice}</p>
                )}
              </div>

              {showIdParam && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Media View
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGalleryShowFilter("this-show")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        galleryShowFilter === "this-show"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {activeShowFilterLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryShowFilter("wwhl")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        galleryShowFilter === "wwhl"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {WWHL_LABEL}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryShowFilter("other-shows")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        galleryShowFilter === "other-shows"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      Other Shows
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryShowFilter("all")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        galleryShowFilter === "all"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      All Media
                    </button>
                  </div>
                  {galleryShowFilter === "other-shows" && (
                    <select
                      value={selectedOtherShowKey}
                      onChange={(event) => {
                        setSelectedOtherShowKey(event.target.value);
                        setGalleryShowFilter("other-shows");
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700"
                    >
                      <option value="all">All Other Shows & Events</option>
                      {otherShowOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.acronym ? `${option.showName} (${option.acronym})` : option.showName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-500">
                  Showing {filteredPhotos.length} of {photos.length} photos
                </p>
              </div>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => openLightbox(photo, index, e.currentTarget as HTMLElement)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openLightbox(photo, index, e.currentTarget as HTMLElement);
                      }
                    }}
                    className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <GalleryPhoto
                      photo={photo}
                      onClick={() => {}}
                      isCover={coverPhoto?.photo_id === photo.id}
                      onSetCover={photo.hosted_url ? () => handleSetCover(photo) : undefined}
                      settingCover={settingCover}
                    />
                    {/* Overlay with source info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      <p className="text-xs text-white truncate">
                        {photo.source}
                        {photo.season && ` • S${photo.season}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {filteredPhotos.length === 0 && photos.length > 0 && (
                <p className="text-sm text-zinc-500">
                  No photos match the current filter.
                </p>
              )}
              {photos.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No photos available for this person.
                </p>
              )}
            </div>
          )}

          {/* Credits Tab */}
          {activeTab === "credits" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Show Credits
                </p>
                <h3 className="text-xl font-bold text-zinc-900">
                  {person.full_name}
                </h3>
              </div>
              <div className="space-y-3">
                {credits.map((credit) => (
                  <Link
                    key={credit.id}
                    href={`/admin/trr-shows/${credit.show_id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 transition hover:bg-zinc-100"
                  >
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {credit.show_name || "Unknown Show"}
                      </p>
                      {credit.role && (
                        <p className="text-sm text-zinc-600">{credit.role}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                        {credit.credit_category}
                      </span>
                      {credit.billing_order && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                          #{credit.billing_order}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {credits.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No credits available for this person.
                </p>
              )}
            </div>
          )}

          {/* Fandom Tab */}
          {activeTab === "fandom" && (
            <div className="space-y-6">
              {fandomData.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-zinc-500">
                    No Fandom/Wikia data available for this person.
                  </p>
                </div>
              ) : (
                fandomData.map((fandom) => (
                  <div key={fandom.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    {/* Source header with link */}
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                          {fandom.source}
                        </p>
                        <h3 className="text-xl font-bold text-zinc-900">
                          {fandom.page_title || fandom.full_name || "Fandom Profile"}
                        </h3>
                      </div>
                      {fandom.source_url && (
                        <a
                          href={fandom.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                        >
                          View on Fandom →
                        </a>
                      )}
                    </div>

                    {/* Summary */}
                    {fandom.summary && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Summary</h4>
                        <p className="text-sm text-zinc-600 leading-relaxed">{fandom.summary}</p>
                      </div>
                    )}

                    {/* Biographical Info Grid */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Personal Details */}
                      <FandomSection title="Personal Details">
                        <FandomField label="Full Name" value={fandom.full_name} />
                        <FandomField label="Birthday" value={fandom.birthdate_display} />
                        <FandomField label="Gender" value={fandom.gender} />
                        <FandomField label="Resides In" value={fandom.resides_in} />
                        <FandomField label="Hair Color" value={fandom.hair_color} />
                        <FandomField label="Eye Color" value={fandom.eye_color} />
                        <FandomField label="Height" value={fandom.height_display} />
                        <FandomField label="Weight" value={fandom.weight_display} />
                      </FandomSection>

                      {/* Show Info */}
                      <FandomSection title="Show Information">
                        <FandomField label="Installment" value={fandom.installment} />
                        <FandomField label="Seasons" value={fandom.main_seasons_display} />
                      </FandomSection>
                    </div>

                    {/* Relationships */}
                    {(fandom.romances?.length || fandom.family || fandom.friends || fandom.enemies) && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-zinc-700 mb-3">Relationships</h4>
                        <div className="grid gap-4 lg:grid-cols-2">
                          {fandom.romances && fandom.romances.length > 0 && (
                            <FandomList title="Romances" items={fandom.romances} />
                          )}
                          {fandom.family && Object.keys(fandom.family).length > 0 && (
                            <FandomJsonList title="Family" data={fandom.family} />
                          )}
                          {fandom.friends && Object.keys(fandom.friends).length > 0 && (
                            <FandomJsonList title="Friends" data={fandom.friends} />
                          )}
                          {fandom.enemies && Object.keys(fandom.enemies).length > 0 && (
                            <FandomJsonList title="Enemies" data={fandom.enemies} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Taglines */}
                    {fandom.taglines && Object.keys(fandom.taglines).length > 0 && (
                      <FandomTaglines taglines={fandom.taglines} />
                    )}

                    {/* Trivia */}
                    {fandom.trivia && (Array.isArray(fandom.trivia) ? fandom.trivia.length > 0 : Object.keys(fandom.trivia).length > 0) && (
                      <FandomTrivia trivia={fandom.trivia} />
                    )}

                    {/* Reunion Seating */}
                    {fandom.reunion_seating && Object.keys(fandom.reunion_seating).length > 0 && (
                      <FandomReunionSeating seating={fandom.reunion_seating} />
                    )}

                    {/* Scraped timestamp */}
                    <div className="mt-6 pt-4 border-t border-zinc-100">
                      <p className="text-xs text-zinc-400">
                        Last updated: {new Date(fandom.scraped_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* Lightbox with metadata and navigation */}
        {lightboxPhoto && (
          <ImageLightbox
            src={lightboxPhoto.photo.hosted_url || lightboxPhoto.photo.url || ""}
            fallbackSrc={
              lightboxPhoto.photo.hosted_url ? lightboxPhoto.photo.url : null
            }
            alt={lightboxPhoto.photo.caption || person.full_name}
            isOpen={lightboxOpen}
            onClose={closeLightbox}
            metadata={mapPhotoToMetadata(lightboxPhoto.photo)}
            canManage={true}
            isStarred={Boolean((lightboxPhoto.photo.metadata as Record<string, unknown> | null)?.starred)}
            onToggleStar={(starred) => toggleStarGalleryPhoto(lightboxPhoto.photo, starred)}
            onArchive={() => archiveGalleryPhoto(lightboxPhoto.photo)}
            metadataExtras={
              <TagPeoplePanel
                photo={lightboxPhoto.photo}
                defaultPersonTag={
                  person.full_name
                    ? { id: person.id, name: person.full_name }
                    : null
                }
                getAuthHeaders={getAuthHeaders}
                onTagsUpdated={handleTagsUpdated}
                onMirrorUpdated={handleMirrorUpdated}
                onFacebankSeedUpdated={handleFacebankSeedUpdated}
                onThumbnailCropUpdated={handleThumbnailCropUpdated}
                onThumbnailCropPreviewChange={setThumbnailCropPreview}
                externalThumbnailCropOverlayUpdate={thumbnailCropOverlayUpdate}
                onRefreshAutoThumbnailCrop={handleRefreshAutoThumbnailCrop}
              />
            }
            position={{ current: lightboxPhoto.index + 1, total: filteredPhotos.length }}
            onPrevious={() => navigateLightbox("prev")}
            onNext={() => navigateLightbox("next")}
            hasPrevious={lightboxPhoto.index > 0}
            hasNext={lightboxPhoto.index < filteredPhotos.length - 1}
            triggerRef={lightboxTriggerRef as React.RefObject<HTMLElement | null>}
            thumbnailCropPreview={
              thumbnailCropPreview ?? buildThumbnailCropPreview(lightboxPhoto.photo)
            }
            onThumbnailCropPreviewAdjust={handleThumbnailCropOverlayAdjust}
            onRefresh={() => handleRefreshLightboxPhotoMetadata(lightboxPhoto.photo)}
          />
        )}

        {/* Image scrape drawer */}
        <ImageScrapeDrawer
          isOpen={scrapeDrawerOpen}
          onClose={() => setScrapeDrawerOpen(false)}
          entityContext={{
            type: "person",
            personId: personId,
            personName: person.full_name,
          } as PersonContext}
          onImportComplete={() => {
            // Refresh photos after import
            fetchPhotos();
          }}
        />

        <AdvancedFilterDrawer
          isOpen={advancedFiltersOpen}
          onClose={() => setAdvancedFiltersOpen(false)}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          availableSources={uniqueSources}
          showSeeded={true}
          sortOptions={[
            { value: "newest", label: "Newest First" },
            { value: "oldest", label: "Oldest First" },
            { value: "season-desc", label: "Season (Newest)" },
            { value: "season-asc", label: "Season (Oldest)" },
            { value: "source", label: "By Source" },
          ]}
          defaults={{ sort: "newest" }}
          unknownTextCount={isTextFilterActive ? unknownTextCount : undefined}
          onDetectTextForVisible={isTextFilterActive ? detectTextOverlayForUnknown : undefined}
          textOverlayDetectError={textOverlayDetectError}
        />
      </div>
    </ClientOnly>
  );
}

// Fandom Helper Components
function FandomSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-4">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FandomField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-zinc-500 w-28 flex-shrink-0">{label}:</span>
      <span className="text-zinc-900">{value}</span>
    </div>
  );
}

function FandomList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
      <p className="text-xs font-semibold text-zinc-500 mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-700">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function FandomJsonList({ title, data }: { title: string; data: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: string[] = [];

  if (Array.isArray(data)) {
    // Array of objects like [{name: "Person", relation: "Friend"}] or just strings
    for (const item of data) {
      if (typeof item === 'string') {
        items.push(item);
      } else if (item && typeof item === 'object') {
        // Try to extract meaningful display text from the object
        const obj = item as Record<string, unknown>;
        if (obj.name) {
          const relation = obj.relation ? ` (${obj.relation})` : '';
          items.push(`${obj.name}${relation}`);
        } else {
          // Fall back to showing the first string value found
          const firstVal = Object.values(obj).find(v => typeof v === 'string');
          if (firstVal) items.push(firstVal as string);
        }
      }
    }
  } else {
    // Object format like {key: value}
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        items.push(`${key}: ${value}`);
      } else if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (obj.name) {
          items.push(`${key}: ${obj.name}`);
        }
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
      <p className="text-xs font-semibold text-zinc-500 mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-700">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function FandomTaglines({ taglines }: { taglines: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: { season: string; tagline: string }[] = [];

  if (Array.isArray(taglines)) {
    // Array format like [{season: "1", tagline: "Quote"}]
    for (const item of taglines) {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const season = obj.season ? String(obj.season) : obj.year ? String(obj.year) : `#${items.length + 1}`;
        const rawTagline = obj.tagline || obj.quote || obj.text;
        if (rawTagline) {
          // Strip outer quotes if present (data often has embedded quotes)
          let tagline = String(rawTagline);
          if (tagline.startsWith('"') && tagline.endsWith('"')) {
            tagline = tagline.slice(1, -1);
          }
          items.push({ season, tagline });
        }
      } else if (typeof item === 'string') {
        items.push({ season: `#${items.length + 1}`, tagline: item });
      }
    }
  } else {
    // Object format like {"Season 1": "Quote"}
    for (const [season, tagline] of Object.entries(taglines)) {
      if (typeof tagline === 'string') {
        items.push({ season, tagline });
      } else if (tagline && typeof tagline === 'object') {
        const obj = tagline as Record<string, unknown>;
        const text = obj.tagline || obj.quote || obj.text;
        if (text) items.push({ season, tagline: String(text) });
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Taglines</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-0.5 rounded h-fit">
              {item.season}
            </span>
            <p className="text-sm text-amber-900 italic">&ldquo;{item.tagline}&rdquo;</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FandomTrivia({ trivia }: { trivia: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: string[] = [];

  if (Array.isArray(trivia)) {
    for (const item of trivia) {
      if (typeof item === 'string') {
        items.push(item);
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const text = obj.text || obj.fact || obj.trivia || obj.content;
        if (text) items.push(String(text));
      }
    }
  } else {
    for (const value of Object.values(trivia)) {
      if (typeof value === 'string') {
        items.push(value);
      } else if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const text = obj.text || obj.fact || obj.trivia || obj.content;
        if (text) items.push(String(text));
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Trivia</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-600 pl-4 border-l-2 border-zinc-200">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FandomReunionSeating({ seating }: { seating: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: { reunion: string; position: string }[] = [];

  if (Array.isArray(seating)) {
    // Array format like [{reunion: "Season 1 Reunion", position: "3"}]
    for (const item of seating) {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const season = obj.season;
        const seatOrder = obj.seat_order ?? obj.position ?? obj.seat;
        if (season !== undefined && seatOrder) {
          items.push({ reunion: `Season ${season} Reunion`, position: String(seatOrder) });
        }
      }
    }
  } else {
    // Object format like {"Season 1 Reunion": "3"}
    for (const [reunion, position] of Object.entries(seating)) {
      if (typeof position === 'string' || typeof position === 'number') {
        items.push({ reunion, position: String(position) });
      } else if (position && typeof position === 'object') {
        const obj = position as Record<string, unknown>;
        const pos = obj.position || obj.seat || obj.order;
        if (pos !== undefined) items.push({ reunion, position: String(pos) });
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Reunion Seating</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between p-2 rounded bg-zinc-50 text-sm">
            <span className="text-zinc-600">{item.reunion}</span>
            <span className="font-medium text-zinc-900">{item.position}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
