import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  verifyIdTokenMock,
  verifySessionCookieMock,
  createClientMock,
  getUserMock,
} = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  verifySessionCookieMock: vi.fn(),
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
}));

let warnSpy: ReturnType<typeof vi.spyOn<typeof console, "warn">>;

vi.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: {
    verifyIdToken: verifyIdTokenMock,
    verifySessionCookie: verifySessionCookieMock,
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

function requestWithBearer(token: string): NextRequest {
  return requestWithBearerAt("http://localhost/api/test", token);
}

function requestWithBearerAt(url: string, token: string): NextRequest {
  return new NextRequest(url, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
}

describe("server auth adapter", () => {
  beforeEach(() => {
    vi.resetModules();
    verifyIdTokenMock.mockReset();
    verifySessionCookieMock.mockReset();
    createClientMock.mockReset();
    getUserMock.mockReset();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    process.env.TRR_AUTH_PROVIDER = "firebase";
    process.env.TRR_AUTH_SHADOW_MODE = "false";
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = "true";
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "";
    process.env.ADMIN_EMAIL_ALLOWLIST = "";
    process.env.TRR_CORE_SUPABASE_URL = "https://example.supabase.co";
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.ADMIN_APP_HOSTS = "localhost,127.0.0.1";
    delete process.env.ADMIN_APP_ORIGIN;
    delete process.env.ADMIN_ENFORCE_HOST;

    createClientMock.mockReturnValue({
      auth: {
        getUser: getUserMock,
      },
    });
  });

  it("uses firebase as primary provider by default", async () => {
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-user",
      email: "firebase@example.com",
      name: "Firebase User",
    });

    const auth = await import("@/lib/server/auth");
    const user = await auth.getUserFromRequest(requestWithBearer("token-1"));

    expect(user).toMatchObject({
      uid: "firebase-user",
      email: "firebase@example.com",
      provider: "firebase",
    });
    expect(verifyIdTokenMock).toHaveBeenCalledTimes(1);
  });

  it("does not authenticate with supabase when firebase verification fails", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("firebase down"));

    const auth = await import("@/lib/server/auth");
    const user = await auth.getUserFromRequest(requestWithBearer("token-2"));

    expect(user).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("does not attempt supabase shadow verification when TRR_CORE_SUPABASE_* is unset", async () => {
    process.env.TRR_AUTH_SHADOW_MODE = "true";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-user",
      email: "firebase@example.com",
      name: "Firebase User",
    });
    process.env.SUPABASE_URL = "https://legacy.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-service-role";
    delete process.env.TRR_CORE_SUPABASE_URL;
    delete process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;

    const auth = await import("@/lib/server/auth");
    const user = await auth.getUserFromRequest(requestWithBearer("token-no-supabase-env"));

    expect(user).toMatchObject({
      uid: "firebase-user",
      provider: "firebase",
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("logs shadow mismatch diagnostics when providers disagree", async () => {
    process.env.TRR_AUTH_SHADOW_MODE = "true";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-user",
      email: "firebase@example.com",
      name: "Firebase Name",
    });
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "firebase-user",
          email: "different@example.com",
          user_metadata: { name: "Different Name" },
          app_metadata: {},
          identities: [],
        },
      },
      error: null,
    });

    const auth = await import("@/lib/server/auth");
    const user = await auth.getUserFromRequest(requestWithBearer("token-3"));

    expect(user?.provider).toBe("firebase");
    expect(warnSpy).toHaveBeenCalledWith(
      "[auth] Shadow verification mismatch",
      expect.objectContaining({
        primary: "firebase",
        secondary: "supabase",
        mismatches: expect.arrayContaining(["email", "name"]),
      }),
    );
  });

  it("keeps firebase as the authenticating provider when TRR_AUTH_PROVIDER=supabase", async () => {
    process.env.TRR_AUTH_PROVIDER = "supabase";
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-admin",
      email: "admin@example.com",
      name: "Admin User",
    });

    const auth = await import("@/lib/server/auth");
    const user = await auth.requireAdmin(requestWithBearer("token-4"));

    expect(user).toMatchObject({
      uid: "firebase-admin",
      email: "admin@example.com",
      provider: "firebase",
    });
  });

  it("rejects durable session auth when TRR_AUTH_PROVIDER=supabase", async () => {
    process.env.TRR_AUTH_PROVIDER = "supabase";
    verifySessionCookieMock.mockResolvedValue({
      uid: "firebase-session-user",
      email: "session@example.com",
      name: "Session User",
    });
    const request = new NextRequest("http://localhost/api/test", {
      headers: {
        cookie: "__session=session-cookie",
      },
    });

    const auth = await import("@/lib/server/auth");
    const user = await auth.getUserFromRequest(request);

    expect(user).toBeNull();
    expect(verifySessionCookieMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[auth] Unsupported durable auth configuration",
      expect.objectContaining({
        configuredProvider: "supabase",
        kind: "session",
      }),
    );
  });

  it("memoizes the supabase verification client across shadow checks", async () => {
    process.env.TRR_AUTH_SHADOW_MODE = "true";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-user",
      email: "firebase@example.com",
      name: "Firebase User",
    });
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "firebase-user",
          email: "firebase@example.com",
          user_metadata: { name: "Firebase User" },
          app_metadata: {},
          identities: [],
        },
      },
      error: null,
    });

    const auth = await import("@/lib/server/auth");
    await auth.getUserFromRequest(requestWithBearer("token-shadow-1"));
    await auth.getUserFromRequest(requestWithBearer("token-shadow-2"));

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(getUserMock).toHaveBeenCalledTimes(2);
  });

  it("tracks shadow mismatch diagnostics counters without fallback auth", async () => {
    process.env.TRR_AUTH_SHADOW_MODE = "true";
    verifyIdTokenMock.mockRejectedValueOnce(new Error("firebase down"));

    const auth = await import("@/lib/server/auth");
    await expect(auth.getUserFromRequest(requestWithBearer("token-fallback"))).resolves.toBeNull();

    verifyIdTokenMock.mockResolvedValueOnce({
      uid: "firebase-user",
      email: "firebase@example.com",
      name: "Firebase Name",
    });
    getUserMock.mockResolvedValueOnce({
      data: {
        user: {
          id: "different-user",
          email: "different@example.com",
          user_metadata: { name: "Different Name" },
          app_metadata: {},
          identities: [],
        },
      },
      error: null,
    });
    await auth.getUserFromRequest(requestWithBearer("token-shadow"));

    const snapshot = auth.getAuthDiagnosticsSnapshot();
    expect(snapshot.provider).toBe("firebase");
    expect(snapshot.shadowMode).toBe(true);
    expect(snapshot.counters.fallbackSuccesses).toBe(0);
    expect(snapshot.counters.shadowChecks).toBe(1);
    expect(snapshot.counters.shadowMismatchEvents).toBe(1);
    expect(snapshot.counters.shadowMismatchFieldCounts.uid).toBe(1);
    expect(snapshot.counters.shadowMismatchFieldCounts.email).toBe(1);
    expect(snapshot.counters.shadowMismatchFieldCounts.name).toBe(1);

    const resetSnapshot = auth.resetAuthDiagnosticsSnapshot();
    expect(resetSnapshot.counters.shadowChecks).toBe(0);
    expect(resetSnapshot.counters.shadowFailures).toBe(0);
    expect(resetSnapshot.counters.shadowMismatchEvents).toBe(0);
    expect(resetSnapshot.counters.shadowMismatchFieldCounts.uid).toBe(0);
    expect(resetSnapshot.counters.shadowMismatchFieldCounts.email).toBe(0);
    expect(resetSnapshot.counters.shadowMismatchFieldCounts.name).toBe(0);
    expect(resetSnapshot.counters.fallbackSuccesses).toBe(0);
    expect(resetSnapshot.windowStartedAt).toBeTruthy();
    expect(resetSnapshot.lastObservedAt).toBeNull();
  });

  it("defaults host enforcement to enabled in development with localhost-family allowlist when unset", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    delete process.env.ADMIN_ENFORCE_HOST;
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-admin-dev-default",
      email: "admin@example.com",
      name: "Admin User",
    });

    try {
      const auth = await import("@/lib/server/auth");
      const user = await auth.requireAdmin(
        requestWithBearerAt("http://localhost/api/test", "token-dev-default-host"),
      );
      expect(user).toMatchObject({
        uid: "firebase-admin-dev-default",
        email: "admin@example.com",
        provider: "firebase",
      });
    } finally {
      if (typeof previousNodeEnv === "undefined") {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });

  it("denies requireAdmin on non-allowlisted host in development when ADMIN_ENFORCE_HOST is unset", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    delete process.env.ADMIN_ENFORCE_HOST;
    delete process.env.ADMIN_APP_HOSTS;
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-admin-dev-deny",
      email: "admin@example.com",
      name: "Admin User",
    });

    try {
      const auth = await import("@/lib/server/auth");
      await expect(
        auth.requireAdmin(requestWithBearerAt("http://example.test/api/test", "token-dev-default-host-deny")),
      ).rejects.toThrow("forbidden");
    } finally {
      if (typeof previousNodeEnv === "undefined") {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });

  it("defaults host enforcement to enabled in production when ADMIN_ENFORCE_HOST is unset", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_ENFORCE_HOST;
    process.env.ADMIN_APP_HOSTS = "admin.localhost";
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-admin-prod-default",
      email: "admin@example.com",
      name: "Admin User",
    });

    try {
      const auth = await import("@/lib/server/auth");
      await expect(
        auth.requireAdmin(requestWithBearerAt("http://localhost/api/test", "token-prod-default-host")),
      ).rejects.toThrow("forbidden");
    } finally {
      if (typeof previousNodeEnv === "undefined") {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });

  it("allows requireAdmin on the current production host when no admin host config is set", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_ENFORCE_HOST;
    delete process.env.ADMIN_APP_HOSTS;
    delete process.env.ADMIN_APP_ORIGIN;
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-admin-prod-current-host",
      email: "admin@example.com",
      name: "Admin User",
    });

    try {
      const auth = await import("@/lib/server/auth");
      const user = await auth.requireAdmin(
        requestWithBearerAt("https://trr-app.vercel.app/api/test", "token-prod-current-host"),
      );
      expect(user).toMatchObject({
        uid: "firebase-admin-prod-current-host",
        email: "admin@example.com",
        provider: "firebase",
      });
    } finally {
      if (typeof previousNodeEnv === "undefined") {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });

  it("denies requireAdmin on non-admin host when host enforcement is enabled", async () => {
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_APP_HOSTS = "admin.localhost";
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-admin",
      email: "admin@example.com",
      name: "Admin User",
    });

    const auth = await import("@/lib/server/auth");
    await expect(auth.requireAdmin(requestWithBearerAt("http://localhost/api/test", "token-host-block"))).rejects.toThrow(
      "forbidden",
    );
  });

  it("allows requireAdmin on configured admin host when host enforcement is enabled", async () => {
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_APP_HOSTS = "admin.localhost";
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-admin",
      email: "admin@example.com",
      name: "Admin User",
    });

    const auth = await import("@/lib/server/auth");
    const user = await auth.requireAdmin(
      requestWithBearerAt("http://admin.localhost/api/test", "token-host-allow"),
    );
    expect(user).toMatchObject({
      uid: "firebase-admin",
      email: "admin@example.com",
      provider: "firebase",
    });
  });

  it("allows requireAdmin on bracketed IPv6 admin host when allowlisted", async () => {
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_APP_HOSTS = "[::1]";
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-admin-ipv6",
      email: "admin@example.com",
      name: "Admin User",
    });

    const auth = await import("@/lib/server/auth");
    const user = await auth.requireAdmin(
      requestWithBearerAt("http://[::1]:3000/api/test", "token-host-allow-ipv6"),
    );
    expect(user).toMatchObject({
      uid: "firebase-admin-ipv6",
      email: "admin@example.com",
      provider: "firebase",
    });
  });

  it("uses host header precedence when url host differs in local dev", async () => {
    process.env.ADMIN_ENFORCE_HOST = "true";
    process.env.ADMIN_APP_HOSTS = "admin.localhost";
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    verifyIdTokenMock.mockResolvedValue({
      uid: "firebase-admin-host-header",
      email: "admin@example.com",
      name: "Admin User",
    });

    const request = new NextRequest("http://localhost/api/test", {
      headers: {
        authorization: "Bearer token-host-header",
        host: "admin.localhost:3000",
      },
    });

    const auth = await import("@/lib/server/auth");
    const user = await auth.requireAdmin(request);
    expect(user).toMatchObject({
      uid: "firebase-admin-host-header",
      email: "admin@example.com",
      provider: "firebase",
    });
  });
});
