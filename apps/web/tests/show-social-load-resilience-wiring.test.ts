import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show social load resilience wiring", () => {
  const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");

  it("tracks social dependency errors separately from global page error", () => {
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const \[socialDependencyError, setSocialDependencyError\]/);
    expect(contents).toMatch(/Social dependency warning:/);
    expect(contents).toMatch(/Showing available social data\./);
  });

  it("uses timeout-protected fetches for core show loading paths", () => {
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/SHOW_CORE_LOAD_TIMEOUT_MS/);
    expect(contents).toMatch(/adminGetJson<\{ show\?: TrrShow \}>/);
    expect(contents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{requestShowId\}/);
    expect(contents).toMatch(/adminGetJson<\{ seasons\?: TrrSeason\[] \}>/);
    expect(contents).toMatch(/\/api\/admin\/trr-api\/shows\/\$\{requestShowId\}\/seasons\?limit=50/);
    expect(contents).toMatch(/adminGetJson\(/);
    expect(contents).toMatch(/\/api\/admin\/covered-shows\/\$\{requestShowId\}/);
    expect(contents).toMatch(/timeoutMs:\s*SHOW_CORE_LOAD_TIMEOUT_MS/);
  });

  it("does not fail close the page when season dependency fetches degrade", () => {
    const contents = fs.readFileSync(filePath, "utf8");
    const fetchSeasonsCatch =
      contents.match(/const fetchSeasons[\s\S]*?catch \(err\) \{([\s\S]*?)\n\s*\}\n\s*\}, \[getAuthHeaders/)?.[1] ?? "";

    expect(fetchSeasonsCatch).toContain("setSocialDependencyError(message)");
    expect(fetchSeasonsCatch).not.toContain("setError(message)");
    expect(contents).toMatch(/Promise\.allSettled\(\[fetchSeasons\(\), checkCoverage\(\)\]\)/);
  });

  it("skips expensive season episode summary fanout while social tab is active", () => {
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/if \(activeTab !== "seasons"\) return;/);
  });

  it("batches season episode summary failures into a single warning", () => {
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/Season episode summaries unavailable for/);
    expect(contents).not.toMatch(/console\.error\("Failed to fetch season episodes:"/);
  });

  it("disables external clearbit logo lookups in non-production mode", () => {
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/if \(process\.env\.NODE_ENV !== "production"\) \{/);
    expect(contents).toMatch(/return null;/);
  });
});
