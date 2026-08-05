import type { AssetSectionKey } from "@/lib/admin/asset-sectioning";
import type { CastRefreshPhaseProgress } from "@/lib/admin/cast-refresh-orchestration";
import type { RefreshLogTopicKey } from "@/lib/admin/refresh-log-pipeline";

export type ShowSyncWarningSample = {
  season_number?: number | null;
  episode_number?: number | null;
  title?: string | null;
  air_date?: string | null;
  tmdb_episode_id?: number | null;
};

export type ShowSyncWarning = {
  code: string;
  severity?: "info" | "warning" | "error" | string;
  message: string;
  count?: number | null;
  ignored_season_zero_count?: number | null;
  samples?: ShowSyncWarningSample[] | null;
};

export interface TrrShow {
  id: string;
  name: string;
  slug: string;
  canonical_slug: string;
  alternative_names: string[];
  overview_alternative_names?: string[] | null;
  imdb_id: string | null;
  tmdb_id: number | null;
  external_ids?: Record<string, unknown> | null;
  derived_external_links?: {
    justwatch_url?: string | null;
  } | null;
  overview_watch_availability?: Array<{
    region: "US" | "GB" | "CA" | "AU";
    stream: string[];
    buy: string[];
  }> | null;
  watch_provider_regions?: Array<{
    region: string;
    stream: string[];
    free: string[];
    buy_rent: string[];
  }> | null;
  show_total_seasons: number | null;
  show_total_episodes: number | null;
  description: string | null;
  premiere_date: string | null;
  networks: string[];
  overview_networks?: string[] | null;
  genres: string[];
  tags: string[];
  tmdb_status: string | null;
  tmdb_vote_average: number | null;
  imdb_rating_value: number | null;
  primary_poster_image_id?: string | null;
  primary_backdrop_image_id?: string | null;
  primary_logo_image_id?: string | null;
  logo_url?: string | null;
  streaming_providers?: string[] | null;
  overview_streaming_providers?: string[] | null;
  watch_providers?: string[] | null;
  sync_warnings?: ShowSyncWarning[] | null;
}

export interface ShowRedditCommunity {
  id: string;
  subreddit: string;
  display_name: string | null;
  post_flairs: string[];
  analysis_flairs: string[];
  analysis_all_flairs: string[];
  is_show_focused: boolean;
  network_focus_targets: string[];
  franchise_focus_targets: string[];
}

export interface TrrSeason {
  id: string;
  show_id: string;
  season_number: number;
  name: string | null;
  title: string | null;
  overview: string | null;
  air_date: string | null;
  premiere_date?: string | null;
  url_original_poster: string | null;
  tmdb_season_id: number | null;
  episode_count?: number | null;
  episode_airdate_count?: number | null;
  first_episode_air_date?: string | null;
  last_episode_air_date?: string | null;
  fandom_source_url?: string | null;
  fandom_page_title?: string | null;
}

export type SeasonEpisodeSummary = {
  count: number;
  premiereDate: string | null;
  finaleDate: string | null;
};

export interface TrrCastMember {
  id: string;
  person_id: string;
  full_name: string | null;
  cast_member_name: string | null;
  role: string | null;
  roles?: string[] | null;
  billing_order: number | null;
  credit_category: string;
  photo_url: string | null;
  cover_photo_url: string | null;
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
  total_episodes?: number | null;
  archive_episode_count?: number | null;
  latest_season?: number | null;
  seasons_appeared?: number[] | null;
}

export type ShowCastEligibilityMode = "default" | "links";

export type EntityLinkType = "show" | "season" | "person";
export type EntityLinkGroup =
  | "official"
  | "social"
  | "knowledge"
  | "cast_announcements"
  | "other";
export type EntityLinkStatus = "pending" | "approved" | "rejected";

export interface EntityLink {
  id: string;
  show_id: string;
  entity_type: EntityLinkType;
  entity_id: string;
  season_number: number;
  link_group: EntityLinkGroup;
  link_kind: string;
  label: string | null;
  url: string;
  status: EntityLinkStatus;
  confidence: number | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ShowRole {
  id: string;
  show_id: string;
  name: string;
  normalized_name: string;
  sort_order: number;
  is_active: boolean;
}

export interface CastRoleMember {
  person_id: string;
  person_name: string | null;
  total_episodes: number | null;
  seasons_appeared: number | null;
  latest_season: number | null;
  roles: string[];
  photo_url: string | null;
}

export interface ShowCrewCreditRow {
  credit_id: string;
  person_id: string;
  person_name: string | null;
  role: string | null;
  billing_order: number | null;
  source_type: string | null;
  episode_count: number | null;
  episodes_label: string | null;
  years_label: string | null;
  imdb_name_id: string | null;
  display_order: number | null;
}

export interface ShowCrewGroupedRow {
  person_id: string;
  person_name: string | null;
  role_lines: ShowCrewCreditRow[];
}

export interface ShowCrewSection {
  title: string;
  rows: ShowCrewCreditRow[];
  grouped_rows?: ShowCrewGroupedRow[];
}

export interface ShowCreditsPayload {
  cast_roster: Array<Record<string, unknown>>;
  crew_sections: ShowCrewSection[];
  source_metadata?: {
    source_page_url?: string | null;
    show_imdb_id?: string | null;
    last_synced_at?: string | null;
  } | null;
}

export interface BravoPersonTag {
  person_id?: string | null;
  person_name?: string | null;
  person_url?: string | null;
}

export interface BravoVideoItem {
  title?: string | null;
  runtime?: string | null;
  kicker?: string | null;
  image_url?: string | null;
  hosted_image_url?: string | null;
  original_image_url?: string | null;
  media_asset_id?: string | null;
  thumbnail_sync_status?: string | null;
  thumbnail_sync_error?: string | null;
  clip_url: string;
  season_number?: number | null;
  published_at?: string | null;
  person_tags?: BravoPersonTag[];
}

export interface BravoNewsItem {
  headline?: string | null;
  image_url?: string | null;
  article_url: string;
  published_at?: string | null;
  person_tags?: BravoPersonTag[];
}

export interface UnifiedNewsSeasonMatch {
  season_number?: number | null;
  match_types?: string[] | null;
}

export interface UnifiedNewsItem {
  source_id?: string | null;
  headline?: string | null;
  article_url: string;
  canonical_article_url?: string | null;
  image_url?: string | null;
  hosted_image_url?: string | null;
  original_image_url?: string | null;
  mirror_status?: string | null;
  mirror_attempt_count?: number | null;
  last_mirror_attempt_at?: string | null;
  last_mirror_success_at?: string | null;
  last_mirror_error?: string | null;
  mirror_retry_after?: string | null;
  published_at?: string | null;
  publisher_name?: string | null;
  publisher_domain?: string | null;
  person_tags?: BravoPersonTag[];
  topic_tags?: string[] | null;
  season_matches?: UnifiedNewsSeasonMatch[] | null;
  feed_rank?: number | null;
  trending_rank?: number | null;
  quality_score?: number | null;
}

export interface UnifiedNewsFacetSource {
  token: string;
  label: string;
  count: number;
}

export interface UnifiedNewsFacetPerson {
  person_id: string;
  person_name: string;
  count: number;
}

export interface UnifiedNewsFacetTopic {
  topic: string;
  count: number;
}

export interface UnifiedNewsFacetSeason {
  season_number: number;
  count: number;
}

export interface UnifiedNewsFacets {
  sources: UnifiedNewsFacetSource[];
  people: UnifiedNewsFacetPerson[];
  topics: UnifiedNewsFacetTopic[];
  seasons: UnifiedNewsFacetSeason[];
}

export interface BravoPreviewPerson {
  name?: string | null;
  canonical_url?: string | null;
  bio?: string | null;
  hero_image_url?: string | null;
  social_links?: Record<string, string> | null;
}

export interface BravoPersonCandidateResult {
  url: string;
  source?: "bravo" | "fandom";
  name?: string | null;
  status?: "pending" | "in_progress" | "ok" | "missing" | "error" | string;
  error?: string | null;
  person?: BravoPreviewPerson | null;
}

export type BravoCandidateSummary = {
  tested: number;
  valid: number;
  missing: number;
  errors: number;
};

export type BravoImportImageKind =
  | "poster"
  | "backdrop"
  | "logo"
  | "episode_still"
  | "cast"
  | "promo"
  | "intro"
  | "reunion"
  | "other";

export type SyncBravoRunMode = "full" | "cast-only";
export type TabId =
  | "seasons"
  | "assets"
  | "news"
  | "cast"
  | "surveys"
  | "social"
  | "details"
  | "settings";
export type ShowCastSource = "episode_evidence" | "show_fallback" | "imdb_show_membership";
export type ShowCastRosterMode = "episode_evidence" | "imdb_show_membership";
export type CastPhotoFallbackMode = "none" | "bravo";
export type ShowRefreshTarget =
  | "details"
  | "seasons_episodes"
  | "photos"
  | "cast_credits"
  | "videos"
  | "news"
  | "social_setup"
  | "show_core"
  | "links"
  | "bravo"
  | "cast_profiles"
  | "cast_media"
  | "get_images";
export type ShowTab = { id: TabId; label: string; icon?: "home" };
export type RefreshProgressState = {
  stage?: string | null;
  message?: string | null;
  current: number | null;
  total: number | null;
};

export type RefreshLogEntry = {
  id: string;
  at: string;
  category: string;
  message: string;
  current: number | null;
  total: number | null;
  stageKey?: string | null;
  topic?: RefreshLogTopicKey | null;
  provider?: string | null;
  subOperationId?: string | null;
  executionOwner?: string | null;
  parentOperationId?: string | null;
};

export type RoleRenameDraft = {
  roleId: string;
  originalName: string;
  nextName: string;
};

export type CastRoleEditDraft = {
  personId: string;
  personName: string;
  roleCsv: string;
};

export type CastRunFailedMember = {
  personId: string;
  name: string;
  reason: string;
};

export type CastBatchRunSummary = {
  attempted: number;
  succeeded: number;
  skipped: number;
  failed: number;
  failedMembers: CastRunFailedMember[];
};

export type ShowRefreshRunOptions = {
  photoMode?: "fast" | "full";
  skipCastPhotos?: boolean;
  includeCastProfiles?: boolean;
  suppressSuccessNotice?: boolean;
  onProgress?: (progress: Partial<CastRefreshPhaseProgress>) => void;
};

export type PersonRefreshMode = "full" | "ingest_only" | "profile_only";
export type HealthStatus = "ready" | "missing" | "stale";
export type PersonLinkSourceKey = "bravo" | "imdb" | "tmdb" | "wikipedia" | "wikidata" | "fandom";
export type PersonLinkSourceState = "missing" | "unvalidated";
export type LinkSourceBadgeKind =
  | PersonLinkSourceKey
  | "official"
  | "google_news"
  | "instagram"
  | "tiktok"
  | "x"
  | "youtube"
  | "threads"
  | "facebook"
  | "reddit"
  | "tvdb"
  | "tvmaze"
  | "trakt"
  | "freebase"
  | "google_kg"
  | "ratinggraph"
  | "x_topic"
  | "other";

export type PersonLinkSourceSummary = {
  key: PersonLinkSourceKey;
  label: string;
  state: PersonLinkSourceState;
  url: string | null;
  link: EntityLink | null;
};

export type ShowSocialLinkPill = {
  id: string;
  sourceKind: LinkSourceBadgeKind;
  sourceLabel: string;
  text: string;
  url: string;
  link: EntityLink;
};

export type PersonApprovedLinkPill = {
  id: string;
  sourceKind: LinkSourceBadgeKind;
  sourceLabel: string;
  text: string;
  label: string;
  url: string;
  iconUrl: string | null;
  link: EntityLink;
};

export type PersonLinkCoverageCard = {
  personId: string;
  personName: string;
  avatarUrl: string | null;
  seasons: number[];
  approvedLinkCount: number;
  approvedLinks: PersonApprovedLinkPill[];
  missingSources: PersonLinkSourceSummary[];
};

export type SeasonCoverageLinkPill = {
  id: string;
  seasonNumber: number;
  url: string;
  sourceKind: LinkSourceBadgeKind;
  sourceLabel: string;
  iconUrl: string | null;
  linkTitle: string | null;
  link?: EntityLink;
};

export type SeasonUrlCoverageRow = {
  seasonNumber: number;
  links: SeasonCoverageLinkPill[];
};

export type ShowGalleryVisibleBySection = Partial<Record<AssetSectionKey, number>>;

export type GalleryAssetSourceRequest = {
  id: string;
  label: string;
  baseUrl: string;
};

export type GalleryAssetSourceFailure = {
  sourceId: string;
  label: string;
  message: string;
  status: number;
  retryable: boolean;
  code?: string;
  reason?: string;
  detail?: Record<string, unknown>;
};

export class GalleryAssetSourceError extends Error {
  status: number;
  retryable: boolean;
  code?: string;
  reason?: string;
  detail?: Record<string, unknown>;

  constructor({
    message,
    status,
    retryable,
    code,
    reason,
    detail,
  }: {
    message: string;
    status: number;
    retryable: boolean;
    code?: string;
    reason?: string;
    detail?: Record<string, unknown>;
  }) {
    super(message);
    this.name = "GalleryAssetSourceError";
    this.status = status;
    this.retryable = retryable;
    this.code = code;
    this.reason = reason;
    this.detail = detail;
  }
}

export const buildSeasonEpisodeSummary = (season: TrrSeason): SeasonEpisodeSummary | null => {
  const count =
    typeof season.episode_count === "number"
      ? season.episode_count
      : typeof season.episode_airdate_count === "number"
        ? season.episode_airdate_count
        : null;
  const premiereDate =
    season.first_episode_air_date ?? season.premiere_date ?? season.air_date ?? null;
  const finaleDate =
    season.last_episode_air_date ?? season.air_date ?? season.premiere_date ?? premiereDate;

  if (count === null && !premiereDate && !finaleDate) return null;

  return {
    count: count ?? 0,
    premiereDate,
    finaleDate,
  };
};

export const buildSeasonEpisodeSummaryMap = (
  seasonList: TrrSeason[]
): Record<string, SeasonEpisodeSummary> => {
  const summaries: Record<string, SeasonEpisodeSummary> = {};
  for (const season of seasonList) {
    const summary = buildSeasonEpisodeSummary(season);
    if (!summary) continue;
    summaries[season.id] = summary;
  }
  return summaries;
};

export const normalizeErrorMessage = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((entry) => normalizeErrorMessage(entry))
      .filter((entry): entry is string => Boolean(entry));
    return messages.length > 0 ? messages.join("; ") : null;
  }

  if (value && typeof value === "object") {
    const candidate = value as {
      detail?: unknown;
      error?: unknown;
      msg?: unknown;
      message?: unknown;
    };
    return (
      normalizeErrorMessage(candidate.error) ??
      normalizeErrorMessage(candidate.detail) ??
      normalizeErrorMessage(candidate.msg) ??
      normalizeErrorMessage(candidate.message) ??
      JSON.stringify(value)
    );
  }

  return null;
};

export const normalizeShowCreditsCastRoster = (value: unknown): TrrCastMember[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const candidate = row as Record<string, unknown>;
      const personId =
        typeof candidate.person_id === "string" ? candidate.person_id.trim() : "";
      if (!personId) return null;
      const roles = Array.isArray(candidate.roles)
        ? candidate.roles.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0
          )
        : [];
      const seasonNumbers = Array.isArray(candidate.season_numbers)
        ? candidate.season_numbers.filter(
            (item): item is number => typeof item === "number" && Number.isFinite(item)
          )
        : [];
      return {
        id:
          typeof candidate.person_id === "string" && candidate.person_id.trim()
            ? candidate.person_id.trim()
            : typeof candidate.show_id === "string"
              ? `${candidate.show_id}:${personId}`
              : personId,
        person_id: personId,
        full_name:
          typeof candidate.person_name === "string" && candidate.person_name.trim()
            ? candidate.person_name
            : null,
        cast_member_name:
          typeof candidate.person_name === "string" && candidate.person_name.trim()
            ? candidate.person_name
            : null,
        role: roles[0] ?? null,
        roles,
        billing_order: null,
        credit_category: "Self",
        photo_url:
          typeof candidate.photo_url === "string" && candidate.photo_url.trim()
            ? candidate.photo_url
            : null,
        cover_photo_url: null,
        total_episodes:
          typeof candidate.total_episodes === "number" ? candidate.total_episodes : null,
        archive_episode_count:
          typeof candidate.archive_episodes === "number" ? candidate.archive_episodes : null,
        latest_season:
          typeof candidate.latest_season === "number" ? candidate.latest_season : null,
        seasons_appeared: seasonNumbers,
      } as TrrCastMember;
    })
    .filter((row): row is TrrCastMember => row !== null);
};

const shouldHideShowCreditsRoleChip = (role: string): boolean => {
  const normalized = role.trim().toLowerCase();
  return (
    normalized === "cast" ||
    normalized === "self" ||
    normalized.startsWith("self ") ||
    normalized.startsWith("self-") ||
    normalized.startsWith("self/")
  );
};

export const getMeaningfulShowCreditsRoles = (
  roles: string[] | null | undefined
): string[] => {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) => role.trim())
    .filter((role) => role.length > 0 && !shouldHideShowCreditsRoleChip(role));
};

export const groupShowCrewRows = (rows: ShowCrewCreditRow[]): ShowCrewGroupedRow[] => {
  const grouped = new Map<string, ShowCrewGroupedRow>();
  const orderedKeys: string[] = [];

  for (const row of rows) {
    const personId =
      typeof row.person_id === "string" && row.person_id.trim()
        ? row.person_id.trim()
        : row.credit_id;
    const existing = grouped.get(personId);
    if (existing) {
      existing.role_lines.push(row);
      continue;
    }
    grouped.set(personId, {
      person_id: personId,
      person_name: row.person_name,
      role_lines: [row],
    });
    orderedKeys.push(personId);
  }

  return orderedKeys
    .map((key) => grouped.get(key))
    .filter((row): row is ShowCrewGroupedRow => Boolean(row));
};
