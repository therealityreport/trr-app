import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

import { GET } from "@/app/api/admin/trr-api/operations/health/route";

describe("admin operations health route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/operations/health");
  });

  it("forwards query params with service-role auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          summary: { active_total: 1, stale_total: 0, cancelling_total: 0, runtime_split: { modal: 1, local: 0, other: 0, unknown: 0 } },
          active_operations: [],
          stale_operations: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/operations/health?limit=50&stale_after_seconds=600", {
        method: "GET",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.summary.active_total).toBe(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("limit=50");
    expect(String(fetchMock.mock.calls[0][0])).toContain("stale_after_seconds=600");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "GET",
      headers: { Authorization: "Bearer service-role-secret" },
    });
  });

  it("clamps oversized limits for cloud-backend compatibility", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          summary: { active_total: 0, stale_total: 0, cancelling_total: 0, runtime_split: { modal: 0, local: 0, other: 0, unknown: 0 } },
          active_operations: [],
          stale_operations: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/operations/health?limit=200&stale_after_seconds=600", {
        method: "GET",
      }),
    );

    expect(response.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toContain("limit=100");
    expect(String(fetchMock.mock.calls[0][0])).toContain("stale_after_seconds=600");
  });
});
