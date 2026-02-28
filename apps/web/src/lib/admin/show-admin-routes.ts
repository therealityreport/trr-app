export type ShowAdminTab =
  | "details"
  | "settings"
  | "seasons"
  | "assets"
  | "news"
  | "cast"
  | "surveys"
  | "social";

export type ShowAssetsSubTab = "images" | "videos" | "branding";

export type SeasonAdminTab =
  | "episodes"
  | "overview"
  | "assets"
  | "news"
  | "fandom"
  | "cast"
  | "surveys"
  | "social";

export type SeasonAssetsSubTab = "images" | "videos" | "branding";
export type PersonAdminTab =
  | "overview"
  | "gallery"
  | "videos"
  | "news"
  | "credits"
  | "fandom";

export type SocialAnalyticsViewSlug =
  | "official"
  | "bravo"
  | "reddit"
  | "hashtags"
  | "sentiment"
  | "advanced";
export type SocialPlatformSlug = "instagram" | "tiktok" | "twitter" | "youtube" | "facebook" | "threads";
export type SocialWeekSubTab = "details" | SocialPlatformSlug;

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

const SHOWS_ROOT_PATH = "";

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
  branding: "branding",
  brand: "branding",
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
  videos: "assets",
  news: "news",
  fandom: "fandom",
  cast: "cast",
  surveys: "surveys",
  social: "social",
};

const SEASON_ASSETS_SUBTAB_BY_SEGMENT: Record<string, SeasonAssetsSubTab> = {
  images: "images",
  videos: "videos",
  branding: "branding",
  media: "images",
  gallery: "images",
  brand: "branding",
};

const SEASON_TAB_BY_QUERY_ALIAS: Record<string, SeasonAdminTab> = {
  overview: "overview",
  details: "overview",
  episodes: "episodes",
  assets: "assets",
  videos: "assets",
  news: "news",
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
  official: "official",
  bravo: "bravo",
  reddit: "reddit",
  hashtags: "hashtags",
  hashtag: "hashtags",
  sentiment: "sentiment",
  advanced: "advanced",
};

const normalizeCanonicalSocialViewSlug = (
  value: string | null | undefined,
): Exclude<SocialAnalyticsViewSlug, "bravo"> | null => {
  const normalized = normalizeSocialAnalyticsViewSlug(value);
  if (!normalized) return null;
  if (normalized === "bravo") return "official";
  return normalized;
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
const isEpisodeToken = (value: string): boolean => /^e[0-9]{1,4}$/i.test(value);
const isWeekToken = (value: string): boolean => /^w[0-9]{1,3}$/i.test(value);

const parseTokenNumber = (value: string, prefix: "s" | "e"): number | null => {
  const normalized = normalizeSegment(value);
  if (!normalized.startsWith(prefix)) return null;
  const raw = normalized.slice(1);
  if (!/^[0-9]+$/.test(raw)) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const parseWeekNumber = (value: string | null | undefined): number | null => {
  const normalized = normalizeSegment(value);
  if (!normalized) return null;
  if (normalized === "preseason") return 0;
  if (!isWeekToken(normalized)) return null;
  const raw = normalized.slice(1);
  if (!/^[0-9]+$/.test(raw)) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const toCanonicalWeekToken = (value: string | number | null | undefined): string | null => {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    return `w${Math.trunc(value)}`;
  }
  const parsed = parseWeekNumber(value);
  if (parsed == null) return null;
  return `w${parsed}`;
};

const parseLegacyHandleToken = (value: string | null | undefined): string | null => {
  const normalized = normalizeSegment(value);
  if (!normalized) return null;
  if (normalized === "details" || normalized === "overview" || normalized === "account") {
    return null;
  }
  if (toSocialPlatform(normalized)) return null;
  return normalizeHandleSlug(normalized);
};

const toSocialPlatform = (value: string | null | undefined): SocialPlatformSlug | null => {
  const normalized = normalizeSegment(value);
  if (
    normalized === "instagram" ||
    normalized === "tiktok" ||
    normalized === "twitter" ||
    normalized === "youtube" ||
    normalized === "facebook" ||
    normalized === "threads"
  ) {
    return normalized;
  }
  return null;
};

const normalizeHandleSlug = (value: string | null | undefined): string | null => {
  const raw = normalizeSegment(value).replace(/^@+/, "");
  if (!raw) return null;
  const sanitized = raw.replace(/[^a-z0-9._-]/g, "");
  return sanitized || null;
};

const getShowPathContext = (
  pathname: string,
): { route: "admin" | "shows" | "root"; slugIndex: number; segments: string[] } | null => {
  const segments = toSegments(pathname);
  if (segments.length === 0) return null;

  if (segments.length >= 2 && normalizeSegment(segments[0]) === "shows") {
    return { route: "shows", slugIndex: 1, segments };
  }

  const showIndex = segments.findIndex(
    (segment, idx) => normalizeSegment(segment) === "trr-shows" && idx > 0 && normalizeSegment(segments[idx - 1]) === "admin",
  );
  if (showIndex >= 0) {
    return { route: "admin", slugIndex: showIndex + 1, segments };
  }

  return { route: "root", slugIndex: 0, segments };
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

const getSeasonRouteContext = (
  pathname: string,
): { baseSegments: string[]; episodeNumber: number | null } | null => {
  const context = getShowPathContext(pathname);
  if (!context) return null;
  if (context.slugIndex >= context.segments.length) return null;

  const afterShow = context.segments.slice(context.slugIndex + 1);
  if (afterShow.length === 0) return null;

  const first = normalizeSegment(afterShow[0]);
  let baseSegments: string[] | null = null;

  if (context.route === "admin" || first === "seasons") {
    if (afterShow.length < 2) return null;
    if (normalizeSegment(afterShow[0]) !== "seasons") return null;
    baseSegments = afterShow.slice(2);
  } else if (isSeasonToken(first)) {
    baseSegments = afterShow.slice(1);
  }

  if (!baseSegments) return null;
  if (baseSegments.length === 0) {
    return { baseSegments: [], episodeNumber: null };
  }

  const possibleEpisode = normalizeSegment(baseSegments[0]);
  if (!isEpisodeToken(possibleEpisode)) {
    return { baseSegments, episodeNumber: null };
  }

  return {
    baseSegments: baseSegments.slice(1),
    episodeNumber: parseTokenNumber(possibleEpisode, "e"),
  };
};

const getSeasonBaseSegments = (pathname: string): string[] | null => {
  const context = getSeasonRouteContext(pathname);
  if (!context) return null;
  return context.baseSegments;
};

const toShowBasePath = (showSlug: string): string => {
  const slug = encodeURIComponent(showSlug.trim());
  return `${SHOWS_ROOT_PATH}/${slug}`.replace(/\/{2,}/g, "/");
};

const getPersonBaseSegments = (pathname: string): string[] | null => {
  const segments = toSegments(pathname);
  if (segments.length >= 2 && normalizeSegment(segments[0]) === "people") {
    // Root-scoped canonical person route: /people/:personSlug/:tab?
    return segments.slice(2);
  }

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

const buildCanonicalPersonQuery = (
  query: URLSearchParams | undefined,
  showContext: string | undefined,
): URLSearchParams => {
  const next = buildCanonicalQuery(query);
  const normalized = showContext?.trim();
  if (normalized) {
    next.set("showId", normalized);
  }
  return next;
};

export function parseSocialAnalyticsViewFromPath(pathname: string): SocialAnalyticsViewSlug | null {
  const showSegments = getShowBaseSegments(pathname);
  if (showSegments && normalizeSegment(showSegments[0]) === "social") {
    if (parseTokenNumber(showSegments[1] ?? "", "s") != null) {
      return "official";
    }
    const first = normalizeSocialAnalyticsViewSlug(showSegments[1]);
    if ((first === "official" || first === "bravo") && normalizeSegment(showSegments[2]) === "reddit") {
      return "reddit";
    }
    return first;
  }

  const seasonSegments = getSeasonBaseSegments(pathname);
  if (seasonSegments && normalizeSegment(seasonSegments[0]) === "social") {
    if (parseTokenNumber(seasonSegments[1] ?? "", "s") != null) {
      return "official";
    }
    const first = normalizeSocialAnalyticsViewSlug(seasonSegments[1]);
    if ((first === "official" || first === "bravo") && normalizeSegment(seasonSegments[2]) === "reddit") {
      return "reddit";
    }
    return first;
  }

  return null;
}

export function parseSeasonEpisodeNumberFromPath(pathname: string): number | null {
  return getSeasonRouteContext(pathname)?.episodeNumber ?? null;
}

export function parseSeasonSocialPathSegment(pathname: string): string | null {
  const seasonSegments = getSeasonBaseSegments(pathname);
  if (!seasonSegments || normalizeSegment(seasonSegments[0]) !== "social") {
    return null;
  }
  const first = normalizeSegment(seasonSegments[1]);
  if (!first) return null;
  if (first === "official" || first === "bravo") {
    const second = normalizeSegment(seasonSegments[2]);
    if (second === "reddit") return "reddit";
    return second || first;
  }
  return first;
}

export type ParsedSocialPathFilters = {
  view: Exclude<SocialAnalyticsViewSlug, "bravo">;
  seasonNumber: number | null;
  weekToken: string | null;
  weekIndex: number | null;
  platform: SocialPlatformSlug | null;
  handle: string | null;
  canonicalPathSuffix: string;
};

const parsePositiveSeasonNumber = (
  value: number | string | null | undefined,
): number | null => {
  if (value == null) return null;
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
};

const parseSocialPathFilters = (
  socialSegments: string[] | null | undefined,
): ParsedSocialPathFilters | null => {
  if (!socialSegments || normalizeSegment(socialSegments[0]) !== "social") return null;
  const maybeView = normalizeCanonicalSocialViewSlug(socialSegments[1]);
  let canonicalView = maybeView ?? "official";
  const remaining = socialSegments.slice(maybeView ? 2 : 1);
  if (canonicalView === "official" && normalizeSegment(remaining[0]) === "reddit") {
    canonicalView = "reddit";
    remaining.shift();
  }
  let cursor = 0;
  let seasonNumber: number | null = null;
  let weekToken: string | null = null;
  let weekIndex: number | null = null;
  let platform: SocialPlatformSlug | null = null;
  let handle: string | null = null;

  if (canonicalView === "official") {
    const parsedSeason = parseTokenNumber(remaining[cursor] ?? "", "s");
    if (parsedSeason != null) {
      seasonNumber = parsedSeason;
      cursor += 1;
    }

    const first = remaining[cursor];
    const parsedWeek = parseWeekNumber(first);
    if (parsedWeek != null) {
      weekIndex = parsedWeek;
      weekToken = `w${parsedWeek}`;
      cursor += 1;
    }

    const maybePlatform = toSocialPlatform(remaining[cursor]);
    if (maybePlatform) {
      platform = maybePlatform;
      cursor += 1;
    }

    // Canonical official grammar uses /account/{handle}; accept legacy direct-handle paths.
    const accountToken = normalizeSegment(remaining[cursor]);
    if (accountToken === "account") {
      const nextHandle = normalizeHandleSlug(remaining[cursor + 1]);
      if (nextHandle) {
        handle = nextHandle;
      }
    } else {
    const legacyHandle = parseLegacyHandleToken(remaining[cursor]);
    if (legacyHandle) {
      handle = legacyHandle;
    }
  }
  }

  const canonicalSegments = ["social"];
  if (canonicalView === "official") {
    if (seasonNumber != null) canonicalSegments.push(`s${seasonNumber}`);
  } else {
    canonicalSegments.push(canonicalView);
  }
  if (weekToken) canonicalSegments.push(weekToken);
  if (platform) canonicalSegments.push(platform);
  if (handle) {
    canonicalSegments.push("account", handle);
  }

  return {
    view: canonicalView,
    seasonNumber,
    weekToken,
    weekIndex,
    platform,
    handle,
    canonicalPathSuffix: `/${canonicalSegments.join("/")}`,
  };
};

export function parseShowSocialPathFilters(pathname: string): ParsedSocialPathFilters | null {
  return parseSocialPathFilters(getShowBaseSegments(pathname) ?? null);
}

export function parseSeasonSocialPathFilters(pathname: string): ParsedSocialPathFilters | null {
  return parseSocialPathFilters(getSeasonBaseSegments(pathname) ?? null);
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
      if (first === "media-brand") assetsSubTab = "branding";
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
      if (first === "videos") {
        return { tab: "assets", assetsSubTab: "videos", source: "path" };
      }
      if (first === "assets" || first === "media") {
        const second = normalizeSegment(seasonSegments[1]);
        return {
          tab: "assets",
          assetsSubTab: SEASON_ASSETS_SUBTAB_BY_SEGMENT[second] ?? "images",
          source: "path",
        };
      }

      const mappedTab = SEASON_TAB_BY_PATH_SEGMENT[first];
      if (mappedTab) {
        return {
          tab: mappedTab,
          assetsSubTab: "images",
          source: "path",
        };
      }
    }
  }

  const tabParam = normalizeSegment(searchParams.get("tab"));
  const mappedTab = SEASON_TAB_BY_QUERY_ALIAS[tabParam];
  if (mappedTab === "assets") {
    const assetsParam = normalizeSegment(searchParams.get("assets"));
    const fromLegacyTab = tabParam === "videos";
    return {
      tab: "assets",
      assetsSubTab:
        fromLegacyTab
          ? "videos"
          : (SEASON_ASSETS_SUBTAB_BY_SEGMENT[assetsParam] ?? "images"),
      source: "query",
    };
  }
  if (mappedTab) {
    return { tab: mappedTab, assetsSubTab: "images", source: "query" };
  }

  if (seasonSegments) {
    return { tab: "overview", assetsSubTab: "images", source: "path" };
  }

  return { tab: "overview", assetsSubTab: "images", source: "default" };
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
  socialRoute?: {
    seasonNumber?: number | string | null;
    weekIndex?: number | string | null;
    platform?: string | null;
    handle?: string | null;
  };
}): string {
  const base = toShowBasePath(input.showSlug);
  const tab = input.tab ?? "details";
  const assetsSubTab = input.assetsSubTab ?? "images";

  if (tab === "details") {
    return appendQuery(base, buildCanonicalQuery(input.query));
  }

  if (tab === "assets") {
    const subPath = assetsSubTab === "images" ? "" : `/${assetsSubTab}`;
    return appendQuery(`${base}/assets${subPath}`, buildCanonicalQuery(input.query));
  }

  if (tab === "social") {
    const nextQuery = buildCanonicalQuery(input.query, { removeSocialView: true });
    const socialView =
      normalizeCanonicalSocialViewSlug(input.socialView) ??
      normalizeCanonicalSocialViewSlug(input.query?.get("social_view")) ??
      "official";
    if (socialView === "reddit") {
      return appendQuery(`${base}/social/reddit`, nextQuery);
    }
    const season = parsePositiveSeasonNumber(input.socialRoute?.seasonNumber);
    const weekToken = toCanonicalWeekToken(input.socialRoute?.weekIndex);
    const platform = toSocialPlatform(input.socialRoute?.platform);
    const handle = normalizeHandleSlug(input.socialRoute?.handle);
    const segments =
      socialView === "official"
        ? [`${base}/social${season ? `/s${season}` : ""}`]
        : [`${base}/social/${socialView}`];
    if (weekToken) segments.push(weekToken);
    if (platform) segments.push(platform);
    if (handle) {
      if (socialView === "official") {
        segments.push("account", handle);
      } else {
        segments.push(handle);
      }
    }
    return appendQuery(segments.join("/"), nextQuery);
  }

  return appendQuery(`${base}/${tab}`, buildCanonicalQuery(input.query));
}

export function buildPersonAdminUrl(input: {
  showSlug?: string;
  showId?: string;
  personSlug: string;
  tab?: PersonAdminTab;
  query?: URLSearchParams;
}): string {
  const personSlug = encodeURIComponent(input.personSlug.trim());
  const tab = input.tab ?? "overview";
  const base = `/people/${personSlug}`;
  const path = tab === "overview" ? base : `${base}/${tab}`;
  const showContext = input.showId ?? input.showSlug;
  return appendQuery(path, buildCanonicalPersonQuery(input.query, showContext));
}

export function buildSeasonAdminUrl(input: {
  showSlug: string;
  seasonNumber: number | string;
  episodeNumber?: number | string | null;
  tab?: SeasonAdminTab;
  assetsSubTab?: SeasonAssetsSubTab;
  query?: URLSearchParams;
  socialView?: SocialAnalyticsViewSlug;
  socialRoute?: {
    weekIndex?: number | string | null;
    platform?: string | null;
    handle?: string | null;
  };
}): string {
  const fallbackForInvalidSeason = appendQuery(
    `${toShowBasePath(input.showSlug)}/seasons`,
    buildCanonicalQuery(input.query),
  );
  const seasonParsed =
    typeof input.seasonNumber === "number"
      ? input.seasonNumber
      : Number.parseInt(String(input.seasonNumber), 10);
  if (!Number.isFinite(seasonParsed) || seasonParsed <= 0) {
    return fallbackForInvalidSeason;
  }
  const season = String(Math.trunc(seasonParsed));
  const episodeParsed =
    typeof input.episodeNumber === "number"
      ? input.episodeNumber
      : Number.parseInt(String(input.episodeNumber ?? ""), 10);
  const episode =
    Number.isFinite(episodeParsed) && episodeParsed > 0 ? String(Math.trunc(episodeParsed)) : null;
  const tab = input.tab ?? "overview";
  const assetsSubTab = input.assetsSubTab ?? "images";
  const base = `${toShowBasePath(input.showSlug)}/s${encodeURIComponent(season)}${episode ? `/e${encodeURIComponent(episode)}` : ""}`;

  if (tab === "overview") {
    return appendQuery(base, buildCanonicalQuery(input.query));
  }

  if (tab === "assets") {
    const subPath = assetsSubTab === "images" ? "" : `/${assetsSubTab}`;
    return appendQuery(`${base}/assets${subPath}`, buildCanonicalQuery(input.query));
  }

  if (tab === "social") {
    const nextQuery = buildCanonicalQuery(input.query, { removeSocialView: true });
    const socialView =
      normalizeCanonicalSocialViewSlug(input.socialView) ??
      normalizeCanonicalSocialViewSlug(input.query?.get("social_view")) ??
      "official";
    if (socialView === "reddit") {
      return appendQuery(`${base}/social/reddit`, nextQuery);
    }
    const weekToken = toCanonicalWeekToken(input.socialRoute?.weekIndex);
    const platform = toSocialPlatform(input.socialRoute?.platform);
    const handle = normalizeHandleSlug(input.socialRoute?.handle);
    const segments = socialView === "official" ? [`${base}/social`] : [`${base}/social/${socialView}`];
    if (weekToken) segments.push(weekToken);
    if (platform) segments.push(platform);
    if (handle) {
      if (socialView === "official") {
        segments.push("account", handle);
      } else {
        segments.push(handle);
      }
    }
    return appendQuery(segments.join("/"), nextQuery);
  }

  return appendQuery(`${base}/${tab}`, buildCanonicalQuery(input.query));
}

export function buildSeasonSocialWeekUrl(input: {
  showSlug: string;
  seasonNumber: number | string;
  weekIndex: number | string;
  platform?: SocialPlatformSlug;
  query?: URLSearchParams;
}): string {
  const seasonParsed =
    typeof input.seasonNumber === "number"
      ? input.seasonNumber
      : Number.parseInt(String(input.seasonNumber), 10);
  if (!Number.isFinite(seasonParsed) || seasonParsed <= 0) {
    return buildShowAdminUrl({
      showSlug: input.showSlug,
      tab: "social",
      socialView: "official",
      query: input.query,
    });
  }
  const season = encodeURIComponent(String(Math.trunc(seasonParsed)));
  const weekToken = toCanonicalWeekToken(input.weekIndex) ?? "w0";
  const week = encodeURIComponent(weekToken.slice(1));
  const platform = toSocialPlatform(input.platform ?? "");
  const subTab: SocialWeekSubTab = platform ?? "details";
  const base = `${toShowBasePath(input.showSlug)}/s${season}/social/w${week}/${subTab}`;
  const nextQuery = new URLSearchParams(input.query?.toString() ?? "");
  nextQuery.delete("social_platform");
  nextQuery.delete("source_scope");
  nextQuery.delete("season_id");
  return appendQuery(base, nextQuery);
}

export function buildShowRedditUrl(input: {
  showSlug: string;
  seasonNumber?: number | string | null;
  query?: URLSearchParams;
}): string {
  const season = parsePositiveSeasonNumber(input.seasonNumber);
  const path = season
    ? `${toShowBasePath(input.showSlug)}/s${season}/social/reddit`
    : `${toShowBasePath(input.showSlug)}/social/reddit`;
  const nextQuery = buildCanonicalQuery(input.query, { removeSocialView: true });
  nextQuery.delete("social_platform");
  return appendQuery(path, nextQuery);
}

export function buildShowRedditCommunityUrl(input: {
  showSlug: string;
  communitySlug: string;
  seasonNumber?: number | string | null;
  query?: URLSearchParams;
}): string {
  const trimmedCommunity = input.communitySlug.trim();
  if (!trimmedCommunity) {
    return buildShowRedditUrl({
      showSlug: input.showSlug,
      seasonNumber: input.seasonNumber,
      query: input.query,
    });
  }
  const season = parsePositiveSeasonNumber(input.seasonNumber);
  const path = `${toShowBasePath(input.showSlug)}/social/reddit/${encodeURIComponent(trimmedCommunity)}${
    season ? `/s${season}` : ""
  }`;
  const nextQuery = buildCanonicalQuery(input.query, { removeSocialView: true });
  nextQuery.delete("social_platform");
  return appendQuery(path, nextQuery);
}

export function buildShowRedditSeasonFilterUrl(input: {
  showSlug: string;
  seasonNumber: number | string;
  query?: URLSearchParams;
}): string {
  return buildShowRedditUrl(input);
}
