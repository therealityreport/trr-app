import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("trr shows repository person crop scope", () => {
  it("uses media_links context thumbnail_crop as source-of-truth for person gallery crop fields", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/lib/server/trr-api/trr-shows-repository.ts",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const contextThumbnailCrop =[\s\S]*?thumbnail_crop/);
    expect(contents).toMatch(/const thumbnailCropFields = toThumbnailCropFields\(contextThumbnailCrop\);/);
    expect(contents).not.toMatch(/contextThumbnailCrop \?\? metadataThumbnailCrop/);
  });
});
