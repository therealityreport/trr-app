export interface EntityLinkLike {
  url: string;
  link_kind: string;
  link_group?: string | null;
  label?: string | null;
  metadata?: Record<string, unknown> | null;
}

const PERSON_NAME_SOURCE_SUFFIX_RE =
  /\s+(wikipedia|wikidata|fandom|wikia|fandom\/wikia|bravo profile|imdb|tmdb|famous birthdays|google knowledge graph|freebase)$/i;

const normalizeParsedPersonName = (value: string | null | undefined): string | null => {
  let cleaned = String(value || "").trim();
  if (!cleaned) return null;
  cleaned = cleaned.replace(PERSON_NAME_SOURCE_SUFFIX_RE, "").trim();
  cleaned = cleaned.split("/", 1)[0]?.trim() ?? cleaned;
  cleaned = cleaned.replace(/\/gallery$/i, "").trim();
  cleaned = cleaned.replace(/\bgallery$/i, "").trim();
  cleaned = cleaned.replace(/\.(html?)$/i, "").trim();
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();
  if (lower === "search") return null;
  if (/^q\d+$/i.test(cleaned)) return null;
  if (/^nm\d+$/i.test(cleaned)) return null;
  if (/^\d+$/.test(cleaned)) return null;
  return cleaned;
};

export const getHostnameFromUrl = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    return parsed.hostname || null;
  } catch {
    return null;
  }
};

export const isFandomLinkKind = (kind: string): boolean => {
  const normalized = String(kind || "").trim().toLowerCase();
  return normalized === "fandom" || normalized === "wikia";
};

export const normalizeLinkKind = (kind: string | null | undefined): string => {
  const normalized = String(kind || "").trim().toLowerCase();
  if (normalized === "twitter") return "x";
  if (normalized === "wikia") return "fandom";
  return normalized;
};

export const isSocialLinkKind = (kind: string | null | undefined): boolean => {
  return ["instagram", "tiktok", "x", "twitter", "youtube", "threads", "facebook", "reddit"].includes(
    normalizeLinkKind(kind)
  );
};

export const isFandomSeedUrl = (urlValue: string | null | undefined): boolean => {
  const rawUrl = String(urlValue || "").trim();
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    const host = String(parsed.hostname || "").trim().toLowerCase();
    if (!host.endsWith("fandom.com") && !host.endsWith("wikia.com")) return false;
    const path = decodeURIComponent(parsed.pathname || "").trim();
    if (!path || path === "/") return true;
    if (!path.includes("/wiki/")) return true;
    const slug = path.split("/wiki/", 2)[1]?.split(/[?#]/, 1)[0]?.trim() ?? "";
    if (!slug) return false;
    const title = slug.replace(/_/g, " ").trim();
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (normalizedTitle === "special allpages") return true;
    const communitySlug = host
      .replace(/\.fandom\.com$/, "")
      .replace(/\.wikia\.com$/, "")
      .replace(/^www\./, "")
      .trim();
    const derivedSiteTitle = `${communitySlug.replace(/[_-]+/g, " ").trim()} wiki`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    return normalizedTitle.length > 0 && normalizedTitle === derivedSiteTitle;
  } catch {
    return false;
  }
};

export const isLikelyPageUrl = (urlValue: string | null | undefined): boolean => {
  const rawUrl = String(urlValue || "").trim();
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    const path = decodeURIComponent(parsed.pathname || "").trim();
    return path.length > 1;
  } catch {
    return false;
  }
};

export const buildHostFaviconUrl = (urlValue: string): string | null => {
  const host = getHostnameFromUrl(urlValue);
  if (!host) return null;
  return `https://${host}/favicon.ico`;
};

export const resolveLinkSiteTitle = (link: EntityLinkLike): string | null => {
  const metadata =
    link.metadata && typeof link.metadata === "object"
      ? (link.metadata as Record<string, unknown>)
      : null;
  const siteTitle = metadata && typeof metadata.site_title === "string" ? metadata.site_title : null;
  if (siteTitle && siteTitle.trim().length > 0) return siteTitle.trim();
  return null;
};

export const resolveLinkPageTitle = (link: EntityLinkLike): string | null => {
  const metadata =
    link.metadata && typeof link.metadata === "object"
      ? (link.metadata as Record<string, unknown>)
      : null;
  const metadataTitle =
    (metadata && typeof metadata.page_title === "string" ? metadata.page_title : null) ||
    (metadata && typeof metadata.fandom_title === "string" ? metadata.fandom_title : null);
  if (metadataTitle && metadataTitle.trim().length > 0) return metadataTitle.trim();
  try {
    const parsed = new URL(link.url);
    const slug = decodeURIComponent((parsed.pathname.split("/").pop() ?? "").trim());
    if (!slug) return null;
    const pageTitle = slug.replace(/_/g, " ").trim();
    return pageTitle || null;
  } catch {
    return null;
  }
};

const resolveExplicitMetadataPageTitle = (link: EntityLinkLike): string | null => {
  const metadata =
    link.metadata && typeof link.metadata === "object"
      ? (link.metadata as Record<string, unknown>)
      : null;
  const metadataTitle =
    (metadata && typeof metadata.page_title === "string" ? metadata.page_title : null) ||
    (metadata && typeof metadata.fandom_title === "string" ? metadata.fandom_title : null);
  if (metadataTitle && metadataTitle.trim().length > 0) return metadataTitle.trim();
  return null;
};

export const resolveShowPageDisplayTitle = (link: EntityLinkLike, showName: string): string => {
  const normalizedShowName = String(showName || "").trim();
  if (isFandomLinkKind(link.link_kind)) {
    return resolveExplicitMetadataPageTitle(link) || resolveLinkPageTitle(link) || normalizedShowName || "Show";
  }
  return resolveExplicitMetadataPageTitle(link) || normalizedShowName || resolveLinkPageTitle(link) || "Show";
};

export const parsePersonNameFromLink = (link: EntityLinkLike): string | null => {
  const rawLabel = typeof link.label === "string" ? link.label.trim() : "";
  if (rawLabel) {
    const cleaned = normalizeParsedPersonName(rawLabel);
    if (cleaned) return cleaned;
  }
  try {
    const parsed = new URL(link.url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    let slug = decodeURIComponent((segments.at(-1) ?? "").trim());
    if (/^gallery$/i.test(slug) && segments.length > 1) {
      slug = decodeURIComponent((segments.at(-2) ?? "").trim());
    }
    if (!slug) return null;
    const humanized = slug.replace(/_/g, " ").replace(/-/g, " ").trim();
    return normalizeParsedPersonName(humanized);
  } catch {
    return null;
  }
};
