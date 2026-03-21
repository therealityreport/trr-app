import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

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
  per_show_counts: [],
  per_season_counts: [],
  top_hashtags: [],
  top_collaborators: [],
  top_tags: [],
  source_status: [],
};

describe("SocialAccountProfile hashtag timeline", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.useAdminGuard.mockReset();
    mocks.useAdminGuard.mockReturnValue({
      user: { uid: "admin-1" },
      checking: false,
      hasAccess: true,
    });
  });

  it("renders the bump chart above the hashtag assignment list for instagram", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/hashtags/timeline")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          years: [
            { year: 2022, label: "2022", order: 1 },
            { year: 2023, label: "2023", order: 2 },
            { year: 2024, label: "2024", order: 3 },
          ],
          series: [
            {
              hashtag: "bravo",
              display_hashtag: "#bravo",
              first_top_order: 1,
              last_top_order: 3,
              points: [
                { year: 2022, label: "2022", order: 1, rank: 1, usage_count: 8, in_top_ten: true, segment_id: 1 },
                { year: 2023, label: "2023", order: 2, rank: 11, usage_count: 0, in_top_ten: false, segment_id: null },
                { year: 2024, label: "2024", order: 3, rank: 2, usage_count: 6, in_top_ten: true, segment_id: 2 },
              ],
            },
            {
              hashtag: "housewives",
              display_hashtag: "#housewives",
              first_top_order: 1,
              last_top_order: 3,
              points: [
                { year: 2022, label: "2022", order: 1, rank: 2, usage_count: 7, in_top_ten: true, segment_id: 1 },
                { year: 2023, label: "2023", order: 2, rank: 1, usage_count: 9, in_top_ten: true, segment_id: 1 },
                { year: 2024, label: "2024", order: 3, rank: 1, usage_count: 10, in_top_ten: true, segment_id: 1 },
              ],
            },
          ],
          top_rank_limit: 10,
          off_chart_rank: 11,
        });
      }
      if (url.includes("/hashtags")) {
        return jsonResponse({
          items: [
            {
              hashtag: "bravo",
              display_hashtag: "#bravo",
              usage_count: 20,
              latest_seen_at: "2026-03-17T12:00:00.000Z",
              assignments: [],
              assigned_shows: [],
              assigned_seasons: [],
              observed_shows: [],
              observed_seasons: [],
            },
          ],
        });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="hashtags" />);

    await waitFor(() => {
      expect(screen.getByText("Yearly Top 10 Hashtags")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Hashtags" })).toBeInTheDocument();
    expect(screen.getByText("Unknown Hashtags")).toBeInTheDocument();
  });

  it("shows the quiet empty state when the timeline has fewer than two years", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse(baseSummary);
      }
      if (url.includes("/hashtags/timeline")) {
        return jsonResponse({
          platform: "instagram",
          account_handle: "bravotv",
          years: [{ year: 2024, label: "2024", order: 1 }],
          series: [],
          top_rank_limit: 10,
          off_chart_rank: 11,
        });
      }
      if (url.includes("/hashtags")) {
        return jsonResponse({ items: [] });
      }
      if (url.includes("/catalog/review-queue")) {
        return jsonResponse({ items: [] });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="hashtags" />);

    await waitFor(() => {
      expect(screen.getByText("Not enough multi-year top-10 hashtag history to chart yet.")).toBeInTheDocument();
    });
  });
});
