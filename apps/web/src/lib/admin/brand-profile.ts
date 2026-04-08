export type BrandProfileTargetType =
  | "network"
  | "streaming"
  | "production"
  | "franchise"
  | "publication"
  | "social"
  | "other";

export type BrandProfileAssetRole = "wordmark" | "icon";
export type BrandProfileAssetVariant = "color" | "black" | "white" | null;

export interface BrandProfileFamily {
  id: string;
  family_key: string;
  display_name: string;
  owner_wikidata_id: string | null;
  owner_label: string | null;
}

export interface BrandProfileFamilySuggestion {
  owner_wikidata_id: string;
  owner_label: string;
  entity_count: number;
}

export interface BrandProfileSharedLink {
  id: string;
  link_group: string;
  link_kind: string;
  coverage_type: string;
  coverage_value: string | null;
  source: string;
  url: string;
  is_active: boolean;
}

export interface BrandProfileWikipediaShowUrl {
  id: string;
  show_url: string;
  show_title: string | null;
  wikidata_id: string | null;
  matched_show_id: string | null;
  match_method: string | null;
  is_applied: boolean;
}

export interface BrandProfileTarget {
  id: string;
  target_type: BrandProfileTargetType;
  target_key: string;
  target_label: string;
  friendly_slug: string;
  section_href: string;
  detail_href: string | null;
  entity_slug: string | null;
  entity_id: string | null;
  available_show_count: number | null;
  added_show_count: number | null;
  homepage_url: string | null;
  wikipedia_url: string | null;
  wikidata_id: string | null;
  instagram_id: string | null;
  twitter_id: string | null;
  tiktok_id: string | null;
  facebook_id: string | null;
  discovered_from: string | null;
  discovered_from_urls: string[];
  source_link_kinds: string[];
  family: BrandProfileFamily | null;
  family_suggestions: BrandProfileFamilySuggestion[];
  shared_links: BrandProfileSharedLink[];
  wikipedia_show_urls: BrandProfileWikipediaShowUrl[];
}

export interface BrandProfileShow {
  id: string;
  name: string;
  canonical_slug: string | null;
  poster_url: string | null;
  categories: BrandProfileTargetType[];
  source_target_ids: string[];
  source_labels: string[];
}

export interface BrandProfileAsset {
  id: string;
  target_id: string;
  target_type: BrandProfileTargetType;
  target_key: string;
  target_label: string;
  role: BrandProfileAssetRole;
  variant: BrandProfileAssetVariant;
  display_url: string | null;
  source_url: string | null;
  source_provider: string | null;
  discovered_from: string | null;
  is_primary: boolean;
  is_selected_for_role: boolean;
  option_kind: string | null;
  updated_at: string | null;
}

export interface BrandProfileSocialProfileShow {
  id: string;
  name: string;
  canonical_slug: string | null;
}

export interface BrandProfileSocialProfile {
  platform: string;
  account_handle: string;
  profile_url: string | null;
  avatar_url: string | null;
  total_posts: number;
  total_engagement: number;
  total_views: number;
  assigned_shows: BrandProfileSocialProfileShow[];
}

export interface BrandProfileSuggestion {
  slug: string;
  label: string;
  target_type: BrandProfileTargetType;
  target_key: string;
  href: string;
}

export interface BrandProfileMatchCandidate {
  target_type: BrandProfileTargetType;
  target_key: string;
  target_label: string;
  friendly_slug?: string | null;
}

export interface BrandProfilePayload {
  slug: string;
  display_name: string;
  primary_target_id: string;
  categories: BrandProfileTargetType[];
  counts: {
    targets: number;
    shows: number;
    assets: number;
  };
  targets: BrandProfileTarget[];
  shows: BrandProfileShow[];
  assets: BrandProfileAsset[];
  streaming_services: string[];
  social_profiles: BrandProfileSocialProfile[];
}

const STREAMING_SERVICE_CANONICAL_LABELS: Record<string, string> = {
  "peacock premium": "Peacock",
  "peacock premium plus": "Peacock",
  "apple tv store": "Apple TV",
  "amazon video": "Prime Video",
  "amazon prime video": "Prime Video",
};

const normalizeStreamingServiceKey = (value: string): string => value.trim().toLowerCase();

export const canonicalizeBrandStreamingService = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return STREAMING_SERVICE_CANONICAL_LABELS[normalizeStreamingServiceKey(trimmed)] ?? trimmed;
};

export const normalizeBrandStreamingServices = (
  values: ReadonlyArray<string | null | undefined>,
): string[] => {
  const deduped = new Map<string, string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const canonical = canonicalizeBrandStreamingService(value);
    if (!canonical) continue;
    const key = normalizeStreamingServiceKey(canonical);
    if (!deduped.has(key)) {
      deduped.set(key, canonical);
    }
  }
  return [...deduped.values()].sort((left, right) => left.localeCompare(right));
};

const FRIENDLY_HOST_SUFFIXES = [".com", ".org", ".tv", ".net", ".co", ".io", ".app"] as const;

const stripCommonSubdomain = (value: string): string => {
  if (value.startsWith("www.")) return value.slice(4);
  if (value.startsWith("m.")) return value.slice(2);
  if (/^[a-z]{2,3}\./.test(value) && value.split(".").length > 2) {
    return value.slice(value.indexOf(".") + 1);
  }
  return value;
};

const normalizeSlugToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const extractHostname = (value: string): string | null => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const hostname = stripCommonSubdomain(parsed.hostname.trim().toLowerCase());
    return hostname || null;
  } catch {
    return null;
  }
};

const toHostlessHostname = (value: string): string => {
  let host = stripCommonSubdomain(value.trim().toLowerCase());
  for (const suffix of FRIENDLY_HOST_SUFFIXES) {
    if (host.endsWith(suffix)) {
      host = host.slice(0, -suffix.length);
      break;
    }
  }
  return host;
};

export const toFriendlyBrandSlug = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const host = extractHostname(trimmed);
  const candidates = [
    host ? toHostlessHostname(host) : "",
    host ?? "",
    trimmed,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeSlugToken(candidate);
    if (normalized) return normalized;
  }

  return "";
};

export const resolveBrandProfileTargets = <T extends BrandProfileMatchCandidate>(
  slug: string,
  targets: readonly T[],
): T[] => {
  const normalizedSlug = toFriendlyBrandSlug(slug);
  if (!normalizedSlug) return [];

  return targets.filter((target) => {
    const candidates = [target.friendly_slug, target.target_label, target.target_key];
    return candidates.some((candidate) => toFriendlyBrandSlug(candidate ?? "") === normalizedSlug);
  });
};

const TARGET_TYPE_PRIORITY: Record<BrandProfileTargetType, number> = {
  network: 0,
  streaming: 1,
  production: 2,
  franchise: 3,
  publication: 4,
  social: 5,
  other: 6,
};

export const pickPrimaryBrandTarget = (
  targets: readonly BrandProfileTarget[],
): BrandProfileTarget | null => {
  if (targets.length === 0) return null;
  return [...targets].sort((left, right) => {
    const typeOrder = TARGET_TYPE_PRIORITY[left.target_type] - TARGET_TYPE_PRIORITY[right.target_type];
    if (typeOrder !== 0) return typeOrder;
    return left.target_label.localeCompare(right.target_label);
  })[0] ?? null;
};

export const formatBrandTargetType = (value: BrandProfileTargetType): string => {
  switch (value) {
    case "network":
      return "Network";
    case "streaming":
      return "Streaming Service";
    case "production":
      return "Production Company";
    case "franchise":
      return "Franchise";
    case "publication":
      return "Publication";
    case "social":
      return "Social Media";
    case "other":
      return "Other";
    default:
      return value;
  }
};
