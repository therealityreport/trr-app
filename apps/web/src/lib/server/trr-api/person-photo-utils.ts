export interface PersonPhotoLike {
  hosted_url: string | null;
  origin: "cast_photos" | "media_links";
}

export interface PersonPhotoCanonicalLike extends PersonPhotoLike {
  id: string;
  source?: string | null;
  source_image_id?: string | null;
  source_asset_id?: string | null;
  hosted_sha256?: string | null;
  media_asset_id?: string | null;
  original_url?: string | null;
  url?: string | null;
  thumb_url?: string | null;
  display_url?: string | null;
  detail_url?: string | null;
  crop_display_url?: string | null;
  crop_detail_url?: string | null;
  source_page_url?: string | null;
  title_names?: string[] | null;
  people_names?: string[] | null;
  face_boxes?: unknown[] | null;
  face_crops?: unknown[] | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Dedupe on hosted_url while preferring media_links rows on collisions.
 * Keeps stable ordering by replacing an existing cast_photos row in-place.
 */
export function dedupePhotosByHostedUrlPreferMediaLinks<T extends PersonPhotoLike>(photos: T[]): T[] {
  const byHostedUrlIndex = new Map<string, number>();
  const deduped: T[] = [];

  for (const photo of photos) {
    const hostedUrl = photo.hosted_url?.trim();
    if (!hostedUrl) continue;

    const existingIndex = byHostedUrlIndex.get(hostedUrl);
    if (existingIndex === undefined) {
      byHostedUrlIndex.set(hostedUrl, deduped.length);
      deduped.push(photo);
      continue;
    }

    const existing = deduped[existingIndex];
    if (existing.origin === "cast_photos" && photo.origin === "media_links") {
      deduped[existingIndex] = photo;
    }
  }

  return deduped;
}

function buildCanonicalKeys(photo: PersonPhotoCanonicalLike): string[] {
  const keys: string[] = [];

  const source = photo.source?.trim();
  const sourceImageId = photo.source_image_id?.trim();
  const sourceAssetId = photo.source_asset_id?.trim();
  const sha = photo.hosted_sha256?.trim();
  const hostedUrl = photo.hosted_url?.trim();
  const mediaAssetId = photo.media_asset_id?.trim();

  if (photo.origin === "cast_photos") {
    if (source && sourceImageId) keys.push(`src:${source}:${sourceImageId}`);
  } else if (photo.origin === "media_links") {
    if (mediaAssetId) keys.push(`asset:${mediaAssetId}`);
    if (source && sourceAssetId) keys.push(`src:${source}:${sourceAssetId}`);
  }

  if (sha) keys.push(`sha:${sha}`);
  if (hostedUrl) keys.push(`url:${hostedUrl}`);

  // Ensure uniqueness and preserve priority ordering.
  return Array.from(new Set(keys));
}

function hasNonEmptyUrl(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function computeRenderableScore(photo: PersonPhotoCanonicalLike): number {
  let score = 0;
  if (hasNonEmptyUrl(photo.hosted_url)) score += 1;
  if (hasNonEmptyUrl(photo.original_url) || hasNonEmptyUrl(photo.url)) score += 2;
  if (
    hasNonEmptyUrl(photo.thumb_url) ||
    hasNonEmptyUrl(photo.display_url) ||
    hasNonEmptyUrl(photo.detail_url)
  ) {
    score += 3;
  }
  if (hasNonEmptyUrl(photo.crop_display_url) || hasNonEmptyUrl(photo.crop_detail_url)) {
    score += 3;
  }
  return score;
}

function shouldReplaceCanonicalPhoto<T extends PersonPhotoCanonicalLike>(existing: T, candidate: T): boolean {
  const existingScore = computeRenderableScore(existing);
  const candidateScore = computeRenderableScore(candidate);
  if (candidateScore > existingScore) return true;
  if (candidateScore < existingScore) return false;

  if (existing.origin === "cast_photos" && candidate.origin === "media_links") {
    return true;
  }
  return false;
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function chooseRicherArray<TValue>(
  primary: TValue[] | null | undefined,
  secondary: TValue[] | null | undefined
): TValue[] | null | undefined {
  const primaryLen = Array.isArray(primary) ? primary.length : 0;
  const secondaryLen = Array.isArray(secondary) ? secondary.length : 0;
  if (secondaryLen > primaryLen) return secondary;
  return primary;
}

const METADATA_TRANSFER_KEYS = [
  "imdb_fallback_show_name",
  "imdb_fallback_show_imdb_id",
  "show_context_source",
  "show_name",
  "show_id",
  "episode_imdb_id",
  "imdb_title_type",
  "imdb_image_type",
] as const;

function mergeMetadata(
  primary: Record<string, unknown> | null | undefined,
  secondary: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  const base = primary && typeof primary === "object" ? { ...primary } : {};
  const fallback = secondary && typeof secondary === "object" ? secondary : null;
  if (!fallback) {
    return Object.keys(base).length > 0 ? base : null;
  }

  for (const key of METADATA_TRANSFER_KEYS) {
    const currentValue = base[key];
    const fallbackValue = fallback[key];
    const hasCurrent =
      hasNonEmptyString(currentValue) ||
      (Array.isArray(currentValue) && currentValue.length > 0) ||
      (currentValue !== null && currentValue !== undefined && typeof currentValue !== "string");
    if (!hasCurrent && fallbackValue !== null && fallbackValue !== undefined) {
      base[key] = fallbackValue;
    }
  }

  const mergedFaceCrops = chooseRicherArray(
    Array.isArray(base.face_crops) ? (base.face_crops as unknown[]) : null,
    Array.isArray(fallback.face_crops) ? (fallback.face_crops as unknown[]) : null
  );
  if (Array.isArray(mergedFaceCrops) && mergedFaceCrops.length > 0) {
    base.face_crops = mergedFaceCrops;
  }

  const mergedFaceBoxes = chooseRicherArray(
    Array.isArray(base.face_boxes) ? (base.face_boxes as unknown[]) : null,
    Array.isArray(fallback.face_boxes) ? (fallback.face_boxes as unknown[]) : null
  );
  if (Array.isArray(mergedFaceBoxes) && mergedFaceBoxes.length > 0) {
    base.face_boxes = mergedFaceBoxes;
  }

  return Object.keys(base).length > 0 ? base : null;
}

function mergeCanonicalPhoto<T extends PersonPhotoCanonicalLike>(primary: T, secondary: T): T {
  const merged = { ...primary } as T;

  if (!hasNonEmptyString(merged.source_page_url) && hasNonEmptyString(secondary.source_page_url)) {
    merged.source_page_url = secondary.source_page_url;
  }

  merged.title_names = chooseRicherArray(merged.title_names, secondary.title_names);
  merged.people_names = chooseRicherArray(merged.people_names, secondary.people_names);
  merged.face_boxes = chooseRicherArray(merged.face_boxes, secondary.face_boxes);
  merged.face_crops = chooseRicherArray(merged.face_crops, secondary.face_crops);
  merged.metadata = mergeMetadata(merged.metadata, secondary.metadata);

  return merged;
}

/**
 * Dedupe on canonical identity (source IDs / sha / hosted_url), preferring media_links rows on collisions.
 *
 * This handles multi-person tagged images where the same logical photo can exist as multiple cast_photos rows
 * with different hosted_url values (person-scoped mirroring), and also collapses collisions across origins.
 */
export function dedupePhotosByCanonicalKeysPreferMediaLinks<T extends PersonPhotoCanonicalLike>(photos: T[]): T[] {
  const byKeyIndex = new Map<string, number>();
  const deduped: T[] = [];

  for (const photo of photos) {
    const keys = buildCanonicalKeys(photo);
    if (keys.length === 0) continue;

    let existingIndex: number | undefined = undefined;
    for (const key of keys) {
      const idx = byKeyIndex.get(key);
      if (idx !== undefined) {
        existingIndex = idx;
        break;
      }
    }

    if (existingIndex === undefined) {
      const idx = deduped.length;
      deduped.push(photo);
      for (const key of keys) byKeyIndex.set(key, idx);
      continue;
    }

    const existing = deduped[existingIndex];
    const nextCanonical = shouldReplaceCanonicalPhoto(existing, photo)
      ? mergeCanonicalPhoto(photo, existing)
      : mergeCanonicalPhoto(existing, photo);
    deduped[existingIndex] = nextCanonical;

    // Always ensure all keys point at the canonical kept index so later collisions collapse correctly.
    for (const key of keys) byKeyIndex.set(key, existingIndex);
  }

  return deduped;
}
