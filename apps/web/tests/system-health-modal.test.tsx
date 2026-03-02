import React from "react";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SystemHealthModal, { HealthIndicator } from "@/components/admin/SystemHealthModal";

const { fetchAdminWithAuthMock, usePathnameMock } = vi.hoisted(() => ({
  fetchAdminWithAuthMock: vi.fn(),
  usePathnameMock: vi.fn(() => "/admin/social-media"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (fetchAdminWithAuthMock as (...inner: unknown[]) => unknown)(...args),
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("SystemHealthModal polling", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    fetchAdminWithAuthMock.mockReset();
    usePathnameMock.mockReturnValue("/admin/social-media");
    delete (window as Window & { __trr_admin_health_dot_poller__?: unknown }).__trr_admin_health_dot_poller__;
    window.localStorage.removeItem("trr:admin:health-dot:leader:v1");
    window.localStorage.removeItem("trr:admin:health-dot:snapshot:v1");
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    fetchAdminWithAuthMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/trr-api/social/ingest/health-dot")) {
        return jsonResponse({
          queue_enabled: true,
          workers: { healthy: true, healthy_workers: 1 },
          queue: { by_status: { running: 0, pending: 0, queued: 0, failed: 0 } },
          updated_at: "2026-02-28T12:00:00.000Z",
        });
      }
      if (url.includes("/api/admin/trr-api/social/ingest/queue-status")) {
        return jsonResponse({
          queue_enabled: true,
          workers: {
            healthy: true,
            healthy_workers: 1,
            active_workers: 1,
            total_workers: 1,
            stale_after_seconds: 60,
            workers: [],
            reason: null,
          },
          queue: {
            by_status: { running: 0, pending: 0, queued: 0, retrying: 0, failed: 0, cancelled: 0, completed: 0 },
            by_platform: {},
            by_job_type: {},
            recent_failures: [],
          },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses health-dot polling for header indicator", async () => {
    render(<HealthIndicator onClick={() => undefined} />);

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/health-dot"),
        ),
      ).toBe(true);
    }, { timeout: 4000 });
    expect(
      fetchAdminWithAuthMock.mock.calls.some(([input]) =>
        String(input).includes("/api/admin/trr-api/social/ingest/queue-status"),
      ),
    ).toBe(false);
  });

  it("loads full queue diagnostics when modal is open", async () => {
    render(<SystemHealthModal isOpen onClose={() => undefined} />);

    await waitFor(() => {
      expect(
        fetchAdminWithAuthMock.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/social/ingest/queue-status"),
        ),
      ).toBe(true);
    }, { timeout: 4000 });
  });
});
