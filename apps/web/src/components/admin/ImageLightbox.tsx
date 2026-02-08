"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import Image from "next/image";
import type { PhotoMetadata } from "@/lib/photo-metadata";

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

function formatContentTypeLabel(raw: string): string {
  const normalized = raw.trim().toUpperCase();
  switch (normalized) {
    case "PROMO":
      return "Promo Portraits";
    case "CONFESSIONAL":
      return "Confessional";
    case "INTRO":
      return "Intro";
    case "REUNION":
      return "Reunion";
    case "EPISODE STILL":
      return "Episode Still";
    case "OTHER":
      return "Other";
    default:
      return raw;
  }
}

export type ImageType = "cast" | "episode" | "season";

interface ImageManagementProps {
  imageType?: ImageType;
  imageId?: string;
  isArchived?: boolean;
  canManage?: boolean;
  onArchive?: () => Promise<void>;
  onUnarchive?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onReassign?: () => void;
}

interface ImageLightboxProps extends ImageManagementProps {
  src: string;
  fallbackSrc?: string | null;
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
}

interface MetadataPanelProps {
  metadata: PhotoMetadata;
  isExpanded: boolean;
  management?: {
    isArchived?: boolean;
    canManage?: boolean;
    onArchive?: () => Promise<void>;
    onUnarchive?: () => Promise<void>;
    onDelete?: () => Promise<void>;
    onReassign?: () => void;
  };
  extras?: ReactNode;
}

function MetadataPanel({ metadata, isExpanded, management, extras }: MetadataPanelProps) {
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const captionTruncateLength = 200;
  const needsTruncation =
    metadata.caption && metadata.caption.length > captionTruncateLength;
  const normalizedContextType = metadata.contextType?.toLowerCase?.() ?? null;
  const normalizedSectionTag = metadata.sectionTag?.toLowerCase?.() ?? null;
  const normalizedImdbType = metadata.imdbType?.toLowerCase?.() ?? null;
  const showContextType =
    Boolean(metadata.contextType) &&
    normalizedContextType !== normalizedSectionTag &&
    normalizedContextType !== normalizedImdbType;
  const sourcePageLabel = metadata.sourcePageTitle || metadata.sourceUrl || null;

  const handleAction = async (
    action: "archive" | "unarchive" | "delete",
    handler?: () => Promise<void>
  ) => {
    if (!handler || actionLoading) return;
    setActionLoading(action);
    try {
      await handler();
    } finally {
      setActionLoading(null);
    }
  };

  const canArchive = Boolean(management?.onArchive) || Boolean(management?.onUnarchive);
  const canReassign = Boolean(management?.onReassign);
  const canDelete = Boolean(management?.onDelete);
  const hasAnyActions = canArchive || canReassign || canDelete;

  return (
    <div
      data-expanded={isExpanded ? "true" : "false"}
      className="h-full w-full overflow-y-auto bg-black/50 backdrop-blur-xl p-4"
    >
      {/* Source Badge */}
      <div className="mb-4">
        <span className="tracking-widest text-[10px] uppercase text-white/50">
          Source
        </span>
        <div className="mt-1 flex items-center gap-2">
          {metadata.s3Mirroring && (
            <span className="inline-block rounded px-2 py-0.5 text-xs font-medium text-white bg-blue-500/80">
              S3 MIRRORING
            </span>
          )}
          <span
            className="inline-block rounded px-2 py-0.5 text-xs font-medium text-black"
            style={{ backgroundColor: metadata.sourceBadgeColor }}
          >
            {metadata.source.toUpperCase()}
          </span>
        </div>
      </div>

        {metadata.sourceVariant && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Source Variant
            </span>
            <p className="mt-1 text-sm text-white/90">
              {metadata.sourceVariant}
            </p>
          </div>
        )}

        {sourcePageLabel && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Source Page
            </span>
            {metadata.sourceUrl ? (
              <a
                href={metadata.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-sm text-white/90 underline break-all"
              >
                {sourcePageLabel}
              </a>
            ) : (
              <p className="mt-1 text-sm text-white/90 break-all">{sourcePageLabel}</p>
            )}
          </div>
        )}

        {metadata.sectionTag && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Content Type
            </span>
            <p className="mt-1 text-sm text-white/90">
              {formatContentTypeLabel(metadata.sectionTag)}
            </p>
          </div>
        )}

        {metadata.sectionLabel && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Section
            </span>
            <p className="mt-1 text-sm text-white/90">
              {metadata.sectionLabel}
            </p>
          </div>
        )}

        {/* Dimensions */}
        {metadata.dimensions && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Dimensions
            </span>
            <p className="mt-1 text-sm text-white/90">
              {metadata.dimensions.width} × {metadata.dimensions.height}
            </p>
          </div>
        )}

        {metadata.fileType && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              File Type
            </span>
            <p className="mt-1 text-sm text-white/90">
              {metadata.fileType.toUpperCase()}
            </p>
          </div>
        )}

        {metadata.createdAt && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Created
            </span>
            <p className="mt-1 text-sm text-white/90">
              {metadata.createdAt.toLocaleDateString()}
            </p>
          </div>
        )}

        {!metadata.createdAt && metadata.addedAt && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Added
            </span>
            <p className="mt-1 text-sm text-white/90">
              {metadata.addedAt.toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Season */}
        {metadata.season && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Season
            </span>
            <p className="mt-1 text-sm text-white/90">
              Season {metadata.season}
            </p>
          </div>
        )}

        {metadata.episodeLabel && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Episode
            </span>
            <p className="mt-1 text-sm text-white/90">
              {metadata.episodeLabel}
            </p>
          </div>
        )}

        {metadata.imdbType && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              IMDb Type
            </span>
            <p className="mt-1 text-sm text-white/90">
              {metadata.imdbType}
            </p>
          </div>
        )}

        {/* Context Type */}
        {showContextType && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Type
            </span>
            <p className="mt-1 text-sm text-white/90 capitalize">
              {metadata.contextType}
            </p>
          </div>
        )}

        {/* Caption */}
        {metadata.caption && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Caption
            </span>
            <p className="mt-1 text-sm text-white/90">
              {needsTruncation && !showFullCaption
                ? `${metadata.caption.slice(0, captionTruncateLength)}...`
                : metadata.caption}
            </p>
            {needsTruncation && (
              <button
                onClick={() => setShowFullCaption(!showFullCaption)}
                className="mt-1 text-xs text-white/60 hover:text-white/90 flex items-center gap-1"
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
        )}

        {/* People */}
        {metadata.people.length > 0 && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              People
            </span>
            <div className="mt-1 max-h-32 overflow-y-auto">
              {metadata.people.map((person, i) => (
                <p key={i} className="text-sm text-white/90">
                  {person}
                </p>
              ))}
            </div>
          </div>
        )}

        {extras && <div className="mb-4">{extras}</div>}

        {/* Titles */}
        {metadata.titles.length > 0 && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Titles
            </span>
            <div className="mt-1 max-h-32 overflow-y-auto">
              {metadata.titles.map((title, i) => (
                <p key={i} className="text-sm text-white/90">
                  {title}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Fetched Date */}
        {metadata.fetchedAt && (
          <div className="mb-4">
            <span className="tracking-widest text-[10px] uppercase text-white/50">
              Fetched
            </span>
            <p className="mt-1 text-sm text-white/90">
              {metadata.fetchedAt.toLocaleDateString()}
            </p>
          </div>
        )}

      {/* Management Actions */}
      {management?.canManage && hasAnyActions && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Actions
          </span>
          <div className="mt-2 space-y-2">
            {canArchive &&
              (management.isArchived ? (
                <button
                  onClick={() => handleAction("unarchive", management.onUnarchive)}
                  disabled={actionLoading !== null}
                  className="w-full rounded bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 text-left disabled:opacity-50"
                >
                  {actionLoading === "unarchive" ? "Unarchiving..." : "📦 Unarchive"}
                </button>
              ) : (
                <button
                  onClick={() => handleAction("archive", management.onArchive)}
                  disabled={actionLoading !== null}
                  className="w-full rounded bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 text-left disabled:opacity-50"
                >
                  {actionLoading === "archive" ? "Archiving..." : "📦 Archive"}
                </button>
              ))}
            {canReassign && (
              <button
                onClick={() => management.onReassign?.()}
                disabled={actionLoading !== null}
                className="w-full rounded bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 text-left disabled:opacity-50"
              >
                📁 Re-assign
              </button>
            )}
            {canDelete && (
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
                disabled={actionLoading !== null}
                className="w-full rounded bg-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/30 text-left disabled:opacity-50"
              >
                {actionLoading === "delete" ? "Deleting..." : "🗑️ Delete"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Full-screen lightbox for viewing images at larger size.
 * Supports metadata panel, navigation between images, and keyboard controls.
 * Closes on backdrop click, Escape key, or close button.
 */
// Check if element is an input-like element (don't hijack typing)
function isInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    element.isContentEditable
  );
}

export function ImageLightbox({
  src,
  fallbackSrc,
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
  // Management props (imageType/imageId used by parent to construct handlers)
  isArchived,
  canManage,
  onArchive,
  onUnarchive,
  onDelete,
  onReassign,
}: ImageLightboxProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [imageFailed, setImageFailed] = useState(false);
  const triedFallbackRef = useRef(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setCurrentSrc(src);
    setImageFailed(false);
    triedFallbackRef.current = false;
  }, [src, fallbackSrc]);

  const handleImageError = () => {
    if (!triedFallbackRef.current && fallbackSrc && fallbackSrc !== currentSrc) {
      triedFallbackRef.current = true;
      setCurrentSrc(fallbackSrc);
      return;
    }
    setImageFailed(true);
  };

  // Store trigger element when opening
  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      previousTrigger.current = triggerRef.current;
    }
  }, [isOpen, triggerRef]);

  // Focus management - focus first element on open, restore on close
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    } else if (previousTrigger.current) {
      previousTrigger.current.focus();
      previousTrigger.current = null;
    }
  }, [isOpen]);

  // Focus trap - cycle Tab within modal
  useEffect(() => {
    if (!isOpen) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusableArray = Array.from(focusableElements);
      if (focusableArray.length === 0) return;

      const firstElement = focusableArray[0];
      const lastElement = focusableArray[focusableArray.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  // Keyboard shortcuts (guarded against input elements)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack typing in input elements
      if (isInputElement(e.target)) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrevious && onPrevious) {
            e.preventDefault();
            onPrevious();
          }
          break;
        case "ArrowRight":
          if (hasNext && onNext) {
            e.preventDefault();
            onNext();
          }
          break;
        case "i":
          if (metadata) {
            setShowMetadata((prev) => !prev);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasPrevious, hasNext, onPrevious, onNext, onClose, metadata]);

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

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
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
        <div className="relative flex flex-1 items-center justify-center bg-black/20">
          {imageFailed ? (
            <div className="flex h-[60vh] w-[60vw] max-w-[90vw] items-center justify-center rounded-lg bg-black/40 text-sm text-white/70">
              Image failed to load
            </div>
          ) : (
            <Image
              src={currentSrc}
              alt={alt}
              width={800}
              height={1200}
              className="max-h-[80vh] w-auto object-contain shadow-2xl md:max-h-[90vh]"
              priority
              unoptimized
              onError={handleImageError}
            />
          )}
        </div>

        {metadata && (
          <div
            className={`relative shrink-0 overflow-hidden border-t border-white/10 transition-all duration-300 ease-out md:border-t-0 md:border-l ${
              showMetadata
                ? "h-64 w-full md:h-auto md:w-80"
                : "h-0 w-full md:h-auto md:w-0"
            }`}
          >
            <div className={showMetadata ? "h-full w-full" : "pointer-events-none h-full w-full"}>
              <MetadataPanel
                metadata={metadata}
                isExpanded={showMetadata}
                management={
                  canManage
                    ? {
                        isArchived,
                        canManage,
                        onArchive,
                        onUnarchive,
                        onDelete,
                        onReassign,
                      }
                    : undefined
                }
                extras={metadataExtras}
              />
            </div>
          </div>
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
    </div>
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
