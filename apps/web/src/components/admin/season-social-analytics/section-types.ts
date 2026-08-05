import type { DisplayThumbnailVariants } from "@/components/admin/social-week/social-media-thumbnails";
import type { PhotoMetadata } from "@/lib/photo-metadata";

export type { DisplayThumbnailVariants } from "@/components/admin/social-week/social-media-thumbnails";

export type Platform = "instagram" | "tiktok" | "twitter" | "youtube" | "facebook" | "threads";
export type PlatformTab = "overview" | Platform;
export type Scope = "network" | "creator" | "community" | "news";
export type SyncStrategy = "incremental" | "full_refresh";
export type WeeklyMetric = "posts" | "comments" | "completeness";
export type BenchmarkCompareMode = "previous" | "trailing";
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
export type WeeklyPlatformRow = NonNullable<AnalyticsResponse["weekly_platform_posts"]>[number];

export type SocialJob = {
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

export type SocialRun = {
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

export type SocialRunSummary = {
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

export type SeasonSocialAnalyticsSnapshot = {
  analytics?: AnalyticsResponse | null;
  targets?: SocialTarget[];
  runs?: SocialRun[];
  run_summaries?: SocialRunSummary[];
  worker_health?: Record<string, unknown> | null;
  shared_status?: SharedSeasonStatus | null;
  jobs?: SocialJob[];
  generated_at?: string | null;
  cache_age_ms?: number;
  stale?: boolean;
};

export type SocialTarget = {
  platform: string;
  accounts?: string[];
  hashtags?: string[];
  keywords?: string[];
  timezone?: string;
  is_active?: boolean;
  config?: Record<string, unknown>;
};

export type LinkedAccountProfileSummary = {
  avatar_url?: string | null;
  profile_url?: string | null;
};

export type WorkerHealthPayload = {
  queue_enabled?: boolean;
  healthy?: boolean;
  healthy_workers?: number;
  reason?: string | null;
  checked_at?: string | null;
};

export type WorkerHealthState = {
  queueEnabled: boolean | null;
  healthy: boolean | null;
  healthyWorkers: number | null;
  reason: string | null;
  checkedAt: string | null;
};

export type StaleRunState = {
  runId: string;
  ingestMode: string;
  ageMinutes: number;
  pendingJobs: number;
  retryingJobs: number;
};

export type AnalyticsResponse = {
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
      display_thumbnail_url?: string | null;
      display_thumbnail_variants?: DisplayThumbnailVariants;
      display_thumbnail_status?: string | Record<string, unknown> | null;
      display_thumbnail_srcset?: string | null;
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
      display_thumbnail_url?: string | null;
      display_thumbnail_variants?: DisplayThumbnailVariants;
      display_thumbnail_status?: string | Record<string, unknown> | null;
      display_thumbnail_srcset?: string | null;
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

export type IngestProxyErrorPayload = {
  error?: string;
  detail?: string;
  code?: string;
  retryable?: boolean;
  retry_after_seconds?: number;
  upstream_status?: number;
  upstream_detail?: unknown;
  upstream_detail_code?: string;
};

export type SyncStatusPayload = {
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

export type SharedPipelineStageStatus = {
  status?: "idle" | "queued" | "running" | "partial" | "complete" | "failed";
  job_count?: number;
  active_jobs?: number;
  completed_jobs?: number;
  failed_jobs?: number;
};

export type SharedSeasonStatus = {
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

export type CommentsCoverageResponse = {
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

export type MirrorCoverageResponse = {
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

export type CommentRefreshPolicy = "balanced" | "missing_only";
export type IngestMode = "posts_only" | "posts_and_comments" | "comments_only" | "details_refresh";

export type WeekDetailPost = {
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

export type WeekDetailResponse = {
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

export type HashtagUsageByPlatform = Record<Platform, number>;
export type HashtagTagCountsByPlatform = Record<Platform, Record<string, number>>;

export type WeekDetailHashtagUsage = {
  totalTokens: number;
  uniqueTokens: number;
  tagCounts: Record<string, number>;
  byPlatform: HashtagUsageByPlatform;
  tagCountsByPlatform: HashtagTagCountsByPlatform;
};

export type MissingCommentTargets = {
  platforms: Platform[];
  sourceIdsByPlatform: Partial<Record<Platform, string[]>>;
  staleAnchorsCount: number;
  overflowPlatforms: Platform[];
};

export type SocialMediaType = "image" | "video";

export type SocialStatsItem = {
  label: string;
  value: string;
};

export type SocialLeaderboardLightboxEntry = {
  id: string;
  src: string;
  mediaType: SocialMediaType;
  posterSrc: string | null;
  alt: string;
  metadata: PhotoMetadata;
  stats: SocialStatsItem[];
};

export interface SeasonSocialAnalyticsSectionProps {
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

export type SocialTableMetric = "posts" | "likes" | "comments" | "hashtags" | "mentions" | "tags" | "collaborators";
export type SocialMetricMode = "total" | "saved";
export type WeekDetailTokenTriplet = {
  hashtags: number;
  mentions: number;
  tags: number;
  collaborators: number;
};
export type WeekDetailTokenCounts = {
  total: WeekDetailTokenTriplet;
  byPlatform: Record<Platform, WeekDetailTokenTriplet>;
};

export type SocialDensity = "compact" | "comfortable";

export type SeasonWindowDraft = {
  trailerDropAt: string;
  postseasonEndAt: string;
};

export type SeasonWindowRow = {
  week_index: number;
  label: string;
  start: string;
  end: string;
  week_type?: "preseason" | "episode" | "bye" | "postseason";
  episode_number?: number | null;
};

export type CoverageSummary = {
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

export type SocialSectionCacheSnapshot = {
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

export type CastAttitudePrototypeRow = {
  entity: string;
  mentions: number;
  engagement: number;
  positive: number;
  neutral: number;
  negative: number;
  netSentiment: number;
};

export type ViewerAttitudePlatformRow = {
  platform: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
};
