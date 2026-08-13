import type {
  SocialAccountCatalogPost,
  SocialAccountCatalogPostDetail,
  SocialAccountCatalogRunProgressSnapshot,
  SocialAccountProfileHashtag,
  SocialAccountProfileTab,
} from "@/lib/admin/social-account-profile";
import {
  selectDisplayThumbnail,
  type DisplayThumbnailSelection,
  type DisplayThumbnailVariants,
} from "../social-week/social-media-thumbnails";

export const INTEGER_FORMATTER = new Intl.NumberFormat("en-US");

export const HASHTAG_WINDOW_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "7d", label: "This Week" },
  { value: "30d", label: "This Month" },
  { value: "365d", label: "This Year" },
] as const;

export type HashtagAssignmentStatus = "all" | "assigned" | "unassigned";

export const formatInteger = (value: number | null | undefined): string => {
  return INTEGER_FORMATTER.format(Number.isFinite(Number(value)) ? Number(value) : 0);
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export const formatMonthYear = (value: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || "").trim());
  return match ? `${match[2]}-${match[1]}` : value;
};

export const formatCatalogRunWindow = (progress?: SocialAccountCatalogRunProgressSnapshot | null): string | null => {
  const dateStart = String(progress?.date_start ?? "").trim() || null;
  const dateEnd = String(progress?.date_end ?? "").trim() || null;
  if (!dateStart && !dateEnd) return null;
  return `Window ${dateStart ? formatDateTime(dateStart) : "open start"} to ${dateEnd ? formatDateTime(dateEnd) : "open end"}`;
};

export const formatInstagramPostsAuthMode = (
  progress?: SocialAccountCatalogRunProgressSnapshot | null,
): string | null => {
  const mode = String(progress?.instagram_posts_auth_mode || progress?.posts_auth_mode || "").trim().toLowerCase();
  if (mode === "anonymous") return "Posts auth anonymous";
  if (mode === "authenticated") return "Posts auth authenticated";
  return null;
};

export const formatDashboardFreshnessAge = (ageSeconds: number | null | undefined): string => {
  if (ageSeconds == null || !Number.isFinite(Number(ageSeconds))) {
    return "moments ago";
  }
  const normalizedSeconds = Math.max(0, Math.round(Number(ageSeconds)));
  if (normalizedSeconds < 60) {
    return `${normalizedSeconds} second${normalizedSeconds === 1 ? "" : "s"} ago`;
  }
  const minutes = Math.round(normalizedSeconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
};

export const formatRouteDuration = (durationMs: number | null | undefined): string => {
  if (durationMs == null || !Number.isFinite(Number(durationMs))) {
    return "unknown";
  }
  const normalizedMs = Math.max(0, Math.round(Number(durationMs)));
  if (normalizedMs < 1000) {
    return `${normalizedMs} ms`;
  }
  return `${(normalizedMs / 1000).toFixed(normalizedMs < 10_000 ? 1 : 0)} s`;
};

export const formatDetailMetricValue = (value: unknown): string => {
  return typeof value === "number" && Number.isFinite(value) ? formatInteger(value) : "0";
};

export const formatMirrorStatusLabel = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) {
    return value.trim().replace(/_/g, " ");
  }
  if (value && typeof value === "object" && "status" in value) {
    return String((value as { status?: unknown }).status || "")
      .trim()
      .replace(/_/g, " ");
  }
  return "Unknown";
};

export const isLikelyVideoUrl = (value?: string | null): boolean => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.endsWith(".mp4") || normalized.endsWith(".mov") || normalized.endsWith(".webm") || normalized.includes(".mp4?");
};

export const getUniqueMediaUrls = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of values) {
    const url = String(value || "").trim();
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(url);
  }
  return urls;
};

export const getDisplayThumbnailVariants = (value: unknown): DisplayThumbnailVariants => {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DisplayThumbnailVariants) : null;
};

export const getCatalogPostMediaUrls = (item: SocialAccountCatalogPost | SocialAccountCatalogPostDetail): string[] => {
  return getUniqueMediaUrls([
    item.display_thumbnail_url,
    item.hosted_thumbnail_url,
    item.thumbnail_url,
    item.source_thumbnail_url,
    ...(item.hosted_media_urls ?? []),
    ...(item.media_urls ?? []),
    ...(item.source_media_urls ?? []),
  ]);
};

export const buildCatalogDetailUrlGroups = (
  item: SocialAccountCatalogPostDetail,
): Array<{ label: string; urls: string[] }> => [
  {
    label: "Hosted",
    urls: getUniqueMediaUrls([item.hosted_thumbnail_url, ...(item.hosted_media_urls ?? [])]),
  },
  {
    label: "Saved",
    urls: getUniqueMediaUrls([item.display_thumbnail_url, item.thumbnail_url, ...(item.media_urls ?? [])]),
  },
  {
    label: "Source",
    urls: getUniqueMediaUrls([item.source_thumbnail_url, ...(item.source_media_urls ?? [])]),
  },
];

export const getCatalogPostPreviewImage = (
  item: SocialAccountCatalogPost | SocialAccountCatalogPostDetail,
): DisplayThumbnailSelection => {
  return selectDisplayThumbnail({
    displayThumbnail: item.display_thumbnail_url,
    displayThumbnailSrcSet: item.display_thumbnail_srcset,
    displayThumbnailVariants: getDisplayThumbnailVariants(item.display_thumbnail_variants),
    fallbackUrls: getCatalogPostMediaUrls(item),
  });
};

export const getCatalogPostMetricSummary = (item: SocialAccountCatalogPost): string | null => {
  const metrics = item.metrics ?? {};
  const pieces = [
    typeof metrics.likes === "number" ? `${formatInteger(metrics.likes)} likes` : null,
    typeof metrics.comments_count === "number" ? `${formatInteger(metrics.comments_count)} comments` : null,
    typeof metrics.reposts === "number" && metrics.reposts > 0 ? `${formatInteger(metrics.reposts)} reposts` : null,
    typeof metrics.views === "number" && metrics.views > 0 ? `${formatInteger(metrics.views)} views` : null,
    typeof metrics.video_views === "number" && metrics.video_views > 0
      ? `${formatInteger(metrics.video_views)} video views`
      : null,
  ].filter(Boolean);
  if (pieces.length > 0) return pieces.join(" · ");
  return typeof metrics.engagement === "number" && metrics.engagement > 0
    ? `${formatInteger(metrics.engagement)} engagement`
    : null;
};

export const formatHashtagWindowLabel = (value: (typeof HASHTAG_WINDOW_OPTIONS)[number]["value"]): string => {
  return HASHTAG_WINDOW_OPTIONS.find((option) => option.value === value)?.label ?? "All Time";
};

export const shouldUseSummaryTopHashtagsPreview = (options: {
  activeTab: SocialAccountProfileTab;
  hashtagWindow: (typeof HASHTAG_WINDOW_OPTIONS)[number]["value"];
  hashtagAssignmentStatus: HashtagAssignmentStatus;
  summaryTopHashtags: ReadonlyArray<SocialAccountProfileHashtag> | null | undefined;
  hasLoadedExactWindow: boolean;
}): boolean => {
  return (
    options.activeTab === "stats" &&
    options.hashtagWindow === "all" &&
    options.hashtagAssignmentStatus === "all" &&
    !options.hasLoadedExactWindow &&
    (options.summaryTopHashtags?.length ?? 0) > 0
  );
};
