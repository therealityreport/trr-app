import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import {
  cleanLegacyRoutingQuery,
  type SeasonAssetsSubTab,
  type SeasonAdminTab,
} from "@/lib/admin/show-admin-routes";

interface SeasonTabAliasPageProps {
  params: Promise<{ showId: string; showSection: string; seasonTab: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const ALLOWED_SEASON_TABS = new Set([
  "overview",
  "episodes",
  "assets",
  "videos",
  "news",
  "fandom",
  "cast",
  "credits",
  "surveys",
  "social",
  "details",
]);

const serializeSearchParams = (input: Record<string, string | string[] | undefined>): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      query.append(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }
  return query.toString();
};

const buildInternalSeasonAdminUrl = ({
  showId,
  seasonNumber,
  tab,
  assetsSubTab,
  query,
}: {
  showId: string;
  seasonNumber: number;
  tab: SeasonAdminTab;
  assetsSubTab?: SeasonAssetsSubTab;
  query: URLSearchParams;
}): string => {
  const nextQuery = new URLSearchParams(query.toString());
  nextQuery.delete("tab");
  nextQuery.delete("assets");

  if (tab === "assets") {
    nextQuery.set("tab", "assets");
    if (assetsSubTab && assetsSubTab !== "images") {
      nextQuery.set("assets", assetsSubTab);
    }
  } else if (tab !== "overview") {
    nextQuery.set("tab", tab);
  }

  const search = nextQuery.toString();
  const basePath = `/admin/trr-shows/${encodeURIComponent(showId)}/seasons/${seasonNumber}`;
  return search ? `${basePath}?${search}` : basePath;
};

export default async function SeasonTabAliasPage({ params, searchParams }: SeasonTabAliasPageProps) {
  const { showId, showSection, seasonTab } = await params;
  const resolvedSearchParams = (searchParams ? await searchParams : {}) as Record<
    string,
    string | string[] | undefined
  >;
  const normalizedSlug = showSection.trim().toLowerCase();
  const normalizedTab = seasonTab.trim().toLowerCase();
  const canonicalTab =
    normalizedTab === "details" ? "overview" : normalizedTab === "credits" ? "cast" : normalizedTab;

  const seasonMatch = normalizedSlug.match(/^season-([0-9]{1,3})$/);
  if (!seasonMatch) {
    notFound();
  }
  if (!ALLOWED_SEASON_TABS.has(normalizedTab)) {
    notFound();
  }

  if (normalizedTab === "cast") {
    redirect(`/admin/trr-shows/${encodeURIComponent(showId)}/${encodeURIComponent(showSection)}/credits` as Route);
  }

  const seasonNumber = Number.parseInt(seasonMatch[1], 10);
  if (!Number.isFinite(seasonNumber)) {
    notFound();
  }

  const query = new URLSearchParams(serializeSearchParams(resolvedSearchParams));
  const cleanedQuery = cleanLegacyRoutingQuery(query);

  let canonicalRouteTab: SeasonAdminTab = canonicalTab as SeasonAdminTab;
  let assetsSubTab: SeasonAssetsSubTab | undefined;
  if (normalizedTab === "videos") {
    canonicalRouteTab = "assets";
    assetsSubTab = "videos";
  } else if (canonicalTab === "details") {
    canonicalRouteTab = "overview";
  } else if (canonicalTab === "assets") {
    assetsSubTab = "images";
  }

  const destination = buildInternalSeasonAdminUrl({
    showId,
    seasonNumber,
    tab: canonicalRouteTab,
    assetsSubTab,
    query: cleanedQuery,
  });
  redirect(
    destination as Route,
  );
}
