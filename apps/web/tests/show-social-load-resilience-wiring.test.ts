import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show social load resilience wiring", () => {
  const pagePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const socialTabPath = path.resolve(__dirname, "../src/components/admin/show-tabs/ShowSocialTab.tsx");
  const showIdentityControllerPath = path.resolve(
    __dirname,
    "../src/lib/admin/show-page/use-show-identity-load.ts"
  );
  const showDetailsControllerPath = path.resolve(
    __dirname,
    "../src/lib/admin/show-page/use-show-details-controller.ts"
  );
  const showCoverageControllerPath = path.resolve(
    __dirname,
    "../src/lib/admin/show-page/use-show-coverage.ts"
  );

  it("tracks social dependency errors separately from global page error", () => {
    const pageContents = fs.readFileSync(pagePath, "utf8");
    const identityContents = fs.readFileSync(showIdentityControllerPath, "utf8");
    const socialTabContents = fs.readFileSync(socialTabPath, "utf8");

    expect(pageContents).toMatch(/socialDependencyError/);
    expect(identityContents).toMatch(/socialDependencyError,/);
    expect(identityContents).toMatch(/setSocialDependencyError,/);
    expect(socialTabContents).toMatch(/Social dependency warning:/);
    expect(socialTabContents).toMatch(/Showing available social data\./);
  });

  it("uses timeout-protected fetches for core show loading paths", () => {
    const pageContents = fs.readFileSync(pagePath, "utf8");
    const identityContents = fs.readFileSync(showIdentityControllerPath, "utf8");
    const coverageContents = fs.readFileSync(showCoverageControllerPath, "utf8");

    expect(pageContents).toMatch(/useShowIdentityLoad/);
    expect(pageContents).toMatch(/useShowCoverage/);
    expect(pageContents).toMatch(/useShowDetailsController/);
    expect(pageContents).not.toMatch(/adminGetJson<\{ show\?: TrrShow \}>/);
    expect(pageContents).not.toMatch(/\/api\/admin\/covered-shows\/\$\{requestShowId\}/);
    expect(identityContents).toMatch(/SHOW_CORE_LOAD_TIMEOUT_MS/);
    expect(identityContents).toMatch(/adminGetJson<\{ show\?: TShow \}>/);
    expect(identityContents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{requestShowId\}/);
    expect(identityContents).toMatch(/adminGetJson<\{ seasons\?: TSeason\[] \}>/);
    expect(identityContents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{requestShowId\}\/seasons\?limit=50&include_episode_signal=true/);
    expect(identityContents).toMatch(/timeoutMs:\s*SHOW_CORE_LOAD_TIMEOUT_MS/);
    expect(coverageContents).toMatch(/\/api\/admin\/covered-shows\/\$\{requestShowId\}/);
  });

  it("does not fail close the page when season dependency fetches degrade", () => {
    const contents = fs.readFileSync(showIdentityControllerPath, "utf8");
    const fetchSeasonsCatch =
      contents.match(/const fetchSeasons[\s\S]*?catch \(err\) \{([\s\S]*?)\n\s*\}\n\s*\}, \[/)?.[1] ?? "";

    expect(fetchSeasonsCatch).toContain("setSocialDependencyError(message)");
    expect(fetchSeasonsCatch).not.toContain("setError(message)");
    expect(contents).toMatch(/Promise\.allSettled\(\[/);
    expect(fs.readFileSync(pagePath, "utf8")).toMatch(/loadShowIdentity\(\[checkCoverage\]\)/);
  });

  it("skips expensive season episode summary fanout while social tab is active", () => {
    const contents = fs.readFileSync(pagePath, "utf8");

    expect(contents).toMatch(/if \(activeTab !== "seasons"\) return;/);
    expect(contents).toMatch(/const missingSummaries = seasons\.filter\(\(season\) => !buildSeasonEpisodeSummary\(season\)\);/);
  });

  it("batches season episode summary failures into a single warning", () => {
    const contents = fs.readFileSync(pagePath, "utf8");

    expect(contents).toMatch(/Season episode summaries unavailable for/);
    expect(contents).not.toMatch(/console\.error\("Failed to fetch season episodes:"/);
  });

  it("disables external clearbit logo lookups in non-production mode", () => {
    const contents = fs.readFileSync(pagePath, "utf8");

    expect(contents).toMatch(/if \(process\.env\.NODE_ENV !== "production"\) \{/);
    expect(contents).toMatch(/return null;/);
  });
});
