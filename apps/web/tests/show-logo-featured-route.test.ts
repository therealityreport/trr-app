import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, updateShowByIdMock, getInternalAdminBearerTokenMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  updateShowByIdMock: vi.fn(),
  getInternalAdminBearerTokenMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  updateShowById: updateShowByIdMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  getInternalAdminBearerToken: getInternalAdminBearerTokenMock,
}));

import { POST } from "@/app/api/admin/trr-api/shows/[showId]/logos/featured/route";

const SHOW_ID = "11111111-1111-1111-1111-111111111111";
const SHOW_IMAGE_ID = "22222222-2222-2222-2222-222222222222";
const SHOW_RECORD = {
  id: SHOW_ID,
  name: "Test Show",
  primary_logo_image_id: null,
};

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
    updateShowByIdMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("http://backend.local/api/v1/admin/shows/logos/set-primary");
    updateShowByIdMock.mockResolvedValue(SHOW_RECORD);
    getInternalAdminBearerTokenMock.mockReset();
    getInternalAdminBearerTokenMock.mockReturnValue("test-admin-token");
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
    expect(payload).toEqual({ status: "imported", show: SHOW_RECORD });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(updateShowByIdMock).toHaveBeenCalledWith(SHOW_ID, {
      primaryLogoImageId: null,
    });

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("http://backend.local/api/v1/admin/shows/logos/set-primary");
    const requestInit = init as RequestInit;
    expect(requestInit.method).toBe("POST");
    expect((requestInit.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-admin-token"
    );
    expect(JSON.parse(String(requestInit.body))).toEqual({
      target_type: "show",
      show_id: SHOW_ID,
      asset_id: "asset-123",
    });
  });

  it("updates the show directly when show_image_id is selected", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    updateShowByIdMock.mockResolvedValue({
      ...SHOW_RECORD,
      primary_logo_image_id: SHOW_IMAGE_ID,
    });

    const response = await POST(
      buildRequest({ show_image_id: SHOW_IMAGE_ID }),
      {
        params: Promise.resolve({ showId: SHOW_ID }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(updateShowByIdMock).toHaveBeenCalledWith(SHOW_ID, {
      primaryLogoImageId: SHOW_IMAGE_ID,
    });
    expect(payload).toEqual({
      status: "updated",
      show: {
        ...SHOW_RECORD,
        primary_logo_image_id: SHOW_IMAGE_ID,
      },
    });
  });

  it("normalizes object-shaped backend detail payloads into readable errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        detail: [{ msg: "Logo asset row not found" }],
      }),
    } as Response);

    const response = await POST(buildRequest({ media_asset_id: "asset-123" }), {
      params: Promise.resolve({ showId: SHOW_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "Logo asset row not found" });
  });
});
