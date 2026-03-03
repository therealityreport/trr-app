import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

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

import AdminNewsPage from "@/app/admin/news/page";

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("admin news page auth bypass", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.fetchAdminWithAuth.mockImplementation((_input: RequestInfo | URL, _init?: RequestInit, options?: { allowDevAdminBypass?: boolean }) => {
      if (!options?.allowDevAdminBypass) {
        return Promise.reject(new Error("Not authenticated"));
      }
      return Promise.resolve(jsonResponse({ rows: [] }));
    });
  });

  it("passes allowDevAdminBypass=true to all admin requests", async () => {
    render(<AdminNewsPage />);

    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth.mock.calls.length).toBeGreaterThan(0);
    });

    for (const call of mocks.fetchAdminWithAuth.mock.calls) {
      expect(call[2]).toMatchObject({
        allowDevAdminBypass: true,
        preferredUser: mocks.guardState.user,
      });
    }
  });
});

