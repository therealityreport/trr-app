// @ts-nocheck - server component route tests use mocked next/navigation behavior
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

describe("show section redirect route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders show admin page for settings alias (no query redirect)", async () => {
    const page = await import("@/app/admin/trr-shows/[showId]/[showSection]/page");
    await expect(
      page.default({
        params: Promise.resolve({
          showId: "7f528757-5017-4599-8252-c02f0d0736cf",
          showSection: "settings",
        }),
      })
    ).resolves.toBeTruthy();
  }, 15000);

  it("renders show admin page for overview alias (no query redirect)", async () => {
    const page = await import("@/app/admin/trr-shows/[showId]/[showSection]/page");
    await expect(
      page.default({
        params: Promise.resolve({
          showId: "7f528757-5017-4599-8252-c02f0d0736cf",
          showSection: "overview",
        }),
      })
    ).resolves.toBeTruthy();
  }, 15000);

  it("still redirects season slug aliases to canonical season route", async () => {
    const page = await import("@/app/admin/trr-shows/[showId]/[showSection]/page");
    await expect(
      page.default({
        params: Promise.resolve({
          showId: "7f528757-5017-4599-8252-c02f0d0736cf",
          showSection: "season-4",
        }),
      })
    ).rejects.toThrow("REDIRECT:/7f528757-5017-4599-8252-c02f0d0736cf/s4");
  });
});
