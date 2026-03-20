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

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill History" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeInTheDocument();
    expect(screen.getByText("Catalog Posts")).toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.queryByText("Catalog Actions Unavailable In V1")).not.toBeInTheDocument();
  });

  it("shows cancel controls and discovery progress for an active catalog run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-active-1",
              status: "running",
              created_at: "2026-03-18T11:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-active-1/progress")) {
        return jsonResponse({
          run_id: "run-active-1",
          run_status: "running",
          source_scope: "bravo",
          created_at: "2026-03-18T11:00:00.000Z",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 0,
              jobs_active: 1,
              jobs_running: 1,
              jobs_waiting: 0,
              scraped_count: 420,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          worker_runtime: {
            runner_strategy: "full_history_cursor_breakpoints",
            runner_count: 4,
            scheduler_lanes: ["A", "B", "C", "D"],
          },
          discovery: {
            status: "queued",
            partition_strategy: "cursor_breakpoints",
            partition_count: 4,
            discovered_count: 4,
            queued_count: 4,
            running_count: 0,
            completed_count: 0,
            failed_count: 0,
            cancelled_count: 0,
          },
          post_progress: {
            completed_posts: 420,
            matched_posts: 420,
            total_posts: 4500,
          },
          summary: {
            total_jobs: 5,
            completed_jobs: 0,
            failed_jobs: 0,
            active_jobs: 5,
            items_found_total: 420,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel Run" })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText((content) => content.includes("420") && content.includes("posts checked")),
      ).toBeInTheDocument();
      expect(
        screen.getByText((content) => content.includes("420") && content.includes("matched")),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("420 scraped")).not.toBeInTheDocument();
  });

  it("blocks duplicate backfill actions while the same profile already has an active run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-active-2",
              status: "retrying",
              created_at: "2026-03-18T11:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-active-2/progress")) {
        return jsonResponse({
          run_id: "run-active-2",
          run_status: "retrying",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 3,
            completed_jobs: 1,
            failed_jobs: 0,
            active_jobs: 2,
            items_found_total: 24,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill History" })).toBeDisabled();
    });

    expect(screen.getByRole("button", { name: "Sync Recent" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel Run" })).toBeInTheDocument();
    expect(screen.getByText(/Run run-acti is Retrying\./i)).toBeInTheDocument();
    expect(screen.getByText(/Start buttons unlock after it finishes or you cancel it\./i)).toBeInTheDocument();
  });

  it("shows restart backfill after a terminal catalog run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-failed-1",
              status: "failed",
              created_at: "2026-03-18T11:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-failed-1/progress")) {
        return jsonResponse({
          run_id: "run-failed-1",
          run_status: "failed",
          source_scope: "bravo",
          stages: {},
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 1,
            active_jobs: 0,
            items_found_total: 0,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Backfill History" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Restart Backfill" })).not.toBeInTheDocument();
    expect(screen.getByText("No active catalog run. Ready to start the next backfill.")).toBeInTheDocument();
  });

  it("falls back to the account total when inspecting a terminal run with no catalog denominator", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          total_posts: 16453,
          catalog_total_posts: 4049,
          catalog_recent_runs: [
            {
              run_id: "run-discovery-only",
              status: "failed",
              created_at: "2026-03-18T18:04:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-discovery-only/progress")) {
        return jsonResponse({
          run_id: "run-discovery-only",
          run_status: "failed",
          source_scope: "bravo",
          created_at: "2026-03-18T18:04:00.000Z",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 1,
              jobs_failed: 0,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 0,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          discovery: {
            status: "completed",
            partition_strategy: "cursor_breakpoints",
            partition_count: 0,
            discovered_count: 0,
            queued_count: 0,
            running_count: 0,
            completed_count: 0,
            failed_count: 0,
            cancelled_count: 0,
          },
          post_progress: {
            completed_posts: 0,
            matched_posts: 0,
            total_posts: null,
          },
          summary: {
            total_jobs: 1,
            completed_jobs: 1,
            failed_jobs: 0,
            active_jobs: 0,
            items_found_total: 0,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "View Details" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "View Details" }));

    await waitFor(() => {
      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("0 / 16,453 posts checked")).toBeInTheDocument();
    });
  });

  it("uses the newest inspected catalog run from the summary when discovery outranks an older failed posts run", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: [
            {
              run_id: "run-discovery-new",
              status: "failed",
              created_at: "2026-03-18T12:00:00.000Z",
            },
            {
              run_id: "run-posts-old",
              status: "failed",
              created_at: "2026-03-18T08:00:00.000Z",
            },
          ],
        });
      }
      if (url.includes("/catalog/runs/run-discovery-new/progress")) {
        return jsonResponse({
          run_id: "run-discovery-new",
          run_status: "failed",
          source_scope: "bravo",
          created_at: "2026-03-18T12:00:00.000Z",
          stages: {
            shared_account_discovery: {
              jobs_total: 1,
              jobs_completed: 0,
              jobs_failed: 1,
              jobs_active: 0,
              jobs_running: 0,
              jobs_waiting: 0,
              scraped_count: 0,
              saved_count: 0,
            },
          },
          per_handle: [],
          recent_log: [],
          summary: {
            total_jobs: 1,
            completed_jobs: 0,
            failed_jobs: 1,
            active_jobs: 0,
            items_found_total: 0,
          },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "View Details" }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "View Details" })[0]);

    await waitFor(() => {
      expect(
        mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
          String(input).includes("/catalog/runs/run-discovery-new/progress"),
        ),
      ).toBe(true);
    });
    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
        String(input).includes("/catalog/runs/run-posts-old/progress"),
      ),
    ).toBe(false);
  });

  it("dismisses a failed recent run and returns the page to the ready state", async () => {
    let dismissed = false;

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/summary")) {
        return jsonResponse({
          ...baseSummary,
          catalog_recent_runs: dismissed
            ? []
            : [
                {
                  run_id: "run-failed-dismiss",
                  status: "failed",
                  created_at: "2026-03-19T22:00:00.000Z",
                },
              ],
        });
      }
      if (url.includes("/catalog/runs/run-failed-dismiss/dismiss")) {
        expect(init?.method).toBe("POST");
        dismissed = true;
        return jsonResponse({
          run_id: "run-failed-dismiss",
          status: "failed",
          dismissed: true,
          dismissed_at: "2026-03-19T23:00:00.000Z",
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    render(<SocialAccountProfilePage platform="instagram" handle="bravotv" activeTab="catalog" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(screen.getByText("No active catalog run. Ready to start the next backfill.")).toBeInTheDocument();
    });
    expect(screen.getByText("Dismissed run run-fail.")).toBeInTheDocument();
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
