export interface BrandShowFranchiseRow {
  show_id: string;
  show_name: string;
  canonical_slug: string | null;
  networks: string[];
  franchise_key: string | null;
  franchise_name: string | null;
  explicit_fandom_url: string | null;
  fallback_fandom_url: string | null;
  effective_fandom_url: string | null;
  effective_source: "explicit" | "fallback" | "rule_default" | "none" | string;
  rule_candidates: string[];
  include_allpages_scan: boolean;
}

export interface GenericLinkRule {
  id: string;
  family_id: string | null;
  link_group: string;
  link_kind: string;
  label: string | null;
  url: string;
  coverage_type: string;
  coverage_value: string | null;
  source: string;
  auto_apply: boolean;
  is_active: boolean;
  priority: number;
  metadata: Record<string, unknown>;
  updated_at: string | null;
}

export interface FranchiseRule {
  key: string;
  name: string;
  primary_url: string;
  review_allpages_url: string | null;
  match_terms: string[];
  aliases: string[];
  community_domains: string[];
  include_allpages_scan: boolean;
  source_rank: number;
  network_terms: string[];
  is_active: boolean;
  rule_version: number;
  updated_at?: string | null;
  updated_by?: string | null;
  definition_row_id?: string | null;
  matched_show_count: number;
  applied_fallback_count: number;
  candidate_urls: string[];
}

export interface FranchiseRuleApplyResult {
  franchise_key: string;
  rule_name: string;
  matched_show_count: number;
  applied_show_count: number;
  links_upserted: number;
  skipped_explicit: number;
  skipped_already_fallback: number;
  skipped_existing_manual?: number;
  updated_derived_count?: number;
  errors?: Array<Record<string, unknown>>;
  missing_only: boolean;
  dry_run: boolean;
  applied: Array<{
    show_id: string;
    show_name: string;
    canonical_slug: string | null;
    urls: string[];
    dry_run: boolean;
  }>;
}
