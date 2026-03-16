export const NEXT_PUBLIC_HOSTED_MEDIA_BASE_URL = "NEXT_PUBLIC_HOSTED_MEDIA_BASE_URL";

export const DEFAULT_HOSTED_MEDIA_BASE_URL =
  "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev";

const CURRENT_HOSTED_MEDIA_HOST_MARKERS = [
  "r2.dev",
  "cloudflarestorage.com",
  "therealityreport",
] as const;

const LEGACY_HOSTED_MEDIA_HOST_MARKERS = [
  "cloudfront.net",
  "amazonaws.com",
  "s3.",
] as const;

const SAME_ORIGIN_HOSTED_PATH_PREFIXES = [
  "/media/",
  "/media-variants/",
  "/cast-photo-variants/",
  "/face-crops/",
  "/images/",
  "/icons/",
  "/social/",
  "/fonts/",
] as const;

const isLikelySameOriginHostedPath = (value: string): boolean =>
  SAME_ORIGIN_HOSTED_PATH_PREFIXES.some((prefix) => value.startsWith(prefix));

export const normalizeHostedMediaBaseUrl = (value: string | null | undefined): string => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return DEFAULT_HOSTED_MEDIA_BASE_URL;
  return trimmed.replace(/\/+$/, "");
};

export const getHostedMediaBaseUrl = (
  envValue = process.env.NEXT_PUBLIC_HOSTED_MEDIA_BASE_URL,
): string => {
  return normalizeHostedMediaBaseUrl(envValue);
};

export const buildHostedMediaUrl = (
  assetPath: string,
  baseUrl = getHostedMediaBaseUrl(),
): string => {
  const normalizedPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return `${normalizeHostedMediaBaseUrl(baseUrl)}${normalizedPath}`;
};

export const normalizeHostedMediaAssetPathFromUrl = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return isLikelySameOriginHostedPath(trimmed) ? trimmed : null;
  }

  try {
    const parsed = new URL(trimmed);
    return isLikelySameOriginHostedPath(parsed.pathname) ? parsed.pathname : null;
  } catch {
    return null;
  }
};

export const canonicalizeHostedMediaUrl = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (
      (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") &&
      isLikelySameOriginHostedPath(parsed.pathname)
    ) {
      return parsed.toString();
    }

    const hostedAssetPath = normalizeHostedMediaAssetPathFromUrl(trimmed);
    if (hostedAssetPath && LEGACY_HOSTED_MEDIA_HOST_MARKERS.some((marker) => host.includes(marker))) {
      return buildHostedMediaUrl(hostedAssetPath);
    }

    return parsed.toString();
  } catch {
    return trimmed;
  }
};

export const isLikelyHostedMediaUrl = (value: string | null | undefined): boolean => {
  const canonical = canonicalizeHostedMediaUrl(value);
  if (!canonical) return false;
  if (canonical.startsWith("/") && !canonical.startsWith("//")) {
    return isLikelySameOriginHostedPath(canonical);
  }

  try {
    const parsed = new URL(canonical);
    const host = parsed.hostname.toLowerCase();
    if (
      CURRENT_HOSTED_MEDIA_HOST_MARKERS.some((marker) => host.includes(marker)) ||
      LEGACY_HOSTED_MEDIA_HOST_MARKERS.some((marker) => host.includes(marker))
    ) {
      return true;
    }
    if (
      (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") &&
      isLikelySameOriginHostedPath(parsed.pathname)
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const inferHostedMediaFileNameFromUrl = (value: string | null | undefined): string | null => {
  const canonical = canonicalizeHostedMediaUrl(value);
  if (!canonical) return null;

  const candidate = (() => {
    if (canonical.startsWith("/") && !canonical.startsWith("//")) return canonical;
    try {
      return decodeURIComponent(new URL(canonical).pathname || "");
    } catch {
      return canonical;
    }
  })();

  const fileName = candidate.split("/").filter(Boolean).pop();
  return fileName && fileName.trim().length > 0 ? fileName.trim() : null;
};
