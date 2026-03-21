import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("person credits show-scope wiring", () => {
  it("renders grouped show accordions with cast and crew sections", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/>Cast<\/h5>/);
    expect(contents).toMatch(/>Crew<\/h5>/);
    expect(contents).toMatch(/creditsByShow\.map\(\(showGroup\) =>/);
    expect(contents).toMatch(/Open Show/);
    expect(contents).toMatch(/formatCreditsGroupSummary\(showGroup\)/);
    expect(contents).toMatch(/showGroup\.cast_groups\.map/);
    expect(contents).toMatch(/showGroup\.crew_groups\.map/);
    expect(contents).toMatch(/formatEpisodeCountLabel\(/);
    expect(contents).toMatch(/formatEpisodeCode\(/);
    expect(contents).toMatch(/Season \{seasonLabel\} • \{formatEpisodeCountLabel\(season\.episode_count\)\}/);
    expect(contents).toMatch(/buildShowAdminUrl\(\{ showSlug: backShowTarget \}\)/);
    expect(contents).toMatch(/buildPersonBreadcrumb\(person\.full_name, \{/);
    expect(contents).toMatch(/showHref: breadcrumbShowHref/);
  });
});
