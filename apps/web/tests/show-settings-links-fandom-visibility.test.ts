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

  it("renders overview metadata sections and keeps cast announcements out of show-wide external IDs", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/External IDs/);
    expect(contents).toMatch(/Social Handles/);
    expect(contents).toMatch(/Season URL Coverage/);
    expect(contents).toMatch(/link\.link_kind !== "cast_announcement"/);
  });
});
