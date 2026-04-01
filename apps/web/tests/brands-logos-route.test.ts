import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { BRANDS_LOGOS_CACHE_NAMESPACE } from "@/lib/server/trr-api/brands-route-cache";

const { requireAdminMock, fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
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
    NextResponse.json(
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

import { GET } from "@/app/api/admin/trr-api/brands/logos/route";

describe("brands logos route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-1" });
    process.env.BRAND_LOGO_ROUTING_V2 = "true";
    invalidateRouteResponseCache(BRANDS_LOGOS_CACHE_NAMESPACE);
  });

  it("proxies logo queries through the admin read proxy", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { rows: [{ target_label: "Bravo" }], count: 1 },
      durationMs: 4,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/brands/logos?target_type=network&query=bravo"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(response.headers.get("x-trr-upstream-ms")).toBe("4");
    expect(payload.rows?.[0]?.target_label).toBe("Bravo");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/brands/logos",
      expect.objectContaining({
        queryString: "target_type=network&query=bravo",
        routeName: "brands-logos",
      }),
    );
  });

  it("returns a cache hit for repeated logo requests", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { rows: [{ target_label: "Bravo" }], count: 1 },
      durationMs: 4,
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/brands/logos?target_type=network");
    const first = await GET(request);
    const second = await GET(request);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers.get("x-trr-cache")).toBe("hit");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);
  });
});
