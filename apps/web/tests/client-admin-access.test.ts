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

  it("treats codex handle defaults as admin-capable display names", async () => {
    const { isClientAdmin } = await import("@/lib/admin/client-access");

    expect(isClientAdmin(buildUser({ displayName: "Codex Huli" }))).toBe(true);
    expect(isClientAdmin(buildUser({ displayName: "@codex_huli" }))).toBe(true);
    expect(isClientAdmin(buildUser({ displayName: "codex_huli" }))).toBe(true);
  });
});
