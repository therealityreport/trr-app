import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getAuthDiagnosticsSnapshotMock, evaluateAuthCutoverReadinessMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getAuthDiagnosticsSnapshotMock: vi.fn(),
  evaluateAuthCutoverReadinessMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  getAuthDiagnosticsSnapshot: getAuthDiagnosticsSnapshotMock,
}));

vi.mock("@/lib/server/auth-cutover", () => ({
  evaluateAuthCutoverReadiness: evaluateAuthCutoverReadinessMock,
}));

import { GET } from "@/app/api/admin/auth/status/route";

describe("/api/admin/auth/status route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getAuthDiagnosticsSnapshotMock.mockReset();
    evaluateAuthCutoverReadinessMock.mockReset();
  });

  it("returns auth diagnostics for an admin user", async () => {
    requireAdminMock.mockResolvedValue({
      uid: "admin-uid",
      provider: "firebase",
      token: { uid: "admin-uid" },
    });
    getAuthDiagnosticsSnapshotMock.mockReturnValue({
      provider: "firebase",
      shadowMode: true,
      allowlistSizes: { emails: 2, uids: 3, displayNames: 1 },
      counters: {
        shadowChecks: 5,
        shadowFailures: 1,
        shadowMismatchEvents: 2,
        shadowMismatchFieldCounts: { uid: 0, email: 2, name: 1 },
        fallbackSuccesses: 1,
      },
    });
    evaluateAuthCutoverReadinessMock.mockReturnValue({
      ready: false,
      reasons: ["Shadow checks below threshold (5/50)"],
      thresholds: {
        minShadowChecks: 50,
        maxShadowFailures: 0,
        maxShadowMismatchEvents: 0,
      },
      observed: {
        shadowChecks: 5,
        shadowFailures: 1,
        shadowMismatchEvents: 2,
      },
    });

    const request = new NextRequest("http://localhost/api/admin/auth/status", { method: "GET" });
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      diagnostics: {
        provider: "firebase",
        shadowMode: true,
        allowlistSizes: { emails: 2, uids: 3, displayNames: 1 },
        counters: {
          shadowChecks: 5,
          shadowFailures: 1,
          shadowMismatchEvents: 2,
          shadowMismatchFieldCounts: { uid: 0, email: 2, name: 1 },
          fallbackSuccesses: 1,
        },
      },
      cutoverReadiness: {
        ready: false,
        reasons: ["Shadow checks below threshold (5/50)"],
        thresholds: {
          minShadowChecks: 50,
          maxShadowFailures: 0,
          maxShadowMismatchEvents: 0,
        },
        observed: {
          shadowChecks: 5,
          shadowFailures: 1,
          shadowMismatchEvents: 2,
        },
      },
      viewer: { uid: "admin-uid", provider: "firebase" },
    });
  });

  it("returns 401 when request is unauthorized", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    const request = new NextRequest("http://localhost/api/admin/auth/status", { method: "GET" });
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "unauthorized" });
  });
});
