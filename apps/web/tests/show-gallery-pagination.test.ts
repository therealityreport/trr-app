import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show gallery pagination wiring", () => {
  it("uses full-fetch gallery endpoints with truncation metadata and warning", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).not.toContain("fetchAllPaginatedGalleryRowsWithMeta");
    expect(contents).not.toContain("const GALLERY_ASSET_PAGE_SIZE = 500;");
    expect(contents).not.toContain("const GALLERY_ASSET_MAX_PAGES = 30;");
    expect(contents).toContain("setGalleryTruncatedWarning(");
    expect(contents).toContain("pagination?.truncated");
    expect(contents).toContain("Showing first ${dedupedAssets.length} assets due to pagination cap. Narrow filters to refine.");
    expect(contents).toContain("/api/admin/trr-api/shows/${showId}/assets?full=1");
    expect(contents).toContain("/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/assets?full=1");
  });
});
