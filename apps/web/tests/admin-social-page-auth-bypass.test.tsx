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
    prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
  }) => {
    void prefetch;
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
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
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

vi.mock("@/lib/admin/show-admin-routes", async () => {
  const actual = await vi.importActual("@/lib/admin/show-admin-routes");
  return actual;
});

vi.mock("@/lib/admin/show-route-slug", () => ({
  resolvePreferredShowRouteSlug: ({
    canonicalSlug,
    fallback,
  }: {
    canonicalSlug?: string | null;
    fallback: string;
  }) => canonicalSlug || fallback,
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
      async (
        input: RequestInfo | URL,
        init?: RequestInit,
        options?: { allowDevAdminBypass?: boolean },
      ) => {
        if (!options?.allowDevAdminBypass) {
          throw new Error("Not authenticated");
        }

        const url = String(input);
        if (url === "/api/admin/social/landing") {
          return jsonResponse({
            network_sets: [
              {
                key: "bravo-tv",
                title: "Bravo TV",
                description: "Bravo-owned shared social profiles and pipeline state.",
                handles: [
                  {
                    platform: "instagram",
                    handle: "bravotv",
                    display_label: "@bravotv",
                    href: "/admin/social/instagram/bravotv",
                    external: false,
                  },
                  {
                    platform: "instagram",
                    handle: "bravowwhl",
                    display_label: "@bravowwhl",
                    href: "/admin/social/instagram/bravowwhl",
                    external: false,
                  },
                ],
              },
            ],
            show_sets: [
              {
                show_id: "show-1",
                show_name: "The Traitors",
                canonical_slug: "the-traitors",
                alternative_names: [],
                handles: [],
                fallback_note: "Shared coverage via Bravo TV",
              },
              {
                show_id: "show-2",
                show_name: "Watch What Happens Live with Andy Cohen",
                canonical_slug: "watch-what-happens-live-with-andy-cohen",
                alternative_names: ["WWHL"],
                handles: [
                  {
                    platform: "instagram",
                    handle: "bravowwhl",
                    display_label: "@bravowwhl",
                    href: "/admin/social/instagram/bravowwhl",
                    external: false,
                  },
                ],
                fallback_note: null,
              },
            ],
            people_profiles: [
              {
                person_id: "person-1",
                full_name: "Andy Cohen",
                shows: [
                  {
                    show_id: "show-2",
                    show_name: "Watch What Happens Live with Andy Cohen",
                    canonical_slug: "watch-what-happens-live-with-andy-cohen",
                  },
                ],
                handles: [
                  {
                    platform: "instagram",
                    handle: "andycohen",
                    display_label: "@andycohen",
                    href: "https://www.instagram.com/andycohen",
                    external: true,
                  },
                ],
              },
            ],
            shared_pipeline: {
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
              runs: [
                {
                  id: "run-1",
                  status: "completed",
                  ingest_mode: "shared_account_async",
                  created_at: "2026-03-20T12:00:00.000Z",
                },
              ],
              review_items: [
                {
                  id: "review-1",
                  platform: "instagram",
                  source_id: "source-1",
                  source_account: "bravotv",
                  review_reason: "unmatched_show",
                  review_status: "open",
                },
              ],
            },
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

  it("uses the dev-admin bypass for landing loads and shared ingest actions", async () => {
    render(<AdminSocialPage />);

    await waitFor(() => {
      expect(screen.getByText("NETWORKS")).toBeInTheDocument();
      expect(screen.getByText("SHOWS")).toBeInTheDocument();
      expect(screen.getByText("PEOPLE")).toBeInTheDocument();
      expect(screen.getByText("Bravo TV")).toBeInTheDocument();
      expect(screen.getByText("The Traitors")).toBeInTheDocument();
      expect(screen.getByText("Andy Cohen")).toBeInTheDocument();
    });

    expect(
      screen.queryByText("Bravo-owned account pipeline"),
    ).not.toBeInTheDocument();

    expect(mocks.fetchAdminWithAuth.mock.calls[0]?.[0]).toBe(
      "/api/admin/social/landing",
    );
    expect(mocks.fetchAdminWithAuth.mock.calls[0]?.[2]).toMatchObject({
      allowDevAdminBypass: true,
      preferredUser: mocks.guardState.user,
    });

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
