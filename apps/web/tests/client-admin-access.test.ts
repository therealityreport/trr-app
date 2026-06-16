import { beforeEach, describe, expect, it, vi } from "vitest";
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
    getIdToken: vi.fn(),
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
  });

  it("no longer treats a seeded admin display name as admin-capable", async () => {
    const { isClientAdmin } = await import("@/lib/admin/client-access");

    // Display name is attacker-controllable, so it must never grant admin.
    expect(isClientAdmin(buildUser({ displayName: "Codex Huli" }))).toBe(false);
    expect(isClientAdmin(buildUser({ displayName: "@codex_huli" }))).toBe(false);
    expect(isClientAdmin(buildUser({ displayName: "codex_huli" }))).toBe(false);
  });

  it("treats the seeded admin uid as admin-capable", async () => {
    const { isClientAdmin } = await import("@/lib/admin/client-access");

    expect(isClientAdmin(buildUser({ uid: "MyoUFNjl9VP5iVGBi7tVqxUb8np2" }))).toBe(true);
  });

  it("treats an allowlisted verified email as admin-capable", async () => {
    process.env.NEXT_PUBLIC_ADMIN_EMAILS = "admin@example.com";
    const { isClientAdmin } = await import("@/lib/admin/client-access");

    expect(
      isClientAdmin(buildUser({ uid: "non-admin-uid", email: "admin@example.com", emailVerified: true })),
    ).toBe(true);
  });

  it("rejects an allowlisted email that is not verified", async () => {
    process.env.NEXT_PUBLIC_ADMIN_EMAILS = "admin@example.com";
    const { isClientAdmin } = await import("@/lib/admin/client-access");

    expect(
      isClientAdmin(buildUser({ uid: "non-admin-uid", email: "admin@example.com", emailVerified: false })),
    ).toBe(false);
  });
});
