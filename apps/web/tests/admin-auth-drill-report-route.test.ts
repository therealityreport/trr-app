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

import { GET } from "@/app/api/admin/auth/status/drill-report/route";

describe("/api/admin/auth/status/drill-report route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getAuthDiagnosticsSnapshotMock.mockReset();
    evaluateAuthCutoverReadinessMock.mockReset();

    requireAdminMock.mockResolvedValue({
      uid: "admin-uid",
      provider: "firebase",
      token: { uid: "admin-uid" },
    });
    getAuthDiagnosticsSnapshotMock.mockReturnValue({
      provider: "firebase",
      shadowMode: true,
      windowStartedAt: "2026-02-17T01:00:00.000Z",
      lastObservedAt: "2026-02-17T01:05:00.000Z",
      allowlistSizes: { emails: 2, uids: 3, displayNames: 1 },
      counters: {
        shadowChecks: 64,
        shadowFailures: 0,
        shadowMismatchEvents: 0,
        shadowMismatchFieldCounts: { uid: 0, email: 0, name: 0 },
        fallbackSuccesses: 1,
      },
    });
    evaluateAuthCutoverReadinessMock.mockReturnValue({
      ready: true,
      reasons: [],
      thresholds: {
        minShadowChecks: 50,
        maxShadowFailures: 0,
        maxShadowMismatchEvents: 0,
      },
      observed: {
        shadowChecks: 64,
        shadowFailures: 0,
        shadowMismatchEvents: 0,
      },
    });
  });

  it("returns JSON drill report", async () => {
    const request = new NextRequest("http://localhost/api/admin/auth/status/drill-report", { method: "GET" });
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.runbook).toEqual({
      task: "TASK8",
      stage: "Stage 3 Cutover Drill",
    });
    expect(payload.recommendedAction).toBe("proceed_cutover");
    expect(payload.cutoverReadiness.ready).toBe(true);
    expect(payload.viewer).toEqual({ uid: "admin-uid", provider: "firebase" });
  });

  it("returns downloadable payload when requested", async () => {
    const request = new NextRequest("http://localhost/api/admin/auth/status/drill-report?format=download", {
      method: "GET",
    });
    const response = await GET(request);
    const contentDisposition = response.headers.get("content-disposition");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(contentDisposition).toContain("attachment; filename=\"auth-cutover-drill-");
    expect(body).toContain("\"recommendedAction\": \"proceed_cutover\"");
  });
});
