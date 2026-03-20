import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("public route rewrites", () => {
  it("does not rewrite public social and show routes into admin pages", () => {
    const configPath = path.resolve(process.cwd(), "next.config.ts");
    const source = fs.readFileSync(configPath, "utf8");

    expect(source).not.toMatch(
      /source:\s*"\/:showId[^"]*",\s*destination:\s*"\/admin\/trr-shows[^"]*"/
    );
    expect(source).not.toMatch(
      /source:\s*"\/shows\/:showId[^"]*",\s*destination:\s*"\/admin\/trr-shows[^"]*"/
    );
    expect(source).not.toContain('{ source: "/shows", destination: "/admin/trr-shows" }');
    expect(source).not.toContain('source: "/admin/shows"');
  });
});
