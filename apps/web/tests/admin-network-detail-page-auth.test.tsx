import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mocks.redirect(url),
}));

describe("admin network detail page", () => {
  beforeEach(() => {
    mocks.redirect.mockReset();
  });

  it("redirects legacy nested brand routes to the canonical brand profile slug", async () => {
    const { default: AdminNetworkStreamingDetailPage } = await import(
      "@/app/admin/networks/[entityType]/[entitySlug]/page"
    );

    await AdminNetworkStreamingDetailPage({
      params: Promise.resolve({
        entityType: "network",
        entitySlug: "bravo",
      }),
      searchParams: Promise.resolve({ tab: "logos" }),
    });

    expect(mocks.redirect).toHaveBeenCalledWith("/brands/bravo?tab=logos");
  });
});
