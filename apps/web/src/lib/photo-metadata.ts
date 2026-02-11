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
      ? sanitizeFandomSectionLabel(metadata.fandom_section_label)
      : typeof metadata.context_section === "string"
        ? sanitizeFandomSectionLabel(metadata.context_section)
        : typeof photo.context_section === "string"
          ? sanitizeFandomSectionLabel(photo.context_section)
        : null;

  // Fandom "content type" is primarily inferred from the section heading on the gallery page.
  // Some historical rows stored OTHER even though the section label is informative (e.g. "Theme Song Snaps").
  // Always infer using the combined label/caption/context so display + filtering is correct without DB backfills.
  const fandomTagInput = [sectionTagRaw, sectionLabel, photo.context_type, photo.caption]
    .filter(Boolean)
    .join(" ");
  const inferredFandomTag = isFandom ? inferFandomSectionTag(fandomTagInput) : null;
  const sectionTag = isFandom
    ? (inferredFandomTag ?? sectionTagRaw ?? sectionLabel ?? null)
    : sectionTagRaw ?? sectionLabel ?? null;

  // Web-scraped "Season Announcement" imports:
  // - store "Cast Portraits" in context_section (Section)
  // - store "Season Announcement" in context_type
  // For display + filtering, treat these as PROMO content type.
  let sectionTagOut = sectionTag;
  if (!isFandom) {
    const ct = (photo.context_type ?? "").toLowerCase();
    const label = (sectionLabel ?? "").toLowerCase();
    if (ct.includes("season announcement") || label === "cast portraits") {
      sectionTagOut = "PROMO";
    }
  }

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
      ? sanitizeFandomSectionLabel(metadata.fandom_section_label)
      : typeof metadata.context_section === "string"
        ? sanitizeFandomSectionLabel(metadata.context_section)
        : typeof asset.context_section === "string"
          ? sanitizeFandomSectionLabel(asset.context_section)
          : null;
  const fandomTagInput = [sectionTagRaw, sectionLabel, asset.context_type, asset.caption]
    .filter(Boolean)
    .join(" ");
  const inferredFandomTag = isFandom ? inferFandomSectionTag(fandomTagInput) : null;
  const sectionTag = isFandom
    ? (inferredFandomTag ?? sectionTagRaw ?? sectionLabel ?? null)
    : sectionTagRaw ?? sectionLabel ?? null;

  let sectionTagOut = sectionTag;
  if (!isFandom) {
    const ct = (asset.context_type ?? "").toLowerCase();
    const kindLower = (asset.kind ?? "").toLowerCase().trim();
    const label = (sectionLabel ?? "").toLowerCase();
    if (kindLower === "promo" || ct.includes("season announcement") || label === "cast portraits") {
      sectionTagOut = "PROMO";
    }
  }

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
  const kindLower = (asset.kind ?? "").toLowerCase();
  const contextType =
    asset.type === "episode"
      ? `Episode ${asset.episode_number ?? ""}`
      : asset.type === "season"
        ? kindLower === "cast"
          ? "Cast Photos"
          : kindLower === "backdrop"
            ? "Backdrop"
            : kindLower === "promo"
              ? "Promo"
              : kindLower === "intro"
                ? "Intro"
                : kindLower === "reunion"
                  ? "Reunion"
                  : kindLower === "episode_still"
                    ? "Episode Still"
                    : kindLower === "other"
                      ? sourceLower.startsWith("web_scrape:")
                        ? "Other"
                        : "Season Poster"
                    : "Season Poster"
        : asset.type === "show"
          ? kindLower === "backdrop"
            ? "Backdrop"
            : kindLower === "logo"
              ? "Logo"
              : kindLower === "poster"
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
      (asset.width ?? metadataWidth) && (asset.height ?? metadataHeight)
        ? {
            width: (asset.width ?? metadataWidth) as number,
            height: (asset.height ?? metadataHeight) as number,
          }
        : null,
    season: asset.season_number ?? seasonNumber ?? null,
    contextType,
    people,
    titles: showName ? [showName] : [],
    fetchedAt: asset.fetched_at ? new Date(asset.fetched_at) : null,
  };
}
