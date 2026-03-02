import { describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/app/admin/trr-shows/[showId]/page", () => ({
  default: () => null,
}));

vi.mock("@/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page", () => ({
  default: () => null,
}));

import RootShowSeasonAliasPage from "@/app/[showId]/s[seasonNumber]/[[...rest]]/page";

describe("root show season alias reddit window routing", () => {
  it("redirects reddit community season paths to dedicated community page", async () => {
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`REDIRECT:${href}`);
    });

    await expect(
      RootShowSeasonAliasPage({
        params: Promise.resolve({
          showId: "rhoslc",
          seasonNumber: "social",
          rest: ["reddit", "BravoRealHousewives", "s6"],
        }),
      }),
    ).rejects.toThrow(
      "REDIRECT:/admin/social-media/reddit/BravoRealHousewives?showSlug=rhoslc&season=6",
    );
  });

  it("redirects reddit community season paths when season token is parsed as 'ocial'", async () => {
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`REDIRECT:${href}`);
    });

    await expect(
      RootShowSeasonAliasPage({
        params: Promise.resolve({
          showId: "rhoslc",
          seasonNumber: "ocial",
          rest: ["reddit", "BravoRealHousewives", "s6"],
        }),
      }),
    ).rejects.toThrow(
      "REDIRECT:/admin/social-media/reddit/BravoRealHousewives?showSlug=rhoslc&season=6",
    );
  });

  it("redirects reddit window paths to admin reddit window resolver", async () => {
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`REDIRECT:${href}`);
    });

    await expect(
      RootShowSeasonAliasPage({
        params: Promise.resolve({
          showId: "rhoslc",
          seasonNumber: "social",
          rest: ["reddit", "BravoRealHousewives", "w0"],
        }),
      }),
    ).rejects.toThrow(
      "REDIRECT:/admin/reddit-window-posts?showSlug=rhoslc&community_slug=BravoRealHousewives&windowKey=w0",
    );
  });

  it("redirects reddit window paths when season token is parsed as 'ocial'", async () => {
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`REDIRECT:${href}`);
    });

    await expect(
      RootShowSeasonAliasPage({
        params: Promise.resolve({
          showId: "rhoslc",
          seasonNumber: "ocial",
          rest: ["reddit", "BravoRealHousewives", "w0"],
        }),
      }),
    ).rejects.toThrow(
      "REDIRECT:/admin/reddit-window-posts?showSlug=rhoslc&community_slug=BravoRealHousewives&windowKey=w0",
    );
  });

  it("does not redirect valid numeric season routes", async () => {
    redirectMock.mockReset();

    await RootShowSeasonAliasPage({
      params: Promise.resolve({
        showId: "rhoslc",
        seasonNumber: "6",
        rest: ["social", "reddit", "BravoRealHousewives"],
      }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
  });
});
