import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season social load resilience wiring", () => {
  const filePath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
  );

  it("keeps a supplemental warning channel for optional season data", () => {
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const \[seasonSupplementalWarning, setSeasonSupplementalWarning\]/);
    expect(contents).toMatch(/Season supplemental data warning:/);
    expect(contents).toMatch(/Social analytics remains available\./);
  });

  it("separates core failure from optional season data failure", () => {
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/try \{[\s\S]*setSeason\(foundSeason\);[\s\S]*try \{/);
    expect(contents).toMatch(/Supplemental season data unavailable/);
    expect(contents).toMatch(/setSeasonSupplementalWarning\(message\)/);
  });

  it("does not block season loading on bravo\/fandom supplemental requests", () => {
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/void Promise\.allSettled\(\[fetchSeasonBravoVideos\(\), fetchSeasonFandomData\(\)\]\)/);
    expect(contents).not.toMatch(/await Promise\.all\(\[fetchSeasonBravoVideos\(\), fetchSeasonFandomData\(\)\]\)/);
  });
});
