import { describe, expect, it } from "vitest";

import {
  appendLiveCountsToMessage,
  formatJobLiveCounts,
  resolveJobLiveCounts,
} from "@/lib/admin/job-live-counts";

describe("job-live-counts", () => {
  it("reads explicit live_counts payload", () => {
    const counts = resolveJobLiveCounts(null, {
      live_counts: {
        synced: 12,
        mirrored: 9,
        counted: 6,
        cropped: 3,
        id_text: 2,
        resized: 1,
      },
    });

    expect(counts).toEqual({
      synced: 12,
      mirrored: 9,
      counted: 6,
      cropped: 3,
      id_text: 2,
      resized: 1,
    });
  });

  it("infers from operation_counts snapshots", () => {
    const counts = resolveJobLiveCounts(null, {
      operation_counts: {
        count: { succeeded: 5 },
        crop: { succeeded: 4 },
        id_text: { succeeded: 3 },
        resize: { succeeded: 2 },
      },
    });

    expect(counts).toEqual({
      synced: 0,
      mirrored: 0,
      counted: 5,
      cropped: 4,
      id_text: 3,
      resized: 2,
    });
  });

  it("infers show refresh sync/mirror totals and monotonic merge", () => {
    const first = resolveJobLiveCounts(null, {
      show_images_upserted: 1,
      season_images_upserted: 2,
      episode_images_upserted: 3,
      cast_photos_upserted: 4,
      show_images_mirrored: 5,
      season_images_mirrored: 6,
      episode_images_mirrored: 7,
      cast_photos_mirrored: 8,
      auto_counts_succeeded: 2,
      text_overlay_succeeded: 1,
    });

    expect(first).toEqual({
      synced: 10,
      mirrored: 26,
      counted: 2,
      cropped: 0,
      id_text: 1,
      resized: 0,
    });

    const second = resolveJobLiveCounts(first, {
      live_counts: {
        synced: 8,
        mirrored: 20,
        counted: 1,
        cropped: 0,
        id_text: 1,
        resized: 0,
      },
    });

    expect(second).toEqual(first);
  });

  it("returns null when payload has no count signals", () => {
    const counts = resolveJobLiveCounts(null, {
      stage: "cast_credits_show_cast",
      message: "Syncing cast credits...",
      current: 1,
      total: 2,
    });
    expect(counts).toBeNull();
  });

  it("formats and appends count labels", () => {
    const counts = {
      synced: 3,
      mirrored: 2,
      counted: 1,
      cropped: 0,
      id_text: 4,
      resized: 5,
    };

    expect(formatJobLiveCounts(counts)).toBe(
      "synced: 3, mirrored: 2, counted: 1, cropped: 0, id text: 4, resized: 5"
    );
    expect(appendLiveCountsToMessage("Running", counts)).toContain("Running |");
  });
});
