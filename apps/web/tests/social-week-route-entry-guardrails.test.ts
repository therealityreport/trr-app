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
  path.join(APP_ROOT, "[showId]/s[seasonNumber]/social/w[weekIndex]"),
];

const EXPECTED_SHARED_IMPORT = "@/components/admin/social-week/WeekDetailPageViewLoader";
const EXPECTED_PUBLIC_IMPORT = "@/components/public/PublicRouteShell";

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

  it("keeps admin week entry pages as shared-loader wrappers", () => {
    const adminEntryPages = [
      path.join(
        APP_ROOT,
        "admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
      ),
      path.join(
        APP_ROOT,
        "admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/[platform]/page.tsx",
      ),
    ];

    for (const pagePath of adminEntryPages) {
      const contents = fs.readFileSync(pagePath, "utf8");
      expect(contents).toMatch(new RegExp(`from ["']${EXPECTED_SHARED_IMPORT}["']`));
      expect(contents).toMatch(/return <WeekDetailPageViewLoader \/>;/);
      expect(contents).toMatch(/export const dynamic = "force-dynamic";/);
    }
  });

  it("keeps public week entry pages behind the public route shell boundary", () => {
    const publicEntryPages = [
      path.join(
        APP_ROOT,
        "shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
      ),
      path.join(
        APP_ROOT,
        "shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/[platform]/page.tsx",
      ),
      path.join(
        APP_ROOT,
        "[showId]/s[seasonNumber]/social/w[weekIndex]/page.tsx",
      ),
      path.join(
        APP_ROOT,
        "[showId]/s[seasonNumber]/social/w[weekIndex]/[platform]/page.tsx",
      ),
    ];

    for (const pagePath of publicEntryPages) {
      const contents = fs.readFileSync(pagePath, "utf8");
      expect(contents).toMatch(new RegExp(`from ["']${EXPECTED_PUBLIC_IMPORT}["']`));
      expect(contents).toMatch(/export const dynamic = "force-dynamic";/);
      expect(contents).toMatch(/PublicRouteShell/);
      expect(contents).toMatch(/no longer lazy-loads|without importing the admin weekly detail loader/i);
    }
  });

  it("forces dynamic rendering for root show alias layouts used by social week routes", () => {
    const layoutPaths = [
      path.join(APP_ROOT, "[showId]/layout.tsx"),
      path.join(APP_ROOT, "[showId]/s[seasonNumber]/layout.tsx"),
    ];

    for (const layoutPath of layoutPaths) {
      const contents = fs.readFileSync(layoutPath, "utf8");
      expect(contents).toMatch(/export const dynamic = "force-dynamic";/);
      expect(contents).toMatch(/export const revalidate = 0;/);
    }
  });
});
