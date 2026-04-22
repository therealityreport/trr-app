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

const buildInitialLandingPayload = () => ({
  network_sets: [
    {
      key: "bravo-tv",
      title: "Bravo TV",
      description: "Shared Bravo social handles used in sends and profile backfills.",
      handles: [
        {
          platform: "instagram",
          handle: "bravotv",
          display_label: "@bravotv",
          href: "/social/instagram/bravotv",
          external: false,
        },
        {
          platform: "instagram",
          handle: "bravowwhl",
          display_label: "@bravowwhl",
          href: "/social/instagram/bravowwhl",
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
          href: "/social/instagram/bravowwhl",
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
  person_targets: [
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
    },
    {
      person_id: "person-2",
      full_name: "Producer Without Handles",
      shows: [
        {
          show_id: "show-1",
          show_name: "The Traitors",
          canonical_slug: "the-traitors",
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
  reddit_dashboard: {
    active_community_count: 0,
    archived_community_count: 0,
    show_count: 0,
  },
});

const buildUpdatedLandingPayload = () => ({
  ...buildInitialLandingPayload(),
  people_profiles: [
    ...buildInitialLandingPayload().people_profiles,
    {
      person_id: "person-2",
      full_name: "Producer Without Handles",
      shows: [
        {
          show_id: "show-1",
          show_name: "The Traitors",
          canonical_slug: "the-traitors",
        },
      ],
      handles: [
        {
          platform: "threads",
          handle: "producerhandles",
          display_label: "@producerhandles",
          href: "https://www.threads.net/@producerhandles",
          external: true,
        },
      ],
    },
  ],
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
        if (url === "/api/admin/social/landing" && init?.method === "POST") {
          expect(JSON.parse(String(init.body))).toMatchObject({
            target_type: "person",
            target_id: "person-2",
            platform: "threads",
            value: "https://www.threads.net/@producerhandles",
          });
          return jsonResponse(buildUpdatedLandingPayload());
        }

        if (url === "/api/admin/social/landing") {
          return jsonResponse(buildInitialLandingPayload());
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
      expect(screen.getByRole("heading", { name: "NETWORKS" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "SHOWS" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "PEOPLE" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Bravo TV" })).toBeInTheDocument();
      expect(screen.getAllByText("The Traitors").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Andy Cohen").length).toBeGreaterThan(0);
    });

    expect(
      screen.getByText(
        "Review network profiles, dedicated show social sets, and cast handles already stored in TRR.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Recent Runs")).not.toBeInTheDocument();
    expect(screen.queryByText("Review Queue")).not.toBeInTheDocument();
    expect(screen.queryByText("Shared Sources")).not.toBeInTheDocument();
    expect(screen.queryByText("Bravo account inventory")).not.toBeInTheDocument();
    expect(screen.queryByText("Ambiguous or unmatched posts")).not.toBeInTheDocument();
    expect(screen.queryByText("No open shared review items.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Reddit Dashboard" })).toHaveAttribute(
      "href",
      "/admin/social/reddit",
    );

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

  it("adds a handle for a cast member and updates the matching landing container", async () => {
    render(<AdminSocialPage />);

    await waitFor(() => {
      expect(screen.getByText("ADD SOCIAL HANDLE")).toBeInTheDocument();
      expect(screen.queryByText("@producerhandles")).not.toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByRole("combobox", { name: /NETWORK SHOW or CAST MEMBER/i }),
      {
        target: { value: "person:person-2" },
      },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "THE PLATFORM" }), {
      target: { value: "threads" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "USERNAME/HANDLE (or URL)" }), {
      target: { value: "https://www.threads.net/@producerhandles" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(
        screen.getByText("Saved Threads for Producer Without Handles."),
      ).toBeInTheDocument();
      expect(screen.getByText("@producerhandles")).toBeInTheDocument();
    });

    const saveCall = mocks.fetchAdminWithAuth.mock.calls.find(
      ([input, init]) =>
        String(input) === "/api/admin/social/landing" && init?.method === "POST",
    );
    expect(saveCall?.[2]).toMatchObject({
      allowDevAdminBypass: true,
      preferredUser: mocks.guardState.user,
    });
  });
});
