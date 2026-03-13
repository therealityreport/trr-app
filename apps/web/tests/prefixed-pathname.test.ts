import { describe, expect, it } from "vitest";
import { extractPrefixedPathSegment } from "@/lib/public/prefixed-pathname";

describe("extractPrefixedPathSegment", () => {
  it("parses season and week tokens from prefixed public routes", () => {
    const pathname = "/rhoslc/s6/social/w0";

    expect(extractPrefixedPathSegment(pathname, 1, "s")).toBe("6");
    expect(extractPrefixedPathSegment(pathname, 3, "w")).toBe("0");
  });

  it("returns undefined when the segment does not match the expected prefix", () => {
    expect(extractPrefixedPathSegment("/rhoslc/social/reddit/BravoRealHousewives", 1, "s")).toBeUndefined();
  });
});
