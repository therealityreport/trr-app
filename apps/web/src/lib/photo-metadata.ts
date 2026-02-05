import type { TrrPersonPhoto, SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

export interface PhotoMetadata {
  source: string;
  sourceBadgeColor: string;
  s3Mirroring?: boolean;
  fileType?: string | null;
  createdAt?: Date | null;
  addedAt?: Date | null;
  sectionTag?: string | null;
  sectionLabel?: string | null;
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
  const text = value.toLowerCase();
  if (text.includes("confessional")) return "CONFESSIONAL";
  if (text.includes("intro") || text.includes("tagline") || text.includes("opening")) return "INTRO";
  if (text.includes("reunion")) return "REUNION";
  if (text.includes("promo") || text.includes("promotional")) return "PROMO";
  if (text.includes("episode") || text.includes("still")) return "EPISODE STILL";
  return "OTHER";
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

export function mapPhotoToMetadata(photo: TrrPersonPhoto): PhotoMetadata {
  const ingestStatus = (photo.ingest_status ?? "").toLowerCase();
  const metadata = (photo.metadata ?? {}) as Record<string, unknown>;
  const sourceLower = photo.source?.toLowerCase?.() ?? "";
  const isFandom = sourceLower === "fandom" || sourceLower === "fandom-gallery";
  const isImdb = sourceLower === "imdb";

  const sectionTagRaw =
    typeof metadata.fandom_section_tag === "string"
      ? metadata.fandom_section_tag
      : null;
  const sectionLabel =
    typeof metadata.fandom_section_label === "string"
      ? metadata.fandom_section_label
      : typeof metadata.context_section === "string"
        ? metadata.context_section
        : typeof photo.context_section === "string"
          ? photo.context_section
        : null;
  const normalizedSectionTag = isFandom && sectionTagRaw
    ? inferFandomSectionTag(sectionTagRaw) ?? sectionTagRaw
    : null;
  const inferredTagInput = [photo.context_type, sectionLabel, photo.caption]
    .filter(Boolean)
    .join(" ");
  const sectionTag =
    normalizedSectionTag ??
    (isFandom
      ? inferFandomSectionTag(inferredTagInput)
      : sectionTagRaw ?? sectionLabel ?? null);

  const imdbTypeRaw =
    typeof metadata.imdb_image_type === "string"
      ? metadata.imdb_image_type
      : null;
  const imdbType = imdbTypeRaw ?? (isImdb ? photo.context_type ?? null : null);

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
  const metadataWidth =
    typeof metadata.image_width === "number"
      ? metadata.image_width
      : typeof metadata.width === "number"
        ? metadata.width
        : null;
  const metadataHeight =
    typeof metadata.image_height === "number"
      ? metadata.image_height
      : typeof metadata.height === "number"
        ? metadata.height
        : null;
  const inferredSeason =
    photo.season ??
    (typeof metadata.season_number === "number" ? metadata.season_number : null) ??
    parseSeasonNumber(sectionLabel) ??
    parseSeasonNumber(photo.caption ?? null);
  return {
    source: photo.source,
    sourceBadgeColor: SOURCE_COLORS[photo.source.toLowerCase()] ?? "#6b7280",
    s3Mirroring: ingestStatus === "pending" || ingestStatus === "in_progress",
    fileType,
    createdAt: createdAt ?? null,
    addedAt: createdAt ? null : addedAt,
    sectionTag,
    sectionLabel,
    imdbType,
    episodeLabel,
    sourceVariant,
    sourcePageTitle,
    sourceUrl,
    caption: photo.caption,
    dimensions:
      (photo.width ?? metadataWidth) && (photo.height ?? metadataHeight)
        ? {
            width: (photo.width ?? metadataWidth) as number,
            height: (photo.height ?? metadataHeight) as number,
          }
        : null,
    season: inferredSeason,
    contextType: photo.context_type,
    people: [...new Set(photo.people_names ?? [])],
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
  const isFandom = sourceLower === "fandom" || sourceLower === "fandom-gallery";
  const isImdb = sourceLower === "imdb";

  // Section tag handling (similar to mapPhotoToMetadata)
  const sectionTagRaw =
    typeof metadata.fandom_section_tag === "string"
      ? metadata.fandom_section_tag
      : null;
  const sectionLabel =
    typeof metadata.fandom_section_label === "string"
      ? metadata.fandom_section_label
      : typeof metadata.context_section === "string"
        ? metadata.context_section
        : typeof asset.context_section === "string"
          ? asset.context_section
          : null;
  const normalizedSectionTag = isFandom && sectionTagRaw
    ? inferFandomSectionTag(sectionTagRaw) ?? sectionTagRaw
    : null;
  const inferredTagInput = [asset.context_type, sectionLabel, asset.caption]
    .filter(Boolean)
    .join(" ");
  const sectionTag =
    normalizedSectionTag ??
    (isFandom
      ? inferFandomSectionTag(inferredTagInput)
      : sectionTagRaw ?? sectionLabel ?? null);

  // IMDb type handling
  const imdbTypeRaw =
    typeof metadata.imdb_image_type === "string"
      ? metadata.imdb_image_type
      : null;
  const imdbType = imdbTypeRaw ?? (isImdb ? asset.context_type ?? null : null);

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
  const metadataWidth =
    typeof metadata.image_width === "number"
      ? metadata.image_width
      : typeof metadata.width === "number"
        ? metadata.width
        : null;
  const metadataHeight =
    typeof metadata.image_height === "number"
      ? metadata.image_height
      : typeof metadata.height === "number"
        ? metadata.height
        : null;

  // Determine context type label
  const contextType =
    asset.type === "episode"
      ? `Episode ${asset.episode_number ?? ""}`
      : asset.type === "season"
        ? "Season Poster"
        : asset.context_type ?? "Cast Photo";

  return {
    source: asset.source,
    sourceBadgeColor: SOURCE_COLORS[asset.source.toLowerCase()] ?? "#6b7280",
    s3Mirroring: ingestStatus === "pending" || ingestStatus === "in_progress",
    fileType,
    createdAt: createdAt ?? null,
    addedAt: createdAt ? null : addedAt,
    sectionTag,
    sectionLabel,
    imdbType,
    episodeLabel,
    sourceVariant,
    sourcePageTitle,
    sourceUrl,
    caption: asset.caption,
    dimensions:
      (asset.width ?? metadataWidth) && (asset.height ?? metadataHeight)
        ? {
            width: (asset.width ?? metadataWidth) as number,
            height: (asset.height ?? metadataHeight) as number,
          }
        : null,
    season: asset.season_number ?? seasonNumber ?? null,
    contextType,
    people: asset.person_name ? [asset.person_name] : [],
    titles: showName ? [showName] : [],
    fetchedAt: asset.fetched_at ? new Date(asset.fetched_at) : null,
  };
}
