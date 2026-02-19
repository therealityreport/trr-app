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

import { POST } from "@/app/api/admin/trr-api/media-assets/[assetId]/variants/route";

const makeRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/admin/trr-api/media-assets/asset-1/variants", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("media asset variants proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(
      "https://backend.example.com/api/v1/admin/media-assets/asset-1/variants",
    );
  });

  it("forwards POST with auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ asset_id: "asset-1", generated: 2 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest({ force: true }), {
      params: Promise.resolve({ assetId: "asset-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.generated).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://backend.example.com/api/v1/admin/media-assets/asset-1/variants",
    );
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer service-role-secret",
      "Content-Type": "application/json",
    });
    expect(options.body).toBe(JSON.stringify({ force: true }));
  });

  it("returns timeout response when fetch aborts", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest({ force: true }), {
      params: Promise.resolve({ assetId: "asset-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(504);
    expect(payload.error).toBe("Variant generation timed out");
  });

  it("passes through backend error payload and status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Variant generation failed", detail: "asset missing" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest({ force: true }), {
      params: Promise.resolve({ assetId: "asset-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe("Variant generation failed");
    expect(payload.detail).toBe("asset missing");
  });
});
