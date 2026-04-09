import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ShowsSettingsPage from "@/app/shows/settings/page";

const navigationState = vi.hoisted(() => ({
  pathname: "/shows/settings",
  search: "",
  replace: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  guardState: {
    user: { uid: "admin-1", email: "admin@example.com" },
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

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("show settings tabs auth behavior", () => {
  beforeEach(() => {
    navigationState.search = "";
    navigationState.replace.mockReset();
    mocks.fetchAdminWithAuth.mockReset();
    mocks.fetchAdminWithAuth.mockImplementation((input: RequestInfo | URL, _init?: RequestInit, options?: { allowDevAdminBypass?: boolean }) => {
      if (!options?.allowDevAdminBypass) {
        return Promise.reject(new Error("Not authenticated"));
      }

      const url = String(input);
      if (url.includes("/api/admin/trr-api/brands/franchise-rules")) {
        return Promise.resolve(
          jsonResponse({
            rules: [
              {
                key: "real-housewives",
                name: "Real Housewives",
                primary_url: "https://real-housewives.fandom.com/",
                review_allpages_url: "https://real-housewives.fandom.com/wiki/Special:AllPages",
                match_terms: ["real housewives"],
                aliases: [],
                community_domains: ["real-housewives.fandom.com"],
                candidate_urls: [],
                include_allpages_scan: true,
                source_rank: 1,
                network_terms: ["bravo"],
                is_active: true,
                rule_version: 1,
                matched_show_count: 16,
                applied_fallback_count: 15,
              },
            ],
            suggested_franchises: [],
          }),
        );
      }

      if (url.includes("/api/admin/trr-api/brands/families?active_only=true")) {
        return Promise.resolve(
          jsonResponse({
            rows: [
              {
                id: "fam-1",
                family_key: "bravo-brand-family",
                display_name: "Bravo Brand Family",
              },
            ],
          }),
        );
      }

      if (url.includes("/api/admin/trr-api/brands/families/fam-1/links")) {
        return Promise.resolve(
          jsonResponse({
            rows: [
              {
                id: "rule-manual-homepage",
                family_id: "fam-1",
                link_group: "official",
                link_kind: "homepage",
                label: "Bravo",
                url: "https://www.bravotv.com/",
                coverage_type: "family_all_shows",
                coverage_value: null,
                source: "manual",
                auto_apply: true,
                is_active: true,
                priority: 1,
                metadata: {},
              },
              {
                id: "rule-manual-instagram",
                family_id: "fam-1",
                link_group: "social",
                link_kind: "instagram",
                label: "Instagram",
                url: "https://www.instagram.com/BravoTV",
                coverage_type: "family_all_shows",
                coverage_value: null,
                source: "manual",
                auto_apply: true,
                is_active: true,
                priority: 2,
                metadata: {},
              },
              {
                id: "rule-imported",
                family_id: "fam-1",
                link_group: "knowledge",
                link_kind: "wikipedia",
                label: "Wikipedia",
                url: "https://en.wikipedia.org/wiki/Warner_Communications",
                coverage_type: "show_wikidata_exact",
                coverage_value: "Q191715",
                source: "wikipedia_import",
                auto_apply: true,
                is_active: true,
                priority: 50,
                metadata: {},
              },
            ],
          }),
        );
      }

      if (url.includes("/api/admin/trr-api/brands/families/fam-1/wikipedia-show-urls")) {
        return Promise.resolve(
          jsonResponse({
            rows: [
              {
                id: "wiki-1",
                entity_key: "bravo",
                show_title: "Warner Communications",
                show_url: "https://en.wikipedia.org/wiki/Warner_Communications",
                matched_show_id: null,
                wikidata_id: "Q191715",
                import_source: "sync_networks_streaming",
              },
            ],
          }),
        );
      }

      return Promise.resolve(jsonResponse({ rows: [] }));
    });
  });

  it("defaults to the franchises tab and updates the query string when switching tabs", async () => {
    render(<ShowsSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Franchise Groups" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Networks" }));

    expect(navigationState.replace).toHaveBeenCalledWith("/shows/settings?tab=networks");
  });

  it("shows only shared network rules by default on the networks tab", async () => {
    navigationState.search = "tab=networks";

    render(<ShowsSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Network Shared Links" })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("https://www.bravotv.com/")).toBeInTheDocument();
      expect(screen.getByText("https://www.instagram.com/BravoTV")).toBeInTheDocument();
    });

    expect(screen.queryByText("https://en.wikipedia.org/wiki/Warner_Communications")).not.toBeInTheDocument();
  });

  it("loads imported wikipedia diagnostics only when the panel is opened", async () => {
    navigationState.search = "tab=networks";

    render(<ShowsSettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Network Shared Links" })).toBeInTheDocument();
    });

    expect(
      mocks.fetchAdminWithAuth.mock.calls.some((call: unknown[]) =>
        String(call[0]).includes("/wikipedia-show-urls"),
      ),
    ).toBe(false);

    fireEvent.click(
      screen.getByRole("button", { name: "Imported Wikipedia Diagnostics" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Warner Communications")).toBeInTheDocument();
    });
  });
});
