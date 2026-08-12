import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Auth, User } from "firebase/auth";
import {
  ensureFirebaseServerSession,
  registerFirebaseServerSessionSync,
  syncFirebaseServerSession,
  waitForFirebaseServerSessionStartup,
} from "@/lib/server-session-sync";

const mocks = vi.hoisted(() => {
  let beforeCallback: ((user: User | null) => Promise<void>) | null = null;
  let abortCallback: (() => void) | null = null;
  let tokenCallback: ((user: User | null) => void) | null = null;
  return {
    beforeAuthStateChanged: vi.fn(
      (_auth: Auth, callback: (user: User | null) => Promise<void>, onAbort: () => void) => {
        beforeCallback = callback;
        abortCallback = onAbort;
        return vi.fn();
      },
    ),
    onIdTokenChanged: vi.fn((_auth: Auth, callback: (user: User | null) => void) => {
      tokenCallback = callback;
      return vi.fn();
    }),
    before(user: User | null) {
      if (!beforeCallback) throw new Error("beforeAuthStateChanged callback missing");
      return beforeCallback(user);
    },
    abort() {
      if (!abortCallback) throw new Error("beforeAuthStateChanged abort callback missing");
      abortCallback();
    },
    token(user: User | null) {
      if (!tokenCallback) throw new Error("onIdTokenChanged callback missing");
      tokenCallback(user);
    },
    reset() {
      beforeCallback = null;
      abortCallback = null;
      tokenCallback = null;
      this.beforeAuthStateChanged.mockClear();
      this.onIdTokenChanged.mockClear();
    },
  };
});

vi.mock("firebase/auth", () => ({
  beforeAuthStateChanged: mocks.beforeAuthStateChanged,
  onIdTokenChanged: mocks.onIdTokenChanged,
}));

function buildUser(token = "firebase-id-token", uid = "user-1"): User {
  return { uid, getIdToken: vi.fn().mockResolvedValue(token) } as unknown as User;
}

function buildAuth(currentUser: User | null): Auth {
  return {
    currentUser,
    authStateReady: vi.fn().mockResolvedValue(undefined),
  } as unknown as Auth;
}

function successResponse(): Response {
  return new Response(null, { status: 204 });
}

describe("Firebase server-session synchronization", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse()));
    mocks.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("registers one blocking and one token listener per Auth instance and cleans up both", () => {
    const auth = buildAuth(null);
    const cleanup = registerFirebaseServerSessionSync(auth);
    const duplicateCleanup = registerFirebaseServerSessionSync(auth);

    expect(duplicateCleanup).toBe(cleanup);
    expect(mocks.beforeAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(mocks.onIdTokenChanged).toHaveBeenCalledTimes(1);

    cleanup();
    const beforeUnsubscribe = mocks.beforeAuthStateChanged.mock.results[0]?.value as ReturnType<typeof vi.fn>;
    const tokenUnsubscribe = mocks.onIdTokenChanged.mock.results[0]?.value as ReturnType<typeof vi.fn>;
    expect(beforeUnsubscribe).toHaveBeenCalledTimes(1);
    expect(tokenUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("synchronizes a restored persisted user before startup readiness resolves", async () => {
    const user = buildUser("restored-token", "restored-user");
    const auth = buildAuth(user);
    registerFirebaseServerSessionSync(auth);

    await waitForFirebaseServerSessionStartup(auth);

    expect(fetch).toHaveBeenCalledWith(
      "/api/session/login",
      expect.objectContaining({ body: JSON.stringify({ idToken: "restored-token" }) }),
    );
  });

  it("clears a stale cookie for an initially signed-out Firebase client", async () => {
    const auth = buildAuth(null);
    registerFirebaseServerSessionSync(auth);

    await waitForFirebaseServerSessionStartup(auth);

    expect(fetch).toHaveBeenCalledWith(
      "/api/session/logout",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("serializes account changes and rejects a stale current-user repair without a request", async () => {
    const userA = buildUser("token-a", "user-a");
    const userB = buildUser("token-b", "user-b");
    const auth = buildAuth(userA);
    registerFirebaseServerSessionSync(auth);
    await waitForFirebaseServerSessionStartup(auth);
    vi.mocked(fetch).mockClear();

    await mocks.before(userB);
    auth.currentUser = userB;
    await expect(ensureFirebaseServerSession(auth, userA)).rejects.toThrow("Firebase user changed");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ idToken: "token-b" }));
  });

  it("does not suppress a later token event for the same UID", async () => {
    const first = buildUser("token-generation-1", "same-user");
    const second = buildUser("token-generation-2", "same-user");
    const auth = buildAuth(first);
    registerFirebaseServerSessionSync(auth);
    await waitForFirebaseServerSessionStartup(auth);
    vi.mocked(fetch).mockClear();

    mocks.token(first);
    mocks.token(second);
    await ensureFirebaseServerSession(auth, first);

    const bodies = vi.mocked(fetch).mock.calls.map(([, init]) => init?.body);
    expect(bodies).toContain(JSON.stringify({ idToken: "token-generation-1" }));
    expect(bodies).toContain(JSON.stringify({ idToken: "token-generation-2" }));
  });

  it("publishes abort compensation as a barrier before protected repair can finish", async () => {
    const userA = buildUser("token-a", "user-a");
    const auth = buildAuth(userA);
    registerFirebaseServerSessionSync(auth);
    await waitForFirebaseServerSessionStartup(auth);
    vi.mocked(fetch).mockClear();

    let releaseCompensation: (() => void) | null = null;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          releaseCompensation = () => resolve(successResponse());
        }),
    );
    mocks.abort();

    let protectedReady = false;
    const protectedRepair = ensureFirebaseServerSession(auth, userA).then(() => {
      protectedReady = true;
    });
    await vi.waitFor(() => expect(releaseCompensation).not.toBeNull());
    expect(protectedReady).toBe(false);

    if (!releaseCompensation) throw new Error("compensation release missing");
    releaseCompensation();
    await protectedRepair;
    expect(protectedReady).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("recovers from a caught background failure with one explicit bounded ensure", async () => {
    const user = buildUser();
    const auth = buildAuth(user);
    registerFirebaseServerSessionSync(auth);
    await waitForFirebaseServerSessionStartup(auth);
    vi.mocked(fetch).mockClear();
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("background offline"))
      .mockResolvedValueOnce(successResponse());

    mocks.token(user);
    await expect(ensureFirebaseServerSession(auth, user)).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("bounds token acquisition and prevents a late token from issuing a request", async () => {
    vi.useFakeTimers();
    let resolveToken: ((token: string) => void) | null = null;
    const user = {
      getIdToken: vi.fn(
        () =>
          new Promise<string>((resolve) => {
            resolveToken = resolve;
          }),
      ),
    } as unknown as User;

    const syncPromise = syncFirebaseServerSession(user);
    const rejection = expect(syncPromise).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(5000);
    await rejection;
    resolveToken?.("late-token");
    await Promise.resolve();

    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["login HTTP failure", buildUser(), new Response(null, { status: 503 })],
    ["logout HTTP failure", null, new Response(null, { status: 503 })],
  ])("fails closed on %s", async (_label, user, response) => {
    vi.mocked(fetch).mockResolvedValue(response);
    await expect(syncFirebaseServerSession(user)).rejects.toThrow(/Server session/);
  });
});
