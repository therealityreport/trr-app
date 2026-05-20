"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import {
  isThumbnailCropMode,
  resolveThumbnailPresentation,
} from "@/lib/thumbnail-crop";

export function GalleryImage({
  src,
  srcCandidates,
  diagnosticKey,
  onFallbackEvent,
  alt,
  sizes = "200px",
  className = "object-cover",
  style,
  children,
}: {
  src: string;
  srcCandidates?: string[];
  diagnosticKey?: string;
  onFallbackEvent?: (event: "attempt" | "recovered" | "failed") => void;
  alt: string;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const fallbackCandidates = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const value of srcCandidates ?? []) {
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (!trimmed || trimmed === src || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
    return out;
  }, [src, srcCandidates]);
  const fallbackCandidatesSignature = useMemo(
    () => fallbackCandidates.join("\u0001"),
    [fallbackCandidates]
  );
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const telemetryStateRef = useRef({
    attempted: false,
    recovered: false,
    failed: false,
  });

  useEffect(() => {
    setHasError(false);
    setCurrentSrc(src);
    setFallbackIndex(0);
    telemetryStateRef.current = {
      attempted: false,
      recovered: false,
      failed: false,
    };
    if (onFallbackEvent && !telemetryStateRef.current.attempted) {
      onFallbackEvent("attempt");
      telemetryStateRef.current.attempted = true;
    }
  }, [src, fallbackCandidatesSignature, onFallbackEvent]);

  const handleError = () => {
    const nextCandidate = fallbackCandidates[fallbackIndex] ?? null;
    if (nextCandidate && nextCandidate !== currentSrc) {
      setCurrentSrc(nextCandidate);
      setFallbackIndex((prev) => prev + 1);
      return;
    }
    if (diagnosticKey) {
      console.warn("[show-gallery] all image URL candidates failed", {
        asset: diagnosticKey,
        attempted: fallbackCandidates.length + 1,
      });
    }
    if (onFallbackEvent && !telemetryStateRef.current.failed) {
      onFallbackEvent("failed");
      telemetryStateRef.current.failed = true;
    }
    setHasError(true);
  };

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
        src={currentSrc}
        alt={alt}
        fill
        className={className}
        style={style}
        sizes={sizes}
        unoptimized
        onError={handleError}
        onLoad={() => {
          if (onFallbackEvent && currentSrc !== src && !telemetryStateRef.current.recovered) {
            onFallbackEvent("recovered");
            telemetryStateRef.current.recovered = true;
          }
        }}
      />
      {children}
    </>
  );
}

export function CastPhoto({
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
  if (process.env.NODE_ENV !== "production") {
    return null;
  }
  if (!network) return null;
  const normalized = network.trim().toLowerCase();
  if (!normalized) return null;
  const domain = NETWORK_LOGO_DOMAIN_BY_NAME[normalized];
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
};

export function NetworkNameOrLogo({
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
      <Image
        src={logoUrl}
        alt={network ? `${network} logo` : "Network logo"}
        className="h-6 w-auto object-contain"
        width={96}
        height={24}
        loading="lazy"
        unoptimized
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

export function ShowNameOrLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const trimmedLogo = typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : null;

  if (trimmedLogo && !logoFailed) {
    return (
      <Image
        src={trimmedLogo}
        alt={`${name} logo`}
        className="h-14 w-auto max-w-[28rem] object-contain"
        width={448}
        height={56}
        loading="lazy"
        unoptimized
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return <h1 className="text-3xl font-bold text-zinc-900">{name}</h1>;
}

export function RefreshProgressBar({
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
