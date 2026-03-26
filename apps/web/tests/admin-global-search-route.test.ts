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

import { GET } from "@/app/api/admin/trr-api/search/route";

describe("/api/admin/trr-api/search", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("enforces minimum query length", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/trr-api/search?q=a"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("at least 3");
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns grouped shows/people/episodes results", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        query: "ala",
        pagination: { per_type_limit: 7 },
        shows: [{ id: "show-1", name: "The Traitors", slug: "the-traitors-us" }],
        people: [
          {
            id: "person-1",
            full_name: "Alan Cumming",
            known_for: "Host",
            show_context: "the-traitors-us",
            person_slug: "alan-cumming",
          },
        ],
        episodes: [
          {
            id: "episode-1",
            title: "The Castle",
            episode_number: 1,
            season_number: 1,
            air_date: null,
            show_id: "show-1",
            show_name: "The Traitors",
            show_slug: "the-traitors-us",
          },
        ],
      },
      durationMs: 6,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/search?q=ala&limit=7"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/search?q=ala&limit=7",
      expect.objectContaining({ routeName: "admin-global-search" }),
    );

    expect(payload.shows[0]).toMatchObject({ name: "The Traitors", slug: "the-traitors-us" });
    expect(payload.people[0]).toMatchObject({ full_name: "Alan Cumming", show_context: "the-traitors-us" });
    expect(payload.people[0].person_slug).toContain("alan-cumming");
    expect(payload.episodes[0]).toMatchObject({
      title: "The Castle",
      season_number: 1,
      show_slug: "the-traitors-us",
    });
  });
});
