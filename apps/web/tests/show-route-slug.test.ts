import { describe, expect, it } from "vitest";

import { resolvePreferredShowRouteSlug } from "@/lib/admin/show-route-slug";

describe("show route slug preference", () => {
  it("prefers alias alternatives over canonical slug", () => {
    const slug = resolvePreferredShowRouteSlug({
      canonicalSlug: "The Real Housewives of Salt Lake City",
      alternativeNames: ["RHOSLC"],
      fallback: "fallback-slug",
    });
    expect(slug).toBe("rhoslc");
  });

  it("falls back to legacy slug when alias is unavailable", () => {
    const slug = resolvePreferredShowRouteSlug({
      slug: "legacy-show-slug",
      alternativeNames: [],
      fallback: "fallback-slug",
    });
    expect(slug).toBe("legacy-show-slug");
  });

  it("uses alias when canonical and legacy slugs are unavailable", () => {
    const slug = resolvePreferredShowRouteSlug({
      alternativeNames: ["RHOSLC"],
      fallback: "fallback-slug",
    });
    expect(slug).toBe("rhoslc");
  });
});
