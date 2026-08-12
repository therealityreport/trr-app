import {
  beforeAuthStateChanged,
  onIdTokenChanged,
  type Auth,
  type User,
} from "firebase/auth";

const SESSION_SYNC_TIMEOUT_MS = 5000;

type SessionSyncState = {
  queue: Promise<void>;
  barrier: Promise<void>;
  startupReady: Promise<void>;
  dirtyError: unknown;
  cleanup: (() => void) | null;
};

const syncStates = new WeakMap<Auth, SessionSyncState>();

function createSyncState(): SessionSyncState {
  return {
    queue: Promise.resolve(),
    barrier: Promise.resolve(),
    startupReady: Promise.resolve(),
    dirtyError: null,
    cleanup: null,
  };
}

function getSyncState(auth: Auth): SessionSyncState {
  const existing = syncStates.get(auth);
  if (existing) return existing;
  const state = createSyncState();
  syncStates.set(auth, state);
  return state;
}

async function runWithDeadline<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const abortController = new AbortController();
  let rejectTimeout: (error: Error) => void = () => undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    rejectTimeout = reject;
  });
  const timeoutId = setTimeout(() => {
    abortController.abort();
    rejectTimeout(new DOMException("Server session synchronization timed out", "AbortError"));
  }, SESSION_SYNC_TIMEOUT_MS);

  try {
    return await Promise.race([task(abortController.signal), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function syncFirebaseServerSession(user: User | null): Promise<void> {
  await runWithDeadline(async (signal) => {
    if (!user) {
      const response = await fetch("/api/session/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("Server session logout failed");
      return;
    }

    const idToken = await user.getIdToken();
    if (signal.aborted) throw new DOMException("Server session synchronization timed out", "AbortError");
    if (!idToken) throw new Error("Firebase ID token is unavailable");

    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      credentials: "include",
      cache: "no-store",
      signal,
    });
    if (!response.ok) throw new Error("Server session login failed");
  });
}

function publishSessionSync(auth: Auth, operation: () => Promise<void>): Promise<void> {
  const state = getSyncState(auth);
  const next = state.queue.catch(() => undefined).then(operation);
  state.queue = next;
  state.barrier = next;
  void next.then(
    () => {
      if (state.barrier === next) state.dirtyError = null;
    },
    (error: unknown) => {
      if (state.barrier === next) state.dirtyError = error;
    },
  );
  return next;
}

function publishBackgroundSessionSync(auth: Auth, user: User | null): void {
  void publishSessionSync(auth, () => syncFirebaseServerSession(user)).catch(() => undefined);
}

export async function ensureFirebaseServerSession(
  auth: Auth,
  expectedUser: User | null,
): Promise<void> {
  const state = getSyncState(auth);
  await state.startupReady.catch(() => undefined);

  return publishSessionSync(auth, async () => {
    if (auth.currentUser !== expectedUser) {
      throw new Error("Firebase user changed before server session synchronization");
    }
    await syncFirebaseServerSession(expectedUser);
    if (auth.currentUser !== expectedUser) {
      throw new Error("Firebase user changed during server session synchronization");
    }
  });
}

export function waitForFirebaseServerSessionStartup(auth: Auth): Promise<void> {
  return getSyncState(auth).startupReady;
}

export function registerFirebaseServerSessionSync(auth: Auth): () => void {
  const state = getSyncState(auth);
  if (state.cleanup) return state.cleanup;

  const unsubscribeBefore = beforeAuthStateChanged(
    auth,
    (user) => publishSessionSync(auth, () => syncFirebaseServerSession(user)),
    () => publishBackgroundSessionSync(auth, auth.currentUser),
  );
  const unsubscribeToken = onIdTokenChanged(auth, (user) => {
    publishBackgroundSessionSync(auth, user);
  });

  state.startupReady = auth
    .authStateReady()
    .then(() =>
      publishSessionSync(auth, async () => {
        const currentUser = auth.currentUser;
        await syncFirebaseServerSession(currentUser);
        if (auth.currentUser !== currentUser) {
          throw new Error("Firebase user changed during startup session synchronization");
        }
      }),
    );
  void state.startupReady.catch(() => undefined);

  state.cleanup = () => {
    unsubscribeBefore();
    unsubscribeToken();
    syncStates.delete(auth);
  };
  return state.cleanup;
}
