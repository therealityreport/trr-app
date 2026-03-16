import { describe, expect, it } from "vitest";

import {
  isFandomSeedUrl,
  isLikelyPageUrl,
  parsePersonNameFromLink,
  resolveLinkPageTitle,
  resolveLinkSiteTitle,
  resolveShowPageDisplayTitle,
} from "../src/lib/admin/show-page/link-display";

describe("show link display helpers", () => {
  it("distinguishes fandom seeds from wiki pages", () => {
    expect(isFandomSeedUrl("https://real-housewives.fandom.com")).toBe(true);
    expect(isFandomSeedUrl("https://real-housewives.fandom.com/wiki/The_Real_Housewives_of_Salt_Lake_City")).toBe(false);
  });

  it("recognizes likely page urls and rejects roots", () => {
    expect(isLikelyPageUrl("https://www.bravotv.com/the-real-housewives-of-salt-lake-city")).toBe(true);
    expect(isLikelyPageUrl("https://real-housewives.fandom.com/")).toBe(false);
  });

  it("reads additive fandom metadata for site and page titles", () => {
    const link = {
      url: "https://real-housewives.fandom.com/wiki/The_Real_Housewives_of_Salt_Lake_City",
      link_kind: "fandom",
      metadata: {
        site_title: "The Real Housewives Wiki",
        page_title: "The Real Housewives of Salt Lake City",
      },
    };

    expect(resolveLinkSiteTitle(link)).toBe("The Real Housewives Wiki");
    expect(resolveLinkPageTitle(link)).toBe("The Real Housewives of Salt Lake City");
  });

  it("uses the canonical show name for non-fandom show pages without explicit metadata titles", () => {
    const bravoLink = {
      url: "https://www.bravotv.com/the-real-housewives-of-salt-lake-city",
      link_kind: "official_page",
      metadata: null,
    };
    const fandomLink = {
      url: "https://real-housewives.fandom.com/wiki/The_Real_Housewives_of_Salt_Lake_City",
      link_kind: "fandom",
      metadata: {
        site_title: "The Real Housewives Wiki",
        page_title: "The Real Housewives of Salt Lake City",
      },
    };

    expect(resolveShowPageDisplayTitle(bravoLink, "The Real Housewives of Salt Lake City")).toBe(
      "The Real Housewives of Salt Lake City"
    );
    expect(resolveShowPageDisplayTitle(fandomLink, "The Real Housewives of Salt Lake City")).toBe(
      "The Real Housewives of Salt Lake City"
    );
  });

  it("strips gallery and opaque-id fallbacks when parsing cast member names", () => {
    expect(
      parsePersonNameFromLink({
        url: "https://real-housewives.fandom.com/wiki/Angie_Katsanevas/Gallery",
        link_kind: "fandom",
        label: "Angie Katsanevas/Gallery",
      })
    ).toBe("Angie Katsanevas");

    expect(
      parsePersonNameFromLink({
        url: "https://www.themoviedb.org/person/54772",
        link_kind: "tmdb",
        label: "54772",
      })
    ).toBeNull();
  });

  it("keeps fandom subpages attributable to the same cast member", () => {
    expect(
      parsePersonNameFromLink({
        url: "https://real-housewives.fandom.com/wiki/Angie_Katsanevas/Storylines",
        link_kind: "fandom",
        label: "Angie Katsanevas/Storylines",
      })
    ).toBe("Angie Katsanevas");

    expect(
      parsePersonNameFromLink({
        url: "https://real-housewives.fandom.com/wiki/Angie_Katsanevas/Connections",
        link_kind: "fandom",
        label: "Angie Katsanevas/Connections",
      })
    ).toBe("Angie Katsanevas");
  });
});
