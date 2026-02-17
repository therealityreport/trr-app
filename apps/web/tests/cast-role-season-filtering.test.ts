import { describe, expect, it } from "vitest";

import { shouldIncludeCastMemberForSeasonFilter } from "@/lib/admin/cast-role-filtering";

describe("shouldIncludeCastMemberForSeasonFilter", () => {
  it("returns true when no season filters are active", () => {
    expect(
      shouldIncludeCastMemberForSeasonFilter({
        castSeasonFilters: [],
        hasScopedRoleOrSeasonMatch: false,
        latestSeason: null,
        scopedFilteringReady: false,
      })
    ).toBe(true);
  });

  it("keeps member when scoped filter is ready and scoped/global role match exists", () => {
    expect(
      shouldIncludeCastMemberForSeasonFilter({
        castSeasonFilters: [3],
        hasScopedRoleOrSeasonMatch: true,
        latestSeason: 1,
        scopedFilteringReady: true,
      })
    ).toBe(true);
  });

  it("excludes member when scoped filter is ready and no scoped/global role match exists", () => {
    expect(
      shouldIncludeCastMemberForSeasonFilter({
        castSeasonFilters: [3],
        hasScopedRoleOrSeasonMatch: false,
        latestSeason: 1,
        scopedFilteringReady: true,
      })
    ).toBe(false);
  });

  it("falls back to latest season match before scoped rows are ready", () => {
    expect(
      shouldIncludeCastMemberForSeasonFilter({
        castSeasonFilters: [2],
        hasScopedRoleOrSeasonMatch: false,
        latestSeason: 2,
        scopedFilteringReady: false,
      })
    ).toBe(true);
  });
});
