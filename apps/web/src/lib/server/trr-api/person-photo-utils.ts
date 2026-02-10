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
    if (existing.origin === "cast_photos" && photo.origin === "media_links") {
      deduped[existingIndex] = photo;
    }

    // Always ensure all keys point at the canonical kept index so later collisions collapse correctly.
    for (const key of keys) byKeyIndex.set(key, existingIndex);
  }

  return deduped;
}
