import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BrandProfilePage from "@/app/brands/[brandSlug]/page";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  params: { brandSlug: "instagram" },
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
        slug: "instagram",
        display_name: "Instagram",
        primary_target_id: "social:instagram.com",
        categories: ["network", "social"],
        counts: {
          targets: 2,
          shows: 2,
          assets: 2,
        },
        targets: [
          {
            id: "social:instagram.com",
            target_type: "social",
            target_key: "instagram.com",
            target_label: "Instagram",
            friendly_slug: "instagram",
            section_href: "/brands?category=social",
            detail_href: null,
            entity_slug: null,
            entity_id: null,
            available_show_count: 2,
            added_show_count: null,
            homepage_url: "https://instagram.com",
            wikipedia_url: null,
            wikidata_id: null,
            instagram_id: "instagram",
            twitter_id: null,
            tiktok_id: null,
            facebook_id: null,
            discovered_from: "https://instagram.com",
            discovered_from_urls: ["https://instagram.com/queensofbravo"],
            source_link_kinds: ["social_profile"],
            family: null,
            family_suggestions: [],
            shared_links: [],
            wikipedia_show_urls: [],
          },
          {
            id: "network:bravo",
            target_type: "network",
            target_key: "bravo",
            target_label: "Bravo",
            friendly_slug: "bravotv",
            section_href: "/brands?category=network",
            detail_href: "/brands/networks-and-streaming/network/bravo",
            entity_slug: "bravo",
            entity_id: "74",
            available_show_count: 62,
            added_show_count: 9,
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
            family: null,
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
            categories: ["social"],
            source_target_ids: ["social:instagram.com"],
            source_labels: ["Instagram"],
          },
          {
            id: "show-2",
            name: "The Real Housewives of Beverly Hills",
            canonical_slug: "the-real-housewives-of-beverly-hills",
            poster_url: null,
            categories: ["network"],
            source_target_ids: ["network:bravo"],
            source_labels: ["Bravo"],
          },
        ],
        assets: [
          {
            id: "asset-1",
            target_id: "social:instagram.com",
            target_type: "social",
            target_key: "instagram.com",
            target_label: "Instagram",
            role: "wordmark",
            variant: "color",
            display_url: "https://cdn.example.com/instagram-wordmark.svg",
            source_url: "https://instagram.com",
            source_provider: "official",
            discovered_from: "https://instagram.com",
            is_primary: true,
            is_selected_for_role: true,
            option_kind: "stored",
            updated_at: "2026-03-16T12:00:00Z",
          },
          {
            id: "asset-2",
            target_id: "network:bravo",
            target_type: "network",
            target_key: "bravo",
            target_label: "Bravo",
            role: "wordmark",
            variant: "color",
            display_url: "https://cdn.example.com/bravo-wordmark.svg",
            source_url: "https://bravotv.com",
            source_provider: "stored_existing",
            discovered_from: "https://bravotv.com",
            is_primary: true,
            is_selected_for_role: true,
            option_kind: "stored",
            updated_at: "2026-03-16T12:00:00Z",
          },
        ],
      }),
    );
  });

  it("renders hero counts, grouped shows, target links, and opens the logo modal", async () => {
    render(<BrandProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Instagram" })).toBeInTheDocument();
    });

    expect(screen.getByText("2 linked shows")).toBeInTheDocument();
    expect(screen.getAllByText("Network").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Social Media").length).toBeGreaterThan(0);
    expect(screen.getByText("The Valley")).toBeInTheDocument();
    expect(screen.getByText("The Real Housewives of Beverly Hills")).toBeInTheDocument();

    const sourceLink = screen.getAllByRole("link", { name: "Open Source" })[1];
    expect(sourceLink).toHaveAttribute("href", "/brands/networks-and-streaming/network/bravo");

    const bravoWorkflowLink = screen.getAllByRole("link", { name: "Open Workflow" })[1];
    expect(bravoWorkflowLink).toHaveAttribute("href", "/brands/networks-and-streaming/network/bravo");

    fireEvent.click(screen.getAllByRole("button", { name: "Manage Logos" })[0]);

    expect(await screen.findByTestId("brand-logo-modal")).toHaveTextContent("Instagram");
    expect(mocks.fetchAdminWithAuth).toHaveBeenCalledWith(
      "/api/admin/brands/profile?slug=instagram",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
      expect.objectContaining({
        allowDevAdminBypass: true,
        preferredUser: mocks.guardState.user,
      }),
    );
  });
});
