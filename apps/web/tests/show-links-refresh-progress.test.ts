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
    expect(summary.targetSummary).toBe("Targets: show 1 · seasons 5 · cast 12");
    expect(summary.metrics).toEqual(
      expect.arrayContaining([
        { label: "Discovered", value: "8" },
        { label: "Fandom Tested", value: "14" },
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
        stage_progress: {
          processed_targets: 4,
          total_targets: 9,
          links_discovered: 11,
          targets_with_links: 3,
          current_target_label: "Heather Gay",
        },
      },
      STAGE_LABELS
    );

    expect(summary.headline).toBe("Cast Links still running...");
    expect(summary.stageProgressLabel).toBe("4/9 processed · 11 links found · 3 matches");
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
});
