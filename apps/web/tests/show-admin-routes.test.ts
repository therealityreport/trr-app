import { describe, expect, it } from "vitest";

import {
  buildSeasonAdminUrl,
  buildShowAdminUrl,
  cleanLegacyRoutingQuery,
  parseSeasonRouteState,
  parseShowRouteState,
} from "@/lib/admin/show-admin-routes";

describe("show-admin-routes", () => {
  it("parses show path tabs and assets sub-tabs", () => {
    expect(parseShowRouteState("/admin/trr-shows/the-real-housewives-of-salt-lake-city", new URLSearchParams()))
      .toMatchObject({ tab: "details", assetsSubTab: "images", source: "default" });

    expect(
      parseShowRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/assets/videos",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "assets", assetsSubTab: "videos", source: "path" });
  });

  it("falls back to legacy show query params", () => {
    expect(
      parseShowRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city",
        new URLSearchParams("tab=gallery")
      )
    ).toMatchObject({ tab: "assets", assetsSubTab: "images", source: "query" });
  });

  it("builds canonical show URLs", () => {
    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
      })
    ).toBe("/admin/trr-shows/the-real-housewives-of-salt-lake-city");

    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        tab: "social",
      })
    ).toBe("/admin/trr-shows/the-real-housewives-of-salt-lake-city/social");

    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        tab: "assets",
        assetsSubTab: "brand",
      })
    ).toBe("/admin/trr-shows/the-real-housewives-of-salt-lake-city/assets/brand");
  });

  it("parses season path tabs and query fallback", () => {
    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "episodes", assetsSubTab: "media", source: "path" });

    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4/assets/brand",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "assets", assetsSubTab: "brand", source: "path" });

    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4",
        new URLSearchParams("tab=media")
      )
    ).toMatchObject({ tab: "assets", assetsSubTab: "media", source: "query" });
  });

  it("builds canonical season URLs", () => {
    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
      })
    ).toBe("/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "cast",
      })
    ).toBe("/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4/cast");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "assets",
        assetsSubTab: "brand",
      })
    ).toBe("/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4/assets/brand");
  });

  it("removes legacy tab query keys and preserves unrelated params", () => {
    const cleaned = cleanLegacyRoutingQuery(
      new URLSearchParams("tab=social&assets=brand&source_scope=bravo&platform=youtube")
    );

    expect(cleaned.toString()).toBe("source_scope=bravo&platform=youtube");
  });
});
