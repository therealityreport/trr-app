import "server-only";

import {
  AdminReadProxyError,
  type AdminBackendJsonResult,
} from "@/lib/server/trr-api/admin-read-proxy";

const SUMMARY_KEYS = new Set(["totals", "rows", "generated_at"]);
const TOTAL_KEYS = new Set(["total_available_shows", "total_added_shows"]);
const ROW_KEYS = new Set([
  "type",
  "name",
  "available_show_count",
  "added_show_count",
  "hosted_logo_url",
  "hosted_logo_black_url",
  "hosted_logo_white_url",
  "wikidata_id",
  "wikipedia_url",
  "tmdb_entity_id",
  "homepage_url",
  "resolution_status",
  "resolution_reason",
  "last_attempt_at",
  "has_logo",
  "has_bw_variants",
  "has_links",
]);
const DETAIL_KEYS = new Set([
  "entity_type",
  "entity_key",
  "entity_slug",
  "display_name",
  "available_show_count",
  "added_show_count",
  "core",
  "override",
  "completion",
  "logo_assets",
  "shows",
  "family",
  "family_suggestions",
  "shared_links",
  "wikipedia_show_urls",
]);
const CORE_DETAIL_KEYS = new Set([
  "entity_id",
  "origin_country",
  "display_priority",
  "tmdb_logo_path",
  "logo_path",
  "hosted_logo_key",
  "hosted_logo_url",
  "hosted_logo_black_url",
  "hosted_logo_white_url",
  "wikidata_id",
  "wikipedia_url",
  "wikimedia_logo_file",
  "link_enriched_at",
  "link_enrichment_source",
  "facebook_id",
  "instagram_id",
  "twitter_id",
  "tiktok_id",
]);
const OVERRIDE_DETAIL_KEYS = new Set([
  "id",
  "display_name_override",
  "wikidata_id_override",
  "wikipedia_url_override",
  "logo_source_urls_override",
  "source_priority_override",
  "aliases_override",
  "notes",
  "is_active",
  "updated_by",
  "updated_at",
]);
const COMPLETION_DETAIL_KEYS = new Set([
  "resolution_status",
  "resolution_reason",
  "last_attempt_at",
]);
const LOGO_ASSET_KEYS = new Set([
  "id",
  "source",
  "source_url",
  "source_rank",
  "hosted_logo_url",
  "hosted_logo_content_type",
  "base_logo_format",
  "pixel_width",
  "pixel_height",
  "mirror_status",
  "failure_reason",
  "is_primary",
  "updated_at",
]);
const DETAIL_SHOW_KEYS = new Set([
  "trr_show_id",
  "show_name",
  "canonical_slug",
  "poster_url",
]);
const FAMILY_MEMBER_KEYS = new Set([
  "id",
  "family_id",
  "entity_type",
  "entity_key",
  "entity_display_name",
  "source",
  "confidence",
  "metadata",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]);
const FAMILY_KEYS = new Set([
  "id",
  "family_key",
  "display_name",
  "owner_wikidata_id",
  "owner_label",
  "is_active",
  "notes",
  "metadata",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
  "members",
]);
const FAMILY_SUGGESTION_ENTITY_KEYS = new Set([
  "entity_type",
  "entity_key",
  "display_name",
  "updated_at",
]);
const FAMILY_SUGGESTION_KEYS = new Set([
  "owner_wikidata_id",
  "owner_label",
  "entity_count",
  "entities",
]);
const SHARED_LINK_KEYS = new Set([
  "id",
  "family_id",
  "link_group",
  "link_kind",
  "label",
  "url",
  "url_key",
  "coverage_type",
  "coverage_value",
  "source",
  "priority",
  "auto_apply",
  "is_active",
  "metadata",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
]);
const WIKIPEDIA_SHOW_URL_KEYS = new Set([
  "id",
  "family_id",
  "entity_type",
  "entity_key",
  "brand_wikipedia_url",
  "show_url",
  "show_url_key",
  "show_title",
  "wikidata_id",
  "matched_show_id",
  "match_method",
  "import_source",
  "is_applied",
  "metadata",
  "last_seen_at",
  "created_at",
  "updated_at",
]);
const SUGGESTION_KEYS = new Set([
  "entity_type",
  "name",
  "entity_slug",
  "available_show_count",
  "added_show_count",
]);
const GATEWAY_FALLBACK_STATUSES = new Set([502, 503, 504]);
const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const LEGACY_POSTGRES_DATE_TIME =
  /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(\.\d+)?([+-]\d{2}(?::?\d{2})?)$/;
const FALLBACK_ERROR_CODES = new Set([
  "BACKEND_NOT_CONFIGURED",
  "BACKEND_UNREACHABLE",
  "BACKEND_TIMEOUT",
  "BACKEND_REQUEST_TIMEOUT",
]);

export interface NetworkStreamingSummaryRow {
  type: "network" | "streaming" | "production";
  name: string;
  available_show_count: number;
  added_show_count: number;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  wikidata_id: string | null;
  wikipedia_url: string | null;
  tmdb_entity_id: string | null;
  homepage_url: string | null;
  resolution_status: "resolved" | "manual_required" | "failed" | null;
  resolution_reason: string | null;
  last_attempt_at: string | null;
  has_logo: boolean;
  has_bw_variants: boolean;
  has_links: boolean;
}

export interface NetworkStreamingSummaryTotals {
  total_available_shows: number;
  total_added_shows: number;
}

export interface NetworkStreamingSummary {
  totals: NetworkStreamingSummaryTotals;
  rows: NetworkStreamingSummaryRow[];
  generated_at: string;
}

export type NetworkStreamingEntityType = "network" | "streaming" | "production";
export type NetworkStreamingResolutionStatus =
  | "resolved"
  | "manual_required"
  | "failed";

export interface NetworkStreamingDetailInput {
  entity_type: NetworkStreamingEntityType;
  entity_key?: string | null;
  entity_slug?: string | null;
  show_scope: "added";
}

export interface NetworkStreamingDetailShowRow {
  trr_show_id: string;
  show_name: string;
  canonical_slug: string | null;
  poster_url: string | null;
}

export interface NetworkStreamingDetailLogoAsset {
  id: string;
  source: string;
  source_url: string;
  source_rank: number;
  hosted_logo_url: string | null;
  hosted_logo_content_type: string | null;
  base_logo_format: string;
  pixel_width: number | null;
  pixel_height: number | null;
  mirror_status: "mirrored" | "skipped" | "failed";
  failure_reason: string | null;
  is_primary: boolean;
  updated_at: string | null;
}

export interface NetworkStreamingFamilyMember {
  id: string;
  family_id: string;
  entity_type: "network" | "streaming";
  entity_key: string;
  entity_display_name: string;
  source: string;
  confidence: number | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NetworkStreamingFamily {
  id: string;
  family_key: string;
  display_name: string;
  owner_wikidata_id: string | null;
  owner_label: string | null;
  is_active: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  members: NetworkStreamingFamilyMember[];
}

export interface NetworkStreamingFamilySuggestion {
  owner_wikidata_id: string;
  owner_label: string;
  entity_count: number;
  entities: Array<{
    entity_type: NetworkStreamingEntityType;
    entity_key: string;
    display_name: string;
    updated_at: string;
  }>;
}

export interface NetworkStreamingSharedLink {
  id: string;
  family_id: string;
  link_group: "official" | "social" | "knowledge" | "cast_announcements" | "other";
  link_kind: string;
  label: string | null;
  url: string;
  url_key: string;
  coverage_type:
    | "family_all_shows"
    | "family_network_shows"
    | "family_streaming_shows"
    | "franchise_rule"
    | "show_wikidata_exact"
    | "show_name_contains";
  coverage_value: string | null;
  source: string;
  priority: number;
  auto_apply: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface NetworkStreamingWikipediaShowUrl {
  id: string;
  family_id: string;
  entity_type: "network" | "streaming";
  entity_key: string;
  brand_wikipedia_url: string | null;
  show_url: string;
  show_url_key: string;
  show_title: string | null;
  wikidata_id: string | null;
  matched_show_id: string | null;
  match_method: string | null;
  import_source: string;
  is_applied: boolean;
  metadata: Record<string, unknown>;
  last_seen_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NetworkStreamingSuggestion {
  entity_type: NetworkStreamingEntityType;
  name: string;
  entity_slug: string;
  available_show_count: number;
  added_show_count: number;
}

export interface NetworkStreamingDetail {
  entity_type: NetworkStreamingEntityType;
  entity_key: string;
  entity_slug: string;
  display_name: string;
  available_show_count: number;
  added_show_count: number;
  core: {
    entity_id: string | null;
    origin_country: string | null;
    display_priority: number | null;
    tmdb_logo_path: string | null;
    logo_path: string | null;
    hosted_logo_key: string | null;
    hosted_logo_url: string | null;
    hosted_logo_black_url: string | null;
    hosted_logo_white_url: string | null;
    wikidata_id: string | null;
    wikipedia_url: string | null;
    wikimedia_logo_file: string | null;
    link_enriched_at: string | null;
    link_enrichment_source: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
    tiktok_id: string | null;
  };
  override: {
    id: string | null;
    display_name_override: string | null;
    wikidata_id_override: string | null;
    wikipedia_url_override: string | null;
    logo_source_urls_override: string[];
    source_priority_override: string[];
    aliases_override: string[];
    notes: string | null;
    is_active: boolean;
    updated_by: string | null;
    updated_at: string | null;
  };
  completion: {
    resolution_status: NetworkStreamingResolutionStatus | null;
    resolution_reason: string | null;
    last_attempt_at: string | null;
  };
  logo_assets: NetworkStreamingDetailLogoAsset[];
  shows: NetworkStreamingDetailShowRow[];
  family: NetworkStreamingFamily | null;
  family_suggestions: NetworkStreamingFamilySuggestion[];
  shared_links: NetworkStreamingSharedLink[];
  wikipedia_show_urls: NetworkStreamingWikipediaShowUrl[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
  Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));

const isNonnegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isSafeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value);

const isNullableSafeInteger = (value: unknown): value is number | null =>
  value === null || isSafeInteger(value);

const isNullableNonnegativeInteger = (value: unknown): value is number | null =>
  value === null || isNonnegativeInteger(value);

const isEntityType = (value: unknown): value is NetworkStreamingEntityType =>
  value === "network" || value === "streaming" || value === "production";

const isFamilyEntityType = (value: unknown): value is "network" | "streaming" =>
  value === "network" || value === "streaming";

const isResolutionStatus = (value: unknown): value is NetworkStreamingResolutionStatus =>
  value === "resolved" || value === "manual_required" || value === "failed";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isEntitySlug = (value: unknown): value is string =>
  isNonemptyString(value) && /^[a-z0-9]+(?:-+[a-z0-9]+)*$/.test(value);

const isIsoDateString = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = RFC3339_DATE_TIME.exec(value);
  if (!match || Number.isNaN(Date.parse(value))) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
};

const isNullableIsoDateString = (value: unknown): value is string | null =>
  value === null || isIsoDateString(value);

const invalidBackendResponse = (): AdminReadProxyError =>
  new AdminReadProxyError("TRR-Backend returned an invalid networks/streaming summary", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });

export const invalidNetworksStreamingDetailResponse = (): AdminReadProxyError =>
  new AdminReadProxyError("TRR-Backend returned an invalid networks/streaming detail", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });

const normalizeLegacyDateTime = (value: unknown): string | null => {
  if (value === null) return null;
  if (isIsoDateString(value)) return value;
  if (typeof value !== "string") throw invalidNetworksStreamingDetailResponse();
  const match = LEGACY_POSTGRES_DATE_TIME.exec(value);
  if (!match) throw invalidNetworksStreamingDetailResponse();
  let offset = match[4];
  if (/^[+-]\d{2}$/.test(offset)) {
    offset = `${offset}:00`;
  } else if (/^[+-]\d{4}$/.test(offset)) {
    offset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
  }
  const normalized = `${match[1]}T${match[2]}${match[3] ?? ""}${offset}`;
  if (!isIsoDateString(normalized)) throw invalidNetworksStreamingDetailResponse();
  return normalized;
};

const normalizeLegacyRecordDates = (
  value: unknown,
  fields: readonly string[],
): unknown => {
  if (!isRecord(value)) return value;
  const normalized = { ...value };
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(normalized, field)) {
      normalized[field] = normalizeLegacyDateTime(normalized[field]);
    }
  }
  return normalized;
};

export const normalizeLegacyDetailDateTimes = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const normalized = { ...value };
  normalized.core = normalizeLegacyRecordDates(normalized.core, ["link_enriched_at"]);
  normalized.override = normalizeLegacyRecordDates(normalized.override, ["updated_at"]);
  normalized.completion = normalizeLegacyRecordDates(normalized.completion, ["last_attempt_at"]);
  if (Array.isArray(normalized.logo_assets)) {
    normalized.logo_assets = normalized.logo_assets.map((entry) =>
      normalizeLegacyRecordDates(entry, ["updated_at"]),
    );
  }
  if (isRecord(normalized.family)) {
    const family = normalizeLegacyRecordDates(normalized.family, ["created_at", "updated_at"]);
    if (isRecord(family) && Array.isArray(family.members)) {
      family.members = family.members.map((member) =>
        normalizeLegacyRecordDates(member, ["created_at", "updated_at"]),
      );
    }
    normalized.family = family;
  }
  if (Array.isArray(normalized.family_suggestions)) {
    normalized.family_suggestions = normalized.family_suggestions.map((suggestion) => {
      if (!isRecord(suggestion) || !Array.isArray(suggestion.entities)) return suggestion;
      return {
        ...suggestion,
        entities: suggestion.entities.map((entity) =>
          normalizeLegacyRecordDates(entity, ["updated_at"]),
        ),
      };
    });
  }
  if (Array.isArray(normalized.shared_links)) {
    normalized.shared_links = normalized.shared_links.map((link) =>
      normalizeLegacyRecordDates(link, ["created_at", "updated_at"]),
    );
  }
  if (Array.isArray(normalized.wikipedia_show_urls)) {
    normalized.wikipedia_show_urls = normalized.wikipedia_show_urls.map((entry) =>
      normalizeLegacyRecordDates(entry, ["last_seen_at", "created_at", "updated_at"]),
    );
  }
  return normalized;
};

const readProblemCode = (data: Record<string, unknown>): string | null => {
  if (typeof data.code === "string") return data.code;
  const detail = isRecord(data.detail) ? data.detail : null;
  return typeof detail?.code === "string" ? detail.code : null;
};

export const shouldFallbackNetworksStreamingResponse = (
  upstream: AdminBackendJsonResult,
): boolean => {
  if (
    upstream.status === 404 &&
    Object.keys(upstream.data).length === 1 &&
    upstream.data.detail === "Not Found"
  ) {
    return true;
  }
  if (upstream.status === 405 && readProblemCode(upstream.data) === null) return true;
  return GATEWAY_FALLBACK_STATUSES.has(upstream.status) && readProblemCode(upstream.data) === null;
};

export const shouldFallbackNetworksStreamingError = (error: unknown): boolean =>
  error instanceof AdminReadProxyError &&
  typeof error.code === "string" &&
  FALLBACK_ERROR_CODES.has(error.code);

const parseSummaryRow = (value: unknown): NetworkStreamingSummaryRow => {
  if (!isRecord(value) || !hasExactKeys(value, ROW_KEYS)) throw invalidBackendResponse();
  if (
    (value.type !== "network" && value.type !== "streaming" && value.type !== "production") ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    !isNonnegativeInteger(value.available_show_count) ||
    !isNonnegativeInteger(value.added_show_count) ||
    !isNullableString(value.hosted_logo_url) ||
    !isNullableString(value.hosted_logo_black_url) ||
    !isNullableString(value.hosted_logo_white_url) ||
    !isNullableString(value.wikidata_id) ||
    !isNullableString(value.wikipedia_url) ||
    !isNullableString(value.tmdb_entity_id) ||
    !isNullableString(value.homepage_url) ||
    (value.resolution_status !== null &&
      value.resolution_status !== "resolved" &&
      value.resolution_status !== "manual_required" &&
      value.resolution_status !== "failed") ||
    !isNullableString(value.resolution_reason) ||
    (value.last_attempt_at !== null && !isIsoDateString(value.last_attempt_at)) ||
    typeof value.has_logo !== "boolean" ||
    typeof value.has_bw_variants !== "boolean" ||
    typeof value.has_links !== "boolean"
  ) {
    throw invalidBackendResponse();
  }
  return value as unknown as NetworkStreamingSummaryRow;
};

export const parseNetworksStreamingSummary = (value: unknown): NetworkStreamingSummary => {
  if (!isRecord(value) || !hasExactKeys(value, SUMMARY_KEYS)) throw invalidBackendResponse();
  if (
    !isRecord(value.totals) ||
    !hasExactKeys(value.totals, TOTAL_KEYS) ||
    !isNonnegativeInteger(value.totals.total_available_shows) ||
    !isNonnegativeInteger(value.totals.total_added_shows) ||
    !Array.isArray(value.rows) ||
    !isIsoDateString(value.generated_at)
  ) {
    throw invalidBackendResponse();
  }
  return {
    totals: {
      total_available_shows: value.totals.total_available_shows,
      total_added_shows: value.totals.total_added_shows,
    },
    rows: value.rows.map(parseSummaryRow),
    generated_at: value.generated_at,
  };
};

const parseCoreDetail = (value: unknown): NetworkStreamingDetail["core"] => {
  if (!isRecord(value) || !hasExactKeys(value, CORE_DETAIL_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  if (
    !isNullableString(value.entity_id) ||
    !isNullableString(value.origin_country) ||
    !isNullableSafeInteger(value.display_priority) ||
    !isNullableString(value.tmdb_logo_path) ||
    !isNullableString(value.logo_path) ||
    !isNullableString(value.hosted_logo_key) ||
    !isNullableString(value.hosted_logo_url) ||
    !isNullableString(value.hosted_logo_black_url) ||
    !isNullableString(value.hosted_logo_white_url) ||
    !isNullableString(value.wikidata_id) ||
    !isNullableString(value.wikipedia_url) ||
    !isNullableString(value.wikimedia_logo_file) ||
    !isNullableIsoDateString(value.link_enriched_at) ||
    !isNullableString(value.link_enrichment_source) ||
    !isNullableString(value.facebook_id) ||
    !isNullableString(value.instagram_id) ||
    !isNullableString(value.twitter_id) ||
    !isNullableString(value.tiktok_id)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return value as unknown as NetworkStreamingDetail["core"];
};

const parseOverrideDetail = (value: unknown): NetworkStreamingDetail["override"] => {
  if (!isRecord(value) || !hasExactKeys(value, OVERRIDE_DETAIL_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  if (
    !isNullableString(value.id) ||
    !isNullableString(value.display_name_override) ||
    !isNullableString(value.wikidata_id_override) ||
    !isNullableString(value.wikipedia_url_override) ||
    !isStringArray(value.logo_source_urls_override) ||
    !isStringArray(value.source_priority_override) ||
    !isStringArray(value.aliases_override) ||
    !isNullableString(value.notes) ||
    typeof value.is_active !== "boolean" ||
    !isNullableString(value.updated_by) ||
    !isNullableIsoDateString(value.updated_at)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return value as unknown as NetworkStreamingDetail["override"];
};

const parseCompletionDetail = (value: unknown): NetworkStreamingDetail["completion"] => {
  if (!isRecord(value) || !hasExactKeys(value, COMPLETION_DETAIL_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  if (
    (value.resolution_status !== null && !isResolutionStatus(value.resolution_status)) ||
    !isNullableString(value.resolution_reason) ||
    !isNullableIsoDateString(value.last_attempt_at)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return value as unknown as NetworkStreamingDetail["completion"];
};

const parseLogoAsset = (value: unknown): NetworkStreamingDetailLogoAsset => {
  if (!isRecord(value) || !hasExactKeys(value, LOGO_ASSET_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  if (
    !isNonemptyString(value.id) ||
    !isNonemptyString(value.source) ||
    !isNonemptyString(value.source_url) ||
    !isNonnegativeInteger(value.source_rank) ||
    !isNullableString(value.hosted_logo_url) ||
    !isNullableString(value.hosted_logo_content_type) ||
    !isNonemptyString(value.base_logo_format) ||
    !isNullableNonnegativeInteger(value.pixel_width) ||
    !isNullableNonnegativeInteger(value.pixel_height) ||
    (value.mirror_status !== "mirrored" &&
      value.mirror_status !== "skipped" &&
      value.mirror_status !== "failed") ||
    !isNullableString(value.failure_reason) ||
    typeof value.is_primary !== "boolean" ||
    !isNullableIsoDateString(value.updated_at)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return value as unknown as NetworkStreamingDetailLogoAsset;
};

const parseDetailShow = (value: unknown): NetworkStreamingDetailShowRow => {
  if (!isRecord(value) || !hasExactKeys(value, DETAIL_SHOW_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  if (
    !isNonemptyString(value.trr_show_id) ||
    !isNonemptyString(value.show_name) ||
    !isNullableString(value.canonical_slug) ||
    !isNullableString(value.poster_url)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return value as unknown as NetworkStreamingDetailShowRow;
};

const parseFamilyMember = (value: unknown): NetworkStreamingFamilyMember => {
  if (!isRecord(value) || !hasExactKeys(value, FAMILY_MEMBER_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  if (
    !isNonemptyString(value.id) ||
    !isNonemptyString(value.family_id) ||
    !isFamilyEntityType(value.entity_type) ||
    !isNonemptyString(value.entity_key) ||
    !isNonemptyString(value.entity_display_name) ||
    !isNonemptyString(value.source) ||
    (value.confidence !== null &&
      (typeof value.confidence !== "number" ||
        !Number.isFinite(value.confidence) ||
        value.confidence < 0 ||
        value.confidence > 1)) ||
    !isRecord(value.metadata) ||
    !isNullableString(value.created_by) ||
    !isNullableString(value.updated_by) ||
    !isNullableIsoDateString(value.created_at) ||
    !isNullableIsoDateString(value.updated_at)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return value as unknown as NetworkStreamingFamilyMember;
};

const parseFamily = (value: unknown): NetworkStreamingFamily | null => {
  if (value === null) return null;
  if (!isRecord(value) || !hasExactKeys(value, FAMILY_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  if (
    !isNonemptyString(value.id) ||
    !isNonemptyString(value.family_key) ||
    !isNonemptyString(value.display_name) ||
    !isNullableString(value.owner_wikidata_id) ||
    !isNullableString(value.owner_label) ||
    typeof value.is_active !== "boolean" ||
    !isNullableString(value.notes) ||
    !isRecord(value.metadata) ||
    !isNullableString(value.created_by) ||
    !isNullableString(value.updated_by) ||
    !isNullableIsoDateString(value.created_at) ||
    !isNullableIsoDateString(value.updated_at) ||
    !Array.isArray(value.members)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return {
    ...(value as unknown as Omit<NetworkStreamingFamily, "members">),
    members: value.members.map(parseFamilyMember),
  };
};

const parseFamilySuggestion = (value: unknown): NetworkStreamingFamilySuggestion => {
  if (!isRecord(value) || !hasExactKeys(value, FAMILY_SUGGESTION_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  if (
    !isNonemptyString(value.owner_wikidata_id) ||
    !isNonemptyString(value.owner_label) ||
    !isNonnegativeInteger(value.entity_count) ||
    value.entity_count < 2 ||
    !Array.isArray(value.entities)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  const entities = value.entities.map((entity) => {
    if (!isRecord(entity) || !hasExactKeys(entity, FAMILY_SUGGESTION_ENTITY_KEYS)) {
      throw invalidNetworksStreamingDetailResponse();
    }
    if (
      !isEntityType(entity.entity_type) ||
      !isNonemptyString(entity.entity_key) ||
      !isNonemptyString(entity.display_name) ||
      !isIsoDateString(entity.updated_at)
    ) {
      throw invalidNetworksStreamingDetailResponse();
    }
    return entity as unknown as NetworkStreamingFamilySuggestion["entities"][number];
  });
  return {
    owner_wikidata_id: value.owner_wikidata_id,
    owner_label: value.owner_label,
    entity_count: value.entity_count,
    entities,
  };
};

const parseSharedLink = (value: unknown): NetworkStreamingSharedLink => {
  if (!isRecord(value) || !hasExactKeys(value, SHARED_LINK_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  const validLinkGroup =
    value.link_group === "official" ||
    value.link_group === "social" ||
    value.link_group === "knowledge" ||
    value.link_group === "cast_announcements" ||
    value.link_group === "other";
  const validCoverageType =
    value.coverage_type === "family_all_shows" ||
    value.coverage_type === "family_network_shows" ||
    value.coverage_type === "family_streaming_shows" ||
    value.coverage_type === "franchise_rule" ||
    value.coverage_type === "show_wikidata_exact" ||
    value.coverage_type === "show_name_contains";
  if (
    !isNonemptyString(value.id) ||
    !isNonemptyString(value.family_id) ||
    !validLinkGroup ||
    !isNonemptyString(value.link_kind) ||
    !isNullableString(value.label) ||
    !isNonemptyString(value.url) ||
    !isNonemptyString(value.url_key) ||
    !validCoverageType ||
    !isNullableString(value.coverage_value) ||
    !isNonemptyString(value.source) ||
    !isSafeInteger(value.priority) ||
    typeof value.auto_apply !== "boolean" ||
    typeof value.is_active !== "boolean" ||
    !isRecord(value.metadata) ||
    !isNullableIsoDateString(value.created_at) ||
    !isNullableIsoDateString(value.updated_at) ||
    !isNullableString(value.created_by) ||
    !isNullableString(value.updated_by)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return value as unknown as NetworkStreamingSharedLink;
};

const parseWikipediaShowUrl = (value: unknown): NetworkStreamingWikipediaShowUrl => {
  if (!isRecord(value) || !hasExactKeys(value, WIKIPEDIA_SHOW_URL_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  if (
    !isNonemptyString(value.id) ||
    !isNonemptyString(value.family_id) ||
    !isFamilyEntityType(value.entity_type) ||
    !isNonemptyString(value.entity_key) ||
    !isNullableString(value.brand_wikipedia_url) ||
    !isNonemptyString(value.show_url) ||
    !isNonemptyString(value.show_url_key) ||
    !isNullableString(value.show_title) ||
    !isNullableString(value.wikidata_id) ||
    !isNullableString(value.matched_show_id) ||
    !isNullableString(value.match_method) ||
    !isNonemptyString(value.import_source) ||
    typeof value.is_applied !== "boolean" ||
    !isRecord(value.metadata) ||
    !isNullableIsoDateString(value.last_seen_at) ||
    !isNullableIsoDateString(value.created_at) ||
    !isNullableIsoDateString(value.updated_at)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return value as unknown as NetworkStreamingWikipediaShowUrl;
};

export const parseNetworksStreamingSuggestion = (value: unknown): NetworkStreamingSuggestion => {
  if (!isRecord(value) || !hasExactKeys(value, SUGGESTION_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  if (
    !isEntityType(value.entity_type) ||
    !isNonemptyString(value.name) ||
    !isEntitySlug(value.entity_slug) ||
    !isNonnegativeInteger(value.available_show_count) ||
    !isNonnegativeInteger(value.added_show_count)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return value as unknown as NetworkStreamingSuggestion;
};

export const parseNetworksStreamingDetail = (value: unknown): NetworkStreamingDetail => {
  if (!isRecord(value) || !hasExactKeys(value, DETAIL_KEYS)) {
    throw invalidNetworksStreamingDetailResponse();
  }
  if (
    !isEntityType(value.entity_type) ||
    !isNonemptyString(value.entity_key) ||
    !isEntitySlug(value.entity_slug) ||
    !isNonemptyString(value.display_name) ||
    !isNonnegativeInteger(value.available_show_count) ||
    !isNonnegativeInteger(value.added_show_count) ||
    !Array.isArray(value.logo_assets) ||
    !Array.isArray(value.shows) ||
    !Array.isArray(value.family_suggestions) ||
    !Array.isArray(value.shared_links) ||
    !Array.isArray(value.wikipedia_show_urls)
  ) {
    throw invalidNetworksStreamingDetailResponse();
  }
  return {
    entity_type: value.entity_type,
    entity_key: value.entity_key,
    entity_slug: value.entity_slug,
    display_name: value.display_name,
    available_show_count: value.available_show_count,
    added_show_count: value.added_show_count,
    core: parseCoreDetail(value.core),
    override: parseOverrideDetail(value.override),
    completion: parseCompletionDetail(value.completion),
    logo_assets: value.logo_assets.map(parseLogoAsset),
    shows: value.shows.map(parseDetailShow),
    family: parseFamily(value.family),
    family_suggestions: value.family_suggestions.map(parseFamilySuggestion),
    shared_links: value.shared_links.map(parseSharedLink),
    wikipedia_show_urls: value.wikipedia_show_urls.map(parseWikipediaShowUrl),
  };
};
