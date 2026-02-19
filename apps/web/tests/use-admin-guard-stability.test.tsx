import React, { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    getCurrentUser: () => currentUser,
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

function GuardObserver({ onUserKey }: { onUserKey: (value: string | null) => void }) {
  const { userKey, checking, hasAccess } = useAdminGuard();

  useEffect(() => {
    onUserKey(userKey);
  }, [onUserKey, userKey]);

  return (
    <div data-access={hasAccess ? "1" : "0"} data-checking={checking ? "1" : "0"} data-testid="guard-state">
      {userKey ?? ""}
    </div>
  );
}

describe("useAdminGuard stability", () => {
  beforeEach(() => {
    mocks.reset();
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
      await vi.advanceTimersByTimeAsync(2600);
    });
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/");
    vi.useRealTimers();
  });
});
