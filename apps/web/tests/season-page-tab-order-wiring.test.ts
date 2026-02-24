import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season page tab order wiring", () => {
  it("keeps overview as the first tab and preserves required order", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    const expectedOrder = [
      '{ id: "overview", label: "Overview" }',
      '{ id: "episodes", label: "Seasons & Episodes" }',
      '{ id: "assets", label: "Assets" }',
      '{ id: "videos", label: "Videos" }',
      '{ id: "fandom", label: "Fandom" }',
      '{ id: "cast", label: "Cast" }',
      '{ id: "surveys", label: "Surveys" }',
      '{ id: "social", label: "Social Media" }',
    ];

    let previousIndex = -1;
    for (const token of expectedOrder) {
      const currentIndex = contents.indexOf(token);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }
  });

  it("uses overview as the default season tab state", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/useState<TabId>\("overview"\)/);
    expect(contents).toMatch(/activeTab === "overview"/);
  });

  it("passes showHref so the show breadcrumb segment is clickable", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/buildSeasonBreadcrumb\(show\.name,\s*season\.season_number,\s*\{/);
    expect(contents).toMatch(/showHref:\s*buildShowAdminUrl\(\{\s*showSlug:\s*showSlugForRouting\s*\}\)/);
  });
});
