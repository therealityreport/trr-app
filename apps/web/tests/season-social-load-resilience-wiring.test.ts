import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season social load resilience wiring", () => {
  const filePath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
  );
  const socialTabPath = path.resolve(
    __dirname,
    "../src/components/admin/season-tabs/SeasonSocialTab.tsx",
  );

  it("keeps a supplemental warning channel for optional season data", () => {
    const contents = fs.readFileSync(filePath, "utf8");
    const socialTabContents = fs.readFileSync(socialTabPath, "utf8");

    expect(contents).toMatch(/const \[seasonSupplementalWarning, setSeasonSupplementalWarning\]/);
    expect(socialTabContents).toMatch(/seasonSupplementalWarning/);
    expect(socialTabContents).toMatch(/Season supplemental data warning:/);
    expect(socialTabContents).toMatch(/Social analytics remains available\./);
  });

  it("separates core failure from optional season data failure", () => {
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/try \{[\s\S]*setSeason\(foundSeason\);[\s\S]*void \(async \(\) => \{/);
    expect(contents).toMatch(/Supplemental season data unavailable/);
    expect(contents).toMatch(/setSeasonSupplementalWarning\(message\)/);
  });

  it("does not block season loading on supplemental requests", () => {
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/void \(async \(\) => \{/);
    expect(contents).toMatch(/const \[episodesResponse, castResponse\] = await Promise\.all\(\[/);
    expect(contents).toMatch(
      /useEffect\(\(\) => \{[\s\S]*activeTab !== "fandom"[\s\S]*void fetchSeasonFandomData\(\);/
    );
    expect(contents).toMatch(
      /useEffect\(\(\) => \{[\s\S]*activeTab !== "videos"[\s\S]*void fetchSeasonBravoVideos\(\{ signal: controller\.signal \}\);/
    );
    expect(contents).not.toMatch(
      /await Promise\.allSettled\(\[fetchSeasonBravoVideos\(\), fetchSeasonFandomData\(\)\]\)/
    );
  });
});
