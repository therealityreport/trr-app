import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season gallery lightbox wiring", () => {
  it("wires metadataExtras and refresh controls for season asset lightbox", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/metadataExtras=\{/);
    expect(contents).toMatch(/<GalleryAssetEditTools/);
    expect(contents).toMatch(/onRefresh=\{\(\) => refreshAssetPipeline\(assetLightbox\.asset\)\}/);
    expect(contents).toMatch(/canManage=\{true\}/);
  });

  it("keeps episode lightbox in manage shell with disabled tooling fallback", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/episodeLightbox && \(/);
    expect(contents).toMatch(/metadata=\{mapEpisodeToMetadata/);
    expect(contents).toMatch(/metadataExtras=\{/);
    expect(contents).toMatch(/actionDisabledReasons=\{/);
  });
});

