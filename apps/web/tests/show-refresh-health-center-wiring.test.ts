import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show refresh health center wiring", () => {
  const showPagePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const seasonPagePath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
  );
  const showPage = fs.readFileSync(showPagePath, "utf8");
  const seasonPage = fs.readFileSync(seasonPagePath, "utf8");

  it("routes show refresh through the health center modal with unified backend stages", () => {
    expect(showPage).toMatch(/const FULL_SHOW_REFRESH_TARGETS: ShowRefreshTarget\[] = \[/);
    expect(showPage).toMatch(/"show_core"/);
    expect(showPage).toMatch(/"links"/);
    expect(showPage).toMatch(/"bravo"/);
    expect(showPage).toMatch(/"cast_profiles"/);
    expect(showPage).toMatch(/"cast_media"/);
    expect(showPage).toMatch(/force_new_operation: true/);
    expect(showPage).toMatch(/const refreshRunButtonLabel =/);
    expect(showPage).toMatch(/onRefresh=\{\(\) => setRefreshLogOpen\(true\)\}/);
    expect(showPage).toMatch(/preserveScrollPosition=\{true\}/);
    expect(showPage).not.toMatch(/onClick=\{\(\) => void refreshAllShowData\(\)\}/);
    expect(showPage).not.toMatch(/Refresh Links/);
    expect(showPage).not.toMatch(/Show Gallery/);
  });

  it("removes duplicate gallery headings and stale inline progress bars from season assets", () => {
    expect(seasonPage).not.toMatch(/Season Images/);
    expect(seasonPage).not.toMatch(/Season Videos/);
  });
});
