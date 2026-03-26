import { describe, expect, it } from "vitest";

import {
  buildHostedFamilyMap,
  resolveFontAsset,
  resolveHostedFamily,
  resolveSourceHostedFamily,
} from "@/lib/fonts/brand-fonts/asset-resolution.ts";
import type { BrandFontRecord } from "@/lib/fonts/brand-fonts/types";

const hostedCss = `
@font-face {
  font-family: "Hamburg Serial";
  src: url("/fonts/trr/Hamburg%20Serial/HamburgSerialRegular.otf") format("opentype");
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: "Hamburg Serial";
  src: url("/fonts/trr/Hamburg%20Serial/HamburgSerialBold.otf") format("opentype");
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: "Hamburg Serial";
  src: url("/fonts/trr/Hamburg%20Serial/HamburgSerialItalic.otf") format("opentype");
  font-weight: 700;
  font-style: italic;
}
@font-face {
  font-family: "Rude Slab Condensed";
  src: url("/fonts/trr/Rude%20Slab%20Condensed/RudeSlabCondensedBold.otf") format("opentype");
  font-weight: 700;
  font-style: normal;
}
`;

describe("brand font asset resolution", () => {
  it("selects the exact hosted asset when the requested style exists", () => {
    const familyMap = buildHostedFamilyMap(hostedCss, "");
    const family = resolveHostedFamily("Hamburg Serial", familyMap);

    expect(family).toBeTruthy();

    const asset = resolveFontAsset("Hamburg Serial", family!, 700, "italic", "normal");

    expect(asset?.resolvedWeight).toBe(700);
    expect(asset?.resolvedStyle).toBe("italic");
    expect(asset?.resolutionReason).toBe("exact");
  });

  it("falls back to the nearest weight when the exact weight is missing", () => {
    const familyMap = buildHostedFamilyMap(hostedCss, "");
    const family = resolveHostedFamily("Hamburg Serial", familyMap);
    const asset = resolveFontAsset("Hamburg Serial", family!, 600, "normal", "normal");

    expect(asset?.resolvedWeight).toBe(700);
    expect(asset?.resolutionReason).toBe("nearest-weight");
  });

  it("resolves aliased source families through the shared source-family lookup", () => {
    const familyMap = buildHostedFamilyMap("", `
@font-face {
  font-family: "NYTKarnak_Condensed";
  src: url("/fonts/reference%20fonts/NYTimes/NYTKarnak_Condensed.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
}
`);

    const record: Pick<BrandFontRecord, "sourceFontFamily" | "currentReferenceSubstitute"> = {
      sourceFontFamily: "nyt-karnakcondensed",
      currentReferenceSubstitute: "Rude Slab Condensed",
    };

    const family = resolveSourceHostedFamily(record, familyMap);

    expect(family?.familyName).toBe("NYTKarnak_Condensed");
  });
});
