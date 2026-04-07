type FeaturedImageLinkStatus = "pending" | "approved" | "rejected";

type PersonLinkImageLike = {
  link_kind: string;
  status: FeaturedImageLinkStatus | string;
  metadata: Record<string, unknown> | null;
};

const FEATURED_IMAGE_SOURCE_ORDER = ["bravo", "imdb", "tmdb", "wikipedia", "wikidata", "fandom"] as const;

const classifyPersonLinkSource = (linkKind: string): (typeof FEATURED_IMAGE_SOURCE_ORDER)[number] | null => {
  const kind = linkKind.trim().toLowerCase();
  if (!kind) return null;
  if (kind === "bravo_profile" || kind.includes("bravo")) return "bravo";
  if (kind.includes("imdb")) return "imdb";
  if (kind.includes("tmdb")) return "tmdb";
  if (kind === "wikipedia") return "wikipedia";
  if (kind === "wikidata") return "wikidata";
  if (kind === "fandom" || kind === "wikia") return "fandom";
  return null;
};

const getStatusRank = (status: string): number => {
  if (status === "approved") return 0;
  if (status === "pending") return 1;
  return 2;
};

const getSourceRank = (linkKind: string): number => {
  const sourceKey = classifyPersonLinkSource(linkKind);
  if (!sourceKey) return FEATURED_IMAGE_SOURCE_ORDER.length;
  return FEATURED_IMAGE_SOURCE_ORDER.indexOf(sourceKey);
};

export const getEntityLinkFeaturedImageUrl = (
  metadata: Record<string, unknown> | null | undefined
): string | null => {
  const value = typeof metadata?.featured_image_url === "string" ? metadata.featured_image_url.trim() : "";
  return value || null;
};

export const pickPreferredPersonLinkFeaturedImage = (links: PersonLinkImageLike[]): string | null => {
  const sorted = [...links].sort((a, b) => {
    const statusDiff = getStatusRank(String(a.status || "").trim().toLowerCase()) - getStatusRank(String(b.status || "").trim().toLowerCase());
    if (statusDiff !== 0) return statusDiff;
    const sourceDiff = getSourceRank(a.link_kind) - getSourceRank(b.link_kind);
    if (sourceDiff !== 0) return sourceDiff;
    return a.link_kind.localeCompare(b.link_kind);
  });

  for (const link of sorted) {
    if (getStatusRank(String(link.status || "").trim().toLowerCase()) >= 2) continue;
    const featuredImageUrl = getEntityLinkFeaturedImageUrl(link.metadata);
    if (featuredImageUrl) return featuredImageUrl;
  }
  return null;
};
