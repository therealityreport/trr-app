// @ts-nocheck - server component redirect tests use mocked next/navigation behavior
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

describe("brand-nyt homepage tab route", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders the homepage tab through the shared brand-nyt page client", async () => {
    const page = await import("@/app/admin/design-docs/brand-nyt/[tab]/page");
    const element = await page.default({
      params: Promise.resolve({ tab: "homepage" }),
    });

    expect(element.props.activeSection).toBe("brand-nyt");
    expect(element.props.brandTab).toBe("homepage");
  });

  it("redirects invalid brand-nyt tabs to the homepage tab", async () => {
    const page = await import("@/app/admin/design-docs/brand-nyt/[tab]/page");

    await expect(
      page.default({
        params: Promise.resolve({ tab: "nope" }),
      }),
    ).rejects.toThrow("REDIRECT:/design-docs/brand-nyt/homepage");
  });
});
