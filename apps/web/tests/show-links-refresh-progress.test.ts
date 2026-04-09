import { describe, expect, it } from "vitest";

import { buildLinkDiscoveryProgressSummary } from "../src/lib/admin/show-page/link-discovery-progress";

const STAGE_LABELS = {
  show_discovery_started: "Show Links",
  season_discovery_started: "Season Links",
  people_discovery_started: "Cast Links",
  upsert_started: "Saving Links",
  cleanup_completed: "Validation",
};

describe("show links refresh progress", () => {
  it("formats heartbeat progress with targets, budget, and elapsed timing", () => {
    const summary = buildLinkDiscoveryProgressSummary(
      {
        stage: "heartbeat",
        current_stage: "show_discovery_started",
        heartbeat: true,
        message: "Discovery still running...",
        elapsed_ms: 111_000,
        stage_elapsed_ms: 34_000,
        discovered_rows: 8,
        fandom_candidates_tested: 14,
        scan_targets: {
          show_scanned: 1,
          season_scanned: 5,
          people_scanned: 12,
        },
        target_progress: {
          shows: { completed: 0, total: 1 },
          seasons: { completed: 0, total: 5 },
          cast_members: { completed: 0, total: 12 },
        },
        stage_budget: {
          stage: "show",
          max_fandom_candidates: 180,
          stage_fandom_candidates_tested: 14,
        },
      },
      STAGE_LABELS
    );

    expect(summary.headline).toBe("Show Links still running...");
    expect(summary.elapsedLabel).toBe("111s elapsed");
    expect(summary.stageElapsedLabel).toBe("34s in this stage");
    expect(summary.targetSummary).toBe("0/1 Shows · 0/5 Seasons · 0/12 Cast Members");
    expect(summary.metrics).toEqual(
      expect.arrayContaining([
        { label: "Discovered", value: "8" },
        { label: "Fandom Tested (run)", value: "14" },
        { label: "Fandom Tested (stage)", value: "14" },
        { label: "Candidate Budget", value: "14/180" },
      ])
    );
  });

  it("surfaces people-stage progress and current target details", () => {
    const summary = buildLinkDiscoveryProgressSummary(
      {
        stage: "heartbeat",
        current_stage: "people_discovery_started",
        heartbeat: true,
        elapsed_ms: 145_000,
        stage_elapsed_ms: 90_000,
        target_progress: {
          shows: { completed: 1, total: 1 },
          seasons: { completed: 7, total: 7 },
          cast_members: { completed: 4, total: 59 },
        },
        stage_progress: {
          processed_targets: 4,
          total_targets: 59,
          links_discovered: 11,
          targets_with_links: 3,
          current_target_label: "Heather Gay",
        },
      },
      STAGE_LABELS
    );

    expect(summary.headline).toBe("Cast Links still running...");
    expect(summary.targetSummary).toBe("1/1 Shows · 7/7 Seasons · 4/59 Cast Members");
    expect(summary.stageProgressLabel).toBe("4/59 processed · 11 links found · 3 matches");
    expect(summary.currentTargetLabel).toBe("Heather Gay");
  });

  it("surfaces stage-specific row counts and save counts when present", () => {
    const summary = buildLinkDiscoveryProgressSummary(
      {
        stage: "upsert_started",
        current_stage: "upsert_started",
        rows: 22,
        discovered_rows: 22,
        upserted: 7,
        approved_added: 5,
      },
      STAGE_LABELS
    );

    expect(summary.headline).toBe("Saving Links in progress");
    expect(summary.metrics).toEqual(
      expect.arrayContaining([
        { label: "Discovered", value: "22" },
        { label: "Stage Rows", value: "22" },
        { label: "Upserted", value: "7" },
        { label: "Approved", value: "5" },
      ])
    );
  });

  it("surfaces exhausted candidate budgets when fandom scanning hits limits", () => {
    const summary = buildLinkDiscoveryProgressSummary(
      {
        stage: "heartbeat",
        current_stage: "people_discovery_started",
        heartbeat: true,
        message: "Discovery still running...",
        stage_budget: {
          stage: "people",
          max_fandom_candidates: 180,
          stage_fandom_candidates_tested: 180,
          budget_exhausted: true,
          budget_reason: "fandom_candidate_limit",
        },
      },
      STAGE_LABELS
    );

    expect(summary.budgetLabel).toBe("Budget exhausted: fandom candidate limit");
    expect(summary.metrics).toEqual(
      expect.arrayContaining([{ label: "Candidate Budget", value: "180/180" }])
    );
  });

  it("formats cleanup and terminal completion without stale in-progress messaging", () => {
    const summary = buildLinkDiscoveryProgressSummary(
      {
        current_stage: "completed",
        status: "ok",
        message: "Links refresh complete.",
        elapsed_ms: 641_000,
        stage_elapsed_ms: 87_000,
        scan_targets: {
          show_scanned: 1,
          season_scanned: 7,
          people_scanned: 142,
        },
        stage_progress: {
          validated_links: 467,
          promoted_links: 0,
          deleted_links: 1,
          normalized_social_urls: 2,
        },
        stalled: false,
      },
      STAGE_LABELS
    );

    expect(summary.terminal).toBe(true);
    expect(summary.headline).toBe("Links refresh complete.");
    expect(summary.stageLabel).toBe("Completed");
    expect(summary.stageProgressLabel).toBe("467 validated · 0 promoted · 1 deleted · 2 normalized");
    expect(summary.currentTargetLabel).toBeNull();
  });

  it("surfaces stalled worker metadata from heartbeat payloads", () => {
    const summary = buildLinkDiscoveryProgressSummary(
      {
        stage: "heartbeat",
        current_stage: "season_discovery_started",
        heartbeat: true,
        message: "Discovery still running...",
        stalled: true,
        stalled_reason: "stage_timeout_budget",
        last_progress_at: "2026-04-02T10:00:00Z",
        last_stage_transition_at: "2026-04-02T09:59:00Z",
      },
      STAGE_LABELS
    );

    expect(summary.stalled).toBe(true);
    expect(summary.stalledReason).toBe("stage timeout budget");
    expect(summary.lastProgressAt).toBe("2026-04-02T10:00:00Z");
    expect(summary.lastStageTransitionAt).toBe("2026-04-02T09:59:00Z");
  });
});
