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

import { GET as getShowsFranchises } from "@/app/api/admin/trr-api/brands/shows-franchises/route";
import { GET as getFranchiseRules } from "@/app/api/admin/trr-api/brands/franchise-rules/route";
import { PUT as putFranchiseRule } from "@/app/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/route";
import { POST as postApplyFranchiseRule } from "@/app/api/admin/trr-api/brands/franchise-rules/[franchiseKey]/apply/route";

describe("brands proxy routes", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockImplementation((path: string) => `https://backend.example.com/api/v1${path}`);
    process.env.BRANDS_SHOWS_FRANCHISES_ENABLED = "true";
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
  });

  it("proxies shows-franchises GET and forwards query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ rows: [{ show_name: "The Traitors" }], count: 1, groups: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/brands/shows-franchises?q=traitors&limit=5",
      { method: "GET" },
    );
    const response = await getShowsFranchises(request);
    const payload = (await response.json()) as { rows?: Array<{ show_name: string }>; count?: number };

    expect(response.status).toBe(200);
    expect(payload.count).toBe(1);
    expect(payload.rows?.[0]?.show_name).toBe("The Traitors");
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
    expect(getBackendApiUrlMock).toHaveBeenCalledWith("/admin/brands/shows-franchises");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/brands/shows-franchises?q=traitors&limit=5",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer service-role-secret",
        }),
      }),
    );
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
