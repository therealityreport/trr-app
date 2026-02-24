import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show bravo fandom integration wiring", () => {
  it("maps full preview fandom fields and renders fandom coverage section", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/fandom_people\?: BravoPreviewPerson\[]/);
    expect(contents).toMatch(/fandom_candidate_results\?: BravoPersonCandidateResult\[]/);
    expect(contents).toMatch(/fandom_domains_used\?: string\[]/);
    expect(contents).toMatch(/Fandom Cast Coverage/);
    expect(contents).toMatch(/setSyncFandomPreviewPeople/);
    expect(contents).toMatch(/setSyncFandomCandidateSummary/);
  });

  it("includes fandom sync outcomes in commit notice and log messaging", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/fandom_profiles_upserted/);
    expect(contents).toMatch(/fandom_fallback_images_imported/);
    expect(contents).toMatch(/Synced Bravo \+ Fandom/);
    expect(contents).toMatch(/Bravo\/Fandom/);
  });
});
