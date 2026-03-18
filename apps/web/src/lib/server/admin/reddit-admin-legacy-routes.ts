import "server-only";

import {
  buildAdminRedditCommunityUrl,
  buildAdminRedditCommunityWindowUrl,
} from "@/lib/admin/show-admin-routes";
import { resolvePreferredShowRouteSlug } from "@/lib/admin/show-route-slug";
import { getRedditCommunityById } from "@/lib/server/admin/reddit-sources-repository";
import {
  getSeasonById,
  getSeasonByShowAndNumber,
  getShowById,
} from "@/lib/server/trr-api/trr-shows-repository";
import { notFound } from "next/navigation";

export type LegacyRouteSearchParams = Record<string, string | string[] | undefined>;

const OMITTED_QUERY_KEYS = new Set([
  "return_to",
  "show",
  "showSlug",
  "season",
  "season_id",
  "seasonId",
  "trr_season_id",
]);

const getFirstSearchParam = (
  searchParams: LegacyRouteSearchParams | undefined,
  ...keys: string[]
): string | null => {
  for (const key of keys) {
    const value = searchParams?.[key];
    if (Array.isArray(value)) {
      const first = value.find((entry) => typeof entry === "string" && entry.trim().length > 0);
      if (first) return first;
      continue;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
};

const parsePositiveInteger = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const toCanonicalQuery = (searchParams?: LegacyRouteSearchParams): URLSearchParams => {
  const query = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(searchParams ?? {})) {
    if (OMITTED_QUERY_KEYS.has(key)) continue;
    if (Array.isArray(rawValue)) {
      for (const entry of rawValue) {
        query.append(key, entry);
      }
      continue;
    }
    if (typeof rawValue === "string") {
      query.set(key, rawValue);
    }
  }
  return query;
};

const appendQuery = (pathname: string, query: URLSearchParams): string => {
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
};

const resolveSeasonNumber = async (
  showId: string,
  searchParams?: LegacyRouteSearchParams,
): Promise<number | null> => {
  const seasonId = getFirstSearchParam(searchParams, "season_id", "seasonId", "trr_season_id");
  if (seasonId) {
    const season = await getSeasonById(seasonId).catch(() => null);
    if (season?.show_id === showId && Number.isFinite(season.season_number) && season.season_number > 0) {
      return season.season_number;
    }
  }

  const explicitSeasonNumber = parsePositiveInteger(
    getFirstSearchParam(searchParams, "season", "seasonNumber", "season_number"),
  );
  if (!explicitSeasonNumber) return null;
  const season = await getSeasonByShowAndNumber(showId, explicitSeasonNumber).catch(() => null);
  return season?.season_number ?? explicitSeasonNumber;
};

const resolveCanonicalBase = async (
  communityId: string,
  searchParams?: LegacyRouteSearchParams,
): Promise<{
  communitySlug: string;
  showSlug: string;
  seasonNumber: number | null;
  query: URLSearchParams;
}> => {
  const community = await getRedditCommunityById(communityId).catch(() => null);
  if (!community) {
    notFound();
  }

  const show = await getShowById(community.trr_show_id).catch(() => null);
  if (!show) {
    notFound();
  }

  const communitySlug = community.subreddit.trim();
  if (!communitySlug) {
    notFound();
  }

  const showSlug = resolvePreferredShowRouteSlug({
    alternativeNames: show.alternative_names,
    canonicalSlug: show.canonical_slug,
    slug: show.slug,
    fallback: show.name,
  });

  return {
    communitySlug,
    showSlug,
    seasonNumber: await resolveSeasonNumber(show.id, searchParams),
    query: toCanonicalQuery(searchParams),
  };
};

export async function resolveLegacyAdminRedditCanonicalHref(input: {
  communityId: string;
  searchParams?: LegacyRouteSearchParams;
  windowKey?: string;
  postId?: string;
}): Promise<string> {
  const base = await resolveCanonicalBase(input.communityId, input.searchParams);

  if (input.windowKey && input.postId) {
    const windowHref = buildAdminRedditCommunityWindowUrl({
      communitySlug: base.communitySlug,
      showSlug: base.showSlug,
      seasonNumber: base.seasonNumber,
      windowKey: input.windowKey,
    });
    return appendQuery(`${windowHref}/post/${encodeURIComponent(input.postId)}`, base.query);
  }

  if (input.windowKey) {
    return buildAdminRedditCommunityWindowUrl({
      communitySlug: base.communitySlug,
      showSlug: base.showSlug,
      seasonNumber: base.seasonNumber,
      windowKey: input.windowKey,
      query: base.query,
    });
  }

  return buildAdminRedditCommunityUrl({
    communitySlug: base.communitySlug,
    showSlug: base.showSlug,
    seasonNumber: base.seasonNumber,
    query: base.query,
  });
}
