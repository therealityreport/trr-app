import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("bravo video thumbnail sync wiring", () => {
  it("wires show page videos tab to thumbnail sync and hosted-first rendering", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{requestShowId\}\/bravo\/videos\/sync-thumbnails/);
    expect(contents).toMatch(/resolveBravoVideoThumbnailUrl/);
    expect(contents).toMatch(/syncThumbnails:\s*activeTab === "assets" && assetsView === "videos"/);
  });

  it("wires season page videos tab to thumbnail sync and hosted-first rendering", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{requestShowId\}\/bravo\/videos\/sync-thumbnails/);
    expect(contents).toMatch(/resolveBravoVideoThumbnailUrl/);
    expect(contents).toMatch(/fetchSeasonBravoVideos\(\{\s*forceSync:\s*true\s*\}\)/);
  });

  it("wires person page videos tab to thumbnail sync and hosted-first rendering", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/people/[personId]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{showIdForApi\}\/bravo\/videos\/sync-thumbnails/);
    expect(contents).toMatch(/resolveBravoVideoThumbnailUrl/);
    expect(contents).toMatch(/fetchBravoVideos\(\{\s*forceSync:\s*true\s*\}\)/);
  });
});
