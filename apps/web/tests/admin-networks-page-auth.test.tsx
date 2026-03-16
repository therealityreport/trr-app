import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminBrandsPage from "@/app/admin/brands/page";

const navigationState = vi.hoisted(() => ({
  pathname: "/brands",
  search: "",
  replace: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  guardState: {
    user: { email: "admin@example.com", uid: "admin-1" },
    checking: false,
    hasAccess: true,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({ replace: navigationState.replace }),
  useSearchParams: () => new URLSearchParams(navigationState.search),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/BrandLogoOptionsModal", () => ({
  __esModule: true,
  default: ({ isOpen, targetLabel }: { isOpen: boolean; targetLabel: string }) =>
    isOpen ? <div data-testid="brand-logo-modal">{targetLabel}</div> : null,
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const buildSummaryPayload = () => ({
  totals: { total_available_shows: 18, total_added_shows: 7 },
  rows: [
    {
      type: "network",
      name: "Bravo",
      available_show_count: 8,
      added_show_count: 3,
      hosted_logo_url: "https://cdn.example.com/bravo-wordmark.svg",
      hosted_logo_black_url: null,
      hosted_logo_white_url: null,
      wikidata_id: "Q123",
      wikipedia_url: "https://en.wikipedia.org/wiki/Bravo_(American_TV_network)",
      tmdb_entity_id: "74",
      homepage_url: "https://bravotv.com",
      has_logo: true,
      has_bw_variants: false,
      has_links: true,
    },
    {
      type: "streaming",
      name: "Peacock Premium",
      available_show_count: 6,
      added_show_count: 3,
      hosted_logo_url: "https://cdn.example.com/peacock-wordmark.svg",
      hosted_logo_black_url: "https://cdn.example.com/peacock-icon-black.svg",
      hosted_logo_white_url: "https://cdn.example.com/peacock-icon-white.svg",
      wikidata_id: "Q67765302",
      wikipedia_url: "https://en.wikipedia.org/wiki/Peacock_(streaming_service)",
      tmdb_entity_id: "387",
      homepage_url: "https://peacocktv.com",
      has_logo: true,
      has_bw_variants: true,
      has_links: true,
    },
    {
      type: "production",
      name: "Shed Media",
      available_show_count: 4,
      added_show_count: 1,
      hosted_logo_url: null,
      hosted_logo_black_url: null,
      hosted_logo_white_url: null,
      wikidata_id: null,
      wikipedia_url: null,
      tmdb_entity_id: null,
      homepage_url: null,
      has_logo: false,
      has_bw_variants: false,
      has_links: false,
    },
  ],
  generated_at: "2026-03-16T18:00:00.000Z",
});

const buildShowsPayload = () => ({
  rows: [
    {
      show_id: "show-1",
      show_name: "The Valley",
      canonical_slug: "the-valley",
      networks: ["Bravo"],
      franchise_key: "the-valley-universe",
      franchise_name: "The Valley Universe",
      explicit_fandom_url: null,
      fallback_fandom_url: null,
      effective_fandom_url: null,
      effective_source: "none",
      rule_candidates: [],
      include_allpages_scan: false,
    },
  ],
  count: 1,
});

const buildLogoPayload = (targetType: string) => {
  switch (targetType) {
    case "publication":
      return {
        rows: [
          {
            id: "pub-1",
            target_type: "publication",
            target_key: "deadline.com",
            target_label: "Deadline",
            source_url: "https://deadline.com",
            source_provider: "official_site",
            hosted_logo_url: "https://cdn.example.com/deadline-wordmark.svg",
            hosted_logo_black_url: null,
            hosted_logo_white_url: null,
            logo_role: "wordmark",
            is_primary: true,
            is_selected_for_role: true,
            updated_at: "2026-03-16T18:00:00Z",
          },
        ],
        count: 1,
      };
    case "social":
      return {
        rows: [
          {
            id: "social-1",
            target_type: "social",
            target_key: "instagram.com",
            target_label: "Instagram",
            source_url: "https://instagram.com",
            source_provider: "official_site",
            hosted_logo_url: "https://cdn.example.com/instagram-wordmark.svg",
            hosted_logo_black_url: null,
            hosted_logo_white_url: null,
            logo_role: "wordmark",
            is_primary: true,
            is_selected_for_role: true,
            updated_at: "2026-03-16T18:00:00Z",
          },
        ],
        count: 1,
      };
    case "other":
      return {
        rows: [],
        count: 0,
      };
    case "show":
      return {
        rows: [
          {
            id: "show-wordmark",
            target_type: "show",
            target_key: "show-1",
            target_label: "The Valley",
            source_url: "https://example.com/the-valley",
            source_provider: "manual_import_url",
            hosted_logo_url: "https://cdn.example.com/the-valley-wordmark.svg",
            hosted_logo_black_url: null,
            hosted_logo_white_url: null,
            logo_role: "wordmark",
            is_primary: true,
            is_selected_for_role: true,
            updated_at: "2026-03-16T18:00:00Z",
          },
        ],
        count: 1,
      };
    case "franchise":
      return {
        rows: [],
        count: 0,
      };
    default:
      return { rows: [], count: 0 };
  }
};

describe("unified brands workspace", () => {
  beforeEach(() => {
    navigationState.pathname = "/brands";
    navigationState.search = "";
    navigationState.replace.mockReset();
    mocks.fetchAdminWithAuth.mockReset();
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/admin/networks-streaming/summary")) {
        return jsonResponse(buildSummaryPayload());
      }
      if (url.includes("/api/admin/trr-api/brands/shows-franchises")) {
        return jsonResponse(buildShowsPayload());
      }
      if (url.includes("/api/admin/trr-api/brands/logos?")) {
        const parsed = new URL(url, "http://localhost");
        return jsonResponse(buildLogoPayload(parsed.searchParams.get("target_type") ?? ""));
      }
      if (url.endsWith("/api/admin/trr-api/brands/logos/sync")) {
        return jsonResponse({
          targets_scanned: 8,
          imports_created: 2,
          imports_updated: 1,
          unresolved: 3,
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
  });

  it("renders the unified table workspace and removes legacy network-only controls", async () => {
    render(<AdminBrandsPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Brands" })).toBeInTheDocument();
      expect(screen.getByText("Bravo")).toBeInTheDocument();
    });

    expect(screen.getByText("Manual Fixes Required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table View" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gallery View" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shows" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publications/News" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Social Media" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Other" })).toBeInTheDocument();
    expect(screen.getByText(/Missing Icon:/)).toBeInTheDocument();

    expect(screen.queryByText("Completion Gate")).not.toBeInTheDocument();
    expect(screen.queryByText("Schema Health")).not.toBeInTheDocument();
    expect(screen.queryByText("Sync/Mirror Brands")).not.toBeInTheDocument();
    expect(screen.queryByText("Re-run Unresolved Only")).not.toBeInTheDocument();
    expect(screen.queryByText("Overrides backend is unavailable right now. Summary rows are still available.")).not.toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Bravo" })).toHaveAttribute(
      "href",
      "/brands/networks-and-streaming/network/bravo",
    );

    fireEvent.click(screen.getByRole("link", { name: "Bravo" }).closest("tr") as HTMLElement);
    expect(await screen.findByTestId("brand-logo-modal")).toHaveTextContent("Bravo");

    expect(
      mocks.fetchAdminWithAuth.mock.calls.some((call: unknown[]) =>
        String(call[0]).includes("/api/admin/networks-streaming/overrides"),
      ),
    ).toBe(false);
  });

  it("syncs through the generic brands pipeline for the active category filter", async () => {
    navigationState.search = "category=shows&view=gallery";

    render(<AdminBrandsPage />);

    await waitFor(() => {
      expect(screen.getByText("The Valley")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Sync Logos" }));

    await waitFor(() => {
      expect(screen.getByText(/Scanned 8 show and franchise logos/)).toBeInTheDocument();
    });

    const syncCall = mocks.fetchAdminWithAuth.mock.calls.find((call: unknown[]) =>
      String(call[0]).endsWith("/api/admin/trr-api/brands/logos/sync"),
    );
    expect(syncCall?.[1]).toMatchObject({
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "all",
        target_types: ["show", "franchise"],
        only_missing: true,
        force: false,
        limit: 200,
      }),
    });
  });

  it("keeps available brand cards visible when one logo endpoint fails", async () => {
    navigationState.search = "view=gallery";
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/admin/networks-streaming/summary")) {
        return jsonResponse(buildSummaryPayload());
      }
      if (url.includes("/api/admin/trr-api/brands/shows-franchises")) {
        return jsonResponse(buildShowsPayload());
      }
      if (url.includes("/api/admin/trr-api/brands/logos?")) {
        const parsed = new URL(url, "http://localhost");
        if (parsed.searchParams.get("target_type") === "show") {
          return jsonResponse({ error: "Failed to fetch brand logos" }, 500);
        }
        return jsonResponse(buildLogoPayload(parsed.searchParams.get("target_type") ?? ""));
      }
      if (url.endsWith("/api/admin/trr-api/brands/logos/sync")) {
        return jsonResponse({
          targets_scanned: 8,
          imports_created: 2,
          imports_updated: 1,
          unresolved: 3,
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<AdminBrandsPage />);

    await waitFor(() => {
      expect(screen.getByText("Bravo")).toBeInTheDocument();
      expect(screen.getByText("Deadline")).toBeInTheDocument();
    });

    expect(screen.getByText(/Some brand sources failed to load: show logos/)).toBeInTheDocument();
    expect(screen.queryByText("No cards available for this category.")).not.toBeInTheDocument();
  });

  it("routes social-media domains from publication and other rows into the social category", async () => {
    navigationState.search = "category=social&view=gallery";
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/admin/networks-streaming/summary")) {
        return jsonResponse(buildSummaryPayload());
      }
      if (url.includes("/api/admin/trr-api/brands/shows-franchises")) {
        return jsonResponse(buildShowsPayload());
      }
      if (url.includes("/api/admin/trr-api/brands/logos?")) {
        const parsed = new URL(url, "http://localhost");
        const targetType = parsed.searchParams.get("target_type") ?? "";
        if (targetType === "publication") {
          return jsonResponse({
            rows: [
              {
                id: "publication-facebook",
                target_type: "publication",
                target_key: "facebook.com",
                target_label: "Facebook",
                source_url: "https://www.facebook.com/bravo",
                source_domain: "facebook.com",
                source_provider: "official_site",
                hosted_logo_url: "https://cdn.example.com/facebook-wordmark.svg",
                hosted_logo_black_url: null,
                hosted_logo_white_url: null,
                logo_role: "wordmark",
                is_primary: true,
                is_selected_for_role: true,
                updated_at: "2026-03-16T18:00:00Z",
              },
              {
                id: "publication-deadline",
                target_type: "publication",
                target_key: "deadline.com",
                target_label: "Deadline",
                source_url: "https://deadline.com",
                source_domain: "deadline.com",
                source_provider: "official_site",
                hosted_logo_url: "https://cdn.example.com/deadline-wordmark.svg",
                hosted_logo_black_url: null,
                hosted_logo_white_url: null,
                logo_role: "wordmark",
                is_primary: true,
                is_selected_for_role: true,
                updated_at: "2026-03-16T18:00:00Z",
              },
            ],
            count: 2,
          });
        }
        if (targetType === "other") {
          return jsonResponse({
            rows: [
              {
                id: "other-reddit",
                target_type: "other",
                target_key: "reddit.com",
                target_label: "Reddit",
                source_url: "https://www.reddit.com/r/BravoRealHousewives",
                source_domain: "reddit.com",
                source_provider: "official_site",
                hosted_logo_url: "https://cdn.example.com/reddit-wordmark.svg",
                hosted_logo_black_url: null,
                hosted_logo_white_url: null,
                logo_role: "wordmark",
                is_primary: true,
                is_selected_for_role: true,
                updated_at: "2026-03-16T18:00:00Z",
              },
            ],
            count: 1,
          });
        }
        if (targetType === "social") {
          return jsonResponse({ rows: [], count: 0 });
        }
        return jsonResponse(buildLogoPayload(targetType));
      }
      if (url.endsWith("/api/admin/trr-api/brands/logos/sync")) {
        return jsonResponse({
          targets_scanned: 8,
          imports_created: 2,
          imports_updated: 1,
          unresolved: 3,
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<AdminBrandsPage />);

    await waitFor(() => {
      expect(screen.getByText("Facebook")).toBeInTheDocument();
      expect(screen.getByText("Reddit")).toBeInTheDocument();
    });

    expect(screen.queryByText("Deadline")).not.toBeInTheDocument();
    expect(screen.getAllByText("Social Media").length).toBeGreaterThan(0);
  });
});
