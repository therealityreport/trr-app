import React, { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const mocks = vi.hoisted(() => {
  let listener: ((user: unknown) => void) | null = null;
  let readyResolver: (() => void) | null = null;
  let currentUser: unknown = null;
  const router = { replace: vi.fn() };

  return {
    router,
    replace: router.replace,
    isClientAdmin: vi.fn(() => true),
    isDevAdminBypassEnabledClient: vi.fn(() => false),
    isLocalDevHostname: vi.fn(() => false),
    getCurrentUser: () => currentUser,
    setCurrentUser(user: unknown) {
      currentUser = user;
    },
    onAuthStateChanged: vi.fn((cb: (user: unknown) => void) => {
      listener = cb;
      return () => {
        if (listener === cb) listener = null;
      };
    }),
    authStateReady: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          readyResolver = resolve;
        }),
    ),
    emit(user: unknown) {
      if (!listener) throw new Error("Auth listener not registered");
      currentUser = user;
      listener(user);
    },
    resolveAuthReady() {
      if (!readyResolver) throw new Error("authStateReady resolver missing");
      const resolve = readyResolver;
      readyResolver = null;
      resolve();
    },
    reset() {
      listener = null;
      readyResolver = null;
      currentUser = null;
      this.replace.mockReset();
      this.isClientAdmin.mockReset();
      this.isClientAdmin.mockReturnValue(true);
      this.isDevAdminBypassEnabledClient.mockReset();
      this.isDevAdminBypassEnabledClient.mockReturnValue(false);
      this.isLocalDevHostname.mockReset();
      this.isLocalDevHostname.mockReturnValue(false);
      this.onAuthStateChanged.mockClear();
      this.authStateReady.mockClear();
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/firebase", () => ({
  auth: {
    get currentUser() {
      return mocks.getCurrentUser();
    },
    onAuthStateChanged: (...args: unknown[]) =>
      (mocks.onAuthStateChanged as (...inner: unknown[]) => unknown)(...args),
    authStateReady: (...args: unknown[]) =>
      (mocks.authStateReady as (...inner: unknown[]) => unknown)(...args),
  },
}));

vi.mock("@/lib/admin/client-access", () => ({
  isClientAdmin: (...args: unknown[]) =>
    (mocks.isClientAdmin as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/dev-admin-bypass", () => ({
  isDevAdminBypassEnabledClient: (...args: unknown[]) =>
    (mocks.isDevAdminBypassEnabledClient as (...inner: unknown[]) => unknown)(...args),
  isLocalDevHostname: (...args: unknown[]) =>
    (mocks.isLocalDevHostname as (...inner: unknown[]) => unknown)(...args),
}));

function GuardObserver({ onUserKey }: { onUserKey: (value: string | null) => void }) {
  const { user, userKey, checking, hasAccess } = useAdminGuard();

  useEffect(() => {
    onUserKey(userKey);
  }, [onUserKey, userKey]);

  return (
    <div
      data-access={hasAccess ? "1" : "0"}
      data-checking={checking ? "1" : "0"}
      data-testid="guard-state"
      data-user-present={user ? "1" : "0"}
    >
      {userKey ?? ""}
    </div>
  );
}

describe("useAdminGuard stability", () => {
  beforeEach(() => {
    mocks.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("completes guard resolution on first auth emission even when authStateReady never resolves", async () => {
    render(<GuardObserver onUserKey={() => undefined} />);

    await act(async () => {
      mocks.emit({ uid: "u0", email: "admin@example.com", displayName: "Admin User" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-access", "1");
    });
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users when authStateReady is slow via fallback timeout", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_ADMIN_AUTH_READY_TIMEOUT_MS", "10");
    render(<GuardObserver onUserKey={() => undefined} />);

    await act(async () => {
      mocks.emit(null);
    });

    expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
    expect(mocks.replace).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12);
    });

    expect(mocks.replace).toHaveBeenCalledWith("/");
  });

  it("resolves from auth.currentUser snapshot when auth emission never arrives", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_ADMIN_AUTH_READY_TIMEOUT_MS", "10");
    mocks.setCurrentUser({ uid: "u-no-emit", email: "admin@example.com", displayName: "Admin User" });
    render(<GuardObserver onUserKey={() => undefined} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12);
    });

    expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
    expect(screen.getByTestId("guard-state")).toHaveAttribute("data-access", "1");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("keeps userKey stable across duplicate auth emissions and does not retrigger userKey consumer effect", async () => {
    const onUserKey = vi.fn();
    render(<GuardObserver onUserKey={onUserKey} />);

    await act(async () => {
      mocks.emit({ uid: "u1", email: "admin@example.com", displayName: "Admin User" });
      mocks.resolveAuthReady();
    });

    await waitFor(() => {
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-access", "1");
    });

    const expectedKey = "u1|admin@example.com|Admin User";
    const beforeDuplicate = onUserKey.mock.calls.length;
    expect(onUserKey.mock.calls.map(([value]) => value)).toContain(expectedKey);

    await act(async () => {
      mocks.emit({ uid: "u1", email: "admin@example.com", displayName: "Admin User" });
    });

    expect(onUserKey).toHaveBeenCalledTimes(beforeDuplicate);
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users once and ignores duplicate null emissions", async () => {
    render(<GuardObserver onUserKey={() => undefined} />);

    await act(async () => {
      mocks.emit(null);
      mocks.resolveAuthReady();
    });

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/");
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
    });

    mocks.replace.mockClear();
    await act(async () => {
      mocks.emit(null);
    });
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("redirects non-admin authenticated users to /hub", async () => {
    mocks.isClientAdmin.mockReturnValue(false);
    render(<GuardObserver onUserKey={() => undefined} />);

    await act(async () => {
      mocks.emit({ uid: "u2", email: "viewer@example.com", displayName: "Viewer" });
      mocks.resolveAuthReady();
    });

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/hub");
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
    });
  });

  it("does not redirect valid admin users", async () => {
    mocks.isClientAdmin.mockReturnValue(true);
    render(<GuardObserver onUserKey={() => undefined} />);

    await act(async () => {
      mocks.emit({ uid: "u3", email: "admin@example.com", displayName: "Admin User" });
      mocks.resolveAuthReady();
    });

    await waitFor(() => {
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-access", "1");
    });
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when auth recovers within grace window", async () => {
    vi.useFakeTimers();
    render(<GuardObserver onUserKey={() => undefined} />);

    await act(async () => {
      mocks.emit({ uid: "u4", email: "admin@example.com", displayName: "Admin User" });
      mocks.resolveAuthReady();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
    await act(async () => {
      mocks.emit({ uid: "u4", email: "admin@example.com", displayName: "Admin User" });
    });

    mocks.replace.mockClear();
    await act(async () => {
      mocks.emit(null);
      await vi.advanceTimersByTimeAsync(1000);
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
      mocks.emit({ uid: "u4", email: "admin@example.com", displayName: "Admin User" });
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(mocks.replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
    expect(screen.getByTestId("guard-state")).toHaveAttribute("data-access", "1");
    vi.useRealTimers();
  });

  it("redirects once when null auth persists past grace window", async () => {
    vi.useFakeTimers();
    render(<GuardObserver onUserKey={() => undefined} />);

    await act(async () => {
      mocks.emit({ uid: "u5", email: "admin@example.com", displayName: "Admin User" });
      mocks.resolveAuthReady();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
    await act(async () => {
      mocks.emit({ uid: "u5", email: "admin@example.com", displayName: "Admin User" });
    });

    mocks.replace.mockClear();
    await act(async () => {
      mocks.emit(null);
      await vi.advanceTimersByTimeAsync(1000);
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
      await vi.advanceTimersByTimeAsync(2600);
    });
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/");
    vi.useRealTimers();
  });

  it("updates user from auth emissions when dev bypass is enabled and initial currentUser is null", async () => {
    mocks.isDevAdminBypassEnabledClient.mockReturnValue(true);
    const onUserKey = vi.fn();

    render(<GuardObserver onUserKey={onUserKey} />);

    await waitFor(() => {
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-access", "1");
    });
    expect(screen.getByTestId("guard-state")).toHaveTextContent("dev-admin-bypass");

    await act(async () => {
      mocks.emit({ uid: "u-bypass", email: "admin@example.com", displayName: "Bypass Admin" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("guard-state")).toHaveTextContent(
        "u-bypass|admin@example.com|Bypass Admin",
      );
    });
    expect(onUserKey).toHaveBeenCalledWith("u-bypass|admin@example.com|Bypass Admin");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("returns a non-null user object in dev bypass mode without Firebase auth user", async () => {
    mocks.isDevAdminBypassEnabledClient.mockReturnValue(true);

    render(<GuardObserver onUserKey={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-access", "1");
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-user-present", "1");
    });
    expect(screen.getByTestId("guard-state")).toHaveTextContent("dev-admin-bypass");
  });

  it("uses local-host bypass fallback when env bypass helper is disabled", async () => {
    mocks.isDevAdminBypassEnabledClient.mockReturnValue(false);
    mocks.isLocalDevHostname.mockReturnValue(true);

    render(<GuardObserver onUserKey={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-checking", "0");
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-access", "1");
      expect(screen.getByTestId("guard-state")).toHaveAttribute("data-user-present", "1");
    });
    expect(screen.getByTestId("guard-state")).toHaveTextContent("dev-admin-bypass");
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
