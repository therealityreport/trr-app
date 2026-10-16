import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getState: vi.fn(), getCache: vi.fn(), setCache: vi.fn(), getPromise: vi.fn(),
  candidates: vi.fn(), snapshot: vi.fn(),
}));
vi.mock("@/lib/server/admin/typography-repository", () => ({ getTypographyState: mocks.getState }));
vi.mock("@/lib/server/admin/typography-seed", () => ({ buildTypographyStateSnapshot: mocks.snapshot }));
vi.mock("@/lib/server/admin/route-response-cache", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/server/admin/route-response-cache")>(),
  getRouteResponseCache: mocks.getCache, setRouteResponseCache: mocks.setCache,
  getOrCreateRouteResponsePromise: mocks.getPromise,
}));
vi.mock("@/lib/server/postgres", () => ({ resolvePostgresConnectionCandidates: mocks.candidates }));
import { GET } from "@/app/api/design-system/typography/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.candidates.mockReturnValue(["configured"]);
  mocks.getPromise.mockImplementation((_namespace, _key, load) => load());
});

it("returns a fixed public error and keeps diagnostic text server-side", async () => {
  const sentinel = "INTERNAL-DETAIL-inert-test";
  const error = new Error(sentinel);
  mocks.getState.mockRejectedValue(error);
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const response = await GET();
  expect(response.status).toBe(500);
  const body = await response.text();
  expect(body).not.toContain(sentinel);
  expect(JSON.parse(body)).toEqual({ error: "Unable to load typography state." });
  expect(log).toHaveBeenCalledWith("[api] Failed to load public typography state", error);
  expect(mocks.setCache).not.toHaveBeenCalled();
});

it("preserves normal data and caches only a successful result", async () => {
  const state = { fonts: [] };
  mocks.getState.mockResolvedValue(state);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(state);
  expect(mocks.setCache).toHaveBeenCalledOnce();
});

it("retains cache hits and the no-database seed path", async () => {
  mocks.getCache.mockReturnValueOnce({ fonts: ["cached"] });
  expect((await GET()).headers.get("x-trr-cache")).toBe("hit");
  expect(mocks.getState).not.toHaveBeenCalled();
  mocks.candidates.mockReturnValue([]);
  mocks.snapshot.mockReturnValue({ fonts: ["seed"] });
  expect(await (await GET()).json()).toEqual({ fonts: ["seed"] });
  expect(mocks.getState).not.toHaveBeenCalled();
});
