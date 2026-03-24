import { describe, expect, it } from "vitest";

import { ADMIN_ROUTE_FORWARDER_AUDIT, ADMIN_ROUTE_MATRIX_GROUPS } from "@/lib/admin/admin-route-audit";

describe("admin route audit matrix", () => {
  it("groups routes into admin-home, show tabs, and season tabs", () => {
    expect(ADMIN_ROUTE_MATRIX_GROUPS.map((group) => group.id)).toEqual([
      "admin-home",
      "show-tabs",
      "season-tabs",
    ]);
  });

  it("includes every show tab with shallow-to-deep ladders", () => {
    const showGroup = ADMIN_ROUTE_MATRIX_GROUPS.find((group) => group.id === "show-tabs");
    expect(showGroup?.entries.map((entry) => entry.label)).toEqual([
      "Home",
      "Seasons",
      "Assets",
      "News",
      "Cast",
      "Surveys",
      "Social",
      "Settings",
    ]);

    const assetsEntry = showGroup?.entries.find((entry) => entry.label === "Assets");
    expect(assetsEntry?.canonicalPathSteps).toEqual([
      "/[show]",
      "/[show]/assets",
      "/[show]/assets/[subtab]",
    ]);

    const socialEntry = showGroup?.entries.find((entry) => entry.label === "Social");
    expect(socialEntry?.canonicalPathSteps).toContain("/[show]/social/[s#]/[w#]/[platform]");
    expect(socialEntry?.variantPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/[show]/[s#]/social",
          status: "wrong_order",
        }),
      ]),
    );
  });

  it("includes every season tab with root-scoped season ladders", () => {
    const seasonGroup = ADMIN_ROUTE_MATRIX_GROUPS.find((group) => group.id === "season-tabs");
    expect(seasonGroup?.entries.map((entry) => entry.label)).toEqual([
      "Home",
      "Episodes",
      "Assets",
      "News",
      "Fandom",
      "Cast",
      "Surveys",
      "Social Media",
    ]);

    const episodesEntry = seasonGroup?.entries.find((entry) => entry.label === "Episodes");
    expect(episodesEntry?.canonicalPathSteps).toEqual(["/[show]/s#", "/[show]/s#/e#"]);

    const socialEntry = seasonGroup?.entries.find((entry) => entry.label === "Social Media");
    expect(socialEntry?.canonicalPathSteps).toContain("/[show]/s#/social/[w#]/[platform]");
    expect(socialEntry?.variantPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/[show]/social/[s#]",
          status: "wrong_order",
        }),
      ]),
    );
  });

  it("keeps legacy forwarders documented as a secondary audit layer", () => {
    expect(ADMIN_ROUTE_FORWARDER_AUDIT).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: "/admin/[show]",
          idealTarget: "/[show]",
        }),
        expect.objectContaining({
          sourcePath: "/admin/social-media",
          idealTarget: "/admin/social",
        }),
      ]),
    );
  });
});
