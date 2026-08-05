import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show bravo cast-only wiring", () => {
  it("offers cast-only vs rerun mode choices for existing Bravo sync data", () => {
    const routePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const modalPath = path.resolve(__dirname, "../src/components/admin/ShowBravoSyncModal.tsx");
    const routeContents = fs.readFileSync(routePath, "utf8");
    const contents = `${routeContents}\n${fs.readFileSync(modalPath, "utf8")}`;

    expect(contents).toMatch(/Sync All Info/);
    expect(contents).toMatch(/Cast Info only/);
    expect(contents).toMatch(/syncBravoRunMode/);
  });

  it("sends canonical cast candidate urls and uses stream preview for cast-only mode", () => {
    const routePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const modalPath = path.resolve(__dirname, "../src/components/admin/ShowBravoSyncModal.tsx");
    const utilitiesPath = path.resolve(
      __dirname,
      "../src/lib/admin/show-page/show-detail-utilities.ts"
    );
    const routeContents = fs.readFileSync(routePath, "utf8");
    const utilitiesContents = fs.readFileSync(utilitiesPath, "utf8");
    const contents = `${routeContents}\n${fs.readFileSync(modalPath, "utf8")}\n${utilitiesContents}`;

    expect(routeContents).toMatch(/person_url_candidates:\s*syncBravoCastUrlCandidates/);
    expect(routeContents).toMatch(/import-bravo\/preview\/stream/);
    expect(routeContents).toMatch(/cast_only:\s*true/);
    expect(routeContents).toMatch(/cast_only:\s*syncBravoRunMode === "cast-only"/);
    expect(routeContents).toMatch(/preview_result:/);
    expect(routeContents).toMatch(/preview_signature:/);
    expect(routeContents).toMatch(/syncBravoPreviewResult/);
    expect(routeContents).toMatch(/syncBravoPreviewSignature/);
    expect(routeContents).toMatch(/syncBravoRunMode === "cast-only" && !syncBravoPreviewSignature/);
    expect(routeContents).toMatch(/Preview stale\. Re-run preview before committing cast-only sync\./);
    expect(routeContents).toMatch(/fetchCastRoleMembers\(\{\s*force:\s*true\s*\}\)/);
    expect(routeContents).toMatch(/status:\s*"pending"/);
    expect(utilitiesContents).toMatch(/https:\/\/www\.bravotv\.com\/people\/\$\{slug\}/);
    expect(routeContents).toMatch(/payload\.source === "fandom" \? "fandom" : "bravo"/);
    expect(routeContents).toMatch(/setSyncFandomPersonCandidateResults/);
    expect(routeContents).toMatch(/fandom_candidate_results/);
    expect(routeContents).toMatch(/fandom_domains_used/);
    expect(contents).toMatch(/Selected Mode:/);
  });
});
