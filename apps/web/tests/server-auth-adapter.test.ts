import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  verifyIdTokenMock,
  verifySessionCookieMock,
  createClientMock,
  getUserMock,
  warnSpy,
} = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  verifySessionCookieMock: vi.fn(),
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
  warnSpy: vi.spyOn(console, "warn").mockImplementation(() => {}),
}));

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
    warnSpy.mockClear();

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

  it("falls back to supabase when firebase verification fails", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("firebase down"));
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "";
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "supabase-user",
          email: "supabase@example.com",
          user_metadata: { name: "Supabase User" },
          app_metadata: {},
          identities: [],
        },
      },
      error: null,
    });

    const auth = await import("@/lib/server/auth");
    const user = await auth.getUserFromRequest(requestWithBearer("token-2"));

    expect(user).toMatchObject({
      uid: "supabase-user",
      email: "supabase@example.com",
      provider: "supabase",
    });
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[auth] Auth provider fallback succeeded",
      expect.objectContaining({ primary: "firebase", secondary: "supabase", kind: "id" }),
    );
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

  it("allows requireAdmin for supabase user when email is in allowlist", async () => {
    process.env.TRR_AUTH_PROVIDER = "supabase";
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "supabase-admin",
          email: "admin@example.com",
          user_metadata: { name: "Admin User" },
          app_metadata: {},
          identities: [],
        },
      },
      error: null,
    });

    const auth = await import("@/lib/server/auth");
    const user = await auth.requireAdmin(requestWithBearer("token-4"));

    expect(user).toMatchObject({
      uid: "supabase-admin",
      email: "admin@example.com",
      provider: "supabase",
    });
  });

  it("tracks fallback and shadow mismatch diagnostics counters", async () => {
    process.env.TRR_AUTH_SHADOW_MODE = "true";
    verifyIdTokenMock.mockRejectedValueOnce(new Error("firebase down"));
    getUserMock.mockResolvedValueOnce({
      data: {
        user: {
          id: "supabase-user",
          email: "supabase@example.com",
          user_metadata: { name: "Supabase User" },
          app_metadata: {},
          identities: [],
        },
      },
      error: null,
    });

    const auth = await import("@/lib/server/auth");
    await auth.getUserFromRequest(requestWithBearer("token-fallback"));

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
    expect(snapshot.counters.fallbackSuccesses).toBe(1);
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
