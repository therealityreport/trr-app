import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show social subnav no-season behavior", () => {
  it("gates platform tab nav behind selectedSocialSeason", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/\{selectedSocialSeason \? \(/);
    expect(contents).toMatch(/Platform tabs are available after selecting a season/);
    expect(contents).toMatch(/<SocialPostsSection/);
  });
});

