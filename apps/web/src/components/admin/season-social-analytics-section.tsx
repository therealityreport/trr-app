"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import SocialPlatformTabIcon from "@/components/admin/SocialPlatformTabIcon";
import SocialPostsSection from "@/components/admin/social-posts-section";
import RedditSourcesManager from "@/components/admin/reddit-sources-manager";
import CastContentSection from "@/components/admin/cast-content-section";
import { fetchAdminWithAuth, getClientAuthHeaders } from "@/lib/admin/client-auth";
import {
  canonicalizeHostedMediaUrl,
  inferHostedMediaFileNameFromUrl,
  isLikelyHostedMediaUrl,
} from "@/lib/hosted-media";
import type { PhotoMetadata } from "@/lib/photo-metadata";
import {
  buildSocialAccountProfileUrl,
  buildSeasonSocialWeekUrl,
  parseSeasonEpisodeNumberFromPath,
  parseSeasonSocialPathSegment,
} from "@/lib/admin/show-admin-routes";
import { deriveCastComparisonWindow } from "@/lib/admin/cast-socialblade-charting";
import {
  buildSocialSyncSessionRequest,
  consumeSocialSyncSessionStream,
  type SocialSyncSessionProgressSnapshot,
  type SocialSyncSessionStreamPayload,
} from "@/lib/admin/social-sync-session";

type Platform = "instagram" | "tiktok" | "twitter" | "youtube" | "facebook" | "threads";
export type PlatformTab = "overview" | Platform;
type Scope = "bravo" | "creator" | "community";
type SyncStrategy = "incremental" | "full_refresh";
type WeeklyMetric = "posts" | "comments" | "completeness";
type BenchmarkCompareMode = "previous" | "trailing";
export type SocialAnalyticsView =
  | "bravo"
  | "sentiment"
  | "hashtags"
  | "advanced"
  | "reddit"
  | "cast-content"
  | "tiktok-overview"
  | "tiktok-cast"
  | "tiktok-hashtags"
  | "tiktok-sounds"
  | "tiktok-health"
  | "tiktok-sentiment";
type WeeklyPlatformRow = NonNullable<AnalyticsResponse["weekly_platform_posts"]>[number];

type SocialJob = {
  id: string;
  run_id?: string | null;
  platform: string;
  status: "queued" | "pending" | "retrying" | "running" | "cancelling" | "completed" | "failed" | "cancelled";
  job_type?: string;
  items_found?: number;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string | null;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  job_error_code?: "RATE_LIMIT" | "AUTH" | "PARSER" | "NETWORK" | "UNKNOWN" | string;
};

type SocialRun = {
  id: string;
  operation_id?: string | null;
  execution_owner?: string | null;
  execution_mode_canonical?: string | null;
  execution_backend_canonical?: string | null;
  status: "queued" | "pending" | "retrying" | "running" | "cancelling" | "completed" | "failed" | "cancelled";
  source_scope?: string;
  initiated_by?: string | null;
  config?: Record<string, unknown>;
  summary?: {
    total_jobs?: number;
    completed_jobs?: number;
    failed_jobs?: number;
    active_jobs?: number;
    items_found_total?: number;
    stage_counts?: Record<
      string,
      {
        total?: number;
        completed?: number;
        failed?: number;
        active?: number;
      }
    >;
  };
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  updated_at?: string | null;
};

type SocialRunSummary = {
  run_id: string;
  status: SocialRun["status"];
  source_scope?: string;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_seconds?: number | null;
  total_jobs?: number;
  completed_jobs?: number;
  failed_jobs?: number;
  active_jobs?: number;
  items_found_total?: number;
  stage_counts?: Record<
    string,
    {
      total?: number;
      completed?: number;
      failed?: number;
      active?: number;
    }
  >;
  affected_platforms?: string[];
  error_counts?: Record<string, number>;
  success_rate_pct?: number | null;
};

export type SocialTarget = {
  platform: string;
  accounts?: string[];
  hashtags?: string[];
  keywords?: string[];
  is_active?: boolean;
};

type LinkedAccountProfileSummary = {
  avatar_url?: string | null;
  profile_url?: string | null;
};

type WorkerHealthPayload = {
  queue_enabled?: boolean;
  healthy?: boolean;
  healthy_workers?: number;
  reason?: string | null;
  checked_at?: string | null;
};

type WorkerHealthState = {
  queueEnabled: boolean | null;
  healthy: boolean | null;
  healthyWorkers: number | null;
  reason: string | null;
  checkedAt: string | null;
};

type StaleRunState = {
  runId: string;
  ingestMode: string;
  ageMinutes: number;
  pendingJobs: number;
  retryingJobs: number;
};

type AnalyticsResponse = {
  window: {
    start: string;
    end: string;
    timezone: string;
    week_zero_start?: string;
    week?: number | null;
    source_scope?: string;
  };
  summary: {
    show_id: string;
    season_id: string;
    season_number: number;
    show_name: string | null;
    total_posts: number;
    total_comments: number;
    total_engagement: number;
    sentiment_mix: {
      positive: number;
      neutral: number;
      negative: number;
      counts: {
        positive: number;
        neutral: number;
        negative: number;
      };
    };
    data_quality?: {
      comments_saved_pct_overall: number | null;
      platform_comments_saved_pct: Partial<Record<Platform, number | null>>;
      youtube_content_breakdown?: {
        videos_count: number;
        reels_count: number;
        total_count: number;
      };
      last_post_at: string | null;
      last_comment_at: string | null;
      data_freshness_minutes: number | null;
      post_metadata?: {
        total_posts: number;
        captions?: { posts_with: number; pct: number | null };
        tags?: { posts_with: number; pct: number | null };
        mentions?: { posts_with: number; pct: number | null };
        collaborators?: { posts_with: number; pct: number | null };
        content_types?: {
          total_posts: number;
          buckets?: Array<{
            key: "photo" | "album" | "video" | "other";
            count: number;
            pct: number | null;
          }>;
        };
      };
    };
  };
  weekly: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    week_type?: "preseason" | "episode" | "bye" | "postseason";
    episode_number?: number | null;
    post_volume: number;
    comment_volume: number;
    engagement: number;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }>;
  weekly_platform_posts?: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    week_type?: "preseason" | "episode" | "bye" | "postseason";
    episode_number?: number | null;
    posts: Partial<Record<Platform, number>>;
    comments?: Partial<Record<Platform, number>>;
    reported_comments?: Partial<Record<Platform, number>>;
    total_posts: number;
    total_comments?: number;
    total_reported_comments?: number;
    comments_saved_pct?: number | null;
  }>;
  weekly_platform_engagement?: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    week_type?: "preseason" | "episode" | "bye" | "postseason";
    episode_number?: number | null;
    engagement: Partial<Record<Platform, number>>;
    total_engagement: number;
    has_data: boolean;
  }>;
  weekly_daily_activity?: Array<{
    week_index: number;
    label: string;
    start: string;
    end: string;
    week_type?: "preseason" | "episode" | "bye" | "postseason";
    episode_number?: number | null;
    days: Array<{
      day_index: number;
      date_local: string;
      posts: Partial<Record<Platform, number>>;
      comments: Partial<Record<Platform, number>>;
      reported_comments?: Partial<Record<Platform, number>>;
      total_posts: number;
      total_comments: number;
      total_reported_comments?: number;
    }>;
  }>;
  weekly_flags?: Array<{
    week_index: number;
    code: "zero_activity" | "spike" | "drop" | "comment_gap";
    severity: "info" | "warn";
    message: string;
  }>;
  schedule_profile?: {
    timezone: string;
    platforms: Array<{
      platform: Platform;
      zero_days: number;
      peak_day_posts: number;
      median_day_posts: number;
      active_days: number;
    }>;
  };
  benchmark?: {
    week_index: number;
    current: {
      posts: number;
      comments: number;
      engagement: number;
    };
    previous_week: {
      week_index: number | null;
      metrics: {
        posts: number;
        comments: number;
        engagement: number;
      };
      delta_pct: {
        posts: number | null;
        comments: number | null;
        engagement: number | null;
      };
    };
    trailing_3_week_avg: {
      window_size: number;
      metrics: {
        posts: number;
        comments: number;
        engagement: number;
      };
      delta_pct: {
        posts: number | null;
        comments: number | null;
        engagement: number | null;
      };
    };
    consistency_score_pct?: Partial<Record<Platform, number | null>>;
  };
  platform_breakdown: Array<{
    platform: string;
    posts: number;
    comments: number;
    engagement: number;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }>;
  themes: {
    positive: Array<{ term: string; count: number; score: number }>;
    negative: Array<{ term: string; count: number; score: number }>;
  };
  leaderboards: {
    bravo_content: Array<{
      platform: string;
      source_id: string;
      text: string;
      engagement: number;
      url: string;
      timestamp: string;
      hosted_thumbnail_url?: string | null;
      source_thumbnail_url?: string | null;
      thumbnail_url?: string | null;
    }>;
    viewer_discussion: Array<{
      platform: string;
      source_id: string;
      text: string;
      engagement: number;
      url: string;
      timestamp: string;
      sentiment: "positive" | "neutral" | "negative";
      hosted_thumbnail_url?: string | null;
      source_thumbnail_url?: string | null;
      thumbnail_url?: string | null;
    }>;
  };
  jobs: SocialJob[];
  reddit?: {
    community_id?: string;
    subreddit?: string;
    tracked_post_count?: number;
    show_match_post_count?: number;
    comment_count?: number;
    flair_mix?: Array<{
      flair_key?: string;
      flair_label?: string;
      tracked_flair_post_count?: number;
      post_count?: number;
    }>;
    freshness?: {
      latest_data_timestamp?: string | null;
      latest_run_timestamp?: string | null;
      latest_run_status?: string | null;
    };
    coverage?: {
      tracked_post_count?: number;
      detail_scraped_post_count?: number;
      comment_saved_post_count?: number;
      detail_coverage_pct?: number | null;
      comment_coverage_pct?: number | null;
      stale_container_count?: number;
      recovered_container_count?: number;
    };
    container_statuses?: Array<{
      container_key?: string;
      latest_run_status?: string | null;
      stale?: boolean;
      failure_reason_code?: string | null;
    }>;
    deep_link?: {
      label?: string | null;
      path?: string | null;
      show_slug?: string | null;
      season_number?: number | null;
    };
  } | null;
};

type IngestProxyErrorPayload = {
  error?: string;
  detail?: string;
  code?: string;
  retryable?: boolean;
  retry_after_seconds?: number;
  upstream_status?: number;
  upstream_detail?: unknown;
  upstream_detail_code?: string;
};

type SyncStatusPayload = {
  sync_status?: "idle" | "queued" | "running" | "partial" | "complete" | "failed";
  comment_sync_status?: {
    status?: "idle" | "queued" | "running" | "partial" | "complete" | "failed" | "not_attempted" | "unknown";
    expected_count?: number;
    fetched_count?: number;
    upserted_count?: number;
    failure_reason?: string | null;
  } | null;
  media_mirror_status?: {
    status?:
      | "not_needed"
      | "pending"
      | "queued"
      | "running"
      | "partial"
      | "complete"
      | "failed"
      | "not_attempted"
      | "unknown";
    source_count?: number;
    mirrored_count?: number;
    failed_count?: number;
    pending_count?: number;
    partial_count?: number;
    last_job_id?: string | null;
    failure_reason?: string | null;
  } | null;
  active_job_summary?: {
    sync_status?: "queued" | "running";
    dominant_stage?: "posts" | "comments" | "media_mirror" | "comment_media_mirror" | null;
    job_count?: number;
    stage_statuses?: Partial<
      Record<
        "posts" | "comments" | "media_mirror" | "comment_media_mirror",
        { status?: "queued" | "running"; job_count?: number }
      >
    >;
  } | null;
  last_refresh_at?: string | null;
  last_refresh_reason?: string | null;
  stale?: boolean;
  worker_run_id?: string | null;
};

type SharedPipelineStageStatus = {
  status?: "idle" | "queued" | "running" | "partial" | "complete" | "failed";
  job_count?: number;
  active_jobs?: number;
  completed_jobs?: number;
  failed_jobs?: number;
};

type SharedSeasonStatus = {
  season_id?: string;
  show_id?: string;
  show_name?: string | null;
  season_number?: number | null;
  source_scope?: string;
  ingest_mode?: "legacy_season_targeted" | "shared_account_async" | string | null;
  matched_posts?: number;
  matched_source_ids?: string[];
  latest_match_at?: string | null;
  review_queue_count?: number;
  retained_unassigned_count?: number;
  shared_scrape_status?: SharedPipelineStageStatus | null;
  classification_status?: SharedPipelineStageStatus | null;
  materialization_status?: SharedPipelineStageStatus | null;
  latest_shared_run?: {
    run_id?: string | null;
    status?: string | null;
    created_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
  } | null;
};

type CommentsCoverageResponse = {
  total_saved_comments: number;
  total_reported_comments: number;
  coverage_pct: number | null;
  up_to_date: boolean;
  stale_posts_count: number;
  posts_scanned: number;
  sync_status?: SyncStatusPayload["sync_status"];
  comment_sync_status?: SyncStatusPayload["comment_sync_status"];
  media_mirror_status?: SyncStatusPayload["media_mirror_status"];
  active_job_summary?: SyncStatusPayload["active_job_summary"];
  last_refresh_at?: string | null;
  last_refresh_reason?: string | null;
  stale?: boolean;
  worker_run_id?: string | null;
  by_platform?: Record<
    string,
    {
      saved_comments: number;
      reported_comments: number;
      coverage_pct: number | null;
      up_to_date: boolean;
      stale_posts_count: number;
      posts_scanned: number;
      sync_status?: SyncStatusPayload["sync_status"];
      comment_sync_status?: SyncStatusPayload["comment_sync_status"];
      media_mirror_status?: SyncStatusPayload["media_mirror_status"];
      active_job_summary?: SyncStatusPayload["active_job_summary"];
      last_refresh_at?: string | null;
      last_refresh_reason?: string | null;
      stale?: boolean;
      worker_run_id?: string | null;
    }
  >;
};

type MirrorCoverageResponse = {
  up_to_date: boolean;
  needs_mirror_count: number;
  mirrored_count: number;
  failed_count: number;
  partial_count: number;
  pending_count: number;
  posts_scanned: number;
  sync_status?: SyncStatusPayload["sync_status"];
  comment_sync_status?: SyncStatusPayload["comment_sync_status"];
  media_mirror_status?: SyncStatusPayload["media_mirror_status"];
  active_job_summary?: SyncStatusPayload["active_job_summary"];
  last_refresh_at?: string | null;
  last_refresh_reason?: string | null;
  stale?: boolean;
  worker_run_id?: string | null;
  comment_media_items_scanned?: number;
  comment_media_needs_mirror_count?: number;
  comment_media_mirrored_count?: number;
  comment_media_failed_count?: number;
  comment_media_partial_count?: number;
  comment_media_pending_count?: number;
  by_platform?: Record<
    string,
    {
      up_to_date: boolean;
      needs_mirror_count: number;
      mirrored_count: number;
      failed_count: number;
      partial_count: number;
      pending_count: number;
      posts_scanned: number;
      sync_status?: SyncStatusPayload["sync_status"];
      comment_sync_status?: SyncStatusPayload["comment_sync_status"];
      media_mirror_status?: SyncStatusPayload["media_mirror_status"];
      active_job_summary?: SyncStatusPayload["active_job_summary"];
      last_refresh_at?: string | null;
      last_refresh_reason?: string | null;
      stale?: boolean;
      worker_run_id?: string | null;
      comment_media_items_scanned?: number;
      comment_media_needs_mirror_count?: number;
      comment_media_mirrored_count?: number;
      comment_media_failed_count?: number;
      comment_media_partial_count?: number;
      comment_media_pending_count?: number;
    }
  >;
};

type CommentRefreshPolicy = "balanced" | "missing_only";
type IngestMode = "posts_only" | "posts_and_comments" | "comments_only" | "details_refresh";

type WeekDetailPost = {
  source_id?: string;
  text?: string;
  likes?: number;
  hashtags?: string[];
  mentions?: string[];
  profile_tags?: string[];
  collaborators?: string[];
  comments_count?: number;
  replies_count?: number;
  total_comments_available?: number;
};

type WeekDetailResponse = {
  platforms?: Partial<
    Record<
      Platform,
      {
        posts?: WeekDetailPost[];
      }
    >
  >;
  pagination?: {
    limit?: number;
    offset?: number;
    returned?: number;
    has_more?: boolean;
  };
};

type HashtagUsageByPlatform = Record<Platform, number>;
type HashtagTagCountsByPlatform = Record<Platform, Record<string, number>>;

type WeekDetailHashtagUsage = {
  totalTokens: number;
  uniqueTokens: number;
  tagCounts: Record<string, number>;
  byPlatform: HashtagUsageByPlatform;
  tagCountsByPlatform: HashtagTagCountsByPlatform;
};

type MissingCommentTargets = {
  platforms: Platform[];
  sourceIdsByPlatform: Partial<Record<Platform, string[]>>;
  staleAnchorsCount: number;
  overflowPlatforms: Platform[];
};

type SocialMediaType = "image" | "video";

type SocialStatsItem = {
  label: string;
  value: string;
};

type SocialLeaderboardLightboxEntry = {
  id: string;
  src: string;
  mediaType: SocialMediaType;
  posterSrc: string | null;
  alt: string;
  metadata: PhotoMetadata;
  stats: SocialStatsItem[];
};

interface SeasonSocialAnalyticsSectionProps {
  showId: string;
  showSlug?: string;
  seasonNumber: number;
  seasonId: string;
  showName: string;
  platformTab?: PlatformTab;
  onPlatformTabChange?: (tab: PlatformTab) => void;
  hidePlatformTabs?: boolean;
  externalControlsTarget?: HTMLElement | null;
  analyticsView?: SocialAnalyticsView;
  onTargetsChange?: (targets: SocialTarget[]) => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter/X",
  youtube: "YouTube",
  facebook: "Facebook",
  threads: "Threads",
  reddit: "Reddit",
};
const SOCIAL_SOURCE_COLORS: Record<string, string> = {
  instagram: "#f43f5e",
  tiktok: "#111827",
  twitter: "#0284c7",
  youtube: "#dc2626",
  facebook: "#1d4ed8",
  threads: "#27272a",
  reddit: "#f97316",
};
const SOCIAL_MEDIA_VIDEO_EXT_RE = /\.(mp4|mov|m4v|webm|m3u8|mpd)(\?|$)/i;
const PLATFORM_TABS: { key: PlatformTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter/X" },
  { key: "youtube", label: "YouTube" },
  { key: "facebook", label: "Facebook" },
  { key: "threads", label: "Threads" },
];

const SOCIAL_PLATFORM_QUERY_KEY = "social_platform";
const SOCIAL_DENSITY_QUERY_KEY = "social_density";
const SOCIAL_ALERTS_QUERY_KEY = "social_alerts";
const SOCIAL_TABLE_METRICS_QUERY_KEY = "social_metrics";
const SOCIAL_METRIC_MODE_QUERY_KEY = "social_metric_mode";
type SocialTableMetric = "posts" | "likes" | "comments" | "hashtags" | "mentions" | "tags" | "collaborators";
type SocialMetricMode = "total" | "saved";
type WeekDetailTokenTriplet = {
  hashtags: number;
  mentions: number;
  tags: number;
  collaborators: number;
};
type WeekDetailTokenCounts = {
  total: WeekDetailTokenTriplet;
  byPlatform: Record<Platform, WeekDetailTokenTriplet>;
};
const SOCIAL_TABLE_METRIC_OPTIONS: Array<{ key: SocialTableMetric; label: string }> = [
  { key: "posts", label: "Posts" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "hashtags", label: "Hashtags" },
  { key: "mentions", label: "Mentions" },
  { key: "tags", label: "Tags" },
  { key: "collaborators", label: "Collaborators" },
];
const SOCIAL_TABLE_METRIC_KEYS = SOCIAL_TABLE_METRIC_OPTIONS.map((item) => item.key);
const SOCIAL_TABLE_DEFAULT_METRIC_KEYS = SOCIAL_TABLE_METRIC_KEYS.filter((key) => key !== "collaborators");
const SOCIAL_TABLE_DETAIL_METRICS = new Set<SocialTableMetric>(["hashtags", "mentions", "tags", "collaborators"]);
type SocialDensity = "compact" | "comfortable";
const HASHTAG_REGEX = /(^|\s)#([a-z0-9_]+)/gi;
const MENTION_REGEX = /(^|\s)@([a-z0-9_.]+)/gi;
const HASHTAG_PLATFORMS: Platform[] = ["instagram", "tiktok", "twitter", "youtube", "facebook", "threads"];

const isPlatformTab = (value: string | null | undefined): value is PlatformTab => {
  if (!value) return false;
  return PLATFORM_TABS.some((tab) => tab.key === value);
};

const platformFilterFromTab = (tab: PlatformTab): "all" | Platform =>
  tab === "overview" ? "all" : tab;

const ACTIVE_RUN_STATUSES = new Set<SocialRun["status"]>(["queued", "pending", "retrying", "running", "cancelling"]);
const TERMINAL_RUN_STATUSES = new Set<SocialRun["status"]>(["completed", "failed", "cancelled"]);
const COMMENT_SYNC_MAX_PASSES = 8;
const COMMENT_SYNC_MAX_DURATION_MS = 90 * 60 * 1000;
const SOCIAL_FULL_SYNC_MIRROR_ENABLED =
  process.env.NEXT_PUBLIC_SOCIAL_FULL_SYNC_MIRROR_ENABLED === "true" ||
  process.env.SOCIAL_FULL_SYNC_MIRROR_ENABLED === "true";
const getSyncActionPlatformLabel = (platform: Platform): string =>
  platform === "twitter" ? "X" : (PLATFORM_LABELS[platform] ?? platform);
const getWeekSyncActionLabel = (platformFilter: "all" | Platform): string => {
  const selectedPlatform = platformFilter === "all" ? null : platformFilter;
  const platformLabel = selectedPlatform ? getSyncActionPlatformLabel(selectedPlatform) : null;
  if (SOCIAL_FULL_SYNC_MIRROR_ENABLED) {
    return selectedPlatform
      ? `Full Sync ${platformLabel} + Mirror`
      : "Full Sync All + Mirror";
  }
  return selectedPlatform ? `Sync ${platformLabel}` : "Sync All";
};
const PLATFORM_ORDER: Platform[] = ["instagram", "youtube", "tiktok", "twitter", "facebook", "threads"];

const formatSyncStatusLabel = (value: string | null | undefined): string => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Idle";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/_/g, " ");
};

const getSyncStatusTone = (value: string | null | undefined, stale = false): string => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "failed") return "bg-red-100 text-red-700";
  if (normalized === "running" || normalized === "queued") return "bg-blue-100 text-blue-700";
  if (normalized === "partial" || stale) return "bg-amber-100 text-amber-700";
  if (normalized === "complete") return "bg-emerald-100 text-emerald-700";
  return "bg-zinc-100 text-zinc-600";
};

const getCombinedSyncStatus = (status: SyncStatusPayload): NonNullable<SyncStatusPayload["sync_status"]> => {
  const values = [
    String(status.active_job_summary?.sync_status ?? "").trim().toLowerCase(),
    String(status.sync_status ?? "").trim().toLowerCase(),
    String(status.comment_sync_status?.status ?? "").trim().toLowerCase(),
    String(status.media_mirror_status?.status ?? "").trim().toLowerCase(),
  ];
  if (values.includes("running")) return "running";
  if (values.includes("queued") || values.includes("pending")) return "queued";
  if (values.includes("failed")) return "failed";
  if (values.includes("partial") || values.includes("unknown") || values.includes("not_attempted") || status.stale) {
    return "partial";
  }
  if (values.includes("complete")) return "complete";
  return "idle";
};

const mergeSyncStatusPayloads = (
  commentPlatform: NonNullable<CommentsCoverageResponse["by_platform"]>[string] | undefined,
  mirrorPlatform: NonNullable<MirrorCoverageResponse["by_platform"]>[string] | undefined,
): SyncStatusPayload => {
  const commentStatus = commentPlatform?.comment_sync_status ?? null;
  const mirrorStatus = mirrorPlatform?.media_mirror_status ?? commentPlatform?.media_mirror_status ?? null;
  const activeJobSummary =
    commentPlatform?.active_job_summary ?? mirrorPlatform?.active_job_summary ?? null;
  const status: SyncStatusPayload = {
    comment_sync_status: commentStatus,
    media_mirror_status: mirrorStatus,
    active_job_summary: activeJobSummary,
    last_refresh_at: commentPlatform?.last_refresh_at ?? mirrorPlatform?.last_refresh_at ?? null,
    last_refresh_reason:
      commentStatus?.failure_reason ??
      mirrorStatus?.failure_reason ??
      commentPlatform?.last_refresh_reason ??
      mirrorPlatform?.last_refresh_reason ??
      null,
    stale: Boolean(commentPlatform?.stale || mirrorPlatform?.stale),
    worker_run_id: commentPlatform?.worker_run_id ?? mirrorPlatform?.worker_run_id ?? null,
  };
  status.sync_status = getCombinedSyncStatus(status);
  if (status.sync_status === "queued" || status.sync_status === "running") {
    status.stale = false;
  }
  return status;
};

const ACTIVE_JOB_STAGE_ORDER: Array<NonNullable<NonNullable<SyncStatusPayload["active_job_summary"]>["dominant_stage"]>> = [
  "posts",
  "comments",
  "media_mirror",
  "comment_media_mirror",
];

const formatActiveJobSummary = (status: SyncStatusPayload): string | null => {
  const summary = status.active_job_summary;
  if (!summary?.sync_status) return null;
  const stageLabel = summary.dominant_stage?.replaceAll("_", " ") ?? "sync";
  const jobCount = Number(summary.job_count ?? 0);
  const countLabel = Number.isFinite(jobCount) && jobCount > 0 ? ` · ${formatInteger(jobCount)} jobs` : "";
  const stageStatuses = Object.entries(summary.stage_statuses ?? {})
    .filter((entry): entry is [string, { status?: "queued" | "running"; job_count?: number }] => Boolean(entry[0]))
    .sort(
      ([stageA], [stageB]) =>
        ACTIVE_JOB_STAGE_ORDER.indexOf(stageA as (typeof ACTIVE_JOB_STAGE_ORDER)[number]) -
        ACTIVE_JOB_STAGE_ORDER.indexOf(stageB as (typeof ACTIVE_JOB_STAGE_ORDER)[number]),
    )
    .map(([stage, payload]) => {
      const stageJobCount = Number(payload?.job_count ?? 0);
      const countSuffix =
        Number.isFinite(stageJobCount) && stageJobCount > 0 ? ` ${formatInteger(stageJobCount)}` : "";
      return `${formatSyncStatusLabel(payload?.status)} ${stage.replaceAll("_", " ")}${countSuffix}`;
    });
  const detailLabel = stageStatuses.length > 1 ? ` · ${stageStatuses.join(", ")}` : "";
  return `${formatSyncStatusLabel(summary.sync_status)} ${stageLabel}${countLabel}${detailLabel}`;
};

const formatSharedPipelineStageSummary = (stage: SharedPipelineStageStatus | null | undefined): string => {
  if (!stage) return "Idle";
  const statusLabel = formatSyncStatusLabel(stage.status);
  const jobCount = Number(stage.job_count ?? 0);
  const activeJobs = Number(stage.active_jobs ?? 0);
  if (jobCount > 0 && activeJobs > 0) {
    return `${statusLabel} · ${formatInteger(activeJobs)}/${formatInteger(jobCount)} active`;
  }
  if (jobCount > 0) {
    return `${statusLabel} · ${formatInteger(jobCount)} jobs`;
  }
  return statusLabel;
};

const formatClassificationRuleSummary = (target: SocialTarget): string => {
  const parts: string[] = [];
  if ((target.hashtags ?? []).length > 0) {
    parts.push(
      `hashtags ${(target.hashtags ?? []).map((tag) => (String(tag).startsWith("#") ? String(tag) : `#${String(tag)}`)).join(", ")}`,
    );
  }
  if ((target.keywords ?? []).length > 0) {
    parts.push(`keywords ${(target.keywords ?? []).join(", ")}`);
  }
  return parts.join(" · ") || "No rule signals configured.";
};

export const buildPreviewPlatformStatuses = (
  commentsCoverage: CommentsCoverageResponse | null,
  mirrorCoverage: MirrorCoverageResponse | null,
): Array<{ platform: Platform; status: SyncStatusPayload }> =>
  PLATFORM_ORDER.map((platform) => {
    const commentPlatform = commentsCoverage?.by_platform?.[platform];
    const mirrorPlatform = mirrorCoverage?.by_platform?.[platform];
    const status = mergeSyncStatusPayloads(commentPlatform, mirrorPlatform);
    return { platform, status };
  }).filter(({ status }) => Boolean(status.comment_sync_status || status.media_mirror_status));
const STALE_RUN_THRESHOLD_DEFAULT_MINUTES = 45;
const MAX_COMMENT_ANCHOR_SOURCE_IDS_PER_PLATFORM = 5000;
const INTEGER_FORMATTER = new Intl.NumberFormat("en-US");
const COMPACT_INTEGER_FORMATTER = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatInteger = (value: number | null | undefined): string => INTEGER_FORMATTER.format(Number(value ?? 0));
const formatCompactInteger = (value: number | null | undefined): string =>
  COMPACT_INTEGER_FORMATTER.format(Math.max(0, Number(value ?? 0)));
const SOCIAL_TIME_ZONE = "America/New_York";
const DATE_TOKEN_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseDateToken = (
  value: string,
): { year: number; month: number; day: number } | null => {
  const match = DATE_TOKEN_RE.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};

const getTimeZoneOffsetMs = (timestampMs: number, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestampMs));
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    values[part.type] = Number(part.value);
  }
  const zonedAsUtc = Date.UTC(
    values.year ?? 0,
    (values.month ?? 1) - 1,
    values.day ?? 1,
    values.hour ?? 0,
    values.minute ?? 0,
    values.second ?? 0,
  );
  return zonedAsUtc - timestampMs;
};

const toZonedUtcIso = (
  parts: { year: number; month: number; day: number },
  time: { hour: number; minute: number; second: number; millisecond?: number },
): string => {
  const baseUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    time.hour,
    time.minute,
    time.second,
    time.millisecond ?? 0,
  );
  const firstOffset = getTimeZoneOffsetMs(baseUtc, SOCIAL_TIME_ZONE);
  let correctedUtc = baseUtc - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(correctedUtc, SOCIAL_TIME_ZONE);
  if (secondOffset !== firstOffset) {
    correctedUtc = baseUtc - secondOffset;
  }
  return new Date(correctedUtc).toISOString();
};

const addDays = (
  parts: { year: number; month: number; day: number },
  days: number,
): { year: number; month: number; day: number } => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const DATE_TIME_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: SOCIAL_TIME_ZONE,
};

const DATE_ONLY_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  timeZone: SOCIAL_TIME_ZONE,
};

const TIME_ONLY_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: SOCIAL_TIME_ZONE,
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", DATE_TIME_DISPLAY_OPTIONS);
};

const formatDateTimeFromDate = (value: Date | null | undefined): string => {
  if (!value) return "-";
  if (Number.isNaN(value.getTime())) return "-";
  return value.toLocaleString("en-US", DATE_TIME_DISPLAY_OPTIONS);
};

const formatTime = (value: string | null | undefined): string => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("en-US", TIME_ONLY_DISPLAY_OPTIONS);
};

const formatDateOnly = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", DATE_ONLY_DISPLAY_OPTIONS);
};

const formatDateShort = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    timeZone: SOCIAL_TIME_ZONE,
  });
};

const formatDayScopeLabel = (value: string): string => {
  if (!value) return "Specific Day";
  const parsed = parseDateToken(value);
  if (!parsed) return `Day ${value}`;
  const label = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0)).toLocaleDateString(
    "en-US",
    DATE_ONLY_DISPLAY_OPTIONS,
  );
  return `Day ${label}`;
};

const formatWeekScopeLabel = (week: number | "all" | null): string => {
  if (week === "all" || week === null) return "All Weeks";
  return week === 0 ? "Pre-Season" : `Week ${week}`;
};

const formatPlatformScopeLabel = (platform: "all" | Platform | null): string => {
  if (!platform || platform === "all") return "All Platforms";
  return PLATFORM_LABELS[platform] ?? platform;
};

const normalizeIsoInstant = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
};

const formatStatusLabel = (status: SocialRun["status"]): string => {
  if (!status) return "Unknown";
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
};

const formatRunProgressLabel = (run: SocialRun): string => {
  const summary = run.summary ?? {};
  const totalJobs = Number(summary.total_jobs ?? 0);
  const completedJobs = Number(summary.completed_jobs ?? 0);
  const failedJobs = Number(summary.failed_jobs ?? 0);
  const doneJobs = completedJobs + failedJobs;
  if (totalJobs > 0) {
    return `${formatStatusLabel(run.status)} ${doneJobs}/${totalJobs}`;
  }
  return formatStatusLabel(run.status);
};

const formatDateRangeLabel = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} to ${end}`;
  }
  const startDay = startDate.toLocaleDateString("en-US", { timeZone: SOCIAL_TIME_ZONE });
  const endDay = endDate.toLocaleDateString("en-US", { timeZone: SOCIAL_TIME_ZONE });
  if (startDay === endDay) {
    return `Day ${startDate.toLocaleDateString("en-US", DATE_ONLY_DISPLAY_OPTIONS)}`;
  }
  return `${startDate.toLocaleDateString("en-US", { timeZone: SOCIAL_TIME_ZONE })} to ${endDate.toLocaleDateString(
    "en-US",
    { timeZone: SOCIAL_TIME_ZONE },
  )}`;
};

const buildIsoDayRange = (dayLocal: string): { dateStart: string; dateEnd: string } | null => {
  const parsed = parseDateToken(dayLocal);
  if (!parsed) return null;
  const dateStart = toZonedUtcIso(parsed, { hour: 0, minute: 0, second: 0, millisecond: 0 });
  const nextDay = addDays(parsed, 1);
  const nextDateStart = toZonedUtcIso(nextDay, { hour: 0, minute: 0, second: 0, millisecond: 0 });
  return {
    dateStart,
    dateEnd: new Date(Date.parse(nextDateStart) - 1).toISOString(),
  };
};

type CoverageSummary = {
  postsPct: number | null;
  postsPctLabel: string | null;
  postsUpToDate: boolean;
  commentsPct: number | null;
  commentsPctLabel: string | null;
  commentsUpToDate: boolean;
  progressPctLabel: string | null;
  progressPct: number | null;
  progressUpToDate: boolean;
  upToDate: boolean;
};

const toNonNegative = (value: number | null | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const isCoveragePctUpToDate = (value: number | null): boolean =>
  typeof value === "number" && value >= 98;

const buildCoverageSummary = ({
  postsSaved,
  commentsSaved,
  reportedComments,
  explicitCommentsPct,
}: {
  postsSaved: number;
  commentsSaved: number;
  reportedComments: number;
  explicitCommentsPct?: number | null;
}): CoverageSummary => {
  const safePostsSaved = toNonNegative(postsSaved);
  const safeCommentsSaved = toNonNegative(commentsSaved);
  const safeReportedComments = toNonNegative(reportedComments);
  const postsPctRaw = safePostsSaved > 0 ? 100 : null;
  const expectedComments = Math.max(safeReportedComments, safeCommentsSaved);
  const commentsPctRaw =
    expectedComments > 0
      ? Math.min(100, (safeCommentsSaved * 100) / expectedComments)
      : typeof explicitCommentsPct === "number" && Number.isFinite(explicitCommentsPct) && explicitCommentsPct > 0
        ? Math.min(100, explicitCommentsPct)
        : safeCommentsSaved > 0
          ? 100
          : null;

  const totalExpectedUnits = safePostsSaved + expectedComments;
  const totalSavedUnits = safePostsSaved + safeCommentsSaved;
  const progressPctRaw = totalExpectedUnits > 0 ? Math.min(100, (totalSavedUnits * 100) / totalExpectedUnits) : null;
  const postsUpToDate = isCoveragePctUpToDate(postsPctRaw);
  const commentsUpToDate = isCoveragePctUpToDate(commentsPctRaw);
  const progressUpToDate = isCoveragePctUpToDate(progressPctRaw);
  return {
    postsPct: postsPctRaw,
    postsPctLabel: postsPctRaw == null ? null : `${postsPctRaw.toFixed(1)}%`,
    postsUpToDate,
    commentsPct: commentsPctRaw,
    commentsPctLabel: commentsPctRaw == null ? null : `${commentsPctRaw.toFixed(1)}%`,
    commentsUpToDate,
    progressPctLabel: progressPctRaw == null ? null : `${progressPctRaw.toFixed(1)}%`,
    progressPct: progressPctRaw,
    progressUpToDate,
    upToDate: progressUpToDate,
  };
};

const getPlatformCoverage = (week: WeeklyPlatformRow, platform: Platform): CoverageSummary => {
  const reportedComments = Number(week.reported_comments?.[platform] ?? 0);
  return buildCoverageSummary({
    postsSaved: Number(week.posts?.[platform] ?? 0),
    commentsSaved: Number(week.comments?.[platform] ?? 0),
    reportedComments,
  });
};

const getTotalCoverage = (week: WeeklyPlatformRow): CoverageSummary => {
  const inferredReported = PLATFORM_ORDER.reduce(
    (sum, platform) => sum + Number(week.reported_comments?.[platform] ?? 0),
    0,
  );
  const totalReported = Number(week.total_reported_comments ?? inferredReported);
  return buildCoverageSummary({
    postsSaved: Number(week.total_posts ?? 0),
    commentsSaved: Number(week.total_comments ?? 0),
    reportedComments: totalReported,
    explicitCommentsPct: typeof week.comments_saved_pct === "number" ? week.comments_saved_pct : null,
  });
};

const getReportedCommentsForWeekPost = (platform: Platform, post: WeekDetailPost): number => {
  if (platform === "twitter") {
    return Number(post.replies_count ?? post.comments_count ?? 0);
  }
  return Number(post.comments_count ?? 0);
};

const formatMirrorCoverageLabel = (readyCount: number, scannedCount: number): string => {
  const safeScanned = Math.max(0, Number(scannedCount) || 0);
  const safeReady = Math.max(0, Math.min(safeScanned, Number(readyCount) || 0));
  const pct = safeScanned > 0 ? (safeReady / safeScanned) * 100 : 100;
  return `${safeReady.toLocaleString()}/${safeScanned.toLocaleString()} (${pct.toFixed(1)}%)`;
};

const REQUEST_TIMEOUT_MS = {
  analytics: 22_000,
  runs: 15_000,
  targets: 12_000,
  jobs: 15_000,
  commentsCoverage: 35_000,
  mirrorCoverage: 35_000,
  weekDetail: 35_000,
  workerHealth: 12_000,
} as const;
const DEV_LOW_HEAT_MODE = process.env.NODE_ENV !== "production";
const DEV_VISIBLE_POLL_INTERVAL_MS = 8_000;
const ANALYTICS_POLL_REFRESH_MS = 60_000;
const ANALYTICS_POLL_REFRESH_ACTIVE_MS = 4_000;
const LIVE_POLL_BACKOFF_MS = [3_000, 6_000, 10_000, 15_000] as const;
const INITIAL_SOCIAL_REFRESH_CONCURRENCY = 2;
const WEEK_DETAIL_FETCH_CONCURRENCY = 2;
const WEEK_DETAIL_TARGETS_PAGE_LIMIT = 100;
const WEEK_DETAIL_TARGETS_MAX_PAGES = 20;
const BACKEND_SATURATION_MESSAGE = "Local TRR-Backend is saturated. Showing last successful data while retrying.";

export const POLL_FAILURES_BEFORE_RETRY_BANNER = 2;
export const shouldSetPollingRetry = (consecutiveFailures: number): boolean =>
  consecutiveFailures >= POLL_FAILURES_BEFORE_RETRY_BANNER;

export const buildSocialRequestKey = ({
  seasonId,
  sourceScope,
  platformFilter,
  weekFilter,
  analyticsView,
}: {
  seasonId: string;
  sourceScope: string;
  platformFilter: string;
  weekFilter: number | "all";
  analyticsView?: string;
}): string => {
  const weekKey = weekFilter === "all" ? "all" : String(weekFilter);
  return `${seasonId}:${sourceScope}:${platformFilter}:${weekKey}:${analyticsView ?? "bravo"}`;
};

export const buildRunsRequestKey = ({
  seasonId,
  sourceScope,
}: {
  seasonId: string;
  sourceScope: string;
}): string => `${seasonId}:${sourceScope}`;

const SOCIAL_CACHE_VERSION = 1;
const SOCIAL_CACHE_PREFIX = "trr:season-social-analytics";

type SocialSectionCacheSnapshot = {
  version: number;
  saved_at: string;
  analytics?: AnalyticsResponse | null;
  runs?: SocialRun[];
  targets?: SocialTarget[];
  last_updated?: string | null;
  section_last_success_at?: {
    analytics?: string | null;
    targets?: string | null;
    runs?: string | null;
  };
};

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) return error.name === "AbortError";
  if (!error || typeof error !== "object") return false;
  return (error as { name?: string }).name === "AbortError";
};

const buildCanonicalRoute = (relativeUrl: string): string => {
  try {
    const url = new URL(relativeUrl, "http://localhost");
    const sortedParams = new URLSearchParams(url.search);
    sortedParams.sort();
    const query = sortedParams.toString();
    return `${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return relativeUrl;
  }
};

const parseDateOrNull = (value: unknown): Date | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return null;
  return new Date(ts);
};

const parseTimestampMs = (value: unknown): number | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return null;
  return ts;
};

const normalizeWorkerHealth = (value: unknown): WorkerHealthState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const payload = value as WorkerHealthPayload;
  const queueEnabled = typeof payload.queue_enabled === "boolean" ? payload.queue_enabled : null;
  const healthy = typeof payload.healthy === "boolean" ? payload.healthy : null;
  const healthyWorkers =
    typeof payload.healthy_workers === "number" && Number.isFinite(payload.healthy_workers)
      ? payload.healthy_workers
      : null;
  const reason = typeof payload.reason === "string" && payload.reason.trim() ? payload.reason.trim() : null;
  const checkedAt =
    typeof payload.checked_at === "string" && payload.checked_at.trim()
      ? payload.checked_at
      : typeof (payload as Record<string, unknown>).updated_at === "string" &&
          String((payload as Record<string, unknown>).updated_at).trim()
        ? String((payload as Record<string, unknown>).updated_at)
        : null;
  return {
    queueEnabled,
    healthy,
    healthyWorkers,
    reason,
    checkedAt,
  };
};

const isTransientBackendSectionError = (message: string | null | undefined): boolean => {
  const normalized = String(message ?? "").toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("backend is saturated") ||
    normalized.includes("connection pool exhausted") ||
    normalized.includes("database pool initialization failed") ||
    normalized.includes("timed out") ||
    normalized.includes("could not reach trr-backend") ||
    normalized.includes("headers timeout") ||
    normalized.includes("fetch failed")
  );
};

const isBackendSaturationSectionError = (message: string | null | undefined): boolean => {
  const normalized = String(message ?? "").toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("backend is saturated") ||
    normalized.includes("connection pool exhausted") ||
    normalized.includes("database pool initialization failed")
  );
};

const readProxyErrorText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  const record = value as Record<string, unknown>;
  return [record.message, record.error, record.detail]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join(" ");
};

const settleWithConcurrencyLimit = async <T,>(
  operations: Array<() => Promise<T>>,
  concurrency: number,
): Promise<Array<PromiseSettledResult<T>>> => {
  const results: Array<PromiseSettledResult<T>> = new Array(operations.length);
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (nextIndex < operations.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        results[currentIndex] = {
          status: "fulfilled",
          value: await operations[currentIndex](),
        };
      } catch (error) {
        results[currentIndex] = {
          status: "rejected",
          reason: error,
        };
      }
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, operations.length));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
};

const TRANSIENT_DEV_RESTART_PATTERNS = [
  "failed to fetch",
  "networkerror when attempting to fetch resource",
  "fetch failed",
  "unexpected end of json input",
  "invalid json",
  "load failed",
  "connection closed",
] as const;

const isTransientDevRestartMessage = (message: string | null | undefined): boolean => {
  const normalized = String(message ?? "").toLowerCase();
  if (!normalized) return false;
  return TRANSIENT_DEV_RESTART_PATTERNS.some((pattern) => normalized.includes(pattern));
};

async function parseResponseJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${fallbackMessage}. Response payload unavailable.`);
  }
}

const fetchAdminWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort();
  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort();
    } else {
      upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
    }
  }
  try {
    return await fetchAdminWithAuth(
      input,
      {
        ...init,
        signal: controller.signal,
      },
      { allowDevAdminBypass: true },
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    if (upstreamSignal) {
      upstreamSignal.removeEventListener("abort", abortFromUpstream);
    }
    clearTimeout(timeoutId);
  }
};

export const formatIngestErrorMessage = (payload: IngestProxyErrorPayload): string => {
  const upstreamDetail =
    payload.upstream_detail && typeof payload.upstream_detail === "object"
      ? (payload.upstream_detail as Record<string, unknown>)
      : null;
  const fallbackWorkerCode =
    typeof payload.error === "string" && payload.error.includes("SOCIAL_WORKER_UNAVAILABLE")
      ? "SOCIAL_WORKER_UNAVAILABLE"
      : null;
  const upstreamCode =
    payload.upstream_detail_code ??
    (typeof upstreamDetail?.code === "string" ? upstreamDetail.code : null) ??
    fallbackWorkerCode;
  const upstreamMessage =
    (typeof upstreamDetail?.message === "string" && upstreamDetail.message.trim()
      ? upstreamDetail.message
      : null) ??
    payload.error ??
    payload.detail ??
    "Failed to run social sync";

  if (upstreamCode === "SOCIAL_WORKER_UNAVAILABLE") {
    const workerHealth =
      upstreamDetail?.worker_health && typeof upstreamDetail.worker_health === "object"
        ? (upstreamDetail.worker_health as Record<string, unknown>)
        : null;
  const healthReason =
      typeof workerHealth?.reason === "string" && workerHealth.reason.trim()
        ? ` (${workerHealth.reason})`
        : "";
    return `${upstreamMessage}${healthReason}. Start the remote social executor and retry; inline fallback only works in local/dev backend runtime.`;
  }
  if (upstreamCode === "SOCIAL_REMOTE_WORKER_REQUIRED") {
    return `${upstreamMessage}. This ingest is remote-only for Instagram/TikTok. Start the configured remote executor and retry.`;
  }

  return upstreamMessage;
};

const getMonthDayLabel = (dateLocal: string): string => {
  const parsed = parseDateToken(dateLocal);
  if (!parsed) return "-- --";
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0));
  const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const day = date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
  return `${month} ${day}`;
};

const getHeatmapToneClass = ({
  value,
  maxValue,
  metric,
}: {
  value: number;
  maxValue: number;
  metric: WeeklyMetric;
}): string => {
  if (metric === "completeness") {
    if (value < 0) return "bg-zinc-200 text-zinc-500";
    if (value >= 0.95) return "bg-emerald-700 text-white";
    if (value >= 0.7) return "bg-amber-500 text-white";
    return "bg-red-600 text-white";
  }
  if (value <= 0 || maxValue <= 0) {
    return "bg-zinc-200 text-zinc-500";
  }
  const ratio = value / maxValue;
  if (ratio >= 0.8) return "bg-emerald-700 text-white";
  if (ratio >= 0.6) return "bg-emerald-600 text-white";
  if (ratio >= 0.4) return "bg-emerald-500 text-white";
  if (ratio >= 0.2) return "bg-emerald-400 text-white";
  return "bg-emerald-300 text-emerald-950";
};

const formatFreshnessLabel = (minutes: number | null | undefined): string => {
  if (minutes == null || Number.isNaN(minutes)) return "Unknown";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatPctLabel = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(1)}%`;
};

const formatDurationLabel = (seconds: number | null | undefined): string => {
  if (seconds == null || Number.isNaN(seconds)) return "N/A";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
};

type CastAttitudePrototypeRow = {
  entity: string;
  mentions: number;
  engagement: number;
  positive: number;
  neutral: number;
  negative: number;
  netSentiment: number;
};

type ViewerAttitudePlatformRow = {
  platform: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
};

const CAST_ENTITY_TOKEN_RE = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g;
const CAST_ENTITY_STOP_WORDS = new Set([
  "Andy Cohen",
  "Bravo",
  "Real Housewives",
  "Salt Lake City",
  "The Real",
  "Watch What Happens",
  "Daily Discussion",
  "Discussion Thread",
  "Episode Discussion",
  "Live Discussion",
  "Weekly Discussion",
  "This Week",
  "New York",
  "Orange County",
  "Beverly Hills",
  "Miami",
  "Atlanta",
  "Potomac",
]);

const extractCastEntityCandidates = (text: string): string[] => {
  if (!text) return [];
  const tokens = text.match(CAST_ENTITY_TOKEN_RE) ?? [];
  const deduped = new Set<string>();
  for (const token of tokens) {
    const normalized = token.trim().replace(/\s+/g, " ");
    if (!normalized || normalized.length < 3) continue;
    if (CAST_ENTITY_STOP_WORDS.has(normalized)) continue;
    deduped.add(normalized);
  }
  return [...deduped];
};

const getWeeklyFlagToneClass = (severity: "info" | "warn"): string => {
  if (severity === "warn") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-zinc-300 bg-zinc-100 text-zinc-700";
};

const getWeekEpisodeLabel = (
  weekRow: NonNullable<AnalyticsResponse["weekly_daily_activity"]>[number],
  seasonNumber: number,
): string | null => {
  if (weekRow.week_type === "bye") return "BYE WEEK";
  if (weekRow.week_type === "episode" && weekRow.episode_number === 1) return "PREMIERE WEEK";
  if (typeof weekRow.episode_number === "number" && Number.isFinite(weekRow.episode_number)) {
    return `S${seasonNumber} E${weekRow.episode_number}`;
  }
  return null;
};

const getHeatmapWeekSectionLabel = (
  weekRow: NonNullable<AnalyticsResponse["weekly_daily_activity"]>[number],
): string => {
  if (weekRow.week_type === "preseason" || weekRow.week_index === 0) return "Pre-Season";
  if (weekRow.week_type === "bye") return `Week ${weekRow.week_index}`;
  if (typeof weekRow.label === "string" && weekRow.label.trim().length > 0) return weekRow.label.trim();
  return `Week ${weekRow.week_index}`;
};

const getWeeklyTableEpisodePrimaryLabel = (
  weekRow: WeeklyPlatformRow,
  seasonNumber: number,
): string => {
  if (weekRow.week_type === "preseason") return "Episode 0";
  if (weekRow.week_type === "postseason") return "Post-Season";
  if (weekRow.week_type === "bye") return "Bye Week";
  if (weekRow.week_type === "episode" && typeof weekRow.episode_number === "number" && Number.isFinite(weekRow.episode_number)) {
    return `S${seasonNumber}.E${weekRow.episode_number}`;
  }
  return `Episode ${weekRow.week_index}`;
};

const getWeeklyTableEpisodeSecondaryLabel = (weekRow: WeeklyPlatformRow): string => {
  if (weekRow.week_type === "preseason") return "Pre-Season";
  if (weekRow.week_type === "bye") return weekRow.label || `Week ${weekRow.week_index}`;
  return `Week ${weekRow.week_index}`;
};

const formatMetricCountLabel = (
  value: number | null | undefined,
  singularLabel: string,
  pluralLabel?: string,
): string => {
  const safeValue = Number(value ?? 0);
  const token = safeValue === 1 ? singularLabel : (pluralLabel ?? `${singularLabel}s`);
  return `${formatInteger(safeValue)} ${token}`;
};

const getWeeklyDayCompleteness = (
  day: NonNullable<AnalyticsResponse["weekly_daily_activity"]>[number]["days"][number],
  platform: Platform | null,
): number => {
  const postsSaved = platform ? Number(day.posts?.[platform] ?? 0) : Number(day.total_posts ?? 0);
  const commentsSaved = platform ? Number(day.comments?.[platform] ?? 0) : Number(day.total_comments ?? 0);
  const reportedComments = platform
    ? Number(day.reported_comments?.[platform] ?? 0)
    : Number(day.total_reported_comments ?? 0);
  const denominator = postsSaved + reportedComments;
  if (denominator <= 0) return -1;
  return Math.min(1, Math.max(0, (postsSaved + commentsSaved) / denominator));
};

const getWeeklyDayValue = (
  day: NonNullable<AnalyticsResponse["weekly_daily_activity"]>[number]["days"][number],
  metric: WeeklyMetric,
  platform: Platform | null,
): number => {
  if (metric === "posts") {
    return platform ? Number(day.posts?.[platform] ?? 0) : Number(day.total_posts ?? 0);
  }
  if (metric === "comments") {
    return platform ? Number(day.comments?.[platform] ?? 0) : Number(day.total_comments ?? 0);
  }
  return getWeeklyDayCompleteness(day, platform);
};

const normalizeHashtag = (value: string | null | undefined): string | null => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^#+/, "")
    .toUpperCase();
  if (!normalized) return null;
  if (!/^[A-Z0-9_]+$/.test(normalized)) return null;
  return normalized;
};

const extractHashtags = (text: string | null | undefined): string[] => {
  const source = String(text ?? "");
  const tags: string[] = [];
  HASHTAG_REGEX.lastIndex = 0;
  let match = HASHTAG_REGEX.exec(source);
  while (match) {
    const normalized = normalizeHashtag(match[2]);
    if (normalized) tags.push(normalized);
    match = HASHTAG_REGEX.exec(source);
  }
  return tags;
};

const normalizeMention = (value: string | null | undefined): string | null => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z0-9_.]+$/.test(normalized)) return null;
  return `@${normalized}`;
};

const extractMentions = (text: string | null | undefined): string[] => {
  const source = String(text ?? "");
  const mentions: string[] = [];
  MENTION_REGEX.lastIndex = 0;
  let match = MENTION_REGEX.exec(source);
  while (match) {
    const normalized = normalizeMention(match[2]);
    if (normalized) mentions.push(normalized);
    match = MENTION_REGEX.exec(source);
  }
  return mentions;
};

const normalizeSocialTableMetrics = (
  value: string | null | undefined,
): SocialTableMetric[] => {
  if (!value) return SOCIAL_TABLE_DEFAULT_METRIC_KEYS;
  if (value.trim().toLowerCase() === "none") return [];
  const provided = new Set(
    String(value)
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item): item is SocialTableMetric => SOCIAL_TABLE_METRIC_KEYS.includes(item as SocialTableMetric)),
  );
  const ordered = SOCIAL_TABLE_METRIC_KEYS.filter((key) => provided.has(key));
  return ordered.length > 0 ? ordered : SOCIAL_TABLE_DEFAULT_METRIC_KEYS;
};

const serializeSocialTableMetrics = (metrics: SocialTableMetric[]): string | null => {
  const selected = new Set(metrics);
  const ordered = SOCIAL_TABLE_METRIC_KEYS.filter((key) => selected.has(key));
  if (ordered.length === 0) {
    return "none";
  }
  const isDefaultSelection =
    ordered.length === SOCIAL_TABLE_DEFAULT_METRIC_KEYS.length &&
    ordered.every((metric, index) => metric === SOCIAL_TABLE_DEFAULT_METRIC_KEYS[index]);
  if (isDefaultSelection) {
    return null;
  }
  return ordered.join(",");
};

const normalizeSocialMetricMode = (value: string | null | undefined): SocialMetricMode =>
  String(value ?? "").trim().toLowerCase() === "saved" ? "saved" : "total";

const createEmptyWeekDetailTokenTriplet = (): WeekDetailTokenTriplet => ({
  hashtags: 0,
  mentions: 0,
  tags: 0,
  collaborators: 0,
});

const createEmptyHashtagUsageByPlatform = (): HashtagUsageByPlatform => ({
  instagram: 0,
  youtube: 0,
  tiktok: 0,
  twitter: 0,
  facebook: 0,
  threads: 0,
});

const createEmptyHashtagTagCountsByPlatform = (): HashtagTagCountsByPlatform => ({
  instagram: {},
  youtube: {},
  tiktok: {},
  twitter: {},
  facebook: {},
  threads: {},
});

const createEmptyWeekDetailTokenCounts = (): WeekDetailTokenCounts => ({
  total: createEmptyWeekDetailTokenTriplet(),
  byPlatform: {
    instagram: createEmptyWeekDetailTokenTriplet(),
    youtube: createEmptyWeekDetailTokenTriplet(),
    tiktok: createEmptyWeekDetailTokenTriplet(),
    twitter: createEmptyWeekDetailTokenTriplet(),
    facebook: createEmptyWeekDetailTokenTriplet(),
    threads: createEmptyWeekDetailTokenTriplet(),
  },
});

const deriveWeekDetailTokenCounts = (detail: WeekDetailResponse): WeekDetailTokenCounts => {
  const counts = createEmptyWeekDetailTokenCounts();
  const hashtags = new Set<string>();
  const mentions = new Set<string>();
  const tags = new Set<string>();
  const collabs = new Set<string>();
  for (const platform of PLATFORM_ORDER) {
    const platformHashtags = new Set<string>();
    const platformMentions = new Set<string>();
    const platformTags = new Set<string>();
    const platformCollabs = new Set<string>();
    const posts = detail.platforms?.[platform]?.posts ?? [];
    for (const post of posts) {
      // Always merge stored hashtags with caption-derived ones
      const storedHashtags = Array.isArray(post.hashtags) ? post.hashtags : [];
      const captionHashtags = extractHashtags(post.text);
      for (const hashtag of [...storedHashtags, ...captionHashtags]) {
        const normalized = normalizeHashtag(hashtag);
        if (normalized) {
          hashtags.add(normalized);
          platformHashtags.add(normalized);
        }
      }

      // Always merge stored mentions with caption-derived ones
      const storedMentions = Array.isArray(post.mentions) ? post.mentions : [];
      const captionMentions = extractMentions(post.text);
      for (const mention of [...storedMentions, ...captionMentions]) {
        const normalized = normalizeMention(mention);
        if (normalized) {
          mentions.add(normalized);
          platformMentions.add(normalized);
        }
      }

      for (const tagged of post.profile_tags ?? []) {
        const normalized = normalizeMention(tagged);
        if (normalized) {
          tags.add(normalized);
          platformTags.add(normalized);
        }
      }
      for (const collaborator of post.collaborators ?? []) {
        const normalized = normalizeMention(collaborator);
        if (normalized) {
          collabs.add(normalized);
          platformCollabs.add(normalized);
        }
      }
    }
    counts.byPlatform[platform] = {
      hashtags: platformHashtags.size,
      mentions: platformMentions.size,
      tags: platformTags.size,
      collaborators: platformCollabs.size,
    };
  }
  counts.total = {
    hashtags: hashtags.size,
    mentions: mentions.size,
    tags: tags.size,
    collaborators: collabs.size,
  };
  return counts;
};

const createEmptyWeekDetailHashtagUsage = (): WeekDetailHashtagUsage => ({
  totalTokens: 0,
  uniqueTokens: 0,
  tagCounts: {},
  byPlatform: createEmptyHashtagUsageByPlatform(),
  tagCountsByPlatform: createEmptyHashtagTagCountsByPlatform(),
});

const deriveWeekDetailHashtagUsage = (detail: WeekDetailResponse): WeekDetailHashtagUsage => {
  const usage = createEmptyWeekDetailHashtagUsage();

  for (const platform of PLATFORM_ORDER) {
    const posts = detail.platforms?.[platform]?.posts ?? [];
    for (const post of posts) {
      const postHashtags = extractHashtags(post.text);
      for (const hashtag of postHashtags) {
        const normalized = normalizeHashtag(hashtag);
        if (!normalized) continue;
        usage.totalTokens += 1;
        usage.byPlatform[platform] += 1;
        usage.tagCounts[normalized] = (usage.tagCounts[normalized] ?? 0) + 1;
        usage.tagCountsByPlatform[platform][normalized] = (usage.tagCountsByPlatform[platform][normalized] ?? 0) + 1;
      }
    }
  }

  usage.uniqueTokens = Object.keys(usage.tagCounts).length;
  return usage;
};

const getJobStageLabel = (job: SocialJob): string =>
  (typeof job.config?.stage === "string" ? job.config.stage : undefined) ??
  (typeof job.metadata?.stage === "string" ? job.metadata.stage : undefined) ??
  job.job_type ??
  "posts";

const statusToLogVerb = (status: SocialJob["status"]): string => {
  if (status === "queued" || status === "pending") return "queued";
  if (status === "retrying") return "retrying";
  if (status === "running") return "running";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  return "cancelled";
};

const getJobStageCounters = (job: SocialJob): { posts: number; comments: number } | null => {
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

const getJobPersistCounters = (job: SocialJob): { posts_upserted: number; comments_upserted: number } | null => {
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

const getJobActivity = (job: SocialJob): Record<string, unknown> | null => {
  const activity = (job.metadata as Record<string, unknown> | undefined)?.activity as
    | Record<string, unknown>
    | undefined;
  if (!activity || typeof activity !== "object") return null;
  return activity;
};

const getJobRetrievalMeta = (job: SocialJob): Record<string, unknown> | null => {
  const retrievalMeta = (job.metadata as Record<string, unknown> | undefined)?.retrieval_meta as
    | Record<string, unknown>
    | undefined;
  if (!retrievalMeta || typeof retrievalMeta !== "object") return null;
  return retrievalMeta;
};

const formatJobActivitySummary = (activity: Record<string, unknown> | null): string => {
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

const STAGE_LABELS_PLAIN: Record<string, string> = {
  posts: "Finding Posts",
  comments: "Collecting Comments",
  media_mirror: "Uploading Media",
  mirror: "Uploading Media",
  comment_media_mirror: "Uploading Comment Media",
};

const JOB_STATUS_PLAIN: Record<string, string> = {
  running: "In progress",
  completed: "Done",
  failed: "Failed",
  queued: "Waiting",
  pending: "Waiting",
  retrying: "Retrying",
  cancelled: "Cancelled",
};

const formatCountersPlain = (posts: number, comments: number): string => {
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

const isVideoLikeThumbnailUrl = (url: string): boolean => {
  const normalized = url.toLowerCase();
  if (SOCIAL_MEDIA_VIDEO_EXT_RE.test(normalized)) return true;
  try {
    return new URL(normalized).hostname.toLowerCase().includes("video.twimg.com");
  } catch {
    return false;
  }
};

const detectSocialMediaType = (url: string): SocialMediaType =>
  isVideoLikeThumbnailUrl(url) ? "video" : "image";

const getCanonicalLeaderboardThumbnailUrl = (item: {
  hosted_thumbnail_url?: string | null;
  thumbnail_url?: string | null;
  source_thumbnail_url?: string | null;
}) =>
  canonicalizeHostedMediaUrl(item.hosted_thumbnail_url) ??
  canonicalizeHostedMediaUrl(item.thumbnail_url) ??
  canonicalizeHostedMediaUrl(item.source_thumbnail_url) ??
  null;

const buildLeaderboardMediaMetadata = (input: {
  item: {
    platform: string;
    source_id: string;
    text?: string;
    url: string;
    timestamp: string;
    hosted_thumbnail_url?: string | null;
    source_thumbnail_url?: string | null;
    thumbnail_url?: string | null;
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

function SocialStatsPanel({ stats }: { stats: SocialStatsItem[] }) {
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

export default function SeasonSocialAnalyticsSection({
  showId,
  showSlug,
  seasonNumber,
  seasonId,
  showName,
  platformTab: controlledPlatformTab,
  onPlatformTabChange,
  hidePlatformTabs = false,
  externalControlsTarget = null,
  analyticsView = "bravo",
  onTargetsChange,
}: SeasonSocialAnalyticsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope: Scope = "bravo";
  const [uncontrolledPlatformTab, setUncontrolledPlatformTab] = useState<PlatformTab>("overview");
  const [socialDensity, setSocialDensity] = useState<SocialDensity>("comfortable");
  const [socialAlertsEnabled, setSocialAlertsEnabled] = useState(true);
  const isPlatformTabControlled = typeof controlledPlatformTab !== "undefined";
  const tabFromQuery = useMemo<PlatformTab>(() => {
    const value = searchParams.get(SOCIAL_PLATFORM_QUERY_KEY);
    return isPlatformTab(value) ? value : "overview";
  }, [searchParams]);
  const densityFromQuery = useMemo<SocialDensity>(() => {
    const value = searchParams.get(SOCIAL_DENSITY_QUERY_KEY);
    return value === "compact" ? "compact" : "comfortable";
  }, [searchParams]);
  const alertsFromQuery = useMemo<boolean>(() => {
    const value = searchParams.get(SOCIAL_ALERTS_QUERY_KEY);
    return value !== "off";
  }, [searchParams]);
  const selectedTableMetrics = useMemo<SocialTableMetric[]>(
    () => normalizeSocialTableMetrics(searchParams.get(SOCIAL_TABLE_METRICS_QUERY_KEY)),
    [searchParams],
  );
  const socialMetricMode = useMemo<SocialMetricMode>(
    () => normalizeSocialMetricMode(searchParams.get(SOCIAL_METRIC_MODE_QUERY_KEY)),
    [searchParams],
  );
  const socialMetricModeQueryValue = socialMetricMode === "total" ? null : socialMetricMode;
  const selectedTableMetricSet = useMemo(() => new Set(selectedTableMetrics), [selectedTableMetrics]);
  const socialTableMetricsQueryValue = useMemo(
    () => serializeSocialTableMetrics(selectedTableMetrics),
    [selectedTableMetrics],
  );
  const needsWeekDetailTokenMetrics = useMemo(
    () => selectedTableMetrics.some((metric) => SOCIAL_TABLE_DETAIL_METRICS.has(metric)),
    [selectedTableMetrics],
  );
  const needsWeekDetailHashtagAnalytics = analyticsView === "hashtags";
  const platformTab = controlledPlatformTab ?? uncontrolledPlatformTab;
  const platformFilter = useMemo(() => platformFilterFromTab(platformTab), [platformTab]);
  const [weekFilter] = useState<number | "all">("all");
  const [weeklyRunWeek, setWeeklyRunWeek] = useState<number | null>(null);
  const [weeklyRunPlatform, setWeeklyRunPlatform] = useState<"all" | Platform>("all");
  const [dayFilter, setDayFilter] = useState<string>("");
  const [dailyRunPlatform, setDailyRunPlatform] = useState<"all" | Platform>("all");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [targets, setTargets] = useState<SocialTarget[]>([]);
  const [linkedAccountSummaries, setLinkedAccountSummaries] = useState<Record<string, LinkedAccountProfileSummary>>({});
  const [runs, setRuns] = useState<SocialRun[]>([]);
  const [runSummaries, setRunSummaries] = useState<SocialRunSummary[]>([]);
  const [sharedStatus, setSharedStatus] = useState<SharedSeasonStatus | null>(null);
  const [runSummariesLoading, setRunSummariesLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<SocialJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<{
    analytics: string | null;
    targets: string | null;
    runs: string | null;
    jobs: string | null;
  }>({
    analytics: null,
    targets: null,
    runs: null,
    jobs: null,
  });
  const [runSummaryError, setRunSummaryError] = useState<string | null>(null);
  const [workerHealth, setWorkerHealth] = useState<WorkerHealthState | null>(null);
  const [workerHealthError, setWorkerHealthError] = useState<string | null>(null);
  const [sharedStatusError, setSharedStatusError] = useState<string | null>(null);
  const [staleThresholdMinutes] = useState<number>(STALE_RUN_THRESHOLD_DEFAULT_MINUTES);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);
  const [syncCommentsCoveragePreview, setSyncCommentsCoveragePreview] = useState<CommentsCoverageResponse | null>(null);
  const [syncMirrorCoveragePreview, setSyncMirrorCoveragePreview] = useState<MirrorCoverageResponse | null>(null);
  const [runningIngest, setRunningIngest] = useState(false);
  const [syncDetailsExpanded, setSyncDetailsExpanded] = useState(false);
  const [cancellingRun, setCancellingRun] = useState(false);
  const [syncStrategy, setSyncStrategy] = useState<SyncStrategy>("incremental");
  const [weeklyMetric, setWeeklyMetric] = useState<WeeklyMetric>("posts");
  const [benchmarkCompareMode, setBenchmarkCompareMode] = useState<BenchmarkCompareMode>("previous");
  const [weekDetailTokenCountsByWeek, setWeekDetailTokenCountsByWeek] = useState<
    Record<number, WeekDetailTokenCounts>
  >({});
  const [weekDetailHashtagUsageByWeek, setWeekDetailHashtagUsageByWeek] = useState<
    Record<number, WeekDetailHashtagUsage>
  >({});
  const [weekDetailTokenCountsLoadingWeeks, setWeekDetailTokenCountsLoadingWeeks] = useState<Set<number>>(
    new Set(),
  );
  const [leaderboardLightbox, setLeaderboardLightbox] = useState<{
    entries: SocialLeaderboardLightboxEntry[];
    index: number;
  } | null>(null);
  const [ingestingWeek, setIngestingWeek] = useState<number | null>(null);
  const [ingestingDay, setIngestingDay] = useState<string | null>(null);
  const [activeRunRequest, setActiveRunRequest] = useState<{
    week: number | null;
    day: string | null;
    platform: "all" | Platform;
  } | null>(null);
  const [activeSyncSessionId, setActiveSyncSessionId] = useState<string | null>(null);
  const [activeSyncSession, setActiveSyncSession] = useState<SocialSyncSessionProgressSnapshot | null>(null);
  const [activeSyncSessionRetryKind, setActiveSyncSessionRetryKind] = useState<string | null>(null);
  const [activeSyncSessionStreamConnected, setActiveSyncSessionStreamConnected] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [ingestStartedAt, setIngestStartedAt] = useState<Date | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [ingestExportOpen, setIngestExportOpen] = useState(false);
  const [manualSourcesOpen, setManualSourcesOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [expandedJobErrors, setExpandedJobErrors] = useState<Set<string>>(new Set());
  const [elapsedTick, setElapsedTick] = useState(0);
  const [pollingStatus, setPollingStatus] = useState<"idle" | "retrying" | "recovered">("idle");
  const [isDocumentVisible, setIsDocumentVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState === "visible";
  });
  const [sectionLastSuccessAt, setSectionLastSuccessAt] = useState<{
    analytics: Date | null;
    targets: Date | null;
    runs: Date | null;
  }>({
    analytics: null,
    targets: null,
    runs: null,
  });
  const pollGenerationRef = useRef(0);
  const pollFailureCountRef = useRef(0);
  const autoSyncGenerationRef = useRef(0);
  const autoSyncSessionRef = useRef<{
    week: number | null;
    day: string | null;
    platform: "all" | Platform;
    ingestMode: IngestMode;
    rowMissingOnly: boolean;
    dateStart?: string;
    dateEnd?: string;
    pass: number;
    maxPasses: number;
    maxDurationMs: number;
    startedAtMs: number;
    enabled: boolean;
  } | null>(null);
  const lastAnalyticsPollAtRef = useRef(0);
  const runSeasonIngestButtonRef = useRef<HTMLButtonElement | null>(null);
  const ingestExportTriggerRef = useRef<HTMLButtonElement | null>(null);
  const ingestExportPopoverRef = useRef<HTMLDivElement | null>(null);
  const weekDetailTokenRequestsRef = useRef<Set<string>>(new Set());
  const weekDetailAbortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const weekDetailTokenCountsByWeekRef = useRef<Record<number, WeekDetailTokenCounts>>({});
  const weekDetailTokenCountsLoadingWeeksRef = useRef<Set<number>>(new Set());
  const episodeWeekRedirectRef = useRef<string | null>(null);
  const componentMountedRef = useRef(true);
  const activeAnalyticsViewRef = useRef<SocialAnalyticsView>(analyticsView);
  const refreshGenerationRef = useRef(0);
  const inFlightRef = useRef<{
    analyticsByKey: Map<string, Promise<AnalyticsResponse>>;
    runsByKey: Map<string, Promise<SocialRun[]>>;
    targetsByKey: Map<string, Promise<SocialTarget[]>>;
    jobsByKey: Map<string, Promise<SocialJob[]>>;
    workerHealthByKey: Map<string, Promise<WorkerHealthState | null>>;
    refreshAllByView: Map<SocialAnalyticsView, Promise<void>>;
  }>({
    analyticsByKey: new Map(),
    runsByKey: new Map(),
    targetsByKey: new Map(),
    jobsByKey: new Map(),
    workerHealthByKey: new Map(),
    refreshAllByView: new Map(),
  });
  const activeSyncSessionLastRefreshAtRef = useRef(0);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => setIsDocumentVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const showRouteSlug = (showSlug || showId).trim();
  const seasonEpisodeNumberFromPath = useMemo(
    () => parseSeasonEpisodeNumberFromPath(pathname),
    [pathname],
  );
  const seasonSocialPathSegment = useMemo(
    () => parseSeasonSocialPathSegment(pathname),
    [pathname],
  );
  const cacheKey = useMemo(() => {
    const weekKey = weekFilter === "all" ? "all" : String(weekFilter);
    return `${SOCIAL_CACHE_PREFIX}:v${SOCIAL_CACHE_VERSION}:${showId}:${seasonNumber}:${seasonId}:${scope}:${platformFilter}:${weekKey}`;
  }, [platformFilter, scope, seasonId, seasonNumber, showId, weekFilter]);

  const getAuthHeaders = useCallback(
    async () => getClientAuthHeaders({ allowDevAdminBypass: true }),
    [],
  );
  const normalizeLinkedAccountHandle = useCallback((value: string | null | undefined): string => {
    return String(value || "").trim().replace(/^@+/, "").toLowerCase();
  }, []);

  const queryString = useMemo(() => {
    const search = new URLSearchParams();
    search.set("season_id", seasonId);
    search.set("source_scope", scope);
    search.set("timezone", SOCIAL_TIME_ZONE);
    if (platformFilter !== "all") search.set("platforms", platformFilter);
    if (weekFilter !== "all") search.set("week", String(weekFilter));
    return search.toString();
  }, [platformFilter, scope, seasonId, weekFilter]);
  const analyticsRequestKey = useMemo(
    () =>
      buildSocialRequestKey({
        seasonId,
        sourceScope: scope,
        platformFilter,
        weekFilter,
        analyticsView,
      }),
    [analyticsView, platformFilter, scope, seasonId, weekFilter],
  );
  const runsRequestKey = useMemo(
    () =>
      buildRunsRequestKey({
        seasonId,
        sourceScope: scope,
      }),
    [scope, seasonId],
  );

  useLayoutEffect(() => {
    const viewActuallyChanged = activeAnalyticsViewRef.current !== analyticsView;
    activeAnalyticsViewRef.current = analyticsView;
    if (viewActuallyChanged) {
      refreshGenerationRef.current += 1;
      inFlightRef.current.refreshAllByView.clear();
      inFlightRef.current.analyticsByKey.clear();
      inFlightRef.current.runsByKey.clear();
      inFlightRef.current.targetsByKey.clear();
      inFlightRef.current.jobsByKey.clear();
    }
    if (analyticsView !== "reddit") {
      return;
    }
    setLoading(false);
    setError(null);
    setSectionErrors({
      analytics: null,
      targets: null,
      runs: null,
      jobs: null,
    });
    setWorkerHealth(null);
    setWorkerHealthError(null);
    setSharedStatus(null);
    setSharedStatusError(null);
    setRunSummaryError(null);
  }, [analyticsView]);

  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!ingestExportOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (ingestExportPopoverRef.current?.contains(target)) return;
      if (ingestExportTriggerRef.current?.contains(target)) return;
      setIngestExportOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIngestExportOpen(false);
        ingestExportTriggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ingestExportOpen]);

  useEffect(() => {
    weekDetailTokenCountsByWeekRef.current = weekDetailTokenCountsByWeek;
  }, [weekDetailTokenCountsByWeek]);

  useEffect(() => {
    weekDetailTokenCountsLoadingWeeksRef.current = weekDetailTokenCountsLoadingWeeks;
  }, [weekDetailTokenCountsLoadingWeeks]);

  const isActiveView = useCallback(
    (expectedView: SocialAnalyticsView) =>
      componentMountedRef.current && activeAnalyticsViewRef.current === expectedView,
    [],
  );

  const isCurrentRefreshRequest = useCallback(
    (requestView: SocialAnalyticsView, requestId: number) =>
      componentMountedRef.current &&
      activeAnalyticsViewRef.current === requestView &&
      refreshGenerationRef.current === requestId,
    [],
  );

  const readErrorMessage = useCallback(async (response: Response, fallback: string): Promise<string> => {
    const data = (await response.json().catch(() => ({}))) as IngestProxyErrorPayload;
    const upstreamDetailText = readProxyErrorText(data.upstream_detail);
    if (
      data.code === "BACKEND_SATURATED" ||
      isBackendSaturationSectionError(data.error) ||
      isBackendSaturationSectionError(data.detail) ||
      isBackendSaturationSectionError(upstreamDetailText)
    ) {
      return BACKEND_SATURATION_MESSAGE;
    }
    return data.error ?? data.detail ?? fallback;
  }, []);

  const setPlatformTabAndUrl = useCallback(
    (nextTab: PlatformTab) => {
      if (isPlatformTabControlled) {
        onPlatformTabChange?.(nextTab);
        return;
      }

      setUncontrolledPlatformTab(nextTab);
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      if (nextTab === "overview") {
        nextSearchParams.delete(SOCIAL_PLATFORM_QUERY_KEY);
      } else {
        nextSearchParams.set(SOCIAL_PLATFORM_QUERY_KEY, nextTab);
      }
      const queryString = nextSearchParams.toString();
      const nextHref = `${pathname}${queryString ? `?${queryString}` : ""}`;
      router.replace(nextHref as Route, { scroll: false });
    },
    [isPlatformTabControlled, onPlatformTabChange, pathname, router, searchParams],
  );

  const setSocialPreferenceInUrl = useCallback(
    (key: string, value: string | null) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      if (value == null || value.length === 0) {
        nextSearchParams.delete(key);
      } else {
        nextSearchParams.set(key, value);
      }
      const nextQueryString = nextSearchParams.toString();
      const nextHref = `${pathname}${nextQueryString ? `?${nextQueryString}` : ""}`;
      router.replace(nextHref as Route, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const toggleSocialTableMetric = useCallback(
    (metric: SocialTableMetric) => {
      const currentlySelected = selectedTableMetricSet.has(metric);
      const nextMetrics = currentlySelected
        ? selectedTableMetrics.filter((item) => item !== metric)
        : [...selectedTableMetrics, metric];
      const serialized = serializeSocialTableMetrics(nextMetrics);
      setSocialPreferenceInUrl(SOCIAL_TABLE_METRICS_QUERY_KEY, serialized);
    },
    [selectedTableMetricSet, selectedTableMetrics, setSocialPreferenceInUrl],
  );

  const toggleAllSocialTableMetrics = useCallback(() => {
    if (selectedTableMetrics.length === SOCIAL_TABLE_METRIC_KEYS.length) {
      setSocialPreferenceInUrl(SOCIAL_TABLE_METRICS_QUERY_KEY, "none");
      return;
    }
    setSocialPreferenceInUrl(SOCIAL_TABLE_METRICS_QUERY_KEY, SOCIAL_TABLE_METRIC_KEYS.join(","));
  }, [selectedTableMetrics.length, setSocialPreferenceInUrl]);

  const setSocialMetricMode = useCallback(
    (nextMode: SocialMetricMode) => {
      setSocialPreferenceInUrl(SOCIAL_METRIC_MODE_QUERY_KEY, nextMode === "total" ? null : nextMode);
    },
    [setSocialPreferenceInUrl],
  );

  const buildWeekDetailHref = useCallback(
    (weekIndex: number, dayLocal?: string) => {
      const weekLinkQuery = new URLSearchParams();
      if (analyticsView !== "bravo") {
        weekLinkQuery.set("social_view", analyticsView);
      }
      if (socialDensity !== "comfortable") {
        weekLinkQuery.set(SOCIAL_DENSITY_QUERY_KEY, socialDensity);
      }
      if (!socialAlertsEnabled) {
        weekLinkQuery.set(SOCIAL_ALERTS_QUERY_KEY, "off");
      }
      if (socialTableMetricsQueryValue) {
        weekLinkQuery.set(SOCIAL_TABLE_METRICS_QUERY_KEY, socialTableMetricsQueryValue);
      }
      if (socialMetricModeQueryValue) {
        weekLinkQuery.set(SOCIAL_METRIC_MODE_QUERY_KEY, socialMetricModeQueryValue);
      }
      if (dayLocal) {
        weekLinkQuery.set("day", dayLocal);
      }
      return buildSeasonSocialWeekUrl({
        showSlug: showRouteSlug,
        seasonNumber,
        weekIndex,
        platform: platformTab !== "overview" ? platformTab : undefined,
        query: weekLinkQuery,
      });
    },
    [
      analyticsView,
      platformTab,
      seasonNumber,
      showRouteSlug,
      socialAlertsEnabled,
      socialDensity,
      socialMetricModeQueryValue,
      socialTableMetricsQueryValue,
    ],
  );

  useEffect(() => {
    if (isPlatformTabControlled) return;
    setUncontrolledPlatformTab(tabFromQuery);
  }, [isPlatformTabControlled, tabFromQuery]);

  useEffect(() => {
    setSocialDensity(densityFromQuery);
  }, [densityFromQuery]);

  useEffect(() => {
    setSocialAlertsEnabled(alertsFromQuery);
  }, [alertsFromQuery]);

  useEffect(() => {
    if (!seasonEpisodeNumberFromPath) return;
    if (!seasonSocialPathSegment) return;
    if (!analytics) return;
    const weeklyCandidates = [
      ...(analytics.weekly ?? []),
      ...(analytics.weekly_platform_posts ?? []),
    ];
    const matchedWeek = weeklyCandidates.find((row) => {
      const episodeNumber = Number(row.episode_number ?? NaN);
      return Number.isFinite(episodeNumber) && episodeNumber === seasonEpisodeNumberFromPath;
    });
    if (!matchedWeek || !Number.isFinite(matchedWeek.week_index)) return;

    const platformFromPath =
      seasonSocialPathSegment === "instagram" ||
      seasonSocialPathSegment === "tiktok" ||
      seasonSocialPathSegment === "twitter" ||
      seasonSocialPathSegment === "youtube" ||
      seasonSocialPathSegment === "facebook" ||
      seasonSocialPathSegment === "threads"
        ? seasonSocialPathSegment
        : null;
    const platformForWeek =
      platformFromPath ?? (platformTab !== "overview" ? platformTab : undefined);
    const nextQuery = new URLSearchParams(searchParams.toString());
    nextQuery.delete("social_platform");
    const nextHref = buildSeasonSocialWeekUrl({
      showSlug: showRouteSlug,
      seasonNumber,
      weekIndex: matchedWeek.week_index,
      platform: platformForWeek,
      query: nextQuery,
    });
    const currentHref = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    if (buildCanonicalRoute(nextHref) === buildCanonicalRoute(currentHref)) return;
    const redirectKey = `${pathname}|${nextHref}|${seasonEpisodeNumberFromPath}`;
    if (episodeWeekRedirectRef.current === redirectKey) return;
    episodeWeekRedirectRef.current = redirectKey;
    router.replace(nextHref as Route, { scroll: false });
  }, [
    analytics,
    pathname,
    platformTab,
    router,
    searchParams,
    seasonEpisodeNumberFromPath,
    seasonNumber,
    seasonSocialPathSegment,
    showRouteSlug,
  ]);

  useEffect(() => {
    setWeekDetailTokenCountsByWeek({});
    setWeekDetailHashtagUsageByWeek({});
    setWeekDetailTokenCountsLoadingWeeks(new Set());
    weekDetailTokenRequestsRef.current.clear();
  }, [seasonId, scope, platformFilter]);

  useEffect(() => {
    if (analyticsView === "reddit") return;
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return;
    let parsed: SocialSectionCacheSnapshot | null = null;
    try {
      parsed = JSON.parse(raw) as SocialSectionCacheSnapshot;
    } catch {
      return;
    }
    if (!parsed || parsed.version !== SOCIAL_CACHE_VERSION) return;

    if (parsed.analytics) {
      setAnalytics(parsed.analytics);
    }
    if (Array.isArray(parsed.targets)) {
      setTargets(parsed.targets);
    }
    if (Array.isArray(parsed.runs)) {
      setRuns(parsed.runs);
    }

    const cachedLastUpdated = parseDateOrNull(parsed.last_updated);
    if (cachedLastUpdated) {
      setLastUpdated(cachedLastUpdated);
    }

    const sectionLastSuccessRaw = parsed.section_last_success_at ?? {};
    setSectionLastSuccessAt((current) => ({
      analytics: parseDateOrNull(sectionLastSuccessRaw.analytics) ?? current.analytics,
      targets: parseDateOrNull(sectionLastSuccessRaw.targets) ?? current.targets,
      runs: parseDateOrNull(sectionLastSuccessRaw.runs) ?? current.runs,
    }));
  }, [analyticsView, cacheKey]);

  useEffect(() => {
    if (analyticsView === "reddit") return;
    if (typeof window === "undefined") return;

    const hasAnyData =
      Boolean(analytics) ||
      targets.length > 0 ||
      runs.length > 0 ||
      Boolean(lastUpdated) ||
      Boolean(sectionLastSuccessAt.analytics || sectionLastSuccessAt.targets || sectionLastSuccessAt.runs);
    if (!hasAnyData) {
      return;
    }

    const payload: SocialSectionCacheSnapshot = {
      version: SOCIAL_CACHE_VERSION,
      saved_at: new Date().toISOString(),
      analytics,
      targets,
      runs,
      last_updated: lastUpdated ? lastUpdated.toISOString() : null,
      section_last_success_at: {
        analytics: sectionLastSuccessAt.analytics ? sectionLastSuccessAt.analytics.toISOString() : null,
        targets: sectionLastSuccessAt.targets ? sectionLastSuccessAt.targets.toISOString() : null,
        runs: sectionLastSuccessAt.runs ? sectionLastSuccessAt.runs.toISOString() : null,
      },
    };
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch {
      // Ignore storage quota/serialization errors; runtime data remains in memory.
    }
  }, [
    analytics,
    analyticsView,
    cacheKey,
    lastUpdated,
    runs,
    sectionLastSuccessAt.analytics,
    sectionLastSuccessAt.runs,
    sectionLastSuccessAt.targets,
    targets,
  ]);

  useEffect(() => {
    onTargetsChange?.(targets);
  }, [onTargetsChange, targets]);

  const fetchAnalytics = useCallback(async () => {
    const existingRequest = inFlightRef.current.analyticsByKey.get(analyticsRequestKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetchAdminWithTimeout(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics?${queryString}`,
          { headers, cache: "no-store" },
          REQUEST_TIMEOUT_MS.analytics,
          "Social analytics request timed out",
        );
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Failed to load social analytics"));
        }
        const data = await parseResponseJson<AnalyticsResponse>(response, "Failed to load social analytics");
        if (!isActiveView(analyticsView)) {
          return data;
        }
        const now = new Date();
        setAnalytics(data);
        setLastUpdated(now);
        setSectionLastSuccessAt((current) => ({ ...current, analytics: now }));
        return data;
      } catch (analyticsError) {
        const message =
          analyticsError instanceof Error ? analyticsError.message : "Failed to load social analytics";
        if (isActiveView(analyticsView)) {
          setSectionErrors((current) => ({ ...current, analytics: message }));
        }
        throw analyticsError;
      }
    })();

    inFlightRef.current.analyticsByKey.set(analyticsRequestKey, request);
    try {
      return await request;
    } finally {
      const activeRequest = inFlightRef.current.analyticsByKey.get(analyticsRequestKey);
      if (activeRequest === request) {
        inFlightRef.current.analyticsByKey.delete(analyticsRequestKey);
      }
    }
  }, [
    analyticsRequestKey,
    analyticsView,
    getAuthHeaders,
    isActiveView,
    queryString,
    readErrorMessage,
    seasonNumber,
    showId,
  ]);

  const appendCurrentRunScopeParams = useCallback(
    (
      params: URLSearchParams,
      options?: {
        platform?: "all" | Platform | null;
        week?: number | null;
        day?: string | null;
      },
    ) => {
      const effectivePlatform = options?.platform ?? activeRunRequest?.platform ?? platformFilter;
      const effectiveDay = options?.day?.trim() || activeRunRequest?.day?.trim() || "";
      const effectiveWeek =
        effectiveDay.length > 0
          ? null
          : (options?.week ?? activeRunRequest?.week ?? (weekFilter === "all" ? null : weekFilter));

      if (effectivePlatform && effectivePlatform !== "all") {
        params.set("platforms", effectivePlatform);
      }
      if (effectiveDay) {
        const dayRange = buildIsoDayRange(effectiveDay);
        if (dayRange) {
          params.set("date_start", dayRange.dateStart);
          params.set("date_end", dayRange.dateEnd);
        }
        return;
      }
      if (effectiveWeek !== null) {
        params.set("week_index", String(effectiveWeek));
        const weekWindow =
          (analytics?.weekly ?? []).find((item) => item.week_index === effectiveWeek) ??
          (analytics?.weekly_platform_posts ?? []).find((item) => item.week_index === effectiveWeek);
        if (weekWindow) {
          params.set("date_start", weekWindow.start);
          params.set("date_end", weekWindow.end);
        }
      }
    },
    [activeRunRequest, analytics, platformFilter, weekFilter],
  );

  const fetchRuns = useCallback(async (options?: { runId?: string | null; limit?: number }) => {
    const runId = options?.runId?.trim() || null;
    const requestedLimit = Number.isFinite(options?.limit) ? Number(options?.limit) : 100;
    const safeLimit = Math.max(1, Math.min(250, requestedLimit));
    const scopePlatformKey = activeRunRequest?.platform ?? platformFilter;
    const scopeDayKey = activeRunRequest?.day?.trim() || "all";
    const scopeWeekKey =
      scopeDayKey !== "all"
        ? "day"
        : String(activeRunRequest?.week ?? (weekFilter === "all" ? "all" : weekFilter));
    const scopedRunsKey =
      `${runsRequestKey}:platform=${scopePlatformKey}:week=${scopeWeekKey}:day=${scopeDayKey}:run=${runId ?? "all"}:limit=${safeLimit}`;
    const existingRequest = inFlightRef.current.runsByKey.get(scopedRunsKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      if (!isActiveView(analyticsView)) {
        return [] as SocialRun[];
      }

      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ limit: String(safeLimit) });
      params.set("source_scope", scope);
      params.set("season_id", seasonId);
      appendCurrentRunScopeParams(params);
      if (runId) {
        params.set("run_id", runId);
      }
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/runs?${params.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.runs,
        "Social runs request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load social runs"));
      }
      const data = await parseResponseJson<{ runs?: SocialRun[] }>(response, "Failed to load social runs");
      const nextRuns = data.runs ?? [];
      if (!runId) {
        if (isActiveView(analyticsView)) {
          setRuns(nextRuns);
        }
      } else {
        if (isActiveView(analyticsView)) {
          setRuns((current) => {
            if (nextRuns.length === 0) return current;
            const merged = [...current];
            for (const nextRun of nextRuns) {
              const existingIndex = merged.findIndex((run) => run.id === nextRun.id);
              if (existingIndex >= 0) {
                merged[existingIndex] = nextRun;
              } else {
                merged.unshift(nextRun);
              }
            }
            return merged;
          });
        }
      }
      if (isActiveView(analyticsView)) {
        setSectionLastSuccessAt((current) => ({ ...current, runs: new Date() }));
      }
      return nextRuns;
    })();

    inFlightRef.current.runsByKey.set(scopedRunsKey, request);
    try {
      return await request;
    } finally {
      const activeRequest = inFlightRef.current.runsByKey.get(scopedRunsKey);
      if (activeRequest === request) {
        inFlightRef.current.runsByKey.delete(scopedRunsKey);
      }
    }
  }, [
    activeRunRequest,
    analyticsView,
    appendCurrentRunScopeParams,
    getAuthHeaders,
    isActiveView,
    platformFilter,
    readErrorMessage,
    runsRequestKey,
    scope,
    seasonId,
    seasonNumber,
    showId,
    weekFilter,
  ]);

  const fetchRunSummaries = useCallback(async () => {
    if (!isActiveView(analyticsView)) return [] as SocialRunSummary[];
    setRunSummariesLoading(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ limit: "20" });
      params.set("source_scope", scope);
      params.set("season_id", seasonId);
      appendCurrentRunScopeParams(params);
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/runs/summary?${params.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.runs,
        "Social run summary request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load social run summary"));
      }
      const data = await parseResponseJson<{ summaries?: SocialRunSummary[] }>(
        response,
        "Failed to load social run summary",
      );
      const nextSummaries = data.summaries ?? [];
      if (isActiveView(analyticsView)) {
        setRunSummaries(nextSummaries);
        setRunSummaryError(null);
      }
      return nextSummaries;
    } finally {
      if (isActiveView(analyticsView)) {
        setRunSummariesLoading(false);
      }
    }
  }, [
    analyticsView,
    appendCurrentRunScopeParams,
    getAuthHeaders,
    isActiveView,
    readErrorMessage,
    scope,
    seasonId,
    seasonNumber,
    showId,
  ]);

  const fetchWorkerHealth = useCallback(async () => {
    if (!isActiveView(analyticsView)) {
      return null;
    }
    const workerHealthRequestKey = `${runsRequestKey}:worker-health`;
    const existingRequest = inFlightRef.current.workerHealthByKey.get(workerHealthRequestKey);
    if (existingRequest) {
      return existingRequest;
    }
    const request = (async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetchAdminWithTimeout(
          "/api/admin/trr-api/social/ingest/health-dot",
          { headers, cache: "no-store" },
          REQUEST_TIMEOUT_MS.workerHealth,
          "Social worker health request timed out",
        );
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "Failed to load social worker health"));
        }
        const data = await parseResponseJson<Record<string, unknown>>(
          response,
          "Failed to load social worker health",
        );
        const normalized = normalizeWorkerHealth(data.worker_health ?? data);
        if (isActiveView(analyticsView)) {
          setWorkerHealth(normalized);
          setWorkerHealthError(null);
        }
        return normalized;
      } catch (workerHealthFetchError) {
        const message =
          workerHealthFetchError instanceof Error
            ? workerHealthFetchError.message
            : "Failed to load social worker health";
        if (isActiveView(analyticsView)) {
          setWorkerHealthError(message);
        }
        throw workerHealthFetchError;
      }
    })();
    inFlightRef.current.workerHealthByKey.set(workerHealthRequestKey, request);
    try {
      return await request;
    } finally {
      const activeRequest = inFlightRef.current.workerHealthByKey.get(workerHealthRequestKey);
      if (activeRequest === request) {
        inFlightRef.current.workerHealthByKey.delete(workerHealthRequestKey);
      }
    }
  }, [analyticsView, getAuthHeaders, isActiveView, readErrorMessage, runsRequestKey]);

  const fetchSharedStatus = useCallback(async () => {
    if (!isActiveView(analyticsView)) {
      return null;
    }
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("season_id", seasonId);
      params.set("source_scope", scope);
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/shared-status?${params.toString()}`,
        {
          headers,
          cache: "no-store",
        },
        { allowDevAdminBypass: true },
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load shared social pipeline status"));
      }
      const data = await parseResponseJson<SharedSeasonStatus>(response, "Failed to load shared social pipeline status");
      if (isActiveView(analyticsView)) {
        setSharedStatus(data);
        setSharedStatusError(null);
      }
      return data;
    } catch (sharedStatusFetchError) {
      const message =
        sharedStatusFetchError instanceof Error
          ? sharedStatusFetchError.message
          : "Failed to load shared social pipeline status";
      if (isActiveView(analyticsView)) {
        setSharedStatus(null);
        setSharedStatusError(message);
      }
      throw sharedStatusFetchError;
    }
  }, [analyticsView, getAuthHeaders, isActiveView, readErrorMessage, scope, seasonId, seasonNumber, showId]);

  const fetchTargets = useCallback(async () => {
    const existingRequest = inFlightRef.current.targetsByKey.get(runsRequestKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      if (!isActiveView(analyticsView)) {
        return [] as SocialTarget[];
      }

      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("source_scope", scope);
      params.set("season_id", seasonId);
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/targets?${params.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.targets,
        "Social targets request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load social targets"));
      }
      const data = await parseResponseJson<{ targets?: SocialTarget[] }>(response, "Failed to load social targets");
      if (isActiveView(analyticsView)) {
        setTargets(data.targets ?? []);
        setSectionLastSuccessAt((current) => ({ ...current, targets: new Date() }));
      }
      return data.targets ?? [];
    })();

    inFlightRef.current.targetsByKey.set(runsRequestKey, request);
    try {
      return await request;
    } finally {
      const activeRequest = inFlightRef.current.targetsByKey.get(runsRequestKey);
      if (activeRequest === request) {
        inFlightRef.current.targetsByKey.delete(runsRequestKey);
      }
    }
  }, [
    analyticsView,
    getAuthHeaders,
    isActiveView,
    readErrorMessage,
    runsRequestKey,
    scope,
    seasonId,
    seasonNumber,
    showId,
  ]);

  const buildTargetOverrides = useCallback(
    (platforms?: Platform[] | null): {
      accounts_override: string[];
      hashtags_override: string[];
      keywords_override: string[];
    } => {
      const platformSet = platforms && platforms.length > 0 ? new Set(platforms) : null;
      const accountsOverride: string[] = [];
      const hashtagsOverride: string[] = [];
      const keywordsOverride: string[] = [];
      const seenAccounts = new Set<string>();
      const seenHashtags = new Set<string>();
      const seenKeywords = new Set<string>();

      for (const target of targets) {
        const platform = String(target.platform || "").trim().toLowerCase();
        if (!PLATFORM_ORDER.includes(platform as Platform)) continue;
        if (target.is_active === false) continue;
        if (platformSet && !platformSet.has(platform as Platform)) continue;

        for (const rawAccount of target.accounts ?? []) {
          const normalized = String(rawAccount ?? "").trim();
          const key = normalized.toLowerCase();
          if (!normalized || seenAccounts.has(key)) continue;
          seenAccounts.add(key);
          accountsOverride.push(normalized);
        }
        for (const rawHashtag of target.hashtags ?? []) {
          const normalized = String(rawHashtag ?? "").trim().replace(/^#+/, "");
          const key = normalized.toLowerCase();
          if (!normalized || seenHashtags.has(key)) continue;
          seenHashtags.add(key);
          hashtagsOverride.push(normalized);
        }
        for (const rawKeyword of target.keywords ?? []) {
          const normalized = String(rawKeyword ?? "").trim();
          const key = normalized.toLowerCase();
          if (!normalized || seenKeywords.has(key)) continue;
          seenKeywords.add(key);
          keywordsOverride.push(normalized);
        }
      }

      return {
        accounts_override: accountsOverride,
        hashtags_override: hashtagsOverride,
        keywords_override: keywordsOverride,
      };
    },
    [targets],
  );

  const fetchJobs = useCallback(async (
    runId?: string | null,
    options?: { preserveLastGoodIfEmpty?: boolean; limit?: number },
  ) => {
    if (!isActiveView(analyticsView)) {
      return [] as SocialJob[];
    }

    if (!runId) {
      setJobs([]);
      return [] as SocialJob[];
    }
    const requestedLimit = Number.isFinite(options?.limit) ? Number(options?.limit) : 100;
    const safeLimit = Math.max(1, Math.min(250, requestedLimit));
    const jobsRequestKey = `${seasonId}:${runId}:${safeLimit}`;
    const existingRequest = inFlightRef.current.jobsByKey.get(jobsRequestKey);
    if (existingRequest) {
      return existingRequest;
    }
    const request = (async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ limit: String(safeLimit), run_id: runId });
      params.set("season_id", seasonId);
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/jobs?${params.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.jobs,
        "Social jobs request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load social jobs"));
      }
      const data = await parseResponseJson<{ jobs?: SocialJob[] }>(response, "Failed to load social jobs");
      const nextJobs = data.jobs ?? [];
      if (isActiveView(analyticsView)) {
        setJobs((current) => {
          if (options?.preserveLastGoodIfEmpty && nextJobs.length === 0) {
            const hasCurrentForRun = current.some((job) => job.run_id === runId);
            if (hasCurrentForRun) {
              return current;
            }
          }
          return nextJobs;
        });
      }
      return nextJobs;
    })();
    inFlightRef.current.jobsByKey.set(jobsRequestKey, request);
    try {
      return await request;
    } finally {
      const activeRequest = inFlightRef.current.jobsByKey.get(jobsRequestKey);
      if (activeRequest === request) {
        inFlightRef.current.jobsByKey.delete(jobsRequestKey);
      }
    }
  }, [analyticsView, getAuthHeaders, isActiveView, readErrorMessage, seasonId, seasonNumber, showId]);

  const fetchCommentsCoverage = useCallback(
    async (scopeWindow: {
      platform: "all" | Platform;
      dateStart?: string;
      dateEnd?: string;
      sourceScope: Scope;
    }) => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("season_id", seasonId);
      params.set("source_scope", scopeWindow.sourceScope);
      params.set("timezone", SOCIAL_TIME_ZONE);
      if (scopeWindow.platform !== "all") {
        params.set("platforms", scopeWindow.platform);
      }
      if (scopeWindow.dateStart) params.set("date_start", scopeWindow.dateStart);
      if (scopeWindow.dateEnd) params.set("date_end", scopeWindow.dateEnd);
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/comments-coverage?${params.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.commentsCoverage,
        "Comments coverage request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load comments coverage"));
      }
      return await parseResponseJson<CommentsCoverageResponse>(response, "Failed to load comments coverage");
    },
    [getAuthHeaders, readErrorMessage, seasonId, seasonNumber, showId],
  );

  const fetchMirrorCoverage = useCallback(
    async (scopeWindow: {
      platform: "all" | Platform;
      dateStart?: string;
      dateEnd?: string;
      sourceScope: Scope;
    }) => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("season_id", seasonId);
      params.set("source_scope", scopeWindow.sourceScope);
      params.set("timezone", SOCIAL_TIME_ZONE);
      if (scopeWindow.platform !== "all") {
        params.set("platforms", scopeWindow.platform);
      }
      if (scopeWindow.dateStart) params.set("date_start", scopeWindow.dateStart);
      if (scopeWindow.dateEnd) params.set("date_end", scopeWindow.dateEnd);
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/mirror-coverage?${params.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.mirrorCoverage,
        "Mirror coverage request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load mirror coverage"));
      }
      return await parseResponseJson<MirrorCoverageResponse>(response, "Failed to load mirror coverage");
    },
    [getAuthHeaders, readErrorMessage, seasonId, seasonNumber, showId],
  );

  const requeueMirrorJobs = useCallback(
    async (scopeWindow: {
      platforms: Platform[];
      sourceScope: Scope;
      dateStart?: string;
      dateEnd?: string;
    }): Promise<{ queuedJobs: number; failed: number }> => {
      if (scopeWindow.platforms.length === 0) {
        return { queuedJobs: 0, failed: 0 };
      }
      const headers = await getAuthHeaders();
      let queuedJobs = 0;
      let failed = 0;
      for (const platform of scopeWindow.platforms) {
        const params = new URLSearchParams({
          season_id: seasonId,
          platform,
          source_scope: scopeWindow.sourceScope,
          failed_only: "false",
        });
        if (scopeWindow.dateStart) params.set("date_start", scopeWindow.dateStart);
        if (scopeWindow.dateEnd) params.set("date_end", scopeWindow.dateEnd);
        const response = await fetchAdminWithTimeout(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/mirror/requeue?${params.toString()}`,
          {
            method: "POST",
            headers,
          },
          REQUEST_TIMEOUT_MS.mirrorCoverage,
          "Mirror requeue request timed out",
        );
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, `Failed to requeue mirror jobs for ${platform}`));
        }
        const payload = (await response.json().catch(() => ({}))) as {
          queued_jobs?: unknown;
          failed?: unknown;
        };
        queuedJobs += Number(payload.queued_jobs ?? 0) || 0;
        failed += Number(payload.failed ?? 0) || 0;
      }
      return { queuedJobs, failed };
    },
    [getAuthHeaders, readErrorMessage, seasonId, seasonNumber, showId],
  );

  const fetchWeekDetail = useCallback(
    async (scopeWindow: {
      weekIndex: number;
      platform: "all" | Platform;
      sourceScope: Scope;
      postLimit?: number;
      postOffset?: number;
      signal?: AbortSignal;
    }) => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set("season_id", seasonId);
      params.set("source_scope", scopeWindow.sourceScope);
      params.set("timezone", SOCIAL_TIME_ZONE);
      params.set("max_comments_per_post", "0");
      params.set("post_limit", String(Math.max(1, Number(scopeWindow.postLimit ?? WEEK_DETAIL_TARGETS_PAGE_LIMIT))));
      params.set("post_offset", String(Math.max(0, Number(scopeWindow.postOffset ?? 0))));
      if (scopeWindow.platform !== "all") {
        params.set("platforms", scopeWindow.platform);
      }
      const response = await fetchAdminWithTimeout(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/week/${scopeWindow.weekIndex}?${params.toString()}`,
        { headers, cache: "no-store", signal: scopeWindow.signal },
        REQUEST_TIMEOUT_MS.weekDetail,
        "Week detail request timed out",
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Failed to load week detail"));
      }
      return await parseResponseJson<WeekDetailResponse>(response, "Failed to load week detail");
    },
    [getAuthHeaders, readErrorMessage, seasonId, seasonNumber, showId],
  );

  const buildMissingCommentTargets = useCallback(
    async (scopeWindow: {
      weekIndex: number;
      platform: "all" | Platform;
      sourceScope: Scope;
    }): Promise<MissingCommentTargets> => {
      const aggregatedPlatforms: Partial<Record<Platform, { posts?: WeekDetailPost[] }>> = {};
      let pageOffset = 0;
      let pageCount = 0;
      let hasMore = true;

      while (hasMore && pageCount < WEEK_DETAIL_TARGETS_MAX_PAGES) {
        const page = await fetchWeekDetail({
          ...scopeWindow,
          postLimit: WEEK_DETAIL_TARGETS_PAGE_LIMIT,
          postOffset: pageOffset,
        });
        for (const platform of PLATFORM_ORDER) {
          const pagePlatformPayload = page.platforms?.[platform];
          if (!pagePlatformPayload?.posts?.length) continue;
          const existingPlatformPayload = aggregatedPlatforms[platform] ?? {
            posts: [],
          };
          existingPlatformPayload.posts = [
            ...(existingPlatformPayload.posts ?? []),
            ...(pagePlatformPayload.posts ?? []),
          ];
          aggregatedPlatforms[platform] = existingPlatformPayload;
        }
        const returnedCount = Number(
          page.pagination?.returned ??
            Object.values(page.platforms ?? {}).reduce(
              (sum, platformPayload) => sum + (platformPayload?.posts?.length ?? 0),
              0,
            ),
        );
        hasMore = Boolean(page.pagination?.has_more) && returnedCount > 0;
        pageOffset =
          page.pagination && Number.isFinite(Number(page.pagination.offset))
            ? Number(page.pagination.offset) + returnedCount
            : pageOffset + returnedCount;
        pageCount += 1;
      }
      const sourceIdsByPlatform: Partial<Record<Platform, string[]>> = {};
      const stalePlatforms = new Set<Platform>();
      const overflowPlatforms = new Set<Platform>();
      let staleAnchorsCount = 0;

      for (const platform of PLATFORM_ORDER) {
        const posts = aggregatedPlatforms[platform]?.posts ?? [];
        const staleSourceIds = new Set<string>();
        for (const post of posts) {
          const sourceId = String(post?.source_id ?? "").trim();
          if (!sourceId) continue;
          const reportedComments = getReportedCommentsForWeekPost(platform, post);
          const savedComments = Number(post?.total_comments_available ?? 0);
          if (reportedComments > savedComments) {
            staleSourceIds.add(sourceId);
          }
        }

        if (staleSourceIds.size === 0) continue;
        stalePlatforms.add(platform);
        staleAnchorsCount += staleSourceIds.size;
        if (staleSourceIds.size > MAX_COMMENT_ANCHOR_SOURCE_IDS_PER_PLATFORM) {
          overflowPlatforms.add(platform);
          continue;
        }
        sourceIdsByPlatform[platform] = [...staleSourceIds].sort();
      }

      return {
        platforms: [...stalePlatforms],
        sourceIdsByPlatform,
        staleAnchorsCount,
        overflowPlatforms: [...overflowPlatforms],
      };
    },
    [fetchWeekDetail],
  );

  const refreshAll = useCallback(async () => {
    const requestView: SocialAnalyticsView = analyticsView;
    const existingRequest = inFlightRef.current.refreshAllByView.get(requestView);
    if (existingRequest) {
      return existingRequest;
    }

    const requestId = refreshGenerationRef.current;
    const isCurrentRequest = () => isCurrentRefreshRequest(requestView, requestId);

    const request = (async () => {
      if (!isCurrentRequest()) {
        return;
      }

      if (requestView === "reddit") {
        setLoading(false);
        setSectionErrors({
          analytics: null,
          targets: null,
          runs: null,
          jobs: null,
        });
        setWorkerHealth(null);
        setWorkerHealthError(null);
        setSharedStatus(null);
        setSharedStatusError(null);
        setRunSummaryError(null);
        return;
      }

      setLoading(true);
      setError(null);
      const nextSectionErrors = {
        analytics: null as string | null,
        targets: null as string | null,
        runs: null as string | null,
        jobs: null as string | null,
      };

      const [targetsResult, runsResult, runSummariesResult, workerHealthResult, sharedStatusResult] =
        await settleWithConcurrencyLimit(
          [
            () => fetchTargets(),
            () => fetchRuns(),
            () => fetchRunSummaries(),
            () => fetchWorkerHealth(),
            () => fetchSharedStatus(),
          ],
          INITIAL_SOCIAL_REFRESH_CONCURRENCY,
        );

      if (!isCurrentRequest()) {
        return;
      }

      if (targetsResult.status === "rejected") {
        nextSectionErrors.targets =
          targetsResult.reason instanceof Error ? targetsResult.reason.message : "Failed to load social targets";
      }

      let runIdToLoad = selectedRunId;
      if (runsResult.status === "fulfilled") {
        const loadedRuns = runsResult.value;
        const activeRun = loadedRuns.find((run) => ACTIVE_RUN_STATUSES.has(run.status));
        if (activeRun) {
          setActiveRunId(activeRun.id);
        } else if (!runningIngest) {
          setActiveRunId(null);
        }

        if (runIdToLoad && !loadedRuns.some((run) => run.id === runIdToLoad)) {
          runIdToLoad = null;
        }
        if (!runIdToLoad && selectedRunId) {
          setSelectedRunId(null);
        }
      } else {
        nextSectionErrors.runs =
          runsResult.reason instanceof Error ? runsResult.reason.message : "Failed to load social runs";
      }

      if (runSummariesResult.status === "rejected") {
        setRunSummaryError(
          runSummariesResult.reason instanceof Error
            ? runSummariesResult.reason.message
            : "Failed to load social run summary",
        );
      } else {
        setRunSummaryError(null);
      }

      if (workerHealthResult.status === "rejected") {
        setWorkerHealthError(
          workerHealthResult.reason instanceof Error
            ? workerHealthResult.reason.message
            : "Failed to load social worker health",
        );
      } else {
        setWorkerHealthError(null);
      }
      if (sharedStatusResult.status === "rejected") {
        setSharedStatusError(
          sharedStatusResult.reason instanceof Error
            ? sharedStatusResult.reason.message
            : "Failed to load shared social pipeline status",
        );
      } else {
        setSharedStatusError(null);
      }

      try {
        await fetchJobs(runIdToLoad);
      } catch (jobsError) {
        nextSectionErrors.jobs = jobsError instanceof Error ? jobsError.message : "Failed to load social jobs";
      }

      if (!isCurrentRequest()) {
        return;
      }

      setSectionErrors(nextSectionErrors);
      setLoading(false);

      void fetchAnalytics()
        .then(() => {
          if (isCurrentRequest()) {
            setSectionErrors((current) => ({ ...current, analytics: null }));
          }
        })
        .catch((analyticsError) => {
          if (isCurrentRequest()) {
            setSectionErrors((current) => ({
              ...current,
              analytics:
                analyticsError instanceof Error ? analyticsError.message : "Failed to load social analytics",
            }));
          }
        });
    })();

    inFlightRef.current.refreshAllByView.set(requestView, request);
    try {
      await request;
    } finally {
      const activeRequest = inFlightRef.current.refreshAllByView.get(requestView);
      if (activeRequest === request) {
        inFlightRef.current.refreshAllByView.delete(requestView);
      }
    }
  }, [
    fetchAnalytics,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    fetchSharedStatus,
    fetchTargets,
    fetchWorkerHealth,
    isCurrentRefreshRequest,
    runningIngest,
    selectedRunId,
    analyticsView,
  ]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!selectedRunId) {
      setJobs([]);
      return;
    }
    void fetchJobs(selectedRunId)
      .then(() => {
        setSectionErrors((current) => ({ ...current, jobs: null }));
      })
      .catch((jobsError) => {
        setSectionErrors((current) => ({
          ...current,
          jobs: jobsError instanceof Error ? jobsError.message : "Failed to load social jobs",
        }));
      });
  }, [fetchJobs, selectedRunId]);

  const refreshSelectedRunJobs = useCallback(async () => {
    const runId = selectedRunId;
    if (!runId) {
      return;
    }
    try {
      await fetchJobs(runId);
      setSectionErrors((current) => ({ ...current, jobs: null }));
    } catch (jobsError) {
      setSectionErrors((current) => ({
        ...current,
        jobs: jobsError instanceof Error ? jobsError.message : "Failed to load social jobs",
      }));
    }
  }, [fetchJobs, selectedRunId]);

  const runScopedJobs = useMemo(() => {
    if (!selectedRunId) return [];
    return jobs.filter((job) => job.run_id === selectedRunId);
  }, [jobs, selectedRunId]);

  const selectedRun = useMemo(
    () => (selectedRunId ? runs.find((run) => run.id === selectedRunId) ?? null : null),
    [runs, selectedRunId],
  );
  const activeRun = useMemo(
    () => (activeRunId ? runs.find((run) => run.id === activeRunId) ?? null : null),
    [activeRunId, runs],
  );


  const weeklyWindowLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const week of analytics?.weekly ?? []) {
      const start = normalizeIsoInstant(week.start);
      const end = normalizeIsoInstant(week.end);
      if (!start || !end) continue;
      map.set(`${start}|${end}`, week.label ?? formatWeekScopeLabel(week.week_index));
    }
    for (const week of analytics?.weekly_platform_posts ?? []) {
      const start = normalizeIsoInstant(week.start);
      const end = normalizeIsoInstant(week.end);
      if (!start || !end) continue;
      if (!map.has(`${start}|${end}`)) {
        map.set(`${start}|${end}`, week.label ?? formatWeekScopeLabel(week.week_index));
      }
    }
    return map;
  }, [analytics]);

  const weekLabelByIndex = useMemo(() => {
    const map = new Map<number, string>();
    for (const week of analytics?.weekly ?? []) {
      if (!Number.isFinite(week.week_index)) continue;
      map.set(week.week_index, week.label ?? formatWeekScopeLabel(week.week_index));
    }
    for (const week of analytics?.weekly_platform_posts ?? []) {
      if (!Number.isFinite(week.week_index) || map.has(week.week_index)) continue;
      map.set(week.week_index, week.label ?? formatWeekScopeLabel(week.week_index));
    }
    return map;
  }, [analytics]);

  const resolveWeekScopeLabel = useCallback(
    (week: number | "all" | null): string => {
      if (week === "all" || week === null) return "All Weeks";
      return weekLabelByIndex.get(week) ?? formatWeekScopeLabel(week);
    },
    [weekLabelByIndex],
  );

  const runOptionLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    for (const run of runs) {
      const config = (run.config ?? {}) as Record<string, unknown>;
      const dateStartRaw = typeof config.date_start === "string" ? config.date_start : null;
      const dateEndRaw = typeof config.date_end === "string" ? config.date_end : null;

      let weekLabel = "All Weeks";
      if (dateStartRaw && dateEndRaw) {
        const startIso = normalizeIsoInstant(dateStartRaw);
        const endIso = normalizeIsoInstant(dateEndRaw);
        if (startIso && endIso) {
          weekLabel = weeklyWindowLookup.get(`${startIso}|${endIso}`) ?? formatDateRangeLabel(dateStartRaw, dateEndRaw);
        } else {
          weekLabel = formatDateRangeLabel(dateStartRaw, dateEndRaw);
        }
      }

      let platformLabel = "All Platforms";
      const platformsRaw = config.platforms;
      const configuredPlatforms =
        Array.isArray(platformsRaw)
          ? platformsRaw.map((item) => String(item).toLowerCase()).filter((item) => item in PLATFORM_LABELS)
          : typeof platformsRaw === "string" && platformsRaw !== "all"
            ? [platformsRaw.toLowerCase()].filter((item) => item in PLATFORM_LABELS)
            : [];
      if (configuredPlatforms.length === 1) {
        platformLabel = PLATFORM_LABELS[configuredPlatforms[0]] ?? configuredPlatforms[0];
      } else if (configuredPlatforms.length > 1 && configuredPlatforms.length < 4) {
        platformLabel = configuredPlatforms.map((item) => PLATFORM_LABELS[item] ?? item).join(", ");
      }

      const progressLabel = formatRunProgressLabel(run);
      const totalItems = Number(run.summary?.items_found_total ?? 0);
      const timestamp = run.started_at ?? run.created_at ?? run.completed_at ?? run.cancelled_at;
      const timestampLabel = formatDateTime(timestamp);
      labels.set(
        run.id,
        `${weekLabel} · ${platformLabel} · ${progressLabel} · ${totalItems.toLocaleString()} items · ${timestampLabel} · ${run.id.slice(0, 8)}`,
      );
    }
    return labels;
  }, [runs, weeklyWindowLookup]);

  const activeRunScope = useMemo(() => {
    const fallbackDay = activeRunRequest?.day ?? null;
    const fallbackWeek = activeRunRequest?.week ?? (weekFilter === "all" ? null : weekFilter);
    const fallbackPlatform = activeRunRequest?.platform ?? platformFilter;
    const fallbackWeekLabel = fallbackDay
      ? formatDayScopeLabel(fallbackDay)
      : resolveWeekScopeLabel(fallbackWeek);
    const fallbackPlatformLabel = formatPlatformScopeLabel(fallbackPlatform);

    if (!selectedRunId || runScopedJobs.length === 0) {
      if (selectedRun?.config) {
        const config = selectedRun.config as Record<string, unknown>;
        const dateStartRaw = typeof config.date_start === "string" ? config.date_start : null;
        const dateEndRaw = typeof config.date_end === "string" ? config.date_end : null;
        let weekLabel = fallbackWeekLabel;
        if (dateStartRaw && dateEndRaw) {
          const dateStartIso = normalizeIsoInstant(dateStartRaw);
          const dateEndIso = normalizeIsoInstant(dateEndRaw);
          weekLabel =
            dateStartIso && dateEndIso
              ? weeklyWindowLookup.get(`${dateStartIso}|${dateEndIso}`) ?? formatDateRangeLabel(dateStartRaw, dateEndRaw)
              : formatDateRangeLabel(dateStartRaw, dateEndRaw);
        } else {
          weekLabel = "All Weeks";
        }

        const platformsRaw = config.platforms;
        const configuredPlatforms =
          Array.isArray(platformsRaw)
            ? platformsRaw.map((item) => String(item).toLowerCase()).filter((item) => item in PLATFORM_LABELS)
            : typeof platformsRaw === "string" && platformsRaw !== "all"
              ? [platformsRaw.toLowerCase()].filter((item) => item in PLATFORM_LABELS)
              : [];

        let platformLabel = "All Platforms";
        if (configuredPlatforms.length === 1) {
          platformLabel = PLATFORM_LABELS[configuredPlatforms[0]] ?? configuredPlatforms[0];
        } else if (configuredPlatforms.length > 1 && configuredPlatforms.length < 4) {
          platformLabel = configuredPlatforms.map((item) => PLATFORM_LABELS[item] ?? item).join(", ");
        }

        return { weekLabel, platformLabel };
      }
      return { weekLabel: fallbackWeekLabel, platformLabel: fallbackPlatformLabel };
    }

    const platformSet = new Set<string>();
    const weekLabelSet = new Set<string>();
    let hasUnboundedWeeks = false;
    for (const job of runScopedJobs) {
      if (job.platform) platformSet.add(job.platform);
      const dateStartRaw = typeof job.config?.date_start === "string" ? job.config.date_start : null;
      const dateEndRaw = typeof job.config?.date_end === "string" ? job.config.date_end : null;
      if (!dateStartRaw || !dateEndRaw) {
        hasUnboundedWeeks = true;
        continue;
      }
      const dateStartIso = normalizeIsoInstant(dateStartRaw);
      const dateEndIso = normalizeIsoInstant(dateEndRaw);
      if (!dateStartIso || !dateEndIso) {
        weekLabelSet.add(formatDateRangeLabel(dateStartRaw, dateEndRaw));
        continue;
      }
      const matchedWeekLabel = weeklyWindowLookup.get(`${dateStartIso}|${dateEndIso}`);
      weekLabelSet.add(matchedWeekLabel ?? formatDateRangeLabel(dateStartRaw, dateEndRaw));
    }

    const sortedPlatforms = Array.from(platformSet).sort((a, b) =>
      (PLATFORM_LABELS[a] ?? a).localeCompare(PLATFORM_LABELS[b] ?? b)
    );
    const platformLabel =
      sortedPlatforms.length === 0
        ? fallbackPlatformLabel
        : sortedPlatforms.length >= Object.keys(PLATFORM_LABELS).length
          ? "All Platforms"
          : sortedPlatforms.map((platform) => PLATFORM_LABELS[platform] ?? platform).join(", ");

    const sortedWeekLabels = Array.from(weekLabelSet).sort((a, b) => a.localeCompare(b));
    const weekLabel = hasUnboundedWeeks || sortedWeekLabels.length === 0 ? "All Weeks" : sortedWeekLabels.join(", ");

    return {
      weekLabel,
      platformLabel,
    };
  }, [
    activeRunRequest,
    platformFilter,
    resolveWeekScopeLabel,
    runScopedJobs,
    selectedRun,
    selectedRunId,
    weekFilter,
    weeklyWindowLookup,
  ]);

  const liveRunLogs = useMemo(() => {
    if (!selectedRunId) return [];
    return [...runScopedJobs]
      .map((job) => {
        const stage = getJobStageLabel(job);
        const timestamp = job.completed_at ?? job.started_at ?? job.created_at ?? null;
        const ts = timestamp ? Date.parse(timestamp) : Number.NaN;
        const counters = getJobStageCounters(job);
        const persistCounters = getJobPersistCounters(job);
        const activity = getJobActivity(job);
        const outcomeNote = formatJobOutcomeNote(job);
        const account = typeof job.config?.account === "string" && job.config.account ? ` @${job.config.account}` : "";
        const stagePlain = STAGE_LABELS_PLAIN[stage] ?? stage;
        const statusPlain = JOB_STATUS_PLAIN[statusToLogVerb(job.status)] ?? statusToLogVerb(job.status);

        let msg = `${PLATFORM_LABELS[job.platform] ?? job.platform}${account} \u2014 ${stagePlain}: ${statusPlain}`;
        if (counters) {
          msg += `. Observed ${formatCountersPlain(counters.posts, counters.comments)}`;
        } else if (typeof job.items_found === "number" && job.items_found > 0) {
          msg += `. ${job.items_found.toLocaleString()} items found`;
        }
        if (persistCounters) {
          msg += `. Saved ${formatCountersPlain(persistCounters.posts_upserted, persistCounters.comments_upserted)}`;
        }
        const actPlain = formatJobActivitySummary(activity);
        if (actPlain) {
          msg += `. ${actPlain}`;
        }
        if (outcomeNote) {
          msg += `. ${outcomeNote}`;
        }
        return {
          id: job.id,
          timestampMs: Number.isNaN(ts) ? 0 : ts,
          timestampLabel: formatTime(timestamp),
          message: msg,
        };
      })
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 8);
  }, [runScopedJobs, selectedRunId]);

  const hasRunningJobs = useMemo(() => {
    const jobLevelActiveWork = runScopedJobs.some((job) => ACTIVE_RUN_STATUSES.has(job.status as SocialRun["status"]));
    if (jobLevelActiveWork) return true;
    if (runScopedJobs.length > 0) return false;
    return Boolean(activeRun && ACTIVE_RUN_STATUSES.has(activeRun.status));
  }, [activeRun, runScopedJobs]);

  useEffect(() => {
    if (activeSyncSessionId) return;
    if (!runningIngest || !activeRunId || !activeRun) return;
    if (!TERMINAL_RUN_STATUSES.has(activeRun.status)) return;
    let cancelled = false;
    const completedRunId = activeRunId;

    const finalizeRun = (message: string) => {
      setIngestMessage(message);
      setRunningIngest(false);
      setIngestingWeek(null);
      setIngestingDay(null);
      setActiveRunRequest(null);
      setActiveRunId(null);
      setIngestStartedAt(null);
      autoSyncSessionRef.current = null;
      void fetchAnalytics().catch(() => {});
      void fetchRuns().catch(() => {});
      void fetchRunSummaries().catch(() => {});
      void fetchJobs(completedRunId).catch(() => {});
    };

    void (async () => {
      const summary = activeRun.summary ?? {};
      const completedJobs = Number(summary.completed_jobs ?? 0);
      const failedJobs = Number(summary.failed_jobs ?? 0);
      const totalJobs = Math.max(Number(summary.total_jobs ?? 0), completedJobs + failedJobs);
      const totalItems = Number(summary.items_found_total ?? 0);
      const elapsed = ingestStartedAt ? ` in ${Math.round((Date.now() - ingestStartedAt.getTime()) / 1000)}s` : "";
      const finalVerb = activeRun.status === "cancelled" ? "cancelled" : activeRun.status === "failed" ? "failed" : "complete";
      let terminalMessage = `Sync ${finalVerb}${elapsed}: ${completedJobs} job(s) finished`;
      if (totalJobs > 0) {
        terminalMessage += ` of ${totalJobs}`;
      }
      terminalMessage += `, ${totalItems.toLocaleString()} items`;
      if (failedJobs > 0) {
        terminalMessage += ` · ${failedJobs} failed`;
      }

      const session = autoSyncSessionRef.current;
      if (!session || !session.enabled || activeRun.status === "cancelled") {
        if (!cancelled) finalizeRun(terminalMessage);
        return;
      }

      try {
        const coverage = await fetchCommentsCoverage({
          platform: session.platform,
          dateStart: session.dateStart,
          dateEnd: session.dateEnd,
          sourceScope: scope,
        });
        const mirrorCoverage = SOCIAL_FULL_SYNC_MIRROR_ENABLED
          ? await fetchMirrorCoverage({
              platform: session.platform,
              dateStart: session.dateStart,
              dateEnd: session.dateEnd,
              sourceScope: scope,
            })
          : {
              up_to_date: true,
              needs_mirror_count: 0,
              mirrored_count: 0,
              failed_count: 0,
              partial_count: 0,
              pending_count: 0,
              posts_scanned: 0,
            };
        if (cancelled) return;
        setSyncCommentsCoveragePreview(coverage);
        setSyncMirrorCoveragePreview(SOCIAL_FULL_SYNC_MIRROR_ENABLED ? mirrorCoverage : null);
        const coverageSaved = Number(coverage.total_saved_comments ?? 0);
        const coverageReported = Number(coverage.total_reported_comments ?? 0);
        const coveragePct = coverageReported > 0 ? Math.max(0, Math.min(100, (coverageSaved / coverageReported) * 100)) : 100;
        const coverageLabel = `${coverageSaved.toLocaleString()}/${coverageReported.toLocaleString()} (${coveragePct.toFixed(1)}%)`;
        const mirrorTotal = Number(mirrorCoverage.posts_scanned ?? 0);
        const mirrorNeeds = Number(mirrorCoverage.needs_mirror_count ?? 0);
        const mirrorReady = Math.max(0, mirrorTotal - mirrorNeeds);
        const mirrorLabel = formatMirrorCoverageLabel(mirrorReady, mirrorTotal);
        const strictRunSuccess = activeRun.status === "completed" && failedJobs === 0;
        const mirrorIsReady = !SOCIAL_FULL_SYNC_MIRROR_ENABLED || mirrorCoverage.up_to_date;
        if (coverage.up_to_date && mirrorIsReady && strictRunSuccess) {
          const mirrorToken = SOCIAL_FULL_SYNC_MIRROR_ENABLED ? ` · Mirror ${mirrorLabel}` : "";
          finalizeRun(`${terminalMessage} · Coverage ${coverageLabel}${mirrorToken} · Up-to-Date.`);
          return;
        }

        const elapsedMs = Date.now() - session.startedAtMs;
        const nextPass = session.pass + 1;
        if (nextPass > session.maxPasses || elapsedMs >= session.maxDurationMs) {
          if (SOCIAL_FULL_SYNC_MIRROR_ENABLED) {
            finalizeRun(
              `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Incomplete (guardrail reached after ${session.pass}/${session.maxPasses} passes; pending=${mirrorCoverage.pending_count ?? 0}, failed=${mirrorCoverage.failed_count ?? 0}).`,
            );
          } else {
            finalizeRun(
              `${terminalMessage} · Coverage ${coverageLabel} · Stalled (guardrail reached after ${session.pass}/${session.maxPasses} passes).`,
            );
          }
          return;
        }

        const staleCommentPlatforms = Object.entries(coverage.by_platform ?? {})
          .filter(([, value]) => !value.up_to_date)
          .map(([platform]) => platform)
          .filter((platform): platform is Platform => PLATFORM_ORDER.includes(platform as Platform));
        const staleMirrorPlatforms = Object.entries(mirrorCoverage.by_platform ?? {})
          .filter(([, value]) => !value.up_to_date || Number(value.needs_mirror_count ?? 0) > 0)
          .map(([platform]) => platform)
          .filter((platform): platform is Platform => PLATFORM_ORDER.includes(platform as Platform));
        const mergedStalePlatforms = Array.from(new Set([...staleCommentPlatforms, ...staleMirrorPlatforms]));
        if (SOCIAL_FULL_SYNC_MIRROR_ENABLED && staleMirrorPlatforms.length > 0) {
          const requeueResult = await requeueMirrorJobs({
            platforms: staleMirrorPlatforms,
            sourceScope: scope,
            dateStart: session.dateStart,
            dateEnd: session.dateEnd,
          });
          if (cancelled) return;
          setIngestMessage(
            `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Requeued ${requeueResult.queuedJobs} mirror job(s) for ${staleMirrorPlatforms.length} platform(s).`,
          );
        }

        const headers = await getAuthHeaders();
        if (cancelled) return;
        // Only switch to comments_only if every post-stage job found items.
        // If any account had 0 results, keep doing full ingest so it gets scraped.
        const postJobs = jobs.filter(
          (j) => j.run_id === completedRunId && (j.job_type === "posts" || j.job_type === "shared_account_posts"),
        );
        const allAccountsCovered = postJobs.length > 0 && postJobs.every((j) => (j.items_found ?? 0) > 0);
        const nextIngestMode: IngestMode =
          session.ingestMode === "posts_and_comments" && allAccountsCovered
            ? "comments_only"
            : session.ingestMode;
        const payload: {
          source_scope: Scope;
          platforms?: Platform[];
          accounts_override?: string[];
          hashtags_override?: string[];
          keywords_override?: string[];
          max_posts_per_target: number;
          max_comments_per_post: number;
          max_replies_per_post: number;
          fetch_replies: boolean;
          ingest_mode: IngestMode;
          sync_strategy: "incremental";
          runner_strategy?: "single_runner" | "adaptive_dual_runner";
          runner_count?: number;
          window_shard_hours?: number;
          comment_refresh_policy?: CommentRefreshPolicy;
          comment_anchor_source_ids?: Partial<Record<Platform, string[]>>;
          allow_inline_dev_fallback: boolean;
          date_start?: string;
          date_end?: string;
        } = {
          source_scope: scope,
          max_posts_per_target: 0,
          max_comments_per_post: 5000,
          max_replies_per_post: 1000,
          fetch_replies: false,
          ingest_mode: nextIngestMode,
          sync_strategy: "incremental",
          runner_strategy: "single_runner",
          runner_count: 1,
          window_shard_hours: 12,
          allow_inline_dev_fallback: false,
        };
        const nextPlatforms = mergedStalePlatforms.length > 0
          ? mergedStalePlatforms
          : session.platform !== "all"
            ? [session.platform]
            : null;
        if (nextPlatforms && nextPlatforms.length > 0) {
          payload.platforms = nextPlatforms;
        }
        const targetOverrides = buildTargetOverrides(nextPlatforms);
        payload.accounts_override = targetOverrides.accounts_override;
        payload.hashtags_override = targetOverrides.hashtags_override;
        payload.keywords_override = targetOverrides.keywords_override;
        if (session.rowMissingOnly && session.ingestMode === "comments_only" && session.week !== null && !session.day) {
          const missingTargets = await buildMissingCommentTargets({
            weekIndex: session.week,
            platform: session.platform,
            sourceScope: scope,
          });
          if (cancelled) return;
          if (missingTargets.platforms.length === 0 || missingTargets.staleAnchorsCount <= 0) {
            finalizeRun(`${terminalMessage} · Coverage ${coverageLabel} · Up-to-Date.`);
            return;
          }
          payload.platforms = missingTargets.platforms;
          payload.comment_refresh_policy = "missing_only";
          if (Object.keys(missingTargets.sourceIdsByPlatform).length > 0) {
            payload.comment_anchor_source_ids = missingTargets.sourceIdsByPlatform;
          }
        }
        if (session.dateStart) payload.date_start = session.dateStart;
        if (session.dateEnd) payload.date_end = session.dateEnd;

        setIngestMessage(
          SOCIAL_FULL_SYNC_MIRROR_ENABLED
            ? `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Auto-continuing pass ${nextPass}/${session.maxPasses}...`
            : `${terminalMessage} · Coverage ${coverageLabel} · Auto-continuing pass ${nextPass}/${session.maxPasses}...`,
        );
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/ingest?season_id=${encodeURIComponent(seasonId)}`,
          {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
          { allowDevAdminBypass: true },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as IngestProxyErrorPayload;
          throw new Error(formatIngestErrorMessage(data));
        }
        const result = (await response.json().catch(() => ({}))) as {
          run_id?: string;
          queued_or_started_jobs?: number;
        };
        const runId = typeof result.run_id === "string" && result.run_id ? result.run_id : null;
        if (!runId) {
          throw new Error("Auto-continue pass started without a run id");
        }
        if (cancelled) return;
        session.pass = nextPass;
        session.ingestMode = nextIngestMode;
        setActiveRunId(runId);
        setSelectedRunId(runId);
        setJobs([]);
        const jobCount = Number(result.queued_or_started_jobs ?? 0);
        setIngestMessage(
          SOCIAL_FULL_SYNC_MIRROR_ENABLED
            ? `Pass ${nextPass}/${session.maxPasses} queued · run ${runId.slice(0, 8)} · ${jobCount} jobs · Coverage ${coverageLabel} · Mirror ${mirrorLabel}.`
            : `Pass ${nextPass}/${session.maxPasses} queued · run ${runId.slice(0, 8)} · ${jobCount} jobs · Coverage ${coverageLabel}.`,
        );
        await fetchJobs(runId);
        await fetchRuns();
        await fetchRunSummaries();
      } catch (autoContinueError) {
        if (cancelled) return;
        const message = autoContinueError instanceof Error ? autoContinueError.message : "Auto-continue failed";
        finalizeRun(`${terminalMessage} · ${message}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeRun,
    activeRunId,
    activeSyncSessionId,
    fetchAnalytics,
    buildTargetOverrides,
    buildMissingCommentTargets,
    fetchCommentsCoverage,
    fetchMirrorCoverage,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    requeueMirrorJobs,
    getAuthHeaders,
    ingestStartedAt,
    jobs,
    runningIngest,
    scope,
    seasonId,
    seasonNumber,
    showId,
  ]);

  useEffect(() => {
    if (!activeSyncSessionId || !runningIngest) {
      setActiveSyncSessionStreamConnected(false);
      return;
    }
    let cancelled = false;
    const abortController = new AbortController();

    const refreshLiveData = async (
      payload: SocialSyncSessionProgressSnapshot,
      event: SocialSyncSessionStreamPayload,
    ) => {
      const now = Date.now();
      if (now - activeSyncSessionLastRefreshAtRef.current < 2_500) return;
      activeSyncSessionLastRefreshAtRef.current = now;

      const refreshTasks: Promise<unknown>[] = [fetchAnalytics()];
      const nextRunId =
        (typeof payload.current_run_id === "string" && payload.current_run_id.trim().length > 0
          ? payload.current_run_id
          : typeof payload.current_run?.id === "string" && payload.current_run.id.trim().length > 0
            ? payload.current_run.id
            : null) ?? null;
      if (nextRunId) {
        refreshTasks.push(fetchJobs(nextRunId, { preserveLastGoodIfEmpty: true, limit: 100 }));
      }
      if (event.run_progress && typeof event.run_progress === "object") {
        refreshTasks.push(fetchRuns({ runId: nextRunId ?? activeRunId ?? undefined, limit: 1 }));
      }
      await Promise.allSettled(refreshTasks);
    };

    const consume = async () => {
      try {
        const headers = await getAuthHeaders();
        await consumeSocialSyncSessionStream({
          url: `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/sync-sessions/${activeSyncSessionId}/stream?season_id=${encodeURIComponent(seasonId)}`,
          headers,
          signal: abortController.signal,
          onOpen: () => {
            if (cancelled) return;
            setActiveSyncSessionStreamConnected(true);
            setError(null);
          },
          onMessage: async (event) => {
            if (cancelled) return;
            const payload = event.sync_session;
            setActiveSyncSession(payload);
            const snapshot = payload.completeness_snapshot ?? {};
            if (snapshot.comments_coverage && typeof snapshot.comments_coverage === "object") {
              setSyncCommentsCoveragePreview(snapshot.comments_coverage as unknown as CommentsCoverageResponse);
            }
            if (snapshot.asset_coverage && typeof snapshot.asset_coverage === "object") {
              setSyncMirrorCoveragePreview(snapshot.asset_coverage as unknown as MirrorCoverageResponse);
            }
            const nextRunId =
              (typeof payload.current_run_id === "string" && payload.current_run_id.trim().length > 0
                ? payload.current_run_id
                : typeof payload.current_run?.id === "string" && payload.current_run.id.trim().length > 0
                  ? payload.current_run.id
                  : null) ?? null;
            if (nextRunId && nextRunId !== activeRunId) {
              setActiveRunId(nextRunId);
              setSelectedRunId(nextRunId);
              setJobs([]);
              await fetchJobs(nextRunId);
              await fetchRuns({ runId: nextRunId, limit: 1 });
              await fetchRunSummaries();
            }
            void refreshLiveData(payload, event);
            const sessionStatus = String(payload.status || "").toLowerCase();
            const passLabel = String(payload.current_pass_kind || "sync").replaceAll("_", " ");
            if (sessionStatus === "completed") {
              setIngestMessage(
                `Sync complete · pass ${Math.max(1, Number(payload.pass_sequence ?? 1) || 1)}/3 · ${passLabel}.`,
              );
              setRunningIngest(false);
              setActiveSyncSessionId(null);
              setActiveSyncSessionStreamConnected(false);
              return;
            }
            if (sessionStatus === "failed" || sessionStatus === "cancelled") {
              setIngestMessage(
                sessionStatus === "cancelled" ? "Sync cancelled." : `Sync failed during ${passLabel}.`,
              );
              setRunningIngest(false);
              setActiveSyncSessionId(null);
              setActiveSyncSessionStreamConnected(false);
              return;
            }
            setIngestMessage(
              `Sync session running · pass ${Math.max(1, Number(payload.pass_sequence ?? 1) || 1)}/3 · ${passLabel}.`,
            );
          },
        });
      } catch (err) {
        if (cancelled || abortController.signal.aborted) return;
        setActiveSyncSessionStreamConnected(false);
        setError(err instanceof Error ? err.message : "Failed to stream sync session");
      }
    };

    void consume();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    activeRunId,
    activeSyncSessionId,
    fetchAnalytics,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    getAuthHeaders,
    runningIngest,
    seasonId,
    seasonNumber,
    showId,
  ]);

  useEffect(() => {
    if (!activeSyncSessionId || !runningIngest) return;
    if (activeSyncSessionStreamConnected) return;
    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      if (cancelled) return;
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/sync-sessions/${activeSyncSessionId}?season_id=${encodeURIComponent(seasonId)}`,
          {
            headers: await getAuthHeaders(),
          },
          { allowDevAdminBypass: true },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Failed to fetch sync session");
        }
        const payload = (await response.json().catch(() => ({}))) as SocialSyncSessionProgressSnapshot;
        if (cancelled) return;
        setActiveSyncSession(payload);
        const snapshot = payload.completeness_snapshot ?? {};
        if (snapshot.comments_coverage && typeof snapshot.comments_coverage === "object") {
          setSyncCommentsCoveragePreview(snapshot.comments_coverage as unknown as CommentsCoverageResponse);
        }
        if (snapshot.asset_coverage && typeof snapshot.asset_coverage === "object") {
          setSyncMirrorCoveragePreview(snapshot.asset_coverage as unknown as MirrorCoverageResponse);
        }
        const nextRunId =
          (typeof payload.current_run_id === "string" && payload.current_run_id.trim().length > 0
            ? payload.current_run_id
            : typeof payload.current_run?.id === "string" && payload.current_run.id.trim().length > 0
              ? payload.current_run.id
              : null) ?? null;
        if (nextRunId && nextRunId !== activeRunId) {
          setActiveRunId(nextRunId);
          setSelectedRunId(nextRunId);
          setJobs([]);
          await fetchJobs(nextRunId);
          await fetchRuns();
          await fetchRunSummaries();
        }
        const sessionStatus = String(payload.status || "").toLowerCase();
        const passLabel = String(payload.current_pass_kind || "sync").replaceAll("_", " ");
        if (sessionStatus === "completed") {
          setIngestMessage(
            `Sync complete · pass ${Math.max(1, Number(payload.pass_sequence ?? 1) || 1)}/3 · ${passLabel}.`,
          );
          setRunningIngest(false);
          setActiveSyncSessionId(null);
          return;
        }
        if (sessionStatus === "failed" || sessionStatus === "cancelled") {
          setIngestMessage(
            sessionStatus === "cancelled"
              ? "Sync cancelled."
              : `Sync failed during ${passLabel}.`,
          );
          setRunningIngest(false);
          setActiveSyncSessionId(null);
          return;
        }
        setIngestMessage(
          `Sync session running · pass ${Math.max(1, Number(payload.pass_sequence ?? 1) || 1)}/3 · ${passLabel}.`,
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to refresh sync session");
      }
      if (cancelled) return;
      timer = window.setTimeout(() => {
        void poll();
      }, 3_000);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [
    activeRunId,
    activeSyncSessionId,
    activeSyncSessionStreamConnected,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    getAuthHeaders,
    runningIngest,
    seasonId,
    seasonNumber,
    showId,
  ]);

  const retryActiveSyncSession = useCallback(
    async (retryKind: "retry_missing_comments" | "retry_failed_media" | "retry_missing_avatars" | "retry_missing_comment_media") => {
      if (!activeSyncSessionId) return;
      setActiveSyncSessionRetryKind(retryKind);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/sync-sessions/${activeSyncSessionId}/retry?season_id=${encodeURIComponent(seasonId)}`,
          {
            method: "POST",
            headers: {
              ...(await getAuthHeaders()),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ retry_kind: retryKind }),
          },
          { allowDevAdminBypass: true },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Failed to retry sync session");
        }
        const payload = (await response.json().catch(() => ({}))) as SocialSyncSessionProgressSnapshot;
        setActiveSyncSession(payload);
        setIngestMessage(`Retry queued for ${retryKind.replaceAll("_", " ")}.`);
        setError(null);
        setRunningIngest(true);
        const nextRunId =
          typeof payload.current_run_id === "string" && payload.current_run_id.trim().length > 0
            ? payload.current_run_id
            : typeof payload.current_run?.id === "string" && payload.current_run.id.trim().length > 0
              ? payload.current_run.id
              : null;
        if (nextRunId) {
          setActiveRunId(nextRunId);
          setSelectedRunId(nextRunId);
          setJobs([]);
          await fetchJobs(nextRunId);
          await fetchRuns();
          await fetchRunSummaries();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to retry sync session");
      } finally {
        setActiveSyncSessionRetryKind(null);
      }
    },
    [
      activeSyncSessionId,
      fetchJobs,
      fetchRunSummaries,
      fetchRuns,
      getAuthHeaders,
      seasonId,
      seasonNumber,
      showId,
    ],
  );

  // Poll for job + run updates using a single-flight loop (no overlapping requests).
  useEffect(() => {
    if (!activeRunId) return;
    if (!hasRunningJobs && !runningIngest) return;
    if (DEV_LOW_HEAT_MODE && !isDocumentVisible) return;

    pollGenerationRef.current += 1;
    const generation = pollGenerationRef.current;
    pollFailureCountRef.current = 0;
    const baseInterval = DEV_LOW_HEAT_MODE ? DEV_VISIBLE_POLL_INTERVAL_MS : runningIngest ? 3_000 : 5_000;
    let timer: number | null = null;
    let cancelled = false;
    let inFlight = false;

    const scheduleNext = () => {
      if (cancelled) return;
      const failureIndex = Math.min(pollFailureCountRef.current, LIVE_POLL_BACKOFF_MS.length - 1);
      const delay = pollFailureCountRef.current > 0 ? LIVE_POLL_BACKOFF_MS[failureIndex] : baseInterval;
      timer = window.setTimeout(() => {
        void poll();
      }, delay);
    };

    const poll = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const [runsResult, jobsResult, workerHealthResult] = await Promise.allSettled([
          fetchRuns({ runId: activeRunId, limit: 1 }),
          fetchJobs(activeRunId, { preserveLastGoodIfEmpty: true, limit: 100 }),
          fetchWorkerHealth(),
        ]);
        if (cancelled || generation !== pollGenerationRef.current) return;

        const runsErrorRaw =
          runsResult.status === "rejected"
            ? runsResult.reason instanceof Error
              ? runsResult.reason.message
              : "Failed to refresh social runs"
            : null;
        const jobsErrorRaw =
          jobsResult.status === "rejected"
            ? jobsResult.reason instanceof Error
              ? jobsResult.reason.message
              : "Failed to refresh social jobs"
            : null;
        const workerHealthErrorRaw =
          workerHealthResult.status === "rejected"
            ? workerHealthResult.reason instanceof Error
              ? workerHealthResult.reason.message
              : "Failed to refresh social worker health"
            : null;
        const runsError = isTransientDevRestartMessage(runsErrorRaw) ? null : runsErrorRaw;
        const jobsError = isTransientDevRestartMessage(jobsErrorRaw) ? null : jobsErrorRaw;
        const workerHealthError = isTransientDevRestartMessage(workerHealthErrorRaw)
          ? null
          : workerHealthErrorRaw;
        const runAndJobsSucceeded = runsResult.status === "fulfilled" && jobsResult.status === "fulfilled";
        const failureMessages = [runsErrorRaw, jobsErrorRaw, workerHealthErrorRaw].filter(
          (message): message is string => Boolean(message && message.trim()),
        );
        const transientRestartWindowFailure =
          failureMessages.length > 0 && failureMessages.every((message) => isTransientDevRestartMessage(message));

        setSectionErrors((current) => ({
          ...current,
          runs: runsError,
          jobs: jobsError,
        }));
        setWorkerHealthError(workerHealthError);

        if (runAndJobsSucceeded) {
          const now = Date.now();
          const refreshInterval = DEV_LOW_HEAT_MODE
            ? DEV_VISIBLE_POLL_INTERVAL_MS
            : runningIngest
              ? ANALYTICS_POLL_REFRESH_ACTIVE_MS
              : ANALYTICS_POLL_REFRESH_MS;
          if (now - lastAnalyticsPollAtRef.current >= refreshInterval) {
            lastAnalyticsPollAtRef.current = now;
            void fetchAnalytics()
              .then(() => {
                setSectionErrors((current) => ({ ...current, analytics: null }));
              })
              .catch((analyticsError) => {
                setSectionErrors((current) => ({
                  ...current,
                  analytics:
                    analyticsError instanceof Error ? analyticsError.message : "Failed to load social analytics",
                }));
              });
          }
        }

        if (runAndJobsSucceeded) {
          pollFailureCountRef.current = 0;
          setPollingStatus((current) => (current === "retrying" ? "recovered" : current));
        } else {
          if (transientRestartWindowFailure) {
            pollFailureCountRef.current = Math.max(1, pollFailureCountRef.current);
          } else {
            pollFailureCountRef.current += 1;
          }
          if (shouldSetPollingRetry(pollFailureCountRef.current)) {
            setPollingStatus("retrying");
          }
        }
      } finally {
        inFlight = false;
        scheduleNext();
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [activeRunId, fetchAnalytics, fetchJobs, fetchRuns, fetchWorkerHealth, hasRunningJobs, isDocumentVisible, runningIngest]);

  useEffect(() => {
    if (pollingStatus !== "recovered") return;
    const timer = window.setTimeout(() => setPollingStatus("idle"), 3000);
    return () => window.clearTimeout(timer);
  }, [pollingStatus]);

  // Tick elapsed timer every second for smooth display
  useEffect(() => {
    if (!runningIngest || !ingestStartedAt) {
      setElapsedTick(0);
      return;
    }
    setElapsedTick(Date.now() - ingestStartedAt.getTime());
    const timer = window.setInterval(() => {
      setElapsedTick(Date.now() - ingestStartedAt.getTime());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runningIngest, ingestStartedAt]);

  const cancelActiveRun = useCallback(async () => {
    if (!activeRunId && !activeSyncSessionId) return;
    setCancellingRun(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetchAdminWithAuth(
        activeSyncSessionId
          ? `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/sync-sessions/${activeSyncSessionId}/cancel`
          : `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/ingest/runs/${activeRunId}/cancel`,
        {
          method: "POST",
          headers,
        },
        { allowDevAdminBypass: true },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to cancel run");
      }

      setIngestMessage(
        activeSyncSessionId ? `Sync session ${activeSyncSessionId.slice(0, 8)} cancelled.` : `Run ${activeRunId?.slice(0, 8)} cancelled.`,
      );
      setRunningIngest(false);
      setIngestingWeek(null);
      setIngestingDay(null);
      setActiveRunRequest(null);
      setSelectedRunId(activeRunId);
      setActiveSyncSessionId(null);
      setActiveSyncSession(null);
      setActiveRunId(null);
      setIngestStartedAt(null);
      setSyncCommentsCoveragePreview(null);
      setSyncMirrorCoveragePreview(null);
      autoSyncSessionRef.current = null;
      await fetchJobs(activeRunId);
      await fetchAnalytics();
      await fetchRuns();
      await fetchRunSummaries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel run");
    } finally {
      setCancellingRun(false);
    }
  }, [
    activeRunId,
    activeSyncSessionId,
    fetchAnalytics,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    getAuthHeaders,
    seasonNumber,
    showId,
  ]);

  const triggerSeasonRunSocialBladeRefresh = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const castResponse = await fetchAdminWithAuth(
        `/api/admin/trr-api/shows/${showId}/cast-role-members?seasons=${seasonNumber}&exclude_zero_episode_members=1`,
        { headers },
        { allowDevAdminBypass: true },
      );
      if (!castResponse.ok) {
        return;
      }

      const castRows = (await castResponse.json().catch(() => [])) as Array<Record<string, unknown>>;
      const items = castRows
        .map((row) => ({
          personId: typeof row.person_id === "string" ? row.person_id : "",
          handle: typeof row.instagram_handle === "string" ? row.instagram_handle.trim() : "",
        }))
        .filter((item) => item.personId && item.handle);
      if (items.length === 0) {
        return;
      }

      await fetchAdminWithAuth(
        "/api/admin/trr-api/social-growth/refresh-batch",
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "season_run",
            items,
          }),
        },
        { allowDevAdminBypass: true },
      );
    } catch (error) {
      console.warn("[season-social-analytics] SocialBlade sidecar refresh failed", error);
    }
  }, [getAuthHeaders, seasonNumber, showId]);

  const runIngest = useCallback(async (override?: {
    week?: number;
    day?: string;
    platform?: "all" | Platform;
    ingestMode?: IngestMode;
    rowMissingOnly?: boolean;
  }) => {
    setRunningIngest(true);
    setError(null);
    setIngestMessage(null);
    setSyncCommentsCoveragePreview(null);
    setSyncMirrorCoveragePreview(null);
    setJobs([]);
    setSelectedRunId(null);
    setActiveRunId(null);
    setActiveSyncSessionId(null);
    setActiveSyncSession(null);
    setIngestStartedAt(new Date());

    const effectivePlatform = override?.platform ?? platformFilter;
    const effectiveDay = override?.day?.trim() ? override.day.trim() : null;
    const effectiveWeek = effectiveDay ? null : (override?.week ?? (weekFilter === "all" ? null : weekFilter));
    const effectiveIngestMode = override?.ingestMode ?? "posts_and_comments";
    const runRowMissingOnly =
      Boolean(override?.rowMissingOnly) &&
      effectiveIngestMode === "comments_only" &&
      effectiveWeek !== null &&
      !effectiveDay;
    setIngestingWeek(effectiveWeek);
    setIngestingDay(effectiveDay);
    setActiveRunRequest({ week: effectiveWeek, day: effectiveDay, platform: effectivePlatform });

    try {
      const headers = await getAuthHeaders();
      const payload: {
        source_scope: Scope;
        platforms?: Platform[];
        accounts_override?: string[];
        hashtags_override?: string[];
        keywords_override?: string[];
        week_index?: number;
        max_posts_per_target: number;
        max_comments_per_post: number;
        max_replies_per_post: number;
        fetch_replies: boolean;
        ingest_mode: IngestMode;
        sync_strategy: SyncStrategy;
        runner_strategy?: "single_runner" | "adaptive_dual_runner";
        runner_count?: number;
        window_shard_hours?: number;
        comment_refresh_policy?: CommentRefreshPolicy;
        comment_anchor_source_ids?: Partial<Record<Platform, string[]>>;
        allow_inline_dev_fallback: boolean;
        date_start?: string;
        date_end?: string;
      } = {
        source_scope: scope,
        max_posts_per_target: 0,
        max_comments_per_post: 5000,
        max_replies_per_post: 1000,
        fetch_replies: false,
        ingest_mode: effectiveIngestMode,
        sync_strategy: syncStrategy,
        allow_inline_dev_fallback: false,
      };
      const label = effectiveDay
        ? formatDayScopeLabel(effectiveDay)
        : effectiveWeek !== null
          ? resolveWeekScopeLabel(effectiveWeek)
          : "Full Season";
      const platformLabel = effectivePlatform === "all" ? "all platforms" : (PLATFORM_LABELS[effectivePlatform] ?? effectivePlatform);
      const modeLabel = syncStrategy === "full_refresh" ? "Full Refresh" : "Incremental";
      let targetedPlatformLabel = platformLabel;
      let rowMissingTargets: MissingCommentTargets | null = null;

      if (effectivePlatform !== "all") {
        payload.platforms = [effectivePlatform];
      }
      if (effectiveDay) {
        const dayRange = buildIsoDayRange(effectiveDay);
        if (!dayRange) {
          throw new Error("Choose a valid day before starting a day ingest.");
        }
        payload.date_start = dayRange.dateStart;
        payload.date_end = dayRange.dateEnd;
      } else if (effectiveWeek !== null) {
        payload.week_index = effectiveWeek;
        const weekWindow =
          (analytics?.weekly ?? []).find((item) => item.week_index === effectiveWeek) ??
          (analytics?.weekly_platform_posts ?? []).find((item) => item.week_index === effectiveWeek);
        if (weekWindow) {
          payload.date_start = weekWindow.start;
          payload.date_end = weekWindow.end;
        } else {
          throw new Error(`Could not resolve date range for week ${effectiveWeek}. Try refreshing the page.`);
        }
      }

      if (runRowMissingOnly) {
        rowMissingTargets = await buildMissingCommentTargets({
          weekIndex: effectiveWeek,
          platform: effectivePlatform,
          sourceScope: scope,
        });
        if (rowMissingTargets.platforms.length === 0 || rowMissingTargets.staleAnchorsCount <= 0) {
          setIngestMessage(`${label} · ${platformLabel} · Comments already Up-to-Date.`);
          setRunningIngest(false);
          setIngestingWeek(null);
          setIngestingDay(null);
          setActiveRunRequest(null);
          setActiveRunId(null);
          setIngestStartedAt(null);
          autoSyncSessionRef.current = null;
          return;
        }
        payload.platforms = rowMissingTargets.platforms;
        payload.comment_refresh_policy = "missing_only";
        if (Object.keys(rowMissingTargets.sourceIdsByPlatform).length > 0) {
          payload.comment_anchor_source_ids = rowMissingTargets.sourceIdsByPlatform;
        }
        targetedPlatformLabel =
          rowMissingTargets.platforms.length === 1
            ? (PLATFORM_LABELS[rowMissingTargets.platforms[0]] ?? rowMissingTargets.platforms[0])
            : `${rowMissingTargets.platforms.length} targeted platforms`;
      }
      const targetOverrides = buildTargetOverrides(payload.platforms ?? null);
      payload.accounts_override = targetOverrides.accounts_override;
      payload.hashtags_override = targetOverrides.hashtags_override;
      payload.keywords_override = targetOverrides.keywords_override;
      const requestedPlatforms =
        payload.platforms && payload.platforms.length > 0
          ? payload.platforms
          : (["instagram", "tiktok", "twitter", "youtube", "facebook", "threads"] as Platform[]);
      const singlePlatform = requestedPlatforms.length === 1;
      const singlePlatformTarget = singlePlatform ? requestedPlatforms[0] : null;
      const igTikTokOnly = requestedPlatforms.every((platform) => platform === "instagram" || platform === "tiktok");
      if (effectiveIngestMode === "comments_only") {
        payload.runner_strategy = "single_runner";
        payload.runner_count = 1;
        payload.window_shard_hours = 12;
      } else if (singlePlatform || igTikTokOnly) {
        payload.runner_strategy = "single_runner";
        payload.runner_count = 1;
        payload.window_shard_hours =
          singlePlatformTarget === "instagram" || singlePlatformTarget === "tiktok" ? 12 : 24;
      } else {
        payload.runner_strategy = "adaptive_dual_runner";
        payload.runner_count = 2;
        payload.window_shard_hours = 6;
      }
      setIngestMessage(`Starting ${label} · ${platformLabel} · ${modeLabel}...`);

      const useSyncSession =
        effectiveIngestMode === "posts_and_comments" &&
        typeof payload.date_start === "string" &&
        payload.date_start.length > 0 &&
        typeof payload.date_end === "string" &&
        payload.date_end.length > 0;

      if (useSyncSession) {
        const syncDateStart = payload.date_start ?? "";
        const syncDateEnd = payload.date_end ?? "";
        const syncSessionPayload = buildSocialSyncSessionRequest({
          sourceScope: payload.source_scope,
          platforms: payload.platforms ?? null,
          dateStart: syncDateStart,
          dateEnd: syncDateEnd,
          accountsOverride: payload.accounts_override,
          hashtagsOverride: payload.hashtags_override,
          keywordsOverride: payload.keywords_override,
        });
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/sync-sessions?season_id=${encodeURIComponent(seasonId)}`,
          {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(syncSessionPayload),
          },
          { allowDevAdminBypass: true },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Failed to start sync session");
        }

        const result = (await response.json().catch(() => ({}))) as {
          status?: string;
          sync_session_id?: string;
          current_pass_kind?: string | null;
          current_pass_attempt?: number;
          current_run_id?: string | null;
          follow_up_reason?: string | null;
          completeness_snapshot?: SocialSyncSessionProgressSnapshot["completeness_snapshot"];
          current_run?: {
            id?: string | null;
            status?: string;
            summary?: Record<string, unknown>;
          } | null;
        };
        if (result.status === "already_up_to_date") {
          setIngestMessage(`${label} · ${targetedPlatformLabel} · Already up to date.`);
          setRunningIngest(false);
          setIngestingWeek(null);
          setIngestingDay(null);
          setActiveRunRequest(null);
          setActiveRunId(null);
          setIngestStartedAt(null);
          autoSyncSessionRef.current = null;
          return;
        }

        const syncSessionId =
          typeof result.sync_session_id === "string" && result.sync_session_id.trim().length > 0
            ? result.sync_session_id
            : null;
        if (!syncSessionId) {
          throw new Error("Sync session started without a session id");
        }

        const runId =
          typeof result.current_run_id === "string" && result.current_run_id.trim().length > 0
            ? result.current_run_id
            : typeof result.current_run?.id === "string" && result.current_run.id.trim().length > 0
              ? result.current_run.id
              : null;
        const jobCount =
          typeof result.current_run?.summary === "object" && result.current_run?.summary
            ? Number(result.current_run.summary.total_jobs ?? 0)
            : 0;
        const statusLabel = result.status === "attached" ? "attached" : "queued";
        setActiveSyncSessionId(syncSessionId);
        setActiveSyncSession({
          sync_session_id: syncSessionId,
          status: typeof result.status === "string" ? result.status : "created",
          season_id: seasonId,
          source_scope: payload.source_scope,
          platforms: (payload.platforms ??
            ["instagram", "tiktok", "twitter", "youtube", "facebook", "threads"]) as SocialSyncSessionProgressSnapshot["platforms"],
          date_start: syncDateStart || null,
          date_end: syncDateEnd || null,
          current_pass_kind: typeof result.current_pass_kind === "string" ? result.current_pass_kind : "posts_and_comments",
          current_pass_attempt:
            typeof result.current_pass_attempt === "number" && Number.isFinite(result.current_pass_attempt)
              ? result.current_pass_attempt
              : 1,
          current_run_id: runId,
          pass_sequence: 1,
          follow_up_reason:
            typeof result.follow_up_reason === "string" && result.follow_up_reason.trim().length > 0
              ? result.follow_up_reason
              : null,
          pass_history: [],
          completeness_snapshot: result.completeness_snapshot ?? {},
          current_run: runId
            ? {
                id: runId,
                status: typeof result.current_run?.status === "string" ? result.current_run.status : "queued",
                summary: result.current_run?.summary,
              }
            : null,
        });
        autoSyncSessionRef.current = null;
        if (runId) {
          setActiveRunId(runId);
          setSelectedRunId(runId);
          await fetchJobs(runId);
        } else {
          setActiveRunId(null);
          setSelectedRunId(null);
        }
        await fetchRuns();
        await fetchRunSummaries();
        void triggerSeasonRunSocialBladeRefresh();
        setIngestMessage(
          `${label} · ${targetedPlatformLabel} · ${modeLabel} — sync session ${syncSessionId.slice(0, 8)} ${statusLabel}${runId ? ` (run ${runId.slice(0, 8)}, ${jobCount} jobs)` : ""}.`,
        );
        return;
      }

      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/ingest?season_id=${encodeURIComponent(seasonId)}`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        { allowDevAdminBypass: true },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as IngestProxyErrorPayload;
        throw new Error(formatIngestErrorMessage(data));
      }

      const result = (await response.json().catch(() => ({}))) as {
        status?: string;
        message?: string;
        run_id?: string;
        operation_id?: string;
        execution_owner?: string;
        execution_backend_canonical?: string;
        execution_mode_canonical?: string;
        stages?: string[];
        queued_or_started_jobs?: number;
      };
      const runId = typeof result.run_id === "string" && result.run_id ? result.run_id : null;
      if (!runId) {
        throw new Error(result.message ?? "Sync started without a run id");
      }
      const executionMetaParts: string[] = [];
      if (typeof result.execution_owner === "string" && result.execution_owner.trim()) {
        executionMetaParts.push(
          result.execution_owner.trim() === "remote_worker"
            ? "remote executor"
            : result.execution_owner.trim()
        );
      }
      if (typeof result.execution_backend_canonical === "string" && result.execution_backend_canonical.trim()) {
        executionMetaParts.push(`backend ${result.execution_backend_canonical.trim()}`);
      }
      if (typeof result.execution_mode_canonical === "string" && result.execution_mode_canonical.trim()) {
        executionMetaParts.push(`mode ${result.execution_mode_canonical.trim()}`);
      }
      if (typeof result.operation_id === "string" && result.operation_id.trim()) {
        executionMetaParts.push(`op ${result.operation_id.trim().slice(0, 8)}`);
      }
      const executionMeta = executionMetaParts.length > 0 ? ` · ${executionMetaParts.join(" · ")}` : "";

      const autoContinueEnabled =
        effectiveIngestMode === "posts_and_comments" ||
        effectiveIngestMode === "comments_only" ||
        effectiveIngestMode === "details_refresh";
      autoSyncGenerationRef.current += 1;
      autoSyncSessionRef.current = {
        week: effectiveWeek,
        day: effectiveDay,
        platform: effectivePlatform,
        ingestMode: effectiveIngestMode,
        rowMissingOnly: runRowMissingOnly,
        dateStart: payload.date_start,
        dateEnd: payload.date_end,
        pass: 1,
        maxPasses: COMMENT_SYNC_MAX_PASSES,
        maxDurationMs: COMMENT_SYNC_MAX_DURATION_MS,
        startedAtMs: Date.now(),
        enabled: autoContinueEnabled,
      };
      if (autoContinueEnabled) {
      }
      setActiveRunId(runId);
      setSelectedRunId(runId);
      void triggerSeasonRunSocialBladeRefresh();

      // Backend returns queued/staged run metadata immediately.
      const stages = (result.stages ?? []).join(" -> ") || "posts -> comments";
      const jobCount = result.queued_or_started_jobs ?? 0;
      if (autoContinueEnabled) {
        setIngestMessage(
          `Pass 1/${COMMENT_SYNC_MAX_PASSES} · ${label} · ${targetedPlatformLabel} · ${modeLabel} — run ${runId} queued (${jobCount} jobs, stages: ${stages})${executionMeta}.`,
        );
      } else {
        setIngestMessage(`${label} · ${targetedPlatformLabel} · ${modeLabel} — run ${runId} queued (${jobCount} jobs, stages: ${stages})${executionMeta}.`);
      }

      // Immediately fetch jobs to pick up the newly created running jobs
      await fetchJobs(runId);
      await fetchRuns();
      await fetchRunSummaries();

      // The hasRunningJobs polling effect will handle ongoing updates.
      // We keep runningIngest=true until polling detects no more running jobs.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run social ingest");
      setIngestMessage(null);
      setRunningIngest(false);
      setCancellingRun(false);
      setIngestingWeek(null);
      setIngestingDay(null);
      setActiveRunRequest(null);
      setSelectedRunId(null);
      setActiveRunId(null);
      setIngestStartedAt(null);
      setSyncCommentsCoveragePreview(null);
      setSyncMirrorCoveragePreview(null);
      autoSyncSessionRef.current = null;
    }
  }, [
    analytics,
    buildTargetOverrides,
    fetchJobs,
    fetchRunSummaries,
    fetchRuns,
    getAuthHeaders,
    buildMissingCommentTargets,
    platformFilter,
    resolveWeekScopeLabel,
    scope,
    seasonId,
    seasonNumber,
    showId,
    syncStrategy,
    triggerSeasonRunSocialBladeRefresh,
    weekFilter,
  ]);

  const downloadExport = useCallback(
    async (format: "csv" | "pdf") => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/export?format=${format}&${queryString}`,
          { headers },
          { allowDevAdminBypass: true },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `Failed to export ${format.toUpperCase()}`);
        }

        const blob = await response.blob();
        const fallbackName = `social_report_${showId}_s${seasonNumber}.${format}`;
        const disposition = response.headers.get("content-disposition") ?? "";
        const filenameMatch = disposition.match(/filename="?([^\";]+)"?/i);
        const filename = filenameMatch?.[1] ?? fallbackName;

        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(objectUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to export ${format.toUpperCase()}`);
      }
    },
    [getAuthHeaders, queryString, seasonNumber, showId]
  );

  const weeklyPlatformRows = useMemo(
    () => [...(analytics?.weekly_platform_posts ?? [])].sort((a, b) => a.week_index - b.week_index),
    [analytics],
  );
  const weeklyPlatformEngagementByWeek = useMemo(() => {
    const map = new Map<number, NonNullable<AnalyticsResponse["weekly_platform_engagement"]>[number]>();
    for (const row of analytics?.weekly_platform_engagement ?? []) {
      map.set(row.week_index, row);
    }
    return map;
  }, [analytics]);
  const hasActiveBackendSaturationError = useMemo(() => {
    return (
      Object.values(sectionErrors).some((message) => isBackendSaturationSectionError(message)) ||
      isBackendSaturationSectionError(runSummaryError) ||
      isBackendSaturationSectionError(workerHealthError) ||
      isBackendSaturationSectionError(sharedStatusError)
    );
  }, [runSummaryError, sectionErrors, sharedStatusError, workerHealthError]);

  useEffect(() => {
    const activeWeeks = new Set(weeklyPlatformRows.map((row) => row.week_index));
    setWeekDetailTokenCountsByWeek((current) => {
      const nextEntries = Object.entries(current).filter(([week]) => activeWeeks.has(Number(week)));
      if (nextEntries.length === Object.keys(current).length) return current;
      return Object.fromEntries(nextEntries) as Record<number, WeekDetailTokenCounts>;
    });
    setWeekDetailHashtagUsageByWeek((current) => {
      const nextEntries = Object.entries(current).filter(([week]) => activeWeeks.has(Number(week)));
      if (nextEntries.length === Object.keys(current).length) return current;
      return Object.fromEntries(nextEntries) as Record<number, WeekDetailHashtagUsage>;
    });
    setWeekDetailTokenCountsLoadingWeeks((current) => {
      const next = new Set([...current].filter((week) => activeWeeks.has(week)));
      if (next.size === current.size) return current;
      return next;
    });
  }, [weeklyPlatformRows]);

  useEffect(() => {
    const requiresTokenMetrics = needsWeekDetailTokenMetrics && (analyticsView === "bravo" || analyticsView === "advanced");
    if (!requiresTokenMetrics && !needsWeekDetailHashtagAnalytics) return;
    if (hasActiveBackendSaturationError) return;
    if (weeklyPlatformRows.length === 0) return;
    const abortControllers = weekDetailAbortControllersRef.current;

    const currentTokenCounts = weekDetailTokenCountsByWeekRef.current;
    const currentLoadingWeeks = weekDetailTokenCountsLoadingWeeksRef.current;
    const missingWeeks = weeklyPlatformRows
      .map((row) => row.week_index)
      .filter(
        (weekIndex) =>
          !(weekIndex in currentTokenCounts) && !currentLoadingWeeks.has(weekIndex),
      );
    if (missingWeeks.length === 0) return;

    let cancelled = false;
    let nextWeekIndex = 0;

    const runWorker = async () => {
      while (nextWeekIndex < missingWeeks.length) {
        const currentIndex = nextWeekIndex;
        nextWeekIndex += 1;
        const weekIndex = missingWeeks[currentIndex];
        if (typeof weekIndex !== "number") continue;

        const requestKey = `${seasonId}:${scope}:${platformFilter}:${weekIndex}`;
        if (weekDetailTokenRequestsRef.current.has(requestKey)) {
          continue;
        }
        weekDetailTokenRequestsRef.current.add(requestKey);
        setWeekDetailTokenCountsLoadingWeeks((current) => {
          const next = new Set(current);
          next.add(weekIndex);
          return next;
        });

        const controller = new AbortController();
        abortControllers.set(requestKey, controller);

        try {
          const detail = await fetchWeekDetail({
            weekIndex,
            platform: platformFilter,
            sourceScope: scope,
            signal: controller.signal,
          });
          if (cancelled) return;
          if (requiresTokenMetrics) {
            const counts = deriveWeekDetailTokenCounts(detail);
            setWeekDetailTokenCountsByWeek((current) => ({
              ...current,
              [weekIndex]: counts,
            }));
          }
          if (needsWeekDetailHashtagAnalytics) {
            const hashtagUsage = deriveWeekDetailHashtagUsage(detail);
            setWeekDetailHashtagUsageByWeek((current) => ({
              ...current,
              [weekIndex]: hashtagUsage,
            }));
          }
        } catch (error) {
          if (cancelled || isAbortError(error)) {
            return;
          }
          if (requiresTokenMetrics) {
            setWeekDetailTokenCountsByWeek((current) => ({
              ...current,
              [weekIndex]: createEmptyWeekDetailTokenCounts(),
            }));
          }
          if (needsWeekDetailHashtagAnalytics) {
            setWeekDetailHashtagUsageByWeek((current) => ({
              ...current,
              [weekIndex]: createEmptyWeekDetailHashtagUsage(),
            }));
          }
        } finally {
          abortControllers.delete(requestKey);
          weekDetailTokenRequestsRef.current.delete(requestKey);
          setWeekDetailTokenCountsLoadingWeeks((current) => {
            const next = new Set(current);
            next.delete(weekIndex);
            return next;
          });
        }
      }
    };

    void Promise.all(
      Array.from({ length: Math.min(WEEK_DETAIL_FETCH_CONCURRENCY, missingWeeks.length) }, () => runWorker()),
    );

    return () => {
      cancelled = true;
      for (const controller of abortControllers.values()) {
        controller.abort();
      }
      abortControllers.clear();
    };
  }, [
    analyticsView,
    fetchWeekDetail,
    hasActiveBackendSaturationError,
    needsWeekDetailHashtagAnalytics,
    needsWeekDetailTokenMetrics,
    platformFilter,
    scope,
    seasonId,
    weeklyPlatformRows,
  ]);

  useEffect(() => {
    const availableWeeks = (analytics?.weekly ?? []).map((row) => row.week_index);
    if (availableWeeks.length === 0) {
      if (weeklyRunWeek !== null) setWeeklyRunWeek(null);
      return;
    }
    if (weeklyRunWeek == null || !availableWeeks.includes(weeklyRunWeek)) {
      setWeeklyRunWeek(availableWeeks[0]);
    }
  }, [analytics, weeklyRunWeek]);
  const { sectionErrorItems, staleFallbackItems } = useMemo(() => {
    const labels: Record<keyof typeof sectionErrors, string> = {
      analytics: "Analytics",
      targets: "Targets",
      runs: "Runs",
      jobs: "Jobs",
    };
    const items = (Object.keys(sectionErrors) as Array<keyof typeof sectionErrors>)
      .filter((key) => Boolean(sectionErrors[key]))
      .map((key) => ({
        key,
        label: labels[key],
        message: sectionErrors[key] as string,
        staleAt:
          key === "analytics" || key === "targets" || key === "runs"
            ? sectionLastSuccessAt[key]
            : null,
      }));
    const staleFallback = items.filter(
      (item) => Boolean(item.staleAt) && isTransientBackendSectionError(item.message),
    );
    const surfaced = items.filter(
      (item) => !Boolean(item.staleAt) || !isTransientBackendSectionError(item.message),
    );
    return { sectionErrorItems: surfaced, staleFallbackItems: staleFallback };
  }, [sectionErrors, sectionLastSuccessAt]);
  const staleFallbackMessage = useMemo(() => {
    if (staleFallbackItems.some((item) => isBackendSaturationSectionError(item.message))) {
      return "Local TRR-Backend is saturated. Showing last successful social data while retrying.";
    }
    return "Showing last successful social data while live refresh retries.";
  }, [staleFallbackItems]);
  const weeklyDailyActivityRows = useMemo(
    () => analytics?.weekly_daily_activity ?? [],
    [analytics],
  );
  const heatmapPlatform: Platform | null = useMemo(() => {
    if (platformTab === "overview") return null;
    return platformTab;
  }, [platformTab]);
  const weeklyHeatmapMaxValue = useMemo(() => {
    const values = weeklyDailyActivityRows.flatMap((weekRow) =>
      weekRow.days.map((day) => getWeeklyDayValue(day, weeklyMetric, heatmapPlatform))
    );
    return Math.max(0, ...values);
  }, [heatmapPlatform, weeklyDailyActivityRows, weeklyMetric]);
  const weeklyHeatmapPostTotals = useMemo(() => {
    const totals = new Map<number, number>();
    for (const weekRow of weeklyDailyActivityRows) {
      const total = weekRow.days.reduce((sum, day) => sum + getWeeklyDayValue(day, "posts", heatmapPlatform), 0);
      totals.set(weekRow.week_index, total);
    }
    return totals;
  }, [heatmapPlatform, weeklyDailyActivityRows]);
  const weeklyHeatmapCommentTotals = useMemo(() => {
    const totals = new Map<number, number>();
    for (const weekRow of weeklyDailyActivityRows) {
      const total = weekRow.days.reduce((sum, day) => sum + getWeeklyDayValue(day, "comments", heatmapPlatform), 0);
      totals.set(weekRow.week_index, total);
    }
    return totals;
  }, [heatmapPlatform, weeklyDailyActivityRows]);
  const weeklyFlagsByWeek = useMemo(() => {
    const grouped = new Map<number, Array<NonNullable<AnalyticsResponse["weekly_flags"]>[number]>>();
    const hiddenCodes = new Set(["drop", "comment_gap"]);
    for (const flag of analytics?.weekly_flags ?? []) {
      if (hiddenCodes.has(flag.code)) continue;
      const current = grouped.get(flag.week_index) ?? [];
      current.push(flag);
      grouped.set(flag.week_index, current);
    }
    return grouped;
  }, [analytics]);
  const dataQuality = analytics?.summary.data_quality;
  const youtubeContentBreakdown = dataQuality?.youtube_content_breakdown;
  const postMetadata = dataQuality?.post_metadata;
  const postMetadataTotalPosts = Math.max(0, Number(postMetadata?.total_posts ?? analytics?.summary.total_posts ?? 0));
  const postMetadataMetricCards = useMemo(
    () => [
      { key: "captions", label: "Captions", value: postMetadata?.captions },
      { key: "tags", label: "Tags", value: postMetadata?.tags },
      { key: "mentions", label: "Mentions", value: postMetadata?.mentions },
      { key: "collaborators", label: "Collaborators", value: postMetadata?.collaborators },
    ],
    [postMetadata?.captions, postMetadata?.collaborators, postMetadata?.mentions, postMetadata?.tags],
  );
  const contentTypeDistributionLines = useMemo(() => {
    const buckets = Array.isArray(postMetadata?.content_types?.buckets) ? postMetadata.content_types.buckets : [];
    return buckets
      .filter((bucket) => bucket && typeof bucket.key === "string")
      .map((bucket) => {
        const key = String(bucket.key || "").toLowerCase();
        const label = key === "photo" ? "Photo" : key === "album" ? "Album" : key === "video" ? "Video" : key === "post" ? "Post" : "Other";
        const pctLabel = formatPctLabel(typeof bucket.pct === "number" ? bucket.pct : null);
        const countLabel = formatInteger(Number(bucket.count ?? 0));
        return `${label} ${pctLabel} (${countLabel})`;
      });
  }, [postMetadata?.content_types?.buckets]);
  const commentsSavedActualSummary = useMemo(() => {
    const totals = weeklyPlatformRows.reduce(
      (acc, week) => {
        const saved = Math.max(0, Number(week.total_comments ?? 0));
        const inferredReported = PLATFORM_ORDER.reduce(
          (sum, platform) => sum + Number(week.reported_comments?.[platform] ?? 0),
          0,
        );
        const reported = Math.max(0, Number(week.total_reported_comments ?? inferredReported));
        return {
          saved: acc.saved + saved,
          reported: acc.reported + reported,
        };
      },
      { saved: 0, reported: 0 },
    );
    const actual = Math.max(totals.saved, totals.reported);
    const pct = actual > 0 ? Math.min(100, (totals.saved * 100) / actual) : null;
    return {
      saved: totals.saved,
      actual,
      pct,
    };
  }, [weeklyPlatformRows]);
  const commentsSavedPctCard = useMemo(() => {
    if (typeof dataQuality?.comments_saved_pct_overall === "number") {
      return dataQuality.comments_saved_pct_overall;
    }
    return commentsSavedActualSummary.pct;
  }, [commentsSavedActualSummary.pct, dataQuality?.comments_saved_pct_overall]);
  const runHealth = useMemo(() => {
    if (runSummaries.length === 0) {
      return {
        successRate: null as number | null,
        medianDurationSeconds: null as number | null,
      };
    }
    const successCandidates = runSummaries
      .map((item) => item.success_rate_pct)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const successRate =
      successCandidates.length > 0
        ? Number((successCandidates.reduce((sum, value) => sum + value, 0) / successCandidates.length).toFixed(1))
        : null;
    const durations = runSummaries
      .map((item) => item.duration_seconds)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0)
      .sort((a, b) => a - b);
    const medianDurationSeconds =
      durations.length === 0
        ? null
        : durations.length % 2 === 1
          ? durations[Math.floor(durations.length / 2)]
          : Math.round((durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2);
    return {
      successRate,
      medianDurationSeconds,
    };
  }, [runSummaries]);
  const castAttitudePrototypeRows = useMemo<CastAttitudePrototypeRow[]>(() => {
    const rows = new Map<string, CastAttitudePrototypeRow>();
    for (const item of analytics?.leaderboards.viewer_discussion ?? []) {
      const entities = extractCastEntityCandidates(String(item.text ?? ""));
      for (const entity of entities) {
        const current =
          rows.get(entity) ??
          {
            entity,
            mentions: 0,
            engagement: 0,
            positive: 0,
            neutral: 0,
            negative: 0,
            netSentiment: 0,
          };
        current.mentions += 1;
        current.engagement += Number(item.engagement ?? 0);
        if (item.sentiment === "positive") current.positive += 1;
        else if (item.sentiment === "negative") current.negative += 1;
        else current.neutral += 1;
        current.netSentiment = current.positive - current.negative;
        rows.set(entity, current);
      }
    }
    return [...rows.values()]
      .filter((row) => row.mentions > 0)
      .sort((a, b) => {
        if (b.mentions !== a.mentions) return b.mentions - a.mentions;
        if (b.engagement !== a.engagement) return b.engagement - a.engagement;
        return a.entity.localeCompare(b.entity);
      })
      .slice(0, 10);
  }, [analytics?.leaderboards.viewer_discussion]);
  const viewerAttitudeByPlatformRows = useMemo<ViewerAttitudePlatformRow[]>(() => {
    const rows = new Map<string, ViewerAttitudePlatformRow>();
    for (const item of analytics?.leaderboards.viewer_discussion ?? []) {
      const key = item.platform;
      const current =
        rows.get(key) ??
        {
          platform: key,
          total: 0,
          positive: 0,
          neutral: 0,
          negative: 0,
        };
      current.total += 1;
      if (item.sentiment === "positive") current.positive += 1;
      else if (item.sentiment === "negative") current.negative += 1;
      else current.neutral += 1;
      rows.set(key, current);
    }
    return [...rows.values()].sort((a, b) => b.total - a.total || a.platform.localeCompare(b.platform));
  }, [analytics?.leaderboards.viewer_discussion]);
  const workerHealthWarning = useMemo(() => {
    if (!workerHealth) {
      return null;
    }
    if (workerHealth.queueEnabled !== true) {
      return null;
    }
    const healthyWorkers = workerHealth.healthyWorkers ?? 0;
    const hasHealthyWorker = workerHealth.healthy === true || healthyWorkers > 0;
    if (hasHealthyWorker) {
      return null;
    }
    const reason = workerHealth.reason ? ` (${workerHealth.reason})` : "";
    return `Queue mode is enabled but no healthy remote executors are reporting${reason}.`;
  }, [workerHealth]);
  const workerHealthUnavailableWarning = useMemo(() => {
    if (!workerHealthError) {
      return null;
    }
    if (isTransientBackendSectionError(workerHealthError)) {
      return `Remote executor health check is temporarily unavailable: ${workerHealthError}`;
    }
    return `Remote executor health check failed: ${workerHealthError}`;
  }, [workerHealthError]);
  const ingestActionsBlockedReason = workerHealthWarning
          ? `${workerHealthWarning} Run Week and ${getWeekSyncActionLabel(platformFilter)} are disabled until executor health recovers.`
    : null;
  const staleRuns = useMemo<StaleRunState[]>(() => {
    const thresholdMs = staleThresholdMinutes * 60_000;
    if (thresholdMs <= 0) {
      return [];
    }
    const jobsByRunId = new Map<string, SocialJob[]>();
    for (const job of jobs) {
      if (!job.run_id) continue;
      const current = jobsByRunId.get(job.run_id) ?? [];
      current.push(job);
      jobsByRunId.set(job.run_id, current);
    }

    const now = Date.now();
    const staleItems: StaleRunState[] = [];
    for (const run of runs) {
      if (!ACTIVE_RUN_STATUSES.has(run.status)) continue;
      const runJobs = jobsByRunId.get(run.id) ?? [];
      const timestamps = [
        parseTimestampMs(run.updated_at),
        parseTimestampMs(run.started_at),
        parseTimestampMs(run.created_at),
        ...runJobs.map((job) => parseTimestampMs(job.updated_at)),
        ...runJobs.map((job) => parseTimestampMs(job.started_at)),
        ...runJobs.map((job) => parseTimestampMs(job.created_at)),
      ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      if (timestamps.length === 0) continue;
      const latestActivityMs = Math.max(...timestamps);
      const ageMs = now - latestActivityMs;
      if (ageMs < thresholdMs) continue;

      const pendingJobs =
        runJobs.length > 0
          ? runJobs.filter((job) => job.status === "queued" || job.status === "pending").length
          : Math.max(0, Number(run.summary?.active_jobs ?? 0));
      const retryingJobs =
        runJobs.length > 0 ? runJobs.filter((job) => job.status === "retrying").length : 0;
      const config = run.config as Record<string, unknown> | undefined;
      const ingestMode =
        typeof config?.ingest_mode === "string" && config.ingest_mode.trim()
          ? config.ingest_mode
          : "unknown";
      staleItems.push({
        runId: run.id,
        ingestMode,
        ageMinutes: Math.max(1, Math.floor(ageMs / 60_000)),
        pendingJobs,
        retryingJobs,
      });
    }
    return staleItems.sort((a, b) => b.ageMinutes - a.ageMinutes || a.runId.localeCompare(b.runId));
  }, [jobs, runs, staleThresholdMinutes]);
  const activeFailureErrorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of runScopedJobs) {
      if (job.status !== "failed" && job.status !== "retrying") continue;
      const code =
        job.job_error_code ??
        ((job.metadata as Record<string, unknown> | undefined)?.job_error_code as string | undefined) ??
        "UNKNOWN";
      const key = String(code || "UNKNOWN").toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  }, [runScopedJobs]);
  const groupedFailureRows = useMemo(() => {
    const groups = new Map<
      string,
      {
        code: string;
        stage: string;
        count: number;
        platforms: Set<string>;
        latestTimestamp: string | null;
        latestTimestampMs: number;
        sampleMessage: string | null;
      }
    >();
    for (const job of runScopedJobs) {
      if (job.status !== "failed" && job.status !== "retrying") continue;
      const code =
        job.job_error_code ??
        ((job.metadata as Record<string, unknown> | undefined)?.job_error_code as string | undefined) ??
        "UNKNOWN";
      const normalizedCode = String(code || "UNKNOWN").toUpperCase();
      const stage = getJobStageLabel(job);
      const key = `${normalizedCode}:${stage}`;
      const timestamp = job.completed_at ?? job.started_at ?? job.created_at ?? null;
      const timestampMs = timestamp ? Date.parse(timestamp) : Number.NaN;
      const current = groups.get(key) ?? {
        code: normalizedCode,
        stage,
        count: 0,
        platforms: new Set<string>(),
        latestTimestamp: null,
        latestTimestampMs: Number.NaN,
        sampleMessage: null,
      };
      current.count += 1;
      current.platforms.add(job.platform);
      if (!Number.isNaN(timestampMs) && (Number.isNaN(current.latestTimestampMs) || timestampMs > current.latestTimestampMs)) {
        current.latestTimestamp = timestamp;
        current.latestTimestampMs = timestampMs;
      }
      if (!current.sampleMessage && typeof job.error_message === "string" && job.error_message.trim()) {
        current.sampleMessage = job.error_message.trim();
      }
      groups.set(key, current);
    }
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        platformsLabel: Array.from(group.platforms)
          .sort((a, b) => (PLATFORM_LABELS[a] ?? a).localeCompare(PLATFORM_LABELS[b] ?? b))
          .map((platform) => PLATFORM_LABELS[platform] ?? platform)
          .join(", "),
      }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          (Number.isNaN(b.latestTimestampMs) ? 0 : b.latestTimestampMs) -
            (Number.isNaN(a.latestTimestampMs) ? 0 : a.latestTimestampMs),
      );
  }, [runScopedJobs]);
  const latestFailureEvents = useMemo(() => {
    return runScopedJobs
      .filter((job) => job.status === "failed" || job.status === "retrying")
      .map((job) => {
        const timestamp = job.completed_at ?? job.started_at ?? job.created_at ?? null;
        const timestampMs = timestamp ? Date.parse(timestamp) : Number.NaN;
        const code =
          job.job_error_code ??
          ((job.metadata as Record<string, unknown> | undefined)?.job_error_code as string | undefined) ??
          "UNKNOWN";
        return {
          id: job.id,
          code: String(code || "UNKNOWN").toUpperCase(),
          stage: getJobStageLabel(job),
          platform: PLATFORM_LABELS[job.platform] ?? job.platform,
          status: job.status,
          message:
            typeof job.error_message === "string" && job.error_message.trim()
              ? job.error_message.trim()
              : "No error message provided",
          timestamp,
          timestampMs: Number.isNaN(timestampMs) ? 0 : timestampMs,
        };
      })
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 5);
  }, [runScopedJobs]);
  const benchmarkSummary = useMemo(() => {
    const benchmark = analytics?.benchmark;
    if (!benchmark) {
      return null;
    }
    const comparison =
      benchmarkCompareMode === "previous"
        ? benchmark.previous_week?.delta_pct
        : benchmark.trailing_3_week_avg?.delta_pct;
    const comparisonLabel = benchmarkCompareMode === "previous"
      ? benchmark.previous_week.week_index == null
        ? "No previous week"
        : `vs Week ${benchmark.previous_week.week_index}`
      : `vs trailing ${benchmark.trailing_3_week_avg.window_size}-week avg`;
    const postsDeltaPct = typeof comparison?.posts === "number" ? comparison.posts : null;
    const commentsDeltaPct = typeof comparison?.comments === "number" ? comparison.comments : null;
    const engagementDeltaPct = typeof comparison?.engagement === "number" ? comparison.engagement : null;
    return {
      weekIndex: benchmark.week_index,
      comparisonLabel,
      postsDeltaPct,
      commentsDeltaPct,
      engagementDeltaPct,
      consistencyScorePct: benchmark.consistency_score_pct ?? {},
    };
  }, [analytics, benchmarkCompareMode]);
  const hashtagPlatformsInScope = useMemo(() => {
    if (platformTab === "overview") return HASHTAG_PLATFORMS;
    return [platformTab];
  }, [platformTab]);
  const hashtagPlatformScope = useMemo(() => new Set<Platform>(hashtagPlatformsInScope), [hashtagPlatformsInScope]);
  const hashtagWeeklyUsage = useMemo(() => {
    return weeklyPlatformRows.map((week) => {
      const usage = weekDetailHashtagUsageByWeek[week.week_index];
      if (!usage) {
        return {
          weekIndex: week.week_index,
          label: week.label ?? formatWeekScopeLabel(week.week_index),
          totalTokens: 0,
          uniqueTokens: 0,
        };
      }
      const scopedTags = new Set<string>();
      let totalTokens = 0;
      for (const platform of HASHTAG_PLATFORMS) {
        if (!hashtagPlatformScope.has(platform)) continue;
        totalTokens += Number(usage.byPlatform[platform] ?? 0);
        for (const tag of Object.keys(usage.tagCountsByPlatform[platform] ?? {})) {
          scopedTags.add(tag);
        }
      }
      return {
        weekIndex: week.week_index,
        label: week.label ?? formatWeekScopeLabel(week.week_index),
        totalTokens,
        uniqueTokens: scopedTags.size,
      };
    });
  }, [hashtagPlatformScope, weekDetailHashtagUsageByWeek, weeklyPlatformRows]);
  const hashtagSeasonCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const week of weeklyPlatformRows) {
      const usage = weekDetailHashtagUsageByWeek[week.week_index];
      if (!usage) continue;
      for (const platform of HASHTAG_PLATFORMS) {
        if (!hashtagPlatformScope.has(platform)) continue;
        for (const [tag, count] of Object.entries(usage.tagCountsByPlatform[platform] ?? {})) {
          counts.set(tag, (counts.get(tag) ?? 0) + Number(count));
        }
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [hashtagPlatformScope, weekDetailHashtagUsageByWeek, weeklyPlatformRows]);
  const hashtagPlatformUsage = useMemo(() => {
    const totals = createEmptyHashtagUsageByPlatform();
    for (const week of weeklyPlatformRows) {
      const usage = weekDetailHashtagUsageByWeek[week.week_index];
      if (!usage) continue;
      for (const platform of HASHTAG_PLATFORMS) {
        if (!hashtagPlatformScope.has(platform)) continue;
        totals[platform] += Number(usage.byPlatform[platform] ?? 0);
      }
    }
    return HASHTAG_PLATFORMS
      .filter((platform) => hashtagPlatformScope.has(platform))
      .map((platform) => ({
        platform,
        label: PLATFORM_LABELS[platform] ?? platform,
        count: totals[platform],
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [hashtagPlatformScope, weekDetailHashtagUsageByWeek, weeklyPlatformRows]);
  const hashtagTotalTokens = useMemo(
    () => hashtagSeasonCounts.reduce((sum, item) => sum + item.count, 0),
    [hashtagSeasonCounts],
  );
  const hashtagTopTag = hashtagSeasonCounts[0] ?? null;
  const hashtagPeakWeek = useMemo(() => {
    if (hashtagWeeklyUsage.length === 0) return null;
    return [...hashtagWeeklyUsage].sort((a, b) => b.totalTokens - a.totalTokens || a.weekIndex - b.weekIndex)[0];
  }, [hashtagWeeklyUsage]);
  const hashtagMaxWeeklyTokens = useMemo(
    () => Math.max(0, ...hashtagWeeklyUsage.map((item) => item.totalTokens)),
    [hashtagWeeklyUsage],
  );
  const hashtagMaxPlatformTokens = useMemo(
    () => Math.max(0, ...hashtagPlatformUsage.map((item) => item.count)),
    [hashtagPlatformUsage],
  );
  const hashtagUsageLoading = useMemo(() => {
    if (!needsWeekDetailHashtagAnalytics) return false;
    return weeklyPlatformRows.some(
      (row) =>
        !(row.week_index in weekDetailHashtagUsageByWeek) && weekDetailTokenCountsLoadingWeeks.has(row.week_index),
    );
  }, [needsWeekDetailHashtagAnalytics, weekDetailHashtagUsageByWeek, weekDetailTokenCountsLoadingWeeks, weeklyPlatformRows]);
  const hashtagUniqueCount = hashtagSeasonCounts.length;
  const isBravoView = analyticsView === "bravo";
  const isSentimentView = analyticsView === "sentiment";
  const isHashtagsView = needsWeekDetailHashtagAnalytics;
  const isAdvancedView = analyticsView === "advanced";
  const isRedditView = analyticsView === "reddit";
  const isCastContentView = analyticsView === "cast-content";
  const castComparisonWindow = useMemo(
    () => deriveCastComparisonWindow(analytics?.weekly),
    [analytics?.weekly],
  );
  const selectedRunLabel = selectedRunId ? (runOptionLabelById.get(selectedRunId) ?? null) : null;
  const platformHandleCounts = useMemo(() => {
    const counts: Record<Platform, number> = {
      instagram: 0,
      tiktok: 0,
      twitter: 0,
      youtube: 0,
      facebook: 0,
      threads: 0,
    };

    for (const platform of Object.keys(counts) as Platform[]) {
      const handles = new Set<string>();
      for (const target of targets) {
        if (target.is_active === false) continue;
        if (String(target.platform || "").trim().toLowerCase() !== platform) continue;
        for (const account of target.accounts ?? []) {
          const normalized = normalizeLinkedAccountHandle(account);
          if (normalized) {
            handles.add(normalized);
          }
        }
      }
      counts[platform] = handles.size;
    }

    return counts;
  }, [normalizeLinkedAccountHandle, targets]);
  const displayedTargets = useMemo(() => {
    if (platformTab === "overview") return targets;
    return targets.filter((target) => target.platform === platformTab);
  }, [platformTab, targets]);
  const selectedPlatformHandles = useMemo(() => {
    if (platformTab === "overview") return [] as string[];

    const handles = new Set<string>();
    for (const target of displayedTargets) {
      if (target.is_active === false) continue;
      for (const account of target.accounts ?? []) {
        const normalized = normalizeLinkedAccountHandle(account);
        if (normalized) {
          handles.add(normalized);
        }
      }
    }
    return [...handles].sort((left, right) => left.localeCompare(right));
  }, [displayedTargets, normalizeLinkedAccountHandle, platformTab]);
  const selectedPlatformHandleTabs = useMemo(
    () =>
      selectedPlatformHandles.map((handle) => {
        const cacheKey = `${platformTab}:${handle}`;
        const summary = linkedAccountSummaries[cacheKey] ?? {};
        return {
          handle,
          avatarUrl: summary.avatar_url ?? null,
          href: buildSocialAccountProfileUrl({ platform: platformTab, handle }),
        };
      }),
    [linkedAccountSummaries, platformTab, selectedPlatformHandles],
  );

  useEffect(() => {
    if (!isActiveView(analyticsView) || platformTab === "overview" || selectedPlatformHandles.length === 0) {
      return;
    }

    const missingHandles = selectedPlatformHandles.filter((handle) => !linkedAccountSummaries[`${platformTab}:${handle}`]);
    if (missingHandles.length === 0) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const headers = await getAuthHeaders();
      const nextEntries: Record<string, LinkedAccountProfileSummary> = {};
      await Promise.allSettled(
        missingHandles.map(async (handle) => {
          const response = await fetchAdminWithAuth(
            `/api/admin/trr-api/social/profiles/${encodeURIComponent(platformTab)}/${encodeURIComponent(handle)}/summary`,
            { headers, cache: "no-store" },
            { allowDevAdminBypass: true },
          );
          if (!response.ok) {
            throw new Error(`Failed to load linked handle summary for ${handle}`);
          }
          const data = (await response.json().catch(() => ({}))) as LinkedAccountProfileSummary;
          nextEntries[`${platformTab}:${handle}`] = {
            avatar_url: typeof data.avatar_url === "string" ? data.avatar_url : null,
            profile_url: typeof data.profile_url === "string" ? data.profile_url : null,
          };
        }),
      );
      if (cancelled || Object.keys(nextEntries).length === 0) {
        return;
      }
      setLinkedAccountSummaries((current) => ({ ...current, ...nextEntries }));
    })();

    return () => {
      cancelled = true;
    };
  }, [analyticsView, getAuthHeaders, isActiveView, linkedAccountSummaries, platformTab, selectedPlatformHandles]);
  const openLeaderboardLightbox = useCallback(
    (
      item: {
        platform: string;
        source_id: string;
        text: string;
        engagement: number;
        url: string;
        timestamp: string;
        hosted_thumbnail_url?: string | null;
        source_thumbnail_url?: string | null;
        thumbnail_url?: string | null;
      },
      sectionTitle: string,
      extraStats: SocialStatsItem[] = [],
    ) => {
      const canonicalThumbnailUrl = getCanonicalLeaderboardThumbnailUrl(item);
      if (!canonicalThumbnailUrl) return;
      const mediaType = detectSocialMediaType(canonicalThumbnailUrl);
      const metadata = buildLeaderboardMediaMetadata({
        item,
        sourceScope: scope,
        showName,
        seasonNumber,
        sectionTitle,
      });
      const stats: SocialStatsItem[] = [
        { label: "Platform", value: PLATFORM_LABELS[item.platform] ?? item.platform },
        { label: "Engagement", value: formatInteger(item.engagement) },
        ...extraStats,
      ];
      const entry: SocialLeaderboardLightboxEntry = {
        id: `${item.platform}-${item.source_id}`,
        src: canonicalThumbnailUrl,
        mediaType,
        posterSrc: canonicalThumbnailUrl,
        alt: `${PLATFORM_LABELS[item.platform] ?? item.platform} social media`,
        metadata,
        stats,
      };
      setLeaderboardLightbox({ entries: [entry], index: 0 });
    },
    [scope, seasonNumber, showName],
  );
  const closeLeaderboardLightbox = useCallback(() => {
    setLeaderboardLightbox(null);
  }, []);

  const ingestExportPopover = (
    <div
      ref={ingestExportPopoverRef}
      role="dialog"
      aria-label="Ingest + Export"
      className="absolute left-0 top-full z-30 mt-3 w-[min(30rem,calc(100vw-3rem))] rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-zinc-900">Ingest + Export</h4>
          <p className="mt-1 text-xs text-zinc-500">
            Run scoped sync jobs or export the current season social dataset.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIngestExportOpen(false)}
          className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
        >
          Close
        </button>
      </div>
      <div className="mt-4 space-y-3 text-sm text-zinc-600">
        <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Sync Mode
          <select
            value={syncStrategy}
            onChange={(event) => setSyncStrategy(event.target.value as SyncStrategy)}
            disabled={runningIngest}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="incremental">Incremental (Recommended)</option>
            <option value="full_refresh">Full Refresh</option>
          </select>
        </label>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Weekly Run</p>
          <div className="mt-2 grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Week
              <select
                value={weeklyRunWeek == null ? "" : String(weeklyRunWeek)}
                onChange={(event) => {
                  const rawValue = event.target.value;
                  if (!rawValue) {
                    setWeeklyRunWeek(null);
                    return;
                  }
                  const parsed = Number.parseInt(rawValue, 10);
                  setWeeklyRunWeek(Number.isFinite(parsed) ? parsed : null);
                }}
                disabled={runningIngest}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select a week</option>
                {(analytics?.weekly ?? []).map((week) => (
                  <option key={`ingest-week-${week.week_index}`} value={week.week_index}>
                    {week.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Platform
              <select
                value={weeklyRunPlatform}
                onChange={(event) => setWeeklyRunPlatform(event.target.value as "all" | Platform)}
                disabled={runningIngest}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="all">All Platforms</option>
                {PLATFORM_ORDER.map((platform) => (
                  <option key={`weekly-platform-${platform}`} value={platform}>
                    {PLATFORM_LABELS[platform]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                if (weeklyRunWeek == null) {
                  setError("Choose a week before running a week ingest.");
                  return;
                }
                void runIngest({ week: weeklyRunWeek, platform: weeklyRunPlatform });
              }}
              disabled={runningIngest || weeklyRunWeek == null}
              className={`w-full rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                runningIngest && ingestingWeek === weeklyRunWeek
                  ? "animate-pulse border-blue-400 bg-blue-50 text-blue-700"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {runningIngest && ingestingWeek === weeklyRunWeek
                ? `Running ${resolveWeekScopeLabel(weeklyRunWeek)}...`
                : "Run Selected Week"}
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Daily Run</p>
          <div className="mt-2 grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Day
              <input
                type="date"
                value={dayFilter}
                onChange={(event) => setDayFilter(event.target.value)}
                disabled={runningIngest}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Platform
              <select
                value={dailyRunPlatform}
                onChange={(event) => setDailyRunPlatform(event.target.value as "all" | Platform)}
                disabled={runningIngest}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="all">All Platforms</option>
                {PLATFORM_ORDER.map((platform) => (
                  <option key={`daily-platform-${platform}`} value={platform}>
                    {PLATFORM_LABELS[platform]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                if (!dayFilter) {
                  setError("Choose a day before running a day-specific sync.");
                  return;
                }
                void runIngest({ day: dayFilter, platform: dailyRunPlatform });
              }}
              disabled={runningIngest || !dayFilter}
              className={`w-full rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                runningIngest && ingestingDay === dayFilter
                  ? "animate-pulse border-blue-400 bg-blue-50 text-blue-700"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {runningIngest && ingestingDay === dayFilter
                ? `Running ${formatDayScopeLabel(dayFilter)}...`
                : "Run Selected Day"}
            </button>
          </div>
        </div>
        <button
          ref={runSeasonIngestButtonRef}
          type="button"
          onClick={() => runIngest()}
          disabled={runningIngest}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {runningIngest ? "Syncing..." : "Run Season Sync (All)"}
        </button>
        {activeRunId && hasRunningJobs && (
          <button
            type="button"
            onClick={() => {
              void cancelActiveRun();
            }}
            disabled={cancellingRun}
            className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancellingRun ? "Cancelling Run..." : `Cancel Active Run (${activeRunId.slice(0, 8)})`}
          </button>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => downloadExport("csv")}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => downloadExport("pdf")}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Export PDF
          </button>
        </div>
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Run scope:{" "}
        <span className="font-semibold text-zinc-700">{activeRunScope.weekLabel}</span>
        {" · "}
        <span className="font-semibold text-zinc-700">{activeRunScope.platformLabel}</span>
        {selectedRunId && (
          <>
            {" · "}
            <span className="font-semibold text-zinc-700">Run {selectedRunId.slice(0, 8)}</span>
          </>
        )}
      </p>
      {selectedRunId && !runningIngest && liveRunLogs.length > 0 && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
          <p className="font-semibold text-zinc-700">Last Run Log</p>
          <div className="mt-1 space-y-0.5">
            {liveRunLogs.slice(0, 4).map((entry) => (
              <p key={entry.id} className="flex items-center gap-2">
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-400">{entry.timestampLabel}</span>
                <span>{entry.message}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  const classificationRulesPanel = (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-xs text-zinc-600 shadow-sm">
      <p className="font-semibold text-zinc-700">
        {platformTab === "overview"
          ? "Classification Rules"
          : `${PLATFORM_LABELS[platformTab] ?? platformTab} Classification Rules`}
      </p>
      <ul className="mt-2 space-y-1">
        {displayedTargets.map((target) => (
          <li key={target.platform}>
            <span className="font-semibold text-zinc-700">{(PLATFORM_LABELS[target.platform] ?? target.platform) + ":"}</span>{" "}
            {(target.accounts ?? []).length > 0 ? (
              <>
                accounts{" "}
                {(target.accounts ?? []).map((account, index) => (
                  <span key={`${target.platform}-${account}`}>
                    {index > 0 ? ", " : ""}
                    <Link
                      href={buildSocialAccountProfileUrl({
                        platform: target.platform,
                        handle: account,
                      }) as Route}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      @{String(account).replace(/^@+/, "")}
                    </Link>
                  </span>
                ))}
                {formatClassificationRuleSummary(target) ? ` · ${formatClassificationRuleSummary(target)}` : ""}
              </>
            ) : (
              formatClassificationRuleSummary(target)
            )}
          </li>
        ))}
        {displayedTargets.length === 0 && (
          <li>
            {platformTab === "overview"
              ? "No active classification rules configured."
              : `No active ${(PLATFORM_LABELS[platformTab] ?? platformTab).toLowerCase()} classification rules configured.`}
          </li>
        )}
      </ul>
    </div>
  );
  const sharedAsyncPipelinePanel =
    sharedStatus || sharedStatusError ? (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-xs text-zinc-600 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-zinc-700">Shared Async Pipeline</p>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
              sharedStatus?.ingest_mode === "shared_account_async" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {sharedStatus?.ingest_mode === "shared_account_async" ? "Production Path" : "Unavailable"}
          </span>
        </div>
        {sharedStatusError ? (
          <p className="mt-2 text-amber-700">{sharedStatusError}</p>
        ) : (
          <>
            <p className="mt-2 text-zinc-600">
              Shared Bravo-owned account scraping feeds this season. These classification rules decide which posts materialize into the existing season tables.
            </p>
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <dt className="font-semibold text-zinc-700">Matched posts</dt>
                <dd>{formatInteger(sharedStatus?.matched_posts ?? 0)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="font-semibold text-zinc-700">Review queue</dt>
                <dd>{formatInteger(sharedStatus?.review_queue_count ?? 0)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="font-semibold text-zinc-700">Retained unassigned</dt>
                <dd>{formatInteger(sharedStatus?.retained_unassigned_count ?? 0)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="font-semibold text-zinc-700">Latest match</dt>
                <dd>{formatDateTime(sharedStatus?.latest_match_at)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "Shared scrape", value: sharedStatus?.shared_scrape_status },
                { label: "Classification", value: sharedStatus?.classification_status },
                { label: "Materialization", value: sharedStatus?.materialization_status },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getSyncStatusTone(item.value?.status)}`}
                >
                  <span>{item.label}</span>
                  <span>{formatSharedPipelineStageSummary(item.value)}</span>
                </span>
              ))}
            </div>
            {sharedStatus?.latest_shared_run?.run_id && (
              <p className="mt-3 text-xs text-zinc-500">
                Latest shared run {sharedStatus.latest_shared_run.run_id.slice(0, 8)} ·{" "}
                {formatSyncStatusLabel(sharedStatus.latest_shared_run.status)} ·{" "}
                {formatDateTime(
                  sharedStatus.latest_shared_run.completed_at ??
                    sharedStatus.latest_shared_run.started_at ??
                    sharedStatus.latest_shared_run.created_at,
                )}
              </p>
            )}
          </>
        )}
      </div>
    ) : null;
  const socialRulePanels = (
    <div className={`grid gap-4 ${sharedAsyncPipelinePanel ? "xl:grid-cols-2" : ""}`}>
      {classificationRulesPanel}
      {sharedAsyncPipelinePanel}
    </div>
  );
  const socialControlsRail = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <button
          ref={ingestExportTriggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={ingestExportOpen}
          onClick={() => {
            setIngestExportOpen((open) => !open);
            if (!ingestExportOpen) {
              window.requestAnimationFrame(() => {
                runSeasonIngestButtonRef.current?.focus();
              });
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
        >
          <span>Ingest + Export</span>
          <svg
            className={`h-4 w-4 transition-transform ${ingestExportOpen ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="m5 7 5 6 5-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {ingestExportOpen && ingestExportPopover}
      </div>
      <label className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 shadow-sm">
        <span>Run</span>
        <select
          aria-label="Run"
          value={selectedRunId ?? ""}
          onChange={(event) => {
            const nextRunId = event.target.value || null;
            setSelectedRunId(nextRunId);
            setSectionErrors((current) => ({ ...current, jobs: null }));
          }}
          disabled={runningIngest}
          title={selectedRunLabel ?? "No Run Selected"}
          className="min-w-[15rem] appearance-none bg-transparent pr-5 text-sm font-semibold normal-case tracking-normal text-zinc-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">No Run Selected</option>
          {runs.map((run) => (
            <option key={run.id} value={run.id}>
              {runOptionLabelById.get(run.id) ??
                `${run.id.slice(0, 8)} · ${run.status} · ${formatDateTime(run.created_at ?? run.started_at ?? run.completed_at)}`}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
  const linkedHandleTabs =
    platformTab !== "overview" && selectedPlatformHandleTabs.length > 0 ? (
      <nav
        className="flex flex-wrap items-center gap-2"
        aria-label={`${PLATFORM_LABELS[platformTab] ?? platformTab} linked handles`}
      >
        <span className="inline-flex items-center rounded-full border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          ALL
        </span>
        {selectedPlatformHandleTabs.map((tab) => (
          <Link
            key={`${platformTab}-${tab.handle}`}
            href={tab.href as Route}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            {tab.avatarUrl ? (
              <Image
                src={tab.avatarUrl}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded-full border border-zinc-200 object-cover"
                unoptimized
              />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[10px] font-bold uppercase text-zinc-500">
                {tab.handle.slice(0, 2)}
              </span>
            )}
            <span>@{tab.handle}</span>
          </Link>
        ))}
      </nav>
    ) : null;
  const shouldRenderInlineControls = !hidePlatformTabs && !externalControlsTarget;
  const shouldRenderPortaledControls = Boolean(hidePlatformTabs && externalControlsTarget);
  const portaledHeaderRail = (
    <div className="space-y-3">
      {linkedHandleTabs}
      {socialControlsRail}
    </div>
  );

  return (
    <div className="space-y-6">
      {!isRedditView && !isCastContentView && (
        <>
          {shouldRenderPortaledControls && externalControlsTarget
            ? createPortal(portaledHeaderRail, externalControlsTarget)
            : null}
          <section
            aria-label="Season social analytics controls"
            className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4 shadow-sm sm:p-6"
          >
            <div className="space-y-4">
              <header className="space-y-3">
                <p className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                  Season Social Analytics
                </p>
                <p className="max-w-2xl text-sm text-zinc-500">
                  Bravo-owned social analytics with viewer sentiment and weekly rollups.
                </p>
                <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-700">
                  <div className="flex items-center gap-2">
                    <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Last Updated</dt>
                    <dd className="font-medium text-zinc-800">{formatDateTimeFromDate(lastUpdated)}</dd>
                  </div>
                  {analytics?.window?.start && analytics?.window?.end && (
                    <div className="flex items-center gap-2">
                      <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Window</dt>
                      <dd className="font-medium text-zinc-800">
                        {formatDateTime(analytics.window.start)} to {formatDateTime(analytics.window.end)}
                      </dd>
                    </div>
                  )}
                </dl>
              </header>

              {!hidePlatformTabs && (
                <nav className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100/70 p-1" aria-label="Social platform tabs">
                  {PLATFORM_TABS.map((tab) => {
                    const isActive = platformTab === tab.key;
                    const tabCount = tab.key === "overview" ? null : platformHandleCounts[tab.key];
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setPlatformTabAndUrl(tab.key);
                        }}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                          isActive
                            ? "bg-white text-zinc-900 shadow-sm"
                            : "text-zinc-600 hover:bg-white/80 hover:text-zinc-900"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <SocialPlatformTabIcon tab={tab.key} />
                          <span>{tabCount === null ? tab.label : `${tab.label} (${tabCount})`}</span>
                        </span>
                      </button>
                    );
                  })}
                </nav>
              )}
              {!hidePlatformTabs ? linkedHandleTabs : null}
              {shouldRenderInlineControls ? socialControlsRail : null}
            </div>

            {(pollingStatus !== "idle" || staleFallbackItems.length > 0 || sectionErrorItems.length > 0) && (
              <div className="mt-4 space-y-2">
                {pollingStatus === "retrying" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Live updates temporarily unavailable. Retrying...
                  </div>
                )}
                {pollingStatus === "recovered" && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Live updates connection restored.
                  </div>
                )}
                {staleFallbackItems.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                    {staleFallbackMessage}
                  </div>
                )}
                {sectionErrorItems.map((item) => (
                  <div key={item.key} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <span className="font-semibold">{item.label}:</span> {item.message}
                    {item.staleAt && (
                      <p className="mt-1 text-xs font-medium text-amber-800">
                        Showing last successful data from {formatDateTimeFromDate(item.staleAt)}.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {ingestMessage && !error && (() => {
        const activeJobs = runScopedJobs;
        const totalJobs = activeJobs.length;
        const completedJobs = activeJobs.filter((j) => j.status === "completed");
        const failedJobs = activeJobs.filter((j) => j.status === "failed");
        const finishedCount = completedJobs.length + failedJobs.length;
        const progressPct = totalJobs > 0 ? Math.round((finishedCount / totalJobs) * 100) : 0;
        const elapsedSec = Math.floor(elapsedTick / 1000);
        const elapsedMin = Math.floor(elapsedSec / 60);
        const elapsedStr = elapsedMin > 0 ? `${elapsedMin}m ${String(elapsedSec % 60).padStart(2, "0")}s` : `${elapsedSec}s`;
        const syncSnapshot = activeSyncSession?.completeness_snapshot ?? null;
        const syncSessionStatus = String(activeSyncSession?.status || "").toLowerCase();
        const syncRetryDisabled = new Set(["initializing", "pass_running", "pass_evaluating", "completing", "cancelling"]).has(syncSessionStatus);

        const getStage = (j: SocialJob) => getJobStageLabel(j);

        const getAccount = (j: SocialJob) =>
          typeof j.config?.account === "string" && j.config.account ? j.config.account : null;

        const postsStageJobs = activeJobs.filter((j) => getStage(j) === "posts");
        const commentsStageJobs = activeJobs.filter((j) => getStage(j) === "comments");
        const mirrorStageJobs = activeJobs.filter((j) => {
          const stage = getStage(j);
          return stage === "media_mirror" || stage === "mirror";
        });

        const stageProgress = (stageJobs: SocialJob[], stageKey: string) => {
          if (stageJobs.length === 0) return null;
          const done = stageJobs.filter((j) => j.status === "completed" || j.status === "failed").length;
          const pct = Math.round((done / stageJobs.length) * 100);
          const items = stageJobs.reduce((s, j) => s + (j.items_found ?? 0), 0);
          const label = STAGE_LABELS_PLAIN[stageKey] ?? stageKey;
          return { label, stageKey, total: stageJobs.length, done, pct, items, jobs: stageJobs };
        };

        const stages = [
          stageProgress(postsStageJobs, "posts"),
          stageProgress(commentsStageJobs, "comments"),
          stageProgress(mirrorStageJobs, "media_mirror"),
        ].filter(Boolean) as
          NonNullable<ReturnType<typeof stageProgress>>[];

        // Per-platform completion stats for summary
        const platformStats = new Map<string, { posts: number; comments: number }>();
        for (const j of completedJobs) {
          const counters = (j.metadata as Record<string, unknown>)?.stage_counters as Record<string, number> | undefined;
          const existing = platformStats.get(j.platform) ?? { posts: 0, comments: 0 };
          existing.posts += counters?.posts ?? 0;
          existing.comments += counters?.comments ?? 0;
          platformStats.set(j.platform, existing);
        }

        // Per-platform grouping for summary rows
        const platformGrouped = new Map<string, SocialJob[]>();
        for (const j of activeJobs) {
          const existing = platformGrouped.get(j.platform) ?? [];
          existing.push(j);
          platformGrouped.set(j.platform, existing);
        }

        const statusDotClass: Record<string, string> = {
          running: "bg-blue-500 animate-pulse",
          completed: "bg-green-500",
          failed: "bg-red-500",
          queued: "bg-zinc-300",
          pending: "bg-zinc-300",
          retrying: "bg-amber-400 animate-pulse",
          cancelled: "bg-zinc-300",
        };
        const statusTextClass: Record<string, string> = {
          running: "text-blue-700",
          completed: "text-green-700",
          failed: "text-red-600",
          queued: "text-zinc-500",
          pending: "text-zinc-500",
          retrying: "text-amber-600",
          cancelled: "text-zinc-400",
        };

        // Derive a friendly header from active platforms
        const activePlatformNames = [...new Set(activeJobs.map((j) => PLATFORM_LABELS[j.platform] ?? j.platform))];
        const friendlyHeader = runningIngest
          ? `Collecting data from ${activePlatformNames.length > 0 ? activePlatformNames.join(", ") : "social platforms"}...`
          : failedJobs.length > 0
            ? `Sync complete with ${failedJobs.length} ${failedJobs.length === 1 ? "error" : "errors"}`
            : "Sync complete";

        return (
          <div className={`rounded-xl border px-5 py-4 text-sm ${
            runningIngest
              ? "border-blue-200 bg-blue-50 text-blue-800"
              : failedJobs.length > 0
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-green-200 bg-green-50 text-green-700"
          }`}>
            {/* Header row: friendly message + elapsed */}
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{friendlyHeader}</p>
              {runningIngest && ingestStartedAt && (
                <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-mono font-semibold text-blue-700 tabular-nums">
                  {elapsedStr}
                </span>
              )}
            </div>

            {/* Overall progress bar */}
            {runningIngest && totalJobs > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {finishedCount} of {totalJobs} tasks complete
                  </span>
                  <span className="font-semibold tabular-nums">{progressPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-blue-200">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${Math.max(2, progressPct)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Per-platform summary rows */}
            {runningIngest && platformGrouped.size > 0 && (
              <div className="mt-3 space-y-1.5">
                {Array.from(platformGrouped.entries())
                  .sort(([a], [b]) => (PLATFORM_LABELS[a] ?? a).localeCompare(PLATFORM_LABELS[b] ?? b))
                  .map(([platform, jobs]) => {
                    const label = PLATFORM_LABELS[platform] ?? platform;
                    const runningJob = jobs.find(
                      (j) => j.status === "running" || j.status === "retrying" || j.status === "cancelling",
                    );
                    const doneCount = jobs.filter((j) => j.status === "completed").length;
                    const failCount = jobs.filter((j) => j.status === "failed").length;
                    const totalCount = jobs.length;
                    const counters = runningJob ? getJobStageCounters(runningJob) : null;
                    const activity = runningJob ? getJobActivity(runningJob) : null;
                    const pStats = platformStats.get(platform);

                    let actionText: string;
                    if (runningJob) {
                      const stageName = STAGE_LABELS_PLAIN[getStage(runningJob)] ?? getStage(runningJob);
                      actionText = stageName;
                      if (counters) {
                        actionText += ` \u2014 ${formatCountersPlain(counters.posts, counters.comments)} found`;
                      }
                      if (activity && typeof activity.pages_scanned === "number" && activity.pages_scanned > 0) {
                        actionText += ` (${activity.pages_scanned} ${activity.pages_scanned === 1 ? "page" : "pages"} scanned)`;
                      }
                    } else if (doneCount + failCount === totalCount) {
                      actionText = pStats
                        ? `Done \u2014 ${formatCountersPlain(pStats.posts, pStats.comments)} collected`
                        : "Done";
                    } else {
                      actionText = "Waiting to start";
                    }

                    const dotClass = runningJob
                      ? "bg-blue-500 animate-pulse"
                      : failCount > 0
                        ? "bg-red-500"
                        : doneCount === totalCount
                          ? "bg-green-500"
                          : "bg-zinc-300";

                    return (
                      <div key={platform} className="flex items-center gap-2 text-xs">
                        <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                        <span className="font-semibold min-w-[5rem]">{label}</span>
                        <span className="text-zinc-600 truncate">{actionText}</span>
                        <span className="ml-auto shrink-0 tabular-nums text-zinc-500">
                          {doneCount} of {totalCount} tasks
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Completed summary with per-platform breakdown */}
            {!runningIngest && completedJobs.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  {Array.from(platformStats.entries())
                    .sort(([a], [b]) => (PLATFORM_LABELS[a] ?? a).localeCompare(PLATFORM_LABELS[b] ?? b))
                    .map(([platform, stats]) => (
                      <span key={platform} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        failedJobs.some((j) => j.platform === platform)
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {PLATFORM_LABELS[platform] ?? platform}
                        <span className="font-semibold tabular-nums">
                          {stats.posts.toLocaleString()} {stats.posts === 1 ? "post" : "posts"}, {stats.comments.toLocaleString()} {stats.comments === 1 ? "comment" : "comments"}
                        </span>
                      </span>
                    ))}
                </div>
                {failedJobs.length > 0 && (
                  <div className="text-xs text-red-600">
                    {failedJobs.length} {failedJobs.length !== 1 ? "tasks" : "task"} failed:{" "}
                    {failedJobs.map((j) => `${PLATFORM_LABELS[j.platform] ?? j.platform} ${STAGE_LABELS_PLAIN[getStage(j)] ?? getStage(j)}`).join(", ")}
                  </div>
                )}
              </div>
            )}

            {/* Expand/collapse toggle for details */}
            <button
              type="button"
              className={`mt-3 flex items-center gap-1 text-xs font-medium ${
                runningIngest ? "text-blue-600 hover:text-blue-800" : "text-zinc-500 hover:text-zinc-700"
              }`}
              onClick={() => setSyncDetailsExpanded((prev) => !prev)}
            >
              {syncDetailsExpanded ? "Hide details" : "Show details"}
              <svg
                className={`h-3 w-3 transition-transform ${syncDetailsExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable details section */}
            {syncDetailsExpanded && (
              <>
                {/* Infrastructure status pills */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                  {workerHealth?.queueEnabled === true ? (
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                      Remote executor health: {workerHealth.healthyWorkers ?? 0} healthy{workerHealth.reason ? ` (${workerHealth.reason})` : ""}
                    </span>
                  ) : (
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">Remote executor: off</span>
                  )}
                  {syncCommentsCoveragePreview && (
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                      {formatInteger(Number(syncCommentsCoveragePreview.total_saved_comments ?? 0))} of{" "}
                      {formatInteger(Number(syncCommentsCoveragePreview.total_reported_comments ?? 0))} comments collected
                    </span>
                  )}
                  {SOCIAL_FULL_SYNC_MIRROR_ENABLED && syncMirrorCoveragePreview && (
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                      Media uploads:{" "}
                      {formatMirrorCoverageLabel(
                        Math.max(
                          0,
                          Number(syncMirrorCoveragePreview.posts_scanned ?? 0) -
                            Number(syncMirrorCoveragePreview.needs_mirror_count ?? 0),
                        ),
                        Number(syncMirrorCoveragePreview.posts_scanned ?? 0),
                      )}{" "}
                      complete, {formatInteger(Number(syncMirrorCoveragePreview.pending_count ?? 0))} pending,{" "}
                      {formatInteger(Number(syncMirrorCoveragePreview.failed_count ?? 0))} failed
                    </span>
                  )}
                </div>
                {buildPreviewPlatformStatuses(syncCommentsCoveragePreview, syncMirrorCoveragePreview).length > 0 && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {buildPreviewPlatformStatuses(syncCommentsCoveragePreview, syncMirrorCoveragePreview).map(
                      ({ platform, status }) => (
                        <div key={`sync-preview-status-${platform}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-zinc-900">{PLATFORM_LABELS[platform] ?? platform}</span>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getSyncStatusTone(status.sync_status, Boolean(status.stale))}`}>
                              {formatSyncStatusLabel(status.sync_status)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                            {status.comment_sync_status && (
                              <span className={`inline-flex rounded-full px-2 py-0.5 ${getSyncStatusTone(status.comment_sync_status.status)}`}>
                                Comments {formatSyncStatusLabel(status.comment_sync_status.status)}
                              </span>
                            )}
                            {status.media_mirror_status && (
                              <span className={`inline-flex rounded-full px-2 py-0.5 ${getSyncStatusTone(status.media_mirror_status.status)}`}>
                                Mirror {formatSyncStatusLabel(status.media_mirror_status.status)}
                              </span>
                            )}
                          </div>
                          {formatActiveJobSummary(status) && (
                            <p className="mt-1 text-[11px] text-zinc-600">{formatActiveJobSummary(status)}</p>
                          )}
                          {(status.last_refresh_reason || status.worker_run_id) && (
                            <p className="mt-1 text-[11px] text-zinc-500">
                              {status.last_refresh_reason ? `Reason: ${status.last_refresh_reason}` : "Reason: n/a"}
                              {status.worker_run_id ? ` · Run ${status.worker_run_id.slice(0, 8)}` : ""}
                            </p>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}

                {/* Raw ingest message for debugging */}
                {ingestMessage && (
                  <p className="mt-2 text-[10px] font-mono text-zinc-400 break-all">{ingestMessage}</p>
                )}

                {activeSyncSession && syncSnapshot && (
                  <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-700">
                      <span className="font-semibold text-zinc-900">Sync Session</span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                        {String(activeSyncSession.display_status || activeSyncSession.status || "Sync").trim()}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                        Pass {Math.max(1, Number(activeSyncSession.pass_sequence ?? 1) || 1)}/3
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                        {String(activeSyncSession.current_pass_kind || "sync").replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5">
                        Attempt {Math.max(1, Number(activeSyncSession.current_pass_attempt ?? 1) || 1)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {activeSyncSession.date_start && activeSyncSession.date_end
                        ? `${activeSyncSession.date_start} to ${activeSyncSession.date_end}`
                        : "Selected window"}
                    </p>
                    {activeSyncSession.status_reason ? (
                      <p className="mt-1 text-[11px] text-zinc-700">{activeSyncSession.status_reason}</p>
                    ) : null}
                    {activeSyncSession.follow_up_dimensions && activeSyncSession.follow_up_dimensions.length > 0 ? (
                      <p className="mt-1 text-[11px] text-zinc-600">
                        Follow-up dimensions: {activeSyncSession.follow_up_dimensions.join(", ")}
                      </p>
                    ) : null}
                    {activeSyncSession.expected_after_current_pass ? (
                      <p className="mt-1 text-[11px] text-zinc-500">{activeSyncSession.expected_after_current_pass}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Incomplete posts {Number(syncSnapshot.incomplete_post_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Missing media {Number(syncSnapshot.missing_asset_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Missing comment media {Number(syncSnapshot.missing_comment_media_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Missing avatars {Number(syncSnapshot.missing_avatar_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Comment targets {Number(syncSnapshot.comment_target_count ?? syncSnapshot.targeted_anchor_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Detail targets {Number(syncSnapshot.detail_target_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Avatar targets {Number(syncSnapshot.avatar_target_count ?? 0)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700">
                        Comment media targets {Number(syncSnapshot.comment_media_target_count ?? 0)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        Number(syncSnapshot.comment_target_count ?? syncSnapshot.targeted_anchor_count ?? 0) > 0
                          ? ["retry_missing_comments", "Retry Comments"]
                          : null,
                        Number(syncSnapshot.detail_target_count ?? 0) > 0 || Number(syncSnapshot.missing_asset_count ?? 0) > 0
                          ? ["retry_failed_media", "Retry Media"]
                          : null,
                        Number(syncSnapshot.avatar_target_count ?? 0) > 0 || Number(syncSnapshot.missing_avatar_count ?? 0) > 0
                          ? ["retry_missing_avatars", "Retry Avatars"]
                          : null,
                        Number(syncSnapshot.comment_media_target_count ?? 0) > 0 ||
                        Number(syncSnapshot.missing_comment_media_count ?? 0) > 0
                          ? ["retry_missing_comment_media", "Retry Comment Media"]
                          : null,
                      ]
                        .filter((value): value is [string, string] => Array.isArray(value))
                        .map(([retryKind, label]) => (
                        <button
                          key={retryKind}
                          type="button"
                          onClick={() => {
                            void retryActiveSyncSession(
                              retryKind as "retry_missing_comments" | "retry_failed_media" | "retry_missing_avatars" | "retry_missing_comment_media",
                            );
                          }}
                          disabled={syncRetryDisabled || activeSyncSessionRetryKind !== null}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {activeSyncSessionRetryKind === retryKind ? "Retrying..." : label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-stage progress */}
                {runningIngest && stages.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {stages.map((s) => {
                      const allDone = s.done === s.total;
                      const hasActive = s.jobs.some(
                        (j) => j.status === "running" || j.status === "retrying" || j.status === "cancelling",
                      );
                      return (
                        <div key={s.stageKey}>
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold tracking-wide">{s.label}</span>
                              {hasActive && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                                  In progress
                                </span>
                              )}
                              {allDone && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                  Complete
                                </span>
                              )}
                            </div>
                            <span className="tabular-nums">{s.done} of {s.total} complete, {s.items.toLocaleString()} items found</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-blue-200">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${Math.max(2, s.pct)}%` }}
                            />
                          </div>
                          {/* Per-platform rows within stage */}
                          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {s.jobs.map((j) => {
                              const counters = getJobStageCounters(j);
                              const persistCounters = getJobPersistCounters(j);
                              const activitySummary = formatJobActivitySummary(getJobActivity(j));
                              const postsFound = counters?.posts ?? 0;
                              const commentsFound = counters?.comments ?? 0;
                              const account = getAccount(j);
                              const jobDuration = j.started_at
                                ? `${Math.round(((j.completed_at ? new Date(j.completed_at).getTime() : Date.now()) - new Date(j.started_at).getTime()) / 1000)}s`
                                : null;
                              return (
                                <div key={j.id} className="flex items-center gap-1.5 rounded bg-white/50 px-2 py-1 text-xs">
                                  <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusDotClass[j.status] ?? "bg-zinc-300"}`} />
                                  <span className="font-semibold">{PLATFORM_LABELS[j.platform] ?? j.platform}</span>
                                  {account && <span className="text-blue-600">@{account}</span>}
                                  <span className={`ml-auto ${statusTextClass[j.status] ?? "text-zinc-500"}`}>
                                    {JOB_STATUS_PLAIN[j.status] ?? j.status}
                                  </span>
                                  {counters ? (
                                    <span className="tabular-nums text-zinc-700">{formatCountersPlain(postsFound, commentsFound)} found</span>
                                  ) : (
                                    <span className="tabular-nums text-zinc-700">{(j.items_found ?? 0).toLocaleString()} items</span>
                                  )}
                                  {persistCounters && (
                                    <span className="tabular-nums text-zinc-500">
                                      {formatCountersPlain(persistCounters.posts_upserted, persistCounters.comments_upserted)} saved
                                    </span>
                                  )}
                                  {activitySummary && <span className="text-zinc-400">{activitySummary}</span>}
                                  {jobDuration && j.status !== "queued" && j.status !== "pending" && (
                                    <span className="tabular-nums text-zinc-400">{jobDuration}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Live activity log (latest events) */}
                {runningIngest && liveRunLogs.length > 0 && (
                  <div className="mt-4 border-t border-blue-200 pt-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600">Activity Log</p>
                    <div className="space-y-0.5">
                      {liveRunLogs.slice(0, 6).map((entry) => (
                        <p key={entry.id} className="flex items-center gap-2 text-xs">
                          <span className="shrink-0 font-mono text-[10px] tabular-nums text-blue-500">{entry.timestampLabel}</span>
                          <span className="text-blue-900">{entry.message}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
          })()}
        </>
      )}

      {isCastContentView ? (
        <CastContentSection
          showId={showId}
          showSlug={showRouteSlug}
          seasonNumber={seasonNumber}
          comparisonWindow={castComparisonWindow}
        />
      ) : isRedditView ? (
        <RedditSourcesManager
          mode="season"
          showId={showId}
          showSlug={showRouteSlug}
          showName={showName}
          seasonId={seasonId}
          seasonNumber={seasonNumber}
        />
      ) : loading && !analytics ? (
        <div data-testid="social-analytics-skeleton" className="space-y-4">
          {(isBravoView || isSentimentView) && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <article
                  key={`summary-skeleton-${index}`}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
                  <div className="mt-3 h-8 w-16 animate-pulse rounded bg-zinc-200" />
                  <div className="mt-2 h-3 w-36 animate-pulse rounded bg-zinc-200" />
                </article>
              ))}
            </section>
          )}
          {(isBravoView || isAdvancedView) && (
            <section className="grid gap-6 xl:grid-cols-3">
              <article className="xl:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
                <div className="mt-4 space-y-3">
                  {[0, 1].map((row) => (
                    <div key={`heatmap-skeleton-${row}`} className="space-y-2">
                      <div className="h-3 w-32 animate-pulse rounded bg-zinc-200" />
                      <div className="grid grid-cols-7 gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50 p-2">
                        {Array.from({ length: 7 }).map((_, idx) => (
                          <div
                            key={`heatmap-skeleton-${row}-${idx}`}
                            className="h-9 w-9 animate-pulse rounded bg-zinc-200 sm:h-10 sm:w-10"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="h-4 w-28 animate-pulse rounded bg-zinc-200" />
                <div className="mt-4 space-y-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={`panel-skeleton-${index}`} className="h-8 animate-pulse rounded bg-zinc-200" />
                  ))}
                </div>
              </article>
            </section>
          )}
          {(isSentimentView || isHashtagsView) && (
            <section className="grid gap-6 xl:grid-cols-2">
              {[0, 1].map((index) => (
                <article key={`detail-skeleton-${index}`} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
                  <div className="mt-4 space-y-2">
                    {[0, 1, 2, 3].map((row) => (
                      <div key={`detail-skeleton-${index}-${row}`} className="h-8 animate-pulse rounded bg-zinc-200" />
                    ))}
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      ) : (
        <>
          {(isBravoView || isSentimentView) && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Content Volume</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{formatCompactInteger(analytics?.summary.total_posts)}</p>
              <p className="mt-1 text-xs text-zinc-500">Bravo posts/videos captured</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Viewer Comments</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{formatCompactInteger(analytics?.summary.total_comments)}</p>
              <p className="mt-1 text-xs text-zinc-500">Comment/reply records persisted</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Engagement</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">
                {formatCompactInteger(analytics?.summary.total_engagement)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Cross-platform interactions</p>
            </article>
            {platformTab === "overview" && analytics?.reddit && (
              <article className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5 shadow-sm" data-testid="reddit-summary-card">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-600">Reddit Coverage</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">
                  {formatCompactInteger(Number(analytics.reddit.tracked_post_count ?? 0))}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  tracked posts · {formatCompactInteger(Number(analytics.reddit.show_match_post_count ?? 0))} show-match ·{" "}
                  {formatCompactInteger(Number(analytics.reddit.comment_count ?? 0))} comments
                </p>
                {analytics.reddit.deep_link?.path && (
                  <Link
                    href={analytics.reddit.deep_link.path as Route}
                    className="mt-2 inline-flex text-xs font-semibold text-orange-700 underline-offset-4 hover:underline"
                  >
                    Open Reddit Manager
                  </Link>
                )}
              </article>
            )}
            {platformTab === "overview" && analytics?.reddit && (
              <article className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm" data-testid="reddit-freshness-card">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-600">Reddit Freshness</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">
                  {formatCompactInteger(Number(analytics.reddit.coverage?.recovered_container_count ?? 0))}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  recovered windows · {formatCompactInteger(Number(analytics.reddit.coverage?.stale_container_count ?? 0))} stale
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Latest Reddit run {formatDateTime(analytics.reddit.freshness?.latest_run_timestamp ?? null)}
                </p>
              </article>
            )}
            <article
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              data-testid="metric-comments-saved-pct-card"
            >
              <p className="mt-2 text-3xl font-bold text-zinc-900" data-testid="metric-comments-saved-pct-value">
                {formatPctLabel(commentsSavedPctCard)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">of Comments Saved</p>
            </article>
            <article
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              data-testid="metric-comments-saved-actual-card"
            >
              <p className="mt-2 text-3xl font-bold text-zinc-900 break-all" data-testid="metric-comments-saved-actual-value">
                {`${formatCompactInteger(commentsSavedActualSummary.saved)}/${formatCompactInteger(commentsSavedActualSummary.actual)}*`}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Comments (Saved/Actual)</p>
            </article>
            {isSentimentView && (
              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Sentiment Mix</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="font-semibold text-emerald-700">
                    Positive {formatPercent(analytics?.summary.sentiment_mix.positive ?? 0)}
                  </p>
                  <p className="font-semibold text-zinc-600">
                    Neutral {formatPercent(analytics?.summary.sentiment_mix.neutral ?? 0)}
                  </p>
                  <p className="font-semibold text-red-700">
                    Negative {formatPercent(analytics?.summary.sentiment_mix.negative ?? 0)}
                  </p>
                </div>
              </article>
            )}
            {platformTab === "youtube" && (
              <>
                <article
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                  data-testid="metric-youtube-videos-card"
                >
                  <p className="mt-2 text-3xl font-bold text-zinc-900" data-testid="metric-youtube-videos-value">
                    {youtubeContentBreakdown
                      ? formatCompactInteger(Number(youtubeContentBreakdown.videos_count ?? 0))
                      : "--"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Videos</p>
                </article>
                <article
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                  data-testid="metric-youtube-reels-card"
                >
                  <p className="mt-2 text-3xl font-bold text-zinc-900" data-testid="metric-youtube-reels-value">
                    {youtubeContentBreakdown
                      ? formatCompactInteger(Number(youtubeContentBreakdown.reels_count ?? 0))
                      : "--"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Reels</p>
                </article>
              </>
            )}
            {postMetadataMetricCards.map((metric) => (
              <article
                key={`post-metadata-${metric.key}`}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                data-testid={`metric-${metric.key}-coverage-card`}
              >
                <p className="mt-2 text-3xl font-bold text-zinc-900" data-testid={`metric-${metric.key}-coverage-value`}>
                  {formatPctLabel(metric.value?.pct)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">of {metric.label} Saved</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {`${formatInteger(Number(metric.value?.posts_with ?? 0))}/${formatInteger(postMetadataTotalPosts)} ${metric.label} (Saved/Posts)`}
                </p>
              </article>
            ))}
            <article
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              data-testid="metric-content-type-distribution-card"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Content Type Distribution</p>
              <div className="mt-2 space-y-1 text-xs text-zinc-700">
                {contentTypeDistributionLines.length > 0 ? (
                  contentTypeDistributionLines.map((line) => <p key={line}>{line}</p>)
                ) : (
                  <p>N/A</p>
                )}
              </div>
            </article>
            </section>
          )}

          {isBravoView && (
            <section className="space-y-6">
              {socialRulePanels}
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-lg font-semibold text-zinc-900">Weekly Trend</h4>
                  <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                    {platformTab === "youtube" && weeklyMetric === "posts"
                      ? "YouTube Posts Schedule"
                      : "Episode-air anchored"}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setWeeklyMetric("posts")}
                    className={`rounded px-2.5 py-1 transition ${
                      weeklyMetric === "posts"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Post Count
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeeklyMetric("comments")}
                    className={`rounded px-2.5 py-1 transition ${
                      weeklyMetric === "comments"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Comment Count
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeeklyMetric("completeness")}
                    className={`rounded px-2.5 py-1 transition ${
                      weeklyMetric === "completeness"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Completeness
                  </button>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setSocialDensity("compact");
                      setSocialPreferenceInUrl(SOCIAL_DENSITY_QUERY_KEY, "compact");
                    }}
                    className={`rounded px-2.5 py-1 transition ${
                      socialDensity === "compact"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSocialDensity("comfortable");
                      setSocialPreferenceInUrl(SOCIAL_DENSITY_QUERY_KEY, null);
                    }}
                    className={`rounded px-2.5 py-1 transition ${
                      socialDensity === "comfortable"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Comfortable
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !socialAlertsEnabled;
                    setSocialAlertsEnabled(next);
                    setSocialPreferenceInUrl(SOCIAL_ALERTS_QUERY_KEY, next ? null : "off");
                  }}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Alerts {socialAlertsEnabled ? "On" : "Off"}
                </button>
              </div>
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Coverage</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {formatPctLabel(dataQuality?.comments_saved_pct_overall)}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Freshness</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {formatFreshnessLabel(dataQuality?.data_freshness_minutes)}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Last Ingest</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {formatDateTime(dataQuality?.last_post_at)}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {weeklyDailyActivityRows.map((weekRow) => {
                  const weekPostTotal = weeklyHeatmapPostTotals.get(weekRow.week_index) ?? 0;
                  const weekCommentTotal = weeklyHeatmapCommentTotals.get(weekRow.week_index) ?? 0;
                  const weekEpisodeLabel = getWeekEpisodeLabel(weekRow, seasonNumber);
                  const heatmapWeekSectionLabel = getHeatmapWeekSectionLabel(weekRow);
                  const weekFlags = socialAlertsEnabled ? (weeklyFlagsByWeek.get(weekRow.week_index) ?? []) : [];
                  return (
                    <div
                      key={weekRow.week_index}
                      className="space-y-1"
                      data-testid={`weekly-heatmap-row-${weekRow.week_index}`}
                    >
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="flex flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span>{heatmapWeekSectionLabel}</span>
                            {weekEpisodeLabel && (
                              <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-700">
                                {weekEpisodeLabel}
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                            {formatDateOnly(weekRow.start)} to {formatDateOnly(weekRow.end)}
                          </span>
                          {weekFlags.length > 0 && (
                            <span className="flex flex-wrap items-center gap-1">
                              {weekFlags.map((flag) => (
                                <button
                                  key={`${weekRow.week_index}-${flag.code}`}
                                  type="button"
                                  onClick={() => {
                                    router.replace(buildWeekDetailHref(weekRow.week_index) as Route, { scroll: false });
                                  }}
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getWeeklyFlagToneClass(flag.severity)}`}
                                  title={flag.message}
                                >
                                  {flag.code.replaceAll("_", " ")}
                                </button>
                              ))}
                            </span>
                          )}
                        </span>
                        <span className="flex flex-col items-end text-right leading-tight">
                          <span data-testid={`weekly-heatmap-total-${weekRow.week_index}`}>
                            {formatInteger(weekPostTotal)} posts
                          </span>
                          <span data-testid={`weekly-heatmap-comments-total-${weekRow.week_index}`}>
                            {formatInteger(weekCommentTotal)} comments
                          </span>
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-zinc-100 bg-zinc-50 p-2">
                        <div
                          className={socialDensity === "comfortable" ? "grid grid-cols-7 gap-1.5" : "inline-grid grid-cols-7 gap-1.5"}
                        >
                        {weekRow.days.map((day) => {
                          const value = getWeeklyDayValue(day, weeklyMetric, heatmapPlatform);
                          const displayLabel =
                            weeklyMetric === "completeness"
                              ? value < 0
                                ? "N/A"
                                : `${(value * 100).toFixed(1)}%`
                              : formatInteger(value);
                          const monthDay = getMonthDayLabel(day.date_local);
                          const [monthLabel, dayLabel] = monthDay.split(" ");
                          return (
                            <div
                              key={`${weekRow.week_index}-${day.day_index}`}
                              data-testid={`weekly-heatmap-day-${weekRow.week_index}-${day.day_index}`}
                              title={`${day.date_local} · ${displayLabel} ${weeklyMetric}`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  router.replace(buildWeekDetailHref(weekRow.week_index, day.date_local) as Route, {
                                    scroll: false,
                                  });
                                }}
                                aria-label={`${weekRow.label} ${day.date_local} ${displayLabel} ${weeklyMetric}`}
                                className={`flex ${socialDensity === "comfortable" ? "h-12 w-full text-[10px]" : "h-9 w-9 sm:h-10 sm:w-10 text-[9px]"} flex-col items-center justify-center rounded px-1 font-semibold tabular-nums ${getHeatmapToneClass({ value, maxValue: weeklyHeatmapMaxValue, metric: weeklyMetric })}`}
                              >
                                <span className="sr-only">{monthDay}</span>
                                <span className="leading-none">{monthLabel}</span>
                                <span className="leading-none">{dayLabel}</span>
                              </button>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(analytics?.weekly?.length ?? 0) > 0 && weeklyDailyActivityRows.length === 0 && (
                  <p data-testid="weekly-heatmap-unavailable" className="text-sm text-zinc-500">
                    Daily schedule unavailable for the current view.
                  </p>
                )}
                {(analytics?.weekly?.length ?? 0) === 0 && (
                  <p className="text-sm text-zinc-500">No weekly data for the current view.</p>
                )}
              </div>
              </article>
            </section>
          )}

          {isAdvancedView && (
            <section className="grid gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-1">
                {socialRulePanels}
              </div>
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-zinc-900">Run Health</h4>
                {runSummariesLoading && runSummaries.length === 0 ? (
                  <div className="mt-4 space-y-2">
                    {[0, 1, 2].map((index) => (
                      <div key={`run-health-skeleton-${index}`} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
                        <div className="mt-2 h-6 w-20 animate-pulse rounded bg-zinc-200" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Success Rate</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-900">
                        {formatPctLabel(runHealth.successRate)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Median Duration</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-900">
                        {formatDurationLabel(runHealth.medianDurationSeconds)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Active Failures</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {activeFailureErrorCounts.length === 0 && (
                          <span className="text-xs text-zinc-500">No active failures</span>
                        )}
                        {activeFailureErrorCounts.map((item) => (
                          <span
                            key={item.code}
                            className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-semibold text-zinc-700"
                          >
                            {item.code}: {item.count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Failure Groups</p>
                      {groupedFailureRows.length === 0 ? (
                        <p className="mt-1 text-xs text-zinc-500">No grouped failures for selected run.</p>
                      ) : (
                        <ul className="mt-1 space-y-1 text-xs">
                          {groupedFailureRows.slice(0, 6).map((group) => (
                            <li key={`${group.code}-${group.stage}`} className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
                              <p className="font-semibold">
                                {group.code} · {group.stage} · {group.count}
                              </p>
                              <p className="text-zinc-500">
                                {group.platformsLabel || "Unknown platform"}
                                {group.latestTimestamp ? ` · ${formatDateTime(group.latestTimestamp)}` : ""}
                              </p>
                              {group.sampleMessage && (
                                <p className="line-clamp-1 text-zinc-500">{group.sampleMessage}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2" data-testid="run-health-latest-failures">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Latest 5 Failure Events
                      </p>
                      {latestFailureEvents.length === 0 ? (
                        <p className="mt-1 text-xs text-zinc-500">No recent failure events.</p>
                      ) : (
                        <ul className="mt-1 space-y-1 text-xs">
                          {latestFailureEvents.map((event) => (
                            <li key={event.id} className="rounded border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
                              <p className="font-semibold">
                                {event.code} · {event.platform} · {event.stage}
                              </p>
                              <p className="text-zinc-500">
                                {formatDateTime(event.timestamp)} · {event.status}
                              </p>
                              <p className="line-clamp-1 text-zinc-500">{event.message}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
                {runSummaryError && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {runSummaryError}
                  </p>
                )}
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-lg font-semibold text-zinc-900">Consistency &amp; Momentum</h4>
                  <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setBenchmarkCompareMode("previous")}
                      className={`rounded px-2 py-1 ${
                        benchmarkCompareMode === "previous"
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500"
                      }`}
                    >
                      Vs Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setBenchmarkCompareMode("trailing")}
                      className={`rounded px-2 py-1 ${
                        benchmarkCompareMode === "trailing"
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-500"
                      }`}
                    >
                      Vs 3wk
                    </button>
                  </div>
                </div>
                {!benchmarkSummary ? (
                  <p className="mt-4 text-sm text-zinc-500">Benchmark data unavailable.</p>
                ) : (
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                      Week {benchmarkSummary.weekIndex} {benchmarkSummary.comparisonLabel}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Posts</p>
                        <p className="mt-1 font-semibold text-zinc-900">
                          {benchmarkSummary.postsDeltaPct == null ? "N/A" : `${benchmarkSummary.postsDeltaPct}%`}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Comments</p>
                        <p className="mt-1 font-semibold text-zinc-900">
                          {benchmarkSummary.commentsDeltaPct == null ? "N/A" : `${benchmarkSummary.commentsDeltaPct}%`}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Engagement</p>
                        <p className="mt-1 font-semibold text-zinc-900">
                          {benchmarkSummary.engagementDeltaPct == null ? "N/A" : `${benchmarkSummary.engagementDeltaPct}%`}
                        </p>
                      </div>
                    </div>
                    <p className="pt-1 text-xs text-zinc-500">
                      Consistency:
                      {" "}
                      {Object.entries(benchmarkSummary.consistencyScorePct)
                        .map(([platform, value]) => `${PLATFORM_LABELS[platform] ?? platform} ${formatPctLabel(value ?? null)}`)
                        .join(" · ") || "N/A"}
                    </p>
                  </div>
                )}
              </article>
            </section>
          )}

          {(isBravoView || isAdvancedView) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-zinc-900">Weekly Bravo Post Count Table</h4>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={toggleAllSocialTableMetrics}
                  className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  {selectedTableMetrics.length === SOCIAL_TABLE_METRIC_KEYS.length ? "Deselect all" : "Select All"}
                </button>
                <div className="flex flex-wrap items-center justify-end gap-1.5" data-testid="weekly-bravo-metric-filter">
                  {SOCIAL_TABLE_METRIC_OPTIONS.map((option) => {
                    const isSelected = selectedTableMetricSet.has(option.key);
                    return (
                      <button
                        key={`table-metric-${option.key}`}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleSocialTableMetric(option.key)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                          isSelected
                            ? "border-zinc-800 bg-zinc-800 text-white"
                            : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    aria-pressed={socialMetricMode === "total"}
                    onClick={() => setSocialMetricMode("total")}
                    className={`rounded-full px-2.5 py-1 transition ${
                      socialMetricMode === "total"
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                    }`}
                  >
                    Total
                  </button>
                  <button
                    type="button"
                    aria-pressed={socialMetricMode === "saved"}
                    onClick={() => setSocialMetricMode("saved")}
                    className={`rounded-full px-2.5 py-1 transition ${
                      socialMetricMode === "saved"
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                    }`}
                  >
                    Saved
                  </button>
                </div>
              </div>
            </div>
            {(ingestActionsBlockedReason || workerHealthUnavailableWarning || staleRuns.length > 0) && (
              <div className="mb-4 space-y-2">
                {ingestActionsBlockedReason && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <span className="font-semibold">Worker Health:</span> {ingestActionsBlockedReason}
                  </div>
                )}
                {workerHealthUnavailableWarning && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <span className="font-semibold">Worker Health:</span> {workerHealthUnavailableWarning}
                  </div>
                )}
                {staleRuns.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                    <p className="font-semibold text-zinc-800">
                      Potentially stalled ingest runs ({staleThresholdMinutes}+ minutes):
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-zinc-600">
                      {staleRuns.map((staleRun) => (
                        <li key={staleRun.runId}>
                          <span className="font-medium">{staleRun.runId.slice(0, 8)}</span> · {staleRun.ingestMode} ·{" "}
                          {staleRun.ageMinutes}m old · pending {staleRun.pendingJobs} · retrying {staleRun.retryingJobs}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-[0.12em] text-zinc-500">
                    <th className="px-3 py-2 font-semibold">Episode</th>
                    <th className="px-3 py-2 font-semibold">Window</th>
                    <th className="px-3 py-2 font-semibold">Instagram</th>
                    <th className="px-3 py-2 font-semibold">YouTube</th>
                    <th className="px-3 py-2 font-semibold">TikTok</th>
                    <th className="px-3 py-2 font-semibold">Twitter/X</th>
                    <th className="px-3 py-2 font-semibold">Total</th>
                    <th className="px-3 py-2 font-semibold">PROGRESS</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyPlatformRows.map((week) => {
                    const totalCoverage = getTotalCoverage(week);
                    const engagementWeek = weeklyPlatformEngagementByWeek.get(week.week_index);
                    const weeklyEngagementTotal = Number(engagementWeek?.total_engagement ?? 0);
                    const detailTokenCounts = weekDetailTokenCountsByWeek[week.week_index];
                    const detailTokenCountsLoading =
                      needsWeekDetailTokenMetrics &&
                      !detailTokenCounts &&
                      weekDetailTokenCountsLoadingWeeks.has(week.week_index);
                    const weekLinkQuery = new URLSearchParams();
                    if (analyticsView !== "bravo") {
                      weekLinkQuery.set("social_view", analyticsView);
                    }
                    if (socialTableMetricsQueryValue) {
                      weekLinkQuery.set(SOCIAL_TABLE_METRICS_QUERY_KEY, socialTableMetricsQueryValue);
                    }
                    if (socialMetricModeQueryValue) {
                      weekLinkQuery.set(SOCIAL_METRIC_MODE_QUERY_KEY, socialMetricModeQueryValue);
                    }
                    const weekSecondaryLabel = getWeeklyTableEpisodeSecondaryLabel(week);
                    const totalCommentsValue =
                      socialMetricMode === "saved"
                        ? week.total_comments
                        : (week.total_reported_comments ?? week.total_comments);
                    const buildMetricTokens = ({
                      postsValue,
                      likesValue,
                      commentsValue,
                      tokenCounts,
                    }: {
                      postsValue: number | null | undefined;
                      likesValue: number | null | undefined;
                      commentsValue: number | null | undefined;
                      tokenCounts: WeekDetailTokenTriplet | null;
                    }): string[] => selectedTableMetrics.map((metric) => {
                      if (metric === "posts") {
                        return formatMetricCountLabel(postsValue, "post");
                      }
                      if (metric === "likes") {
                        return formatMetricCountLabel(likesValue, "like");
                      }
                      if (metric === "comments") {
                        return formatMetricCountLabel(commentsValue, "comment");
                      }
                      if (!tokenCounts) {
                        return `-- ${metric}`;
                      }
                      if (metric === "hashtags") {
                        return formatMetricCountLabel(tokenCounts.hashtags, "hashtag");
                      }
                      if (metric === "mentions") {
                        return formatMetricCountLabel(tokenCounts.mentions, "mention");
                      }
                      if (metric === "collaborators") {
                        return formatMetricCountLabel(tokenCounts.collaborators, "collaborator");
                      }
                      return formatMetricCountLabel(tokenCounts.tags, "tag");
                    });
                    const totalMetricTokens = buildMetricTokens({
                      postsValue: week.total_posts,
                      likesValue: weeklyEngagementTotal,
                      commentsValue: totalCommentsValue,
                      tokenCounts: detailTokenCounts?.total ?? null,
                    });
                    const selectedMetricProgressValues = selectedTableMetrics
                      .map((metric): number | null => {
                        if (metric === "posts") return totalCoverage.postsPct;
                        if (metric === "comments") return totalCoverage.commentsPct;
                        if (metric === "likes") {
                          if (week.total_posts <= 0 && weeklyEngagementTotal <= 0) return null;
                          return engagementWeek?.has_data === false ? 0 : 100;
                        }
                        if (!detailTokenCounts) {
                          return detailTokenCountsLoading ? null : week.total_posts > 0 ? 0 : null;
                        }
                        return week.total_posts > 0 ? 100 : null;
                      })
                      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
                    const selectedMetricProgressPct = selectedMetricProgressValues.length > 0
                      ? Math.min(
                          100,
                          selectedMetricProgressValues.reduce((sum, value) => sum + value, 0) / selectedMetricProgressValues.length,
                        )
                      : null;
                    const totalProgressValue = detailTokenCountsLoading
                      ? "--"
                      : selectedMetricProgressPct == null
                        ? "-"
                        : `${selectedMetricProgressPct.toFixed(1)}%`;
                    const inferredTotalReportedComments = PLATFORM_ORDER.reduce(
                      (sum, platform) => sum + Number(week.reported_comments?.[platform] ?? 0),
                      0,
                    );
                    const totalReportedCommentsForMissing = Number(
                      week.total_reported_comments ?? inferredTotalReportedComments,
                    );
                    const missingCommentsCount = Math.max(
                      0,
                      totalReportedCommentsForMissing - Number(week.total_comments ?? 0),
                    );
                    const missingMetricTokens = selectedTableMetrics
                      .map((metric): string => {
                        if (metric === "posts") {
                          const missingPostsCount = totalCoverage.postsUpToDate ? 0 : Number(week.total_posts ?? 0);
                          return formatMetricCountLabel(missingPostsCount, "post");
                        }
                        if (metric === "likes") {
                          const missingLikesCount = engagementWeek?.has_data === false ? weeklyEngagementTotal : 0;
                          return formatMetricCountLabel(missingLikesCount, "like");
                        }
                        if (metric === "comments") {
                          return formatMetricCountLabel(missingCommentsCount, "comment");
                        }
                        if (metric === "hashtags") {
                          return "-- hashtags";
                        }
                        if (metric === "mentions") {
                          return "-- mentions";
                        }
                        if (metric === "collaborators") {
                          return "-- collaborators";
                        }
                        return "-- tags";
                      });
                    const shouldShowMissingMetrics =
                      !detailTokenCountsLoading &&
                      typeof selectedMetricProgressPct === "number" &&
                      Number.isFinite(selectedMetricProgressPct) &&
                      !isCoveragePctUpToDate(selectedMetricProgressPct) &&
                      missingMetricTokens.length > 0;
                    return (
                      <tr key={`table-week-${week.week_index}`} className="border-b border-zinc-100 text-zinc-700">
                        <td className="px-3 py-2 align-top font-semibold">
                          <Link
                            href={buildSeasonSocialWeekUrl({
                              showSlug: showRouteSlug,
                              seasonNumber,
                              weekIndex: week.week_index,
                              platform: platformTab !== "overview" ? platformTab : undefined,
                              query: weekLinkQuery,
                            }) as Route}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <span className="flex flex-col gap-0.5 leading-tight">
                              <span>{getWeeklyTableEpisodePrimaryLabel(week, seasonNumber)}</span>
                              <span className="text-xs font-normal text-zinc-500">{weekSecondaryLabel}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-zinc-500">
                          {formatDateShort(week.start)} - {formatDateShort(week.end)}
                        </td>
                        {PLATFORM_ORDER.map((platform) => {
                          const coverage = getPlatformCoverage(week, platform);
                          const platformTokenCounts = detailTokenCounts?.byPlatform?.[platform] ?? null;
                          const platformCommentsValue =
                            socialMetricMode === "saved"
                              ? week.comments?.[platform]
                              : (week.reported_comments?.[platform] ?? week.comments?.[platform]);
                          const platformMetricTokens = buildMetricTokens({
                            postsValue: week.posts?.[platform],
                            likesValue: engagementWeek?.engagement?.[platform],
                            commentsValue: platformCommentsValue,
                            tokenCounts: platformTokenCounts,
                          });
                          return (
                            <td key={`${week.week_index}-${platform}`} className="px-3 py-2 align-top">
                              <div className="flex flex-col gap-0.5 leading-tight">
                                <div className="text-[11px] text-zinc-600" data-testid={`weekly-platform-metrics-${platform}-${week.week_index}`}>
                                  {platformMetricTokens.length > 0 ? (
                                    platformMetricTokens.map((token, index) => (
                                      <div key={`${platform}-${week.week_index}-metric-${index}`}>{token}</div>
                                    ))
                                  ) : (
                                    <div className="text-zinc-400">No metrics selected</div>
                                  )}
                                </div>
                                {coverage.upToDate ? (
                                  <div className="text-[11px] text-emerald-700 whitespace-nowrap">Up-to-Date</div>
                                ) : null}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 align-top font-semibold text-zinc-900">
                          <div className="flex flex-col gap-0.5 leading-tight">
                            <div className="text-[11px] font-normal text-zinc-600" data-testid={`weekly-total-metrics-${week.week_index}`}>
                              {totalMetricTokens.length > 0 ? (
                                totalMetricTokens.map((token, index) => (
                                  <div key={`total-${week.week_index}-metric-${index}`}>{token}</div>
                                ))
                              ) : (
                                <div className="text-zinc-400">No metrics selected</div>
                              )}
                            </div>
                            {totalCoverage.upToDate ? (
                              <div className="text-[11px] font-normal text-emerald-700 whitespace-nowrap">Up-to-Date</div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-0.5 text-xs leading-tight text-zinc-700">
                            <span className="whitespace-nowrap">
                              <span className="font-semibold">Total Progress:</span>{" "}
                              <span data-testid={`weekly-total-progress-${week.week_index}`}>{totalProgressValue}</span>
                            </span>
                            {shouldShowMissingMetrics ? (
                              <div className="mt-1 text-[11px] text-zinc-600" data-testid={`weekly-missing-metrics-${week.week_index}`}>
                                {missingMetricTokens.map((token, index) => (
                                  <div key={`missing-${week.week_index}-${index}`}>{token}</div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => runIngest({ week: week.week_index })}
                              disabled={runningIngest || Boolean(ingestActionsBlockedReason)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                runningIngest && ingestingWeek === week.week_index
                                  ? "animate-pulse border-blue-400 bg-blue-50 text-blue-700"
                                  : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                              }`}
                            >
                              {runningIngest && ingestingWeek === week.week_index ? "Syncing..." : "Run Week"}
                            </button>
                            <button
                              type="button"
                              onClick={() => runIngest({ week: week.week_index, ingestMode: "posts_and_comments" })}
                              disabled={runningIngest || Boolean(ingestActionsBlockedReason)}
                              className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {getWeekSyncActionLabel(platformFilter)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {weeklyPlatformRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-sm text-zinc-500" colSpan={9}>
                        No weekly post counts yet for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </section>
          )}

          {isSentimentView && (
            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-2 text-lg font-semibold text-zinc-900">Cast Mention Comparison (Prototype)</h4>
                <p className="mb-4 text-xs text-zinc-500">
                  Heuristic draft: compares candidate cast-name mentions in viewer highlights against sentiment labels.
                </p>
                {castAttitudePrototypeRows.length === 0 ? (
                  <p className="text-sm text-zinc-500">No cast mention candidates detected in viewer highlights yet.</p>
                ) : (
                  <div className="space-y-3">
                    {castAttitudePrototypeRows.map((row) => {
                      const total = Math.max(1, row.mentions);
                      const positivePct = (row.positive / total) * 100;
                      const neutralPct = (row.neutral / total) * 100;
                      const negativePct = Math.max(0, 100 - positivePct - neutralPct);
                      return (
                        <div key={row.entity} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-zinc-900">{row.entity}</p>
                            <p className="text-xs text-zinc-600">
                              {formatInteger(row.mentions)} mentions · {formatInteger(row.engagement)} engagement
                            </p>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded bg-zinc-200">
                            <div className="flex h-full">
                              <span
                                className="h-full bg-emerald-500"
                                style={{ width: `${positivePct}%` }}
                                aria-hidden="true"
                              />
                              <span
                                className="h-full bg-zinc-400"
                                style={{ width: `${neutralPct}%` }}
                                aria-hidden="true"
                              />
                              <span
                                className="h-full bg-red-500"
                                style={{ width: `${negativePct}%` }}
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            +{row.positive} · ={row.neutral} · -{row.negative} · net {row.netSentiment}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-2 text-lg font-semibold text-zinc-900">Viewer Attitude by Platform</h4>
                <p className="mb-4 text-xs text-zinc-500">
                  Early matrix for comparing where audience tone is most positive vs critical.
                </p>
                {viewerAttitudeByPlatformRows.length === 0 ? (
                  <p className="text-sm text-zinc-500">No viewer discussion highlights available.</p>
                ) : (
                  <div className="space-y-2">
                    {viewerAttitudeByPlatformRows.map((row) => {
                      const positivePct = row.total > 0 ? (row.positive / row.total) * 100 : 0;
                      const negativePct = row.total > 0 ? (row.negative / row.total) * 100 : 0;
                      const tone =
                        positivePct === negativePct
                          ? "Balanced"
                          : positivePct > negativePct
                            ? "Positive-leaning"
                            : "Critical-leaning";
                      return (
                        <div key={row.platform} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-zinc-900">
                              {PLATFORM_LABELS[row.platform] ?? row.platform}
                            </p>
                            <p className="text-xs text-zinc-600">{formatInteger(row.total)} highlights</p>
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            +{row.positive} · ={row.neutral} · -{row.negative} · {tone}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          )}

          {(isBravoView || isSentimentView) && (
            <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h4 className="mb-4 text-lg font-semibold text-zinc-900">Platform Sentiment Breakdown</h4>
              <div className="space-y-2">
                {(analytics?.platform_breakdown ?? []).map((platform) => {
                  const label = PLATFORM_LABELS[platform.platform] ?? platform.platform;
                  return (
                    <div
                      key={platform.platform}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between text-sm font-semibold text-zinc-900">
                        <span>{label}</span>
                        <span>{formatInteger(platform.engagement)} engagement</span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatInteger(platform.posts)} posts · {formatInteger(platform.comments)} comments · P {formatInteger(platform.sentiment.positive)} / N {formatInteger(platform.sentiment.neutral)} / Neg {formatInteger(platform.sentiment.negative)}
                      </p>
                    </div>
                  );
                })}
                {(analytics?.platform_breakdown?.length ?? 0) === 0 && (
                  <p className="text-sm text-zinc-500">No platform data available.</p>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h4 className="mb-4 text-lg font-semibold text-zinc-900">Top Sentiment Drivers</h4>
              <p className="-mt-2 mb-4 text-xs text-zinc-500">
                Cast names and social handles are excluded from driver terms.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Positive</p>
                  <ul className="space-y-1 text-sm text-zinc-700">
                    {(analytics?.themes.positive ?? []).slice(0, 8).map((driver) => (
                      <li key={`p-${driver.term}`} className="rounded bg-emerald-50 px-2 py-1">
                        {driver.term} · {driver.count}
                      </li>
                    ))}
                    {(analytics?.themes.positive?.length ?? 0) === 0 && <li className="text-zinc-500">No positive drivers.</li>}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Negative</p>
                  <ul className="space-y-1 text-sm text-zinc-700">
                    {(analytics?.themes.negative ?? []).slice(0, 8).map((driver) => (
                      <li key={`n-${driver.term}`} className="rounded bg-red-50 px-2 py-1">
                        {driver.term} · {driver.count}
                      </li>
                    ))}
                    {(analytics?.themes.negative?.length ?? 0) === 0 && <li className="text-zinc-500">No negative drivers.</li>}
                  </ul>
                </div>
              </div>
            </article>
            </section>
          )}

          {(isBravoView || isSentimentView) && (
            <section className="grid gap-6 xl:grid-cols-2">
              {isBravoView && (
                <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h4 className="mb-4 text-lg font-semibold text-zinc-900">Bravo Content Leaderboard</h4>
                  <div className="space-y-2">
                    {(analytics?.leaderboards.bravo_content ?? []).slice(0, 10).map((item) => {
                      const canonicalThumbnailUrl = getCanonicalLeaderboardThumbnailUrl(item);
                      return (
                      <div
                        key={`${item.platform}-${item.source_id}`}
                        className="block rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:bg-zinc-100"
                      >
                        <div className="flex items-start gap-3">
                          {canonicalThumbnailUrl && (
                            <button
                              type="button"
                              onClick={() => openLeaderboardLightbox(item, "Bravo Content Leaderboard")}
                              className="shrink-0"
                              aria-label="Open leaderboard media lightbox"
                            >
                              {isVideoLikeThumbnailUrl(canonicalThumbnailUrl) ? (
                                <div className="flex h-12 w-12 items-center justify-center rounded-md border border-zinc-200 bg-zinc-900 text-[10px] font-semibold uppercase tracking-wide text-zinc-100">
                                  Video
                                </div>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={canonicalThumbnailUrl}
                                  alt={`${PLATFORM_LABELS[item.platform] ?? item.platform} leaderboard thumbnail`}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="h-12 w-12 rounded-md border border-zinc-200 object-cover"
                                />
                              )}
                            </button>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-semibold text-zinc-900">
                                {PLATFORM_LABELS[item.platform] ?? item.platform}
                              </span>
                              <span className="text-xs text-zinc-500">{formatInteger(item.engagement)} engagement</span>
                            </div>
                            <p className="mt-1 text-sm text-zinc-700 line-clamp-2">{item.text || item.source_id}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                              >
                                Open Post
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                    {(analytics?.leaderboards.bravo_content?.length ?? 0) === 0 && (
                      <p className="text-sm text-zinc-500">No content leaderboard entries yet.</p>
                    )}
                  </div>
                </article>
              )}

              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-4 text-lg font-semibold text-zinc-900">Viewer Discussion Highlights</h4>
                <div className="space-y-2">
                  {(analytics?.leaderboards.viewer_discussion ?? []).slice(0, 10).map((item) => {
                    const canonicalThumbnailUrl = getCanonicalLeaderboardThumbnailUrl(item);
                    return (
                    <div
                      key={`${item.platform}-${item.source_id}`}
                      className="block rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:bg-zinc-100"
                    >
                      <div className="flex items-start gap-3">
                        {canonicalThumbnailUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              openLeaderboardLightbox(item, "Viewer Discussion Highlights", [
                                { label: "Sentiment", value: item.sentiment.toUpperCase() },
                              ])
                            }
                            className="shrink-0"
                            aria-label="Open discussion media lightbox"
                          >
                            {isVideoLikeThumbnailUrl(canonicalThumbnailUrl) ? (
                              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-zinc-200 bg-zinc-900 text-[10px] font-semibold uppercase tracking-wide text-zinc-100">
                                Video
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={canonicalThumbnailUrl}
                                alt={`${PLATFORM_LABELS[item.platform] ?? item.platform} discussion thumbnail`}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="h-12 w-12 rounded-md border border-zinc-200 object-cover"
                              />
                            )}
                          </button>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-xs uppercase tracking-[0.15em] text-zinc-500">
                            <span>{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
                            <span>{item.sentiment}</span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-700 line-clamp-3">{item.text}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                            >
                              Open Post
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  {(analytics?.leaderboards.viewer_discussion?.length ?? 0) === 0 && (
                    <p className="text-sm text-zinc-500">No viewer discussion highlights yet.</p>
                  )}
                </div>
              </article>
            </section>
          )}

          {isHashtagsView && (
            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-2">
                <h4 className="mb-3 text-lg font-semibold text-zinc-900">Hashtag Insights</h4>
                <p className="-mt-1 mb-4 text-xs text-zinc-500">
                  Season-wide hashtag usage across social posts in the selected platform scope.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Total Uses</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900" data-testid="hashtag-insights-total-uses">
                      {formatInteger(hashtagTotalTokens)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Unique Hashtags</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900" data-testid="hashtag-insights-unique-tags">
                      {formatInteger(hashtagUniqueCount)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Top Hashtag</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900" data-testid="hashtag-insights-top-tag">
                      {hashtagTopTag ? `#${hashtagTopTag.tag}` : "-"}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {hashtagTopTag ? `${formatInteger(hashtagTopTag.count)} uses` : "No hashtag activity yet"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Peak Week</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900" data-testid="hashtag-insights-peak-week">
                      {hashtagPeakWeek && hashtagPeakWeek.totalTokens > 0 ? hashtagPeakWeek.label : "-"}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {hashtagPeakWeek && hashtagPeakWeek.totalTokens > 0
                        ? `${formatInteger(hashtagPeakWeek.totalTokens)} uses`
                        : "No hashtag activity yet"}
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-3 text-lg font-semibold text-zinc-900">Hashtags</h4>
                <p className="-mt-1 mb-4 text-xs text-zinc-500">
                  Top hashtag usage with total seasonal share.
                </p>
                {hashtagUsageLoading ? (
                  <p className="text-sm text-zinc-500">Loading hashtag analytics...</p>
                ) : hashtagSeasonCounts.length === 0 ? (
                  <p className="text-sm text-zinc-500">No hashtags found in season social posts for this scope.</p>
                ) : (
                  <ul className="space-y-2">
                    {hashtagSeasonCounts.slice(0, 30).map((item, index) => {
                      const sharePct = hashtagTotalTokens > 0 ? (item.count / hashtagTotalTokens) * 100 : 0;
                      return (
                        <li
                          key={item.tag}
                          data-testid={`hashtag-leaderboard-row-${index}`}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
                        >
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="font-semibold text-zinc-800">#{item.tag}</span>
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                              {formatInteger(item.count)} use{item.count === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-zinc-200">
                              <div
                                className="h-1.5 rounded-full bg-zinc-700"
                                style={{ width: `${Math.min(100, Math.max(0, sharePct))}%` }}
                              />
                            </div>
                            <span className="text-xs text-zinc-500">{sharePct.toFixed(1)}%</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-3 text-lg font-semibold text-zinc-900">Weekly Hashtag Usage</h4>
                <p className="-mt-1 mb-4 text-xs text-zinc-500">
                  Total hashtag tokens used per week across season social posts.
                </p>
                {hashtagUsageLoading ? (
                  <p className="text-sm text-zinc-500">Loading hashtag analytics...</p>
                ) : hashtagWeeklyUsage.length === 0 ? (
                  <p className="text-sm text-zinc-500">No weekly hashtag data available.</p>
                ) : (
                  <div className="space-y-2">
                    {hashtagWeeklyUsage.map((item) => {
                      const widthPct =
                        hashtagMaxWeeklyTokens > 0 ? (item.totalTokens / hashtagMaxWeeklyTokens) * 100 : 0;
                      return (
                        <div
                          key={`hashtag-week-${item.weekIndex}`}
                          data-testid={`hashtag-weekly-usage-row-${item.weekIndex}`}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold text-zinc-800">{item.label}</span>
                            <span className="text-xs text-zinc-500">
                              {formatInteger(item.totalTokens)} uses · {formatInteger(item.uniqueTokens)} unique
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-200">
                            <div
                              className="h-2 rounded-full bg-zinc-700"
                              style={{ width: `${Math.min(100, Math.max(0, widthPct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-2">
                <h4 className="mb-3 text-lg font-semibold text-zinc-900">Platform Hashtag Distribution</h4>
                <p className="-mt-1 mb-4 text-xs text-zinc-500">
                  Share of hashtag usage by platform for the selected scope.
                </p>
                {hashtagUsageLoading ? (
                  <p className="text-sm text-zinc-500">Loading hashtag analytics...</p>
                ) : hashtagPlatformUsage.length === 0 || hashtagTotalTokens === 0 ? (
                  <p className="text-sm text-zinc-500">No platform hashtag distribution available.</p>
                ) : (
                  <div className="space-y-2">
                    {hashtagPlatformUsage.map((item) => {
                      const widthPct =
                        hashtagMaxPlatformTokens > 0 ? (item.count / hashtagMaxPlatformTokens) * 100 : 0;
                      const sharePct = hashtagTotalTokens > 0 ? (item.count / hashtagTotalTokens) * 100 : 0;
                      return (
                        <div
                          key={`hashtag-platform-${item.platform}`}
                          data-testid={`hashtag-platform-usage-row-${item.platform}`}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold text-zinc-800">{item.label}</span>
                            <span className="text-xs text-zinc-500">
                              {formatInteger(item.count)} uses · {sharePct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-200">
                            <div
                              className="h-2 rounded-full bg-zinc-700"
                              style={{ width: `${Math.min(100, Math.max(0, widthPct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          )}

          {(isBravoView || isAdvancedView) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={() => setJobsOpen((c) => !c)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-semibold text-zinc-900">Ingest Job Status</h4>
                {runScopedJobs.length > 0 && (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                    {runScopedJobs.length} job{runScopedJobs.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-zinc-500">{jobsOpen ? "Hide" : "Show"}</span>
            </button>
            {jobsOpen && (<>
            <div className="mt-4 mb-4 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void refreshSelectedRunJobs();
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Refresh Jobs
              </button>
            </div>
            <div className="space-y-2">
              {(() => {
                const statusOrder: Record<string, number> = { running: 0, retrying: 1, queued: 2, pending: 3, failed: 4, completed: 5, cancelled: 6 };
                const statusBadge: Record<string, string> = {
                  completed: "bg-green-100 text-green-700",
                  failed: "bg-red-100 text-red-700",
                  running: "bg-blue-100 text-blue-700 animate-pulse",
                  pending: "bg-zinc-100 text-zinc-600",
                  queued: "bg-zinc-100 text-zinc-600",
                  retrying: "bg-amber-100 text-amber-700 animate-pulse",
                  cancelled: "bg-zinc-100 text-zinc-400",
                };
                const sorted = [...runScopedJobs].sort(
                  (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
                );
                return sorted.map((job) => {
                  const stage = getJobStageLabel(job);
                  const account = typeof job.config?.account === "string" && job.config.account ? job.config.account : null;
                  const counters = getJobStageCounters(job);
                  const persistCounters = getJobPersistCounters(job);
                  const activitySummary = formatJobActivitySummary(getJobActivity(job));
                  const retrievalMeta = (job.metadata as Record<string, unknown>)?.retrieval_meta as
                    | Record<string, unknown>
                    | undefined;
                  const missingMarked =
                    typeof retrievalMeta?.comments_marked_missing === "number"
                      ? retrievalMeta.comments_marked_missing
                      : null;
                  const incompleteFetches =
                    typeof retrievalMeta?.incomplete_comment_fetches === "number"
                      ? retrievalMeta.incomplete_comment_fetches
                      : null;
                  const refreshDecisionCount = (() => {
                    const value = retrievalMeta?.comment_refresh_decisions;
                    if (!value || typeof value !== "object") return 0;
                    return Object.keys(value as Record<string, unknown>).length;
                  })();
                  const duration =
                    job.started_at && job.completed_at
                      ? `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s`
                      : job.started_at
                        ? `${Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)}s`
                        : null;
                  const isActive =
                    job.status === "running" || job.status === "retrying" || job.status === "cancelling";
                  return (
                    <div key={job.id} className={`rounded-lg border px-3 py-2 ${
                      isActive ? "border-blue-200 bg-blue-50" : job.status === "failed" ? "border-red-200 bg-red-50" : "border-zinc-200 bg-zinc-50"
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900">
                            {PLATFORM_LABELS[job.platform] ?? job.platform}
                          </span>
                          {account && <span className="text-xs text-zinc-500">@{account}</span>}
                          <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
                            {STAGE_LABELS_PLAIN[stage] ?? stage}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[job.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                            {JOB_STATUS_PLAIN[job.status] ?? job.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          {counters ? (
                            <span className="font-semibold tabular-nums text-zinc-700">
                              {formatCountersPlain(counters.posts, counters.comments)} found
                            </span>
                          ) : (
                            <span className="font-semibold tabular-nums text-zinc-700">{(job.items_found ?? 0).toLocaleString()} items</span>
                          )}
                          {persistCounters && (
                            <span className="tabular-nums text-zinc-500">
                              {formatCountersPlain(persistCounters.posts_upserted, persistCounters.comments_upserted)} saved
                            </span>
                          )}
                          {activitySummary && <span className="text-zinc-400">{activitySummary}</span>}
                          {duration && <span className="tabular-nums text-zinc-400">{duration}</span>}
                        </div>
                      </div>
                      {job.error_message && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedJobErrors((prev) => {
                                const next = new Set(prev);
                                if (next.has(job.id)) {
                                  next.delete(job.id);
                                } else {
                                  next.add(job.id);
                                }
                                return next;
                              })
                            }
                            className="text-xs text-red-500 underline"
                          >
                            {expandedJobErrors.has(job.id) ? "Hide error" : "Show error"}
                          </button>
                          {expandedJobErrors.has(job.id) && (
                            <pre className="mt-1 max-h-32 overflow-auto rounded bg-red-50 p-2 text-[10px] text-red-700">
                              {job.error_message}
                            </pre>
                          )}
                        </div>
                      )}
                      {job.status === "failed" && (
                        <div className="mt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const retryPlatform = PLATFORM_ORDER.includes(job.platform as Platform)
                                ? (job.platform as Platform)
                                : "all";
                              const retryMode = stage === "comments" ? "comments_only" : "posts_only";
                              void runIngest({ platform: retryPlatform, ingestMode: retryMode });
                            }}
                            disabled={runningIngest}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
                          >
                            Retry Failed Stage
                          </button>
                        </div>
                      )}
                      {(missingMarked !== null || incompleteFetches !== null || refreshDecisionCount > 0) && (
                        <p className="mt-1.5 text-xs text-zinc-500">
                          {missingMarked !== null ? `Missing flagged: ${missingMarked}` : "Missing flagged: 0"}
                          {incompleteFetches !== null ? ` · Incomplete fetches: ${incompleteFetches}` : ""}
                          {refreshDecisionCount > 0 ? ` · Decision reasons: ${refreshDecisionCount}` : ""}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-zinc-400">
                        {job.started_at ? `Started ${formatDateTime(job.started_at)}` : `Created ${formatDateTime(job.created_at)}`}
                        {job.completed_at ? ` · Done ${formatDateTime(job.completed_at)}` : ""}
                      </p>
                    </div>
                  );
                });
              })()}
              {!selectedRunId && (
                <p className="text-sm text-zinc-500">No run selected. Pick a run above or use Ingest + Export to start one.</p>
              )}
              {selectedRunId && runScopedJobs.length === 0 && (
                <p className="text-sm text-zinc-500">No jobs found for the selected run yet.</p>
              )}
            </div>
            </>)}
            </section>
          )}

          {(isBravoView || isAdvancedView) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={() => setManualSourcesOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              <span>Manual Sources (Fallback)</span>
              <span>{manualSourcesOpen ? "Hide" : "Show"}</span>
            </button>
            {manualSourcesOpen && (
              <div className="mt-4">
                <SocialPostsSection showId={showId} showName={showName} seasonId={seasonId} />
              </div>
            )}
            </section>
          )}
        </>
      )}
      {leaderboardLightbox && leaderboardLightbox.entries[leaderboardLightbox.index] && (
        <ImageLightbox
          src={leaderboardLightbox.entries[leaderboardLightbox.index].src}
          alt={leaderboardLightbox.entries[leaderboardLightbox.index].alt}
          mediaType={leaderboardLightbox.entries[leaderboardLightbox.index].mediaType}
          videoPosterSrc={leaderboardLightbox.entries[leaderboardLightbox.index].posterSrc}
          isOpen={true}
          onClose={closeLeaderboardLightbox}
          metadata={leaderboardLightbox.entries[leaderboardLightbox.index].metadata}
          metadataExtras={
            <SocialStatsPanel stats={leaderboardLightbox.entries[leaderboardLightbox.index].stats} />
          }
          position={{
            current: leaderboardLightbox.index + 1,
            total: leaderboardLightbox.entries.length,
          }}
          hasPrevious={false}
          hasNext={false}
        />
      )}
    </div>
  );
}
