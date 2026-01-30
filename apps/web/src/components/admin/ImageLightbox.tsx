"use client";

import { useEffect, useCallback, useState } from "react";
import Image from "next/image";

interface ImageLightboxProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Full-screen lightbox for viewing images at larger size.
 * Closes on backdrop click, Escape key, or close button.
 */
export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        aria-label="Close lightbox"
      >
        <svg
          className="h-6 w-6"
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
      </button>

      {/* Image container */}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={800}
          height={1200}
          className="max-h-[90vh] w-auto object-contain rounded-lg shadow-2xl"
          priority
        />
      </div>

      {/* Caption */}
      {alt && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-lg">
          <p className="text-white text-sm">{alt}</p>
        </div>
      )}
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

