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
  initialTokenEventPending: boolean;
  startupReconciled: boolean;
  startupUser: User | null | undefined;
  logoutSync: Promise<void> | null;
};

const syncStates = new WeakMap<Auth, SessionSyncState>();

function createSyncState(): SessionSyncState {
  return {
    queue: Promise.resolve(),
    barrier: Promise.resolve(),
    startupReady: Promise.resolve(),
    dirtyError: null,
    cleanup: null,
    initialTokenEventPending: true,
    startupReconciled: false,
    startupUser: undefined,
    logoutSync: null,
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
  void publishSessionChange(auth, user).catch(() => undefined);
}

function publishSessionChange(auth: Auth, user: User | null): Promise<void> {
  const state = getSyncState(auth);

  if (user) {
    state.logoutSync = null;
    return publishSessionSync(auth, () => syncFirebaseServerSession(user));
  }

  return publishLogoutSync(auth, () => syncFirebaseServerSession(null));
}

function publishLogoutSync(auth: Auth, operation: () => Promise<void>): Promise<void> {
  const state = getSyncState(auth);
  if (state.logoutSync) return state.logoutSync;

  const next = publishSessionSync(auth, operation);
  state.logoutSync = next;
  void next.catch(() => {
    if (state.logoutSync === next) state.logoutSync = null;
  });
  return next;
}

function isPassiveInitialNull(auth: Auth, state: SessionSyncState, user: User | null): boolean {
  return user === null && !state.startupReconciled && auth.currentUser === null;
}

export async function ensureFirebaseServerSession(
  auth: Auth,
  expectedUser: User | null,
): Promise<void> {
  const state = getSyncState(auth);
  await state.startupReady.catch(() => undefined);

  if (!expectedUser && state.logoutSync) {
    await state.logoutSync;
    if (auth.currentUser !== expectedUser) {
      throw new Error("Firebase user changed before server session synchronization");
    }
    return;
  }

  const synchronize = async () => {
    if (auth.currentUser !== expectedUser) {
      throw new Error("Firebase user changed before server session synchronization");
    }
    await syncFirebaseServerSession(expectedUser);
    if (auth.currentUser !== expectedUser) {
      throw new Error("Firebase user changed during server session synchronization");
    }
  };

  if (!expectedUser) return publishLogoutSync(auth, synchronize);

  state.logoutSync = null;
  return publishSessionSync(auth, synchronize);
}

export function waitForFirebaseServerSessionStartup(auth: Auth): Promise<void> {
  return getSyncState(auth).startupReady;
}

export function registerFirebaseServerSessionSync(auth: Auth): () => void {
  const state = getSyncState(auth);
  if (state.cleanup) return state.cleanup;

  const unsubscribeBefore = beforeAuthStateChanged(
    auth,
    (user) => {
      if (isPassiveInitialNull(auth, state, user)) return Promise.resolve();
      return publishSessionChange(auth, user);
    },
    () => {
      const currentUser = auth.currentUser;
      if (isPassiveInitialNull(auth, state, currentUser)) return;
      publishBackgroundSessionSync(auth, currentUser);
    },
  );
  const unsubscribeToken = onIdTokenChanged(auth, (user) => {
    if (state.initialTokenEventPending) {
      state.initialTokenEventPending = false;
      if (!state.startupReconciled || state.startupUser === user) return;
    }
    publishBackgroundSessionSync(auth, user);
  });

  state.startupReady = auth
    .authStateReady()
    .then(() =>
      publishSessionSync(auth, async () => {
        const currentUser = auth.currentUser;
        state.startupReconciled = true;
        state.startupUser = currentUser;
        if (!currentUser) return;
        state.logoutSync = null;
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
