import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, getInternalAdminBearerTokenMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  getInternalAdminBearerTokenMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  getInternalAdminBearerToken: getInternalAdminBearerTokenMock,
}));

import { POST } from "@/app/api/admin/trr-api/operations/stale/cancel/route";

describe("admin operations stale cancel route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    getInternalAdminBearerTokenMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/operations/stale/cancel");
    getInternalAdminBearerTokenMock.mockReturnValue("internal-admin-token");
  });

  it("forwards POST body with internal admin auth", async () => {
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
        Authorization: "Bearer internal-admin-token",
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
