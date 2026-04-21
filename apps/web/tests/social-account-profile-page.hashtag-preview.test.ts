import { describe, expect, it } from "vitest";

import { shouldUseSummaryTopHashtagsPreview } from "@/components/admin/SocialAccountProfilePage";
import type { SocialAccountProfileHashtag } from "@/lib/admin/social-account-profile";

const summaryTopHashtags: SocialAccountProfileHashtag[] = [
  {
    hashtag: "bravo",
    display_hashtag: "#bravo",
    usage_count: 12,
    first_seen_at: "2026-01-01T12:00:00.000Z",
    latest_seen_at: "2026-03-20T14:00:29.000Z",
    assignments: [],
    assigned_shows: [],
    observed_shows: [],
    observed_seasons: [],
  },
];

describe("shouldUseSummaryTopHashtagsPreview", () => {
  it("uses the summary preview on the stats tab for the default all-time window", () => {
    expect(
      shouldUseSummaryTopHashtagsPreview({
        activeTab: "stats",
        hashtagWindow: "all",
        summaryTopHashtags,
        hasLoadedExactWindow: false,
      }),
    ).toBe(true);
  });

  it("does not use the summary preview once the exact window has loaded", () => {
    expect(
      shouldUseSummaryTopHashtagsPreview({
        activeTab: "stats",
        hashtagWindow: "all",
        summaryTopHashtags,
        hasLoadedExactWindow: true,
      }),
    ).toBe(false);
  });

  it("does not use the summary preview outside the stats all-time view", () => {
    expect(
      shouldUseSummaryTopHashtagsPreview({
        activeTab: "hashtags",
        hashtagWindow: "all",
        summaryTopHashtags,
        hasLoadedExactWindow: false,
      }),
    ).toBe(false);

    expect(
      shouldUseSummaryTopHashtagsPreview({
        activeTab: "stats",
        hashtagWindow: "30d",
        summaryTopHashtags,
        hasLoadedExactWindow: false,
      }),
    ).toBe(false);
  });
});
