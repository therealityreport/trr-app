import "server-only";

import {
  type BrandProfileAsset,
  type BrandProfileAssetRole,
  type BrandProfileAssetVariant,
  type BrandProfileFamily,
  type BrandProfileFamilySuggestion,
  type BrandProfilePayload,
  type BrandProfileSocialProfile,
  type BrandProfileSocialProfileShow,
  type BrandProfileSharedLink,
  type BrandProfileShow,
  type BrandProfileSuggestion,
  type BrandProfileTarget,
  type BrandProfileTargetType,
  type BrandProfileWikipediaShowUrl,
  pickPrimaryBrandTarget,
  resolveBrandProfileTargets,
  toFriendlyBrandSlug,
} from "@/lib/admin/brand-profile";
import {
  appendSearchParam,
  getUnifiedBrandsSectionHref,
} from "@/lib/admin/brands-workspace";
import { toEntitySlug } from "@/lib/admin/networks-streaming-entity";
import {
  getNetworkStreamingDetail,
  getNetworksStreamingSummary,
  type NetworkStreamingDetail,
} from "@/lib/server/admin/networks-streaming-repository";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { getShowById } from "@/lib/server/trr-api/trr-shows-repository";
import { peekInternalAdminBearerToken } from "@/lib/server/trr-api/internal-admin-auth";

type GenericTargetType = Extract<
  BrandProfileTargetType,
  "franchise" | "publication" | "social" | "other"
>;

type NetworkTargetType = Extract<
  BrandProfileTargetType,
  "network" | "streaming" | "production"
>;

type GenericBrandTargetRow = {
  target_type: GenericTargetType;
  target_key: string;
  target_label: string;
  discovered_from: string | null;
  discovered_from_urls: string[];
  show_ids: string[];
  source_link_kinds: string[];
};

type GenericBrandLogoRow = {
  id: string;
  target_type: GenericTargetType;
  target_key: string;
  target_label: string;
  source_url: string | null;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  logo_role: string | null;
  source_provider: string | null;
  discovered_from: string | null;
  is_primary: boolean;
  is_selected_for_role: boolean;
  option_kind: string | null;
  updated_at: string | null;
};

type FranchiseShowRow = {
  show_id: string;
  show_name: string;
  canonical_slug: string | null;
  poster_url: string | null;
  franchise_key: string | null;
  franchise_name: string | null;
};

type FamilyContextPayload = {
  family?: {
    id?: string;
    family_key?: string;
    display_name?: string;
    owner_wikidata_id?: string | null;
    owner_label?: string | null;
  } | null;
  family_suggestions?: Array<{
    owner_wikidata_id?: string;
    owner_label?: string;
    entity_count?: number;
  }>;
  shared_links?: Array<{
    id?: string;
    link_group?: string;
    link_kind?: string;
    coverage_type?: string;
    coverage_value?: string | null;
    source?: string;
    url?: string;
    is_active?: boolean;
  }>;
  wikipedia_show_urls?: Array<{
    id?: string;
    show_url?: string;
    show_title?: string | null;
    wikidata_id?: string | null;
    matched_show_id?: string | null;
    match_method?: string | null;
    is_applied?: boolean;
  }>;
};

type SharedAccountSourceRow = {
  platform: string;
  account_handle: string;
  is_active: boolean;
};

type SharedAccountSourcesPayload = {
  sources?: unknown[];
};

type SocialProfileSummary = {
  platform: string;
  account_handle: string;
  profile_url: string | null;
  avatar_url: string | null;
  total_posts: number;
  total_engagement: number;
  total_views: number;
};

type ExactMatchSeed =
  | {
      kind: "network";
      target_type: NetworkTargetType;
      target_key: string;
      target_label: string;
      entity_slug: string;
      homepage_url: string | null;
      available_show_count: number;
      added_show_count: number;
    }
  | {
      kind: "generic";
      target_type: GenericTargetType;
      target_key: string;
      target_label: string;
      discovered_from: string | null;
      discovered_from_urls: string[];
      show_ids: string[];
      source_link_kinds: string[];
    };

const GENERIC_TARGET_TYPES: readonly GenericTargetType[] = [
  "franchise",
  "publication",
  "social",
  "other",
];

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

const asBoolean = (value: unknown): boolean => value === true;
const isPresent = <T>(value: T | null): value is T => value !== null;
const NETWORK_BRAND_TARGET_TYPES = new Set<BrandProfileTargetType>(["network", "streaming", "production"]);
const BRAVO_SCOPE_BRAND_SLUGS = new Set(["bravo", "bravotv"]);

const fetchBackendJson = async <T>(
  path: string,
  searchParams?: URLSearchParams,
): Promise<T | null> => {
  const backendUrl = getBackendApiUrl(path);
  const serviceRoleKey = peekInternalAdminBearerToken()?.trim();
  if (!backendUrl || !serviceRoleKey) return null;

  const upstream = new URL(backendUrl);
  if (searchParams) {
    searchParams.forEach((value, key) => upstream.searchParams.set(key, value));
  }

  const response = await fetch(upstream.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json().catch(() => null)) as T | null;
};

const asNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeAccountHandle = (value: string | null): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^@+/, "");
};

const buildCanonicalBrandHref = (value: string | null): string | null => {
  const slug = toFriendlyBrandSlug(value ?? "");
  return slug ? `/brands/${slug}` : null;
};

const resolveBrandSocialScope = (targets: readonly BrandProfileTarget[]): string | null => {
  for (const target of targets) {
    if (!NETWORK_BRAND_TARGET_TYPES.has(target.target_type)) continue;
    const candidates = [target.friendly_slug, target.target_key, target.target_label];
    if (candidates.some((candidate) => BRAVO_SCOPE_BRAND_SLUGS.has(toFriendlyBrandSlug(candidate ?? "")))) {
      return "bravo";
    }
  }
  return null;
};

const loadSharedAccountSources = async (sourceScope: string): Promise<SharedAccountSourceRow[]> => {
  const payload = await fetchBackendJson<SharedAccountSourcesPayload>(
    "/admin/socials/shared/sources",
    new URLSearchParams({
      source_scope: sourceScope,
      include_inactive: "false",
    }),
  );
  const rows = Array.isArray(payload?.sources) ? payload.sources : [];
  return rows
    .map((row) => {
      const record = asRecord(row);
      if (!record) return null;
      const platform = asString(record.platform);
      const accountHandle = normalizeAccountHandle(asString(record.account_handle));
      if (!platform || !accountHandle) return null;
      return {
        platform,
        account_handle: accountHandle,
        is_active: record.is_active !== false,
      } satisfies SharedAccountSourceRow;
    })
    .filter((row): row is SharedAccountSourceRow => Boolean(row?.is_active));
};

const loadSocialProfileSummary = async (
  platform: string,
  accountHandle: string,
): Promise<SocialProfileSummary | null> => {
  const payload = await fetchBackendJson<Record<string, unknown>>(
    `/admin/socials/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(accountHandle)}/summary`,
  );
  const record = asRecord(payload);
  if (!record) return null;
  const normalizedPlatform = asString(record.platform) ?? platform;
  const normalizedHandle = normalizeAccountHandle(asString(record.account_handle)) ?? accountHandle;
  if (!normalizedPlatform || !normalizedHandle) return null;
  return {
    platform: normalizedPlatform,
    account_handle: normalizedHandle,
    profile_url: asString(record.profile_url),
    avatar_url: asString(record.avatar_url),
    total_posts: asNumber(record.total_posts),
    total_engagement: asNumber(record.total_engagement),
    total_views: asNumber(record.total_views),
  } satisfies SocialProfileSummary;
};

const loadBrandSocialProfiles = async (
  targets: readonly BrandProfileTarget[],
  shows: readonly BrandProfileShow[],
): Promise<BrandProfileSocialProfile[]> => {
  const sourceScope = resolveBrandSocialScope(targets);
  if (!sourceScope) return [];

  const scopedTargetIds = new Set(
    targets
      .filter((target) => NETWORK_BRAND_TARGET_TYPES.has(target.target_type))
      .map((target) => target.id),
  );
  const assignedShows = shows
    .filter((show) => show.source_target_ids.some((sourceTargetId) => scopedTargetIds.has(sourceTargetId)))
    .map((show) => ({
      id: show.id,
      name: show.name,
      canonical_slug: show.canonical_slug,
    }) satisfies BrandProfileSocialProfileShow);

  if (assignedShows.length === 0) return [];

  const sharedSources = await loadSharedAccountSources(sourceScope);
  if (sharedSources.length === 0) return [];

  const hydrated = await Promise.all(
    sharedSources.map(async (source) => {
      const summary = await loadSocialProfileSummary(source.platform, source.account_handle);
      return {
        platform: summary?.platform ?? source.platform,
        account_handle: summary?.account_handle ?? source.account_handle,
        profile_url: summary?.profile_url ?? null,
        avatar_url: summary?.avatar_url ?? null,
        total_posts: summary?.total_posts ?? 0,
        total_engagement: summary?.total_engagement ?? 0,
        total_views: summary?.total_views ?? 0,
        assigned_shows: assignedShows,
      } satisfies BrandProfileSocialProfile;
    }),
  );

  return hydrated.sort((left, right) => {
    if (left.platform !== right.platform) return left.platform.localeCompare(right.platform);
    return left.account_handle.localeCompare(right.account_handle);
  });
};

const loadGenericTargets = async (targetType: GenericTargetType): Promise<GenericBrandTargetRow[]> => {
  const searchParams = new URLSearchParams({
    target_type: targetType,
    limit: targetType === "publication" || targetType === "social" ? "2000" : "500",
  });
  const payload = await fetchBackendJson<{ rows?: unknown[] }>(
    "/admin/brands/logo-targets",
    searchParams,
  );
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  return rows
    .map((row) => {
      const record = asRecord(row);
      if (!record) return null;
      const type = asString(record.target_type) as GenericTargetType | null;
      const targetKey = asString(record.target_key);
      const targetLabel = asString(record.target_label) ?? targetKey;
      if (!type || !targetKey || !targetLabel) return null;
      return {
        target_type: type,
        target_key: targetKey,
        target_label: targetLabel,
        discovered_from: asString(record.discovered_from),
        discovered_from_urls: asStringArray(record.discovered_from_urls),
        show_ids: asStringArray(record.show_ids),
        source_link_kinds: asStringArray(record.source_link_kinds),
      } satisfies GenericBrandTargetRow;
    })
    .filter(isPresent);
};

const loadGenericLogoRows = async (
  targetType: GenericTargetType,
  targetKey: string,
): Promise<GenericBrandLogoRow[]> => {
  const searchParams = new URLSearchParams({
    target_type: targetType,
    target_key: targetKey,
    limit: "200",
    offset: "0",
    include_missing: "true",
  });
  if (targetType === "publication" || targetType === "social") {
    searchParams.set("include_related", "true");
  }
  const payload = await fetchBackendJson<{ rows?: unknown[] }>(
    "/admin/brands/logos",
    searchParams,
  );
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  return rows
    .map((row) => {
      const record = asRecord(row);
      if (!record) return null;
      const type = asString(record.target_type) as GenericTargetType | null;
      const id = asString(record.id);
      const key = asString(record.target_key);
      const label = asString(record.target_label) ?? key;
      if (!type || !id || !key || !label) return null;
      return {
        id,
        target_type: type,
        target_key: key,
        target_label: label,
        source_url: asString(record.source_url),
        hosted_logo_url: asString(record.hosted_logo_url),
        hosted_logo_black_url: asString(record.hosted_logo_black_url),
        hosted_logo_white_url: asString(record.hosted_logo_white_url),
        logo_role: asString(record.logo_role),
        source_provider: asString(record.source_provider),
        discovered_from: asString(record.discovered_from),
        is_primary: Boolean(record.is_primary),
        is_selected_for_role: Boolean(record.is_selected_for_role),
        option_kind: asString(record.option_kind),
        updated_at: asString(record.updated_at),
      } satisfies GenericBrandLogoRow;
    })
    .filter(isPresent);
};

const loadFranchiseShowRows = async (): Promise<FranchiseShowRow[]> => {
  const payload = await fetchBackendJson<{ rows?: unknown[] }>(
    "/admin/brands/shows-franchises",
    new URLSearchParams({ limit: "1000" }),
  );
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  return rows
    .map((row) => {
      const record = asRecord(row);
      if (!record) return null;
      const showId = asString(record.show_id);
      const showName = asString(record.show_name);
      if (!showId || !showName) return null;
      return {
        show_id: showId,
        show_name: showName,
        canonical_slug: asString(record.canonical_slug),
        poster_url: asString(record.poster_url),
        franchise_key: asString(record.franchise_key),
        franchise_name: asString(record.franchise_name),
      } satisfies FranchiseShowRow;
    })
    .filter(isPresent);
};

const loadFamilyContext = async (
  targetType: NetworkTargetType,
  targetKey: string,
): Promise<{
  family: BrandProfileFamily | null;
  familySuggestions: BrandProfileFamilySuggestion[];
  sharedLinks: BrandProfileSharedLink[];
  wikipediaShowUrls: BrandProfileWikipediaShowUrl[];
}> => {
  const payload = await fetchBackendJson<FamilyContextPayload>(
    "/admin/brands/families/by-entity",
    new URLSearchParams({
      entity_type: targetType,
      entity_key: targetKey,
    }),
  );

  const familyRecord = asRecord(payload?.family);
  const family =
    familyRecord && asString(familyRecord.id) && asString(familyRecord.family_key) && asString(familyRecord.display_name)
      ? {
          id: asString(familyRecord.id)!,
          family_key: asString(familyRecord.family_key)!,
          display_name: asString(familyRecord.display_name)!,
          owner_wikidata_id: asString(familyRecord.owner_wikidata_id),
          owner_label: asString(familyRecord.owner_label),
        }
      : null;

  const familySuggestions = Array.isArray(payload?.family_suggestions)
    ? payload.family_suggestions
        .map((item) => {
          const record = asRecord(item);
          if (!record) return null;
          const ownerLabel = asString(record.owner_label);
          const ownerWikidataId = asString(record.owner_wikidata_id);
          if (!ownerLabel || !ownerWikidataId) return null;
          return {
            owner_wikidata_id: ownerWikidataId,
            owner_label: ownerLabel,
            entity_count:
              typeof record.entity_count === "number" && Number.isFinite(record.entity_count)
                ? record.entity_count
                : 0,
          } satisfies BrandProfileFamilySuggestion;
        })
        .filter((item): item is BrandProfileFamilySuggestion => Boolean(item))
    : [];

  const sharedLinks = Array.isArray(payload?.shared_links)
    ? payload.shared_links
        .map((item) => {
          const record = asRecord(item);
          if (!record) return null;
          const id = asString(record.id);
          const url = asString(record.url);
          if (!id || !url) return null;
          return {
            id,
            link_group: asString(record.link_group) ?? "other",
            link_kind: asString(record.link_kind) ?? "other",
            coverage_type: asString(record.coverage_type) ?? "unknown",
            coverage_value: asString(record.coverage_value),
            source: asString(record.source) ?? "unknown",
            url,
            is_active: asBoolean(record.is_active),
          } satisfies BrandProfileSharedLink;
        })
        .filter((item): item is BrandProfileSharedLink => Boolean(item))
    : [];

  const wikipediaShowUrls = Array.isArray(payload?.wikipedia_show_urls)
    ? payload.wikipedia_show_urls
        .map((item) => {
          const record = asRecord(item);
          if (!record) return null;
          const id = asString(record.id);
          const showUrl = asString(record.show_url);
          if (!id || !showUrl) return null;
          return {
            id,
            show_url: showUrl,
            show_title: asString(record.show_title),
            wikidata_id: asString(record.wikidata_id),
            matched_show_id: asString(record.matched_show_id),
            match_method: asString(record.match_method),
            is_applied: asBoolean(record.is_applied),
          } satisfies BrandProfileWikipediaShowUrl;
        })
        .filter((item): item is BrandProfileWikipediaShowUrl => Boolean(item))
    : [];

  return {
    family,
    familySuggestions,
    sharedLinks,
    wikipediaShowUrls,
  };
};

const toSectionHref = (targetType: BrandProfileTargetType): string =>
  getUnifiedBrandsSectionHref(targetType);

const toDetailHref = (
  targetLabel: string,
  entitySlug: string | null,
): string | null => {
  return buildCanonicalBrandHref(entitySlug || targetLabel);
};

const resolveAssetRole = (value: string | null, isPrimary: boolean): BrandProfileAssetRole =>
  value?.toLowerCase() === "icon" ? "icon" : isPrimary ? "wordmark" : "wordmark";

const pushAsset = (
  bucket: Map<string, BrandProfileAsset>,
  asset: BrandProfileAsset,
): void => {
  if (!bucket.has(asset.id)) {
    bucket.set(asset.id, asset);
  }
};

const addTargetShow = (
  bucket: Map<string, BrandProfileShow>,
  show: Omit<BrandProfileShow, "categories" | "source_target_ids" | "source_labels">,
  target: Pick<BrandProfileTarget, "id" | "target_label" | "target_type">,
): void => {
  const existing = bucket.get(show.id);
  if (existing) {
    if (!existing.categories.includes(target.target_type)) {
      existing.categories.push(target.target_type);
      existing.categories.sort();
    }
    if (!existing.source_target_ids.includes(target.id)) {
      existing.source_target_ids.push(target.id);
    }
    if (!existing.source_labels.includes(target.target_label)) {
      existing.source_labels.push(target.target_label);
    }
    if (!existing.poster_url && show.poster_url) {
      existing.poster_url = show.poster_url;
    }
    return;
  }

  bucket.set(show.id, {
    ...show,
    categories: [target.target_type],
    source_target_ids: [target.id],
    source_labels: [target.target_label],
  });
};

const buildNetworkAssets = (
  target: BrandProfileTarget,
  detail: NetworkStreamingDetail,
): BrandProfileAsset[] => {
  const assets: BrandProfileAsset[] = [];
  const addCoreAsset = (
    variant: BrandProfileAssetVariant,
    displayUrl: string | null,
  ) => {
    if (!displayUrl) return;
    assets.push({
      id: `${target.id}:core:${variant ?? "color"}`,
      target_id: target.id,
      target_type: target.target_type,
      target_key: target.target_key,
      target_label: target.target_label,
      role: "wordmark",
      variant,
      display_url: displayUrl,
      source_url: displayUrl,
      source_provider: "stored_existing",
      discovered_from: target.homepage_url,
      is_primary: variant === "color",
      is_selected_for_role: variant === "color",
      option_kind: "stored",
      updated_at: detail.completion.last_attempt_at,
    });
  };

  addCoreAsset("color", detail.core.hosted_logo_url);
  addCoreAsset("black", detail.core.hosted_logo_black_url);
  addCoreAsset("white", detail.core.hosted_logo_white_url);

  for (const asset of detail.logo_assets) {
    assets.push({
      id: `${target.id}:asset:${asset.id}`,
      target_id: target.id,
      target_type: target.target_type,
      target_key: target.target_key,
      target_label: target.target_label,
      role: asset.is_primary ? "wordmark" : "icon",
      variant: "color",
      display_url: asset.hosted_logo_url,
      source_url: asset.source_url,
      source_provider: asset.source,
      discovered_from: asset.source_url,
      is_primary: asset.is_primary,
      is_selected_for_role: asset.is_primary,
      option_kind: "stored",
      updated_at: asset.updated_at,
    });
  }

  return assets;
};

const buildGenericAssets = (
  target: BrandProfileTarget,
  rows: GenericBrandLogoRow[],
): BrandProfileAsset[] =>
  rows.map((row) => ({
    id: `${target.id}:asset:${row.id}`,
    target_id: target.id,
    target_type: target.target_type,
    target_key: target.target_key,
    target_label: target.target_label,
    role: resolveAssetRole(row.logo_role, Boolean(row.is_primary)),
    variant: row.hosted_logo_black_url
      ? "black"
      : row.hosted_logo_white_url
        ? "white"
        : "color",
    display_url:
      row.hosted_logo_url ??
      row.hosted_logo_black_url ??
      row.hosted_logo_white_url ??
      row.source_url ??
      null,
    source_url: row.source_url ?? null,
    source_provider: row.source_provider ?? null,
    discovered_from: row.discovered_from ?? null,
    is_primary: Boolean(row.is_primary),
    is_selected_for_role: Boolean(row.is_selected_for_role),
    option_kind: row.option_kind ?? null,
    updated_at: row.updated_at ?? null,
  }));

const buildNetworkTarget = async (
  seed: Extract<ExactMatchSeed, { kind: "network" }>,
): Promise<{
  target: BrandProfileTarget;
  shows: BrandProfileShow[];
  assets: BrandProfileAsset[];
}> => {
  const detail = await getNetworkStreamingDetail({
    entity_type: seed.target_type,
    entity_key: seed.target_key,
    show_scope: "added",
  });

  const familyContext = await loadFamilyContext(seed.target_type, seed.target_key);
  const detailHref = toDetailHref(seed.target_label, seed.entity_slug);

  const target: BrandProfileTarget = {
    id: `${seed.target_type}:${seed.target_key}`,
    target_type: seed.target_type,
    target_key: seed.target_key,
    target_label: detail?.display_name ?? seed.target_label,
    friendly_slug: toFriendlyBrandSlug(detail?.display_name ?? seed.target_label),
    section_href: toSectionHref(seed.target_type),
    detail_href: detailHref,
    entity_slug: detail?.entity_slug ?? seed.entity_slug,
    entity_id: detail?.core.entity_id ?? null,
    available_show_count: detail?.available_show_count ?? seed.available_show_count,
    added_show_count: detail?.added_show_count ?? seed.added_show_count,
    homepage_url: seed.homepage_url,
    wikipedia_url: detail?.core.wikipedia_url ?? null,
    wikidata_id: detail?.core.wikidata_id ?? null,
    instagram_id: detail?.core.instagram_id ?? null,
    twitter_id: detail?.core.twitter_id ?? null,
    tiktok_id: detail?.core.tiktok_id ?? null,
    facebook_id: detail?.core.facebook_id ?? null,
    discovered_from: detail?.core.wikipedia_url ?? null,
    discovered_from_urls: detail?.core.wikipedia_url ? [detail.core.wikipedia_url] : [],
    source_link_kinds: detail?.core.wikipedia_url ? ["wikipedia"] : [],
    family: familyContext.family,
    family_suggestions: familyContext.familySuggestions,
    shared_links: familyContext.sharedLinks,
    wikipedia_show_urls: familyContext.wikipediaShowUrls,
  };

  const shows =
    detail?.shows.map((show) => ({
      id: show.trr_show_id,
      name: show.show_name,
      canonical_slug: show.canonical_slug,
      poster_url: show.poster_url,
      categories: [],
      source_target_ids: [],
      source_labels: [],
    })) ?? [];

  return {
    target,
    shows,
    assets: detail ? buildNetworkAssets(target, detail) : [],
  };
};

const buildGenericTarget = async (
  seed: Extract<ExactMatchSeed, { kind: "generic" }>,
  franchiseRows: FranchiseShowRow[],
): Promise<{
  target: BrandProfileTarget;
  shows: BrandProfileShow[];
  assets: BrandProfileAsset[];
}> => {
  const detailHref = toDetailHref(seed.target_label, null);
  const target: BrandProfileTarget = {
    id: `${seed.target_type}:${seed.target_key}`,
    target_type: seed.target_type,
    target_key: seed.target_key,
    target_label: seed.target_label,
    friendly_slug: toFriendlyBrandSlug(seed.target_label),
    section_href: toSectionHref(seed.target_type),
    detail_href: detailHref,
    entity_slug: null,
    entity_id: null,
    available_show_count: seed.show_ids.length || null,
    added_show_count: null,
    homepage_url: null,
    wikipedia_url: null,
    wikidata_id: null,
    instagram_id: null,
    twitter_id: null,
    tiktok_id: null,
    facebook_id: null,
    discovered_from: seed.discovered_from,
    discovered_from_urls: seed.discovered_from_urls,
    source_link_kinds: seed.source_link_kinds,
    family: null,
    family_suggestions: [],
    shared_links: [],
    wikipedia_show_urls: [],
  };

  const logos = await loadGenericLogoRows(seed.target_type, seed.target_key);
  const assets = buildGenericAssets(target, logos);

  let shows: BrandProfileShow[] = [];
  if (seed.target_type === "franchise") {
    shows = franchiseRows
      .filter((row) => row.franchise_key === seed.target_key)
      .map((row) => ({
        id: row.show_id,
        name: row.show_name,
        canonical_slug: row.canonical_slug,
        poster_url: row.poster_url ?? null,
        categories: [],
        source_target_ids: [],
        source_labels: [],
      }));
  } else if (seed.show_ids.length > 0) {
    const resolved = await Promise.all(
      seed.show_ids.map(async (showId) => {
        const show = await getShowById(showId);
        if (!show) return null;
        return {
          id: show.id,
          name: show.name,
          canonical_slug: show.canonical_slug ?? null,
          poster_url: show.poster_url ?? null,
          categories: [],
          source_target_ids: [],
          source_labels: [],
        } satisfies BrandProfileShow;
      }),
    );
    shows = resolved.filter(isPresent);
  }

  return {
    target,
    shows,
    assets,
  };
};

const loadExactMatchSeeds = async (slug: string): Promise<ExactMatchSeed[]> => {
  const summary = await getNetworksStreamingSummary();
  const networkSeeds: ExactMatchSeed[] = resolveBrandProfileTargets(slug, summary.rows.map((row) => ({
    ...row,
    target_type: row.type,
    target_key: row.name.trim().toLowerCase(),
    target_label: row.name,
  })))
    .map((row) => ({
      kind: "network" as const,
      target_type: row.target_type,
      target_key: row.target_key,
      target_label: row.target_label,
      entity_slug: toEntitySlug(row.target_label),
      homepage_url: row.homepage_url,
      available_show_count: row.available_show_count,
      added_show_count: row.added_show_count,
    }));

  const genericRows = await Promise.all(GENERIC_TARGET_TYPES.map((targetType) => loadGenericTargets(targetType)));
  const genericSeeds: ExactMatchSeed[] = resolveBrandProfileTargets(slug, genericRows.flat())
    .map((row) => ({
      kind: "generic" as const,
      target_type: row.target_type,
      target_key: row.target_key,
      target_label: row.target_label,
      discovered_from: row.discovered_from ?? null,
      discovered_from_urls: row.discovered_from_urls ?? [],
      show_ids: row.show_ids ?? [],
      source_link_kinds: row.source_link_kinds ?? [],
    }));

  const deduped = new Map<string, ExactMatchSeed>();
  for (const seed of [...networkSeeds, ...genericSeeds]) {
    const key = `${seed.target_type}:${seed.target_key}`;
    if (!deduped.has(key)) {
      deduped.set(key, seed);
    }
  }

  return [...deduped.values()];
};

const loadSuggestionSeeds = async (): Promise<BrandProfileSuggestion[]> => {
  const summary = await getNetworksStreamingSummary();
  const networkSuggestions = summary.rows.map((row) => ({
    slug: toFriendlyBrandSlug(row.name),
    label: row.name,
    target_type: row.type,
    target_key: row.name.trim().toLowerCase(),
    href:
      toDetailHref(row.name, toEntitySlug(row.name)) ??
      appendSearchParam(toSectionHref(row.type), "q", row.name),
  })) satisfies BrandProfileSuggestion[];

  const genericTargets = (await Promise.all(GENERIC_TARGET_TYPES.map((targetType) => loadGenericTargets(targetType)))).flat();
  const genericSuggestions = genericTargets.map((row) => ({
    slug: toFriendlyBrandSlug(row.target_label || row.target_key),
    label: row.target_label,
    target_type: row.target_type,
    target_key: row.target_key,
    href: `/brands/${toFriendlyBrandSlug(row.target_label || row.target_key)}`,
  })) satisfies BrandProfileSuggestion[];

  const deduped = new Map<string, BrandProfileSuggestion>();
  for (const suggestion of [...networkSuggestions, ...genericSuggestions]) {
    const key = `${suggestion.target_type}:${suggestion.target_key}`;
    if (!suggestion.slug || deduped.has(key)) continue;
    deduped.set(key, suggestion);
  }

  return [...deduped.values()];
};

const scoreSuggestion = (requestedSlug: string, candidateSlug: string): number => {
  if (candidateSlug === requestedSlug) return 100;
  if (candidateSlug.startsWith(requestedSlug)) return 80;
  if (requestedSlug.startsWith(candidateSlug)) return 60;
  if (candidateSlug.includes(requestedSlug)) return 40;
  if (requestedSlug.includes(candidateSlug)) return 20;
  return 0;
};

export async function getBrandProfileSuggestions(
  slug: string,
  limit = 6,
): Promise<BrandProfileSuggestion[]> {
  const normalizedSlug = toFriendlyBrandSlug(slug);
  if (!normalizedSlug) return [];

  const suggestions = await loadSuggestionSeeds();
  return suggestions
    .map((item) => ({
      item,
      score: scoreSuggestion(normalizedSlug, item.slug),
    }))
    .filter(({ item, score }) => item.slug !== normalizedSlug && score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.item.label.localeCompare(right.item.label);
    })
    .slice(0, limit)
    .map(({ item }) => item);
}

export async function getBrandProfileBySlug(
  slug: string,
): Promise<BrandProfilePayload | null> {
  const normalizedSlug = toFriendlyBrandSlug(slug);
  if (!normalizedSlug) return null;

  const exactSeeds = await loadExactMatchSeeds(normalizedSlug);
  if (exactSeeds.length === 0) return null;

  const franchiseRows = exactSeeds.some((seed) => seed.kind === "generic" && seed.target_type === "franchise")
    ? await loadFranchiseShowRows()
    : [];

  const hydrated = await Promise.all(
    exactSeeds.map((seed) =>
      seed.kind === "network"
        ? buildNetworkTarget(seed)
        : buildGenericTarget(seed, franchiseRows),
    ),
  );

  const targetBucket = new Map<string, BrandProfileTarget>();
  const assetBucket = new Map<string, BrandProfileAsset>();
  const showBucket = new Map<string, BrandProfileShow>();

  for (const item of hydrated) {
    targetBucket.set(item.target.id, item.target);
    for (const asset of item.assets) {
      pushAsset(assetBucket, asset);
    }
    for (const show of item.shows) {
      addTargetShow(showBucket, show, item.target);
    }
  }

  const targets = [...targetBucket.values()].sort((left, right) => {
    if (left.target_type !== right.target_type) {
      return left.target_type.localeCompare(right.target_type);
    }
    return left.target_label.localeCompare(right.target_label);
  });
  const primaryTarget = pickPrimaryBrandTarget(targets);
  if (!primaryTarget) return null;

  const categories = Array.from(new Set(targets.map((target) => target.target_type)));
  const shows = [...showBucket.values()].sort((left, right) => left.name.localeCompare(right.name));
  const assets = [...assetBucket.values()].sort((left, right) => {
    if (left.target_label !== right.target_label) {
      return left.target_label.localeCompare(right.target_label);
    }
    return left.id.localeCompare(right.id);
  });
  const socialProfiles = await loadBrandSocialProfiles(targets, shows);

  return {
    slug: normalizedSlug,
    display_name: primaryTarget.target_label,
    primary_target_id: primaryTarget.id,
    categories,
    counts: {
      targets: targets.length,
      shows: shows.length,
      assets: assets.length,
    },
    targets,
    shows,
    assets,
    social_profiles: socialProfiles,
  };
}
