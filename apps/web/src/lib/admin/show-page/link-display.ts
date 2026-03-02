export interface EntityLinkLike {
  url: string;
  link_kind: string;
  label?: string | null;
  metadata?: Record<string, unknown> | null;
}

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

export const buildHostFaviconUrl = (urlValue: string): string | null => {
  const host = getHostnameFromUrl(urlValue);
  if (!host) return null;
  return `https://${host}/favicon.ico`;
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

export const parsePersonNameFromLink = (link: EntityLinkLike): string | null => {
  const rawLabel = typeof link.label === "string" ? link.label.trim() : "";
  if (rawLabel) {
    const cleaned = rawLabel
      .replace(/\s+(wikipedia|wikidata|fandom|wikia|bravo profile|imdb|tmdb)$/i, "")
      .trim();
    if (cleaned) return cleaned;
  }
  try {
    const parsed = new URL(link.url);
    const slug = decodeURIComponent((parsed.pathname.split("/").pop() ?? "").trim());
    if (!slug) return null;
    const humanized = slug.replace(/_/g, " ").replace(/-/g, " ").trim();
    return humanized || null;
  } catch {
    return null;
  }
};
