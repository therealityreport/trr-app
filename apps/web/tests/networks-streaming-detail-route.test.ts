import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { NETWORKS_STREAMING_DETAIL_CACHE_NAMESPACE } from "@/lib/server/trr-api/networks-streaming-route-cache";
import { captureExpectedConsoleError } from "./helpers/expected-console";

const { requireAdminMock, getNetworkStreamingDetailMock, MockAdminReadProxyError } = vi.hoisted(
  () => ({
    requireAdminMock: vi.fn(),
    getNetworkStreamingDetailMock: vi.fn(),
    MockAdminReadProxyError: class AdminReadProxyError extends Error {
      status: number;
      code?: string;
      retryable?: boolean;
      detail?: Record<string, unknown>;

      constructor(
        message: string,
        status: number,
        options?: {
          code?: string;
          retryable?: boolean;
          detail?: Record<string, unknown>;
        },
      ) {
        super(message);
        this.status = status;
        this.code = options?.code;
        this.retryable = options?.retryable;
        this.detail = options?.detail;
      }
    },
  }),
);

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: (user: { uid: string; email?: string }) => ({
    uid: user.uid,
    email: user.email ?? null,
    verifiedAt: 42,
  }),
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  buildAdminReadResponseHeaders: ({
    cacheStatus,
  }: {
    cacheStatus: string;
  }) => ({ "x-trr-cache": cacheStatus }),
  buildAdminProxyErrorResponse: (error: unknown) => {
    const typed = error as {
      status?: number;
      code?: string;
      retryable?: boolean;
      detail?: Record<string, unknown>;
    };
    const body: Record<string, unknown> = {
      error: error instanceof Error ? error.message : "failed",
    };
    if (typed.code) body.code = typed.code;
    if (typeof typed.retryable === "boolean") body.retryable = typed.retryable;
    if (typed.detail) body.detail = typed.detail;
    return NextResponse.json(body, {
      status:
        typeof typed.status === "number"
          ? typed.status
          : error instanceof Error && error.message === "unauthorized"
            ? 401
            : error instanceof Error && error.message === "forbidden"
              ? 403
              : 500,
    });
  },
}));

vi.mock("@/lib/server/trr-api/admin-networks-streaming-reads", () => ({
  getNetworkStreamingDetail: getNetworkStreamingDetailMock,
}));

import { GET } from "@/app/api/admin/networks-streaming/detail/route";

describe("networks-streaming detail route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getNetworkStreamingDetailMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user", email: "admin@example.test" });
    invalidateRouteResponseCache(NETWORKS_STREAMING_DETAIL_CACHE_NAMESPACE);
  });

  it("returns the strict adapter payload with verified admin context", async () => {
    getNetworkStreamingDetailMock.mockResolvedValue({
      entity_type: "network",
      entity_key: "bravo",
      entity_slug: "bravo",
      display_name: "Bravo",
      family: null,
      family_suggestions: [],
      shared_links: [],
      wikipedia_show_urls: [],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/networks-streaming/detail?entity_type=network&entity_slug=bravo",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(payload.display_name).toBe("Bravo");
    expect(getNetworkStreamingDetailMock).toHaveBeenCalledWith(
      {
        entity_type: "network",
        entity_key: undefined,
        entity_slug: "bravo",
        show_scope: "added",
      },
      {
        adminContext: {
          uid: "admin-user",
          email: "admin@example.test",
          verifiedAt: 42,
        },
      },
    );
  });

  it("returns a cache hit for repeated requests by the same admin user", async () => {
    requireAdminMock.mockResolvedValue({ uid: "admin-1" });
    getNetworkStreamingDetailMock.mockResolvedValue({
      entity_type: "network",
      entity_key: "bravo",
      entity_slug: "bravo",
      display_name: "Bravo",
    });

    const request = new NextRequest(
      "http://localhost/api/admin/networks-streaming/detail?entity_type=network&entity_slug=bravo",
    );
    const first = await GET(request);
    const second = await GET(request);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers.get("x-trr-cache")).toBe("hit");
    expect(getNetworkStreamingDetailMock).toHaveBeenCalledTimes(1);
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
    expect(getNetworkStreamingDetailMock).not.toHaveBeenCalled();
  });

  it("returns 400 when both entity_key and entity_slug are missing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/networks-streaming/detail?entity_type=network"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("entity_key or entity_slug");
    expect(getNetworkStreamingDetailMock).not.toHaveBeenCalled();
  });

  it("returns backend 404 payload when entity is not found", async () => {
    getNetworkStreamingDetailMock.mockRejectedValue(
      new MockAdminReadProxyError("Networks/streaming entity not found.", 404, {
        code: "NETWORKS_STREAMING_ENTITY_NOT_FOUND",
        retryable: false,
        detail: {
          suggestions: [
            {
              entity_type: "streaming",
              name: "Peacock Premium",
              entity_slug: "peacock-premium",
              available_show_count: 1,
              added_show_count: 0,
            },
          ],
        },
      }),
    );

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/networks-streaming/detail?entity_type=streaming&entity_slug=peacock-premium",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("not_found");
    expect(payload.suggestions).toHaveLength(1);
    expect(payload).not.toHaveProperty("detail");
  });

  it("returns unauthorized when admin check fails", async () => {
    const expectedError = captureExpectedConsoleError(/^\[api\] Failed to load networks\/streaming detail .*unauthorized/);
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/networks-streaming/detail?entity_type=network&entity_slug=bravo",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "unauthorized" });
    expectedError.expectCalled();
  });
});
