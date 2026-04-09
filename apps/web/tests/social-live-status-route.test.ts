import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, fetchSocialBackendJsonMock, socialProxyErrorResponseMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 25_000,
}));

import { GET } from "@/app/api/admin/trr-api/social/ingest/live-status/route";
import { invalidateAdminSnapshotCache } from "@/lib/server/admin/admin-snapshot-cache";

describe("social live status route", () => {
  beforeEach(() => {
    invalidateAdminSnapshotCache();
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "firebase-admin-1", email: "codex@thereality.report" });
    fetchSocialBackendJsonMock.mockResolvedValue({
      health_dot: { queue_enabled: true },
      queue_status: { queue_enabled: true },
      admin_operations: { summary: { active_total: 0 } },
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("reuses the cached live-status snapshot across requests for the same admin", async () => {
    const request = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/live-status", {
      method: "GET",
    });

    const first = await GET(request);
    const second = await GET(request);
    const secondPayload = (await second.json()) as { generated_at?: string; cache_age_ms?: number };

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers.get("x-trr-cache")).toBe("hit");
    expect(typeof secondPayload.generated_at).toBe("string");
    expect(typeof secondPayload.cache_age_ms).toBe("number");
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledTimes(1);
  });

  it("forces a refresh when refresh=1 is present", async () => {
    fetchSocialBackendJsonMock
      .mockResolvedValueOnce({
        health_dot: { queue_enabled: true, sequence: 1 },
        queue_status: { queue_enabled: true },
        admin_operations: { summary: { active_total: 0 } },
      })
      .mockResolvedValueOnce({
        health_dot: { queue_enabled: true, sequence: 2 },
        queue_status: { queue_enabled: true },
        admin_operations: { summary: { active_total: 0 } },
      });

    const baseRequest = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/live-status", {
      method: "GET",
    });
    const refreshRequest = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/live-status?refresh=1", {
      method: "GET",
    });

    await GET(baseRequest);
    const refreshed = await GET(refreshRequest);
    const payload = (await refreshed.json()) as { data?: { health_dot?: { sequence?: number } } };

    expect(refreshed.headers.get("x-trr-cache")).toBe("refresh");
    expect(payload.data?.health_dot?.sequence).toBe(2);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to the last good snapshot when the backend errors during a refresh window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"));
    fetchSocialBackendJsonMock
      .mockResolvedValueOnce({
        health_dot: { queue_enabled: true, sequence: 1 },
        queue_status: { queue_enabled: true },
        admin_operations: { summary: { active_total: 0 } },
      })
      .mockRejectedValueOnce(new Error("backend busy"));

    const request = new NextRequest("http://localhost/api/admin/trr-api/social/ingest/live-status", {
      method: "GET",
    });

    await GET(request);
    vi.setSystemTime(new Date("2026-04-08T12:00:06.000Z"));

    const stale = await GET(request);
    const payload = (await stale.json()) as {
      stale?: boolean;
      cache_age_ms?: number;
      data?: { health_dot?: { sequence?: number } };
    };

    expect(stale.status).toBe(200);
    expect(stale.headers.get("x-trr-cache")).toBe("hit");
    expect(payload.stale).toBe(true);
    expect(payload.data?.health_dot?.sequence).toBe(1);
    expect((payload.cache_age_ms ?? 0) >= 6_000).toBe(true);
    vi.useRealTimers();
  });
});
