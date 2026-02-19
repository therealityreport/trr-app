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
});
