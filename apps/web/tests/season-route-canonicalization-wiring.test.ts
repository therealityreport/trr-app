import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season route canonicalization wiring", () => {
  it("uses alias-first showSlugForRouting for season canonical route replacement", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const showSlugForRouting = useMemo\(\(\) =>/);
    expect(contents).toMatch(/const canonicalRouteUrl = buildSeasonAdminUrl\(\{[\s\S]*showSlug: showSlugForRouting,/);
    expect(contents).toMatch(/const currentHasLegacyRoutingQuery =/);
    expect(contents).toMatch(/searchParams\.has\("tab"\) \|\| searchParams\.has\("assets"\)/);
  });

  it("does not canonicalize season route replacement with show canonical_slug or raw routeSlug", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).not.toMatch(/const canonicalSlug = show\?\.canonical_slug\?\.trim\(\) \|\| show\?\.slug\?\.trim\(\);/);
    expect(contents).not.toMatch(/const routeSlug = showRouteParam\.trim\(\);/);
  });
});
