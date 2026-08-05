import {
  getHostnameFromUrl,
  isFandomSeedUrl,
  isLikelyPageUrl,
  isSocialLinkKind,
  normalizeLinkKind,
  parsePersonNameFromLink,
  resolveLinkPageTitle,
  resolveLinkSiteTitle,
  resolveShowPageDisplayTitle,
} from "@/lib/admin/show-page/link-display";
import type {
  EntityLink,
  EntityLinkStatus,
  LinkSourceBadgeKind,
  PersonLinkSourceKey,
} from "@/lib/admin/show-page/workspace-model";

export type ShowLinkSocialIconKey =
  | "instagram"
  | "tiktok"
  | "twitter"
  | "youtube"
  | "threads"
  | "facebook"
  | "reddit";

export const normalizeEntityLinkStatus = (value: unknown): EntityLinkStatus => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  return "pending";
};

export const classifyPersonLinkSource = (linkKind: string): PersonLinkSourceKey | null => {
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

const getPersonSourceKindPriority = (
  sourceKey: PersonLinkSourceKey,
  linkKind: string
): number => {
  const kind = linkKind.trim().toLowerCase();
  if (sourceKey === "wikidata") return kind === "wikidata" ? 0 : 99;
  if (sourceKey === "wikipedia") return kind === "wikipedia" ? 0 : 99;
  return 99;
};

export const pickPreferredPersonSourceLink = (
  sourceKey: PersonLinkSourceKey,
  links: EntityLink[]
): EntityLink | null => {
  if (links.length === 0) return null;
  const rankByStatus = (status: EntityLinkStatus): number => {
    if (status === "approved") return 0;
    if (status === "pending") return 1;
    return 2;
  };
  const sorted = [...links].sort((a, b) => {
    const statusDiff =
      rankByStatus(normalizeEntityLinkStatus(a.status)) -
      rankByStatus(normalizeEntityLinkStatus(b.status));
    if (statusDiff !== 0) return statusDiff;
    const kindDiff =
      getPersonSourceKindPriority(sourceKey, a.link_kind) -
      getPersonSourceKindPriority(sourceKey, b.link_kind);
    if (kindDiff !== 0) return kindDiff;
    return (a.label || a.url).localeCompare(b.label || b.url);
  });
  return sorted[0] ?? null;
};

export const PAGE_LINK_SOURCE_ORDER: LinkSourceBadgeKind[] = [
  "official",
  "bravo",
  "fandom",
  "wikipedia",
  "wikidata",
  "imdb",
  "tmdb",
  "tvdb",
  "tvmaze",
  "trakt",
  "ratinggraph",
  "freebase",
  "google_kg",
  "x_topic",
  "google_news",
  "instagram",
  "tiktok",
  "x",
  "youtube",
  "threads",
  "facebook",
  "reddit",
  "other",
];

const PAGE_LINK_SOURCE_LABELS: Record<LinkSourceBadgeKind, string> = {
  official: "Official",
  google_news: "Google News",
  bravo: "Bravo TV",
  fandom: "Fandom",
  wikipedia: "Wikipedia",
  wikidata: "Wikidata",
  imdb: "IMDb",
  tmdb: "TMDb",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  threads: "Threads",
  facebook: "Facebook",
  reddit: "Reddit",
  tvdb: "TVDB",
  tvmaze: "TVmaze",
  trakt: "Trakt",
  freebase: "Freebase",
  google_kg: "Google KG",
  ratinggraph: "RatingGraph",
  x_topic: "X Topic",
  other: "Link",
};

export const getLinkSourceBadgeKind = (link: EntityLink): LinkSourceBadgeKind => {
  const normalizedKind = normalizeLinkKind(link.link_kind);
  const sourceKey = classifyPersonLinkSource(normalizedKind);
  if (sourceKey) return sourceKey;
  if (isSocialLinkKind(normalizedKind)) {
    if (normalizedKind === "x") return "x";
    return normalizedKind as LinkSourceBadgeKind;
  }
  if (
    normalizedKind === "official_page" ||
    normalizedKind === "network_blog" ||
    normalizedKind === "cast_announcement"
  ) {
    const host = getHostnameFromUrl(link.url)?.toLowerCase() ?? "";
    if (host.includes("bravotv.com")) return "bravo";
    return "official";
  }
  if (normalizedKind === "tvdb") return "tvdb";
  if (normalizedKind === "tvmaze") return "tvmaze";
  if (normalizedKind === "trakt") return "trakt";
  if (normalizedKind === "freebase") return "freebase";
  if (normalizedKind === "google_kg") return "google_kg";
  if (normalizedKind === "ratinggraph") return "ratinggraph";
  if (normalizedKind === "x_topic") return "x_topic";
  if (normalizedKind === "google_news_url") return "google_news";
  return "other";
};

export const getSourceBadgeOrder = (kind: LinkSourceBadgeKind): number => {
  const index = PAGE_LINK_SOURCE_ORDER.indexOf(kind);
  return index === -1 ? PAGE_LINK_SOURCE_ORDER.length : index;
};

export const getLinkSourceLabel = (link: EntityLink): string => {
  const badgeKind = getLinkSourceBadgeKind(link);
  if (badgeKind === "fandom") {
    return resolveLinkSiteTitle(link) || PAGE_LINK_SOURCE_LABELS.fandom;
  }
  if (badgeKind === "official" || badgeKind === "bravo") {
    const host = getHostnameFromUrl(link.url)?.toLowerCase() ?? "";
    if (host.includes("bravotv.com")) return "Bravo TV";
  }
  return (
    PAGE_LINK_SOURCE_LABELS[badgeKind] ||
    String(link.label || link.link_kind || "Link").trim() ||
    "Link"
  );
};

export const getShowPageLinkTitle = (link: EntityLink, showName: string): string =>
  resolveShowPageDisplayTitle(link, showName);

const decodeHandleToken = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const normalizeSocialHandleValue = (value: string): string | null => {
  const decoded = decodeHandleToken(value).trim();
  if (!decoded) return null;
  const handleMatch = decoded.match(/@[\w.]+/);
  if (handleMatch) {
    return `@${handleMatch[0].replace(/^@+/, "")}`;
  }
  const normalized = decoded.replace(/^@+/, "").trim();
  if (!normalized) return null;
  return `@${normalized}`;
};

export const extractSocialHandleFromUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const handle = segments.at(-1) ?? "";
    return normalizeSocialHandleValue(handle);
  } catch {
    return null;
  }
};

export const getApprovedLinkText = (link: EntityLink, fallbackTitle: string): string => {
  const badgeKind = getLinkSourceBadgeKind(link);
  if (isSocialLinkKind(badgeKind)) {
    const normalizedUrlHandle = extractSocialHandleFromUrl(link.url);
    if (normalizedUrlHandle) return normalizedUrlHandle;
    const rawLabel = String(link.label || "").trim();
    const normalizedLabelHandle = normalizeSocialHandleValue(rawLabel);
    if (normalizedLabelHandle) return normalizedLabelHandle;
    return rawLabel.startsWith("@") ? rawLabel : link.url;
  }
  return resolveLinkPageTitle(link) || String(link.label || "").trim() || fallbackTitle;
};

export const getCastMemberLinkText = (link: EntityLink, personName: string): string => {
  const badgeKind = getLinkSourceBadgeKind(link);
  if (isSocialLinkKind(badgeKind)) {
    return getApprovedLinkText(link, personName);
  }
  if (badgeKind === "fandom") {
    return resolveLinkPageTitle(link) || personName;
  }
  return personName;
};

const getCastMemberNameSourcePriority = (link: EntityLink): number => {
  const normalizedKind = normalizeLinkKind(link.link_kind);
  if (normalizedKind === "bravo_profile") return 0;
  if (normalizedKind === "wikipedia") return 1;
  if (normalizedKind === "fandom") return 2;
  if (normalizedKind === "wikidata") return 3;
  if (normalizedKind === "imdb") return 4;
  if (normalizedKind === "tmdb") return 5;
  if (isSocialLinkKind(normalizedKind)) return 99;
  if (normalizedKind === "freebase" || normalizedKind === "google_kg") return 98;
  return 50;
};

export const resolveCastMemberNameFromLinks = (
  links: EntityLink[],
  rosterName: string | null | undefined
): string => {
  const normalizedRosterName = String(rosterName || "").trim();
  if (normalizedRosterName) return normalizedRosterName;

  const rankedCandidates = links
    .map((link) => ({
      link,
      name: parsePersonNameFromLink(link),
      statusPriority: normalizeEntityLinkStatus(link.status) === "approved" ? 0 : 1,
      sourcePriority: getCastMemberNameSourcePriority(link),
    }))
    .filter((candidate): candidate is typeof candidate & { name: string } => Boolean(candidate.name))
    .sort((a, b) => {
      const statusDiff = a.statusPriority - b.statusPriority;
      if (statusDiff !== 0) return statusDiff;
      const sourceDiff = a.sourcePriority - b.sourcePriority;
      if (sourceDiff !== 0) return sourceDiff;
      const shorterDiff = a.name.length - b.name.length;
      if (shorterDiff !== 0) return shorterDiff;
      return a.name.localeCompare(b.name);
    });

  return rankedCandidates[0]?.name || "Unknown Person";
};

export const isRenderableSeasonPageLink = (link: EntityLink): boolean => {
  if (normalizeEntityLinkStatus(link.status) !== "approved") return false;
  if (
    link.entity_type !== "season" &&
    !(typeof link.season_number === "number" && link.season_number > 0)
  ) {
    return false;
  }
  const normalizedKind = normalizeLinkKind(link.link_kind);
  if (isSocialLinkKind(normalizedKind)) return false;
  if (normalizedKind === "cast_announcement" || normalizedKind === "network_blog") return false;
  if (isFandomSeedUrl(link.url)) return false;
  return isLikelyPageUrl(link.url);
};

export const isRenderableShowPageLink = (link: EntityLink): boolean => {
  if (normalizeEntityLinkStatus(link.status) !== "approved") return false;
  if (link.entity_type !== "show" || Number(link.season_number || 0) > 0) return false;
  const normalizedKind = normalizeLinkKind(link.link_kind);
  if (link.link_group === "social" || isSocialLinkKind(normalizedKind)) return false;
  if (normalizedKind === "cast_announcement") return false;
  if (isFandomSeedUrl(link.url)) return false;
  return isLikelyPageUrl(link.url);
};

export const toSocialPlatformIconKey = (
  kind: LinkSourceBadgeKind
): ShowLinkSocialIconKey | null => {
  if (
    kind === "instagram" ||
    kind === "tiktok" ||
    kind === "youtube" ||
    kind === "threads" ||
    kind === "facebook" ||
    kind === "reddit"
  ) {
    return kind;
  }
  if (kind === "x") return "twitter";
  return null;
};

export const usesBrandIconOnly = (kind: LinkSourceBadgeKind): boolean =>
  Boolean(
    toSocialPlatformIconKey(kind) ||
      kind === "imdb" ||
      kind === "tmdb" ||
      kind === "bravo" ||
      kind === "wikipedia" ||
      kind === "wikidata"
  );
