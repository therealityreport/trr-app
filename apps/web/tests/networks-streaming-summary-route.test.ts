import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";

const { requireAdminMock, fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  invalidateAdminBackendCache: vi.fn(),
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
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

import { GET } from "@/app/api/admin/networks-streaming/summary/route";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE } from "@/lib/server/trr-api/networks-streaming-route-cache";

describe("networks-streaming summary route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    invalidateRouteResponseCache(NETWORKS_STREAMING_SUMMARY_CACHE_NAMESPACE);
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("returns aggregated summary payload for admin", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        totals: { total_available_shows: 10, total_added_shows: 4 },
        rows: [
          {
            type: "network",
            name: "Bravo",
            available_show_count: 8,
            added_show_count: 3,
            hosted_logo_url: "https://cdn.example.com/bravo.png",
            hosted_logo_black_url: "https://cdn.example.com/bravo-black.png",
            hosted_logo_white_url: "https://cdn.example.com/bravo-white.png",
            wikidata_id: "Q123",
            wikipedia_url: "https://en.wikipedia.org/wiki/Bravo_(American_TV_network)",
            tmdb_entity_id: "174",
            homepage_url: "https://www.bravotv.com",
            resolution_status: "resolved",
            resolution_reason: null,
            last_attempt_at: "2026-02-19T00:00:00Z",
            has_logo: true,
            has_bw_variants: true,
            has_links: true,
          },
        ],
        generated_at: "2026-02-19T00:00:00.000Z",
      },
      durationMs: 6,
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/networks-streaming/summary"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.totals.total_available_shows).toBe(10);
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].hosted_logo_black_url).toBe("https://cdn.example.com/bravo-black.png");
    expect(payload.rows[0].hosted_logo_white_url).toBe("https://cdn.example.com/bravo-white.png");
    expect(payload.rows[0].has_bw_variants).toBe(true);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/shows/networks-streaming/summary",
      expect.objectContaining({ routeName: "networks-streaming-summary" }),
    );
  });

  it("includes production company rows in summary", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        totals: { total_available_shows: 20, total_added_shows: 8 },
        rows: [
          {
            type: "production",
            name: "Warner Bros. Television",
            available_show_count: 12,
            added_show_count: 5,
            hosted_logo_url: "https://cdn.example.com/wb.png",
            hosted_logo_black_url: null,
            hosted_logo_white_url: null,
            wikidata_id: "Q1043427",
            wikipedia_url: "https://en.wikipedia.org/wiki/Warner_Bros._Television",
            tmdb_entity_id: "1957",
            homepage_url: null,
            resolution_status: "resolved",
            resolution_reason: null,
            last_attempt_at: "2026-02-25T00:00:00Z",
            has_logo: true,
            has_bw_variants: false,
            has_links: true,
          },
        ],
        generated_at: "2026-02-26T00:00:00.000Z",
      },
      durationMs: 4,
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/networks-streaming/summary"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    const productionRow = payload.rows.find((r: any) => r.type === "production");
    expect(productionRow).toBeDefined();
    expect(productionRow.name).toBe("Warner Bros. Television");
    expect(productionRow.added_show_count).toBe(5);
  });

  it("returns unauthorized when admin check fails", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    const response = await GET(new NextRequest("http://localhost/api/admin/networks-streaming/summary"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "unauthorized" });
  });
});
