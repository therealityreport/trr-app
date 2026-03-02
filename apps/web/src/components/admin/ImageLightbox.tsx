"use client";

import {
  useEffect,
  useState,
  useRef,
  useMemo,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import type { PhotoMetadata } from "@/lib/photo-metadata";
import {
  CONTENT_TYPE_OPTIONS,
  formatContentTypeLabel,
  normalizeContentTypeToken,
} from "@/lib/media/content-type";
import {
  THUMBNAIL_CROP_LIMITS,
  resolveThumbnailViewportRect,
} from "@/lib/thumbnail-crop";
import { LightboxShell } from "@/components/admin/image-lightbox/LightboxShell";
import { LightboxImageStage } from "@/components/admin/image-lightbox/LightboxImageStage";
import { LightboxMetadataPanel } from "@/components/admin/image-lightbox/LightboxMetadataPanel";
import { LightboxManagementActions } from "@/components/admin/image-lightbox/LightboxManagementActions";
import { useLightboxManagementState } from "@/components/admin/image-lightbox/useLightboxManagementState";
import { useLightboxKeyboardFocus } from "@/components/admin/image-lightbox/useLightboxKeyboardFocus";

// Inline SVG icons to avoid external dependencies
const XIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

function formatSourceBadgeLabel(source: string, sourceUrl?: string | null): string {
  const raw = (source || "").trim();
  if (!raw) return "unknown";

  const lower = raw.toLowerCase();
  if (lower.includes("harvest")) {
    if (sourceUrl) {
      try {
        const hostname = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
        if (hostname) return hostname;
      } catch {
        // Fall through to default fallback.
      }
    }
    return "web";
  }
  if (lower.startsWith("web_scrape") || lower.startsWith("webscrape")) {
    if (sourceUrl) {
      try {
        const hostname = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
        if (hostname) return hostname;
      } catch {
        // Fall through to prefix cleanup.
      }
    }

    const cleaned = raw
      .replace(/^web[_-]?scrape:?/i, "")
      .replace(/^www\./i, "")
      .trim();
    return cleaned || raw;
  }

  return raw;
}

function formatFoundOnSourceLabel(source: string, sourceUrl?: string | null): string {
  const raw = (source || "").trim();
  const lower = raw.toLowerCase();
  if (lower.includes("fandom")) return "FANDOM";
  if (lower.includes("imdb")) return "IMDB";
  if (lower.includes("tmdb")) return "TMDB";

  if (sourceUrl) {
    try {
      const hostname = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
      if (hostname.includes("fandom")) return "FANDOM";
      if (hostname.includes("imdb")) return "IMDB";
      if (hostname.includes("tmdb") || hostname.includes("themoviedb")) return "TMDB";
      return hostname.toUpperCase();
    } catch {
      // Ignore parse failures and use source fallback.
    }
  }

  if (lower.startsWith("web_scrape") || lower.startsWith("webscrape")) {
    return "WEB";
  }
  return raw ? raw.toUpperCase() : "UNKNOWN";
}

const clampPercent = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, value));
const clampZoom = (value: number): number =>
  Math.min(THUMBNAIL_CROP_LIMITS.zoomMax, Math.max(THUMBNAIL_CROP_LIMITS.zoomMin, value));

const copyTextToClipboard = async (value: string): Promise<boolean> => {
  if (!value) return false;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  if (typeof document === "undefined") return false;
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const didCopy = document.execCommand("copy");
  document.body.removeChild(textArea);
  return didCopy;
};

export type ImageType = "cast" | "episode" | "season";

interface ImageManagementProps {
  imageType?: ImageType;
  imageId?: string;
  isArchived?: boolean;
  isStarred?: boolean;
  canManage?: boolean;
  onRefresh?: () => Promise<void>;
  onSync?: () => Promise<void>;
  onCount?: () => Promise<void>;
  onCrop?: () => Promise<void>;
  onIdText?: () => Promise<void>;
  onResize?: () => Promise<void>;
  onArchive?: () => Promise<void>;
  onUnarchive?: () => Promise<void>;
  onToggleStar?: (starred: boolean) => Promise<void>;
  onSetFeaturedPoster?: () => Promise<void>;
  onSetFeaturedBackdrop?: () => Promise<void>;
  onSetFeaturedLogo?: () => Promise<void>;
  onClearFeaturedPoster?: () => Promise<void>;
  onClearFeaturedBackdrop?: () => Promise<void>;
  isFeaturedPoster?: boolean;
  isFeaturedBackdrop?: boolean;
  isFeaturedLogo?: boolean;
  onUpdateContentType?: (contentType: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onReassign?: () => void;
  actionDisabledReasons?: Partial<
    Record<
      | "refresh"
      | "sync"
      | "count"
      | "crop"
      | "idText"
      | "resize"
      | "archive"
      | "star"
      | "delete"
      | "edit"
      | "featuredPoster"
      | "featuredBackdrop"
      | "featuredLogo",
      string
    >
  >;
}

interface ImageLightboxProps extends ImageManagementProps {
  src: string;
  fallbackSrcs?: string[];
  fallbackSrc?: string | null;
  mediaType?: "image" | "video" | "embed";
  videoPosterSrc?: string | null;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  metadata?: PhotoMetadata | null;
  metadataExtras?: ReactNode;
  position?: { current: number; total: number };
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  triggerRef?: React.RefObject<HTMLElement | null>;
  thumbnailCropPreview?: {
    focusX: number;
    focusY: number;
    zoom: number;
    imageWidth: number | null;
    imageHeight: number | null;
    aspectRatio?: number;
  } | null;
  onThumbnailCropPreviewAdjust?: (preview: {
    focusX: number;
    focusY: number;
    zoom: number;
    imageWidth: number | null;
    imageHeight: number | null;
    aspectRatio: number;
  }) => void;
}

interface MetadataPanelProps {
  metadata: PhotoMetadata;
  isExpanded: boolean;
  runtimeDimensions?: { width: number; height: number } | null;
  management?: {
    isArchived?: boolean;
    isStarred?: boolean;
    canManage?: boolean;
    onRefresh?: () => Promise<void>;
    onSync?: () => Promise<void>;
    onCount?: () => Promise<void>;
    onCrop?: () => Promise<void>;
    onIdText?: () => Promise<void>;
    onResize?: () => Promise<void>;
    onArchive?: () => Promise<void>;
    onUnarchive?: () => Promise<void>;
    onToggleStar?: (starred: boolean) => Promise<void>;
    onSetFeaturedPoster?: () => Promise<void>;
    onSetFeaturedBackdrop?: () => Promise<void>;
    onSetFeaturedLogo?: () => Promise<void>;
    onClearFeaturedPoster?: () => Promise<void>;
    onClearFeaturedBackdrop?: () => Promise<void>;
    isFeaturedPoster?: boolean;
    isFeaturedBackdrop?: boolean;
    isFeaturedLogo?: boolean;
    onUpdateContentType?: (contentType: string) => Promise<void>;
    onDelete?: () => Promise<void>;
    onReassign?: () => void;
    actionDisabledReasons?: Partial<
      Record<
        | "refresh"
        | "sync"
        | "count"
        | "crop"
        | "idText"
        | "resize"
        | "archive"
        | "star"
        | "delete"
        | "edit"
        | "featuredPoster"
        | "featuredBackdrop"
        | "featuredLogo",
        string
      >
    >;
  };
  extras?: ReactNode;
  showExtras?: boolean;
  onToggleExtras?: () => void;
}

const parseYouTubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "youtu.be") {
      const pathId = parsed.pathname.split("/").filter(Boolean)[0];
      return pathId ?? null;
    }
    if (host.includes("youtube.com")) {
      if (parsed.pathname === "/watch") {
        const watchId = parsed.searchParams.get("v");
        return watchId && watchId.trim().length > 0 ? watchId.trim() : null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        const shortsId = parsed.pathname.split("/").filter(Boolean)[1];
        return shortsId ?? null;
      }
    }
  } catch {
    return null;
  }
  return null;
};

const parseTikTokVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("tiktok.com")) return null;
    const match = parsed.pathname.match(/\/video\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

const resolveEmbeddableUrl = (url: string): string | null => {
  const tiktokId = parseTikTokVideoId(url);
  if (tiktokId) return `https://www.tiktok.com/embed/v2/${tiktokId}`;

  const youtubeId = parseYouTubeVideoId(url);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}`;

  return null;
};

function MetadataPanel({
  metadata,
  isExpanded,
  runtimeDimensions,
  management,
  extras,
  showExtras = false,
  onToggleExtras,
}: MetadataPanelProps) {
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [copyMirrorFileNotice, setCopyMirrorFileNotice] = useState<string | null>(null);
  const currentContentType = normalizeContentTypeToken(
    metadata.contentType ?? metadata.sectionTag ?? "OTHER"
  );
  const [contentTypeValue, setContentTypeValue] = useState<string>(
    currentContentType
  );
  const [contentTypeSaving, setContentTypeSaving] = useState(false);
  const [contentTypeError, setContentTypeError] = useState<string | null>(null);
  const captionTruncateLength = 200;
  const needsTruncation =
    metadata.caption && metadata.caption.length > captionTruncateLength;
  const originalSourcePageUrl = metadata.originalSourcePageUrl ?? metadata.sourceUrl ?? null;
  const originalSourceFileUrl =
    metadata.originalSourceFileUrl ??
    metadata.originalImageUrl ??
    metadata.sourceUrl ??
    null;
  const sourcePageLabel = metadata.sourcePageTitle || originalSourcePageUrl || null;
  const sourceBadgeLabel =
    metadata.originalSourceLabel ||
    formatSourceBadgeLabel(metadata.source, originalSourcePageUrl ?? originalSourceFileUrl);
  const foundOnSourceUrl = originalSourcePageUrl ?? originalSourceFileUrl ?? null;
  const foundOnSourceLabel = formatFoundOnSourceLabel(metadata.source, foundOnSourceUrl);
  const foundOnPageTitle = metadata.sourcePageTitle || "Unknown";
  const galleryStatusNormalized = (metadata.galleryStatus ?? "").trim().toLowerCase();
  const isBrokenUnreachable = galleryStatusNormalized === "broken_unreachable";
  const galleryStatusLabel = metadata.galleryStatus ? metadata.galleryStatus.replace(/_/g, " ") : null;
  const mirrorFileName =
    typeof metadata.s3MirrorFileName === "string" && metadata.s3MirrorFileName.trim().length > 0
      ? metadata.s3MirrorFileName.trim()
      : null;
  const hasS3MirrorDetails = Boolean(metadata.isS3Mirrored);
  const canEditContentType = Boolean(management?.canManage && management?.onUpdateContentType);
  const formatDateLabel = (value: Date | null | undefined): string =>
    value ? value.toLocaleDateString() : "—";
  const effectiveDimensions = metadata.dimensions ?? runtimeDimensions ?? null;
  const dimensionsLabel = effectiveDimensions
    ? `${effectiveDimensions.width} × ${effectiveDimensions.height}`
    : "—";
  const faceCropChips = useMemo(() => {
    const firstName = (value: string | null | undefined): string => {
      if (typeof value !== "string") return "";
      const trimmed = value.trim();
      if (!trimmed) return "";
      if (/^(face|person)\s+\d+$/i.test(trimmed)) return trimmed;
      const tokens = trimmed.split(/\s+/).filter(Boolean);
      return tokens[0] || trimmed;
    };
    const crops = Array.isArray(metadata.faceCrops) ? metadata.faceCrops : [];
    const boxes = Array.isArray(metadata.faceBoxes) ? metadata.faceBoxes : [];
    const fallbackPeople = Array.isArray(metadata.people) ? metadata.people : [];
    return crops
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((crop) => {
        const matchingBox = boxes.find((box) => box.index === crop.index);
        const rawLabel =
          matchingBox?.person_name ||
          matchingBox?.label ||
          fallbackPeople[crop.index - 1] ||
          `Face ${crop.index}`;
        const label = firstName(rawLabel);
        const url = typeof crop.variantUrl === "string" && crop.variantUrl.length > 0 ? crop.variantUrl : null;
        return {
          index: crop.index,
          label,
          url,
        };
      });
  }, [metadata.faceBoxes, metadata.faceCrops, metadata.people]);
  const metadataCoverageRows: Array<{ label: string; value: string }> = [
    { label: "Source", value: metadata.source || "—" },
    { label: "Original Source", value: sourceBadgeLabel || "—" },
    { label: "Original Source Page", value: sourcePageLabel ?? "—" },
    { label: "Original Source File URL", value: originalSourceFileUrl ?? "—" },
    { label: "Source Variant", value: metadata.sourceVariant ?? "—" },
    { label: "Source Logo", value: metadata.sourceLogo ?? "—" },
    { label: "Name", value: metadata.assetName ?? "—" },
    { label: "Original URL", value: metadata.originalImageUrl ?? "—" },
    {
      label: "Content Type",
      value: formatContentTypeLabel(metadata.contentType ?? metadata.sectionTag ?? "OTHER"),
    },
    { label: "Credit Type", value: metadata.imdbCreditType ?? "—" },
    {
      label: "Media Type",
      value:
        metadata.mediaTypeLabel ??
        (metadata.imdbType ? metadata.imdbType.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—"),
    },
    {
      label: "Event Name",
      value:
        (metadata.mediaTypeLabel?.toLowerCase() === "event" || metadata.contentType === "EVENT")
          ? metadata.eventName ?? metadata.sourcePageTitle ?? metadata.assetName ?? "—"
          : "—",
    },
    { label: "Section", value: metadata.sectionLabel ?? "—" },
    { label: "Show", value: metadata.showName ?? "—" },
    { label: "Episode", value: metadata.episodeLabel ?? "—" },
    { label: "Season", value: metadata.season ? `Season ${metadata.season}` : "—" },
    { label: "Dimensions", value: dimensionsLabel },
    { label: "File Type", value: metadata.fileType?.toUpperCase() ?? "—" },
    { label: "Created", value: formatDateLabel(metadata.createdAt) },
    { label: "Added", value: formatDateLabel(metadata.addedAt) },
    {
      label: "Text Overlay",
      value:
        metadata.hasTextOverlay === true
          ? "YES"
          : metadata.hasTextOverlay === false
            ? "NO"
            : "—",
    },
    {
      label: "People Count",
      value:
        typeof metadata.peopleCount === "number" && Number.isFinite(metadata.peopleCount)
          ? String(metadata.peopleCount)
          : "—",
    },
    {
      label: "Face Boxes",
      value:
        Array.isArray(metadata.faceBoxes) && metadata.faceBoxes.length > 0
          ? String(metadata.faceBoxes.length)
          : "—",
    },
    {
      label: "Face Crops",
      value: faceCropChips.length > 0 ? String(faceCropChips.length) : "—",
    },
    {
      label: "People",
      value: metadata.people.length > 0 ? metadata.people.join(", ") : "—",
    },
    {
      label: "Titles",
      value: metadata.titles.length > 0 ? metadata.titles.join(", ") : "—",
    },
    { label: "Caption", value: metadata.caption ?? "—" },
    { label: "Fetched", value: formatDateLabel(metadata.fetchedAt) },
  ];
  if (galleryStatusLabel) {
    metadataCoverageRows.push({ label: "Gallery Status", value: galleryStatusLabel });
    metadataCoverageRows.push({
      label: "Gallery Status Reason",
      value: metadata.galleryStatusReason ?? "—",
    });
    metadataCoverageRows.push({
      label: "Gallery Status Checked",
      value: metadata.galleryStatusCheckedAt ? metadata.galleryStatusCheckedAt.toLocaleString() : "—",
    });
  }
  if (hasS3MirrorDetails) {
    metadataCoverageRows.push({ label: "S3 Mirror File", value: mirrorFileName ?? "—" });
  }

  const {
    actionLoading,
    starLoading,
    actionError,
    handleAction,
    handleToggleStar,
  } = useLightboxManagementState({
    onToggleStar: management?.onToggleStar,
    isStarred: Boolean(management?.isStarred),
  });

  const disabledReasons = management?.actionDisabledReasons ?? {};
  const canRefresh = Boolean(management?.onRefresh);
  const canSync = Boolean(management?.onSync);
  const canCount = Boolean(management?.onCount);
  const canCrop = Boolean(management?.onCrop);
  const canIdText = Boolean(management?.onIdText);
  const canResize = Boolean(management?.onResize);
  const canArchive = Boolean(management?.onArchive) || Boolean(management?.onUnarchive);
  const canReassign = Boolean(management?.onReassign);
  const canDelete = Boolean(management?.onDelete);
  const canStar = Boolean(management?.onToggleStar);
  const canSetFeaturedPoster = Boolean(management?.onSetFeaturedPoster);
  const canSetFeaturedBackdrop = Boolean(management?.onSetFeaturedBackdrop);
  const canSetFeaturedLogo = Boolean(management?.onSetFeaturedLogo);
  const canEditTools = Boolean(extras && onToggleExtras);
  const showExtrasInline = Boolean(extras) && !management?.canManage;
  const hasAnyActions = true;
  const refreshDisabledReason = !canRefresh
    ? disabledReasons.refresh ?? "Refresh is unavailable for this image."
    : disabledReasons.refresh ?? null;
  const archiveDisabledReason = !canArchive
    ? disabledReasons.archive ?? "Archive is unavailable for this image."
    : disabledReasons.archive ?? null;
  const syncDisabledReason = !canSync
    ? disabledReasons.sync ?? "Sync is unavailable for this image."
    : disabledReasons.sync ?? null;
  const countDisabledReason = !canCount
    ? disabledReasons.count ?? "Count is unavailable for this image."
    : disabledReasons.count ?? null;
  const cropDisabledReason = !canCrop
    ? disabledReasons.crop ?? "Crop is unavailable for this image."
    : disabledReasons.crop ?? null;
  const idTextDisabledReason = !canIdText
    ? disabledReasons.idText ?? "ID Text is unavailable for this image."
    : disabledReasons.idText ?? null;
  const resizeDisabledReason = !canResize
    ? disabledReasons.resize ?? "Auto-Crop is unavailable for this image."
    : disabledReasons.resize ?? null;
  const starDisabledReason = !canStar
    ? disabledReasons.star ?? "Star/Flag is unavailable for this image."
    : disabledReasons.star ?? null;
  const deleteDisabledReason = !canDelete
    ? disabledReasons.delete ?? "Delete is unavailable for this image."
    : disabledReasons.delete ?? null;
  const featuredPosterDisabledReason = !canSetFeaturedPoster
    ? disabledReasons.featuredPoster ??
      "Featured poster selection is unavailable for this image."
    : disabledReasons.featuredPoster ?? null;
  const featuredBackdropDisabledReason = !canSetFeaturedBackdrop
    ? disabledReasons.featuredBackdrop ??
      "Featured backdrop selection is unavailable for this image."
    : disabledReasons.featuredBackdrop ?? null;
  const featuredLogoDisabledReason = !canSetFeaturedLogo
    ? disabledReasons.featuredLogo ??
      "Featured logo selection is unavailable for this image."
    : disabledReasons.featuredLogo ?? null;
  const editDisabledReason = !canEditTools
    ? disabledReasons.edit ?? "Edit tools are unavailable for this image."
    : disabledReasons.edit ?? null;

  useEffect(() => {
    setCopyMirrorFileNotice(null);
  }, [mirrorFileName]);

  useEffect(() => {
    setContentTypeValue(currentContentType);
    setContentTypeError(null);
  }, [currentContentType]);

  return (
    <div
      data-expanded={isExpanded ? "true" : "false"}
      className="h-full w-full overflow-y-auto bg-black/50 backdrop-blur-xl p-4"
    >
      {/* Quick Actions (requested placement: above Source) */}
      {management?.canManage && (
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAction("refresh", management.onRefresh)}
            disabled={actionLoading !== null || starLoading || Boolean(refreshDisabledReason)}
            title={refreshDisabledReason ?? undefined}
            className="rounded bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            {actionLoading === "refresh" ? "Refreshing..." : "Refresh"}
          </button>
          {management.isArchived ? (
            <button
              type="button"
              onClick={() => handleAction("unarchive", management.onUnarchive)}
              disabled={actionLoading !== null || starLoading || Boolean(archiveDisabledReason)}
              title={archiveDisabledReason ?? undefined}
              className="rounded bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
            >
              {actionLoading === "unarchive" ? "Unarchiving..." : "Unarchive"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleAction("archive", management.onArchive)}
              disabled={actionLoading !== null || starLoading || Boolean(archiveDisabledReason)}
              title={archiveDisabledReason ?? undefined}
              className="rounded bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
            >
              {actionLoading === "archive" ? "Archiving..." : "Archive"}
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleStar}
            disabled={actionLoading !== null || starLoading || Boolean(starDisabledReason)}
            title={starDisabledReason ?? undefined}
            className="rounded bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            {starLoading
              ? "Saving..."
                : management.isStarred
                  ? "Unstar/Unflag"
                  : "Star/Flag"}
          </button>
          <button
            type="button"
            onClick={() =>
              handleAction(
                "featuredPoster",
                management.isFeaturedPoster ? management.onClearFeaturedPoster : management.onSetFeaturedPoster
              )
            }
            disabled={actionLoading !== null || starLoading || Boolean(featuredPosterDisabledReason)}
            title={featuredPosterDisabledReason ?? undefined}
            className="rounded bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            {actionLoading === "featuredPoster"
              ? "Saving..."
              : management.isFeaturedPoster
                ? "Clear Featured Poster"
                : "Set as Featured Poster"}
          </button>
          <button
            type="button"
            onClick={() =>
              handleAction(
                "featuredBackdrop",
                management.isFeaturedBackdrop ? management.onClearFeaturedBackdrop : management.onSetFeaturedBackdrop
              )
            }
            disabled={actionLoading !== null || starLoading || Boolean(featuredBackdropDisabledReason)}
            title={featuredBackdropDisabledReason ?? undefined}
            className="rounded bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            {actionLoading === "featuredBackdrop"
              ? "Saving..."
              : management.isFeaturedBackdrop
                ? "Clear Featured Backdrop"
                : "Set as Featured Backdrop"}
          </button>
          <button
            type="button"
            onClick={() => handleAction("featuredLogo", management.onSetFeaturedLogo)}
            disabled={
              actionLoading !== null ||
              starLoading ||
              Boolean(featuredLogoDisabledReason) ||
              Boolean(management.isFeaturedLogo)
            }
            title={featuredLogoDisabledReason ?? undefined}
            className="rounded bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            {actionLoading === "featuredLogo"
              ? "Saving..."
              : management.isFeaturedLogo
                ? "Featured Logo"
                : "Set as Featured Logo"}
          </button>
          <button
            type="button"
            onClick={() => onToggleExtras?.()}
            disabled={Boolean(editDisabledReason)}
            title={editDisabledReason ?? undefined}
            className="rounded bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            {showExtras ? "Close Edit" : "Edit"}
          </button>
        </div>
      )}
      {actionError && (
        <p className="mb-4 text-xs text-red-300">{actionError}</p>
      )}

      {/* Source Badge */}
      <div className="mb-4">
        <span className="tracking-widest text-[10px] uppercase text-white/50">
          Original Source
        </span>
        <div className="mt-1 flex items-center gap-2">
          {metadata.isS3Mirrored && (
            <span className="inline-block rounded px-2 py-0.5 text-xs font-medium text-white bg-blue-500/80">
              S3 MIRROR
            </span>
          )}
          {originalSourceFileUrl ? (
            <a
              href={originalSourceFileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded px-2 py-0.5 text-xs font-medium text-black underline decoration-black/40 underline-offset-2 hover:decoration-black"
              style={{ backgroundColor: metadata.sourceBadgeColor }}
              title="Open original source file"
            >
              {sourceBadgeLabel.toUpperCase()}
            </a>
          ) : (
            <span
              className="inline-block rounded px-2 py-0.5 text-xs font-medium text-black"
              style={{ backgroundColor: metadata.sourceBadgeColor }}
            >
              {sourceBadgeLabel.toUpperCase()}
            </span>
          )}
          {isBrokenUnreachable && (
            <span
              className="inline-block rounded px-2 py-0.5 text-xs font-semibold text-white bg-red-500/90"
              title={metadata.galleryStatusReason ?? undefined}
            >
              BROKEN (UNREACHABLE)
            </span>
          )}
        </div>
      </div>

      {hasS3MirrorDetails && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              S3 Mirror File
            </span>
            <span className="inline-block rounded px-2 py-0.5 text-[10px] font-medium text-white bg-blue-500/80">
              S3 MIRROR
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <code className="max-w-[70%] break-all rounded bg-white/10 px-2 py-1 text-xs text-white/90">
              {mirrorFileName ?? "—"}
            </code>
            <button
              type="button"
              onClick={async () => {
                if (!mirrorFileName) return;
                try {
                  const copied = await copyTextToClipboard(mirrorFileName);
                  setCopyMirrorFileNotice(copied ? "Copied." : "Copy failed.");
                } catch {
                  setCopyMirrorFileNotice("Copy failed.");
                }
              }}
              disabled={!mirrorFileName}
              className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
            >
              Copy
            </button>
          </div>
          {copyMirrorFileNotice && (
            <p
              className={`mt-1 text-xs ${
                copyMirrorFileNotice === "Copied." ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {copyMirrorFileNotice}
            </p>
          )}
        </div>
      )}

      <div className="mb-4 space-y-2">
        <div>
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Original Source File URL
          </span>
          {originalSourceFileUrl ? (
            <a
              href={originalSourceFileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-xs text-white/90 underline"
            >
              {originalSourceFileUrl}
            </a>
          ) : (
            <p className="mt-1 text-xs text-white/80">Original source file URL unavailable</p>
          )}
        </div>
        <div>
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Found on
          </span>
          <p className="mt-1 break-words text-xs text-white/90">
            {foundOnSourceLabel} | {foundOnPageTitle}
          </p>
        </div>
      </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Source Variant
          </span>
          <p className="mt-1 text-sm text-white/90">{metadata.sourceVariant ?? "—"}</p>
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Original Source Page
          </span>
          {originalSourcePageUrl ? (
            <a
              href={originalSourcePageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-sm text-white/90 underline break-all"
            >
              {sourcePageLabel ?? originalSourcePageUrl}
            </a>
          ) : (
            <p className="mt-1 text-sm text-white/90 break-all">{sourcePageLabel ?? "—"}</p>
          )}
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Source Logo
          </span>
          <p className="mt-1 text-sm text-white/90">{metadata.sourceLogo ?? "—"}</p>
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Name
          </span>
          <p className="mt-1 text-sm text-white/90 break-all">{metadata.assetName ?? "—"}</p>
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Content Type
          </span>
          {canEditContentType ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={contentTypeValue}
                  onChange={(event) => {
                    setContentTypeValue(event.target.value);
                    setContentTypeError(null);
                  }}
                  disabled={contentTypeSaving}
                  className="rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white focus:border-white/40 focus:outline-none"
                >
                  {CONTENT_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {formatContentTypeLabel(option)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={
                    contentTypeSaving ||
                    contentTypeValue === currentContentType
                  }
                  onClick={async () => {
                    if (!management?.onUpdateContentType) return;
                    try {
                      setContentTypeSaving(true);
                      setContentTypeError(null);
                      await management.onUpdateContentType(contentTypeValue);
                    } catch (error) {
                      setContentTypeError(
                        error instanceof Error ? error.message : "Failed to update content type"
                      );
                    } finally {
                      setContentTypeSaving(false);
                    }
                  }}
                  className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                >
                  {contentTypeSaving ? "Saving..." : "Save"}
                </button>
              </div>
              {contentTypeError && (
                <p className="text-xs text-red-300">{contentTypeError}</p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-white/90">
              {formatContentTypeLabel(currentContentType)}
            </p>
          )}
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Section
          </span>
          <p className="mt-1 text-sm text-white/90">{metadata.sectionLabel ?? "—"}</p>
        </div>

        {/* Dimensions (always shown so missing values are explicit) */}
        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Dimensions
          </span>
          <p className="mt-1 text-sm text-white/90">{dimensionsLabel}</p>
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            File Type
          </span>
          <p className="mt-1 text-sm text-white/90">{metadata.fileType?.toUpperCase() ?? "—"}</p>
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Created
          </span>
          <p className="mt-1 text-sm text-white/90">{formatDateLabel(metadata.createdAt)}</p>
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Added
          </span>
          <p className="mt-1 text-sm text-white/90">{formatDateLabel(metadata.addedAt)}</p>
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            TEXT OVERLAY
          </span>
          <p className="mt-1 text-sm font-semibold text-white/90">
            {metadata.hasTextOverlay === true
              ? "YES (Contains Text)"
              : metadata.hasTextOverlay === false
                ? "NO (No Text)"
                : "UNKNOWN"}
          </p>
        </div>

        {/* Season */}
        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Season
          </span>
          <p className="mt-1 text-sm text-white/90">
            {metadata.season ? `Season ${metadata.season}` : "—"}
          </p>
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Episode
          </span>
          <p className="mt-1 text-sm text-white/90">{metadata.episodeLabel ?? "—"}</p>
        </div>

        {/* Caption */}
        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Caption
          </span>
          <p className="mt-1 text-sm text-white/90">
            {metadata.caption
              ? needsTruncation && !showFullCaption
                ? `${metadata.caption.slice(0, captionTruncateLength)}...`
                : metadata.caption
              : "—"}
          </p>
          {metadata.caption && needsTruncation && (
            <button
              onClick={() => setShowFullCaption(!showFullCaption)}
              className="mt-1 flex items-center gap-1 text-xs text-white/60 hover:text-white/90"
            >
              {showFullCaption ? (
                <>
                  Show less <ChevronUpIcon className="h-3 w-3" />
                </>
              ) : (
                <>
                  Show more <ChevronDownIcon className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            People
          </span>
          {metadata.people.length > 0 ? (
            <div className="mt-1 max-h-32 overflow-y-auto">
              {metadata.people.map((person, i) => (
                <p key={i} className="text-sm text-white/90">
                  {person}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-white/90">—</p>
          )}
        </div>

        {faceCropChips.length > 0 && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Face Crops
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {faceCropChips.map((chip) => (
                <div
                  key={`face-crop-chip-${chip.index}`}
                  className="relative h-20 w-20 overflow-hidden rounded-full border border-white/20 bg-white/10"
                  title={chip.label}
                >
                  {chip.url ? (
                    <Image
                      src={chip.url}
                      alt={chip.label}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black/30 text-xs font-semibold text-white/80">
                      {chip.label.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[9px] font-semibold text-white">
                    {chip.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showExtrasInline && <div className="mb-4">{extras}</div>}
        {extras && showExtras && management?.canManage && <div className="mb-4">{extras}</div>}

        <div className="mb-4 rounded border border-white/10 bg-white/[0.03] p-3">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Metadata Coverage
          </span>
          <div className="mt-2 space-y-1">
            {metadataCoverageRows.map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-2 text-xs text-white/85"
              >
                <span className="text-white/60">{row.label}</span>
                <span className="max-w-[60%] break-words text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Titles
          </span>
          {metadata.titles.length > 0 ? (
            <div className="mt-1 max-h-32 overflow-y-auto">
              {metadata.titles.map((title, i) => (
                <p key={i} className="text-sm text-white/90">
                  {title}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-white/90">—</p>
          )}
        </div>

        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Fetched
          </span>
          <p className="mt-1 text-sm text-white/90">{formatDateLabel(metadata.fetchedAt)}</p>
        </div>

      {/* Management Actions */}
      {management?.canManage && hasAnyActions && (
        <LightboxManagementActions>
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Actions
          </span>
          <div className="mt-2 space-y-2">
            {(canSync || canCount || canCrop || canIdText || canResize) && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAction("sync", management.onSync)}
                  disabled={actionLoading !== null || Boolean(syncDisabledReason)}
                  title={syncDisabledReason ?? undefined}
                  className="rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
                >
                  {actionLoading === "sync" ? "Syncing..." : "Sync"}
                </button>
                <button
                  onClick={() => handleAction("count", management.onCount)}
                  disabled={actionLoading !== null || Boolean(countDisabledReason)}
                  title={countDisabledReason ?? undefined}
                  className="rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
                >
                  {actionLoading === "count" ? "Counting..." : "Count"}
                </button>
                <button
                  onClick={() => handleAction("crop", management.onCrop)}
                  disabled={actionLoading !== null || Boolean(cropDisabledReason)}
                  title={cropDisabledReason ?? undefined}
                  className="rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
                >
                  {actionLoading === "crop" ? "Cropping..." : "Crop"}
                </button>
                <button
                  onClick={() => handleAction("id_text", management.onIdText)}
                  disabled={actionLoading !== null || Boolean(idTextDisabledReason)}
                  title={idTextDisabledReason ?? undefined}
                  className="rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
                >
                  {actionLoading === "id_text" ? "Detecting..." : "ID Text"}
                </button>
                <button
                  onClick={() => handleAction("resize", management.onResize)}
                  disabled={actionLoading !== null || Boolean(resizeDisabledReason)}
                  title={
                    resizeDisabledReason ??
                    "Rebuilds preview/thumbnail crop variants only; original hosted image is unchanged."
                  }
                  className="col-span-2 rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
                >
                  {actionLoading === "resize" ? "Auto-Cropping..." : "Auto-Crop"}
                </button>
              </div>
            )}
            <button
              onClick={() => handleAction("refresh", management.onRefresh)}
              disabled={actionLoading !== null || starLoading || Boolean(refreshDisabledReason)}
              title={refreshDisabledReason ?? undefined}
              className="w-full rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
            >
              {actionLoading === "refresh" ? "Refreshing..." : "Refresh Full Pipeline"}
            </button>
            {management.isArchived ? (
              <button
                onClick={() => handleAction("unarchive", management.onUnarchive)}
                disabled={actionLoading !== null || Boolean(archiveDisabledReason)}
                title={archiveDisabledReason ?? undefined}
                className="w-full rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
              >
                {actionLoading === "unarchive" ? "Unarchiving..." : "Unarchive"}
              </button>
            ) : (
              <button
                onClick={() => handleAction("archive", management.onArchive)}
                disabled={actionLoading !== null || Boolean(archiveDisabledReason)}
                title={archiveDisabledReason ?? undefined}
                className="w-full rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
              >
                {actionLoading === "archive" ? "Archiving..." : "Archive"}
              </button>
            )}
            <button
              onClick={handleToggleStar}
              disabled={actionLoading !== null || starLoading || Boolean(starDisabledReason)}
              title={starDisabledReason ?? undefined}
              className="w-full rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
            >
              {starLoading
                ? "Saving..."
                : management.isStarred
                  ? "Unstar/Unflag"
                  : "Star/Flag"}
            </button>
            <button
              onClick={() =>
                handleAction(
                  "featuredPoster",
                  management.isFeaturedPoster ? management.onClearFeaturedPoster : management.onSetFeaturedPoster
                )
              }
              disabled={actionLoading !== null || starLoading || Boolean(featuredPosterDisabledReason)}
              title={featuredPosterDisabledReason ?? undefined}
              className="w-full rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
            >
              {actionLoading === "featuredPoster"
                ? "Saving..."
                : management.isFeaturedPoster
                  ? "Clear Featured Poster"
                  : "Set as Featured Poster"}
            </button>
            <button
              onClick={() =>
                handleAction(
                  "featuredBackdrop",
                  management.isFeaturedBackdrop ? management.onClearFeaturedBackdrop : management.onSetFeaturedBackdrop
                )
              }
              disabled={actionLoading !== null || starLoading || Boolean(featuredBackdropDisabledReason)}
              title={featuredBackdropDisabledReason ?? undefined}
              className="w-full rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
            >
              {actionLoading === "featuredBackdrop"
                ? "Saving..."
                : management.isFeaturedBackdrop
                  ? "Clear Featured Backdrop"
                  : "Set as Featured Backdrop"}
            </button>
            <button
              onClick={() => handleAction("featuredLogo", management.onSetFeaturedLogo)}
              disabled={
                actionLoading !== null ||
                starLoading ||
                Boolean(featuredLogoDisabledReason) ||
                Boolean(management.isFeaturedLogo)
              }
              title={featuredLogoDisabledReason ?? undefined}
              className="w-full rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
            >
              {actionLoading === "featuredLogo"
                ? "Saving..."
                : management.isFeaturedLogo
                  ? "Featured Logo"
                  : "Set as Featured Logo"}
            </button>
            <button
              onClick={() => onToggleExtras?.()}
              disabled={Boolean(editDisabledReason)}
              title={editDisabledReason ?? undefined}
              className="w-full rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
            >
              {showExtras ? "Close Edit" : "Edit"}
            </button>
            <button
              onClick={() => management.onReassign?.()}
              disabled={actionLoading !== null || !canReassign}
              className="w-full rounded bg-white/10 px-3 py-2 text-left text-sm text-white hover:bg-white/20 disabled:opacity-50"
              title={!canReassign ? "Re-assign is unavailable for this image." : undefined}
            >
              Re-assign
            </button>
            <button
              onClick={async () => {
                if (
                  confirm(
                    "Are you sure you want to permanently delete this image? This action cannot be undone."
                  )
                ) {
                  await handleAction("delete", management.onDelete);
                }
              }}
              disabled={actionLoading !== null || Boolean(deleteDisabledReason)}
              title={deleteDisabledReason ?? undefined}
              className="w-full rounded bg-red-500/20 px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/30 disabled:opacity-50"
              >
                {actionLoading === "delete" ? "Deleting..." : "Delete"}
              </button>
          </div>
        </LightboxManagementActions>
      )}
    </div>
  );
}

/**
 * Full-screen lightbox for viewing images at larger size.
 * Supports metadata panel, navigation between images, and keyboard controls.
 * Closes on backdrop click, Escape key, or close button.
 */
type CropResizeHandle = "nw" | "ne" | "sw" | "se";

export function ImageLightbox({
  src,
  fallbackSrcs,
  fallbackSrc,
  mediaType = "image",
  videoPosterSrc,
  alt,
  isOpen,
  onClose,
  metadata,
  metadataExtras,
  position,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  triggerRef,
  thumbnailCropPreview,
  onThumbnailCropPreviewAdjust,
  // Management props (imageType/imageId used by parent to construct handlers)
  isArchived,
  isStarred,
  canManage,
  onArchive,
  onUnarchive,
  onToggleStar,
  onSetFeaturedPoster,
  onSetFeaturedBackdrop,
  onSetFeaturedLogo,
  onClearFeaturedPoster,
  onClearFeaturedBackdrop,
  isFeaturedPoster,
  isFeaturedBackdrop,
  isFeaturedLogo,
  onUpdateContentType,
  onRefresh,
  onSync,
  onCount,
  onCrop,
  onIdText,
  onResize,
  onDelete,
  onReassign,
  actionDisabledReasons,
}: ImageLightboxProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [imageFailed, setImageFailed] = useState(false);
  const [previewImageSize, setPreviewImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const retryCandidates = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const candidate of [...(fallbackSrcs ?? []), fallbackSrc ?? null]) {
      if (typeof candidate !== "string") continue;
      const trimmed = candidate.trim();
      if (!trimmed || trimmed === src || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
    return out;
  }, [fallbackSrc, fallbackSrcs, src]);
  const [retryIndex, setRetryIndex] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showEditTools, setShowEditTools] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const overlayImageRef = useRef<HTMLDivElement>(null);
  const isVideoMedia = mediaType === "video";
  const isEmbedMedia = mediaType === "embed";
  const embedSrc = useMemo(() => {
    if (!isEmbedMedia) return null;
    return resolveEmbeddableUrl(currentSrc);
  }, [currentSrc, isEmbedMedia]);

  useEffect(() => {
    setCurrentSrc(src);
    setImageFailed(false);
    setRetryIndex(0);
    setPreviewImageSize(null);
    setShowEditTools(false);
  }, [retryCandidates, src]);

  const handlePrimaryMediaError = () => {
    const nextCandidate = retryCandidates[retryIndex] ?? null;
    if (nextCandidate && nextCandidate !== currentSrc) {
      setCurrentSrc(nextCandidate);
      setRetryIndex((prev) => prev + 1);
      return;
    }
    setImageFailed(true);
  };

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  useLightboxKeyboardFocus({
    isOpen,
    modalRef,
    closeButtonRef,
    triggerRef,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
    onClose,
    metadataEnabled: Boolean(metadata),
    onToggleMetadata: metadata ? () => setShowMetadata((prev) => !prev) : undefined,
  });

  // Body scroll lock (iOS-safe: also locks touch scrolling)
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      const scrollY = window.scrollY;

      // Lock body scroll (works on iOS Safari)
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const previewImageWidth = thumbnailCropPreview?.imageWidth ?? previewImageSize?.width ?? null;
  const previewImageHeight = thumbnailCropPreview?.imageHeight ?? previewImageSize?.height ?? null;
  const previewAspectRatio =
    thumbnailCropPreview?.aspectRatio && Number.isFinite(thumbnailCropPreview.aspectRatio)
      ? thumbnailCropPreview.aspectRatio
      : 4 / 5;
  const previewRect =
    thumbnailCropPreview
      ? resolveThumbnailViewportRect({
          imageWidth: previewImageWidth,
          imageHeight: previewImageHeight,
          focusX: thumbnailCropPreview.focusX,
          focusY: thumbnailCropPreview.focusY,
          zoom: thumbnailCropPreview.zoom,
          aspectRatio: previewAspectRatio,
        })
      : null;
  const effectivePreviewRect =
    previewRect ??
    (thumbnailCropPreview
      ? {
          leftPct: 0,
          topPct: 0,
          widthPct: 100,
          heightPct: 100,
        }
      : null);
  const faceBoxes = metadata?.faceBoxes ?? [];
  const shouldShowFaceBoxes =
    !isVideoMedia &&
    !isEmbedMedia &&
    (faceBoxes.length > 1 ||
      (faceBoxes.length === 0 &&
        metadata?.peopleCount !== null &&
        metadata?.peopleCount !== undefined &&
        metadata.peopleCount > 1));
  const previewCenter =
    effectivePreviewRect
      ? {
          xPct: effectivePreviewRect.leftPct + effectivePreviewRect.widthPct / 2,
          yPct: effectivePreviewRect.topPct + effectivePreviewRect.heightPct / 2,
        }
      : null;
  const focusLineXPct =
    thumbnailCropPreview && Number.isFinite(thumbnailCropPreview.focusX)
      ? clampPercent(thumbnailCropPreview.focusX)
      : previewCenter?.xPct ?? 50;
  const canAdjustThumbnailCrop = Boolean(
    !isVideoMedia &&
      !isEmbedMedia &&
      showMetadata &&
      onThumbnailCropPreviewAdjust &&
      thumbnailCropPreview &&
      effectivePreviewRect &&
      previewCenter,
  );
  const emitThumbnailCropPreviewAdjust = (next: {
    focusX: number;
    focusY: number;
    zoom: number;
  }) => {
    if (!onThumbnailCropPreviewAdjust || !thumbnailCropPreview) return;
    onThumbnailCropPreviewAdjust({
      focusX: Number(clampPercent(next.focusX).toFixed(2)),
      focusY: Number(clampPercent(next.focusY).toFixed(2)),
      zoom: Number(clampZoom(next.zoom).toFixed(2)),
      imageWidth: thumbnailCropPreview.imageWidth,
      imageHeight: thumbnailCropPreview.imageHeight,
      aspectRatio: thumbnailCropPreview.aspectRatio ?? previewAspectRatio,
    });
  };
  const handleCropFramePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canAdjustThumbnailCrop || !thumbnailCropPreview || !overlayImageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = overlayImageRef.current.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const startFocusX = thumbnailCropPreview.focusX;
    const startFocusY = thumbnailCropPreview.focusY;
    const startZoom = thumbnailCropPreview.zoom;

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dxPct = ((moveEvent.clientX - startX) / bounds.width) * 100;
      const dyPct = ((moveEvent.clientY - startY) / bounds.height) * 100;
      emitThumbnailCropPreviewAdjust({
        focusX: startFocusX + dxPct,
        focusY: startFocusY + dyPct,
        zoom: startZoom,
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };
  const handleCropResizePointerDown =
    (handle: CropResizeHandle) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!canAdjustThumbnailCrop || !thumbnailCropPreview || !overlayImageRef.current || !previewCenter) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const bounds = overlayImageRef.current.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;

      const centerClientX = bounds.left + (previewCenter.xPct / 100) * bounds.width;
      const centerClientY = bounds.top + (previewCenter.yPct / 100) * bounds.height;
      const startDistance = Math.max(
        10,
        Math.hypot(event.clientX - centerClientX, event.clientY - centerClientY),
      );
      const startZoom = thumbnailCropPreview.zoom;
      const startFocusX = thumbnailCropPreview.focusX;
      const startFocusY = thumbnailCropPreview.focusY;
      const cursorByHandle: Record<CropResizeHandle, string> = {
        nw: "nwse-resize",
        se: "nwse-resize",
        ne: "nesw-resize",
        sw: "nesw-resize",
      };

      document.body.style.cursor = cursorByHandle[handle];
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const distance = Math.max(
          10,
          Math.hypot(moveEvent.clientX - centerClientX, moveEvent.clientY - centerClientY),
        );
        const nextZoom = startZoom * (startDistance / distance);
        emitThumbnailCropPreviewAdjust({
          focusX: startFocusX,
          focusY: startFocusY,
          zoom: nextZoom,
        });
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    };
  const subjectHighlightRect =
    previewCenter
      ? (() => {
          const baseWidth = clampPercent(
            (effectivePreviewRect?.widthPct ?? 100) * 0.42,
            18,
            55,
          );
          const baseHeight = clampPercent(
            (effectivePreviewRect?.heightPct ?? 100) * 0.58,
            24,
            70,
          );
          const left = clampPercent(previewCenter.xPct - baseWidth / 2, 0, 100 - baseWidth);
          const top = clampPercent(previewCenter.yPct - baseHeight / 2, 0, 100 - baseHeight);
          return { left, top, width: baseWidth, height: baseHeight };
        })()
      : null;
  const effectiveThumbnailPreviewStyle =
    effectivePreviewRect && effectivePreviewRect.widthPct > 0 && effectivePreviewRect.heightPct > 0
      ? {
          width: `${(10000 / effectivePreviewRect.widthPct).toFixed(4)}%`,
          height: `${(10000 / effectivePreviewRect.heightPct).toFixed(4)}%`,
          left: `${(-(effectivePreviewRect.leftPct / effectivePreviewRect.widthPct) * 100).toFixed(4)}%`,
          top: `${(-(effectivePreviewRect.topPct / effectivePreviewRect.heightPct) * 100).toFixed(4)}%`,
        }
      : null;

  return (
    <LightboxShell modalRef={modalRef} alt={alt} onBackdropClick={onClose}>
      {/* Close button */}
      <button
        ref={closeButtonRef}
        onClick={onClose}
        className="absolute right-4 top-4 z-20 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
        aria-label="Close lightbox"
      >
        <XIcon className="h-6 w-6" />
      </button>

      {/* Metadata toggle button */}
      {metadata && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMetadata((prev) => !prev);
          }}
          className={`absolute right-4 top-16 z-20 rounded-full p-2 text-white transition-colors ${
            showMetadata ? "bg-white/30" : "bg-white/20 hover:bg-white/30"
          }`}
          aria-label={showMetadata ? "Hide metadata" : "Show metadata"}
          aria-pressed={showMetadata}
        >
          <InfoIcon className="h-5 w-5" />
        </button>
      )}

      {/* Previous arrow */}
      {hasPrevious && onPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white transition-colors hover:bg-white/30"
          aria-label="Previous image"
        >
          <ChevronLeftIcon className="h-8 w-8" />
        </button>
      )}

      {/* Next arrow */}
      {hasNext && onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white transition-colors hover:bg-white/30"
          aria-label="Next image"
        >
          <ChevronRightIcon className="h-8 w-8" />
        </button>
      )}

      {/* Image container with metadata panel (non-overlay) */}
      <div
        className="relative flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-lg md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <LightboxImageStage>
          {imageFailed ? (
            <div className="flex h-[60vh] w-[60vw] max-w-[90vw] items-center justify-center rounded-lg bg-black/40 text-sm text-white/70">
              Media failed to load
            </div>
          ) : (
            <div ref={overlayImageRef} className="relative inline-block">
              {isVideoMedia ? (
                <video
                  src={currentSrc}
                  aria-label={alt}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  poster={videoPosterSrc ?? undefined}
                  className="max-h-[80vh] w-auto object-contain shadow-2xl md:max-h-[90vh]"
                  onError={handlePrimaryMediaError}
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget as HTMLVideoElement;
                    if (video.videoWidth > 0 && video.videoHeight > 0) {
                      setPreviewImageSize({
                        width: video.videoWidth,
                        height: video.videoHeight,
                      });
                    }
                  }}
                />
              ) : isEmbedMedia ? (
                embedSrc ? (
                  <iframe
                    src={embedSrc}
                    title={alt}
                    aria-label={alt}
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="h-[70vh] w-[80vw] max-w-[90vw] rounded-lg bg-black shadow-2xl md:h-[80vh] md:w-[70vw]"
                    onError={handlePrimaryMediaError}
                  />
                ) : (
                  <div className="flex h-[60vh] w-[60vw] max-w-[90vw] flex-col items-center justify-center gap-2 rounded-lg bg-black/40 px-6 text-center text-sm text-white/70">
                    <p>Embedded playback is not available for this URL.</p>
                    <a
                      href={currentSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-white/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/10"
                    >
                      Open Original Source
                    </a>
                  </div>
                )
              ) : (
                <Image
                  src={currentSrc}
                  alt={alt}
                  width={800}
                  height={1200}
                  className="max-h-[80vh] w-auto object-contain shadow-2xl md:max-h-[90vh]"
                  priority
                  unoptimized
                  onError={handlePrimaryMediaError}
                  onLoad={(event) => {
                    const img = event.currentTarget as HTMLImageElement;
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                      setPreviewImageSize({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                      });
                    }
                  }}
                />
              )}
              {shouldShowFaceBoxes && (
                <div className="pointer-events-none absolute inset-0">
                  {faceBoxes.map((box, idx) => {
                    const left = `${Math.max(0, Math.min(100, box.x * 100))}%`;
                    const top = `${Math.max(0, Math.min(100, box.y * 100))}%`;
                    const width = `${Math.max(0, Math.min(100, box.width * 100))}%`;
                    const height = `${Math.max(0, Math.min(100, box.height * 100))}%`;
                    const label =
                      box.person_name ||
                      box.label ||
                      `Face ${box.index ?? idx + 1}`;
                    return (
                      <div
                        key={`${box.index ?? idx}-${box.x}-${box.y}`}
                        className="absolute border-2 border-emerald-300/90 bg-emerald-300/10"
                        style={{ left, top, width, height }}
                      >
                        <span className="absolute -top-5 left-0 rounded bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {!isVideoMedia && !isEmbedMedia && effectivePreviewRect && (
                <div className="pointer-events-none absolute inset-0">
                  <div
                    className="absolute bottom-0 top-0 w-px bg-white/45"
                    style={{ left: "50%" }}
                  />
                  <div
                    className="absolute bottom-0 top-0 w-px bg-fuchsia-400/90"
                    style={{ left: `${focusLineXPct}%` }}
                  />
                  <div
                    className={`absolute rounded border-2 border-cyan-300/90 bg-cyan-300/10 ${
                      canAdjustThumbnailCrop ? "pointer-events-auto cursor-move" : "pointer-events-none"
                    }`}
                    style={{
                      left: `${effectivePreviewRect.leftPct}%`,
                      top: `${effectivePreviewRect.topPct}%`,
                      width: `${effectivePreviewRect.widthPct}%`,
                      height: `${effectivePreviewRect.heightPct}%`,
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                    }}
                    onPointerDown={handleCropFramePointerDown}
                    role={canAdjustThumbnailCrop ? "presentation" : undefined}
                  >
                    {canAdjustThumbnailCrop && (
                      <>
                        <button
                          type="button"
                          aria-label="Resize crop from top-left corner"
                          className="absolute -left-2 -top-2 h-4 w-4 rounded-sm border border-cyan-100 bg-cyan-300/90"
                          onPointerDown={handleCropResizePointerDown("nw")}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop from top-right corner"
                          className="absolute -right-2 -top-2 h-4 w-4 rounded-sm border border-cyan-100 bg-cyan-300/90"
                          onPointerDown={handleCropResizePointerDown("ne")}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop from bottom-left corner"
                          className="absolute -bottom-2 -left-2 h-4 w-4 rounded-sm border border-cyan-100 bg-cyan-300/90"
                          onPointerDown={handleCropResizePointerDown("sw")}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop from bottom-right corner"
                          className="absolute -bottom-2 -right-2 h-4 w-4 rounded-sm border border-cyan-100 bg-cyan-300/90"
                          onPointerDown={handleCropResizePointerDown("se")}
                        />
                      </>
                    )}
                  </div>
                  {subjectHighlightRect && (
                    <div
                      className="absolute rounded border border-fuchsia-300/95 bg-fuchsia-400/20"
                      style={{
                        left: `${subjectHighlightRect.left}%`,
                        top: `${subjectHighlightRect.top}%`,
                        width: `${subjectHighlightRect.width}%`,
                        height: `${subjectHighlightRect.height}%`,
                      }}
                    />
                  )}
                  <div className="absolute left-2 top-2 rounded bg-black/55 px-2 py-1 text-[10px] uppercase tracking-wider text-white/90">
                    Thumbnail Crop + Subject Focus
                  </div>
                  <div
                    className={`absolute left-2 rounded bg-black/55 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-100 ${
                      canAdjustThumbnailCrop ? "top-[5rem]" : "top-14"
                    }`}
                  >
                    Cyan frame = actual thumbnail crop
                  </div>
                  <div
                    className={`absolute left-2 rounded bg-black/55 px-2 py-1 text-[10px] uppercase tracking-wider text-fuchsia-200/95 ${
                      canAdjustThumbnailCrop ? "top-[6.5rem]" : "top-[5.5rem]"
                    }`}
                  >
                    Pink box = subject guide only
                  </div>
                  {canAdjustThumbnailCrop && (
                    <div className="absolute left-2 top-14 rounded bg-black/55 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-100">
                      Drag frame to move, drag corners to resize
                    </div>
                  )}
                  <div className="absolute left-2 top-8 rounded bg-black/55 px-2 py-1 text-[10px] uppercase tracking-wider text-fuchsia-200/95">
                    Fuchsia line = face/nose center
                  </div>
                  {previewCenter && (
                    <div
                      className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 bg-white/20"
                      style={{
                        left: `${previewCenter.xPct}%`,
                        top: `${previewCenter.yPct}%`,
                      }}
                    >
                      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/90" />
                      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/90" />
                    </div>
                  )}
                  {previewCenter && (
                    <div
                      className="absolute bottom-0 top-0 w-px bg-cyan-300/90"
                      style={{ left: `${previewCenter.xPct}%` }}
                    />
                  )}
                  {effectiveThumbnailPreviewStyle && (
                    <div className="pointer-events-none absolute bottom-3 right-3 w-24 overflow-hidden rounded border border-cyan-300/90 bg-black/75 shadow-lg">
                      <div className="px-1 py-0.5 text-[9px] uppercase tracking-wider text-cyan-100">
                        Actual Thumb
                      </div>
                      <div className="relative aspect-[4/5] w-full overflow-hidden">
                        <Image
                          src={currentSrc}
                          alt=""
                          width={240}
                          height={300}
                          unoptimized
                          className="absolute max-w-none select-none"
                          style={effectiveThumbnailPreviewStyle}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </LightboxImageStage>

        {metadata && (
          <LightboxMetadataPanel showMetadata={showMetadata}>
            <MetadataPanel
              metadata={metadata}
              isExpanded={showMetadata}
              runtimeDimensions={previewImageSize}
              management={
                canManage
                  ? {
                      isArchived,
                      isStarred,
                      canManage,
                      onRefresh,
                      onSync,
                      onCount,
                      onCrop,
                      onIdText,
                      onResize,
                      onArchive,
                      onUnarchive,
                      onToggleStar,
                      onSetFeaturedPoster,
                      onSetFeaturedBackdrop,
                      onSetFeaturedLogo,
                      onClearFeaturedPoster,
                      onClearFeaturedBackdrop,
                      isFeaturedPoster,
                      isFeaturedBackdrop,
                      isFeaturedLogo,
                      onUpdateContentType,
                      onDelete,
                      onReassign,
                      actionDisabledReasons,
                    }
                  : undefined
              }
              extras={metadataExtras}
              showExtras={showEditTools}
              onToggleExtras={() => setShowEditTools((prev) => !prev)}
            />
          </LightboxMetadataPanel>
        )}
      </div>

      {/* Caption and position */}
      <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-center">
        {alt && (
          <p className="mb-2 rounded-lg bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-sm">
            {alt}
          </p>
        )}
        {position && (
          <p className="text-sm text-white/70">
            {position.current} of {position.total}
          </p>
        )}
      </div>
    </LightboxShell>
  );
}

/**
 * Wrapper component that makes any image clickable to open in lightbox.
 */
export function ClickableImage({
  src,
  alt,
  width,
  height,
  className = "",
  lightboxSrc,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  lightboxSrc?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`cursor-zoom-in ${className}`}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="rounded-lg"
        />
      </button>

      <ImageLightbox
        src={lightboxSrc ?? src}
        alt={alt}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

// Default export for backward compatibility
export default ImageLightbox;
