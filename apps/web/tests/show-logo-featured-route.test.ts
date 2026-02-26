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

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/logos/featured/route";

const SHOW_ID = "11111111-1111-1111-1111-111111111111";

const buildRequest = (body: Record<string, unknown>) =>
  new NextRequest(`http://localhost/api/admin/trr-api/shows/${SHOW_ID}/logos/featured`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

describe("show featured logo proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("http://backend.local/api/v1/admin/shows/logos/set-primary");
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-token";
  });

  it("returns 400 when neither media_asset_id nor show_image_id is provided", async () => {
    const response = await POST(buildRequest({}), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Either media_asset_id or show_image_id is required" });
  });

  it("proxies media_asset_id featured requests to backend set-primary endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ status: "imported" }),
    } as Response);

    const response = await POST(buildRequest({ media_asset_id: "asset-123" }), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ status: "imported" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("http://backend.local/api/v1/admin/shows/logos/set-primary");
    const requestInit = init as RequestInit;
    expect(requestInit.method).toBe("POST");
    expect((requestInit.headers as Record<string, string>).Authorization).toBe(
      "Bearer service-role-token"
    );
    expect(JSON.parse(String(requestInit.body))).toEqual({
      target_type: "show",
      show_id: SHOW_ID,
      media_asset_id: "asset-123",
    });
  });

  it("proxies show_image_id featured requests to backend set-primary endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ status: "imported" }),
    } as Response);

    const response = await POST(
      buildRequest({ show_image_id: "22222222-2222-2222-2222-222222222222" }),
      {
        params: Promise.resolve({ showId: SHOW_ID }),
      }
    );

    expect(response.status).toBe(200);
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const requestInit = init as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toEqual({
      target_type: "show",
      show_id: SHOW_ID,
      show_image_id: "22222222-2222-2222-2222-222222222222",
    });
  });
});
