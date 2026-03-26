import { describe, expect, it } from "vitest";

import {
  buildOperationDispatchDetailMessage,
  buildProxyConnectDetailMessage,
  buildProxyTerminalErrorMessage,
  buildPersonRefreshDetailMessage,
  createPersonRefreshPipelineSteps,
  createSyncProgressTracker,
  finalizePersonRefreshPipelineSteps,
  formatGettySubtaskCountLabel,
  formatRefreshSourceLabel,
  formatPersonRefreshPhaseLabel,
  mapPersonRefreshStage,
  normalizePersonGettyProgress,
  normalizePersonRefreshSourceProgress,
  PERSON_REFRESH_PHASES,
  summarizePersonRefreshSourceProgress,
  updatePersonRefreshPipelineSteps,
  updateSyncProgressTracker,
} from "@/app/admin/trr-shows/people/[personId]/refresh-progress";

describe("person refresh progress mapping", () => {
  it("maps sync-oriented backend stages to SYNCING", () => {
    expect(mapPersonRefreshStage("tmdb_profile")).toBe(PERSON_REFRESH_PHASES.syncing);
    expect(mapPersonRefreshStage("sync_tmdb")).toBe(PERSON_REFRESH_PHASES.syncing);
    expect(mapPersonRefreshStage("fetching")).toBe(PERSON_REFRESH_PHASES.syncing);
    expect(mapPersonRefreshStage("metadata_enrichment")).toBe(PERSON_REFRESH_PHASES.syncing);
    expect(mapPersonRefreshStage("upserting")).toBe(PERSON_REFRESH_PHASES.syncing);
    expect(mapPersonRefreshStage("nbcumv_import")).toBe(PERSON_REFRESH_PHASES.syncing);
  });

  it("maps mirror/count/text stages to requested labels", () => {
    expect(mapPersonRefreshStage("mirroring")).toBe(PERSON_REFRESH_PHASES.mirroring);
    expect(mapPersonRefreshStage("auto_count")).toBe(PERSON_REFRESH_PHASES.tagging);
    expect(mapPersonRefreshStage("word_id")).toBe(PERSON_REFRESH_PHASES.findingText);
    expect(mapPersonRefreshStage("centering_cropping")).toBe(
      PERSON_REFRESH_PHASES.centeringCropping,
    );
    expect(mapPersonRefreshStage("resizing")).toBe(PERSON_REFRESH_PHASES.resizing);
  });

  it("accepts preformatted UI phases", () => {
    expect(mapPersonRefreshStage("CENTERING/CROPPING")).toBe(
      PERSON_REFRESH_PHASES.centeringCropping,
    );
  });

  it("formats unknown values into readable uppercase labels", () => {
    expect(formatPersonRefreshPhaseLabel("some_custom_stage")).toBe("SOME CUSTOM STAGE");
  });

  it("tracks syncing stage completion one-by-one", () => {
    const tracker = createSyncProgressTracker();

    expect(
      updateSyncProgressTracker(tracker, {
        rawStage: "tmdb_profile",
        message: "Syncing TMDb profile...",
        current: null,
        total: null,
      }),
    ).toEqual({ current: 1, total: 1 });

    expect(
      updateSyncProgressTracker(tracker, {
        rawStage: "sync_tmdb",
        message: "Syncing TMDb...",
        current: 0,
        total: 2,
      }),
    ).toEqual({ current: 1, total: 2 });

    expect(
      updateSyncProgressTracker(tracker, {
        rawStage: "sync_tmdb",
        message: "Synced TMDb (12 photos).",
        current: 1,
        total: 2,
      }),
    ).toEqual({ current: 2, total: 2 });
  });

  it("formats source labels for backend source identifiers", () => {
    expect(formatRefreshSourceLabel("imdb")).toBe("IMDb");
    expect(formatRefreshSourceLabel("fandom-gallery")).toBe("Fandom Gallery");
    expect(formatRefreshSourceLabel("tmdb")).toBe("TMDb");
    expect(formatRefreshSourceLabel("nbcumv")).toBe("NBCUMV");
    expect(formatRefreshSourceLabel("getty")).toBe("Getty");
    expect(formatRefreshSourceLabel("getty_nbcumv")).toBe("Getty / NBCUMV");
  });

  it("normalizes structured source progress rows and preserves source ordering", () => {
    const sourceProgress = normalizePersonRefreshSourceProgress({
      getty_nbcumv: {
        status: "running",
        discovered_total: 600,
        scraped_current: 132,
        saved_current: 18,
        failed_current: 0,
        skipped_current: 0,
        remaining: 468,
        message: "Matching Getty assets against NBCUMV...",
      },
      imdb: {
        status: "completed",
        discovered_total: 24,
        scraped_current: 24,
        saved_current: 24,
        failed_current: 0,
        skipped_current: 0,
        remaining: 0,
        message: "Synced IMDb (24 photos).",
      },
    });

    expect(sourceProgress.map((entry) => entry.key)).toEqual(["imdb", "getty_nbcumv"]);
    expect(sourceProgress[1]).toMatchObject({
      label: "Getty / NBCUMV",
      discoveredTotal: 600,
      scrapedCurrent: 132,
      savedCurrent: 18,
      remaining: 468,
    });
    expect(summarizePersonRefreshSourceProgress(sourceProgress)).toEqual({ current: 1, total: 2 });
  });

  it("counts warning source rows as completed progress", () => {
    const sourceProgress = normalizePersonRefreshSourceProgress({
      getty_nbcumv: {
        status: "warning",
        discovered_total: 96,
        scraped_current: 96,
        saved_current: 0,
        covered_existing: 95,
        failed_current: 1,
        skipped_current: 95,
        remaining: 0,
        message: "Imported 0 NBCUMV-only supplemental assets.",
      },
    });

    expect(sourceProgress[0]?.status).toBe("warning");
    expect(summarizePersonRefreshSourceProgress(sourceProgress)).toEqual({ current: 1, total: 1 });
  });

  it("normalizes structured getty progress rows and preserves task ordering", () => {
    const gettyProgress = normalizePersonGettyProgress({
      status: "running",
      phase: "pairing",
      subtasks: [
        {
          id: "mirror_imported_assets",
          label: "Host Imported Assets",
          status: "warning",
          current: 16,
          total: 17,
        },
        {
          id: "primary_person_search",
          label: "Primary Person Search",
          status: "completed",
          query: "Brandi Glanville Bravo",
          candidates_found: 24,
          current: 24,
          total: 24,
          message: "Found 24 direct Getty candidates.",
        },
      ],
      breakdown: {
        raw_getty_candidates: 24,
        getty_query_image_total: 5700,
        getty_query_event_total: 379,
        getty_query_page_total: 96,
        getty_pages_completed: 96,
        getty_pages_total: 96,
        getty_discovered_total: 4823,
        getty_usable_total: 3946,
        getty_existing_shared_total: 877,
        getty_existing_getty_total: 12,
        getty_to_import_total: 3069,
        getty_skipped_existing_total: 889,
        getty_deferred_resolution_total: 14,
        matched_via_nbcumv: 10,
        matched_via_bravotv_json: 0,
        matched_via_image_search: 2,
        unmatched_getty: 14,
        getty_only_imported: 3,
        nbcumv_only_imported: 2,
        bravotv_only_imported: 1,
        skipped: 0,
        failed: 1,
        mirrored_hosted: 16,
        mirrored_failed: 1,
      },
    });

    expect(gettyProgress).not.toBeNull();
    expect(gettyProgress?.subtasks.map((entry) => entry.id)).toEqual([
      "primary_person_search",
      "mirror_imported_assets",
    ]);
    expect(gettyProgress?.breakdown).toMatchObject({
      rawGettyCandidates: 24,
      gettyQueryImageTotal: 5700,
      gettyQueryEventTotal: 379,
      gettyQueryPageTotal: 96,
      gettyPagesCompleted: 96,
      gettyExistingSharedTotal: 877,
      gettyToImportTotal: 3069,
      matchedViaNbcumv: 10,
      matchedViaImageSearch: 2,
      nbcumvOnlyImported: 2,
      mirroredHosted: 16,
      failed: 1,
    });
  });

  it("formats getty count labels using site totals before fetched totals", () => {
    expect(
      formatGettySubtaskCountLabel({
        id: "primary_person_search",
        label: "Primary Person Search",
        status: "completed",
        query: "Brandi Glanville Bravo",
        queryUrl: "https://www.gettyimages.com/search/2/image?family=editorial&phrase=Brandi%20Glanville%20Bravo&sort=newest",
        candidatesFound: 180,
        siteImageTotal: 877,
        siteEventTotal: 39,
        siteVideoTotal: 0,
        usableAfterDedupeTotal: 180,
        overlapCount: 0,
        current: 180,
        total: 180,
        message: "Getty reports 877 images. fetched 180. 180 usable after dedupe.",
      }),
    ).toBe("877 found");
  });

  it("formats getty count labels as fetched when site totals are absent", () => {
    expect(
      formatGettySubtaskCountLabel({
        id: "fallback_person_search",
        label: "Fallback Person Search",
        status: "completed",
        query: "Brandi Glanville",
        queryUrl: "https://www.gettyimages.com/search/2/image?family=editorial&phrase=Brandi%20Glanville&sort=newest",
        candidatesFound: 312,
        siteImageTotal: null,
        siteEventTotal: null,
        siteVideoTotal: null,
        usableAfterDedupeTotal: 312,
        overlapCount: 0,
        current: 312,
        total: 312,
        message: "Fetched 312 Getty candidates.",
      }),
    ).toBe("312 fetched");
  });

  it("builds detailed heartbeat messages with source + elapsed context", () => {
    expect(
      buildPersonRefreshDetailMessage({
        rawStage: "sync_imdb",
        message: "Syncing IMDb...",
        heartbeat: true,
        elapsedMs: 6200,
        source: "imdb",
        sourceTotal: 50,
        mirroredCount: 24,
        current: 0,
        total: 4,
      }),
    ).toBe("Syncing IMDb... · hosted 24/50 · step 0/4 · 6s elapsed");
  });

  it("builds fallback detail when backend emits no message", () => {
    expect(
      buildPersonRefreshDetailMessage({
        rawStage: "sync_tmdb",
        heartbeat: true,
        elapsedMs: 3000,
        source: "tmdb",
      }),
    ).toBe("SYNCING in progress · source: TMDb · 3s elapsed");
  });

  it("includes reviewed/changed/failed counters when provided", () => {
    expect(
      buildPersonRefreshDetailMessage({
        rawStage: "auto_count",
        message: "Auto-counting people in images...",
        current: 12,
        total: 50,
        reviewedRows: 12,
        changedRows: 9,
        totalRows: 50,
        failedRows: 3,
        skippedRows: 4,
      }),
    ).toBe(
      "Auto-counting people in images... · step 12/50 · reviewed 12/50 · changed 9 · failed 3 · skipped 4",
    );
  });

  it("formats proxy connect heartbeat detail with attempt timing", () => {
    expect(
      buildProxyConnectDetailMessage({
        stage: "proxy_connecting",
        attempt: 2,
        maxAttempts: 5,
        attemptElapsedMs: 14_500,
        attemptTimeoutMs: 20_000,
      }),
    ).toBe("Connecting to backend stream (attempt 2/5, 14s/20s)...");
  });

  it("formats terminal proxy connect errors with code + host context", () => {
    expect(
      buildProxyTerminalErrorMessage({
        stage: "proxy_connecting",
        error: "Backend fetch failed",
        detail: "Timed out waiting for backend refresh stream response.",
        errorCode: "CONNECT_TIMEOUT",
        backendHost: "127.0.0.1:8000",
        maxAttempts: 5,
      }),
    ).toBe(
      "Backend stream connect failed after 5 attempts (code: CONNECT_TIMEOUT, host: 127.0.0.1:8000). Timed out waiting for backend refresh stream response.",
    );
  });

  it("formats backend preflight failures with actionable runtime hint", () => {
    expect(
      buildProxyTerminalErrorMessage({
        stage: "proxy_connecting",
        checkpoint: "backend_preflight_failed",
        detail: "Timed out waiting for backend stream response. (health_url=http://127.0.0.1:8000/health)",
        errorCode: "BACKEND_UNRESPONSIVE",
        backendHost: "127.0.0.1:8000",
      }),
    ).toBe(
      "TRR-Backend is not responding (host: 127.0.0.1:8000). In workspace mode, use non-reload backend or wait for reload cycle to settle. Timed out waiting for backend stream response. (health_url=http://127.0.0.1:8000/health)",
    );
  });

  it("tracks per-step pipeline status from stage progress events", () => {
    const initial = createPersonRefreshPipelineSteps("refresh");

    const running = updatePersonRefreshPipelineSteps(initial, {
      rawStage: "auto_count",
      message: "Auto-counting people in images...",
      current: 3,
      total: 20,
    });

    const autoCountRunning = running.find((step) => step.id === "auto_count");
    expect(autoCountRunning?.status).toBe("running");
    expect(autoCountRunning?.current).toBe(3);
    expect(autoCountRunning?.total).toBe(20);

    const completed = updatePersonRefreshPipelineSteps(running, {
      rawStage: "auto_count",
      message: "Auto-count complete.",
      current: 20,
      total: 20,
    });
    expect(completed.find((step) => step.id === "auto_count")?.status).toBe("completed");

    const skipped = updatePersonRefreshPipelineSteps(completed, {
      rawStage: "word_id",
      message: "Skipping word detection (not configured).",
      current: 0,
      total: 0,
    });
    expect(skipped.find((step) => step.id === "word_id")?.status).toBe("skipped");
  });

  it("keeps failed status even when current equals total", () => {
    const initial = createPersonRefreshPipelineSteps("refresh");
    const failed = updatePersonRefreshPipelineSteps(initial, {
      rawStage: "auto_count",
      message: "Counted 0 images (306 failed).",
      current: 306,
      total: 306,
    });
    expect(failed.find((step) => step.id === "auto_count")?.status).toBe("failed");
  });

  it("does not mark zero-failure completion messages as failed", () => {
    const initial = createPersonRefreshPipelineSteps("ingest");
    const updated = updatePersonRefreshPipelineSteps(initial, {
      rawStage: "metadata_repair",
      message: "Fixing IMDb Details complete (reviewed 7/7, changed 7, failed 0).",
      current: 7,
      total: 7,
    });

    expect(updated.find((step) => step.id === "metadata_repair")?.status).toBe("completed");
  });

  it("includes metadata repair step in reprocess mode", () => {
    const steps = createPersonRefreshPipelineSteps("reprocess");
    const metadataRepair = steps.find((step) => step.id === "metadata_repair");
    expect(metadataRepair).toBeDefined();
    expect(metadataRepair?.label).toBe("Fixing IMDb Details");
  });

  it("limits ingest mode to sync-and-mirror stages", () => {
    const steps = createPersonRefreshPipelineSteps("ingest");
    expect(steps.map((step) => step.id)).toEqual([
      "profiles",
      "source_sync",
      "metadata_enrichment",
      "upserting",
      "metadata_repair",
      "mirroring",
    ]);
  });

  it("routes Getty / NBCUMV stage updates into Source Sync", () => {
    const initial = createPersonRefreshPipelineSteps("ingest");
    const updated = updatePersonRefreshPipelineSteps(initial, {
      rawStage: "nbcumv_import",
      message: "Importing NBCUMV press photos...",
      current: 12,
      total: 40,
    });

    const sourceSyncStep = updated.find((step) => step.id === "source_sync");
    expect(sourceSyncStep?.label).toBe("Source Sync");
    expect(sourceSyncStep?.status).toBe("running");
    expect(sourceSyncStep?.current).toBe(12);
    expect(sourceSyncStep?.total).toBe(40);
  });

  it("finalizes step summaries with completed vs failed details", () => {
    const initial = createPersonRefreshPipelineSteps("refresh");
    const finalized = finalizePersonRefreshPipelineSteps(initial, "refresh", {
      photos_fetched: 12,
      photos_upserted: 10,
      photos_mirrored: 8,
      hosting_hosted_total: 8,
      hosting_failed_total: 1,
      auto_counts_attempted: 9,
      auto_counts_succeeded: 7,
      auto_counts_failed: 2,
      text_overlay_attempted: 8,
      text_overlay_succeeded: 8,
      text_overlay_unknown: 0,
      text_overlay_failed: 0,
      centering_attempted: 7,
      centering_succeeded: 7,
      centering_failed: 0,
      centering_skipped_manual: 1,
      resize_attempted: 9,
      resize_succeeded: 8,
      resize_failed: 1,
      resize_crop_attempted: 9,
      resize_crop_succeeded: 8,
      resize_crop_failed: 1,
    });

    const sourceSync = finalized.find((step) => step.id === "source_sync");
    const autoCount = finalized.find((step) => step.id === "auto_count");
    const mirroring = finalized.find((step) => step.id === "mirroring");

    expect(sourceSync?.result).toContain("Fetched 12 photos");
    expect(autoCount?.result).toContain("Saved tagging for 7/9 images");
    expect(mirroring?.status).toBe("warning");
    expect(mirroring?.result).toContain("Hosted 8 assets (1 failed)");
  });

  it("finalizes ingest summaries without downstream reprocess stages", () => {
    const initial = createPersonRefreshPipelineSteps("ingest");
    const finalized = finalizePersonRefreshPipelineSteps(initial, "ingest", {
      photos_fetched: 89,
      photos_upserted: 46,
      photos_mirrored: 12,
      hosting_hosted_total: 12,
      hosting_failed_total: 0,
      existing_imdb_rows_repaired: 7,
      metadata_enrichment_failed: 0,
      episode_metadata_tagged: 27,
      show_context_tagged: 0,
    });

    expect(finalized.find((step) => step.id === "source_sync")?.result).toContain("Fetched 89 photos");
    expect(finalized.find((step) => step.id === "mirroring")?.result).toContain("Hosted 12 assets");
    expect(finalized.find((step) => step.id === "metadata_repair")?.result).toContain("Repaired 7 IMDb rows");
    expect(finalized.some((step) => step.id === "auto_count")).toBe(false);
    expect(finalized.some((step) => step.id === "resizing")).toBe(false);
  });

  it("does not mark hosting failed from global photos_failed when hosting summary is clean", () => {
    const initial = createPersonRefreshPipelineSteps("ingest");
    const finalized = finalizePersonRefreshPipelineSteps(initial, "ingest", {
      photos_fetched: 1096,
      photos_upserted: 35,
      photos_mirrored: 35,
      photos_failed: 2,
      hosting_hosted_total: 35,
      hosting_failed_total: 0,
      hosting_skipped_total: 95,
    });

    const mirroring = finalized.find((step) => step.id === "mirroring");
    expect(mirroring?.status).toBe("completed");
    expect(mirroring?.result).toBe("Hosted 35 assets (0 failed)");
  });

  it("finalizes reprocess metadata repair summary", () => {
    const initial = createPersonRefreshPipelineSteps("reprocess");
    const finalized = finalizePersonRefreshPipelineSteps(initial, "reprocess", {
      metadata_repair_attempted: 1,
      existing_imdb_rows_repaired: 5,
      metadata_enrichment_failed: 0,
      auto_counts_attempted: 0,
      auto_counts_succeeded: 0,
      auto_counts_failed: 0,
      text_overlay_attempted: 0,
      text_overlay_succeeded: 0,
      text_overlay_unknown: 0,
      text_overlay_failed: 0,
      centering_attempted: 0,
      centering_succeeded: 0,
      centering_failed: 0,
      centering_skipped_manual: 0,
      resize_attempted: 0,
      resize_succeeded: 0,
      resize_failed: 0,
      resize_crop_attempted: 0,
      resize_crop_succeeded: 0,
      resize_crop_failed: 0,
    });

    const metadataRepair = finalized.find((step) => step.id === "metadata_repair");
    expect(metadataRepair?.status).toBe("completed");
    expect(metadataRepair?.result).toContain("Repaired 5 IMDb rows");
  });

  it("marks tagging completed with reviewed existing rows when attempted count is zero", () => {
    const initial = createPersonRefreshPipelineSteps("reprocess");
    const finalized = finalizePersonRefreshPipelineSteps(initial, "reprocess", {
      metadata_repair_attempted: 0,
      existing_imdb_rows_repaired: 0,
      metadata_enrichment_failed: 0,
      auto_counts_attempted: 0,
      auto_counts_succeeded: 0,
      auto_counts_failed: 0,
      auto_count_attempted_rows: 0,
      auto_count_skipped_existing_rows: 306,
      text_overlay_attempted: 0,
      text_overlay_succeeded: 0,
      text_overlay_unknown: 0,
      text_overlay_failed: 0,
      centering_attempted: 0,
      centering_succeeded: 0,
      centering_failed: 0,
      centering_skipped_manual: 0,
      resize_attempted: 0,
      resize_succeeded: 0,
      resize_failed: 0,
      resize_crop_attempted: 0,
      resize_crop_succeeded: 0,
      resize_crop_failed: 0,
    });

    const autoCount = finalized.find((step) => step.id === "auto_count");
    expect(autoCount?.status).toBe("completed");
    expect(autoCount?.result).toContain("Reviewed 306 existing rows");
  });

  it("formats Modal dispatch events for queued operations", () => {
    expect(
      buildOperationDispatchDetailMessage({
        eventType: "dispatched_to_modal",
        executionOwner: "remote_worker",
        executionBackendCanonical: "modal",
        executionModeCanonical: "remote",
      }),
    ).toBe("Queued for Modal worker ownership (remote worker · Modal · remote).");
  });

  it("formats attached operation events for resumed worker-backed refreshes", () => {
    expect(
      buildOperationDispatchDetailMessage({
        eventType: "operation",
        attached: true,
        executionOwner: "remote_worker",
        executionBackendCanonical: "modal",
        executionModeCanonical: "remote",
      }),
    ).toBe("Attached to existing refresh operation (remote worker · Modal · remote).");
  });
});
