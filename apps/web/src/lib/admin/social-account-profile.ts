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

export const SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS: ReadonlyArray<SocialPlatformSlug> = [
  "instagram",
  "tiktok",
  "twitter",
  "threads",
];

export type SocialAccountProfileSummary = {
  platform: SocialPlatformSlug;
  account_handle: string;
  profile_url?: string | null;
  avatar_url?: string | null;
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
  last_catalog_run_at?: string | null;
  last_catalog_run_status?: string | null;
  catalog_recent_runs?: SocialAccountCatalogRun[];
  per_show_counts: SocialAccountProfileShowBucket[];
  per_season_counts: SocialAccountProfileSeasonBucket[];
  top_hashtags: SocialAccountProfileHashtag[];
  top_collaborators: SocialAccountProfileCollaboratorTagAggregate[];
  top_tags: SocialAccountProfileCollaboratorTagAggregate[];
  source_status: Array<Record<string, unknown>>;
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

export type SocialAccountCatalogPost = SocialAccountProfilePost & {
  assignment_status?: "assigned" | "unassigned" | "ambiguous" | "needs_review";
  assignment_source?: string | null;
  candidate_matches?: Array<Record<string, unknown>>;
};

export type SocialAccountCatalogRun = {
  job_id: string;
  run_id: string;
  status?: string | null;
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

export type SocialAccountCatalogRunProgressSnapshot = {
  season_id?: string | null;
  run_id: string;
  run_status: string;
  source_scope: string;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  stages: Record<string, SocialAccountCatalogRunProgressStage>;
  per_handle: SocialAccountCatalogRunProgressHandle[];
  recent_log: SocialAccountCatalogRunProgressLogEntry[];
  worker_runtime?: {
    runner_strategy?: string | null;
    runner_count?: number;
    partition_strategy?: string | null;
    scheduler_lanes?: string[];
    active_workers_now?: number;
    worker_ids_sample?: string[];
  };
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
  post_progress?: {
    completed_posts?: number;
    matched_posts?: number;
    total_posts?: number | null;
  };
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
  date_start?: string | null;
  date_end?: string | null;
  backfill_scope: "full_history" | "bounded_window";
};

export type CatalogSyncRecentRequest = {
  lookback_days: number;
};

export type CatalogReviewResolveRequest = {
  resolution_action: "assign_show" | "assign_season" | "mark_non_show";
  show_id?: string | null;
  season_id?: string | null;
};

export type SocialAccountProfileHashtagAssignment = {
  id?: string | null;
  show_id?: string | null;
  show_name?: string | null;
  show_slug?: string | null;
  season_id?: string | null;
  season_number?: number | null;
  updated_by?: string | null;
  updated_at?: string | null;
};

export type SocialAccountProfileHashtag = {
  hashtag: string;
  display_hashtag?: string | null;
  usage_count: number;
  latest_seen_at?: string | null;
  latest_source_id?: string | null;
  assignments: SocialAccountProfileHashtagAssignment[];
  assigned_shows?: SocialAccountProfileShowBucket[];
  assigned_seasons?: SocialAccountProfileSeasonBucket[];
  observed_shows?: SocialAccountProfileShowBucket[];
  observed_seasons?: SocialAccountProfileSeasonBucket[];
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
  catalog: "Catalog",
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
