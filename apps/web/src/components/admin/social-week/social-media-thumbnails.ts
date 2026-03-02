const SOCIAL_MEDIA_VIDEO_EXT_RE = /\.(mp4|mov|m4v|webm|m3u8|mpd)(\?|$)/i;

export function isVideoLikeSocialUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const normalized = String(url).trim().toLowerCase();
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
    const candidate = typeof raw === "string" ? raw.trim() : "";
    if (!candidate) continue;
    if (!isVideoLikeSocialUrl(candidate)) return candidate;
  }
  return null;
}

export function selectTwitterThumbnailUrl(input: {
  hostedThumbnail: string | null | undefined;
  thumbnail: string | null | undefined;
  hostedMediaUrls: string[];
  mediaUrls: string[];
}): string | null {
  const preferred = pickFirstNonVideoUrl([
    input.hostedThumbnail,
    input.thumbnail,
    ...(input.hostedMediaUrls || []),
    ...(input.mediaUrls || []),
  ]);
  if (preferred) return preferred;

  const hostedThumbnail = String(input.hostedThumbnail || "").trim();
  if (hostedThumbnail) return hostedThumbnail;
  const thumbnail = String(input.thumbnail || "").trim();
  if (thumbnail) return thumbnail;
  if (input.hostedMediaUrls?.[0]) return input.hostedMediaUrls[0];
  if (input.mediaUrls?.[0]) return input.mediaUrls[0];
  return null;
}
