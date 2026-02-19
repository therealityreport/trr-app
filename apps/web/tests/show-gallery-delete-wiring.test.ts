import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show gallery delete wiring", () => {
  it("wires full manage parity into the show-level gallery lightbox", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/canManage=\{true\}/);
    expect(contents).toMatch(/metadataExtras=\{/);
    expect(contents).toMatch(/<GalleryAssetEditTools/);
    expect(contents).toMatch(/onRefresh=\{\(\) => refreshGalleryAssetPipeline\(assetLightbox\.asset\)\}/);
    expect(contents).toMatch(/onDelete=\{\(\) => deleteGalleryAsset\(assetLightbox\.asset\)\}/);
  });
});
