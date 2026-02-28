import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  guardState: {
    user: { uid: "admin-1", email: "admin@example.com" },
    checking: false,
    hasAccess: true,
  },
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

vi.mock("@/components/admin/AdminGlobalHeader", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminBreadcrumbs", () => ({
  __esModule: true,
  default: () => <nav aria-label="Breadcrumb" />,
}));

vi.mock("@/components/admin/BrandsTabs", () => ({
  __esModule: true,
  default: () => <div data-testid="brands-tabs" />,
}));

import BrandsShowsAndFranchisesPage from "@/app/brands/shows-and-franchises/page";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("brands shows-and-franchises page auth behavior", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    process.env.NEXT_PUBLIC_BRANDS_SHOWS_FRANCHISES_ENABLED = "true";
    process.env.BRANDS_SHOWS_FRANCHISES_ENABLED = "true";

    mocks.fetchAdminWithAuth.mockImplementation(
      (input: RequestInfo | URL, _init?: RequestInit, options?: { allowDevAdminBypass?: boolean }) => {
        if (!options?.allowDevAdminBypass) {
          return Promise.reject(new Error("Not authenticated"));
        }
        const url = String(input);
        if (url.includes("/api/admin/trr-api/brands/franchise-rules")) {
          return Promise.resolve(jsonResponse({ rules: [], suggested_franchises: [] }));
        }
        if (url.includes("/api/admin/trr-api/brands/shows-franchises")) {
          return Promise.resolve(jsonResponse({ rows: [], count: 0, groups: [] }));
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      },
    );
  });

  it("passes allowDevAdminBypass=true in page fetch helper calls", async () => {
    render(<BrandsShowsAndFranchisesPage />);

    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("heading", { name: "Shows & Franchises" })).toBeInTheDocument();
    });

    for (const call of mocks.fetchAdminWithAuth.mock.calls) {
      expect(call[2]).toMatchObject({
        allowDevAdminBypass: true,
        preferredUser: mocks.guardState.user,
      });
    }
    expect(screen.queryByText("Not authenticated")).not.toBeInTheDocument();
  });
});
