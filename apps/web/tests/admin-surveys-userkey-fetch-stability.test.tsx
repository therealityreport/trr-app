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
  usePathname: () => "/admin/surveys",
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

const queueStatusResponse = jsonResponse({
  queue_enabled: true,
  workers: {
    healthy: true,
    healthy_workers: 2,
    active_workers: 1,
    total_workers: 2,
    stale_after_seconds: 60,
    reason: null,
    workers: [],
  },
  queue: {
    by_status: {
      running: 0,
      pending: 0,
      queued: 0,
      retrying: 0,
      failed: 0,
      cancelled: 0,
      completed: 0,
    },
    by_platform: {},
    by_job_type: {},
    recent_failures: [],
  },
});

describe("Admin surveys fetch stability", () => {
  beforeEach(() => {
    guardState.user = { uid: "u1", email: "admin@example.com", displayName: "Admin User" };
    guardState.userKey = "u1|admin@example.com|Admin User";
    guardState.checking = false;
    guardState.hasAccess = true;
    authMocks.fetchAdminWithAuth.mockReset();
    authMocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (
        url.includes("/api/admin/trr-api/social/ingest/queue-status") ||
        url.includes("/api/admin/trr-api/social/ingest/health-dot")
      ) {
        return queueStatusResponse.clone();
      }
      if (url.includes("/api/admin/surveys?full=true")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
  });

  it("does not refetch when user object identity changes but userKey is unchanged", async () => {
    const surveyCallCount = () =>
      authMocks.fetchAdminWithAuth.mock.calls.filter(([input]) => String(input).includes("/api/admin/surveys?full=true")).length;

    const { rerender } = render(<AdminSurveysPage />);

    await waitFor(() => {
      expect(surveyCallCount()).toBe(1);
    });

    // Simulate equivalent auth re-emission with a new user object reference.
    guardState.user = { uid: "u1", email: "admin@example.com", displayName: "Admin User" };
    rerender(<AdminSurveysPage />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(surveyCallCount()).toBe(1);
  });
});
