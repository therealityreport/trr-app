import { describe, expect, it } from "vitest";

import {
  resolveShowCastEpisodeCount,
  showCastEpisodeScopeHint,
} from "@/lib/admin/cast-episode-scope";

describe("resolveShowCastEpisodeCount", () => {
  it("prefers all-season count when no season filters are selected", () => {
    expect(
      resolveShowCastEpisodeCount({
        castTotalEpisodes: 84,
        scopedTotalEpisodes: 12,
        hasSeasonFilters: false,
      })
    ).toBe(84);
  });

  it("uses the larger count when both values exist without season filters", () => {
    expect(
      resolveShowCastEpisodeCount({
        castTotalEpisodes: 16,
        scopedTotalEpisodes: 84,
        hasSeasonFilters: false,
      })
    ).toBe(84);
  });
  it("uses season-scoped count when season filters are selected", () => {
    expect(
      resolveShowCastEpisodeCount({
        castTotalEpisodes: 84,
        scopedTotalEpisodes: 12,
        hasSeasonFilters: true,
      })
    ).toBe(12);
  });

  it("falls back to cast totals when scoped totals are missing", () => {
    expect(
      resolveShowCastEpisodeCount({
        castTotalEpisodes: 84,
        scopedTotalEpisodes: null,
        hasSeasonFilters: true,
      })
    ).toBe(84);
  });
});

describe("showCastEpisodeScopeHint", () => {
  it("returns all-seasons hint when season filters are not selected", () => {
    expect(showCastEpisodeScopeHint(false)).toContain("all seasons");
  });

  it("returns scoped hint when season filters are selected", () => {
    expect(showCastEpisodeScopeHint(true)).toContain("selected seasons");
  });
});
