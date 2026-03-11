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

vi.mock("@/app/admin/reddit-window-posts/page", () => ({
  default: () => null,
}));

vi.mock("@/app/admin/reddit-post-details/page", () => ({
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
      "REDIRECT:/rhoslc/social/reddit/BravoRealHousewives/s6",
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
      "REDIRECT:/rhoslc/social/reddit/BravoRealHousewives/s6",
    );
  });

  it("renders window page directly for reddit window paths (no redirect)", async () => {
    redirectMock.mockReset();

    await RootShowSeasonAliasPage({
      params: Promise.resolve({
        showId: "rhoslc",
        seasonNumber: "social",
        rest: ["reddit", "BravoRealHousewives", "w0"],
      }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders window page directly when season token is parsed as 'ocial'", async () => {
    redirectMock.mockReset();

    await RootShowSeasonAliasPage({
      params: Promise.resolve({
        showId: "rhoslc",
        seasonNumber: "ocial",
        rest: ["reddit", "BravoRealHousewives", "w0"],
      }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders window page directly for reddit window paths with season", async () => {
    redirectMock.mockReset();

    await RootShowSeasonAliasPage({
      params: Promise.resolve({
        showId: "rhoslc",
        seasonNumber: "social",
        rest: ["reddit", "BravoRealHousewives", "s6", "w0"],
      }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders reddit post details page directly for reddit post paths", async () => {
    redirectMock.mockReset();

    await RootShowSeasonAliasPage({
      params: Promise.resolve({
        showId: "rhoslc",
        seasonNumber: "social",
        rest: ["reddit", "BravoRealHousewives", "s6", "w0", "post", "abc123"],
      }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("renders reddit post details page directly for canonical detail slug paths", async () => {
    redirectMock.mockReset();

    await RootShowSeasonAliasPage({
      params: Promise.resolve({
        showId: "rhoslc",
        seasonNumber: "social",
        rest: ["reddit", "BravoRealHousewives", "s6", "w0", "sample-thread--u-test-user"],
      }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
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
