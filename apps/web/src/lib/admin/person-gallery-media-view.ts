import type { TrrPersonPhoto } from "@/lib/server/trr-api/trr-shows-repository";

export type GalleryShowFilter = "all" | "this-show" | "wwhl" | "events" | "other-shows" | "other";

export type PersonGalleryOtherShowOption = {
  key: string;
  showId: string | null;
  showName: string;
  acronym: string | null;
};

export const WWHL_LABEL = "WWHL";
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

export function buildShowAcronym(name: string | null | undefined): string | null {
  if (!name) return null;
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
  matchesEvents: boolean;
  matchesOtherShows: boolean;
  matchesSelectedOtherShow: boolean;
  matchesUnknownShows: boolean;
};

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
    isWwhlShowName(text) ||
    isWwhlShowName(metadataShowNameRaw) ||
    directWwhlMetadataSignal ||
    acronyms.has(WWHL_LABEL);
  const rawImdbImageType =
    typeof metadata.imdb_image_type === "string" ? metadata.imdb_image_type.trim().toLowerCase() : null;
  const rawContentType =
    typeof metadata.content_type === "string" ? metadata.content_type.trim().toLowerCase() : null;
  const rawSectionTag =
    typeof metadata.fandom_section_tag === "string" ? metadata.fandom_section_tag.trim().toLowerCase() : null;
  const rawContextType = typeof photo.context_type === "string" ? photo.context_type.trim().toLowerCase() : null;
  const matchesEvents = Boolean(
    (rawImdbImageType && EVENT_IMAGE_TYPES.has(rawImdbImageType)) ||
      rawContentType === "event" ||
      rawSectionTag === "event" ||
      rawContextType === "event"
  );
  const ignoreMetaShowIdForImdb = sourceNormalized === "imdb" && !trustImdbMetadata;
  const metaShowId = ignoreMetaShowIdForImdb || !trustImdbMetadata ? null : rawMetaShowId;
  const metaShowIdMatches = Boolean(showIdForApi && metaShowId && metaShowId === showIdForApi);
  const metadataMatchesThisShow =
    Boolean(metadataShowNameRaw) &&
    ((trustImdbMetadata && !ignoreMetaShowIdForImdb) || episodeEvidencedImdbFallback) &&
    normalizedShowNamesMatch(metadataShowNameRaw, activeShowName);
  const matchesThisShow =
    metaShowIdMatches ||
    matchesShowName ||
    matchesShowAcronym ||
    metadataMatchesThisShow;
  const matchesOtherShowName = input.otherShowNameMatches.some((name) =>
    normalizedTextIncludesShowName(textNormalized, name)
  );
  const matchesOtherShowAcronym = Array.from(acronyms).some((acro) =>
    input.otherShowAcronymMatches.has(acro)
  );
  const knownShowIds = new Set(input.allKnownShowIds);
  const matchesKnownShowById = Boolean(metaShowId && knownShowIds.has(metaShowId));
  const matchesKnownShowByName = input.allKnownShowNameMatches.some((name) =>
    normalizedTextIncludesShowName(textNormalized, name)
  );
  const matchesKnownShowByAcronym = Array.from(acronyms).some((acro) =>
    input.allKnownShowAcronymMatches.has(acro)
  );
  const metadataMatchesKnownShow =
    Boolean(metadataShowNameRaw) &&
    ((trustImdbMetadata && !ignoreMetaShowIdForImdb) || episodeEvidencedImdbFallback)
    ? input.allKnownShowNameMatches.some((name) => normalizedShowNamesMatch(metadataShowNameRaw, name))
    : false;
  const matchesAnyKnownShow =
    matchesKnownShowById ||
    matchesKnownShowByName ||
    matchesKnownShowByAcronym ||
    matchesOtherShowName ||
    matchesOtherShowAcronym ||
    matchesThisShow ||
    metadataMatchesKnownShow;

  const matchesOtherShows = matchesAnyKnownShow && !matchesThisShow && !matchesWwhl;
  const matchesUnknownShows = !matchesThisShow && !matchesWwhl && !matchesEvents && !matchesAnyKnownShow;

  let matchesSelectedOtherShow = false;
  if (input.selectedOtherShow) {
    const selectedOtherName = input.selectedOtherShow.showName;
    const selectedOtherAcronym = input.selectedOtherShow.acronym?.toUpperCase() ?? null;
    const matchesSelectedById = Boolean(
      input.selectedOtherShow.showId && metaShowId === input.selectedOtherShow.showId
    );
    const matchesSelectedByName =
      normalizedTextIncludesShowName(textNormalized, selectedOtherName) ||
      normalizedShowNamesMatch(metadataShowNameRaw, selectedOtherName);
    const matchesSelectedByAcronym = selectedOtherAcronym
      ? acronyms.has(selectedOtherAcronym) || metadataShowAcronym === selectedOtherAcronym
      : false;
    matchesSelectedOtherShow =
      matchesSelectedById || matchesSelectedByName || matchesSelectedByAcronym;
  }

  return {
    matchesThisShow,
    matchesWwhl,
    matchesEvents,
    matchesOtherShows,
    matchesSelectedOtherShow,
    matchesUnknownShows,
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
  hasEventMatches: boolean;
  hasOtherShowMatches: boolean;
  hasUnknownShowMatches: boolean;
  hasNonThisShowMatches: boolean;
} {
  let hasWwhlMatches = false;
  let hasEventMatches = false;
  let hasOtherShowMatches = false;
  let hasUnknownShowMatches = false;

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
    if (buckets.matchesEvents) hasEventMatches = true;
    if (buckets.matchesOtherShows) hasOtherShowMatches = true;
    if (buckets.matchesUnknownShows) hasUnknownShowMatches = true;
    if (hasWwhlMatches && hasEventMatches && hasOtherShowMatches && hasUnknownShowMatches) break;
  }

  return {
    hasWwhlMatches,
    hasEventMatches,
    hasOtherShowMatches,
    hasUnknownShowMatches,
    hasNonThisShowMatches: hasWwhlMatches || hasEventMatches || hasOtherShowMatches || hasUnknownShowMatches,
  };
}

export function resolveGalleryShowFilterFallback(input: {
  currentFilter: GalleryShowFilter;
  showContextEnabled: boolean;
  hasWwhlMatches: boolean;
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
  if (input.currentFilter === "events" && !input.hasEventMatches) return fallback;
  if (input.currentFilter === "other-shows" && !input.hasOtherShowMatches && !allowStickyOtherShow)
    return fallback;
  if (input.currentFilter === "other-shows" && !input.hasSelectedOtherShowMatches && !allowStickyOtherShow)
    return fallback;
  if (input.currentFilter === "other" && !input.hasUnknownShowMatches) return fallback;
  if (input.currentFilter === "all" && !input.hasNonThisShowMatches) return fallback;
  return input.currentFilter;
}
