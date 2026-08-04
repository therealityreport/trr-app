import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getBackendApiUrlMock,
  fetchMock,
  getInternalAdminBearerTokenMock,
  invalidateRouteResponseCacheMock,
  invalidateAdminBackendCacheMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  fetchMock: vi.fn(),
  getInternalAdminBearerTokenMock: vi.fn(),
  invalidateRouteResponseCacheMock: vi.fn(),
  invalidateAdminBackendCacheMock: vi.fn(),
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

vi.mock("@/lib/server/admin/route-response-cache", () => ({
  buildEntityScopedRouteCacheNamespace: (namespace: string, entityId: string) =>
    `${namespace}:${entityId}`,
  invalidateRouteResponseCache: invalidateRouteResponseCacheMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  invalidateAdminBackendCache: invalidateAdminBackendCacheMock,
}));

import { POST as PreviewPOST } from "@/app/api/admin/trr-api/people/[personId]/import-fandom/preview/route";
import { POST as CommitPOST } from "@/app/api/admin/trr-api/people/[personId]/import-fandom/commit/route";

describe("person fandom import proxy routes", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    fetchMock.mockReset();
    getInternalAdminBearerTokenMock.mockReset();
    invalidateRouteResponseCacheMock.mockReset();
    invalidateAdminBackendCacheMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    getBackendApiUrlMock.mockImplementation((path: string) => `http://backend/api/v1${path}`);
    vi.stubGlobal("fetch", fetchMock);
    getInternalAdminBearerTokenMock.mockReturnValue("internal-admin-token");
    invalidateAdminBackendCacheMock.mockResolvedValue(undefined);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role";
  });

  it("passes preview response through including warnings", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ profile: { source: "fandom" }, warnings: ["OpenAI cleanup unavailable"] }),
    });
    const request = new NextRequest("http://localhost/api/admin/trr-api/people/person-1/import-fandom/preview", {
      method: "POST",
      body: JSON.stringify({ include_allpages_scan: true }),
    });
    const response = await PreviewPOST(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.warnings).toEqual(["OpenAI cleanup unavailable"]);
  });

  it("returns warnings as an empty array when backend omits warnings", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ profile: { source: "fandom" } }),
    });
    const request = new NextRequest("http://localhost/api/admin/trr-api/people/person-1/import-fandom/preview", {
      method: "POST",
      body: JSON.stringify({ include_allpages_scan: false }),
    });
    const response = await PreviewPOST(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.warnings).toEqual([]);
  });

  it("passes commit backend errors through", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "No valid Fandom payload to commit" }),
    });
    const request = new NextRequest("http://localhost/api/admin/trr-api/people/person-1/import-fandom/commit", {
      method: "POST",
      body: JSON.stringify({ selected_page_urls: ["https://real-housewives.fandom.com/wiki/Lisa_Barlow"] }),
    });
    const response = await CommitPOST(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toBe("No valid Fandom payload to commit");
    expect(invalidateRouteResponseCacheMock).not.toHaveBeenCalled();
  });

  it("invalidates the affected person's gallery across admins after a successful commit", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ profile: { source: "fandom" }, warnings: [] }),
    });
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/import-fandom/commit",
      {
        method: "POST",
        body: JSON.stringify({
          selected_page_urls: ["https://real-housewives.fandom.com/wiki/Lisa_Barlow"],
        }),
      },
    );

    const response = await CommitPOST(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(response.status).toBe(200);
    expect(invalidateRouteResponseCacheMock).toHaveBeenCalledWith(
      "admin-person-photos:person-1",
    );
    expect(invalidateAdminBackendCacheMock).toHaveBeenCalledWith(
      "/admin/people/person-1/cache/invalidate",
      { routeName: "person-gallery" },
    );
  });
});
