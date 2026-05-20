import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, buildInternalAdminHeadersMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  buildInternalAdminHeadersMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  buildInternalAdminHeaders: buildInternalAdminHeadersMock,
}));

import {
  createAdminBackendProxyRoute,
  readJsonRequestBody,
} from "@/lib/server/trr-api/admin-backend-proxy-route";

type TestParams = {
  itemId: string;
};

type ForceBody = {
  force: boolean;
};

const makeJsonRequest = (url: string, body: Record<string, unknown>, method = "POST") =>
  new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const makeTestRoute = () =>
  createAdminBackendProxyRoute<TestParams, ForceBody>({
    routeName: "test-proxy",
    method: "PATCH",
    requiredParams: [{ key: "itemId", message: "itemId is required" }],
    backendPath: ({ params }) => `/admin/items/${params.itemId}/action`,
    body: async ({ request }) => {
      const raw = (await readJsonRequestBody(request, { defaultValue: {} })) as { force?: unknown };
      const force = Boolean(raw.force);
      return {
        body: JSON.stringify({ force }),
        contentType: "application/json",
        value: { force },
      };
    },
    query: ({ request, bodyValue }) => {
      const params = new URLSearchParams(request.nextUrl.searchParams);
      params.set("force", bodyValue?.force ? "true" : "false");
      return params;
    },
    timeout: { name: "test-fast", ms: 25 },
    jsonErrorFallback: "Action failed",
    timeoutError: "Action timed out",
    timeoutDetail: ({ timeoutMs }) => `Timed out after ${timeoutMs}ms`,
    logMessage: "[api] test proxy failed",
  });

describe("admin backend proxy route helper", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    buildInternalAdminHeadersMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue({
      uid: "admin-user-1",
      email: "admin@example.com",
      provider: "firebase",
      token: { uid: "admin-user-1", email: "admin@example.com" },
    });
    getBackendApiUrlMock.mockImplementation(
      (path: string) => `https://backend.example.com/api/v1${path}`,
    );
    buildInternalAdminHeadersMock.mockImplementation((_context: unknown, headers?: HeadersInit) => {
      const out = new Headers(headers);
      out.set("Authorization", "Bearer internal-admin-token");
      return out;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds backend paths, forwards method/body/query, and applies auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await makeTestRoute()(
      makeJsonRequest("http://localhost/api/test?page=2", { force: true }),
      { params: Promise.resolve({ itemId: "item-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(getBackendApiUrlMock).toHaveBeenCalledWith("/admin/items/item-1/action");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://backend.example.com/api/v1/admin/items/item-1/action?page=2&force=true",
    );
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(options.method).toBe("PATCH");
    expect(options.body).toBe(JSON.stringify({ force: true }));
    const headers = options.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer internal-admin-token");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(buildInternalAdminHeadersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "admin-user-1",
        email: "admin@example.com",
        verifiedAt: expect.any(Number),
      }),
      expect.any(Headers),
    );
  });

  it("preserves previously propagated admin verification time in backend headers", async () => {
    requireAdminMock.mockResolvedValueOnce({
      uid: "forwarded-admin",
      email: "forwarded@example.com",
      provider: "firebase",
      token: {
        uid: "forwarded-admin",
        email: "forwarded@example.com",
        verified_admin_context: true,
        verified_at: 1_700_000_000_000,
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const response = await makeTestRoute()(
      makeJsonRequest("http://localhost/api/test", { force: true }),
      { params: Promise.resolve({ itemId: "item-1" }) },
    );

    expect(response.status).toBe(200);
    expect(buildInternalAdminHeadersMock).toHaveBeenCalledWith(
      {
        uid: "forwarded-admin",
        email: "forwarded@example.com",
        verifiedAt: 1_700_000_000_000,
      },
      expect.any(Headers),
    );
  });

  it("rejects missing declared params before proxying", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await makeTestRoute()(
      makeJsonRequest("http://localhost/api/test", { force: true }),
      { params: Promise.resolve({ itemId: "" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("itemId is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns declarative timeout errors when upstream fetch aborts", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const abortError = new Error("aborted");
            abortError.name = "AbortError";
            reject(abortError);
          });
        });
      }) as unknown as typeof fetch,
    );

    const responsePromise = makeTestRoute()(
      makeJsonRequest("http://localhost/api/test", { force: false }),
      { params: Promise.resolve({ itemId: "item-1" }) },
    );
    await vi.advanceTimersByTimeAsync(25);
    const response = await responsePromise;
    const payload = await response.json();

    expect(response.status).toBe(504);
    expect(payload.error).toBe("Action timed out");
    expect(payload.detail).toBe("Timed out after 25ms");
  });

  it("preserves backend problem details and retry metadata", async () => {
    const problem = {
      code: "DATABASE_SERVICE_UNAVAILABLE",
      status: 503,
      message: "Database service unavailable.",
      retryable: true,
      reason: "pool_capacity",
      trace_id: "trace-123",
      request_id: "request-123",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: problem }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const response = await makeTestRoute()(
      makeJsonRequest("http://localhost/api/test", { force: false }),
      { params: Promise.resolve({ itemId: "item-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toBe("Database service unavailable.");
    expect(payload.detail).toEqual(problem);
    expect(payload.code).toBe("DATABASE_SERVICE_UNAVAILABLE");
    expect(payload.retryable).toBe(true);
    expect(payload.reason).toBe("pool_capacity");
    expect(payload.trace_id).toBe("trace-123");
    expect(payload.request_id).toBe("request-123");
  });

  it("supports passthrough responses and cache headers", async () => {
    const passthroughRoute = createAdminBackendProxyRoute<TestParams>({
      routeName: "passthrough-test",
      method: "GET",
      requiredParams: [{ key: "itemId", message: "itemId is required" }],
      backendPath: ({ params }) => `/admin/items/${params.itemId}/download`,
      timeout: "short",
      responseMode: "passthrough",
      responseHeaders: { "Cache-Control": "no-store" },
      jsonErrorFallback: "Download failed",
      timeoutError: "Download timed out",
      timeoutDetail: () => "Timed out waiting for download",
      logMessage: "[api] passthrough proxy failed",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("raw-body", {
          status: 202,
          headers: { "content-type": "text/plain", "x-upstream": "yes" },
        }),
      ),
    );

    const response = await passthroughRoute(
      new NextRequest("http://localhost/api/test", { method: "GET" }),
      { params: Promise.resolve({ itemId: "item-1" }) },
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(response.headers.get("x-upstream")).toBe("yes");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("raw-body");
  });
});
