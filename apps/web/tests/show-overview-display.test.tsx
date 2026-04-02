import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExternalLinks } from "@/components/admin/ExternalLinks";
import {
  buildOverviewAlternativeNamesText,
  buildOverviewRedditGroups,
  buildOverviewWatchAvailability,
  buildSeasonCoverageRows,
  getOverviewJustwatchUrl,
  getOverviewNetworks,
  getOverviewStreamingProviders,
} from "@/lib/admin/show-page/overview-display";

describe("show overview display helpers", () => {
  it("keeps the preferred acronym alias in overview alt names", () => {
    expect(
      buildOverviewAlternativeNamesText({
        name: "The Real Housewives of Salt Lake City",
        alternative_names: ["RHOSLC", "The Real Housewives of Salt Lake City"],
        overview_alternative_names: ["RHOSLC"],
      })
    ).toBe("RHOSLC");
  });

  it("prefers canonical overview brand buckets over raw arrays", () => {
    const show = {
      networks: ["Bravo TV"],
      overview_networks: ["Bravo"],
      streaming_providers: ["Peacock Premium", "Peacock Premium Plus"],
      watch_providers: ["Hayu"],
      overview_streaming_providers: ["Hayu", "Peacock"],
    };

    expect(getOverviewNetworks(show)).toEqual(["Bravo"]);
    expect(getOverviewStreamingProviders(show)).toEqual(["Hayu", "Peacock"]);
  });

  it("returns the derived JustWatch URL when present", () => {
    expect(
      getOverviewJustwatchUrl({
        derived_external_links: {
          justwatch_url:
            "https://www.themoviedb.org/tv/110381-the-real-housewives-of-salt-lake-city/watch?locale=US",
        },
      })
    ).toBe("https://www.themoviedb.org/tv/110381-the-real-housewives-of-salt-lake-city/watch?locale=US");
  });

  it("groups regional watch availability into stream and buy buckets", () => {
    expect(
      buildOverviewWatchAvailability({
        overview_watch_availability: [
          { region: "US", stream: ["Peacock", "Hayu"], buy: ["Apple TV", "Prime Video"] },
          { region: "GB", stream: ["Hayu"], buy: [] },
          { region: "DE", stream: ["RTL+"], buy: ["Apple TV"] },
        ],
      })
    ).toEqual([
      {
        regionCode: "US",
        regionLabel: "United States",
        stream: ["Peacock", "Hayu"],
        buy: ["Apple TV", "Prime Video"],
      },
      {
        regionCode: "GB",
        regionLabel: "United Kingdom",
        stream: ["Hayu"],
        buy: [],
      },
    ]);
  });

  it("groups Reddit communities by show, franchise, and network relevance", () => {
    expect(
      buildOverviewRedditGroups({
        showName: "The Real Housewives of Salt Lake City",
        networks: ["Bravo"],
        communities: [
          {
            id: "show-community",
            subreddit: "RHOSLC",
            display_name: "r/RHOSLC",
            is_show_focused: true,
            analysis_all_flairs: ["Episode Discussion"],
            analysis_flairs: ["Cast Tea"],
          },
          {
            id: "franchise-community",
            subreddit: "BravoRealHousewives",
            display_name: "r/BravoRealHousewives",
            franchise_focus_targets: ["Real Housewives"],
            analysis_all_flairs: ["Franchise News"],
            analysis_flairs: [],
          },
          {
            id: "network-community",
            subreddit: "BravoTV",
            display_name: "r/BravoTV",
            network_focus_targets: ["Bravo"],
            analysis_all_flairs: [],
            analysis_flairs: [],
          },
        ],
      })
    ).toEqual([
      {
        key: "SHOW",
        label: "SHOW",
        communities: [
          {
            id: "show-community",
            subreddit: "RHOSLC",
            displayName: "r/RHOSLC",
            assignedFlairs: ["Episode Discussion", "Cast Tea"],
            postFlairs: [],
          },
        ],
      },
      {
        key: "FRANCHISE",
        label: "FRANCHISE",
        communities: [
          {
            id: "franchise-community",
            subreddit: "BravoRealHousewives",
            displayName: "r/BravoRealHousewives",
            assignedFlairs: ["Franchise News"],
            postFlairs: [],
          },
        ],
      },
      {
        key: "NETWORK",
        label: "NETWORK",
        communities: [
          {
            id: "network-community",
            subreddit: "BravoTV",
            displayName: "r/BravoTV",
            assignedFlairs: [],
            postFlairs: [],
          },
        ],
      },
    ]);
  });

  it("merges season fandom pages into season coverage and dedupes by normalized URL", () => {
    const rows = buildSeasonCoverageRows({
      seasons: [
        {
          id: "season-6",
          season_number: 6,
          fandom_source_url:
            "https://real-housewives.fandom.com/wiki/The_Real_Housewives_of_Salt_Lake_City_-_Season_6/",
          fandom_page_title: "The Real Housewives of Salt Lake City - Season 6",
        },
      ],
      entityLinkPills: [
        {
          id: "link-1",
          seasonNumber: 6,
          url: "https://real-housewives.fandom.com/wiki/The_Real_Housewives_of_Salt_Lake_City_-_Season_6",
          sourceKind: "fandom",
          sourceLabel: "The Real Housewives Wiki",
          iconUrl: null,
          linkTitle: "Season 6",
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      seasonNumber: 6,
    });
    expect(rows[0].links).toHaveLength(1);
    expect(rows[0].links[0]).toMatchObject({
      url: "https://real-housewives.fandom.com/wiki/The_Real_Housewives_of_Salt_Lake_City_-_Season_6",
      sourceKind: "fandom",
    });
  });
});

describe("ExternalLinks", () => {
  it("renders the derived JustWatch link alongside other external ids", () => {
    render(
      <ExternalLinks
        externalIds={{ tmdb_id: 110381 }}
        derivedLinks={{
          justwatch_url:
            "https://www.themoviedb.org/tv/110381-the-real-housewives-of-salt-lake-city/watch?locale=US",
        }}
        type="show"
      />
    );

    expect(screen.getByText("JustWatch:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /watch page/i })).toHaveAttribute(
      "href",
      "https://www.themoviedb.org/tv/110381-the-real-housewives-of-salt-lake-city/watch?locale=US"
    );
  });
});
