import { describe, expect, it } from "vitest";

import {
  castFandomRowMatchesExpectedPerson,
  extractFandomOwnerNameFromStaticFileUrl,
  extractFandomPageNameFromUrl,
  extractPersonKnowledgePageNameFromUrl,
  extractWikipediaPageNameFromUrl,
  fandomPersonNameMatches,
  isFandomPhotoOwnedByExpectedPerson,
} from "@/lib/server/trr-api/fandom-ownership";

describe("fandom person ownership helpers", () => {
  it("requires person-level match instead of last-name-only match", () => {
    expect(fandomPersonNameMatches("Henry Barlow", "Henry Barlow")).toBe(true);
    expect(fandomPersonNameMatches("Henry Barlow", "Lisa Barlow")).toBe(false);
    expect(fandomPersonNameMatches("Henry Barlow", "John Barlow")).toBe(false);
  });

  it("supports honorific variations for real matches", () => {
    expect(fandomPersonNameMatches("Wendy Osefo", "Dr. Wendy Osefo")).toBe(true);
  });

  it("parses fandom page owner from standard and gallery URLs", () => {
    expect(extractFandomPageNameFromUrl("https://real-housewives.fandom.com/wiki/Lisa_Barlow")).toBe(
      "Lisa Barlow"
    );
    expect(
      extractFandomPageNameFromUrl("https://real-housewives.fandom.com/wiki/Henry_Barlow/Gallery")
    ).toBe("Henry Barlow");
    expect(
      extractFandomPageNameFromUrl("https://real-housewives.fandom.com/wiki/Special:FilePath/Lisa.png")
    ).toBeNull();
  });

  it("parses owner hints from static wikia file urls", () => {
    expect(
      extractFandomOwnerNameFromStaticFileUrl(
        "https://static.wikia.nocookie.net/real-housewives/images/7/7b/Lisa%E2%80%99s_RHOSLC_S5_Reunion_Look_%281%29.webp"
      )
    ).toBe("Lisa");
  });

  it("parses wikipedia person page owner", () => {
    expect(extractWikipediaPageNameFromUrl("https://en.wikipedia.org/wiki/Lisa_Barlow")).toBe(
      "Lisa Barlow"
    );
    expect(
      extractWikipediaPageNameFromUrl(
        "https://en.wikipedia.org/wiki/Lisa_Barlow_(The_Real_Housewives_of_Salt_Lake_City)#Personal_life"
      )
    ).toBe("Lisa Barlow");
    expect(extractWikipediaPageNameFromUrl("https://www.wikidata.org/wiki/Q122761552")).toBeNull();
  });

  it("extracts person owner name across fandom and wikipedia urls", () => {
    expect(
      extractPersonKnowledgePageNameFromUrl("https://real-housewives.fandom.com/wiki/Lisa_Barlow")
    ).toBe("Lisa Barlow");
    expect(extractPersonKnowledgePageNameFromUrl("https://en.wikipedia.org/wiki/Lisa_Barlow")).toBe(
      "Lisa Barlow"
    );
    expect(extractPersonKnowledgePageNameFromUrl("https://www.wikidata.org/wiki/Q122761552")).toBeNull();
  });

  it("rejects cast_fandom row when source page belongs to a different person", () => {
    expect(
      castFandomRowMatchesExpectedPerson("John Barlow", {
        full_name: "John Barlow",
        page_title: "John Barlow",
        source_url: "https://en.wikipedia.org/wiki/Lisa_Barlow",
      })
    ).toBe(false);
    expect(
      castFandomRowMatchesExpectedPerson("John Barlow", {
        full_name: "John Barlow",
        page_title: "John Barlow",
        source_url: "https://en.wikipedia.org/wiki/John_Barlow",
      })
    ).toBe(true);
  });

  it("filters fandom photos that belong to another person page", () => {
    expect(
      isFandomPhotoOwnedByExpectedPerson({
        source: "fandom",
        sourcePageUrl: "https://real-housewives.fandom.com/wiki/Lisa_Barlow",
        expectedPersonName: "Henry Barlow",
      })
    ).toBe(false);

    expect(
      isFandomPhotoOwnedByExpectedPerson({
        source: "fandom",
        sourcePageUrl: "https://real-housewives.fandom.com/wiki/Henry_Barlow",
        expectedPersonName: "Henry Barlow",
      })
    ).toBe(true);

    expect(
      isFandomPhotoOwnedByExpectedPerson({
        source: "tmdb",
        sourcePageUrl: "https://real-housewives.fandom.com/wiki/Lisa_Barlow",
        expectedPersonName: "Henry Barlow",
      })
    ).toBe(true);
  });

  it("rejects static wikia files when trusted owner token mismatches expected person", () => {
    expect(
      isFandomPhotoOwnedByExpectedPerson({
        source: "fandom",
        sourceUrl:
          "https://static.wikia.nocookie.net/real-housewives/images/7/7b/Lisa%E2%80%99s_RHOSLC_S5_Reunion_Look_%281%29.webp",
        expectedPersonName: "Henry Barlow",
      })
    ).toBe(false);
  });

  it("uses metadata original/url_original as trusted ownership candidates", () => {
    expect(
      isFandomPhotoOwnedByExpectedPerson({
        source: "fandom",
        metadata: {
          original_url:
            "https://static.wikia.nocookie.net/real-housewives/images/7/7b/Lisa%E2%80%99s_RHOSLC_S5_Reunion_Look_%281%29.webp",
        },
        expectedPersonName: "Henry Barlow",
      })
    ).toBe(false);

    expect(
      isFandomPhotoOwnedByExpectedPerson({
        source: "fandom",
        metadata: {
          url_original:
            "https://static.wikia.nocookie.net/real-housewives/images/7/7b/Henry_Barlow_Reunion.webp",
        },
        expectedPersonName: "Henry Barlow",
      })
    ).toBe(true);
  });
});
