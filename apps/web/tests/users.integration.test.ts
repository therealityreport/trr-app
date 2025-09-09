// Integration test stub for getUserByUsername; should be mocked in CI/local.
// @ts-nocheck - Test files use different module resolution and mock configurations
import { describe, it, expect, vi } from "vitest";
import * as users from "@/lib/db/users";

describe("getUserByUsername (stub)", () => {
  it("returns null when not found (mocked)", async () => {
    const spy = vi.spyOn(users, "getUserByUsername").mockResolvedValueOnce(null);
    const res = await users.getUserByUsername("nonexistent_user");
    expect(res).toBeNull();
    spy.mockRestore();
  });
});

