import type { SocialAccountProfileTab, SocialPlatformSlug } from "@/lib/admin/show-admin-routes";

export type { SocialAccountProfileTab, SocialPlatformSlug } from "@/lib/admin/show-admin-routes";

export const SOCIAL_ACCOUNT_PROFILE_PLATFORMS: ReadonlyArray<SocialPlatformSlug> = [
  "instagram",
  "tiktok",
  "twitter",
  "youtube",
  "facebook",
  "threads",
];

export const SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS: ReadonlyArray<SocialPlatformSlug> = ["instagram"];

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

export type SocialAccountProfileSummaryDetail = "lite" | "full";

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
  match_mode?: "owner" | "collaborator";
  source_surface?: "materialized" | "catalog";
  metrics: {
    likes?: number | null;
    comments_count?: number | null;
    views?: number | null;
    shares?: number | null;
    retweets?: number | null;
    replies_count?: number | null;
    quotes?: number | null;
    engagement?: number | null;
  };
};

export type SocialAccountCommentsCoverage = {
  available_posts?: number | null;
  eligible_posts: number;
  stale_posts: number;
  missing_posts: number;
  last_comments_run_at?: string | null;
  last_comments_run_status?: string | null;
};

export type SocialAccountCommentsSavedSummary = {
  saved_posts: number;
  total_posts: number;
};

export type SocialAccountMediaCoverage = {
  saved_files: number;
  total_files: number;
};

export type SocialAccountProfileComment = {
  id: string;
  comment_id: string;
  post_id?: string | null;
  post_source_id?: string | null;
  post_url?: string | null;
  username?: string | null;
  text?: string | null;
  likes?: number | null;
  is_reply?: boolean;
  created_at?: string | null;
  parent_comment_id?: string | null;
};

export type SocialAccountProfileCommentsResponse = {
  items: SocialAccountProfileComment[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

export type SocialAccountCommentsScrapeRequest =
  | {
      mode: "profile";
      source_scope?: string;
      max_posts?: number;
      max_comments_per_post?: number;
      refresh_policy?: "stale_or_missing" | "all_saved_posts";
      allow_inline_dev_fallback?: boolean;
    }
  | {
      mode: "single_post";
      source_id: string;
      max_comments_per_post?: number;
      allow_inline_dev_fallback?: boolean;
    };

export type SocialAccountCommentsScrapeResponse = {
  run_id: string;
  status?: string | null;
  detail?: string | null;
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
  target_source_ids?: string[];
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
  media_urls?: string[] | null;
  source_media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  media_asset_meta?: Record<string, unknown> | null;
  media_mirror_status?: Record<string, unknown> | null;
  media_mirror_last_job_id?: string | null;
  post_status?: Record<string, unknown> | null;
  stats?: Record<string, number | null> | null;
  saved_metrics?: Record<string, number | null> | null;
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
};

export type SocialAccountCatalogAction = "backfill" | "sync_recent" | "sync_newer" | "resume_tail";

export type SocialAccountCatalogActionScope =
  | "full_history"
  | "bounded_window"
  | "recent_window"
  | "head_gap"
  | "frontier_resume";

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
};

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
  catalog_action?: SocialAccountCatalogAction | null;
  catalog_action_scope?: SocialAccountCatalogActionScope | null;
  operational_state?:
    | "blocked_auth"
    | "discovering"
    | "fetching"
    | "recovering"
    | "classifying"
    | "completed"
    | "failed"
    | "cancelled";
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
  repair_action?: "repair_instagram_auth" | null;
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
  source_scope?: "bravo" | "creator" | "community";
  date_start?: string | null;
  date_end?: string | null;
  backfill_scope: "full_history" | "bounded_window";
  allow_inline_dev_fallback?: boolean;
  execution_preference?: "auto" | "prefer_local_inline";
  selected_tasks?: CatalogBackfillSelectedTask[];
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
  catalog_bootstrap_required?: boolean;
  comments_deferred_until_catalog_complete?: boolean;
};

export type CatalogSyncRecentRequest = {
  lookback_days: number;
};

export type CatalogSyncNewerRequest = {
  source_scope?: string;
};

export type CatalogRemediateDriftRequest = {
  run_id?: string | null;
  requeue_canary?: boolean;
  source_scope?: "bravo" | "creator" | "community";
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
  source_path?: string;
  refresh_target_path?: string;
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
  warning_code?: string;
  warning_message?: string;
};
