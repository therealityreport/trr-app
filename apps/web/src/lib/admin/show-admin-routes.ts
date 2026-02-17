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
  | "cast"
  | "surveys"
  | "social"
  | "details";

export type SeasonAssetsSubTab = "media" | "brand";

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
  cast: "cast",
  surveys: "surveys",
  social: "social",
  details: "details",
  media: "assets",
};

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

const appendQuery = (path: string, query?: URLSearchParams): string => {
  if (!query) return path;
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export function cleanLegacyRoutingQuery(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  next.delete("tab");
  next.delete("assets");
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
    return appendQuery(`${base}/assets/${assetsSubTab}`, input.query);
  }
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

  if (tab === "episodes") {
    return appendQuery(base, input.query);
  }
  if (tab === "assets") {
    return appendQuery(`${base}/assets/${assetsSubTab}`, input.query);
  }
  return appendQuery(`${base}/${tab}`, input.query);
}
