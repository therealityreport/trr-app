import type { TrrPersonPhoto } from "@/lib/server/trr-api/trr-shows-repository";

export type GalleryShowFilter = "all" | "this-show" | "wwhl" | "other-shows";

export type PersonGalleryOtherShowOption = {
  key: string;
  showId: string | null;
  showName: string;
  acronym: string | null;
};

export const WWHL_LABEL = "WWHL";

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
  return /\bin\s+.+\(\d{4}\)\s*$/i.test(text);
}

export type PersonPhotoShowBuckets = {
  matchesThisShow: boolean;
  matchesWwhl: boolean;
  matchesOtherShows: boolean;
  matchesSelectedOtherShow: boolean;
};

export function computePersonPhotoShowBuckets(input: {
  photo: TrrPersonPhoto;
  showIdForApi: string | null;
  activeShowName: string | null;
  activeShowAcronym: string | null;
  otherShowNameMatches: string[];
  otherShowAcronymMatches: ReadonlySet<string>;
  selectedOtherShow: Pick<PersonGalleryOtherShowOption, "showId" | "showName" | "acronym"> | null;
}): PersonPhotoShowBuckets {
  const { photo, showIdForApi, activeShowName, activeShowAcronym } = input;
  const metadata = (photo.metadata ?? {}) as Record<string, unknown>;
  const metaShowId = typeof metadata.show_id === "string" ? metadata.show_id : null;
  const metaShowIdMatches = Boolean(showIdForApi && metaShowId && metaShowId === showIdForApi);
  const showNameLower = activeShowName?.toLowerCase?.() ?? null;
  const showAcronym = activeShowAcronym?.toUpperCase?.() ?? null;

  const text = [
    photo.caption,
    photo.context_section,
    photo.context_type,
    typeof metadata.fandom_section_label === "string" ? metadata.fandom_section_label : null,
    ...(photo.title_names ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  const textLower = text.toLowerCase();
  const acronyms = extractShowAcronyms(text);
  const matchesShowName = showNameLower ? textLower.includes(showNameLower) : false;
  const matchesShowAcronym = showAcronym ? acronyms.has(showAcronym) : false;
  const metadataShowNameRaw = typeof metadata.show_name === "string" ? metadata.show_name : null;
  const metadataShowName = metadataShowNameRaw?.toLowerCase() ?? null;
  const metadataShowAcronym = buildShowAcronym(metadataShowNameRaw)?.toUpperCase() ?? null;
  const matchesWwhl =
    isWwhlShowName(text) || isWwhlShowName(metadataShowNameRaw) || acronyms.has(WWHL_LABEL);
  const metadataMatchesThisShow = Boolean(
    metadataShowName && showNameLower && metadataShowName.includes(showNameLower)
  );
  const metadataMatchesOtherShow = Boolean(
    metadataShowName &&
      showNameLower &&
      !metadataShowName.includes(showNameLower) &&
      !isWwhlShowName(metadataShowNameRaw)
  );
  const matchesOtherShowName = input.otherShowNameMatches.some((name) =>
    textLower.includes(name.toLowerCase())
  );
  const matchesOtherShowAcronym = Array.from(acronyms).some((acro) =>
    input.otherShowAcronymMatches.has(acro)
  );
  const isImdbSource = (photo.source ?? "").toLowerCase() === "imdb";
  const imdbEpisodeTitleFallbackForThisShow =
    isImdbSource &&
    !metaShowId &&
    !matchesWwhl &&
    !matchesOtherShowName &&
    !matchesOtherShowAcronym &&
    !metadataMatchesOtherShow &&
    isLikelyImdbEpisodeCaption(photo.caption);

  const matchesThisShow =
    metaShowIdMatches ||
    matchesShowName ||
    matchesShowAcronym ||
    metadataMatchesThisShow ||
    imdbEpisodeTitleFallbackForThisShow;

  const matchesOtherShows =
    ((!metaShowIdMatches && Boolean(metaShowId)) && !matchesWwhl) ||
    matchesOtherShowName ||
    matchesOtherShowAcronym ||
    metadataMatchesOtherShow;

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
  };
}

export function computePersonGalleryMediaViewAvailability(input: {
  photos: TrrPersonPhoto[];
  showIdForApi: string | null;
  activeShowName: string | null;
  activeShowAcronym: string | null;
  otherShowNameMatches: string[];
  otherShowAcronymMatches: ReadonlySet<string>;
}): {
  hasWwhlMatches: boolean;
  hasOtherShowMatches: boolean;
  hasNonThisShowMatches: boolean;
} {
  let hasWwhlMatches = false;
  let hasOtherShowMatches = false;

  for (const photo of input.photos) {
    const buckets = computePersonPhotoShowBuckets({
      photo,
      showIdForApi: input.showIdForApi,
      activeShowName: input.activeShowName,
      activeShowAcronym: input.activeShowAcronym,
      otherShowNameMatches: input.otherShowNameMatches,
      otherShowAcronymMatches: input.otherShowAcronymMatches,
      selectedOtherShow: null,
    });
    if (buckets.matchesWwhl) hasWwhlMatches = true;
    if (buckets.matchesOtherShows) hasOtherShowMatches = true;
    if (hasWwhlMatches && hasOtherShowMatches) break;
  }

  return {
    hasWwhlMatches,
    hasOtherShowMatches,
    hasNonThisShowMatches: hasWwhlMatches || hasOtherShowMatches,
  };
}

export function resolveGalleryShowFilterFallback(input: {
  currentFilter: GalleryShowFilter;
  showContextEnabled: boolean;
  hasWwhlMatches: boolean;
  hasOtherShowMatches: boolean;
  hasNonThisShowMatches: boolean;
}): GalleryShowFilter {
  const fallback: GalleryShowFilter = input.showContextEnabled ? "this-show" : "all";
  if (input.currentFilter === "wwhl" && !input.hasWwhlMatches) return fallback;
  if (input.currentFilter === "other-shows" && !input.hasOtherShowMatches) return fallback;
  if (input.currentFilter === "all" && !input.hasNonThisShowMatches) return fallback;
  return input.currentFilter;
}
