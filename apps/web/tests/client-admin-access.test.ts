import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";

function buildUser(overrides: Partial<User>): User {
  return {
    uid: "user-1",
    email: null,
    displayName: null,
    emailVerified: false,
    isAnonymous: false,
    metadata: {} as User["metadata"],
    phoneNumber: null,
    photoURL: null,
    providerData: [],
    providerId: "firebase",
    refreshToken: "refresh-token",
    tenantId: null,
    delete: vi.fn(),
    getIdToken: vi.fn().mockResolvedValue("client-id-token"),
    getIdTokenResult: vi.fn(),
    reload: vi.fn(),
    toJSON: vi.fn(),
    ...overrides,
  } as User;
}

describe("client admin access", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_ADMIN_EMAILS;
    delete process.env.NEXT_PUBLIC_ADMIN_UIDS;
    delete process.env.NEXT_PUBLIC_ADMIN_DISPLAY_NAMES;
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not grant admin access from client-visible identity fields", async () => {
    process.env.NEXT_PUBLIC_ADMIN_EMAILS = "admin@example.com";
    process.env.NEXT_PUBLIC_ADMIN_UIDS = "seeded-admin-uid";
    const { getAllowedAdminEmails, getAllowedAdminUids, isClientAdmin } = await import("@/lib/admin/client-access");

    expect(isClientAdmin(buildUser({ uid: "seeded-admin-uid" }))).toBe(false);
    expect(isClientAdmin(buildUser({ email: "admin@example.com", emailVerified: true }))).toBe(false);
    expect(isClientAdmin(buildUser({ displayName: "Codex Huli" }))).toBe(false);
    expect(isClientAdmin(buildUser({ displayName: "@codex_huli" }))).toBe(false);
    expect(isClientAdmin(buildUser({ displayName: "codex_huli" }))).toBe(false);
    expect(getAllowedAdminEmails()).toEqual([]);
    expect(getAllowedAdminUids()).toEqual([]);
  });

  it("returns true only when the server check returns a positive response", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ hasAccess: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const user = buildUser({ uid: "user-1" });
    const { checkServerAdminAccess } = await import("@/lib/admin/client-access");

    await expect(checkServerAdminAccess(user)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/check",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      }),
    );
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer client-id-token");
  });

  it("returns false when the server check rejects the user", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ hasAccess: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const { checkServerAdminAccess } = await import("@/lib/admin/client-access");

    await expect(
      checkServerAdminAccess(
        buildUser({ uid: "seeded-admin-uid", email: "admin@example.com", emailVerified: true }),
      ),
    ).resolves.toBe(false);
  });

  it("aborts a hung server check and fails closed", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.mocked(fetch);
    let observedSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_, init) => {
      observedSignal = init?.signal as AbortSignal | undefined;
      return new Promise<Response>((_, reject) => {
        observedSignal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    });
    const { checkServerAdminAccess } = await import("@/lib/admin/client-access");

    const accessPromise = checkServerAdminAccess(buildUser({ uid: "user-1" }));
    await vi.advanceTimersByTimeAsync(5000);

    await expect(accessPromise).resolves.toBe(false);
    expect(observedSignal?.aborted).toBe(true);
  });
});
