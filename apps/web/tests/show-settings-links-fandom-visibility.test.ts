import { describe, expect, it } from "vitest";

import {
  isFandomSeedUrl,
  normalizeLinkKind,
  parsePersonNameFromLink,
  resolveLinkPageTitle,
  resolveShowPageDisplayTitle,
} from "../src/lib/admin/show-page/link-display";

describe("show settings link behavior", () => {
  it("keeps fandom community roots out of page-link display behavior", () => {
    expect(isFandomSeedUrl("https://real-housewives.fandom.com")).toBe(true);
    expect(
      isFandomSeedUrl(
        "https://real-housewives.fandom.com/wiki/The_Real_Housewives_of_Salt_Lake_City"
      )
    ).toBe(false);
  });

  it("uses page titles for fandom links and canonical show names for non-fandom show pages", () => {
    const fandomLink = {
      url: "https://real-housewives.fandom.com/wiki/The_Real_Housewives_of_Salt_Lake_City",
      link_kind: "wikia",
      metadata: {
        fandom_title: "The Real Housewives of Salt Lake City",
      },
    };
    const bravoLink = {
      url: "https://www.bravotv.com/the-real-housewives-of-salt-lake-city",
      link_kind: "official_page",
      metadata: null,
    };

    expect(normalizeLinkKind(fandomLink.link_kind)).toBe("fandom");
    expect(resolveLinkPageTitle(fandomLink)).toBe("The Real Housewives of Salt Lake City");
    expect(resolveShowPageDisplayTitle(fandomLink, "Salt Lake City")).toBe(
      "The Real Housewives of Salt Lake City"
    );
    expect(resolveShowPageDisplayTitle(bravoLink, "The Real Housewives of Salt Lake City")).toBe(
      "The Real Housewives of Salt Lake City"
    );
  });

  it("keeps fandom cast-member subpages attributable to the same person", () => {
    expect(
      parsePersonNameFromLink({
        url: "https://real-housewives.fandom.com/wiki/Angie_Katsanevas/Storylines",
        link_kind: "fandom",
        label: "Angie Katsanevas/Storylines",
      })
    ).toBe("Angie Katsanevas");
  });
});
