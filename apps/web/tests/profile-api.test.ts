import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ user: vi.fn(), read: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/server/profile-repository", () => ({ readProfile: mocks.read, updateProfile: mocks.update }));
import { GET, PATCH } from "@/app/api/profile/route";
import { isFirestoreUnavailableError } from "@/lib/db/users";
import { isProfileComplete } from "@/lib/validation/user";
const request = (body: unknown) => new NextRequest("https://trr.localhost/api/profile", { method: "PATCH", body: JSON.stringify(body) });
beforeEach(() => {
  mocks.user.mockReset().mockResolvedValue({ uid: "owner", email: "owner@example.test", provider: "firebase", token: {} });
  mocks.read.mockReset().mockResolvedValue({ username: "owner" });
  mocks.update.mockReset().mockResolvedValue(undefined);
});
describe("profile endpoint boundary", () => {
  it("derives identity from authentication and accepts only editable fields", async () => {
    expect((await PATCH(request({ uid: "other", username: "changed" }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
    expect((await PATCH(request({ username: " New_Name ", shows: ["A", "A", "B"] }))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ uid: "owner" }), { username: "new_name", shows: ["A", "B"] });
  });
  it("rejects anonymous and non-Firebase callers", async () => {
    mocks.user.mockRejectedValueOnce(new Error("unauthorized"));
    expect((await PATCH(request({ name: "Name" }))).status).toBe(401);
    mocks.user.mockResolvedValueOnce({ uid: "other", provider: "supabase" });
    expect((await GET(new NextRequest("https://trr.localhost/api/profile"))).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("returns private profile data without caching", async () => {
    const response = await GET(new NextRequest("https://trr.localhost/api/profile"));
    expect(mocks.read).toHaveBeenCalledWith("owner");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("does not read again after committing a save", async () => {
    mocks.read.mockRejectedValue(new Error("offline"));
    expect((await PATCH(request({ name: "Saved" }))).status).toBe(200);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("only classifies actual availability failures as temporary", async () => {
    for (const code of ["permission-denied", "invalid-argument", "unauthenticated"]) {
      expect(isFirestoreUnavailableError({ name: "FirebaseError", code })).toBe(false);
    }
    expect(isFirestoreUnavailableError({ code: "profile/unavailable" })).toBe(true);
    mocks.update.mockRejectedValueOnce({ code: 7 });
    expect((await PATCH(request({ name: "Name" }))).status).toBe(500);
    mocks.update.mockRejectedValueOnce({ code: 14 });
    expect((await PATCH(request({ name: "Name" }))).status).toBe(503);
  });
  it("rejects malformed fields and impossible dates", async () => {
    for (const value of [{ birthday: "2000-02-31" }, { shows: [42] }, { livesInUS: "yes" }, { username: "a/b" }]) {
      expect((await PATCH(request(value))).status).toBe(400);
    }
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("uses the same completion rule for partial and complete profiles", () => {
    expect(isProfileComplete({ username: "person", birthday: "2000-01-01", shows: ["A", "B", "C"] })).toBe(true);
    expect(isProfileComplete({ username: "person", shows: ["A", "B", "C"] })).toBe(false);
    expect(isProfileComplete({ username: "person", birthday: "2000-01-01", shows: ["A"] })).toBe(false);
  });
});
