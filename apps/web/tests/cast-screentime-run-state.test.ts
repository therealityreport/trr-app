import { describe, expect, it } from "vitest";

import {
  getAllowedReviewTransitions,
  getExecutionStatusLabel,
  getRunOverviewMessage,
} from "@/app/admin/cast-screentime/run-state";

describe("cast screentime run state helpers", () => {
  it("does not expose review transitions for non-success runs", () => {
    expect(
      getAllowedReviewTransitions({
        status: "failed",
        review_status: "draft",
        is_publishable: false,
      }),
    ).toEqual([]);
  });

  it("describes failed independent runs as not yet reviewable", () => {
    expect(
      getRunOverviewMessage({
        status: "failed",
        review_status: "draft",
        is_publishable: false,
      }),
    ).toContain("did not complete successfully");
  });

  it("treats dispatch-failed pending runs as failed for display", () => {
    expect(
      getExecutionStatusLabel({
        status: "pending",
        review_status: "draft",
        is_publishable: false,
        error_message: "SCREENALYTICS_SERVICE_TOKEN is not configured",
        started_at: null,
        completed_at: null,
        manifest_key: null,
      }),
    ).toBe("failed");
  });

  it("describes successful promo runs as completed independent reports", () => {
    expect(
      getRunOverviewMessage({
        status: "success",
        review_status: "ready_for_review",
        is_publishable: false,
      }),
    ).toContain("completed independent report");
  });
});
