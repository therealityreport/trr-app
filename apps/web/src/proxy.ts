import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_DEV_ADMIN_ORIGIN = "http://admin.localhost:3000";
const DEFAULT_DEV_ADMIN_API_HOSTS = ["admin.localhost", "localhost", "127.0.0.1", "[::1]", "::1"];
const STATIC_PATH_PREFIXES = ["/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];
const INTERNAL_ADMIN_REWRITE_HEADER = "x-trr-admin-rewrite";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const ROOT_SHOW_ROUTE_RESERVED_FIRST_SEGMENTS = new Set([
  "admin",
  "api",
  "auth",
  "brands",
  "bravodle",
  "dev-dashboard",
  "docs",
  "design-system",
  "games",
  "groups",
  "hub",
  "login",
  "privacy-policy",
  "people",
  "profile",
  "realations",
  "realitease",
  "settings",
  "social",
  "social-media",
  "shows",
  "surveys",
  "terms-of-sale",
  "terms-of-service",
  "test-auth",
  "users",
]);
const ROOT_SHOW_ROUTE_SECOND_SEGMENTS = new Set([
  "overview",
  "details",
  "settings",
  "seasons",
  "media",
  "assets",
  "news",
  "cast",
  "surveys",
  "social",
  "videos",
  "fandom",
  "people",
]);
const ROOT_SHOW_ROUTE_ADMIN_SECTION_SEGMENTS = new Set([
  "assets",
  "cast",
  "details",
  "fandom",
  "media",
  "news",
  "overview",
  "seasons",
  "settings",
  "social",
  "surveys",
  "videos",
]);
const ROOT_SHOW_ROUTE_ADMIN_SEASON_TABS = new Set([
  "assets",
  "cast",
  "details",
  "fandom",
  "news",
  "overview",
  "social",
  "surveys",
  "videos",
]);
const ROOT_SHOW_ROUTE_ADMIN_SEASON_ASSET_SEGMENTS = new Map<string, "images" | "videos" | "branding">([
  ["images", "images"],
  ["gallery", "images"],
  ["media", "images"],
  ["videos", "videos"],
  ["branding", "branding"],
  ["brand", "branding"],
]);
const ROOT_SHOW_ROUTE_ADMIN_SHOW_ASSET_SEGMENTS = new Map<string, "images" | "videos" | "branding">([
  ["images", "images"],
  ["gallery", "images"],
  ["media", "images"],
  ["videos", "videos"],
  ["branding", "branding"],
  ["brand", "branding"],
]);
const PERSON_ROUTE_ADMIN_TAB_SEGMENTS = new Set([
  "overview",
  "details",
  "settings",
  "gallery",
  "videos",
  "news",
  "credits",
  "fandom",
  "social",
]);
const SOCIAL_WEEK_PLATFORM_SEGMENTS = new Set([
  "instagram",
  "tiktok",
  "twitter",
  "youtube",
  "facebook",
  "threads",
]);
const SOCIAL_ACCOUNT_PROFILE_PLATFORM_SEGMENTS = new Set([
  "instagram",
  "tiktok",
  "twitter",
  "youtube",
  "facebook",
  "threads",
]);

function parseOptionalBoolean(value: string | undefined): boolean | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }
  return null;
}

function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  // Bracketed IPv6 form from URL.hostname / Host header.
  if (normalized.startsWith("[")) {
    const closingBracket = normalized.indexOf("]");
    if (closingBracket >= 0) {
      return normalized.slice(0, closingBracket + 1);
    }
  }

  // host:port (single-colon non-IPv6 host)
  const firstColon = normalized.indexOf(":");
  const lastColon = normalized.lastIndexOf(":");
  if (firstColon > -1 && firstColon === lastColon) {
    const maybePort = normalized.slice(lastColon + 1);
    if (/^\d+$/.test(maybePort)) {
      return normalized.slice(0, lastColon);
    }
  }

  return normalized;
}

function resolveAdminOrigin(request: NextRequest): string | null {
  const configuredOrigin = process.env.ADMIN_APP_ORIGIN?.trim();
  if (configuredOrigin) return configuredOrigin;
  if (process.env.NODE_ENV === "development") return DEFAULT_DEV_ADMIN_ORIGIN;
  return request.nextUrl.origin;
}

function resolveAdminHost(adminOrigin: string | null): string | null {
  if (!adminOrigin) return null;
  try {
    return normalizeHost(new URL(adminOrigin).hostname);
  } catch {
    return null;
  }
}

function parseHostAllowlist(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => normalizeHost(entry))
      .filter((entry): entry is string => Boolean(entry)),
  );
}

function resolveAdminApiAllowedHosts(adminOrigin: string | null): Set<string> {
  const hosts = parseHostAllowlist(process.env.ADMIN_APP_HOSTS);
  if (hosts.size === 0 && process.env.NODE_ENV === "development") {
    for (const host of DEFAULT_DEV_ADMIN_API_HOSTS) {
      const normalizedHost = normalizeHost(host);
      if (normalizedHost) hosts.add(normalizedHost);
    }
  }
  if (!adminOrigin) return hosts;

  try {
    const originHost = normalizeHost(new URL(adminOrigin).hostname);
    if (originHost) hosts.add(originHost);
  } catch {
    // Ignore invalid origin values; API allowlist can still come from ADMIN_APP_HOSTS.
  }

  return hosts;
}

function isLoopbackHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return LOOPBACK_HOSTS.has(host);
}

function hostsMatch(expectedHost: string | null, requestHost: string | null): boolean {
  if (!expectedHost || !requestHost) return false;
  if (expectedHost === requestHost) return true;
  return isLoopbackHost(expectedHost) && isLoopbackHost(requestHost);
}

function isAllowedHost(allowedHosts: Set<string>, requestHost: string | null): boolean {
  if (!requestHost) return false;
  if (allowedHosts.has(requestHost)) return true;
  if (!isLoopbackHost(requestHost)) return false;
  return Array.from(allowedHosts).some((allowedHost) => isLoopbackHost(allowedHost));
}

function isStaticPath(pathname: string): boolean {
  if (STATIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return /\.[^/]+$/.test(pathname);
}

function isShowsSettingsPath(pathname: string): boolean {
  return pathname === "/shows/settings" || pathname.startsWith("/shows/settings/");
}

function isSeasonToken(value: string): boolean {
  return /^s[0-9]{1,3}$/i.test(value);
}

function isRootShowUiPath(pathname: string): boolean {
  const segments = pathname
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.trim().toLowerCase());
  if (segments.length === 0) return false;
  const first = segments[0];
  if (!first || ROOT_SHOW_ROUTE_RESERVED_FIRST_SEGMENTS.has(first)) return false;
  if (!/^[a-z0-9-]+$/.test(first)) return false;
  if (segments.length === 1) return true;

  const second = segments[1] ?? "";
  if (isSeasonToken(second)) return true;
  return ROOT_SHOW_ROUTE_SECOND_SEGMENTS.has(second);
}

function toPathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function appendSearch(pathname: string, searchParams?: URLSearchParams): string {
  const search = searchParams?.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function appendCanonicalPersonSearch(pathname: string, searchParams?: URLSearchParams): string {
  const next = new URLSearchParams(searchParams?.toString() ?? "");
  next.delete("tab");
  return appendSearch(pathname, next);
}

function buildCanonicalPersonPath(personSegment: string, tabSegment?: string | null): string {
  const base = `/people/${encodeURIComponent(personSegment)}`;
  const normalizedTab = tabSegment?.trim().toLowerCase() ?? "";
  if (!normalizedTab || normalizedTab === "overview" || normalizedTab === "details") {
    return base;
  }
  if (!PERSON_ROUTE_ADMIN_TAB_SEGMENTS.has(normalizedTab)) {
    return base;
  }
  return `${base}/${normalizedTab}`;
}

function buildBrandsWorkspaceRedirect(
  category: string,
  searchParams?: URLSearchParams,
): string {
  const params = new URLSearchParams(searchParams?.toString() ?? "");
  if (category === "all") {
    params.delete("category");
  } else {
    params.set("category", category);
  }
  const search = params.toString();
  return search ? `/brands?${search}` : "/brands";
}

function isWeekToken(value: string): boolean {
  return /^w[0-9]{1,3}$/i.test(value);
}

function resolveSocialWeekSubTab(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  if (normalized === "details" || normalized === "overview") return "details";
  if (SOCIAL_WEEK_PLATFORM_SEGMENTS.has(normalized)) return normalized;
  return null;
}

function resolveSocialAccountProfileTab(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return "stats";
  if (normalized === "posts") return "posts";
  if (normalized === "hashtags" || normalized === "hashtag") return "hashtags";
  if (
    normalized === "collaborators-tags" ||
    normalized === "collaborators_tags" ||
    normalized === "collaborators" ||
    normalized === "tags"
  ) {
    return "collaborators-tags";
  }
  return null;
}

function normalizeSocialAccountHandle(value: string | undefined): string | null {
  const normalized = value?.trim().replace(/^@+/, "").toLowerCase() ?? "";
  if (!normalized) return null;
  return /^[a-z0-9._-]{1,64}$/i.test(normalized) ? normalized : null;
}

function parseSocialAccountProfilePath(pathname: string): {
  platform: string;
  handle: string;
  tab: string;
  canonicalPath: string;
} | null {
  const segments = toPathSegments(pathname);
  if (segments.length === 0) return null;

  let offset = -1;
  const first = segments[0]?.toLowerCase() ?? "";
  const second = segments[1]?.toLowerCase() ?? "";
  if (first === "social") {
    offset = 1;
  } else if (first === "admin" && second === "social") {
    offset = 2;
  } else {
    return null;
  }

  if (segments.length < offset + 2 || segments.length > offset + 3) return null;

  const platform = segments[offset]?.trim().toLowerCase() ?? "";
  const handle = normalizeSocialAccountHandle(segments[offset + 1]);
  const tab = resolveSocialAccountProfileTab(segments[offset + 2]);
  if (!SOCIAL_ACCOUNT_PROFILE_PLATFORM_SEGMENTS.has(platform) || !handle || !tab) return null;

  return {
    platform,
    handle,
    tab,
    canonicalPath:
      tab === "stats"
        ? `/admin/social/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}`
        : `/admin/social/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/${tab}`,
  };
}

function mapLegacyAdminSocialPath(pathname: string, searchParams?: URLSearchParams): string | null {
  if (pathname === "/social-media" || pathname === "/admin/social-media") {
    return appendSearch("/admin/social", searchParams);
  }
  if (pathname.startsWith("/admin/social-media/")) {
    return appendSearch(`/admin/social/${pathname.slice("/admin/social-media/".length)}`, searchParams);
  }
  return null;
}

function parseShortSeasonSocialWeekPath(segments: string[]): {
  showSegment: string;
  seasonNumber: string;
  weekNumber: string;
  subTab: string | null;
} | null {
  // Canonical short form: /:showId/s:season/social/w:week[/:platform|/details]
  if (segments.length >= 4 && segments.length <= 5) {
    const [showSegment, seasonToken, socialSegment, weekToken, subTabSegment] = segments;
    if (showSegment && isSeasonToken(seasonToken ?? "") &&
        (socialSegment ?? "").trim().toLowerCase() === "social" &&
        isWeekToken(weekToken ?? "")) {
      const subTab = resolveSocialWeekSubTab(subTabSegment);
      if (segments.length === 5 && !subTab) return null;
      return {
        showSegment,
        seasonNumber: (seasonToken ?? "").slice(1),
        weekNumber: (weekToken ?? "").slice(1),
        subTab,
      };
    }
  }
  return null;
}

function parseLongSeasonSocialWeekPath(segments: string[]): {
  showSegment: string;
  seasonNumber: string;
  weekNumber: string;
  subTab: string | null;
} | null {
  if (segments.length < 6 || segments.length > 7) return null;
  const [showSegment, seasonsSegment, seasonNumber, socialSegment, weekSegment, weekNumber, subTabSegment] =
    segments;
  if (!showSegment) return null;
  if ((seasonsSegment ?? "").trim().toLowerCase() !== "seasons") return null;
  if (!/^[0-9]{1,3}$/.test(seasonNumber ?? "")) return null;
  if ((socialSegment ?? "").trim().toLowerCase() !== "social") return null;
  if ((weekSegment ?? "").trim().toLowerCase() !== "week") return null;
  if (!/^[0-9]{1,3}$/.test(weekNumber ?? "")) return null;
  const subTab = resolveSocialWeekSubTab(subTabSegment);
  if (segments.length === 7 && !subTab) return null;
  return {
    showSegment,
    seasonNumber: seasonNumber ?? "",
    weekNumber: weekNumber ?? "",
    subTab,
  };
}

function buildCanonicalSeasonSocialWeekPath(input: {
  showSegment: string;
  seasonNumber: string;
  weekNumber: string;
  subTab: string | null;
}): string {
  const base = `/${encodeURIComponent(input.showSegment)}/s${input.seasonNumber}/social/w${input.weekNumber}`;
  return input.subTab && input.subTab !== "details" ? `${base}/${input.subTab}` : `${base}/details`;
}

function isCanonicalShortAdminPath(pathname: string): boolean {
  return isRootShowUiPath(pathname) || isPublicPersonDetailPath(pathname) || isShowsSettingsPath(pathname);
}

function mapCanonicalAdminUiRedirect(pathname: string, searchParams?: URLSearchParams): string | null {
  const legacyAdminSocialPath = mapLegacyAdminSocialPath(pathname, searchParams);
  if (legacyAdminSocialPath) {
    return legacyAdminSocialPath;
  }

  const socialAccountProfilePath = parseSocialAccountProfilePath(pathname);
  if (socialAccountProfilePath && pathname !== socialAccountProfilePath.canonicalPath) {
    return appendSearch(socialAccountProfilePath.canonicalPath, searchParams);
  }

  const segments = toPathSegments(pathname);
  if (segments.length === 0) {
    return null;
  }

  const [firstSegment, secondSegment] = segments;
  const normalizedFirst = firstSegment?.toLowerCase() ?? "";
  const normalizedSecond = secondSegment?.toLowerCase() ?? "";

  if (normalizedFirst === "shows" && secondSegment) {
    if (normalizedSecond === "settings") {
      return null;
    }
    if (segments.length === 2) {
      return appendSearch(`/${encodeURIComponent(secondSegment)}`, searchParams);
    }
    if (
      segments.length === 4 &&
      normalizedSecond &&
      normalizedSecond === secondSegment.toLowerCase() &&
      segments[2]?.toLowerCase() === "seasons" &&
      /^[0-9]{1,3}$/.test(segments[3] ?? "")
    ) {
      return appendSearch(
        `/${encodeURIComponent(secondSegment)}/s${segments[3]}`,
        searchParams,
      );
    }
  }

  const longSeasonSocialWeekPath = parseLongSeasonSocialWeekPath(segments);
  if (longSeasonSocialWeekPath) {
    return appendSearch(buildCanonicalSeasonSocialWeekPath(longSeasonSocialWeekPath), searchParams);
  }

  if (normalizedFirst === "people" && secondSegment && segments.length <= 3) {
    const query = new URLSearchParams(searchParams?.toString() ?? "");
    const queryTab = query.get("tab")?.trim().toLowerCase() ?? "";
    const hasShowId = query.has("showId");
    if (PERSON_ROUTE_ADMIN_TAB_SEGMENTS.has(queryTab)) {
      return appendCanonicalPersonSearch(buildCanonicalPersonPath(secondSegment, queryTab), query);
    }
    if (hasShowId) {
      return appendCanonicalPersonSearch(buildCanonicalPersonPath(secondSegment, segments[2] ?? null), query);
    }
  }

  if (normalizedFirst !== "admin" || normalizedSecond !== "trr-shows") {
    return null;
  }

  const adminSegments = segments.slice(2);
  if (adminSegments.length === 0) {
    return null;
  }

  if (adminSegments[0]?.toLowerCase() === "people" && adminSegments[1]) {
    const tabSegment = adminSegments[2] ?? null;
    return appendCanonicalPersonSearch(buildCanonicalPersonPath(adminSegments[1], tabSegment), searchParams);
  }

  const showSegment = adminSegments[0];
  if (!showSegment) {
    return null;
  }
  const encodedShowSegment = encodeURIComponent(showSegment);
  const showTail = adminSegments.slice(1);

  if (showTail[0]?.toLowerCase() === "people" && showTail[1]) {
    const tabSegment = showTail[2] ?? null;
    return appendCanonicalPersonSearch(buildCanonicalPersonPath(showTail[1], tabSegment), searchParams);
  }

  if (showTail.length === 0) {
    return appendSearch(`/${encodedShowSegment}`, searchParams);
  }

  if (
    showTail.length >= 5 &&
    showTail[0]?.toLowerCase() === "seasons" &&
    /^[0-9]{1,3}$/.test(showTail[1] ?? "") &&
    showTail[2]?.toLowerCase() === "social" &&
    showTail[3]?.toLowerCase() === "week" &&
    /^[0-9]{1,3}$/.test(showTail[4] ?? "")
  ) {
    return appendSearch(
      buildCanonicalSeasonSocialWeekPath({
        showSegment,
        seasonNumber: showTail[1] ?? "",
        weekNumber: showTail[4] ?? "",
        subTab: resolveSocialWeekSubTab(showTail[5]),
      }),
      searchParams,
    );
  }

  const firstTail = showTail[0] ?? "";
  const normalizedFirstTail = firstTail.trim().toLowerCase();
  if (normalizedFirstTail === "overview" || normalizedFirstTail === "details") {
    return appendSearch(`/${encodedShowSegment}`, searchParams);
  }
  if (normalizedFirstTail.startsWith("season-")) {
    const validSeasonAlias = /^season-([0-9]{1,3})$/i.test(normalizedFirstTail);
    if (!validSeasonAlias) {
      return null;
    }
  }
  if (
    normalizedFirstTail === "seasons" &&
    showTail.length > 1 &&
    !/^[0-9]{1,3}$/.test(showTail[1] ?? "")
  ) {
    return null;
  }

  const seasonMatch = normalizedFirstTail.match(/^season-([0-9]{1,3})$/i);
  if (seasonMatch) {
    const seasonBase = `/${encodedShowSegment}/s${seasonMatch[1]}`;
    const seasonTail = showTail.slice(1);
    const normalizedSeasonTail = seasonTail[0]?.trim().toLowerCase() ?? "";
    if (seasonTail.length === 0 || normalizedSeasonTail === "overview" || normalizedSeasonTail === "details") {
      return appendSearch(seasonBase, searchParams);
    }
    return appendSearch(
      `${seasonBase}/${seasonTail.map((segment) => encodeURIComponent(segment)).join("/")}`,
      searchParams,
    );
  }

  return appendSearch(
    `/${encodedShowSegment}/${showTail.map((segment) => encodeURIComponent(segment)).join("/")}`,
    searchParams,
  );
}

function mapCanonicalAdminUiRewrite(pathname: string, searchParams?: URLSearchParams): string | null {
  const legacyAdminSocialPath = mapLegacyAdminSocialPath(pathname, searchParams);
  if (legacyAdminSocialPath) {
    return legacyAdminSocialPath;
  }

  const socialAccountProfilePath = parseSocialAccountProfilePath(pathname);
  if (socialAccountProfilePath) {
    return pathname === socialAccountProfilePath.canonicalPath
      ? null
      : appendSearch(socialAccountProfilePath.canonicalPath, searchParams);
  }

  const segments = toPathSegments(pathname);
  if (segments.length === 0) {
    return null;
  }

  const [firstSegment, secondSegment, thirdSegment, fourthSegment] = segments;
  const normalizedFirst = firstSegment?.toLowerCase() ?? "";
  const normalizedSecond = secondSegment?.toLowerCase() ?? "";
  const normalizedThird = thirdSegment?.toLowerCase() ?? "";

  if (pathname === "/social-media") {
    return "/admin/social";
  }

  if (normalizedFirst === "shows") {
    if (segments.length === 1) {
      return "/admin/shows";
    }
    if (segments.length === 2 && normalizedSecond === "settings") {
      return "/admin/shows/settings";
    }
    if (segments.length === 2 && secondSegment) {
      return `/admin/trr-shows/${encodeURIComponent(secondSegment)}`;
    }
    if (
      segments.length === 4 &&
      secondSegment &&
      normalizedThird === "seasons" &&
      /^[0-9]{1,3}$/.test(fourthSegment ?? "")
    ) {
      return `/admin/trr-shows/${encodeURIComponent(secondSegment)}/season-${fourthSegment}`;
    }
    return null;
  }

  if (normalizedFirst === "people" && secondSegment) {
    const base = `/admin/trr-shows/people/${encodeURIComponent(secondSegment)}`;
    if (segments.length === 2) {
      return base;
    }
    if (segments.length === 3 && PERSON_ROUTE_ADMIN_TAB_SEGMENTS.has(normalizedThird)) {
      return `${base}/${normalizedThird === "details" ? "overview" : normalizedThird}`;
    }
    return null;
  }

  if (ROOT_SHOW_ROUTE_RESERVED_FIRST_SEGMENTS.has(normalizedFirst)) {
    return null;
  }
  if (!/^[a-z0-9-]+$/.test(normalizedFirst)) {
    return null;
  }

  const shortSeasonSocialWeekPath = parseShortSeasonSocialWeekPath(segments);
  if (shortSeasonSocialWeekPath) {
    const basePath = `/admin/trr-shows/${encodeURIComponent(shortSeasonSocialWeekPath.showSegment)}/seasons/${encodeURIComponent(shortSeasonSocialWeekPath.seasonNumber)}/social/week/${encodeURIComponent(shortSeasonSocialWeekPath.weekNumber)}`;
    if (!shortSeasonSocialWeekPath.subTab || shortSeasonSocialWeekPath.subTab === "details") {
      return basePath;
    }
    return `${basePath}/${encodeURIComponent(shortSeasonSocialWeekPath.subTab)}`;
  }

  if (segments.length === 1) {
    return `/admin/trr-shows/${encodeURIComponent(firstSegment)}`;
  }

  if (normalizedSecond === "social") {
    const normalizedFourth = fourthSegment?.toLowerCase() ?? "";
    const isRedditFamily =
      normalizedThird === "reddit" || (normalizedThird === "official" && normalizedFourth === "reddit");
    const query = new URLSearchParams();
    if (isRedditFamily) {
      query.set("social_view", "reddit");
    }
    return appendSearch(`/admin/trr-shows/${encodeURIComponent(firstSegment)}/social`, query);
  }

  if (isSeasonToken(secondSegment ?? "")) {
    const seasonNumber = (secondSegment ?? "").slice(1);
    const basePath = `/admin/trr-shows/${encodeURIComponent(firstSegment)}/seasons/${encodeURIComponent(seasonNumber)}`;
    if (segments.length === 2) {
      return basePath;
    }
    if (segments.length === 3 && ROOT_SHOW_ROUTE_ADMIN_SEASON_TABS.has(normalizedThird)) {
      const query = new URLSearchParams();
      if (normalizedThird === "videos") {
        query.set("tab", "videos");
      } else if (normalizedThird !== "overview" && normalizedThird !== "details") {
        query.set("tab", normalizedThird);
      }
      return appendSearch(basePath, query);
    }
    if (segments.length === 4 && (normalizedThird === "assets" || normalizedThird === "media")) {
      const assetSubTab = ROOT_SHOW_ROUTE_ADMIN_SEASON_ASSET_SEGMENTS.get(fourthSegment?.toLowerCase() ?? "");
      if (!assetSubTab) {
        return basePath;
      }
      const query = new URLSearchParams();
      query.set("tab", "assets");
      if (assetSubTab !== "images") {
        query.set("assets", assetSubTab);
      }
      return appendSearch(basePath, query);
    }
    if (normalizedThird === "social") {
      const query = new URLSearchParams();
      query.set("tab", "social");
      const normalizedFourth = fourthSegment?.toLowerCase() ?? "";
      const normalizedFifth = segments[4]?.toLowerCase() ?? "";
      const isRedditFamily =
        normalizedFourth === "reddit" || (normalizedFourth === "official" && normalizedFifth === "reddit");
      if (isRedditFamily) {
        query.set("social_view", "reddit");
      }
      return appendSearch(basePath, query);
    }
    return basePath;
  }

  if (segments.length === 2 && ROOT_SHOW_ROUTE_ADMIN_SECTION_SEGMENTS.has(normalizedSecond)) {
    return `/admin/trr-shows/${encodeURIComponent(firstSegment)}/${normalizedSecond}`;
  }
  if (segments.length === 3 && (normalizedSecond === "assets" || normalizedSecond === "media")) {
    const assetSubTab = ROOT_SHOW_ROUTE_ADMIN_SHOW_ASSET_SEGMENTS.get(normalizedThird);
    if (!assetSubTab) {
      return `/admin/trr-shows/${encodeURIComponent(firstSegment)}/assets`;
    }
    if (assetSubTab === "images") {
      return `/admin/trr-shows/${encodeURIComponent(firstSegment)}/assets`;
    }
    return `/admin/trr-shows/${encodeURIComponent(firstSegment)}/assets/${assetSubTab}`;
  }

  return `/admin/trr-shows/${encodeURIComponent(firstSegment)}`;
}

function isPublicPersonDetailPath(pathname: string): boolean {
  return /^\/people\/[^/]+(?:\/.*)?$/.test(pathname);
}

function isPublicUiPath(pathname: string): boolean {
  return (
    pathname === "/social-media" ||
    pathname.startsWith("/social-media/") ||
    pathname === "/shows" ||
    (pathname.startsWith("/shows/") && !isShowsSettingsPath(pathname)) ||
    isRootShowUiPath(pathname) ||
    isPublicPersonDetailPath(pathname)
  );
}

function isAdminUiPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/design-system" ||
    pathname.startsWith("/design-system/") ||
    pathname === "/brands" ||
    pathname.startsWith("/brands/") ||
    pathname === "/dev-dashboard" ||
    pathname.startsWith("/dev-dashboard/") ||
    pathname === "/docs" ||
    pathname.startsWith("/docs/") ||
    pathname === "/games" ||
    pathname.startsWith("/games/") ||
    pathname === "/groups" ||
    pathname.startsWith("/groups/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    isShowsSettingsPath(pathname) ||
    pathname === "/surveys" ||
    pathname.startsWith("/surveys/") ||
    pathname === "/users" ||
    pathname.startsWith("/users/") ||
    pathname === "/people"
  );
}

function mapLegacyBrandsPath(pathname: string, searchParams?: URLSearchParams): string | null {
  if (pathname === "/admin/brands") return appendSearch("/brands", searchParams);
  if (pathname.startsWith("/admin/brands/")) {
    return appendSearch(pathname.replace("/admin/brands/", "/brands/"), searchParams);
  }
  if (pathname === "/brands/networks-and-streaming" || pathname === "/admin/networks-and-streaming") {
    return buildBrandsWorkspaceRedirect("all", searchParams);
  }
  if (pathname.startsWith("/admin/networks-and-streaming/")) {
    return appendSearch(
      pathname.replace("/admin/networks-and-streaming/", "/brands/networks-and-streaming/"),
      searchParams,
    );
  }
  if (pathname === "/admin/networks") return buildBrandsWorkspaceRedirect("all", searchParams);
  if (pathname.startsWith("/admin/networks/")) {
    return appendSearch(pathname.replace("/admin/networks/", "/brands/networks-and-streaming/"), searchParams);
  }
  if (pathname === "/brands/production-companies" || pathname === "/admin/production-companies") {
    return buildBrandsWorkspaceRedirect("production", searchParams);
  }
  if (pathname === "/brands/shows-and-franchises") {
    return buildBrandsWorkspaceRedirect("shows", searchParams);
  }
  if (pathname === "/brands/news" || pathname === "/admin/news") {
    return buildBrandsWorkspaceRedirect("publication", searchParams);
  }
  if (pathname === "/brands/other" || pathname === "/admin/other") {
    return buildBrandsWorkspaceRedirect("other", searchParams);
  }
  return null;
}

function isAdminApiPath(pathname: string): boolean {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function proxy(request: NextRequest): NextResponse {
  const enforceHost = parseOptionalBoolean(process.env.ADMIN_ENFORCE_HOST) ?? true;
  if (!enforceHost) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (isStaticPath(pathname)) return NextResponse.next();

  const strictHostRouting = parseOptionalBoolean(process.env.ADMIN_STRICT_HOST_ROUTING) ?? false;
  const adminOrigin = resolveAdminOrigin(request);
  const canonicalAdminHost = resolveAdminHost(adminOrigin);
  const allowedAdminApiHosts = resolveAdminApiAllowedHosts(adminOrigin);
  const requestHost = normalizeHost(request.headers.get("host")) ?? normalizeHost(request.nextUrl.hostname);
  const onCanonicalAdminHost = hostsMatch(canonicalAdminHost, requestHost);
  const isInternalAdminRewrite = request.headers.get(INTERNAL_ADMIN_REWRITE_HEADER) === "1";
  const legacyBrandsPath = mapLegacyBrandsPath(pathname, request.nextUrl.searchParams);

  if (legacyBrandsPath) {
    const redirectOrigin = onCanonicalAdminHost ? request.nextUrl.origin : adminOrigin;
    if (!redirectOrigin) {
      return NextResponse.json({ error: "Admin origin is not configured." }, { status: 403 });
    }
    return NextResponse.redirect(new URL(legacyBrandsPath + request.nextUrl.search, redirectOrigin), 307);
  }

  const isAllowedAdminApiHost = isAllowedHost(allowedAdminApiHosts, requestHost);
  const onAdminUiPath = isAdminUiPath(pathname);
  const onPublicUiPath = isPublicUiPath(pathname);
  const onAdminApiPath = isAdminApiPath(pathname);

  if (onAdminApiPath && !isAllowedAdminApiHost) {
    return NextResponse.json({ error: "Admin API is not available on this host." }, { status: 403 });
  }

  if (onAdminUiPath && !onCanonicalAdminHost && !onPublicUiPath) {
    if (isInternalAdminRewrite) {
      return NextResponse.next();
    }
    if (!adminOrigin) {
      return NextResponse.json({ error: "Admin origin is not configured." }, { status: 403 });
    }
    const redirectUrl = new URL(pathname + request.nextUrl.search, adminOrigin);
    return NextResponse.redirect(redirectUrl, 307);
  }

  if (strictHostRouting && onCanonicalAdminHost && !onAdminUiPath) {
    if (isApiPath(pathname)) {
      return NextResponse.next();
    }
    if (!adminOrigin) {
      return NextResponse.json({ error: "Admin origin is not configured." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin", adminOrigin), 307);
  }

  if (onCanonicalAdminHost) {
    if (!isInternalAdminRewrite) {
      const canonicalPath = mapCanonicalAdminUiRedirect(pathname, request.nextUrl.searchParams);
      if (canonicalPath) {
        return NextResponse.redirect(new URL(canonicalPath, request.nextUrl.origin), 307);
      }
    }

    const rewritePath = mapCanonicalAdminUiRewrite(pathname, request.nextUrl.searchParams);
    if (rewritePath) {
      const targetUrl = new URL(rewritePath + request.nextUrl.search, request.nextUrl.origin);
      if (isCanonicalShortAdminPath(pathname)) {
        const rewriteHeaders = new Headers(request.headers);
        rewriteHeaders.set(INTERNAL_ADMIN_REWRITE_HEADER, "1");
        return NextResponse.rewrite(targetUrl, {
          request: {
            headers: rewriteHeaders,
          },
        });
      }
      return NextResponse.redirect(targetUrl, 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
