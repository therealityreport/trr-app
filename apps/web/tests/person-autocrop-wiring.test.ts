import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("person auto-crop wiring", () => {
  it("wires Auto-Crop stage through base + crop variants with fallback payload", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/people/[personId]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const buildThumbnailCropPayloadWithFallback/);
    expect(contents).toMatch(/runPhotoAutoCropStage/);
    expect(contents).toMatch(/\$\{basePrefix\}\/variants/);
    expect(contents).toMatch(/crop:\s*cropPayload/);
    expect(contents).toMatch(/Image auto-crop complete\./);
  });

  it("triggers preview auto-crop rebuild on star-on and facebank-seed-on", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/people/[personId]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/if \(starred\) \{\s*triggerPreviewAutoCropRebuild\(photo, "star_auto_crop"\);/);
    expect(contents).toMatch(/if \(payload\.facebankSeed && matchedPhoto\) \{\s*triggerPreviewAutoCropRebuild\(matchedPhoto, "facebank_seed_auto_crop"\);/);
    expect(contents).toMatch(/Auto-Crop/);
  });
});
