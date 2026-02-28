import { describe, expect, it } from "vitest";

import {
  buildProxyConnectDetailMessage,
  buildProxyTerminalErrorMessage,
  buildPersonRefreshDetailMessage,
  createPersonRefreshPipelineSteps,
  createSyncProgressTracker,
  finalizePersonRefreshPipelineSteps,
  formatRefreshSourceLabel,
  formatPersonRefreshPhaseLabel,
  mapPersonRefreshStage,
  PERSON_REFRESH_PHASES,
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
  });

  it("maps mirror/count/text stages to requested labels", () => {
    expect(mapPersonRefreshStage("mirroring")).toBe(PERSON_REFRESH_PHASES.mirroring);
    expect(mapPersonRefreshStage("auto_count")).toBe(PERSON_REFRESH_PHASES.counting);
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
    ).toBe("Syncing IMDb... · mirrored 24/50 · step 0/4 · 6s elapsed");
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

  it("finalizes step summaries with completed vs failed details", () => {
    const initial = createPersonRefreshPipelineSteps("refresh");
    const finalized = finalizePersonRefreshPipelineSteps(initial, "refresh", {
      photos_fetched: 12,
      photos_upserted: 10,
      photos_mirrored: 8,
      photos_failed: 1,
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
    expect(autoCount?.result).toContain("Saved people tags for 7/9 images");
    expect(mirroring?.status).toBe("failed");
  });
});
