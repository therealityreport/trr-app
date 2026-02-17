export const shouldIncludeCastMemberForSeasonFilter = ({
  castSeasonFilters,
  hasScopedRoleOrSeasonMatch,
  latestSeason,
  scopedFilteringReady,
}: {
  castSeasonFilters: number[];
  hasScopedRoleOrSeasonMatch: boolean;
  latestSeason: number | null | undefined;
  scopedFilteringReady: boolean;
}): boolean => {
  if (castSeasonFilters.length === 0) return true;

  // Once scoped role rows are loaded, trust the backend scoping which includes
  // selected seasons plus global season-0 roles.
  if (scopedFilteringReady) {
    return hasScopedRoleOrSeasonMatch;
  }

  if (typeof latestSeason === "number" && Number.isFinite(latestSeason)) {
    return castSeasonFilters.includes(latestSeason);
  }

  return false;
};
