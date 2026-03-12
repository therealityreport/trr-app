import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBackendApiUrlMock, getSeasonByShowAndNumberMock } = vi.hoisted(() => ({
  getBackendApiUrlMock: vi.fn(),
  getSeasonByShowAndNumberMock: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getSeasonByShowAndNumber: getSeasonByShowAndNumberMock,
}));

import {
  fetchSocialBackendJson,
  fetchSeasonBackendJson,
  socialProxyErrorResponse,
} from "@/lib/server/trr-api/social-admin-proxy";

describe("social-admin-proxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-token";
    getSeasonByShowAndNumberMock.mockResolvedValue({ id: "season-1" });
    getBackendApiUrlMock.mockReturnValue("http://backend.local/api/v1/admin/socials/seasons/season-1/analytics");
  });

  it("retries transient upstream failures and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ error: "temporary upstream failure" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response)
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const payload = await fetchSeasonBackendJson("show-1", "6", "/analytics", {
      fallbackError: "Failed to fetch social analytics",
      retries: 2,
      timeoutMs: 1000,
    });

    expect(payload).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const firstHeaders = (firstInit?.headers ?? {}) as Record<string, string>;
    expect(typeof firstHeaders["x-trace-id"]).toBe("string");
    expect(firstHeaders["x-trace-id"].length).toBeGreaterThan(0);
  });

  it("maps persistent upstream 502 to retryable standardized envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({
        error: "still down",
        detail: { code: "SOCIAL_WORKER_UNAVAILABLE", message: "No healthy workers", worker_health: { healthy: false } },
      }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    let thrown: unknown;
    try {
      await fetchSeasonBackendJson("show-1", "6", "/analytics", {
        fallbackError: "Failed to fetch social analytics",
        retries: 1,
        timeoutMs: 1000,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeDefined();
    const response = socialProxyErrorResponse(thrown, "[test] proxy failure");
    const payload = (await response.json()) as {
      error: string;
      code?: string;
      retryable?: boolean;
      trace_id?: string;
      upstream_status?: number;
      upstream_detail?: unknown;
      upstream_detail_code?: string;
    };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("UPSTREAM_ERROR");
    expect(payload.retryable).toBe(true);
    expect(typeof payload.trace_id).toBe("string");
    expect((payload.trace_id ?? "").length).toBeGreaterThan(0);
    expect(payload.upstream_status).toBe(502);
    expect(payload.upstream_detail_code).toBe("SOCIAL_WORKER_UNAVAILABLE");
    expect(payload.upstream_detail).toEqual({
      code: "SOCIAL_WORKER_UNAVAILABLE",
      message: "No healthy workers",
      worker_health: { healthy: false },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses seasonIdHint directly when it is a valid UUID (skips canonical lookup)", async () => {
    const hintedSeasonId = "11111111-1111-4111-8111-111111111111";
    getBackendApiUrlMock.mockImplementation(
      (path: string) => `http://backend.local/api/v1${path}`,
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const payload = await fetchSeasonBackendJson("show-hint-1", "7", "/analytics", {
      queryString: "source_scope=bravo",
      seasonIdHint: hintedSeasonId,
      fallbackError: "Failed to fetch social analytics",
      retries: 0,
      timeoutMs: 1000,
    });

    expect(payload).toEqual({ ok: true });
    expect(getSeasonByShowAndNumberMock).toHaveBeenCalledTimes(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(`/seasons/${hintedSeasonId}/analytics?source_scope=bravo`);
  });

  it("uses seasonIdHint even when canonical differs (no verification against DB)", async () => {
    const hintedSeasonId = "11111111-1111-4111-8111-111111111111";
    getBackendApiUrlMock.mockImplementation(
      (path: string) => `http://backend.local/api/v1${path}`,
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await fetchSeasonBackendJson("show-hint-2", "8", "/analytics", {
      seasonIdHint: hintedSeasonId,
      fallbackError: "Failed to fetch social analytics",
      retries: 0,
      timeoutMs: 1000,
    });

    expect(getSeasonByShowAndNumberMock).toHaveBeenCalledTimes(0);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(`/seasons/${hintedSeasonId}/analytics`);
  });

  it("falls back to season lookup when seasonIdHint is invalid", async () => {
    getSeasonByShowAndNumberMock.mockResolvedValue({ id: "resolved-season-id" });
    getBackendApiUrlMock.mockImplementation(
      (path: string) => `http://backend.local/api/v1${path}`,
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await fetchSeasonBackendJson("show-hint-3", "9", "/analytics", {
      seasonIdHint: "bad-season-id",
      fallbackError: "Failed to fetch social analytics",
      retries: 0,
      timeoutMs: 1000,
    });

    expect(getSeasonByShowAndNumberMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes DNS and SSL transport detail responses to BACKEND_UNREACHABLE", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        detail: {
          code: "INTERNAL_ERROR",
          message: "could not translate host name \"aws-1-us-east-1.pooler.supabase.com\" to address",
          error: "SSL SYSCALL error: EOF detected",
        },
      }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    let thrown: unknown;
    try {
      await fetchSeasonBackendJson("show-1", "6", "/analytics", {
        fallbackError: "Failed to fetch social analytics",
        retries: 0,
        timeoutMs: 1000,
      });
    } catch (error) {
      thrown = error;
    }

    const response = socialProxyErrorResponse(thrown, "[test] transport failure");
    const payload = (await response.json()) as {
      code?: string;
      retryable?: boolean;
      upstream_status?: number;
    };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(payload.retryable).toBe(true);
    expect(payload.upstream_status).toBe(500);
  });

  it("falls back to SUPABASE_SERVICE_ROLE_KEY when TRR-specific key is absent", async () => {
    delete process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fallback-token";
    getBackendApiUrlMock.mockImplementation((path: string) => `http://backend.local/api/v1${path}`);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const payload = await fetchSocialBackendJson("/ingest/queue-status", {
      fallbackError: "Failed to fetch queue status",
      retries: 0,
      timeoutMs: 1000,
    });

    expect(payload).toEqual({ ok: true });
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer fallback-token");
  });

  it("maps missing backend configuration to BACKEND_UNREACHABLE", async () => {
    getBackendApiUrlMock.mockReturnValue(null);

    let thrown: unknown;
    try {
      await fetchSocialBackendJson("/ingest/queue-status", {
        fallbackError: "Failed to fetch queue status",
        retries: 0,
        timeoutMs: 1000,
      });
    } catch (error) {
      thrown = error;
    }

    const response = socialProxyErrorResponse(thrown, "[test] backend missing");
    const payload = (await response.json()) as { code?: string; retryable?: boolean };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("BACKEND_UNREACHABLE");
    expect(payload.retryable).toBe(true);
  });

  it("surfaces retry-after metadata for rate-limited upstream responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: (name: string) => (name.toLowerCase() === "retry-after" ? "0" : null) },
      json: async () => ({ error: "rate limited" }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    let thrown: unknown;
    try {
      await fetchSeasonBackendJson("show-1", "6", "/analytics", {
        fallbackError: "Failed to fetch social analytics",
        retries: 0,
        timeoutMs: 1000,
      });
    } catch (error) {
      thrown = error;
    }

    const response = socialProxyErrorResponse(thrown, "[test] rate limited");
    const payload = (await response.json()) as { code?: string; retryable?: boolean; retry_after_seconds?: number };

    expect(response.status).toBe(429);
    expect(payload.code).toBe("UPSTREAM_ERROR");
    expect(payload.retryable).toBe(true);
    expect(payload.retry_after_seconds).toBe(0);
    expect(response.headers.get("retry-after")).toBe("0");
  });
});
