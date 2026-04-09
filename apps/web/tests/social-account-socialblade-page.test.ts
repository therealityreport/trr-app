// @ts-nocheck - server component route tests use mocked next/navigation behavior
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/social/instagram/bravotv/socialblade",
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

describe("social account SocialBlade page", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("normalizes supported params before rendering the SocialBlade tab", async () => {
    const page = await import("@/app/admin/social/[platform]/[handle]/socialblade/page");
    const element = await page.default({
      params: Promise.resolve({
        platform: "Facebook",
        handle: "@BravoTV",
      }),
    });

    expect(element.props.platform).toBe("facebook");
    expect(element.props.handle).toBe("bravotv");
    expect(element.props.activeTab).toBe("socialblade");
  });

  it("rejects unsupported socialblade platforms", async () => {
    const page = await import("@/app/admin/social/[platform]/[handle]/socialblade/page");

    await expect(
      page.default({
        params: Promise.resolve({
          platform: "threads",
          handle: "@BravoTV",
        }),
      }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
