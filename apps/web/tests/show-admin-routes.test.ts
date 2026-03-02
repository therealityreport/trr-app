import { describe, expect, it } from "vitest";

import {
  buildPersonAdminUrl,
  buildPersonRouteSlug,
  buildShowRedditCommunityAnalyticsUrl,
  buildShowRedditCommunityUrl,
  buildShowRedditCommunityWindowUrl,
  buildShowRedditSeasonFilterUrl,
  buildShowRedditUrl,
  buildSeasonAdminUrl,
  buildSeasonSocialWeekUrl,
  buildShowAdminUrl,
  cleanLegacyPersonRoutingQuery,
  cleanLegacyRoutingQuery,
  parseSeasonEpisodeNumberFromPath,
  parseSeasonSocialPathFilters,
  parseSocialAnalyticsViewFromPath,
  parseShowSocialPathFilters,
  parseSeasonSocialPathSegment,
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

    expect(
      parseShowRouteState(
        "/rhoslc/media/images",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "assets", assetsSubTab: "images", source: "path" });
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
    ).toBe("/the-real-housewives-of-salt-lake-city");

    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        tab: "social",
        socialRoute: {
          seasonNumber: 6,
        },
      }),
    ).toBe("/the-real-housewives-of-salt-lake-city/social/s6");

    expect(
      buildShowAdminUrl({
        showSlug: "rhoslc",
        tab: "social",
        socialView: "reddit",
      }),
    ).toBe("/rhoslc/social/reddit");

    expect(
      buildShowAdminUrl({
        showSlug: "rhoslc",
        tab: "social",
        socialView: "reddit",
        socialRoute: {
          seasonNumber: 6,
        },
      }),
    ).toBe("/rhoslc/s6/social/reddit");

    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        tab: "social",
        socialRoute: {
          weekIndex: "w01",
          platform: "instagram",
          handle: "@BravoTV",
        },
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/social/w1/instagram/account/bravotv");

    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        tab: "assets",
        assetsSubTab: "branding",
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/assets/branding");

    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        tab: "assets",
        assetsSubTab: "videos",
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/assets/videos");

    expect(
      buildShowAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        tab: "assets",
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/assets");

    expect(
      buildShowAdminUrl({
        showSlug: "rhoslc",
        tab: "cast",
      })
    ).toBe("/rhoslc/cast");
  });

  it("parses season path tabs and query fallback", () => {
    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "overview", assetsSubTab: "images", source: "path" });

    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4/assets/brand",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "assets", assetsSubTab: "branding", source: "path" });

    expect(
      parseSeasonRouteState(
        "/rhoslc/s4/e1/social/reddit",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "social", assetsSubTab: "images", source: "path" });

    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4",
        new URLSearchParams("tab=media")
      )
    ).toMatchObject({ tab: "assets", assetsSubTab: "images", source: "query" });

    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4",
        new URLSearchParams("tab=fandom")
      )
    ).toMatchObject({ tab: "fandom", assetsSubTab: "images", source: "query" });

    expect(
      parseSeasonRouteState(
        "/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4",
        new URLSearchParams("tab=details")
      )
    ).toMatchObject({ tab: "overview", assetsSubTab: "images", source: "query" });
  });

  it("builds canonical season URLs", () => {
    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/s4");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "overview",
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/s4");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "episodes",
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/s4/episodes");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "cast",
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/s4/cast");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "assets",
        assetsSubTab: "branding",
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/s4/assets/branding");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "assets",
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/s4/assets");

    expect(
      buildSeasonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        tab: "fandom",
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/s4/fandom");

    expect(
      buildSeasonAdminUrl({
        showSlug: "rhoslc",
        seasonNumber: 6,
        tab: "cast",
      })
    ).toBe("/rhoslc/s6/cast");

    expect(
      buildSeasonAdminUrl({
        showSlug: "rhoslc",
        seasonNumber: 6,
        tab: "social",
        socialView: "hashtags",
      })
    ).toBe("/rhoslc/s6/social/hashtags");

    expect(
      buildSeasonAdminUrl({
        showSlug: "rhoslc",
        seasonNumber: 6,
        tab: "social",
        socialView: "tiktok-overview",
      })
    ).toBe("/rhoslc/s6/social/tiktok-overview");

    expect(
      buildSeasonAdminUrl({
        showSlug: "rhoslc",
        seasonNumber: 6,
        tab: "social",
        socialRoute: {
          weekIndex: "preseason",
          handle: "@BravoTV",
        },
      }),
    ).toBe("/rhoslc/s6/social/w0/account/bravotv");

    expect(
      buildSeasonAdminUrl({
        showSlug: "rhoslc",
        seasonNumber: 6,
        episodeNumber: 1,
        tab: "social",
      }),
    ).toBe("/rhoslc/s6/e1/social");

    expect(
      buildSeasonAdminUrl({
        showSlug: "rhoslc",
        seasonNumber: Number.NaN,
        tab: "social",
      }),
    ).toBe("/rhoslc/seasons");
  });

  it("builds canonical season social week URLs", () => {
    expect(
      buildSeasonSocialWeekUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        weekIndex: 3,
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/s4/social/w3/details");

    expect(
      buildSeasonSocialWeekUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        weekIndex: 3,
        platform: "youtube",
        query: new URLSearchParams("source_scope=bravo&platform=youtube"),
      })
    ).toBe(
      "/the-real-housewives-of-salt-lake-city/s4/social/w3/youtube?platform=youtube"
    );

    expect(
      buildSeasonSocialWeekUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        seasonNumber: 4,
        weekIndex: 3,
        platform: "instagram",
        query: new URLSearchParams("source_scope=bravo&social_platform=instagram&season_id=season-1"),
      })
    ).toBe("/the-real-housewives-of-salt-lake-city/s4/social/w3/instagram");
  });

  it("parses social analytics view from canonical show and season paths", () => {
    expect(parseSocialAnalyticsViewFromPath("/rhoslc/social/official")).toBe("official");
    expect(parseSocialAnalyticsViewFromPath("/rhoslc/social/s6")).toBe("official");
    expect(parseSocialAnalyticsViewFromPath("/rhoslc/social/official/reddit")).toBe("reddit");
    expect(parseSocialAnalyticsViewFromPath("/rhoslc/social/bravo")).toBe("bravo");
    expect(parseSocialAnalyticsViewFromPath("/rhoslc/social/tiktok-overview")).toBe("tiktok-overview");
    expect(parseSocialAnalyticsViewFromPath("/rhoslc/s6/social/reddit")).toBe("reddit");
    expect(parseSocialAnalyticsViewFromPath("/rhoslc/s6/social/official/reddit")).toBe("reddit");
    expect(parseSocialAnalyticsViewFromPath("/rhoslc/s6/e1/social/twitter")).toBeNull();
    expect(parseSocialAnalyticsViewFromPath("/rhoslc/s6/cast")).toBeNull();
  });

  it("parses season episode and social path segments", () => {
    expect(parseSeasonEpisodeNumberFromPath("/rhoslc/s6/e1/social/twitter")).toBe(1);
    expect(parseSeasonEpisodeNumberFromPath("/rhoslc/s6/social/reddit")).toBeNull();
    expect(parseSeasonSocialPathSegment("/rhoslc/s6/e1/social/twitter")).toBe("twitter");
    expect(parseSeasonSocialPathSegment("/rhoslc/s6/e1/social/facebook")).toBe("facebook");
    expect(parseSeasonSocialPathSegment("/rhoslc/s6/e1/social/threads")).toBe("threads");
    expect(parseSeasonSocialPathSegment("/rhoslc/s6/e1/social/official")).toBe("official");
    expect(parseSeasonSocialPathSegment("/rhoslc/s6/social/official/reddit")).toBe("reddit");
    expect(parseSeasonSocialPathSegment("/rhoslc/s6/e1/cast")).toBeNull();
  });

  it("parses social path filters with official account grammar and legacy aliases", () => {
    expect(parseShowSocialPathFilters("/rhoslc/social/s6")).toMatchObject({
      view: "official",
      seasonNumber: 6,
      canonicalPathSuffix: "/social/s6",
    });

    expect(parseShowSocialPathFilters("/rhoslc/social/s6/instagram/account/BravoTV")).toMatchObject({
      view: "official",
      seasonNumber: 6,
      platform: "instagram",
      handle: "bravotv",
      canonicalPathSuffix: "/social/s6/instagram/account/bravotv",
    });

    expect(parseShowSocialPathFilters("/rhoslc/social/official/instagram/account/BravoTV")).toMatchObject({
      view: "official",
      seasonNumber: null,
      platform: "instagram",
      handle: "bravotv",
      canonicalPathSuffix: "/social/instagram/account/bravotv",
    });

    expect(parseShowSocialPathFilters("/rhoslc/social/bravo/w00/instagram/BravoTV")).toMatchObject({
      view: "official",
      seasonNumber: null,
      weekToken: "w0",
      weekIndex: 0,
      platform: "instagram",
      handle: "bravotv",
      canonicalPathSuffix: "/social/w0/instagram/account/bravotv",
    });

    expect(parseSeasonSocialPathFilters("/rhoslc/s6/social/official/w01/account/@BravoTV")).toMatchObject({
      view: "official",
      seasonNumber: null,
      weekToken: "w1",
      weekIndex: 1,
      handle: "bravotv",
      canonicalPathSuffix: "/social/w1/account/bravotv",
    });

    expect(parseShowSocialPathFilters("/rhoslc/social/official/reddit/BravoRealHousewives")).toMatchObject({
      view: "reddit",
      canonicalPathSuffix: "/social/reddit",
    });
  });

  it("builds canonical reddit URLs", () => {
    expect(
      buildShowRedditUrl({
        showSlug: "rhoslc",
      }),
    ).toBe("/rhoslc/social/reddit");

    expect(
      buildShowRedditSeasonFilterUrl({
        showSlug: "rhoslc",
        seasonNumber: 6,
      }),
    ).toBe("/rhoslc/s6/social/reddit");

    expect(
      buildShowRedditCommunityUrl({
        showSlug: "rhoslc",
        communitySlug: "BravoRealHousewives",
      }),
    ).toBe("/rhoslc/social/reddit/BravoRealHousewives");

    expect(
      buildShowRedditCommunityUrl({
        showSlug: "rhoslc",
        communitySlug: "BravoRealHousewives",
        seasonNumber: 6,
      }),
    ).toBe("/rhoslc/social/reddit/BravoRealHousewives/s6");

    expect(
      buildShowRedditCommunityWindowUrl({
        showSlug: "rhoslc",
        communitySlug: "BravoRealHousewives",
        seasonNumber: 6,
        windowKey: "episode-1",
      }),
    ).toBe("/rhoslc/social/reddit/BravoRealHousewives/s6/e1");

    expect(
      buildShowRedditCommunityWindowUrl({
        showSlug: "rhoslc",
        communitySlug: "BravoRealHousewives",
        seasonNumber: 6,
        windowKey: "w1",
      }),
    ).toBe("/rhoslc/social/reddit/BravoRealHousewives/s6/e1");

    expect(
      buildShowRedditCommunityWindowUrl({
        showSlug: "rhoslc",
        communitySlug: "BravoRealHousewives",
        seasonNumber: 6,
        windowKey: "period-preseason",
      }),
    ).toBe("/rhoslc/social/reddit/BravoRealHousewives/s6/w0");

    expect(
      buildShowRedditCommunityAnalyticsUrl({
        showSlug: "rhoslc",
        communitySlug: "BravoRealHousewives",
        seasonNumber: 6,
      }),
    ).toBe("/rhoslc/social/reddit/BravoRealHousewives/s6");

    expect(
      buildShowRedditCommunityAnalyticsUrl({
        showSlug: "rhoslc",
        communitySlug: "BravoRealHousewives",
        scope: "all",
      }),
    ).toBe("/rhoslc/social/reddit/BravoRealHousewives/all");

    expect(
      buildShowRedditCommunityAnalyticsUrl({
        showSlug: "rhoslc",
        communitySlug: "BravoRealHousewives",
        scope: "all",
        section: "flairs",
        flairKey: "salt lake city",
      }),
    ).toBe("/rhoslc/social/reddit/BravoRealHousewives/all/flairs/salt%20lake%20city");
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

    expect(
      parsePersonRouteState(
        "/people/meredith-marks--7f528757/gallery",
        new URLSearchParams()
      )
    ).toMatchObject({ tab: "gallery", source: "path" });
  });

  it("builds canonical person URLs", () => {
    expect(
      buildPersonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        personSlug: "meredith-marks--7f528757",
      })
    ).toBe(
      "/people/meredith-marks--7f528757?showId=the-real-housewives-of-salt-lake-city",
    );

    expect(
      buildPersonAdminUrl({
        showSlug: "the-real-housewives-of-salt-lake-city",
        personSlug: "meredith-marks--7f528757",
        tab: "gallery",
      })
    ).toBe(
      "/people/meredith-marks--7f528757/gallery?showId=the-real-housewives-of-salt-lake-city",
    );

    expect(
      buildPersonAdminUrl({
        showId: "7f528757-5017-4599-8252-c02f0d0736cf",
        personSlug: "meredith-marks--7f528757",
        tab: "gallery",
      })
    ).toBe("/people/meredith-marks--7f528757/gallery?showId=7f528757-5017-4599-8252-c02f0d0736cf");

    expect(
      buildPersonAdminUrl({
        personSlug: "meredith-marks--7f528757",
        tab: "gallery",
        query: new URLSearchParams({ scope: "all", page: "2" }),
      })
    ).toBe("/people/meredith-marks--7f528757/gallery?page=2");
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

    expect(cleaned.toString()).toBe("showId=the-real-housewives-of-salt-lake-city&seasonNumber=4");
  });
});
