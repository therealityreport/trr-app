export interface PersonPhotoLike {
  hosted_url: string | null;
  origin: "cast_photos" | "media_links";
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
