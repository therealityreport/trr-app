import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AdminNetworkStreamingDetailPage from "@/app/admin/networks/[entityType]/[entitySlug]/page";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  replace: vi.fn(),
  router: { replace: vi.fn() },
  params: { entityType: "network", entitySlug: "bravo" },
  guardState: {
    user: { email: "admin@example.com" },
    checking: false,
    hasAccess: true,
  },
}));

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/brands/networks-and-streaming/network/bravo",
  useParams: () => mocks.params,
  useRouter: () => mocks.router,
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("Admin network detail page", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.replace.mockReset();
    mocks.router.replace = mocks.replace;
    mocks.params = { entityType: "network", entitySlug: "bravo" };
  });

  it("renders mirrored logo gallery assets", async () => {
    mocks.fetchAdminWithAuth.mockResolvedValue(
      jsonResponse({
        entity_type: "network",
        entity_key: "bravo",
        entity_slug: "bravo",
        display_name: "Bravo",
        available_show_count: 62,
        added_show_count: 9,
        core: {
          entity_id: "74",
          origin_country: "US",
          display_priority: null,
          tmdb_logo_path: null,
          logo_path: null,
          hosted_logo_key: "images/logos/networks/74/base.png",
          hosted_logo_url: "https://cdn.example.com/bravo.png",
          hosted_logo_black_url: "https://cdn.example.com/bravo-black.png",
          hosted_logo_white_url: "https://cdn.example.com/bravo-white.png",
          wikidata_id: "Q902771",
          wikipedia_url: "https://en.wikipedia.org/wiki/Bravo_(American_TV_network)",
          wikimedia_logo_file: "Bravo_Logo.svg",
          link_enriched_at: "2026-02-24T00:00:00Z",
          link_enrichment_source: "wikidata",
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
          resolution_status: "resolved",
          resolution_reason: null,
          last_attempt_at: "2026-02-24T00:00:00Z",
        },
        logo_assets: [
          {
            id: "asset-1",
            source: "official",
            source_url: "https://brandfetch.com/bravotv.com",
            source_rank: 1,
            hosted_logo_url: "https://cdn.example.com/bravo-official.png",
            hosted_logo_content_type: "image/png",
            base_logo_format: "png",
            pixel_width: 900,
            pixel_height: 300,
            mirror_status: "mirrored",
            failure_reason: null,
            is_primary: true,
            updated_at: "2026-02-24T00:00:00Z",
          },
          {
            id: "asset-2",
            source: "catalog",
            source_url: "https://logos.fandom.com/wiki/Bravo",
            source_rank: 2,
            hosted_logo_url: "https://cdn.example.com/bravo-fandom.png",
            hosted_logo_content_type: "image/png",
            base_logo_format: "png",
            pixel_width: 800,
            pixel_height: 260,
            mirror_status: "mirrored",
            failure_reason: null,
            is_primary: false,
            updated_at: "2026-02-24T00:00:00Z",
          },
        ],
        shows: [],
      }),
    );

    render(<AdminNetworkStreamingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Mirrored Logo Gallery")).toBeInTheDocument();
    });

    const whiteVariantLabel = screen.getByText("White Variant");
    const whiteVariantCard = whiteVariantLabel.parentElement;
    expect(whiteVariantCard).toHaveClass("bg-black");
    expect(whiteVariantCard).toHaveClass("border-zinc-800");
    expect(whiteVariantLabel).toHaveClass("text-zinc-100");

    expect(screen.getByText("Total Assets: 2")).toBeInTheDocument();
    expect(screen.getByText("primary")).toBeInTheDocument();
    expect(screen.getAllByText("Source URL").length).toBeGreaterThan(0);
  });

  it("renders suggestion-based not found state for invalid slug", async () => {
    mocks.params = { entityType: "network", entitySlug: "abc" };
    mocks.fetchAdminWithAuth.mockResolvedValue(
      jsonResponse(
        {
          error: "not_found",
          suggestions: [
            {
              entity_type: "network",
              name: "Bravo",
              entity_slug: "bravo",
              available_show_count: 62,
              added_show_count: 9,
            },
          ],
        },
        404,
      ),
    );

    render(<AdminNetworkStreamingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Entity Not Found")).toBeInTheDocument();
    });

    await waitFor(() => {
      const suggestionLink = screen.getByRole("link", { name: "Bravo" });
      expect(suggestionLink).toHaveAttribute("href", "/brands/networks-and-streaming/network/bravo");
    });
  });

  it("shows production logo-optional indicator", async () => {
    mocks.params = { entityType: "production", entitySlug: "shed-media" };
    mocks.fetchAdminWithAuth.mockResolvedValue(
      jsonResponse({
        entity_type: "production",
        entity_key: "shed media",
        entity_slug: "shed-media",
        display_name: "Shed Media",
        available_show_count: 12,
        added_show_count: 3,
        core: {
          entity_id: "13120",
          origin_country: null,
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
          resolution_status: "resolved",
          resolution_reason: null,
          last_attempt_at: "2026-02-24T00:00:00Z",
        },
        logo_assets: [],
        shows: [],
      }),
    );

    render(<AdminNetworkStreamingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Logo optional")).toBeInTheDocument();
    });
  });
});
