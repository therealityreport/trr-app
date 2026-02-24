export type CastSortBy = "episodes" | "season" | "name";
export type CastSortOrder = "desc" | "asc";
export type CastHasImageFilter = "all" | "yes" | "no";

export interface ShowCastRouteState {
  searchQuery: string;
  sortBy: CastSortBy;
  sortOrder: CastSortOrder;
  hasImageFilter: CastHasImageFilter;
  seasonFilters: number[];
  filters: string[];
}

export interface SeasonCastRouteState {
  searchQuery: string;
  sortBy: CastSortBy;
  sortOrder: CastSortOrder;
  hasImageFilter: CastHasImageFilter;
  roleFilters: string[];
  creditFilters: string[];
}

const SHOW_CAST_DEFAULTS: ShowCastRouteState = {
  searchQuery: "",
  sortBy: "episodes",
  sortOrder: "desc",
  hasImageFilter: "all",
  seasonFilters: [],
  filters: [],
};

const SEASON_CAST_DEFAULTS: SeasonCastRouteState = {
  searchQuery: "",
  sortBy: "episodes",
  sortOrder: "desc",
  hasImageFilter: "all",
  roleFilters: [],
  creditFilters: [],
};

const parseCsv = (value: string | null): string[] => {
  if (!value) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const token of value.split(",")) {
    const trimmed = token.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
};

const parseNumberCsv = (value: string | null): number[] => {
  const values = parseCsv(value)
    .map((token) => Number.parseInt(token, 10))
    .filter((token) => Number.isFinite(token) && token > 0);
  return Array.from(new Set(values)).sort((a, b) => a - b);
};

const parseSortBy = (value: string | null): CastSortBy =>
  value === "name" || value === "season" || value === "episodes" ? value : "episodes";

const parseSortOrder = (value: string | null): CastSortOrder =>
  value === "asc" || value === "desc" ? value : "desc";

const parseHasImageFilter = (value: string | null): CastHasImageFilter =>
  value === "yes" || value === "no" || value === "all" ? value : "all";

const writeCsv = (values: string[]): string => values.join(",");

const setOrDelete = (searchParams: URLSearchParams, key: string, value: string | null): void => {
  if (!value || value.trim().length === 0) {
    searchParams.delete(key);
    return;
  }
  searchParams.set(key, value);
};

export const parseShowCastRouteState = (searchParams: URLSearchParams): ShowCastRouteState => {
  const canonicalFilters = parseCsv(searchParams.get("cast_filters"));
  const legacyFilters = parseCsv(searchParams.get("cast_roles"));
  return {
    searchQuery: searchParams.get("cast_q")?.trim() ?? SHOW_CAST_DEFAULTS.searchQuery,
    sortBy: parseSortBy(searchParams.get("cast_sort")),
    sortOrder: parseSortOrder(searchParams.get("cast_order")),
    hasImageFilter: parseHasImageFilter(searchParams.get("cast_img")),
    seasonFilters: parseNumberCsv(searchParams.get("cast_seasons")),
    filters: canonicalFilters.length > 0 ? canonicalFilters : legacyFilters,
  };
};

export const parseSeasonCastRouteState = (searchParams: URLSearchParams): SeasonCastRouteState => {
  const canonicalRoleFilters = parseCsv(searchParams.get("cast_role_filters"));
  const canonicalCreditFilters = parseCsv(searchParams.get("cast_credit_filters"));
  const legacyRoleFilters = parseCsv(searchParams.get("cast_roles"));
  const legacyCreditFilters = parseCsv(searchParams.get("cast_credits"));
  return {
    searchQuery: searchParams.get("cast_q")?.trim() ?? SEASON_CAST_DEFAULTS.searchQuery,
    sortBy: parseSortBy(searchParams.get("cast_sort")),
    sortOrder: parseSortOrder(searchParams.get("cast_order")),
    hasImageFilter: parseHasImageFilter(searchParams.get("cast_img")),
    roleFilters: canonicalRoleFilters.length > 0 ? canonicalRoleFilters : legacyRoleFilters,
    creditFilters: canonicalCreditFilters.length > 0 ? canonicalCreditFilters : legacyCreditFilters,
  };
};

export const writeShowCastRouteState = (
  searchParams: URLSearchParams,
  state: ShowCastRouteState
): URLSearchParams => {
  const next = new URLSearchParams(searchParams.toString());
  next.delete("cast_roles");
  setOrDelete(next, "cast_q", state.searchQuery.trim() || null);
  setOrDelete(next, "cast_sort", state.sortBy !== SHOW_CAST_DEFAULTS.sortBy ? state.sortBy : null);
  setOrDelete(next, "cast_order", state.sortOrder !== SHOW_CAST_DEFAULTS.sortOrder ? state.sortOrder : null);
  setOrDelete(
    next,
    "cast_img",
    state.hasImageFilter !== SHOW_CAST_DEFAULTS.hasImageFilter ? state.hasImageFilter : null
  );
  setOrDelete(
    next,
    "cast_seasons",
    state.seasonFilters.length > 0 ? writeCsv([...state.seasonFilters].sort((a, b) => a - b).map(String)) : null
  );
  setOrDelete(next, "cast_filters", state.filters.length > 0 ? writeCsv(state.filters) : null);
  return next;
};

export const writeSeasonCastRouteState = (
  searchParams: URLSearchParams,
  state: SeasonCastRouteState
): URLSearchParams => {
  const next = new URLSearchParams(searchParams.toString());
  next.delete("cast_roles");
  next.delete("cast_credits");
  setOrDelete(next, "cast_q", state.searchQuery.trim() || null);
  setOrDelete(next, "cast_sort", state.sortBy !== SEASON_CAST_DEFAULTS.sortBy ? state.sortBy : null);
  setOrDelete(next, "cast_order", state.sortOrder !== SEASON_CAST_DEFAULTS.sortOrder ? state.sortOrder : null);
  setOrDelete(
    next,
    "cast_img",
    state.hasImageFilter !== SEASON_CAST_DEFAULTS.hasImageFilter ? state.hasImageFilter : null
  );
  setOrDelete(
    next,
    "cast_role_filters",
    state.roleFilters.length > 0 ? writeCsv(state.roleFilters) : null
  );
  setOrDelete(
    next,
    "cast_credit_filters",
    state.creditFilters.length > 0 ? writeCsv(state.creditFilters) : null
  );
  return next;
};
