import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("cast incremental render wiring", () => {
  const showPath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const seasonPath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
  );
  const showContents = fs.readFileSync(showPath, "utf8");
  const seasonContents = fs.readFileSync(seasonPath, "utf8");

  it("limits show cast render and appends in batches", () => {
    expect(showContents).toMatch(/CAST_INCREMENTAL_INITIAL_LIMIT = 48/);
    expect(showContents).toMatch(/CAST_INCREMENTAL_BATCH_SIZE = 48/);
    expect(showContents).toMatch(/visibleCastGalleryMembers = useMemo/);
    expect(showContents).toMatch(/visibleCrewGalleryMembers = useMemo/);
    expect(showContents).toMatch(/renderedCastCount = visibleCastGalleryMembers\.length/);
    expect(showContents).toMatch(/renderedCrewCount = visibleCrewGalleryMembers\.length/);
    expect(showContents).toMatch(/renderedVisibleCount = renderedCastCount \+ renderedCrewCount/);
    expect(showContents).toMatch(/requestIdleCallback/);
    expect(showContents).toMatch(/Rendering \$\{rendered\.toLocaleString\(\)\}\/\$\{total\.toLocaleString\(\)\}/);
    expect(showContents).toMatch(/aria-pressed=\{active\}/);
    expect(showContents).toMatch(/role=\"status\" aria-live=\"polite\"/);
  });

  it("limits season cast render and appends in batches", () => {
    expect(seasonContents).toMatch(/SEASON_CAST_INCREMENTAL_INITIAL_LIMIT = 48/);
    expect(seasonContents).toMatch(/SEASON_CAST_INCREMENTAL_BATCH_SIZE = 48/);
    expect(seasonContents).toMatch(/visibleCastSeasonMembers = useMemo/);
    expect(seasonContents).toMatch(/visibleCrewSeasonMembers = useMemo/);
    expect(seasonContents).toMatch(/renderedCastCount = visibleCastSeasonMembers\.length/);
    expect(seasonContents).toMatch(/renderedCrewCount = visibleCrewSeasonMembers\.length/);
    expect(seasonContents).toMatch(/renderedVisibleCount = renderedCastCount \+ renderedCrewCount/);
    expect(seasonContents).toMatch(/requestIdleCallback/);
    expect(seasonContents).toMatch(/Rendering \$\{rendered\.toLocaleString\(\)\}\/\$\{total\.toLocaleString\(\)\}/);
    expect(seasonContents).toMatch(/aria-pressed=\{active\}/);
    expect(seasonContents).toMatch(/role=\"status\" aria-live=\"polite\"/);
  });
});
