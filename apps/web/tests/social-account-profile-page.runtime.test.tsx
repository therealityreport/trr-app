import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  useAdminGuard: vi.fn(),
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

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) => (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: (...args: unknown[]) => (mocks.useAdminGuard as (...inner: unknown[]) => unknown)(...args),
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

vi.mock("@/lib/admin/show-admin-routes", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/show-admin-routes")>(
    "@/lib/admin/show-admin-routes",
  );
  return {
    ...actual,
    buildSocialAccountProfileUrl: ({
      platform,
      handle,
      tab,
    }: {
      platform: string;
      handle: string;
      tab?: string;
    }) => `/admin/social/${platform}/${handle}${tab && tab !== "stats" ? `/${tab}` : ""}`,
  };
});

import SocialAccountProfilePage from "@/components/admin/SocialAccountProfilePage";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const baseSummary = {
  platform: "instagram",
  account_handle: "bravotv",
  profile_url: "https://www.instagram.com/bravotv/",
  total_posts: 12,
  total_engagement: 1200,
  total_views: 5000,
  last_post_at: "2026-03-17T14:00:00.000Z",
  catalog_total_posts: 10,
  catalog_assigned_posts: 6,
  catalog_unassigned_posts: 2,
  catalog_pending_review_posts: 2,
  last_catalog_run_at: "2026-03-17T12:00:00.000Z",
  last_catalog_run_status: "completed",
  catalog_recent_runs: [],
  per_show_counts: [
    {
      show_id: "show-rhoslc",
      show_name: "The Real Housewives of Salt Lake City",
      show_slug: "rhoslc",
      post_count: 4,
      engagement: 300,
    },
  ],
  per_season_counts: [
    {
      season_id: "season-rhoslc-6",
      season_number: 6,
      show_id: "show-rhoslc",
      show_name: "The Real Housewives of Salt Lake City",
      show_slug: "rhoslc",
      post_count: 4,
      engagement: 300,
    },
  ],
  top_hashtags: [],
  top_collaborators: [],
  top_tags: [],
  source_status: [],
};

describe("SocialAccountProfilePage", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.useAdminGuard.mockReset();
    mocks.useAdminGuard.mockReturnValue({
      user: { uid: "admin-1" },
      checking: false,
      hasAccess: true,
    });
  });

  it("renders supported-platform catalog actions on the stats tab", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill History" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeInTheDocument();
    expect(screen.getByText("Catalog Posts")).toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.queryByText("Catalog Actions Unavailable In V1")).not.toBeInTheDocument();
  });

  it("hides catalog actions for unsupported platforms", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          platform: "facebook",
          account_handle: "bravotv",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="facebook" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByText("Catalog Actions Unavailable In V1")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Backfill History" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sync Recent" })).not.toBeInTheDocument();
  });

  it("renders the catalog tab empty state", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/catalog/posts")) {
        return jsonResponse({
          items: [],
          pagination: { page: 1, page_size: 25, total: 0, total_pages: 1 },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByText("No catalog posts found for this filter.")).toBeInTheDocument();
    });
    expect(screen.getByText("Recent Catalog Runs")).toBeInTheDocument();
  });

  it("lets operators resolve unknown hashtags with an explicit season picker", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          per_show_counts: [],
          per_season_counts: [],
        });
      }
      if (url.endsWith("/hashtags")) {
        return jsonResponse({ items: [] });
      }
      if (url.endsWith("/catalog/review-queue")) {
        return jsonResponse({
          items: [
            {
              id: "review-1",
              platform: "instagram",
              account_handle: "bravotv",
              hashtag: "rhop",
              display_hashtag: "#RHOP",
              review_status: "pending",
              usage_count: 3,
              sample_post_ids: ["post-1"],
              sample_source_ids: ["source-1"],
              suggested_shows: [
                {
                  show_id: "show-rhop",
                  show_name: "The Real Housewives of Potomac",
                  show_slug: "rhop",
                },
              ],
              first_seen_at: "2026-03-10T12:00:00.000Z",
              last_seen_at: "2026-03-17T12:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/api/admin/trr-api/shows/show-rhop/seasons")) {
        return jsonResponse({
          seasons: [
            { id: "season-rhop-9", season_number: 9 },
            { id: "season-rhop-8", season_number: 8 },
          ],
        });
      }
      if (url.includes("/catalog/review-queue/review-1/resolve")) {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toEqual({
          resolution_action: "assign_season",
          show_id: "show-rhop",
          season_id: "season-rhop-9",
        });
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="hashtags" />);

    await waitFor(() => {
      expect(screen.getByText("Unknown Hashtags")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Resolution for #RHOP"), {
      target: { value: "assign_season" },
    });

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/api/admin/trr-api/shows/show-rhop/seasons"),
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Season for #RHOP")).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText("Season for #RHOP"), {
      target: { value: "season-rhop-9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/catalog/review-queue/review-1/resolve"),
        ),
      ).toBe(true);
    });
  });
});
