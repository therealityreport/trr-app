import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show detail cast lazy-loading wiring", () => {
  const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const contents = fs.readFileSync(filePath, "utf8");

  it("keeps initial page load Promise.all free of fetchCast", () => {
    expect(contents).toMatch(/await Promise\.all\(\[fetchSeasons\(\), checkCoverage\(\)\]\)/);
    expect(contents).not.toMatch(/await Promise\.all\(\[fetchSeasons\(\), fetchCast\(\), checkCoverage\(\)\]\)/);
  });

  it("loads cast lazily on cast tab entry", () => {
    expect(contents).toMatch(/if \(castLoadedOnce \|\| castLoading\) return;/);
    expect(contents).toMatch(/if \(!hasAccess \|\| !showId \|\| activeTab !== "cast"\) return;/);
    expect(contents).toMatch(/void fetchCast\(\);/);
  });

  it("provides explicit enrich missing cast photos action with bravo fallback", () => {
    expect(contents).toMatch(/Enrich Missing Cast Photos/);
    expect(contents).toMatch(/photoFallbackMode: "bravo"/);
    expect(contents).toMatch(/mergeMissingPhotosOnly: true/);
    expect(contents).toMatch(/params\.set\("photo_fallback", photoFallbackMode\)/);
  });
});
