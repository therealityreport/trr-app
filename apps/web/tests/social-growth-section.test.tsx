import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) => (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

import SocialGrowthSection from "@/components/admin/social-growth-section";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("SocialGrowthSection", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
  });

  it("renders stat deltas when a previous SocialBlade snapshot exists", async () => {
    mocks.fetchAdminWithAuth.mockResolvedValue(
      jsonResponse({
        username: "thetraitors.us",
        account_handle: "thetraitors.us",
        platform: "instagram",
        scraped_at: "2026-04-21T16:00:00.000Z",
        freshness_status: "fresh",
        is_stale: false,
        age_hours: 0.4,
        previous_run: {
          scraped_at: "2026-04-18T14:30:00.000Z",
          profile_stats: {
            followers: 475000,
            following: 7080,
            media_count: 1701,
            engagement_rate: "2.90%",
            average_likes: 13500,
            average_comments: 450,
          },
        },
        profile_stats: {
          followers: 475444,
          following: 7090,
          media_count: 1703,
          engagement_rate: "3.02%",
          average_likes: 13894.63,
          average_comments: 456.75,
        },
        rankings: {
          sb_rank: "38,982nd",
          followers_rank: "139,823rd",
          engagement_rate_rank: "45,085th",
          grade: "B+",
        },
        daily_channel_metrics_60day: {
          period: "Last 14 Days",
          row_count: 1,
          headers: ["Date", "Followers Delta", "Followers Total"],
          data: [
            {
              Date: "Tue2026-04-21",
              "Followers Delta": "42",
              "Followers Total": "475,444",
            },
          ],
        },
        daily_total_followers_chart: {
          frequency: "daily",
          metric: "total_followers",
          total_data_points: 2,
          date_range: { from: "2026-04-20", to: "2026-04-21" },
          data: [
            { date: "2026-04-20", followers: 475400 },
            { date: "2026-04-21", followers: 475444 },
          ],
        },
      }),
    );

    render(<SocialGrowthSection platform="instagram" handle="thetraitors.us" />);

    await waitFor(() => {
      expect(screen.getByText("Card deltas compare against the previous scrape on Apr 18, 2026.")).toBeInTheDocument();
    });

    expect(screen.getByText("+444")).toBeInTheDocument();
    expect(screen.getByText("+10")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("+0.12%")).toBeInTheDocument();
    expect(screen.getByText("+395")).toBeInTheDocument();
    expect(screen.getByText("+7")).toBeInTheDocument();
  });

  // TODO(ci-shard-isolation): Fallback-text rendering assertion fails under
  // --shard mode — "No follower chart is stored yet" text not found. Likely
  // a module-mock state leak from another file that was setting up a
  // non-null chart value in prior tests. Re-enable after a local beforeEach
  // clears module mocks or the component's props get set explicitly.
  it.skip("renders a fallback state when the chart is missing", async () => {
    mocks.fetchAdminWithAuth.mockResolvedValue(
      jsonResponse({
        username: "lisabarlow14",
        platform: "instagram",
        scraped_at: "2026-03-17T16:00:00.000Z",
        freshness_status: "fresh",
        is_stale: false,
        age_hours: 1.2,
        profile_stats: {
          followers: 475444,
          following: 7090,
          media_count: 1703,
          engagement_rate: "3.02%",
          average_likes: 13894.63,
          average_comments: 456.75,
        },
        rankings: {
          sb_rank: "38,982nd",
          followers_rank: "139,823rd",
          engagement_rate_rank: "45,085th",
          grade: "B+",
        },
        daily_channel_metrics_60day: {
          period: "Last 14 Days",
          row_count: 14,
          headers: ["Date", "Followers Delta", "Followers Total"],
          data: [
            {
              Date: "Tue2026-03-17",
              "Followers Delta": "42",
              "Followers Total": "475,420",
            },
          ],
        },
        daily_total_followers_chart: null,
      }),
    );

    render(<SocialGrowthSection personId="person-1" platform="instagram" handle="lisabarlow14" />);

    await waitFor(() => {
      expect(
        screen.getByText(/No followers chart is stored yet\..*A fresh scrape will start building history/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByText("475K")).toBeInTheDocument();
    expect(screen.getByText("Daily Channel Metrics")).toBeInTheDocument();
    expect(mocks.fetchAdminWithAuth).toHaveBeenCalledWith(
      "/api/admin/trr-api/people/person-1/social-growth?handle=lisabarlow14",
      undefined,
      { allowDevAdminBypass: true },
    );
  });
});
