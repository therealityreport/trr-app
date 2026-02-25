import { describe, expect, it } from "vitest";

import {
  buildPersonAdminUrl,
  buildPersonRouteSlug,
  buildSeasonAdminUrl,
  buildSeasonSocialWeekUrl,
  buildShowAdminUrl,
  cleanLegacyPersonRoutingQuery,
  cleanLegacyRoutingQuery,
  parseSocialAnalyticsViewFromPath,
  parsePersonRouteState,
  parseSeasonRouteState,
  parseShowRouteState,
  toPersonSlug,
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
    ).toBe("/shows/the-real-housewives-of-salt-lake-city");

    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        tab: "social",
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/social/bravo");

    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        tab: "assets",
        assetsSubTab: "brand",
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/media?assets=brand");

    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        tab: "assets",
        assetsSubTab: "videos",
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/media?assets=videos");

    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        tab: "assets",
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/media");

    expect(
      buildShowAdminUrl({
        showSlug: "rhoslc",
        tab: "cast",
      })
    ).toBe("/shows/rhoslc/cast");
  });

  it("parses season path tabs and query fallback", () => {
    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "overview", assetsSubTab: "media", source: "path" });

    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4/assets/brand",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "assets", assetsSubTab: "brand", source: "path" });

    expect(
      parseSeasonRouteState(
        "/shows/the-real-housewives-of-salt-lake-city/s4/social/reddit",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "social", assetsSubTab: "media", source: "path" });

    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4",
        new URLSearchParams("tab=media")
      )
    ).toMatchObject({ tab: "assets", assetsSubTab: "media", source: "query" });

    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4",
        new URLSearchParams("tab=fandom")
      )
    ).toMatchObject({ tab: "fandom", assetsSubTab: "media", source: "query" });

    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4",
        new URLSearchParams("tab=details")
      )
    ).toMatchObject({ tab: "overview", assetsSubTab: "media", source: "query" });
  });

  it("builds canonical season URLs", () => {
    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/s4");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "overview",
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/s4");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "episodes",
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/s4/episodes");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "cast",
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/s4/cast");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "assets",
        assetsSubTab: "brand",
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/s4/media?assets=brand");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "assets",
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/s4/media");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "fandom",
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/s4/fandom");

    expect(
      buildSeasonAdminUrl({
        showSlug: "rhoslc",
        seasonNumber: 6,
        tab: "cast",
      })
    ).toBe("/shows/rhoslc/s6/cast");

    expect(
      buildSeasonAdminUrl({
        showSlug: "rhoslc",
        seasonNumber: 6,
        tab: "social",
        socialView: "hashtags",
      })
    ).toBe("/shows/rhoslc/s6/social/hashtags");
  });

  it("builds canonical season social week URLs", () => {
    expect(
      buildSeasonSocialWeekUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        weekIndex: 3,
      })
    ).toBe("/shows/the-real-housewives-of-salt-lake-city/s4/social/week/3");

    expect(
      buildSeasonSocialWeekUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        weekIndex: 3,
        query: new URLSearchParams("source_scope=bravo&platform=youtube"),
      })
    ).toBe(
      "/shows/the-real-housewives-of-salt-lake-city/s4/social/week/3?source_scope=bravo&platform=youtube"
    );
  });

  it("parses social analytics view from canonical show and season paths", () => {
    expect(parseSocialAnalyticsViewFromPath("/shows/rhoslc/social/bravo")).toBe("bravo");
    expect(parseSocialAnalyticsViewFromPath("/shows/rhoslc/s6/social/reddit")).toBe("reddit");
    expect(parseSocialAnalyticsViewFromPath("/shows/rhoslc/s6/cast")).toBeNull();
  });

  it("removes legacy tab query keys and preserves unrelated params", () => {
    const cleaned = cleanLegacyRoutingQuery(
      new URLSearchParams(
        "tab=social&assets=brand&source_scope=bravo&scope=creator&social_view=advanced&social_platform=reddit&platform=youtube",
      ),
    );

    expect(cleaned.toString()).toBe(
      "source_scope=bravo&social_view=advanced&social_platform=reddit&platform=youtube",
    );
  });

  it("parses person path tabs and legacy query fallback", () => {
    expect(
      parsePersonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/people/meredith-marks/overview",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "overview", source: "path" });

    expect(
      parsePersonRouteState(
        "/admin/trr-shows/people/7f528757-5017-4599-8252-c02f0d0736cf",
        new URLSearchParams("tab=fandom")
      )
    ).toMatchObject({ tab: "fandom", source: "query" });
  });

  it("builds canonical person URLs", () => {
    expect(
      buildPersonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        personSlug: "meredith-marks--7f528757",
      })
    ).toBe(
      "/admin/trr-shows/the-real-housewives-of-salt-lake-city/people/meredith-marks--7f528757/overview"
    );

    expect(
      buildPersonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        personSlug: "meredith-marks--7f528757",
        tab: "gallery",
      })
    ).toBe(
      "/admin/trr-shows/the-real-housewives-of-salt-lake-city/people/meredith-marks--7f528757/gallery"
    );
  });

  it("slugifies people names and appends person id prefix", () => {
    expect(toPersonSlug("Meredith Marks")).toBe("meredith-marks");
    expect(toPersonSlug("Jax & Brittany")).toBe("jax-and-brittany");
    expect(
      buildPersonRouteSlug({
        personName: "Meredith Marks",
        personId: "7f528757-5017-4599-8252-c02f0d0736cf",
      })
    ).toBe("meredith-marks--7f528757");
  });

  it("cleans legacy person routing query params", () => {
    const cleaned = cleanLegacyPersonRoutingQuery(
      new URLSearchParams("showId=the-real-housewives-of-salt-lake-city&tab=gallery&seasonNumber=4")
    );

    expect(cleaned.toString()).toBe("seasonNumber=4");
  });
});
