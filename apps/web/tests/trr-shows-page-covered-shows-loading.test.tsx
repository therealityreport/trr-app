/* eslint-disable @next/next/no-img-element */
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminWithAuthMock, useAdminGuardMock } = vi.hoisted(() => ({
  fetchAdminWithAuthMock: vi.fn(),
  useAdminGuardMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt="" {...props} />,
}));

vi.mock("@/components/ClientOnly", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminBreadcrumbs", () => ({
  default: () => <div data-testid="breadcrumbs" />,
}));

vi.mock("@/components/admin/AdminGlobalHeader", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/admin/admin-breadcrumbs", () => ({
  buildAdminSectionBreadcrumb: () => [],
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: fetchAdminWithAuthMock,
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: useAdminGuardMock,
}));

vi.mock("@/lib/admin/show-admin-routes", () => ({
  buildShowAdminUrl: ({ showSlug }: { showSlug: string }) => `/admin/trr-shows/${showSlug}`,
}));

vi.mock("@/lib/admin/show-route-slug", () => ({
  resolvePreferredShowRouteSlug: ({ canonicalSlug, fallback }: { canonicalSlug?: string | null; fallback: string }) =>
    canonicalSlug || fallback,
}));

import TrrShowsPage from "@/app/admin/trr-shows/page";

describe("TRR shows page covered shows loading", () => {
  beforeEach(() => {
    fetchAdminWithAuthMock.mockReset();
    useAdminGuardMock.mockReset();
    useAdminGuardMock.mockReturnValue({
      user: { uid: "admin-uid" },
      userKey: "admin-uid",
      checking: false,
      hasAccess: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries a transient auth miss and renders covered shows", async () => {
    vi.useFakeTimers();
    fetchAdminWithAuthMock
      .mockRejectedValueOnce(new Error("Not authenticated"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            shows: [
              {
                id: "covered-1",
                trr_show_id: "show-1",
                show_name: "The Traitors",
                canonical_slug: "the-traitors",
                created_at: "2026-03-01T00:00:00.000Z",
                created_by_firebase_uid: "admin-uid",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    render(<TrrShowsPage />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByText("The Traitors")).toBeInTheDocument();
    });

    expect(fetchAdminWithAuthMock).toHaveBeenCalledTimes(2);
    expect(fetchAdminWithAuthMock.mock.calls[0]?.[2]).toMatchObject({
      allowDevAdminBypass: true,
    });
    expect(screen.queryByText("Covered Shows Unavailable")).not.toBeInTheDocument();
  });

  it("shows a covered shows load error instead of the empty-state message when the request fails", async () => {
    fetchAdminWithAuthMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "database unavailable" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<TrrShowsPage />);

    await waitFor(() => {
      expect(screen.getByText("Covered Shows Unavailable")).toBeInTheDocument();
    });

    expect(screen.getByText("database unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/No shows added yet/i)).not.toBeInTheDocument();
  });
});
