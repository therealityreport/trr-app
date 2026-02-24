import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show page tab order wiring", () => {
  it("keeps settings as the last show-level tab", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    const expectedOrder = [
      '{ id: "details", label: "Overview" }',
      '{ id: "seasons", label: "Seasons" }',
      '{ id: "assets", label: "Assets" }',
      '{ id: "news", label: "News" }',
      '{ id: "cast", label: "Cast" }',
      '{ id: "surveys", label: "Surveys" }',
      '{ id: "social", label: "Social" }',
      '{ id: "settings", label: "Settings" }',
    ];

    let previousIndex = -1;
    for (const token of expectedOrder) {
      const currentIndex = contents.indexOf(token);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }
  });
});
