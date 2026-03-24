import { describe, expect, it } from "vitest";

import { extractFamilySimilarityTokens, inferTraitTokens } from "@/lib/fonts/brand-fonts/normalization.ts";

describe("brand font normalization", () => {
  it("applies alias lookup after normalized-key conversion", () => {
    expect(extractFamilySimilarityTokens("nyt-karnakcondensed")).toEqual(
      expect.arrayContaining(["cheltenham", "editorial", "karnak"]),
    );
    expect(extractFamilySimilarityTokens("velino compressed text")).toEqual(
      expect.arrayContaining(["condensed", "editorial", "velino"]),
    );
    expect(extractFamilySimilarityTokens("rude slab condensed")).toEqual(
      expect.arrayContaining(["rude", "slab"]),
    );
  });

  it("applies trait overrides after normalized-key conversion", () => {
    expect(inferTraitTokens("nyt-karnakcondensed", "serif", ["condensed"])).toEqual(
      expect.arrayContaining(["condensed", "display", "traditional"]),
    );
    expect(inferTraitTokens("velino compressed text", "serif", ["extra-condensed"])).toEqual(
      expect.arrayContaining(["condensed", "display", "traditional"]),
    );
  });
});
