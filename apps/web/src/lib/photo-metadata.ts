import type { TrrPersonPhoto, SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";
import {
  canonicalizeHostedMediaUrl,
  inferHostedMediaFileNameFromUrl,
  isLikelyHostedMediaUrl,
} from "@/lib/hosted-media";
import {
  formatContentTypeLabel,
  normalizeContentTypeToken,
  resolveCanonicalContentType,
} from "@/lib/media/content-type";

export interface PhotoFaceBox {
  index: number;
  kind: "face";
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number | null;
  person_id?: string;
  person_name?: string;
  label?: string;
  match_similarity?: number | null;
  match_status?: string | null;
  match_reason?: string | null;
  match_candidates?: Array<{
    person_id?: string;
    person_name?: string;
    similarity: number;
  }> | null;
  filter_decision?: string | null;
  filter_metrics?: {
    face_w?: number;
    face_h?: number;
    face_area_ratio?: number;
  } | null;
  label_source?: string | null;
}

export interface PhotoFaceCrop {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  variantKey?: string;
  variantUrl?: string;
  size?: number;
}

export interface PhotoMetadata {
  source: string;
  sourceBadgeColor: string;
  hostedMediaSyncing?: boolean;
  isHostedMedia?: boolean;
  hostedMediaFileName?: string | null;
  hostedMediaUrl?: string | null;
  originalImageUrl?: string | null;
  originalSourceFileUrl?: string | null;
  originalSourcePageUrl?: string | null;
  originalSourceLabel?: string | null;
  googleReverseImageSearchUrl?: string | null;
  fileType?: string | null;
  createdAt?: Date | null;
  addedAt?: Date | null;
  hasTextOverlay?: boolean | null;
  contentType?: string | null;
  sectionTag?: string | null;
  sectionLabel?: string | null;
  sourceLogo?: string | null;
  assetName?: string | null;
  imdbType?: string | null;
  imdbCreditType?: string | null;
  imdbCreditMediaType?: string | null;
  imdbTitleId?: string | null;
  imdbTitleUrl?: string | null;
  mediaTypeLabel?: string | null;
  eventName?: string | null;
  gettyEventUrl?: string | null;
  gettyEventId?: string | null;
  gettyEventSlug?: string | null;
  gettyEventDate?: string | null;
  groupedEventCount?: number | null;
  episodeTitle?: string | null;
  episodeNumber?: number | null;
  episodeLabel?: string | null;
  sourceVariant?: string | null;
  sourceResolution?: string | null;
  sourcePageTitle?: string | null;
  sourceUrl?: string | null;
  showName?: string | null;
  showId?: string | null;
  showContextSource?: string | null;
  gettyDetails?: Record<string, string> | null;
  gettyTags?: string[];
  photographer?: string | null;
  company?: string | null;
  airdate?: Date | null;
  uploadedAt?: Date | null;
  peopleTags?: string[];
  filteredTags?: string[];
  nbcumvShowId?: string | null;
  nbcumvContentType?: string | null;
  faceBoxes?: PhotoFaceBox[];
  faceCrops?: PhotoFaceCrop[];
  peopleCount?: number | null;
  faceCountRaw?: number | null;
  faceCountFiltered?: number | null;
  faceFilterThresholds?: { min_side_px?: number; min_area_ratio?: number } | null;
  caption: string | null;
  dimensions: { width: number; height: number } | null;
  season: number | null;
  contextType: string | null;
  people: string[];
  titles: string[];
  fetchedAt: Date | null;
  galleryStatus?: string | null;
  galleryStatusReason?: string | null;
  galleryStatusCheckedAt?: Date | null;
}

const SOURCE_COLORS: Record<string, string> = {
  imdb: "#f5c518",
  tmdb: "#01d277",
  fandom: "#00d6a3",
  "fandom-gallery": "#00d6a3",
  nbcumv: "#0ea5e9",
  getty: "#111827",
};

const NORMALIZED_SOURCE_LABELS: Record<string, string> = {
  imdb: "IMDb",
  tmdb: "TMDb",
  fandom: "Fandom",
  "fandom-gallery": "Fandom Gallery",
  nbcumv: "NBCUMV",
  getty: "Getty",
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
const IMDB_TITLE_ID_RE = /\btt\d+\b/i;

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

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, digits: string) => {
      const parsed = Number.parseInt(digits, 10);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : _;
    });

const decodeAndNormalizeText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = decodeHtmlEntities(value).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, " ");
};

const parseIntegerValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed)) return parsed;
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

const getMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null => {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const getNestedMetadataObject = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
): Record<string, unknown> | null => {
  if (!metadata) return null;
  const value = metadata[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const normalizeMirrorKey = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const normalizedPath = decodeURIComponent(parsed.pathname || "").replace(/^\/+/, "");
      return normalizedPath || null;
    } catch {
      return null;
    }
  }
  return trimmed.replace(/^\/+/, "");
};

const inferHostedMediaFileName = (
  metadata: Record<string, unknown> | null | undefined,
  candidateUrls: Array<string | null | undefined>
): string | null => {
  const metadataFileName = getMetadataString(
    metadata,
    "s3_mirror_file_name",
    "mirror_file_name",
    "hosted_file_name",
    "file_name",
    "filename"
  );
  const metadataKey = getMetadataString(
    metadata,
    "hosted_key",
    "s3_key",
    "s3_object_key",
    "storage_key",
    "storage_path",
    "mirror_key",
    "cdn_key"
  );
  const keyCandidates = [metadataFileName, metadataKey, ...candidateUrls]
    .map((value) => normalizeMirrorKey(value))
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  for (const key of keyCandidates) {
    const fileName = inferHostedMediaFileNameFromUrl(key);
    if (fileName) return fileName;
  }

  return null;
};

const normalizeUrl = (value: string | null | undefined): string | null => {
  const canonical = canonicalizeHostedMediaUrl(value);
  if (!canonical) return null;
  try {
    const parsed = new URL(canonical);
    return parsed.toString();
  } catch {
    return null;
  }
};

const getDomainLabel = (value: string | null | undefined): string | null => {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  try {
    const hostname = new URL(normalized).hostname.toLowerCase().replace(/^www\./, "");
    if (hostname.includes("gettyimages.com")) return "GETTY";
    if (hostname.includes("nbcumv.com")) return "NBCUMV";
    if (hostname.includes("photobank.nbcuni.com")) return "NBCU PHOTO BANK";
    if (hostname.includes("imdb.com")) return "IMDb";
    if (hostname.includes("themoviedb.org") || hostname.includes("tmdb.org")) return "TMDb";
    if (hostname.includes("fandom.com") || hostname.includes("wikia.com") || hostname.includes("nocookie.net")) {
      return "FANDOM";
    }
    return hostname ? hostname.toUpperCase() : null;
  } catch {
    return null;
  }
};

export const formatPhotoSourceLabel = (value: string | null | undefined): string => {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase().replace(/_/g, "-");
  if (!normalized) return "unknown";
  return NORMALIZED_SOURCE_LABELS[normalized] ?? value.trim();
};

const resolveOriginalImageUrl = (
  sourceCandidates: Array<string | null | undefined>,
  hostedCandidates: Array<string | null | undefined>
): string | null => {
  const hostedSet = new Set(
    hostedCandidates
      .map((value) => normalizeUrl(value))
      .filter((value): value is string => typeof value === "string")
  );
  for (const candidate of sourceCandidates) {
    const normalized = normalizeUrl(candidate);
    if (!normalized) continue;
    if (hostedSet.has(normalized)) continue;
    if (isLikelyHostedMediaUrl(normalized)) continue;
    return normalized;
  }
  return null;
};

const toPeopleCount = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }
  return null;
};

const clampFaceCoord = (value: number): number => Math.min(1, Math.max(0, value));

const parseFaceBoxes = (value: unknown): PhotoFaceBox[] => {
  if (!Array.isArray(value)) return [];
  const boxes: PhotoFaceBox[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const x = typeof candidate.x === "number" && Number.isFinite(candidate.x) ? clampFaceCoord(candidate.x) : null;
    const y = typeof candidate.y === "number" && Number.isFinite(candidate.y) ? clampFaceCoord(candidate.y) : null;
    const width =
      typeof candidate.width === "number" && Number.isFinite(candidate.width)
        ? clampFaceCoord(candidate.width)
        : null;
    const height =
      typeof candidate.height === "number" && Number.isFinite(candidate.height)
        ? clampFaceCoord(candidate.height)
        : null;
    if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) {
      continue;
    }

    const index =
      typeof candidate.index === "number" && Number.isFinite(candidate.index)
        ? Math.max(1, Math.floor(candidate.index))
        : boxes.length + 1;
    const confidence =
      typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence)
        ? clampFaceCoord(candidate.confidence)
        : null;
    const personId =
      typeof candidate.person_id === "string" && candidate.person_id.trim().length > 0
        ? candidate.person_id.trim()
        : undefined;
    const personName =
      typeof candidate.person_name === "string" && candidate.person_name.trim().length > 0
        ? candidate.person_name.trim()
        : undefined;
    const label =
      typeof candidate.label === "string" && candidate.label.trim().length > 0
        ? candidate.label.trim()
        : undefined;
    const matchSimilarity =
      typeof candidate.match_similarity === "number" && Number.isFinite(candidate.match_similarity)
        ? clampFaceCoord(candidate.match_similarity)
        : null;
    const matchStatus =
      typeof candidate.match_status === "string" && candidate.match_status.trim().length > 0
        ? candidate.match_status.trim().toLowerCase()
        : null;
    const matchReason =
      typeof candidate.match_reason === "string" && candidate.match_reason.trim().length > 0
        ? candidate.match_reason.trim().toLowerCase()
        : null;
    const matchCandidates = Array.isArray(candidate.match_candidates)
      ? candidate.match_candidates
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const item = entry as Record<string, unknown>;
            const similarity =
              typeof item.similarity === "number" && Number.isFinite(item.similarity)
                ? clampFaceCoord(item.similarity)
                : null;
            if (similarity === null) return null;
            const personId =
              typeof item.person_id === "string" && item.person_id.trim().length > 0
                ? item.person_id.trim()
                : undefined;
            const personName =
              typeof item.person_name === "string" && item.person_name.trim().length > 0
                ? item.person_name.trim()
                : undefined;
            return {
              ...(personId ? { person_id: personId } : {}),
              ...(personName ? { person_name: personName } : {}),
              similarity,
            };
          })
          .filter(
            (
              entry,
            ): entry is {
              person_id?: string;
              person_name?: string;
              similarity: number;
            } => entry !== null,
          )
      : [];
    const labelSource =
      typeof candidate.label_source === "string" && candidate.label_source.trim().length > 0
        ? candidate.label_source.trim()
        : null;
    const filterDecision =
      typeof candidate.filter_decision === "string" && candidate.filter_decision.trim().length > 0
        ? candidate.filter_decision.trim().toLowerCase()
        : null;
    const filterMetricsRaw =
      candidate.filter_metrics && typeof candidate.filter_metrics === "object"
        ? (candidate.filter_metrics as Record<string, unknown>)
        : null;
    const filterMetrics = filterMetricsRaw
      ? {
          ...(typeof filterMetricsRaw.face_w === "number" && Number.isFinite(filterMetricsRaw.face_w)
            ? { face_w: filterMetricsRaw.face_w }
            : {}),
          ...(typeof filterMetricsRaw.face_h === "number" && Number.isFinite(filterMetricsRaw.face_h)
            ? { face_h: filterMetricsRaw.face_h }
            : {}),
          ...(typeof filterMetricsRaw.face_area_ratio === "number" &&
          Number.isFinite(filterMetricsRaw.face_area_ratio)
            ? { face_area_ratio: filterMetricsRaw.face_area_ratio }
            : {}),
        }
      : null;

    boxes.push({
      index,
      kind: "face",
      x,
      y,
      width,
      height,
      ...(confidence !== null ? { confidence } : {}),
      ...(personId ? { person_id: personId } : {}),
      ...(personName ? { person_name: personName } : {}),
      ...(label ? { label } : {}),
      ...(matchSimilarity !== null ? { match_similarity: matchSimilarity } : {}),
      ...(matchStatus ? { match_status: matchStatus } : {}),
      ...(matchReason ? { match_reason: matchReason } : {}),
      ...(matchCandidates.length > 0 ? { match_candidates: matchCandidates } : {}),
      ...(filterDecision ? { filter_decision: filterDecision } : {}),
      ...(filterMetrics && Object.keys(filterMetrics).length > 0 ? { filter_metrics: filterMetrics } : {}),
      ...(labelSource ? { label_source: labelSource } : {}),
    });
  }
  return boxes;
};

const parseFaceCrops = (value: unknown): PhotoFaceCrop[] => {
  if (!Array.isArray(value)) return [];
  const crops: PhotoFaceCrop[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const x = typeof candidate.x === "number" && Number.isFinite(candidate.x) ? clampFaceCoord(candidate.x) : null;
    const y = typeof candidate.y === "number" && Number.isFinite(candidate.y) ? clampFaceCoord(candidate.y) : null;
    const width =
      typeof candidate.width === "number" && Number.isFinite(candidate.width)
        ? clampFaceCoord(candidate.width)
        : null;
    const height =
      typeof candidate.height === "number" && Number.isFinite(candidate.height)
        ? clampFaceCoord(candidate.height)
        : null;
    if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) {
      continue;
    }
    const index =
      typeof candidate.index === "number" && Number.isFinite(candidate.index)
        ? Math.max(1, Math.floor(candidate.index))
        : crops.length + 1;
    const variantKey =
      typeof candidate.variant_key === "string" && candidate.variant_key.trim().length > 0
        ? candidate.variant_key.trim()
        : undefined;
    const variantUrl =
      typeof candidate.variant_url === "string" && candidate.variant_url.trim().length > 0
        ? candidate.variant_url.trim()
        : undefined;
    const size =
      typeof candidate.size === "number" && Number.isFinite(candidate.size) && candidate.size > 0
        ? Math.floor(candidate.size)
        : undefined;
    crops.push({
      index,
      x,
      y,
      width,
      height,
      ...(variantKey ? { variantKey } : {}),
      ...(variantUrl ? { variantUrl } : {}),
      ...(size ? { size } : {}),
    });
  }
  return crops;
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

const parseImdbCaptionEntities = (
  value: string | null | undefined
): { people: string[]; titles: string[] } => {
  if (!value) return { people: [], titles: [] };
  const decoded = decodeAndNormalizeText(value);
  if (!decoded) return { people: [], titles: [] };
  const text = decoded;

  const titles: string[] = [];
  const people: string[] = [];
  const seenPeople = new Set<string>();
  const seenTitles = new Set<string>();
  const titleMatch = text.match(/\bin\s+(.+?)\s*\((\d{4})\)\s*$/i);
  if (!titleMatch) {
    return { people: [], titles: [] };
  }

  const title = titleMatch[1].trim().replace(/^["']+|["']+$/g, "");
  if (title && !seenTitles.has(title.toLowerCase())) {
    seenTitles.add(title.toLowerCase());
    titles.push(title);
  }

  const peopleSegment = text.slice(0, titleMatch.index).trim();
  if (peopleSegment) {
    const chunks = peopleSegment.split(/\s*,\s*|\s+and\s+/i);
    for (const chunk of chunks) {
      const person = chunk
        .trim()
        .replace(/^and\s+/i, "")
        .replace(/^["']+|["']+$/g, "")
        .trim();
      if (!person) continue;
      const key = person.toLowerCase();
      if (seenPeople.has(key)) continue;
      seenPeople.add(key);
      people.push(person);
    }
  }

  return { people, titles };
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

const formatTitleTokens = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");

const formatImdbTitleType = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized) return null;
  const specialCases: Record<string, string> = {
    TVMOVIE: "TV Movie",
    TVSERIES: "TV Series",
    TVEPISODE: "TV Episode",
    TVSPECIAL: "TV Special",
    TVMINISERIES: "TV Mini Series",
    TVSHORT: "TV Short",
    VIDEO: "Video",
    MOVIE: "Movie",
    SHORT: "Short",
    DOCUMENTARY: "Documentary",
  };
  if (specialCases[normalized]) return specialCases[normalized];
  return formatTitleTokens(normalized.replace(/_/g, " "));
};

const formatImdbImageType = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.trim().replace(/[_-]+/g, " ");
  if (!normalized) return null;
  return formatTitleTokens(normalized);
};

const normalizeImdbTitleId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  const direct = raw.match(/^tt\d+$/i);
  if (direct) return direct[0].toLowerCase();
  const embedded = raw.match(IMDB_TITLE_ID_RE);
  if (embedded) return embedded[0].toLowerCase();
  return null;
};

const toImdbTitleUrl = (titleId: string | null): string | null => {
  if (!titleId) return null;
  return `https://www.imdb.com/title/${titleId}/`;
};

// ---------- Getty tag filtering ----------

/** Getty tags that convey no useful information about the image content.
 *  Built from actual tag frequency analysis across cast_photos. */
const GENERIC_TAG_FILTER = new Set([
  // Ubiquitous metadata tags (appear on nearly every image)
  "arts culture and entertainment",
  "photography",
  "color image",
  "usa",
  "choice",
  "indoors",
  "outdoors",
  "people",
  "celebrities",
  "attending",
  // Orientation / framing (describes photo composition, not content)
  "horizontal",
  "vertical",
  "portrait",
  "full length",
  "three quarter length",
  "looking at camera",
  "one person",
  "two people",
  "three people",
  "four people",
  "five people",
  "large group of people",
  "medium group of people",
  "headshot",
  // Year/decade buckets (redundant with date fields)
  "2020 - 2029",
  "2023",
  "2025",
  // Generic descriptors
  "smiling",
  "laughing",
  "day",
  "event",
  "topics",
  "topix",
  "bestpix",
  "arrival",
  "downloading",
  "celebrity sightings",
  // Day markers (meaningless without event context)
  "day 1",
  "day 2",
  "day 3",
  "day 4",
]);

function splitGettyTags(
  tags: string[],
  knownPeople: string[]
): { peopleTags: string[]; filteredTags: string[] } {
  const knownPeopleLower = new Set(knownPeople.map((n) => n.toLowerCase()));
  const peopleTags: string[] = [];
  const filteredTags: string[] = [];
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (GENERIC_TAG_FILTER.has(lower)) continue;
    // Fix truncated tags like "The Real Housewives Of..."
    const cleaned = tag.replace(/\.{3}$/, "");
    if (knownPeopleLower.has(lower)) {
      peopleTags.push(cleaned);
    } else {
      filteredTags.push(cleaned);
    }
  }
  return { peopleTags, filteredTags };
}

// ---------- NBCUMV field extraction ----------

function extractNbcumvFields(meta: Record<string, unknown> | null): {
  photographer: string | null;
  company: string | null;
  showId: string | null;
  contentType: string | null;
  airdate: Date | null;
  uploadedAt: Date | null;
} {
  if (!meta) return { photographer: null, company: null, showId: null, contentType: null, airdate: null, uploadedAt: null };
  return {
    photographer: getMetadataString(meta, "lbx_photographer", "photographer", "credit"),
    company: getMetadataString(meta, "company", "network", "brand"),
    showId: getMetadataString(meta, "show_id", "showId"),
    contentType: getMetadataString(meta, "content_type", "contentType", "type"),
    airdate: parseDateValue(meta.air_date ?? meta.airdate ?? meta.liveDate ?? null),
    uploadedAt: parseDateValue(meta.upload_date ?? meta.uploaded_at ?? null),
  };
}

export function mapPhotoToMetadata(
  photo: TrrPersonPhoto,
  options?: { fallbackPeople?: string[] }
): PhotoMetadata {
  const ingestStatus = (photo.ingest_status ?? "").toLowerCase();
  const metadata = (photo.metadata ?? {}) as Record<string, unknown>;
  const gettyMetadata = getNestedMetadataObject(metadata, "getty");
  const nbcumvMetadata = getNestedMetadataObject(metadata, "nbcumv");
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
      : typeof (metadata.tags as Record<string, unknown> | undefined)?.image_type === "string"
        ? ((metadata.tags as Record<string, unknown>).image_type as string)
      : null;
  const imdbTitleTypeRaw =
    typeof metadata.imdb_title_type === "string"
      ? metadata.imdb_title_type
      : typeof (metadata.tags as Record<string, unknown> | undefined)?.title_type === "string"
        ? ((metadata.tags as Record<string, unknown>).title_type as string)
      : null;
  const imdbType = imdbTypeRaw ?? (isImdb ? photo.context_type ?? null : null);
  const inferredSectionTag = resolveSectionTag({
    sourceLower,
    sectionTagRaw,
    sectionLabel,
    contextType: photo.context_type,
    caption: photo.caption,
    imdbType,
  });
  const explicitContentType = getMetadataString(metadata, "content_type", "contentType");
  const resolvedContentType = resolveCanonicalContentType({
    explicitContentType,
    fandomSectionTag: sectionTagRaw,
    sectionLabel,
    imdbType,
    contextType: photo.context_type,
    caption: photo.caption,
  });
  const inferredContentType = inferredSectionTag
    ? normalizeContentTypeToken(inferredSectionTag)
    : null;
  const contentType =
    resolvedContentType === "OTHER" && inferredContentType && inferredContentType !== "OTHER"
      ? inferredContentType
      : resolvedContentType ?? inferredContentType;
  const sectionTagOut = contentType ?? inferredSectionTag;

  const episodeNumber = parseIntegerValue(metadata.episode_number);
  const episodeTitle = decodeAndNormalizeText(metadata.episode_title);
  const episodeLabel =
    episodeNumber !== null && Number.isFinite(episodeNumber)
      ? `Episode ${episodeNumber}${episodeTitle ? ` - ${episodeTitle}` : ""}`
      : episodeTitle;
  const captionEntities = isImdb ? parseImdbCaptionEntities(photo.caption) : { people: [], titles: [] };
  const tags = metadata.tags as Record<string, unknown> | undefined;

  const metadataSourceUrl = getMetadataString(
    metadata,
    "source_page_url",
    "sourcePageUrl",
    "source_url",
    "sourceUrl",
    "page_url",
    "pageUrl",
    "original_source_page_url",
    "originalSourcePageUrl"
  );
  const sourcePageUrlFromPhoto =
    typeof photo.source_page_url === "string" && photo.source_page_url.trim().length > 0
      ? photo.source_page_url.trim()
      : null;
  const imdbSourceUrlFallback = (() => {
    if (!isImdb) return null;
    const mediaViewerPath = getMetadataString(
      metadata,
      "mediaviewer_url_path",
      "mediaviewerUrlPath",
      "mediaindex_url_path",
      "mediaindexUrlPath"
    );
    if (mediaViewerPath && mediaViewerPath.startsWith("/name/")) {
      const cleanPath = mediaViewerPath.split("?", 1)[0];
      if (cleanPath.includes("/mediaviewer/") || cleanPath.includes("/mediaindex/")) {
        return `https://www.imdb.com${cleanPath}`;
      }
    }
    const imdbPersonId = getMetadataString(metadata, "imdb_person_id", "imdbPersonId");
    if (!imdbPersonId) return null;
    const viewerId = getMetadataString(
      metadata,
      "imdb_viewer_id",
      "imdbViewerId",
      "viewer_id",
      "viewerId"
    );
    if (viewerId) {
      return `https://www.imdb.com/name/${imdbPersonId}/mediaviewer/${viewerId}/`;
    }
    return `https://www.imdb.com/name/${imdbPersonId}/mediaindex/`;
  })();
  const sourceUrl =
    metadataSourceUrl ??
    sourcePageUrlFromPhoto ??
    getMetadataString(gettyMetadata, "detail_url", "source_page_url", "source_url") ??
    getMetadataString(nbcumvMetadata, "source_page_url", "source_url") ??
    getMetadataString(metadata, "getty_event_url", "gettyEventUrl") ??
    imdbSourceUrlFallback;
  const gettyEventUrl =
    getMetadataString(metadata, "getty_event_url", "gettyEventUrl") ??
    getMetadataString(gettyMetadata, "event_url", "eventUrl");
  const gettyEventId =
    getMetadataString(metadata, "getty_event_id", "gettyEventId", "getty_event_group_id") ??
    getMetadataString(gettyMetadata, "event_id", "eventId");
  const gettyEventSlug =
    getMetadataString(metadata, "getty_event_slug", "gettyEventSlug", "getty_event_group_slug") ??
    getMetadataString(gettyMetadata, "event_url_slug", "eventUrlSlug");
  const gettyEventDate =
    getMetadataString(metadata, "getty_event_date", "gettyEventDate") ??
    getMetadataString(gettyMetadata, "event_date", "eventDate");

  const sourceVariant = getMetadataString(
    metadata,
    "source_variant",
    "sourceVariant",
    "variant"
  ) ?? (isImdb ? "imdb_person_gallery" : null);
  const sourcePageTitle = getMetadataString(
    metadata,
    "source_page_title",
    "sourcePageTitle",
    "page_title",
    "pageTitle"
  ) ??
    getMetadataString(gettyMetadata, "title", "headline", "object_name") ??
    getMetadataString(nbcumvMetadata, "lbx_headline", "lbx_filename");
  const googleReverseImageSearchUrl = getMetadataString(
    metadata,
    "google_reverse_image_search_url",
    "googleReverseImageSearchUrl"
  );
  const normalizedSourcePageTitle = decodeAndNormalizeText(sourcePageTitle) ?? captionEntities.titles[0] ?? null;
  const originalSourcePageUrl = sourceUrl;
  const originalImageUrl = resolveOriginalImageUrl(
    [
      getMetadataString(metadata, "original_source_file_url", "originalSourceFileUrl"),
      typeof metadata.source_image_url === "string" ? metadata.source_image_url : null,
      typeof metadata.original_image_url === "string" ? metadata.original_image_url : null,
      typeof metadata.image_url === "string" ? metadata.image_url : null,
      getMetadataString(metadata, "source_file_url", "sourceFileUrl"),
      getMetadataString(tags, "image_url", "imageUrl", "source_file_url", "sourceFileUrl"),
      getMetadataString(gettyMetadata, "image_url", "source_image_url"),
      getMetadataString(nbcumvMetadata, "location", "source_image_url"),
      photo.url ?? null,
      (photo as { original_url?: string | null }).original_url ?? null,
    ],
    [
      photo.hosted_url ?? null,
      (photo as { thumb_url?: string | null }).thumb_url ?? null,
      (photo as { display_url?: string | null }).display_url ?? null,
      (photo as { detail_url?: string | null }).detail_url ?? null,
      (photo as { crop_display_url?: string | null }).crop_display_url ?? null,
      (photo as { crop_detail_url?: string | null }).crop_detail_url ?? null,
    ]
  );
  const originalSourceFileUrl = originalImageUrl;
  const originalSourceLabel =
    getDomainLabel(originalSourcePageUrl) ??
    getDomainLabel(originalSourceFileUrl) ??
    (photo.source?.trim() ? formatPhotoSourceLabel(photo.source) : null);
  const normalizedHostedUrl = normalizeUrl(photo.hosted_url ?? null);
  const isHostedMedia = normalizedHostedUrl ? isLikelyHostedMediaUrl(normalizedHostedUrl) : false;
  const faceBoxes = parseFaceBoxes(
    (photo as { face_boxes?: unknown }).face_boxes ?? metadata.face_boxes
  );
  const faceCrops = parseFaceCrops(
    (photo as { face_crops?: unknown }).face_crops ?? metadata.face_crops
  );
  const peopleFromPhoto = (photo.people_names ?? []).filter(
    (name): name is string => typeof name === "string" && name.trim().length > 0
  );
  const peopleFromMeta = Array.isArray(metadata.people_names)
    ? (metadata.people_names as unknown[])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim())
    : [];
  const peopleFromTags = Array.isArray(tags?.people)
    ? (tags.people as unknown[])
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const name =
            (item as Record<string, unknown>).name ??
            (item as Record<string, unknown>).person_name ??
            null;
          return typeof name === "string" && name.trim().length > 0 ? name.trim() : null;
        })
        .filter((value): value is string => typeof value === "string")
    : [];
  const titlesFromPhoto = (photo.title_names ?? []).filter(
    (title): title is string => typeof title === "string" && title.trim().length > 0
  );
  const titlesFromMeta = Array.isArray(metadata.title_names)
    ? (metadata.title_names as unknown[])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim())
    : [];
  const titlesFromTags = Array.isArray(tags?.titles)
    ? (tags.titles as unknown[])
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const title =
            (item as Record<string, unknown>).title ??
            (item as Record<string, unknown>).name ??
            null;
          return typeof title === "string" && title.trim().length > 0 ? title.trim() : null;
        })
        .filter((value): value is string => typeof value === "string")
    : [];
  const titleIdsFromMetadata = Array.isArray(metadata.title_imdb_ids)
    ? (metadata.title_imdb_ids as unknown[])
        .map((value) => normalizeImdbTitleId(value))
        .filter((value): value is string => typeof value === "string")
    : [];
  const titleIdsFromTags = Array.isArray(tags?.titles)
    ? (tags.titles as unknown[])
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          return normalizeImdbTitleId(
            (item as Record<string, unknown>).imdb_id ?? (item as Record<string, unknown>).id ?? null
          );
        })
        .filter((value): value is string => typeof value === "string")
    : [];
  const people = [
    ...new Set([
      ...peopleFromPhoto.map((value) => decodeAndNormalizeText(value) ?? value.trim()),
      ...peopleFromMeta.map((value) => decodeAndNormalizeText(value) ?? value),
      ...peopleFromTags.map((value) => decodeAndNormalizeText(value) ?? value),
      ...captionEntities.people,
      ...(options?.fallbackPeople ?? []).filter(
        (name): name is string => typeof name === "string" && name.trim().length > 0
      ),
    ]),
  ];
  const titles = [
    ...new Set([
      ...titlesFromPhoto.map((value) => decodeAndNormalizeText(value) ?? value.trim()),
      ...titlesFromMeta.map((value) => decodeAndNormalizeText(value) ?? value),
      ...titlesFromTags.map((value) => decodeAndNormalizeText(value) ?? value),
      ...captionEntities.titles,
    ]),
  ];
  const imdbTitleId =
    normalizeImdbTitleId(getMetadataString(metadata, "imdb_title_id", "imdbTitleId")) ??
    normalizeImdbTitleId(getMetadataString(metadata, "imdb_title_url", "imdbTitleUrl")) ??
    titleIdsFromMetadata[0] ??
    titleIdsFromTags[0] ??
    null;
  const imdbTitleUrl =
    toImdbTitleUrl(imdbTitleId) ??
    toImdbTitleUrl(normalizeImdbTitleId(getMetadataString(metadata, "imdb_title_url", "imdbTitleUrl")));
  const peopleCount =
    toPeopleCount((photo as { people_count?: unknown }).people_count) ??
    toPeopleCount(metadata.people_count) ??
    (people.length > 0 ? people.length : null) ??
    (faceBoxes.length > 0 ? faceBoxes.length : null);
  const hostedMediaFileName = inferHostedMediaFileName(metadata, [photo.hosted_url]);
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
    parseIntegerValue(metadata.season_number) ??
    parseSeasonNumber(sectionLabel) ??
    parseSeasonNumber(photo.caption ?? null);
  const sourceLogo = getMetadataString(
    metadata,
    "source_logo",
    "sourceLogo",
    "original_source_logo",
    "originalSourceLogo"
  ) ?? (isImdb ? "IMDb" : null);
  const assetName =
    decodeAndNormalizeText(getMetadataString(metadata, "asset_name", "assetName", "name", "title")) ??
    normalizedSourcePageTitle ??
    captionEntities.titles[0] ??
    null;
  const galleryStatus =
    typeof metadata.gallery_status === "string" && metadata.gallery_status.trim().length > 0
      ? metadata.gallery_status.trim()
      : null;
  const galleryStatusReason =
    typeof metadata.gallery_status_reason === "string" &&
    metadata.gallery_status_reason.trim().length > 0
      ? metadata.gallery_status_reason.trim()
      : null;
  const galleryStatusCheckedAt = parseDateValue(
    metadata.gallery_status_checked_at ?? metadata.gallery_status_checkedAt ?? null
  );
  const showName = decodeAndNormalizeText(getMetadataString(
    metadata,
    "show_name",
    "showName",
    "imdb_fallback_show_name",
    "imdbFallbackShowName"
  ));
  const showId = getMetadataString(metadata, "show_id", "showId");
  const showContextSource = getMetadataString(
    metadata,
    "show_context_source",
    "showContextSource"
  );
  const imdbCreditMediaType = getMetadataString(
    metadata,
    "imdb_credit_media_type",
    "imdbCreditMediaType"
  );
  const imdbCreditType = imdbCreditMediaType ?? formatImdbTitleType(imdbTitleTypeRaw);
  const eventNameRaw = getMetadataString(
    metadata,
    "event_name",
    "eventName",
    "getty_event_title",
    "gettyEventTitle",
    "bucket_label",
    "bucketLabel",
    "getty_event_group_title",
    "source_page_title",
    "sourcePageTitle",
    "asset_name",
    "assetName",
  );
  const galleryBucketType = getMetadataString(
    metadata,
    "bucket_type",
    "bucketType",
    "gallery_bucket_type",
    "galleryBucketType",
  );
  const groupedEventCount = parseIntegerValue(
    metadata.grouped_image_count ??
      (metadata.gallery_bucket &&
      typeof metadata.gallery_bucket === "object"
        ? (metadata.gallery_bucket as Record<string, unknown>).grouped_image_count
        : null)
  );
  const sourceResolution = getMetadataString(metadata, "source_resolution", "sourceResolution");
  const gettyDetailsRaw =
    getNestedMetadataObject(metadata, "getty_details") ??
    getNestedMetadataObject(gettyMetadata, "details");
  const gettyDetails =
    gettyDetailsRaw && Object.keys(gettyDetailsRaw).length > 0
      ? Object.fromEntries(
          Object.entries(gettyDetailsRaw)
            .map(([key, value]) => [key, decodeAndNormalizeText(value) ?? String(value ?? "").trim()])
            .filter(([, value]) => Boolean(value))
        )
      : null;
  const gettyTags = [
    ...new Set(
      (
        Array.isArray(metadata.getty_tags)
          ? metadata.getty_tags
          : Array.isArray(gettyMetadata?.keyword_texts)
            ? gettyMetadata.keyword_texts
            : []
      )
        .map((value) => decodeAndNormalizeText(value))
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    ),
  ];
  const { peopleTags, filteredTags } = splitGettyTags(gettyTags, people);
  const nbcumvFields = extractNbcumvFields(nbcumvMetadata);
  const photographer =
    nbcumvFields.photographer ??
    (gettyDetails?.credit_display || gettyDetails?.credit) ??
    null;
  const mediaTypeLabel = (() => {
    if (contentType) {
      return formatContentTypeLabel(contentType);
    }
    return formatImdbImageType(imdbType);
  })();
  const eventName =
    mediaTypeLabel?.toLowerCase() === "event" || galleryBucketType?.toLowerCase() === "event"
      ? decodeAndNormalizeText(eventNameRaw) ?? titles[0] ?? null
      : null;
  const faceDiagnosticsRaw =
    metadata.face_detection_diagnostics && typeof metadata.face_detection_diagnostics === "object"
      ? (metadata.face_detection_diagnostics as Record<string, unknown>)
      : null;
  const faceCountRaw = faceDiagnosticsRaw ? toPeopleCount(faceDiagnosticsRaw.raw) : null;
  const faceCountFiltered = faceDiagnosticsRaw ? toPeopleCount(faceDiagnosticsRaw.filtered) : null;
  const faceFilterThresholdsRaw =
    faceDiagnosticsRaw?.thresholds && typeof faceDiagnosticsRaw.thresholds === "object"
      ? (faceDiagnosticsRaw.thresholds as Record<string, unknown>)
      : null;
  const faceFilterThresholds =
    faceFilterThresholdsRaw
      ? {
          ...(typeof faceFilterThresholdsRaw.min_side_px === "number" &&
          Number.isFinite(faceFilterThresholdsRaw.min_side_px)
            ? { min_side_px: faceFilterThresholdsRaw.min_side_px }
            : {}),
          ...(typeof faceFilterThresholdsRaw.min_area_ratio === "number" &&
          Number.isFinite(faceFilterThresholdsRaw.min_area_ratio)
            ? { min_area_ratio: faceFilterThresholdsRaw.min_area_ratio }
            : {}),
        }
      : null;

  return {
    source: photo.source,
    sourceBadgeColor: SOURCE_COLORS[photo.source.toLowerCase()] ?? "#6b7280",
    hostedMediaSyncing: ingestStatus === "pending" || ingestStatus === "in_progress",
    isHostedMedia,
    hostedMediaFileName,
    hostedMediaUrl: normalizedHostedUrl,
    originalImageUrl,
    originalSourceFileUrl,
    originalSourcePageUrl,
    originalSourceLabel,
    googleReverseImageSearchUrl,
    fileType,
    createdAt: createdAt ?? null,
    addedAt: createdAt ? null : addedAt,
    hasTextOverlay: inferHasTextOverlay(metadata),
    contentType,
    sectionTag: sectionTagOut,
    sectionLabel,
    sourceLogo,
    assetName,
    imdbType,
    imdbCreditType,
    imdbCreditMediaType,
    imdbTitleId,
    imdbTitleUrl,
    mediaTypeLabel,
    eventName,
    gettyEventUrl,
    gettyEventId,
    gettyEventSlug,
    gettyEventDate,
    groupedEventCount,
    episodeTitle,
    episodeNumber,
    episodeLabel,
    sourceVariant,
    sourceResolution,
    sourcePageTitle: normalizedSourcePageTitle,
    sourceUrl,
    showName,
    showId,
    showContextSource,
    gettyDetails,
    gettyTags,
    photographer,
    company: nbcumvFields.company,
    airdate: nbcumvFields.airdate,
    uploadedAt: nbcumvFields.uploadedAt,
    peopleTags,
    filteredTags,
    nbcumvShowId: nbcumvFields.showId,
    nbcumvContentType: nbcumvFields.contentType,
    faceBoxes,
    faceCrops,
    peopleCount,
    faceCountRaw,
    faceCountFiltered,
    faceFilterThresholds:
      faceFilterThresholds && Object.keys(faceFilterThresholds).length > 0 ? faceFilterThresholds : null,
    caption: decodeAndNormalizeText(photo.caption) ?? photo.caption,
    dimensions:
      resolvedWidth && resolvedHeight
        ? {
            width: resolvedWidth,
            height: resolvedHeight,
          }
        : null,
    season: inferredSeason,
    contextType: photo.context_type,
    people,
    titles,
    fetchedAt: photo.fetched_at ? new Date(photo.fetched_at) : null,
    galleryStatus,
    galleryStatusReason,
    galleryStatusCheckedAt,
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
  const gettyMetadata = getNestedMetadataObject(metadata, "getty");
  const nbcumvMetadata = getNestedMetadataObject(metadata, "nbcumv");
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
      : typeof (metadata.tags as Record<string, unknown> | undefined)?.image_type === "string"
        ? ((metadata.tags as Record<string, unknown>).image_type as string)
      : null;
  const imdbType = imdbTypeRaw ?? (isImdb ? asset.context_type ?? null : null);
  const inferredSectionTag = resolveSectionTag({
    sourceLower,
    sectionTagRaw,
    sectionLabel,
    contextType: asset.context_type ?? null,
    caption: asset.caption ?? null,
    imdbType,
  });
  const explicitContentType = getMetadataString(metadata, "content_type", "contentType");
  const resolvedContentType = resolveCanonicalContentType({
    explicitContentType,
    fandomSectionTag: sectionTagRaw,
    sectionLabel,
    imdbType,
    contextType: asset.context_type ?? null,
    caption: asset.caption ?? null,
    kind: asset.kind ?? null,
  });
  const inferredContentType = inferredSectionTag
    ? normalizeContentTypeToken(inferredSectionTag)
    : null;
  const contentType =
    resolvedContentType === "OTHER" && inferredContentType && inferredContentType !== "OTHER"
      ? inferredContentType
      : resolvedContentType ?? inferredContentType;
  let sectionTagOut = contentType ?? inferredSectionTag;
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
        : getMetadataString(gettyMetadata, "title", "headline", "object_name") ??
          getMetadataString(nbcumvMetadata, "lbx_headline", "lbx_filename");
  const googleReverseImageSearchUrl = getMetadataString(
    metadata,
    "google_reverse_image_search_url",
    "googleReverseImageSearchUrl"
  );
  const sourceUrl =
    typeof metadata.source_page_url === "string"
      ? metadata.source_page_url
      : typeof metadata.source_url === "string"
        ? metadata.source_url
        : typeof metadata.page_url === "string"
          ? metadata.page_url
          : getMetadataString(gettyMetadata, "detail_url", "source_page_url", "source_url") ??
            getMetadataString(nbcumvMetadata, "source_page_url", "source_url");
  const originalSourcePageUrl = sourceUrl;
  const originalImageUrl = resolveOriginalImageUrl(
    [
      asset.source_url ?? null,
      typeof metadata.source_image_url === "string" ? metadata.source_image_url : null,
      typeof metadata.original_image_url === "string" ? metadata.original_image_url : null,
      typeof metadata.image_url === "string" ? metadata.image_url : null,
      typeof metadata.source_url === "string" ? metadata.source_url : null,
      asset.original_url ?? null,
    ],
    [
      asset.hosted_url ?? null,
      asset.thumb_url ?? null,
      asset.display_url ?? null,
      asset.detail_url ?? null,
      asset.crop_display_url ?? null,
      asset.crop_detail_url ?? null,
    ]
  );
  const originalSourceFileUrl = originalImageUrl;
  const originalSourceLabel =
    getDomainLabel(originalSourcePageUrl) ??
    getDomainLabel(originalSourceFileUrl) ??
    (asset.source?.trim() ? formatPhotoSourceLabel(asset.source) : null);
  const normalizedHostedUrl = normalizeUrl(asset.hosted_url ?? null);
  const isHostedMedia = normalizedHostedUrl ? isLikelyHostedMediaUrl(normalizedHostedUrl) : false;
  const faceBoxes = parseFaceBoxes(metadata.face_boxes);
  const faceCrops = parseFaceCrops(metadata.face_crops);
  const peopleCount =
    toPeopleCount((asset as { people_count?: unknown }).people_count) ??
    toPeopleCount((metadata as Record<string, unknown>).people_count) ??
    (faceBoxes.length > 0 ? faceBoxes.length : null);
  const hostedMediaFileName = inferHostedMediaFileName(metadata, [
    asset.hosted_url,
  ]);

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
  const peopleFromTags = Array.isArray((metadata.tags as Record<string, unknown> | undefined)?.people)
    ? (((metadata.tags as Record<string, unknown>).people as unknown[])
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const name = (item as Record<string, unknown>).name;
          return typeof name === "string" && name.trim().length > 0 ? name.trim() : null;
        })
        .filter((value): value is string => typeof value === "string"))
    : [];
  const people =
    peopleFromMeta.length > 0 || peopleFromTags.length > 0
      ? [...new Set([...peopleFromMeta, ...peopleFromTags])]
      : asset.person_name
        ? [asset.person_name]
        : [];

  const titlesFromMeta = Array.isArray((metadata as Record<string, unknown>).title_names)
    ? ((metadata as Record<string, unknown>).title_names as unknown[])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim())
    : [];
  const titlesFromTags = Array.isArray((metadata.tags as Record<string, unknown> | undefined)?.titles)
    ? (((metadata.tags as Record<string, unknown>).titles as unknown[])
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const title = (item as Record<string, unknown>).title;
          return typeof title === "string" && title.trim().length > 0 ? title.trim() : null;
        })
        .filter((value): value is string => typeof value === "string"))
    : [];
  const titlesFallback = showName ? [showName] : [];
  const titles = [...new Set([...titlesFromMeta, ...titlesFromTags, ...titlesFallback])];
  const galleryStatus =
    typeof metadata.gallery_status === "string" && metadata.gallery_status.trim().length > 0
      ? metadata.gallery_status.trim()
      : null;
  const galleryStatusReason =
    typeof metadata.gallery_status_reason === "string" &&
    metadata.gallery_status_reason.trim().length > 0
      ? metadata.gallery_status_reason.trim()
      : null;
  const galleryStatusCheckedAt = parseDateValue(
    metadata.gallery_status_checked_at ?? metadata.gallery_status_checkedAt ?? null
  );

  // Getty tags & NBCUMV fields (same logic as mapPhotoToMetadata)
  const gettyDetailsRaw =
    getNestedMetadataObject(metadata, "getty_details") ??
    getNestedMetadataObject(gettyMetadata, "details");
  const gettyDetails =
    gettyDetailsRaw && Object.keys(gettyDetailsRaw).length > 0
      ? Object.fromEntries(
          Object.entries(gettyDetailsRaw)
            .map(([key, value]) => [key, decodeAndNormalizeText(value) ?? String(value ?? "").trim()])
            .filter(([, value]) => Boolean(value))
        )
      : null;
  const gettyTags = [
    ...new Set(
      (
        Array.isArray(metadata.getty_tags)
          ? metadata.getty_tags
          : Array.isArray(gettyMetadata?.keyword_texts)
            ? gettyMetadata.keyword_texts
            : []
      )
        .map((value) => decodeAndNormalizeText(value))
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    ),
  ];
  const { peopleTags, filteredTags } = splitGettyTags(gettyTags, people);
  const nbcumvFields = extractNbcumvFields(nbcumvMetadata);
  const photographer =
    nbcumvFields.photographer ??
    (gettyDetails?.credit_display || gettyDetails?.credit) ??
    null;

  return {
    source: asset.source,
    sourceBadgeColor: SOURCE_COLORS[asset.source.toLowerCase()] ?? "#6b7280",
    hostedMediaSyncing: ingestStatus === "pending" || ingestStatus === "in_progress",
    isHostedMedia,
    hostedMediaFileName,
    hostedMediaUrl: normalizedHostedUrl,
    originalImageUrl,
    originalSourceFileUrl,
    originalSourcePageUrl,
    originalSourceLabel,
    googleReverseImageSearchUrl,
    fileType,
    createdAt: createdAt ?? null,
    addedAt: createdAt ? null : addedAt,
    hasTextOverlay: inferHasTextOverlay(metadata),
    contentType,
    sectionTag: sectionTagOut,
    sectionLabel,
    sourceLogo,
    assetName,
    imdbType,
    episodeLabel,
    sourceVariant,
    sourcePageTitle,
    sourceUrl,
    gettyDetails,
    gettyTags,
    photographer,
    company: nbcumvFields.company,
    airdate: nbcumvFields.airdate,
    uploadedAt: nbcumvFields.uploadedAt,
    peopleTags,
    filteredTags,
    nbcumvShowId: nbcumvFields.showId,
    nbcumvContentType: nbcumvFields.contentType,
    faceBoxes,
    faceCrops,
    peopleCount,
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
    titles,
    fetchedAt: asset.fetched_at ? new Date(asset.fetched_at) : null,
    galleryStatus,
    galleryStatusReason,
    galleryStatusCheckedAt,
  };
}
