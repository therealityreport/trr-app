import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show bravo cast-only preview details", () => {
  it("renders progressive cast-only probe details with queue + rich profile cards", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/import-bravo\/preview\/stream/);
    expect(contents).toMatch(/Probe Queue/);
    expect(contents).toMatch(/setSyncBravoProbeStatusMessage/);
    expect(contents).toMatch(/status === "in_progress"/);
    expect(contents).toMatch(/hero_image_url\?: string \| null/);
    expect(contents).toMatch(/social_links\?: Record<string, string> \| null/);
    expect(contents).toMatch(/Missing \/ Error Profiles/);
    expect(contents).toMatch(/tested \{syncBravoProbeSummary\.tested\}/);
    expect(contents).toMatch(/Fandom Probe Queue/);
    expect(contents).toMatch(/syncFandomProbeSummary/);
    expect(contents).toMatch(/syncFandomValidProfileCards/);
  });

  it("allows cast-only confirm step with candidate probe results", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/syncBravoPersonCandidateResults\.length > 0/);
    expect(contents).toMatch(/syncFandomPersonCandidateResults\.length > 0/);
    expect(contents).toMatch(/Fandom summary: tested \{syncFandomProbeSummary\.tested\}/);
  });
});
