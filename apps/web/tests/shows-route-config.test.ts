import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

type RouteRule = {
  source: string;
  destination: string;
  permanent?: boolean;
};

type RewriteConfig =
  | RouteRule[]
  | {
      beforeFiles?: RouteRule[];
      afterFiles?: RouteRule[];
      fallback?: RouteRule[];
    };

async function getRedirects(): Promise<RouteRule[]> {
  return nextConfig.redirects ? ((await nextConfig.redirects()) as RouteRule[]) : [];
}

async function getBeforeFileRewrites(): Promise<RouteRule[]> {
  if (!nextConfig.rewrites) return [];
  const rewrites = (await nextConfig.rewrites()) as RewriteConfig;
  return Array.isArray(rewrites) ? rewrites : rewrites.beforeFiles ?? [];
}

function routePatternToRegExp(source: string): RegExp {
  const pattern = source
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.endsWith("*")) {
        return "(?:/.*)?";
      }
      const prefixedParam = segment.match(/^([a-z]+):[a-zA-Z0-9_]+(?:\((.*)\))?$/);
      if (prefixedParam) {
        return `/${prefixedParam[1]}${prefixedParam[2] ? `(${prefixedParam[2].replace(/\\\\/g, "\\")})` : "([^/]+)"}`;
      }
      if (segment.startsWith(":")) {
        const paramPattern = segment.match(/^:[a-zA-Z0-9_]+(?:\((.*)\))?$/)?.[1];
        return `/${paramPattern ? `(${paramPattern.replace(/\\\\/g, "\\")})` : "([^/]+)"}`;
      }
      return `/${segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
    })
    .join("");
  return new RegExp(`^${pattern || "/"}$`);
}

describe("shows route config", () => {
  it("does not redirect canonical /shows detail paths to root show paths", async () => {
    const redirects = await getRedirects();

    expect(redirects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: expect.stringMatching(/^\/shows\/:showId/),
          destination: expect.stringMatching(/^\/:showId/),
        }),
      ]),
    );
  });

  it.each([
    "/shows/rhoslc",
    "/shows/rhoslc/social",
    "/shows/rhoslc/s6/social",
    "/shows/rhoslc/s6/social/week/0",
    "/shows/rhoslc/s6/social/week/0/instagram",
  ])("does not issue a static 307 redirect for %s", async (pathname) => {
    const redirects = await getRedirects();
    const matchingRedirects = redirects.filter((rule) => routePatternToRegExp(rule.source).test(pathname));

    expect(matchingRedirects).toEqual([]);
  });

  it("keeps /shows/* tab and season aliases as canonical before-file rewrites", async () => {
    const rewrites = await getBeforeFileRewrites();

    expect(rewrites).toEqual(
      expect.arrayContaining([
        { source: "/shows/:showId/overview", destination: "/shows/:showId?tab=details" },
        { source: "/shows/:showId/settings", destination: "/shows/:showId?tab=settings" },
        { source: "/shows/:showId/social", destination: "/shows/:showId?tab=social&social_view=official" },
        { source: "/shows/:showId/s:seasonNumber", destination: "/shows/:showId/seasons/:seasonNumber" },
        {
          source: "/shows/:showId/s:seasonNumber/social",
          destination: "/shows/:showId/seasons/:seasonNumber?tab=social&social_view=official",
        },
        {
          source: "/shows/:showId/s:seasonNumber/social/week/:weekIndex/:platform",
          destination: "/shows/:showId/seasons/:seasonNumber/social/week/:weekIndex/:platform",
        },
      ]),
    );
  });
});
