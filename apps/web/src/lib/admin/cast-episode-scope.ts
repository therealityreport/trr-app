export interface ResolveShowCastEpisodeCountInput {
  castTotalEpisodes: number | null;
  scopedTotalEpisodes: number | null;
  hasSeasonFilters: boolean;
}

export const resolveShowCastEpisodeCount = (
  input: ResolveShowCastEpisodeCountInput
): number | null => {
  const { castTotalEpisodes, scopedTotalEpisodes, hasSeasonFilters } = input;
  if (hasSeasonFilters) {
    return typeof scopedTotalEpisodes === "number" ? scopedTotalEpisodes : castTotalEpisodes;
  }
  return typeof castTotalEpisodes === "number" ? castTotalEpisodes : scopedTotalEpisodes;
};

export const showCastEpisodeScopeHint = (hasSeasonFilters: boolean): string =>
  hasSeasonFilters
    ? "Episode counts reflect selected seasons."
    : "Episode counts reflect all seasons.";
