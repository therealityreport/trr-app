import type { SocialAccountProfileSummary } from "@/lib/admin/social-account-profile";

export const makeSocialAccountSummary = (
  overrides: Partial<SocialAccountProfileSummary> = {},
): SocialAccountProfileSummary => ({
  summary_detail: "lite",
  platform: "instagram",
  account_handle: "thetraitorsus",
  display_name: "The Traitors US",
  profile_url: "https://www.instagram.com/thetraitorsus/",
  total_posts: 123,
  total_engagement: 4567,
  total_views: 8901,
  catalog_recent_runs: [],
  per_show_counts: [],
  per_season_counts: [],
  top_hashtags: [],
  top_collaborators: [],
  top_tags: [],
  source_status: [],
  ...overrides,
});

export const makeSocialAccountDashboardPayload = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  data: {
    summary: makeSocialAccountSummary(),
    catalog_run_progress: null,
  },
  freshness: {
    status: "fresh",
    source: "live",
    generated_at: "2026-04-26T12:03:00.000Z",
    age_seconds: 0,
  },
  operational_alerts: [],
  ...overrides,
});
