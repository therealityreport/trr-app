// @ts-nocheck - server component route tests use mocked next/navigation behavior
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/social/tiktok/bravotv",
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

describe("social account profile stats page", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it.each([
    { platform: "TikTok", handle: "@BravoTV", expectedPlatform: "tiktok", expectedHandle: "bravotv" },
    { platform: "Twitter", handle: "@BravoTV", expectedPlatform: "twitter", expectedHandle: "bravotv" },
    { platform: "Threads", handle: "@BravoTV", expectedPlatform: "threads", expectedHandle: "bravotv" },
    { platform: "YouTube", handle: "@Bravo", expectedPlatform: "youtube", expectedHandle: "bravo" },
  ])(
    "normalizes valid $platform params before rendering the shared profile page",
    async ({ platform, handle, expectedPlatform, expectedHandle }) => {
      const page = await import("@/app/admin/social/[platform]/[handle]/page");
      const element = await page.default({
        params: Promise.resolve({
          platform,
          handle,
        }),
      });

      expect(element.props.platform).toBe(expectedPlatform);
      expect(element.props.handle).toBe(expectedHandle);
      expect(element.props.activeTab).toBe("stats");
    },
  );
});
