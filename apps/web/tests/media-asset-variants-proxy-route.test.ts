import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, buildInternalAdminHeadersMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  buildInternalAdminHeadersMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  buildInternalAdminHeaders: buildInternalAdminHeadersMock,
}));

import { POST as autoCountPOST } from "@/app/api/admin/trr-api/media-assets/[assetId]/auto-count/route";
import { POST as replaceFromUrlPOST } from "@/app/api/admin/trr-api/media-assets/[assetId]/replace-from-url/route";
import { POST as reverseImageSearchPOST } from "@/app/api/admin/trr-api/media-assets/[assetId]/reverse-image-search/route";
import { POST as variantsPOST } from "@/app/api/admin/trr-api/media-assets/[assetId]/variants/route";

const makeRequest = (path: string, body: Record<string, unknown>) =>
  new NextRequest(`http://localhost/api/admin/trr-api/media-assets/asset-1/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("media asset image action proxy routes", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    buildInternalAdminHeadersMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockImplementation(
      (path: string) => `https://backend.example.com/api/v1${path}`,
    );
    buildInternalAdminHeadersMock.mockImplementation((_context: unknown, headers?: HeadersInit) => {
      const out = new Headers(headers);
      out.set("Authorization", "Bearer internal-admin-token");
      return out;
    });
  });

  it("forwards variants POST with auth headers and body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ asset_id: "asset-1", generated: 2 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await variantsPOST(makeRequest("variants", { force: true }), {
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
    const headers = options.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer internal-admin-token");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(options.body).toBe(JSON.stringify({ force: true }));
  });

  it("adds force query params for auto-count", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ asset_id: "asset-1", counted: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await autoCountPOST(makeRequest("auto-count", { force: true }), {
      params: Promise.resolve({ assetId: "asset-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.counted).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://backend.example.com/api/v1/admin/media-assets/asset-1/auto-count?force=true",
    );
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe(JSON.stringify({ force: true }));
  });

  it("sends an empty JSON body for reverse image search", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ matches: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await reverseImageSearchPOST(makeRequest("reverse-image-search", {}), {
      params: Promise.resolve({ assetId: "asset-1" }),
    });

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://backend.example.com/api/v1/admin/media-assets/asset-1/reverse-image-search",
    );
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe("{}");
  });

  it("forwards replace-from-url JSON bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ replaced: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await replaceFromUrlPOST(
      makeRequest("replace-from-url", { image_url: "https://example.com/image.jpg" }),
      { params: Promise.resolve({ assetId: "asset-1" }) },
    );

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://backend.example.com/api/v1/admin/media-assets/asset-1/replace-from-url",
    );
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe(
      JSON.stringify({ image_url: "https://example.com/image.jpg" }),
    );
  });

  it("returns timeout response when fetch aborts", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);

    const response = await variantsPOST(makeRequest("variants", { force: true }), {
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

    const response = await variantsPOST(makeRequest("variants", { force: true }), {
      params: Promise.resolve({ assetId: "asset-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe("Variant generation failed");
    expect(payload.detail).toBe("asset missing");
  });
});
