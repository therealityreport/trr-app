import type { CastRefreshPhaseId, CastRefreshPhaseState } from "@/lib/admin/cast-refresh-orchestration";
import { firstImageUrlCandidate, getSeasonAssetCardUrlCandidates } from "@/lib/admin/image-url-candidates";
import { isRefreshLogTerminalSuccess } from "@/lib/admin/refresh-log-pipeline";
import { extractSocialHandleFromUrl } from "@/lib/admin/show-page/show-link-display-model";
import {
  GalleryAssetSourceError,
  type BravoImportImageKind,
  type GalleryAssetSourceFailure,
  type GalleryAssetSourceRequest,
  type RefreshLogEntry,
  type ShowRefreshTarget,
} from "@/lib/admin/show-page/workspace-model";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";
import { THUMBNAIL_DEFAULTS, parseThumbnailCrop } from "@/lib/thumbnail-crop";

const SHOW_REFRESH_TARGET_LABELS: Record<ShowRefreshTarget, string> = {
  details: "Show Info",
  seasons_episodes: "Seasons & Episodes",
  photos: "Gallery Media",
  cast_credits: "Credits",
  videos: "Bravo Videos",
  news: "Google News",
  social_setup: "Social Setup",
  show_core: "Show Core",
  links: "Links",
  bravo: "Bravo",
  cast_profiles: "Cast Profiles",
  cast_media: "Cast Media",
  get_images: "Getty/NBCUMV Images",
};

export const CAST_REFRESH_PHASE_ORDER: CastRefreshPhaseId[] = [
  "credits_sync",
  "profile_links_sync",
  "bio_sync",
  "network_augmentation",
  "media_ingest",
];

export const SEASON_PAGE_TABS = [
  { tab: "overview", label: "Home" },
  { tab: "episodes", label: "Episodes" },
  { tab: "assets", label: "Assets" },
  { tab: "news", label: "News" },
  { tab: "fandom", label: "Fandom" },
  { tab: "cast", label: "Credits" },
  { tab: "surveys", label: "Surveys" },
  { tab: "social", label: "Social Media" },
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UUID_LIKE_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export const readTrimmedToken = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const formatIsoAgeLabel = (value: string | null | undefined): string | null => {
  const trimmed = readTrimmedToken(value);
  if (!trimmed) return null;
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) return null;
  const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  return `${diffSeconds}s ago`;
};

export const isCastRefreshPhaseId = (value: unknown): value is CastRefreshPhaseId =>
  typeof value === "string" && CAST_REFRESH_PHASE_ORDER.includes(value as CastRefreshPhaseId);

export const toIsoNow = (): string => new Date().toISOString();

export const updateCastRefreshPhaseStates = (
  states: CastRefreshPhaseState[],
  phaseId: CastRefreshPhaseId,
  updater: (state: CastRefreshPhaseState) => CastRefreshPhaseState
): CastRefreshPhaseState[] => states.map((state) => (state.id === phaseId ? updater(state) : state));

export const looksLikeUuid = (value: string): boolean => UUID_RE.test(value);

export const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const formatFixed1 = (value: unknown): string | null => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? null : parsed.toFixed(1);
};

export const parseProgressNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

export const isRetryableGalleryStatus = (status: number): boolean =>
  status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;

const readGalleryErrorString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const readGalleryErrorBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

export const parseGalleryAssetErrorPayload = async (
  response: Response,
): Promise<{
  message: string;
  code?: string;
  reason?: string;
  retryable: boolean;
  detail?: Record<string, unknown>;
}> => {
  let payload: Record<string, unknown> | null = null;
  try {
    const parsed = (await response.clone().json()) as unknown;
    payload = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    payload = null;
  }

  const detail =
    payload?.detail && typeof payload.detail === "object" && !Array.isArray(payload.detail)
      ? (payload.detail as Record<string, unknown>)
      : null;
  const code = readGalleryErrorString(payload?.code) ?? readGalleryErrorString(detail?.code);
  const reason = readGalleryErrorString(payload?.reason) ?? readGalleryErrorString(detail?.reason);
  return {
    message:
      readGalleryErrorString(payload?.error) ??
      readGalleryErrorString(payload?.detail) ??
      readGalleryErrorString(detail?.message) ??
      `${response.status} ${response.statusText || "Failed to load gallery assets"}`,
    ...(code ? { code } : {}),
    ...(reason ? { reason } : {}),
    retryable:
      readGalleryErrorBoolean(payload?.retryable) ??
      readGalleryErrorBoolean(detail?.retryable) ??
      isRetryableGalleryStatus(response.status),
    ...(detail ? { detail } : {}),
  };
};

export const normalizeGallerySourceFailure = (
  source: GalleryAssetSourceRequest,
  reason: unknown,
): GalleryAssetSourceFailure => {
  if (reason instanceof GalleryAssetSourceError) {
    return {
      sourceId: source.id,
      label: source.label,
      message: reason.message,
      status: reason.status,
      retryable: reason.retryable,
      ...(reason.code ? { code: reason.code } : {}),
      ...(reason.reason ? { reason: reason.reason } : {}),
      ...(reason.detail ? { detail: reason.detail } : {}),
    };
  }
  return {
    sourceId: source.id,
    label: source.label,
    message: reason instanceof Error ? reason.message : "Failed to load gallery assets",
    status: 500,
    retryable: false,
  };
};

export const formatGallerySourceFailure = (failure: GalleryAssetSourceFailure): string => {
  const retryLabel = failure.retryable ? "retryable" : "not retryable";
  const codeLabel = failure.code ? ` (${failure.code})` : "";
  return `${failure.label}: ${failure.message}${codeLabel}, ${retryLabel}`;
};

export const formatSnapshotAgeLabel = (timestampMs: number): string => {
  const diffMs = Math.max(0, Date.now() - timestampMs);
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const isHttpUrlValue = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const withSnapshotAgeSuffix = (
  warning: string | null,
  timestampMs: number | null
): string | null => {
  if (!warning) return null;
  if (!timestampMs) return warning;
  return `${warning} Last successful snapshot: ${formatSnapshotAgeLabel(timestampMs)}.`;
};

export const inferBravoShowUrl = (showName: string | null | undefined): string | null => {
  if (typeof showName !== "string") return null;
  const slug = showName
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) return null;
  return `https://www.bravotv.com/${slug}`;
};

export const inferBravoPersonUrl = (personName: string | null | undefined): string | null => {
  if (typeof personName !== "string") return null;
  const slug = personName
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) return null;
  return `https://www.bravotv.com/people/${slug}`;
};

export const isBravoNetworkName = (value: unknown): boolean => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (!normalized) return false;
  return normalized === "bravo" || normalized === "bravotv" || normalized.includes("bravo");
};

export const normalizeBravoSocialKey = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "link";
  if (normalized.includes("instagram")) return "instagram";
  if (normalized === "x" || normalized.includes("twitter")) return "x";
  if (normalized.includes("facebook")) return "facebook";
  if (normalized.includes("tiktok")) return "tiktok";
  if (normalized.includes("youtube")) return "youtube";
  return normalized;
};

export const formatBravoSocialLabel = (key: string): string => {
  if (key === "x") return "X";
  if (key === "instagram") return "Instagram";
  if (key === "facebook") return "Facebook";
  if (key === "tiktok") return "TikTok";
  if (key === "youtube") return "YouTube";
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export const extractBravoSocialHandle = (url: string): string | null =>
  extractSocialHandleFromUrl(url);

export const inferBravoImportImageKind = (
  image: { url: string; alt?: string | null }
): BravoImportImageKind => {
  const haystack = `${image.alt ?? ""} ${image.url}`.toLowerCase();
  if (haystack.includes("logo")) return "logo";
  if (haystack.includes("key art") || haystack.includes("poster")) return "poster";
  if (haystack.includes("backdrop") || haystack.includes("background")) return "backdrop";
  if (haystack.includes("cast")) return "cast";
  if (haystack.includes("still")) return "episode_still";
  if (haystack.includes("intro")) return "intro";
  if (haystack.includes("reunion")) return "reunion";
  return "promo";
};

export const humanizeStage = (value: string): string => {
  const normalized = value.replace(/[_-]+/g, " ").trim();
  if (!normalized) return "Working";
  return normalized
    .split(" ")
    .map((token) =>
      token.length > 0 ? token.charAt(0).toUpperCase() + token.slice(1) : token
    )
    .join(" ");
};

export const resolveStageLabel = (
  stageValue: unknown,
  stageLabels: Record<string, string>
): string | null => {
  if (typeof stageValue !== "string") return null;
  const normalized = stageValue.trim().toLowerCase();
  if (!normalized) return null;
  return stageLabels[normalized] ?? humanizeStage(normalized);
};

export const getShowRefreshTargetLabel = (target: ShowRefreshTarget): string =>
  SHOW_REFRESH_TARGET_LABELS[target] ?? target;

export const buildProgressMessage = (
  stageLabel: string | null,
  rawMessage: unknown,
  fallback: string
): string => {
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (!message) return stageLabel ? `Working on ${stageLabel}...` : fallback;
  if (stageLabel) return `${stageLabel}: ${message}`;
  return message;
};

export const normalizeRefreshLogMessage = (value: string): string =>
  value
    .replace(UUID_LIKE_RE, "person")
    .replace(/\s+/g, " ")
    .trim();

export const isRefreshTopicDone = (entry: RefreshLogEntry | null): boolean =>
  isRefreshLogTerminalSuccess(entry);

export const isRefreshTopicFailed = (entry: RefreshLogEntry | null): boolean => {
  if (!entry) return false;
  const message = entry.message.toLowerCase();
  return message.includes("failed") || message.includes("error");
};

export const getAssetDisplayUrl = (asset: SeasonAsset): string =>
  firstImageUrlCandidate(getSeasonAssetCardUrlCandidates(asset)) ?? asset.hosted_url;

export const getFeaturedShowImageKind = (
  asset: SeasonAsset
): "poster" | "backdrop" | null => {
  const normalizedKind = String(asset.kind ?? "").trim().toLowerCase();
  if (normalizedKind === "poster") return "poster";
  if (normalizedKind === "backdrop") return "backdrop";
  return null;
};

export const buildAssetAutoCropPayload = (
  asset: SeasonAsset
): Record<string, unknown> | null => {
  const directCrop = parseThumbnailCrop(
    {
      x: asset.thumbnail_focus_x,
      y: asset.thumbnail_focus_y,
      zoom: asset.thumbnail_zoom,
      mode: asset.thumbnail_crop_mode,
    },
    { clamp: true }
  );
  const metadataCrop = parseThumbnailCrop(
    (asset.metadata as Record<string, unknown> | null)?.thumbnail_crop,
    { clamp: true }
  );
  const crop = directCrop ?? metadataCrop;
  if (!crop) return null;
  return {
    x: crop.x,
    y: crop.y,
    zoom: crop.zoom,
    mode: crop.mode,
  };
};

export const buildAssetAutoCropPayloadWithFallback = (
  asset: SeasonAsset
): Record<string, unknown> =>
  buildAssetAutoCropPayload(asset) ?? {
    x: THUMBNAIL_DEFAULTS.x,
    y: THUMBNAIL_DEFAULTS.y,
    zoom: THUMBNAIL_DEFAULTS.zoom,
    mode: "auto",
    strategy: "resize_center_fallback_v1",
  };

export const areStringArraysEqual = (a: string[], b: string[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
};

export const areNumberArraysEqual = (a: number[], b: number[]): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
};
