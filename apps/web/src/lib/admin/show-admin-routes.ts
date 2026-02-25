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
  | "overview"
  | "assets"
  | "videos"
  | "fandom"
  | "cast"
  | "surveys"
  | "social";

export type SeasonAssetsSubTab = "media" | "brand";
export type PersonAdminTab =
  | "overview"
  | "gallery"
  | "videos"
  | "news"
  | "credits"
  | "fandom";

export type SocialAnalyticsViewSlug =
  | "bravo"
  | "reddit"
  | "hashtags"
  | "sentiment"
  | "advanced";

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

const SHOWS_ROOT_PATH = "/shows";

const SHOW_TAB_BY_PATH_SEGMENT: Record<string, ShowAdminTab> = {
  overview: "details",
  details: "details",
  settings: "settings",
  seasons: "seasons",
  assets: "assets",
  media: "assets",
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
  overview: "overview",
  details: "overview",
  episodes: "episodes",
  assets: "assets",
  media: "assets",
  videos: "videos",
  fandom: "fandom",
  cast: "cast",
  surveys: "surveys",
  social: "social",
};

const SEASON_ASSETS_SUBTAB_BY_SEGMENT: Record<string, SeasonAssetsSubTab> = {
  media: "media",
  gallery: "media",
  brand: "brand",
};

const SEASON_TAB_BY_QUERY_ALIAS: Record<string, SeasonAdminTab> = {
  overview: "overview",
  details: "overview",
  episodes: "episodes",
  assets: "assets",
  videos: "videos",
  fandom: "fandom",
  cast: "cast",
  surveys: "surveys",
  social: "social",
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

const SOCIAL_ANALYTICS_VIEW_SLUG_ALIASES: Record<string, SocialAnalyticsViewSlug> = {
  bravo: "bravo",
  reddit: "reddit",
  hashtags: "hashtags",
  hashtag: "hashtags",
  sentiment: "sentiment",
  advanced: "advanced",
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

const isSeasonToken = (value: string): boolean => /^s[0-9]{1,3}$/i.test(value);

const getShowPathContext = (pathname: string): { route: "admin" | "shows"; slugIndex: number; segments: string[] } | null => {
  const segments = toSegments(pathname);

  if (segments.length >= 2 && normalizeSegment(segments[0]) === "shows") {
    return { route: "shows", slugIndex: 1, segments };
  }

  const showIndex = segments.findIndex(
    (segment, idx) => normalizeSegment(segment) === "trr-shows" && idx > 0 && normalizeSegment(segments[idx - 1]) === "admin",
  );
  if (showIndex < 0) return null;

  return { route: "admin", slugIndex: showIndex + 1, segments };
};

const getShowBaseSegments = (pathname: string): string[] | null => {
  const context = getShowPathContext(pathname);
  if (!context) return null;
  if (context.slugIndex >= context.segments.length) return null;

  const base = context.segments.slice(context.slugIndex + 1);
  if (base.length > 0 && isSeasonToken(normalizeSegment(base[0]))) {
    return null;
  }
  return base;
};

const getSeasonBaseSegments = (pathname: string): string[] | null => {
  const context = getShowPathContext(pathname);
  if (!context) return null;
  if (context.slugIndex >= context.segments.length) return null;

  const afterShow = context.segments.slice(context.slugIndex + 1);
  if (afterShow.length === 0) return null;

  const first = normalizeSegment(afterShow[0]);
  if (context.route === "admin" || first === "seasons") {
    if (afterShow.length < 2) return null;
    if (normalizeSegment(afterShow[0]) !== "seasons") return null;
    return afterShow.slice(2);
  }

  if (isSeasonToken(first)) {
    return afterShow.slice(1);
  }

  return null;
};

const getPersonBaseSegments = (pathname: string): string[] | null => {
  const context = getShowPathContext(pathname);
  if (!context) return null;
  if (context.slugIndex >= context.segments.length) return null;

  const afterShow = context.segments.slice(context.slugIndex + 1);
  if (afterShow.length >= 2 && normalizeSegment(afterShow[0]) === "people") {
    return afterShow.slice(2);
  }

  // Legacy /admin/trr-shows/people/:personId shape.
  if (
    context.route === "admin" &&
    normalizeSegment(context.segments[context.slugIndex]) === "people"
  ) {
    if (context.slugIndex + 1 >= context.segments.length) return null;
    return context.segments.slice(context.slugIndex + 2);
  }

  return null;
};

const appendQuery = (path: string, query?: URLSearchParams): string => {
  if (!query) return path;
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
};

const normalizeSocialAnalyticsViewSlug = (value: string | null | undefined): SocialAnalyticsViewSlug | null => {
  const normalized = normalizeSegment(value);
  if (!normalized) return null;
  return SOCIAL_ANALYTICS_VIEW_SLUG_ALIASES[normalized] ?? null;
};

const buildCanonicalQuery = (query: URLSearchParams | undefined, opts?: { removeSocialView?: boolean }): URLSearchParams => {
  const next = new URLSearchParams(query?.toString() ?? "");
  next.delete("tab");
  next.delete("scope");
  next.delete("assets");
  if (opts?.removeSocialView) {
    next.delete("social_view");
  }
  return next;
};

export function parseSocialAnalyticsViewFromPath(pathname: string): SocialAnalyticsViewSlug | null {
  const showSegments = getShowBaseSegments(pathname);
  if (showSegments && normalizeSegment(showSegments[0]) === "social") {
    return normalizeSocialAnalyticsViewSlug(showSegments[1]);
  }

  const seasonSegments = getSeasonBaseSegments(pathname);
  if (seasonSegments && normalizeSegment(seasonSegments[0]) === "social") {
    return normalizeSocialAnalyticsViewSlug(seasonSegments[1]);
  }

  return null;
}

export function cleanLegacyRoutingQuery(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  next.delete("tab");
  next.delete("assets");
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
  searchParams: URLSearchParams,
): ParsedShowRouteState {
  const showSegments = getShowBaseSegments(pathname);
  if (showSegments && showSegments.length > 0) {
    const first = normalizeSegment(showSegments[0]);
    const mappedTab = SHOW_TAB_BY_PATH_SEGMENT[first];
    if (mappedTab === "assets") {
      let assetsSubTab: ShowAssetsSubTab = "images";
      if (first === "media-videos") assetsSubTab = "videos";
      if (first === "media-brand") assetsSubTab = "brand";
      if (first === "assets" || first === "media") {
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
  searchParams: URLSearchParams,
): ParsedSeasonRouteState {
  const seasonSegments = getSeasonBaseSegments(pathname);
  if (seasonSegments) {
    const first = normalizeSegment(seasonSegments[0]);
    if (first) {
      if (first === "assets" || first === "media") {
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
    return { tab: "overview", assetsSubTab: "media", source: "path" };
  }

  return { tab: "overview", assetsSubTab: "media", source: "default" };
}

export function parsePersonRouteState(
  pathname: string,
  searchParams: URLSearchParams,
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
  socialView?: SocialAnalyticsViewSlug;
}): string {
  const slug = encodeURIComponent(input.showSlug.trim());
  const tab = input.tab ?? "details";
  const assetsSubTab = input.assetsSubTab ?? "images";
  const base = `${SHOWS_ROOT_PATH}/${slug}`;

  if (tab === "details") {
    return appendQuery(base, buildCanonicalQuery(input.query));
  }

  if (tab === "assets") {
    const nextQuery = buildCanonicalQuery(input.query);
    if (assetsSubTab !== "images") {
      nextQuery.set("assets", assetsSubTab);
    }
    return appendQuery(`${base}/media`, nextQuery);
  }

  if (tab === "social") {
    const nextQuery = buildCanonicalQuery(input.query, { removeSocialView: true });
    const socialView =
      input.socialView ?? normalizeSocialAnalyticsViewSlug(input.query?.get("social_view")) ?? "bravo";
    return appendQuery(`${base}/social/${socialView}`, nextQuery);
  }

  return appendQuery(`${base}/${tab}`, buildCanonicalQuery(input.query));
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
  socialView?: SocialAnalyticsViewSlug;
}): string {
  const slug = encodeURIComponent(input.showSlug.trim());
  const season = encodeURIComponent(String(input.seasonNumber));
  const tab = input.tab ?? "overview";
  const assetsSubTab = input.assetsSubTab ?? "media";
  const base = `${SHOWS_ROOT_PATH}/${slug}/s${season}`;

  if (tab === "overview") {
    return appendQuery(base, buildCanonicalQuery(input.query));
  }

  if (tab === "assets") {
    const nextQuery = buildCanonicalQuery(input.query);
    if (assetsSubTab !== "media") {
      nextQuery.set("assets", assetsSubTab);
    }
    return appendQuery(`${base}/media`, nextQuery);
  }

  if (tab === "social") {
    const nextQuery = buildCanonicalQuery(input.query, { removeSocialView: true });
    const socialView =
      input.socialView ?? normalizeSocialAnalyticsViewSlug(input.query?.get("social_view")) ?? "bravo";
    return appendQuery(`${base}/social/${socialView}`, nextQuery);
  }

  return appendQuery(`${base}/${tab}`, buildCanonicalQuery(input.query));
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
  const base = `${SHOWS_ROOT_PATH}/${slug}/s${season}/social/week/${week}`;
  return appendQuery(base, input.query);
}
