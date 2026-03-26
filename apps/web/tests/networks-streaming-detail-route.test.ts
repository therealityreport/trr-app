import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

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

import { GET } from "@/app/api/admin/networks-streaming/detail/route";

describe("networks-streaming detail route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("returns backend detail payload for a valid entity", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        entity_type: "network",
        entity_key: "bravo",
        entity_slug: "bravo",
        display_name: "Bravo",
        family: null,
        family_suggestions: [],
        shared_links: [],
        wikipedia_show_urls: [],
      },
      durationMs: 8,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/networks-streaming/detail?entity_type=network&entity_slug=bravo",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.display_name).toBe("Bravo");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/shows/networks-streaming/detail?entity_type=network&entity_slug=bravo",
      expect.objectContaining({
        routeName: "networks-streaming-detail",
      }),
    );
  });

  it("returns 400 when entity_type is invalid", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/networks-streaming/detail?entity_type=invalid&entity_slug=bravo",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("entity_type");
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns 400 when both entity_key and entity_slug are missing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/networks-streaming/detail?entity_type=network"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("entity_key or entity_slug");
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns backend 404 payload when entity is not found", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: {
        error: "not_found",
        suggestions: [
          {
            entity_type: "streaming",
            name: "Peacock Premium",
            entity_slug: "peacock-premium",
          },
        ],
      },
      durationMs: 4,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/networks-streaming/detail?entity_type=streaming&entity_slug=peacock-premium",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("not_found");
    expect(payload.suggestions).toHaveLength(1);
  });

  it("returns unauthorized when admin check fails", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/networks-streaming/detail?entity_type=network&entity_slug=bravo",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "unauthorized" });
  });
});
