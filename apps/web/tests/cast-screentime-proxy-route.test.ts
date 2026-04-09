import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";


const { requireAdminMock, getBackendApiUrlMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

import { GET } from "@/app/api/admin/trr-api/cast-screentime/[...path]/route";
import { isCastScreentimeAdminEnabled } from "@/lib/server/admin/cast-screentime-access";


describe("cast screentime admin access", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    process.env.TRR_CAST_SCREENTIME_ADMIN_ENABLED = "true";
    process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET = "internal-secret";
    requireAdminMock.mockResolvedValue({ uid: "admin-test-user" });
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/cast-screentime/runs/demo");
  });

  it("treats the feature as enabled by default", () => {
    delete process.env.TRR_CAST_SCREENTIME_ADMIN_ENABLED;
    expect(isCastScreentimeAdminEnabled()).toBe(true);
  });

  it("disables the feature when the env flag is false", () => {
    process.env.TRR_CAST_SCREENTIME_ADMIN_ENABLED = "false";
    expect(isCastScreentimeAdminEnabled()).toBe(false);
  });

  it("returns 404 from the proxy route when the feature is disabled", async () => {
    process.env.TRR_CAST_SCREENTIME_ADMIN_ENABLED = "false";
    vi.stubGlobal("fetch", vi.fn());

    const response = await GET(new NextRequest("http://localhost/api/admin/trr-api/cast-screentime/runs/demo"), {
      params: Promise.resolve({ path: ["runs", "demo"] }),
    });
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe("not_found");
  });

  it("forwards requests to the backend when the feature is enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ run_id: "demo", status: "success" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal(
      "fetch",
      fetchMock
    );

    const response = await GET(new NextRequest("http://localhost/api/admin/trr-api/cast-screentime/runs/demo"), {
      params: Promise.resolve({ path: ["runs", "demo"] }),
    });
    const payload = (await response.json()) as { run_id?: string; status?: string; error?: string };

    expect(response.status).toBe(200);
    expect(payload.run_id).toBe("demo");
    expect(payload.status).toBe("success");
    const firstCall = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = new Headers(firstCall?.headers);
    expect(headers.get("Authorization")).toMatch(/^Bearer /);
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("returns an actionable error when the internal admin secret is missing", async () => {
    delete process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const response = await GET(new NextRequest("http://localhost/api/admin/trr-api/cast-screentime/runs/demo"), {
      params: Promise.resolve({ path: ["runs", "demo"] }),
    });
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(payload.error).toBe("TRR_INTERNAL_ADMIN_SHARED_SECRET is not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
