import {
  buildPipelineRows,
  isRefreshLogTerminalSuccess,
  resolveRefreshLogTopicKey,
  shouldDedupeRefreshLogEntry,
  type RefreshLogTopicDefinition,
} from "@/lib/admin/refresh-log-pipeline";

describe("refresh log pipeline helpers", () => {
  it("prefers structured topic over stage/category/message heuristics", () => {
    expect(
      resolveRefreshLogTopicKey({
        topic: "cast_media",
        stageKey: "details_sync_shows",
        category: "Show Info",
        message: "details sync shows: success",
      })
    ).toBe("cast_media");
  });

  it("falls back to stage mapping and then text heuristics", () => {
    expect(
      resolveRefreshLogTopicKey({
        stageKey: "cast_credits_episode_appearances",
        category: "Cast & Credits",
        message: "episode appearances synced",
      })
    ).toBe("show_core");

    expect(
      resolveRefreshLogTopicKey({
        category: "Refresh",
        message: "episode sync complete",
      })
    ).toBeNull();
    });

  it("does not map generic full-refresh wrapper messages to pipeline topics", () => {
    expect(
      resolveRefreshLogTopicKey({
        category: "Refresh",
        message: "Completed full refresh successfully.",
      })
    ).toBeNull();
  });

  it("builds fixed-order rows from topic definitions", () => {
    const definitions: RefreshLogTopicDefinition[] = [
      { key: "show_core", label: "SHOW CORE", description: "Show info" },
      { key: "links", label: "LINKS", description: "Link sync" },
      { key: "bravo", label: "BRAVO", description: "Bravo sync" },
      { key: "cast_profiles", label: "CAST PROFILES", description: "Profile sync" },
      { key: "cast_media", label: "CAST MEDIA", description: "Media sync" },
    ];

    const rows = buildPipelineRows(definitions, [
      { topic: { key: "cast_media" }, status: "active", latest: { id: "m1" } },
      { topic: { key: "show_core" }, status: "done", latest: { id: "s1" } },
    ]);

    expect(rows.map((row) => row.topic.key)).toEqual([
      "show_core",
      "links",
      "bravo",
      "cast_profiles",
      "cast_media",
    ]);
    expect(rows[0].status).toBe("done");
    expect(rows[4].status).toBe("active");
  });

  it("dedupes equivalent wrapper/stream updates by topic-stage-message-progress", () => {
    const shouldDedupe = shouldDedupeRefreshLogEntry(
      {
        category: "Show Info",
        topic: "show_core",
        stageKey: "details_sync_shows",
        message: "Show Info: details sync shows: success",
        current: 1,
        total: 4,
      },
      {
        category: "Refresh",
        topic: "show_core",
        stageKey: "details_sync_shows",
        message: "Show Info: details sync shows: success",
        current: 1,
        total: 4,
      }
    );

    expect(shouldDedupe).toBe(true);
    expect(
      shouldDedupeRefreshLogEntry(
        {
          category: "Show Info",
          topic: "show_core",
          stageKey: "details_sync_shows",
          message: "Show Info: details sync shows: success",
          current: 1,
          total: 4,
        },
        {
          category: "Show Info",
          topic: "show_core",
          stageKey: "details_tmdb_show_entities",
          message: "Show Entities: done",
          current: 2,
          total: 4,
        }
      )
    ).toBe(false);
  });

  it("treats only terminal completion tokens as done", () => {
    expect(
      isRefreshLogTerminalSuccess({
        message: "Synced 6/33 cast members.",
        current: 6,
        total: 33,
      })
    ).toBe(false);

    expect(
      isRefreshLogTerminalSuccess({
        message: "Completed cast profile/media sync.",
        current: 33,
        total: 33,
      })
    ).toBe(true);
  });
});
