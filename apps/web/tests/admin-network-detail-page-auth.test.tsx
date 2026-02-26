import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import AdminNetworkStreamingDetailPage from "@/app/admin/networks/[entityType]/[entitySlug]/page";

const mocks = vi.hoisted(() => {
  const replace = vi.fn();
  const router = { replace };
  return {
    fetchAdminWithAuth: vi.fn(),
    params: {
      entityType: "network",
      entitySlug: "bravo",
    },
    replace,
    router,
    guardState: {
      user: { email: "admin@example.com" },
      checking: false,
      hasAccess: true,
    },
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/brands/networks-and-streaming/network/bravo",
  useParams: () => mocks.params,
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("admin network detail page", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.replace.mockReset();
    mocks.params.entityType = "network";
    mocks.params.entitySlug = "bravo";
  });

  it("renders breadcrumbs, logos, metadata, and added shows via shared auth helper", async () => {
    mocks.fetchAdminWithAuth.mockResolvedValue(
      jsonResponse({
        entity_type: "network",
        entity_key: "bravo",
        entity_slug: "bravo",
        display_name: "Bravo",
        available_show_count: 8,
        added_show_count: 2,
        core: {
          entity_id: "77",
          origin_country: "US",
          display_priority: null,
          tmdb_logo_path: "/logo.png",
          logo_path: "logos/bravo.png",
          hosted_logo_key: "logos/bravo.png",
          hosted_logo_url: "https://cdn.example.com/bravo.png",
          hosted_logo_black_url: "https://cdn.example.com/bravo-black.png",
          hosted_logo_white_url: "https://cdn.example.com/bravo-white.png",
          wikidata_id: "Q123",
          wikipedia_url: "https://en.wikipedia.org/wiki/Bravo_(American_TV_network)",
          wikimedia_logo_file: "Bravo_logo.svg",
          link_enriched_at: "2026-02-24T00:00:00.000Z",
          link_enrichment_source: "wikimedia",
          facebook_id: "bravotv",
          instagram_id: "bravotv",
          twitter_id: "bravotv",
          tiktok_id: "bravotv",
        },
        override: {
          id: "ov-1",
          display_name_override: "Bravo TV",
          wikidata_id_override: "Q123",
          wikipedia_url_override: "https://en.wikipedia.org/wiki/Bravo_(American_TV_network)",
          logo_source_urls_override: ["https://logo.example.com/bravo.svg"],
          source_priority_override: ["override", "wikimedia"],
          aliases_override: ["BravoTV"],
          notes: "Pinned URL",
          is_active: true,
          updated_by: "admin@example.com",
          updated_at: "2026-02-24T00:00:00.000Z",
        },
        completion: {
          resolution_status: "resolved",
          resolution_reason: null,
          last_attempt_at: "2026-02-24T00:00:00.000Z",
        },
        shows: [
          {
            trr_show_id: "show-1",
            show_name: "The Real Housewives of Salt Lake City",
            canonical_slug: "the-real-housewives-of-salt-lake-city",
            poster_url: "https://cdn.example.com/poster.jpg",
          },
        ],
      }),
    );

    render(<AdminNetworkStreamingDetailPage />);

    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth).toHaveBeenCalled();
      expect(screen.getByRole("heading", { name: "Bravo" })).toBeInTheDocument();
    });

    const detailCall = mocks.fetchAdminWithAuth.mock.calls[0];
    expect(String(detailCall[0])).toContain("/api/admin/networks-streaming/detail?");
    expect(String(detailCall[0])).toContain("entity_type=network");
    expect(String(detailCall[0])).toContain("entity_slug=bravo");

    const breadcrumbNav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumbNav).getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(within(breadcrumbNav).getByRole("link", { name: "Brands" })).toHaveAttribute("href", "/brands");
    expect(screen.getByText("Saved Logos")).toBeInTheDocument();
    expect(screen.getByText("Saved Info / URLs")).toBeInTheDocument();
    expect(screen.getByText("Added Shows")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "The Real Housewives of Salt Lake City" })).toHaveAttribute(
      "href",
      "/shows/the-real-housewives-of-salt-lake-city",
    );
    expect(screen.getByRole("link", { name: "https://logo.example.com/bravo.svg" })).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("handles missing logos and metadata values gracefully", async () => {
    mocks.fetchAdminWithAuth.mockResolvedValue(
      jsonResponse({
        entity_type: "streaming",
        entity_key: "peacock-premium",
        entity_slug: "peacock-premium",
        display_name: "Peacock Premium",
        available_show_count: 5,
        added_show_count: 0,
        core: {
          entity_id: "1",
          origin_country: null,
          display_priority: 1,
          tmdb_logo_path: null,
          logo_path: null,
          hosted_logo_key: null,
          hosted_logo_url: null,
          hosted_logo_black_url: null,
          hosted_logo_white_url: null,
          wikidata_id: null,
          wikipedia_url: null,
          wikimedia_logo_file: null,
          link_enriched_at: null,
          link_enrichment_source: null,
          facebook_id: null,
          instagram_id: null,
          twitter_id: null,
          tiktok_id: null,
        },
        override: {
          id: null,
          display_name_override: null,
          wikidata_id_override: null,
          wikipedia_url_override: null,
          logo_source_urls_override: [],
          source_priority_override: [],
          aliases_override: [],
          notes: null,
          is_active: false,
          updated_by: null,
          updated_at: null,
        },
        completion: {
          resolution_status: "manual_required",
          resolution_reason: "missing_logo",
          last_attempt_at: null,
        },
        shows: [],
      }),
    );
    mocks.params.entityType = "streaming";
    mocks.params.entitySlug = "peacock-premium";

    render(<AdminNetworkStreamingDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Peacock Premium" })).toBeInTheDocument();
    });
    expect(screen.getAllByText("Missing").length).toBeGreaterThan(0);
    expect(screen.getByText("No added shows linked to this entity.")).toBeInTheDocument();
  });

  it("redirects to canonical slug when payload slug differs", async () => {
    mocks.fetchAdminWithAuth.mockResolvedValue(
      jsonResponse({
        entity_type: "network",
        entity_key: "bravo",
        entity_slug: "bravo-tv",
        display_name: "Bravo TV",
        available_show_count: 1,
        added_show_count: 1,
        core: {
          entity_id: "1",
          origin_country: "US",
          display_priority: null,
          tmdb_logo_path: null,
          logo_path: null,
          hosted_logo_key: null,
          hosted_logo_url: null,
          hosted_logo_black_url: null,
          hosted_logo_white_url: null,
          wikidata_id: null,
          wikipedia_url: null,
          wikimedia_logo_file: null,
          link_enriched_at: null,
          link_enrichment_source: null,
          facebook_id: null,
          instagram_id: null,
          twitter_id: null,
          tiktok_id: null,
        },
        override: {
          id: null,
          display_name_override: null,
          wikidata_id_override: null,
          wikipedia_url_override: null,
          logo_source_urls_override: [],
          source_priority_override: [],
          aliases_override: [],
          notes: null,
          is_active: false,
          updated_by: null,
          updated_at: null,
        },
        completion: {
          resolution_status: null,
          resolution_reason: null,
          last_attempt_at: null,
        },
        shows: [],
      }),
    );

    render(<AdminNetworkStreamingDetailPage />);

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/brands/networks-and-streaming/network/bravo-tv");
    });
  });

  it("shows terminal auth error when helper rejects after retries are exhausted", async () => {
    mocks.fetchAdminWithAuth.mockRejectedValue(new Error("Not authenticated"));

    render(<AdminNetworkStreamingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Not authenticated")).toBeInTheDocument();
    });
  });
});
