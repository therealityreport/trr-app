export type ShowAdminTab =
  | "details"
  | "settings"
  | "seasons"
  | "assets"
  | "news"
  | "cast"
  | "surveys"
  | "social";

export type ShowAssetsSubTab = "images" | "videos" | "brand";

export type SeasonAdminTab =
  | "episodes"
  | "assets"
  | "videos"
  | "fandom"
  | "cast"
  | "surveys"
  | "social"
  | "details";

export type SeasonAssetsSubTab = "media" | "brand";
export type PersonAdminTab =
  | "overview"
  | "gallery"
  | "videos"
  | "news"
  | "credits"
  | "fandom";

type RouteSource = "path" | "query" | "default";

export type ParsedShowRouteState = {
  tab: ShowAdminTab;
  assetsSubTab: ShowAssetsSubTab;
  source: RouteSource;
};

export type ParsedSeasonRouteState = {
  tab: SeasonAdminTab;
  assetsSubTab: SeasonAssetsSubTab;
  source: RouteSource;
};

export type ParsedPersonRouteState = {
  tab: PersonAdminTab;
  source: RouteSource;
};

const SHOW_TAB_BY_PATH_SEGMENT: Record<string, ShowAdminTab> = {
  overview: "details",
  details: "details",
  settings: "settings",
  seasons: "seasons",
  assets: "assets",
  news: "news",
  cast: "cast",
  surveys: "surveys",
  social: "social",
  "media-gallery": "assets",
  "media-videos": "assets",
  "media-brand": "assets",
};

const SHOW_ASSETS_SUBTAB_BY_SEGMENT: Record<string, ShowAssetsSubTab> = {
  images: "images",
  videos: "videos",
  brand: "brand",
  gallery: "images",
  media: "images",
};

const SHOW_TAB_BY_QUERY_ALIAS: Record<string, ShowAdminTab> = {
  overview: "details",
  details: "details",
  settings: "settings",
  seasons: "seasons",
  assets: "assets",
  news: "news",
  cast: "cast",
  surveys: "surveys",
  social: "social",
  gallery: "assets",
};

const SEASON_TAB_BY_PATH_SEGMENT: Record<string, SeasonAdminTab> = {
  episodes: "episodes",
  assets: "assets",
  videos: "videos",
  fandom: "fandom",
  cast: "cast",
  surveys: "surveys",
  social: "social",
  details: "details",
};

const SEASON_ASSETS_SUBTAB_BY_SEGMENT: Record<string, SeasonAssetsSubTab> = {
  media: "media",
  gallery: "media",
  brand: "brand",
};

const SEASON_TAB_BY_QUERY_ALIAS: Record<string, SeasonAdminTab> = {
  episodes: "episodes",
  assets: "assets",
  videos: "videos",
  fandom: "fandom",
  cast: "cast",
  surveys: "surveys",
  social: "social",
  details: "details",
  media: "assets",
};

const PERSON_TAB_BY_PATH_SEGMENT: Record<string, PersonAdminTab> = {
  overview: "overview",
  details: "overview",
  gallery: "gallery",
  videos: "videos",
  news: "news",
  credits: "credits",
  fandom: "fandom",
};

const PERSON_TAB_BY_QUERY_ALIAS: Record<string, PersonAdminTab> = {
  overview: "overview",
  details: "overview",
  gallery: "gallery",
  videos: "videos",
  news: "news",
  credits: "credits",
  fandom: "fandom",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const normalizeSegment = (value: string | null | undefined): string => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

const toSegments = (pathname: string): string[] => {
  return pathname
    .split("?")[0]
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
};

const getShowBaseSegments = (pathname: string): string[] | null => {
  const segments = toSegments(pathname);
  const showIndex = segments.findIndex(
    (segment, idx) => segment === "trr-shows" && idx > 0 && segments[idx - 1] === "admin"
  );
  if (showIndex < 0) return null;
  const showSlugIndex = showIndex + 1;
  if (showSlugIndex >= segments.length) return null;
  return segments.slice(showSlugIndex + 1);
};

const getSeasonBaseSegments = (pathname: string): string[] | null => {
  const showSegments = getShowBaseSegments(pathname);
  if (!showSegments || showSegments.length < 2) return null;
  if (normalizeSegment(showSegments[0]) !== "seasons") return null;
  return showSegments.slice(2);
};

const getPersonBaseSegments = (pathname: string): string[] | null => {
  const segments = toSegments(pathname);
  const showIndex = segments.findIndex(
    (segment, idx) => segment === "trr-shows" && idx > 0 && segments[idx - 1] === "admin"
  );
  if (showIndex < 0) return null;

  const showSlugIndex = showIndex + 1;
  if (showSlugIndex >= segments.length) return null;

  if (normalizeSegment(segments[showSlugIndex]) === "people") {
    if (showSlugIndex + 1 >= segments.length) return null;
    return segments.slice(showSlugIndex + 2);
  }

  if (normalizeSegment(segments[showSlugIndex + 1]) !== "people") {
    return null;
  }
  if (showSlugIndex + 2 >= segments.length) {
    return null;
  }
  return segments.slice(showSlugIndex + 3);
};

const appendQuery = (path: string, query?: URLSearchParams): string => {
  if (!query) return path;
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export function cleanLegacyRoutingQuery(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  next.delete("tab");
  next.delete("assets");
  next.delete("social_platform");
  next.delete("social_view");
  next.delete("source_scope");
  next.delete("scope");
  return next;
}

export function cleanLegacyPersonRoutingQuery(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  next.delete("tab");
  next.delete("showId");
  return next;
}

export function parseShowRouteState(
  pathname: string,
  searchParams: URLSearchParams
): ParsedShowRouteState {
  const showSegments = getShowBaseSegments(pathname);
  if (showSegments && showSegments.length > 0) {
    const first = normalizeSegment(showSegments[0]);
    const mappedTab = SHOW_TAB_BY_PATH_SEGMENT[first];
    if (mappedTab === "assets") {
      let assetsSubTab: ShowAssetsSubTab = "images";
      if (first === "media-videos") assetsSubTab = "videos";
      if (first === "media-brand") assetsSubTab = "brand";
      if (first === "assets") {
        const second = normalizeSegment(showSegments[1]);
        assetsSubTab = SHOW_ASSETS_SUBTAB_BY_SEGMENT[second] ?? "images";
      }
      return { tab: "assets", assetsSubTab, source: "path" };
    }
    if (mappedTab) {
      return { tab: mappedTab, assetsSubTab: "images", source: "path" };
    }
  }

  const tabParam = normalizeSegment(searchParams.get("tab"));
  const mappedTab = SHOW_TAB_BY_QUERY_ALIAS[tabParam];
  if (mappedTab === "assets") {
    const assetsParam = normalizeSegment(searchParams.get("assets"));
    return {
      tab: "assets",
      assetsSubTab: SHOW_ASSETS_SUBTAB_BY_SEGMENT[assetsParam] ?? "images",
      source: "query",
    };
  }
  if (mappedTab) {
    return { tab: mappedTab, assetsSubTab: "images", source: "query" };
  }

  return {
    tab: "details",
    assetsSubTab: "images",
    source: "default",
  };
}

export function parseSeasonRouteState(
  pathname: string,
  searchParams: URLSearchParams
): ParsedSeasonRouteState {
  const seasonSegments = getSeasonBaseSegments(pathname);
  if (seasonSegments) {
    const first = normalizeSegment(seasonSegments[0]);
    if (first) {
      if (first === "assets") {
        const second = normalizeSegment(seasonSegments[1]);
        return {
          tab: "assets",
          assetsSubTab: SEASON_ASSETS_SUBTAB_BY_SEGMENT[second] ?? "media",
          source: "path",
        };
      }

      const mappedTab = SEASON_TAB_BY_PATH_SEGMENT[first];
      if (mappedTab) {
        return {
          tab: mappedTab,
          assetsSubTab: "media",
          source: "path",
        };
      }
    }
  }

  const tabParam = normalizeSegment(searchParams.get("tab"));
  const mappedTab = SEASON_TAB_BY_QUERY_ALIAS[tabParam];
  if (mappedTab === "assets") {
    const assetsParam = normalizeSegment(searchParams.get("assets"));
    return {
      tab: "assets",
      assetsSubTab: SEASON_ASSETS_SUBTAB_BY_SEGMENT[assetsParam] ?? "media",
      source: "query",
    };
  }
  if (mappedTab) {
    return { tab: mappedTab, assetsSubTab: "media", source: "query" };
  }

  if (seasonSegments) {
    return { tab: "episodes", assetsSubTab: "media", source: "path" };
  }

  return { tab: "episodes", assetsSubTab: "media", source: "default" };
}

export function parsePersonRouteState(
  pathname: string,
  searchParams: URLSearchParams
): ParsedPersonRouteState {
  const personSegments = getPersonBaseSegments(pathname);
  if (personSegments && personSegments.length > 0) {
    const first = normalizeSegment(personSegments[0]);
    const mapped = PERSON_TAB_BY_PATH_SEGMENT[first];
    if (mapped) {
      return { tab: mapped, source: "path" };
    }
  }

  const tabParam = normalizeSegment(searchParams.get("tab"));
  const mappedTab = PERSON_TAB_BY_QUERY_ALIAS[tabParam];
  if (mappedTab) {
    return { tab: mappedTab, source: "query" };
  }

  return { tab: "overview", source: "default" };
}

export function toPersonSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildPersonRouteSlug(input: {
  personName: string | null | undefined;
  personId: string;
}): string {
  const base = toPersonSlug(input.personName ?? "");
  const fallback = base || "person";
  const id = input.personId.trim().toLowerCase();
  if (!UUID_RE.test(id)) return fallback;
  return `${fallback}--${id.slice(0, 8)}`;
}

export function buildShowAdminUrl(input: {
  showSlug: string;
  tab?: ShowAdminTab;
  assetsSubTab?: ShowAssetsSubTab;
  query?: URLSearchParams;
}): string {
  const slug = encodeURIComponent(input.showSlug.trim());
  const tab = input.tab ?? "details";
  const assetsSubTab = input.assetsSubTab ?? "images";
  const base = `/admin/trr-shows/${slug}`;

  if (tab === "details") {
    return appendQuery(base, input.query);
  }
  if (tab === "assets") {
    if (assetsSubTab === "videos") {
      return appendQuery(`${base}/media-videos`, input.query);
    }
    if (assetsSubTab === "brand") {
      return appendQuery(`${base}/media-brand`, input.query);
    }
    return appendQuery(`${base}/media-gallery`, input.query);
  }
  return appendQuery(`${base}/${tab}`, input.query);
}

export function buildPersonAdminUrl(input: {
  showSlug: string;
  personSlug: string;
  tab?: PersonAdminTab;
  query?: URLSearchParams;
}): string {
  const showSlug = encodeURIComponent(input.showSlug.trim());
  const personSlug = encodeURIComponent(input.personSlug.trim());
  const tab = input.tab ?? "overview";
  const base = `/admin/trr-shows/${showSlug}/people/${personSlug}`;
  return appendQuery(`${base}/${tab}`, input.query);
}

export function buildSeasonAdminUrl(input: {
  showSlug: string;
  seasonNumber: number | string;
  tab?: SeasonAdminTab;
  assetsSubTab?: SeasonAssetsSubTab;
  query?: URLSearchParams;
}): string {
  const slug = encodeURIComponent(input.showSlug.trim());
  const season = encodeURIComponent(String(input.seasonNumber));
  const tab = input.tab ?? "episodes";
  const assetsSubTab = input.assetsSubTab ?? "media";
  const base = `/admin/trr-shows/${slug}/seasons/${season}`;
  const nextQuery = new URLSearchParams(input.query?.toString() ?? "");
  if (tab === "episodes") {
    nextQuery.delete("tab");
    nextQuery.delete("assets");
    return appendQuery(base, nextQuery);
  }
  nextQuery.set("tab", tab);
  if (tab === "assets") {
    nextQuery.set("assets", assetsSubTab);
  } else {
    nextQuery.delete("assets");
  }
  return appendQuery(base, nextQuery);
}

export function buildSeasonSocialWeekUrl(input: {
  showSlug: string;
  seasonNumber: number | string;
  weekIndex: number | string;
  query?: URLSearchParams;
}): string {
  const slug = encodeURIComponent(input.showSlug.trim());
  const season = encodeURIComponent(String(input.seasonNumber));
  const week = encodeURIComponent(String(input.weekIndex));
  const base = `/admin/trr-shows/${slug}/seasons/${season}/social/week/${week}`;
  return appendQuery(base, input.query);
}
