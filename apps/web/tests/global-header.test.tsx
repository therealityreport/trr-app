import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import GlobalHeader from "@/components/GlobalHeader";

const mocks = vi.hoisted(() => {
  const push = vi.fn();
  const fetchAdminWithAuth = vi.fn();
  const logout = vi.fn();
  const onAuthStateChanged = vi.fn();
  const openMenu = vi.fn();
  const currentUserState: { value: User | null } = { value: null };

  return {
    push,
    fetchAdminWithAuth,
    logout,
    onAuthStateChanged,
    openMenu,
    currentUserState,
  };
});

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    const rest = { ...props };
    delete rest.priority;
    return React.createElement("img", { ...rest, alt: rest.alt ?? "" });
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => "/profile",
}));

vi.mock("@/components/SideMenuProvider", () => ({
  useSideMenu: () => ({
    openMenu: mocks.openMenu,
    isOpen: false,
  }),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/firebase", () => ({
  logout: (...args: unknown[]) => (mocks.logout as (...inner: unknown[]) => unknown)(...args),
  auth: {
    get currentUser() {
      return mocks.currentUserState.value;
    },
    onAuthStateChanged: (callback: (user: User | null) => void) => {
      mocks.onAuthStateChanged(callback);
      callback(mocks.currentUserState.value);
      return () => {};
    },
  },
}));

function buildUser(overrides: Partial<User>): User {
  return {
    uid: "user-1",
    email: null,
    displayName: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {} as User["metadata"],
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

describe("GlobalHeader", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.fetchAdminWithAuth.mockReset();
    mocks.logout.mockReset();
    mocks.onAuthStateChanged.mockReset();
    mocks.openMenu.mockReset();
    mocks.currentUserState.value = null;
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_ADMIN_EMAILS;
    delete process.env.NEXT_PUBLIC_ADMIN_UIDS;
    delete process.env.NEXT_PUBLIC_ADMIN_DISPLAY_NAMES;
  });

  it("shows Admin Dashboard in the settings menu when the server confirms admin access", async () => {
    mocks.currentUserState.value = buildUser({
      uid: "server-admin",
      email: "admin-only-on-server@example.com",
      displayName: "Someone Else",
    });
    mocks.fetchAdminWithAuth.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    render(<GlobalHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: "Admin Dashboard" })).toBeInTheDocument();
    });
    expect(screen.getByRole("menuitem", { name: "Sign Out" })).toBeInTheDocument();
    expect(mocks.fetchAdminWithAuth).toHaveBeenCalledWith(
      "/api/admin/auth/status",
      undefined,
      expect.objectContaining({
        preferredUser: expect.objectContaining({ uid: "server-admin" }),
      }),
    );
  });

  it("keeps the settings menu limited to sign out when admin access is denied", async () => {
    mocks.currentUserState.value = buildUser({
      uid: "non-admin",
      email: "viewer@example.com",
    });
    mocks.fetchAdminWithAuth.mockResolvedValue(new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }));

    render(<GlobalHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth).toHaveBeenCalled();
    });
    expect(screen.queryByRole("menuitem", { name: "Admin Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Sign Out" })).toBeInTheDocument();
  });
});
