"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import BrandLogoOptionsModal from "@/components/admin/BrandLogoOptionsModal";
import type { BrandShowFranchiseRow } from "@/lib/admin/brands-shows-franchises";
import {
  buildUnifiedBrandsHref,
  getUnifiedBrandsTargetTypes,
  normalizeUnifiedBrandsCategory,
  normalizeUnifiedBrandsView,
  type UnifiedBrandsCategory,
  type UnifiedBrandsSyncTargetType,
  type UnifiedBrandsView,
  UNIFIED_BRANDS_CATEGORY_OPTIONS,
  UNIFIED_BRANDS_VIEW_OPTIONS,
} from "@/lib/admin/brands-workspace";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { toFriendlyBrandSlug } from "@/lib/admin/brand-profile";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { normalizeEntityKey, toEntitySlug } from "@/lib/admin/networks-streaming-entity";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { canonicalizeHostedMediaUrl } from "@/lib/hosted-media";

type NetworkRowType = "network" | "streaming" | "production";
type GenericRowType = "show" | "franchise" | "publication" | "social" | "other";
type RowType = NetworkRowType | GenericRowType;
type SyncTargetType = UnifiedBrandsSyncTargetType;

interface NetworksStreamingSummaryRow {
  type: NetworkRowType;
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
  has_logo: boolean;
  has_bw_variants: boolean;
  has_links: boolean;
}

interface NetworksStreamingSummary {
  totals: {
    total_available_shows: number;
    total_added_shows: number;
  };
  rows: NetworksStreamingSummaryRow[];
  generated_at: string;
}

interface BrandLogoRow {
  id: string;
  target_type: GenericRowType;
  target_key: string;
  target_label: string;
  source_url: string | null;
  source_domain?: string | null;
  source_provider?: string | null;
  discovered_from?: string | null;
  logo_role?: string | null;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  is_primary?: boolean | null;
  is_selected_for_role?: boolean | null;
  updated_at: string | null;
}

interface LogoResponsePayload {
  rows?: BrandLogoRow[];
  count?: number;
}

type LogoPickerState = {
  targetType: SyncTargetType;
  targetKey: string;
  targetLabel: string;
  defaultIconUrl: string | null;
};

type UnifiedBrandsRecord = {
  id: string;
  type: RowType;
  label: string;
  targetKey: string;
  detailHref: string | null;
  wordmarkUrl: string | null;
  iconUrl: string | null;
  defaultIconUrl: string | null;
  availableShowCount: number | null;
  addedShowCount: number | null;
  sourceProvider: string | null;
  sourceDomain: string | null;
  discoveredFrom: string | null;
  missingLogo: boolean;
  missingIcon: boolean;
  missingBw: boolean;
  missingLinks: boolean;
  externalLinks: {
    tmdbUrl: string | null;
    imdbUrl: string | null;
    wikidataUrl: string | null;
    wikipediaUrl: string | null;
    websiteUrl: string | null;
  };
};

interface SyncResponsePayload {
  error?: string;
  targets_scanned?: number;
  imports_created?: number;
  imports_updated?: number;
  unresolved?: number;
}

const PLACEHOLDER_ICON_PATH = "/icons/brand-placeholder.svg";
const buildBrandLogoPreviewProxyUrl = (sourceUrl: string): string =>
  `/api/admin/trr-api/brands/logos/options/preview?url=${encodeURIComponent(sourceUrl)}`;

const LOGO_PAGE_SIZE: Record<GenericRowType, number> = {
  show: 1200,
  franchise: 500,
  publication: 500,
  social: 500,
  other: 500,
};

const TYPE_LABELS: Record<RowType, string> = {
  network: "Network",
  streaming: "Streaming Service",
  production: "Production Company",
  show: "Show",
  franchise: "Franchise",
  publication: "Publication/News",
  social: "Social Media",
  other: "Other",
};

const SOCIAL_HOST_SUFFIXES = [
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "x.com",
  "twitter.com",
  "facebook.com",
  "fb.com",
  "threads.com",
  "threads.net",
  "reddit.com",
  "redd.it",
  "pinterest.com",
  "linkedin.com",
  "snapchat.com",
  "twitch.tv",
  "discord.com",
  "discord.gg",
  "telegram.me",
  "t.me",
] as const;

const isShowRecord = (type: RowType): boolean => type === "show" || type === "franchise";

const getCardStatus = (record: UnifiedBrandsRecord): "complete" | "needs_attention" =>
  record.missingLogo || record.missingIcon || record.missingBw || record.missingLinks
    ? "needs_attention"
    : "complete";

const pickDisplayUrl = (
  ...values: Array<string | null | undefined>
): string | null => {
  for (const value of values) {
    const canonical = canonicalizeHostedMediaUrl(value ?? null);
    if (canonical) return canonical;
    if (value) return value;
  }
  return null;
};

const parseErrorPayload = async (response: Response): Promise<string> => {
  const fallback = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as {
      error?: string;
      detail?: string;
      message?: string;
    };
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.detail === "string") return payload.detail;
    if (typeof payload.message === "string") return payload.message;
    return fallback;
  } catch {
    return fallback;
  }
};

const countByFranchise = (rows: BrandShowFranchiseRow[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.franchise_key || "").trim();
    if (!key || key === "unassigned") continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

const normalizeHostname = (value: string | null | undefined): string => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  try {
    return new URL(raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`).hostname.toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//, "").split("/")[0]?.toLowerCase() ?? "";
  }
};

const isKnownSocialHostname = (value: string | null | undefined): boolean => {
  const host = normalizeHostname(value);
  return !!host && SOCIAL_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
};

const buildWebsiteFaviconUrl = (value: string | null | undefined): string | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`);
    return buildBrandLogoPreviewProxyUrl(new URL("/favicon.ico", parsed.origin).toString());
  } catch {
    return null;
  }
};

const resolveGenericRowType = (row: BrandLogoRow): GenericRowType => {
  if (row.target_type === "social" || row.target_type === "show" || row.target_type === "franchise") {
    return row.target_type;
  }
  if (
    isKnownSocialHostname(row.target_key)
    || isKnownSocialHostname(row.source_domain)
    || isKnownSocialHostname(row.source_url)
    || isKnownSocialHostname(row.discovered_from)
  ) {
    return "social";
  }
  return row.target_type;
};

const buildProfileHref = (label: string): string | null => {
  const slug = toFriendlyBrandSlug(label);
  return slug ? `/brands/${slug}` : null;
};

const getExternalLinks = (row: NetworksStreamingSummaryRow) => {
  const tmdbId = row.tmdb_entity_id;
  let tmdbUrl: string | null = null;
  if (tmdbId) {
    if (row.type === "network") tmdbUrl = `https://www.themoviedb.org/network/${tmdbId}`;
    else if (row.type === "streaming") tmdbUrl = `https://www.themoviedb.org/provider/${tmdbId}`;
    else if (row.type === "production") tmdbUrl = `https://www.themoviedb.org/company/${tmdbId}`;
  }

  let imdbUrl: string | null = null;
  let wikidataUrl: string | null = null;
  const raw = row.wikidata_id;
  if (raw) {
    if (raw.startsWith("Q") && /^Q\d+$/.test(raw)) {
      wikidataUrl = `https://www.wikidata.org/wiki/${raw}`;
    } else if (raw.startsWith("IMDB:")) {
      imdbUrl = `https://www.imdb.com/company/${raw.replace("IMDB:", "")}/`;
    }
  }

  return {
    tmdbUrl,
    imdbUrl,
    wikidataUrl,
    wikipediaUrl: row.wikipedia_url,
    websiteUrl: row.homepage_url,
  };
};

const buildNetworkRecords = (rows: NetworksStreamingSummaryRow[]): UnifiedBrandsRecord[] =>
  rows.map((row) => ({
    id: `${row.type}:${normalizeEntityKey(row.name)}`,
    type: row.type,
    label: row.name,
    targetKey: normalizeEntityKey(row.name),
    detailHref: `/brands/networks-and-streaming/${row.type}/${toEntitySlug(row.name)}`,
    wordmarkUrl: pickDisplayUrl(row.hosted_logo_url),
    iconUrl: pickDisplayUrl(row.hosted_logo_black_url, row.hosted_logo_white_url),
    defaultIconUrl: buildWebsiteFaviconUrl(row.homepage_url),
    availableShowCount: row.available_show_count,
    addedShowCount: row.added_show_count,
    sourceProvider: null,
    sourceDomain: null,
    discoveredFrom: null,
    missingLogo: !row.has_logo,
    missingIcon: !(row.hosted_logo_black_url || row.hosted_logo_white_url),
    missingBw: !row.has_bw_variants,
    missingLinks: !row.has_links,
    externalLinks: getExternalLinks(row),
  }));

const buildGenericRecords = (rows: BrandLogoRow[]): UnifiedBrandsRecord[] => {
  const grouped = new Map<string, UnifiedBrandsRecord>();

  for (const row of rows) {
    const resolvedType = resolveGenericRowType(row);
    const key = `${resolvedType}:${row.target_key}`;
    const role = String(row.logo_role || "").trim().toLowerCase();
    const hostedUrl = pickDisplayUrl(
      row.hosted_logo_url,
      row.hosted_logo_black_url,
      row.hosted_logo_white_url,
    );
    const current = grouped.get(key) ?? {
      id: row.id || key,
      type: resolvedType,
      label: row.target_label || row.target_key,
      targetKey: row.target_key,
      detailHref: isShowRecord(resolvedType) ? null : buildProfileHref(row.target_label || row.target_key),
      wordmarkUrl: null,
      iconUrl: null,
      defaultIconUrl: null,
      availableShowCount: null,
      addedShowCount: null,
      sourceProvider: row.source_provider ?? null,
      sourceDomain: row.source_domain ?? null,
      discoveredFrom: row.discovered_from ?? null,
      missingLogo: true,
      missingIcon: true,
      missingBw: false,
      missingLinks: false,
      externalLinks: {
        tmdbUrl: null,
        imdbUrl: null,
        wikidataUrl: null,
        wikipediaUrl: null,
        websiteUrl: null,
      },
    };

    if (role === "icon") {
      if ((row.is_selected_for_role || !current.iconUrl) && hostedUrl) current.iconUrl = hostedUrl;
    } else if (role === "wordmark") {
      if ((row.is_selected_for_role || !current.wordmarkUrl) && hostedUrl) current.wordmarkUrl = hostedUrl;
    } else if (row.is_primary) {
      if (!current.wordmarkUrl && hostedUrl) current.wordmarkUrl = hostedUrl;
    } else if (!current.iconUrl && hostedUrl) {
      current.iconUrl = hostedUrl;
    } else if (!current.wordmarkUrl && hostedUrl) {
      current.wordmarkUrl = hostedUrl;
    }

    if (!current.sourceProvider && row.source_provider) current.sourceProvider = row.source_provider;
    if (!current.sourceDomain && row.source_domain) current.sourceDomain = row.source_domain;
    if (!current.discoveredFrom && row.discovered_from) current.discoveredFrom = row.discovered_from;

    grouped.set(key, current);
  }

  return [...grouped.values()].map((record) => ({
    ...record,
    missingLogo: !record.wordmarkUrl,
    missingIcon: !record.iconUrl,
  }));
};

const buildShowRecords = (
  rows: BrandShowFranchiseRow[],
  showLogoRows: BrandLogoRow[],
  franchiseLogoRows: BrandLogoRow[],
): UnifiedBrandsRecord[] => {
  const records = new Map<string, UnifiedBrandsRecord>();
  const franchiseCounts = countByFranchise(rows);

  for (const row of rows) {
    records.set(`show:${row.show_id}`, {
      id: `show:${row.show_id}`,
      type: "show",
      label: row.show_name,
      targetKey: row.show_id,
        detailHref: null,
        wordmarkUrl: null,
        iconUrl: null,
        defaultIconUrl: null,
        availableShowCount: 1,
      addedShowCount: null,
      sourceProvider: null,
      sourceDomain: null,
      discoveredFrom: row.effective_fandom_url,
      missingLogo: true,
      missingIcon: true,
      missingBw: false,
      missingLinks: false,
      externalLinks: {
        tmdbUrl: null,
        imdbUrl: null,
        wikidataUrl: null,
        wikipediaUrl: null,
        websiteUrl: null,
      },
    });

    const franchiseKey = String(row.franchise_key || "").trim();
    if (!franchiseKey || franchiseKey === "unassigned") continue;
    if (!records.has(`franchise:${franchiseKey}`)) {
      records.set(`franchise:${franchiseKey}`, {
        id: `franchise:${franchiseKey}`,
        type: "franchise",
        label: row.franchise_name || franchiseKey,
        targetKey: franchiseKey,
        detailHref: buildProfileHref(row.franchise_name || franchiseKey),
        wordmarkUrl: null,
        iconUrl: null,
        defaultIconUrl: null,
        availableShowCount: franchiseCounts.get(franchiseKey) ?? 0,
        addedShowCount: null,
        sourceProvider: null,
        sourceDomain: null,
        discoveredFrom: null,
        missingLogo: true,
        missingIcon: true,
        missingBw: false,
        missingLinks: false,
        externalLinks: {
          tmdbUrl: null,
          imdbUrl: null,
          wikidataUrl: null,
          wikipediaUrl: null,
          websiteUrl: null,
        },
      });
    }
  }

  for (const record of buildGenericRecords(showLogoRows)) {
    records.set(`show:${record.targetKey}`, {
      ...(records.get(`show:${record.targetKey}`) ?? record),
      ...record,
      type: "show",
      detailHref: records.get(`show:${record.targetKey}`)?.detailHref ?? record.detailHref,
      availableShowCount: records.get(`show:${record.targetKey}`)?.availableShowCount ?? 1,
    });
  }

  for (const record of buildGenericRecords(franchiseLogoRows)) {
    records.set(`franchise:${record.targetKey}`, {
      ...(records.get(`franchise:${record.targetKey}`) ?? record),
      ...record,
      type: "franchise",
      detailHref: records.get(`franchise:${record.targetKey}`)?.detailHref ?? record.detailHref,
      availableShowCount:
        records.get(`franchise:${record.targetKey}`)?.availableShowCount ?? record.availableShowCount,
    });
  }

  return [...records.values()].map((record) => ({
    ...record,
    missingLogo: !record.wordmarkUrl,
    missingIcon: !record.iconUrl,
  }));
};

const compareRecords = (left: UnifiedBrandsRecord, right: UnifiedBrandsRecord): number => {
  const typeCompare = TYPE_LABELS[left.type].localeCompare(TYPE_LABELS[right.type]);
  if (typeCompare !== 0) return typeCompare;
  return left.label.localeCompare(right.label);
};

const normalizeSyncScopeLabel = (category: UnifiedBrandsCategory): string => {
  switch (category) {
    case "network":
      return "network logos";
    case "streaming":
      return "streaming-service logos";
    case "production":
      return "production-company logos";
    case "shows":
      return "show and franchise logos";
    case "publication":
      return "publication logos";
    case "social":
      return "social-media logos";
    case "other":
      return "other brand logos";
    default:
      return "brand logos";
  }
};

const categoryMatchesRecord = (
  category: UnifiedBrandsCategory,
  record: UnifiedBrandsRecord,
): boolean => {
  if (category === "all") return true;
  if (category === "shows") return record.type === "show" || record.type === "franchise";
  return record.type === category;
};

export default function UnifiedBrandsWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checking, hasAccess } = useAdminGuard();

  const category = normalizeUnifiedBrandsCategory(searchParams.get("category"));
  const view = normalizeUnifiedBrandsView(searchParams.get("view"));

  const [summary, setSummary] = useState<NetworksStreamingSummary | null>(null);
  const [shows, setShows] = useState<BrandShowFranchiseRow[]>([]);
  const [publicationLogoRows, setPublicationLogoRows] = useState<BrandLogoRow[]>([]);
  const [socialLogoRows, setSocialLogoRows] = useState<BrandLogoRow[]>([]);
  const [otherLogoRows, setOtherLogoRows] = useState<BrandLogoRow[]>([]);
  const [showLogoRows, setShowLogoRows] = useState<BrandLogoRow[]>([]);
  const [franchiseLogoRows, setFranchiseLogoRows] = useState<BrandLogoRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [logoPickerState, setLogoPickerState] = useState<LogoPickerState | null>(null);

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
        allowDevAdminBypass: true,
      }),
    [user],
  );

  const setWorkspaceState = useCallback(
    (nextCategory: UnifiedBrandsCategory, nextView: UnifiedBrandsView) => {
      const href = buildUnifiedBrandsHref(nextCategory, nextView);
      if (href === `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`) return;
      router.replace(href as Route, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const loadLogoRows = useCallback(
    async (targetType: GenericRowType): Promise<BrandLogoRow[]> => {
      const pageSize = LOGO_PAGE_SIZE[targetType];
      const merged: BrandLogoRow[] = [];
      let offset = 0;
      let totalCount = Number.POSITIVE_INFINITY;

      while (offset < totalCount) {
        const response = await fetchWithAuth(
          `/api/admin/trr-api/brands/logos?target_type=${targetType}&limit=${pageSize}&offset=${offset}&include_missing=true`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error(await parseErrorPayload(response));
        }
        const payload = (await response.json().catch(() => ({}))) as LogoResponsePayload;
        const rows = Array.isArray(payload.rows) ? payload.rows : [];
        merged.push(...rows);
        totalCount = Number(payload.count ?? merged.length);
        if (rows.length < pageSize) break;
        offset += rows.length;
      }

      return merged;
    },
    [fetchWithAuth],
  );

  const refreshData = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const results = await Promise.allSettled([
          (async () => {
            const response = await fetchWithAuth("/api/admin/networks-streaming/summary", {
              method: "GET",
              cache: "no-store",
            });
            if (!response.ok) throw new Error(await parseErrorPayload(response));
            return (await response.json()) as NetworksStreamingSummary;
          })(),
          (async () => {
            const response = await fetchWithAuth("/api/admin/trr-api/brands/shows-franchises?limit=500", {
              method: "GET",
              cache: "no-store",
            });
            if (!response.ok) throw new Error(await parseErrorPayload(response));
            return (await response.json().catch(() => ({}))) as { rows?: BrandShowFranchiseRow[] };
          })(),
          loadLogoRows("publication"),
          loadLogoRows("social"),
          loadLogoRows("other"),
          loadLogoRows("show"),
          loadLogoRows("franchise"),
        ]);

        const [
          summaryResult,
          showsResult,
          publicationResult,
          socialResult,
          otherResult,
          showResult,
          franchiseResult,
        ] = results;

        const failures: string[] = [];
        const recordFailure = (label: string, result: PromiseSettledResult<unknown>) => {
          if (result.status === "rejected") failures.push(label);
        };

        recordFailure("network/streaming summary", summaryResult);
        recordFailure("show/franchise targets", showsResult);
        recordFailure("publications/news logos", publicationResult);
        recordFailure("social logos", socialResult);
        recordFailure("other brand logos", otherResult);
        recordFailure("show logos", showResult);
        recordFailure("franchise logos", franchiseResult);

        setSummary(summaryResult.status === "fulfilled" ? summaryResult.value : null);
        setShows(showsResult.status === "fulfilled" && Array.isArray(showsResult.value.rows) ? showsResult.value.rows : []);
        setPublicationLogoRows(publicationResult.status === "fulfilled" ? publicationResult.value : []);
        setSocialLogoRows(socialResult.status === "fulfilled" ? socialResult.value : []);
        setOtherLogoRows(otherResult.status === "fulfilled" ? otherResult.value : []);
        setShowLogoRows(showResult.status === "fulfilled" ? showResult.value : []);
        setFranchiseLogoRows(franchiseResult.status === "fulfilled" ? franchiseResult.value : []);

        if (failures.length > 0) {
          setError(
            `Some brand sources failed to load: ${failures.join(", ")}. Showing available records.`,
          );
        }
      } catch (refreshError) {
        setError(refreshError instanceof Error ? refreshError.message : "Failed to load brands workspace");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWithAuth, loadLogoRows],
  );

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    void refreshData();
  }, [checking, hasAccess, refreshData, user]);

  const records = useMemo(() => {
    const networkRecords = buildNetworkRecords(summary?.rows ?? []);
    const genericRecords = [
      ...buildGenericRecords([...publicationLogoRows, ...socialLogoRows, ...otherLogoRows]),
      ...buildShowRecords(shows, showLogoRows, franchiseLogoRows),
    ];

    return [...networkRecords, ...genericRecords].sort(compareRecords);
  }, [summary?.rows, publicationLogoRows, socialLogoRows, otherLogoRows, shows, showLogoRows, franchiseLogoRows]);

  const filteredRecords = useMemo(
    () => records.filter((record) => categoryMatchesRecord(category, record)),
    [category, records],
  );

  const stats = useMemo(() => {
    const missingLogoCount = filteredRecords.filter((record) => record.missingLogo).length;
    const missingIconCount = filteredRecords.filter((record) => record.missingIcon).length;
    const missingBwCount = filteredRecords.filter((record) => record.missingBw).length;
    const missingLinksCount = filteredRecords.filter((record) => record.missingLinks).length;
    const productionMissingLogoCount = filteredRecords.filter(
      (record) => record.type === "production" && record.missingLogo,
    ).length;
    const productionMissingBwCount = filteredRecords.filter(
      (record) => record.type === "production" && record.missingBw,
    ).length;
    const requiresManualFixes =
      missingLogoCount > 0
      || missingIconCount > 0
      || missingBwCount > 0
      || missingLinksCount > 0;

    return {
      missingLogoCount,
      missingIconCount,
      missingBwCount,
      missingLinksCount,
      productionMissingLogoCount,
      productionMissingBwCount,
      requiresManualFixes,
    };
  }, [filteredRecords]);

  const onSyncLogos = useCallback(async () => {
    const targetTypes = getUnifiedBrandsTargetTypes(category);
    setSyncing(true);
    setSyncError(null);
    setSyncNotice(null);
    try {
      const response = await fetchWithAuth("/api/admin/trr-api/brands/logos/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: "all",
          target_types: targetTypes,
          only_missing: true,
          force: false,
          limit: 200,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as SyncResponsePayload;
      if (!response.ok) {
        throw new Error(payload.error || "Failed to sync brand logos");
      }
      setSyncNotice(
        `Scanned ${Number(payload.targets_scanned ?? 0)} ${normalizeSyncScopeLabel(category)}, imported ${
          Number(payload.imports_created ?? 0) + Number(payload.imports_updated ?? 0)
        }, unresolved ${Number(payload.unresolved ?? 0)}.`,
      );
      await refreshData({ silent: true });
    } catch (syncErr) {
      setSyncError(syncErr instanceof Error ? syncErr.message : "Failed to sync brand logos");
    } finally {
      setSyncing(false);
    }
  }, [category, fetchWithAuth, refreshData]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing brands workspace...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Brands", "/brands")} className="mb-1" />
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="break-words text-3xl font-bold text-zinc-900">Brands</h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    stats.requiresManualFixes
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {stats.requiresManualFixes ? "Manual Fixes Required" : "Ready"}
                </span>
              </div>
              <p className="mt-2 break-words text-sm text-zinc-500">
                Unified workspace for network, production, show, publication, social, and other brand assets.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {UNIFIED_BRANDS_VIEW_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWorkspaceState(category, option.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      view === option.value
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void refreshData({ silent: true })}
                disabled={refreshing || syncing}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => void onSyncLogos()}
                disabled={syncing}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
              >
                {syncing ? "Syncing..." : "Sync Logos"}
              </button>
              <Link
                href="/"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-7xl px-6 py-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {UNIFIED_BRANDS_CATEGORY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWorkspaceState(option.value, view)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      category === option.value
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                  Missing Logos: {stats.missingLogoCount}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                  Missing B/W Variants: {stats.missingBwCount}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                  Missing Links: {stats.missingLinksCount}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                  Production Missing Logos: {stats.productionMissingLogoCount}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                  Production Missing B/W: {stats.productionMissingBwCount}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                  Missing Icon: {stats.missingIconCount}
                </span>
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            {syncError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {syncError}
              </p>
            ) : null}
            {syncNotice ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {syncNotice}
              </p>
            ) : null}

            {loading ? (
              <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
                Loading brands workspace...
              </div>
            ) : null}

            {!loading && view === "table" ? (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Type</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Brand</th>
                      <th className="px-3 py-2 text-right font-semibold text-zinc-700">Available Shows</th>
                      <th className="px-3 py-2 text-right font-semibold text-zinc-700">Added Shows</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Logo</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">External IDs</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                          No rows available for this category.
                        </td>
                      </tr>
                    ) : null}
                    {filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer transition hover:bg-zinc-50"
                        onClick={() =>
                          setLogoPickerState({
                            targetType: record.type,
                            targetKey: record.targetKey,
                            targetLabel: record.label,
                            defaultIconUrl: record.defaultIconUrl,
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          setLogoPickerState({
                            targetType: record.type,
                            targetKey: record.targetKey,
                            targetLabel: record.label,
                            defaultIconUrl: record.defaultIconUrl,
                          });
                        }}
                      >
                        <td className="px-3 py-2 text-zinc-700">{TYPE_LABELS[record.type]}</td>
                        <td className="max-w-[320px] px-3 py-2 font-medium text-zinc-900 [overflow-wrap:anywhere]">
                          {record.detailHref ? (
                            <Link
                              href={record.detailHref as Route}
                              className="text-zinc-900 underline-offset-2 hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {record.label}
                            </Link>
                          ) : (
                            record.label
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                          {typeof record.availableShowCount === "number" ? record.availableShowCount : "-"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                          {typeof record.addedShowCount === "number" ? record.addedShowCount : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="relative h-8 w-[120px] overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={record.wordmarkUrl || PLACEHOLDER_ICON_PATH}
                                alt={`${record.label} wordmark`}
                                className="h-full w-full object-contain p-1"
                              />
                            </div>
                            <div className="relative h-8 w-8 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={record.iconUrl || record.defaultIconUrl || PLACEHOLDER_ICON_PATH}
                                alt={`${record.label} icon`}
                                className="h-full w-full object-contain p-1"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {record.externalLinks.tmdbUrl
                            || record.externalLinks.imdbUrl
                            || record.externalLinks.wikidataUrl
                            || record.externalLinks.wikipediaUrl
                            || record.externalLinks.websiteUrl ? (
                              <div className="flex flex-wrap gap-1">
                                {record.externalLinks.tmdbUrl ? (
                                  <a
                                    href={record.externalLinks.tmdbUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 no-underline hover:bg-green-200"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    TMDb
                                  </a>
                                ) : null}
                                {record.externalLinks.imdbUrl ? (
                                  <a
                                    href={record.externalLinks.imdbUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 no-underline hover:bg-green-200"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    IMDb
                                  </a>
                                ) : null}
                                {record.externalLinks.wikidataUrl ? (
                                  <a
                                    href={record.externalLinks.wikidataUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 no-underline hover:bg-green-200"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    Wikidata
                                  </a>
                                ) : null}
                                {record.externalLinks.wikipediaUrl ? (
                                  <a
                                    href={record.externalLinks.wikipediaUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 no-underline hover:bg-green-200"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    Wikipedia
                                  </a>
                                ) : null}
                                {record.externalLinks.websiteUrl ? (
                                  <a
                                    href={record.externalLinks.websiteUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 no-underline hover:bg-green-200"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    Site
                                  </a>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-zinc-400">-</span>
                            )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              getCardStatus(record) === "complete"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {getCardStatus(record) === "complete" ? "Complete" : "Needs attention"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {!loading && view === "gallery" ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRecords.length === 0 ? (
                  <div className="col-span-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
                    No cards available for this category.
                  </div>
                ) : null}
                {filteredRecords.map((record) => (
                  <article
                    key={record.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded border border-zinc-200 p-3 transition hover:border-zinc-300 hover:bg-zinc-50"
                    onClick={() =>
                      setLogoPickerState({
                        targetType: record.type,
                        targetKey: record.targetKey,
                        targetLabel: record.label,
                        defaultIconUrl: record.defaultIconUrl,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setLogoPickerState({
                        targetType: record.type,
                        targetKey: record.targetKey,
                        targetLabel: record.label,
                        defaultIconUrl: record.defaultIconUrl,
                      });
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">{record.label}</p>
                        <p className="truncate text-xs text-zinc-500">{TYPE_LABELS[record.type]}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          getCardStatus(record) === "complete"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {getCardStatus(record) === "complete" ? "Complete" : "Needs attention"}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <div className="relative h-12 w-28 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={record.wordmarkUrl || PLACEHOLDER_ICON_PATH}
                          alt={`${record.label} wordmark`}
                          className="h-full w-full object-contain p-1"
                        />
                      </div>
                      <div className="relative h-12 w-12 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={record.iconUrl || record.defaultIconUrl || PLACEHOLDER_ICON_PATH}
                          alt={`${record.label} icon`}
                          className="h-full w-full object-contain p-1"
                        />
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {record.sourceProvider ? (
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          {record.sourceProvider.replace(/_/g, " ")}
                        </p>
                      ) : null}
                      <p className="text-xs text-zinc-500">
                        Wordmark: {record.wordmarkUrl ? "available" : "missing"} · Icon:{" "}
                        {record.iconUrl ? "available" : "missing"}
                      </p>
                      {typeof record.availableShowCount === "number" ? (
                        <p className="text-xs text-zinc-500">
                          Available shows: {record.availableShowCount}
                          {typeof record.addedShowCount === "number" ? ` · Added shows: ${record.addedShowCount}` : ""}
                        </p>
                      ) : null}
                    </div>
                    {getCardStatus(record) !== "complete" ? (
                      <p className="mt-1 text-xs text-amber-700">
                        Missing{" "}
                        {record.missingLogo && record.missingIcon
                          ? "wordmark + icon"
                          : record.missingLogo
                            ? "wordmark"
                            : record.missingIcon
                              ? "icon"
                              : record.missingBw
                                ? "B/W variants"
                                : "links"}
                        .
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </main>

        {logoPickerState ? (
          <BrandLogoOptionsModal
            isOpen={Boolean(logoPickerState)}
            onClose={() => setLogoPickerState(null)}
            preferredUser={user}
            targetType={logoPickerState.targetType}
            targetKey={logoPickerState.targetKey}
            targetLabel={logoPickerState.targetLabel}
            defaultIconUrl={logoPickerState.defaultIconUrl}
            onSaved={() => refreshData({ silent: true })}
          />
        ) : null}
      </div>
    </ClientOnly>
  );
}
