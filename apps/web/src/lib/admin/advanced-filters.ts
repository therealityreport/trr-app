"use client";

export type TextOverlayFilter = "text" | "no_text";
export type PeopleGroupFilter = "solo" | "group";
export type SeededFilter = "seeded" | "not_seeded";

export type ContentTypeFilter =
  | "confessional"
  | "reunion"
  | "promo"
  | "profile_picture"
  | "episode_still"
  | "intro"
  | "wwhl"
  | "other";

export type AdvancedFilterState = {
  text: TextOverlayFilter[];
  sources: string[];
  people: PeopleGroupFilter[];
  contentTypes: ContentTypeFilter[];
  seeded: SeededFilter[];
  sort: string;
};

export const DEFAULT_ADVANCED_FILTERS: AdvancedFilterState = {
  text: [],
  sources: [],
  people: [],
  contentTypes: [],
  seeded: [],
  sort: "newest",
};

const parseList = (raw: string | null): string[] => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const uniq = <T,>(items: T[]): T[] => Array.from(new Set(items));

export function readAdvancedFilters(
  searchParams: URLSearchParams,
  overrides?: Partial<AdvancedFilterState>
): AdvancedFilterState {
  const base = { ...DEFAULT_ADVANCED_FILTERS, ...(overrides ?? {}) };
  return {
    text: uniq(parseList(searchParams.get("af_text")) as TextOverlayFilter[]),
    sources: uniq(parseList(searchParams.get("af_sources"))),
    people: uniq(parseList(searchParams.get("af_people")) as PeopleGroupFilter[]),
    contentTypes: uniq(parseList(searchParams.get("af_content")) as ContentTypeFilter[]),
    seeded: uniq(parseList(searchParams.get("af_seeded")) as SeededFilter[]),
    sort: searchParams.get("af_sort") ?? base.sort,
  };
}

export function writeAdvancedFilters(
  searchParams: URLSearchParams,
  next: AdvancedFilterState,
  defaults?: Partial<AdvancedFilterState>
): URLSearchParams {
  const base = { ...DEFAULT_ADVANCED_FILTERS, ...(defaults ?? {}) };
  const out = new URLSearchParams(searchParams.toString());

  const setList = (key: string, items: string[]) => {
    const cleaned = uniq(items.map((s) => s.trim()).filter(Boolean));
    if (cleaned.length === 0) out.delete(key);
    else out.set(key, cleaned.join(","));
  };

  setList("af_text", next.text);
  setList("af_sources", next.sources);
  setList("af_people", next.people);
  setList("af_content", next.contentTypes);
  setList("af_seeded", next.seeded);

  if (!next.sort || next.sort === base.sort) out.delete("af_sort");
  else out.set("af_sort", next.sort);

  return out;
}

export function toggleInList<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function clearAdvancedFilters(
  defaults?: Partial<AdvancedFilterState>
): AdvancedFilterState {
  const base = { ...DEFAULT_ADVANCED_FILTERS, ...(defaults ?? {}) };
  return {
    text: [],
    sources: [],
    people: [],
    contentTypes: [],
    seeded: [],
    sort: base.sort,
  };
}

export function countActiveAdvancedFilters(
  filters: AdvancedFilterState,
  defaults?: Partial<AdvancedFilterState>
): number {
  const base = { ...DEFAULT_ADVANCED_FILTERS, ...(defaults ?? {}) };
  let count = 0;
  if (filters.text.length > 0) count += 1;
  if (filters.sources.length > 0) count += 1;
  if (filters.people.length > 0) count += 1;
  if (filters.contentTypes.length > 0) count += 1;
  if (filters.seeded.length > 0) count += 1;
  if (filters.sort && filters.sort !== base.sort) count += 1;
  return count;
}
