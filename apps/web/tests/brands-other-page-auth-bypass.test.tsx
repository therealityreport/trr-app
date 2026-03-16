import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AdminBrandsPage from "@/app/admin/brands/page";

const navigationState = vi.hoisted(() => ({
  pathname: "/brands",
  search: "category=other&view=gallery",
  replace: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  guardState: {
    user: { uid: "admin-1", email: "admin@example.com" },
    checking: false,
    hasAccess: true,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({ replace: navigationState.replace }),
  useSearchParams: () => new URLSearchParams(navigationState.search),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("unified brands other view auth bypass", () => {
  beforeEach(() => {
    navigationState.search = "category=other&view=gallery";
    navigationState.replace.mockReset();
    mocks.fetchAdminWithAuth.mockReset();
    mocks.fetchAdminWithAuth.mockImplementation((_input: RequestInfo | URL, _init?: RequestInit, options?: { allowDevAdminBypass?: boolean }) => {
      if (!options?.allowDevAdminBypass) {
        return Promise.reject(new Error("Not authenticated"));
      }
      return Promise.resolve(jsonResponse({ rows: [] }));
    });
  });

  it("uses the unified page while preserving dev-admin bypass auth", async () => {
    render(<AdminBrandsPage />);

    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth.mock.calls.length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: "Other" })).toBeInTheDocument();
    });

    for (const call of mocks.fetchAdminWithAuth.mock.calls) {
      expect(call[2]).toMatchObject({
        allowDevAdminBypass: true,
        preferredUser: mocks.guardState.user,
      });
    }
  });
});
