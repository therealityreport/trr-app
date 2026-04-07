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

import { POST } from "@/app/api/admin/trr-api/assets/content-type/route";

describe("assets content-type proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    getInternalAdminBearerTokenMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/assets/content-type",
    );
    getInternalAdminBearerTokenMock.mockReturnValue("internal-admin-token");
  });

  it("forwards content-type update payload to backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          origin: "media_assets",
          asset_id: "asset-1",
          content_type: "PROMO",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest("http://localhost/api/admin/trr-api/assets/content-type", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origin: "media_assets",
        asset_id: "asset-1",
        content_type: "PROMO",
      }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.content_type).toBe("PROMO");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://backend.example.com/api/v1/admin/assets/content-type",
    );
  });

  it("returns 500 when backend auth is missing", async () => {
    getInternalAdminBearerTokenMock.mockImplementation(() => {
      throw new Error("TRR_INTERNAL_ADMIN_SHARED_SECRET is not configured");
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/assets/content-type", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origin: "media_assets",
        asset_id: "asset-1",
        content_type: "PROMO",
      }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("TRR_INTERNAL_ADMIN_SHARED_SECRET is not configured");
  });
});
