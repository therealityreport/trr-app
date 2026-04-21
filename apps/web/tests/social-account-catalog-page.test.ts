// @ts-nocheck - server component route tests use mocked next/navigation behavior
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/social/instagram/bravotv/catalog",
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

describe("social account catalog page", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("normalizes valid params before rendering the canonical catalog tab", async () => {
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

  it("rejects invalid handles with notFound", async () => {
    const page = await import("@/app/social/[platform]/[handle]/catalog/page");

    await expect(
      page.default({
        params: Promise.resolve({
          platform: "instagram",
          handle: "bad handle",
        }),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("redirects the legacy admin page to the canonical catalog slug", async () => {
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
});
