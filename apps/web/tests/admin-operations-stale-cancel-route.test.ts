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

import { POST } from "@/app/api/admin/trr-api/operations/stale/cancel/route";

describe("admin operations stale cancel route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/operations/stale/cancel");
  });

  it("forwards POST body with service-role auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ cancelled_operations: 1, cancelled_operation_ids: ["op-1"] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/trr-api/operations/stale/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation_ids: ["op-1"] }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.cancelled_operations).toBe(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://backend.example.com/api/v1/admin/operations/stale/cancel");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer service-role-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ operation_ids: ["op-1"] }),
    });
  });

  it("forwards force-selected cancellation payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ cancelled_operations: 1, cancelled_operation_ids: ["op-1"] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      new NextRequest("http://localhost/api/admin/trr-api/operations/stale/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation_ids: ["op-1"], force_selected: true }),
      }),
    );

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      body: JSON.stringify({ operation_ids: ["op-1"], force_selected: true }),
    });
  });
});
