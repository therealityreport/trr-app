import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const originalEnv = {
  ADMIN_APP_ORIGIN: process.env.ADMIN_APP_ORIGIN,
  ADMIN_ENFORCE_HOST: process.env.ADMIN_ENFORCE_HOST,
  ADMIN_STRICT_HOST_ROUTING: process.env.ADMIN_STRICT_HOST_ROUTING,
};

afterEach(() => {
  if (typeof originalEnv.ADMIN_APP_ORIGIN === "undefined") {
    delete process.env.ADMIN_APP_ORIGIN;
  } else {
    process.env.ADMIN_APP_ORIGIN = originalEnv.ADMIN_APP_ORIGIN;
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
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://localhost:3000/api/admin/auth/status");
    const response = proxy(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Admin API is not available on this host.",
    });
  });

  it("allows admin routes on admin host", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "false";

    const request = new NextRequest("http://admin.localhost:3000/admin/fonts");
    const response = proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
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

  it("redirects non-admin paths to /admin on admin host when strict routing is enabled", () => {
    process.env.ADMIN_APP_ORIGIN = "http://admin.localhost:3000";
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_STRICT_HOST_ROUTING = "true";

    const request = new NextRequest("http://admin.localhost:3000/hub");
    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://admin.localhost:3000/admin");
  });
});
