import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show gallery delete wiring", () => {
  it("wires delete actions into the show-level gallery lightbox for web_scrape assets", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(
      /canManage=\{assetLightbox\.asset\.source\?\.(?:toLowerCase\?\.\(\))?\.startsWith\(\"web_scrape:/,
    );
    expect(contents).toMatch(/onDelete=\{async\s*\(\)\s*=>/);
    expect(contents).toMatch(/\/api\/admin\/trr-api\/media-assets\/\$\{asset\.id\}/);
  });
});

