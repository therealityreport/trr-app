import { describe, expect, it } from "vitest";

import {
  buildCanonicalShowAlternativeNames,
  deriveShowDetailsAlternativeNames,
  deriveShowDetailsNickname,
  deriveShowDetailsSlugPreview,
} from "@/lib/admin/show-page/details-form";

describe("show details form helpers", () => {
  it("initializes nickname from the persisted slug", () => {
    expect(
      deriveShowDetailsNickname({
        name: "The Real Housewives of Salt Lake City",
        slug: "rhoslc",
        alternative_names: ["The Real Housewives of Salt Lake City", "Salt Lake City"],
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

  it("heals outbound alternative names so the normalized slug stays first", () => {
    expect(
      buildCanonicalShowAlternativeNames({
        displayName: "Test Show",
        nickname: " RHOSLC!!! ",
        alternativeNames: ["Salt Lake", "rhoslc", "Test Show"],
      })
    ).toEqual(["rhoslc", "Salt Lake"]);
  });

  it("uses the shared slugification rule for the preview", () => {
    expect(deriveShowDetailsSlugPreview("The Valley & Friends")).toBe("the-valley-and-friends");
  });
});
