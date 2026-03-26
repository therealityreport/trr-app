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
    NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 }),
}));

import { GET } from "@/app/api/admin/trr-api/people/home/route";

describe("/api/admin/trr-api/people/home", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "firebase-admin-1" });
  });

  it("returns all five sections from the backend-owned contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        sections: {
          recentlyViewed: { items: [], error: null },
          mostPopular: {
            items: [
              {
                person_id: "11111111-2222-3333-4444-555555555555",
                person_slug: "alan-cumming",
                full_name: "Alan Cumming",
                known_for: "Host",
                photo_url: null,
                show_context: "the-traitors-us",
                metric_label: "News Score",
                metric_value: 15,
                latest_at: "2026-03-01T00:00:00Z",
              },
            ],
            error: null,
          },
          mostShows: { items: [], error: null },
          topEpisodes: { items: [], error: null },
          recentlyAdded: { items: [], error: null },
        },
        pagination: { limit: 9 },
      },
      durationMs: 7,
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/people/home?limit=9");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/people/home?limit=9",
      expect.objectContaining({
        headers: { "X-TRR-Admin-User-Uid": "firebase-admin-1" },
        routeName: "people-home",
      }),
    );
    expect(payload.sections.recentlyViewed).toBeDefined();
    expect(payload.sections.mostPopular.items[0]).toMatchObject({
      full_name: "Alan Cumming",
      metric_label: "News Score",
      show_context: "the-traitors-us",
    });
  });

  it("returns backend section errors without killing the page payload", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        sections: {
          recentlyViewed: { items: [], error: null },
          mostPopular: { items: [], error: null },
          mostShows: { items: [], error: "boom" },
          topEpisodes: { items: [], error: null },
          recentlyAdded: { items: [], error: null },
        },
        pagination: { limit: 12 },
      },
      durationMs: 5,
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/trr-api/people/home"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.sections.mostShows.items).toEqual([]);
    expect(payload.sections.mostShows.error).toContain("boom");
    expect(payload.sections.topEpisodes.error).toBeNull();
  });
});
