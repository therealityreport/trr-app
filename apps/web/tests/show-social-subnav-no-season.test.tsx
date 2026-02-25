import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show social subnav no-season behavior", () => {
  it("gates platform tab nav behind selectedSocialSeason", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const socialTabPath = path.resolve(
      __dirname,
      "../src/components/admin/show-tabs/ShowSocialTab.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");
    const socialTabContents = fs.readFileSync(socialTabPath, "utf8");

    expect(contents).toMatch(/selectedSocialSeason=\{selectedSocialSeason\}/);
    expect(contents).toMatch(/fallbackSection=\s*{\s*<SocialPostsSection/);
    expect(socialTabContents).toMatch(/selectedSocialSeason \?/);
    expect(socialTabContents).toMatch(/Platform tabs are available after selecting a season/);
    expect(contents).toMatch(/<SocialPostsSection/);
  });
});
