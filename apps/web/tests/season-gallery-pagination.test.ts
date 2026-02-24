import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season gallery pagination wiring", () => {
  it("uses paginated gallery fetching with truncation metadata and warning", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toContain("fetchAllPaginatedGalleryRowsWithMeta");
    expect(contents).toContain("const SEASON_ASSET_PAGE_SIZE = 500;");
    expect(contents).toContain("const SEASON_ASSET_MAX_PAGES = 30;");
    expect(contents).toContain("setAssetsTruncatedWarning(");
    expect(contents).toContain("Showing first ${result.rows.length} assets due to pagination cap. Narrow filters to refine.");
    expect(contents).toMatch(
      /\/api\/admin\/trr-api\/shows\/\$\{showId\}\/seasons\/\$\{seasonNumber\}\/assets\?limit=\$\{limit\}&offset=\$\{offset\}/
    );
  });
});
