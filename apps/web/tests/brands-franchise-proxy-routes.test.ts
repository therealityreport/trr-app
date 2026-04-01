import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { BRANDS_SHOWS_FRANCHISES_CACHE_NAMESPACE } from "@/lib/server/trr-api/brands-route-cache";

const { requireAdminMock, getBackendApiUrlMock, fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminReadResponseHeaders: ({
    cacheStatus,
    upstreamMs,
  }: {
    cacheStatus: string;
    upstreamMs?: number | null;
  }) => {
    const headers: Record<string, string> = { "x-trr-cache": cacheStatus };
    if (typeof upstreamMs === "number") {
      headers["x-trr-upstream-ms"] = String(Math.round(upstreamMs));
    }
    return headers;
  },
  buildAdminProxyErrorResponse: (error: unknown) =>
    Response.json(
      { error: error instanceof Error ? error.message : "failed" },
      {
        status:
          error instanceof Error && error.message === "unauthorized"
            ? 401
            : error instanceof Error && error.message === "forbidden"
              ? 403
              : 500,
      },
    ),
}));

import { GET as getShowsFranchises } from "@/app/api/admin/trr-api/brands/shows-franchises/route";
import { GET as getFranchiseRules } from "@/app/api/admin/trr-api/brands/franchise-rules/route";
import { PUT as putFranchiseRule } from "@/app/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/route";
import { POST as postApplyFranchiseRule } from "@/app/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply/route";

describe("brands proxy routes", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue({ uid: "admin-1" });
    getBackendApiUrlMock.mockImplementation((path: string) => `https://backend.example.com/api/v1${path}`);
    process.env.BRANDS_SHOWS_FRANCHISES_ENABLED = "true";
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    invalidateRouteResponseCache(BRANDS_SHOWS_FRANCHISES_CACHE_NAMESPACE);
  });

  it("proxies shows-franchises GET and forwards query params", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { rows: [{ show_name: "The Traitors" }], count: 1, groups: [] },
      durationMs: 5,
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/brands/shows-franchises?q=traitors&limit=5",
      { method: "GET" },
    );
    const response = await getShowsFranchises(request);
    const payload = (await response.json()) as { rows?: Array<{ show_name: string }>; count?: number };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(response.headers.get("x-trr-upstream-ms")).toBe("5");
    expect(payload.count).toBe(1);
    expect(payload.rows?.[0]?.show_name).toBe("The Traitors");
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/brands/shows-franchises",
      expect.objectContaining({
        queryString: "q=traitors&limit=5",
        routeName: "brands-shows-franchises",
      }),
    );
  });

  it("returns a cache hit for repeated shows-franchises requests", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { rows: [{ show_name: "The Traitors" }], count: 1, groups: [] },
      durationMs: 5,
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/brands/shows-franchises?q=traitors&limit=5",
      { method: "GET" },
    );
    const first = await getShowsFranchises(request);
    const second = await getShowsFranchises(request);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers.get("x-trr-cache")).toBe("hit");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);
  });

  it("proxies franchise-rules GET and preserves upstream status/body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "backend unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const request = new NextRequest("http://localhost/api/admin/trr-api/brands/franchise-rules", { method: "GET" });
    const response = await getFranchiseRules(request);
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(payload.error).toBe("backend unavailable");
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
    expect(getBackendApiUrlMock).toHaveBeenCalledWith("/admin/brands/franchise-rules");
  });

  it("proxies franchise-rule PUT and preserves upstream error status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Unknown franchise key" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const request = new NextRequest("http://localhost/api/admin/trr-api/brands/franchise-rules/unknown", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Unknown",
        primary_url: "https://example.com/wiki",
      }),
    });

    const response = await putFranchiseRule(request, { params: Promise.resolve({ franchiseKey: "unknown" }) });
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe("Unknown franchise key");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/brands/franchise-rules/unknown",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer service-role-secret",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("proxies franchise-rule apply POST to backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ franchise_key: "real-housewives", dry_run: true, missing_only: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const request = new NextRequest("http://localhost/api/admin/trr-api/brands/franchise-rules/real-housewives/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ missing_only: true, dry_run: true }),
    });

    const response = await postApplyFranchiseRule(request, {
      params: Promise.resolve({ franchiseKey: "real-housewives" }),
    });
    const payload = (await response.json()) as { franchise_key?: string; dry_run?: boolean };

    expect(response.status).toBe(200);
    expect(payload.franchise_key).toBe("real-housewives");
    expect(payload.dry_run).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/brands/franchise-rules/real-housewives/apply",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer service-role-secret",
          "Content-Type": "application/json",
        }),
      }),
    );
  });
});
