import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import CastScreentimePageClient from "@/app/admin/cast-screentime/CastScreentimePageClient";

const navigationState = vi.hoisted(() => ({
  search: "show_id=show-1",
}));

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  guardState: {
    checking: false,
    hasAccess: true,
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigationState.search),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

vi.mock("@/components/admin/AdminGlobalHeader", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/admin/AdminBreadcrumbs", () => ({
  __esModule: true,
  default: () => <div data-testid="breadcrumbs" />,
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("CastScreentimePageClient", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    navigationState.search = "show_id=show-1";
    mocks.fetchAdminWithAuth.mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.includes("/shows/show-1/runs")) {
        return Promise.resolve(
          jsonResponse({
            runs: [
              {
                id: "run-1",
                status: "success",
                review_status: "approved",
                run_type: "cast_screentime",
                video_asset_id: "asset-1",
                show_id: "show-1",
                season_id: "season-1",
                owner_scope: "season",
                media_type: "trailer",
                media_kind: null,
                video_class: "promo",
                promo_subtype: "trailer",
                publication_mode: "supplementary_reference",
              },
            ],
          }),
        );
      }
      if (url.endsWith("/runs/run-1")) {
        return Promise.resolve(
          jsonResponse({
            id: "run-1",
            status: "success",
            review_status: "approved",
            run_type: "cast_screentime",
            video_asset_id: "asset-1",
            show_id: "show-1",
            season_id: "season-1",
            owner_scope: "season",
            media_type: "trailer",
            media_kind: null,
            video_class: "promo",
            promo_subtype: "trailer",
            publication_mode: "supplementary_reference",
          }),
        );
      }
      if (url.endsWith("/runs/run-1/leaderboard")) {
        return Promise.resolve(
          jsonResponse({
            leaderboard: [
              {
                person_id: "person-1",
                display_name: "Person One",
                screen_time_seconds: 12.5,
                frame_count: 120,
                confidence_avg: 0.93,
              },
            ],
          }),
        );
      }
      if (url.endsWith("/runs/run-1/review-summary")) {
        return Promise.resolve(
          jsonResponse({
            run_id: "run-1",
            publication_mode: "supplementary_reference",
            is_canonical_publication: false,
            excluded_section_count: 1,
            excluded_overlap_ms: 2000,
            raw_leaderboard: [
              {
                person_id: "person-1",
                display_name: "Person One",
                screen_time_seconds: 12.5,
                frame_count: 120,
              },
            ],
            reviewed_leaderboard: [
              {
                person_id: "person-1",
                display_name: "Person One",
                screen_time_seconds: 6.0,
                frame_count: 120,
              },
            ],
            decision_counts: {
              suggestion_decisions: 0,
              unknown_review_state: 0,
            },
            rerun_required_for_identity_changes: false,
          }),
        );
      }
      if (url.endsWith("/runs/run-1/segments")) {
        return Promise.resolve(jsonResponse({ segments: [] }));
      }
      if (url.endsWith("/runs/run-1/evidence")) {
        return Promise.resolve(jsonResponse({ evidence: [] }));
      }
      if (url.endsWith("/runs/run-1/excluded-sections")) {
        return Promise.resolve(
          jsonResponse({
            excluded_sections: [
              {
                section_key: "cold-open",
                section_type: "intro",
                start_ms: 1000,
                end_ms: 3000,
                duration_ms: 2000,
                detection_source: "manual",
              },
            ],
          }),
        );
      }
      if (url.endsWith("/runs/run-1/decision-state")) {
        return Promise.resolve(
          jsonResponse({
            suggestion_decisions: [],
            unknown_review_state: [],
            rerun_required_for_metrics: false,
            decision_effect_summary: null,
          }),
        );
      }
      if (url.includes("/artifacts/")) {
        return Promise.resolve(jsonResponse({ error: "not found" }, 404));
      }
      if (url.includes("/video-assets/asset-1/publish-history")) {
        return Promise.resolve(jsonResponse({ publish_history: [] }));
      }
      if (url.includes("/shows/show-1/published-rollups")) {
        return Promise.resolve(jsonResponse({ published_asset_count: 0, leaderboard: [] }));
      }
      if (url.includes("/seasons/season-1/published-rollups")) {
        return Promise.resolve(jsonResponse({ published_asset_count: 0, leaderboard: [] }));
      }
      return Promise.resolve(jsonResponse({}));
    });
  });

  it("surfaces reviewed totals and internal-reference publish action for approved trailer runs", async () => {
    render(<CastScreentimePageClient />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh Show Runs" }));

    const loadButton = await screen.findByRole("button", { name: "Load" });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText("Reviewed Totals")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", {
        name: "Supplementary reference publication",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish Internal Reference" })).toBeInTheDocument();
    expect(screen.getByText("6.000s")).toBeInTheDocument();
  });
});
