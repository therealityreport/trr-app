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
    prefetch: _prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
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
    }) => `/social/${platform}/${handle}${tab && tab !== "stats" ? `/${tab}` : ""}`,
  };
});

import SocialAccountProfilePage from "@/components/admin/SocialAccountProfilePage";

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("social account profile auth bypass", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.useAdminGuard.mockReset();
    mocks.useAdminGuard.mockReturnValue({
      user: { uid: "admin-1", email: "admin@example.com" },
      checking: false,
      hasAccess: true,
    });
    mocks.fetchAdminWithAuth.mockImplementation(
      async (input: RequestInfo | URL, _init?: RequestInit, options?: { allowDevAdminBypass?: boolean }) => {
        if (!options?.allowDevAdminBypass) {
          throw new Error("Not authenticated");
        }

        const url = String(input);
        if (url.includes("/summary")) {
          return jsonResponse({
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
          });
        }
        if (url.endsWith("/hashtags")) {
          return jsonResponse({ items: [] });
        }
        if (url.includes("/hashtags/timeline")) {
          return jsonResponse({
            platform: "instagram",
            account_handle: "bravotv",
            years: [],
            series: [],
            top_rank_limit: 10,
            off_chart_rank: 11,
          });
        }
        throw new Error(`Unhandled request: ${url}`);
      },
    );
  });

  it("keeps stats-tab fetches on the local dev-admin bypass path", async () => {
    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="stats" />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Open public profile" })).toHaveAttribute(
        "href",
        "https://www.instagram.com/bravotv/",
      );
    });

    expect(mocks.fetchAdminWithAuth.mock.calls.length).toBeGreaterThan(0);
    for (const call of mocks.fetchAdminWithAuth.mock.calls) {
      expect(call[2]).toMatchObject({
        allowDevAdminBypass: true,
        preferredUser: mocks.useAdminGuard.mock.results[0]?.value.user,
      });
    }
  });
});
