import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show settings links fandom visibility", () => {
  it("renders show pages section from persisted links and includes fandom copy", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/title: "Show Pages"/);
    expect(contents).toMatch(/Show wiki\/fandom pages/);
    expect(contents).toMatch(/links: sortLinks\(showPageLinks\)/);
    expect(contents).toMatch(/No links in this category yet\./);
  });
});
