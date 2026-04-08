import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import BrandProfilePage from "@/app/brands/[brandSlug]/page";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  params: { brandSlug: "bravo" },
  guardState: {
    user: { uid: "admin-1", email: "admin@example.com" },
    checking: false,
    hasAccess: true,
  },
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

vi.mock("next/navigation", () => ({
  useParams: () => mocks.params,
}));

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminGlobalHeader", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminBreadcrumbs", () => ({
  __esModule: true,
  default: () => <nav aria-label="Breadcrumb" />,
}));

vi.mock("@/components/admin/BrandsTabs", () => ({
  __esModule: true,
  default: () => <div data-testid="brands-tabs" />,
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

describe("brand profile page", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.fetchAdminWithAuth.mockResolvedValue(
      jsonResponse({
        slug: "bravo",
        display_name: "Bravo",
        primary_target_id: "network:bravo",
        categories: ["network"],
        counts: {
          targets: 1,
          shows: 2,
          assets: 8,
        },
        streaming_services: ["Apple TV", "Peacock", "Prime Video"],
        targets: [
          {
            id: "network:bravo",
            target_type: "network",
            target_key: "bravo",
            target_label: "Bravo",
            friendly_slug: "bravo",
            section_href: "/brands?category=network",
            detail_href: "/brands/bravo",
            entity_slug: "bravo",
            entity_id: "74",
            available_show_count: 62,
            added_show_count: 2,
            homepage_url: "https://bravotv.com",
            wikipedia_url: "https://en.wikipedia.org/wiki/Bravo_(American_TV_network)",
            wikidata_id: "Q902771",
            instagram_id: null,
            twitter_id: null,
            tiktok_id: null,
            facebook_id: null,
            discovered_from: "https://bravotv.com",
            discovered_from_urls: ["https://bravotv.com"],
            source_link_kinds: ["homepage"],
            family: {
              id: "family-1",
              family_key: "nbcu-cable",
              display_name: "NBCUniversal Cable",
              owner_wikidata_id: "Q123",
              owner_label: "NBCUniversal",
            },
            family_suggestions: [],
            shared_links: [],
            wikipedia_show_urls: [],
          },
        ],
        shows: [
          {
            id: "show-1",
            name: "The Valley",
            canonical_slug: "the-valley",
            poster_url: null,
            categories: ["network"],
            source_target_ids: ["network:bravo"],
            source_labels: ["Bravo"],
          },
          {
            id: "show-2",
            name: "Watch What Happens Live",
            canonical_slug: "watch-what-happens-live",
            poster_url: null,
            categories: ["network"],
            source_target_ids: ["network:bravo"],
            source_labels: ["Bravo"],
          },
        ],
        assets: Array.from({ length: 8 }, (_, index) => ({
          id: `asset-${index + 1}`,
          target_id: "network:bravo",
          target_type: "network",
          target_key: "bravo",
          target_label: "Bravo",
          role: "wordmark",
          variant: "color",
          display_url: `https://cdn.example.com/bravo-${index + 1}.svg`,
          source_url: `https://source.example.com/bravo-${index + 1}.svg`,
          source_provider: "wikimedia_commons",
          discovered_from: `https://commons.example.com/bravo-${index + 1}`,
          is_primary: index === 0,
          is_selected_for_role: index === 0,
          option_kind: "stored",
          updated_at: "2026-03-16T12:00:00Z",
        })),
        social_profiles: [
          {
            platform: "instagram",
            account_handle: "BravoTV",
            profile_url: "https://instagram.com/BravoTV",
            avatar_url: "https://cdn.example.com/bravotv.jpg",
            total_posts: 1200,
            total_engagement: 55000,
            total_views: 600000,
            assigned_shows: [
              {
                id: "show-1",
                name: "The Valley",
                canonical_slug: "the-valley",
              },
              {
                id: "show-2",
                name: "Watch What Happens Live",
                canonical_slug: "watch-what-happens-live",
              },
            ],
          },
        ],
      }),
    );
  });

  it("renders the canonical overview, social profiles, and switches to the full logos tab", async () => {
    render(<BrandProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Bravo" })).toBeInTheDocument();
    });

    expect(screen.getByText("Shared accounts auto-assigned to this brand")).toBeInTheDocument();
    expect(screen.getByText("@BravoTV")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Profile" })).toHaveAttribute(
      "href",
      "/social/instagram/BravoTV",
    );

    const savedLogosSection = screen.getByRole("heading", { name: "Overview" }).closest("section");
    expect(savedLogosSection).toBeTruthy();
    expect(within(savedLogosSection ?? document.body).getAllByText("Manage Logos")).toHaveLength(6);

    const savedInfoSection = screen.getByRole("heading", { name: "Cleaned brand metadata" }).closest("section");
    expect(savedInfoSection).toBeTruthy();
    expect(within(savedInfoSection ?? document.body).getAllByRole("link")).toHaveLength(8);
    expect(screen.getByRole("heading", { name: "STREAMING SERVICES" })).toBeInTheDocument();
    expect(screen.getByText("Apple TV")).toBeInTheDocument();
    expect(screen.getByText("Peacock")).toBeInTheDocument();
    expect(screen.getByText("Prime Video")).toBeInTheDocument();
    expect(screen.getAllByText("Added Shows").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brand Family").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "View More Logos" }));
    expect(await screen.findByRole("heading", { name: "Full library" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All discovered and saved source links" })).toBeInTheDocument();
    expect(screen.getAllByText("Manage Logos")).toHaveLength(9);

    fireEvent.click(screen.getAllByText("Manage Logos")[0]);
    expect(await screen.findByTestId("brand-logo-modal")).toHaveTextContent("Bravo");

    expect(mocks.fetchAdminWithAuth).toHaveBeenCalledWith(
      "/api/admin/brands/profile?slug=bravo",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
      expect.objectContaining({
        allowDevAdminBypass: true,
        preferredUser: mocks.guardState.user,
      }),
    );
  });
});
