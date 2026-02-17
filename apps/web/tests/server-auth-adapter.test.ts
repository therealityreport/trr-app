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
  return new NextRequest("http://localhost/api/test", {
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
  });
});
