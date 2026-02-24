import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string): string =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

describe("gallery fallback telemetry wiring", () => {
  it("tracks recovered/failed/attempted telemetry on show, season, and person pages", () => {
    const showContents = read("../src/app/admin/trr-shows/[showId]/page.tsx");
    const seasonContents = read("../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx");
    const personContents = read("../src/app/admin/trr-shows/people/[personId]/page.tsx");

    for (const contents of [showContents, seasonContents, personContents]) {
      expect(contents).toContain("fallbackRecoveredCount");
      expect(contents).toContain("allCandidatesFailedCount");
      expect(contents).toContain("totalImageAttempts");
    }

    expect(showContents).toContain("Fallback diagnostics:");
    expect(seasonContents).toContain("Fallback diagnostics:");
    expect(personContents).toContain("Fallback diagnostics:");
  });
});
