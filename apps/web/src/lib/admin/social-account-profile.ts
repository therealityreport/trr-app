import type { SocialAccountProfileTab, SocialPlatformSlug } from "@/lib/admin/show-admin-routes";

export type { SocialAccountProfileTab, SocialPlatformSlug } from "@/lib/admin/show-admin-routes";

export type SocialDisplayThumbnailVariant =
  | string
  | null
  | {
      url?: string | null;
      width?: number | null;
      height?: number | null;
      format?: string | null;
      content_type?: string | null;
      descriptor?: string | null;
      variant_key?: string | null;
      storage_key?: string | null;
      source_role?: string | null;
      bytes?: number | null;
      generated_at?: string | null;
    };

export type SocialDisplayThumbnailVariants = Record<string, SocialDisplayThumbnailVariant> | null;

export const SOCIAL_ACCOUNT_PROFILE_PLATFORMS: ReadonlyArray<SocialPlatformSlug> = [
  "instagram",
  "tiktok",
  "twitter",
  "youtube",
  "facebook",
  "threads",
];

export const SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS: ReadonlyArray<SocialPlatformSlug> = [
  "instagram",
  "tiktok",
  "twitter",
  "youtube",
];

export const SOCIAL_ACCOUNT_CATALOG_DETAIL_ENABLED_PLATFORMS: ReadonlyArray<SocialPlatformSlug> = [
  "instagram",
  "tiktok",
  "twitter",
  "youtube",
];

export const SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS: ReadonlyArray<SocialPlatformSlug> = [
  "instagram",
  "tiktok",
  "twitter",
  "youtube",
  "facebook",
  "threads",
];

export const SOCIAL_ACCOUNT_SOCIALBLADE_ENABLED_PLATFORMS: ReadonlyArray<SocialPlatformSlug> = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
];

export type SocialBladeProfileStatsLabels = Partial<{
  followers: string;
  following: string;
  media_count: string;
  engagement_rate: string;
  average_likes: string;
  average_comments: string;
  chart_metric_label: string;
}>;

export type SocialAccountProfileSummaryDetail = "lite" | "distribution" | "full";

export type SocialAccountDashboardFreshnessStatus = "fresh" | "stale" | "missing" | "error";
export type SocialAccountDashboardFreshnessSource = "live" | "cache" | "materialized";

export type SocialAccountDashboardFreshness = {
  status: SocialAccountDashboardFreshnessStatus;
  generated_at: string | null;
  age_seconds: number | null;
  source: SocialAccountDashboardFreshnessSource;
};

export type SocialAccountProfileSummary = {
  summary_detail?: SocialAccountProfileSummaryDetail | null;
  platform: SocialPlatformSlug;
  account_handle: string;
  network_name?: string | null;
  profile_url?: string | null;
  avatar_url?: string | null;
  display_name?: string | null;
  bio?: string | null;
  is_verified?: boolean | null;
  follower_count?: number | null;
  following_count?: number | null;
  live_total_posts?: number | null;
  total_posts: number;
  total_engagement: number;
  total_views: number;
  first_post_at?: string | null;
  last_post_at?: string | null;
  catalog_total_posts?: number;
  catalog_assigned_posts?: number;
  catalog_unassigned_posts?: number;
  catalog_pending_review_posts?: number;
  catalog_first_post_at?: string | null;
  catalog_last_post_at?: string | null;
  live_catalog_total_posts?: number;
  live_catalog_total_engagement?: number;
  live_catalog_total_views?: number;
  live_catalog_first_post_at?: string | null;
  live_catalog_last_post_at?: string | null;
  live_catalog_caption_rows?: number;
  live_catalog_hashtag_instances?: number;
  live_catalog_unique_hashtags?: number;
  last_catalog_run_at?: string | null;
  last_catalog_run_status?: string | null;
  catalog_recent_runs?: SocialAccountCatalogRun[];
  comments_saved_summary?: SocialAccountCommentsSavedSummary | null;
  comments_coverage?: SocialAccountCommentsCoverage | null;
  media_coverage?: SocialAccountMediaCoverage | null;
  per_show_counts: SocialAccountProfileShowBucket[];
  per_season_counts: SocialAccountProfileSeasonBucket[];
  top_hashtags: SocialAccountProfileHashtag[];
  top_collaborators: SocialAccountProfileCollaboratorTagAggregate[];
  top_tags: SocialAccountProfileCollaboratorTagAggregate[];
  source_status: Array<Record<string, unknown>>;
};

export type SocialBladeGrowthData = {
  username: string;
  account_handle?: string | null;
  platform: SocialPlatformSlug;
  scraped_at: string;
  freshness_status?: "fresh" | "stale" | "missing" | "unknown";
  is_stale?: boolean;
  age_hours?: number | null;
  refresh_status?: "refreshed" | "skipped";
  refresh_skipped_reason?: string;
  stats_refreshed?: boolean;
  history_source?: string | null;
  chart_metric_label?: string | null;
  socialblade_url?: string | null;
  instagram_following_scrape?: {
    enabled?: boolean;
    status?: "completed" | "failed" | "skipped";
    reason?: string;
    error?: string;
    stage?: string;
    platform?: string;
    handle?: string;
    source?: string;
    relationship_type?: "following";
    relationships_fetched?: number | null;
    relationships_upserted?: number | null;
    relationship_mismatches?: Array<Record<string, unknown>>;
    retrieval_meta?: Record<string, unknown>;
  } | null;
  profile_stats_labels?: SocialBladeProfileStatsLabels;
  previous_run?: {
    scraped_at?: string | null;
    profile_stats: {
      followers: number;
      following: number;
      media_count: number;
      engagement_rate: string;
      average_likes: number;
      average_comments: number;
    };
    rankings?: {
      sb_rank?: string;
      followers_rank?: string;
      engagement_rate_rank?: string;
      grade?: string;
    };
    profile_stats_labels?: SocialBladeProfileStatsLabels;
  } | null;
  profile_stats: {
    followers: number;
    following: number;
    media_count: number;
    engagement_rate: string;
    average_likes: number;
    average_comments: number;
  };
  rankings: {
    sb_rank: string;
    followers_rank: string;
    engagement_rate_rank: string;
    grade: string;
  };
  daily_channel_metrics_60day: {
    period: string;
    row_count: number;
    headers: string[];
    data: Array<Record<string, string>>;
  };
  daily_total_followers_chart: {
    frequency: string;
    metric: string;
    total_data_points: number;
    date_range: { from: string; to: string };
    data: Array<{ date: string; followers: number }>;
  } | null;
};

export type SocialAccountProfileShowBucket = {
  show_id?: string | null;
  show_name?: string | null;
  show_slug?: string | null;
  post_count?: number | null;
  engagement?: number | null;
};

export type SocialAccountProfileSeasonBucket = {
  season_id?: string | null;
  season_number?: number | null;
  show_id?: string | null;
  show_name?: string | null;
  show_slug?: string | null;
  post_count?: number | null;
  engagement?: number | null;
};

export type SocialAccountFacebookCrosspost = {
  comments_count?: number | null;
  likes_count?: number | null;
  is_shared_to_fb?: boolean | null;
  post_id?: string | null;
  post_url?: string | null;
  metadata?: Record<string, unknown> | null;
  social_context?: Record<string, unknown> | null;
  observed_at?: string | null;
  source?: string | null;
};

export type SocialAccountCommentCaptureHealth = {
  capture_rate?: number | null;
  phase_counts?: Record<string, number | null | undefined> | null;
  cursor_param_counts?: Record<string, number | null | undefined> | null;
  covered_comments?: number | null;
  status_counts?: Record<string, number | null | undefined> | null;
  observed_at?: string | null;
};

export type SocialAccountCommentCaptureRateTrendPoint = {
  run_id?: string | null;
  observed_at?: string | null;
  reported_comments?: number | null;
  fetched_comments?: number | null;
  capture_rate?: number | null;
};

export type SocialAccountCommentBreakdown = {
  reported_comments?: number | null;
  saved_parent_comments?: number | null;
  saved_child_replies?: number | null;
  facebook_comments?: number | null;
  saved_instagram_comments?: number | null;
  accounted_comments?: number | null;
  missing_comments?: number | null;
  missing_reasons?: Record<string, number | null | undefined> | null;
  formula_label?: string | null;
  capture_health?: SocialAccountCommentCaptureHealth | null;
  capture_rate_trend?: SocialAccountCommentCaptureRateTrendPoint[] | null;
};

export type SocialAccountLegacyCommentCompleteness = {
  reported_comments?: number | null;
  external_facebook_comments?: number | null;
  instagram_fetchable_comments?: number | null;
  saved_instagram_comments?: number | null;
  missing_instagram_comments?: number | null;
};

export type SocialAccountProfilePost = {
  id: string;
  source_id: string;
  platform: SocialPlatformSlug;
  account_handle: string;
  title?: string | null;
  content?: string | null;
  excerpt?: string | null;
  url?: string | null;
  profile_url?: string | null;
  posted_at?: string | null;
  show_id?: string | null;
  show_name?: string | null;
  show_slug?: string | null;
  season_id?: string | null;
  season_number?: number | null;
  hashtags?: string[];
  mentions?: string[];
  collaborators?: string[];
  tags?: string[];
  thumbnail_url?: string | null;
  source_thumbnail_url?: string | null;
  hosted_thumbnail_url?: string | null;
  display_thumbnail_url?: string | null;
  display_thumbnail_variants?: SocialDisplayThumbnailVariants;
  display_thumbnail_status?: string | Record<string, unknown> | null;
  display_thumbnail_srcset?: string | null;
  media_urls?: string[] | null;
  source_media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  post_format?: string | null;
  match_mode?: "owner" | "collaborator";
  source_surface?: "materialized" | "catalog";
  saved_comments?: number | null;
  facebook_crosspost?: SocialAccountFacebookCrosspost | null;
  comment_completeness?: SocialAccountLegacyCommentCompleteness | null;
  comment_breakdown?: SocialAccountCommentBreakdown | null;
  metrics: {
    likes?: number | null;
    comments_count?: number | null;
    views?: number | null;
    video_views?: number | null;
    shares?: number | null;
    reposts?: number | null;
    saves?: number | null;
    retweets?: number | null;
    replies_count?: number | null;
    quotes?: number | null;
    engagement?: number | null;
  };
};

export type SocialAccountProfilePagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type SocialAccountProfilePostsSortMetadata = {
  sort_by?: string | null;
  sort_dir?: string | null;
  rollup_table?: string | null;
  rollup_available?: boolean | null;
  mode?: string | null;
  exact?: boolean | null;
  candidate_limit?: number | null;
};

export type SocialAccountProfilePostsResponse = {
  items: SocialAccountProfilePost[];
  pagination: SocialAccountProfilePagination;
  sort_metadata?: SocialAccountProfilePostsSortMetadata | null;
};

export type SocialAccountCommentsCoverage = {
  available_posts?: number | null;
  eligible_posts: number;
  stale_posts: number;
  missing_posts: number;
  last_comments_run_at?: string | null;
  last_comments_run_status?: string | null;
  effective_status?: "idle" | "running" | "queued" | "pending" | "retrying" | "covered" | "needs_refresh" | "failed" | string | null;
  effective_label?: string | null;
  historical_failure?: boolean | null;
  last_attempt_status?: string | null;
  last_attempt_at?: string | null;
  active_run_id?: string | null;
};

export type SocialAccountCommentsSavedSummary = {
  saved_comments: number;
  retrieved_comments: number;
  saved_comment_posts?: number | null;
  retrieved_comment_posts?: number | null;
  saved_comment_media_files?: number | null;
  inline_comments_upserted?: number | null;
  inline_comment_samples?: number | null;
};

export type SocialAccountMediaCoverage = {
  saved_files: number;
  total_files: number;
  saved_post_media_files?: number | null;
  total_post_media_files?: number | null;
  saved_comment_media_files?: number | null;
  total_comment_media_files?: number | null;
  saved_avatar_files?: number | null;
  saved_reel_still_files?: number | null;
  total_reel_still_files?: number | null;
};

export type SocialAccountProfileComment = {
  id: string;
  comment_id: string;
  external_id?: string | null;
  post_id?: string | null;
  post_source_id?: string | null;
  post_url?: string | null;
  username?: string | null;
  user_id?: string | null;
  display_name?: string | null;
  author_full_name?: string | null;
  author_profile_pic_url?: string | null;
  hosted_author_profile_pic_url?: string | null;
  author_profile_pic_url_hd?: string | null;
  author_is_verified?: boolean | null;
  text?: string | null;
  discussion_type?: string | null;
  likes?: number | null;
  likes_count?: number | null;
  likesCount?: number | null;
  reply_count?: number | null;
  replies_count?: number | null;
  repliesCount?: number | null;
  replies?: SocialAccountProfileComment[];
  is_reply?: boolean;
  created_at?: string | null;
  timestamp?: string | null;
  parent_comment_id?: string | null;
  parent_comment_external_id?: string | null;
  reply_depth?: number | null;
  source_snapshot_type?: string | null;
  media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  ownerUsername?: string | null;
  ownerProfilePicUrl?: string | null;
  owner?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
};

export type SocialAccountProfileCommentsResponse = {
  items: SocialAccountProfileComment[];
  pagination: SocialAccountProfilePagination;
  comment_breakdown?: SocialAccountCommentBreakdown | null;
  facebook_crosspost?: SocialAccountFacebookCrosspost | null;
  pagination_basis?: "parent_threads" | "comments" | string | null;
};

export type SocialAccountCatalogDiscussionItem = SocialAccountProfileComment & {
  user?: Record<string, unknown> | null;
  url?: string | null;
};

export type SocialAccountCommentsScrapeRequest =
  | {
      mode: "profile";
      source_scope?: string;
      max_posts?: number;
      max_comments_per_post?: number;
      refresh_policy?: "stale_or_missing" | "all_saved_posts";
      target_filter?: "incomplete";
      allow_inline_dev_fallback?: boolean;
      dry_run?: boolean;
    }
  | {
      mode: "single_post";
      source_id: string;
      max_comments_per_post?: number;
      allow_inline_dev_fallback?: boolean;
      dry_run?: boolean;
    };

export type InstagramCommentsAuthRepairStatus = "skipped" | "succeeded" | "failed";

export type InstagramCommentsLaunchAuthMetadata = {
  auth_repair_attempted?: boolean;
  auth_repair_status?: InstagramCommentsAuthRepairStatus;
  auth_repair_reason?: string | null;
  comments_auth_probe?: Record<string, unknown> | null;
  posts_auth_probe?: Record<string, unknown> | null;
};

export type SocialAccountCommentsScrapeResponse = {
  run_id: string;
  status?: string | null;
  detail?: string | null;
  target_source_ids_count?: number;
  target_filter?: "incomplete" | string | null;
  incomplete_fill?: boolean | null;
  comments_shard_count?: number;
  comments_sharding_enabled?: boolean;
  comments_proxy_shard_sessions?: boolean;
  recommended_comments_shard_count?: number;
  timing?: Record<string, unknown> | null;
} & InstagramCommentsLaunchAuthMetadata;

export type SocialAccountCommentsAuditCursorRetryRow = {
  shortcode: string;
  post_id?: string | null;
  show_id?: string | null;
  season_id?: string | null;
  show_slug?: string | null;
  show_name?: string | null;
  cursor_stop_reason?: string | null;
  created_at?: string | null;
  has_top_level_cursor?: boolean;
  reply_resume_count?: number;
  reported_comment_count?: number;
  saved_comment_count?: number;
  missing_comment_gap?: number;
  active_run_id?: string | null;
  active_run_job_count?: number;
  active_run_queued_count?: number;
  active_run_running_count?: number;
  active_run_completed_count?: number;
  active_run_failed_count?: number;
  active_run_cancelled_count?: number;
  active_job_ids?: string[];
  active_job_target_counts?: number[];
};

export type SocialAccountCommentsAuditCursorRetriesResponse = {
  ok?: boolean;
  account?: string;
  selected_target_source_ids?: string[];
  selected_target_source_ids_count?: number;
  inspected_audit_rows_count?: number;
  eligible_stop_reasons?: string[];
  show_filter?: {
    show_ids?: string[];
    season_ids?: string[];
    terms?: string[];
  } | null;
  active_run?: Record<string, unknown> | null;
  progress_rows?: SocialAccountCommentsAuditCursorRetryRow[];
  rows?: SocialAccountCommentsAuditCursorRetryRow[];
  mode?: "dry_run" | "enqueue" | string;
  batch_size?: number;
  enqueue?: {
    requested?: boolean;
    performed?: boolean;
    mode?: "new_run" | "active_run_split" | string;
    result?: Record<string, unknown> | null;
  };
  failure_reason?: string | null;
};

export type SocialAccountCommentsAuditCursorRetryRequest = {
  limit?: number;
  shortcodes?: string[];
  stop_reasons?: string[];
  show_ids?: string[];
  season_ids?: string[];
  show_filters?: string[];
  show_filter?: string;
  batch_size?: number;
  comments_worker_count?: number;
  max_comments_per_post?: number;
  comments_load_strategy?: "cursor_api" | "single_session_load_all";
  skip_launch_auth_probe?: boolean;
  attach_to_active_run?: boolean;
  dispatch_immediately?: boolean;
  force_rerun_existing?: boolean;
  dry_run?: boolean;
};

export type SocialAccountCommentsCancelResponse = {
  run_id: string;
  status?: string | null;
  accepted?: boolean;
  cancel_requested_at?: string | null;
  cancelled_jobs?: number;
  cancelled_job_ids?: string[];
  summary?: Record<string, unknown> | null;
};

export type SocialAccountCommentsJobCancelResponse = {
  run_id: string;
  job_id: string;
  status?: string | null;
  accepted?: boolean;
  cancel_requested_at?: string | null;
};

export type SocialAccountCommentsDryRunPreviewResponse = {
  dry_run?: boolean;
  platform?: SocialPlatformSlug | string;
  account_handle?: string;
  mode?: "profile" | "single_post" | string;
  refresh_policy?: "stale_or_missing" | "all_saved_posts" | string | null;
  target_filter?: "incomplete" | string | null;
  incomplete_fill?: boolean | null;
  target_priority?: string | null;
  target_source_ids_count?: number;
  comments_shard_count?: number;
  comments_sharding_enabled?: boolean;
  comments_proxy_shard_sessions?: boolean;
  recommended_comments_shard_count?: number;
  sample_target_source_ids?: string[];
  timing?: Record<string, unknown> | null;
  preview_cache?: Record<string, unknown> | string | null;
  cache?: Record<string, unknown> | string | null;
  cache_status?: string | null;
  debug?: Record<string, unknown> | null;
  warnings?: string[];
  warning_code?: string | null;
  warning_message?: string | null;
};

export type SocialAccountCommentsShardProgress = {
  shard_index?: number | null;
  shard_count?: number | null;
  job_id?: string | null;
  status?: string | null;
  job_status?: string | null;
  target_count?: number | null;
  target_source_ids_count?: number | null;
  comments_shard_target_count?: number | null;
  processed_post_count?: number | null;
  completed_posts?: number | null;
  complete_posts?: number | null;
  incomplete_posts?: number | null;
  matched_posts?: number | null;
  saved_posts?: number | null;
  remaining_target_count?: number | null;
  retry_target_count?: number | null;
  comments_processed?: number | null;
  comments_upserted?: number | null;
  comments_inserted?: number | null;
  comments_refreshed?: number | null;
  comments_changed?: number | null;
  new_comments?: number | null;
  replies_upserted?: number | null;
  items_found_total?: number | null;
  queue_wait_seconds?: number | null;
  posts_per_minute?: number | null;
  comments_per_minute?: number | null;
  latest_failure_reason?: string | null;
  latest_fetch_reason?: string | null;
  fetch_reason_counts?: Record<string, number | null | undefined> | null;
  latest_stop_reason?: string | null;
  stop_reason_counts?: Record<string, number | null | undefined> | null;
  completion_reason_counts?: Record<string, number | null | undefined> | null;
  retry_reason_counts?: Record<string, number | null | undefined> | null;
  network_spend?: SocialAccountCommentsNetworkSpend | null;
  error_message?: string | null;
};

export type SocialAccountCommentsNetworkSpendHost = {
  host?: string | null;
  bytes?: number | null;
  request_count?: number | null;
  blocked_request_count?: number | null;
  blocked_bytes_estimate?: number | null;
};

export type SocialAccountCommentsNetworkSpend = {
  observed_proxy_bytes?: number | null;
  observed_proxy_megabytes?: number | null;
  observed_request_count?: number | null;
  static_cdninstagram_bytes?: number | null;
  static_cdninstagram_megabytes?: number | null;
  static_cdninstagram_request_count?: number | null;
  static_cdninstagram_blocked_request_count?: number | null;
  blocked_request_count?: number | null;
  blocked_bytes_estimate?: number | null;
  bytes_by_host?: Record<string, number | null | undefined> | null;
  request_count_by_host?: Record<string, number | null | undefined> | null;
  blocked_request_count_by_host?: Record<string, number | null | undefined> | null;
  blocked_bytes_estimate_by_host?: Record<string, number | null | undefined> | null;
  top_hosts?: SocialAccountCommentsNetworkSpendHost[];
  network_policy_modes?: Record<string, number | null | undefined> | null;
  spend_basis?: string | null;
};

export type SocialAccountCommentsTargetProgressRow = {
  source_id?: string | null;
  shortcode?: string | null;
  job_id?: string | null;
  job_ids?: string[];
  status?: string | null;
  statuses?: Record<string, number | null | undefined> | null;
  target_index?: number | null;
  job_target_count?: number | null;
  shard_index?: number | null;
  shard_count?: number | null;
  latest_reason?: string | null;
  fetch_reason?: string | null;
  latest_stop_reason?: string | null;
  reported_comment_count?: number | null;
  saved_comment_count?: number | null;
  observed_comment_count?: number | null;
  missing_comment_gap?: number | null;
  remaining?: boolean | null;
  retryable?: boolean | null;
  auth_failed?: boolean | null;
  network_stopped?: boolean | null;
  current_phase?: string | null;
  has_top_level_cursor?: boolean | null;
  reply_resume_count?: number | null;
  cursor_stop_reason?: string | null;
  pages_seen?: number | null;
};

export type SocialAccountCommentsRunProgress = {
  run_id: string;
  platform: SocialPlatformSlug;
  account_handle: string;
  run_status: string;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  summary?: Record<string, unknown> | null;
  job_status?: string | null;
  job_metadata?: Record<string, unknown> | null;
  error_message?: string | null;
  mode?: "profile" | "single_post" | string | null;
  target_source_ids?: string[];
  target_source_ids_count?: number;
  target_filter?: "incomplete" | string | null;
  incomplete_fill?: boolean | null;
  comments_shard_count?: number;
  comments_sharding_enabled?: boolean;
  comments_proxy_shard_sessions?: boolean;
  recommended_comments_shard_count?: number;
  active_comment_jobs?: number;
  running_comment_jobs?: number;
  queued_comment_jobs?: number;
  retrying_comment_jobs?: number;
  completed_comment_jobs?: number;
  cancelled_comment_jobs?: number;
  failed_comment_jobs?: number;
  stale_comment_jobs?: number;
  partial_comment_jobs?: number;
  stale_comment_shards?: number;
  partial_comment_shards?: number;
  partial_fallback_count?: number;
  rendered_fallback_partial_count?: number;
  incomplete_targets_count?: number;
  auth_blocked_targets_count?: number;
  top_incomplete_reasons?: Record<string, number | null | undefined> | Array<Record<string, unknown>>;
  incomplete_reason_counts?: Record<string, number | null | undefined>;
  retry_reason_counts?: Record<string, number | null | undefined>;
  largest_remaining_gaps?: Array<Record<string, unknown>>;
  largest_gaps?: Array<Record<string, unknown>>;
  incomplete_targets?: Array<Record<string, unknown>>;
  recommended_next_action?: string | null;
  operator_next_action?: string | null;
  recommended_action?: string | null;
  post_progress?: {
    completed_posts?: number;
    complete_posts?: number;
    incomplete_posts?: number;
    matched_posts?: number;
    saved_posts?: number;
    total_posts?: number | null;
  };
  throughput?: {
    elapsed_seconds?: number;
    posts_per_minute?: number | null;
    comments_per_minute?: number | null;
  };
  cancellation_summary?: {
    cancelled_jobs?: number;
    failed_jobs?: number;
    remaining_target_source_ids_count?: number;
    resume_recommendation?: "stale_or_missing" | null;
  };
  retry_progress?: {
    retry_target_count?: number | null;
    retry_source_job_ids?: string[];
    targeted_retry_target_count?: number | null;
    network_stopped_target_count?: number | null;
    network_stopped_target_source_ids?: string[];
    largest_remaining_gaps?: Array<Record<string, unknown>>;
    target_progress_rows?: SocialAccountCommentsTargetProgressRow[];
    top_incomplete_reasons?: Record<string, number | null | undefined> | null;
  } | null;
  timing?: Record<string, unknown> | null;
  auto_rebalance?: Record<string, unknown> | null;
  network_spend?: SocialAccountCommentsNetworkSpend | null;
  target_progress_rows?: SocialAccountCommentsTargetProgressRow[];
  target_progress?: SocialAccountCommentsTargetProgressRow[];
  comment_shards?: SocialAccountCommentsShardProgress[];
  shards?: SocialAccountCommentsShardProgress[];
  shard_progress?: SocialAccountCommentsShardProgress[];
  stale_pre_sharding_run?: boolean;
  pre_sharding_run?: boolean;
  warning_code?: string | null;
  warning_message?: string | null;
  warnings?: string[];
  auth_validation_mode?: string | null;
  comments_endpoint_probe?: Record<string, unknown> | null;
  comments_endpoint_probe_advisory_active?: boolean | null;
  manual_auth_required?: boolean | null;
  started_at_epoch_seconds?: number | null;
  updated_at?: string | null;
};

export type SocialAccountCatalogPost = SocialAccountProfilePost & {
  assignment_status?: "assigned" | "unassigned" | "ambiguous" | "needs_review";
  assignment_source?: string | null;
  candidate_matches?: Array<Record<string, unknown>>;
};

export type CatalogBackfillSelectedTask = "post_details" | "comments" | "media";

export type SocialAccountCatalogPostDetail = {
  platform: SocialPlatformSlug;
  account_handle: string;
  id?: string | null;
  source_id: string;
  source_surface?: "materialized" | "catalog";
  title?: string | null;
  content?: string | null;
  url?: string | null;
  permalink?: string | null;
  posted_at?: string | null;
  assignment_status?: "assigned" | "unassigned" | "ambiguous" | "needs_review";
  assignment_source?: string | null;
  candidate_matches?: Array<Record<string, unknown>>;
  show_id?: string | null;
  show_name?: string | null;
  show_slug?: string | null;
  season_id?: string | null;
  season_number?: number | null;
  thumbnail_url?: string | null;
  source_thumbnail_url?: string | null;
  hosted_thumbnail_url?: string | null;
  display_thumbnail_url?: string | null;
  display_thumbnail_variants?: SocialDisplayThumbnailVariants;
  display_thumbnail_status?: string | Record<string, unknown> | null;
  display_thumbnail_srcset?: string | null;
  media_urls?: string[] | null;
  source_media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  media_asset_meta?: Record<string, unknown> | null;
  media_mirror_status?: Record<string, unknown> | null;
  media_mirror_last_job_id?: string | null;
  post_status?: Record<string, unknown> | null;
  stats?: Record<string, number | null> | null;
  saved_metrics?: Record<string, number | null> | null;
  facebook_crosspost?: SocialAccountFacebookCrosspost | null;
  comment_completeness?: SocialAccountLegacyCommentCompleteness | null;
  comment_breakdown?: SocialAccountCommentBreakdown | null;
  saved_comments?: number | null;
  hashtags?: string[];
  mentions?: string[];
  collaborators?: string[];
  tags?: string[];
  profile_tags?: string[];
  tagged_users_detail?: Array<Record<string, unknown>> | null;
  collaborators_detail?: Array<Record<string, unknown>> | null;
  child_posts_data?: Array<Record<string, unknown>> | null;
  post_format?: string | null;
  discussion_items?: SocialAccountCatalogDiscussionItem[] | null;
  comments?: Array<Record<string, unknown>> | null;
  quotes?: Array<Record<string, unknown>> | null;
  total_comments_in_db?: number | null;
  total_quotes_in_db?: number | null;
  author?: string | null;
  display_name?: string | null;
  duration_seconds?: number | null;
  transcript_text?: string | null;
  transcript_segments?: Array<Record<string, unknown> | string> | null;
  transcript_language?: string | null;
  transcript_source?: string | null;
  transcript_synced_at?: string | null;
  transcript_error?: string | null;
};

export type SocialAccountCatalogAction = "backfill" | "sync_recent" | "sync_newer" | "resume_tail";

export type SocialAccountCatalogActionScope =
  | "full_history"
  | "bounded_window"
  | "recent_window"
  | "head_gap"
  | "frontier_resume";

export type SocialAccountCatalogAttachedCommentsFollowup = {
  run_id?: string | null;
  state?: string | null;
  status?: string | null;
  // Legacy compatibility: new stage-graph progress should prefer explicit comments stage blockers.
  source?: "new_run" | "reused_run" | "deferred_after_catalog" | null;
  error_message?: string | null;
  failed_at?: string | null;
  retryable?: boolean | null;
};

export type SocialAccountCatalogAttachedMediaFollowup = {
  attachment_id?: string | null;
  state?: string | null;
  status?: string | null;
  source?: "catalog_media_mirror" | "comments_media_followups" | null;
  enqueued_job_ids?: string[];
  enqueued_job_count?: number;
};

export type SocialAccountCatalogAttachedFollowups = {
  comments?: SocialAccountCatalogAttachedCommentsFollowup | null;
  media?: SocialAccountCatalogAttachedMediaFollowup | null;
};

export type SocialAccountCatalogRun = {
  job_id: string;
  run_id: string;
  status?: string | null;
  catalog_action?: SocialAccountCatalogAction | null;
  catalog_action_scope?: SocialAccountCatalogActionScope | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  launch_group_id?: string | null;
  launch_state?: "pending" | "finalizing" | "ready" | "failed" | "blocked_auth" | null;
  selected_tasks?: CatalogBackfillSelectedTask[];
  effective_selected_tasks?: CatalogBackfillSelectedTask[];
  comments_run_id?: string | null;
  attached_followups?: SocialAccountCatalogAttachedFollowups | null;
};

export type SocialAccountCatalogStageGraphNode = {
  status?: string | null;
  state?: string | null;
  label?: string | null;
  detail?: string | null;
  blocker?: string | null;
  blocker_reason?: string | null;
  blocked_reason?: string | null;
  blocker_reasons?: string[];
  blocked_reasons?: string[];
  target_count?: number | null;
  eligible_count?: number | null;
  pending_count?: number | null;
  running_count?: number | null;
  completed_count?: number | null;
  failed_count?: number | null;
  total_count?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
  lanes?: Record<string, SocialAccountCatalogStageGraphNode> | null;
  metadata?: Record<string, unknown> | null;
};

export type SocialAccountCatalogStageGraph = {
  target_readiness?: SocialAccountCatalogStageGraphNode | null;
  detail_refresh?: SocialAccountCatalogStageGraphNode | null;
  comments?: SocialAccountCatalogStageGraphNode | null;
  media?: SocialAccountCatalogStageGraphNode | null;
  enrichment?: SocialAccountCatalogStageGraphNode | null;
  finalization?: SocialAccountCatalogStageGraphNode | null;
  [stage: string]: SocialAccountCatalogStageGraphNode | null | undefined;
};

export type SocialAccountCatalogDetailRefreshProgress = {
  fetch_policy?: "smart" | "force_metrics" | "force_network_detail" | string | null;
  details_refresh_policy?: "smart" | "force_metrics" | "force_network_detail" | string | null;
  fetch_attempts?: number | null;
  fetch_avoided?: number | null;
  fetch_reason_counts?: Record<string, number> | null;
  rows_seen?: number | null;
  rows_satisfied_from_gallery?: number | null;
  rows_satisfied_from_existing?: number | null;
  write_batches?: number | null;
  rows_per_batch?: number | number[] | null;
  timing?: Record<string, unknown> | null;
};

export type SocialAccountCatalogEnrichmentLaneProgress = {
  key?: string | null;
  lane?: string | null;
  status?: string | null;
  pending_count?: number | null;
  running_count?: number | null;
  completed_count?: number | null;
  failed_count?: number | null;
  total_count?: number | null;
  blocked_reason?: string | null;
  blocker_reason?: string | null;
  detail?: string | null;
};

export type SocialAccountCatalogProxyMetadata = {
  proxy_fingerprint?: string | null;
  proxy_session_mode?: string | null;
  proxy_provider?: string | null;
  posts_proxy_fingerprint?: string | null;
  posts_proxy_session_mode?: string | null;
  detail_proxy_fingerprint?: string | null;
  detail_proxy_session_mode?: string | null;
  comments_proxy_fingerprint?: string | null;
  comments_proxy_session_mode?: string | null;
  lanes?: Record<string, Pick<SocialAccountCatalogProxyMetadata, "proxy_fingerprint" | "proxy_session_mode" | "proxy_provider">> | null;
};

export type SocialAccountCatalogPhaseProgress = {
  status?: string | null;
  phase?: string | null;
  pages_scanned?: number | null;
  pages_completed?: number | null;
  posts_seen?: number | null;
  posts_checked?: number | null;
  posts_saved?: number | null;
  posts_upserted?: number | null;
  completed_posts?: number | null;
  matched_posts?: number | null;
  saved_posts?: number | null;
  total_posts?: number | null;
  running_count?: number | null;
  queued_count?: number | null;
  failed_count?: number | null;
  [key: string]: unknown;
};

export type SocialAccountCatalogPaginationState = {
  source_scope?: string | null;
  direction?: string | null;
  cursor_in?: string | null;
  end_cursor?: string | null;
  page_index?: number | null;
  posts_seen?: number | null;
  posts_upserted?: number | null;
  doc_id_used?: string | null;
  doc_ids_attempted?: string[] | null;
  proxy_fingerprint?: string | null;
  proxy_session_key?: string | null;
  stop_reason?: string | null;
  partial?: boolean | null;
  updated_at?: string | null;
  completed_at?: string | null;
  [key: string]: unknown;
};

export type SocialAccountCatalogCoverageMetric = {
  present_count?: number | null;
  covered_count?: number | null;
  saved_count?: number | null;
  missing_count?: number | null;
  total_count?: number | null;
  total_posts?: number | null;
  pct?: number | null;
  percent?: number | null;
  [key: string]: unknown;
};

export type SocialAccountCatalogFeatureFlagSnapshot = Record<string, boolean | string | number | null | undefined>;

export type SocialAccountCatalogRunProgressStage = {
  jobs_total: number;
  jobs_completed: number;
  jobs_failed: number;
  jobs_active: number;
  jobs_running?: number;
  jobs_waiting?: number;
  scraped_count: number;
  saved_count: number;
};

export type SocialAccountCatalogRunProgressHandle = SocialAccountCatalogRunProgressStage & {
  platform: string;
  account_handle: string;
  stage: string;
  runner_lanes?: string[];
  has_started?: boolean;
  next_stage?: string | null;
};

export type SocialAccountCatalogRunProgressLogEntry = {
  id: string;
  timestamp: string | null;
  platform: string;
  account_handle: string;
  stage: string;
  status: string;
  line: string;
};

export type SocialAccountCatalogRunProgressSummary = {
  total_jobs?: number;
  completed_jobs?: number;
  failed_jobs?: number;
  active_jobs?: number;
  items_found_total?: number;
};

export type SocialAccountCatalogRunDispatchHealth = {
  queued_unclaimed_jobs?: number;
  dispatch_blocked_jobs?: number;
  modal_pending_jobs?: number;
  modal_running_unclaimed_jobs?: number;
  retrying_dispatch_jobs?: number;
  stale_dispatch_failed_jobs?: number;
  latest_dispatch_requested_at?: string | null;
  remote_invocation_checked_at?: string | null;
  latest_dispatch_backend?: string | null;
  latest_dispatch_error?: string | null;
  latest_dispatch_error_code?: string | null;
  latest_remote_blocked_reason?: string | null;
  configured_app_name?: string | null;
  configured_function_name?: string | null;
  modal_environment?: string | null;
  max_stale_dispatch_retries?: number;
};

export type SocialAccountOperationalAlert = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  reason?: string | null;
  count?: number;
  threshold_seconds?: number;
  waited_seconds?: number;
  retry_count?: number;
  attempt_count?: number;
  lease_owner?: string | null;
  frontier_status?: string | null;
  error_code?: string | null;
  stage?: string | null;
  transport?: string | null;
  execution_backend?: string | null;
  required_runtime?: Record<string, unknown> | null;
  observed_runtime_labels?: string[] | null;
  remediation_script?: string | null;
};

export type SocialAccountCatalogVerification = {
  platform: SocialPlatformSlug;
  account_handle: string;
  run_id?: string | null;
  expected_total_posts?: number | null;
  catalog_posts: number;
  caption_rows: number;
  stored_hashtag_instances: number;
  aggregated_hashtag_instances: number;
  catalog_complete: boolean;
  caption_complete: boolean;
  hashtag_counts_match: boolean;
  verified: boolean;
};

export type SocialAccountCatalogFreshness = {
  platform: SocialPlatformSlug;
  account_handle: string;
  eligible: boolean;
  reason?: string | null;
  checked_at: string;
  stored_total_posts: number;
  live_total_posts_current?: number | null;
  delta_posts: number;
  has_newer_posts?: boolean;
  needs_recent_sync: boolean;
  latest_catalog_run_status?: string | null;
  active_run_status?: string | null;
  catalog_newest_post_at?: string | null;
  catalog_oldest_post_at?: string | null;
  has_resumable_frontier?: boolean;
  frontier_pages_scanned?: number | null;
  frontier_posts_checked?: number | null;
};

export type SocialAccountLiveProfileTotal = {
  platform: SocialPlatformSlug;
  account_handle: string;
  profile_url?: string | null;
  live_total_posts_current?: number | null;
};

export type SocialAccountCatalogGapAnalysis = {
  platform: SocialPlatformSlug;
  account_handle: string;
  gap_type: "active_run" | "complete" | "head_gap" | "interior_gaps" | "source_total_drift" | "tail_gap";
  catalog_posts: number;
  materialized_posts: number;
  expected_total_posts?: number | null;
  live_total_posts_current?: number | null;
  missing_from_catalog_count: number;
  missing_oldest_post_at?: string | null;
  missing_newest_post_at?: string | null;
  sample_missing_source_ids: string[];
  has_resumable_frontier?: boolean;
  has_newer_posts?: boolean;
  needs_recent_sync?: boolean;
  recommended_action:
    | "backfill_posts"
    | "bounded_window_backfill"
    | "none"
    | "sync_newer"
    | "wait_for_active_run";
  repair_window_start?: string | null;
  repair_window_end?: string | null;
  catalog_oldest_post_at?: string | null;
  catalog_newest_post_at?: string | null;
  latest_catalog_run_status?: string | null;
  active_run_status?: string | null;
  duration_ms?: number | null;
  stage_timings?: Record<string, number> | null;
};

export type SocialAccountCatalogGapAnalysisStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type SocialAccountCatalogGapAnalysisStatusResponse = {
  platform: SocialPlatformSlug;
  account_handle: string;
  status: SocialAccountCatalogGapAnalysisStatus;
  operation_id?: string | null;
  result?: SocialAccountCatalogGapAnalysis | null;
  stale?: boolean;
  attached?: boolean;
  duration_ms?: number | null;
  stage_timings?: Record<string, number> | null;
  last_requested_at?: string | null;
  last_completed_at?: string | null;
  last_error?: Record<string, unknown> | null;
};

export type SocialAccountCatalogRunProgressSnapshot = {
  season_id?: string | null;
  run_id: string;
  run_status: string;
  launch_group_id?: string | null;
  launch_state?: "pending" | "finalizing" | "ready" | "failed" | "blocked_auth" | null;
  catalog_action?: SocialAccountCatalogAction | null;
  catalog_action_scope?: SocialAccountCatalogActionScope | null;
  date_start?: string | null;
  date_end?: string | null;
  posts_auth_mode?: "anonymous" | "authenticated" | string | null;
  instagram_posts_auth_mode?: "anonymous" | "authenticated" | string | null;
  selected_tasks?: CatalogBackfillSelectedTask[];
  effective_selected_tasks?: CatalogBackfillSelectedTask[];
  pipeline_strategy?: "stage_graph" | string | null;
  stage_graph?: SocialAccountCatalogStageGraph | null;
  target_readiness?: SocialAccountCatalogStageGraphNode | null;
  detail_refresh?: SocialAccountCatalogDetailRefreshProgress | null;
  enrichment?: {
    pending_count?: number | null;
    lanes?: SocialAccountCatalogEnrichmentLaneProgress[] | Record<string, SocialAccountCatalogEnrichmentLaneProgress> | null;
  } | null;
  comments_started_before_detail_complete?: boolean;
  comments_blocked_reason?: string | null;
  posts_auth_probe?: Record<string, unknown> | null;
  auth_repair_attempted?: boolean;
  auth_repair_status?: InstagramCommentsAuthRepairStatus;
  auth_repair_reason?: string | null;
  partial_scrape?: boolean | null;
  stop_reason?: string | null;
  pagination_state?: SocialAccountCatalogPaginationState | SocialAccountCatalogPaginationState[] | null;
  resume_cursor_saved?: boolean | string | null;
  listing_progress?: SocialAccountCatalogPhaseProgress | null;
  details_progress?: SocialAccountCatalogPhaseProgress | null;
  inline_comments_upserted?: number | null;
  profile_posts_doc_ids?: string[] | null;
  doc_id_used?: string | null;
  pagination_doc_id_stale?: boolean | null;
  proxy_pacing?: Record<string, unknown> | null;
  warmup_pool?: Record<string, unknown> | null;
  bidirectional_probe?: Record<string, unknown> | null;
  acceleration_feature_flags?: SocialAccountCatalogFeatureFlagSnapshot | null;
  feature_flags?: SocialAccountCatalogFeatureFlagSnapshot | null;
  posts_acceleration_flags?: SocialAccountCatalogFeatureFlagSnapshot | null;
  field_coverage?: Record<string, SocialAccountCatalogCoverageMetric | number | null> | null;
  rich_field_coverage?: Record<string, SocialAccountCatalogCoverageMetric | number | null> | null;
  sample_comments?: Record<string, unknown> | null;
  proxy_fingerprint?: string | null;
  proxy_session_mode?: string | null;
  proxy_metadata?: SocialAccountCatalogProxyMetadata | null;
  progress_degraded?: boolean;
  progress_degraded_reason?: string | null;
  progress_degraded_at?: string | null;
  // Legacy compatibility: preserved while backend rolls out details_refresh_policy / force_network_detail_fetch.
  details_refresh_force_detail_fetch?: boolean;
  details_refresh_policy?: "smart" | "force_metrics" | "force_network_detail" | string | null;
  force_network_detail_fetch?: boolean;
  details_refresh_shard_count?: number | null;
  comments_run_id?: string | null;
  attached_followups?: SocialAccountCatalogAttachedFollowups | null;
  operational_state?:
    | "blocked_auth"
    | "discovering"
    | "fetching"
    | "recovering"
    | "classifying"
    | "completed"
    | "failed"
    | "cancelled"
    | "runtime_superseded";
  run_state?:
    | "discovering"
    | "fetching"
    | "recovering"
    | "classifying"
    | "completed"
    | "failed"
    | "cancelled";
  source_scope: string;
  network_name?: string | null;
  profile_kind?: string | null;
  assignment_mode?: string | null;
  assignment_rules?: Record<string, unknown> | null;
  shared_profile?: {
    source_scope: string;
    profile_kind: string;
    network_name?: string | null;
    assignment_mode: string;
    assignment_rules: Record<string, unknown>;
    account_handle: string;
    platform: string | null;
  };
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  stages: Record<string, SocialAccountCatalogRunProgressStage>;
  queued_jobs_by_type?: Record<string, number>;
  capacity_waiting?: boolean;
  active_transport?: string | null;
  per_handle: SocialAccountCatalogRunProgressHandle[];
  recent_log: SocialAccountCatalogRunProgressLogEntry[];
  runtime_version?: {
    commit_sha?: string | null;
    modal_image?: string | null;
    modal_environment?: string | null;
    modal_function?: string | null;
    execution_backend?: string | null;
    label?: string | null;
  };
  worker_runtime?: {
    runner_strategy?: string | null;
    runner_count?: number;
    partition_strategy?: string | null;
    frontier_strategy?: string | null;
    scheduler_lanes?: string[];
    active_workers_now?: number;
    worker_ids_sample?: string[];
    runtime_version?: {
      commit_sha?: string | null;
      modal_image?: string | null;
      modal_environment?: string | null;
      modal_function?: string | null;
      execution_backend?: string | null;
      label?: string | null;
    };
    runtime_versions_observed?: Array<Record<string, unknown>>;
    runtime_version_drift?: boolean;
    replacement_run_id?: string | null;
    auto_requeue_status?: string | null;
    runtime_superseded?: boolean;
    superseded_by_runtime_version?: {
      commit_sha?: string | null;
      modal_image?: string | null;
      modal_environment?: string | null;
      modal_function?: string | null;
      execution_backend?: string | null;
      label?: string | null;
    } | null;
  };
  cancel_reason?: string | null;
  last_error_code?: string | null;
  last_error_message?: string | null;
  repair_action?: "cookie_refresh" | "repair_instagram_auth" | null;
  repair_status?: "idle" | "running" | "failed" | "succeeded" | null;
  repairable_reason?: string | null;
  auto_resume_pending?: boolean;
  resume_stage?: "discovery" | "posts" | null;
  repair_environment?: {
    supported?: boolean;
    execution_mode?: string | null;
    execution_owner?: string | null;
    modal_environment?: string | null;
    unsupported_reason?: string | null;
    repair_command?: string | null;
  } | null;
  partition_strategy?: string | null;
  discovery?: {
    status?: string | null;
    partition_strategy?: string | null;
    partition_count?: number;
    discovered_count?: number;
    queued_count?: number;
    running_count?: number;
    completed_count?: number;
    failed_count?: number;
    cancelled_count?: number;
  };
  frontier?: {
    status?: string | null;
    strategy?: string | null;
    next_cursor_present?: boolean;
    pages_scanned?: number;
    posts_checked?: number;
    posts_saved?: number;
    expected_total_posts?: number;
    transport?: string | null;
    lease_owner?: string | null;
    retry_count?: number;
    exhausted?: boolean;
    stop_reason?: string | null;
    catalog_oldest_post_at?: string | null;
    oldest_posted_at_seen?: string | null;
    newest_posted_at_seen?: string | null;
    updated_at?: string | null;
  };
  recovery?: {
    status?: "queued" | "running" | "completed" | "fallback_enqueued" | "blocked" | "failed" | "idle" | null;
    reason?:
      | "no_partitions_discovered"
      | "catalog_incomplete"
      | "initial_empty_page"
      | "no_authenticated_modal_workers"
      | null;
    stage?: string | null;
    job_id?: string | null;
    recovery_depth?: number;
    queued_since?: string | null;
    waited_seconds?: number;
    attempt_count?: number;
    next_stage?: string | null;
    transport?: string | null;
    execution_backend?: string | null;
  };
  post_progress?: {
    completed_posts?: number;
    matched_posts?: number;
    saved_posts?: number;
    total_posts?: number | null;
  };
  source_total_posts_current?: number | null;
  completion_gap_posts?: number;
  completion_gap_reason?: string | null;
  scrape_complete?: boolean;
  classify_incomplete?: boolean;
  alerts?: SocialAccountOperationalAlert[];
  run_diagnostics?: {
    cancel_reason?: string | null;
    last_error_code?: string | null;
    last_error_message?: string | null;
    frontier_auth_reason?: string | null;
    frontier_stop_reason?: string | null;
    declared_runner_strategy?: string | null;
    effective_runner_strategy?: string | null;
    declared_partition_strategy?: string | null;
    effective_partition_strategy?: string | null;
    effective_execution_backend?: string | null;
    catalog_oldest_post_at?: string | null;
    oldest_posted_at_seen?: string | null;
    newest_posted_at_seen?: string | null;
    strategy_mismatch?: boolean;
    runtime_version_drift?: boolean;
    replacement_run_id?: string | null;
    auto_requeue_status?: string | null;
  };
  dispatch_health?: SocialAccountCatalogRunDispatchHealth;
  summary?: SocialAccountCatalogRunProgressSummary;
  updated_at?: string | null;
};

export type SocialAccountCatalogReviewItem = {
  id: string;
  platform: SocialPlatformSlug;
  account_handle: string;
  hashtag: string;
  display_hashtag?: string | null;
  review_status: string;
  usage_count: number;
  sample_post_ids: string[];
  sample_source_ids: string[];
  suggested_shows: SocialAccountProfileShowBucket[];
  first_seen_at?: string | null;
  last_seen_at?: string | null;
};

export type CatalogBackfillRequest = {
  source_scope?: "network" | "creator" | "community" | "news";
  date_start?: string | null;
  date_end?: string | null;
  backfill_scope: "full_history" | "bounded_window";
  allow_inline_dev_fallback?: boolean;
  execution_preference?: "auto" | "prefer_local_inline";
  selected_tasks?: CatalogBackfillSelectedTask[];
  detail_worker_count?: number | null;
  comments_worker_count?: number | null;
  comments_enable_media_followups?: boolean | null;
};

export type CatalogBackfillLaunchResponse = {
  run_id?: string | null;
  status?: string | null;
  launch_group_id?: string | null;
  launch_state?: "pending" | "ready" | "failed" | null;
  launch_task_resolution_pending?: boolean | null;
  selected_tasks?: CatalogBackfillSelectedTask[];
  effective_selected_tasks?: CatalogBackfillSelectedTask[];
  post_details_skipped_reason?: "already_materialized" | null;
  catalog_run_id?: string | null;
  comments_run_id?: string | null;
  attached_followups?: SocialAccountCatalogAttachedFollowups | null;
  catalog_bootstrap_required?: boolean;
  comments_deferred_until_catalog_complete?: boolean;
} & InstagramCommentsLaunchAuthMetadata;

export type CatalogSyncRecentRequest = {
  lookback_days: number;
};

export type CatalogSyncNewerRequest = {
  source_scope?: string;
};

export type CatalogRemediateDriftRequest = {
  run_id?: string | null;
  requeue_canary?: boolean;
  source_scope?: "network" | "creator" | "community" | "news";
};

export type CatalogRemediateDriftResponse = {
  platform: string;
  account_handle: string;
  candidate_job_count: number;
  candidate_runs: Array<{
    run_id: string;
    run_status?: string | null;
    job_ids: string[];
    job_statuses: string[];
    job_types: string[];
    runner_strategy?: string | null;
    partition_strategy?: string | null;
    catalog_action?: string | null;
  }>;
  cancelled_runs: Array<Record<string, unknown>>;
  requeued_canary: { run_id?: string; status?: string } | null;
};

export type CatalogRepairAuthRequest = {
  allow_inline_dev_fallback?: boolean;
  operator_confirmation?: string;
  allow_cookie_refresh?: boolean;
};

export type CatalogReviewResolveRequest = {
  resolution_action: "assign_show" | "mark_non_show";
  show_id?: string | null;
};

export type SocialAccountProfileHashtagAssignment = {
  id?: string | null;
  show_id?: string | null;
  show_name?: string | null;
  show_slug?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
};

export type SocialAccountProfileHashtag = {
  hashtag: string;
  display_hashtag?: string | null;
  usage_count: number;
  first_seen_at?: string | null;
  latest_seen_at?: string | null;
  latest_source_id?: string | null;
  assignments: SocialAccountProfileHashtagAssignment[];
  assigned_shows?: SocialAccountProfileShowBucket[];
  observed_shows?: SocialAccountProfileShowBucket[];
  observed_seasons?: SocialAccountProfileSeasonBucket[];
};

export type SocialAccountProfileHashtagTimelineYear = {
  year: number;
  label: string;
  order: number;
};

export type SocialAccountProfileHashtagTimelinePoint = {
  year: number;
  label: string;
  order: number;
  rank: number;
  usage_count: number;
  in_top_ten: boolean;
  segment_id?: number | null;
};

export type SocialAccountProfileHashtagTimelineSeries = {
  hashtag: string;
  display_hashtag: string;
  first_top_order?: number | null;
  last_top_order?: number | null;
  latest_top_order?: number | null;
  latest_top_rank?: number | null;
  points: SocialAccountProfileHashtagTimelinePoint[];
};

export type SocialAccountProfileHashtagTimeline = {
  platform: SocialPlatformSlug;
  account_handle: string;
  years: SocialAccountProfileHashtagTimelineYear[];
  series: SocialAccountProfileHashtagTimelineSeries[];
  top_rank_limit: number;
  off_chart_rank: number;
};

export type SocialAccountProfileCollaboratorTagAggregate = {
  handle: string;
  platform: SocialPlatformSlug;
  profile_url?: string | null;
  usage_count: number;
  post_count: number;
  latest_seen_at?: string | null;
  shows?: SocialAccountProfileShowBucket[];
  seasons?: SocialAccountProfileSeasonBucket[];
};

export const SOCIAL_ACCOUNT_PROFILE_TAB_LABELS: Record<SocialAccountProfileTab, string> = {
  stats: "Stats",
  socialblade: "SocialBlade",
  catalog: "Catalog",
  comments: "Comments",
  posts: "Posts",
  hashtags: "Hashtags",
  "collaborators-tags": "Collaborators / Tags",
};

export const SOCIAL_ACCOUNT_PLATFORM_LABELS: Record<SocialPlatformSlug, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter / X",
  youtube: "YouTube",
  facebook: "Facebook",
  threads: "Threads",
};

// ---------------------------------------------------------------------------
// Cookie preflight types
// ---------------------------------------------------------------------------

export type SocialProfileCookieHealth = {
  platform: string;
  required: boolean;
  healthy: boolean;
  reason: string | null;
  refresh_supported: boolean;
  refresh_available: boolean;
  refresh_action?: "cookie_refresh" | "instagram_auth_repair";
  refresh_label?: string;
  source_kind: string;
  degraded?: boolean;
  degraded_reason?: string;
  source_path?: string;
  cookie_fingerprint?: string | null;
  cookie_fingerprint_algorithm?: string | null;
  refresh_target_path?: string;
  posts_auth_health?: {
    platform: string;
    account_handle?: string;
    ready: boolean;
    status?: string | null;
    category?: string | null;
    reason: string | null;
    execution_backend?: string;
    probe_only?: boolean;
    probe_source?: string | null;
    repair_action?: null;
    repair_available?: boolean;
    cookie_fingerprint?: string | null;
    cookie_fingerprint_match?: boolean | null;
  };
  posts_auth_probe?: Record<string, unknown> | null;
  comments_auth_health?: {
    platform: string;
    account_handle?: string;
    shortcode?: string | null;
    ready: boolean;
    status?: string | null;
    category?: string | null;
    reason: string | null;
    execution_backend?: string;
    probe_only?: boolean;
    probe_source?: string | null;
    repair_action?: null;
    repair_available?: boolean;
    cookie_fingerprint?: string | null;
    cookie_fingerprint_match?: boolean | null;
    rendered_fallback_enabled?: boolean | null;
    advisory_continue?: boolean | null;
    advisory_reason?: string | null;
  };
  comments_auth_probe?: Record<string, unknown> | null;
  auth_surface_blocked?: boolean;
  auth_surface_probe_only?: boolean;
  warning_code?: string;
  warning_message?: string;
};

export type SocialProfileCookieRefreshResult = {
  success: boolean;
  healthy: boolean;
  reason: string | null;
  refresh_action?: "cookie_refresh" | "instagram_auth_repair";
  steps?: Array<{ name: string; status: string }>;
  remote_auth_probe?: Record<string, unknown> | null;
  instagram_posts_auth_probe?: Record<string, unknown> | null;
  instagram_comments_auth_probe?: Record<string, unknown> | null;
  cooldown?: Record<string, unknown> | null;
  safety_stop?: boolean;
  automated_cookie_refresh_allowed?: boolean;
  warning_code?: string;
  warning_message?: string;
};
