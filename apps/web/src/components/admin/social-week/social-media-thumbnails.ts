import { canonicalizeHostedMediaUrl } from "@/lib/hosted-media";

const SOCIAL_MEDIA_VIDEO_EXT_RE = /\.(mp4|mov|m4v|webm|m3u8|mpd)(\?|$)/i;
const DISPLAY_THUMBNAIL_VARIANT_ORDER = [
  "card_webp",
  "card_jpeg",
  "poster_card_webp",
  "poster_card_jpeg",
  "thumb_webp",
  "thumb_jpeg",
] as const;
const DISPLAY_THUMBNAIL_SRCSET_VARIANT_ORDER = [
  "thumb_webp",
  "thumb_jpeg",
  "card_webp",
  "card_jpeg",
  "poster_card_webp",
  "poster_card_jpeg",
  "detail_webp",
  "detail_jpeg",
] as const;
const DISPLAY_THUMBNAIL_VARIANT_WIDTHS: Record<string, number> = {
  thumb_webp: 320,
  thumb_jpeg: 320,
  card_webp: 720,
  card_jpeg: 720,
  poster_card_webp: 720,
  poster_card_jpeg: 720,
  detail_webp: 1440,
  detail_jpeg: 1440,
};

type DisplayThumbnailVariantValue =
  | string
  | null
  | undefined
  | {
      url?: string | null;
      width?: number | null;
      descriptor?: string | null;
    };

export type DisplayThumbnailVariants = Record<string, DisplayThumbnailVariantValue> | null | undefined;

export type DisplayThumbnailSelection = {
  src: string | null;
  srcSet: string | null;
};

const normalizeCandidate = (value: string | null | undefined): string => {
  return canonicalizeHostedMediaUrl(value) ?? "";
};

export function isVideoLikeSocialUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const normalized = normalizeCandidate(url).toLowerCase();
  if (!normalized) return false;
  if (SOCIAL_MEDIA_VIDEO_EXT_RE.test(normalized)) return true;
  try {
    const parsed = new URL(normalized);
    return parsed.hostname.toLowerCase().includes("video.twimg.com");
  } catch {
    return false;
  }
}

export function pickFirstNonVideoUrl(urls: Array<string | null | undefined>): string | null {
  for (const raw of urls) {
    const candidate = normalizeCandidate(raw);
    if (!candidate) continue;
    if (!isVideoLikeSocialUrl(candidate)) return candidate;
  }
  return null;
}

function pickFirstAvailableUrl(urls: Array<string | null | undefined>): string | null {
  for (const raw of urls) {
    const candidate = normalizeCandidate(raw);
    if (candidate) return candidate;
  }
  return null;
}

function normalizeDisplayVariant(value: DisplayThumbnailVariantValue): {
  url: string | null;
  width: number | null;
  descriptor: string | null;
} {
  if (typeof value === "string") {
    return { url: normalizeCandidate(value) || null, width: null, descriptor: null };
  }
  if (!value || typeof value !== "object") {
    return { url: null, width: null, descriptor: null };
  }
  return {
    url: normalizeCandidate(value.url) || null,
    width: typeof value.width === "number" && Number.isFinite(value.width) && value.width > 0 ? value.width : null,
    descriptor: typeof value.descriptor === "string" && value.descriptor.trim() ? value.descriptor.trim() : null,
  };
}

function getDisplayVariantUrl(
  variants: DisplayThumbnailVariants,
  key: string,
): string | null {
  if (!variants) return null;
  const variant = normalizeDisplayVariant(variants[key]);
  if (!variant.url || isVideoLikeSocialUrl(variant.url)) return null;
  return variant.url;
}

function getDisplayVariantSrcSetEntry(
  variants: DisplayThumbnailVariants,
  key: string,
): string | null {
  if (!variants) return null;
  const variant = normalizeDisplayVariant(variants[key]);
  if (!variant.url || isVideoLikeSocialUrl(variant.url)) return null;
  const descriptor =
    variant.descriptor ??
    (variant.width ? `${variant.width}w` : DISPLAY_THUMBNAIL_VARIANT_WIDTHS[key] ? `${DISPLAY_THUMBNAIL_VARIANT_WIDTHS[key]}w` : null);
  return descriptor ? `${variant.url} ${descriptor}` : variant.url;
}

function parseDisplayThumbnailSrcSet(srcSet: string | null | undefined): Array<{ url: string; descriptor: string | null }> {
  if (typeof srcSet !== "string" || srcSet.trim().length === 0) return [];
  return srcSet
    .split(",")
    .map((entry) => entry.trim())
    .map((entry) => {
      const [rawUrl, ...descriptorParts] = entry.split(/\s+/);
      const url = normalizeCandidate(rawUrl);
      if (!url || isVideoLikeSocialUrl(url)) return null;
      const descriptor = descriptorParts.join(" ").trim() || null;
      return { url, descriptor };
    })
    .filter((entry): entry is { url: string; descriptor: string | null } => Boolean(entry));
}

function buildSafeDisplayThumbnailSrcSet(
  displayThumbnailSrcSet: string | null | undefined,
  variants: DisplayThumbnailVariants,
): string | null {
  const explicitEntries = parseDisplayThumbnailSrcSet(displayThumbnailSrcSet);
  if (explicitEntries.length > 0) {
    return explicitEntries.map((entry) => (entry.descriptor ? `${entry.url} ${entry.descriptor}` : entry.url)).join(", ");
  }

  const variantEntries = DISPLAY_THUMBNAIL_SRCSET_VARIANT_ORDER
    .map((key) => getDisplayVariantSrcSetEntry(variants, key))
    .filter((entry): entry is string => Boolean(entry));
  if (variantEntries.length === 0) return null;
  return Array.from(new Set(variantEntries)).join(", ");
}

export function selectDisplayThumbnail(input: {
  displayThumbnail: string | null | undefined;
  displayThumbnailSrcSet?: string | null | undefined;
  displayThumbnailVariants?: DisplayThumbnailVariants;
  fallbackUrls?: Array<string | null | undefined>;
}): DisplayThumbnailSelection {
  const safeSrcSetEntries = parseDisplayThumbnailSrcSet(input.displayThumbnailSrcSet);
  const variantUrls = DISPLAY_THUMBNAIL_VARIANT_ORDER.map((key) =>
    getDisplayVariantUrl(input.displayThumbnailVariants, key),
  );
  const src = pickFirstNonVideoUrl([
    input.displayThumbnail,
    ...safeSrcSetEntries.map((entry) => entry.url).reverse(),
    ...variantUrls,
    ...(input.fallbackUrls ?? []),
  ]);

  return {
    src,
    srcSet: src ? buildSafeDisplayThumbnailSrcSet(input.displayThumbnailSrcSet, input.displayThumbnailVariants) : null,
  };
}

export function selectTwitterThumbnailUrl(input: {
  displayThumbnail?: string | null | undefined;
  displayThumbnailSrcSet?: string | null | undefined;
  displayThumbnailVariants?: DisplayThumbnailVariants;
  hostedThumbnail: string | null | undefined;
  thumbnail: string | null | undefined;
  hostedMediaUrls: string[];
  mediaUrls: string[];
}): string | null {
  const preferred = selectTwitterThumbnail(input).src;
  if (preferred) return preferred;
  return null;
}

export function selectTwitterThumbnail(input: {
  displayThumbnail?: string | null | undefined;
  displayThumbnailSrcSet?: string | null | undefined;
  displayThumbnailVariants?: DisplayThumbnailVariants;
  hostedThumbnail: string | null | undefined;
  thumbnail: string | null | undefined;
  hostedMediaUrls: string[];
  mediaUrls: string[];
}): DisplayThumbnailSelection {
  const fallbackUrls = [
    input.hostedThumbnail,
    input.thumbnail,
    ...(input.hostedMediaUrls || []),
    ...(input.mediaUrls || []),
  ];
  const preferred = selectDisplayThumbnail({
    displayThumbnail: input.displayThumbnail,
    displayThumbnailSrcSet: input.displayThumbnailSrcSet,
    displayThumbnailVariants: input.displayThumbnailVariants,
    fallbackUrls,
  });
  if (preferred.src) return preferred;
  return { src: pickFirstAvailableUrl(fallbackUrls), srcSet: null };
}

export function selectInstagramTikTokThumbnailUrl(input: {
  displayThumbnail?: string | null | undefined;
  displayThumbnailSrcSet?: string | null | undefined;
  displayThumbnailVariants?: DisplayThumbnailVariants;
  hostedThumbnail: string | null | undefined;
  thumbnail: string | null | undefined;
  hostedMediaUrls: string[];
  mediaUrls: string[];
  sourceMediaUrls?: string[];
}): string | null {
  const preferred = selectInstagramTikTokThumbnail(input).src;
  if (preferred) return preferred;
  return null;
}

export function selectInstagramTikTokThumbnail(input: {
  displayThumbnail?: string | null | undefined;
  displayThumbnailSrcSet?: string | null | undefined;
  displayThumbnailVariants?: DisplayThumbnailVariants;
  hostedThumbnail: string | null | undefined;
  thumbnail: string | null | undefined;
  hostedMediaUrls: string[];
  mediaUrls: string[];
  sourceMediaUrls?: string[];
}): DisplayThumbnailSelection {
  const fallbackUrls = [
    input.hostedThumbnail,
    input.thumbnail,
    ...(input.hostedMediaUrls || []),
    ...(input.sourceMediaUrls || []),
    ...(input.mediaUrls || []),
  ];
  const preferred = selectDisplayThumbnail({
    displayThumbnail: input.displayThumbnail,
    displayThumbnailSrcSet: input.displayThumbnailSrcSet,
    displayThumbnailVariants: input.displayThumbnailVariants,
    fallbackUrls,
  });
  if (preferred.src) return preferred;
  return { src: pickFirstAvailableUrl(fallbackUrls), srcSet: null };
}
