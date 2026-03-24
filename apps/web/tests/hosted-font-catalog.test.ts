import { describe, expect, it } from "vitest";

import {
  normalizeHostedFamilyKey,
  parseHostedFontCatalogStylesheet,
} from "@/lib/fonts/hosted-font-catalog";

describe("hosted font catalog parser", () => {
  it("groups hosted font files by family and bucket", () => {
    const stylesheet = `
      @font-face {
        font-family: "Hamburg Serial";
        src: url("/fonts/trr/Hamburg%20Serial/HamburgSerialBook.otf") format("opentype");
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: "Hamburg Serial";
        src: url("/fonts/trr/Hamburg%20Serial/HamburgSerialBookItalic.otf") format("opentype");
        font-weight: 400;
        font-style: italic;
      }
      @font-face {
        font-family: "Rude Slab Condensed";
        src: url("/fonts/reference%20fonts/NYTimes/Rude%20Slab%20Condensed") format("woff2");
        font-weight: 700;
        font-style: normal;
      }
    `;

    const catalog = parseHostedFontCatalogStylesheet(stylesheet);

    expect(catalog).toHaveLength(2);
    expect(catalog[0]).toEqual(
      expect.objectContaining({
        familyName: "Hamburg Serial",
        bucket: "trr",
      }),
    );
    expect(catalog[0]?.styles).toEqual([
      expect.objectContaining({ weight: 400, style: "italic" }),
      expect.objectContaining({ weight: 400, style: "normal" }),
    ]);
    expect(catalog[1]).toEqual(
      expect.objectContaining({
        familyName: "Rude Slab Condensed",
        bucket: "reference",
      }),
    );
    expect(catalog[1]?.styles[0]?.stretch).toBe("condensed");
  });

  it("normalizes family keys across underscore and punctuation variants", () => {
    expect(normalizeHostedFamilyKey("NYTKarnak_Condensed")).toBe(
      normalizeHostedFamilyKey("NYTKarnak Condensed"),
    );
    expect(normalizeHostedFamilyKey("Helvetica_Neue")).toBe(
      normalizeHostedFamilyKey("Helvetica Neue"),
    );
  });
});
