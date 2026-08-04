import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show media gallery section visibility", () => {
  it("keeps only allowed sections in show media gallery render", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");
    const assetsTabPath = path.resolve(
      __dirname,
      "../src/components/admin/show-tabs/ShowAssetsTab.tsx"
    );
    const assetsTabContents = fs.readFileSync(assetsTabPath, "utf8");
    const renderedContents = `${contents}\n${assetsTabContents}`;

    expect(contents).toContain("const SHOW_GALLERY_ALLOWED_SECTIONS: AssetSectionKey[] = [");
    expect(contents).toContain("\"cast_photos\"");
    expect(contents).toContain("\"profile_pictures\"");
    expect(contents).toContain("\"banners\"");
    expect(contents).toContain("\"posters\"");
    expect(contents).toContain("\"backdrops\"");
    expect(renderedContents).not.toMatch(/<h4[^>]*>\s*Episode Stills\s*<\/h4>/);
    expect(renderedContents).not.toMatch(/<h4[^>]*>\s*Confessionals\s*<\/h4>/);
    expect(renderedContents).not.toMatch(/<h4[^>]*>\s*Reunion\s*<\/h4>/);
    expect(renderedContents).not.toMatch(/<h4[^>]*>\s*Intro Card\s*<\/h4>/);
  });
});
