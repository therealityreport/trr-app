import { describe, expect, it } from "vitest";

import {
  buildCanonicalShowAlternativeNames,
  deriveShowDetailsAlternativeNames,
  deriveShowDetailsNickname,
  deriveShowDetailsSlugPreview,
} from "@/lib/admin/show-page/details-form";

describe("show details form helpers", () => {
  it("initializes nickname from the persisted slug when no preferred alias exists", () => {
    expect(
      deriveShowDetailsNickname({
        name: "The Real Housewives of Salt Lake City",
        slug: "rhoslc",
        alternative_names: [],
      })
    ).toBe("rhoslc");
  });

  it("initializes nickname from the preferred alias when the legacy slug is missing", () => {
    expect(
      deriveShowDetailsNickname({
        name: "The Real Housewives of Salt Lake City",
        slug: null,
        canonical_slug: "the-real-housewives-of-salt-lake-city",
        alternative_names: ["RHOSLC", "Salt Lake City"],
      })
    ).toBe("rhoslc");
  });

  it("omits the canonical slug from editable alternative names", () => {
    expect(
      deriveShowDetailsAlternativeNames({
        name: "Test Show",
        slug: "test-show",
        alternative_names: ["test-show", "Bravo Alias", "Test Show", "Bravo Alias"],
      })
    ).toEqual(["Bravo Alias"]);
  });

  it("keeps the preferred alias display value in editable alternative names", () => {
    expect(
      deriveShowDetailsAlternativeNames({
        name: "The Real Housewives of Salt Lake City",
        slug: null,
        canonical_slug: "the-real-housewives-of-salt-lake-city",
        alternative_names: ["RHOSLC", "Salt Lake City", "The Real Housewives of Salt Lake City"],
      })
    ).toEqual(["RHOSLC", "Salt Lake City"]);
  });

  it("keeps the normalized slug first while preserving the preferred alias display value", () => {
    expect(
      buildCanonicalShowAlternativeNames({
        displayName: "Test Show",
        nickname: " RHOSLC!!! ",
        alternativeNames: ["Salt Lake", "RHOSLC", "rhoslc", "Test Show"],
      })
    ).toEqual(["rhoslc", "RHOSLC", "Salt Lake"]);
  });

  it("uses the shared slugification rule for the preview", () => {
    expect(deriveShowDetailsSlugPreview("The Valley & Friends")).toBe("the-valley-and-friends");
  });
});
