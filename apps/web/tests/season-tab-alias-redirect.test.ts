// @ts-nocheck - server component route tests use mocked next/navigation behavior
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

describe("season tab alias redirect route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("preserves existing query params while normalizing season tab route", async () => {
    const page = await import("@/app/admin/trr-shows/[showId]/[showSection]/[seasonTab]/page");
    await expect(
      page.default({
        params: Promise.resolve({
          showId: "7f528757-5017-4599-8252-c02f0d0736cf",
          showSection: "season-6",
          seasonTab: "social",
        }),
        searchParams: Promise.resolve({
          source_scope: "community",
          social_platform: "reddit",
          tab: "assets",
        }),
      }),
    ).rejects.toThrow(
      "REDIRECT:/admin/trr-shows/7f528757-5017-4599-8252-c02f0d0736cf/seasons/6?source_scope=community&social_platform=reddit&tab=social",
    );
  });

  it("normalizes legacy details alias to overview", async () => {
    const page = await import("@/app/admin/trr-shows/[showId]/[showSection]/[seasonTab]/page");
    await expect(
      page.default({
        params: Promise.resolve({
          showId: "7f528757-5017-4599-8252-c02f0d0736cf",
          showSection: "season-6",
          seasonTab: "details",
        }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow(
      "REDIRECT:/admin/trr-shows/7f528757-5017-4599-8252-c02f0d0736cf/seasons/6?tab=overview",
    );
  });

  it("accepts and preserves overview tab alias", async () => {
    const page = await import("@/app/admin/trr-shows/[showId]/[showSection]/[seasonTab]/page");
    await expect(
      page.default({
        params: Promise.resolve({
          showId: "7f528757-5017-4599-8252-c02f0d0736cf",
          showSection: "season-6",
          seasonTab: "overview",
        }),
        searchParams: Promise.resolve({ source_scope: "community" }),
      }),
    ).rejects.toThrow(
      "REDIRECT:/admin/trr-shows/7f528757-5017-4599-8252-c02f0d0736cf/seasons/6?source_scope=community&tab=overview",
    );
  });
});
