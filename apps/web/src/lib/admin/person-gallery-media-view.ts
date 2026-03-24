import type { TrrPersonPhoto } from "@/lib/server/trr-api/trr-shows-repository";

export type GalleryShowFilter =
  | "all"
  | "this-show"
  | "wwhl"
  | "bravocon"
  | "events"
  | "other-shows"
  | "unsorted";

export type PersonGalleryOtherShowOption = {
  key: string;
  showId: string | null;
  showName: string;
  acronym: string | null;
};

export type PersonGalleryEventOption = {
  key: string;
  label: string;
  count: number | null;
};

export type PersonGalleryEventSubcategoryOption = {
  key: string;
  label: string;
};

type PersonGalleryShowOptionAccumulator = {
  canonicalKey: string;
  showId: string | null;
  showName: string;
  acronym: string | null;
};

export type CanonicalScopedSource = "imdb" | "tmdb" | "fandom" | "fandom-gallery" | "getty" | "nbcumv" | "bravotv";

export const CANONICAL_SCOPED_SOURCE_ORDER: CanonicalScopedSource[] = [
  "fandom",
  "fandom-gallery",
  "getty",
  "imdb",
  "nbcumv",
  "bravotv",
  "tmdb",
];

export const WWHL_LABEL = "WWHL";
export const BRAVOCON_LABEL = "BravoCon";
export const UNSORTED_LABEL = "UNSORTED";

const EVENT_SUBCATEGORY_LABEL_BY_KEY: Record<string, string> = {
  celebrity_sightings: "Celebrity Sightings",
  premieres_red_carpet_screenings: "Premieres / Red Carpet / Screenings",
  press_upfront_tca_panel: "Press / Upfront / TCA / Panel",
  tv_radio_podcast_studio: "TV / Radio / Podcast / Studio Appearances",
  awards_after_party_ceremony: "Awards / After Party / Ceremony",
  charity_benefit_fundraiser: "Charity / Benefit / Fundraiser",
  brand_launch_opening_social: "Brand / Launch / Opening / Social Event",
  reality_tv_bravo_franchise: "Reality TV / Bravo / Franchise Event",
  other_shows: "Other Shows",
  unsorted: UNSORTED_LABEL,
};
const EVENT_SUBCATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ["celebrity_sightings", ["celebrity sightings", "celebrities at"]],
  ["premieres_red_carpet_screenings", ["premiere of", "premiere", "red carpet", "special screening", "opening night"]],
  ["press_upfront_tca_panel", ["tca", "tour", "press day", "press tour", "upfront", "panel", "portraits", "press line"]],
  ["tv_radio_podcast_studio", ['on "extra"', "podcast", "hollywood today live", "siriusxm", "build series", "visit", "discussing"]],
  ["awards_after_party_ceremony", ["academy awards", "golden globe", "golden globes", "grammy", "espys", "after party"]],
  ["charity_benefit_fundraiser", ["benefitting", "benefiting", "benefit", "foundation", "fundraiser", "auction", "awareness", "luncheon", "guild", "hospital", "susan g. komen", "cedars-sinai", "scholarship", "gala dinner"]],
  ["brand_launch_opening_social", ["launch party", "grand opening", "pre-opening", "launch", "boutique", "magazine", "party", "presents", "celebrates", "event hosted by", "young hollywood", "hot hollywood", "so sexy", "hollywood in bright pink", "villa azur", "tao"]],
  ["reality_tv_bravo_franchise", ["bravo", "real housewives", "ultimate girls trip", "my kitchen rules", "marriage boot camp", "love after lockup", "andy cohen", "reality tv", "dragcon", "celebrity apprentice"]],
  ["other_shows", ["big brother"]],
];

const TRUSTED_IMDB_SHOW_CONTEXT_SOURCES = new Set([
  "episode_table",
  "imdb_title_fallback",
]);

const SHOW_ACRONYM_RE = /\bRH[A-Z0-9]{2,6}\b/g;
const WWHL_NAME_RE = /watch\s+what\s+happens\s+live|wwhl/i;
const STILL_FRAME_IMAGE_TYPES = new Set([
  "still_frame",
  "still frame",
  "episode_still",
  "episode still",
]);
const EVENT_IMAGE_TYPES = new Set(["event", "events", "premiere", "red_carpet", "red carpet"]);

export function toCanonicalScopedSource(value: string | null | undefined): CanonicalScopedSource | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/_/g, "-");
  if (normalized === "imdb") return "imdb";
  if (normalized === "tmdb") return "tmdb";
  if (normalized === "fandom") return "fandom";
  if (normalized === "fandom-gallery") return "fandom-gallery";
  if (normalized === "getty") return "getty";
  if (normalized === "nbcumv") return "nbcumv";
  if (normalized === "bravotv") return "bravotv";
  return null;
}

export function buildShowAcronym(name: string | null | undefined): string | null {
  if (!name) return null;
  if (isWwhlShowName(name)) return WWHL_LABEL;
  const normalized = normalizeShowNameToken(name);
  const housewivesPrefix = "the real housewives of ";
  const altHousewivesPrefix = "real housewives of ";
  const cityToken = normalized.startsWith(housewivesPrefix)
    ? normalized.slice(housewivesPrefix.length)
    : normalized.startsWith(altHousewivesPrefix)
      ? normalized.slice(altHousewivesPrefix.length)
      : null;
  if (cityToken) {
    const cityAcronym = cityToken
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0]?.toUpperCase?.() ?? "")
      .join("");
    return cityAcronym ? `RHO${cityAcronym}` : "RHO";
  }
  const words = name
    .replace(/[^a-z0-9 ]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return null;
  const filtered = words.filter(
    (word) => !["the", "and", "a", "an", "to", "for"].includes(word.toLowerCase())
  );
  const acronym = (filtered.length > 0 ? filtered : words)
    .map((word) => word[0]?.toUpperCase?.() ?? "")
    .join("");
  return acronym || null;
}

export function getShowDisplayLabel(name: string | null | undefined): string | null {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return null;
  return buildShowAcronym(trimmed) ?? trimmed;
}

export function extractShowAcronyms(text: string): Set<string> {
  const matches = text.toUpperCase().match(SHOW_ACRONYM_RE) ?? [];
  return new Set(matches);
}

export function isWwhlShowName(value: string | null | undefined): boolean {
  if (!value) return false;
  return WWHL_NAME_RE.test(value);
}

export function isLikelyImdbEpisodeCaption(value: string | null | undefined): boolean {
  if (!value) return false;
  const text = value.trim();
  if (!text) return false;
  const hasYearSuffix = /\(\d{4}\)\s*$/i.test(text);
  if (!hasYearSuffix) return false;

  const episodeMarkers = [
    /\bs\d{1,3}x\d{1,3}\b/i,
    /\bs\d{1,3}\s*e\d{1,3}\b/i,
    /\bepisode\s+#?\d{1,4}\b/i,
    /\#\s*\d{1,4}(?:\.\d{1,2})?\b/i,
    /\bseason\s+\d{1,3}\b/i,
    /\bepisode\b/i,
  ];

  return episodeMarkers.some((pattern) => pattern.test(text));
}

function normalizeShowNameToken(value: string | null | undefined): string {
  if (!value) return "";
  const withoutParenthetical = value.replace(/\(.*?\)/g, " ");
  return withoutParenthetical
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function pickPreferredShowName(
  firstValue: string | null | undefined,
  secondValue: string | null | undefined
): string {
  const first = typeof firstValue === "string" ? firstValue.trim() : "";
  const second = typeof secondValue === "string" ? secondValue.trim() : "";
  if (!first) return second;
  if (!second) return first;
  return second.length > first.length ? second : first;
}

export function buildPersonGalleryShowOptions(
  photos: readonly TrrPersonPhoto[]
): PersonGalleryOtherShowOption[] {
  const byIdentity = new Map<string, PersonGalleryShowOptionAccumulator>();
  for (const photo of photos) {
    if (photo.bucket_type !== "show") continue;
    const showId = typeof photo.resolved_show_id === "string" ? photo.resolved_show_id.trim() || null : null;
    const showName =
      photo.resolved_show_name?.trim() ||
      (typeof photo.bucket_label === "string" ? photo.bucket_label.trim() : "") ||
      "";
    if (!showName || isWwhlShowName(showName)) continue;
    const normalizedShowName = normalizeShowNameToken(showName);
    const acronym = buildShowAcronym(showName);
    const identityKey =
      normalizedShowName ||
      (showId ? `id:${showId}` : "") ||
      (acronym ? `acronym:${acronym}` : "");
    if (!identityKey) continue;
    const existing = byIdentity.get(identityKey);
    if (!existing) {
      byIdentity.set(identityKey, {
        canonicalKey: showId ? `id:${showId}` : `name:${identityKey}`,
        showId,
        showName,
        acronym,
      });
      continue;
    }
    const preferredShowName = pickPreferredShowName(existing.showName, showName);
    const preferredShowId = existing.showId ?? showId;
    byIdentity.set(identityKey, {
      canonicalKey: preferredShowId ? `id:${preferredShowId}` : existing.canonicalKey,
      showId: preferredShowId,
      showName: preferredShowName,
      acronym: buildShowAcronym(preferredShowName) ?? existing.acronym ?? acronym,
    });
  }
  return Array.from(byIdentity.values())
    .map((entry) => ({
      key: entry.canonicalKey,
      showId: entry.showId,
      showName: entry.showName,
      acronym: entry.acronym,
    }))
    .sort((first, second) => {
      const firstLabel = getShowDisplayLabel(first.showName) ?? first.showName;
      const secondLabel = getShowDisplayLabel(second.showName) ?? second.showName;
      return firstLabel.localeCompare(secondLabel);
    });
}

function normalizedShowNamesMatch(
  firstValue: string | null | undefined,
  secondValue: string | null | undefined
): boolean {
  const first = normalizeShowNameToken(firstValue);
  const second = normalizeShowNameToken(secondValue);
  if (!first || !second) return false;
  if (first === second) return true;
  if (first.length < 4 || second.length < 4) return false;
  return first.includes(second) || second.includes(first);
}

function normalizedTextIncludesShowName(
  text: string | null | undefined,
  showName: string | null | undefined
): boolean {
  const normalizedText = normalizeShowNameToken(text);
  const normalizedShow = normalizeShowNameToken(showName);
  if (!normalizedText || !normalizedShow) return false;
  return normalizedText.includes(normalizedShow);
}

function inferEventSubcategoryKeys(value: string | null | undefined): string[] {
  const normalized = normalizeShowNameToken(value);
  if (!normalized) return ["unsorted"];
  const keys = EVENT_SUBCATEGORY_KEYWORDS
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([key]) => key);
  return keys.length > 0 ? keys : ["unsorted"];
}

function readGalleryBucketString(
  photo: TrrPersonPhoto,
  metadata: Record<string, unknown>,
  key: string
): string | null {
  const directValue = (photo as unknown as Record<string, unknown>)[key];
  if (typeof directValue === "string" && directValue.trim()) return directValue.trim();
  const metadataValue = metadata[key];
  if (typeof metadataValue === "string" && metadataValue.trim()) return metadataValue.trim();
  const nested = metadata.gallery_bucket;
  if (!nested || typeof nested !== "object") return null;
  const nestedValue = (nested as Record<string, unknown>)[key];
  return typeof nestedValue === "string" && nestedValue.trim() ? nestedValue.trim() : null;
}

function readGalleryBucketStringArray(
  photo: TrrPersonPhoto,
  metadata: Record<string, unknown>,
  key: string
): string[] {
  const readCandidate = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
  };
  const directValue = readCandidate((photo as unknown as Record<string, unknown>)[key]);
  if (directValue.length > 0) return directValue;
  const metadataValue = readCandidate(metadata[key]);
  if (metadataValue.length > 0) return metadataValue;
  const nested = metadata.gallery_bucket;
  if (!nested || typeof nested !== "object") return [];
  return readCandidate((nested as Record<string, unknown>)[key]);
}

function readPersonImageCount(
  photo: TrrPersonPhoto,
  metadata: Record<string, unknown>
): number | null {
  const galleryBucket = metadata.gallery_bucket;
  if (typeof galleryBucket === "object" && galleryBucket !== null) {
    const bucketMeta = galleryBucket as Record<string, unknown>;
    if (typeof bucketMeta.person_image_count === "number") return bucketMeta.person_image_count;
  }
  if (typeof metadata.person_image_count === "number") return metadata.person_image_count;
  return null;
}

function readSourceQueryScope(
  photo: TrrPersonPhoto,
  metadata: Record<string, unknown>
): string | null {
  const galleryBucket = metadata.gallery_bucket;
  if (typeof galleryBucket === "object" && galleryBucket !== null) {
    const bucketMeta = galleryBucket as Record<string, unknown>;
    if (typeof bucketMeta.source_query_scope === "string") return bucketMeta.source_query_scope;
  }
  if (typeof metadata.source_query_scope === "string") return metadata.source_query_scope;
  return null;
}

function readGroupedImageCount(
  photo: TrrPersonPhoto,
  metadata: Record<string, unknown>
): number | null {
  const directValue = (photo as unknown as Record<string, unknown>).grouped_image_count;
  if (typeof directValue === "number" && Number.isFinite(directValue)) return directValue;
  if (typeof directValue === "string" && directValue.trim().length > 0) {
    const parsedDirectValue = Number.parseInt(directValue, 10);
    if (Number.isFinite(parsedDirectValue)) return parsedDirectValue;
  }
  const metadataValue = metadata.grouped_image_count;
  if (typeof metadataValue === "number" && Number.isFinite(metadataValue)) return metadataValue;
  if (typeof metadataValue === "string" && metadataValue.trim().length > 0) {
    const parsedMetadataValue = Number.parseInt(metadataValue, 10);
    if (Number.isFinite(parsedMetadataValue)) return parsedMetadataValue;
  }
  const nested = metadata.gallery_bucket;
  if (!nested || typeof nested !== "object") return null;
  const nestedValue = (nested as Record<string, unknown>).grouped_image_count;
  if (typeof nestedValue === "number" && Number.isFinite(nestedValue)) return nestedValue;
  if (typeof nestedValue === "string" && nestedValue.trim().length > 0) {
    const parsedNestedValue = Number.parseInt(nestedValue, 10);
    if (Number.isFinite(parsedNestedValue)) return parsedNestedValue;
  }
  return null;
}

function hasImdbEpisodeEvidence(
  photo: TrrPersonPhoto,
  metadata: Record<string, unknown>
): boolean {
  if (typeof metadata.episode_title === "string" && metadata.episode_title.trim().length > 0) return true;
  if (typeof metadata.episode_imdb_id === "string" && metadata.episode_imdb_id.trim().length > 0) return true;
  if (typeof metadata.season_number === "number") return true;
  if (typeof metadata.episode_number === "number") return true;
  if (
    typeof metadata.imdb_title_type === "string" &&
    metadata.imdb_title_type.trim().toUpperCase() === "TVEPISODE"
  ) {
    return true;
  }
  if (
    typeof metadata.imdb_image_type === "string" &&
    STILL_FRAME_IMAGE_TYPES.has(metadata.imdb_image_type.trim().toLowerCase())
  ) {
    return true;
  }
  return isLikelyImdbEpisodeCaption(photo.caption);
}

export type PersonPhotoShowBuckets = {
  matchesThisShow: boolean;
  matchesWwhl: boolean;
  matchesBravocon: boolean;
  matchesEvents: boolean;
  matchesOtherShows: boolean;
  matchesSelectedOtherShow: boolean;
  matchesUnknownShows: boolean;
  eventBucketKey: string | null;
  eventBucketLabel: string | null;
  eventSubcategoryKeys: string[];
  personImageCount: number | null;
  sourceQueryScope: string | null;
};

export type PersonGalleryImportContext = {
  showId: string | null;
  showName: string | null;
  label: string | null;
};

export function resolvePersonGalleryImportContext(input: {
  galleryShowFilter: GalleryShowFilter;
  routeShow:
    | {
        showId: string | null;
        showName: string | null;
        label: string | null;
      }
    | null
    | undefined;
  selectedOtherShow: Pick<PersonGalleryOtherShowOption, "showId" | "showName"> | null;
  wwhlShow:
    | {
        showId: string | null;
        showName: string | null;
      }
    | null
    | undefined;
}): PersonGalleryImportContext {
  if (input.galleryShowFilter === "this-show" && input.routeShow) {
    return {
      showId: input.routeShow.showId ?? null,
      showName: input.routeShow.showName ?? null,
      label: input.routeShow.label ?? input.routeShow.showName ?? null,
    };
  }
  if (input.galleryShowFilter === "other-shows" && input.selectedOtherShow) {
    return {
      showId: input.selectedOtherShow.showId ?? null,
      showName: input.selectedOtherShow.showName ?? null,
      label: input.selectedOtherShow.showName ?? null,
    };
  }
  if (input.galleryShowFilter === "wwhl" && input.wwhlShow) {
    return {
      showId: input.wwhlShow.showId ?? null,
      showName: input.wwhlShow.showName ?? null,
      label: WWHL_LABEL,
    };
  }
  return {
    showId: null,
    showName: null,
    label: null,
  };
}

export function computePersonPhotoShowBuckets(input: {
  photo: TrrPersonPhoto;
  showIdForApi: string | null;
  activeShowName: string | null;
  activeShowAcronym: string | null;
  allKnownShowNameMatches: string[];
  allKnownShowAcronymMatches: ReadonlySet<string>;
  allKnownShowIds: string[];
  otherShowNameMatches: string[];
  otherShowAcronymMatches: ReadonlySet<string>;
  selectedOtherShow: Pick<PersonGalleryOtherShowOption, "showId" | "showName" | "acronym"> | null;
}): PersonPhotoShowBuckets {
  const { photo, showIdForApi, activeShowName, activeShowAcronym } = input;
  const metadata = (photo.metadata ?? {}) as Record<string, unknown>;
  const bucketType = readGalleryBucketString(photo, metadata, "bucket_type")?.toLowerCase() ?? null;
  const bucketKey = readGalleryBucketString(photo, metadata, "bucket_key");
  const bucketLabel = readGalleryBucketString(photo, metadata, "bucket_label");
  const explicitEventSubcategoryKeys = readGalleryBucketStringArray(photo, metadata, "event_subcategory_keys");
  const eventSubcategoryKeys =
    explicitEventSubcategoryKeys.length > 0
      ? explicitEventSubcategoryKeys
      : bucketType === "event"
        ? inferEventSubcategoryKeys(bucketLabel)
        : [];
  const personImageCount = readPersonImageCount(photo, metadata);
  const sourceQueryScope = readSourceQueryScope(photo, metadata);
  const resolvedBucketShowId = readGalleryBucketString(photo, metadata, "resolved_show_id");
  const resolvedBucketShowName = readGalleryBucketString(photo, metadata, "resolved_show_name");
  const groupedImageCount = readGroupedImageCount(photo, metadata);
  const qualifiesAsEvent = groupedImageCount !== null && groupedImageCount > 1;
  const rawMetaShowId = typeof metadata.show_id === "string" ? metadata.show_id : null;
  const rawMetaShowName = typeof metadata.show_name === "string" ? metadata.show_name.trim() : null;
  const rawMetaFallbackShowName =
    typeof metadata.imdb_fallback_show_name === "string" ? metadata.imdb_fallback_show_name.trim() : null;
  const metadataShowContextSource =
    typeof metadata.show_context_source === "string"
      ? metadata.show_context_source.trim().toLowerCase()
      : null;
  const showNameNormalized = normalizeShowNameToken(activeShowName);
  const showAcronym = activeShowAcronym?.toUpperCase?.() ?? null;
  const sourceNormalized = (photo.source ?? "").trim().toLowerCase();
  const trustedImdbContext =
    sourceNormalized !== "imdb" ||
    (metadataShowContextSource !== null &&
      TRUSTED_IMDB_SHOW_CONTEXT_SOURCES.has(metadataShowContextSource));
  const isRejectedRequestContext = metadataShowContextSource === "request_context_rejected";
  const inferredShowNameCandidate = rawMetaShowName || rawMetaFallbackShowName;

  const text = [
    photo.caption,
    photo.context_section,
    photo.context_type,
    typeof metadata.fandom_section_label === "string" ? metadata.fandom_section_label : null,
    typeof metadata.episode_title === "string" ? metadata.episode_title : null,
    ...(photo.title_names ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  const textNormalized = normalizeShowNameToken(text);
  const acronyms = extractShowAcronyms(text);

  const inferredShowAcronym = buildShowAcronym(inferredShowNameCandidate)?.toUpperCase() ?? null;
  const inferredShowCorroboratedByText = Boolean(
    inferredShowNameCandidate &&
      (normalizedTextIncludesShowName(textNormalized, inferredShowNameCandidate) ||
        (inferredShowAcronym ? acronyms.has(inferredShowAcronym) : false))
  );
  const inferredShowCorroboratedByTarget = Boolean(
    inferredShowNameCandidate && normalizedShowNamesMatch(inferredShowNameCandidate, activeShowName)
  );
  const requestContextInferredCorroborated = Boolean(
    sourceNormalized === "imdb" &&
      metadataShowContextSource === "request_context_inferred" &&
      hasImdbEpisodeEvidence(photo, metadata) &&
      inferredShowNameCandidate &&
      (inferredShowCorroboratedByTarget || inferredShowCorroboratedByText)
  );

  const trustImdbMetadata = trustedImdbContext || requestContextInferredCorroborated;
  const episodeEvidencedImdbFallback =
    sourceNormalized === "imdb" &&
    !trustImdbMetadata &&
    !isRejectedRequestContext &&
    metadataShowContextSource !== "request_context" &&
    metadataShowContextSource !== "request_context_rejected" &&
    hasImdbEpisodeEvidence(photo, metadata);
  const episodeProvenThisShow = Boolean(
    sourceNormalized === "imdb" &&
      !isRejectedRequestContext &&
      hasImdbEpisodeEvidence(photo, metadata) &&
      (normalizedShowNamesMatch(rawMetaFallbackShowName, activeShowName) ||
        (metadataShowContextSource !== "request_context" &&
          normalizedShowNamesMatch(rawMetaShowName, activeShowName)))
  );
  const matchesShowName = showNameNormalized ? normalizedTextIncludesShowName(textNormalized, activeShowName) : false;
  const matchesShowAcronym = showAcronym ? acronyms.has(showAcronym) : false;
  const metadataShowNameRaw = trustImdbMetadata
    ? rawMetaShowName || (sourceNormalized === "imdb" ? rawMetaFallbackShowName : null)
    : episodeEvidencedImdbFallback
      ? rawMetaShowName || rawMetaFallbackShowName
      : null;
  const metadataShowAcronym = buildShowAcronym(metadataShowNameRaw)?.toUpperCase() ?? null;
  const directWwhlMetadataSignal =
    isWwhlShowName(rawMetaShowName) || isWwhlShowName(rawMetaFallbackShowName);
  const matchesWwhl =
    bucketType === "wwhl" ||
    isWwhlShowName(text) ||
    isWwhlShowName(metadataShowNameRaw) ||
    directWwhlMetadataSignal ||
    acronyms.has(WWHL_LABEL);
  const matchesBravocon = bucketType === "bravocon";
  const rawImdbImageType =
    typeof metadata.imdb_image_type === "string" ? metadata.imdb_image_type.trim().toLowerCase() : null;
  const rawContentType =
    typeof metadata.content_type === "string" ? metadata.content_type.trim().toLowerCase() : null;
  const rawSectionTag =
    typeof metadata.fandom_section_tag === "string" ? metadata.fandom_section_tag.trim().toLowerCase() : null;
  const rawContextType = typeof photo.context_type === "string" ? photo.context_type.trim().toLowerCase() : null;
  const inferredEventSignal = Boolean(
    (rawImdbImageType && EVENT_IMAGE_TYPES.has(rawImdbImageType)) ||
      rawContentType === "event" ||
      rawSectionTag === "event" ||
      rawContextType === "event"
  );
  const matchesEvents = Boolean(
    (bucketType === "event" && qualifiesAsEvent) || inferredEventSignal
  );
  const eventRoutesToOtherShows =
    bucketType === "event" && explicitEventSubcategoryKeys.includes("other_shows");
  const eventRoutesToUnsorted =
    bucketType === "event" && explicitEventSubcategoryKeys.includes("unsorted");
  const ignoreMetaShowIdForImdb = sourceNormalized === "imdb" && !trustImdbMetadata;
  const metaShowId = ignoreMetaShowIdForImdb || !trustImdbMetadata ? null : rawMetaShowId;
  const metaShowIdMatches = Boolean(showIdForApi && metaShowId && metaShowId === showIdForApi);
  const metadataMatchesThisShow = Boolean(
    (Boolean(metadataShowNameRaw) &&
      ((trustImdbMetadata && !ignoreMetaShowIdForImdb) || episodeEvidencedImdbFallback) &&
      normalizedShowNamesMatch(metadataShowNameRaw, activeShowName)) ||
      normalizedShowNamesMatch(resolvedBucketShowName, activeShowName)
  );
  const matchesThisShow =
    (bucketType === "show" &&
      ((Boolean(showIdForApi) && resolvedBucketShowId === showIdForApi) ||
        normalizedShowNamesMatch(resolvedBucketShowName, activeShowName))) ||
    metaShowIdMatches ||
    matchesShowName ||
    matchesShowAcronym ||
    metadataMatchesThisShow ||
    episodeProvenThisShow;
  const matchesOtherShowName = input.otherShowNameMatches.some((name) =>
    normalizedTextIncludesShowName(textNormalized, name)
  );
  const matchesOtherShowAcronym = Array.from(acronyms).some((acro) =>
    input.otherShowAcronymMatches.has(acro)
  );
  const knownShowIds = new Set(input.allKnownShowIds);
  const matchesKnownShowById = Boolean(
    (metaShowId && knownShowIds.has(metaShowId)) ||
      (resolvedBucketShowId && knownShowIds.has(resolvedBucketShowId))
  );
  const matchesKnownShowByName = input.allKnownShowNameMatches.some((name) =>
    normalizedTextIncludesShowName(textNormalized, name)
  );
  const matchesKnownShowByAcronym = Array.from(acronyms).some((acro) =>
    input.allKnownShowAcronymMatches.has(acro)
  );
  const metadataMatchesKnownShow =
    (Boolean(metadataShowNameRaw) &&
      ((trustImdbMetadata && !ignoreMetaShowIdForImdb) || episodeEvidencedImdbFallback)
      ? input.allKnownShowNameMatches.some((name) => normalizedShowNamesMatch(metadataShowNameRaw, name))
      : false) ||
    input.allKnownShowNameMatches.some((name) => normalizedShowNamesMatch(resolvedBucketShowName, name));
  const matchesAnyKnownShow =
    matchesKnownShowById ||
    matchesKnownShowByName ||
    matchesKnownShowByAcronym ||
    matchesOtherShowName ||
    matchesOtherShowAcronym ||
    matchesThisShow ||
    metadataMatchesKnownShow;

  const matchesOtherShows =
    eventRoutesToOtherShows ||
    (matchesAnyKnownShow && !matchesThisShow && !matchesWwhl && !matchesBravocon);
  const matchesUnknownShows =
    eventRoutesToUnsorted ||
    (!matchesThisShow && !matchesWwhl && !matchesBravocon && !matchesEvents && !matchesAnyKnownShow);

  let matchesSelectedOtherShow = false;
  if (input.selectedOtherShow) {
    const selectedOtherName = input.selectedOtherShow.showName;
    const selectedOtherAcronym = input.selectedOtherShow.acronym?.toUpperCase() ?? null;
    const matchesSelectedById = Boolean(
      input.selectedOtherShow.showId &&
        (metaShowId === input.selectedOtherShow.showId ||
          resolvedBucketShowId === input.selectedOtherShow.showId)
    );
    const matchesSelectedByName =
      normalizedTextIncludesShowName(textNormalized, selectedOtherName) ||
      normalizedShowNamesMatch(metadataShowNameRaw, selectedOtherName) ||
      normalizedShowNamesMatch(resolvedBucketShowName, selectedOtherName);
    const matchesSelectedByAcronym = selectedOtherAcronym
      ? acronyms.has(selectedOtherAcronym) || metadataShowAcronym === selectedOtherAcronym
      : false;
    matchesSelectedOtherShow =
      matchesSelectedById || matchesSelectedByName || matchesSelectedByAcronym;
  }

  if (bucketType === "wwhl") {
    return {
      matchesThisShow: false,
      matchesWwhl: true,
      matchesBravocon: false,
      matchesEvents: false,
      matchesOtherShows: false,
      matchesSelectedOtherShow: false,
      matchesUnknownShows: false,
      eventBucketKey: null,
      eventBucketLabel: null,
      eventSubcategoryKeys,
      personImageCount,
      sourceQueryScope,
    };
  }
  if (bucketType === "bravocon") {
    return {
      matchesThisShow: false,
      matchesWwhl: false,
      matchesBravocon: true,
      matchesEvents: false,
      matchesOtherShows: false,
      matchesSelectedOtherShow: false,
      matchesUnknownShows: false,
      eventBucketKey: null,
      eventBucketLabel: null,
      eventSubcategoryKeys,
      personImageCount,
      sourceQueryScope,
    };
  }
  if (bucketType === "event") {
    return {
      matchesThisShow: false,
      matchesWwhl: false,
      matchesBravocon: false,
      matchesEvents: qualifiesAsEvent && !eventRoutesToOtherShows && !eventRoutesToUnsorted,
      matchesOtherShows: eventRoutesToOtherShows,
      matchesSelectedOtherShow: false,
      matchesUnknownShows: eventRoutesToUnsorted,
      eventBucketKey:
        qualifiesAsEvent && !eventRoutesToOtherShows && !eventRoutesToUnsorted ? bucketKey : null,
      eventBucketLabel:
        qualifiesAsEvent && !eventRoutesToOtherShows && !eventRoutesToUnsorted ? bucketLabel : null,
      eventSubcategoryKeys,
      personImageCount,
      sourceQueryScope,
    };
  }
  if (bucketType === "show") {
    return {
      matchesThisShow,
      matchesWwhl: false,
      matchesBravocon: false,
      matchesEvents: false,
      matchesOtherShows,
      matchesSelectedOtherShow,
      matchesUnknownShows: false,
      eventBucketKey: null,
      eventBucketLabel: null,
      eventSubcategoryKeys,
      personImageCount,
      sourceQueryScope,
    };
  }

  return {
    matchesThisShow,
    matchesWwhl,
    matchesBravocon,
    matchesEvents,
    matchesOtherShows,
    matchesSelectedOtherShow,
    matchesUnknownShows,
    eventBucketKey: bucketType === "event" ? bucketKey : null,
    eventBucketLabel: bucketType === "event" ? bucketLabel : null,
    eventSubcategoryKeys,
    personImageCount,
    sourceQueryScope,
  };
}

export function computePersonGalleryMediaViewAvailability(input: {
  photos: TrrPersonPhoto[];
  showIdForApi: string | null;
  activeShowName: string | null;
  activeShowAcronym: string | null;
  allKnownShowNameMatches: string[];
  allKnownShowAcronymMatches: ReadonlySet<string>;
  allKnownShowIds: string[];
  otherShowNameMatches: string[];
  otherShowAcronymMatches: ReadonlySet<string>;
}): {
  hasWwhlMatches: boolean;
  hasBravoconMatches: boolean;
  hasEventMatches: boolean;
  eventSubcategoryOptions: PersonGalleryEventSubcategoryOption[];
  eventOptions: PersonGalleryEventOption[];
  hasOtherShowMatches: boolean;
  hasUnknownShowMatches: boolean;
  hasNonThisShowMatches: boolean;
} {
  let hasWwhlMatches = false;
  let hasBravoconMatches = false;
  let hasEventMatches = false;
  let hasOtherShowMatches = false;
  let hasUnknownShowMatches = false;
  const eventSubcategoryOptionsByKey = new Map<string, PersonGalleryEventSubcategoryOption>();
  const eventOptionsByKey = new Map<string, PersonGalleryEventOption>();

  for (const photo of input.photos) {
    const buckets = computePersonPhotoShowBuckets({
      photo,
      showIdForApi: input.showIdForApi,
      activeShowName: input.activeShowName,
      activeShowAcronym: input.activeShowAcronym,
      allKnownShowNameMatches: input.allKnownShowNameMatches,
      allKnownShowAcronymMatches: input.allKnownShowAcronymMatches,
      allKnownShowIds: input.allKnownShowIds,
      otherShowNameMatches: input.otherShowNameMatches,
      otherShowAcronymMatches: input.otherShowAcronymMatches,
      selectedOtherShow: null,
    });
    if (buckets.matchesWwhl) hasWwhlMatches = true;
    if (buckets.matchesBravocon) hasBravoconMatches = true;
    if (buckets.matchesEvents) hasEventMatches = true;
    if (buckets.matchesEvents && buckets.eventBucketKey && buckets.eventBucketLabel) {
      for (const subcategoryKey of buckets.eventSubcategoryKeys) {
        const normalizedKey = subcategoryKey.trim();
        if (!normalizedKey || normalizedKey === "other_shows" || normalizedKey === "unsorted") continue;
        eventSubcategoryOptionsByKey.set(normalizedKey, {
          key: normalizedKey,
          label: EVENT_SUBCATEGORY_LABEL_BY_KEY[normalizedKey] ?? normalizedKey,
        });
      }
      const metadata = (photo.metadata ?? {}) as Record<string, unknown>;
      const rawCount = readGroupedImageCount(photo, metadata);
      const nextCount = Number.isFinite(rawCount) ? Math.max(0, Number(rawCount)) : null;
      const existing = eventOptionsByKey.get(buckets.eventBucketKey);
      eventOptionsByKey.set(buckets.eventBucketKey, {
        key: buckets.eventBucketKey,
        label: buckets.eventBucketLabel,
        count:
          nextCount !== null
            ? Math.max(existing?.count ?? 0, nextCount)
            : existing?.count ?? null,
      });
    }
    if (buckets.matchesOtherShows) hasOtherShowMatches = true;
    if (buckets.matchesUnknownShows) hasUnknownShowMatches = true;
  }

  return {
    hasWwhlMatches,
    hasBravoconMatches,
    hasEventMatches,
    eventSubcategoryOptions: Array.from(eventSubcategoryOptionsByKey.values()).sort((left, right) =>
      left.label.localeCompare(right.label)
    ),
    eventOptions: Array.from(eventOptionsByKey.values()).sort((left, right) =>
      left.label.localeCompare(right.label)
    ),
    hasOtherShowMatches,
    hasUnknownShowMatches,
    hasNonThisShowMatches:
      hasWwhlMatches || hasBravoconMatches || hasEventMatches || hasOtherShowMatches || hasUnknownShowMatches,
  };
}

export function resolveGalleryShowFilterFallback(input: {
  currentFilter: GalleryShowFilter;
  showContextEnabled: boolean;
  hasWwhlMatches: boolean;
  hasBravoconMatches: boolean;
  hasEventMatches: boolean;
  hasOtherShowMatches: boolean;
  hasUnknownShowMatches: boolean;
  hasSelectedOtherShowMatches: boolean;
  hasNonThisShowMatches: boolean;
  canSelectWwhlWithoutMatches?: boolean;
  canSelectOtherShowWithoutMatches?: boolean;
}): GalleryShowFilter {
  const fallback: GalleryShowFilter = input.showContextEnabled ? "this-show" : "all";
  const allowStickyWwhl = input.canSelectWwhlWithoutMatches === true;
  const allowStickyOtherShow = input.canSelectOtherShowWithoutMatches === true;

  if (input.currentFilter === "wwhl" && !input.hasWwhlMatches && !allowStickyWwhl) return fallback;
  if (input.currentFilter === "bravocon" && !input.hasBravoconMatches) return fallback;
  if (input.currentFilter === "events" && !input.hasEventMatches) return fallback;
  if (input.currentFilter === "other-shows" && !input.hasOtherShowMatches && !allowStickyOtherShow) {
    return fallback;
  }
  if (input.currentFilter === "other-shows" && !input.hasSelectedOtherShowMatches && !allowStickyOtherShow) {
    return fallback;
  }
  if (input.currentFilter === "unsorted" && !input.hasUnknownShowMatches) return fallback;
  if (input.currentFilter === "all" && !input.hasNonThisShowMatches) return fallback;
  return input.currentFilter;
}

export function getPersonEventImageCount(
  photo: TrrPersonPhoto,
  metadata?: Record<string, unknown> | null
): number | null {
  const meta = metadata ?? (photo.metadata as Record<string, unknown> | null) ?? {};
  const personCount = readPersonImageCount(photo, meta);
  if (personCount !== null && personCount > 0) return personCount;
  return readGroupedImageCount(photo, meta);
}
