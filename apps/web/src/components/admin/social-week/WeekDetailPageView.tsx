"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import SocialAdminPageHeader from "@/components/admin/SocialAdminPageHeader";
import { SeasonTabsNav } from "@/components/admin/season-tabs/SeasonTabsNav";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import SocialPlatformTabIcon, { type SocialPlatformTabIconKey } from "@/components/admin/SocialPlatformTabIcon";
import {
  buildSeasonSocialBreadcrumb,
  humanizeSlug,
} from "@/lib/admin/admin-breadcrumbs";
import { recordAdminRecentShow } from "@/lib/admin/admin-recent-shows";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { useAdminOperationUnloadGuard } from "@/lib/admin/use-operation-unload-guard";
import { buildSeasonAdminUrl, buildSeasonSocialWeekUrl, buildShowAdminUrl } from "@/lib/admin/show-admin-routes";
import { getClientAuthHeaders } from "@/lib/admin/client-auth";
import {
  clearAdminOperationSession,
  getAutoResumableAdminOperationSession,
  markAdminOperationSessionStatus,
  upsertAdminOperationSession,
} from "@/lib/admin/operation-session";
import {
  clearAdminRunSession,
  getAutoResumableAdminRunSession,
  getOrCreateAdminRunFlowKey,
  markAdminRunSessionStatus,
  upsertAdminRunSession,
} from "@/lib/admin/run-session";
import type { PhotoMetadata } from "@/lib/photo-metadata";
import {
  pickFirstNonVideoUrl,
  selectInstagramTikTokThumbnailUrl,
  selectTwitterThumbnailUrl,
} from "./social-media-thumbnails";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Comment {
  comment_id: string;
  author: string;
  text: string;
  likes: number;
  is_reply: boolean;
  reply_count: number;
  created_at: string | null;
  comment_language?: string | null;
  is_author_liked?: boolean | null;
  aweme_id?: string | null;
  parent_source_comment_id?: string | null;
  media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  media_mirror_status?: string | null;
  user?: {
    id?: string | null;
    username?: string | null;
    display_name?: string | null;
    url?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    region?: string | null;
    language?: string | null;
  };
}

interface ThreadedComment extends Comment {
  replies: ThreadedComment[];
}

interface QuoteComment {
  comment_id: string;
  author: string;
  display_name?: string;
  text: string;
  likes: number;
  retweets?: number;
  reply_count?: number;
  quotes?: number;
  views?: number;
  is_reply: boolean;
  media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  thumbnail_url?: string | null;
  created_at: string | null;
  user?: {
    id?: string | null;
    username?: string | null;
    display_name?: string | null;
    url?: string | null;
    avatar_url?: string | null;
  };
}

interface PostUserSummary {
  id?: string | null;
  username?: string | null;
  display_name?: string | null;
  url?: string | null;
  avatar_url?: string | null;
}

interface PostCollaboratorDetail {
  username?: string | null;
  user_name?: string | null;
  handle?: string | null;
  screen_name?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  display_name?: string | null;
  displayName?: string | null;
  name?: string | null;
  profile_pic_url?: string | null;
  profile_pic_url_hd?: string | null;
  user_avatar_url?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
  profileImageUrl?: string | null;
  profile_url?: string | null;
  profileUrl?: string | null;
  user_url?: string | null;
  url?: string | null;
  is_verified?: boolean | null;
  verified?: boolean | null;
  tag_x?: number | null;
  tag_y?: number | null;
  tag_position_source?: string | null;
}

interface InstagramChildPostData {
  slide_index?: number | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  source_media_url?: string | null;
  hosted_media_url?: string | null;
  source_thumbnail_url?: string | null;
  hosted_thumbnail_url?: string | null;
  media_urls?: string[] | null;
  tagged_users_detail?: PostCollaboratorDetail[] | null;
  profile_tags_detail?: PostCollaboratorDetail[] | null;
  mentions_detail?: PostCollaboratorDetail[] | null;
}

interface MediaAssetMetaAsset {
  url?: string | null;
  type?: string | null;
  width?: number | null;
  height?: number | null;
  resolution?: string | null;
  fps?: number | null;
  bitrate?: number | null;
  duration_seconds?: number | null;
}

interface MediaAssetMetaThumbnail {
  url?: string | null;
  width?: number | null;
  height?: number | null;
  resolution?: string | null;
}

interface MediaAssetMeta {
  selection_policy?: string | null;
  selected_source?: string | null;
  source_assets?: MediaAssetMetaAsset[] | null;
  thumbnail_source?: MediaAssetMetaThumbnail | null;
  hosted_assets?: MediaAssetMetaAsset[] | null;
  thumbnail_hosted?: MediaAssetMetaThumbnail | null;
  updated_at?: string | null;
}

interface BasePost {
  source_id: string;
  author: string;
  text: string;
  url: string;
  sort_rank?: number;
  posted_at: string | null;
  engagement: number;
  total_comments_available: number;
  comments: Comment[];
  dislikes?: number;
  downvotes?: number;
  upvotes?: number;
  source_media_urls?: string[] | null;
  source_thumbnail_url?: string | null;
  hosted_media_urls?: string[] | null;
  hosted_thumbnail_url?: string | null;
  media_asset_meta?: MediaAssetMeta | null;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  cover_source?: string | null;
  cover_source_confidence?: string | null;
  metadata_error?: string | null;
  topic_path?: string | null;
  status?: PlatformStatusPayload | null;
  user?: PostUserSummary | null;
  owner_profile_pic_url?: string | null;
  hosted_owner_profile_pic_url?: string | null;
  hosted_tagged_profile_pics?: Record<string, string> | null;
  collaborators_detail?: PostCollaboratorDetail[] | null;
  child_posts_data?: InstagramChildPostData[] | null;
}

interface InstagramPost extends BasePost {
  likes: number;
  comments_count: number;
  views: number;
  media_type?: string | null;
  post_format?: "reel" | "post" | "carousel" | null;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  profile_tags?: string[];
  collaborators?: string[];
  hashtags?: string[];
  mentions: string[];
  duration_seconds?: number | null;
}

interface TikTokPost extends BasePost {
  nickname: string;
  likes: number;
  comments_count: number;
  shares: number;
  saves?: number;
  views: number;
  hashtags: string[];
  duration_seconds?: number | null;
  thumbnail_url?: string | null;
  mentions: string[];
}

interface YouTubePost extends BasePost {
  title: string;
  views: number;
  likes: number;
  comments_count: number;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  is_short?: boolean;
}

interface TwitterPost extends BasePost {
  display_name: string;
  likes: number;
  retweets: number;
  replies_count: number;
  quotes: number;
  views: number;
  hashtags: string[];
  mentions: string[];
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  total_quotes_in_db?: number;
}

interface FacebookPost extends BasePost {
  likes: number;
  comments_count: number;
  shares: number;
  views: number;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  post_type?: string | null;
}

interface ThreadsPost extends BasePost {
  likes: number;
  replies_count: number;
  reposts: number;
  quotes: number;
  views: number;
  topic?: string | null;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
}

type AnyPost = InstagramPost | TikTokPost | YouTubePost | TwitterPost | FacebookPost | ThreadsPost;

interface CommentSyncStatusPayload {
  status: "idle" | "queued" | "running" | "partial" | "complete" | "failed" | "not_attempted" | "unknown";
  expected_count?: number;
  fetched_count?: number;
  upserted_count?: number;
  failure_reason?: string | null;
}

interface MediaMirrorStatusPayload {
  status:
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
}

interface ActiveJobSummaryPayload {
  sync_status?: "queued" | "running";
  dominant_stage?: "posts" | "comments" | "media_mirror" | "comment_media_mirror" | null;
  job_count?: number;
  stage_statuses?: Partial<
    Record<
      "posts" | "comments" | "media_mirror" | "comment_media_mirror",
      { status?: "queued" | "running"; job_count?: number }
    >
  >;
}

interface PlatformStatusPayload {
  sync_status: "idle" | "queued" | "running" | "partial" | "complete" | "failed";
  comment_sync_status?: CommentSyncStatusPayload | null;
  media_mirror_status?: MediaMirrorStatusPayload | null;
  active_job_summary?: ActiveJobSummaryPayload | null;
  last_refresh_at?: string | null;
  last_refresh_reason?: string | null;
  stale?: boolean;
  worker_run_id?: string | null;
}

interface VisiblePlatformStatusCard {
  platform: string;
  status: PlatformStatusPayload;
  postCount: number;
}

interface PlatformData {
  posts: AnyPost[];
  totals: {
    posts: number;
    total_comments: number;
    total_engagement: number;
  };
  status?: PlatformStatusPayload | null;
}

interface WeekDetailResponse {
  week: {
    week_index: number;
    label: string;
    start: string;
    end: string;
  };
  season: {
    season_id: string;
    show_id: string;
    show_name: string | null;
    show_slug: string | null;
    season_number: number;
  };
  source_scope: string;
  platforms: Record<string, PlatformData>;
  status_by_platform?: Record<string, PlatformStatusPayload>;
  totals: {
    posts: number;
    total_comments: number;
    total_engagement: number;
  };
  pagination?: {
    limit: number;
    offset: number;
    returned: number;
    total: number;
    has_more: boolean;
  };
}

interface WeekSummaryResponse {
  week: WeekDetailResponse["week"];
  season: WeekDetailResponse["season"];
  source_scope: string;
  platforms: Record<
    string,
    {
      total_posts?: number;
      totals?: {
        posts?: number;
        total_comments?: number;
        total_engagement?: number;
      };
    }
  >;
  totals: {
    posts?: number;
    total_comments?: number;
    total_engagement?: number;
  };
}

interface PostDetailResponse {
  platform: string;
  source_id: string;
  author: string;
  text: string;
  topic?: string | null;
  url: string;
  posted_at: string | null;
  title?: string;
  display_name?: string;
  thumbnail_url?: string | null;
  media_urls?: string[] | null;
  source_media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  source_thumbnail_url?: string | null;
  hosted_thumbnail_url?: string | null;
  cover_source?: string | null;
  cover_source_confidence?: string | null;
  post_format?: "reel" | "post" | "carousel" | null;
  profile_tags?: string[];
  collaborators?: string[];
  hashtags?: string[];
  mentions?: string[];
  tagged_users_detail?: PostCollaboratorDetail[] | null;
  profile_tags_detail?: PostCollaboratorDetail[] | null;
  mentions_detail?: PostCollaboratorDetail[] | null;
  collaborators_detail?: PostCollaboratorDetail[] | null;
  hosted_tagged_profile_pics?: Record<string, string> | null;
  child_posts_data?: InstagramChildPostData[] | null;
  duration_seconds?: number | null;
  media_asset_meta?: MediaAssetMeta | null;
  transcript_text?: string | null;
  transcript_segments?: Array<{
    start_seconds?: number;
    end_seconds?: number;
    text?: string;
  }> | null;
  transcript_language?: string | null;
  transcript_source?: string | null;
  transcript_synced_at?: string | null;
  transcript_error?: string | null;
  stats: Record<string, number>;
  total_comments_in_db: number;
  total_quotes_in_db?: number;
  comments: ThreadedComment[];
  quotes?: QuoteComment[];
  refresh?: {
    detail_sync?: {
      detail?: { status?: string; error?: string | null } | null;
      comments?: { status?: string; is_complete?: boolean; reason?: string | null } | null;
      media?: { status?: string; processed?: number | null; mirrored_assets?: number | null; error?: string | null } | null;
    } | null;
    warnings?: string[] | null;
    comment_gap?: {
      reported?: number | null;
      saved?: number | null;
      is_complete?: boolean;
      reason?: string | null;
    } | null;
  } | null;
}

interface SocialJob {
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
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface SocialRun {
  id: string;
  operation_id?: string | null;
  execution_owner?: string | null;
  execution_mode_canonical?: string | null;
  status: "queued" | "pending" | "retrying" | "running" | "cancelling" | "completed" | "failed" | "cancelled";
  source_scope?: string;
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
  summary_normalized?: {
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
}

interface CommentsCoverageResponse {
  total_saved_comments: number;
  total_reported_comments: number;
  coverage_pct: number | null;
  up_to_date: boolean;
  stale_posts_count: number;
  posts_scanned: number;
  by_platform?: Record<
    string,
    {
      saved_comments?: number;
      reported_comments?: number;
      total_saved_comments?: number;
      total_reported_comments?: number;
      coverage_pct: number | null;
      up_to_date: boolean;
      stale_posts_count: number;
      posts_scanned: number;
    }
  >;
}

interface MirrorCoverageResponse {
  up_to_date: boolean;
  needs_mirror_count: number;
  mirrored_count: number;
  failed_count: number;
  partial_count: number;
  pending_count: number;
  posts_scanned: number;
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
    }
  >;
}

interface WorkerHealthPayload {
  queue_enabled?: boolean;
  healthy?: boolean;
  healthy_workers?: number;
  reason?: string | null;
}

interface RunProgressStagePayload {
  jobs_total: number;
  jobs_completed: number;
  jobs_failed: number;
  jobs_active: number;
  jobs_running?: number;
  jobs_waiting?: number;
  scraped_count: number;
  saved_count: number;
}

interface RunProgressPerHandlePayload extends RunProgressStagePayload {
  platform: string;
  account_handle: string;
  stage: string;
}

interface RunProgressLogEntry {
  id: string;
  timestamp: string | null;
  platform: string;
  account_handle: string;
  stage: string;
  status: string;
  line: string;
}

interface RunProgressSnapshot {
  season_id: string;
  run_id: string;
  run_status: SocialRun["status"];
  source_scope: string;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  stages: Record<string, RunProgressStagePayload>;
  per_handle: RunProgressPerHandlePayload[];
  recent_log: RunProgressLogEntry[];
  worker_runtime?: {
    runner_strategy?: string | null;
    scheduler_lanes?: string[];
    active_workers_now?: number;
    worker_ids_sample?: string[];
  };
  summary?: SocialRun["summary"];
  updated_at?: string | null;
}

interface WeekLiveHealthDayRow {
  day: string;
  platform: string;
  account: string;
  posts: number;
  comments: number;
  likes: number;
}

interface WeekLiveHealthAssetRow {
  asset: "images" | "videos" | "captions" | "profile_pictures";
  scraped: number;
  saved: number;
}

interface WeekLiveHealthSnapshot {
  day_account_rows: WeekLiveHealthDayRow[];
  asset_health: WeekLiveHealthAssetRow[];
  updated_at?: string | null;
}

type PlatformFilter = "all" | "instagram" | "tiktok" | "twitter" | "youtube" | "facebook" | "threads";
type SocialPlatform = Exclude<PlatformFilter, "all">;
type SortField = "engagement" | "likes" | "views" | "comments_count" | "shares" | "retweets" | "posted_at";
type SortDir = "desc" | "asc";
type SummaryTokenKey = "collaborators" | "tags" | "mentions" | "hashtags";
type SourceScope = "bravo" | "creator" | "community";
type IngestMode = "posts_only" | "posts_and_comments" | "comments_only" | "details_refresh";
type SocialMediaType = "image" | "video" | "embed";
type SeasonTabId = "overview" | "episodes" | "assets" | "news" | "fandom" | "cast" | "surveys" | "social";
type SocialAnalyticsViewId = "bravo" | "sentiment" | "hashtags" | "advanced" | "reddit";

interface SocialMediaCandidate {
  src: string;
  mediaType: SocialMediaType;
  posterSrc: string | null;
  mirrored: boolean;
  originalSrc: string | null;
}

interface SocialStatsItem {
  label: string;
  value: string;
}

interface InstagramTagMarker {
  id: string;
  xPct: number;
  yPct: number;
  label: string;
}

interface StageProgressSnapshot {
  total: number;
  completed: number;
  failed: number;
  active: number;
  running: number;
  waiting: number;
  scraped: number;
  saved: number;
}

interface HandleStageProgressSnapshot extends StageProgressSnapshot {
  stage: string;
}

interface HandleJobProgressCard {
  id: string;
  platform: string;
  platformLabel: string;
  handle: string;
  handleLabel: string;
  runnerLanes: string[];
  totals: StageProgressSnapshot;
  stages: HandleStageProgressSnapshot[];
}

interface SocialMediaLightboxEntry {
  id: string;
  src: string;
  mediaType: SocialMediaType;
  posterSrc: string | null;
  alt: string;
  metadata: PhotoMetadata;
  stats: SocialStatsItem[];
}

interface PostDetailMediaFields {
  media_urls?: string[] | null;
  source_media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  thumbnail_url?: string | null;
  source_thumbnail_url?: string | null;
  hosted_thumbnail_url?: string | null;
  media_asset_meta?: MediaAssetMeta | null;
}

interface InstagramDrawerSlide {
  index: number;
  src: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PLATFORM_FILTERS: { key: PlatformFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter/X" },
  { key: "youtube", label: "YouTube" },
  { key: "facebook", label: "Facebook" },
  { key: "threads", label: "Threads" },
];
const PLATFORM_KEYS: SocialPlatform[] = ["instagram", "tiktok", "twitter", "youtube", "facebook", "threads"];
const SEASON_PAGE_TABS: ReadonlyArray<{ id: SeasonTabId; label: string }> = [
  { id: "overview", label: "Back Home" },
  { id: "episodes", label: "Episodes" },
  { id: "assets", label: "Assets" },
  { id: "news", label: "News" },
  { id: "fandom", label: "Fandom" },
  { id: "cast", label: "Cast" },
  { id: "surveys", label: "Surveys" },
  { id: "social", label: "Social Media" },
];
const SEASON_SOCIAL_ANALYTICS_VIEWS: Array<{ id: SocialAnalyticsViewId; label: string }> = [
  { id: "bravo", label: "OFFICIAL ANALYTICS" },
  { id: "sentiment", label: "SENTIMENT ANALYSIS" },
  { id: "hashtags", label: "HASHTAGS ANALYSIS" },
  { id: "advanced", label: "ADVANCED ANALYTICS" },
  { id: "reddit", label: "REDDIT ANALYTICS" },
];
const EMPTY_PLATFORM_TOTALS: Record<SocialPlatform, number> = {
  instagram: 0,
  tiktok: 0,
  twitter: 0,
  youtube: 0,
  facebook: 0,
  threads: 0,
};

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: "engagement", label: "Engagement" },
  { key: "likes", label: "Likes" },
  { key: "views", label: "Views" },
  { key: "comments_count", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "retweets", label: "Reposts" },
  { key: "posted_at", label: "Date" },
];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800",
  tiktok: "bg-gray-100 text-gray-800",
  twitter: "bg-sky-100 text-sky-800",
  youtube: "bg-red-100 text-red-800",
  facebook: "bg-blue-100 text-blue-800",
  threads: "bg-neutral-100 text-neutral-800",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter/X",
  youtube: "YouTube",
  facebook: "Facebook",
  threads: "Threads",
};
const VERIFIED_BADGE_URL_BY_PLATFORM: Record<string, string> = {
  instagram: "https://d1fmdyqfafwim3.cloudfront.net/icons/verified/instagram-threads-verified.png",
  threads: "https://d1fmdyqfafwim3.cloudfront.net/icons/verified/instagram-threads-verified.png",
  tiktok: "https://d1fmdyqfafwim3.cloudfront.net/icons/verified/tiktok-verified.svg",
  twitter: "https://d1fmdyqfafwim3.cloudfront.net/icons/verified/x-twitter-verified.png",
};
const getSyncActionPlatformLabel = (platform: Exclude<PlatformFilter, "all">): string =>
  platform === "twitter" ? "X" : (PLATFORM_LABELS[platform] ?? platform);
const PLATFORM_HANDLE_FALLBACK: Record<string, string> = {
  youtube: "Bravo",
  facebook: "Bravo",
  threads: "bravotv",
};
const REQUIRED_BRAVO_HANDLE = "bravotv";

const STAT_LABELS: Record<string, string> = {
  likes: "Likes",
  comments_count: "Comments",
  views: "Views",
  shares: "Shares",
  saves: "Saves",
  retweets: "Reposts",
  reposts: "Reposts",
  replies_count: "Replies",
  quotes: "Quotes",
  engagement: "Total Engagement",
};

/** Per-platform summary metric definition for the top-of-view containers. */
interface PlatformSummaryMetric {
  key: string;
  label: string;
  aggregate?: "twitter_reposts" | "comments_normalized";
}

interface PlatformSummaryTokenConfig {
  key: SummaryTokenKey;
  label: string;
}

interface PlatformSummaryConfig {
  metrics: PlatformSummaryMetric[];
  tokens: PlatformSummaryTokenConfig[];
}

const PLATFORM_SUMMARY_CONFIG: Record<PlatformFilter, PlatformSummaryConfig> = {
  instagram: {
    metrics: [
      { key: "likes", label: "Likes" },
      { key: "comments_count", label: "Comments" },
      { key: "views", label: "Views" },
    ],
    tokens: [
      { key: "collaborators", label: "Collaborators" },
      { key: "tags", label: "Tags" },
      { key: "mentions", label: "Mentions" },
      { key: "hashtags", label: "Hashtags" },
    ],
  },
  tiktok: {
    metrics: [
      { key: "likes", label: "Likes" },
      { key: "comments_count", label: "Comments" },
      { key: "shares", label: "Shares" },
      { key: "saves", label: "Saves" },
      { key: "views", label: "Views" },
    ],
    tokens: [
      { key: "mentions", label: "Mentions" },
      { key: "hashtags", label: "Hashtags" },
    ],
  },
  twitter: {
    metrics: [
      { key: "likes", label: "Likes" },
      { key: "views", label: "Views" },
      { key: "reposts_computed", label: "Reposts", aggregate: "twitter_reposts" },
      { key: "quotes", label: "Quotes" },
      { key: "replies_count", label: "Replies" },
    ],
    tokens: [
      { key: "hashtags", label: "Hashtags" },
      { key: "mentions", label: "Mentions" },
    ],
  },
  youtube: {
    metrics: [
      { key: "views", label: "Views" },
      { key: "likes", label: "Likes" },
      { key: "comments_count", label: "Comments" },
    ],
    tokens: [],
  },
  facebook: {
    metrics: [
      { key: "likes", label: "Likes" },
      { key: "comments_count", label: "Comments" },
      { key: "shares", label: "Shares" },
      { key: "views", label: "Views" },
    ],
    tokens: [],
  },
  threads: {
    metrics: [
      { key: "likes", label: "Likes" },
      { key: "replies_count", label: "Replies" },
      { key: "reposts", label: "Reposts" },
      { key: "quotes", label: "Quotes" },
      { key: "views", label: "Views" },
    ],
    tokens: [],
  },
  all: {
    metrics: [
      { key: "comments_normalized", label: "Comments", aggregate: "comments_normalized" },
      { key: "likes", label: "Likes" },
      { key: "views", label: "Views" },
    ],
    tokens: [
      { key: "collaborators", label: "Collaborators" },
      { key: "tags", label: "Tags" },
      { key: "mentions", label: "Mentions" },
      { key: "hashtags", label: "Hashtags" },
    ],
  },
};

const SUMMARY_ROW1_GRID: Record<PlatformFilter, string> = {
  instagram: "grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3 md:grid-cols-5",
  tiktok: "grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7",
  twitter: "grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7",
  youtube: "grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3 md:grid-cols-5",
  facebook: "grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3 md:grid-cols-6",
  threads: "grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7",
  all: "grid grid-cols-2 gap-4 mb-6 sm:grid-cols-3 md:grid-cols-5",
};

const SUMMARY_ROW2_GRID: Record<PlatformFilter, string> = {
  instagram: "mb-6 grid grid-cols-2 gap-3 md:grid-cols-4",
  tiktok: "mb-6 grid grid-cols-2 gap-3",
  twitter: "mb-6 grid grid-cols-2 gap-3",
  youtube: "",
  facebook: "",
  threads: "",
  all: "mb-6 grid grid-cols-2 gap-3 md:grid-cols-4",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const looksLikeUuid = (value: string): boolean => UUID_RE.test(value);
const ACTIVE_RUN_STATUSES = new Set<SocialRun["status"]>(["queued", "pending", "retrying", "running", "cancelling"]);
const TERMINAL_RUN_STATUSES = new Set<SocialRun["status"]>(["completed", "failed", "cancelled"]);
const SOCIAL_TIME_ZONE = "America/New_York";
const DATE_TOKEN_RE = /^\d{4}-\d{2}-\d{2}$/;
const COMMENT_SYNC_MAX_PASSES = 1;
const COMMENT_SYNC_MAX_DURATION_MS = 90 * 60 * 1000;
const SYNC_GALLERY_REFRESH_MS = 20_000;
const SOCIAL_FULL_SYNC_MIRROR_ENABLED =
  process.env.NEXT_PUBLIC_SOCIAL_FULL_SYNC_MIRROR_ENABLED === "true" ||
  process.env.SOCIAL_FULL_SYNC_MIRROR_ENABLED === "true";
const WEEK_DETAIL_MAX_COMMENTS_PER_POST = 0;
const WEEK_DETAIL_POST_LIMIT = 20;
const WEEK_DETAIL_METRICS_PAGE_LIMIT = 100;
const WEEK_DETAIL_METRICS_MAX_PAGES = 500;
const REQUEST_TIMEOUT_MS = {
  weekDetail: 50_000,
  weekSummary: 40_000,
  weekDetailRefresh: 90_000,
  weekDetailYoutubeRefresh: 120_000,
  ingestKickoff: 210_000,
  syncRuns: 30_000,
  syncJobs: 30_000,
  runProgress: 30_000,
  weekLiveHealth: 20_000,
  commentsCoverage: 35_000,
  mirrorCoverage: 35_000,
  workerHealth: 20_000,
} as const;
const SYNC_KICKOFF_TIMEOUT_MESSAGE = "Sync kickoff request timed out";
const SYNC_KICKOFF_MAX_ATTEMPTS = 1;
const SYNC_KICKOFF_RECOVERY_LOOKBACK_MS = 5 * 60 * 1000;
const SYNC_KICKOFF_RECOVERY_LIMIT = 25;
const SYNC_POLL_BACKOFF_MS = [3_000, 6_000, 10_000, 15_000] as const;
const SYNC_ACTIVE_POLL_INTERVAL_MS = 4_000;
const RHOSLC_REQUIRED_HASHTAG = "RHOSLC";
const TOKEN_HANDLE_DETAIL_KEYS = [
  "tagged_users_detail",
  "collaborators_detail",
  "profile_tags_detail",
  "mentions_detail",
  "tagged_users",
  "mentioned_users",
  "tags_detail",
] as const;
const INSTAGRAM_TAG_MARKER_DETAIL_KEYS = [
  "tagged_users_detail",
  "profile_tags_detail",
  "mentions_detail",
] as const;
const TRANSIENT_DEV_RESTART_PATTERNS = [
  "failed to fetch",
  "networkerror when attempting to fetch resource",
  "fetch failed",
  "unexpected end of json input",
  "invalid json",
  "load failed",
  "connection closed",
  "could not reach trr-backend",
] as const;
const SOCIAL_MEDIA_IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|$)/i;
const SOCIAL_MEDIA_VIDEO_EXT_RE = /\.(mp4|mov|m4v|webm|m3u8|mpd)(\?|$)/i;
const SOCIAL_MEDIA_HTML_EXT_RE = /\.(html?|php|aspx?)(\?|$)/i;
const SOCIAL_MIRROR_HOST_MARKERS = ["cloudfront.net", "amazonaws.com", "s3.", "therealityreport"];
const SOCIAL_SOURCE_COLORS: Record<string, string> = {
  instagram: "#f43f5e",
  tiktok: "#111827",
  twitter: "#0284c7",
  youtube: "#dc2626",
  facebook: "#1d4ed8",
  threads: "#27272a",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) return error.name === "AbortError";
  if (!error || typeof error !== "object") return false;
  return (error as { name?: string }).name === "AbortError";
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
  externalSignal?: AbortSignal,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException("Aborted", "AbortError");
    }
    externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      if (externalSignal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
};

const registerInFlightRequest = (
  requestMap: Map<string, Promise<Response>>,
  requestKey: string,
  requestPromise: Promise<Response>,
): Promise<Response> => {
  requestMap.set(requestKey, requestPromise);
  void requestPromise
    .finally(() => {
      if (requestMap.get(requestKey) === requestPromise) {
        requestMap.delete(requestKey);
      }
    })
    .catch(() => {});
  return requestPromise;
};

const isTransientDevRestartMessage = (message: string | null | undefined): boolean => {
  const normalized = String(message ?? "").toLowerCase();
  if (!normalized) return false;
  return TRANSIENT_DEV_RESTART_PATTERNS.some((pattern) => normalized.includes(pattern));
};

const isRecoverableSyncKickoffMessage = (message: string | null | undefined): boolean => {
  const normalized = String(message ?? "").toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("timed out")) return true;
  return isTransientDevRestartMessage(normalized);
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

const buildStableRoute = (pathname: string, search: string): string => {
  return buildCanonicalRoute(`${pathname}${search ? `?${search}` : ""}`);
};

const compareAndReplace = (
  router: ReturnType<typeof useRouter>,
  canonicalCurrentRoute: string,
  nextRoute: string,
) => {
  if (buildCanonicalRoute(nextRoute) === canonicalCurrentRoute) return;
  router.replace(nextRoute as Route, { scroll: false });
};

const parseResponseJson = async <T,>(response: Response, fallbackMessage: string): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${fallbackMessage}. Response payload unavailable.`);
  }
};

const fmtNum = (n: number | null | undefined): string => {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtExactNum = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return "0";
  return Math.max(0, Math.trunc(n)).toLocaleString();
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: SOCIAL_TIME_ZONE,
  });
};

const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: SOCIAL_TIME_ZONE,
  });
};

const dateTokenFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SOCIAL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SOCIAL_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const toLocalDateToken = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = dateTokenFormatter.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    values[part.type] = part.value;
  }
  if (!values.year || !values.month || !values.day) return null;
  return `${values.year}-${values.month}-${values.day}`;
};

const parseDateToken = (value: string): { year: number; month: number; day: number } | null => {
  const match = DATE_TOKEN_RE.exec(value);
  if (!match) return null;
  return {
    year: Number(match[0].slice(0, 4)),
    month: Number(match[0].slice(5, 7)),
    day: Number(match[0].slice(8, 10)),
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

const toDayFilterLabel = (token: string | null): string | null => {
  if (!token || !DATE_TOKEN_RE.test(token)) return null;
  const [yearRaw, monthRaw, dayRaw] = token.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return dayLabelFormatter.format(date);
};

function getNum(post: AnyPost, key: string): number {
  return (post as unknown as Record<string, number>)[key] ?? 0;
}

function hasNum(post: AnyPost, key: string): boolean {
  const val = (post as unknown as Record<string, unknown>)[key];
  return typeof val === "number" && Number.isFinite(val);
}

function getStrArr(post: AnyPost, key: string): string[] {
  const val = (post as unknown as Record<string, unknown>)[key];
  return Array.isArray(val) ? (val as string[]) : [];
}

function getStr(post: AnyPost, key: string): string {
  const val = (post as unknown as Record<string, unknown>)[key];
  return typeof val === "string" ? val : "";
}

const HASHTAG_TOKEN_RE = /#([A-Za-z0-9_]+)/g;
const MENTION_TOKEN_RE = /@([A-Za-z0-9_.]+)/g;
const TWITTER_TEXT_URL_RE = /https?:\/\/t\.co\/[A-Za-z0-9]+/gi;

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function parseHashtagsFromText(text: string): string[] {
  HASHTAG_TOKEN_RE.lastIndex = 0;
  return dedupeCaseInsensitive(Array.from(text.matchAll(HASHTAG_TOKEN_RE), (match) => match[1] ?? ""));
}

function parseMentionsFromText(text: string): string[] {
  MENTION_TOKEN_RE.lastIndex = 0;
  return dedupeCaseInsensitive(Array.from(text.matchAll(MENTION_TOKEN_RE), (match) => `@${match[1] ?? ""}`));
}

function normalizeHashtagTokens(values: string[]): string[] {
  return dedupeCaseInsensitive(
    values.map((value) => value.trim().replace(/^#+/, "")).filter((value) => value.length > 0),
  );
}

function normalizeMentionTokens(values: string[]): string[] {
  return dedupeCaseInsensitive(
    values
      .map((value) => value.trim().replace(/^@+/, ""))
      .filter((value) => value.length > 0)
      .map((value) => `@${value}`),
  );
}

function getPostHashtags(platform: string, post: AnyPost): string[] {
  if (platform === "youtube" || platform === "facebook") {
    return parseHashtagsFromText(getStr(post, "text"));
  }
  const stored = normalizeHashtagTokens(getStrArr(post, "hashtags"));
  if (stored.length > 0) return stored;
  return parseHashtagsFromText(getStr(post, "text"));
}

function getPostMentions(post: AnyPost): string[] {
  const stored = normalizeMentionTokens(getStrArr(post, "mentions"));
  if (stored.length > 0) return stored;
  return parseMentionsFromText(getStr(post, "text"));
}

function normalizeCaptionPreviewText(platform: string, text: string | null | undefined): string {
  const raw = String(text ?? "");
  if (!raw.trim()) return "";
  if (platform !== "twitter") return raw;
  return raw.replace(TWITTER_TEXT_URL_RE, "").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
}

function getActualCommentsForPost(platform: string, post: AnyPost): number {
  if (platform === "twitter") {
    return Math.max(0, getNum(post, "replies_count") + getNum(post, "quotes"));
  }
  if (platform === "threads") {
    return Math.max(0, getNum(post, "replies_count") + getNum(post, "quotes"));
  }
  return Math.max(0, getNum(post, "comments_count"));
}

function getSavedCommentsForPost(post: AnyPost): number {
  const value = Number(post.total_comments_available ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getDisplayedSavedCommentsForPost(platform: string, post: AnyPost): number {
  return Math.min(getSavedCommentsForPost(post), getActualCommentsForPost(platform, post));
}

function formatSavedVsActualComments(saved: number, actual: number): string {
  return `${fmtNum(saved)}/${fmtNum(actual)}`;
}

function isCommentsCoverageIncomplete(saved: number, actual: number): boolean {
  return saved < actual;
}

function toEffectiveCommentCoverage(saved: number, actual: number): {
  saved: number;
  actual: number;
  incomplete: boolean;
} {
  const normalizedSaved = Number.isFinite(saved) ? Math.max(0, saved) : 0;
  const normalizedActual = Number.isFinite(actual) ? Math.max(0, actual) : 0;
  const effectiveSaved = Math.min(normalizedSaved, normalizedActual);
  return {
    saved: effectiveSaved,
    actual: normalizedActual,
    incomplete: isCommentsCoverageIncomplete(effectiveSaved, normalizedActual),
  };
}

function getCoverageEntryCounts(
  entry:
    | {
        saved_comments?: number;
        reported_comments?: number;
        total_saved_comments?: number;
        total_reported_comments?: number;
      }
    | null
    | undefined,
): { saved: number; actual: number } {
  const rawSaved = Number(entry?.saved_comments ?? entry?.total_saved_comments ?? 0);
  const rawActual = Number(entry?.reported_comments ?? entry?.total_reported_comments ?? 0);
  return {
    saved: Number.isFinite(rawSaved) ? Math.max(0, rawSaved) : 0,
    actual: Number.isFinite(rawActual) ? Math.max(0, rawActual) : 0,
  };
}

function parseSocialPlatform(value: string | null | undefined): SocialPlatform | null {
  if (
    value === "instagram" ||
    value === "tiktok" ||
    value === "twitter" ||
    value === "youtube" ||
    value === "facebook" ||
    value === "threads"
  ) {
    return value;
  }
  return null;
}

function formatCoverageLabel(saved: number, actual: number): string {
  const pct = actual > 0 ? Math.max(0, Math.min(100, (saved / actual) * 100)) : 100;
  return `${fmtNum(saved)}/${fmtNum(actual)} (${pct.toFixed(1)}%)`;
}

function formatMirrorCoverageLabel(readyCount: number, total: number): string {
  const pct = total > 0 ? Math.max(0, Math.min(100, (readyCount / total) * 100)) : 100;
  return `${fmtNum(readyCount)}/${fmtNum(total)} (${pct.toFixed(1)}%)`;
}

function getReportedCommentCountFromStats(platform: string, stats: Record<string, number>): number {
  const raw = (() => {
    if (platform === "twitter") {
      return Number(stats.replies_count ?? 0) + Number(stats.quotes ?? 0);
    }
    if (platform === "threads") {
      return Number(stats.replies_count ?? stats.comments_count ?? 0) + Number(stats.quotes ?? 0);
    }
    return Number(stats.comments_count ?? 0);
  })();
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, raw);
}

function getTwitterRepostCount(post: AnyPost): number {
  if (hasNum(post, "reposts")) return Math.max(0, getNum(post, "reposts"));
  return Math.max(0, getNum(post, "retweets") + getNum(post, "quotes"));
}

function getPostThumbnailUrl(platform: string, post: AnyPost): string | null {
  const hostedThumbnail = getStr(post, "hosted_thumbnail_url");
  if (platform === "twitter") {
    const thumbnail = getStr(post, "thumbnail_url");
    const hostedMediaUrls = getStrArr(post, "hosted_media_urls");
    const mediaUrls = getStrArr(post, "media_urls");
    return selectTwitterThumbnailUrl({
      hostedThumbnail,
      thumbnail,
      hostedMediaUrls,
      mediaUrls,
    });
  }
  if (hostedThumbnail) return hostedThumbnail;
  if (platform === "youtube") return getStr(post, "thumbnail_url") || null;
  if (platform === "instagram" || platform === "tiktok") {
    const thumbnail = getStr(post, "thumbnail_url");
    const hostedMediaUrls = getStrArr(post, "hosted_media_urls");
    const sourceMediaUrls = getStrArr(post, "source_media_urls");
    const mediaUrls = getStrArr(post, "media_urls");
    return selectInstagramTikTokThumbnailUrl({
      hostedThumbnail,
      thumbnail,
      hostedMediaUrls,
      mediaUrls,
      sourceMediaUrls,
    });
  }
  return getStr(post, "thumbnail_url") || getStrArr(post, "hosted_media_urls")[0] || null;
}

function detectSocialMediaType(url: string): SocialMediaType {
  const normalized = url.toLowerCase();
  if (SOCIAL_MEDIA_VIDEO_EXT_RE.test(normalized)) return "video";
  if (isEmbeddableSocialPageUrl(normalized)) return "embed";
  return "image";
}

function isLikelyHtmlDocumentUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  if (SOCIAL_MEDIA_HTML_EXT_RE.test(normalized)) return true;
  return normalized.includes("media-") && normalized.includes(".html");
}

function isEmbeddableSocialPageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host.includes("tiktok.com") && path.includes("/video/")) return true;
    if (host.includes("youtube.com") && (path === "/watch" || path.startsWith("/shorts/"))) return true;
    if (host === "youtu.be") return true;
    return false;
  } catch {
    return false;
  }
}

function normalizeSocialMediaCandidateUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildNormalizedMediaUrlList(urls: Array<string | null | undefined>): string[] {
  const normalizedUrls: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const normalized = normalizeSocialMediaCandidateUrl(raw);
    if (!normalized) continue;
    const dedupeKey = normalizeSocialMediaUrlForCompare(normalized) || normalized.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalizedUrls.push(normalized);
  }
  return normalizedUrls;
}

function extractMediaAssetUrls(
  mediaAssetMeta: MediaAssetMeta | null | undefined,
): {
  sourceMediaUrls: string[];
  hostedMediaUrls: string[];
  sourceThumbnailUrl: string | null;
  hostedThumbnailUrl: string | null;
} {
  const sourceMediaUrls = buildNormalizedMediaUrlList(
    Array.isArray(mediaAssetMeta?.source_assets)
      ? mediaAssetMeta?.source_assets.map((asset) => asset?.url ?? null)
      : [],
  );
  const hostedMediaUrls = buildNormalizedMediaUrlList(
    Array.isArray(mediaAssetMeta?.hosted_assets)
      ? mediaAssetMeta?.hosted_assets.map((asset) => asset?.url ?? null)
      : [],
  );
  return {
    sourceMediaUrls,
    hostedMediaUrls,
    sourceThumbnailUrl: normalizeSocialMediaCandidateUrl(mediaAssetMeta?.thumbnail_source?.url ?? null),
    hostedThumbnailUrl: normalizeSocialMediaCandidateUrl(mediaAssetMeta?.thumbnail_hosted?.url ?? null),
  };
}

function selectPreferredMediaUrlPair(sourceMediaUrlRaw: string | null, hostedMediaUrlRaw: string | null): {
  src: string | null;
  mirrored: boolean;
  originalSrc: string | null;
} {
  const sourceMediaUrl = normalizeSocialMediaCandidateUrl(sourceMediaUrlRaw);
  const hostedMediaUrl = normalizeSocialMediaCandidateUrl(hostedMediaUrlRaw);

  if (sourceMediaUrl && hostedMediaUrl) {
    const sourceMediaType = detectSocialMediaType(sourceMediaUrl);
    const hostedMediaType = detectSocialMediaType(hostedMediaUrl);
    const hostedIsThumbnailLike = hostedMediaType === "image" || isLikelyHtmlDocumentUrl(hostedMediaUrl);
    if (sourceMediaType === "video" && hostedIsThumbnailLike) {
      return {
        src: sourceMediaUrl,
        mirrored: false,
        originalSrc: sourceMediaUrl,
      };
    }
    // When a mirrored URL exists, keep playback anchored to mirrored assets only.
    return {
      src: hostedMediaUrl,
      mirrored: true,
      originalSrc: sourceMediaUrl,
    };
  }

  if (hostedMediaUrl) {
    return {
      src: hostedMediaUrl,
      mirrored: true,
      originalSrc: null,
    };
  }

  if (sourceMediaUrl) {
    return {
      src: sourceMediaUrl,
      mirrored: false,
      originalSrc: sourceMediaUrl,
    };
  }

  return {
    src: null,
    mirrored: false,
    originalSrc: null,
  };
}

function isLikelyMirroredSocialUrl(url: string | null | undefined): boolean {
  if (typeof url !== "string" || url.trim().length === 0) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SOCIAL_MIRROR_HOST_MARKERS.some((marker) => host.includes(marker));
  } catch {
    return false;
  }
}

function inferMirrorFileNameFromUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string" || url.trim().length === 0) return null;
  try {
    const pathname = new URL(url).pathname;
    const fileName = pathname.split("/").filter(Boolean).pop();
    return fileName ? decodeURIComponent(fileName) : null;
  } catch {
    return null;
  }
}

function normalizeSocialMediaUrlForCompare(url: string | null | undefined): string {
  if (typeof url !== "string" || url.trim().length === 0) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function resolveMediaCandidateIndex(
  candidates: SocialMediaCandidate[],
  preferredSrc: string | null | undefined,
): number {
  if (candidates.length === 0) return 0;
  const normalizedPreferred = normalizeSocialMediaUrlForCompare(preferredSrc ?? "");
  if (!normalizedPreferred) return 0;
  const matchIndex = candidates.findIndex((candidate) => {
    if (normalizeSocialMediaUrlForCompare(candidate.src) === normalizedPreferred) return true;
    if (normalizeSocialMediaUrlForCompare(candidate.originalSrc ?? "") === normalizedPreferred) return true;
    return false;
  });
  return matchIndex >= 0 ? matchIndex : 0;
}

function formatInstagramCoverSourceLabel(value: string | null | undefined): string | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "custom_cover") return "Custom Cover Photo";
  if (normalized === "still_frame_or_default") return "Still Frame / Default Cover";
  if (normalized === "unknown") return "Unknown";
  return normalized.replaceAll("_", " ");
}

function buildMirrorScopeLabel(post: AnyPost): string {
  const sourceCount = getStrArr(post, "source_media_urls").length || getStrArr(post, "media_urls").length;
  const hostedCount = getStrArr(post, "hosted_media_urls").length;
  const hasHostedThumbnail = Boolean(getStr(post, "hosted_thumbnail_url"));
  if (hostedCount > 0 && sourceCount > 0 && hostedCount >= sourceCount) return "Media + thumbnail mirrored";
  if (hostedCount > 0 && sourceCount > 0) return `Partial media mirrored (${hostedCount}/${sourceCount})`;
  if (hostedCount > 0) return "Media mirrored";
  if (hasHostedThumbnail) return "Thumbnail mirrored only";
  return "Platform-hosted media";
}

function getPostMediaCandidates(platform: string, post: AnyPost): SocialMediaCandidate[] {
  const mediaAssetUrls = extractMediaAssetUrls(post.media_asset_meta);
  const sourceMediaUrls = buildNormalizedMediaUrlList([
    ...(getStrArr(post, "source_media_urls").length ? getStrArr(post, "source_media_urls") : getStrArr(post, "media_urls")),
    ...mediaAssetUrls.sourceMediaUrls,
  ]);
  const hostedMediaUrls = buildNormalizedMediaUrlList([
    ...getStrArr(post, "hosted_media_urls"),
    ...mediaAssetUrls.hostedMediaUrls,
  ]);
  const sourceThumbnail =
    getStr(post, "source_thumbnail_url") || mediaAssetUrls.sourceThumbnailUrl || getStr(post, "thumbnail_url");
  const hostedThumbnail = getStr(post, "hosted_thumbnail_url") || mediaAssetUrls.hostedThumbnailUrl;
  const thumbnail =
    pickFirstNonVideoUrl([
      hostedThumbnail,
      getStr(post, "thumbnail_url"),
      sourceThumbnail,
      ...hostedMediaUrls,
      ...sourceMediaUrls,
    ]) ??
    getPostThumbnailUrl(platform, post);
  const candidates: SocialMediaCandidate[] = [];
  const seen = new Set<string>();

  const candidateCount = Math.max(sourceMediaUrls.length, hostedMediaUrls.length);
  for (let index = 0; index < candidateCount; index += 1) {
    const sourceMediaUrl = sourceMediaUrls[index] ?? null;
    const hostedMediaUrl = hostedMediaUrls[index] ?? null;
    const candidate = selectPreferredMediaUrlPair(sourceMediaUrl, hostedMediaUrl);
    const normalized = normalizeSocialMediaCandidateUrl(candidate.src);
    if (!normalized) continue;
    const mirrored = candidate.mirrored || isLikelyMirroredSocialUrl(normalized);
    if (mirrored && isLikelyHtmlDocumentUrl(normalized)) continue;
    const dedupeKey = normalizeSocialMediaUrlForCompare(normalized);
    if (dedupeKey && seen.has(dedupeKey)) continue;
    seen.add(dedupeKey || normalized);
    candidates.push({
      src: normalized,
      mediaType: detectSocialMediaType(normalized),
      posterSrc: thumbnail,
      mirrored,
      originalSrc: mirrored ? candidate.originalSrc : candidate.originalSrc ?? null,
    });
  }

  if (thumbnail) {
    const thumbnailDedupeKey = normalizeSocialMediaUrlForCompare(thumbnail);
    if (thumbnailDedupeKey && seen.has(thumbnailDedupeKey)) {
      return candidates;
    }
    seen.add(thumbnailDedupeKey || thumbnail);
    const mirrored = Boolean(hostedThumbnail) || isLikelyMirroredSocialUrl(thumbnail);
    candidates.push({
      src: thumbnail,
      mediaType: "image",
      posterSrc: thumbnail,
      mirrored,
      originalSrc: mirrored ? sourceThumbnail : sourceThumbnail ?? null,
    });
  }

  return candidates;
}

function pickFirstVideoUrl(urls: Array<string | null | undefined>): string | null {
  for (const raw of urls) {
    const value = normalizeSocialMediaCandidateUrl(raw);
    if (!value) continue;
    if (detectSocialMediaType(value) === "video") return value;
  }
  return null;
}

function pickFirstEmbeddableUrl(urls: Array<string | null | undefined>): string | null {
  for (const raw of urls) {
    const value = normalizeSocialMediaCandidateUrl(raw);
    if (!value) continue;
    if (detectSocialMediaType(value) === "embed") return value;
  }
  return null;
}

function pickFirstNonHtmlUrl(urls: Array<string | null | undefined>): string | null {
  for (const raw of urls) {
    const value = normalizeSocialMediaCandidateUrl(raw);
    if (!value) continue;
    if (!isLikelyHtmlDocumentUrl(value)) return value;
  }
  return null;
}

function pickFirstUrl(urls: Array<string | null | undefined>): string | null {
  for (const raw of urls) {
    const value = normalizeSocialMediaCandidateUrl(raw);
    if (value) return value;
  }
  return null;
}

function getPreferredPostDetailMediaSrc(data: PostDetailMediaFields): string | null {
  const mediaAssetUrls = extractMediaAssetUrls(data.media_asset_meta);
  const sourceMediaUrls = buildNormalizedMediaUrlList([
    ...((data.source_media_urls ?? []).length > 0 ? (data.source_media_urls ?? []) : (data.media_urls ?? [])),
    ...mediaAssetUrls.sourceMediaUrls,
  ]);
  const hostedMediaUrls = buildNormalizedMediaUrlList([
    ...(data.hosted_media_urls ?? []),
    ...mediaAssetUrls.hostedMediaUrls,
  ]);
  const sourceThumbnailUrl = normalizeSocialMediaCandidateUrl(
    data.source_thumbnail_url ?? mediaAssetUrls.sourceThumbnailUrl ?? null,
  );
  const hostedThumbnailUrl = normalizeSocialMediaCandidateUrl(
    data.hosted_thumbnail_url ?? mediaAssetUrls.hostedThumbnailUrl ?? null,
  );
  const preferredThumbnailUrl = normalizeSocialMediaCandidateUrl(data.thumbnail_url);

  if (hostedMediaUrls.length > 0) {
    const pairCount = Math.max(sourceMediaUrls.length, hostedMediaUrls.length);
    for (let index = 0; index < pairCount; index += 1) {
      const sourceMediaUrl = normalizeSocialMediaCandidateUrl(sourceMediaUrls[index]);
      const hostedMediaUrl = normalizeSocialMediaCandidateUrl(hostedMediaUrls[index]);
      if (!sourceMediaUrl || !hostedMediaUrl) continue;
      const sourceType = detectSocialMediaType(sourceMediaUrl);
      const hostedType = detectSocialMediaType(hostedMediaUrl);
      const hostedIsThumbnailLike = hostedType === "image" || isLikelyHtmlDocumentUrl(hostedMediaUrl);
      if (sourceType === "video" && hostedIsThumbnailLike) {
        return sourceMediaUrl;
      }
    }

    const hostedVideoCandidate = pickFirstVideoUrl(hostedMediaUrls);
    if (hostedVideoCandidate) return hostedVideoCandidate;

    const hostedNonHtmlCandidate = pickFirstNonHtmlUrl(hostedMediaUrls);
    if (hostedNonHtmlCandidate) return hostedNonHtmlCandidate;

    return pickFirstUrl([
      hostedThumbnailUrl,
      preferredThumbnailUrl,
      sourceThumbnailUrl,
    ]);
  }

  const videoCandidate = pickFirstVideoUrl(sourceMediaUrls);
  if (videoCandidate) return videoCandidate;
  const embedCandidate = pickFirstEmbeddableUrl(sourceMediaUrls);
  if (embedCandidate) return embedCandidate;
  return pickFirstUrl([
    ...sourceMediaUrls,
    hostedThumbnailUrl,
    preferredThumbnailUrl,
    sourceThumbnailUrl,
  ]);
}

function getPostDetailThumbnailUrl(data: PostDetailMediaFields): string | null {
  const preferred = pickFirstNonVideoUrl([
    data.hosted_thumbnail_url,
    data.thumbnail_url,
    data.source_thumbnail_url,
    ...(data.hosted_media_urls ?? []),
    ...(data.media_urls ?? []),
    ...(data.source_media_urls ?? []),
  ]);
  if (preferred) return preferred;
  return pickFirstUrl([
    data.hosted_thumbnail_url,
    data.thumbnail_url,
    data.source_thumbnail_url,
    ...(data.hosted_media_urls ?? []),
    ...(data.media_urls ?? []),
    ...(data.source_media_urls ?? []),
  ]);
}

function resolveInstagramChildPostMediaSrc(childPost: Record<string, unknown>): string | null {
  const childMediaUrls = Array.isArray(childPost.media_urls)
    ? childPost.media_urls.filter((value): value is string => typeof value === "string")
    : [];
  return (
    pickFirstNonHtmlUrl([
      ...childMediaUrls,
      pickNonEmptyStringFromRecord(childPost, ["hosted_media_url"]),
      pickNonEmptyStringFromRecord(childPost, ["source_media_url"]),
      pickNonEmptyStringFromRecord(childPost, ["media_url"]),
      pickNonEmptyStringFromRecord(childPost, ["hosted_thumbnail_url"]),
      pickNonEmptyStringFromRecord(childPost, ["thumbnail_url"]),
      pickNonEmptyStringFromRecord(childPost, ["source_thumbnail_url"]),
    ]) ??
    pickFirstUrl([
      ...childMediaUrls,
      pickNonEmptyStringFromRecord(childPost, ["hosted_media_url"]),
      pickNonEmptyStringFromRecord(childPost, ["source_media_url"]),
      pickNonEmptyStringFromRecord(childPost, ["media_url"]),
      pickNonEmptyStringFromRecord(childPost, ["hosted_thumbnail_url"]),
      pickNonEmptyStringFromRecord(childPost, ["thumbnail_url"]),
      pickNonEmptyStringFromRecord(childPost, ["source_thumbnail_url"]),
    ])
  );
}

function buildInstagramDrawerSlides(data: PostDetailResponse): InstagramDrawerSlide[] {
  const mediaAssetUrls = extractMediaAssetUrls(data.media_asset_meta);
  const sourceMediaUrls = buildNormalizedMediaUrlList([
    ...((data.source_media_urls ?? []).length > 0 ? (data.source_media_urls ?? []) : (data.media_urls ?? [])),
    ...mediaAssetUrls.sourceMediaUrls,
  ]);
  const hostedMediaUrls = buildNormalizedMediaUrlList([
    ...(data.hosted_media_urls ?? []),
    ...mediaAssetUrls.hostedMediaUrls,
  ]);
  const mediaUrls = buildNormalizedMediaUrlList([
    ...((data.media_urls ?? []).length > 0 ? (data.media_urls ?? []) : sourceMediaUrls),
    ...sourceMediaUrls,
  ]);
  const childPosts = getInstagramChildPostRecords(data);
  const childPostsBySlide = new Map<number, Record<string, unknown>>();
  for (const childPost of childPosts) {
    if (!childPostsBySlide.has(childPost.slideIndex)) {
      childPostsBySlide.set(childPost.slideIndex, childPost.record);
    }
  }

  const totalSlides = Math.max(mediaUrls.length, sourceMediaUrls.length, hostedMediaUrls.length, childPosts.length);
  const slides: InstagramDrawerSlide[] = [];

  for (let index = 0; index < totalSlides; index += 1) {
    const childPostRecord = childPostsBySlide.get(index) ?? childPosts[index]?.record ?? null;
    const childMediaSrc = childPostRecord ? resolveInstagramChildPostMediaSrc(childPostRecord) : null;
    const preferredPair = selectPreferredMediaUrlPair(
      pickFirstUrl([sourceMediaUrls[index], mediaUrls[index], childMediaSrc]),
      hostedMediaUrls[index] ?? null,
    );
    const src =
      pickFirstNonHtmlUrl([preferredPair.src, mediaUrls[index], sourceMediaUrls[index], hostedMediaUrls[index], childMediaSrc]) ??
      pickFirstUrl([preferredPair.src, mediaUrls[index], sourceMediaUrls[index], hostedMediaUrls[index], childMediaSrc]);
    if (!src) continue;
    slides.push({ index, src });
  }

  if (slides.length > 0) return slides;

  const fallbackSrc = getPostDetailThumbnailUrl(data);
  if (!fallbackSrc) return [];
  return [{ index: 0, src: fallbackSrc }];
}

function mergePostWithDetailMedia(post: AnyPost, detailMedia: PostDetailMediaFields | null | undefined): AnyPost {
  if (!detailMedia) return post;
  return {
    ...post,
    media_urls: detailMedia.media_urls ?? post.media_urls ?? null,
    source_media_urls: detailMedia.source_media_urls ?? post.source_media_urls ?? null,
    hosted_media_urls: detailMedia.hosted_media_urls ?? post.hosted_media_urls ?? null,
    thumbnail_url: detailMedia.thumbnail_url ?? post.thumbnail_url ?? null,
    source_thumbnail_url: detailMedia.source_thumbnail_url ?? post.source_thumbnail_url ?? null,
    hosted_thumbnail_url: detailMedia.hosted_thumbnail_url ?? post.hosted_thumbnail_url ?? null,
    media_asset_meta: detailMedia.media_asset_meta ?? post.media_asset_meta ?? null,
  } as AnyPost;
}

function inferFileExtensionFromUrl(url: string): string | null {
  const imageMatch = url.match(SOCIAL_MEDIA_IMAGE_EXT_RE);
  if (imageMatch?.[1]) return imageMatch[1].toLowerCase();
  const videoMatch = url.match(SOCIAL_MEDIA_VIDEO_EXT_RE);
  if (videoMatch?.[1]) return videoMatch[1].toLowerCase();
  return null;
}

const PLATFORM_FILE_NAME_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "Twitter",
  facebook: "Facebook",
  threads: "Threads",
};

function computeDailyPostNumber(
  platform: string,
  post: AnyPost,
  allPlatformPosts: AnyPost[],
): number {
  if (!post.posted_at) return 1;
  const postDate = new Date(post.posted_at);
  if (Number.isNaN(postDate.getTime())) return 1;
  const postDay = postDate.toISOString().slice(0, 10);
  const postAuthor = (post.author || "").toLowerCase().replace(/^@/, "");

  const sameDayPosts = allPlatformPosts
    .filter((p) => {
      const pDate = p.posted_at ? new Date(p.posted_at) : null;
      if (!pDate || Number.isNaN(pDate.getTime())) return false;
      const pDay = pDate.toISOString().slice(0, 10);
      const pAuthor = (p.author || "").toLowerCase().replace(/^@/, "");
      return pDay === postDay && pAuthor === postAuthor;
    })
    .sort((a, b) => {
      const aTime = new Date(a.posted_at!).getTime();
      const bTime = new Date(b.posted_at!).getTime();
      return aTime - bTime || a.source_id.localeCompare(b.source_id);
    });

  const index = sameDayPosts.findIndex((p) => p.source_id === post.source_id);
  return index >= 0 ? index + 1 : 1;
}

function buildPostDisplayName(
  showSlug: string | null | undefined,
  username: string,
  platform: string,
  postNumber: number,
): string {
  const slug = (showSlug || "").replace(/[^A-Za-z0-9]/g, "");
  const sanitizedUser = username.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
  const platformLabel = PLATFORM_FILE_NAME_LABELS[platform] ?? platform;
  return `${slug}${sanitizedUser}${platformLabel}Post${postNumber}`;
}

function buildSocialPostMetadata({
  platform,
  post,
  media,
  showName,
  showSlug,
  seasonNumber,
  weekLabel,
  sourceScope,
  allPlatformPosts,
  mediaIndex,
  totalMediaCount,
  isThumbnailEntry,
}: {
  platform: string;
  post: AnyPost;
  media: SocialMediaCandidate;
  showName: string | null | undefined;
  showSlug: string | null | undefined;
  seasonNumber: number | null;
  weekLabel: string | null;
  sourceScope: SourceScope;
  allPlatformPosts: AnyPost[];
  mediaIndex: number;
  totalMediaCount: number;
  isThumbnailEntry: boolean;
}): PhotoMetadata {
  const postedDate =
    typeof post.posted_at === "string" && post.posted_at.trim().length > 0
      ? new Date(post.posted_at)
      : null;
  const validPostedDate =
    postedDate && !Number.isNaN(postedDate.getTime()) ? postedDate : null;
  const sourceLabel = PLATFORM_LABELS[platform] ?? platform;
  const title = getStr(post, "title");
  const caption = title || post.text || null;
  const sourcePageTitle = title || caption || `${sourceLabel} post`;
  const sectionLabel = weekLabel ? `${sourceLabel} · ${weekLabel}` : sourceLabel;
  const fileType = inferFileExtensionFromUrl(media.src);
  const isS3Mirrored = media.mirrored || isLikelyMirroredSocialUrl(media.src);
  const mirrorFileName = isS3Mirrored ? inferMirrorFileNameFromUrl(media.src) : null;
  const originalMediaUrl = media.originalSrc ?? (!isS3Mirrored ? media.src : null);
  const sourcePostUrl = resolvePostExternalUrl(platform, post);

  const postNumber = computeDailyPostNumber(platform, post, allPlatformPosts);
  const displayName = buildPostDisplayName(showSlug, post.author, platform, postNumber);
  let assetSuffix = "";
  if (isThumbnailEntry) {
    assetSuffix = "_Thumbnail";
  } else if (totalMediaCount > 1) {
    assetSuffix = `_S${mediaIndex + 1}`;
  }

  return {
    source: sourceLabel,
    sourceBadgeColor: SOCIAL_SOURCE_COLORS[platform] ?? "#71717a",
    isS3Mirrored,
    s3MirrorFileName: mirrorFileName,
    originalImageUrl: originalMediaUrl,
    originalSourceFileUrl: originalMediaUrl,
    originalSourcePageUrl: sourcePostUrl,
    originalSourceLabel: sourceLabel,
    fileType,
    createdAt: validPostedDate,
    addedAt: validPostedDate,
    hasTextOverlay: null,
    contentType: media.mediaType === "video" || media.mediaType === "embed" ? "OTHER" : "PROMO",
    sectionTag: "OTHER",
    sectionLabel,
    sourceLogo: sourceScope.toUpperCase(),
    assetName: `${displayName}${assetSuffix}`,
    imdbType: null,
    episodeLabel: weekLabel,
    sourceVariant: sourceScope.toUpperCase(),
    sourcePageTitle,
    sourceUrl: sourcePostUrl || media.src,
    faceBoxes: [],
    peopleCount: null,
    caption,
    dimensions: null,
    season: seasonNumber,
    contextType: "social_post_media",
    people: [],
    titles: [showName, title].filter((value): value is string => Boolean(value && value.trim())),
    fetchedAt: validPostedDate,
    galleryStatus: null,
    galleryStatusReason: null,
    galleryStatusCheckedAt: null,
  };
}

function buildSocialStats(platform: string, post: AnyPost): SocialStatsItem[] {
  const stats: SocialStatsItem[] = [
    { label: "Platform", value: PLATFORM_LABELS[platform] ?? platform },
    { label: "Engagement", value: fmtNum(Number(post.engagement ?? 0)) },
    {
      label: platform === "twitter" || platform === "threads" ? "Replies" : "Comments",
      value: formatSavedVsActualComments(
        getDisplayedSavedCommentsForPost(platform, post),
        getActualCommentsForPost(platform, post),
      ),
    },
  ];

  if (hasNum(post, "likes")) stats.push({ label: "Likes", value: fmtNum(getNum(post, "likes")) });
  if (hasNum(post, "views")) stats.push({ label: "Views", value: fmtNum(getNum(post, "views")) });
  if (hasNum(post, "shares")) stats.push({ label: "Shares", value: fmtNum(getNum(post, "shares")) });
  if (hasNum(post, "saves")) stats.push({ label: "Saves", value: fmtNum(getNum(post, "saves")) });
  if (platform === "twitter") {
    stats.push({ label: "Reposts", value: fmtNum(getTwitterRepostCount(post)) });
  } else if (hasNum(post, "retweets")) {
    stats.push({ label: "Reposts", value: fmtNum(getNum(post, "retweets")) });
  } else if (hasNum(post, "reposts")) {
    stats.push({ label: "Reposts", value: fmtNum(getNum(post, "reposts")) });
  }
  if (hasNum(post, "quotes")) stats.push({ label: "Quotes", value: fmtNum(getNum(post, "quotes")) });
  if (hasNum(post, "duration_seconds") && getNum(post, "duration_seconds") > 0) {
    stats.push({ label: "Duration", value: `${fmtNum(getNum(post, "duration_seconds"))}s` });
  }
  stats.push({ label: "Mirror", value: buildMirrorScopeLabel(post) });
  if (platform === "instagram") {
    const coverSourceLabel = formatInstagramCoverSourceLabel(getStr(post, "cover_source"));
    if (coverSourceLabel) {
      const confidence = getStr(post, "cover_source_confidence");
      stats.push({
        label: "Cover Source",
        value: confidence ? `${coverSourceLabel} (${confidence})` : coverSourceLabel,
      });
    }
  }

  return stats;
}

function getPlatformIconKey(platform: string): SocialPlatformTabIconKey | null {
  if (
    platform === "instagram" ||
    platform === "tiktok" ||
    platform === "twitter" ||
    platform === "youtube" ||
    platform === "facebook" ||
    platform === "threads"
  ) {
    return platform;
  }
  return null;
}

function normalizeHandle(handle: string | null | undefined): string {
  return String(handle ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

function formatHandleLabel(handle: string | null | undefined): string {
  const normalized = normalizeHandle(handle);
  return normalized ? `@${normalized}` : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickNonEmptyStringFromRecord(
  record: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (normalized) return normalized;
  }
  return null;
}

function pickObjectArrayFromRecord(record: Record<string, unknown> | null | undefined, key: string): Record<string, unknown>[] {
  if (!record) return [];
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function resolveDetailHandleValue(detail: Record<string, unknown>): string {
  const directHandle = pickNonEmptyStringFromRecord(detail, [
    "username",
    "user_name",
    "userName",
    "screen_name",
    "screenName",
    "handle",
    "tagged_username",
    "mentioned_username",
    "account_username",
    "profile_username",
    "author",
    "source_account",
  ]);
  if (directHandle) return normalizeHandle(directHandle);
  const userRecord = asRecord(detail.user);
  const nestedHandle = pickNonEmptyStringFromRecord(userRecord, [
    "username",
    "user_name",
    "userName",
    "screen_name",
    "screenName",
    "handle",
  ]);
  return normalizeHandle(nestedHandle);
}

function resolveDetailDisplayNameValue(detail: Record<string, unknown>): string | null {
  const directName = pickNonEmptyStringFromRecord(detail, [
    "full_name",
    "fullName",
    "display_name",
    "displayName",
    "name",
    "nickname",
  ]);
  if (directName) return directName;
  const userRecord = asRecord(detail.user);
  return pickNonEmptyStringFromRecord(userRecord, [
    "full_name",
    "fullName",
    "display_name",
    "displayName",
    "name",
    "nickname",
  ]);
}

function resolveDetailAvatarValue(detail: Record<string, unknown>): string | null {
  const directAvatar = pickNonEmptyStringFromRecord(detail, [
    "profile_pic_url",
    "profile_pic_url_hd",
    "avatar_url",
    "user_avatar_url",
    "profile_image_url",
    "profileImageUrl",
    "profile_picture_url",
    "photo_url",
    "image_url",
  ]);
  if (directAvatar) return directAvatar;
  const userRecord = asRecord(detail.user);
  return pickNonEmptyStringFromRecord(userRecord, [
    "profile_pic_url",
    "profile_pic_url_hd",
    "avatar_url",
    "user_avatar_url",
    "profile_image_url",
    "profileImageUrl",
    "profile_picture_url",
    "photo_url",
    "image_url",
  ]);
}

function resolveDetailProfileUrlValue(detail: Record<string, unknown>): string | null {
  const directUrl = pickNonEmptyStringFromRecord(detail, [
    "url",
    "profile_url",
    "profileUrl",
    "user_url",
    "userUrl",
    "account_url",
    "accountUrl",
  ]);
  if (directUrl) return normalizeExternalUrl(directUrl);
  const userRecord = asRecord(detail.user);
  return normalizeExternalUrl(
    pickNonEmptyStringFromRecord(userRecord, [
      "url",
      "profile_url",
      "profileUrl",
      "user_url",
      "userUrl",
      "account_url",
      "accountUrl",
    ]),
  );
}

function readNormalizedTagCoord(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1) return null;
  return Number(value.toFixed(4));
}

function normalizeSlideIndex(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.trunc(parsed));
}

function getInstagramChildPostRecords(post: unknown): Array<{ slideIndex: number; record: Record<string, unknown> }> {
  const postRecord = asRecord(post);
  if (!postRecord) return [];
  return pickObjectArrayFromRecord(postRecord, "child_posts_data")
    .map((record, index) => ({
      slideIndex: normalizeSlideIndex(record.slide_index, index),
      record,
    }))
    .sort((left, right) => left.slideIndex - right.slideIndex);
}

function buildInstagramTagMarkersFromRecord(record: Record<string, unknown> | null): InstagramTagMarker[] {
  if (!record) return [];
  const markers: InstagramTagMarker[] = [];
  const seen = new Set<string>();

  for (const key of INSTAGRAM_TAG_MARKER_DETAIL_KEYS) {
    for (const detail of pickObjectArrayFromRecord(record, key)) {
      const tagX = readNormalizedTagCoord(detail.tag_x);
      const tagY = readNormalizedTagCoord(detail.tag_y);
      if (tagX === null || tagY === null) continue;
      const handle = resolveDetailHandleValue(detail);
      const label = resolveDetailDisplayNameValue(detail) || formatHandleLabel(handle) || "Tagged";
      const markerId = `${handle || "tagged"}|${tagX}|${tagY}`;
      if (seen.has(markerId)) continue;
      seen.add(markerId);
      markers.push({
        id: markerId,
        xPct: tagX * 100,
        yPct: tagY * 100,
        label,
      });
    }
  }

  return markers;
}

function buildInstagramTagMarkers(post: unknown): InstagramTagMarker[] {
  return buildInstagramTagMarkersFromRecord(asRecord(post));
}

function buildInstagramTagMarkersForSlide(post: unknown, slideIndex: number): InstagramTagMarker[] {
  const childPosts = getInstagramChildPostRecords(post);
  if (childPosts.length === 0) {
    return slideIndex === 0 ? buildInstagramTagMarkers(post) : [];
  }
  const normalizedIndex = Math.max(0, Math.trunc(slideIndex));
  const exactSlide = childPosts.find((entry) => entry.slideIndex === normalizedIndex);
  if (exactSlide) return buildInstagramTagMarkersFromRecord(exactSlide.record);
  const byOrder = childPosts[normalizedIndex];
  return byOrder ? buildInstagramTagMarkersFromRecord(byOrder.record) : [];
}

function InstagramTagMarkersOverlay({
  markers,
  testId,
}: {
  markers: InstagramTagMarker[];
  testId: string;
}) {
  if (markers.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10" data-testid={testId}>
      {markers.map((marker, index) => (
        <div
          key={marker.id}
          data-testid={`${testId}-item-${index}`}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${marker.xPct}%`, top: `${marker.yPct}%` }}
        >
          <span className="block h-2.5 w-2.5 rounded-full border border-white/90 bg-pink-500 shadow-sm" />
          <span className="mt-1 inline-block rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {marker.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function resolvePostAuthorHandle(post: AnyPost): string {
  const userHandle = normalizeHandle(post.user?.username);
  const authorHandle = normalizeHandle(post.author);
  const authorLooksAbbreviated = /^[a-z]{1,3}$/.test(authorHandle);
  if (userHandle && (!authorHandle || authorLooksAbbreviated)) return userHandle;
  if (authorHandle) return authorHandle;
  return userHandle;
}

function buildHandleProfileUrl(handle: string, platform: PlatformFilter): string {
  const normalized = normalizeHandle(handle);
  if (!normalized) return "#";
  if (platform === "twitter") return `https://x.com/${normalized}`;
  if (platform === "tiktok") return `https://www.tiktok.com/@${normalized}`;
  if (platform === "threads") return `https://www.threads.com/@${normalized}`;
  if (platform === "youtube") return `https://www.youtube.com/@${normalized}`;
  if (platform === "facebook") return `https://www.facebook.com/${normalized}`;
  return `https://www.instagram.com/${normalized}/`;
}

function isHandleTokenKey(key: SummaryTokenKey): boolean {
  return key === "collaborators" || key === "mentions" || key === "tags";
}

function isRhoslcShowContext(showSlug: string | null | undefined, showName: string | null | undefined): boolean {
  const normalizedSlug = String(showSlug ?? "").trim().toLowerCase();
  if (normalizedSlug === "rhoslc") return true;
  const normalizedName = String(showName ?? "").trim().toLowerCase();
  if (!normalizedName) return false;
  return normalizedName === "rhoslc" || normalizedName.includes("salt lake city");
}

function normalizeExternalUrl(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeInstagramPermalinkPath(pathname: string): "p" | "reel" | "tv" | null {
  const normalizedPath = pathname.toLowerCase();
  if (normalizedPath.startsWith("/p/")) return "p";
  if (normalizedPath.startsWith("/reel/")) return "reel";
  if (normalizedPath.startsWith("/tv/")) return "tv";
  return null;
}

function resolveInstagramPermalinkFromSource(
  sourceId: string | null | undefined,
  postFormat: string | null | undefined,
  fallbackUrl: string | null,
): string | null {
  const shortcode = String(sourceId ?? "").trim();
  if (!shortcode) return fallbackUrl;
  let permalinkType: "p" | "reel" | "tv" = "p";
  const normalizedFormat = String(postFormat ?? "").trim().toLowerCase();
  const prefersReelPermalink = normalizedFormat === "reel";
  if (normalizedFormat === "reel") {
    permalinkType = "reel";
  }
  if (fallbackUrl) {
    try {
      const parsed = new URL(fallbackUrl);
      const fromPath = normalizeInstagramPermalinkPath(parsed.pathname);
      if (fromPath && !prefersReelPermalink) {
        permalinkType = fromPath;
      }
    } catch {
      // Keep default permalink type when fallback URL cannot be parsed.
    }
  }
  return `https://www.instagram.com/${permalinkType}/${encodeURIComponent(shortcode)}/`;
}

function resolvePostExternalUrl(
  platform: string,
  post: {
    url?: string | null;
    source_id?: string | null;
    post_format?: string | null;
  },
): string | null {
  const normalizedUrl = normalizeExternalUrl(post.url);
  if (platform !== "instagram") return normalizedUrl;
  if (normalizedUrl) {
    try {
      const parsed = new URL(normalizedUrl);
      const host = parsed.hostname.toLowerCase();
      const permalinkType = normalizeInstagramPermalinkPath(parsed.pathname);
      if (host.includes("instagram.com") && permalinkType) {
        return resolveInstagramPermalinkFromSource(post.source_id, post.post_format, normalizedUrl);
      }
    } catch {
      // Fallback to source_id permalink reconstruction below.
    }
  }
  return resolveInstagramPermalinkFromSource(post.source_id, post.post_format, normalizedUrl);
}

type ProxyErrorPayload = {
  error?: string;
  trace_id?: string;
};

function formatErrorWithTraceId(message: string, traceId: unknown): string {
  const traceToken = String(traceId ?? "").trim();
  if (!traceToken) return message;
  return `${message} (trace: ${traceToken})`;
}

async function readApiErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as ProxyErrorPayload;
  const message = String(body.error || "").trim() || fallbackMessage;
  return formatErrorWithTraceId(message, body.trace_id);
}

function getFallbackHandle(platform: string): string {
  const fallback = normalizeHandle(PLATFORM_HANDLE_FALLBACK[platform]);
  return fallback || REQUIRED_BRAVO_HANDLE;
}

function buildHeaderAccounts(platform: string, post: AnyPost, collaborators: string[]): string[] {
  const accounts: string[] = [];
  const authorHandle = resolvePostAuthorHandle(post);
  if (authorHandle) {
    accounts.push(authorHandle);
  }

  for (const collaborator of collaborators) {
    const normalized = normalizeHandle(collaborator);
    if (!normalized) continue;
    accounts.push(normalized);
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const account of accounts) {
    const normalized = normalizeHandle(account) || getFallbackHandle(platform);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(normalized);
  }
  if (deduped.length === 0) return [getFallbackHandle(platform)];
  return deduped;
}

function formatHeaderHandleLine(handles: string[]): string {
  const displayHandles = handles.map((handle) => `@${normalizeHandle(handle)}`).filter((value) => value !== "@");
  if (displayHandles.length === 0) return "@unknown";
  if (displayHandles.length === 1) return displayHandles[0];
  if (displayHandles.length === 2) return `${displayHandles[0]} and ${displayHandles[1]}`;
  return `${displayHandles.slice(0, -1).join(", ")}, and ${displayHandles[displayHandles.length - 1]}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolish(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "verified") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "unverified") return false;
  return null;
}

function normalizeHandleCandidate(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = normalizeHandle(value);
  if (!normalized) return "";
  return /^[a-z0-9._-]{1,64}$/i.test(normalized) ? normalized : "";
}

function addVerifiedHandle(set: Set<string>, handle: unknown, verified: unknown): void {
  if (readBoolish(verified) !== true) return;
  const normalizedHandle = normalizeHandleCandidate(handle);
  if (!normalizedHandle) return;
  set.add(normalizedHandle);
}

function collectVerifiedHandlesFromUnknown(value: unknown, out: Set<string>): void {
  const stack: Array<{ node: unknown; depth: number }> = [{ node: value, depth: 0 }];
  let visited = 0;

  while (stack.length > 0 && visited < 240) {
    const current = stack.pop();
    if (!current) continue;
    visited += 1;
    if (current.depth > 4) continue;

    const node = current.node;
    if (Array.isArray(node)) {
      for (let index = Math.min(node.length, 30) - 1; index >= 0; index -= 1) {
        stack.push({ node: node[index], depth: current.depth + 1 });
      }
      continue;
    }
    if (!isRecord(node)) continue;

    const handleCandidate =
      node.username ??
      node.user_name ??
      node.handle ??
      node.screen_name ??
      node.source_account ??
      node.author;
    const verifiedCandidate =
      node.is_verified ??
      node.verified ??
      node.user_verified ??
      node.owner_is_verified ??
      node.author_is_verified ??
      node.is_blue_verified ??
      node.isVerified ??
      node.verification_status;
    addVerifiedHandle(out, handleCandidate, verifiedCandidate);

    for (const nestedValue of Object.values(node)) {
      if (Array.isArray(nestedValue) || isRecord(nestedValue)) {
        stack.push({ node: nestedValue, depth: current.depth + 1 });
      }
    }
  }
}

function resolveVerifiedHeaderHandles(platform: string, post: AnyPost, headerAccounts: string[]): Set<string> {
  if (!VERIFIED_BADGE_URL_BY_PLATFORM[platform]) return new Set<string>();

  const verifiedHandles = new Set<string>();
  const postRecord = post as unknown as Record<string, unknown>;
  const directAuthorVerification =
    postRecord.owner_is_verified ??
    postRecord.user_verified ??
    postRecord.is_verified ??
    postRecord.author_is_verified;
  addVerifiedHandle(verifiedHandles, post.author, directAuthorVerification);

  if (isRecord(post.user)) {
    const userRecord = post.user as Record<string, unknown>;
    addVerifiedHandle(
      verifiedHandles,
      userRecord.username,
      userRecord.is_verified ?? userRecord.verified ?? userRecord.user_verified ?? userRecord.verification_status,
    );
  }

  const collaboratorsDetail = postRecord.collaborators_detail;
  if (Array.isArray(collaboratorsDetail)) {
    for (const detail of collaboratorsDetail) {
      if (!isRecord(detail)) continue;
      addVerifiedHandle(verifiedHandles, detail.username, detail.is_verified ?? detail.verified ?? detail.isVerified);
    }
  }

  collectVerifiedHandlesFromUnknown(postRecord.raw_data, verifiedHandles);

  const headerSet = new Set<string>(
    headerAccounts.map((account) => normalizeHandleCandidate(account)).filter((account) => account.length > 0),
  );
  const filtered = new Set<string>();
  for (const handle of verifiedHandles) {
    if (headerSet.has(handle)) filtered.add(handle);
  }
  return filtered;
}

function VerifiedAccountBadge({ platform, handle }: { platform: string; handle: string }) {
  const src = VERIFIED_BADGE_URL_BY_PLATFORM[platform];
  const normalized = normalizeHandle(handle);
  if (!src || !normalized) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`@${normalized} verified badge`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-3.5 w-3.5 rounded-full"
      data-testid={`verified-badge-${platform}-${normalized}`}
    />
  );
}

function HeaderHandleLine({
  platform,
  handles,
  verifiedHandles,
}: {
  platform: string;
  handles: string[];
  verifiedHandles: Set<string>;
}) {
  const normalizedHandles = handles.map((handle) => normalizeHandle(handle)).filter((handle) => handle.length > 0);
  if (normalizedHandles.length === 0) return <span>@unknown</span>;

  return (
    <>
      {normalizedHandles.map((handle, index) => {
        const separator =
          index < normalizedHandles.length - 2
            ? ", "
            : index === normalizedHandles.length - 2
              ? normalizedHandles.length > 2
                ? ", and "
                : " and "
              : "";
        return (
          <span key={`header-handle-${platform}-${handle}-${index}`} className="inline">
            <span className="inline-flex items-center gap-1">
              <span>@{handle}</span>
              {verifiedHandles.has(handle) ? <VerifiedAccountBadge platform={platform} handle={handle} /> : null}
            </span>
            {separator}
          </span>
        );
      })}
    </>
  );
}

function initialsFromHandle(handle: string): string {
  const normalized = normalizeHandle(handle);
  if (!normalized) return "?";
  const alnum = normalized.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!alnum) return "?";
  return alnum.slice(0, 2);
}

function fallbackAvatarToneClass(handle: string): string {
  const tones = [
    "bg-sky-600 text-white",
    "bg-emerald-600 text-white",
    "bg-rose-600 text-white",
    "bg-violet-600 text-white",
    "bg-amber-600 text-white",
    "bg-slate-600 text-white",
  ] as const;
  const normalized = normalizeHandle(handle);
  let sum = 0;
  for (const char of normalized) {
    sum += char.charCodeAt(0);
  }
  return tones[sum % tones.length];
}

function resolveCaseInsensitiveRecordValue(
  recordValue: Record<string, string> | null | undefined,
  key: string,
): string | null {
  if (!recordValue || typeof recordValue !== "object") return null;
  const normalizedKey = normalizeHandle(key);
  if (!normalizedKey) return null;
  for (const [entryKey, entryValue] of Object.entries(recordValue)) {
    if (normalizeHandle(entryKey) !== normalizedKey) continue;
    const value = String(entryValue || "").trim();
    if (value) return value;
  }
  return null;
}

type HandleProfile = {
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
};

const POST_HANDLE_PROFILE_CACHE = new WeakMap<object, Map<string, HandleProfile>>();
const PROFILE_DETAIL_KEYS: readonly string[] = [
  ...TOKEN_HANDLE_DETAIL_KEYS,
  "tagged_users_detail",
  "collaborators_detail",
];

function getPostDetailObjects(post: AnyPost): Record<string, unknown>[] {
  const postRecord = asRecord(post);
  const details: Record<string, unknown>[] = [];
  for (const key of PROFILE_DETAIL_KEYS) {
    details.push(...pickObjectArrayFromRecord(postRecord, key));
  }
  return details;
}

function resolveHandleAvatarFromDetail(post: AnyPost, handle: string): string | null {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return null;
  for (const detail of getPostDetailObjects(post)) {
    if (resolveDetailHandleValue(detail) !== normalizedHandle) continue;
    const avatarUrl = resolveDetailAvatarValue(detail);
    if (avatarUrl) return avatarUrl;
  }
  return null;
}

function setHandleProfile(
  profileMap: Map<string, HandleProfile>,
  handle: string | null | undefined,
  displayName: string | null | undefined,
  avatarUrl: string | null | undefined,
  profileUrl: string | null | undefined,
): void {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return;
  const normalizedDisplayName = String(displayName ?? "").trim() || null;
  const normalizedAvatarUrl = String(avatarUrl ?? "").trim() || null;
  const normalizedProfileUrl = normalizeExternalUrl(profileUrl ?? null);
  const existing = profileMap.get(normalizedHandle) ?? { displayName: null, avatarUrl: null, profileUrl: null };
  profileMap.set(normalizedHandle, {
    displayName: existing.displayName ?? normalizedDisplayName,
    avatarUrl: existing.avatarUrl ?? normalizedAvatarUrl,
    profileUrl: existing.profileUrl ?? normalizedProfileUrl,
  });
}

function buildPostHandleProfileMap(post: AnyPost): Map<string, HandleProfile> {
  const cached = POST_HANDLE_PROFILE_CACHE.get(post as unknown as object);
  if (cached) return cached;

  const profileMap = new Map<string, HandleProfile>();
  const postRecord = asRecord(post);
  const userRecord = asRecord(post.user);
  const authorHandle = resolvePostAuthorHandle(post);
  setHandleProfile(
    profileMap,
    authorHandle,
    pickNonEmptyStringFromRecord(userRecord, ["full_name", "fullName", "display_name", "displayName", "name", "nickname"]) ??
      pickNonEmptyStringFromRecord(postRecord, ["owner_full_name", "full_name", "fullName", "display_name", "displayName", "name", "nickname"]),
    (String(post.hosted_owner_profile_pic_url ?? "").trim() || null) ??
      pickNonEmptyStringFromRecord(userRecord, ["avatar_url", "user_avatar_url"]) ??
      (String(post.owner_profile_pic_url ?? "").trim() || null),
    pickNonEmptyStringFromRecord(userRecord, ["url", "profile_url", "profileUrl", "user_url", "userUrl"]) ??
      pickNonEmptyStringFromRecord(postRecord, ["user_profile_url", "profile_url", "profileUrl", "user_url", "userUrl"]),
  );

  for (const detail of getPostDetailObjects(post)) {
    setHandleProfile(
      profileMap,
      resolveDetailHandleValue(detail),
      resolveDetailDisplayNameValue(detail),
      resolveDetailAvatarValue(detail),
      resolveDetailProfileUrlValue(detail),
    );
  }

  const commentStack = Array.isArray(postRecord?.comments) ? [...(postRecord?.comments as unknown[])] : [];
  while (commentStack.length > 0) {
    const comment = commentStack.pop();
    const commentRecord = asRecord(comment);
    if (!commentRecord) continue;
    const commentUser = asRecord(commentRecord.user);
    setHandleProfile(
      profileMap,
      pickNonEmptyStringFromRecord(commentUser, ["username", "user_name", "userName", "handle"]) ??
        pickNonEmptyStringFromRecord(commentRecord, ["author", "username", "user_name", "userName"]),
      pickNonEmptyStringFromRecord(commentUser, ["full_name", "fullName", "display_name", "displayName", "name", "nickname"]) ??
        pickNonEmptyStringFromRecord(commentRecord, ["display_name", "displayName", "nickname", "name"]),
      pickNonEmptyStringFromRecord(commentUser, ["avatar_url", "user_avatar_url", "profile_pic_url", "profile_pic_url_hd"]) ??
        pickNonEmptyStringFromRecord(commentRecord, ["user_avatar_url", "avatar_url", "profile_pic_url", "profile_pic_url_hd"]),
      pickNonEmptyStringFromRecord(commentUser, ["url", "profile_url", "profileUrl", "user_url", "userUrl"]) ??
        pickNonEmptyStringFromRecord(commentRecord, ["url", "profile_url", "profileUrl", "user_url", "userUrl"]),
    );
    if (Array.isArray(commentRecord.replies)) {
      commentStack.push(...commentRecord.replies);
    }
  }

  const quoteRows = Array.isArray(postRecord?.quotes) ? (postRecord?.quotes as unknown[]) : [];
  for (const quote of quoteRows) {
    const quoteRecord = asRecord(quote);
    if (!quoteRecord) continue;
    const quoteUser = asRecord(quoteRecord.user);
    setHandleProfile(
      profileMap,
      pickNonEmptyStringFromRecord(quoteUser, ["username", "user_name", "userName", "handle"]) ??
        pickNonEmptyStringFromRecord(quoteRecord, ["author", "username", "user_name", "userName"]),
      pickNonEmptyStringFromRecord(quoteUser, ["full_name", "fullName", "display_name", "displayName", "name", "nickname"]) ??
        pickNonEmptyStringFromRecord(quoteRecord, ["display_name", "displayName", "nickname", "name"]),
      pickNonEmptyStringFromRecord(quoteUser, ["avatar_url", "user_avatar_url", "profile_pic_url", "profile_pic_url_hd"]) ??
        pickNonEmptyStringFromRecord(quoteRecord, ["user_avatar_url", "avatar_url", "profile_pic_url", "profile_pic_url_hd"]),
      pickNonEmptyStringFromRecord(quoteUser, ["url", "profile_url", "profileUrl", "user_url", "userUrl"]) ??
        pickNonEmptyStringFromRecord(quoteRecord, ["url", "profile_url", "profileUrl", "user_url", "userUrl"]),
    );
  }

  const rawDataRecord = asRecord(postRecord?.raw_data);
  const rawStack: Array<{ node: unknown; depth: number }> = rawDataRecord ? [{ node: rawDataRecord, depth: 0 }] : [];
  let traversed = 0;
  while (rawStack.length > 0 && traversed < 300) {
    const current = rawStack.pop();
    if (!current) continue;
    traversed += 1;
    if (current.depth > 5) continue;
    if (Array.isArray(current.node)) {
      for (let index = current.node.length - 1; index >= 0; index -= 1) {
        rawStack.push({ node: current.node[index], depth: current.depth + 1 });
      }
      continue;
    }
    const record = asRecord(current.node);
    if (!record) continue;
    setHandleProfile(
      profileMap,
      resolveDetailHandleValue(record),
      resolveDetailDisplayNameValue(record),
      resolveDetailAvatarValue(record),
      resolveDetailProfileUrlValue(record),
    );
    const nestedUser = asRecord(record.user);
    if (nestedUser) {
      setHandleProfile(
        profileMap,
        pickNonEmptyStringFromRecord(nestedUser, ["username", "user_name", "userName", "handle"]),
        pickNonEmptyStringFromRecord(nestedUser, ["full_name", "fullName", "display_name", "displayName", "name", "nickname"]),
        pickNonEmptyStringFromRecord(nestedUser, ["avatar_url", "user_avatar_url", "profile_pic_url", "profile_pic_url_hd"]),
        pickNonEmptyStringFromRecord(nestedUser, ["url", "profile_url", "profileUrl", "user_url", "userUrl"]),
      );
    }
    for (const nested of Object.values(record)) {
      if (Array.isArray(nested) || asRecord(nested) !== null) {
        rawStack.push({ node: nested, depth: current.depth + 1 });
      }
    }
  }

  POST_HANDLE_PROFILE_CACHE.set(post as unknown as object, profileMap);
  return profileMap;
}

function resolveHandleProfile(post: AnyPost, handle: string): HandleProfile | null {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return null;
  return buildPostHandleProfileMap(post).get(normalizedHandle) ?? null;
}

function resolveAccountAvatarUrl(post: AnyPost, handle: string, isAuthor: boolean): string | null {
  const profileAvatar = resolveHandleProfile(post, handle)?.avatarUrl ?? null;
  const hostedProfileAvatar = profileAvatar && isLikelyMirroredSocialUrl(profileAvatar) ? profileAvatar : null;

  if (isAuthor) {
    const hostedOwnerAvatar = String(post.hosted_owner_profile_pic_url || "").trim();
    if (hostedOwnerAvatar) return hostedOwnerAvatar;
    if (hostedProfileAvatar) return hostedProfileAvatar;
    const userAvatar = String(post.user?.avatar_url || "").trim();
    if (userAvatar) return userAvatar;
    const ownerAvatar = String(post.owner_profile_pic_url || "").trim();
    if (ownerAvatar) return ownerAvatar;
    return profileAvatar;
  }
  const hostedTagged = resolveCaseInsensitiveRecordValue(post.hosted_tagged_profile_pics, handle);
  if (hostedTagged) return hostedTagged;
  if (hostedProfileAvatar) return hostedProfileAvatar;
  const detailAvatar = resolveHandleAvatarFromDetail(post, handle);
  if (detailAvatar) return detailAvatar;
  return profileAvatar;
}

function HeaderAccountAvatar({ handle, avatarUrl }: { handle: string; avatarUrl: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const normalizedHandle = normalizeHandle(handle);
  const label = `@${normalizedHandle || "unknown"} avatar`;
  if (avatarUrl && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={label}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-6 w-6 rounded-full border border-white object-cover shadow-sm"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-white text-[10px] font-semibold uppercase shadow-sm ${fallbackAvatarToneClass(handle)}`}
    >
      {initialsFromHandle(handle)}
    </span>
  );
}

function InlineCaptionText({
  platform,
  text,
  post,
}: {
  platform: string;
  text: string | null | undefined;
  post?: AnyPost;
}) {
  const normalizedText = normalizeCaptionPreviewText(platform, text);
  if (!normalizedText) return <span>(No caption)</span>;

  const captionTokenRe = /#[A-Za-z0-9_]+|@[A-Za-z0-9_.]+/g;
  const segments: React.ReactElement[] = [];
  let cursor = 0;
  let tokenIndex = 0;
  const authorHandle = post ? resolvePostAuthorHandle(post) : "";

  for (const match of normalizedText.matchAll(captionTokenRe)) {
    const token = match[0] ?? "";
    const index = match.index ?? -1;
    if (!token || index < 0) continue;
    if (index > cursor) {
      segments.push(
        <span key={`caption-text-${index}-${tokenIndex}`}>
          {normalizedText.slice(cursor, index)}
        </span>,
      );
    }
    if (token.startsWith("#")) {
      const hashtagLabel = `#${token.replace(/^#+/, "")}`;
      segments.push(
        <span key={`caption-tag-${index}-${tokenIndex}`} className="inline-flex rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
          {hashtagLabel}
        </span>,
      );
    } else if (token.startsWith("@")) {
      const mentionHandle = normalizeHandle(token);
      const mentionAvatar =
        post && mentionHandle
          ? resolveAccountAvatarUrl(post, mentionHandle, mentionHandle === authorHandle) ??
            resolveHandleProfile(post, mentionHandle)?.avatarUrl ??
            null
          : null;
      segments.push(
        <span
          key={`caption-mention-${index}-${tokenIndex}`}
          className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-xs text-purple-700"
        >
          {mentionAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mentionAvatar}
              alt={`@${mentionHandle || "unknown"} avatar`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-3.5 w-3.5 rounded-full object-cover"
            />
          ) : null}
          <span>@{mentionHandle || token.replace(/^@+/, "")}</span>
        </span>,
      );
    } else {
      segments.push(<span key={`caption-token-${index}-${tokenIndex}`}>{token}</span>);
    }
    cursor = index + token.length;
    tokenIndex += 1;
  }

  if (cursor < normalizedText.length) {
    segments.push(<span key={`caption-tail-${cursor}`}>{normalizedText.slice(cursor)}</span>);
  }

  return <>{segments}</>;
}

function HandleProfileChip({
  post,
  handle,
  className,
}: {
  post: AnyPost;
  handle: string;
  className: string;
}) {
  const normalizedHandle = normalizeHandle(handle);
  if (!normalizedHandle) return null;
  const profile = resolveHandleProfile(post, normalizedHandle);
  const avatarUrl =
    resolveAccountAvatarUrl(post, normalizedHandle, normalizedHandle === resolvePostAuthorHandle(post)) ??
    profile?.avatarUrl ??
    null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${className}`}
      title={profile?.displayName ?? undefined}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={`@${normalizedHandle} avatar`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-3.5 w-3.5 rounded-full object-cover"
        />
      ) : null}
      <span>{formatHandleLabel(normalizedHandle)}</span>
    </span>
  );
}

function getJobStage(job: SocialJob): string {
  if (typeof job.config?.stage === "string" && job.config.stage) return job.config.stage;
  if (typeof job.metadata?.stage === "string" && job.metadata.stage) return job.metadata.stage;
  if (typeof job.job_type === "string" && job.job_type) return job.job_type;
  return "posts";
}

function getJobStageCounters(job: SocialJob): { posts: number; comments: number } | null {
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
}

function getJobPersistCounters(job: SocialJob): { posts_upserted: number; comments_upserted: number } | null {
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
}

function formatSyncStageLabel(stage: string): string {
  const normalized = String(stage || "").trim().toLowerCase();
  if (normalized === "posts") return "Posts";
  if (normalized === "comments") return "Comments";
  if (normalized === "media_mirror") return "Mirror";
  if (normalized === "comment_media_mirror") return "Comment Mirror";
  if (normalized === "profile_pictures") return "Profile Pictures";
  if (normalized === "other") return "Other";
  if (!normalized) return "Stage";
  return normalized
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStageStatus(stage: StageProgressSnapshot): {
  label: string;
  toneClass: string;
} {
  if (stage.total <= 0) {
    return {
      label: stage.running > 0 ? "Running" : stage.waiting > 0 ? "Queued" : "Waiting",
      toneClass:
        stage.running > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600",
    };
  }
  const finished = stage.completed + stage.failed;
  if (finished >= stage.total) {
    if (stage.failed > 0 && stage.completed === 0) {
      return { label: "Failed", toneClass: "bg-red-100 text-red-700" };
    }
    if (stage.failed > 0) {
      return { label: `Done (${stage.failed} failed)`, toneClass: "bg-amber-100 text-amber-700" };
    }
    return { label: "Done", toneClass: "bg-emerald-100 text-emerald-700" };
  }
  if (stage.running > 0) {
    return { label: "Running", toneClass: "bg-blue-100 text-blue-700" };
  }
  return { label: "Queued", toneClass: "bg-gray-100 text-gray-600" };
}

function formatRunStatus(status: SocialRun["status"]): string {
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

function formatPlatformSyncStatus(status: string | null | undefined, postCount = 1): string {
  const normalized = String(status ?? "").trim();
  if (postCount <= 0 && !["queued", "running"].includes(normalized.toLowerCase())) return "No posts";
  if (!normalized) return "Idle";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).replace(/_/g, " ");
}

function getPlatformSyncTone(status: string | null | undefined, stale = false, postCount = 1): string {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (postCount <= 0 && !["queued", "running"].includes(normalized)) return "bg-zinc-100 text-zinc-600";
  if (normalized === "failed") return "bg-red-100 text-red-700";
  if (normalized === "running" || normalized === "queued") return "bg-blue-100 text-blue-700";
  if (normalized === "partial" || stale) return "bg-amber-100 text-amber-700";
  if (normalized === "complete") return "bg-emerald-100 text-emerald-700";
  return "bg-zinc-100 text-zinc-600";
}

const ACTIVE_JOB_STAGE_ORDER: Array<NonNullable<ActiveJobSummaryPayload["dominant_stage"]>> = [
  "posts",
  "comments",
  "media_mirror",
  "comment_media_mirror",
];

function formatActiveJobSummary(summary: ActiveJobSummaryPayload | null | undefined): string | null {
  if (!summary?.sync_status) return null;
  const stageLabel = String(summary.dominant_stage ?? "sync").replaceAll("_", " ");
  const jobCount = Number(summary.job_count ?? 0);
  const countLabel = Number.isFinite(jobCount) && jobCount > 0 ? ` · ${fmtNum(jobCount)} jobs` : "";
  const stageStatuses = Object.entries(summary.stage_statuses ?? {})
    .filter((entry): entry is [string, { status?: "queued" | "running"; job_count?: number }] => Boolean(entry[0]))
    .sort(
      ([stageA], [stageB]) =>
        ACTIVE_JOB_STAGE_ORDER.indexOf(stageA as (typeof ACTIVE_JOB_STAGE_ORDER)[number]) -
        ACTIVE_JOB_STAGE_ORDER.indexOf(stageB as (typeof ACTIVE_JOB_STAGE_ORDER)[number]),
    )
    .map(([stage, payload]) => {
      const stageJobCount = Number(payload?.job_count ?? 0);
      const countSuffix = Number.isFinite(stageJobCount) && stageJobCount > 0 ? ` ${fmtNum(stageJobCount)}` : "";
      return `${formatPlatformSyncStatus(payload?.status)} ${stage.replaceAll("_", " ")}${countSuffix}`;
    });
  const detailLabel = stageStatuses.length > 1 ? ` · ${stageStatuses.join(", ")}` : "";
  return `${formatPlatformSyncStatus(summary.sync_status)} ${stageLabel}${countLabel}${detailLabel}`;
}

function formatPlatformStatusSummary(status: PlatformStatusPayload | null | undefined, postCount = 1): string {
  const syncStatus = String(status?.sync_status ?? "").trim().toLowerCase();
  if (postCount <= 0 && ["partial", "failed"].includes(syncStatus)) {
    return "Previous sync attempts for this week did not complete cleanly";
  }
  if (postCount <= 0 && !["queued", "running"].includes(syncStatus)) return "No posts in this week window";
  if (postCount <= 0) return "Sync in progress for this week window";
  if (!status) return "No status available";
  const commentSaved = status.comment_sync_status?.upserted_count ?? 0;
  const commentExpected = status.comment_sync_status?.expected_count ?? 0;
  const mirrorReady = status.media_mirror_status?.mirrored_count ?? 0;
  const mirrorTotal = status.media_mirror_status?.source_count ?? 0;
  const displayedCommentSaved = commentExpected > 0 ? Math.min(commentSaved, commentExpected) : commentSaved;
  const displayedMirrorReady = mirrorTotal > 0 ? Math.min(mirrorReady, mirrorTotal) : mirrorReady;
  const commentText =
    commentExpected > 0 ? `Comments ${fmtNum(displayedCommentSaved)}/${fmtNum(commentExpected)}` : "Comments n/a";
  const mirrorText =
    mirrorTotal > 0 ? `Mirror ${fmtNum(displayedMirrorReady)}/${fmtNum(mirrorTotal)}` : "Mirror n/a";
  return `${commentText} · ${mirrorText}`;
}

function hasPlatformSyncInFlight(status: PlatformStatusPayload | null | undefined): boolean {
  const normalized = String(status?.sync_status ?? "").trim().toLowerCase();
  return normalized === "queued" || normalized === "running";
}

function getPlatformStatusPostCount(response: WeekDetailResponse, platform: string): number {
  return Math.max(0, Number(response.platforms?.[platform]?.totals?.posts ?? 0));
}

function getVisiblePlatformStatuses(
  response: WeekDetailResponse | null,
  platformFilter: PlatformFilter,
): VisiblePlatformStatusCard[] {
  if (!response?.status_by_platform) return [];
  const selectedPlatforms = platformFilter === "all" ? PLATFORM_KEYS : [platformFilter];
  return selectedPlatforms
    .map((platform) => {
      const status = response.status_by_platform?.[platform];
      if (!status) return null;
      return {
        platform,
        status,
        postCount: getPlatformStatusPostCount(response, platform),
      };
    })
    .filter((entry): entry is VisiblePlatformStatusCard => entry !== null);
}

const MAX_THREADED_COMMENT_DEPTH = 128;

/* ------------------------------------------------------------------ */
/* Threaded comment component                                          */
/* ------------------------------------------------------------------ */

function ThreadedCommentItem({
  comment,
  depth = 0,
  seenCommentIds = new Set<string>(),
}: {
  comment: ThreadedComment;
  depth?: number;
  seenCommentIds?: ReadonlySet<string>;
}) {
  const commentId = comment.comment_id;
  const visited = useMemo(() => {
    const next = new Set<string>(seenCommentIds);
    if (commentId) next.add(commentId);
    return next;
  }, [seenCommentIds, commentId]);
  const [expanded, setExpanded] = useState(depth < 2);
  const replies = Array.isArray(comment.replies) ? comment.replies : [];
  const hasReplies = replies.length > 0;
  const visibleReplies = replies.filter((reply) => !visited.has(reply.comment_id));
  const suppressedReplies = replies.length - visibleReplies.length;
  const hasDepthBudget = depth < MAX_THREADED_COMMENT_DEPTH;
  if (commentId && seenCommentIds.has(commentId)) {
    return (
      <div className="ml-4 border-l-2 border-amber-200 pl-3 py-2 text-xs text-amber-700">
        Recursion guard: comment already rendered in this thread.
      </div>
    );
  }
  const hostedMedia = Array.isArray(comment.hosted_media_urls) ? comment.hosted_media_urls : [];
  const sourceMedia = Array.isArray(comment.media_urls) ? comment.media_urls : [];
  const mediaUrls = (hostedMedia.length > 0 ? hostedMedia : sourceMedia).filter((url) => !!url);
  const avatarUrl =
    (typeof comment.user?.avatar_url === "string" ? comment.user.avatar_url : "") ||
    null;
  const displayHandle =
    (typeof comment.user?.username === "string" ? comment.user.username : "") ||
    comment.author ||
    "unknown";
  const displayName =
    (typeof comment.user?.display_name === "string" ? comment.user.display_name : "") ||
    "";
  const isImageUrl = (url: string): boolean =>
    /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url) || url.includes("image-origin");

  return (
    <div className={depth > 0 ? "ml-4 pl-3 border-l-2 border-gray-100" : ""}>
      <div className="py-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={`@${displayHandle} avatar`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-5 w-5 rounded-full object-cover border border-gray-200"
            />
          ) : null}
          <span className="font-medium text-gray-700">@{displayHandle}</span>
          {displayName ? <span className="text-gray-500">({displayName})</span> : null}
          {comment.created_at && <span>{fmtDateTime(comment.created_at)}</span>}
          {comment.likes > 0 && (
            <span className="font-medium text-gray-600">{fmtNum(comment.likes)} likes</span>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
          {comment.text}
        </p>
        {mediaUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {mediaUrls.map((mediaUrl, index) => (
              <a
                key={`${comment.comment_id}-media-${index + 1}`}
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Comment media ${index + 1}`}
                className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
              >
                {isImageUrl(mediaUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl}
                    alt={`Comment media ${index + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 rounded object-cover"
                  />
                ) : (
                  `Comment media ${index + 1}`
                )}
              </a>
            ))}
          </div>
        )}
        {hasReplies && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            {expanded ? "Hide" : "Show"} {comment.replies.length}{" "}
            {comment.replies.length === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>
      {expanded && hasReplies && hasDepthBudget && (
        <div>
          {visibleReplies.map((reply) => (
            <ThreadedCommentItem
              key={reply.comment_id}
              comment={reply}
              depth={depth + 1}
              seenCommentIds={visited}
            />
          ))}
          {suppressedReplies > 0 ? (
            <p className="ml-4 border-l-2 border-amber-200 pl-3 py-1 text-xs text-amber-700">
              {suppressedReplies} nested replies skipped due to thread cycle.
            </p>
          ) : null}
        </div>
      )}
      {expanded && hasReplies && !hasDepthBudget ? (
        <p className="ml-4 border-l-2 border-amber-200 pl-3 py-1 text-xs text-amber-700">
          Max thread depth reached. {replies.length} {replies.length === 1 ? "reply" : "replies"} hidden.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post Details Drawer                                                 */
/* ------------------------------------------------------------------ */

function PostStatsDrawer({
  showId,
  seasonNumber,
  seasonId,
  platform,
  sourceId,
  onOpenMediaLightbox,
  onClose,
}: {
  showId: string;
  seasonNumber: string;
  seasonId?: string | null;
  platform: string;
  sourceId: string;
  onOpenMediaLightbox?: ((preferredSrc?: string | null, detailMedia?: PostDetailMediaFields | null) => void) | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [replyQuoteMode, setReplyQuoteMode] = useState<"replies" | "quotes">("replies");
  const [instagramDrawerSlideIndex, setInstagramDrawerSlideIndex] = useState(0);

  const fetchPostStats = useCallback(async (): Promise<PostDetailResponse> => {
    const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
    const params = new URLSearchParams();
    if (seasonId) {
      params.set("season_id", seasonId);
    }
    const baseUrl = `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/posts/${platform}/${sourceId}`;
    const url = `${baseUrl}${
        params.toString() ? `?${params.toString()}` : ""
      }`;
    const res = await fetchWithTimeout(
      url,
      {
        headers,
        cache: "no-store",
      },
      REQUEST_TIMEOUT_MS.weekDetail,
      "Post detail request timed out",
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as Record<string, string>).error || `HTTP ${res.status}`,
      );
    }
    return await parseResponseJson<PostDetailResponse>(res, "Failed to load post detail");
  }, [seasonId, seasonNumber, showId, platform, sourceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchPostStats();
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPostStats]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setReplyQuoteMode("replies");
    setInstagramDrawerSlideIndex(0);
  }, [platform, sourceId]);

  const handleRefreshComments = useCallback(async () => {
    try {
      setRefreshing(true);
      setRefreshError(null);
      setHasRefreshed(false);
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const refreshTimeoutMs =
        platform === "youtube" ? REQUEST_TIMEOUT_MS.weekDetailYoutubeRefresh : REQUEST_TIMEOUT_MS.weekDetailRefresh;
      const params = new URLSearchParams();
      if (seasonId) {
        params.set("season_id", seasonId);
      }
      const baseUrl = `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/posts/${platform}/${sourceId}`;
      const url = `${baseUrl}/refresh${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            max_comments_per_post: 100000,
            fetch_replies: true,
          }),
        },
        refreshTimeoutMs,
        "Post comments refresh request timed out",
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as Record<string, string>).error || `HTTP ${res.status}`);
      }
      setData(await parseResponseJson<PostDetailResponse>(res, "Failed to refresh post"));
      setHasRefreshed(true);
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Failed to refresh post");
    } finally {
      setRefreshing(false);
    }
  }, [seasonId, showId, seasonNumber, platform, sourceId]);

  const reportedCommentsCount = data
    ? (typeof data.refresh?.comment_gap?.reported === "number"
        ? Math.max(0, Number(data.refresh?.comment_gap?.reported ?? 0))
        : getReportedCommentCountFromStats(data.platform, data.stats))
    : 0;
  const savedCommentsCount = data
    ? (typeof data.refresh?.comment_gap?.saved === "number"
        ? Math.max(0, Number(data.refresh?.comment_gap?.saved ?? 0))
        : Math.max(0, Number(data.total_comments_in_db ?? 0)))
    : 0;
  const commentsIncomplete = data?.refresh?.comment_gap
    ? data.refresh.comment_gap.is_complete === false
    : isCommentsCoverageIncomplete(savedCommentsCount, reportedCommentsCount);
  const commentGapReason = data?.refresh?.comment_gap?.reason ?? null;
  const refreshWarnings = (data?.refresh?.warnings ?? []).filter((warning): warning is string => typeof warning === "string");
  const isTwitterPost = data?.platform === "twitter";
  const detailMetricFormatter = isTwitterPost ? fmtExactNum : fmtNum;
  const supportsReplyQuoteSwitch = data?.platform === "twitter" || data?.platform === "threads";
  const twitterQuoteCount = data ? Math.max(0, Number(data.total_quotes_in_db ?? 0)) : 0;
  const quoteCommentsAsThreaded: ThreadedComment[] = (data?.quotes ?? []).map((quote) => ({
    comment_id: quote.comment_id,
    author: quote.author,
    text: quote.text,
    likes: Number(quote.likes ?? 0),
    is_reply: false,
    reply_count: Number(quote.reply_count ?? 0),
    created_at: quote.created_at,
    media_urls: quote.media_urls ?? undefined,
    hosted_media_urls: quote.hosted_media_urls ?? undefined,
    user: {
      id: quote.user?.id ?? null,
      username: quote.user?.username ?? quote.author ?? null,
      display_name: quote.user?.display_name ?? quote.display_name ?? null,
      url: quote.user?.url ?? null,
      avatar_url: quote.user?.avatar_url ?? null,
    },
    replies: [],
  }));
  const savedQuoteCount = quoteCommentsAsThreaded.length;
  const reportedQuoteCount = data
    ? Math.max(
        savedQuoteCount,
        isTwitterPost
          ? twitterQuoteCount
          : Math.max(0, Number(data.stats?.quotes ?? 0)),
      )
    : 0;
  const quotesIncomplete = savedQuoteCount < reportedQuoteCount;
  const activeComments =
    supportsReplyQuoteSwitch && replyQuoteMode === "quotes" ? quoteCommentsAsThreaded : (data?.comments ?? []);
  const instagramDrawerSlides = useMemo(() => {
    if (!data || data.platform !== "instagram") return [];
    return buildInstagramDrawerSlides(data);
  }, [data]);
  const boundedInstagramDrawerSlideIndex =
    instagramDrawerSlides.length > 0
      ? Math.min(instagramDrawerSlideIndex, instagramDrawerSlides.length - 1)
      : 0;
  const activeInstagramDrawerSlide =
    instagramDrawerSlides[boundedInstagramDrawerSlideIndex] ?? null;
  const hasInstagramDrawerSlideNavigation =
    (data?.platform === "instagram" && data.post_format === "carousel") ||
    (data?.platform === "instagram" && instagramDrawerSlides.length > 1);
  const drawerThumbnailUrl = data
    ? data.platform === "instagram"
      ? activeInstagramDrawerSlide?.src ?? getPostDetailThumbnailUrl(data)
      : getPostDetailThumbnailUrl(data)
    : null;
  const preferredDrawerMediaSrc = data
    ? data.platform === "instagram"
      ? activeInstagramDrawerSlide?.src ?? getPreferredPostDetailMediaSrc(data)
      : getPreferredPostDetailMediaSrc(data)
    : null;
  const detailExternalUrl = data ? resolvePostExternalUrl(data.platform, data) : null;
  const instagramTagMarkers =
    data?.platform === "instagram"
      ? buildInstagramTagMarkersForSlide(data, boundedInstagramDrawerSlideIndex)
      : [];

  useEffect(() => {
    if (instagramDrawerSlides.length === 0) {
      if (instagramDrawerSlideIndex !== 0) {
        setInstagramDrawerSlideIndex(0);
      }
      return;
    }
    if (instagramDrawerSlideIndex > instagramDrawerSlides.length - 1) {
      setInstagramDrawerSlideIndex(instagramDrawerSlides.length - 1);
    }
  }, [instagramDrawerSlideIndex, instagramDrawerSlides.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Post Details</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshComments}
              disabled={refreshing}
              className="text-xs font-semibold tracking-wide px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {refreshing ? "Refreshing..." : "REFRESH"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="text-center text-gray-500 py-12">Loading all comments...</div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}
          {refreshError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">
              {refreshError}
            </div>
          )}
          {refreshWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm mb-4">
              <p className="font-semibold mb-1">Refresh completed with warnings:</p>
              <ul className="list-disc pl-5">
                {refreshWarnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          {hasRefreshed && !refreshing && data?.refresh?.detail_sync && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm mb-4">
              <p className="font-semibold mb-1">Refresh complete:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>
                  Detail sync:{" "}
                  {data.refresh.detail_sync.detail?.status === "success"
                    ? "scraped"
                    : data.refresh.detail_sync.detail?.status === "failed"
                      ? `failed${data.refresh.detail_sync.detail.error ? ` — ${data.refresh.detail_sync.detail.error}` : ""}`
                      : (data.refresh.detail_sync.detail?.status ?? "unknown")}
                </li>
                <li>
                  Media mirror:{" "}
                  {data.refresh.detail_sync.media?.status === "failed"
                    ? `failed${data.refresh.detail_sync.media.error ? ` — ${data.refresh.detail_sync.media.error}` : ""}`
                    : typeof data.refresh.detail_sync.media?.mirrored_assets === "number"
                      ? `${data.refresh.detail_sync.media.mirrored_assets} asset${data.refresh.detail_sync.media.mirrored_assets !== 1 ? "s" : ""} mirrored`
                      : (data.refresh.detail_sync.media?.status ?? "unknown")}
                </li>
                <li>
                  Comments:{" "}
                  {data.refresh.detail_sync.comments?.is_complete
                    ? "complete"
                    : `incomplete${data.refresh.detail_sync.comments?.reason ? ` — ${data.refresh.detail_sync.comments.reason}` : ""}`}
                </li>
              </ul>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Post info */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${PLATFORM_COLORS[data.platform] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {PLATFORM_LABELS[data.platform] ?? data.platform}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    @{data.author}
                  </span>
                  <span className="text-xs text-gray-500">{fmtDateTime(data.posted_at)}</span>
                </div>
                {drawerThumbnailUrl && (
                  <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {onOpenMediaLightbox ? (
                      <button
                        type="button"
                        onClick={() => onOpenMediaLightbox(preferredDrawerMediaSrc ?? drawerThumbnailUrl, data)}
                        className="block w-full"
                        aria-label="Open post media lightbox from details"
                      >
                        <div className="relative inline-block max-w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={drawerThumbnailUrl}
                            alt={`${PLATFORM_LABELS[data.platform] ?? data.platform} post thumbnail`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                            className="block max-h-[360px] max-w-full h-auto w-auto object-contain bg-black/5"
                          />
                          {data.platform === "instagram" ? (
                            <InstagramTagMarkersOverlay
                              markers={instagramTagMarkers}
                              testId={`instagram-tag-markers-drawer-${data.source_id}`}
                            />
                          ) : null}
                        </div>
                      </button>
                    ) : (
                      <div className="relative inline-block max-w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={drawerThumbnailUrl}
                          alt={`${PLATFORM_LABELS[data.platform] ?? data.platform} post thumbnail`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          className="block max-h-[360px] max-w-full h-auto w-auto object-contain bg-black/5"
                        />
                        {data.platform === "instagram" ? (
                          <InstagramTagMarkersOverlay
                            markers={instagramTagMarkers}
                            testId={`instagram-tag-markers-drawer-${data.source_id}`}
                          />
                        ) : null}
                      </div>
                    )}
                    {data.platform === "instagram" && hasInstagramDrawerSlideNavigation ? (
                      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setInstagramDrawerSlideIndex((current) => Math.max(0, current - 1))}
                          disabled={boundedInstagramDrawerSlideIndex <= 0}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Previous slide"
                        >
                          Prev
                        </button>
                        <span
                          className="text-xs font-medium text-gray-600"
                          data-testid={`instagram-drawer-slide-indicator-${data.source_id}`}
                        >
                          Slide {boundedInstagramDrawerSlideIndex + 1} of {Math.max(1, instagramDrawerSlides.length)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setInstagramDrawerSlideIndex((current) =>
                              Math.min(Math.max(0, instagramDrawerSlides.length - 1), current + 1),
                            )
                          }
                          disabled={boundedInstagramDrawerSlideIndex >= instagramDrawerSlides.length - 1}
                          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Next slide"
                        >
                          Next
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
                {data.title && (
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{data.title}</h3>
                )}
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-3">
                  <InlineCaptionText
                    platform={data.platform}
                    text={normalizeCaptionPreviewText(data.platform, data.text)}
                  />
                </p>
                {data.platform !== "instagram" && typeof data.duration_seconds === "number" && data.duration_seconds > 0 && (
                  <div className="mb-3">
                    <span className="text-xs rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                      Duration: {data.duration_seconds}s
                    </span>
                  </div>
                )}
                {data.platform === "threads" && (
                  <div className="mb-3 text-xs text-gray-600">
                    <span className="font-medium text-gray-500">Topic</span>:{" "}
                    {typeof data.topic === "string" && data.topic.trim().length > 0 ? data.topic : "-"}
                  </div>
                )}
                {data.platform === "instagram" && (
                  <div className="mb-3 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {data.post_format && (
                        <span className="text-xs rounded bg-pink-50 px-1.5 py-0.5 text-pink-700">
                          {data.post_format.toUpperCase()}
                        </span>
                      )}
                      {typeof data.duration_seconds === "number" && data.duration_seconds > 0 && (
                        <span className="text-xs rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                          {data.duration_seconds}s
                        </span>
                      )}
                      {formatInstagramCoverSourceLabel(data.cover_source) && (
                        <span className="text-xs rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                          Cover: {formatInstagramCoverSourceLabel(data.cover_source)}
                          {data.cover_source_confidence ? ` (${data.cover_source_confidence})` : ""}
                        </span>
                      )}
                    </div>
                    {data.profile_tags?.length ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-500">Tagged:</span>
                        {(data.profile_tags ?? []).map((tag) => (
                          <span key={`profile-${tag}`} className="text-xs rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
                            {formatHandleLabel(tag)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {data.collaborators?.length ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-500">Collaborators:</span>
                        {(data.collaborators ?? []).map((collab) => (
                          <span key={`collab-${collab}`} className="text-xs rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                            {formatHandleLabel(collab)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
                {detailExternalUrl && (
                  <a
                    href={detailExternalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    View on {PLATFORM_LABELS[data.platform] ?? data.platform} ↗
                  </a>
                )}
                {data.platform === "youtube" && (data.transcript_text || data.transcript_error) && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Transcript</p>
                    {data.transcript_error ? (
                      <p className="text-xs text-amber-700">Unavailable: {data.transcript_error}</p>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 mb-1">
                          {data.transcript_language ? `Language: ${data.transcript_language}` : "Language: unknown"}
                          {data.transcript_source ? ` · Source: ${data.transcript_source}` : ""}
                        </p>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap break-words line-clamp-6">
                          {data.transcript_text}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {Object.entries(data.stats)
                  .filter(([key]) => !(key === "reposts" && "retweets" in data.stats))
                  .map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-gray-50 rounded-lg p-3 text-center"
                  >
                    <div className="text-lg font-bold text-gray-900">
                      {isTwitterPost ? fmtExactNum(value) : fmtNum(value)}
                    </div>
                    <div className="text-xs text-gray-500">{STAT_LABELS[key] ?? key}</div>
                  </div>
                ))}
              </div>

              {/* Comments section */}
              <div className="border-t border-gray-200 pt-4">
                {supportsReplyQuoteSwitch ? (
                  <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      aria-pressed={replyQuoteMode === "replies"}
                      onClick={() => setReplyQuoteMode("replies")}
                      className={`rounded-full px-2.5 py-1 transition ${
                        replyQuoteMode === "replies"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                      }`}
                    >
                      Replies
                    </button>
                    <button
                      type="button"
                      aria-pressed={replyQuoteMode === "quotes"}
                      onClick={() => setReplyQuoteMode("quotes")}
                      className={`rounded-full px-2.5 py-1 transition ${
                        replyQuoteMode === "quotes"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                      }`}
                    >
                      Quotes
                    </button>
                  </div>
                ) : null}

                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {supportsReplyQuoteSwitch && replyQuoteMode === "quotes"
                    ? `All Quotes (${detailMetricFormatter(reportedQuoteCount)})`
                    : `All Comments (${detailMetricFormatter(savedCommentsCount)}/${detailMetricFormatter(reportedCommentsCount)}${
                        commentsIncomplete ? "*" : ""
                      })`}
                </h3>
                {supportsReplyQuoteSwitch && replyQuoteMode === "quotes" ? (
                  <p className="text-xs text-gray-500 mb-3">
                    {quotesIncomplete
                      ? `Saved in Supabase: ${detailMetricFormatter(savedQuoteCount)} of ${detailMetricFormatter(reportedQuoteCount)} platform-reported quotes.`
                      : `${detailMetricFormatter(savedQuoteCount)} quotes saved in Supabase.`}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mb-3">
                {commentsIncomplete
                    ? `Saved in Supabase: ${detailMetricFormatter(savedCommentsCount)} of ${detailMetricFormatter(reportedCommentsCount)} platform-reported comments.${commentGapReason ? ` (${commentGapReason})` : ""} Run a Sync in Week view (or open the row details for a post-level refresh) to backfill.`
                    : `${detailMetricFormatter(savedCommentsCount)} comments saved in Supabase.`}
                </p>
                )}

                {activeComments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-4">
                    {supportsReplyQuoteSwitch && replyQuoteMode === "quotes"
                      ? "No quotes in database."
                      : "No comments in database."}
                  </p>
                ) : (
                  <div className="space-y-1 divide-y divide-gray-100">
                    {activeComments.map((c) => (
                      <ThreadedCommentItem key={c.comment_id} comment={c} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Engagement row                                                      */
/* ------------------------------------------------------------------ */

function EngagementRow({ platform, post }: { platform: string; post: AnyPost }) {
  const items: { label: string; value: string }[] = [];
  const savedComments = getSavedCommentsForPost(post);
  const displayedSavedComments = getDisplayedSavedCommentsForPost(platform, post);
  const actualComments = getActualCommentsForPost(platform, post);
  const commentsCoverageIncomplete = isCommentsCoverageIncomplete(savedComments, actualComments);
  const commentFormatter = platform === "twitter" ? fmtExactNum : fmtNum;
  const commentsValue = `${commentFormatter(displayedSavedComments)}/${commentFormatter(actualComments)}${
    commentsCoverageIncomplete ? "*" : ""
  }`;

  const pushMetric = (label: string, value: number) => {
    items.push({ label, value: commentFormatter(value) });
  };

  if (platform === "instagram") {
    pushMetric("Likes", getNum(post, "likes"));
    items.push({ label: "Comments", value: commentsValue });
    pushMetric("Views", getNum(post, "views"));
  } else if (platform === "tiktok") {
    pushMetric("Likes", getNum(post, "likes"));
    items.push({ label: "Comments", value: commentsValue });
    pushMetric("Shares", getNum(post, "shares"));
    pushMetric("Saves", getNum(post, "saves"));
    pushMetric("Views", getNum(post, "views"));
  } else if (platform === "youtube") {
    pushMetric("Views", getNum(post, "views"));
    pushMetric("Likes", getNum(post, "likes"));
    if (hasNum(post, "dislikes")) {
      pushMetric("Dislikes", getNum(post, "dislikes"));
    } else if (hasNum(post, "downvotes")) {
      pushMetric("Downvotes", getNum(post, "downvotes"));
    }
    items.push({ label: "Comments", value: commentsValue });
  } else if (platform === "twitter") {
    pushMetric("Likes", getNum(post, "likes"));
    pushMetric("Reposts", getTwitterRepostCount(post));
    items.push({ label: "Replies", value: commentsValue });
    pushMetric("Quotes", getNum(post, "quotes"));
    pushMetric("Views", getNum(post, "views"));
  } else if (platform === "facebook") {
    pushMetric("Likes", getNum(post, "likes"));
    items.push({ label: "Comments", value: commentsValue });
    pushMetric("Shares", getNum(post, "shares"));
    pushMetric("Views", getNum(post, "views"));
  } else if (platform === "threads") {
    pushMetric("Likes", getNum(post, "likes"));
    items.push({ label: "Replies", value: commentsValue });
    pushMetric("Reposts", getNum(post, "reposts"));
    pushMetric("Quotes", getNum(post, "quotes"));
    pushMetric("Views", getNum(post, "views"));
  }
  return (
    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
      {items.map((item) => (
        <span key={item.label}>
          <span className="font-medium text-gray-800">{item.value}</span>{" "}
          {item.label}
        </span>
      ))}
    </div>
  );
}

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

/* ------------------------------------------------------------------ */
/* Post card                                                           */
/* ------------------------------------------------------------------ */

function PostCard({
  platform,
  post,
  showId,
  seasonNumber,
  seasonId,
  onOpenMediaLightbox,
}: {
  platform: string;
  post: AnyPost;
  showId: string;
  seasonNumber: string;
  seasonId?: string | null;
  onOpenMediaLightbox?: (
    platform: string,
    post: AnyPost,
    initialIndex?: number,
    preferredSrc?: string | null,
  ) => void;
}) {
  const [statsOpen, setStatsOpen] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const profileTags = getStrArr(post, "profile_tags");
  const collaborators = getStrArr(post, "collaborators");
  const postFormat = getStr(post, "post_format");
  const durationSeconds = getNum(post, "duration_seconds");
  const actualComments = getActualCommentsForPost(platform, post);
  const savedComments = getSavedCommentsForPost(post);
  const displayedSavedComments = getDisplayedSavedCommentsForPost(platform, post);
  const commentsCoverageIncomplete = isCommentsCoverageIncomplete(savedComments, actualComments);
  const thumbnailUrl = getPostThumbnailUrl(platform, post);
  const platformIconKey = getPlatformIconKey(platform);
  const headerAccounts = buildHeaderAccounts(platform, post, collaborators);
  const headerAuthorHandle = normalizeHandle(post.author);
  const headerHandleText = formatHeaderHandleLine(headerAccounts);
  const verifiedHeaderHandles = resolveVerifiedHeaderHandles(platform, post, headerAccounts);
  const externalPostUrl = resolvePostExternalUrl(platform, post);
  const captionAuthorLabel = formatHandleLabel(post.author) || "@unknown";
  const normalizedCaptionText = normalizeCaptionPreviewText(platform, post.text);
  const topic = platform === "threads" ? getStr(post, "topic") : "";
  const postStatus = post.status ?? null;
  const postStatusTone = getPlatformSyncTone(postStatus?.sync_status, Boolean(postStatus?.stale));

  return (
    <>
      <div className="h-full bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex min-w-0 items-center gap-2">
            {platformIconKey ? (
              <span aria-label={`${PLATFORM_LABELS[platform] ?? platform} platform`} className="inline-flex">
                <SocialPlatformTabIcon tab={platformIconKey} />
              </span>
            ) : (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${PLATFORM_COLORS[platform] ?? "bg-gray-100 text-gray-800"}`}
              >
                {PLATFORM_LABELS[platform] ?? platform}
              </span>
            )}
            <div className="flex items-center -space-x-1" data-testid={`post-header-avatars-${post.source_id}`}>
              {headerAccounts.map((account, index) => {
                const isAuthor = headerAuthorHandle ? account === headerAuthorHandle : index === 0;
                return (
                  <HeaderAccountAvatar
                    key={`post-header-avatar-${post.source_id}-${account}`}
                    handle={account}
                    avatarUrl={resolveAccountAvatarUrl(post, account, isAuthor)}
                  />
                );
              })}
            </div>
            {externalPostUrl ? (
              <a
                href={externalPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 text-sm font-medium leading-5 text-gray-900 break-words hover:underline"
                data-testid={`post-header-handles-${post.source_id}`}
                aria-label={headerHandleText}
              >
                <HeaderHandleLine
                  platform={platform}
                  handles={headerAccounts}
                  verifiedHandles={verifiedHeaderHandles}
                />
              </a>
            ) : (
              <span
                className="min-w-0 text-sm font-medium leading-5 text-gray-900 break-words"
                data-testid={`post-header-handles-${post.source_id}`}
                aria-label={headerHandleText}
              >
                <HeaderHandleLine
                  platform={platform}
                  handles={headerAccounts}
                  verifiedHandles={verifiedHeaderHandles}
                />
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">{fmtDateTime(post.posted_at)}</span>
        </div>

        {/* Title (YouTube) */}
        {platform === "youtube" && getStr(post, "title") && (
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">{getStr(post, "title")}</h3>
            {(post as YouTubePost).is_short && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Short
              </span>
            )}
          </div>
        )}

        {/* Thumbnail preview */}
        {thumbnailUrl && (
          <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="block w-full"
              aria-label="Open post detail modal"
            >
              <div className="relative flex min-h-[10rem] max-h-72 items-center justify-center">
                {thumbnailFailed ? (
                  <div className="flex flex-col items-center justify-center gap-1 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                    <span className="text-xs">Thumbnail unavailable</span>
                  </div>
                ) : (
                  <div className="relative inline-block max-w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnailUrl}
                      alt={`${PLATFORM_LABELS[platform] ?? platform} post thumbnail`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setThumbnailFailed(true)}
                      className="block max-h-72 max-w-full h-auto w-auto object-contain"
                    />
                  </div>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Post text */}
        {platform === "instagram" ? (
          <div className="mb-3 space-y-2">
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words line-clamp-6">
              <span className="font-semibold text-gray-900">{captionAuthorLabel}</span>{" "}
              <InlineCaptionText platform={platform} text={normalizedCaptionText} post={post} />
            </p>
            {(postFormat || durationSeconds > 0 || profileTags.length > 0 || collaborators.length > 0) && (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {postFormat && (
                    <span className="text-xs rounded bg-pink-50 px-1.5 py-0.5 text-pink-700">
                      {postFormat.toUpperCase()}
                    </span>
                  )}
                  {durationSeconds > 0 && (
                    <span className="text-xs rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                      {durationSeconds}s
                    </span>
                  )}
                </div>
                {profileTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-500">Tagged:</span>
                    {profileTags.map((tag) => (
                      <HandleProfileChip key={`profile-${tag}`} post={post} handle={tag} className="bg-indigo-50 text-indigo-700" />
                    ))}
                  </div>
                )}
                {collaborators.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-500">Collaborators:</span>
                    {collaborators.map((collab) => (
                      <HandleProfileChip key={`collab-${collab}`} post={post} handle={collab} className="bg-emerald-50 text-emerald-700" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-3 line-clamp-6">
            <InlineCaptionText platform={platform} text={normalizedCaptionText} post={post} />
          </p>
        )}
        {platform === "threads" && (
          <div className="mb-3 text-xs text-gray-600">
            <span className="font-medium text-gray-500">Topic</span>: {topic.trim().length > 0 ? topic : "-"}
          </div>
        )}
        {(postStatus || post.metadata_error) && (
          <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
            {postStatus && (
              <>
                <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${postStatusTone}`}>
                  {formatPlatformSyncStatus(postStatus.sync_status)}
                </span>
                {postStatus.comment_sync_status && (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 ${getPlatformSyncTone(
                      postStatus.comment_sync_status.status,
                    )}`}
                  >
                    Comment sync {formatPlatformSyncStatus(postStatus.comment_sync_status.status)}
                  </span>
                )}
                {postStatus.media_mirror_status && (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 ${getPlatformSyncTone(
                      postStatus.media_mirror_status.status,
                    )}`}
                  >
                    Mirror {formatPlatformSyncStatus(postStatus.media_mirror_status.status)}
                  </span>
                )}
              </>
            )}
            {post.metadata_error && (
              <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                Metadata {post.metadata_error}
              </span>
            )}
          </div>
        )}

        {/* Engagement metrics */}
        <EngagementRow platform={platform} post={post} />

        {/* Actions row */}
        <div className="flex items-center justify-end mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              Post Details
              {actualComments > 0 && (
                <span className="ml-1 opacity-70">
                  · {formatSavedVsActualComments(displayedSavedComments, actualComments)}
                  {commentsCoverageIncomplete ? "*" : ""} comments
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Post Details Drawer */}
      {statsOpen && (
        <PostStatsDrawer
          showId={showId}
          seasonNumber={seasonNumber}
          seasonId={seasonId}
          platform={platform}
          sourceId={post.source_id}
          onOpenMediaLightbox={
            onOpenMediaLightbox
              ? (preferredSrc?: string | null, detailMedia?: PostDetailMediaFields | null) => {
                  setStatsOpen(false);
                  const postForLightbox = mergePostWithDetailMedia(post, detailMedia);
                  const postCandidates = getPostMediaCandidates(platform, postForLightbox);
                  if (postCandidates.length === 0) return;
                  const preferredIndex = resolveMediaCandidateIndex(
                    postCandidates,
                    preferredSrc ?? getPostThumbnailUrl(platform, postForLightbox) ?? null,
                  );
                  onOpenMediaLightbox(platform, postForLightbox, preferredIndex, preferredSrc ?? null);
                }
              : null
          }
          onClose={() => setStatsOpen(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function WeekDetailPage() {
  const { hasAccess: isAdmin, checking: authLoading } = useAdminGuard();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ showId: string; seasonNumber: string; weekIndex: string; platform?: string }>();
  const searchParams = useSearchParams();
  const showRouteParam = typeof params.showId === "string" ? params.showId : "";
  const seasonNumber = typeof params.seasonNumber === "string" ? params.seasonNumber : "";
  const weekIndex = typeof params.weekIndex === "string" ? params.weekIndex : "";
  const platformFromPathParam = typeof params.platform === "string" ? params.platform : undefined;
  const weekSubTabFromPath = (platformFromPathParam ?? "").trim().toLowerCase();
  const seasonNumberInt = Number.parseInt(seasonNumber, 10);
  const weekIndexInt = Number.parseInt(weekIndex, 10);
  const hasValidNumericPathParams =
    Number.isFinite(seasonNumberInt) &&
    seasonNumberInt > 0 &&
    Number.isFinite(weekIndexInt) &&
    weekIndexInt >= 0;
  const invalidPathParamsError = hasValidNumericPathParams
    ? null
    : "Invalid season/week URL. Season and week must be numeric values.";
  const [resolvedShowId, setResolvedShowId] = useState<string | null>(
    looksLikeUuid(showRouteParam) ? showRouteParam : null
  );
  const [resolvedShowSlug, setResolvedShowSlug] = useState<string | null>(() => {
    const raw = showRouteParam.trim().toLowerCase();
    if (!raw || looksLikeUuid(raw)) return null;
    return raw;
  });
  const [slugResolutionLoading, setSlugResolutionLoading] = useState(
    !looksLikeUuid(showRouteParam)
  );
  const [slugResolutionError, setSlugResolutionError] = useState<string | null>(null);
  const showIdForApi = resolvedShowId ?? "";
  const showSlugForRouting = resolvedShowSlug ?? showRouteParam;
  const sourceScope: SourceScope = (() => {
    const raw = searchParams.get("source_scope") ?? searchParams.get("scope") ?? "bravo";
    if (raw === "creator" || raw === "community") return raw;
    return "bravo";
  })();
  const seasonIdHint = (() => {
    const raw = searchParams.get("season_id");
    if (!raw || !looksLikeUuid(raw)) return null;
    return raw;
  })();
  const syncRunFlowScope = useMemo(
    () =>
      `social-week-sync:${showIdForApi}:${seasonNumber}:${weekIndex}:${sourceScope}:${seasonIdHint ?? "none"}`,
    [seasonIdHint, seasonNumber, showIdForApi, sourceScope, weekIndex],
  );
  const syncOperationFlowScope = useMemo(
    () => `operation:${syncRunFlowScope}`,
    [syncRunFlowScope],
  );
  const syncRunFlowKey = useMemo(
    () => getOrCreateAdminRunFlowKey(syncRunFlowScope),
    [syncRunFlowScope],
  );
  const searchParamsString = searchParams.toString();
  const socialPlatformFromPath = parseSocialPlatform(platformFromPathParam);
  const socialPlatformFromQuery = parseSocialPlatform(searchParams.get("social_platform"));
  const isOverviewSubTabPath = weekSubTabFromPath === "overview";
  const socialPlatform = socialPlatformFromPath ?? socialPlatformFromQuery;
  const dayParam = searchParams.get("day");
  const dayFilterFromQuery = dayParam && DATE_TOKEN_RE.test(dayParam) ? dayParam : null;
  const socialPlatformFilterFromQuery: PlatformFilter = socialPlatform ?? "all";

  const [data, setData] = useState<WeekDetailResponse | null>(null);
  const [displayedPagination, setDisplayedPagination] = useState<WeekDetailResponse["pagination"] | null>(null);
  const [accumulatedPostsByPlatform, setAccumulatedPostsByPlatform] = useState<Record<string, AnyPost[]>>({});
  const [metricsPostsByPlatform, setMetricsPostsByPlatform] = useState<Record<string, AnyPost[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshingGallery, setIsRefreshingGallery] = useState(false);
  const [postOffset, setPostOffset] = useState(0);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>(socialPlatformFilterFromQuery);
  const [platformTotalsByPlatform, setPlatformTotalsByPlatform] = useState<Record<SocialPlatform, number> | null>(null);
  const [allPlatformsTotalPosts, setAllPlatformsTotalPosts] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>("posted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchText, setSearchText] = useState("");
  const [syncingComments, setSyncingComments] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRunId, setSyncRunId] = useState<string | null>(null);
  const [syncRun, setSyncRun] = useState<SocialRun | null>(null);
  const [syncResumeBanner, setSyncResumeBanner] = useState<string | null>(null);
  const [manualAttachRuns, setManualAttachRuns] = useState<SocialRun[]>([]);
  const [selectedManualAttachRunId, setSelectedManualAttachRunId] = useState<string>("");
  const [syncJobs, setSyncJobs] = useState<SocialJob[]>([]);
  const [syncRunProgress, setSyncRunProgress] = useState<RunProgressSnapshot | null>(null);
  const [syncWeekLiveHealth, setSyncWeekLiveHealth] = useState<WeekLiveHealthSnapshot | null>(null);
  const [syncLogsExpanded, setSyncLogsExpanded] = useState(false);
  const [syncPollError, setSyncPollError] = useState<string | null>(null);
  const [syncLastSuccessAt, setSyncLastSuccessAt] = useState<Date | null>(null);
  const [syncStartedAt, setSyncStartedAt] = useState<Date | null>(null);
  const [syncPass, setSyncPass] = useState(0);
  const [syncCoveragePreview, setSyncCoveragePreview] = useState<CommentsCoverageResponse | null>(null);
  const [syncMirrorCoveragePreview, setSyncMirrorCoveragePreview] = useState<MirrorCoverageResponse | null>(null);
  const [syncWorkerHealth, setSyncWorkerHealth] = useState<WorkerHealthPayload | null>(null);
  const [syncElapsedDisplay, setSyncElapsedDisplay] = useState("");
  const [tokenSummaryModal, setTokenSummaryModal] = useState<{
    key: SummaryTokenKey;
    label: string;
    values: string[];
  } | null>(null);
  const [mediaLightbox, setMediaLightbox] = useState<{
    entries: SocialMediaLightboxEntry[];
    index: number;
  } | null>(null);
  const syncPollGenerationRef = useRef(0);
  const syncPollFailureCountRef = useRef(0);
  const terminalCoverageFailureCountRef = useRef(0);
  const missingRunConsecutiveCountRef = useRef(0);
  const syncPollAbortRef = useRef<AbortController | null>(null);
  const syncStartTimeRef = useRef<number | null>(null);
  const syncSessionGenerationRef = useRef(0);
  const hasLoadedWeekDetailRef = useRef(false);
  const weekDetailRequestSeqRef = useRef(0);
  const weekDetailContextRef = useRef("");
  const weekSummaryRequestSeqRef = useRef(0);
  const weekMetricsRequestSeqRef = useRef(0);
  const weekMetricsContextRef = useRef("");
  const weekDetailInFlightRef = useRef<Map<string, Promise<Response>>>(new Map());
  const weekSummaryInFlightRef = useRef<Map<string, Promise<Response>>>(new Map());
  const syncWorkerHealthInFlightRef = useRef<Map<string, Promise<Response>>>(new Map());
  const syncWeekLiveHealthInFlightRef = useRef<Map<string, Promise<Response>>>(new Map());
  const [weekOverviewLoadedKey, setWeekOverviewLoadedKey] = useState<string | null>(null);
  const syncSessionStateRef = useRef<{
    dateStart: string;
    dateEnd: string;
    platforms: Array<Exclude<PlatformFilter, "all">> | null;
    maxPasses: number;
    maxDurationMs: number;
    startedAtMs: number;
    pass: number;
  } | null>(null);
  const syncResumeAttemptedForScopeRef = useRef<string | null>(null);
  const legacyWeekPlatformRedirectRef = useRef<string | null>(null);
  const legacyWeekPathRedirectRef = useRef<string | null>(null);
  const legacyWeekSubTabRedirectRef = useRef<string | null>(null);
  const canonicalShowSlugRedirectRef = useRef<string | null>(null);
  const lastRouteReplaceAttemptRef = useRef<string | null>(null);
  const canonicalCurrentRoute = useMemo(
    () => buildStableRoute(pathname, searchParamsString),
    [pathname, searchParamsString],
  );
  const compareAndReplaceGuarded = useCallback(
    (nextRoute: string) => {
      const canonicalNextRoute = buildCanonicalRoute(nextRoute);
      if (canonicalNextRoute === canonicalCurrentRoute) return;
      if (lastRouteReplaceAttemptRef.current === canonicalNextRoute) return;
      lastRouteReplaceAttemptRef.current = canonicalNextRoute;
      compareAndReplace(router, canonicalCurrentRoute, nextRoute);
    },
    [canonicalCurrentRoute, router],
  );

  useEffect(() => {
    lastRouteReplaceAttemptRef.current = canonicalCurrentRoute;
  }, [canonicalCurrentRoute]);

  const resolvedSeasonId = useMemo(() => {
    if (data?.season?.season_id && looksLikeUuid(data.season.season_id)) {
      return data.season.season_id;
    }
    return seasonIdHint;
  }, [data, seasonIdHint]);
  const isRhoslcSeason = useMemo(
    () => isRhoslcShowContext(showSlugForRouting, data?.season?.show_name ?? null),
    [data?.season?.show_name, showSlugForRouting],
  );
  const syncButtonLabel = useMemo(() => {
    if (syncingComments) return "Syncing...";
    if (SOCIAL_FULL_SYNC_MIRROR_ENABLED) {
      return platformFilter === "all"
        ? "Full Sync + Mirror"
        : `Full Sync ${getSyncActionPlatformLabel(platformFilter)} + Mirror`;
    }
    return platformFilter === "all"
      ? "Sync All"
      : `Sync ${getSyncActionPlatformLabel(platformFilter)}`;
  }, [platformFilter, syncingComments]);
  useAdminOperationUnloadGuard();

  const getSyncRunRequestHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
    return {
      ...headers,
      "x-trr-flow-key": syncRunFlowKey,
    };
  }, [syncRunFlowKey]);

  const displayData = useMemo(() => {
    if (!data) return null;
    const mergedPlatforms: Record<string, PlatformData> = {};
    for (const [platform, payload] of Object.entries(data.platforms)) {
      mergedPlatforms[platform] = {
        ...payload,
        posts: accumulatedPostsByPlatform[platform] ?? payload.posts ?? [],
      };
    }
    return {
      ...data,
      platforms: mergedPlatforms,
    };
  }, [data, accumulatedPostsByPlatform]);

  useEffect(() => {
    setPlatformFilter(socialPlatformFilterFromQuery);
  }, [socialPlatformFilterFromQuery]);

  useEffect(() => {
    const raw = showRouteParam.trim().toLowerCase();
    if (!raw || looksLikeUuid(raw)) {
      setResolvedShowSlug(null);
      return;
    }
    setResolvedShowSlug(raw);
  }, [showRouteParam]);

  useEffect(() => {
    hasLoadedWeekDetailRef.current = false;
    weekDetailContextRef.current = "";
    weekMetricsRequestSeqRef.current += 1;
    weekMetricsContextRef.current = "";
    weekDetailInFlightRef.current.clear();
    weekSummaryInFlightRef.current.clear();
    setWeekOverviewLoadedKey(null);
    setMetricsPostsByPlatform(null);
    setPlatformTotalsByPlatform(null);
    setAllPlatformsTotalPosts(null);
  }, [resolvedSeasonId, showIdForApi, sourceScope, seasonNumber, weekIndex]);

  useEffect(() => {
    if (!hasValidNumericPathParams) return;
    const currentSlug = showRouteParam.trim().toLowerCase();
    const preferredSlug = resolvedShowSlug?.trim().toLowerCase() ?? "";
    if (!currentSlug || !preferredSlug || currentSlug === preferredSlug) return;
    const redirectKey = `${pathname}|${searchParamsString}|${currentSlug}|${preferredSlug}|${seasonNumber}|${weekIndex}|${socialPlatform ?? "details"}`;
    if (canonicalShowSlugRedirectRef.current === redirectKey) return;
    canonicalShowSlugRedirectRef.current = redirectKey;
    const nextRoute = buildSeasonSocialWeekUrl({
      showSlug: preferredSlug,
      seasonNumber,
      weekIndex: weekIndexInt,
      platform: socialPlatform ?? undefined,
      query: new URLSearchParams(searchParamsString),
    });
    compareAndReplaceGuarded(nextRoute);
  }, [
    compareAndReplaceGuarded,
    hasValidNumericPathParams,
    pathname,
    canonicalCurrentRoute,
    resolvedShowSlug,
    router,
    searchParamsString,
    seasonNumber,
    showRouteParam,
    socialPlatform,
    weekIndex,
    weekIndexInt,
  ]);

  useEffect(() => {
    if (!hasValidNumericPathParams) return;
    if (!pathname.includes("/social/week/")) return;
    const redirectKey = `${showSlugForRouting}|${seasonNumber}|${weekIndex}|${socialPlatform ?? "details"}|${searchParamsString}`;
    if (legacyWeekPathRedirectRef.current === redirectKey) return;
    legacyWeekPathRedirectRef.current = redirectKey;
    const nextQuery = new URLSearchParams(searchParamsString);
    nextQuery.delete("social_platform");
    const nextRoute = buildSeasonSocialWeekUrl({
      showSlug: showSlugForRouting,
      seasonNumber,
      weekIndex: weekIndexInt,
      platform: socialPlatform ?? undefined,
      query: nextQuery,
    });
    compareAndReplaceGuarded(nextRoute);
  }, [
    compareAndReplaceGuarded,
    hasValidNumericPathParams,
    pathname,
    canonicalCurrentRoute,
    router,
    searchParamsString,
    seasonNumber,
    showSlugForRouting,
    socialPlatform,
    weekIndex,
    weekIndexInt,
  ]);

  useEffect(() => {
    if (!hasValidNumericPathParams) return;
    if (!isOverviewSubTabPath) return;
    if (socialPlatformFromQuery) return;
    const redirectKey = `${showSlugForRouting}|${seasonNumber}|${weekIndex}|${searchParamsString}`;
    if (legacyWeekSubTabRedirectRef.current === redirectKey) return;
    legacyWeekSubTabRedirectRef.current = redirectKey;
    const nextQuery = new URLSearchParams(searchParamsString);
    nextQuery.delete("social_platform");
    const nextRoute = buildSeasonSocialWeekUrl({
      showSlug: showSlugForRouting,
      seasonNumber,
      weekIndex: weekIndexInt,
      query: nextQuery,
    });
    compareAndReplaceGuarded(nextRoute);
  }, [
    compareAndReplaceGuarded,
    hasValidNumericPathParams,
    isOverviewSubTabPath,
    canonicalCurrentRoute,
    router,
    searchParamsString,
    seasonNumber,
    showSlugForRouting,
    socialPlatformFromQuery,
    weekIndex,
    weekIndexInt,
  ]);

  useEffect(() => {
    if (!hasValidNumericPathParams) return;
    if (socialPlatformFromPath || !socialPlatformFromQuery) return;
    const redirectKey = `${showSlugForRouting}|${seasonNumber}|${weekIndex}|${socialPlatformFromQuery}|${searchParamsString}`;
    if (legacyWeekPlatformRedirectRef.current === redirectKey) return;
    legacyWeekPlatformRedirectRef.current = redirectKey;
    const nextQuery = new URLSearchParams(searchParamsString);
    nextQuery.delete("social_platform");
    const nextRoute = buildSeasonSocialWeekUrl({
      showSlug: showSlugForRouting,
      seasonNumber,
      weekIndex: weekIndexInt,
      platform: socialPlatformFromQuery,
      query: nextQuery,
    });
    compareAndReplaceGuarded(nextRoute);
  }, [
    compareAndReplaceGuarded,
    canonicalCurrentRoute,
    hasValidNumericPathParams,
    router,
    searchParamsString,
    seasonNumber,
    showSlugForRouting,
    socialPlatformFromPath,
    socialPlatformFromQuery,
    weekIndex,
    weekIndexInt,
  ]);

  const activeDayFilter = useMemo(() => {
    if (!dayFilterFromQuery || !data?.week) return null;
    const weekStartToken = toLocalDateToken(data.week.start);
    const weekEndToken = toLocalDateToken(data.week.end);
    if (!weekStartToken || !weekEndToken) return null;
    if (dayFilterFromQuery < weekStartToken || dayFilterFromQuery > weekEndToken) return null;
    return dayFilterFromQuery;
  }, [data, dayFilterFromQuery]);

  const appendSyncRunScopeParams = useCallback(
    (
      params: URLSearchParams,
      options?: {
        platforms?: Array<Exclude<PlatformFilter, "all">> | null;
        dateStart?: string | null;
        dateEnd?: string | null;
      },
    ) => {
      const scopedPlatforms = options?.platforms ?? (platformFilter !== "all" ? [platformFilter] : null);
      if (scopedPlatforms && scopedPlatforms.length > 0) {
        for (const platform of scopedPlatforms) {
          params.append("platforms", platform);
        }
      }
      const scopedDateStart = options?.dateStart ?? null;
      const scopedDateEnd = options?.dateEnd ?? null;
      if (scopedDateStart && scopedDateEnd) {
        params.set("date_start", scopedDateStart);
        params.set("date_end", scopedDateEnd);
        return;
      }
      if (activeDayFilter) {
        const dayRange = buildIsoDayRange(activeDayFilter);
        if (dayRange) {
          params.set("date_start", dayRange.dateStart);
          params.set("date_end", dayRange.dateEnd);
        }
        return;
      }
      params.set("week_index", String(weekIndexInt));
      if (data?.week?.start && data.week.end) {
        params.set("date_start", data.week.start);
        params.set("date_end", data.week.end);
      }
    },
    [activeDayFilter, data?.week?.end, data?.week?.start, platformFilter, weekIndexInt],
  );

  const recentShowLabel = useMemo(() => {
    const showName = data?.season.show_name?.trim();
    return showName || humanizeSlug(showSlugForRouting);
  }, [data?.season.show_name, showSlugForRouting]);

  useEffect(() => {
    if (!showSlugForRouting || !recentShowLabel) return;
    recordAdminRecentShow({
      slug: showSlugForRouting,
      label: recentShowLabel,
    });
  }, [recentShowLabel, showSlugForRouting]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    const raw = showRouteParam?.trim() ?? "";
    if (!raw) {
      setResolvedShowId(null);
      setSlugResolutionLoading(false);
      setSlugResolutionError("Missing show identifier.");
      return;
    }
    if (looksLikeUuid(raw)) {
      setResolvedShowId(raw);
      setSlugResolutionLoading(false);
      setSlugResolutionError(null);
      return;
    }

    let cancelled = false;
    const resolveSlug = async () => {
      setSlugResolutionLoading(true);
      setSlugResolutionError(null);
      try {
        const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
        const response = await fetch(
          `/api/admin/trr-api/shows/resolve-slug?slug=${encodeURIComponent(raw)}`,
          { headers, cache: "no-store" }
        );
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          resolved?: {
            show_id?: string | null;
            canonical_slug?: string | null;
            slug?: string | null;
          };
        };
        if (!response.ok) throw new Error(data.error || "Failed to resolve show slug");
        const showId =
          typeof data.resolved?.show_id === "string" && looksLikeUuid(data.resolved.show_id)
            ? data.resolved.show_id
            : null;
        if (!showId) throw new Error("Resolved show slug did not return a valid show id.");
        if (cancelled) return;
        setResolvedShowId(showId);
        const showSlugCandidate =
          typeof data.resolved?.canonical_slug === "string" && data.resolved.canonical_slug.trim().length > 0
            ? data.resolved.canonical_slug
            : typeof data.resolved?.slug === "string" && data.resolved.slug.trim().length > 0
              ? data.resolved.slug
              : raw;
        const normalizedShowSlug = showSlugCandidate.trim().toLowerCase();
        if (normalizedShowSlug && !looksLikeUuid(normalizedShowSlug)) {
          setResolvedShowSlug(normalizedShowSlug);
        }
      } catch (err) {
        if (cancelled) return;
        setResolvedShowId(null);
        setResolvedShowSlug(raw.toLowerCase());
        setSlugResolutionError(err instanceof Error ? err.message : "Could not resolve show URL slug.");
      } finally {
        if (!cancelled) setSlugResolutionLoading(false);
      }
    };
    void resolveSlug();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin, showRouteParam]);

  const fetchData = useCallback(
    async ({
      append = false,
      requestOffset,
      refreshGalleryOnly = false,
      platformFilterValue,
      sortFieldValue,
      sortDirValue,
    }: {
      append?: boolean;
      requestOffset?: number;
      refreshGalleryOnly?: boolean;
      platformFilterValue?: PlatformFilter;
      sortFieldValue?: SortField;
      sortDirValue?: SortDir;
    } = {}) => {
      if (!showIdForApi || !seasonNumber || !weekIndex || !hasValidNumericPathParams) {
        if (append) {
          setIsLoadingMore(false);
        } else if (refreshGalleryOnly) {
          setIsRefreshingGallery(false);
          setLoading(false);
        } else {
          setLoading(false);
        }
        return;
      }
      const pageRequestOffset = append ? Number(requestOffset ?? 0) : 0;
      const requestLimit = WEEK_DETAIL_POST_LIMIT;
      const resolvedPlatformFilter = platformFilterValue ?? platformFilter;
      const resolvedPlatform = resolvedPlatformFilter === "all" ? null : resolvedPlatformFilter;
      const resolvedSortField = sortFieldValue ?? sortField;
      const resolvedSortDir = sortDirValue ?? sortDir;
      const requestContextKey = [
        showIdForApi,
        seasonNumber,
        weekIndex,
        sourceScope,
        resolvedSeasonId ?? "",
        resolvedPlatform ?? "all",
        resolvedSortField,
        resolvedSortDir,
      ].join("|");
      const weekOverviewContextKey = [
        showIdForApi,
        seasonNumber,
        weekIndex,
        sourceScope,
        resolvedSeasonId ?? "",
      ].join("|");
      if (append && weekDetailContextRef.current && requestContextKey !== weekDetailContextRef.current) {
        return;
      }
      const requestId = weekDetailRequestSeqRef.current + 1;
      weekDetailRequestSeqRef.current = requestId;
      if (!append) {
        weekDetailContextRef.current = requestContextKey;
      }
      const isStaleRequest = () =>
        requestId !== weekDetailRequestSeqRef.current || requestContextKey !== weekDetailContextRef.current;
      if (append) {
        setIsLoadingMore(true);
        setLoadMoreError(null);
      } else if (refreshGalleryOnly) {
        setIsLoadingMore(false);
        setIsRefreshingGallery(true);
        setLoading(false);
        setError(null);
        setLoadMoreError(null);
      } else {
        setIsLoadingMore(false);
        setLoading(true);
        setError(null);
        setLoadMoreError(null);
        setPostOffset(0);
        setAccumulatedPostsByPlatform({});
        setDisplayedPagination(null);
      }
      try {
        const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
        const weekParams = new URLSearchParams({
          source_scope: sourceScope,
          timezone: SOCIAL_TIME_ZONE,
        });
        if (resolvedPlatform) {
          weekParams.set("platforms", resolvedPlatform);
        }
        weekParams.set("max_comments_per_post", String(WEEK_DETAIL_MAX_COMMENTS_PER_POST));
        weekParams.set("post_limit", String(requestLimit));
        weekParams.set("post_offset", String(pageRequestOffset));
        weekParams.set("sort_field", resolvedSortField);
        weekParams.set("sort_dir", resolvedSortDir);
        if (resolvedSeasonId) {
          weekParams.set("season_id", resolvedSeasonId);
        }
        const url = `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/week/${weekIndex}?${weekParams.toString()}`;
        const requestKey = `GET ${url}`;
        let inFlight = weekDetailInFlightRef.current.get(requestKey);
        if (!inFlight) {
          inFlight = registerInFlightRequest(
            weekDetailInFlightRef.current,
            requestKey,
            fetchWithTimeout(
              url,
              {
                headers,
                cache: "no-store",
              },
              REQUEST_TIMEOUT_MS.weekDetail,
              "Week detail request timed out",
            ),
          );
        }
        const rawRes = await inFlight;
        const res = typeof rawRes.clone === "function" ? rawRes.clone() : rawRes;
        if (!res.ok) {
          throw new Error(await readApiErrorMessage(res, `HTTP ${res.status}`));
        }
        const payload = await parseResponseJson<WeekDetailResponse>(res, "Failed to load week detail");
        if (isStaleRequest()) return;
        const platformPostsMap = Object.fromEntries(
          Object.entries(payload.platforms).map(([platform, payloadForPlatform]) => [
            platform,
            payloadForPlatform.posts ?? [],
          ]),
        );
        const returnedCount = platformPostsMap
          ? Object.values(platformPostsMap).reduce((total, posts) => total + posts.length, 0)
          : 0;
        const pagination = payload.pagination ?? {
          limit: requestLimit,
          offset: pageRequestOffset,
          returned: returnedCount,
          total: returnedCount,
          has_more: false,
        };
        const resolvedPagination = {
          ...pagination,
          offset: pageRequestOffset,
          returned: returnedCount,
          total: payload.totals.posts ?? pagination.total,
          has_more:
            pagination.has_more ??
            pageRequestOffset + returnedCount < (payload.totals.posts ?? returnedCount),
        };
        const nextOffset = resolvedPagination.offset + resolvedPagination.returned;
        setDisplayedPagination(resolvedPagination);
        setPostOffset(nextOffset);
        setData(payload);
        setWeekOverviewLoadedKey(weekOverviewContextKey);
        hasLoadedWeekDetailRef.current = true;
        setAccumulatedPostsByPlatform((previous) => {
          if (!append) return platformPostsMap;

          const merged: Record<string, AnyPost[]> = { ...previous };
          for (const [platform, platformPosts] of Object.entries(platformPostsMap)) {
            const existing = merged[platform] ?? [];
            const seen = new Set(
              existing.map((post) => `${platform}:${String(post.source_id ?? "")}`),
            );
            const nextPosts = [...existing];
            for (const post of platformPosts) {
              const key = `${platform}:${String(post.source_id ?? "")}`;
              if (seen.has(key)) continue;
              seen.add(key);
              nextPosts.push(post);
            }
            merged[platform] = nextPosts;
          }
          return merged;
        });
      } catch (err) {
        if (isStaleRequest()) return;
        const message = err instanceof Error ? err.message : "Failed to load week detail";
        if (append) {
          setLoadMoreError(message);
        } else {
          setError(message);
        }
      } finally {
        if (isStaleRequest()) return;
        if (append) {
          setIsLoadingMore(false);
        } else if (refreshGalleryOnly) {
          setIsRefreshingGallery(false);
        } else {
          setLoading(false);
        }
      }
    },
    [
      hasValidNumericPathParams,
      resolvedSeasonId,
      showIdForApi,
      sortDir,
      sortField,
      platformFilter,
      seasonNumber,
      sourceScope,
      weekIndex,
    ],
  );

  const fetchPlatformTotalsSummary = useCallback(async () => {
    if (!showIdForApi || !seasonNumber || !weekIndex || !hasValidNumericPathParams || !isAdmin) return;
    const requestId = weekSummaryRequestSeqRef.current + 1;
    weekSummaryRequestSeqRef.current = requestId;
    try {
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const weekParams = new URLSearchParams({
        source_scope: sourceScope,
        timezone: SOCIAL_TIME_ZONE,
        max_comments_per_post: "0",
        sort_field: "posted_at",
        sort_dir: "desc",
      });
      if (resolvedSeasonId) {
        weekParams.set("season_id", resolvedSeasonId);
      }
      const url = `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/week/${weekIndex}/summary?${weekParams.toString()}`;
      const requestKey = `GET ${url}`;
      let inFlight = weekSummaryInFlightRef.current.get(requestKey);
      if (!inFlight) {
        inFlight = registerInFlightRequest(
          weekSummaryInFlightRef.current,
          requestKey,
          fetchWithTimeout(
            url,
            {
              headers,
              cache: "no-store",
            },
            REQUEST_TIMEOUT_MS.weekSummary,
            "Week detail summary request timed out",
          ),
        );
      }
      const rawRes = await inFlight;
      const res = typeof rawRes.clone === "function" ? rawRes.clone() : rawRes;
      if (!res.ok) {
        return;
      }
      const payload = await parseResponseJson<WeekSummaryResponse>(res, "Failed to load week detail summary");
      if (requestId !== weekSummaryRequestSeqRef.current) return;
      const nextTotals: Record<SocialPlatform, number> = { ...EMPTY_PLATFORM_TOTALS };
      for (const platform of PLATFORM_KEYS) {
        const platformPayload = payload.platforms?.[platform];
        const totalsPostsValue =
          platformPayload && typeof platformPayload === "object" && platformPayload.totals
            ? Number(platformPayload.totals.posts ?? 0)
            : Number.NaN;
        const fallbackPosts = Number(platformPayload?.total_posts ?? 0);
        nextTotals[platform] = Number.isFinite(totalsPostsValue) ? Math.max(0, totalsPostsValue) : fallbackPosts;
      }
      const payloadTotalPosts = Number(payload.totals?.posts ?? Number.NaN);
      const fallbackTotalPosts = PLATFORM_KEYS.reduce((sum, platform) => sum + nextTotals[platform], 0);
      setPlatformTotalsByPlatform(nextTotals);
      setAllPlatformsTotalPosts(Number.isFinite(payloadTotalPosts) ? Math.max(0, payloadTotalPosts) : fallbackTotalPosts);
    } catch {
      // Intentionally non-fatal: tab-count fallback remains derived from current payload.
    }
  }, [
    hasValidNumericPathParams,
    isAdmin,
    resolvedSeasonId,
    seasonNumber,
    showIdForApi,
    sourceScope,
    weekIndex,
  ]);

  const fetchWeekMetricsPosts = useCallback(async () => {
    if (!showIdForApi || !seasonNumber || !weekIndex || !hasValidNumericPathParams || !isAdmin) return;
    const requestContextKey = [
      showIdForApi,
      seasonNumber,
      weekIndex,
      sourceScope,
      resolvedSeasonId ?? "",
    ].join("|");
    const requestId = weekMetricsRequestSeqRef.current + 1;
    weekMetricsRequestSeqRef.current = requestId;
    weekMetricsContextRef.current = requestContextKey;
    const isStaleRequest = () =>
      requestId !== weekMetricsRequestSeqRef.current || requestContextKey !== weekMetricsContextRef.current;
    try {
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const nextPostsByPlatform: Record<string, AnyPost[]> = {};
      const seenByPlatform: Record<string, Set<string>> = {};
      for (const platform of PLATFORM_KEYS) {
        nextPostsByPlatform[platform] = [];
        seenByPlatform[platform] = new Set<string>();
      }

      let pageOffset = 0;
      let hasMore = true;
      let pageCount = 0;
      while (hasMore && pageCount < WEEK_DETAIL_METRICS_MAX_PAGES) {
        if (isStaleRequest()) return;
        const weekParams = new URLSearchParams({
          source_scope: sourceScope,
          timezone: SOCIAL_TIME_ZONE,
          max_comments_per_post: "0",
          post_limit: String(WEEK_DETAIL_METRICS_PAGE_LIMIT),
          post_offset: String(pageOffset),
          sort_field: "posted_at",
          sort_dir: "desc",
        });
        if (resolvedSeasonId) {
          weekParams.set("season_id", resolvedSeasonId);
        }
        const url = `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/week/${weekIndex}?${weekParams.toString()}`;
        const res = await fetchWithTimeout(
          url,
          {
            headers,
            cache: "no-store",
          },
          REQUEST_TIMEOUT_MS.weekDetail,
          "Week metrics request timed out",
        );
        if (!res.ok) return;
        const payload = await parseResponseJson<WeekDetailResponse>(res, "Failed to load week metrics");
        if (isStaleRequest()) return;

        for (const platform of PLATFORM_KEYS) {
          const platformPosts = payload.platforms?.[platform]?.posts ?? [];
          const seen = seenByPlatform[platform];
          const aggregated = nextPostsByPlatform[platform];
          if (!seen || !aggregated) continue;
          for (const post of platformPosts) {
            const sourceId = String(post.source_id ?? "");
            if (!sourceId || seen.has(sourceId)) continue;
            seen.add(sourceId);
            aggregated.push(post);
          }
        }

        const pagination = payload.pagination;
        const returnedCount = Number(
          pagination?.returned ??
            PLATFORM_KEYS.reduce((sum, platform) => sum + (payload.platforms?.[platform]?.posts?.length ?? 0), 0),
        );
        hasMore = Boolean(pagination?.has_more) && returnedCount > 0;
        const nextOffsetFromPagination =
          pagination && Number.isFinite(Number(pagination.offset))
            ? Number(pagination.offset) + returnedCount
            : pageOffset + returnedCount;
        pageOffset =
          Number.isFinite(nextOffsetFromPagination) && nextOffsetFromPagination > pageOffset
            ? nextOffsetFromPagination
            : pageOffset + returnedCount;
        pageCount += 1;
      }

      if (isStaleRequest()) return;
      setMetricsPostsByPlatform(nextPostsByPlatform);
    } catch {
      // Non-fatal: summary cards fall back to initial payload posts.
    }
  }, [
    hasValidNumericPathParams,
    isAdmin,
    resolvedSeasonId,
    seasonNumber,
    showIdForApi,
    sourceScope,
    weekIndex,
  ]);

  useEffect(() => {
    if (!weekOverviewLoadedKey) return;
    void fetchPlatformTotalsSummary();

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const triggerMetricsFetch = () => {
      if (cancelled) return;
      void fetchWeekMetricsPosts();
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
        options?: { timeout?: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(() => {
        triggerMetricsFetch();
      }, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(() => {
        triggerMetricsFetch();
      }, 1500);
    }
    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (idleId !== null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }, [fetchPlatformTotalsSummary, fetchWeekMetricsPosts, weekOverviewLoadedKey]);

  useEffect(() => {
    if (!hasValidNumericPathParams) {
      hasLoadedWeekDetailRef.current = false;
      setLoading(false);
      setError(invalidPathParamsError);
      return;
    }
    if (!isAdmin) return;
    void fetchData({
      refreshGalleryOnly: hasLoadedWeekDetailRef.current,
      platformFilterValue: platformFilter,
      sortFieldValue: sortField,
      sortDirValue: sortDir,
    });
  }, [fetchData, hasValidNumericPathParams, invalidPathParamsError, isAdmin, platformFilter, sortDir, sortField]);

  const hasMorePosts = Boolean(displayedPagination?.has_more);
  const handleLoadMorePosts = useCallback(() => {
    if (!hasMorePosts || isLoadingMore || loading || isRefreshingGallery) return;
    void fetchData({
      append: true,
      requestOffset: postOffset,
      platformFilterValue: platformFilter,
      sortFieldValue: sortField,
      sortDirValue: sortDir,
    });
  }, [fetchData, hasMorePosts, isLoadingMore, isRefreshingGallery, loading, platformFilter, postOffset, sortDir, sortField]);

  const handleCancelSync = useCallback(async () => {
    if (!syncRunId) return;
    try {
      const headers = await getSyncRunRequestHeaders();
      const cancelParams = new URLSearchParams();
      if (resolvedSeasonId) {
        cancelParams.set("season_id", resolvedSeasonId);
      }
      const cancelPath = `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/runs/${syncRunId}/cancel`;
      const cancelResponse = await fetchWithTimeout(
        cancelParams.toString() ? `${cancelPath}?${cancelParams.toString()}` : cancelPath,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({}),
        },
        15_000,
        "Cancel request timed out",
      );
      if (!cancelResponse.ok) {
        const message = await readApiErrorMessage(cancelResponse, "Failed to cancel sync run");
        throw new Error(message);
      }
      markAdminOperationSessionStatus(syncOperationFlowScope, "cancelled");
      markAdminRunSessionStatus(syncRunFlowScope, "cancelled");
      setSyncPollError("Sync cancelled by user.");
    } catch (err) {
      setSyncPollError(`Failed to cancel: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [
    getSyncRunRequestHeaders,
    resolvedSeasonId,
    seasonNumber,
    showIdForApi,
    syncOperationFlowScope,
    syncRunFlowScope,
    syncRunId,
  ]);

  useEffect(() => {
    return () => {
      syncSessionGenerationRef.current += 1;
      syncSessionStateRef.current = null;
      syncPollAbortRef.current?.abort();
      syncPollAbortRef.current = null;
    };
  }, []);

  const fetchSyncProgress = useCallback(
    async (
      runId: string,
      options?: { preserveLastGoodJobsIfEmpty?: boolean; preserveLastGoodRunIfMissing?: boolean; signal?: AbortSignal },
    ) => {
      if (!hasValidNumericPathParams) {
        throw new Error(invalidPathParamsError ?? "Invalid season/week URL");
      }
      const headers = await getSyncRunRequestHeaders();
      const progressParams = new URLSearchParams({ recent_log_limit: "40" });
      if (resolvedSeasonId) {
        progressParams.set("season_id", resolvedSeasonId);
      }
      const progressResponse = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/runs/${runId}/progress?${progressParams.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.runProgress,
        "Sync run progress request timed out",
        options?.signal,
      );
      if (!progressResponse.ok) {
        const message = await readApiErrorMessage(progressResponse, "Failed to load sync run progress");
        if (progressResponse.status === 404) {
          throw new Error("Run no longer available");
        }
        throw new Error(message);
      }
      const progressPayload = await parseResponseJson<RunProgressSnapshot>(
        progressResponse,
        "Failed to load sync run progress",
      );
      setSyncRunProgress(progressPayload);
      missingRunConsecutiveCountRef.current = 0;

      const nextRun: SocialRun = {
        id: progressPayload.run_id,
        status: progressPayload.run_status,
        source_scope: progressPayload.source_scope,
        summary: progressPayload.summary ?? {},
        summary_normalized: progressPayload.summary ?? {},
        created_at: progressPayload.created_at ?? null,
        started_at: progressPayload.started_at ?? null,
        completed_at: progressPayload.completed_at ?? null,
      };

      let effectiveRun: SocialRun | null = nextRun;
      setSyncRun((current) => {
        const resolved =
          options?.preserveLastGoodRunIfMissing && !nextRun && current?.id === runId ? current : nextRun;
        effectiveRun = resolved;
        return resolved;
      });

      setSyncJobs((current) =>
        options?.preserveLastGoodJobsIfEmpty && current.length > 0 ? current : [],
      );
      return { run: effectiveRun, jobs: [] };
    },
    [
      getSyncRunRequestHeaders,
      hasValidNumericPathParams,
      invalidPathParamsError,
      resolvedSeasonId,
      seasonNumber,
      showIdForApi,
    ],
  );

  const recoverSyncRunAfterKickoffError = useCallback(
    async ({
      headers,
      pass,
      dateStart,
      dateEnd,
      platforms,
      kickoffStartedAtMs,
    }: {
      headers: Record<string, string>;
      pass: number;
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">> | null;
      kickoffStartedAtMs: number;
    }): Promise<{ runId: string; jobs: number } | null> => {
      if (!hasValidNumericPathParams) return null;

      const ingestMode: IngestMode = pass > 1 ? "details_refresh" : "posts_and_comments";
      const expectedPlatforms = platforms && platforms.length > 0 ? [...platforms].sort() : null;
      const runsParams = new URLSearchParams({
        source_scope: sourceScope,
        limit: String(SYNC_KICKOFF_RECOVERY_LIMIT),
      });
      if (resolvedSeasonId) {
        runsParams.set("season_id", resolvedSeasonId);
      }
      appendSyncRunScopeParams(runsParams, {
        platforms,
        dateStart,
        dateEnd,
      });
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/runs?${runsParams.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.syncRuns,
        "Sync run recovery request timed out",
      );
      if (!response.ok) return null;
      const runsPayload = await parseResponseJson<{ runs?: SocialRun[] }>(response, "Failed to load sync runs");
      const runs = Array.isArray(runsPayload.runs) ? runsPayload.runs : [];

      const toTimestamp = (value: unknown): number | null => {
        if (typeof value !== "string" || !value.trim()) return null;
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const normalizeRunPlatforms = (value: unknown): string[] | null => {
        if (Array.isArray(value)) {
          const normalized = value
            .map((item) => String(item ?? "").trim().toLowerCase())
            .filter((item) => item.length > 0)
            .sort();
          return normalized.length > 0 ? normalized : null;
        }
        if (typeof value === "string" && value.trim().toLowerCase() === "all") {
          return null;
        }
        return null;
      };
      const windowsMatch = (candidate: unknown, expectedIso: string): boolean => {
        if (typeof candidate !== "string" || !candidate.trim()) return true;
        const candidateMs = Date.parse(candidate);
        const expectedMs = Date.parse(expectedIso);
        if (Number.isFinite(candidateMs) && Number.isFinite(expectedMs)) {
          return candidateMs === expectedMs;
        }
        return candidate.trim() === expectedIso.trim();
      };

      const recoveredRun =
        runs.find((run) => {
          if (!run?.id) return false;
          const config = isRecord(run.config) ? run.config : {};
          const createdAtMs = toTimestamp(run.created_at);
          if (
            createdAtMs !== null &&
            createdAtMs < kickoffStartedAtMs - SYNC_KICKOFF_RECOVERY_LOOKBACK_MS
          ) {
            return false;
          }
          const runScope =
            (typeof run.source_scope === "string" && run.source_scope.trim().toLowerCase()) ||
            (typeof config.source_scope === "string" && config.source_scope.trim().toLowerCase()) ||
            "";
          if (runScope && runScope !== sourceScope) return false;
          const runMode =
            typeof config.ingest_mode === "string" ? config.ingest_mode.trim().toLowerCase() : "";
          if (runMode && runMode !== ingestMode) return false;
          if (!windowsMatch(config.date_start, dateStart) || !windowsMatch(config.date_end, dateEnd)) {
            return false;
          }
          const runPlatforms = normalizeRunPlatforms(config.platforms);
          if (expectedPlatforms && expectedPlatforms.length > 0) {
            if (!runPlatforms || runPlatforms.length !== expectedPlatforms.length) return false;
            return expectedPlatforms.every((platform, index) => runPlatforms[index] === platform);
          }
          return runPlatforms === null;
        }) ?? null;

      if (!recoveredRun?.id) return null;
      const summary = recoveredRun.summary ?? {};
      const totalJobs = Number(summary.total_jobs ?? 0);
      const completedJobs = Number(summary.completed_jobs ?? 0);
      const failedJobs = Number(summary.failed_jobs ?? 0);
      const activeJobs = Number(summary.active_jobs ?? 0);
      const jobs = Math.max(0, totalJobs, completedJobs + failedJobs + activeJobs);
      return { runId: recoveredRun.id, jobs };
    },
    [
      appendSyncRunScopeParams,
      hasValidNumericPathParams,
      resolvedSeasonId,
      seasonNumber,
      showIdForApi,
      sourceScope,
    ],
  );

  const queueSyncPass = useCallback(
    async ({
      pass,
      dateStart,
      dateEnd,
      platforms,
    }: {
      pass: number;
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">> | null;
    }) => {
      const kickoffStartedAtMs = Date.now();
      const headers = await getSyncRunRequestHeaders();
      const ingestMode: IngestMode = pass > 1 ? "details_refresh" : "posts_and_comments";
      const payload: {
        source_scope: SourceScope;
        platforms?: Array<Exclude<PlatformFilter, "all">>;
        accounts_override?: string[];
        hashtags_override?: string[];
        keywords_override?: string[];
        max_posts_per_target: number;
        max_comments_per_post: number;
        max_replies_per_post: number;
        fetch_replies: boolean;
        ingest_mode: IngestMode;
        sync_strategy: "incremental";
        runner_strategy: "single_runner" | "adaptive_dual_runner";
        runner_count: 1 | 2;
        window_shard_hours: number;
        day_weight_profile: "rhoslc_default";
        priority_mode: "episode_peak_weighted";
        allow_inline_dev_fallback: boolean;
        date_start: string;
        date_end: string;
      } = (() => {
        const requestedPlatforms =
          platforms && platforms.length > 0
            ? platforms
            : (["instagram", "tiktok", "twitter", "youtube", "facebook", "threads"] as Array<
                Exclude<PlatformFilter, "all">
              >);
        const singlePlatform = requestedPlatforms.length === 1;
        const singlePlatformTarget = singlePlatform ? requestedPlatforms[0] : null;
        const igTikTokOnly = requestedPlatforms.every((platform) => platform === "instagram" || platform === "tiktok");
        const shardOptimizedPass = pass === 1 && (igTikTokOnly || singlePlatform);
        const singleRunnerPass = pass === 1 && (singlePlatform || igTikTokOnly);
        const optimizedWindowShardHours = singleRunnerPass
          ? singlePlatformTarget === "instagram" || singlePlatformTarget === "tiktok"
            ? 12
            : 24
          : 4;
        return {
          source_scope: sourceScope,
          max_posts_per_target: 0,
          max_comments_per_post: igTikTokOnly ? 3000 : 10000,
          max_replies_per_post: igTikTokOnly ? 500 : 2000,
          fetch_replies: !igTikTokOnly,
          ingest_mode: ingestMode,
          sync_strategy: "incremental",
          runner_strategy: singleRunnerPass ? "single_runner" : "adaptive_dual_runner",
          runner_count: singleRunnerPass ? 1 : 2,
          window_shard_hours: shardOptimizedPass ? optimizedWindowShardHours : 4,
          day_weight_profile: "rhoslc_default",
          priority_mode: "episode_peak_weighted",
          allow_inline_dev_fallback: false,
          date_start: dateStart,
          date_end: dateEnd,
        };
      })();
      if (platforms && platforms.length > 0) {
        payload.platforms = platforms;
      }
      const isRhoslcInstagramSync =
        sourceScope === "bravo" &&
        isRhoslcSeason &&
        Array.isArray(platforms) &&
        platforms.length === 1 &&
        platforms[0] === "instagram";
      if (isRhoslcInstagramSync) {
        payload.hashtags_override = [RHOSLC_REQUIRED_HASHTAG];
      }

      const ingestParams = new URLSearchParams();
      if (resolvedSeasonId) {
        ingestParams.set("season_id", resolvedSeasonId);
      }
      const kickoffUrl = `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/ingest${ingestParams.toString() ? `?${ingestParams.toString()}` : ""}`;
      const kickoffInit: RequestInit = {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      };
      const adoptRun = (runId: string, operationId?: string | null) => {
        upsertAdminRunSession(syncRunFlowScope, {
          runId,
          flowKey: syncRunFlowKey,
          status: "active",
        });
        if (operationId) {
          upsertAdminOperationSession(syncOperationFlowScope, {
            flowKey: syncRunFlowKey,
            input: `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/ingest`,
            method: "POST",
            operationId,
            runId,
            status: "active",
          });
        }
        setSyncRunId(runId);
        setSyncRun(null);
        setSyncJobs([]);
        setSyncRunProgress(null);
        setSyncWeekLiveHealth(null);
        setSyncLogsExpanded(false);
        setSelectedManualAttachRunId("");
        setManualAttachRuns((current) => current.filter((run) => run.id !== runId));
        syncPollFailureCountRef.current = 0;
        terminalCoverageFailureCountRef.current = 0;
        missingRunConsecutiveCountRef.current = 0;
        if (!syncStartTimeRef.current) {
          syncStartTimeRef.current = Date.now();
        }
        setSyncPass(pass);
        void fetchSyncProgress(runId).catch(() => {});
      };
      let response: Response | null = null;
      let kickoffRecoverableErrorMessage: string | null = null;
      for (let attempt = 1; attempt <= SYNC_KICKOFF_MAX_ATTEMPTS; attempt += 1) {
        try {
          response = await fetchWithTimeout(
            kickoffUrl,
            kickoffInit,
            REQUEST_TIMEOUT_MS.ingestKickoff,
            SYNC_KICKOFF_TIMEOUT_MESSAGE,
          );
          break;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!isRecoverableSyncKickoffMessage(errorMessage)) {
            throw error;
          }
          kickoffRecoverableErrorMessage = errorMessage;
          if (attempt >= SYNC_KICKOFF_MAX_ATTEMPTS) {
            break;
          }
        }
      }
      if (!response) {
        const recovered = await recoverSyncRunAfterKickoffError({
          headers,
          pass,
          dateStart,
          dateEnd,
          platforms,
          kickoffStartedAtMs,
        }).catch(() => null);
        if (recovered?.runId) {
          adoptRun(recovered.runId);
          return recovered;
        }
        throw new Error(kickoffRecoverableErrorMessage ?? `Failed to start sync pass ${pass}`);
      }
      if (!response.ok) {
        const kickoffError = await readApiErrorMessage(response, `Failed to start sync pass ${pass}`);
        if (isRecoverableSyncKickoffMessage(kickoffError)) {
          const recovered = await recoverSyncRunAfterKickoffError({
            headers,
            pass,
            dateStart,
            dateEnd,
            platforms,
            kickoffStartedAtMs,
          }).catch(() => null);
          if (recovered?.runId) {
            adoptRun(recovered.runId);
            return recovered;
          }
        }
        throw new Error(kickoffError);
      }

      const result = (await response.json().catch(() => ({}))) as {
        run_id?: string;
        operation_id?: string;
        queued_or_started_jobs?: number;
      };
      const runId = typeof result.run_id === "string" ? result.run_id : null;
      const operationId = typeof result.operation_id === "string" ? result.operation_id : null;
      const jobs = Number(result.queued_or_started_jobs ?? 0);
      if (!runId) {
        const recovered = await recoverSyncRunAfterKickoffError({
          headers,
          pass,
          dateStart,
          dateEnd,
          platforms,
          kickoffStartedAtMs,
        }).catch(() => null);
        if (recovered?.runId) {
          adoptRun(recovered.runId);
          return recovered;
        }
        throw new Error(`Sync pass ${pass} started without a run id`);
      }
      adoptRun(runId, operationId);
      return { runId, jobs, operationId };
    },
    [
      fetchSyncProgress,
      getSyncRunRequestHeaders,
      syncOperationFlowScope,
      syncRunFlowKey,
      syncRunFlowScope,
      isRhoslcSeason,
      recoverSyncRunAfterKickoffError,
      resolvedSeasonId,
      seasonNumber,
      showIdForApi,
      sourceScope,
    ],
  );

  const fetchManualAttachRunCandidates = useCallback(async () => {
    if (!hasValidNumericPathParams || !showIdForApi || !seasonNumber || !isAdmin || syncingComments) {
      setManualAttachRuns([]);
      return;
    }
    try {
      const headers = await getSyncRunRequestHeaders();
      const runsParams = new URLSearchParams({
        source_scope: sourceScope,
        limit: "25",
      });
      if (resolvedSeasonId) {
        runsParams.set("season_id", resolvedSeasonId);
      }
      appendSyncRunScopeParams(runsParams);
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/runs?${runsParams.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.syncRuns,
        "Sync runs request timed out",
      );
      if (!response.ok) {
        setManualAttachRuns([]);
        return;
      }
      const runsPayload = await parseResponseJson<{ runs?: SocialRun[] }>(response, "Failed to load sync runs");
      const activeRuns = (runsPayload.runs ?? []).filter(
        (run) => ACTIVE_RUN_STATUSES.has(run.status) && run.id !== syncRunId,
      );
      setManualAttachRuns(activeRuns);
      if (activeRuns.length === 0) {
        setSelectedManualAttachRunId("");
      } else if (!activeRuns.some((run) => run.id === selectedManualAttachRunId)) {
        setSelectedManualAttachRunId(activeRuns[0]?.id ?? "");
      }
    } catch {
      setManualAttachRuns([]);
    }
  }, [
    appendSyncRunScopeParams,
    getSyncRunRequestHeaders,
    hasValidNumericPathParams,
    isAdmin,
    resolvedSeasonId,
    seasonNumber,
    selectedManualAttachRunId,
    showIdForApi,
    sourceScope,
    syncingComments,
    syncRunId,
  ]);

  const handleManualAttachRun = useCallback(async () => {
    const runId = selectedManualAttachRunId.trim();
    if (!runId) return;
    const selectedRun = manualAttachRuns.find((run) => run.id === runId) ?? null;
    upsertAdminRunSession(syncRunFlowScope, {
      runId,
      flowKey: syncRunFlowKey,
      status: "active",
    });
    if (selectedRun?.operation_id) {
      upsertAdminOperationSession(syncOperationFlowScope, {
        flowKey: syncRunFlowKey,
        input: `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/ingest`,
        method: "POST",
        operationId: selectedRun.operation_id,
        runId,
        status: "active",
      });
    }
    setSyncResumeBanner(`Attached to run ${runId.slice(0, 8)} from another tab.`);
    setSyncMessage(`Attached to run ${runId.slice(0, 8)}.`);
    setSyncError(null);
    setSyncPollError(null);
    setSyncingComments(true);
    setSyncRunId(runId);
    setSyncRun(null);
    setSyncJobs([]);
    setSyncRunProgress(null);
    setSyncWeekLiveHealth(null);
    setSyncLogsExpanded(false);
    syncPollFailureCountRef.current = 0;
    terminalCoverageFailureCountRef.current = 0;
    missingRunConsecutiveCountRef.current = 0;
    syncStartTimeRef.current = Date.now();
    setSyncStartedAt(new Date(syncStartTimeRef.current));
    await fetchSyncProgress(runId, {
      preserveLastGoodJobsIfEmpty: true,
      preserveLastGoodRunIfMissing: true,
    }).catch(() => undefined);
  }, [
    fetchSyncProgress,
    manualAttachRuns,
    selectedManualAttachRunId,
    seasonNumber,
    showIdForApi,
    syncOperationFlowScope,
    syncRunFlowKey,
    syncRunFlowScope,
  ]);

  const fetchCommentsCoverage = useCallback(
    async ({
      dateStart,
      dateEnd,
      platforms,
    }: {
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">> | null;
    }) => {
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const coverageParams = new URLSearchParams({
        source_scope: sourceScope,
        timezone: SOCIAL_TIME_ZONE,
        date_start: dateStart,
        date_end: dateEnd,
      });
      if (platforms && platforms.length > 0) {
        coverageParams.set("platforms", platforms.join(","));
      }
      if (resolvedSeasonId) {
        coverageParams.set("season_id", resolvedSeasonId);
      }
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/comments-coverage?${coverageParams.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.commentsCoverage,
        "Comments coverage request timed out",
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to fetch comments coverage");
      }
      return await parseResponseJson<CommentsCoverageResponse>(response, "Failed to fetch comments coverage");
    },
    [resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const fetchMirrorCoverage = useCallback(
    async ({
      dateStart,
      dateEnd,
      platforms,
    }: {
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">> | null;
    }) => {
      const headers = await getSyncRunRequestHeaders();
      const coverageParams = new URLSearchParams({
        source_scope: sourceScope,
        timezone: SOCIAL_TIME_ZONE,
        date_start: dateStart,
        date_end: dateEnd,
      });
      if (platforms && platforms.length > 0) {
        coverageParams.set("platforms", platforms.join(","));
      }
      if (resolvedSeasonId) {
        coverageParams.set("season_id", resolvedSeasonId);
      }
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/mirror-coverage?${coverageParams.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.mirrorCoverage,
        "Mirror coverage request timed out",
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to fetch mirror coverage");
      }
      return await parseResponseJson<MirrorCoverageResponse>(response, "Failed to fetch mirror coverage");
    },
    [getSyncRunRequestHeaders, resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const requeueMirrorJobs = useCallback(
    async ({
      dateStart,
      dateEnd,
      platforms,
    }: {
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">>;
    }) => {
      if (platforms.length === 0) {
        return { queuedJobs: 0, failed: 0 };
      }
      const headers = await getSyncRunRequestHeaders();
      let queuedJobs = 0;
      let failed = 0;
      for (const platform of platforms) {
        const params = new URLSearchParams({
          platform,
          source_scope: sourceScope,
          failed_only: "false",
          date_start: dateStart,
          date_end: dateEnd,
        });
        if (resolvedSeasonId) {
          params.set("season_id", resolvedSeasonId);
        }
        const response = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/mirror/requeue?${params.toString()}`,
          {
            method: "POST",
            headers,
          },
          REQUEST_TIMEOUT_MS.mirrorCoverage,
          "Mirror requeue request timed out",
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to requeue mirror jobs for ${platform}`);
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
    [getSyncRunRequestHeaders, resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const fetchSyncWorkerHealth = useCallback(async () => {
    const headers = await getSyncRunRequestHeaders();
    const url = "/api/admin/trr-api/social/ingest/health-dot";
    const requestKey = `GET ${url}`;
    let inFlight = syncWorkerHealthInFlightRef.current.get(requestKey);
    if (!inFlight) {
      inFlight = registerInFlightRequest(
        syncWorkerHealthInFlightRef.current,
        requestKey,
        fetchWithTimeout(
          url,
          { headers, cache: "no-store" },
          REQUEST_TIMEOUT_MS.workerHealth,
          "Social worker health request timed out",
        ),
      );
    }
    const rawResponse = await inFlight;
    const response = typeof rawResponse.clone === "function" ? rawResponse.clone() : rawResponse;
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Failed to fetch social worker health");
    }
    const payload = await parseResponseJson<Record<string, unknown>>(response, "Failed to fetch social worker health");
    const workers =
      payload.workers && typeof payload.workers === "object"
        ? (payload.workers as Record<string, unknown>)
        : null;
    return {
      queue_enabled: typeof payload.queue_enabled === "boolean" ? payload.queue_enabled : false,
      healthy:
        typeof workers?.healthy === "boolean"
          ? workers.healthy
          : typeof payload.healthy === "boolean"
            ? payload.healthy
            : false,
      healthy_workers:
        typeof workers?.healthy_workers === "number"
          ? workers.healthy_workers
          : typeof payload.healthy_workers === "number"
            ? payload.healthy_workers
            : 0,
      reason:
        typeof payload.reason === "string" && payload.reason.trim().length > 0
          ? payload.reason
          : null,
    } satisfies WorkerHealthPayload;
  }, [getSyncRunRequestHeaders]);

  const fetchSyncWeekLiveHealth = useCallback(async () => {
    if (!hasValidNumericPathParams) return null;
    const headers = await getSyncRunRequestHeaders();
    const params = new URLSearchParams({
      source_scope: sourceScope,
      timezone: SOCIAL_TIME_ZONE,
    });
    if (platformFilter !== "all") {
      params.set("platforms", platformFilter);
    }
    if (resolvedSeasonId) {
      params.set("season_id", resolvedSeasonId);
    }
    const url = `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/week/${weekIndex}/live-health?${params.toString()}`;
    const requestKey = `GET ${url}`;
    let inFlight = syncWeekLiveHealthInFlightRef.current.get(requestKey);
    if (!inFlight) {
      inFlight = registerInFlightRequest(
        syncWeekLiveHealthInFlightRef.current,
        requestKey,
        fetchWithTimeout(
          url,
          { headers, cache: "no-store" },
          REQUEST_TIMEOUT_MS.weekLiveHealth,
          "Week live health request timed out",
        ),
      );
    }
    const rawResponse = await inFlight;
    const response = typeof rawResponse.clone === "function" ? rawResponse.clone() : rawResponse;
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Failed to fetch week live health");
    }
    const payload = await parseResponseJson<WeekLiveHealthSnapshot>(response, "Failed to fetch week live health");
    setSyncWeekLiveHealth(payload);
    return payload;
  }, [
    getSyncRunRequestHeaders,
    hasValidNumericPathParams,
    platformFilter,
    resolvedSeasonId,
    seasonNumber,
    showIdForApi,
    sourceScope,
    weekIndex,
  ]);

  const syncAllCommentsForWeek = useCallback(async () => {
    if (!data) return;
    const generation = ++syncSessionGenerationRef.current;
    try {
      setSyncingComments(true);
      setSyncError(null);
      setSyncPollError(null);
      setSyncMessage(null);
      setSyncResumeBanner(null);
      setSyncCoveragePreview(null);
      setSyncMirrorCoveragePreview(null);
      setSyncWeekLiveHealth(null);
      setSyncRunProgress(null);
      setSyncLogsExpanded(false);
      if (!hasValidNumericPathParams) {
        throw new Error(invalidPathParamsError ?? "Invalid season/week URL");
      }

      const selectedPlatforms: Array<Exclude<PlatformFilter, "all">> | null =
        platformFilter === "all" ? null : [platformFilter];

      syncSessionStateRef.current = {
        dateStart: data.week.start,
        dateEnd: data.week.end,
        platforms: selectedPlatforms,
        maxPasses: COMMENT_SYNC_MAX_PASSES,
        maxDurationMs: COMMENT_SYNC_MAX_DURATION_MS,
        startedAtMs: Date.now(),
        pass: 1,
      };

      const platformLabel = platformFilter === "all" ? "all platforms" : PLATFORM_LABELS[platformFilter];
      const weekLabel = data.week.label || (data.week.week_index === 0 ? "Pre-Season" : `Week ${data.week.week_index}`);
      setSyncStartedAt(new Date(syncSessionStateRef.current.startedAtMs));
      setSyncPass(1);
      try {
        const health = await fetchSyncWorkerHealth();
        if (generation === syncSessionGenerationRef.current) {
          setSyncWorkerHealth(health);
        }
      } catch {
        if (generation === syncSessionGenerationRef.current) {
          setSyncWorkerHealth(null);
        }
      }
      const kickoff = await queueSyncPass({
        pass: 1,
        dateStart: data.week.start,
        dateEnd: data.week.end,
        platforms: selectedPlatforms,
      });
      if (generation !== syncSessionGenerationRef.current) return;
      const isRhoslcInstagramSync =
        sourceScope === "bravo" &&
        isRhoslcSeason &&
        Array.isArray(selectedPlatforms) &&
        selectedPlatforms.length === 1 &&
        selectedPlatforms[0] === "instagram";
      const kickoffTargetHint = isRhoslcInstagramSync ? " · #RHOSLC" : "";
      setSyncMessage(
        `Pass 1/${COMMENT_SYNC_MAX_PASSES} queued for ${weekLabel} (${platformLabel}) · run ${kickoff.runId.slice(0, 8)} · ${kickoff.jobs} job(s) · ${
          SOCIAL_FULL_SYNC_MIRROR_ENABLED
            ? "Full Sync + Mirror started."
            : `Sync ${platformFilter === "all" ? "Metrics" : getSyncActionPlatformLabel(platformFilter)} started.`
        }${kickoffTargetHint}`,
      );
    } catch (err) {
      const rawMessage =
        err instanceof Error
          ? err.message
          : SOCIAL_FULL_SYNC_MIRROR_ENABLED
            ? "Failed to run full sync + mirror"
            : "Failed to start sync";
      const message =
        isRecoverableSyncKickoffMessage(rawMessage)
          ? `${rawMessage}. Retry in a minute; if it keeps failing, share the trace id with engineering.`
          : rawMessage;
      setSyncError(
        message,
      );
      clearAdminOperationSession(syncOperationFlowScope);
      clearAdminRunSession(syncRunFlowScope);
      setSyncingComments(false);
      syncSessionStateRef.current = null;
    }
  }, [
    data,
    fetchSyncWorkerHealth,
    hasValidNumericPathParams,
    invalidPathParamsError,
    isRhoslcSeason,
    platformFilter,
    queueSyncPass,
    syncOperationFlowScope,
    syncRunFlowScope,
    sourceScope,
  ]);

  useEffect(() => {
    if (!hasValidNumericPathParams || !isAdmin) return;
    if (!showIdForApi || !seasonNumber || !weekIndex) return;
    if (syncingComments || syncRunId) return;
    if (syncResumeAttemptedForScopeRef.current === syncRunFlowScope) return;
    syncResumeAttemptedForScopeRef.current = syncRunFlowScope;
    const resumableRun = getAutoResumableAdminRunSession(syncRunFlowScope);
    const resumableOperation = getAutoResumableAdminOperationSession(syncOperationFlowScope);
    const resumedRunId = resumableRun?.runId ?? resumableOperation?.runId ?? null;
    if (!resumedRunId) return;
    const resumedStartedAtMs = resumableRun?.startedAtMs ?? Date.now();
    setSyncResumeBanner(`Resumed same-tab run ${resumedRunId.slice(0, 8)}.`);
    setSyncMessage(`Reconnected to run ${resumedRunId.slice(0, 8)} from this tab.`);
    setSyncError(null);
    setSyncPollError(null);
    setSyncingComments(true);
    setSyncRunId(resumedRunId);
    setSyncRun(null);
    setSyncJobs([]);
    setSyncRunProgress(null);
    setSyncWeekLiveHealth(null);
    setSyncLogsExpanded(false);
    syncPollFailureCountRef.current = 0;
    terminalCoverageFailureCountRef.current = 0;
    missingRunConsecutiveCountRef.current = 0;
    syncStartTimeRef.current = resumedStartedAtMs;
    setSyncStartedAt(new Date(resumedStartedAtMs));
    void fetchSyncProgress(resumedRunId, {
      preserveLastGoodJobsIfEmpty: true,
      preserveLastGoodRunIfMissing: true,
    }).catch(() => undefined);
  }, [
    fetchSyncProgress,
    hasValidNumericPathParams,
    isAdmin,
    seasonNumber,
    showIdForApi,
    syncOperationFlowScope,
    syncRunFlowScope,
    syncRunId,
    syncingComments,
    weekIndex,
  ]);

  useEffect(() => {
    if (!hasValidNumericPathParams || !isAdmin || syncingComments) return;
    void fetchManualAttachRunCandidates();
    const intervalId = window.setInterval(() => {
      void fetchManualAttachRunCandidates();
    }, 20_000);
    return () => window.clearInterval(intervalId);
  }, [fetchManualAttachRunCandidates, hasValidNumericPathParams, isAdmin, syncingComments]);

  useEffect(() => {
    if (!syncRunId || !syncingComments) return;

    syncPollAbortRef.current?.abort();
    const abortController = new AbortController();
    syncPollAbortRef.current = abortController;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const generation = ++syncPollGenerationRef.current;

    const nextPollDelayMs = (failureCount: number): number => {
      if (failureCount <= 0) return SYNC_ACTIVE_POLL_INTERVAL_MS;
      const index = Math.min(failureCount, SYNC_POLL_BACKOFF_MS.length - 1);
      return SYNC_POLL_BACKOFF_MS[index];
    };

    const poll = async () => {
      if (cancelled || generation !== syncPollGenerationRef.current) return;
      try {
        const snapshot = await fetchSyncProgress(syncRunId, {
          preserveLastGoodJobsIfEmpty: true,
          preserveLastGoodRunIfMissing: true,
          signal: abortController.signal,
        });
        if (cancelled || generation !== syncPollGenerationRef.current) return;
        syncPollFailureCountRef.current = 0;
        setSyncPollError(null);
        setSyncLastSuccessAt(new Date());
        const currentRun = snapshot.run;
        if (currentRun && TERMINAL_RUN_STATUSES.has(currentRun.status)) {
          const terminalSessionStatus =
            currentRun.status === "cancelled"
              ? "cancelled"
              : currentRun.status === "failed"
                ? "failed"
                : "completed";
          markAdminOperationSessionStatus(syncOperationFlowScope, terminalSessionStatus);
          markAdminRunSessionStatus(
            syncRunFlowScope,
            terminalSessionStatus,
          );
          const session = syncSessionStateRef.current;
          const summary = currentRun.summary ?? {};
          const completedJobs = Number(summary.completed_jobs ?? 0);
          const failedJobs = Number(summary.failed_jobs ?? 0);
          const totalJobs = Math.max(Number(summary.total_jobs ?? 0), completedJobs + failedJobs);
          const totalItems = Number(summary.items_found_total ?? 0);
          const elapsed = syncStartedAt ? ` in ${Math.round((Date.now() - syncStartedAt.getTime()) / 1000)}s` : "";
          const finalVerb =
            currentRun.status === "cancelled"
              ? "cancelled"
              : currentRun.status === "failed"
                ? "failed"
                : "complete";
          let terminalMessage = `Pass ${session?.pass ?? 1}/${session?.maxPasses ?? COMMENT_SYNC_MAX_PASSES} sync ${finalVerb}${elapsed}: ${completedJobs} job(s) finished`;
          if (totalJobs > 0) {
            terminalMessage += ` of ${totalJobs}`;
          }
          terminalMessage += `, ${totalItems.toLocaleString()} scraped`;
          if (failedJobs > 0) {
            terminalMessage += ` · ${failedJobs} failed`;
          }

          if (!session || currentRun.status === "cancelled") {
            setSyncMessage(terminalMessage);
            setSyncingComments(false);
            syncSessionStateRef.current = null;
            void fetchData({ sortFieldValue: sortField, sortDirValue: sortDir });
            return;
          }

          let coverage: CommentsCoverageResponse;
          let mirrorCoverage: MirrorCoverageResponse;
          try {
            coverage = await fetchCommentsCoverage({
              dateStart: session.dateStart,
              dateEnd: session.dateEnd,
              platforms: session.platforms,
            });
            mirrorCoverage = SOCIAL_FULL_SYNC_MIRROR_ENABLED
              ? await fetchMirrorCoverage({
                  dateStart: session.dateStart,
                  dateEnd: session.dateEnd,
                  platforms: session.platforms,
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
            terminalCoverageFailureCountRef.current = 0;
          } catch (coverageError) {
            terminalCoverageFailureCountRef.current += 1;
            if (terminalCoverageFailureCountRef.current >= 2) {
              const coverageMessage =
                coverageError instanceof Error ? coverageError.message : "Failed to fetch terminal coverage checks";
              setSyncPollError(coverageMessage);
              setSyncMessage(`${terminalMessage} · ${coverageMessage}. Stopping sync polling.`);
              setSyncingComments(false);
              syncSessionStateRef.current = null;
              return;
            }
            throw coverageError;
          }
          if (cancelled || generation !== syncPollGenerationRef.current) return;
          setSyncCoveragePreview(coverage);
          setSyncMirrorCoveragePreview(SOCIAL_FULL_SYNC_MIRROR_ENABLED ? mirrorCoverage : null);

          const coverageSaved = Number(coverage.total_saved_comments ?? 0);
          const coverageReported = Number(coverage.total_reported_comments ?? 0);
          const coverageLabel = formatCoverageLabel(coverageSaved, coverageReported);
          const mirrorTotal = Number(mirrorCoverage.posts_scanned ?? 0);
          const mirrorNeeds = Number(mirrorCoverage.needs_mirror_count ?? 0);
          const mirrorReadyCount = Math.max(0, mirrorTotal - mirrorNeeds);
          const mirrorLabel = formatMirrorCoverageLabel(mirrorReadyCount, mirrorTotal);

          const strictRunSuccess = currentRun.status === "completed" && failedJobs === 0;
          const mirrorIsReady = !SOCIAL_FULL_SYNC_MIRROR_ENABLED || mirrorCoverage.up_to_date;
          if (coverage.up_to_date && mirrorIsReady && strictRunSuccess) {
            const mirrorToken = SOCIAL_FULL_SYNC_MIRROR_ENABLED ? ` · Mirror ${mirrorLabel}` : "";
            setSyncMessage(`${terminalMessage} · Coverage ${coverageLabel}${mirrorToken} · Up-to-Date.`);
            setSyncingComments(false);
            syncSessionStateRef.current = null;
            void fetchData({ sortFieldValue: sortField, sortDirValue: sortDir });
            return;
          }

          const elapsedMs = Date.now() - session.startedAtMs;
          const nextPass = session.pass + 1;
          const withinGuardrail = nextPass <= session.maxPasses && elapsedMs < session.maxDurationMs;
          if (!withinGuardrail) {
            setSyncMessage(
              SOCIAL_FULL_SYNC_MIRROR_ENABLED
                ? `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Incomplete (guardrail reached after ${session.pass}/${session.maxPasses} passes; pending=${mirrorCoverage.pending_count ?? 0}, failed=${mirrorCoverage.failed_count ?? 0}).`
                : `${terminalMessage} · Coverage ${coverageLabel} · Stalled (guardrail reached after ${session.pass}/${session.maxPasses} passes).`,
            );
            setSyncingComments(false);
            syncSessionStateRef.current = null;
            void fetchData({ sortFieldValue: sortField, sortDirValue: sortDir });
            return;
          }

          const staleCommentPlatforms = Object.entries(coverage.by_platform ?? {})
            .filter(([, value]) => !value.up_to_date)
            .map(([platform]) => platform)
            .filter((platform): platform is Exclude<PlatformFilter, "all"> =>
              platform === "instagram" ||
              platform === "tiktok" ||
              platform === "twitter" ||
              platform === "youtube" ||
              platform === "facebook" ||
              platform === "threads",
            );
          const staleMirrorPlatforms = Object.entries(mirrorCoverage.by_platform ?? {})
            .filter(([, value]) => !value.up_to_date || Number(value.needs_mirror_count ?? 0) > 0)
            .map(([platform]) => platform)
            .filter((platform): platform is Exclude<PlatformFilter, "all"> =>
              platform === "instagram" ||
              platform === "tiktok" ||
              platform === "twitter" ||
              platform === "youtube" ||
              platform === "facebook" ||
              platform === "threads",
            );
          const mergedStalePlatforms = Array.from(new Set([...staleCommentPlatforms, ...staleMirrorPlatforms]));
          if (SOCIAL_FULL_SYNC_MIRROR_ENABLED && staleMirrorPlatforms.length > 0) {
            const requeueResult = await requeueMirrorJobs({
              dateStart: session.dateStart,
              dateEnd: session.dateEnd,
              platforms: staleMirrorPlatforms,
            });
            if (cancelled || generation !== syncPollGenerationRef.current) return;
            setSyncMessage(
              `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Requeued ${requeueResult.queuedJobs} mirror job(s) for ${staleMirrorPlatforms.length} platform(s).`,
            );
          }

          session.pass = nextPass;
          session.platforms = mergedStalePlatforms.length > 0 ? mergedStalePlatforms : session.platforms;
          setSyncPass(session.pass);
          setSyncMessage(
            SOCIAL_FULL_SYNC_MIRROR_ENABLED
              ? `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Auto-continuing pass ${session.pass}/${session.maxPasses}...`
              : `${terminalMessage} · Coverage ${coverageLabel} · Auto-continuing pass ${session.pass}/${session.maxPasses}...`,
          );

          const kickoff = await queueSyncPass({
            pass: session.pass,
            dateStart: session.dateStart,
            dateEnd: session.dateEnd,
            platforms: session.platforms,
          });
          if (cancelled || generation !== syncPollGenerationRef.current) return;
          setSyncMessage(
            SOCIAL_FULL_SYNC_MIRROR_ENABLED
              ? `Pass ${session.pass}/${session.maxPasses} queued · run ${kickoff.runId.slice(0, 8)} · ${kickoff.jobs} job(s) · Coverage ${coverageLabel} · Mirror ${mirrorLabel}.`
              : `Pass ${session.pass}/${session.maxPasses} queued · run ${kickoff.runId.slice(0, 8)} · ${kickoff.jobs} job(s) · Coverage ${coverageLabel}.`,
          );
          return;
        }
      } catch (err) {
        if (cancelled || generation !== syncPollGenerationRef.current) return;
        if (isAbortError(err)) return;
        const message = err instanceof Error ? err.message : "Failed to refresh sync progress";
        if (message === "Run no longer available") {
          markAdminOperationSessionStatus(syncOperationFlowScope, "failed");
          markAdminRunSessionStatus(syncRunFlowScope, "failed");
          setSyncPollError(message);
          setSyncMessage(message);
          setSyncingComments(false);
          syncSessionStateRef.current = null;
          return;
        }
        if (isTransientDevRestartMessage(message)) {
          syncPollFailureCountRef.current = Math.max(1, syncPollFailureCountRef.current);
        } else {
          syncPollFailureCountRef.current += 1;
        }
        if (syncPollFailureCountRef.current >= 2 && !isTransientDevRestartMessage(message)) {
          setSyncPollError(message);
        }
      }

      if (cancelled || generation !== syncPollGenerationRef.current) return;
      const delayMs = nextPollDelayMs(syncPollFailureCountRef.current);
      timeoutId = setTimeout(() => {
        void poll();
      }, delayMs);
    };

    void poll();
    return () => {
      cancelled = true;
      abortController.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    fetchCommentsCoverage,
    fetchData,
    fetchMirrorCoverage,
    fetchSyncProgress,
    queueSyncPass,
    requeueMirrorJobs,
    sortDir,
    sortField,
    syncRunId,
    syncOperationFlowScope,
    syncRunFlowScope,
    syncStartedAt,
    syncingComments,
  ]);

  useEffect(() => {
    if (!syncingComments || !hasValidNumericPathParams) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pollLiveHealth = async () => {
      if (cancelled) return;
      try {
        await fetchSyncWeekLiveHealth();
      } catch {
        // Keep sync polling resilient when live-health is temporarily unavailable.
      }
      if (cancelled) return;
      timeoutId = setTimeout(() => {
        void pollLiveHealth();
      }, SYNC_ACTIVE_POLL_INTERVAL_MS);
    };

    void pollLiveHealth();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchSyncWeekLiveHealth, hasValidNumericPathParams, syncingComments]);

  useEffect(() => {
    if (!syncingComments && syncPass !== 0) {
      setSyncPass(0);
    }
  }, [syncPass, syncingComments]);

  useEffect(() => {
    if (!syncingComments) {
      syncSessionStateRef.current = null;
      syncStartTimeRef.current = null;
      setSyncElapsedDisplay("");
    }
  }, [syncingComments]);

  useEffect(() => {
    if (!syncingComments || !syncStartTimeRef.current) {
      setSyncElapsedDisplay("");
      return;
    }
    const tick = () => {
      if (!syncStartTimeRef.current) return;
      const elapsed = Math.floor((Date.now() - syncStartTimeRef.current) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setSyncElapsedDisplay(minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
    };
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [syncingComments]);

  useEffect(() => {
    if (!syncingComments || !hasValidNumericPathParams) return;
    const intervalId = setInterval(() => {
      void fetchData({
        refreshGalleryOnly: true,
        platformFilterValue: platformFilter,
        sortFieldValue: sortField,
        sortDirValue: sortDir,
      });
    }, SYNC_GALLERY_REFRESH_MS);
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchData, hasValidNumericPathParams, platformFilter, sortDir, sortField, syncingComments]);

  const openPostMediaLightbox = useCallback(
    (platform: string, post: AnyPost, initialIndex = 0) => {
      const mediaCandidates = getPostMediaCandidates(platform, post);
      if (mediaCandidates.length === 0) return;
      const weekLabel = displayData?.week.label ?? `Week ${weekIndexInt}`;
      const stats = buildSocialStats(platform, post);
      const allPlatformPosts = displayData?.platforms[platform]?.posts ?? [];
      // Count actual media URLs (not the appended thumbnail candidate)
      const mediaUrlCount = Math.max(
        getStrArr(post, "source_media_urls").length || getStrArr(post, "media_urls").length,
        getStrArr(post, "hosted_media_urls").length,
      );
      const entries = mediaCandidates.map((media, mediaIndex) => {
        const isThumbnailEntry = mediaIndex >= mediaUrlCount && mediaUrlCount > 0;
        const metadata = buildSocialPostMetadata({
          platform,
          post,
          media,
          showName: displayData?.season.show_name,
          showSlug: displayData?.season.show_slug,
          seasonNumber: Number.isFinite(seasonNumberInt) ? seasonNumberInt : null,
          weekLabel,
          sourceScope,
          allPlatformPosts,
          mediaIndex,
          totalMediaCount: mediaUrlCount,
          isThumbnailEntry,
        });
        return {
          id: `${platform}-${post.source_id}-${mediaIndex + 1}`,
          src: media.src,
          mediaType: media.mediaType,
          posterSrc: media.posterSrc,
          alt: `${PLATFORM_LABELS[platform] ?? platform} media`,
          metadata,
          stats,
        } satisfies SocialMediaLightboxEntry;
      });
      const boundedIndex = Math.max(0, Math.min(initialIndex, entries.length - 1));
      setMediaLightbox({ entries, index: boundedIndex });
    },
    [
      displayData?.platforms,
      displayData?.season.show_name,
      displayData?.season.show_slug,
      displayData?.week.label,
      seasonNumberInt,
      sourceScope,
      weekIndexInt,
    ],
  );

  const closeMediaLightbox = useCallback(() => {
    setMediaLightbox(null);
  }, []);

  const navigateMediaLightbox = useCallback((direction: "prev" | "next") => {
    setMediaLightbox((current) => {
      if (!current) return current;
      const delta = direction === "next" ? 1 : -1;
      const nextIndex = current.index + delta;
      if (nextIndex < 0 || nextIndex >= current.entries.length) return current;
      return {
        ...current,
        index: nextIndex,
      };
    });
  }, []);

  // Build merged post list with server ordering + local filters/search.
  const allPosts = useMemo(() => {
    if (!displayData) return [];
    const entries: { platform: string; post: AnyPost; ordinal: number }[] = [];
    const needle = searchText.trim().toLowerCase();
    let ordinal = 0;
    for (const [plat, pdata] of Object.entries(displayData.platforms)) {
      if (platformFilter !== "all" && plat !== platformFilter) continue;
      for (const post of pdata.posts) {
        if (activeDayFilter) {
          const postDayToken = toLocalDateToken(post.posted_at);
          if (!postDayToken || postDayToken !== activeDayFilter) {
            continue;
          }
        }
        if (needle) {
          const text = (post.text ?? "").toLowerCase();
          const author = (post.author ?? "").toLowerCase();
          const title = getStr(post, "title").toLowerCase();
          const topic = getStr(post, "topic").toLowerCase();
          const commentsBlob = [
            ...((Array.isArray((post as { comments?: unknown[] }).comments)
              ? (post as { comments?: unknown[] }).comments
              : []) as Array<Record<string, unknown>>),
            ...((Array.isArray((post as { quotes?: unknown[] }).quotes)
              ? (post as { quotes?: unknown[] }).quotes
              : []) as Array<Record<string, unknown>>),
          ]
            .map((comment) => {
              const textValue = comment?.text;
              return typeof textValue === "string" ? textValue : "";
            })
            .filter((value) => value.length > 0)
            .join(" ")
            .toLowerCase();
          if (
            !text.includes(needle) &&
            !author.includes(needle) &&
            !title.includes(needle) &&
            !topic.includes(needle) &&
            !commentsBlob.includes(needle)
          ) {
            continue;
          }
        }
        entries.push({ platform: plat, post, ordinal });
        ordinal += 1;
      }
    }
    entries.sort((a, b) => {
      const aRank = hasNum(a.post, "sort_rank") ? getNum(a.post, "sort_rank") : Number.MAX_SAFE_INTEGER;
      const bRank = hasNum(b.post, "sort_rank") ? getNum(b.post, "sort_rank") : Number.MAX_SAFE_INTEGER;
      if (aRank === bRank) return a.ordinal - b.ordinal;
      return aRank - bRank;
    });
    return entries.map(({ platform, post }) => ({ platform, post }));
  }, [activeDayFilter, displayData, platformFilter, searchText]);

  const summaryPostsByPlatform = useMemo(() => {
    const nextPostsByPlatform: Record<string, AnyPost[]> = {};
    for (const platform of PLATFORM_KEYS) {
      nextPostsByPlatform[platform] = metricsPostsByPlatform?.[platform] ?? data?.platforms?.[platform]?.posts ?? [];
    }
    return nextPostsByPlatform;
  }, [data, metricsPostsByPlatform]);

  const summaryPosts = useMemo(() => {
    const entries: { platform: string; post: AnyPost }[] = [];
    const selectedPlatforms: SocialPlatform[] = platformFilter === "all" ? PLATFORM_KEYS : [platformFilter];
    for (const platform of selectedPlatforms) {
      for (const post of summaryPostsByPlatform[platform] ?? []) {
        if (activeDayFilter) {
          const postDayToken = toLocalDateToken(post.posted_at);
          if (!postDayToken || postDayToken !== activeDayFilter) {
            continue;
          }
        }
        entries.push({ platform, post });
      }
    }
    return entries;
  }, [activeDayFilter, platformFilter, summaryPostsByPlatform]);

  const visiblePlatformStatuses = useMemo(
    () => getVisiblePlatformStatuses(displayData, platformFilter),
    [displayData, platformFilter],
  );

  const uniquePostTokenSummary = useMemo(() => {
    const collaborators = new Map<string, string>();
    const tags = new Map<string, string>();
    const mentions = new Map<string, string>();
    const hashtags = new Map<string, string>();
    for (const { platform, post } of summaryPosts) {
      for (const value of getStrArr(post, "collaborators")) {
        const label = formatHandleLabel(value);
        if (!label) continue;
        collaborators.set(label.toLowerCase(), label);
      }
      for (const value of getStrArr(post, "profile_tags")) {
        const label = formatHandleLabel(value);
        if (!label) continue;
        tags.set(label.toLowerCase(), label);
      }
      for (const value of getPostMentions(post)) {
        const normalizedMention = value.startsWith("@") ? value : formatHandleLabel(value);
        if (!normalizedMention) continue;
        mentions.set(normalizedMention.toLowerCase(), normalizedMention);
      }
      for (const value of getPostHashtags(platform, post)) {
        const normalizedTag = `#${String(value || "").trim().replace(/^#+/, "")}`;
        if (normalizedTag === "#") continue;
        hashtags.set(normalizedTag.toLowerCase(), normalizedTag);
      }
    }
    const sortTokens = (collection: Map<string, string>): string[] =>
      [...collection.values()].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
    return {
      collaborators: sortTokens(collaborators),
      tags: sortTokens(tags),
      mentions: sortTokens(mentions),
      hashtags: sortTokens(hashtags),
    };
  }, [summaryPosts]);

  const verifiedHandlesInView = useMemo(() => {
    const verified = new Set<string>();
    for (const { platform, post } of summaryPosts) {
      const collaborators = getStrArr(post, "collaborators");
      const headerAccounts = buildHeaderAccounts(platform, post, collaborators);
      const postVerified = resolveVerifiedHeaderHandles(platform, post, headerAccounts);
      for (const handle of postVerified) {
        verified.add(normalizeHandle(handle));
      }
    }
    return verified;
  }, [summaryPosts]);

  const tokenHandleDisplayNames = useMemo(() => {
    const byHandle = new Map<string, { displayName: string; priority: 1 | 2 | 3 }>();
    const setName = (handle: string, displayName: string | null, priority: 1 | 2 | 3) => {
      const normalizedHandle = normalizeHandle(handle);
      const normalizedDisplayName = String(displayName ?? "").trim();
      if (!normalizedHandle || !normalizedDisplayName) return;
      const existing = byHandle.get(normalizedHandle);
      if (existing && existing.priority <= priority) return;
      byHandle.set(normalizedHandle, { displayName: normalizedDisplayName, priority });
    };

    for (const { post } of summaryPosts) {
      const postRecord = asRecord(post);
      const authorHandle = resolvePostAuthorHandle(post);

      for (const key of TOKEN_HANDLE_DETAIL_KEYS) {
        for (const detail of pickObjectArrayFromRecord(postRecord, key)) {
          const handle = resolveDetailHandleValue(detail);
          if (!handle) continue;
          setName(handle, resolveDetailDisplayNameValue(detail), 1);
        }
      }

      const authorUserRecord = asRecord(post.user);
      setName(authorHandle, pickNonEmptyStringFromRecord(authorUserRecord, ["full_name", "fullName", "display_name", "displayName", "name", "nickname"]), 2);
      setName(authorHandle, pickNonEmptyStringFromRecord(postRecord, ["owner_full_name", "full_name", "fullName", "display_name", "displayName", "name", "nickname"]), 3);

      const candidateHandles = new Set<string>();
      for (const handle of getStrArr(post, "collaborators")) {
        const normalized = normalizeHandle(handle);
        if (normalized) candidateHandles.add(normalized);
      }
      for (const handle of getStrArr(post, "profile_tags")) {
        const normalized = normalizeHandle(handle);
        if (normalized) candidateHandles.add(normalized);
      }
      for (const handle of getPostMentions(post)) {
        const normalized = normalizeHandle(handle);
        if (normalized) candidateHandles.add(normalized);
      }
      for (const handle of candidateHandles) {
        setName(handle, resolveHandleProfile(post, handle)?.displayName ?? null, 2);
      }
    }

    const resolved = new Map<string, string | null>();
    for (const [handle, entry] of byHandle.entries()) {
      resolved.set(handle, entry.displayName);
    }
    return resolved;
  }, [summaryPosts]);

  const tokenHandleAvatarUrls = useMemo(() => {
    const byHandle = new Map<string, string>();
    const setAvatar = (handle: string, avatarUrl: string | null) => {
      const normalizedHandle = normalizeHandle(handle);
      const normalizedAvatarUrl = String(avatarUrl ?? "").trim();
      if (!normalizedHandle || !normalizedAvatarUrl) return;
      if (byHandle.has(normalizedHandle)) return;
      byHandle.set(normalizedHandle, normalizedAvatarUrl);
    };

    for (const { post } of summaryPosts) {
      const authorHandle = resolvePostAuthorHandle(post);
      setAvatar(authorHandle, resolveAccountAvatarUrl(post, authorHandle, true));

      const candidateHandles = new Set<string>();
      for (const handle of getStrArr(post, "collaborators")) {
        const normalized = normalizeHandle(handle);
        if (normalized) candidateHandles.add(normalized);
      }
      for (const handle of getStrArr(post, "profile_tags")) {
        const normalized = normalizeHandle(handle);
        if (normalized) candidateHandles.add(normalized);
      }
      for (const handle of getPostMentions(post)) {
        const normalized = normalizeHandle(handle);
        if (normalized) candidateHandles.add(normalized);
      }

      const postRecord = asRecord(post);
      for (const key of TOKEN_HANDLE_DETAIL_KEYS) {
        for (const detail of pickObjectArrayFromRecord(postRecord, key)) {
          const normalized = resolveDetailHandleValue(detail);
          if (normalized) candidateHandles.add(normalized);
        }
      }

      for (const handle of candidateHandles) {
        setAvatar(
          handle,
          resolveAccountAvatarUrl(post, handle, handle === authorHandle) ?? resolveHandleProfile(post, handle)?.avatarUrl ?? null,
        );
      }
    }

    return byHandle;
  }, [summaryPosts]);

  const tokenHandleProfileUrls = useMemo(() => {
    const byHandle = new Map<string, string>();
    const setProfileUrl = (handle: string, profileUrl: string | null) => {
      const normalizedHandle = normalizeHandle(handle);
      const normalizedProfileUrl = normalizeExternalUrl(profileUrl);
      if (!normalizedHandle || !normalizedProfileUrl) return;
      if (byHandle.has(normalizedHandle)) return;
      byHandle.set(normalizedHandle, normalizedProfileUrl);
    };

    for (const { post } of summaryPosts) {
      const authorHandle = resolvePostAuthorHandle(post);
      setProfileUrl(authorHandle, resolveHandleProfile(post, authorHandle)?.profileUrl ?? null);

      const candidateHandles = new Set<string>();
      for (const handle of getStrArr(post, "collaborators")) {
        const normalized = normalizeHandle(handle);
        if (normalized) candidateHandles.add(normalized);
      }
      for (const handle of getStrArr(post, "profile_tags")) {
        const normalized = normalizeHandle(handle);
        if (normalized) candidateHandles.add(normalized);
      }
      for (const handle of getPostMentions(post)) {
        const normalized = normalizeHandle(handle);
        if (normalized) candidateHandles.add(normalized);
      }

      const postRecord = asRecord(post);
      for (const key of TOKEN_HANDLE_DETAIL_KEYS) {
        for (const detail of pickObjectArrayFromRecord(postRecord, key)) {
          const normalized = resolveDetailHandleValue(detail);
          if (normalized) candidateHandles.add(normalized);
        }
      }

      for (const handle of candidateHandles) {
        setProfileUrl(handle, resolveHandleProfile(post, handle)?.profileUrl ?? null);
      }
    }

    return byHandle;
  }, [summaryPosts]);

  const tokenModalRows = useMemo(() => {
    if (!tokenSummaryModal || !isHandleTokenKey(tokenSummaryModal.key)) return [];
    const preferredPlatform: PlatformFilter = platformFilter === "all" ? "instagram" : platformFilter;
    return tokenSummaryModal.values
      .map((value) => {
        const handle = normalizeHandle(value);
        if (!handle) return null;
        return {
          key: value,
          handle,
          handleLabel: `@${handle}`,
          displayName: tokenHandleDisplayNames.get(handle) ?? null,
          avatarUrl: tokenHandleAvatarUrls.get(handle) ?? null,
          profileUrl: tokenHandleProfileUrls.get(handle) ?? buildHandleProfileUrl(handle, preferredPlatform),
          isVerified: verifiedHandlesInView.has(handle),
        };
      })
      .filter(
        (
          row,
        ): row is {
          key: string;
          handle: string;
          handleLabel: string;
          displayName: string | null;
          avatarUrl: string | null;
          profileUrl: string;
          isVerified: boolean;
        } => row !== null,
      );
  }, [platformFilter, tokenHandleAvatarUrls, tokenHandleDisplayNames, tokenHandleProfileUrls, tokenSummaryModal, verifiedHandlesInView]);

  const tabTotals = useMemo(() => {
    const fallbackTotals: Record<SocialPlatform, number> = { ...EMPTY_PLATFORM_TOTALS };
    for (const platform of PLATFORM_KEYS) {
      const fromPayload = Number(displayData?.platforms?.[platform]?.totals?.posts ?? Number.NaN);
      fallbackTotals[platform] = Number.isFinite(fromPayload) ? Math.max(0, fromPayload) : 0;
    }
    if (!platformTotalsByPlatform) {
      return fallbackTotals;
    }
    const mergedTotals: Record<SocialPlatform, number> = { ...fallbackTotals };
    for (const platform of PLATFORM_KEYS) {
      const fromSummary = Number(platformTotalsByPlatform[platform] ?? Number.NaN);
      if (Number.isFinite(fromSummary)) {
        mergedTotals[platform] = Math.max(0, fromSummary);
      }
    }
    return mergedTotals;
  }, [displayData, platformTotalsByPlatform]);

  const allTabTotalPosts = useMemo(() => {
    const fromSummary = Number(allPlatformsTotalPosts ?? Number.NaN);
    if (Number.isFinite(fromSummary)) {
      return Math.max(0, fromSummary);
    }
    const fromPayload = Number(displayData?.totals?.posts ?? Number.NaN);
    if (Number.isFinite(fromPayload)) {
      return Math.max(0, fromPayload);
    }
    return PLATFORM_KEYS.reduce((sum, platform) => sum + tabTotals[platform], 0);
  }, [allPlatformsTotalPosts, displayData?.totals?.posts, tabTotals]);

  // Filtered totals
  const filteredTotals = useMemo(() => {
    const sumLikes = (posts: AnyPost[]): number => {
      return posts.reduce((sum, post) => sum + Math.max(0, Number(getNum(post, "likes") || 0)), 0);
    };
    if (!displayData) return { posts: 0, total_comments: 0, total_likes: 0 };
    if (metricsPostsByPlatform) {
      const totalComments = summaryPosts.reduce((sum, { platform, post }) => sum + getActualCommentsForPost(platform, post), 0);
      const totalLikes = summaryPosts.reduce((sum, { post }) => sum + Math.max(0, Number(getNum(post, "likes") || 0)), 0);
      const authoritativePosts =
        platformFilter === "all"
          ? allTabTotalPosts
          : Math.max(
              0,
              Number(platformTotalsByPlatform[platformFilter] ?? displayData.platforms[platformFilter]?.totals?.posts ?? 0),
            );
      return {
        posts: authoritativePosts,
        total_comments: totalComments,
        total_likes: totalLikes,
      };
    }
    if (activeDayFilter) {
      let posts = 0;
      let totalComments = 0;
      let totalLikes = 0;
      const platformEntries =
        platformFilter === "all"
          ? Object.entries(displayData.platforms)
          : [[platformFilter, displayData.platforms[platformFilter]] as [string, PlatformData | undefined]];
      for (const [platform, platformData] of platformEntries) {
        if (!platformData) continue;
        for (const post of platformData.posts) {
          const postDayToken = toLocalDateToken(post.posted_at);
          if (!postDayToken || postDayToken !== activeDayFilter) continue;
          posts += 1;
          totalComments += getActualCommentsForPost(platform, post);
          totalLikes += Math.max(0, Number(getNum(post, "likes") || 0));
        }
      }
      return { posts, total_comments: totalComments, total_likes: totalLikes };
    }
    if (platformFilter === "all") {
      const totalLikes = PLATFORM_KEYS.reduce((sum, platform) => {
        const platformPosts = displayData.platforms[platform]?.posts ?? [];
        return sum + sumLikes(platformPosts);
      }, 0);
      return {
        posts: allTabTotalPosts,
        total_comments: displayData.totals.total_comments,
        total_likes: totalLikes,
      };
    }
    const pd = displayData.platforms[platformFilter];
    return pd?.totals
      ? { posts: pd.totals.posts, total_comments: pd.totals.total_comments, total_likes: sumLikes(pd.posts ?? []) }
      : { posts: 0, total_comments: 0, total_likes: 0 };
  }, [
    activeDayFilter,
    allTabTotalPosts,
    displayData,
    metricsPostsByPlatform,
    platformFilter,
    platformTotalsByPlatform,
    summaryPosts,
  ]);

  const syncLiveSummaryTotals = useMemo(() => {
    if (!syncingComments) return null;
    const rows = syncWeekLiveHealth?.day_account_rows ?? [];
    if (rows.length === 0) return null;
    let posts = 0;
    let totalComments = 0;
    let totalLikes = 0;
    for (const row of rows) {
      if (platformFilter !== "all" && row.platform !== platformFilter) continue;
      if (activeDayFilter && row.day !== activeDayFilter) continue;
      posts += Math.max(0, Number(row.posts ?? 0));
      totalComments += Math.max(0, Number(row.comments ?? 0));
      totalLikes += Math.max(0, Number(row.likes ?? 0));
    }
    return { posts, total_comments: totalComments, total_likes: totalLikes };
  }, [activeDayFilter, platformFilter, syncWeekLiveHealth?.day_account_rows, syncingComments]);

  const platformFilteredMetrics = useMemo(() => {
    const config = PLATFORM_SUMMARY_CONFIG[platformFilter];
    const sums: Record<string, number> = {};
    for (const metric of config.metrics) {
      if (metric.aggregate === "twitter_reposts") {
        sums[metric.key] = summaryPosts.reduce((sum, { post }) => sum + getTwitterRepostCount(post), 0);
      } else if (metric.aggregate === "comments_normalized") {
        sums[metric.key] = summaryPosts.reduce(
          (sum, { platform, post }) => sum + getActualCommentsForPost(platform, post),
          0,
        );
      } else {
        sums[metric.key] = summaryPosts.reduce(
          (sum, { post }) => sum + Math.max(0, Number(getNum(post, metric.key) || 0)),
          0,
        );
      }
    }
    return sums;
  }, [platformFilter, summaryPosts]);

  const displayedPlatformMetrics = useMemo(() => {
    const merged = { ...platformFilteredMetrics };
    if (!syncingComments || !syncLiveSummaryTotals) return merged;
    if (Object.prototype.hasOwnProperty.call(merged, "likes")) {
      merged.likes = Math.max(merged.likes ?? 0, syncLiveSummaryTotals.total_likes);
    }
    if (Object.prototype.hasOwnProperty.call(merged, "comments_count")) {
      merged.comments_count = Math.max(merged.comments_count ?? 0, syncLiveSummaryTotals.total_comments);
    }
    if (Object.prototype.hasOwnProperty.call(merged, "comments_normalized")) {
      merged.comments_normalized = Math.max(merged.comments_normalized ?? 0, syncLiveSummaryTotals.total_comments);
    }
    return merged;
  }, [platformFilteredMetrics, syncLiveSummaryTotals, syncingComments]);

  const activeSortLabel = useMemo(() => {
    return SORT_OPTIONS.find((option) => option.key === sortField)?.label ?? "selected metric";
  }, [sortField]);

  const filteredCommentCoverage = useMemo(() => {
    if (!displayData) return { saved: 0, actual: 0, incomplete: false };
    if (metricsPostsByPlatform) {
      let effectiveSaved = 0;
      let actual = 0;
      for (const { platform, post } of summaryPosts) {
        const savedCount = getSavedCommentsForPost(post);
        const actualCount = getActualCommentsForPost(platform, post);
        effectiveSaved += Math.min(savedCount, actualCount);
        actual += actualCount;
      }
      return toEffectiveCommentCoverage(effectiveSaved, actual);
    }
    let effectiveSaved = 0;
    let actual = 0;
    const platformEntries =
      platformFilter === "all"
        ? Object.entries(displayData.platforms)
        : [[platformFilter, displayData.platforms[platformFilter]] as [string, PlatformData | undefined]];
    for (const [platform, platformData] of platformEntries) {
      if (!platformData) continue;
      for (const post of platformData.posts) {
        if (activeDayFilter) {
          const postDayToken = toLocalDateToken(post.posted_at);
          if (!postDayToken || postDayToken !== activeDayFilter) continue;
        }
        const savedCount = getSavedCommentsForPost(post);
        const actualCount = getActualCommentsForPost(platform, post);
        effectiveSaved += Math.min(savedCount, actualCount);
        actual += actualCount;
      }
    }
    return toEffectiveCommentCoverage(effectiveSaved, actual);
  }, [activeDayFilter, displayData, metricsPostsByPlatform, platformFilter, summaryPosts]);

  const syncFilteredCommentCoverage = useMemo(() => {
    if (!syncCoveragePreview) return null;
    const coverageByPlatform = syncCoveragePreview.by_platform ?? {};

    if (platformFilter === "all" && Object.keys(coverageByPlatform).length > 0) {
      let saved = 0;
      let actual = 0;
      for (const entry of Object.values(coverageByPlatform)) {
        const counts = getCoverageEntryCounts(entry);
        saved += Math.min(counts.saved, counts.actual);
        actual += counts.actual;
      }
      return toEffectiveCommentCoverage(saved, actual);
    }

    if (platformFilter !== "all") {
      const platformEntry = coverageByPlatform[platformFilter];
      if (platformEntry) {
        const counts = getCoverageEntryCounts(platformEntry);
        return toEffectiveCommentCoverage(counts.saved, counts.actual);
      }
    }

    const totals = getCoverageEntryCounts({
      total_saved_comments: syncCoveragePreview.total_saved_comments,
      total_reported_comments: syncCoveragePreview.total_reported_comments,
    });
    return toEffectiveCommentCoverage(totals.saved, totals.actual);
  }, [platformFilter, syncCoveragePreview]);

  const commentsSavedPct = useMemo(() => {
    const effectiveCoverage =
      syncingComments && syncFilteredCommentCoverage
        ? syncFilteredCommentCoverage
        : filteredCommentCoverage;
    if (effectiveCoverage.actual <= 0) return 100;
    const ratio = (effectiveCoverage.saved / effectiveCoverage.actual) * 100;
    return Math.max(0, Math.min(100, ratio));
  }, [filteredCommentCoverage, syncFilteredCommentCoverage, syncingComments]);

  const displayedCommentCoverage = useMemo(() => {
    if (syncingComments && syncFilteredCommentCoverage) {
      return syncFilteredCommentCoverage;
    }
    return filteredCommentCoverage;
  }, [filteredCommentCoverage, syncFilteredCommentCoverage, syncingComments]);

  const syncStageProgress = useMemo(() => {
    const byStage: Record<string, StageProgressSnapshot> = {};
    if (syncRunProgress?.stages && Object.keys(syncRunProgress.stages).length > 0) {
      for (const [stage, bucket] of Object.entries(syncRunProgress.stages)) {
        byStage[stage] = {
          total: Number(bucket.jobs_total ?? 0),
          completed: Number(bucket.jobs_completed ?? 0),
          failed: Number(bucket.jobs_failed ?? 0),
          active: Number(bucket.jobs_active ?? 0),
          running: Number(bucket.jobs_running ?? 0),
          waiting: Number(bucket.jobs_waiting ?? 0),
          scraped: Number(bucket.scraped_count ?? 0),
          saved: Number(bucket.saved_count ?? 0),
        };
      }
    }

    if (Object.keys(byStage).length === 0) {
      const fallback: Record<string, StageProgressSnapshot> = {};
      for (const job of syncJobs) {
        const stage = String(getJobStage(job) || "posts").trim().toLowerCase() || "posts";
        const current = fallback[stage] ?? {
          total: 0,
          completed: 0,
          failed: 0,
          active: 0,
          running: 0,
          waiting: 0,
          scraped: 0,
          saved: 0,
        };
        current.total += 1;
        if (job.status === "completed") current.completed += 1;
        else if (job.status === "failed") current.failed += 1;
        else if (ACTIVE_RUN_STATUSES.has(job.status)) {
          current.active += 1;
          if (job.status === "running") current.running += 1;
          else current.waiting += 1;
        }
        const stageCounters = getJobStageCounters(job);
        current.scraped += stageCounters ? stageCounters.posts + stageCounters.comments : Number(job.items_found ?? 0);
        const persistCounters = getJobPersistCounters(job);
        if (persistCounters) {
          current.saved += persistCounters.posts_upserted + persistCounters.comments_upserted;
        }
        fallback[stage] = current;
      }
      Object.assign(byStage, fallback);
    }

    for (const requiredStage of ["posts", "comments", "media_mirror", "comment_media_mirror", "other"]) {
      if (!byStage[requiredStage]) {
        byStage[requiredStage] = {
          total: 0,
          completed: 0,
          failed: 0,
          active: 0,
          running: 0,
          waiting: 0,
          scraped: 0,
          saved: 0,
        };
      }
    }
    return byStage;
  }, [syncJobs, syncRunProgress?.stages]);

  const syncStageEntries = useMemo(() => {
    const stageOrder: Record<string, number> = {
      posts: 0,
      comments: 1,
      media_mirror: 2,
      comment_media_mirror: 3,
      other: 99,
    };
    return Object.entries(syncStageProgress)
      .filter(([stage, stats]) => {
        if (stats.total > 0 || stats.running > 0 || stats.waiting > 0 || stats.scraped > 0 || stats.saved > 0) return true;
        return stage === "posts" || stage === "comments";
      })
      .sort(([left], [right]) => {
        const leftOrder = stageOrder[left] ?? 50;
        const rightOrder = stageOrder[right] ?? 50;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.localeCompare(right);
      });
  }, [syncStageProgress]);

  const syncProgress = useMemo(() => {
    const summary = syncRunProgress?.summary ?? syncRun?.summary_normalized ?? syncRun?.summary ?? {};
    const fallbackCompleted = syncJobs.filter((job) => job.status === "completed").length;
    const fallbackFailed = syncJobs.filter((job) => job.status === "failed").length;
    const fallbackRunning = syncJobs.filter((job) => job.status === "running").length;
    const fallbackWaiting = syncJobs.filter(
      (job) => job.status === "queued" || job.status === "pending" || job.status === "retrying" || job.status === "cancelling",
    ).length;
    const fallbackTotal = syncJobs.length;
    const stageStats = Object.values(syncStageProgress);
    const stageRunning = stageStats.reduce((sum, stage) => sum + stage.running, 0);
    const stageWaiting = stageStats.reduce((sum, stage) => sum + stage.waiting, 0);
    const stageItems = stageStats.reduce((sum, stage) => sum + stage.scraped, 0);
    const stageTelemetry = stageStats.reduce((sum, stage) => sum + stage.scraped + stage.saved, 0);
    const completedFromSummary = Number(summary.completed_jobs ?? Number.NaN);
    const failedFromSummary = Number(summary.failed_jobs ?? Number.NaN);
    const totalFromSummary = Number(summary.total_jobs ?? Number.NaN);
    const completed = Number.isFinite(completedFromSummary)
      ? Math.max(0, Math.max(completedFromSummary, fallbackCompleted))
      : Math.max(0, fallbackCompleted);
    const failed = Number.isFinite(failedFromSummary)
      ? Math.max(0, Math.max(failedFromSummary, fallbackFailed))
      : Math.max(0, fallbackFailed);
    const running = Math.max(0, Math.max(fallbackRunning, stageRunning));
    const waiting = Math.max(0, Math.max(fallbackWaiting, stageWaiting));
    const active = running;
    const totalBase = Number.isFinite(totalFromSummary) && totalFromSummary > 0 ? totalFromSummary : fallbackTotal;
    const total = Math.max(totalBase, completed + failed + running + waiting);
    const itemsFromSummary = Number(summary.items_found_total ?? Number.NaN);
    const items = Number.isFinite(itemsFromSummary) ? Math.max(0, Math.max(itemsFromSummary, stageItems)) : stageItems;
    const finished = completed + failed;
    const basePct = total > 0 ? Math.round((finished / total) * 100) : syncingComments ? 1 : 100;
    const liveBoost = running > 0 ? Math.min(35, Math.max(1, Math.round(Math.log10(stageTelemetry + 10) * 8))) : 0;
    const pct =
      total > 0
        ? running > 0
          ? Math.min(99, Math.max(basePct, basePct + liveBoost))
          : Math.min(100, basePct)
        : syncingComments
          ? Math.min(99, 5 + liveBoost)
          : 100;
    return {
      completed,
      failed,
      total,
      active,
      running,
      waiting,
      items,
      finished,
      pct: Math.max(0, Math.min(100, pct)),
    };
  }, [syncJobs, syncRun, syncRunProgress?.summary, syncStageProgress, syncingComments]);

  const syncRunnerCount = useMemo(() => {
    const lanes = syncRunProgress?.worker_runtime?.scheduler_lanes ?? [];
    if (lanes.length > 0) return lanes.length;
    const runConfig = asRecord(syncRun?.config);
    const parsed = Number(runConfig?.runner_count ?? 1);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.floor(parsed);
  }, [syncRun?.config, syncRunProgress?.worker_runtime?.scheduler_lanes]);

  const syncRuntimeLanes = useMemo(() => {
    const lanes = (syncRunProgress?.worker_runtime?.scheduler_lanes ?? [])
      .map((lane) => String(lane || "").trim())
      .filter((lane) => lane.length > 0);
    if (lanes.length > 0) return lanes;
    return syncRunnerCount >= 2 ? ["A", "B"] : ["A"];
  }, [syncRunProgress?.worker_runtime?.scheduler_lanes, syncRunnerCount]);

  const syncScheduleModeLabel = useMemo(() => {
    return syncRunnerCount >= 2 ? `Dual-lane schedule (${syncRunnerCount} lanes)` : "Single-lane schedule";
  }, [syncRunnerCount]);

  const syncActiveWorkersNow = useMemo(() => {
    return Number(syncRunProgress?.worker_runtime?.active_workers_now ?? 0);
  }, [syncRunProgress?.worker_runtime?.active_workers_now]);

  const syncHandleProgressCards = useMemo((): HandleJobProgressCard[] => {
    const stageSortOrder: Record<string, number> = {
      posts: 0,
      comments: 1,
      media_mirror: 2,
      comment_media_mirror: 3,
      other: 99,
    };
    if (syncRunProgress?.per_handle && syncRunProgress.per_handle.length > 0) {
      const cards = new Map<string, HandleJobProgressCard>();
      for (const entry of syncRunProgress.per_handle) {
        const platform = String(entry.platform || "").trim().toLowerCase() || "unknown";
        const handle = normalizeHandle(entry.account_handle || "unknown");
        const cardId = `${platform}:${handle}`;
        const existing = cards.get(cardId) ?? {
          id: cardId,
          platform,
          platformLabel: PLATFORM_LABELS[platform] ?? platform,
          handle,
          handleLabel: formatHandleLabel(handle),
          runnerLanes: [...syncRuntimeLanes],
          totals: { total: 0, completed: 0, failed: 0, active: 0, running: 0, waiting: 0, scraped: 0, saved: 0 },
          stages: [],
        };
        const stageSnapshot: HandleStageProgressSnapshot = {
          stage: entry.stage,
          total: Number(entry.jobs_total ?? 0),
          completed: Number(entry.jobs_completed ?? 0),
          failed: Number(entry.jobs_failed ?? 0),
          active: Number(entry.jobs_active ?? 0),
          running: Number(entry.jobs_running ?? 0),
          waiting: Number(entry.jobs_waiting ?? 0),
          scraped: Number(entry.scraped_count ?? 0),
          saved: Number(entry.saved_count ?? 0),
        };
        existing.totals.total += stageSnapshot.total;
        existing.totals.completed += stageSnapshot.completed;
        existing.totals.failed += stageSnapshot.failed;
        existing.totals.active += stageSnapshot.active;
        existing.totals.running += stageSnapshot.running;
        existing.totals.waiting += stageSnapshot.waiting;
        existing.totals.scraped += stageSnapshot.scraped;
        existing.totals.saved += stageSnapshot.saved;
        existing.stages.push(stageSnapshot);
        cards.set(cardId, existing);
      }
      return [...cards.values()]
        .map((card) => ({
          ...card,
          stages: [...card.stages].sort((left, right) => {
            const leftOrder = stageSortOrder[left.stage] ?? 50;
            const rightOrder = stageSortOrder[right.stage] ?? 50;
            if (leftOrder !== rightOrder) return leftOrder - rightOrder;
            return left.stage.localeCompare(right.stage);
          }),
        }))
        .sort((left, right) => {
          if (left.platform !== right.platform) return left.platform.localeCompare(right.platform);
          return left.handle.localeCompare(right.handle);
        });
    }

    return [];
  }, [syncRunProgress?.per_handle, syncRuntimeLanes]);

  const syncLogs = useMemo(() => {
    if (syncRunProgress?.recent_log && syncRunProgress.recent_log.length > 0) {
      return syncRunProgress.recent_log
        .slice(0, 20)
        .map((entry) => {
          const line = String(entry.line || "")
            .replace(/ · 0p\/0c/g, "")
            .replace(/ · saved 0p\/0c/g, "")
            .trim();
          return {
            id: entry.id,
            line,
          };
        })
        .filter((entry) => entry.line.length > 0);
    }
    return [];
  }, [syncRunProgress?.recent_log]);

  const displayedTotals = useMemo(() => {
    if (!syncingComments || !syncLiveSummaryTotals) return filteredTotals;
    return {
      posts: Math.max(filteredTotals.posts, syncLiveSummaryTotals.posts),
      total_comments: Math.max(filteredTotals.total_comments, syncLiveSummaryTotals.total_comments),
      total_likes: Math.max(filteredTotals.total_likes, syncLiveSummaryTotals.total_likes),
    };
  }, [filteredTotals, syncLiveSummaryTotals, syncingComments]);

  const syncAccountsByPlatform = useMemo(() => {
    const byPlatform = new Map<string, Set<string>>();
    const perHandleRows = syncRunProgress?.per_handle ?? [];
    for (const row of perHandleRows) {
      const platform = String(row.platform || "").trim().toLowerCase();
      const handle = formatHandleLabel(row.account_handle || "");
      if (!platform || !handle) continue;
      if (!byPlatform.has(platform)) byPlatform.set(platform, new Set<string>());
      byPlatform.get(platform)?.add(handle);
    }
    const chunks = [...byPlatform.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([platform, handles]) => {
        const sortedHandles = [...handles].sort((left, right) => left.localeCompare(right));
        return `${PLATFORM_LABELS[platform] ?? platform}: ${sortedHandles.join(", ")}`;
      });
    return chunks.join(" · ");
  }, [syncRunProgress?.per_handle]);

  const syncWeekDayAccountRows = useMemo(() => {
    const scopedRows = (syncWeekLiveHealth?.day_account_rows ?? []).filter((row) => {
      if (platformFilter !== "all" && row.platform !== platformFilter) return false;
      if (activeDayFilter && row.day !== activeDayFilter) return false;
      return true;
    });
    return [...scopedRows].sort((left, right) => {
      if (left.day !== right.day) return left.day.localeCompare(right.day);
      if (left.platform !== right.platform) return left.platform.localeCompare(right.platform);
      return left.account.localeCompare(right.account);
    });
  }, [activeDayFilter, platformFilter, syncWeekLiveHealth?.day_account_rows]);

  const syncWeekAssetRows = useMemo(() => {
    const order: Record<string, number> = {
      images: 0,
      videos: 1,
      captions: 2,
      profile_pictures: 3,
    };
    return [...(syncWeekLiveHealth?.asset_health ?? [])].sort((left, right) => {
      const leftOrder = order[left.asset] ?? 99;
      const rightOrder = order[right.asset] ?? 99;
      return leftOrder - rightOrder;
    });
  }, [syncWeekLiveHealth?.asset_health]);

  useEffect(() => {
    if (!syncRunId || !syncWeekLiveHealth) return;
    void fetchSyncWeekLiveHealth().catch(() => {
      // Keep historical sync panels resilient when live-health refresh is temporarily unavailable.
    });
  }, [fetchSyncWeekLiveHealth, platformFilter, syncRunId, syncWeekLiveHealth]);

  const syncStepStatus = useMemo(() => {
    const queueStatus = (() => {
      if (!syncRun) {
        return { label: "Queued", toneClass: "bg-gray-100 text-gray-600" };
      }
      if (syncRun.status === "failed") {
        return { label: "Failed", toneClass: "bg-red-100 text-red-700" };
      }
      if (syncRun.status === "cancelled") {
        return { label: "Cancelled", toneClass: "bg-amber-100 text-amber-700" };
      }
      if (TERMINAL_RUN_STATUSES.has(syncRun.status)) {
        return { label: "Done", toneClass: "bg-emerald-100 text-emerald-700" };
      }
      if (syncProgress.running > 0) {
        return { label: "Running", toneClass: "bg-blue-100 text-blue-700" };
      }
      return { label: "Queued", toneClass: "bg-gray-100 text-gray-600" };
    })();
    const stages: Record<string, { label: string; toneClass: string }> = {};
    for (const [stageKey, stage] of Object.entries(syncStageProgress)) {
      stages[stageKey] = getStageStatus(stage);
    }
    return { queue: queueStatus, stages };
  }, [syncProgress.running, syncRun, syncStageProgress]);

  const buildSeasonTabHref = useCallback(
    (tabId: SeasonTabId): string => {
      if (tabId === "overview") {
        return buildSeasonAdminUrl({
          showSlug: showSlugForRouting,
          seasonNumber,
        });
      }
      if (tabId === "social") {
        return buildSeasonAdminUrl({
          showSlug: showSlugForRouting,
          seasonNumber,
          tab: "social",
          socialView: "official",
        });
      }
      return buildSeasonAdminUrl({
        showSlug: showSlugForRouting,
        seasonNumber,
        tab: tabId,
      });
    },
    [seasonNumber, showSlugForRouting],
  );

  const handleSeasonTabSelect = useCallback(
    (tabId: SeasonTabId) => {
      compareAndReplaceGuarded(buildSeasonTabHref(tabId));
    },
    [buildSeasonTabHref, compareAndReplaceGuarded],
  );

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Checking access...
      </div>
    );
  }

  if (slugResolutionError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {slugResolutionError}
        </div>
      </div>
    );
  }

  if (slugResolutionLoading || !showIdForApi) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Resolving show URL...
      </div>
    );
  }

  const activePlatformForRoute = socialPlatform ?? undefined;
  const breadcrumbShowHref = buildShowAdminUrl({ showSlug: showSlugForRouting });
  const breadcrumbSeasonHref = buildSeasonAdminUrl({
    showSlug: showSlugForRouting,
    seasonNumber,
  });
  const breadcrumbSocialHref = buildSeasonAdminUrl({
    showSlug: showSlugForRouting,
    seasonNumber,
    tab: "social",
    socialView: "official",
  });
  const socialHeaderTitle = `${recentShowLabel} · Season ${
    Number.isFinite(seasonNumberInt) ? seasonNumberInt : seasonNumber
  }`;
  const weekLabel = data?.week.label?.trim() || `Week ${weekIndexInt}`;
  const weekDateRangeLabel =
    data?.week?.start && data?.week?.end
      ? `${recentShowLabel} — Season ${Number.isFinite(seasonNumberInt) ? seasonNumberInt : seasonNumber} · ${fmtDate(
          data.week.start,
        )} – ${fmtDate(data.week.end)}`
      : null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <SocialAdminPageHeader
        breadcrumbs={buildSeasonSocialBreadcrumb(recentShowLabel, seasonNumber, {
          showHref: breadcrumbShowHref,
          seasonHref: breadcrumbSeasonHref,
          socialHref: breadcrumbSocialHref,
          subTabLabel: "Official Analytics",
          subTabHref: breadcrumbSocialHref,
        })}
        title={socialHeaderTitle}
        backHref={breadcrumbShowHref}
        backLabel="Back"
        bodyClassName="px-6 py-6"
      />

      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <SeasonTabsNav tabs={SEASON_PAGE_TABS} activeTab="social" onSelect={handleSeasonTabSelect} />
          <nav className="pb-4 flex flex-wrap gap-2" aria-label="Social analytics views">
            {SEASON_SOCIAL_ANALYTICS_VIEWS.map((view) => {
              const isActive = view.id === "bravo";
              const viewHref = buildSeasonAdminUrl({
                showSlug: showSlugForRouting,
                seasonNumber,
                tab: "social",
                socialView: view.id === "bravo" ? "official" : view.id,
              });
              if (isActive) {
                return (
                  <span
                    key={view.id}
                    className="rounded-full border border-zinc-800 bg-zinc-800 px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-white"
                  >
                    {view.label}
                  </span>
                );
              }
              return (
                <Link
                  key={view.id}
                  href={viewHref as Route}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold tracking-[0.08em] text-zinc-700 transition hover:bg-zinc-50"
                >
                  {view.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <h1 className="text-2xl font-bold text-zinc-900">{weekLabel}</h1>
          {weekDateRangeLabel && <p className="mt-1 text-sm text-zinc-600">{weekDateRangeLabel}</p>}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-6">

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center h-40 text-gray-500">
          Loading week detail...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {activeDayFilter && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              <span className="font-semibold">
                Day filter: {toDayFilterLabel(activeDayFilter) ?? activeDayFilter}
              </span>
              <span className="text-xs text-zinc-500">
                Showing posts captured on this local day only.
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextQuery = new URLSearchParams(searchParams.toString());
                  nextQuery.delete("day");
                  const nextRoute = buildSeasonSocialWeekUrl({
                    showSlug: showSlugForRouting,
                    seasonNumber,
                    weekIndex: weekIndexInt,
                    platform: activePlatformForRoute,
                    query: nextQuery,
                  });
                  compareAndReplaceGuarded(nextRoute);
                }}
                className="ml-auto rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Clear day filter
              </button>
            </div>
          )}

          {/* Platform filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PLATFORM_FILTERS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setPlatformFilter(tab.key);
                }}
                disabled={isRefreshingGallery || isLoadingMore || loading}
                aria-pressed={platformFilter === tab.key}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  platformFilter === tab.key
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
                <span className="ml-1 text-xs opacity-70">
                  (
                  {tab.key === "all"
                    ? allTabTotalPosts
                    : tabTotals[tab.key]}
                  )
                </span>
              </button>
            ))}
          </div>

          {/* Sort & search controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Sort field */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="sort-field" className="text-xs font-medium text-gray-500">
                Sort by
              </label>
              <select
                id="sort-field"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                disabled={isRefreshingGallery || isLoadingMore || loading}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort direction toggle */}
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              disabled={isRefreshingGallery || isLoadingMore || loading}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              title={sortDir === "desc" ? "Highest first" : "Lowest first"}
            >
              {sortDir === "desc" ? "↓ High to Low" : "↑ Low to High"}
            </button>

            {/* Text search */}
            <div className="flex-1 min-w-[180px]">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              data-testid="week-sync-button"
              onClick={() => {
                void syncAllCommentsForWeek();
              }}
              disabled={syncingComments}
              className="text-sm rounded-md px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncButtonLabel}
            </button>

            {/* Result count */}
            <span className="text-xs text-gray-500">
              {allPosts.length} {allPosts.length === 1 ? "post" : "posts"}
            </span>
          </div>

          {(syncMessage || syncError) && (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                syncError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {syncError ?? syncMessage}
            </div>
          )}

          {syncResumeBanner && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              {syncResumeBanner}
            </div>
          )}

          {!syncingComments && manualAttachRuns.length > 0 && (
            <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              <p className="font-medium text-zinc-800">Manual attach available</p>
              <p className="mt-1 text-xs text-zinc-600">
                Active runs from other tabs are listed here. Auto-resume is restricted to this tab only.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={selectedManualAttachRunId}
                  onChange={(event) => setSelectedManualAttachRunId(event.target.value)}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800"
                >
                  {manualAttachRuns.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.id.slice(0, 8)} · {formatRunStatus(run.status)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    void handleManualAttachRun();
                  }}
                  disabled={!selectedManualAttachRunId}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Attach to selected run
                </button>
              </div>
            </div>
          )}

          {(syncRun || syncingComments) && (
            <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Sync Progress</h3>
                  <p className="text-xs text-gray-500">
                    {syncRunId
                      ? `Run ${syncRunId.slice(0, 8)} · ${
                          syncRun ? formatRunStatus(syncRun.status) : syncingComments ? "Running" : "Unknown"
                        }`
                      : "Preparing run"}
                    {syncElapsedDisplay && syncingComments && (
                      <span className="ml-2 tabular-nums text-gray-400">{syncElapsedDisplay}</span>
                    )}
                  </p>
                  {syncWorkerHealth && (
                    <p className="mt-1 text-xs text-gray-500">
                      Workers:{" "}
                      {syncWorkerHealth.queue_enabled
                        ? `${syncWorkerHealth.healthy_workers ?? 0} healthy${syncWorkerHealth.reason ? ` (${syncWorkerHealth.reason})` : ""}`
                        : "queue disabled (inline fallback active; long comment scans may look idle before new comments are found)"}
                    </p>
                  )}
                  {syncAccountsByPlatform && (
                    <p className="mt-1 text-xs text-gray-500">Accounts: {syncAccountsByPlatform}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {syncRun && ACTIVE_RUN_STATUSES.has(syncRun.status) && (
                    <button type="button"
                      onClick={() => void handleCancelSync()}
                      className="rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                      Cancel Sync
                    </button>
                  )}
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900 tabular-nums">{syncProgress.pct}%</div>
                    <div className="text-xs text-gray-500 tabular-nums">
                      {syncProgress.finished}/{syncProgress.total || "?"} jobs · {fmtNum(syncProgress.items)} scraped
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    syncRun?.status === "failed"
                      ? "bg-red-500"
                      : syncRun?.status === "cancelled"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.max(2, syncProgress.pct)}%` }}
                />
              </div>

              <div className={`mt-3 grid gap-2 ${syncStageEntries.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-gray-700">Step 1: Queue + Start</div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${syncStepStatus.queue.toneClass}`}>
                      {syncStepStatus.queue.label}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-600">
                    {syncRun
                      ? `${formatRunStatus(syncRun.status)}${syncProgress.running > 0 ? ` · ${syncProgress.running} running` : ""}${syncProgress.waiting > 0 ? ` · ${syncProgress.waiting} queued` : ""}`
                      : "Queued"}
                  </div>
                </div>
                {syncStageEntries.map(([stageKey, stage], stageIndex) => (
                  <div key={`sync-stage-${stageKey}`} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gray-700">Step {stageIndex + 2}: {formatSyncStageLabel(stageKey)} Stage</div>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${syncStepStatus.stages[stageKey]?.toneClass ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {syncStepStatus.stages[stageKey]?.label ?? "Queued"}
                      </span>
                    </div>
                    <div className="mt-1 text-gray-700 tabular-nums">
                      {fmtNum(stage.scraped)} scraped · {fmtNum(stage.saved)} saved
                    </div>
                    <div className="mt-0.5 text-gray-500 tabular-nums">
                      {stage.completed + stage.failed}/{stage.total || "?"} jobs
                      {stage.running > 0 ? ` · ${stage.running} running` : ""}
                      {stage.waiting > 0 ? ` · ${stage.waiting} queued` : ""}
                      {stage.failed > 0 ? ` · ${stage.failed} failed` : ""}
                    </div>
                  </div>
                ))}
              </div>

              {syncMirrorCoveragePreview && (
                <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  Mirror Coverage:{" "}
                  {formatMirrorCoverageLabel(
                    Math.max(
                      0,
                      Number(syncMirrorCoveragePreview.posts_scanned ?? 0) -
                        Number(syncMirrorCoveragePreview.needs_mirror_count ?? 0),
                    ),
                    Number(syncMirrorCoveragePreview.posts_scanned ?? 0),
                  )}
                  {` · pending ${fmtNum(Number(syncMirrorCoveragePreview.pending_count ?? 0))}`}
                  {` · failed ${fmtNum(Number(syncMirrorCoveragePreview.failed_count ?? 0))}`}
                  {` · partial ${fmtNum(Number(syncMirrorCoveragePreview.partial_count ?? 0))}`}
                </div>
              )}

              {syncPollError && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <span>Polling stopped: {syncPollError}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSyncPollError(null);
                      syncPollFailureCountRef.current = 0;
                      missingRunConsecutiveCountRef.current = 0;
                      terminalCoverageFailureCountRef.current = 0;
                      if (syncRunId) {
                        void fetchSyncProgress(syncRunId).catch(() => {});
                      }
                    }}
                    className="rounded border border-red-300 bg-white px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Retry
                  </button>
                </div>
              )}
              {syncingComments && syncLastSuccessAt && (
                <p className="mt-1 text-xs text-gray-500">
                  Last successful progress refresh: {fmtDateTime(syncLastSuccessAt.toISOString())}
                </p>
              )}

              {syncLogs.length > 0 && (
                <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                  <button
                    type="button"
                    onClick={() => setSyncLogsExpanded((current) => !current)}
                    className="flex w-full items-center justify-between text-left text-xs font-medium text-gray-700"
                  >
                    <span>Recent Run Log</span>
                    <span className="text-[11px] text-gray-500">
                      {syncLogsExpanded ? "Collapse" : `Show ${syncLogs.length}`}
                    </span>
                  </button>
                  {syncLogsExpanded && (
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {syncLogs.map((entry) => (
                        <p key={entry.id} className="text-xs text-gray-600">
                          {entry.line}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {syncingComments && (
            <div className="mb-5 space-y-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-900">Day View</h3>
                <p className="text-xs text-gray-500">Live by day and account (posts, comments, likes)</p>
                {syncWeekDayAccountRows.length === 0 ? (
                  <p className="mt-3 text-xs text-gray-500">Waiting for day/account telemetry...</p>
                ) : (
                  <div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-gray-200">
                    <table className="w-full text-left text-[11px]">
                      <thead className="sticky top-0 bg-gray-50 text-gray-500">
                        <tr>
                          <th className="px-2 py-1.5 font-medium">Day</th>
                          <th className="px-2 py-1.5 font-medium">Platform</th>
                          <th className="px-2 py-1.5 font-medium">Account</th>
                          <th className="px-2 py-1.5 text-right font-medium">Posts</th>
                          <th className="px-2 py-1.5 text-right font-medium">Comments</th>
                          <th className="px-2 py-1.5 text-right font-medium">Likes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncWeekDayAccountRows.map((row, index) => (
                          <tr key={`${row.day}-${row.platform}-${row.account}-${index}`} className="border-t border-gray-100">
                            <td className="px-2 py-1.5 tabular-nums text-gray-700">{row.day}</td>
                            <td className="px-2 py-1.5 text-gray-700">{PLATFORM_LABELS[row.platform] ?? row.platform}</td>
                            <td className="px-2 py-1.5 text-gray-700">{formatHandleLabel(row.account)}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">{fmtNum(row.posts)}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">{fmtNum(row.comments)}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-gray-700">{fmtNum(row.likes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-900">Asset Health</h3>
                <p className="text-xs text-gray-500">Scraped vs saved media and metadata</p>
                {syncWeekAssetRows.length === 0 ? (
                  <p className="mt-3 text-xs text-gray-500">Waiting for asset telemetry...</p>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {syncWeekAssetRows.map((row) => (
                      <div key={row.asset} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                        <p className="font-medium text-gray-700">{formatSyncStageLabel(row.asset)}</p>
                        <p className="mt-1 tabular-nums text-gray-600">{fmtNum(row.scraped)} scraped</p>
                        <p className="tabular-nums text-gray-600">{fmtNum(row.saved)} saved</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Per-Handle Job Progress</h3>
                  <p className="text-xs text-gray-500">
                    {syncScheduleModeLabel} · lanes {syncRuntimeLanes.join(", ")} · {fmtNum(syncActiveWorkersNow)} workers currently running jobs
                  </p>
                </div>
              </div>
              {syncHandleProgressCards.length === 0 ? (
                <p className="mt-3 text-xs text-gray-500">
                  Waiting for platform/handle jobs to report progress...
                </p>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {syncHandleProgressCards.map((card) => (
                    <div key={card.id} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            PLATFORM_COLORS[card.platform] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {card.platformLabel}
                        </span>
                        <span className="text-xs font-semibold text-gray-900">{card.handleLabel}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Runner lanes: {card.runnerLanes.length > 0 ? card.runnerLanes.join(", ") : "Pending"}
                      </p>
                      <p className="mt-1 text-[11px] tabular-nums text-gray-600">
                        {card.totals.completed + card.totals.failed}/{card.totals.total || "?"} complete
                        {card.totals.running > 0 ? ` · ${card.totals.running} running` : ""}
                        {card.totals.waiting > 0 ? ` · ${card.totals.waiting} queued` : ""}
                        {` · ${fmtNum(card.totals.scraped)} scraped`}
                        {card.totals.saved > 0 ? ` · ${fmtNum(card.totals.saved)} saved` : ""}
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {card.stages.map((stage) => (
                          <div key={`${card.id}-${stage.stage}`} className="rounded border border-gray-200 bg-white px-2 py-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-medium text-gray-700">
                                {formatSyncStageLabel(stage.stage)}
                              </span>
                              <span className="text-[11px] tabular-nums text-gray-500">
                                {stage.completed + stage.failed}/{stage.total || "?"}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] tabular-nums text-gray-500">
                              {stage.running > 0 ? `${stage.running} running · ` : ""}
                              {stage.waiting > 0 ? `${stage.waiting} queued · ` : ""}
                              {fmtNum(stage.scraped)} scraped
                              {stage.saved > 0 ? ` · ${fmtNum(stage.saved)} saved` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          )}

          {/* Summary bar - Row 1: Numeric metrics (platform-specific) */}
          {visiblePlatformStatuses.length > 0 && (
            <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visiblePlatformStatuses.map(({ platform, status, postCount }) => (
                <div key={`platform-status-${platform}`} className="rounded-lg border border-gray-200 bg-white p-4">
                  {(() => {
                    const syncInFlight = hasPlatformSyncInFlight(status);
                    return (
                      <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900">{PLATFORM_LABELS[platform] ?? platform}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getPlatformSyncTone(status.sync_status, Boolean(status.stale), postCount)}`}>
                      {formatPlatformSyncStatus(status.sync_status, postCount)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">{formatPlatformStatusSummary(status, postCount)}</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {postCount <= 0 && !syncInFlight
                      ? ["partial", "failed"].includes(String(status.sync_status ?? "").trim().toLowerCase())
                        ? "Prior refresh attempts exist for the selected week"
                        : "No post refresh activity in selected week"
                      : postCount <= 0
                        ? "Sync in progress for selected week"
                      : status.last_refresh_at
                        ? `Last refresh ${fmtDateTime(status.last_refresh_at)}`
                        : "No refresh timestamp"}
                  </p>
                  {formatActiveJobSummary(status.active_job_summary) && (
                    <p className="mt-1 text-[11px] text-gray-600">{formatActiveJobSummary(status.active_job_summary)}</p>
                  )}
                  {(postCount > 0 || syncInFlight) && (status.last_refresh_reason || status.worker_run_id) && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      {status.last_refresh_reason ? `Reason: ${status.last_refresh_reason}` : "Reason: n/a"}
                      {status.worker_run_id ? ` · Run ${status.worker_run_id.slice(0, 8)}` : ""}
                    </p>
                  )}
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
          <div className={SUMMARY_ROW1_GRID[platformFilter]}>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center" data-testid="week-summary-posts">
              <div className="text-2xl font-bold text-gray-900">
                {fmtNum(displayedTotals.posts)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Posts</div>
            </div>
            {PLATFORM_SUMMARY_CONFIG[platformFilter].metrics.map((metric) => (
              <div key={metric.key} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {fmtNum(displayedPlatformMetrics[metric.key] ?? 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">{metric.label}</div>
              </div>
            ))}
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{commentsSavedPct.toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">of Comments Saved</div>
              <div className="text-xs text-gray-500 mt-1">
                {formatSavedVsActualComments(displayedCommentCoverage.saved, displayedCommentCoverage.actual)}
                {displayedCommentCoverage.incomplete ? "*" : ""} Comments (Saved/Actual)
              </div>
            </div>
          </div>
          {/* Summary bar - Row 2: Token lists (platform-filtered) */}
          {PLATFORM_SUMMARY_CONFIG[platformFilter].tokens.length > 0 && (
            <div className={SUMMARY_ROW2_GRID[platformFilter]}>
              {PLATFORM_SUMMARY_CONFIG[platformFilter].tokens.map((tokenConfig) => {
                const values = uniquePostTokenSummary[tokenConfig.key];
                return (
                  <button
                    key={tokenConfig.key}
                    type="button"
                    data-testid={`summary-token-${tokenConfig.key}`}
                    onClick={() =>
                      setTokenSummaryModal({
                        key: tokenConfig.key,
                        label: tokenConfig.label,
                        values,
                      })
                    }
                    className="bg-white border border-gray-200 rounded-lg p-3 text-center transition-colors hover:border-gray-300"
                  >
                    <div className="text-xl font-bold text-gray-900">{fmtNum(values.length)}</div>
                    <div className="mt-1 text-xs text-gray-500">{tokenConfig.label}</div>
                    <div className="mt-1 text-[11px] text-blue-600">{values.length > 0 ? "View list" : "No items"}</div>
                  </button>
                );
              })}
            </div>
          )}
          {displayedCommentCoverage.incomplete && (
            <p className="mb-5 -mt-3 text-xs text-gray-500">
              * Not all platform-reported comments are saved in Supabase yet.
            </p>
          )}
          {isRefreshingGallery && (
            <p className="mb-4 -mt-2 text-xs text-gray-500" role="status" aria-live="polite">
              Refreshing gallery for {activeSortLabel} ({sortDir === "desc" ? "high to low" : "low to high"})...
            </p>
          )}

          {/* Post cards */}
          {allPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              {activeDayFilter ? "No posts found for this day." : "No posts found for this week."}
            </div>
          ) : (
          <div data-testid="week-post-gallery" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {allPosts.map(({ platform, post }) => (
                <PostCard
                  key={`${platform}-${post.source_id}`}
                  platform={platform}
                  post={post}
                  showId={showIdForApi}
                  seasonNumber={seasonNumber}
                  seasonId={resolvedSeasonId}
                  onOpenMediaLightbox={openPostMediaLightbox}
                />
              ))}
            </div>
          )}
          {(loadMoreError || (displayedPagination && !displayedPagination.has_more)) && (
            <div className="mt-4 text-sm">
              {loadMoreError && <p className="text-red-600 text-center">{loadMoreError}</p>}
              {!loadMoreError &&
                displayedPagination &&
                !displayedPagination.has_more &&
                displayedPagination.total > 0 &&
                allPosts.length > 0 && (
                  <p className="text-gray-500 text-center">
                    All loaded: {allPosts.length}/{displayedPagination.total} posts
                  </p>
                )}
            </div>
          )}
          {hasMorePosts && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleLoadMorePosts}
                disabled={isLoadingMore || loading || isRefreshingGallery}
                className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? "Loading more posts..." : isRefreshingGallery ? "Refreshing gallery..." : "Load more posts"}
              </button>
            </div>
          )}
        </>
      )}
      </main>

      {tokenSummaryModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6" data-testid="summary-token-modal">
          <div className="absolute inset-0 bg-black/55" onClick={() => setTokenSummaryModal(null)} />
          <div className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-2xl">
            <div className="relative border-b border-zinc-200 px-5 py-4">
              <h3
                className="text-center text-[36px] leading-none text-zinc-900"
                style={{ fontFamily: "var(--font-gloucester)" }}
              >
                {tokenSummaryModal.label}
              </h3>
              <button
                type="button"
                onClick={() => setTokenSummaryModal(null)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-800 hover:text-black text-[40px] leading-none"
                aria-label="Close token summary list"
              >
                ×
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {tokenSummaryModal.values.length === 0 ? (
                <p className="px-5 py-5 text-sm text-zinc-500">
                  No {tokenSummaryModal.label.toLowerCase()} found for the current filters.
                </p>
              ) : isHandleTokenKey(tokenSummaryModal.key) ? (
                <div className="divide-y divide-zinc-200">
                  {tokenModalRows.map((row) => (
                    <div key={row.key} className="flex items-center gap-3 px-5 py-3">
                      {row.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.avatarUrl}
                          alt={`${row.handleLabel} avatar`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-11 w-11 shrink-0 rounded-full border border-zinc-200 object-cover"
                        />
                      ) : (
                        <span
                          aria-label={`${row.handleLabel} avatar`}
                          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-sm font-semibold uppercase ${fallbackAvatarToneClass(row.handle)}`}
                        >
                          {initialsFromHandle(row.handle)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p
                            className="truncate text-[25px] leading-tight text-zinc-900"
                            style={{ fontFamily: "var(--font-gloucester)", fontWeight: 400 }}
                          >
                            {row.handleLabel}
                          </p>
                          {row.isVerified && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={VERIFIED_BADGE_URL_BY_PLATFORM.instagram}
                              alt={`${row.handleLabel} verified badge`}
                              className="h-3.5 w-3.5 rounded-full"
                            />
                          )}
                        </div>
                        <p
                          className="truncate text-black"
                          style={{
                            width: "fit-content",
                            minHeight: "18px",
                            fontFamily: "var(--font-plymouth-serial)",
                            fontStyle: "normal",
                            fontWeight: 700,
                            fontSize: "14px",
                            lineHeight: "18px",
                            display: "flex",
                            alignItems: "center",
                          }}
                          data-testid={`token-modal-name-${row.handle}`}
                        >
                          {row.displayName ?? ""}
                        </p>
                      </div>
                      <a
                        href={row.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 min-w-[58px] items-center justify-center rounded-xl bg-zinc-100 px-4 text-zinc-900 transition-colors hover:bg-zinc-200"
                        style={{ fontFamily: "var(--font-gloucester)", fontWeight: 400, fontSize: "16px", lineHeight: "1" }}
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-4">
                  {tokenSummaryModal.values.map((value) => (
                    <span key={value} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                      {value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mediaLightbox && mediaLightbox.entries[mediaLightbox.index] && (
        <ImageLightbox
          src={mediaLightbox.entries[mediaLightbox.index].src}
          alt={mediaLightbox.entries[mediaLightbox.index].alt}
          mediaType={mediaLightbox.entries[mediaLightbox.index].mediaType}
          videoPosterSrc={mediaLightbox.entries[mediaLightbox.index].posterSrc}
          isOpen={true}
          onClose={closeMediaLightbox}
          metadata={mediaLightbox.entries[mediaLightbox.index].metadata}
          metadataExtras={<SocialStatsPanel stats={mediaLightbox.entries[mediaLightbox.index].stats} />}
          position={{
            current: mediaLightbox.index + 1,
            total: mediaLightbox.entries.length,
          }}
          onPrevious={() => navigateMediaLightbox("prev")}
          onNext={() => navigateMediaLightbox("next")}
          hasPrevious={mediaLightbox.index > 0}
          hasNext={mediaLightbox.index < mediaLightbox.entries.length - 1}
        />
      )}
    </div>
  );
}
