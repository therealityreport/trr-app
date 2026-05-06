import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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

const jsonResponse = (
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
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
  cast_socialblade_shows: [
    {
      show_id: "show-rhoslc",
      show_name: "RHOSLC",
      canonical_slug: "real-housewives-of-salt-lake-city",
      platform_counts: {
        instagram: 1,
        youtube: 1,
      },
      cast_member_count: 1,
      latest_scraped_at: "2026-04-24T14:30:00.000Z",
      members: [
        {
          person_id: "person-heather-gay",
          full_name: "Heather Gay",
          photo_url: "https://example.com/heather-gay.jpg",
          accounts: [
            {
              platform: "instagram",
              handle: "heathergay",
              display_label: "@heathergay",
              account_href: "/social/instagram/heathergay",
              socialblade_url: "https://socialblade.com/instagram/user/heathergay",
              scraped_at: "2026-04-24T14:30:00.000Z",
              updated_at: "2026-04-24T14:45:00.000Z",
              stats_refreshed: true,
            },
            {
              platform: "youtube",
              handle: "heathergay",
              display_label: "@heathergay",
              account_href: "/social/youtube/heathergay",
              socialblade_url: "https://socialblade.com/youtube/c/heathergay",
              scraped_at: "2026-04-23T14:30:00.000Z",
              updated_at: "2026-04-23T14:45:00.000Z",
              stats_refreshed: false,
            },
          ],
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
        source_scope: "network",
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
  shared_source_sets: [
    {
      key: "bravo-tv",
      title: "Bravo TV",
      source_scope: "network",
      description: "Network-owned social accounts and network-level shared ingest.",
      sources: [
        {
          id: "source-1",
          platform: "instagram",
          source_scope: "network",
          account_handle: "bravotv",
          is_active: true,
          scrape_priority: 10,
          metadata: { display_name: "Bravo TV" },
        },
      ],
    },
    {
      key: "news",
      title: "News",
      source_scope: "news",
      description: "Outlet and publication accounts used for social news coverage.",
      sources: [
        {
          id: "source-news-1",
          platform: "instagram",
          source_scope: "news",
          account_handle: "bravodaily",
          is_active: true,
          scrape_priority: 20,
          metadata: { display_name: "Bravo Daily" },
        },
      ],
    },
    {
      key: "creators",
      title: "Creators",
      source_scope: "creator",
      description: "Independent creator accounts such as queensofbravo.",
      sources: [
        {
          id: "source-creator-1",
          platform: "instagram",
          source_scope: "creator",
          account_handle: "queensofbravo",
          is_active: true,
          scrape_priority: 20,
          metadata: { display_name: "Queens of Bravo" },
        },
      ],
    },
  ],
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
  const landingCacheKey = "trr-admin-social-landing:v4";

  beforeEach(() => {
    window.localStorage.clear();
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

        if (url.startsWith("/api/admin/social/landing")) {
          return jsonResponse(buildInitialLandingPayload());
        }

        if (url.includes("/social/shared/ingest")) {
          expect(init?.method).toBe("POST");
          expect(JSON.parse(String(init?.body))).toMatchObject({
            source_scope: "network",
          });
          return jsonResponse({
            message: "Shared ingest queued",
            run_id: "run-queued-1",
          });
        }

        throw new Error(`Unhandled request: ${url}`);
      },
    );
  });

  it("updates the cached landing payload after running shared ingest", async () => {
    let landingLoadCount = 0;
    const refreshedPayload = buildUpdatedLandingPayload();

    mocks.fetchAdminWithAuth.mockImplementation(async (input, init, options) => {
      if (!options?.allowDevAdminBypass) {
        throw new Error("Not authenticated");
      }

      const url = String(input);
      if (url.startsWith("/api/admin/social/landing")) {
        landingLoadCount += 1;
        if (landingLoadCount === 2) {
          expect(url).toBe("/api/admin/social/landing?refresh=1");
        }
        return jsonResponse(
          landingLoadCount === 1 ? buildInitialLandingPayload() : refreshedPayload,
        );
      }

      if (url.includes("/social/shared/ingest")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({
          source_scope: "network",
        });
        return jsonResponse({
          message: "Shared ingest queued",
          run_id: "run-queued-1",
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    render(<AdminSocialPage />);

    await waitFor(() => {
      const cached = JSON.parse(
        window.localStorage.getItem(landingCacheKey) || "null",
      ) as { payload?: ReturnType<typeof buildInitialLandingPayload> } | null;
      expect(cached?.payload?.people_profiles).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Run Shared Ingest" }));

    await waitFor(() => {
      const cached = JSON.parse(
        window.localStorage.getItem(landingCacheKey) || "null",
      ) as { payload?: ReturnType<typeof buildUpdatedLandingPayload> } | null;
      expect(cached?.payload).toMatchObject({
        people_profiles: expect.arrayContaining([
          expect.objectContaining({
            person_id: "person-2",
            handles: [
              expect.objectContaining({
                platform: "threads",
                handle: "producerhandles",
              }),
            ],
          }),
        ]),
      });
    });
  });

  it("does not overwrite last-known-good landing cache with a not-cacheable response", async () => {
    const cachedPayload = buildInitialLandingPayload();
    const fallbackPayload = {
      ...cachedPayload,
      people_profiles: [],
      person_targets: [],
      cast_socialblade_shows: [],
    };
    window.localStorage.setItem(
      landingCacheKey,
      JSON.stringify({
        cached_at: "2026-04-24T12:00:00.000Z",
        payload: cachedPayload,
      }),
    );

    mocks.fetchAdminWithAuth.mockImplementation(async (input, init, options) => {
      void init;
      if (!options?.allowDevAdminBypass) {
        throw new Error("Not authenticated");
      }

      const url = String(input);
      if (url.startsWith("/api/admin/social/landing")) {
        return jsonResponse(fallbackPayload, {
          headers: { "x-trr-cacheable": "0" },
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    render(<AdminSocialPage />);

    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth).toHaveBeenCalledWith(
        "/api/admin/social/landing",
        undefined,
        expect.objectContaining({
          allowDevAdminBypass: true,
          preferredUser: mocks.guardState.user,
        }),
      );
    });

    const stored = JSON.parse(
      window.localStorage.getItem(landingCacheKey) || "null",
    ) as { payload?: ReturnType<typeof buildInitialLandingPayload> } | null;

    expect(stored?.payload?.people_profiles).toHaveLength(1);
    expect(stored?.payload?.cast_socialblade_shows).toHaveLength(1);
  });

  it("uses the dev-admin bypass for landing loads and shared ingest actions", async () => {
    render(<AdminSocialPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "NETWORKS" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "SHOWS" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "PEOPLE" })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { name: "PEOPLE" })).toHaveLength(1);
      expect(screen.getByRole("heading", { name: "NEWS" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "CREATORS" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Bravo TV" })).toBeInTheDocument();
      expect(screen.getAllByText("The Traitors").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Andy Cohen").length).toBeGreaterThan(0);
      expect(screen.getByText("Bravo Daily")).toBeInTheDocument();
      expect(screen.getByText("Queens of Bravo")).toBeInTheDocument();
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

  it("renders show-grouped people SocialBlade rows and reveals grouped platform accounts", async () => {
    const landingPayload = buildInitialLandingPayload();
    mocks.fetchAdminWithAuth.mockImplementationOnce(async () =>
      jsonResponse({
        ...landingPayload,
        cast_socialblade_shows: [
          ...landingPayload.cast_socialblade_shows,
          {
            show_id: "show-rhony",
            show_name: "RHONY",
            canonical_slug: "real-housewives-of-new-york-city",
            platform_counts: {
              instagram: 1,
            },
            cast_member_count: 1,
            latest_scraped_at: "2026-04-24T13:30:00.000Z",
            members: [
              {
                person_id: "person-meredith-marks",
                full_name: "Meredith Marks",
                photo_url: null,
                accounts: [
                  {
                    platform: "instagram",
                    handle: "meredithmarks",
                    display_label: "@meredithmarks",
                    account_href: "/social/instagram/meredithmarks",
                    socialblade_url:
                      "https://socialblade.com/instagram/user/meredithmarks",
                    scraped_at: "2026-04-24T13:30:00.000Z",
                    updated_at: "2026-04-24T13:45:00.000Z",
                    stats_refreshed: true,
                  },
                ],
              },
            ],
          },
        ],
      }),
    );

    render(<AdminSocialPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "PEOPLE" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "CAST SOCIALBLADE" })).not.toBeInTheDocument();
      const rhoslcButton = screen.getByRole("button", { name: /RHOSLC/ });
      const rhonyButton = screen.getByRole("button", { name: /RHONY/ });
      expect(rhoslcButton).toHaveAttribute("aria-pressed", "true");
      expect(rhonyButton).toHaveAttribute("aria-pressed", "false");
    });

    expect(screen.getByText("Heather Gay")).toBeInTheDocument();
    expect(screen.getAllByText("Instagram").length).toBeGreaterThan(0);
    expect(screen.getAllByText("YouTube").length).toBeGreaterThan(0);

    expect(screen.getByRole("img", { name: "Heather Gay profile" })).toHaveAttribute(
      "src",
      "https://example.com/heather-gay.jpg",
    );
    expect(screen.getByRole("link", { name: "Instagram @heathergay" })).toHaveAttribute(
      "href",
      "/social/instagram/heathergay",
    );

    fireEvent.click(screen.getByRole("button", { name: /RHONY/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /RHOSLC/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByRole("button", { name: /RHONY/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByText("Meredith Marks")).toBeInTheDocument();
      expect(screen.queryByText("Heather Gay")).not.toBeInTheDocument();
    });
  });

  it("preserves the selected cast SocialBlade show across landing payload refreshes", async () => {
    const landingPayload = buildInitialLandingPayload();
    const rhonyShow = {
      show_id: "show-rhony",
      show_name: "RHONY",
      canonical_slug: "real-housewives-of-new-york-city",
      platform_counts: {
        instagram: 1,
      },
      cast_member_count: 1,
      latest_scraped_at: "2026-04-24T13:30:00.000Z",
      members: [
        {
          person_id: "person-meredith-marks",
          full_name: "Meredith Marks",
          photo_url: null,
          accounts: [
            {
              platform: "instagram",
              handle: "meredithmarks",
              display_label: "@meredithmarks",
              account_href: "/social/instagram/meredithmarks",
              socialblade_url:
                "https://socialblade.com/instagram/user/meredithmarks",
              scraped_at: "2026-04-24T13:30:00.000Z",
              updated_at: "2026-04-24T13:45:00.000Z",
              stats_refreshed: true,
            },
          ],
        },
      ],
    };
    let landingLoadCount = 0;

    mocks.fetchAdminWithAuth.mockImplementation(async (input, init, options) => {
      if (!options?.allowDevAdminBypass) {
        throw new Error("Not authenticated");
      }

      const url = String(input);
      if (url.startsWith("/api/admin/social/landing")) {
        landingLoadCount += 1;
        return jsonResponse({
          ...landingPayload,
          cast_socialblade_shows: [
            ...landingPayload.cast_socialblade_shows,
            {
              ...rhonyShow,
              members:
                landingLoadCount === 1
                  ? rhonyShow.members
                  : [
                      {
                        ...rhonyShow.members[0],
                        full_name: "Meredith Marks Refreshed",
                      },
                    ],
            },
          ],
        });
      }

      if (url.includes("/social/shared/ingest")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({
          source_scope: "network",
        });
        return jsonResponse({
          message: "Shared ingest queued",
          run_id: "run-queued-1",
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    render(<AdminSocialPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "PEOPLE" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /RHOSLC/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: /RHONY/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByText("Heather Gay")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /RHONY/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /RHOSLC/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByRole("button", { name: /RHONY/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByText("Meredith Marks")).toBeInTheDocument();
      expect(screen.queryByText("Heather Gay")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Run Shared Ingest" }));

    await waitFor(() => {
      expect(screen.getByText("Shared ingest queued")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /RHOSLC/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByRole("button", { name: /RHONY/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByText("Meredith Marks Refreshed")).toBeInTheDocument();
      expect(screen.queryByText("Heather Gay")).not.toBeInTheDocument();
    });
  });

  it("falls back to the first cast SocialBlade show when the selected show disappears", async () => {
    const landingPayload = buildInitialLandingPayload();
    const rhonyShow = {
      show_id: "show-rhony",
      show_name: "RHONY",
      canonical_slug: "real-housewives-of-new-york-city",
      platform_counts: {
        instagram: 1,
      },
      cast_member_count: 1,
      latest_scraped_at: "2026-04-24T13:30:00.000Z",
      members: [
        {
          person_id: "person-meredith-marks",
          full_name: "Meredith Marks",
          photo_url: null,
          accounts: [
            {
              platform: "instagram",
              handle: "meredithmarks",
              display_label: "@meredithmarks",
              account_href: "/social/instagram/meredithmarks",
              socialblade_url:
                "https://socialblade.com/instagram/user/meredithmarks",
              scraped_at: "2026-04-24T13:30:00.000Z",
              updated_at: "2026-04-24T13:45:00.000Z",
              stats_refreshed: true,
            },
          ],
        },
      ],
    };
    let landingLoadCount = 0;

    mocks.fetchAdminWithAuth.mockImplementation(async (input, init, options) => {
      if (!options?.allowDevAdminBypass) {
        throw new Error("Not authenticated");
      }

      const url = String(input);
      if (url.startsWith("/api/admin/social/landing")) {
        landingLoadCount += 1;
        return jsonResponse({
          ...landingPayload,
          cast_socialblade_shows:
            landingLoadCount === 2
              ? landingPayload.cast_socialblade_shows
              : [...landingPayload.cast_socialblade_shows, rhonyShow],
        });
      }

      if (url.includes("/social/shared/ingest")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toMatchObject({
          source_scope: "network",
        });
        return jsonResponse({
          message: "Shared ingest queued",
          run_id: "run-queued-1",
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    render(<AdminSocialPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /RHOSLC/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: /RHONY/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByText("Heather Gay")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /RHONY/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /RHOSLC/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByRole("button", { name: /RHONY/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByText("Meredith Marks")).toBeInTheDocument();
      expect(screen.queryByText("Heather Gay")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Run Shared Ingest" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /RHOSLC/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(
        screen.queryByRole("button", { name: /RHONY/ }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Heather Gay")).toBeInTheDocument();
      expect(screen.queryByText("Meredith Marks")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Run Shared Ingest" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /RHOSLC/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: /RHONY/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByText("Heather Gay")).toBeInTheDocument();
      expect(screen.queryByText("Meredith Marks")).not.toBeInTheDocument();
    });
  });

  it("keeps a quiet people empty state when the landing payload has no cast rows", async () => {
    mocks.fetchAdminWithAuth.mockImplementationOnce(async () =>
      jsonResponse({
        ...buildInitialLandingPayload(),
        cast_socialblade_shows: [],
      }),
    );

    render(<AdminSocialPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "PEOPLE" })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { name: "PEOPLE" })).toHaveLength(1);
      expect(
        screen.getByText("No people SocialBlade rows are available yet."),
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "NETWORKS" })).toBeInTheDocument();
    });
  });

  it("adds news and creator accounts through their scoped containers", async () => {
    let postCount = 0;
    mocks.fetchAdminWithAuth.mockImplementation(async (input, init, options) => {
      if (!options?.allowDevAdminBypass) {
        throw new Error("Not authenticated");
      }

      const url = String(input);
      if (url === "/api/admin/social/landing" && init?.method === "POST") {
        postCount += 1;
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        if (postCount === 1) {
          expect(body).toMatchObject({
            target_type: "shared_source",
            target_id: "news",
            source_scope: "news",
            platform: "instagram",
            value: "@realityblurb",
            display_name: "Reality Blurb",
          });
          return jsonResponse({
            ...buildInitialLandingPayload(),
            shared_source_sets: buildInitialLandingPayload().shared_source_sets.map(
              (sourceSet) =>
                sourceSet.source_scope === "news"
                  ? {
                      ...sourceSet,
                      sources: [
                        ...sourceSet.sources,
                        {
                          id: "source-news-2",
                          platform: "instagram",
                          source_scope: "news",
                          account_handle: "realityblurb",
                          is_active: true,
                          scrape_priority: 20,
                          metadata: { display_name: "Reality Blurb" },
                        },
                      ],
                    }
                  : sourceSet,
            ),
          });
        }

        expect(body).toMatchObject({
          target_type: "shared_source",
          target_id: "creator",
          source_scope: "creator",
          platform: "instagram",
          value: "@bravobravoduckingbravo",
          display_name: "Bravo Bravo Ducking Bravo",
        });
        return jsonResponse({
          ...buildInitialLandingPayload(),
          shared_source_sets: buildInitialLandingPayload().shared_source_sets.map(
            (sourceSet) =>
              sourceSet.source_scope === "creator"
                ? {
                    ...sourceSet,
                    sources: [
                      ...sourceSet.sources,
                      {
                        id: "source-creator-2",
                        platform: "instagram",
                        source_scope: "creator",
                        account_handle: "bravobravoduckingbravo",
                        is_active: true,
                        scrape_priority: 20,
                        metadata: { display_name: "Bravo Bravo Ducking Bravo" },
                      },
                    ],
                  }
                : sourceSet,
          ),
        });
      }

      if (url.startsWith("/api/admin/social/landing")) {
        return jsonResponse(buildInitialLandingPayload());
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    render(<AdminSocialPage />);

    const newsSection = await waitFor(() => {
      const heading = screen.getByRole("heading", { name: "NEWS" });
      const section = heading.closest("section");
      expect(section).not.toBeNull();
      return section as HTMLElement;
    });
    fireEvent.change(within(newsSection).getByRole("textbox", { name: "Handle or URL" }), {
      target: { value: "@realityblurb" },
    });
    fireEvent.change(within(newsSection).getByRole("textbox", { name: "Display name" }), {
      target: { value: "Reality Blurb" },
    });
    fireEvent.click(within(newsSection).getByRole("button", { name: "Add Source" }));

    await waitFor(() => {
      expect(screen.getByText("Reality Blurb")).toBeInTheDocument();
    });

    const creatorSection = screen
      .getByRole("heading", { name: "CREATORS" })
      .closest("section") as HTMLElement;
    fireEvent.change(within(creatorSection).getByRole("textbox", { name: "Handle or URL" }), {
      target: { value: "@bravobravoduckingbravo" },
    });
    fireEvent.change(within(creatorSection).getByRole("textbox", { name: "Display name" }), {
      target: { value: "Bravo Bravo Ducking Bravo" },
    });
    fireEvent.click(within(creatorSection).getByRole("button", { name: "Add Source" }));

    await waitFor(() => {
      expect(screen.getByText("Bravo Bravo Ducking Bravo")).toBeInTheDocument();
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

  it("does not overwrite last-known-good landing cache after a not-cacheable add-handle save", async () => {
    const cachedPayload = buildInitialLandingPayload();
    const degradedPostPayload = {
      ...buildUpdatedLandingPayload(),
      cast_socialblade_shows: [],
    };
    window.localStorage.setItem(
      landingCacheKey,
      JSON.stringify({
        cached_at: "2026-04-24T12:00:00.000Z",
        payload: cachedPayload,
      }),
    );

    mocks.fetchAdminWithAuth.mockImplementation(async (input, init, options) => {
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
        return jsonResponse(degradedPostPayload, {
          headers: { "x-trr-cacheable": "0" },
        });
      }

      if (url.startsWith("/api/admin/social/landing")) {
        return jsonResponse(cachedPayload);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

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
      expect(
        screen.getByText("No people SocialBlade rows are available yet."),
      ).toBeInTheDocument();
    });

    const stored = JSON.parse(
      window.localStorage.getItem(landingCacheKey) || "null",
    ) as { payload?: ReturnType<typeof buildInitialLandingPayload> } | null;

    expect(stored?.payload?.people_profiles).toHaveLength(1);
    expect(stored?.payload?.people_profiles).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          person_id: "person-2",
        }),
      ]),
    );
    expect(stored?.payload?.cast_socialblade_shows).toHaveLength(1);
  });
});
