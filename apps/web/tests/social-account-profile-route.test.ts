// @ts-nocheck - server component route tests use mocked next/navigation behavior
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/social/tiktok/bravotv",
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

describe("social account profile stats page", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it.each([
    { platform: "TikTok", handle: "@BravoTV", expectedPath: "/social/tiktok/bravotv" },
    { platform: "Twitter", handle: "@BravoTV", expectedPath: "/social/twitter/bravotv" },
    { platform: "Threads", handle: "@BravoTV", expectedPath: "/social/threads/bravotv" },
    { platform: "YouTube", handle: "@Bravo", expectedPath: "/social/youtube/bravo" },
  ])(
    "redirects non-canonical $platform stats params to the shared profile page",
    async ({ platform, handle, expectedPath }) => {
      const page = await import("@/app/social/[platform]/[handle]/page");
      await expect(
        page.default({
          params: Promise.resolve({
            platform,
            handle,
          }),
        }),
      ).rejects.toThrow(`NEXT_REDIRECT:${expectedPath}`);
    },
  );

  it("renders the canonical stats page without redirecting", async () => {
    const page = await import("@/app/social/[platform]/[handle]/page");
    const element = await page.default({
      params: Promise.resolve({
        platform: "instagram",
        handle: "bravotv",
      }),
    });

    expect(element.props.platform).toBe("instagram");
    expect(element.props.handle).toBe("bravotv");
    expect(element.props.activeTab).toBe("stats");
  });

  it("renders the canonical socialblade page without redirecting", async () => {
    const page = await import("@/app/social/[platform]/[handle]/socialblade/page");
    const element = await page.default({
      params: Promise.resolve({
        platform: "instagram",
        handle: "bravotv",
      }),
    });

    expect(element.props.platform).toBe("instagram");
    expect(element.props.handle).toBe("bravotv");
    expect(element.props.activeTab).toBe("socialblade");
  });

  it("renders the canonical catalog page without redirecting", async () => {
    const page = await import("@/app/social/[platform]/[handle]/catalog/page");
    const element = await page.default({
      params: Promise.resolve({
        platform: "instagram",
        handle: "bravotv",
      }),
    });

    expect(element.props.platform).toBe("instagram");
    expect(element.props.handle).toBe("bravotv");
    expect(element.props.activeTab).toBe("catalog");
  });

  it("rejects unsupported public comments platforms", async () => {
    const page = await import("@/app/social/[platform]/[handle]/comments/page");
    await expect(
      page.default({
        params: Promise.resolve({
          platform: "facebook",
          handle: "bravotv",
        }),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("redirects legacy admin stats routes to the canonical public path", async () => {
    const page = await import("@/app/admin/social/[platform]/[handle]/page");
    await expect(
      page.default({
        params: Promise.resolve({
          platform: "Instagram",
          handle: "@BravoTV",
        }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/social/instagram/bravotv");
  });

  it("redirects legacy admin comments routes to the canonical public path", async () => {
    const page = await import("@/app/admin/social/[platform]/[handle]/comments/page");
    await expect(
      page.default({
        params: Promise.resolve({
          platform: "Instagram",
          handle: "@BravoTV",
        }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/social/instagram/bravotv/comments");
  });

  it("redirects legacy admin socialblade routes to the canonical public path", async () => {
    const page = await import("@/app/admin/social/[platform]/[handle]/socialblade/page");
    await expect(
      page.default({
        params: Promise.resolve({
          platform: "Instagram",
          handle: "@BravoTV",
        }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/social/instagram/bravotv/socialblade");
  });

  it("redirects legacy admin catalog routes to the canonical public path", async () => {
    const page = await import("@/app/admin/social/[platform]/[handle]/catalog/page");
    await expect(
      page.default({
        params: Promise.resolve({
          platform: "Instagram",
          handle: "@BravoTV",
        }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/social/instagram/bravotv/catalog");
  });

  it("rejects unsupported legacy admin comments platforms", async () => {
    const page = await import("@/app/admin/social/[platform]/[handle]/comments/page");
    await expect(
      page.default({
        params: Promise.resolve({
          platform: "facebook",
          handle: "bravotv",
        }),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
