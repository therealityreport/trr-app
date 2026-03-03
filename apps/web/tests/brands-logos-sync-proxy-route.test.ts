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

import { POST as postBrandLogosSync } from "@/app/api/admin/trr-api/brands/logos/sync/route";

describe("brands logos sync proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/brands/logos/sync");

    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    process.env.BRAND_LOGO_ROUTING_V2 = "true";
  });

  it("forwards POST payload to backend and returns metrics", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ targets_scanned: 12, imports_created: 4, unresolved: 3 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const request = new NextRequest("http://localhost/api/admin/trr-api/brands/logos/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "page", page: "news", only_missing: true }),
    });
    const response = await postBrandLogosSync(request);
    const payload = (await response.json()) as { targets_scanned?: number; imports_created?: number; unresolved?: number };

    expect(response.status).toBe(200);
    expect(payload.targets_scanned).toBe(12);
    expect(payload.imports_created).toBe(4);
    expect(payload.unresolved).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/brands/logos/sync",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer service-role-secret",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ scope: "page", page: "news", only_missing: true }),
      }),
    );
  });

  it("preserves upstream error status and detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "backend unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const request = new NextRequest("http://localhost/api/admin/trr-api/brands/logos/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "all" }),
    });
    const response = await postBrandLogosSync(request);
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(payload.error).toBe("backend unavailable");
  });
});
