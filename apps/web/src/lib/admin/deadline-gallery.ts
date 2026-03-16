import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

const DEADLINE_HOSTS = new Set(["deadline.com", "www.deadline.com"]);
const GALLERY_EXPORT_RE = /(?:var\s+)?pmcGalleryExports\s*=\s*(\{.*?\});/s;

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  nbsp: " ",
  quot: '"',
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  hellip: "...",
  ndash: "-",
  mdash: "-",
};

type DeadlineGalleryExports = {
  gallery?: Array<Record<string, unknown>>;
};

export interface DeadlineGalleryItem {
  captionText: string;
  imageUrl: string;
  pageUrl: string | null;
  position: number | null;
  slug: string | null;
}

type DeadlineResolutionHints = {
  caption?: string | null;
  pageUrl?: string | null;
  personNames?: string[];
};

const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      const codePoint = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (lower.startsWith("#")) {
      const codePoint = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return HTML_ENTITY_MAP[lower] ?? match;
  });

const stripHtml = (value: string): string =>
  decodeHtmlEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ");

const normalizeText = (value: string | null | undefined): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const extractPageSlug = (value: string | null | undefined): string | null => {
  const raw = readString(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments.at(-1)?.toLowerCase() ?? null;
  } catch {
    return null;
  }
};

export const isDeadlineUrl = (value: string | null | undefined): boolean => {
  const raw = readString(value);
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return DEADLINE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
};

export const isDeadlineOfficialSeasonAnnouncementAsset = (asset: Pick<SeasonAsset, "source" | "context_type">): boolean =>
  asset.source === "deadline.com" &&
  String(asset.context_type ?? "").trim().toUpperCase() === "OFFICIAL SEASON ANNOUNCEMENT";

export const isDeadlineGalleryNonPhotoCaption = (caption: string | null | undefined): boolean => {
  const normalized = normalizeText(caption);
  if (!normalized) return false;
  return (
    normalized.includes("breaking news alerts") ||
    normalized.includes("keep your inbox happy")
  );
};

export const extractDeadlineGalleryItems = (html: string): DeadlineGalleryItem[] => {
  const match = html.match(GALLERY_EXPORT_RE);
  if (!match?.[1]) return [];

  let parsed: DeadlineGalleryExports;
  try {
    parsed = JSON.parse(match[1]) as DeadlineGalleryExports;
  } catch {
    return [];
  }

  const gallery = Array.isArray(parsed.gallery) ? parsed.gallery : [];
  return gallery
    .map((item): DeadlineGalleryItem | null => {
      const imageUrl = readString(item.image);
      if (!imageUrl) return null;
      return {
        captionText: stripHtml(readString(item.caption) ?? "").trim(),
        imageUrl,
        pageUrl: readString(item.url),
        position: typeof item.position === "number" ? item.position : null,
        slug: readString(item.slug)?.toLowerCase() ?? null,
      };
    })
    .filter((item): item is DeadlineGalleryItem => Boolean(item));
};

export const resolveDeadlineGalleryImageUrl = (
  html: string,
  hints: DeadlineResolutionHints,
): string | null => {
  const items = extractDeadlineGalleryItems(html);
  if (items.length === 0) return null;

  const normalizedCaption = normalizeText(hints.caption);
  if (normalizedCaption) {
    const exactCaptionMatch = items.find(
      (item) => normalizeText(item.captionText) === normalizedCaption,
    );
    if (exactCaptionMatch) return exactCaptionMatch.imageUrl;
  }

  const normalizedNames = (hints.personNames ?? [])
    .map((name) => normalizeText(name))
    .filter(Boolean);
  if (normalizedNames.length > 0) {
    const nameMatch = items.find((item) => {
      const normalizedItemCaption = normalizeText(item.captionText);
      return normalizedNames.some((name) => normalizedItemCaption.includes(name));
    });
    if (nameMatch) return nameMatch.imageUrl;
  }

  const pageSlug = extractPageSlug(hints.pageUrl);
  if (pageSlug) {
    const slugMatch = items.find((item) => item.slug === pageSlug);
    if (slugMatch) return slugMatch.imageUrl;
  }

  if (normalizedCaption) {
    const fuzzyCaptionMatch = items.find((item) => {
      const normalizedItemCaption = normalizeText(item.captionText);
      return (
        normalizedItemCaption.includes(normalizedCaption) ||
        normalizedCaption.includes(normalizedItemCaption)
      );
    });
    if (fuzzyCaptionMatch) return fuzzyCaptionMatch.imageUrl;
  }

  return null;
};
