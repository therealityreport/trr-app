import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  ADMIN_READ_PROXY_GALLERY_TIMEOUT_MS: 8_000,
  buildAdminReadResponseHeaders: ({
    cacheStatus,
    upstreamMs,
    totalMs,
  }: {
    cacheStatus: string;
    upstreamMs?: number | null;
    totalMs?: number | null;
  }) => ({
    "x-trr-cache": cacheStatus,
    ...(typeof upstreamMs === "number" ? { "x-trr-upstream-ms": String(Math.round(upstreamMs)) } : {}),
    ...(typeof totalMs === "number" ? { "x-trr-total-ms": String(Math.round(totalMs)) } : {}),
  }),
  buildAdminBackendStatusError: ({
    status,
    data,
    fallbackMessage,
    routeName,
  }: {
    status: number;
    data: Record<string, unknown>;
    fallbackMessage: string;
    routeName: string;
  }) => {
    const detail =
      data.detail && typeof data.detail === "object" ? (data.detail as Record<string, unknown>) : {};
    const error = new Error(
      typeof data.error === "string" ? data.error : typeof detail.message === "string" ? detail.message : fallbackMessage,
    ) as Error & {
      status?: number;
      code?: string;
      reason?: string;
      retryable?: boolean;
      detail?: Record<string, unknown>;
    };
    error.status = status;
    error.code = typeof data.code === "string" ? data.code : typeof detail.code === "string" ? detail.code : undefined;
    error.reason =
      typeof data.reason === "string" ? data.reason : typeof detail.reason === "string" ? detail.reason : undefined;
    error.retryable =
      typeof data.retryable === "boolean"
        ? data.retryable
        : typeof detail.retryable === "boolean"
          ? detail.retryable
          : status >= 500;
    error.detail = { ...detail, route: routeName, upstream_status: status };
    return error;
  },
  buildAdminProxyErrorResponse: (error: unknown) => {
    const typed = error as
      | (Error & {
          status?: number;
          code?: string;
          reason?: string;
          retryable?: boolean;
          detail?: Record<string, unknown>;
        })
      | undefined;
    return NextResponse.json(
      {
        error: typed instanceof Error ? typed.message : "failed",
        ...(typed?.code ? { code: typed.code } : {}),
        ...(typed?.reason ? { reason: typed.reason } : {}),
        ...(typeof typed?.retryable === "boolean" ? { retryable: typed.retryable } : {}),
        ...(typed?.detail ? { detail: typed.detail } : {}),
      },
      { status: typed?.status ?? 500 },
    );
  },
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/assets/route";

describe("show assets route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("proxies default paginated mode to the backend and preserves the response contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        assets: [{ id: "asset-1", hosted_url: "https://cdn.example.com/1.jpg" }],
        pagination: {
          limit: 75,
          offset: 25,
          count: 1,
          has_more: true,
          next_cursor: "b2Zmc2V0OjI2",
          cursor: "b2Zmc2V0OjI1",
          truncated: false,
          full: false,
        },
      },
      durationMs: 6,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/shows/show-1/assets?limit=75&offset=25&sources=tmdb,fanart"
      ),
      { params: Promise.resolve({ showId: "show-1" }) }
    );

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-1/assets?limit=75&offset=25&sources=tmdb%2Cfanart",
      expect.objectContaining({ routeName: "show-assets" }),
    );

    const body = await response.json();
    expect(body).toEqual({
      assets: [{ id: "asset-1", hosted_url: "https://cdn.example.com/1.jpg" }],
      pagination: {
        limit: 75,
        offset: 25,
        count: 1,
        has_more: true,
        next_cursor: "b2Zmc2V0OjI2",
        cursor: "b2Zmc2V0OjI1",
        truncated: false,
        full: false,
      },
    });
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(response.headers.get("x-trr-upstream-ms")).toBe("6");
  });

  it("prefers cursor-based pagination when the UI supplies a next_cursor token", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { assets: [], pagination: { limit: 75, offset: 25, count: 0, has_more: false, next_cursor: null, cursor: "b2Zmc2V0OjI1", truncated: false, full: false } },
      durationMs: 5,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/shows/show-1/assets?limit=75&offset=0&cursor=b2Zmc2V0OjI1"
      ),
      { params: Promise.resolve({ showId: "show-1" }) }
    );

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-1/assets?limit=75&cursor=b2Zmc2V0OjI1",
      expect.objectContaining({ routeName: "show-assets" }),
    );
  });

  it("defaults no-limit gallery requests to the first visible page size", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { assets: [], pagination: { limit: 48, offset: 0, count: 0, has_more: false, next_cursor: null, cursor: null, truncated: false, full: false } },
      durationMs: 3,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/shows/show-default/assets"),
      { params: Promise.resolve({ showId: "show-default" }) }
    );

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-default/assets?limit=48&offset=0",
      expect.objectContaining({ routeName: "show-assets" }),
    );
  });

  it("supports full fetch mode with truthful truncation metadata", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        assets: Array.from({ length: 5000 }, (_, idx) => ({
          id: `asset-${idx + 1}`,
          hosted_url: `https://cdn.example.com/${idx + 1}.jpg`,
        })),
        pagination: {
          limit: 5000,
          offset: 0,
          count: 5000,
          truncated: true,
          full: true,
        },
      },
      durationMs: 6,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/assets?full=1"),
      { params: Promise.resolve({ showId: "show-1" }) }
    );

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/show-1/assets?limit=5001&offset=0&full=true",
      expect.objectContaining({ routeName: "show-assets" }),
    );

    const body = await response.json();
    expect(body).toEqual({
      assets: Array.from({ length: 5000 }, (_, idx) => ({
        id: `asset-${idx + 1}`,
        hosted_url: `https://cdn.example.com/${idx + 1}.jpg`,
      })),
      pagination: {
        limit: 5000,
        offset: 0,
        count: 5000,
        truncated: true,
        full: true,
      },
    });
  });

  it("preserves structured retryable backend timeout metadata", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 504,
      data: {
        error: "Admin read request timed out after 15s",
        code: "BACKEND_TIMEOUT",
        reason: "awaiting_upstream_response",
        retryable: true,
        detail: {
          route: "show-assets",
          request_role: "secondary",
          timeout_ms: 15_000,
        },
      },
      durationMs: 15_001,
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/shows/show-timeout/assets?limit=48"),
      { params: Promise.resolve({ showId: "show-timeout" }) },
    );

    expect(response.status).toBe(504);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "Admin read request timed out after 15s",
      code: "BACKEND_TIMEOUT",
      reason: "awaiting_upstream_response",
      retryable: true,
      detail: {
        route: "show-assets",
        request_role: "secondary",
        timeout_ms: 15_000,
        upstream_status: 504,
      },
    });
  });
});
