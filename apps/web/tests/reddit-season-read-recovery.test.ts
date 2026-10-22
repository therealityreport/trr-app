import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { read, guard } = vi.hoisted(() => ({ read: vi.fn(), guard: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ requireAdmin: guard }));
vi.mock("@/lib/server/trr-api/admin-read-proxy", async (original) => ({
  ...await original<typeof import("@/lib/server/trr-api/admin-read-proxy")>(),
  fetchAdminBackendJson: read,
}));

import { GET } from "@/app/api/admin/trr-api/seasons/[seasonId]/episodes/route";
import { AdminReadProxyError } from "@/lib/server/trr-api/admin-read-proxy";
import { fetchAdminPrimaryRead } from "@/lib/server/trr-api/primary-read";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { TRR_SEASON_EPISODES_CACHE_NAMESPACE } from "@/lib/server/trr-api/trr-show-read-route-cache";

const seasonId = "20c4cc05-0ab1-433f-b2fd-848f0d46a250";
const context = { params: Promise.resolve({ seasonId }) };
const request = () => new NextRequest(`https://admin.trr.localhost/api/admin/trr-api/seasons/${seasonId}/episodes?limit=250&offset=0`);
const success = { status: 200, data: { episodes: [{ id: "episode-6", episode_number: 6 }] }, durationMs: 20 };

describe("required season reads", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    read.mockReset();
    guard.mockReset().mockResolvedValue({ uid: "admin" });
    invalidateRouteResponseCache(TRR_SEASON_EPISODES_CACHE_NAMESPACE);
  });
  afterEach(() => vi.useRealTimers());

  it("recovers one upstream timeout, keeps pagination, and caches only the successful episodes", async () => {
    read.mockRejectedValueOnce(new AdminReadProxyError("timeout", 504, { retryable: true })).mockResolvedValueOnce(success);
    const pending = GET(request(), context);
    await vi.runAllTimersAsync();
    expect((await pending).status).toBe(200);
    expect(read).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenLastCalledWith(`/admin/trr-api/seasons/${seasonId}/episodes?limit=250&offset=0`, expect.objectContaining({ requestRole: "primary" }));
    const cached = await GET(request(), context);
    expect(cached.headers.get("x-trr-cache")).toBe("hit");
    expect(await cached.json()).toEqual(success.data);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("bounds recovery to one retry and preserves the final HTTP status", async () => {
    read.mockResolvedValue({ status: 503, data: { error: "unavailable" }, durationMs: 5 });
    const pending = GET(request(), context);
    await vi.runAllTimersAsync();
    expect((await pending).status).toBe(503);
    expect(read).toHaveBeenCalledTimes(2);
    read.mockResolvedValue(success);
    expect((await GET(request(), context)).status).toBe(200);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it.each([401, 403, 404, 429])("does not retry HTTP %s", async (status) => {
    read.mockResolvedValue({ status, data: {}, durationMs: 1 });
    expect((await fetchAdminPrimaryRead("/read", { routeName: "test" })).status).toBe(status);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it.each([{ retryable: false }, { detail: { retryable: false } }])("does not replay a nonretryable backend failure: %j", async (data) => {
    read.mockResolvedValue({ status: 503, data, durationMs: 1 });
    await fetchAdminPrimaryRead("/read", { routeName: "test" });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("requires admin access before reading or retrying", async () => {
    guard.mockRejectedValue(new Error("unauthorized"));
    expect((await GET(request(), context)).status).toBe(401);
    expect(read).not.toHaveBeenCalled();
  });
});
