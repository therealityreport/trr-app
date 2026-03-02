import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("season episode focus runtime wiring", () => {
  it("wires focusEpisode query to row highlighting and scroll", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
      ),
      "utf8",
    );

    expect(source).toContain('searchParams.get("focusEpisode")');
    expect(source).toContain("scrollIntoView");
    expect(source).toContain("data-focused");
    expect(source).toContain("focusedEpisodeId");
  });
});
