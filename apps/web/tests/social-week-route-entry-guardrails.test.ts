import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(__dirname, "../src/app");
const WEEK_ROUTE_DIRS = [
  path.join(
    APP_ROOT,
    "admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week",
  ),
  path.join(APP_ROOT, "shows/[showId]/seasons/[seasonNumber]/social/week"),
];

const EXPECTED_SHARED_IMPORT =
  "@/components/admin/social-week/WeekDetailPageView";

function collectFilesRecursively(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursively(entryPath));
      continue;
    }
    results.push(entryPath);
  }
  return results;
}

describe("social week route entry guardrails", () => {
  it("prevents route-entry regressions in week route tree", () => {
    const routeFiles = WEEK_ROUTE_DIRS.flatMap((dir) =>
      collectFilesRecursively(dir).filter((filePath) => filePath.endsWith(".tsx")),
    );
    expect(routeFiles.length).toBeGreaterThan(0);

    for (const filePath of routeFiles) {
      const contents = fs.readFileSync(filePath, "utf8");

      const hasSsrFalseDynamic =
        /from\s+["']next\/dynamic["']/.test(contents) &&
        /ssr:\s*false/.test(contents);
      expect(
        hasSsrFalseDynamic,
        `disallowed next/dynamic ssr:false in ${filePath}`,
      ).toBe(false);

      const hasPageToPageImportOrReExport =
        /from\s+["'](?:\.\.?\/.*\/page|@\/app\/.*\/page)["']/.test(contents);
      expect(
        hasPageToPageImportOrReExport,
        `disallowed page-to-page import/re-export in ${filePath}`,
      ).toBe(false);
    }
  });

  it("keeps all week entry pages as static wrappers to the shared view", () => {
    const entryPages = [
      path.join(
        APP_ROOT,
        "admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
      ),
      path.join(
        APP_ROOT,
        "admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/[platform]/page.tsx",
      ),
      path.join(
        APP_ROOT,
        "shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
      ),
      path.join(
        APP_ROOT,
        "shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/[platform]/page.tsx",
      ),
    ];

    for (const pagePath of entryPages) {
      const contents = fs.readFileSync(pagePath, "utf8");
      expect(contents).toMatch(new RegExp(`from ["']${EXPECTED_SHARED_IMPORT}["']`));
      expect(contents).toMatch(/return <WeekDetailPageView \/>;/);
    }
  });
});
