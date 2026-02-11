import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("person gallery thumbnail wiring", () => {
  it("uses 4:5 cards and computed thumbnail positioning", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/people/[personId]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    const aspectCount = contents.match(/aspect-\[4\/5\]/g)?.length ?? 0;
    expect(aspectCount).toBeGreaterThanOrEqual(2);
    expect(contents).toMatch(/resolveThumbnailPresentation\(/);
    expect(contents).toMatch(/objectPosition:\s*presentation\.objectPosition/);
    expect(contents).toMatch(/transform:\s*presentation\.zoom/);
  });
});
