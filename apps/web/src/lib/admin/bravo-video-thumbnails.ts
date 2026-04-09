export interface BravoVideoThumbnailCandidate {
  hosted_image_url?: string | null;
  image_url?: string | null;
  original_image_url?: string | null;
}

export const resolveBravoVideoThumbnailUrl = (
  video: BravoVideoThumbnailCandidate,
): string | null => {
  if (typeof video.hosted_image_url === "string" && video.hosted_image_url.trim()) {
    return video.hosted_image_url.trim();
  }
  if (typeof video.image_url === "string" && video.image_url.trim()) {
    return video.image_url.trim();
  }
  if (typeof video.original_image_url === "string" && video.original_image_url.trim()) {
    return video.original_image_url.trim();
  }
  return null;
};
