import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let currentUser: { getIdToken: ReturnType<typeof vi.fn> } | null = null;
  let bypassEnabled = false;

  return {
    setCurrentUser(user: { getIdToken: ReturnType<typeof vi.fn> } | null) {
      currentUser = user;
    },
    getCurrentUser() {
      return currentUser;
    },
    setBypassEnabled(value: boolean) {
      bypassEnabled = value;
    },
    isBypassEnabled() {
      return bypassEnabled;
    },
    authStateReady: vi.fn(() => Promise.resolve()),
  };
});

vi.mock("@/lib/firebase", () => ({
  auth: {
    get currentUser() {
      return mocks.getCurrentUser();
    },
    authStateReady: (...args: unknown[]) =>
      (mocks.authStateReady as (...inner: unknown[]) => unknown)(...args),
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

describe("admin client auth helper", () => {
  beforeEach(() => {
    mocks.authStateReady.mockReset();
    mocks.authStateReady.mockResolvedValue(undefined);
    mocks.setCurrentUser(null);
    mocks.setBypassEnabled(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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
    await expect(pending).resolves.toEqual({ Authorization: "Bearer ready-token" });
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

    expect(headers).toEqual({ Authorization: "Bearer recovered-token" });
    expect(getIdToken).toHaveBeenCalledTimes(3);
    expect(getIdToken).toHaveBeenNthCalledWith(1, false);
    expect(getIdToken).toHaveBeenNthCalledWith(2, false);
    expect(getIdToken).toHaveBeenNthCalledWith(3, false);
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

    expect(headers).toEqual({ Authorization: "Bearer fresh-token" });
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

  it("keeps dev bypass behavior", async () => {
    mocks.setCurrentUser(null);
    mocks.setBypassEnabled(true);

    const headers = await getClientAuthHeaders({
      allowDevAdminBypass: true,
      tokenRetryDelaysMs: [0, 0, 0],
    });

    expect(headers).toEqual({ Authorization: "Bearer dev-admin-bypass" });
  });
});
