import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const SHOW_ID = "00000000-0000-0000-0000-000000000011";
const COVERED_ID = "00000000-0000-0000-0000-000000000010";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  fetchAdminBackendJsonMock,
  MockAdminReadProxyError,
} = vi.hoisted(() => {
  class TestAdminReadProxyError extends Error {
    status: number;
    code?: string;
    retryable?: boolean;

    constructor(message: string, status: number, code?: string, retryable?: boolean) {
      super(message);
      this.status = status;
      this.code = code;
      this.retryable = retryable;
    }
  }
  return {
    requireAdminMock: vi.fn(),
    toVerifiedAdminContextMock: vi.fn(),
    fetchAdminBackendJsonMock: vi.fn(),
    MockAdminReadProxyError: TestAdminReadProxyError,
  };
});

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminBackendStatusError: ({
    status,
    data,
    fallbackMessage,
  }: {
    status: number;
    data: Record<string, unknown>;
    fallbackMessage: string;
  }) => {
    const detail = data.detail as Record<string, unknown> | undefined;
    return new MockAdminReadProxyError(
      typeof detail?.message === "string" ? detail.message : fallbackMessage,
      status,
      typeof detail?.code === "string" ? detail.code : undefined,
      typeof detail?.retryable === "boolean" ? detail.retryable : status >= 500,
    );
  },
  buildAdminProxyErrorResponse: (error: unknown) => {
    const proxyError = error as InstanceType<typeof MockAdminReadProxyError>;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "failed",
        ...(proxyError.code ? { code: proxyError.code } : {}),
        ...(typeof proxyError.retryable === "boolean" ? { retryable: proxyError.retryable } : {}),
      },
      { status: proxyError.status ?? 500 },
    );
  },
}));

import { GET as LIST_GET, POST } from "@/app/api/admin/covered-shows/route";
import { DELETE, GET } from "@/app/api/admin/covered-shows/[showId]/route";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";

const coveredShow = {
  id: COVERED_ID,
  trr_show_id: SHOW_ID,
  show_name: "Bravo Show",
  canonical_slug: "bravo-show",
  alternative_names: ["Bravo"],
  show_total_episodes: 12,
  poster_url: "https://cdn.example.com/poster.jpg",
};

describe("covered show route parity", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    invalidateRouteResponseCache("admin-covered-shows");
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue({ uid: "admin-test-user", email: "admin@example.com" });
    toVerifiedAdminContextMock.mockReturnValue({
      uid: "admin-test-user",
      email: "admin@example.com",
      verifiedAt: 1_700_000_000_000,
    });
  });

  it("returns the backend-owned strict covered-show contract from v2", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { show: coveredShow },
      durationMs: 5,
    });

    const request = new NextRequest(`http://localhost/api/admin/covered-shows/${SHOW_ID}`);
    const response = await GET(request, { params: Promise.resolve({ showId: SHOW_ID }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ show: coveredShow });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/covered-shows/${SHOW_ID}`,
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: expect.objectContaining({ uid: "admin-test-user" }),
      }),
    );
  });

  it("posts new covered shows through v2 with the signed admin context", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 201,
      data: { show: coveredShow },
      durationMs: 4,
    });

    const request = new NextRequest("http://localhost/api/admin/covered-shows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trr_show_id: SHOW_ID, show_name: "Bravo Show" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/covered-shows",
      expect.objectContaining({
        apiVersion: "v2",
        method: "POST",
        adminContext: expect.objectContaining({ uid: "admin-test-user" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    const proxyOptions = fetchAdminBackendJsonMock.mock.calls[0]?.[1] as {
      headers?: Record<string, string>;
    };
    expect(proxyOptions.headers).not.toHaveProperty("X-TRR-Admin-User-Uid");
  });

  it("rejects extra create fields before proxying the strict v2 request", async () => {
    const request = new NextRequest("http://localhost/api/admin/covered-shows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trr_show_id: SHOW_ID,
        show_name: "Bravo Show",
        created_by_firebase_uid: "spoofed",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("does not fall back to local SQL when the v2 backend is unavailable", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 503,
      data: {
        detail: {
          code: "DATABASE_SERVICE_UNAVAILABLE",
          message: "Database service unavailable.",
          retryable: true,
        },
      },
      durationMs: 4,
    });

    const response = await LIST_GET(
      new NextRequest("http://localhost/api/admin/covered-shows"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Database service unavailable.",
      code: "DATABASE_SERVICE_UNAVAILABLE",
      retryable: true,
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(1);
  });

  it("preserves typed 504 proxy errors", async () => {
    fetchAdminBackendJsonMock.mockRejectedValue(
      new MockAdminReadProxyError("Admin read request timed out", 504, "BACKEND_TIMEOUT", true),
    );

    const response = await LIST_GET(
      new NextRequest("http://localhost/api/admin/covered-shows"),
    );

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      error: "Admin read request timed out",
      code: "BACKEND_TIMEOUT",
      retryable: true,
    });
  });

  it("deletes covered shows through v2 with signed admin context", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { success: true },
      durationMs: 4,
    });

    const request = new NextRequest(`http://localhost/api/admin/covered-shows/${SHOW_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ showId: SHOW_ID }) });

    expect(response.status).toBe(200);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/covered-shows/${SHOW_ID}`,
      expect.objectContaining({
        apiVersion: "v2",
        method: "DELETE",
        adminContext: expect.objectContaining({ uid: "admin-test-user" }),
      }),
    );
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});
