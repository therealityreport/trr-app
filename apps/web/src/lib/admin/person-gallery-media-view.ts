import type { TrrPersonPhoto } from "@/lib/server/trr-api/trr-shows-repository";

export type GalleryShowFilter = "all" | "this-show" | "wwhl" | "other-shows" | "other";

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

export type PersonPhotoShowBuckets = {
  matchesThisShow: boolean;
  matchesWwhl: boolean;
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
  const metadataShowContextSource =
    typeof metadata.show_context_source === "string"
      ? metadata.show_context_source.trim().toLowerCase()
      : null;
  const showNameLower = activeShowName?.toLowerCase?.() ?? null;
  const showAcronym = activeShowAcronym?.toUpperCase?.() ?? null;
  const sourceNormalized = (photo.source ?? "").trim().toLowerCase();
  const trustImdbMetadata =
    sourceNormalized !== "imdb" ||
    (metadataShowContextSource !== null &&
      TRUSTED_IMDB_SHOW_CONTEXT_SOURCES.has(metadataShowContextSource));

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
  const textLower = text.toLowerCase();
  const acronyms = extractShowAcronyms(text);
  const matchesShowName = showNameLower ? textLower.includes(showNameLower) : false;
  const matchesShowAcronym = showAcronym ? acronyms.has(showAcronym) : false;
  const metadataShowNameRaw =
    trustImdbMetadata && typeof metadata.show_name === "string" ? metadata.show_name : null;
  const metadataShowName = metadataShowNameRaw?.toLowerCase() ?? null;
  const metadataShowAcronym = buildShowAcronym(metadataShowNameRaw)?.toUpperCase() ?? null;
  const matchesWwhl =
    isWwhlShowName(text) || isWwhlShowName(metadataShowNameRaw) || acronyms.has(WWHL_LABEL);
  const ignoreMetaShowIdForImdb = sourceNormalized === "imdb" && !trustImdbMetadata;
  const metaShowId = ignoreMetaShowIdForImdb || !trustImdbMetadata ? null : rawMetaShowId;
  const metaShowIdMatches = Boolean(showIdForApi && metaShowId && metaShowId === showIdForApi);
  const metadataMatchesThisShow =
    trustImdbMetadata &&
    !ignoreMetaShowIdForImdb &&
    Boolean(metadataShowName && showNameLower && metadataShowName.includes(showNameLower));
  const matchesThisShow =
    metaShowIdMatches ||
    matchesShowName ||
    matchesShowAcronym ||
    metadataMatchesThisShow;
  const matchesOtherShowName = input.otherShowNameMatches.some((name) =>
    textLower.includes(name.toLowerCase())
  );
  const matchesOtherShowAcronym = Array.from(acronyms).some((acro) =>
    input.otherShowAcronymMatches.has(acro)
  );
  const knownShowIds = new Set(input.allKnownShowIds);
  const matchesKnownShowById = Boolean(metaShowId && knownShowIds.has(metaShowId));
  const matchesKnownShowByName = input.allKnownShowNameMatches.some((name) =>
    textLower.includes(name.toLowerCase())
  );
  const matchesKnownShowByAcronym = Array.from(acronyms).some((acro) =>
    input.allKnownShowAcronymMatches.has(acro)
  );
  const metadataMatchesKnownShow =
    trustImdbMetadata &&
    !ignoreMetaShowIdForImdb &&
    metadataShowName
    ? input.allKnownShowNameMatches.some((name) => metadataShowName.includes(name.toLowerCase()))
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
  const matchesUnknownShows = !matchesThisShow && !matchesWwhl && !matchesAnyKnownShow;

  let matchesSelectedOtherShow = false;
  if (input.selectedOtherShow) {
    const selectedOtherName = input.selectedOtherShow.showName.toLowerCase();
    const selectedOtherAcronym = input.selectedOtherShow.acronym?.toUpperCase() ?? null;
    const matchesSelectedById = Boolean(
      input.selectedOtherShow.showId && metaShowId === input.selectedOtherShow.showId
    );
    const matchesSelectedByName =
      textLower.includes(selectedOtherName) ||
      Boolean(metadataShowName?.includes(selectedOtherName));
    const matchesSelectedByAcronym = selectedOtherAcronym
      ? acronyms.has(selectedOtherAcronym) || metadataShowAcronym === selectedOtherAcronym
      : false;
    matchesSelectedOtherShow =
      matchesSelectedById || matchesSelectedByName || matchesSelectedByAcronym;
  }

  return {
    matchesThisShow,
    matchesWwhl,
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
  hasOtherShowMatches: boolean;
  hasUnknownShowMatches: boolean;
  hasNonThisShowMatches: boolean;
} {
  let hasWwhlMatches = false;
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
    if (buckets.matchesOtherShows) hasOtherShowMatches = true;
    if (buckets.matchesUnknownShows) hasUnknownShowMatches = true;
    if (hasWwhlMatches && hasOtherShowMatches && hasUnknownShowMatches) break;
  }

  return {
    hasWwhlMatches,
    hasOtherShowMatches,
    hasUnknownShowMatches,
    hasNonThisShowMatches: hasWwhlMatches || hasOtherShowMatches || hasUnknownShowMatches,
  };
}

export function resolveGalleryShowFilterFallback(input: {
  currentFilter: GalleryShowFilter;
  showContextEnabled: boolean;
  hasWwhlMatches: boolean;
  hasOtherShowMatches: boolean;
  hasUnknownShowMatches: boolean;
  hasSelectedOtherShowMatches: boolean;
  hasNonThisShowMatches: boolean;
}): GalleryShowFilter {
  const fallback: GalleryShowFilter = input.showContextEnabled ? "this-show" : "all";
  if (input.currentFilter === "wwhl" && !input.hasWwhlMatches) return fallback;
  if (input.currentFilter === "other-shows" && !input.hasOtherShowMatches) return fallback;
  if (input.currentFilter === "other-shows" && !input.hasSelectedOtherShowMatches) return fallback;
  if (input.currentFilter === "other" && !input.hasUnknownShowMatches) return fallback;
  if (input.currentFilter === "all" && !input.hasNonThisShowMatches) return fallback;
  return input.currentFilter;
}
