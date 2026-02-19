import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season page error/reset guards", () => {
  it("resets critical season state slices when loadSeasonData fails", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/setSeason\(null\)/);
    expect(contents).toMatch(/setEpisodes\(\[\]\)/);
    expect(contents).toMatch(/setAssets\(\[\]\)/);
    expect(contents).toMatch(/setCast\(\[\]\)/);
    expect(contents).toMatch(/setArchiveCast\(\[\]\)/);
  });

  it("renders explicit unauthorized fallback instead of returning null", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/Admin access required/);
    expect(contents).not.toMatch(/if \(!user \|\| !hasAccess\) {\s*return null;/);
  });
});

