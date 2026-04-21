// @ts-nocheck - server component redirect tests use mocked next/navigation behavior
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/design-docs/admin-ia",
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

describe("admin route aliases", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("redirects legacy admin show alias to the root show workspace", async () => {
    const page = await import("@/app/admin/[showId]/page");
    await expect(
      page.default({
        params: Promise.resolve({ showId: "rhoslc" }),
        searchParams: Promise.resolve({ tab: "social" }),
      }),
    ).rejects.toThrow("REDIRECT:/rhoslc?tab=social");
  });

  it("redirects legacy nested admin show alias to the root show workspace", async () => {
    const page = await import("@/app/admin/[showId]/[...rest]/page");
    await expect(
      page.default({
        params: Promise.resolve({ showId: "rhoslc", rest: ["s6", "social"] }),
        searchParams: Promise.resolve({ source_scope: "community" }),
      }),
    ).rejects.toThrow("REDIRECT:/rhoslc/s6/social?source_scope=community");
  });

  it("redirects the old design docs admin-ia route to the design system tab", async () => {
    const page = await import("@/app/admin/design-docs/[section]/page");
    await expect(
      page.default({
        params: Promise.resolve({ section: "admin-ia" }),
      }),
    ).rejects.toThrow("REDIRECT:/design-system/admin-labels");
  });

  it("redirects the legacy /admin/social-media alias to the canonical admin social hub", async () => {
    const page = await import("@/app/admin/social-media/page");
    expect(() => page.default()).toThrow("REDIRECT:/admin/social");
  });

  it("redirects the legacy creator-content alias to the canonical admin social namespace", async () => {
    const page = await import("@/app/admin/social-media/creator-content/page");
    expect(() => page.default()).toThrow("REDIRECT:/admin/social/creator-content");
  });

  it("redirects the legacy bravo-content alias to the canonical admin social namespace", async () => {
    const page = await import("@/app/admin/social-media/bravo-content/page");
    expect(() => page.default()).toThrow("REDIRECT:/admin/social/bravo-content");
  });
});
