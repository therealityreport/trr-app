import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show page modularization wiring", () => {
  it("uses extracted show page local components", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/import \{ ShowTabsNav \} from "@\/components\/admin\/show-tabs\/ShowTabsNav"/);
    expect(contents).toMatch(/import \{ ShowSeasonCards \} from "@\/components\/admin\/show-tabs\/ShowSeasonCards"/);
    expect(contents).toMatch(/import \{ ShowAssetsImageSections \} from "@\/components\/admin\/show-tabs\/ShowAssetsImageSections"/);
    expect(contents).toMatch(/<ShowTabsNav/);
    expect(contents).toMatch(/<ShowSeasonCards/);
    expect(contents).toMatch(/<ShowAssetsImageSections/);
  });

  it("keeps show season chip tabs ordered with overview first", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    const expectedOrder = [
      '{ tab: "overview", label: "Overview" }',
      '{ tab: "episodes", label: "Seasons & Episodes" }',
      '{ tab: "assets", label: "Assets" }',
      '{ tab: "videos", label: "Videos" }',
      '{ tab: "fandom", label: "Fandom" }',
      '{ tab: "cast", label: "Cast" }',
      '{ tab: "surveys", label: "Surveys" }',
      '{ tab: "social", label: "Social Media" }',
    ];

    let previousIndex = -1;
    for (const token of expectedOrder) {
      const currentIndex = contents.indexOf(token);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }
  });

  it("keeps featured badges in extracted poster/backdrop asset sections", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/_components/ShowAssetsImageSections.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/featuredBackdropImageId === asset\.id/);
    expect(contents).toMatch(/featuredPosterImageId === asset\.id/);
    expect(contents).toMatch(/Featured/);
  });
});
