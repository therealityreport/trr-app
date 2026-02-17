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
      } as Response);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const payload = await fetchSeasonBackendJson("show-1", "6", "/analytics", {
      fallbackError: "Failed to fetch social analytics",
      retries: 2,
      timeoutMs: 1000,
    });

    expect(payload).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps persistent upstream 502 to retryable standardized envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: "still down" }),
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
      upstream_status?: number;
    };

    expect(response.status).toBe(502);
    expect(payload.code).toBe("UPSTREAM_ERROR");
    expect(payload.retryable).toBe(true);
    expect(payload.upstream_status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
