export interface FandomSyncOptions {
  manual_page_urls?: string[];
  max_candidates?: number;
  include_allpages_scan?: boolean;
  allpages_max_pages?: number;
  community_domains?: string[];
  save_source_variants?: boolean;
  selected_page_urls?: string[];
}

export interface FandomCandidatePage {
  url: string;
  title?: string;
  source?: string;
  score?: number;
}

export interface FandomDynamicSection {
  title?: string;
  canonical_title?: string;
  paragraphs?: unknown[];
  bullets?: unknown[];
  table_rows?: unknown[];
}

export type FandomBioCardSection = Record<string, unknown>;
export type FandomBioCard = Record<string, FandomBioCardSection>;

export interface FandomProfilePayload extends Record<string, unknown> {
  casting_summary?: string | null;
  summary?: string | null;
  dynamic_sections?: FandomDynamicSection[] | null;
  bio_card?: FandomBioCard | null;
  citations?: unknown;
  conflicts?: unknown;
}

export interface FandomSyncPreviewResponse extends Record<string, unknown> {
  candidate_pages?: FandomCandidatePage[];
  selected_pages?: FandomCandidatePage[];
  warnings: string[];
  profile?: FandomProfilePayload | null;
  season_profile?: FandomProfilePayload | null;
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
};

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toIntegerOrUndefined = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.trunc(value);
  return rounded >= 0 ? rounded : undefined;
};

const toBooleanOrUndefined = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => toNonEmptyString(entry))
    .filter((entry): entry is string => Boolean(entry));
};

export const normalizeFandomWarnings = (value: unknown): string[] => toStringArray(value);

export const normalizeFandomCandidatePages = (value: unknown): FandomCandidatePage[] => {
  if (!Array.isArray(value)) return [];
  const pages: FandomCandidatePage[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (!record) continue;
    const url = toNonEmptyString(record.url);
    if (!url) continue;
    const page: FandomCandidatePage = { url };
    const title = toNonEmptyString(record.title);
    const source = toNonEmptyString(record.source);
    if (title) page.title = title;
    if (source) page.source = source;
    if (typeof record.score === "number" && Number.isFinite(record.score)) {
      page.score = record.score;
    }
    pages.push(page);
  }
  return pages;
};

export const normalizeFandomDynamicSections = (value: unknown): FandomDynamicSection[] => {
  if (!Array.isArray(value)) return [];
  const sections: FandomDynamicSection[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (!record) continue;
    const section: FandomDynamicSection = {};
    const title = toNonEmptyString(record.title);
    const canonicalTitle = toNonEmptyString(record.canonical_title);
    if (title) section.title = title;
    if (canonicalTitle) section.canonical_title = canonicalTitle;
    if (Array.isArray(record.paragraphs)) section.paragraphs = record.paragraphs;
    if (Array.isArray(record.bullets)) section.bullets = record.bullets;
    if (Array.isArray(record.table_rows)) section.table_rows = record.table_rows;
    sections.push(section);
  }
  return sections;
};

export const fandomSectionBucket = (
  section: FandomDynamicSection
): "casting" | "biography" | "taglines" | "reunion" | "other" => {
  const key = String(section.canonical_title ?? section.title ?? "").toLowerCase();
  if (key.includes("cast")) return "casting";
  if (key.includes("biograph")) return "biography";
  if (key.includes("tagline")) return "taglines";
  if (key.includes("reunion") && key.includes("seating")) return "reunion";
  return "other";
};

export const normalizeFandomBioCard = (value: unknown): FandomBioCard | null => {
  const card = asRecord(value);
  if (!card) return null;
  const normalized: FandomBioCard = {};
  for (const [key, entry] of Object.entries(card)) {
    const section = asRecord(entry);
    if (section) normalized[key] = section;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
};

export const normalizeFandomProfile = (value: unknown): FandomProfilePayload | null => {
  const raw = asRecord(value);
  if (!raw) return null;
  const normalized: FandomProfilePayload = { ...raw };
  normalized.casting_summary = toNonEmptyString(raw.casting_summary);
  normalized.summary = toNonEmptyString(raw.summary);
  normalized.dynamic_sections = normalizeFandomDynamicSections(raw.dynamic_sections);
  normalized.bio_card = normalizeFandomBioCard(raw.bio_card);
  normalized.citations = raw.citations;
  normalized.conflicts = raw.conflicts;
  return normalized;
};

export const normalizeFandomPreviewProfile = (
  preview: FandomSyncPreviewResponse | null | undefined
): FandomProfilePayload | null => {
  if (!preview) return null;
  return normalizeFandomProfile(preview.profile) ?? normalizeFandomProfile(preview.season_profile);
};

export const normalizeFandomSyncOptions = (value: unknown): FandomSyncOptions => {
  const raw = asRecord(value) ?? {};
  const normalized: FandomSyncOptions = {};
  const manualPageUrls = toStringArray(raw.manual_page_urls);
  if (manualPageUrls.length > 0) normalized.manual_page_urls = manualPageUrls;
  const selectedPageUrls = toStringArray(raw.selected_page_urls);
  if (selectedPageUrls.length > 0) normalized.selected_page_urls = selectedPageUrls;
  const communityDomains = toStringArray(raw.community_domains);
  if (communityDomains.length > 0) normalized.community_domains = communityDomains;
  const maxCandidates = toIntegerOrUndefined(raw.max_candidates);
  if (maxCandidates !== undefined) normalized.max_candidates = maxCandidates;
  const allPagesMax = toIntegerOrUndefined(raw.allpages_max_pages);
  if (allPagesMax !== undefined) normalized.allpages_max_pages = allPagesMax;
  const includeAllPagesScan = toBooleanOrUndefined(raw.include_allpages_scan);
  if (includeAllPagesScan !== undefined) normalized.include_allpages_scan = includeAllPagesScan;
  const saveSourceVariants = toBooleanOrUndefined(raw.save_source_variants);
  if (saveSourceVariants !== undefined) normalized.save_source_variants = saveSourceVariants;
  return normalized;
};

export const normalizeFandomSyncPreviewResponse = (value: unknown): FandomSyncPreviewResponse => {
  const raw = asRecord(value) ?? {};
  const normalized: FandomSyncPreviewResponse = {
    ...raw,
    candidate_pages: normalizeFandomCandidatePages(raw.candidate_pages),
    selected_pages: normalizeFandomCandidatePages(raw.selected_pages),
    warnings: normalizeFandomWarnings(raw.warnings),
    profile: normalizeFandomProfile(raw.profile),
    season_profile: normalizeFandomProfile(raw.season_profile),
  };
  return normalized;
};
