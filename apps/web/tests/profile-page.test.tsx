import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import ProfilePage from "@/app/profile/page";

const mocks = vi.hoisted(() => {
  const authUserState: { value: User | null } = { value: null };
  const onAuthStateChanged = vi.fn();
  const getUserProfile = vi.fn();
  const isFirestoreUnavailableError = vi.fn();

  return {
    authUserState,
    onAuthStateChanged,
    getUserProfile,
    isFirestoreUnavailableError,
  };
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) =>
    React.createElement("a", { href, ...rest }, children),
}));

vi.mock("@/lib/firebase", () => ({
  auth: {
    onAuthStateChanged: (callback: (user: User | null) => void) => {
      mocks.onAuthStateChanged(callback);
      callback(mocks.authUserState.value);
      return () => {};
    },
  },
}));

vi.mock("@/lib/db/users", () => ({
  getUserProfile: (...args: unknown[]) => (mocks.getUserProfile as (...inner: unknown[]) => unknown)(...args),
  isFirestoreUnavailableError: (...args: unknown[]) =>
    (mocks.isFirestoreUnavailableError as (...inner: unknown[]) => unknown)(...args),
}));

function buildUser(overrides: Partial<User>): User {
  return {
    uid: "user-1",
    email: "codex@thereality.report",
    displayName: "Codex Huli",
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: "2026-03-13T11:00:00.000Z",
      lastSignInTime: "2026-03-13T11:00:00.000Z",
    } as User["metadata"],
    phoneNumber: null,
    photoURL: null,
    providerData: [],
    providerId: "firebase",
    refreshToken: "token",
    tenantId: null,
    delete: vi.fn(),
    getIdToken: vi.fn(),
    getIdTokenResult: vi.fn(),
    reload: vi.fn(),
    toJSON: vi.fn(),
    ...overrides,
  } as User;
}

describe("ProfilePage", () => {
  beforeEach(() => {
    mocks.onAuthStateChanged.mockReset();
    mocks.getUserProfile.mockReset();
    mocks.isFirestoreUnavailableError.mockReset();
    mocks.authUserState.value = null;
  });

  it("falls back to auth-backed profile data when Firestore is unavailable", async () => {
    const firestoreError = new Error("Service firestore is not available");
    mocks.authUserState.value = buildUser({});
    mocks.getUserProfile.mockRejectedValue(firestoreError);
    mocks.isFirestoreUnavailableError.mockReturnValue(true);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Codex Huli" })).toBeInTheDocument();
    });
    expect(screen.getByText("codex@thereality.report")).toBeInTheDocument();
    expect(screen.queryByText("Unable to load profile")).not.toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith(
      "Profile page: Firestore unavailable, rendering auth-backed fallback",
      firestoreError,
    );
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
