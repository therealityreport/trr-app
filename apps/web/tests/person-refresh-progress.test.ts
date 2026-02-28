import { describe, expect, it } from "vitest";

import {
  buildPersonRefreshDetailMessage,
  createSyncProgressTracker,
  formatRefreshSourceLabel,
  formatPersonRefreshPhaseLabel,
  mapPersonRefreshStage,
  PERSON_REFRESH_PHASES,
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
});
