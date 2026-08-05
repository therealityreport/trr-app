import {
  selectDisplayThumbnail,
  type DisplayThumbnailSelection,
  type DisplayThumbnailVariants,
} from "@/components/admin/social-week/social-media-thumbnails";
import {
  canonicalizeHostedMediaUrl,
  inferHostedMediaFileNameFromUrl,
  isLikelyHostedMediaUrl,
} from "@/lib/hosted-media";
import type { PhotoMetadata } from "@/lib/photo-metadata";
import {
  PLATFORM_LABELS,
  SOCIAL_MEDIA_VIDEO_EXT_RE,
  SOCIAL_SOURCE_COLORS,
} from "./status-and-request-helpers";
import type {
  Scope,
  SocialJob,
  SocialMediaType,
  SocialStatsItem,
} from "./section-types";

export const getJobStageLabel = (job: SocialJob): string =>
  (typeof job.config?.stage === "string" ? job.config.stage : undefined) ??
  (typeof job.metadata?.stage === "string" ? job.metadata.stage : undefined) ??
  job.job_type ??
  "posts";

export const statusToLogVerb = (status: SocialJob["status"]): string => {
  if (status === "queued" || status === "pending") return "queued";
  if (status === "retrying") return "retrying";
  if (status === "running") return "running";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return "cancelled";
};

export const getJobStageCounters = (job: SocialJob): { posts: number; comments: number } | null => {
  const counters = (job.metadata as Record<string, unknown> | undefined)?.stage_counters as
    | Record<string, unknown>
    | undefined;
  const hasPosts = typeof counters?.posts === "number";
  const hasComments = typeof counters?.comments === "number";
  if (!hasPosts && !hasComments) return null;
  return {
    posts: Number(counters?.posts ?? 0),
    comments: Number(counters?.comments ?? 0),
  };
};

export const getJobPersistCounters = (job: SocialJob): { posts_upserted: number; comments_upserted: number } | null => {
  const counters = (job.metadata as Record<string, unknown> | undefined)?.persist_counters as
    | Record<string, unknown>
    | undefined;
  const hasPosts = typeof counters?.posts_upserted === "number";
  const hasComments = typeof counters?.comments_upserted === "number";
  if (!hasPosts && !hasComments) return null;
  return {
    posts_upserted: Number(counters?.posts_upserted ?? 0),
    comments_upserted: Number(counters?.comments_upserted ?? 0),
  };
};

export const getJobActivity = (job: SocialJob): Record<string, unknown> | null => {
  const activity = (job.metadata as Record<string, unknown> | undefined)?.activity as
    | Record<string, unknown>
    | undefined;
  if (!activity || typeof activity !== "object") return null;
  return activity;
};

export const getJobRetrievalMeta = (job: SocialJob): Record<string, unknown> | null => {
  const retrievalMeta = (job.metadata as Record<string, unknown> | undefined)?.retrieval_meta as
    | Record<string, unknown>
    | undefined;
  if (!retrievalMeta || typeof retrievalMeta !== "object") return null;
  return retrievalMeta;
};

export const formatJobActivitySummary = (activity: Record<string, unknown> | null): string => {
  if (!activity) return "";
  const segments: string[] = [];
  if (typeof activity.phase === "string" && activity.phase.trim()) {
    const phaseLabels: Record<string, string> = {
      posts_start: "Starting",
      posts_scan: "Scanning for posts",
      posts_complete: "Posts complete",
      posts_end: "Scan complete",
      comments_start: "Starting comments",
      comments_scan: "Collecting comments",
      comments_complete: "Comments complete",
      comments_end: "Comments complete",
    };
    const raw = activity.phase.trim();
    segments.push(phaseLabels[raw] ?? raw.replaceAll("_", " "));
  }
  if (typeof activity.pages_scanned === "number") {
    segments.push(`scanned ${activity.pages_scanned} ${activity.pages_scanned === 1 ? "page" : "pages"}`);
  }
  if (typeof activity.posts_checked === "number") {
    segments.push(`checked ${activity.posts_checked} ${activity.posts_checked === 1 ? "post" : "posts"}`);
  }
  if (typeof activity.matched_posts === "number") {
    segments.push(
      `${activity.matched_posts} ${activity.matched_posts === 1 ? "post" : "posts"} matched the run window`,
    );
  }
  return segments.join(", ");
};

export const STAGE_LABELS_PLAIN: Record<string, string> = {
  posts: "Finding Posts",
  comments: "Collecting Comments",
  media_mirror: "Uploading Media",
  mirror: "Uploading Media",
  comment_media_mirror: "Uploading Comment Media",
};

export const JOB_STATUS_PLAIN: Record<string, string> = {
  running: "In progress",
  completed: "Done",
  failed: "Failed",
  queued: "Waiting",
  pending: "Waiting",
  retrying: "Retrying",
  cancelled: "Cancelled",
};

export const formatCountersPlain = (posts: number, comments: number): string => {
  const parts: string[] = [];
  parts.push(`${posts.toLocaleString()} ${posts === 1 ? "post" : "posts"}`);
  parts.push(`${comments.toLocaleString()} ${comments === 1 ? "comment" : "comments"}`);
  return parts.join(", ");
};

export const formatJobOutcomeNote = (job: SocialJob): string => {
  const stage = getJobStageLabel(job);
  const counters = getJobStageCounters(job);
  const persistCounters = getJobPersistCounters(job);
  const activity = getJobActivity(job);
  const retrievalMeta = getJobRetrievalMeta(job);
  const failReasons = Array.isArray(retrievalMeta?.comment_fail_reasons)
    ? retrievalMeta?.comment_fail_reasons.map((value) => String(value).toLowerCase())
    : [];
  const providerErrorCode = String(job.job_error_code ?? "").trim().toUpperCase();
  const matchedPosts =
    typeof activity?.matched_posts === "number" ? Number(activity.matched_posts) : undefined;
  const postsChecked =
    typeof activity?.posts_checked === "number" ? Number(activity.posts_checked) : undefined;
  const observedPosts = Number(counters?.posts ?? 0);
  const observedComments = Number(counters?.comments ?? 0);
  const savedPosts = Number(persistCounters?.posts_upserted ?? 0);
  const incompleteCommentFetches = Number(retrievalMeta?.incomplete_comment_fetches ?? 0);
  const commentsAuthFailed = retrievalMeta?.comments_auth_failed === true;

  if (stage === "posts" && observedPosts > 0 && savedPosts === 0 && matchedPosts === 0) {
    return "Candidate posts were scanned, but none matched the selected run window.";
  }
  if (stage === "posts" && observedPosts === 0 && observedComments === 0 && (postsChecked ?? 0) === 0) {
    if (providerErrorCode === "AUTH" || failReasons.some((reason) => reason.includes("auth") || reason.includes("challenge"))) {
      return "The provider rejected this shard before posts could be scanned because authentication or checkpoint verification was required.";
    }
    if (providerErrorCode === "RATE_LIMIT" || failReasons.some((reason) => reason.includes("rate") || reason.includes("throttle") || reason.includes("quota"))) {
      return "The provider throttled this shard before any posts were scanned.";
    }
    if (job.status === "failed" && (job.error_message || providerErrorCode)) {
      return "The provider failed before any posts were scanned for this shard.";
    }
    return "No posts were available for this account in the selected run window.";
  }
  if (stage === "comments" && observedPosts > 0 && observedComments === 0) {
    if (commentsAuthFailed || incompleteCommentFetches > 0) {
      const affectedPosts = Math.max(incompleteCommentFetches, observedPosts);
      return `Comment fetch was blocked on ${affectedPosts.toLocaleString()} matched ${
        affectedPosts === 1 ? "post" : "posts"
      } by an Instagram auth/challenge response.`;
    }
    return "Matched posts were checked, but no comments were returned for this shard.";
  }
  return "";
};

export const isVideoLikeThumbnailUrl = (url: string): boolean => {
  const normalized = url.toLowerCase();
  if (SOCIAL_MEDIA_VIDEO_EXT_RE.test(normalized)) return true;
  try {
    return new URL(normalized).hostname.toLowerCase().includes("video.twimg.com");
  } catch {
    return false;
  }
};

export const detectSocialMediaType = (url: string): SocialMediaType =>
  isVideoLikeThumbnailUrl(url) ? "video" : "image";

export const getCanonicalLeaderboardThumbnailImage = (item: {
  hosted_thumbnail_url?: string | null;
  thumbnail_url?: string | null;
  source_thumbnail_url?: string | null;
  display_thumbnail_url?: string | null;
  display_thumbnail_variants?: DisplayThumbnailVariants;
  display_thumbnail_srcset?: string | null;
}): DisplayThumbnailSelection => {
  const imageThumbnail = selectDisplayThumbnail({
    displayThumbnail: item.display_thumbnail_url,
    displayThumbnailSrcSet: item.display_thumbnail_srcset,
    displayThumbnailVariants: item.display_thumbnail_variants,
    fallbackUrls: [item.hosted_thumbnail_url, item.thumbnail_url, item.source_thumbnail_url],
  });
  if (imageThumbnail.src) return imageThumbnail;

  const videoSrc = pickFirstVideoLikeLeaderboardThumbnailUrl([
    item.display_thumbnail_url,
    item.hosted_thumbnail_url,
    item.thumbnail_url,
    item.source_thumbnail_url,
    ...Object.values(item.display_thumbnail_variants ?? {}),
  ]);
  return {
    src: videoSrc,
    srcSet: null,
  };
};

export const pickFirstVideoLikeLeaderboardThumbnailUrl = (values: unknown[]): string | null => {
  for (const value of values) {
    const rawUrl =
      typeof value === "string"
        ? value
        : value && typeof value === "object" && "url" in value
          ? String((value as { url?: unknown }).url ?? "")
          : "";
    const candidate = canonicalizeHostedMediaUrl(rawUrl) ?? rawUrl.trim();
    if (candidate && isVideoLikeThumbnailUrl(candidate)) return candidate;
  }
  return null;
};

export const getCanonicalLeaderboardThumbnailUrl = (item: {
  hosted_thumbnail_url?: string | null;
  thumbnail_url?: string | null;
  source_thumbnail_url?: string | null;
  display_thumbnail_url?: string | null;
  display_thumbnail_variants?: DisplayThumbnailVariants;
  display_thumbnail_srcset?: string | null;
}) => getCanonicalLeaderboardThumbnailImage(item).src;

export const buildLeaderboardMediaMetadata = (input: {
  item: {
    platform: string;
    source_id: string;
    text?: string;
    url: string;
    timestamp: string;
    hosted_thumbnail_url?: string | null;
    source_thumbnail_url?: string | null;
    thumbnail_url?: string | null;
    display_thumbnail_url?: string | null;
    display_thumbnail_variants?: DisplayThumbnailVariants;
    display_thumbnail_status?: string | Record<string, unknown> | null;
    display_thumbnail_srcset?: string | null;
  };
  sourceScope: Scope;
  showName: string;
  seasonNumber: number;
  sectionTitle: string;
}): PhotoMetadata => {
  const { item, sourceScope, showName, seasonNumber, sectionTitle } = input;
  const sourceLabel = PLATFORM_LABELS[item.platform] ?? item.platform;
  const postedAt = item.timestamp ? new Date(item.timestamp) : null;
  const postedDate = postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : null;
  const mediaUrl = getCanonicalLeaderboardThumbnailUrl(item) ?? item.url;
  const fileTypeMatch = mediaUrl.match(/\.([a-z0-9]+)(\?|$)/i);
  const fileType = fileTypeMatch?.[1]?.toLowerCase() ?? null;
  const isHostedMedia = isLikelyHostedMediaUrl(mediaUrl);
  const hostedMediaFileName = isHostedMedia ? inferHostedMediaFileNameFromUrl(mediaUrl) : null;
  const originalImageUrl = isHostedMedia ? null : mediaUrl;
  return {
    source: sourceLabel,
    sourceBadgeColor: SOCIAL_SOURCE_COLORS[item.platform] ?? "#71717a",
    isHostedMedia,
    hostedMediaFileName,
    originalImageUrl,
    originalSourceFileUrl: originalImageUrl,
    originalSourcePageUrl: item.url,
    originalSourceLabel: sourceLabel,
    fileType,
    createdAt: postedDate,
    addedAt: postedDate,
    hasTextOverlay: null,
    contentType: "PROMO",
    sectionTag: "OTHER",
    sectionLabel: sectionTitle,
    sourceLogo: sourceScope.toUpperCase(),
    assetName: `${sourceLabel} ${item.source_id}`,
    imdbType: null,
    episodeLabel: null,
    sourceVariant: sourceScope.toUpperCase(),
    sourcePageTitle: item.text || `${sourceLabel} social post`,
    sourceUrl: item.url,
    faceBoxes: [],
    peopleCount: null,
    caption: item.text || null,
    dimensions: null,
    season: seasonNumber,
    contextType: "social_leaderboard",
    people: [],
    titles: [showName].filter(Boolean),
    fetchedAt: postedDate,
    galleryStatus: null,
    galleryStatusReason: null,
    galleryStatusCheckedAt: null,
  };
};

export function SocialStatsPanel({ stats }: { stats: SocialStatsItem[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="rounded border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-widest text-white/55">Social Stats</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {stats.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            className="rounded border border-white/10 bg-black/20 px-2 py-1.5"
          >
            <p className="text-[10px] uppercase tracking-wide text-white/55">{item.label}</p>
            <p className="mt-0.5 text-xs font-semibold text-white/90">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
