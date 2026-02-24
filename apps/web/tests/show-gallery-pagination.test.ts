import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show gallery pagination wiring", () => {
  it("uses paginated gallery fetching with truncation metadata and warning", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toContain("fetchAllPaginatedGalleryRowsWithMeta");
    expect(contents).toContain("const GALLERY_ASSET_PAGE_SIZE = 500;");
    expect(contents).toContain("const GALLERY_ASSET_MAX_PAGES = 30;");
    expect(contents).toContain("setGalleryTruncatedWarning(");
    expect(contents).toContain("Showing first ${dedupedAssets.length} assets due to pagination cap. Narrow filters to refine.");
    expect(contents).toMatch(/fetchAllAssetRows\(`\/api\/admin\/trr-api\/shows\/\$\{showId\}\/assets`\)/);
  });
});
