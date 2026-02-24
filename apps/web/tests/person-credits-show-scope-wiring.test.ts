import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("person credits show-scope wiring", () => {
  it("renders cast/crew sections with integrated other-show subsections", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/people/[personId]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/Cast Credits/);
    expect(contents).toMatch(/Crew Credits/);
    expect(contents).not.toMatch(/>Current Show<\/h5>/);
    expect(contents).not.toMatch(/>Other Shows<\/h5>/);
    expect(contents).not.toMatch(/<h4 className="text-base font-semibold text-zinc-900">Other Shows<\/h4>/);
    expect(contents).toMatch(/partitionOtherShowCredits\(/);
    expect(contents).toMatch(/groupCreditsByShow\(/);
    expect(contents).toMatch(/renderOtherShowCreditSummaryRow\(/);
    expect(contents).toMatch(/isSelfCreditCategory\(/);
    expect(contents).toMatch(/isCastCredit && roleLabel\.length === 0 && hasExplicitCastRole/);
    expect(contents).toMatch(/formatEpisodeCountLabel\(/);
    expect(contents).toMatch(/formatEpisodeCode\(/);
    expect(contents).toMatch(/Season \{seasonLabel\} • \{formatEpisodeCountLabel\(season\.episode_count\)\}/);
    expect(contents).toMatch(/buildShowAdminUrl\(\{ showSlug: backShowTarget \}\)/);
    expect(contents).toMatch(/buildPersonBreadcrumb\(person\.full_name, \{/);
    expect(contents).toMatch(/showHref: breadcrumbShowHref/);
  });
});
