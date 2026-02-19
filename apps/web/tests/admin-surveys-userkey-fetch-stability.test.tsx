import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import AdminSurveysPage from "@/app/admin/surveys/page";

const authMocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
}));

const guardState = {
  user: { uid: "u1", email: "admin@example.com", displayName: "Admin User" },
  userKey: "u1|admin@example.com|Admin User",
  checking: false,
  hasAccess: true,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (authMocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => ({
    user: guardState.user,
    userKey: guardState.userKey,
    checking: guardState.checking,
    hasAccess: guardState.hasAccess,
  }),
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("Admin surveys fetch stability", () => {
  beforeEach(() => {
    guardState.user = { uid: "u1", email: "admin@example.com", displayName: "Admin User" };
    guardState.userKey = "u1|admin@example.com|Admin User";
    guardState.checking = false;
    guardState.hasAccess = true;
    authMocks.fetchAdminWithAuth.mockReset();
  });

  it("does not refetch when user object identity changes but userKey is unchanged", async () => {
    authMocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/surveys?full=true")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { rerender } = render(<AdminSurveysPage />);

    await waitFor(() => {
      expect(authMocks.fetchAdminWithAuth).toHaveBeenCalledTimes(1);
    });

    // Simulate equivalent auth re-emission with a new user object reference.
    guardState.user = { uid: "u1", email: "admin@example.com", displayName: "Admin User" };
    rerender(<AdminSurveysPage />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(authMocks.fetchAdminWithAuth).toHaveBeenCalledTimes(1);
  });
});
