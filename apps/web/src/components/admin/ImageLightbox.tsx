"use client";

import { useEffect, useState, useRef } from "react";
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

interface ImageLightboxProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  metadata?: PhotoMetadata | null;
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
}

function MetadataPanel({ metadata, isExpanded }: MetadataPanelProps) {
  const [showFullCaption, setShowFullCaption] = useState(false);
  const captionTruncateLength = 200;
  const needsTruncation =
    metadata.caption && metadata.caption.length > captionTruncateLength;

  return (
    <div
      className={`absolute right-0 top-0 bottom-0 z-10 transition-all duration-300 ease-out ${
        isExpanded ? "w-72" : "w-0"
      } overflow-hidden`}
    >
      <div className="h-full w-72 overflow-y-auto bg-black/50 backdrop-blur-xl border-l border-white/10 p-4">
        {/* Source Badge */}
        <div className="mb-4">
          <span className="tracking-widest text-[10px] uppercase text-white/50">
            Source
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-block rounded px-2 py-0.5 text-xs font-medium text-black"
              style={{ backgroundColor: metadata.sourceBadgeColor }}
            >
              {metadata.source.toUpperCase()}
            </span>
          </div>
        </div>

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

        {/* Context Type */}
        {metadata.contextType && (
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
      </div>
    </div>
  );
}

/**
 * Full-screen lightbox for viewing images at larger size.
 * Supports metadata panel, navigation between images, and keyboard controls.
 * Closes on backdrop click, Escape key, or close button.
 */
export function ImageLightbox({
  src,
  alt,
  isOpen,
  onClose,
  metadata,
  position,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  triggerRef,
}: ImageLightboxProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousTrigger = useRef<HTMLElement | null>(null);

  // Store trigger element when opening
  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      previousTrigger.current = triggerRef.current;
    }
  }, [isOpen, triggerRef]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    } else if (previousTrigger.current) {
      previousTrigger.current.focus();
      previousTrigger.current = null;
    }
  }, [isOpen]);

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
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

      {/* Image container with metadata panel overlay */}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={800}
          height={1200}
          className="max-h-[80vh] w-auto rounded-lg object-contain shadow-2xl"
          priority
        />

        {/* Metadata panel (overlay) */}
        {metadata && (
          <MetadataPanel metadata={metadata} isExpanded={showMetadata} />
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
