import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createSessionCookieMock } = vi.hoisted(() => ({
  createSessionCookieMock: vi.fn(),
}));

vi.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: {
    createSessionCookie: createSessionCookieMock,
  },
}));

describe("session login route", () => {
  beforeEach(() => {
    vi.resetModules();
    createSessionCookieMock.mockReset();
    process.env.TRR_AUTH_PROVIDER = "firebase";
    process.env.TRR_AUTH_SHADOW_MODE = "false";
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = "true";
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
  });

  it("creates a firebase-issued __session cookie without storing the raw id token", async () => {
    createSessionCookieMock.mockResolvedValue("firebase-session-cookie");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { POST } = await import("@/app/api/session/login/route");
    const idToken = "x".repeat(32);
    const response = await POST(
      new NextRequest("http://localhost/api/session/login", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      provider: "firebase",
      shadowMode: false,
    });
    expect(createSessionCookieMock).toHaveBeenCalledWith(
      idToken,
      expect.objectContaining({ expiresIn: expect.any(Number) }),
    );
    expect(response.cookies.get("__session")?.value).toBe("firebase-session-cookie");
    expect(response.cookies.get("__session")?.value).not.toBe(idToken);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("fails closed when supabase is configured for the durable login route", async () => {
    process.env.TRR_AUTH_PROVIDER = "supabase";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("@/app/api/session/login/route");
    const response = await POST(
      new NextRequest("http://localhost/api/session/login", {
        method: "POST",
        body: JSON.stringify({ idToken: "x".repeat(32) }),
      }),
    );

    expect(response.status).toBe(501);
    expect(await response.json()).toMatchObject({
      error: "unsupported_auth_provider",
      provider: "supabase",
      shadowMode: false,
    });
    expect(response.cookies.get("__session")).toBeUndefined();
    expect(createSessionCookieMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Login API: Unsupported durable auth provider configuration",
      { authProvider: "supabase" },
    );
  });
});
