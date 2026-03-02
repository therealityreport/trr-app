import { describe, expect, it } from "vitest";

import { formatPersonRefreshSummary } from "@/lib/admin/person-refresh-summary";

describe("formatPersonRefreshSummary", () => {
  it("appends not-configured note for zero word-id counts", () => {
    const summary = {
      auto_counts_attempted: 11,
      auto_counts_succeeded: 11,
      auto_counts_failed: 0,
      text_overlay_attempted: 0,
      text_overlay_succeeded: 0,
      text_overlay_unknown: 0,
      text_overlay_failed: 0,
      text_overlay_configured: false,
      text_overlay_candidates: 0,
      text_overlay_skipped_reason: "not_configured",
    };

    const text = formatPersonRefreshSummary(summary);
    expect(text).toContain("text overlay attempted: 0");
    expect(text).toContain("Text overlay skipped (not configured).");
  });

  it("appends no-pending-images note when detector is configured", () => {
    const summary = {
      text_overlay_attempted: 0,
      text_overlay_succeeded: 0,
      text_overlay_unknown: 0,
      text_overlay_failed: 0,
      text_overlay_configured: true,
      text_overlay_candidates: 0,
      text_overlay_skipped_reason: "no_pending_images",
    };

    const text = formatPersonRefreshSummary(summary);
    expect(text).toContain("Text overlay already up to date (no pending images).");
  });

  it("appends failed parts and retry notes when present", () => {
    const summary = {
      auto_counts_attempted: 20,
      auto_counts_succeeded: 18,
      auto_counts_failed: 2,
      failed_parts: [
        { part: "people_count_face_crops", failed: 2 },
        { part: "resizing", failed: 1 },
      ],
      retry_attempts: {
        auto_count: 2,
        word_id: 1,
        centering_cropping: 1,
        resizing: 2,
      },
    };

    const text = formatPersonRefreshSummary(summary);
    expect(text).toContain("Failed parts: people count face crops (2), resizing (1).");
    expect(text).toContain("Partial retries ran for 2 stages.");
  });
});
