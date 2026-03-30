import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  ADMIN_APP_ORIGIN: process.env.ADMIN_APP_ORIGIN,
  ADMIN_APP_HOSTS: process.env.ADMIN_APP_HOSTS,
  ADMIN_ENFORCE_HOST: process.env.ADMIN_ENFORCE_HOST,
  ADMIN_STRICT_HOST_ROUTING: process.env.ADMIN_STRICT_HOST_ROUTING,
};

afterEach(() => {
  if (typeof originalEnv.NODE_ENV === "undefined") {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
  }
  if (typeof originalEnv.ADMIN_APP_ORIGIN === "undefined") {
    delete process.env.ADMIN_APP_ORIGIN;
  } else {
    process.env.ADMIN_APP_ORIGIN = originalEnv.ADMIN_APP_ORIGIN;
  }
  if (typeof originalEnv.ADMIN_APP_HOSTS === "undefined") {
    delete process.env.ADMIN_APP_HOSTS;
  } else {
    process.env.ADMIN_APP_HOSTS = originalEnv.ADMIN_APP_HOSTS;
  }
  if (typeof originalEnv.ADMIN_ENFORCE_HOST === "undefined") {
    delete process.env.ADMIN_ENFORCE_HOST;
  } else {
    process.env.ADMIN_ENFORCE_HOST = originalEnv.ADMIN_ENFORCE_HOST;
  }
  if (typeof originalEnv.ADMIN_STRICT_HOST_ROUTING === "undefined") {
    delete process.env.ADMIN_STRICT_HOST_ROUTING;
  } else {
    process.env.ADMIN_STRICT_HOST_ROUTING = originalEnv.ADMIN_STRICT_HOST_ROUTING;
  }
});

describe("admin host proxy", () => {
  it("defaults to enforcing host routing in development when ADMIN_ENFORCE_HOST is unset", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ADMIN_ENFORCE_HOST;
    delete process.env.ADMIN_APP_ORIGIN;
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/admin/fonts");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/admin/fonts");
  });

  it("allows /api/admin requests on localhost in development by default allowlist", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ADMIN_ENFORCE_HOST;
    delete process.env.ADMIN_APP_ORIGIN;
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/api/admin/auth/status");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects /admin requests on public host to admin origin", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/admin/fonts?tab=buttons");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://admin.localhost:3000/admin/fonts?tab=buttons",
    );
  });

  it("redirects /design-system requests on public host to admin origin", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/design-system/components/layout");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://admin.localhost:3000/design-system/components/layout",
    );
  });

  it("keeps /shows requests on the public host", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/shows/rhoslc/s6/social/reddit");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects /games requests on public host to admin origin", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/games");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/games");
  });

  it.each([
    "/dev-dashboard",
    "/docs",
    "/groups",
    "/shows/settings",
    "/settings",
    "/surveys",
    "/users",
  ])("redirects %s requests on public host to admin origin", (pathname) => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest(`http://localhost:3000${pathname}`);
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`http://admin.localhost:3000${pathname}`);
  });

  it.each([
    "/social-media",
    "/rhoslc/social",
    "/rhoslc/s6/social/w0",
    "/people/mary-cosby",
  ])("keeps %s on the public host", (pathname) => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest(`http://localhost:3000${pathname}`);
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps /people detail routes on the public host", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/people/mary-cosby");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects /people root on public host to admin origin", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/people");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/people");
  });

  it("allows /docs on the canonical admin host", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/docs");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rewrites the canonical admin-host root to the admin dashboard implementation", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://admin.localhost:3000/admin");
  });

  it("redirects /admin to the canonical admin-host root", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/admin");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/");
  });

  it.each([
    ["/social-media", "http://admin.localhost:3000/social"],
    ["/admin/social-media", "http://admin.localhost:3000/social"],
    ["/social/reddit", "http://admin.localhost:3000/social"],
    ["/admin/social/reddit", "http://admin.localhost:3000/social"],
    ["/shows/rhoslc", "http://admin.localhost:3000/rhoslc"],
    ["/admin/design-docs/overview", "http://admin.localhost:3000/design-docs/overview"],
    ["/admin/api-references", "http://admin.localhost:3000/api-references"],
    ["/admin/dev-dashboard/skills-and-agents", "http://admin.localhost:3000/dev-dashboard/skills-and-agents"],
  ])("redirects %s to the canonical admin-host URL", (pathname, expectedLocation) => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest(`http://admin.localhost:3000${pathname}`);
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(expectedLocation);
  });

  it.each([
    ["/shows", "http://admin.localhost:3000/admin/shows"],
    ["/shows/settings", "http://admin.localhost:3000/admin/shows/settings"],
    ["/social", "http://admin.localhost:3000/admin/social"],
    ["/social/instagram/bravotv", "http://admin.localhost:3000/admin/social/instagram/bravotv"],
    ["/design-docs/overview", "http://admin.localhost:3000/admin/design-docs/overview"],
    ["/api-references", "http://admin.localhost:3000/admin/api-references"],
    ["/dev-dashboard/skills-and-agents", "http://admin.localhost:3000/admin/dev-dashboard/skills-and-agents"],
    ["/rhoslc", "http://admin.localhost:3000/admin/trr-shows/rhoslc"],
    ["/rhoslc/social", "http://admin.localhost:3000/admin/trr-shows/rhoslc/social"],
    ["/rhoslc/social/reddit", "http://admin.localhost:3000/admin/trr-shows/rhoslc/social?social_view=reddit"],
    ["/rhoslc/assets/videos", "http://admin.localhost:3000/admin/trr-shows/rhoslc/assets/videos"],
    ["/rhoslc/social/s6", "http://admin.localhost:3000/admin/trr-shows/rhoslc/social"],
    [
      "/rhoslc/social/s6/w0",
      "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6/social/week/0",
    ],
    [
      "/rhoslc/social/s6/w0/instagram",
      "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6/social/week/0/instagram",
    ],
    ["/rhoslc/s6", "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6"],
    ["/rhoslc/s6/social", "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6?tab=social"],
    ["/rhoslc/s6/social/reddit", "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6?tab=social&social_view=reddit"],
    ["/rhoslc/s6/assets/videos", "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6?tab=assets&assets=videos"],
    [
      "/rhoslc/s6/social/w0/details",
      "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6/social/week/0",
    ],
    [
      "/rhoslc/s6/social/w0/youtube",
      "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6/social/week/0/youtube",
    ],
  ])("rewrites %s to the internal admin surface while keeping the short URL visible", (pathname, expectedRewrite) => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest(`http://admin.localhost:3000${pathname}`);
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(expectedRewrite);
  });

  it("preserves the incoming search string once when rewriting canonical social profile routes", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest(
      "http://admin.localhost:3000/social/instagram/bravotv/catalog?tab=recent&sort=desc",
    );
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://admin.localhost:3000/admin/social/instagram/bravotv/catalog?tab=recent&sort=desc",
    );
  });

  it("keeps root show routes on the public host", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/rhoslc/s6/social/reddit");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects /brands requests on public host to admin origin", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/brands/networks-and-streaming");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://admin.localhost:3000/brands",
    );
  });

  it("redirects legacy brands /admin routes to canonical /brands routes", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest(
      "http://admin.localhost:3000/admin/networks-and-streaming/network/bravo",
    );
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://admin.localhost:3000/brands/networks-and-streaming/network/bravo",
    );
  });

  it("redirects legacy /admin/brands brand slugs to canonical /brands brand profile routes", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/admin/brands/instagram");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://admin.localhost:3000/brands/instagram",
    );
  });

  it("redirects /admin requests from 127.0.0.1 to admin origin", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://127.0.0.1:3000/admin/fonts");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/admin/fonts");
  });

  it("blocks /api/admin requests on non-admin host", async () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/api/admin/auth/status");
    const response = proxy(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Admin API is not available on this host.",
    });
  });

  it("allows /api/admin requests on ADMIN_APP_HOSTS hosts even when non-canonical", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_APP_HOSTS = "localhost";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/api/admin/auth/status");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects /admin requests to / on the current production host when no explicit admin origin is configured", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_APP_ORIGIN;
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("https://trr-app.vercel.app/admin");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://trr-app.vercel.app/");
  });

  it("allows /api/admin requests on the current production host when no explicit admin origin is configured", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_APP_ORIGIN;
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("https://trr-app.vercel.app/api/admin/auth/status");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows admin routes on admin host", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/admin/fonts");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows design-system routes on admin host", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/design-system/questions-forms/admin");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects /shows detail routes to the short admin-host show URL", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/shows/rhoslc");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/rhoslc");
  });

  it("rewrites /people detail routes to the admin person workspace on admin host", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/people/mary-cosby");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://admin.localhost:3000/admin/trr-shows/people/mary-cosby",
    );
  });

  it("rewrites canonical person gallery URLs with show query context into the admin workspace without self-redirecting", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/people/mary-cosby/gallery?showId=rhoslc");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://admin.localhost:3000/admin/trr-shows/people/mary-cosby/gallery?showId=rhoslc",
    );
  });

  it("rewrites person gallery routes without show context to the admin person workspace on admin host", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/people/mary-cosby/gallery");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://admin.localhost:3000/admin/trr-shows/people/mary-cosby/gallery",
    );
  });

  it.each([
    [
      "http://admin.localhost:3000/admin/trr-shows/rhoslc",
      "http://admin.localhost:3000/rhoslc",
    ],
    [
      "http://admin.localhost:3000/admin/trr-shows/rhoslc/season-6/social",
      "http://admin.localhost:3000/rhoslc/s6/social",
    ],
    [
      "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6/social/week/0",
      "http://admin.localhost:3000/rhoslc/s6/social/w0/details",
    ],
    [
      "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6/social/week/0/youtube",
      "http://admin.localhost:3000/rhoslc/s6/social/w0/youtube",
    ],
    [
      "http://admin.localhost:3000/rhoslc/seasons/6/social/week/0/youtube",
      "http://admin.localhost:3000/rhoslc/s6/social/w0/youtube",
    ],
  ])("redirects legacy internal admin URLs back to the short canonical URL: %s", (inputUrl, expectedLocation) => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest(inputUrl);
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(expectedLocation);
  });

  it("redirects internal admin person workspace URLs back to the short canonical /people URL", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest(
      "http://admin.localhost:3000/admin/trr-shows/rhoslc/people/mary-cosby/settings",
    );
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/people/mary-cosby/settings");
  });

  it("redirects unmatched show-level public routes away from guard pages and back into the admin workspace", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/rhoslc/unmatched-public-route");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/admin/trr-shows/rhoslc");
  });

  it("rewrites unmatched season-level public routes into the admin season workspace", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/rhoslc/s6/unmatched-public-route");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6",
    );
  });

  it("does not canonicalize malformed internal season aliases into public placeholder routes", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/admin/trr-shows/rhoslc/season-index/videos");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows /people root on admin host", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/people");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rewrites root show reddit routes on admin host into the admin season workspace", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/rhoslc/s6/social/reddit");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://admin.localhost:3000/admin/trr-shows/rhoslc/seasons/6?tab=social&social_view=reddit",
    );
  });

  it("uses host header precedence when URL hostname differs in local dev", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/admin/fonts", {
      headers: {
        host: "admin.localhost:3000",
      },
    });
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows admin routes on bracketed IPv6 admin host", () => {
    process.env.ADMIN_APP_ORIGIN = "http://[::1]:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://[::1]:3000/admin/fonts");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects non-admin paths to / on admin host when strict routing is enabled", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_APP_HOSTS = "localhost";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "true";

    const request = new NextRequest("http://admin.localhost:3000/hub");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/");
  });

  it("does not redirect design-system routes to /admin when strict routing is enabled", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_APP_HOSTS = "localhost";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "true";

    const request = new NextRequest("http://admin.localhost:3000/design-system/icons-illustrations");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("still redirects /admin UI paths to canonical origin even when host is allowlisted for admin API", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_APP_HOSTS = "localhost";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/admin/fonts");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/admin/fonts");
  });

  it("does not redirect /api/session/login on admin host when strict routing is enabled", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "true";

    const request = new NextRequest("http://admin.localhost:3000/api/session/login");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not redirect /api/session/logout on admin host when strict routing is enabled", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "true";

    const request = new NextRequest("http://admin.localhost:3000/api/session/logout");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
