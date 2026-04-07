import { buildHostFaviconUrl } from "@/lib/admin/show-page/link-display";

type OverviewShowLike = {
  name?: string | null;
  alternative_names?: string[] | null;
  overview_alternative_names?: string[] | null;
  networks?: string[] | null;
  overview_networks?: string[] | null;
  streaming_providers?: string[] | null;
  watch_providers?: string[] | null;
  overview_streaming_providers?: string[] | null;
  derived_external_links?: {
    justwatch_url?: string | null;
  } | null;
  overview_watch_availability?:
    | Array<{
        region?: string | null;
        stream?: string[] | null;
        buy?: string[] | null;
      }>
    | null;
  watch_provider_regions?:
    | Array<{
        region?: string | null;
        stream?: string[] | null;
        free?: string[] | null;
        buy_rent?: string[] | null;
      }>
    | null;
};

export type OverviewSeasonLike = {
  id: string;
  season_number: number;
  fandom_source_url?: string | null;
  fandom_page_title?: string | null;
};

export type OverviewSeasonCoverageLink = {
  id: string;
  seasonNumber: number;
  url: string;
  sourceKind: string;
  sourceLabel: string;
  iconUrl: string | null;
  linkTitle: string | null;
  link?: unknown;
};

export type OverviewSeasonCoverageRow = {
  seasonNumber: number;
  links: Omit<OverviewSeasonCoverageLink, "seasonNumber">[];
};

type OverviewRedditCommunityLike = {
  id: string;
  subreddit?: string | null;
  display_name?: string | null;
  post_flairs?: string[] | null;
  analysis_flairs?: string[] | null;
  analysis_all_flairs?: string[] | null;
  is_show_focused?: boolean | null;
  network_focus_targets?: string[] | null;
  franchise_focus_targets?: string[] | null;
};

export type OverviewWatchAvailabilityRow = {
  regionCode: "US" | "GB" | "CA" | "AU";
  regionLabel: string;
  included: string[];
  buyRent: string[];
};

export type OverviewWatchProviderRegionRow = {
  regionCode: string;
  regionLabel: string;
  stream: string[];
  free: string[];
  buyRent: string[];
};

export type OverviewWatchProviderRegionOption = {
  regionCode: string;
  regionLabel: string;
};

export type OverviewRedditGroupKey = "SHOW" | "FRANCHISE" | "NETWORK";

export type OverviewRedditCommunityRow = {
  id: string;
  subreddit: string;
  displayName: string;
  assignedFlairs: string[];
  postFlairs: string[];
};

export type OverviewRedditGroup = {
  key: OverviewRedditGroupKey;
  label: string;
  communities: OverviewRedditCommunityRow[];
};

const normalizeStringArray = (value: string[] | null | undefined): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const dedupeStrings = (values: string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(value);
  }
  return deduped;
};

const normalizeMatchKey = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const isNameTargetMatch = (showName: string, targets: string[]): boolean => {
  const normalizedShowName = normalizeMatchKey(showName);
  if (!normalizedShowName) return false;
  return targets.some((target) => {
    const normalizedTarget = normalizeMatchKey(target);
    return (
      normalizedTarget.length > 0 &&
      (normalizedShowName.includes(normalizedTarget) || normalizedTarget.includes(normalizedShowName))
    );
  });
};

const isNetworkTargetMatch = (networks: string[], targets: string[]): boolean => {
  const normalizedNetworks = new Set(networks.map((network) => normalizeMatchKey(network)).filter(Boolean));
  if (normalizedNetworks.size === 0) return false;
  return targets.some((target) => normalizedNetworks.has(normalizeMatchKey(target)));
};

const normalizeCoverageUrl = (value: string): string => {
  try {
    const parsed = new URL(value.trim());
    const path = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return value.trim().toLowerCase();
  }
};

const coverageSourceOrder = (kind: string): number => {
  if (kind === "fandom") return 0;
  if (kind === "wikipedia") return 1;
  if (kind === "bravo") return 2;
  return 10;
};

const WATCH_PROVIDER_REGION_LABELS: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
};

const watchProviderRegionSortKey = (regionCode: string): [number, string] => {
  if (regionCode === "US") return [0, regionCode];
  if (regionCode === "GB") return [1, regionCode];
  if (regionCode === "CA") return [2, regionCode];
  if (regionCode === "AU") return [3, regionCode];
  return [99, regionCode];
};

const normalizeWatchProviderBucket = (values: string[]): string[] => dedupeStrings(values).sort((a, b) => a.localeCompare(b));

const buildRegionLabel = (regionCode: string): string => WATCH_PROVIDER_REGION_LABELS[regionCode] ?? regionCode;

export const buildOverviewAlternativeNamesText = (show: OverviewShowLike | null | undefined): string => {
  if (!show) return "";
  const preferred = dedupeStrings(normalizeStringArray(show.overview_alternative_names));
  if (preferred.length > 0) {
    return preferred.join("\n");
  }
  const displayName = String(show.name || "").trim().toLowerCase();
  const fallback = dedupeStrings(
    normalizeStringArray(show.alternative_names).filter((name) => name.trim().toLowerCase() !== displayName)
  );
  return fallback.join("\n");
};

export const getOverviewNetworks = (show: OverviewShowLike | null | undefined): string[] => {
  if (!show) return [];
  const preferred = dedupeStrings(normalizeStringArray(show.overview_networks));
  if (preferred.length > 0) return preferred;
  return dedupeStrings(normalizeStringArray(show.networks));
};

export const getOverviewStreamingProviders = (show: OverviewShowLike | null | undefined): string[] => {
  if (!show) return [];
  const preferred = dedupeStrings(normalizeStringArray(show.overview_streaming_providers));
  if (preferred.length > 0) return preferred;
  return dedupeStrings([
    ...normalizeStringArray(show.streaming_providers),
    ...normalizeStringArray(show.watch_providers),
  ]);
};

export const getOverviewJustwatchUrl = (show: OverviewShowLike | null | undefined): string | null => {
  const value = show?.derived_external_links?.justwatch_url;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

export const buildOverviewWatchAvailability = (
  show: OverviewShowLike | null | undefined
): OverviewWatchAvailabilityRow[] => {
  const rows = Array.isArray(show?.overview_watch_availability) ? show.overview_watch_availability : [];
  const labels: Record<OverviewWatchAvailabilityRow["regionCode"], string> = {
    US: "United States",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
  };

  return rows
    .map((row) => {
      const regionCode = String(row?.region || "").trim().toUpperCase() as OverviewWatchAvailabilityRow["regionCode"];
      if (!(regionCode in labels)) return null;
      const included = dedupeStrings(normalizeStringArray(row?.stream)).sort((a, b) => a.localeCompare(b));
      const includedKeys = new Set(included.map((provider) => provider.toLowerCase()));
      const buyRent = dedupeStrings(normalizeStringArray(row?.buy))
        .filter((provider) => !includedKeys.has(provider.toLowerCase()))
        .sort((a, b) => a.localeCompare(b));
      if (included.length === 0 && buyRent.length === 0) return null;
      return {
        regionCode,
        regionLabel: labels[regionCode],
        included,
        buyRent,
      };
    })
    .filter((row): row is OverviewWatchAvailabilityRow => row !== null);
};

export const buildOverviewWatchProviderRegions = (
  show: OverviewShowLike | null | undefined
): OverviewWatchProviderRegionRow[] => {
  const rawRows = Array.isArray(show?.watch_provider_regions) ? show.watch_provider_regions : [];
  if (rawRows.length === 0) {
    return buildOverviewWatchAvailability(show).map((row) => ({
      regionCode: row.regionCode,
      regionLabel: row.regionLabel,
      stream: row.included,
      free: [],
      buyRent: row.buyRent,
    }));
  }

  return rawRows
    .map((row) => {
      const regionCode = String(row?.region || "").trim().toUpperCase();
      if (!regionCode) return null;
      const stream = normalizeWatchProviderBucket(normalizeStringArray(row?.stream));
      const free = normalizeWatchProviderBucket(normalizeStringArray(row?.free));
      const buyRent = normalizeWatchProviderBucket(normalizeStringArray(row?.buy_rent));
      if (stream.length === 0 && free.length === 0 && buyRent.length === 0) return null;
      return {
        regionCode,
        regionLabel: buildRegionLabel(regionCode),
        stream,
        free,
        buyRent,
      };
    })
    .filter((row): row is OverviewWatchProviderRegionRow => row !== null)
    .sort((a, b) => {
      const [aPriority, aCode] = watchProviderRegionSortKey(a.regionCode);
      const [bPriority, bCode] = watchProviderRegionSortKey(b.regionCode);
      const priorityDiff = aPriority - bPriority;
      if (priorityDiff !== 0) return priorityDiff;
      return aCode.localeCompare(bCode);
    });
};

export const buildOverviewWatchProviderRegionOptions = (
  show: OverviewShowLike | null | undefined
): OverviewWatchProviderRegionOption[] =>
  buildOverviewWatchProviderRegions(show).map((row) => ({
    regionCode: row.regionCode,
    regionLabel: row.regionLabel,
  }));

export const resolveDefaultOverviewWatchProviderRegion = (
  regions: OverviewWatchProviderRegionRow[]
): string | null => {
  if (regions.length === 0) return null;
  return regions.find((row) => row.regionCode === "US")?.regionCode ?? regions[0]?.regionCode ?? null;
};

export const resolveOverviewWatchProviderRegion = ({
  regions,
  selectedRegionCode,
}: {
  regions: OverviewWatchProviderRegionRow[];
  selectedRegionCode: string | null | undefined;
}): OverviewWatchProviderRegionRow | null => {
  if (regions.length === 0) return null;
  const normalizedSelected = String(selectedRegionCode || "").trim().toUpperCase();
  if (!normalizedSelected) return regions[0] ?? null;
  return regions.find((row) => row.regionCode === normalizedSelected) ?? regions[0] ?? null;
};

export const buildOverviewWatchProviderFallback = (
  show: OverviewShowLike | null | undefined
): string[] => {
  const providers = getOverviewStreamingProviders(show);
  return normalizeWatchProviderBucket(providers);
};

export const buildOverviewRedditGroups = ({
  showName,
  networks,
  communities,
}: {
  showName: string | null | undefined;
  networks: string[];
  communities: OverviewRedditCommunityLike[];
}): OverviewRedditGroup[] => {
  const grouped = new Map<OverviewRedditGroupKey, OverviewRedditCommunityRow[]>();
  const trimmedShowName = String(showName || "").trim();

  for (const community of communities) {
    const subreddit = String(community.subreddit || "").trim();
    if (!subreddit) continue;

    let bucket: OverviewRedditGroupKey | null = null;
    if (community.is_show_focused) {
      bucket = "SHOW";
    } else if (
      trimmedShowName &&
      isNameTargetMatch(trimmedShowName, normalizeStringArray(community.franchise_focus_targets))
    ) {
      bucket = "FRANCHISE";
    } else if (isNetworkTargetMatch(networks, normalizeStringArray(community.network_focus_targets))) {
      bucket = "NETWORK";
    }

    if (!bucket) continue;

    const existing = grouped.get(bucket) ?? [];
    existing.push({
      id: community.id,
      subreddit,
      displayName: String(community.display_name || "").trim() || `r/${subreddit}`,
      assignedFlairs: dedupeStrings([
        ...normalizeStringArray(community.analysis_all_flairs),
        ...normalizeStringArray(community.analysis_flairs),
      ]),
      postFlairs: dedupeStrings(normalizeStringArray(community.post_flairs)),
    });
    grouped.set(bucket, existing);
  }

  const orderedGroups: Array<{ key: OverviewRedditGroupKey; label: string }> = [
    { key: "SHOW", label: "SHOW" },
    { key: "FRANCHISE", label: "FRANCHISE" },
    { key: "NETWORK", label: "NETWORK" },
  ];

  return orderedGroups
    .map(({ key, label }) => ({
      key,
      label,
      communities: (grouped.get(key) ?? []).sort((a, b) => {
        const displayDiff = a.displayName.localeCompare(b.displayName);
        if (displayDiff !== 0) return displayDiff;
        return a.subreddit.localeCompare(b.subreddit);
      }),
    }))
    .filter((group) => group.communities.length > 0);
};

export const buildSeasonCoverageRows = ({
  seasons,
  entityLinkPills,
}: {
  seasons: OverviewSeasonLike[];
  entityLinkPills: OverviewSeasonCoverageLink[];
}): OverviewSeasonCoverageRow[] => {
  const linksBySeasonNumber = new Map<number, OverviewSeasonCoverageLink[]>();

  for (const pill of entityLinkPills) {
    if (pill.seasonNumber <= 0 || !pill.url.trim()) continue;
    const existing = linksBySeasonNumber.get(pill.seasonNumber) ?? [];
    existing.push(pill);
    linksBySeasonNumber.set(pill.seasonNumber, existing);
  }

  for (const season of seasons) {
    if (season.season_number <= 0 || !season.fandom_source_url?.trim()) continue;
    const existing = linksBySeasonNumber.get(season.season_number) ?? [];
    existing.push({
      id: `season-fandom-${season.id}`,
      seasonNumber: season.season_number,
      url: season.fandom_source_url.trim(),
      sourceKind: "fandom",
      sourceLabel: "Fandom",
      iconUrl: buildHostFaviconUrl(season.fandom_source_url),
      linkTitle: season.fandom_page_title?.trim() || `Season ${season.season_number}`,
    });
    linksBySeasonNumber.set(season.season_number, existing);
  }

  return Array.from(linksBySeasonNumber.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([seasonNumber, links]) => {
      const dedupedMap = new Map<
        string,
        Omit<OverviewSeasonCoverageLink, "seasonNumber">
      >();
      for (const link of links) {
        const key = normalizeCoverageUrl(link.url);
        if (dedupedMap.has(key)) continue;
        dedupedMap.set(key, {
          id: link.id,
          url: link.url.trim(),
          sourceKind: link.sourceKind,
          sourceLabel: link.sourceLabel,
          iconUrl: link.iconUrl,
          linkTitle: link.linkTitle,
          link: link.link,
        });
      }
      const deduped = Array.from(dedupedMap.values()).sort((a, b) => {
        const orderDiff = coverageSourceOrder(a.sourceKind) - coverageSourceOrder(b.sourceKind);
        if (orderDiff !== 0) return orderDiff;
        const labelDiff = a.sourceLabel.localeCompare(b.sourceLabel);
        if (labelDiff !== 0) return labelDiff;
        return a.url.localeCompare(b.url);
      });

      return {
        seasonNumber,
        links: deduped,
      };
    });
};
