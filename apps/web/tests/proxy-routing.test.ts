import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

const trackedEnvKeys = [
  "NODE_ENV",
  "ADMIN_APP_ORIGIN",
  "ADMIN_APP_HOSTS",
  "ADMIN_ENFORCE_HOST",
  "ADMIN_STRICT_HOST_ROUTING",
] as const;

const originalEnv = new Map<string, string | undefined>();

function setDefaultAdminRoutingEnv() {
  process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
  delete process.env.ADMIN_APP_HOSTS;
  process.env.ADMIN_ENFORCE_HOST = "true";
  process.env.ADMIN_STRICT_HOST_ROUTING = "false";
}

function runProxy(pathname: string) {
  return proxy(new NextRequest(`http://admin.localhost:3000${pathname}`));
}

describe("proxy route characterization", () => {
  beforeEach(() => {
    for (const key of trackedEnvKeys) {
      originalEnv.set(key, process.env[key]);
    }
    setDefaultAdminRoutingEnv();
  });

  afterEach(() => {
    for (const key of trackedEnvKeys) {
      const original = originalEnv.get(key);
      if (typeof original === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
    originalEnv.clear();
  });

  it("rewrites canonical admin-host section routes to their internal admin pages", () => {
    const response = runProxy("/social");

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://admin.localhost:3000/admin/social");
    expect(response.headers.get("location")).toBeNull();
  });

  it.each([
    [
      "/screenlaytics?run_id=run-123&utm_source=test",
      "http://admin.localhost:3000/screenalytics/runs/run-123?utm_source=test",
    ],
    [
      "/admin/cast-screentime?run=run-456&debug=1",
      "http://admin.localhost:3000/screenalytics/runs/run-456?debug=1",
    ],
  ])("redirects legacy screenalytics alias %s to the canonical URL", (pathname, expectedLocation) => {
    const response = runProxy(pathname);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(expectedLocation);
  });

  it.each([
    ["/rhoslc", "http://admin.localhost:3000/admin/trr-shows/rhoslc"],
    ["/rhoslc/s6", "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6"],
    ["/rhoslc/s6/fandom", "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6?tab=fandom"],
    [
      "/rhoslc/s6/social/w0/youtube",
      "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6/social/week/0/youtube",
    ],
  ])("rewrites short show route %s to the admin workspace", (pathname, expectedRewrite) => {
    const response = runProxy(pathname);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(expectedRewrite);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not treat reserved root segments as show routes", () => {
    const response = runProxy("/hub");

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it.each([
    ["/brands/networks-and-streaming", "http://admin.localhost:3000/brands"],
    ["/admin/brands/instagram", "http://admin.localhost:3000/brands/instagram"],
  ])("redirects brand route %s to its canonical admin URL", (pathname, expectedLocation) => {
    const response = runProxy(pathname);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(expectedLocation);
  });
});
