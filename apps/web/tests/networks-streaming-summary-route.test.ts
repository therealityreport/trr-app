import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getNetworksStreamingSummaryMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getNetworksStreamingSummaryMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/networks-streaming-repository", () => ({
  getNetworksStreamingSummary: getNetworksStreamingSummaryMock,
}));

import { GET } from "@/app/api/admin/networks-streaming/summary/route";

describe("networks-streaming summary route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getNetworksStreamingSummaryMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("returns aggregated summary payload for admin", async () => {
    getNetworksStreamingSummaryMock.mockResolvedValue({
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
          has_logo: true,
          has_bw_variants: true,
          has_links: true,
        },
      ],
      generated_at: "2026-02-19T00:00:00.000Z",
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/networks-streaming/summary"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.totals.total_available_shows).toBe(10);
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].hosted_logo_black_url).toBe("https://cdn.example.com/bravo-black.png");
    expect(payload.rows[0].hosted_logo_white_url).toBe("https://cdn.example.com/bravo-white.png");
    expect(payload.rows[0].has_bw_variants).toBe(true);
    expect(getNetworksStreamingSummaryMock).toHaveBeenCalledTimes(1);
  });

  it("returns unauthorized when admin check fails", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    const response = await GET(new NextRequest("http://localhost/api/admin/networks-streaming/summary"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "unauthorized" });
  });
});
