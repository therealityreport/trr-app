// @ts-nocheck - server component route tests use mocked next/navigation behavior
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

describe("social account catalog alt page", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders the Alt 1 catalog mockup for canonical params", async () => {
    const page = await import("@/app/social/[platform]/[handle]/catalog/alt-1/page");
    const element = await page.default({
      params: Promise.resolve({
        platform: "instagram",
        handle: "bravotv",
      }),
    });

    expect(element.props.platform).toBe("instagram");
    expect(element.props.handle).toBe("bravotv");
    expect(element.props.canonicalCatalogUrl).toBe("/social/instagram/bravotv/catalog");
    expect(element.props.variantLabel).toBe("Alt 1");
  });

  it("keeps the Alt 1 suffix when canonicalizing platform and handle params", async () => {
    const page = await import("@/app/social/[platform]/[handle]/catalog/alt-1/page");

    await expect(
      page.default({
        params: Promise.resolve({
          platform: "Instagram",
          handle: "@BravoTV",
        }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/social/instagram/bravotv/catalog/alt-1");
  });

  it("rejects invalid handles with notFound", async () => {
    const page = await import("@/app/social/[platform]/[handle]/catalog/alt-1/page");

    await expect(
      page.default({
        params: Promise.resolve({
          platform: "instagram",
          handle: "bad handle",
        }),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
