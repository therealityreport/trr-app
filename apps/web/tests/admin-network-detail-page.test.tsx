import { describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    redirectMock(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("@/lib/admin/brand-profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/brand-profile")>();
  return { ...actual };
});

import AdminNetworkStreamingAliasPage from "@/app/admin/networks/[entityType]/[entitySlug]/page";

describe("Admin network detail page (redirect alias)", () => {
  it("redirects to the friendly brand slug for a network entity", async () => {
    redirectMock.mockClear();

    await expect(
      AdminNetworkStreamingAliasPage({
        params: Promise.resolve({ entityType: "network", entitySlug: "bravo" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/brands/bravo");
  });

  it("redirects with search params preserved", async () => {
    redirectMock.mockClear();

    await expect(
      AdminNetworkStreamingAliasPage({
        params: Promise.resolve({ entityType: "network", entitySlug: "bravo" }),
        searchParams: Promise.resolve({ tab: "logos" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/brands/bravo?tab=logos");
  });

  it("falls back to encoded slug for unrecognized input", async () => {
    redirectMock.mockClear();

    await expect(
      AdminNetworkStreamingAliasPage({
        params: Promise.resolve({ entityType: "production", entitySlug: "" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    // toFriendlyBrandSlug("") returns "", so it falls back to encodeURIComponent("")
    expect(redirectMock).toHaveBeenCalledWith("/brands/");
  });
});
