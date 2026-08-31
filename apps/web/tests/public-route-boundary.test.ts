import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ROOT_SHOW_ROUTE_RESERVED_FIRST_SEGMENTS,
  isReservedRootShowRouteFirstSegment,
} from "@/lib/public/root-show-route";

const PUBLIC_ROUTE_FILES = [
  "src/app/social-media/page.tsx",
  "src/app/shows/page.tsx",
  "src/app/shows/[showId]/page.tsx",
  "src/app/shows/[showId]/seasons/[seasonNumber]/page.tsx",
  "src/app/shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
  "src/app/shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/[platform]/page.tsx",
  "src/app/people/[personId]/[[...personTab]]/page.tsx",
  "src/app/[showId]/[[...rest]]/page.tsx",
  "src/app/[showId]/[seasonSegment]/[[...rest]]/page.tsx",
  "src/app/[showId]/social/[[...rest]]/page.tsx",
  "src/app/[showId]/s[seasonNumber]/social/w[weekIndex]/page.tsx",
  "src/app/[showId]/s[seasonNumber]/social/w[weekIndex]/[platform]/page.tsx",
  "src/app/[showId]/social/reddit/[communitySlug]/page.tsx",
  "src/app/[showId]/social/reddit/[communitySlug]/s[seasonNumber]/page.tsx",
  "src/app/[showId]/social/official/reddit/[communitySlug]/page.tsx",
  "src/app/[showId]/social/official/reddit/[communitySlug]/s[seasonNumber]/page.tsx",
  "src/app/[showId]/social/reddit/[communitySlug]/[windowKey]/page.tsx",
  "src/app/[showId]/social/reddit/[communitySlug]/s[seasonNumber]/[windowKey]/page.tsx",
  "src/app/[showId]/social/reddit/[communitySlug]/[windowKey]/post/[postId]/page.tsx",
  "src/app/[showId]/social/reddit/[communitySlug]/s[seasonNumber]/[windowKey]/post/[postId]/page.tsx",
  "src/app/[showId]/social/reddit/[communitySlug]/s[seasonNumber]/[windowKey]/[detailSlug]/page.tsx",
  "src/app/[showId]/s[seasonNumber]/social/reddit/[communitySlug]/page.tsx",
  "src/app/[showId]/s[seasonNumber]/social/reddit/[communitySlug]/[windowKey]/page.tsx",
  "src/app/[showId]/s[seasonNumber]/social/reddit/[communitySlug]/[windowKey]/[detailSlug]/page.tsx",
  "src/app/[showId]/s[seasonNumber]/social/reddit/[communitySlug]/[windowKey]/post/[postId]/page.tsx",
];

const LEGACY_ADMIN_REDDIT_SEASON_ROUTE_FILES = [
  "src/app/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/page.tsx",
  "src/app/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/page.tsx",
  "src/app/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/post/[postId]/page.tsx",
  "src/app/admin/social/reddit/[communitySlug]/[showSlug]/s[seasonNumber]/[windowKey]/[detailSlug]/page.tsx",
];

describe("public route boundary", () => {
  it("moves only the general season page and shares the reserved-root guard with proxy routing", () => {
    const appRoot = path.resolve(process.cwd(), "src/app/[showId]");
    const previousGeneralPage = path.join(appRoot, "s[seasonNumber]/[[...rest]]/page.tsx");
    const movedGeneralPage = path.join(appRoot, "[seasonSegment]/[[...rest]]/page.tsx");
    const proxySource = fs.readFileSync(path.resolve(process.cwd(), "src/proxy.ts"), "utf8");

    expect(fs.existsSync(previousGeneralPage)).toBe(false);
    expect(fs.existsSync(movedGeneralPage)).toBe(true);
    expect(proxySource).toMatch(/from ["']@\/lib\/public\/root-show-route["']/);
    expect(proxySource).toMatch(/isReservedRootShowRouteFirstSegment/);
    expect(proxySource).not.toMatch(/const ROOT_SHOW_ROUTE_RESERVED_FIRST_SEGMENTS = new Set/);
    expect(Array.from(ROOT_SHOW_ROUTE_RESERVED_FIRST_SEGMENTS)).toEqual([
      "admin",
      "api",
      "api-references",
      "auth",
      "brands",
      "bravodle",
      "dev-dashboard",
      "docs",
      "design-docs",
      "design-system",
      "games",
      "groups",
      "hub",
      "login",
      "privacy-policy",
      "people",
      "profile",
      "realations",
      "realitease",
      "screenalytics",
      "screenlaytics",
      "settings",
      "social",
      "social-media",
      "shows",
      "surveys",
      "terms-of-sale",
      "terms-of-service",
      "test-auth",
      "users",
    ]);

    for (const segment of ROOT_SHOW_ROUTE_RESERVED_FIRST_SEGMENTS) {
      expect(isReservedRootShowRouteFirstSegment(segment)).toBe(true);
      expect(isReservedRootShowRouteFirstSegment(` ${segment.toUpperCase()} `)).toBe(true);
    }
    expect(isReservedRootShowRouteFirstSegment("the-real-housewives-of-beverly-hills")).toBe(false);
  });

  it.each(PUBLIC_ROUTE_FILES)(
    "keeps %s free of admin-only imports and guards",
    (relativePath) => {
      const filePath = path.resolve(process.cwd(), relativePath);
      const source = fs.readFileSync(filePath, "utf8");

      expect(source).not.toMatch(/@\/app\/admin\//);
      expect(source).not.toMatch(/useAdminGuard/);
      expect(source).not.toMatch(/WeekDetailPageViewLoader/);
      expect(source).not.toMatch(/redirect\((["'`])\/admin\//);
    },
  );

  it.each(LEGACY_ADMIN_REDDIT_SEASON_ROUTE_FILES)(
    "keeps %s as a redirect shim instead of an admin page re-export",
    (relativePath) => {
      const filePath = path.resolve(process.cwd(), relativePath);
      const source = fs.readFileSync(filePath, "utf8");

      expect(source).toMatch(/from "next\/navigation"/);
      expect(source).toMatch(/redirect\(/);
      expect(source).not.toMatch(/export \{ default \} from "@\/app\/admin\//);
      expect(source).not.toMatch(/export \{ default \} from "@\/components\/admin\//);
    },
  );
});
