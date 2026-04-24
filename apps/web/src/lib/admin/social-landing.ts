export type SocialLandingPlatform =
  | "instagram"
  | "tiktok"
  | "twitter"
  | "youtube"
  | "facebook"
  | "threads";

export interface SocialHandleSummary {
  platform: SocialLandingPlatform;
  handle: string;
  display_label: string;
  href: string | null;
  external: boolean;
}

export interface SharedAccountSourceSummary {
  id: string;
  platform: SocialLandingPlatform;
  source_scope: string;
  account_handle: string;
  is_active: boolean;
  scrape_priority: number;
  last_scrape_status?: string | null;
  last_scrape_at?: string | null;
  last_classified_at?: string | null;
}

export interface SharedRunSummary {
  id: string;
  status: string;
  created_at?: string | null;
  completed_at?: string | null;
  ingest_mode?: string | null;
}

export interface SharedReviewItemSummary {
  id: string;
  platform: SocialLandingPlatform;
  source_id: string;
  source_account?: string | null;
  review_reason: string;
  review_status: string;
}

export interface SharedPipelineSummary {
  sources: SharedAccountSourceSummary[];
  runs: SharedRunSummary[];
  review_items: SharedReviewItemSummary[];
}

export interface RedditDashboardSummary {
  active_community_count: number;
  archived_community_count: number;
  show_count: number;
}

export interface NetworkProfileSet {
  key: string;
  title: string;
  description: string | null;
  handles: SocialHandleSummary[];
}

export interface ShowProfileSet {
  show_id: string;
  show_name: string;
  canonical_slug: string | null;
  alternative_names: string[] | null;
  handles: SocialHandleSummary[];
  fallback_note: string | null;
}

export interface PersonProfileShowSummary {
  show_id: string;
  show_name: string;
  canonical_slug: string | null;
}

export interface PersonProfileSummary {
  person_id: string;
  full_name: string;
  shows: PersonProfileShowSummary[];
  handles: SocialHandleSummary[];
}

export interface PersonTargetSummary {
  person_id: string;
  full_name: string;
  shows: PersonProfileShowSummary[];
}

export type CastSocialBladePlatform = Extract<
  SocialLandingPlatform,
  "instagram" | "youtube" | "facebook"
>;

export interface CastSocialBladeAccountSummary {
  platform: CastSocialBladePlatform;
  handle: string;
  display_label: string;
  account_href: string;
  socialblade_url: string | null;
  scraped_at: string | null;
  updated_at: string | null;
  stats_refreshed: boolean;
}

export interface CastSocialBladeMemberSummary {
  person_id: string;
  full_name: string;
  photo_url: string | null;
  accounts: CastSocialBladeAccountSummary[];
}

export interface CastSocialBladeShowSummary {
  show_id: string;
  show_name: string;
  canonical_slug: string | null;
  platform_counts: Partial<Record<CastSocialBladePlatform, number>>;
  cast_member_count: number;
  latest_scraped_at: string | null;
  members: CastSocialBladeMemberSummary[];
}

export interface SocialLandingPayload {
  network_sets: NetworkProfileSet[];
  show_sets: ShowProfileSet[];
  people_profiles: PersonProfileSummary[];
  person_targets: PersonTargetSummary[];
  cast_socialblade_shows: CastSocialBladeShowSummary[];
  shared_pipeline: SharedPipelineSummary;
  reddit_dashboard: RedditDashboardSummary;
}
