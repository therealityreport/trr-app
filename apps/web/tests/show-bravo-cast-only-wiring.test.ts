import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show bravo cast-only wiring", () => {
  it("offers cast-only vs rerun mode choices for existing Bravo sync data", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/Sync All Info/);
    expect(contents).toMatch(/Cast Info only/);
    expect(contents).toMatch(/syncBravoRunMode/);
  });

  it("sends canonical cast candidate urls and uses stream preview for cast-only mode", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/person_url_candidates:\s*syncBravoCastUrlCandidates/);
    expect(contents).toMatch(/import-bravo\/preview\/stream/);
    expect(contents).toMatch(/cast_only:\s*true/);
    expect(contents).toMatch(/cast_only:\s*syncBravoRunMode === "cast-only"/);
    expect(contents).toMatch(/preview_result:/);
    expect(contents).toMatch(/syncBravoPreviewResult/);
    expect(contents).toMatch(/Preview stale\. Re-run preview before committing cast-only sync\./);
    expect(contents).toMatch(/fetchCastRoleMembers\(\{\s*force:\s*true\s*\}\)/);
    expect(contents).toMatch(/status:\s*"pending"/);
    expect(contents).toMatch(/https:\/\/www\.bravotv\.com\/people\/\$\{slug\}/);
    expect(contents).toMatch(/payload\.source === "fandom" \? "fandom" : "bravo"/);
    expect(contents).toMatch(/setSyncFandomPersonCandidateResults/);
    expect(contents).toMatch(/fandom_candidate_results/);
    expect(contents).toMatch(/fandom_domains_used/);
  });
});
