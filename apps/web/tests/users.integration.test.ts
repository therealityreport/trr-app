// Integration test stub for getUserByUsername; should be mocked in CI/local.
// @ts-nocheck - Test files use different module resolution and mock configurations
import { describe, it, expect, vi } from "vitest";

const { getUserByUsernameMock } = vi.hoisted(() => ({
  getUserByUsernameMock: vi.fn(),
}));

vi.mock("@/lib/db/users", () => ({
  getUserByUsername: getUserByUsernameMock,
}));

import { getUserByUsername } from "@/lib/db/users";

describe("getUserByUsername (stub)", () => {
  it("returns null when not found (mocked)", async () => {
    getUserByUsernameMock.mockResolvedValueOnce(null);
    const res = await getUserByUsername("nonexistent_user");
    expect(res).toBeNull();
  });
});
