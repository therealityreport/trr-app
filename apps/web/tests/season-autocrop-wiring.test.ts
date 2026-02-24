import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season auto-crop wiring", () => {
  it("uses Auto-Crop labels and crop fallback payload in image pipeline", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/resize:\s*"Auto-Crop"/);
    expect(contents).toMatch(/Variants \(Auto-Crop\)/);
    expect(contents).toMatch(/buildAssetAutoCropPayloadWithFallback/);
    expect(contents).toMatch(/strategy:\s*"resize_center_fallback_v1"/);
  });

  it("rebuilds preview auto-crop variants when star is toggled on", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const triggerGalleryAssetAutoCrop/);
    expect(contents).toMatch(/if \(starred\) \{\s*void triggerGalleryAssetAutoCrop\(asset\);/);
  });
});
