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

export type SocialAccountProfileSummary = {
  platform: SocialPlatformSlug;
  account_handle: string;
  profile_url?: string | null;
  total_posts: number;
  total_engagement: number;
  total_views: number;
  first_post_at?: string | null;
  last_post_at?: string | null;
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
