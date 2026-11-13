import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InstagramCountComparison, InstagramCountSummary } from "@/components/admin/instagram/InstagramCountComparison";
import { formatInstagramCount, instagramExploratoryComparison, instagramRunStatusLabel, instagramScanStatusLabel, instagramInventoryExplanation, instagramVerificationLabel } from "@/lib/admin/instagram-counts";
import { instagramCounts, instagramCountSummary } from "./fixtures/instagram-counts";

describe("independent Instagram count presentation", () => {
  it("preserves absent values, explicit zero, and signed negative differences", () => {
    expect(formatInstagramCount(null)).toBe("Unknown");
    expect(formatInstagramCount(undefined)).toBe("Unknown");
    expect(formatInstagramCount(false)).toBe("Unknown");
    expect(formatInstagramCount(0)).toBe("0");
    expect(formatInstagramCount(-4, true)).toBe("-4");
    expect(formatInstagramCount(4, true)).toBe("+4");
  });
  it("requires all independent inputs for an exploratory sum", () => {
    const counts = instagramCounts();
    expect(instagramExploratoryComparison(counts)).toMatchObject({ sum: null, difference: null, missingInputs: ["Threads comments shown on Instagram"] });
    expect(instagramExploratoryComparison(instagramCounts({ threads_count_observed_on_instagram: 0 }))).toMatchObject({ sum: 100, difference: 0, agreement: "Counts match numerically; relationship unverified." });
    expect(instagramExploratoryComparison(instagramCounts({ threads_count_observed_on_instagram: 3 }))).toMatchObject({ sum: 103, difference: -3, agreement: null });
  });
  it("starts comparison collapsed and shows independent provenance, conflicts, and unknown inputs", () => {
    render(<InstagramCountComparison counts={instagramCounts({ observation_conflicts: [{ value: 101, source_field: "comments_count", observed_at: "2026-11-06T00:00:00Z" }] })} />);
    expect(screen.getByText("Count comparison").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByText("Missing inputs: Threads comments shown on Instagram")).toBeInTheDocument();
    expect(screen.getByText("Hypothetical combined count: Unknown")).toBeInTheDocument();
    expect(screen.getByText(/Retained observation; absent from latest response/)).toBeInTheDocument();
    expect(screen.getByText(/\"value\": 101/)).toBeInTheDocument();
    expect(screen.getByText("Hidden or removed comments: Not established.")).toBeInTheDocument();
    expect(screen.getByText("These counts may overlap or come from different observation times. This is an exploratory comparison.")).toBeInTheDocument();
    expect(screen.queryByText(/not captured|Incomplete/)).not.toBeInTheDocument();
  });
  it("discloses unknown posts with each source subtotal", () => {
    render(<InstagramCountSummary summary={instagramCountSummary()} />);
    expect(screen.getByText("100 known subtotal · 2 posts known · 1 posts unknown")).toBeInTheDocument();
    expect(screen.getByText("0 known subtotal · 0 posts known · 3 posts unknown")).toBeInTheDocument();
  });
  it("does not explain unavailable saved inventory with a reported subtotal", () => {
    const summary = instagramCountSummary({ inventory_status: "unavailable", instagram_saved_count: null, post_reported_known_subtotal: 0, post_reported_known_posts_count: 0, post_reported_unknown_posts_count: 18490 });
    expect(instagramInventoryExplanation(summary)).toBe("Saved Instagram inventory is unavailable. The saved count is unknown.");
    expect(instagramInventoryExplanation(summary, "difference")).toBe("The difference is unknown because saved Instagram inventory is unavailable.");
    expect(instagramInventoryExplanation(undefined)).toContain("unavailable");
    expect(instagramInventoryExplanation(instagramCountSummary({ instagram_saved_count: 0 }))).toMatch(/^Canonical saved Instagram comment records/);
  });
  it("keeps execution state separate from scan and verification evidence", () => {
    expect(instagramRunStatusLabel("queued")).toBe("Queued");
    expect(instagramRunStatusLabel("retrying")).toBe("Waiting to retry");
    expect(instagramRunStatusLabel("paused")).toBe("Paused");
    expect(instagramRunStatusLabel("held")).toBe("Held");
    expect(instagramRunStatusLabel("blocked")).toBe("Unknown");
    expect(instagramRunStatusLabel("blocked", { execution_hold_reason: "worker_offline" })).toBe("Held");
    expect(instagramRunStatusLabel("completed")).toBe("Finished");
    expect(instagramVerificationLabel({ verification_status: "not_checked" })).toBe("Not checked");
    expect(instagramScanStatusLabel("in_progress")).toBe("In progress");
    expect(instagramScanStatusLabel("interrupted")).toBe("Interrupted");
    expect(instagramScanStatusLabel("finished")).toBe("Finished");
    expect(instagramScanStatusLabel("failed")).toBe("Unknown");
    expect(instagramVerificationLabel({ verification_status: "checks_pending" })).toBe("Checks pending");
    expect(instagramVerificationLabel({ verification_status: "passed", verification_details: { checked: true } })).toBe("Passed");
  });
  it("does not treat a false legacy acceptance flag as a failed verification", () => {
    expect(instagramVerificationLabel({ final_acceptance: false })).toBe("Not verified");
    expect(instagramVerificationLabel({ final_acceptance: true })).toBe("Not verified");
    expect(instagramVerificationLabel({ verification_status: "arbitrary_pass", verification_details: { evidence: "present" } })).toBe("Not verified");
    expect(instagramVerificationLabel({ verification_status: "failed", verification_details: {} })).toBe("Not verified");
    expect(instagramVerificationLabel({ verification_status: "failed", verification_details: { reason: "confirmed mismatch" } })).toBe("Blocked");
  });
});
