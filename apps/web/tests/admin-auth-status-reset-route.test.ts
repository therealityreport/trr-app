import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, resetAuthDiagnosticsSnapshotMock, evaluateAuthCutoverReadinessMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  resetAuthDiagnosticsSnapshotMock: vi.fn(),
  evaluateAuthCutoverReadinessMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  resetAuthDiagnosticsSnapshot: resetAuthDiagnosticsSnapshotMock,
}));

vi.mock("@/lib/server/auth-cutover", () => ({
  evaluateAuthCutoverReadiness: evaluateAuthCutoverReadinessMock,
}));

import { POST } from "@/app/api/admin/auth/status/reset/route";

describe("/api/admin/auth/status/reset route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    resetAuthDiagnosticsSnapshotMock.mockReset();
    evaluateAuthCutoverReadinessMock.mockReset();
  });

  it("resets diagnostics and returns readiness payload", async () => {
    requireAdminMock.mockResolvedValue({
      uid: "admin-uid",
      provider: "firebase",
      token: { uid: "admin-uid" },
    });
    resetAuthDiagnosticsSnapshotMock.mockReturnValue({
      provider: "firebase",
      shadowMode: true,
      windowStartedAt: "2026-02-17T01:00:00.000Z",
      lastObservedAt: null,
      allowlistSizes: { emails: 2, uids: 3, displayNames: 1 },
      counters: {
        shadowChecks: 0,
        shadowFailures: 0,
        shadowMismatchEvents: 0,
        shadowMismatchFieldCounts: { uid: 0, email: 0, name: 0 },
        fallbackSuccesses: 0,
      },
    });
    evaluateAuthCutoverReadinessMock.mockReturnValue({
      ready: false,
      reasons: ["Shadow checks below threshold (0/50)"],
      thresholds: {
        minShadowChecks: 50,
        maxShadowFailures: 0,
        maxShadowMismatchEvents: 0,
      },
      observed: {
        shadowChecks: 0,
        shadowFailures: 0,
        shadowMismatchEvents: 0,
      },
    });

    const request = new NextRequest("http://localhost/api/admin/auth/status/reset", { method: "POST" });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.reset).toBe(true);
    expect(payload.viewer).toEqual({ uid: "admin-uid", provider: "firebase" });
    expect(payload.cutoverReadiness.ready).toBe(false);
    expect(resetAuthDiagnosticsSnapshotMock).toHaveBeenCalledTimes(1);
  });

  it("returns 403 when request is forbidden", async () => {
    requireAdminMock.mockRejectedValue(new Error("forbidden"));

    const request = new NextRequest("http://localhost/api/admin/auth/status/reset", { method: "POST" });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({ error: "forbidden" });
  });
});
