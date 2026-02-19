import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show bravo cast-only wiring", () => {
  it("offers cast-only vs rerun mode choices for existing Bravo sync data", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/Cast Only/);
    expect(contents).toMatch(/Re-Run Show URL/);
    expect(contents).toMatch(/hasExistingBravoSnapshot/);
  });

  it("sends canonical cast candidate urls in preview and commit payloads", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/person_url_candidates:\s*syncBravoCastUrlCandidates/);
    expect(contents).toMatch(/include_videos:\s*includeFullShowContent/);
    expect(contents).toMatch(/include_news:\s*includeFullShowContent/);
    expect(contents).toMatch(/cast_only:\s*syncBravoRunMode === "cast-only"/);
    expect(contents).toMatch(/https:\/\/www\.bravotv\.com\/people\/\$\{slug\}/);
  });
});
