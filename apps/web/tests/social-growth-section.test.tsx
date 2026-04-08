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

  it("renders a fallback state when the chart is missing", async () => {
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

    render(<SocialGrowthSection personId="person-1" instagramHandle="lisabarlow14" />);

    await waitFor(() => {
      expect(
        screen.getByText(/No follower chart is stored yet\. A fresh scrape will start building history/i)
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
