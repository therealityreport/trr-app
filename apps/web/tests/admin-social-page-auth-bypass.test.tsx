import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  guardState: {
    user: { uid: "admin-1", email: "admin@example.com" },
    checking: false,
    hasAccess: true,
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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
  fetchAdminWithAuth: (...args: unknown[]) => (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

vi.mock("@/lib/admin/show-admin-routes", () => ({
  buildShowAdminUrl: ({ showSlug, tab, socialView }: { showSlug: string; tab?: string; socialView?: string }) =>
    `/admin/trr-shows/${showSlug}${tab ? `?tab=${tab}` : ""}${socialView ? `&social_view=${socialView}` : ""}`,
  buildSocialAccountProfileUrl: ({
    platform,
    handle,
  }: {
    platform: string;
    handle: string;
  }) => `/admin/social/${platform}/${handle}`,
}));

vi.mock("@/lib/admin/show-route-slug", () => ({
  resolvePreferredShowRouteSlug: ({ canonicalSlug, fallback }: { canonicalSlug?: string | null; fallback: string }) =>
    canonicalSlug || fallback,
}));

import AdminSocialPage from "@/app/admin/social/page";

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("admin social page auth bypass", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.fetchAdminWithAuth.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit, options?: { allowDevAdminBypass?: boolean }) => {
        if (!options?.allowDevAdminBypass) {
          throw new Error("Not authenticated");
        }

        const url = String(input);
        if (url === "/api/admin/covered-shows") {
          return jsonResponse({
            shows: [
              {
                id: "show-1",
                trr_show_id: "trr-show-1",
                show_name: "The Traitors",
                canonical_slug: "the-traitors",
                alternative_names: [],
              },
            ],
          });
        }
        if (url.includes("/social/shared/sources")) {
          return jsonResponse({
            sources: [
              {
                id: "source-1",
                platform: "instagram",
                source_scope: "bravo",
                account_handle: "bravotv",
                is_active: true,
                scrape_priority: 10,
              },
            ],
          });
        }
        if (url.includes("/social/shared/runs")) {
          return jsonResponse([
            {
              id: "run-1",
              status: "completed",
              ingest_mode: "shared_account_async",
              created_at: "2026-03-20T12:00:00.000Z",
            },
          ]);
        }
        if (url.includes("/social/shared/review-queue")) {
          return jsonResponse({
            items: [
              {
                id: "review-1",
                platform: "instagram",
                source_id: "source-1",
                source_account: "bravotv",
                review_reason: "unmatched_show",
                review_status: "open",
              },
            ],
          });
        }
        if (url.includes("/social/shared/ingest")) {
          expect(init?.method).toBe("POST");
          return jsonResponse({
            message: "Shared ingest queued",
            run_id: "run-queued-1",
          });
        }
        throw new Error(`Unhandled request: ${url}`);
      },
    );
  });

  it("uses the dev-admin bypass for landing-page loads and shared ingest actions", async () => {
    render(<AdminSocialPage />);

    await waitFor(() => {
      expect(screen.getByText("The Traitors")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "@bravotv" })).toBeInTheDocument();
    });

    for (const call of mocks.fetchAdminWithAuth.mock.calls.slice(0, 4)) {
      expect(call[2]).toMatchObject({
        allowDevAdminBypass: true,
        preferredUser: mocks.guardState.user,
      });
    }

    fireEvent.click(screen.getByRole("button", { name: "Run Shared Ingest" }));

    await waitFor(() => {
      expect(screen.getByText("Shared ingest queued")).toBeInTheDocument();
    });

    const ingestCall = mocks.fetchAdminWithAuth.mock.calls.find(([input]) =>
      String(input).includes("/social/shared/ingest"),
    );
    expect(ingestCall?.[2]).toMatchObject({
      allowDevAdminBypass: true,
      preferredUser: mocks.guardState.user,
    });
  });
});
