import { describe, expect, it } from "vitest";

import generatedBrandFontMatchResults from "@/lib/fonts/brand-fonts/generated/brand-font-match-results.json";

function top3(brandId: string, roleLabel: string): string[] {
  return (
    generatedBrandFontMatchResults.data.find(
      (entry) => entry.brandId === brandId && entry.roleLabel === roleLabel,
    )?.matches.slice(0, 3).map((match) => match.familyName) ?? []
  );
}

describe("brand font ranking snapshots", () => {
  it("keeps the key NYT top-three rankings stable after the weighted rebalance", () => {
    expect({
      canonicalKarnak: top3("brand-nyt-games:canonical", "nyt-karnak"),
      canonicalCheltenham: top3("brand-nyt-games:canonical", "nyt-cheltenham"),
      canonicalFranklin: top3("brand-nyt-games:canonical", "nyt-franklin"),
      spellingBeeKarnakCondensed: top3("brand-nyt-games:spelling-bee", "nyt-karnakcondensed"),
    }).toMatchInlineSnapshot(`
      {
        "canonicalCheltenham": [
          "Cheltenham",
          "ITC Cheltenham",
          "Gloucester",
        ],
        "canonicalFranklin": [
          "Franklin Gothic",
          "Hamburg Serial",
          "News Gothic No. 2",
        ],
        "canonicalKarnak": [
          "Stafford Serial",
          "Gloucester",
          "ITC Cheltenham",
        ],
        "spellingBeeKarnakCondensed": [
          "Rude Slab Condensed",
          "Velino Compressed Text",
        ],
      }
    `);
  });
});
