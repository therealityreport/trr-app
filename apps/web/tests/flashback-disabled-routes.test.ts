import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    redirectMock(href);
    throw new Error("NEXT_REDIRECT");
  },
}));

describe("flashback disabled routes", () => {
  beforeEach(() => {
    vi.resetModules();
    redirectMock.mockReset();
  });

  it("redirects the flashback layout to the hub", async () => {
    const layout = await import("@/app/flashback/layout");

    await expect(layout.default({ children: null })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/hub");
  });

  it("redirects the flashback root page to the hub", async () => {
    const page = await import("@/app/flashback/page");

    expect(() => page.default()).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/hub");
  });

  it("redirects the flashback cover page to the hub", async () => {
    const page = await import("@/app/flashback/cover/page");

    expect(() => page.default()).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/hub");
  });

  it("redirects the flashback play page to the hub", async () => {
    const page = await import("@/app/flashback/play/page");

    expect(() => page.default()).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/hub");
  });
});
