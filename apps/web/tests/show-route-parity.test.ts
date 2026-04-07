import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";

const { requireAdminMock, fetchAdminBackendJsonMock, resolveShowSlugMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
  resolveShowSlugMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getShowById: vi.fn(),
  getShowByExactSlug: vi.fn(),
  resolveShowSlug: resolveShowSlugMock,
  updateShowById: vi.fn(),
  validateShowImageForField: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  invalidateAdminBackendCache: vi.fn(),
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 500 }),
}));

import { GET as getShowsRoute } from "@/app/api/admin/trr-api/shows/route";
import { GET as getShowByIdRoute } from "@/app/api/admin/trr-api/shows/[showId]/route";
import { GET as getShowResolveSlugRoute } from "@/app/api/admin/trr-api/shows/resolve-slug/route";

describe("TRR show route parity", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    resolveShowSlugMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("returns backend-owned show search results with canonical slugs preserved", async () => {
    fetchAdminBackendJsonMock.mockResolvedValueOnce({
      status: 200,
      data: {
        shows: [
          {
            id: "7782652f-783a-488b-8860-41b97de32e75",
            name: "The Real Housewives of Salt Lake City",
            slug: "the-real-housewives-of-salt-lake-city",
            canonical_slug: "the-real-housewives-of-salt-lake-city",
          },
        ],
        pagination: { limit: 20, offset: 0, count: 1 },
      },
      durationMs: 5,
    });

    const response = await getShowsRoute(
      new NextRequest("http://localhost/api/admin/trr-api/shows?q=Salt+Lake"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows?q=Salt+Lake&limit=20&offset=0",
      expect.objectContaining({ routeName: "admin-shows" }),
    );
    expect(payload.shows[0]).toMatchObject({
      slug: "the-real-housewives-of-salt-lake-city",
      canonical_slug: "the-real-housewives-of-salt-lake-city",
    });
  });

  it("returns the backend-owned single show contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValueOnce({
      status: 200,
      data: {
        show: {
          id: "7782652f-783a-488b-8860-41b97de32e75",
          name: "The Real Housewives of Salt Lake City",
          slug: "the-real-housewives-of-salt-lake-city",
          canonical_slug: "the-real-housewives-of-salt-lake-city",
        },
      },
      durationMs: 4,
    });

    const response = await getShowByIdRoute(
      new NextRequest("http://localhost/api/admin/trr-api/shows/7782652f-783a-488b-8860-41b97de32e75"),
      { params: Promise.resolve({ showId: "7782652f-783a-488b-8860-41b97de32e75" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/7782652f-783a-488b-8860-41b97de32e75",
      expect.objectContaining({ routeName: "show-detail" }),
    );
    expect(payload.show).toMatchObject({
      slug: "the-real-housewives-of-salt-lake-city",
      canonical_slug: "the-real-housewives-of-salt-lake-city",
    });
  });

  it("does not keep show detail responses in the in-memory route cache when caching is disabled", async () => {
    vi.resetModules();
    process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        show: {
          id: "7782652f-783a-488b-8860-41b97de32e75",
          name: "The Real Housewives of Salt Lake City",
          slug: "the-real-housewives-of-salt-lake-city",
          canonical_slug: "the-real-housewives-of-salt-lake-city",
          watch_provider_regions: [
            {
              region: "US",
              stream: ["Peacock Premium"],
              free: ["Bravo TV"],
              buy_rent: ["Amazon Video", "Apple TV Store"],
            },
          ],
        },
      },
      durationMs: 4,
    });
    const { GET: freshGetShowByIdRoute } = await import("@/app/api/admin/trr-api/shows/[showId]/route");

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/shows/7782652f-783a-488b-8860-41b97de32e75",
    );
    const first = await freshGetShowByIdRoute(
      request,
      { params: Promise.resolve({ showId: "7782652f-783a-488b-8860-41b97de32e75" }) },
    );
    const second = await freshGetShowByIdRoute(
      request,
      { params: Promise.resolve({ showId: "7782652f-783a-488b-8860-41b97de32e75" }) },
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.headers.get("x-trr-cache")).not.toBe("hit");
    expect(second.headers.get("x-trr-cache")).not.toBe("hit");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(2);
  });

  it("keeps show resolve-slug parity", async () => {
    resolveShowSlugMock.mockResolvedValueOnce({
      show_id: "show-1",
      slug: "rhobh",
      canonical_slug: "rhobh",
      show_name: "The Real Housewives of Beverly Hills",
    });

    const response = await getShowResolveSlugRoute(
      new NextRequest("http://localhost/api/admin/trr-api/shows/resolve-slug?slug=rhobh"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      resolved: {
        show_id: "show-1",
        slug: "rhobh",
        canonical_slug: "rhobh",
        show_name: "The Real Housewives of Beverly Hills",
      },
    });
    expect(resolveShowSlugMock).toHaveBeenCalledWith("rhobh");
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });
});
