import type { AssetSectionKey } from "@/lib/admin/asset-sectioning";
import type { RefreshLogTopicKey } from "@/lib/admin/refresh-log-pipeline";

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
export type ShowRefreshTarget = "details" | "seasons_episodes" | "photos" | "cast_credits";

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
};

export type LinkEditDraft = {
  linkId: string;
  label: string;
  url: string;
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

export type ShowRefreshRunOptions = {
  photoMode?: "fast" | "full";
  includeCastProfiles?: boolean;
  suppressSuccessNotice?: boolean;
};

export type PersonRefreshMode = "full" | "ingest_only" | "profile_only";

export type HealthStatus = "ready" | "missing" | "stale";
export type PersonLinkSourceKey = "bravo" | "imdb" | "tmdb" | "wikipedia" | "wikidata" | "fandom";
export type PersonLinkSourceState = "found" | "missing" | "pending" | "rejected";

export type PersonLinkSourceSummary<TLink = unknown> = {
  key: PersonLinkSourceKey;
  label: string;
  state: PersonLinkSourceState;
  url: string | null;
  link: TLink | null;
};

export type PersonLinkCoverageCard<TLink = unknown> = {
  personId: string;
  personName: string;
  seasons: number[];
  sources: PersonLinkSourceSummary<TLink>[];
};

export type ShowGalleryVisibleBySection = Partial<Record<AssetSectionKey, number>>;

export type BatchJobOperation = "count" | "crop" | "id_text" | "resize";

export type ShowDetailsForm = {
  displayName: string;
  nickname: string;
  altNamesText: string;
  description: string;
  premiereDate: string;
};
