import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("public route rewrites", () => {
  it("does not rewrite public social and show routes into admin pages", () => {
    const configPath = path.resolve(process.cwd(), "next.config.ts");
    const source = fs.readFileSync(configPath, "utf8");

    expect(source).not.toContain('source: "/:showId/s:seasonNumber(\\\\d+)/social/w:weekIndex(\\\\d+)"');
    expect(source).not.toContain('source: "/:showId/s:seasonNumber(\\\\d+)/social/w:weekIndex(\\\\d+)/:platform"');
    expect(source).not.toContain('source: "/:showId/social/reddit/:communitySlug"');
    expect(source).not.toContain('source: "/:showId/social/reddit/:communitySlug/s:seasonNumber(\\\\d+)"');
    expect(source).not.toContain('source: "/:showId/s:seasonNumber(\\\\d+)"');
    expect(source).not.toContain('{ source: "/shows", destination: "/admin/trr-shows" }');
    expect(source).not.toContain('source: "/admin/shows"');
    expect(source).not.toContain('source: "/admin/trr-shows"');
  });
});
