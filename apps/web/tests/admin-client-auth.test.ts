import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let currentUser: { getIdToken: ReturnType<typeof vi.fn> } | null = null;
  let bypassEnabled = false;
  let idTokenListeners: Array<(user: { getIdToken: ReturnType<typeof vi.fn> } | null) => void> = [];

  return {
    setCurrentUser(user: { getIdToken: ReturnType<typeof vi.fn> } | null) {
      currentUser = user;
    },
    getCurrentUser() {
      return currentUser;
    },
    emitCurrentUser(user: { getIdToken: ReturnType<typeof vi.fn> } | null) {
      currentUser = user;
      for (const listener of idTokenListeners) {
        listener(user);
      }
    },
    setBypassEnabled(value: boolean) {
      bypassEnabled = value;
    },
    isBypassEnabled() {
      return bypassEnabled;
    },
    authStateReady: vi.fn(() => Promise.resolve()),
    onIdTokenChanged(callback: (user: { getIdToken: ReturnType<typeof vi.fn> } | null) => void) {
      idTokenListeners.push(callback);
      return () => {
        idTokenListeners = idTokenListeners.filter((listener) => listener !== callback);
      };
    },
    resetListeners() {
      idTokenListeners = [];
    },
  };
});

vi.mock("@/lib/firebase", () => ({
  auth: {
    get currentUser() {
      return mocks.getCurrentUser();
    },
    authStateReady: (...args: unknown[]) =>
      (mocks.authStateReady as (...inner: unknown[]) => unknown)(...args),
    onIdTokenChanged: (...args: unknown[]) =>
      (mocks.onIdTokenChanged as (...inner: unknown[]) => unknown)(...args),
  },
}));

vi.mock("@/lib/admin/dev-admin-bypass", () => ({
  isDevAdminBypassEnabledClient: () => mocks.isBypassEnabled(),
}));

import { fetchAdminWithAuth, getClientAuthHeaders } from "@/lib/admin/client-auth";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const expectAuthorizationHeader = (headers: Record<string, unknown>, token: string): void => {
  expect(headers.Authorization).toBe(`Bearer ${token}`);
  expect(headers["x-trr-tab-session-id"]).toEqual(expect.any(String));
};

const readHeaderValue = (headers: HeadersInit | undefined, key: string): string | null => {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(key);
  if (Array.isArray(headers)) {
    const found = headers.find(([name]) => name.toLowerCase() === key.toLowerCase());
    return found ? found[1] : null;
  }
  const record = headers as Record<string, string>;
  const direct = record[key];
  if (typeof direct === "string") return direct;
  const insensitive = Object.entries(record).find(([name]) => name.toLowerCase() === key.toLowerCase());
  return insensitive ? insensitive[1] : null;
};

describe("admin client auth helper", () => {
  beforeEach(() => {
    mocks.authStateReady.mockReset();
    mocks.authStateReady.mockResolvedValue(undefined);
    mocks.setCurrentUser(null);
    mocks.resetListeners();
    mocks.setBypassEnabled(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("waits for auth readiness before reading token", async () => {
    let resolveReady: (() => void) | null = null;
    const getIdToken = vi.fn().mockResolvedValue("ready-token");
    mocks.setCurrentUser({ getIdToken });
    mocks.authStateReady.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveReady = resolve;
        }),
    );

    const pending = getClientAuthHeaders();
    await Promise.resolve();
    expect(getIdToken).not.toHaveBeenCalled();

    resolveReady?.();
    await expect(pending).resolves.toMatchObject({ Authorization: "Bearer ready-token" });
  });

  it("continues after auth readiness timeout when token is available", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_ADMIN_AUTH_READY_TIMEOUT_MS", "10");
    const getIdToken = vi.fn().mockResolvedValue("timeout-token");
    mocks.setCurrentUser({ getIdToken });
    mocks.authStateReady.mockImplementationOnce(() => new Promise<void>(() => undefined));

    const pending = getClientAuthHeaders({ tokenRetryDelaysMs: [0], forceRefreshOnFinalAttempt: false });
    await vi.advanceTimersByTimeAsync(9);
    expect(getIdToken).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toMatchObject({ Authorization: "Bearer timeout-token" });
  });

  it("returns Not authenticated quickly when auth readiness times out with no user", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_ADMIN_AUTH_READY_TIMEOUT_MS", "5");
    mocks.authStateReady.mockImplementationOnce(() => new Promise<void>(() => undefined));

    const pending = getClientAuthHeaders({
      tokenRetryDelaysMs: [1, 1],
      forceRefreshOnFinalAttempt: false,
    });
    const rejection = expect(pending).rejects.toThrow("Not authenticated");
    await vi.advanceTimersByTimeAsync(25);
    await rejection;
  });

  it("retries token acquisition and recovers", async () => {
    const getIdToken = vi
      .fn()
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("recovered-token");
    mocks.setCurrentUser({ getIdToken });

    const headers = await getClientAuthHeaders({
      tokenRetryDelaysMs: [0, 0, 0],
      forceRefreshOnFinalAttempt: false,
    });

    expectAuthorizationHeader(headers, "recovered-token");
    expect(getIdToken).toHaveBeenCalledTimes(3);
    expect(getIdToken).toHaveBeenNthCalledWith(1, false);
    expect(getIdToken).toHaveBeenNthCalledWith(2, false);
    expect(getIdToken).toHaveBeenNthCalledWith(3, false);
  });

  it("waits for the preferred user to land in auth before reading the token", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_ADMIN_AUTH_READY_TIMEOUT_MS", "50");
    const getIdToken = vi.fn().mockResolvedValue("preferred-token");
    const preferredUser = { uid: "admin-uid" } as { uid: string };

    const pending = getClientAuthHeaders({
      preferredUser: preferredUser as never,
      tokenRetryDelaysMs: [0],
      forceRefreshOnFinalAttempt: false,
    });

    await actMicrotasks();
    mocks.emitCurrentUser({ uid: "admin-uid", getIdToken } as never);
    await actMicrotasks();
    await vi.advanceTimersByTimeAsync(1);

    await expect(pending).resolves.toMatchObject({ Authorization: "Bearer preferred-token" });
    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(getIdToken).toHaveBeenCalledWith(false);
  });

  it("forces refresh on the final token retry attempt", async () => {
    const getIdToken = vi
      .fn()
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("fresh-token");
    mocks.setCurrentUser({ getIdToken });

    const headers = await getClientAuthHeaders({
      tokenRetryDelaysMs: [0, 0, 0],
    });

    expectAuthorizationHeader(headers, "fresh-token");
    expect(getIdToken).toHaveBeenCalledTimes(4);
    expect(getIdToken).toHaveBeenNthCalledWith(1, false);
    expect(getIdToken).toHaveBeenNthCalledWith(2, false);
    expect(getIdToken).toHaveBeenNthCalledWith(3, false);
    expect(getIdToken).toHaveBeenNthCalledWith(4, true);
  });

  it("retries once on 401 with forced token refresh", async () => {
    const getIdToken = vi.fn().mockResolvedValue("token");
    mocks.setCurrentUser({ getIdToken });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const response = await fetchAdminWithAuth("/api/admin/test");
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getIdToken).toHaveBeenCalledTimes(2);
    expect(getIdToken).toHaveBeenNthCalledWith(1, false);
    expect(getIdToken).toHaveBeenNthCalledWith(2, true);
  });

  it("adds x-trr-flow-key for admin requests", async () => {
    const getIdToken = vi.fn().mockResolvedValue("token");
    mocks.setCurrentUser({ getIdToken });
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const response = await fetchAdminWithAuth("/api/admin/reddit/communities/abc/discover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ force_refresh: true }),
    });
    expect(response.status).toBe(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(readHeaderValue(requestInit.headers, "x-trr-flow-key")).toEqual(expect.any(String));
  });

  it("keeps dev bypass behavior", async () => {
    mocks.setCurrentUser(null);
    mocks.setBypassEnabled(true);

    const headers = await getClientAuthHeaders({
      allowDevAdminBypass: true,
      tokenRetryDelaysMs: [0, 0, 0],
    });

    expectAuthorizationHeader(headers, "dev-admin-bypass");
    expect(mocks.authStateReady).not.toHaveBeenCalled();
  });

  it("allows local host bypass when explicitly requested even if env bypass helper is disabled", async () => {
    mocks.setCurrentUser(null);
    mocks.setBypassEnabled(false);

    const headers = await getClientAuthHeaders({
      allowDevAdminBypass: true,
      tokenRetryDelaysMs: [0],
      forceRefreshOnFinalAttempt: false,
    });

    expectAuthorizationHeader(headers, "dev-admin-bypass");
  });
});

async function actMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
