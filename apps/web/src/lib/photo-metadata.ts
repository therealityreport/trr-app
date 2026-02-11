import type { TrrPersonPhoto, SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

export interface PhotoMetadata {
  source: string;
  sourceBadgeColor: string;
  s3Mirroring?: boolean;
  fileType?: string | null;
  createdAt?: Date | null;
  addedAt?: Date | null;
  hasTextOverlay?: boolean | null;
  sectionTag?: string | null;
  sectionLabel?: string | null;
  sourceLogo?: string | null;
  assetName?: string | null;
  imdbType?: string | null;
  episodeLabel?: string | null;
  sourceVariant?: string | null;
  sourcePageTitle?: string | null;
  sourceUrl?: string | null;
  caption: string | null;
  dimensions: { width: number; height: number } | null;
  season: number | null;
  contextType: string | null;
  people: string[];
  titles: string[];
  fetchedAt: Date | null;
}

const SOURCE_COLORS: Record<string, string> = {
  imdb: "#f5c518",
  tmdb: "#01d277",
  fandom: "#00d6a3",
  "fandom-gallery": "#00d6a3",
};

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/webm": "webm",
  "image/svg+xml": "svg",
};

const parseDateValue = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const parseDimensionNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
};

const parseDimensionPairString = (
  value: unknown
): { width: number; height: number } | null => {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/([0-9]{2,5})\s*[xX×]\s*([0-9]{2,5})/);
  if (!match) return null;
  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
};

const normalizeBool = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "true" || raw === "1" || raw === "yes") return true;
    if (raw === "false" || raw === "0" || raw === "no") return false;
  }
  return null;
};

const inferHasTextOverlay = (
  metadata: Record<string, unknown> | null | undefined
): boolean | null => {
  if (!metadata) return null;
  const direct = normalizeBool((metadata as Record<string, unknown>).has_text_overlay);
  if (direct !== null) return direct;
  return normalizeBool((metadata as Record<string, unknown>).hasTextOverlay);
};

const inferFileType = (
  contentType: string | null | undefined,
  url: string | null | undefined
): string | null => {
  if (contentType) {
    const normalized = contentType.split(";")[0].trim().toLowerCase();
    if (CONTENT_TYPE_TO_EXT[normalized]) {
      return CONTENT_TYPE_TO_EXT[normalized];
    }
    if (normalized.includes("/")) {
      const ext = normalized.split("/")[1];
      return ext || null;
    }
  }
  if (url) {
    try {
      const path = new URL(url).pathname;
      const match = path.match(/\.([a-z0-9]+)$/i);
      if (match) return match[1].toLowerCase();
    } catch {
      const match = url.match(/\.([a-z0-9]+)$/i);
      if (match) return match[1].toLowerCase();
    }
  }
  return null;
};

const inferFandomSectionTag = (value: string | null | undefined): string | null => {
  if (!value) return null;
  // Normalize common separators so matching works for labels like "Theme-Song" or "Chapter_Cards".
  const text = value.toLowerCase().replace(/[_-]+/g, " ");
  if (text.includes("confessional")) return "CONFESSIONAL";
  if (
    text.includes("intro") ||
    text.includes("tagline") ||
    text.includes("opening") ||
    text.includes("theme song") ||
    text.includes("chapter card")
  ) {
    return "INTRO";
  }
  if (text.includes("reunion")) return "REUNION";
  if (text.includes("promo") || text.includes("promotional")) return "PROMO";
  if (text.includes("episode") || text.includes("still")) return "EPISODE STILL";
  return "OTHER";
};

const normalizeSectionToken = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized.includes("confessional")) return "CONFESSIONAL";
  if (
    normalized.includes("intro") ||
    normalized.includes("tagline") ||
    normalized.includes("opening") ||
    normalized.includes("theme song") ||
    normalized.includes("chapter card") ||
    normalized.includes("title card")
  ) {
    return "INTRO";
  }
  if (normalized.includes("reunion")) return "REUNION";
  if (normalized.includes("promo") || normalized.includes("promotional")) return "PROMO";
  if (
    normalized.includes("episode still") ||
    normalized.includes("still frame") ||
    normalized.includes("episodic still")
  ) {
    return "EPISODE STILL";
  }
  if (normalized === "cast photo" || normalized === "cast photos" || normalized === "cast portraits") {
    return "PROMO";
  }
  if (normalized.includes("other")) return "OTHER";
  return null;
};

const inferGeneralSectionTag = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized.includes("confessional")) return "CONFESSIONAL";
  if (
    normalized.includes("intro") ||
    normalized.includes("tagline") ||
    normalized.includes("opening") ||
    normalized.includes("theme song") ||
    normalized.includes("chapter card") ||
    normalized.includes("title card")
  ) {
    return "INTRO";
  }
  if (normalized.includes("reunion")) return "REUNION";
  if (
    normalized.includes("promo") ||
    normalized.includes("promotional") ||
    normalized.includes("season announcement") ||
    normalized.includes("cast portrait")
  ) {
    return "PROMO";
  }
  if (
    normalized.includes("episode still") ||
    normalized.includes("still frame") ||
    normalized.includes("episode photo")
  ) {
    return "EPISODE STILL";
  }
  return null;
};

const sanitizeFandomSectionLabel = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Fandom often renders headings like "Promotional Portraits [ ]". Keep Content Type (PROMO),
  // but suppress the noisy Section label so the lightbox doesn't repeat redundant headings.
  const normalized = trimmed.replace(/\s+/g, " ");
  if (/^promotional portraits\s*\[\s*\]$/i.test(normalized)) return null;
  return trimmed;
};

const parseSeasonNumber = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const text = value.trim();
  if (!text) return null;
  const match = text.match(/\b(?:season|s)\s*([0-9]{1,2})\b/i);
  if (match) {
    const num = Number.parseInt(match[1], 10);
    return Number.isFinite(num) ? num : null;
  }
  return null;
};

const inferImdbEpisodeStillFromCaption = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const text = value.trim();
  if (!text) return false;
  return /\bin\s+.+\(\d{4}\)\s*$/i.test(text);
};

export const resolveMetadataDimensions = (
  metadata: Record<string, unknown> | null | undefined
): { width: number | null; height: number | null } => {
  if (!metadata) return { width: null, height: null };

  const directWidthKeys = [
    "image_width",
    "width",
    "original_width",
    "source_width",
    "source_image_width",
    "hosted_width",
    "natural_width",
    "asset_width",
  ] as const;
  const directHeightKeys = [
    "image_height",
    "height",
    "original_height",
    "source_height",
    "source_image_height",
    "hosted_height",
    "natural_height",
    "asset_height",
  ] as const;

  let width: number | null = null;
  let height: number | null = null;

  for (const key of directWidthKeys) {
    width = parseDimensionNumber(metadata[key]);
    if (width !== null) break;
  }
  for (const key of directHeightKeys) {
    height = parseDimensionNumber(metadata[key]);
    if (height !== null) break;
  }

  const nestedCandidates = [metadata.dimensions, metadata.dimension, metadata.resolution];
  for (const candidate of nestedCandidates) {
    if (width !== null && height !== null) break;
    if (typeof candidate === "string") {
      const pair = parseDimensionPairString(candidate);
      if (pair) {
        width = width ?? pair.width;
        height = height ?? pair.height;
      }
      continue;
    }
    if (candidate && typeof candidate === "object") {
      const record = candidate as Record<string, unknown>;
      width =
        width ??
        parseDimensionNumber(record.width) ??
        parseDimensionNumber(record.w) ??
        parseDimensionNumber(record.image_width);
      height =
        height ??
        parseDimensionNumber(record.height) ??
        parseDimensionNumber(record.h) ??
        parseDimensionNumber(record.image_height);
    }
  }

  return { width, height };
};

const resolveSectionTag = (args: {
  sourceLower: string;
  sectionTagRaw: string | null;
  sectionLabel: string | null;
  contextType: string | null;
  caption: string | null;
  imdbType: string | null;
}): string | null => {
  const { sourceLower, sectionTagRaw, sectionLabel, contextType, caption, imdbType } = args;
  const isFandom = sourceLower === "fandom" || sourceLower === "fandom-gallery";
  const isImdb = sourceLower === "imdb";

  const normalizedRawTag = normalizeSectionToken(sectionTagRaw);
  if (normalizedRawTag && normalizedRawTag !== "OTHER") {
    return normalizedRawTag;
  }

  const text = [sectionTagRaw, sectionLabel, contextType, caption, imdbType]
    .filter(Boolean)
    .join(" ");
  const inferredTag = isFandom ? inferFandomSectionTag(text) : inferGeneralSectionTag(text);

  if (inferredTag && inferredTag !== "OTHER") {
    return inferredTag;
  }

  if (
    isImdb &&
    (inferImdbEpisodeStillFromCaption(caption) ||
      /\bepisode|still|frame\b/i.test(imdbType ?? "") ||
      /\bepisode|still\b/i.test(contextType ?? ""))
  ) {
    return "EPISODE STILL";
  }

  if (normalizedRawTag) {
    return normalizedRawTag;
  }

  if (text.trim().length > 0) {
    return "OTHER";
  }

  return inferredTag;
};

export function mapPhotoToMetadata(
  photo: TrrPersonPhoto,
  options?: { fallbackPeople?: string[] }
): PhotoMetadata {
  const ingestStatus = (photo.ingest_status ?? "").toLowerCase();
  const metadata = (photo.metadata ?? {}) as Record<string, unknown>;
  const sourceLower = photo.source?.toLowerCase?.() ?? "";
  const isImdb = sourceLower === "imdb";

  const sectionTagRaw =
    typeof metadata.fandom_section_tag === "string"
      ? metadata.fandom_section_tag
      : null;
  const sectionLabel =
    typeof metadata.fandom_section_label === "string"
      ? sanitizeFandomSectionLabel(metadata.fandom_section_label)
      : typeof metadata.context_section === "string"
        ? sanitizeFandomSectionLabel(metadata.context_section)
        : typeof photo.context_section === "string"
          ? sanitizeFandomSectionLabel(photo.context_section)
        : null;

  const imdbTypeRaw =
    typeof metadata.imdb_image_type === "string"
      ? metadata.imdb_image_type
      : null;
  const imdbType = imdbTypeRaw ?? (isImdb ? photo.context_type ?? null : null);
  const sectionTagOut = resolveSectionTag({
    sourceLower,
    sectionTagRaw,
    sectionLabel,
    contextType: photo.context_type,
    caption: photo.caption,
    imdbType,
  });

  const episodeNumber =
    typeof metadata.episode_number === "number"
      ? metadata.episode_number
      : typeof metadata.episode_number === "string"
        ? Number.parseInt(metadata.episode_number, 10)
        : null;
  const episodeTitle =
    typeof metadata.episode_title === "string" ? metadata.episode_title : null;
  const episodeLabel =
    episodeNumber && Number.isFinite(episodeNumber)
      ? `Episode ${episodeNumber}${episodeTitle ? ` - ${episodeTitle}` : ""}`
      : episodeTitle;

  const sourceVariant =
    typeof metadata.source_variant === "string"
      ? metadata.source_variant
      : null;
  const sourcePageTitle =
    typeof metadata.source_page_title === "string"
      ? metadata.source_page_title
      : typeof metadata.page_title === "string"
        ? metadata.page_title
      : null;
  const sourceUrl =
    typeof metadata.source_page_url === "string"
      ? metadata.source_page_url
      : typeof metadata.source_url === "string"
        ? metadata.source_url
        : typeof metadata.page_url === "string"
          ? metadata.page_url
        : null;
  const rawCreatedAt =
    metadata.created_at ??
    metadata.createdAt ??
    metadata.original_created_at ??
    metadata.source_created_at ??
    metadata.episode_air_date ??
    metadata.photo_date ??
    metadata.date ??
    metadata.release_date ??
    null;
  const createdAt = parseDateValue(rawCreatedAt);
  const addedAt = photo.created_at ? parseDateValue(photo.created_at) : null;
  const fileType = inferFileType(
    photo.hosted_content_type ?? null,
    photo.hosted_url || photo.url || null
  );
  const metadataDimensions = resolveMetadataDimensions(metadata);
  const metadataWidth = metadataDimensions.width;
  const metadataHeight = metadataDimensions.height;
  const resolvedWidth = parseDimensionNumber(photo.width) ?? metadataWidth;
  const resolvedHeight = parseDimensionNumber(photo.height) ?? metadataHeight;
  const inferredSeason =
    photo.season ??
    (typeof metadata.season_number === "number" ? metadata.season_number : null) ??
    parseSeasonNumber(sectionLabel) ??
    parseSeasonNumber(photo.caption ?? null);
  const sourceLogo =
    typeof metadata.source_logo === "string"
      ? metadata.source_logo
      : typeof metadata.sourceLogo === "string"
        ? metadata.sourceLogo
        : null;
  const assetName =
    typeof metadata.asset_name === "string"
      ? metadata.asset_name
      : typeof metadata.assetName === "string"
        ? metadata.assetName
        : null;
  const fallbackPeople = (options?.fallbackPeople ?? []).filter(
    (name) => typeof name === "string" && name.trim().length > 0
  );

  return {
    source: photo.source,
    sourceBadgeColor: SOURCE_COLORS[photo.source.toLowerCase()] ?? "#6b7280",
    s3Mirroring: ingestStatus === "pending" || ingestStatus === "in_progress",
    fileType,
    createdAt: createdAt ?? null,
    addedAt: createdAt ? null : addedAt,
    hasTextOverlay: inferHasTextOverlay(metadata),
    sectionTag: sectionTagOut,
    sectionLabel,
    sourceLogo,
    assetName,
    imdbType,
    episodeLabel,
    sourceVariant,
    sourcePageTitle,
    sourceUrl,
    caption: photo.caption,
    dimensions:
      resolvedWidth && resolvedHeight
        ? {
            width: resolvedWidth,
            height: resolvedHeight,
          }
        : null,
    season: inferredSeason,
    contextType: photo.context_type,
    people: [...new Set([...(photo.people_names ?? []), ...fallbackPeople])],
    titles: [...new Set(photo.title_names ?? [])],
    fetchedAt: photo.fetched_at ? new Date(photo.fetched_at) : null,
  };
}

/**
 * Maps a SeasonAsset (from Show/Season galleries) to PhotoMetadata format.
 * Extracts rich metadata similar to mapPhotoToMetadata for People photos.
 */
export function mapSeasonAssetToMetadata(
  asset: SeasonAsset,
  seasonNumber?: number,
  showName?: string
): PhotoMetadata {
  const ingestStatus = (asset.ingest_status ?? "").toLowerCase();
  const metadata = (asset.metadata ?? {}) as Record<string, unknown>;
  const sourceLower = asset.source?.toLowerCase?.() ?? "";
  const isImdb = sourceLower === "imdb";

  // Section tag handling (similar to mapPhotoToMetadata)
  const sectionTagRaw =
    typeof metadata.fandom_section_tag === "string"
      ? metadata.fandom_section_tag
      : null;
  const sectionLabel =
    typeof metadata.fandom_section_label === "string"
      ? sanitizeFandomSectionLabel(metadata.fandom_section_label)
      : typeof metadata.context_section === "string"
        ? sanitizeFandomSectionLabel(metadata.context_section)
        : typeof asset.context_section === "string"
          ? sanitizeFandomSectionLabel(asset.context_section)
          : null;
  // IMDb type handling
  const imdbTypeRaw =
    typeof metadata.imdb_image_type === "string"
      ? metadata.imdb_image_type
      : null;
  const imdbType = imdbTypeRaw ?? (isImdb ? asset.context_type ?? null : null);
  let sectionTagOut = resolveSectionTag({
    sourceLower,
    sectionTagRaw,
    sectionLabel,
    contextType: asset.context_type ?? null,
    caption: asset.caption ?? null,
    imdbType,
  });
  const kindLower = (asset.kind ?? "").toLowerCase().trim();
  if (kindLower === "promo" && !sectionTagOut) sectionTagOut = "PROMO";
  if (kindLower === "intro" && !sectionTagOut) sectionTagOut = "INTRO";
  if (kindLower === "reunion" && !sectionTagOut) sectionTagOut = "REUNION";
  if ((kindLower === "episode_still" || kindLower === "episode still") && !sectionTagOut) {
    sectionTagOut = "EPISODE STILL";
  }

  // Episode handling
  const episodeNumber =
    asset.episode_number ??
    (typeof metadata.episode_number === "number"
      ? metadata.episode_number
      : typeof metadata.episode_number === "string"
        ? Number.parseInt(metadata.episode_number, 10)
        : null);
  const episodeTitle =
    typeof metadata.episode_title === "string" ? metadata.episode_title : null;
  const episodeLabel =
    episodeNumber && Number.isFinite(episodeNumber)
      ? `Episode ${episodeNumber}${episodeTitle ? ` - ${episodeTitle}` : ""}`
      : episodeTitle;

  // Source page info
  const sourceVariant =
    typeof metadata.source_variant === "string"
      ? metadata.source_variant
      : null;
  const sourcePageTitle =
    typeof metadata.source_page_title === "string"
      ? metadata.source_page_title
      : typeof metadata.page_title === "string"
        ? metadata.page_title
        : null;
  const sourceUrl =
    typeof metadata.source_page_url === "string"
      ? metadata.source_page_url
      : typeof metadata.source_url === "string"
        ? metadata.source_url
        : typeof metadata.page_url === "string"
          ? metadata.page_url
          : null;

  // Dates
  const rawCreatedAt =
    metadata.created_at ??
    metadata.createdAt ??
    metadata.original_created_at ??
    metadata.source_created_at ??
    metadata.episode_air_date ??
    metadata.photo_date ??
    metadata.date ??
    metadata.release_date ??
    null;
  const createdAt = parseDateValue(rawCreatedAt);
  const addedAt = asset.created_at ? parseDateValue(asset.created_at) : null;

  // File type
  const fileType = inferFileType(
    asset.hosted_content_type ?? null,
    asset.hosted_url ?? null
  );

  // Dimensions from metadata fallback
  const metadataDimensions = resolveMetadataDimensions(metadata);
  const metadataWidth = metadataDimensions.width;
  const metadataHeight = metadataDimensions.height;
  const resolvedWidth = parseDimensionNumber(asset.width) ?? metadataWidth;
  const resolvedHeight = parseDimensionNumber(asset.height) ?? metadataHeight;

  const sourceLogo =
    typeof metadata.source_logo === "string"
      ? metadata.source_logo
      : typeof metadata.sourceLogo === "string"
        ? metadata.sourceLogo
        : null;
  const assetName =
    typeof metadata.asset_name === "string"
      ? metadata.asset_name
      : typeof metadata.assetName === "string"
        ? metadata.assetName
        : null;

  // Determine context type label
  const kindLowerContext = (asset.kind ?? "").toLowerCase();
  const contextType =
    asset.type === "episode"
      ? `Episode ${asset.episode_number ?? ""}`
      : asset.type === "season"
        ? kindLowerContext === "cast"
          ? "Cast Photos"
          : kindLowerContext === "backdrop"
            ? "Backdrop"
            : kindLowerContext === "promo"
              ? "Promo"
              : kindLowerContext === "intro"
                ? "Intro"
                : kindLowerContext === "reunion"
                  ? "Reunion"
                  : kindLowerContext === "episode_still"
                    ? "Episode Still"
                    : kindLowerContext === "other"
                      ? sourceLower.startsWith("web_scrape:")
                        ? "Other"
                        : "Season Poster"
                    : "Season Poster"
      : asset.type === "show"
          ? kindLowerContext === "backdrop"
            ? "Backdrop"
            : kindLowerContext === "logo"
              ? "Logo"
              : kindLowerContext === "poster"
                ? "Show Poster"
                : "Show Image"
        : asset.context_type ?? "Cast Photo";

  const peopleFromMeta = Array.isArray((metadata as Record<string, unknown>).people_names)
    ? ((metadata as Record<string, unknown>).people_names as unknown[])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim())
    : [];
  const people =
    peopleFromMeta.length > 0
      ? [...new Set(peopleFromMeta)]
      : asset.person_name
        ? [asset.person_name]
        : [];

  return {
    source: asset.source,
    sourceBadgeColor: SOURCE_COLORS[asset.source.toLowerCase()] ?? "#6b7280",
    s3Mirroring: ingestStatus === "pending" || ingestStatus === "in_progress",
    fileType,
    createdAt: createdAt ?? null,
    addedAt: createdAt ? null : addedAt,
    hasTextOverlay: inferHasTextOverlay(metadata),
    sectionTag: sectionTagOut,
    sectionLabel,
    sourceLogo,
    assetName,
    imdbType,
    episodeLabel,
    sourceVariant,
    sourcePageTitle,
    sourceUrl,
    caption: asset.caption,
    dimensions:
      resolvedWidth && resolvedHeight
        ? {
            width: resolvedWidth,
            height: resolvedHeight,
          }
        : null,
    season: asset.season_number ?? seasonNumber ?? null,
    contextType,
    people,
    titles: showName ? [showName] : [],
    fetchedAt: asset.fetched_at ? new Date(asset.fetched_at) : null,
  };
}
