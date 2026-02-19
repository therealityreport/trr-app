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
        topic: "media",
        stageKey: "details_sync_shows",
        category: "Show Info",
        message: "details sync shows: success",
      })
    ).toBe("media");
  });

  it("falls back to stage mapping and then text heuristics", () => {
    expect(
      resolveRefreshLogTopicKey({
        stageKey: "cast_credits_episode_appearances",
        category: "Cast & Credits",
        message: "episode appearances synced",
      })
    ).toBe("episodes");

    expect(
      resolveRefreshLogTopicKey({
        category: "Refresh",
        message: "episode sync complete",
      })
    ).toBe("episodes");
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
      { key: "shows", label: "SHOWS", description: "Show info" },
      { key: "seasons", label: "SEASONS", description: "Season sync" },
      { key: "episodes", label: "EPISODES", description: "Episode sync" },
      { key: "people", label: "PEOPLE", description: "Cast sync" },
      { key: "media", label: "MEDIA", description: "Media sync" },
      { key: "bravotv", label: "BRAVOTV", description: "Bravo actions" },
    ];

    const rows = buildPipelineRows(definitions, [
      { topic: { key: "media" }, status: "active", latest: { id: "m1" } },
      { topic: { key: "shows" }, status: "done", latest: { id: "s1" } },
    ]);

    expect(rows.map((row) => row.topic.key)).toEqual([
      "shows",
      "seasons",
      "episodes",
      "people",
      "media",
      "bravotv",
    ]);
    expect(rows[0].status).toBe("done");
    expect(rows[4].status).toBe("active");
    expect(rows[5].status).toBe("pending");
  });

  it("dedupes equivalent wrapper/stream updates by topic-stage-message-progress", () => {
    const shouldDedupe = shouldDedupeRefreshLogEntry(
      {
        category: "Show Info",
        topic: "shows",
        stageKey: "details_sync_shows",
        message: "Show Info: details sync shows: success",
        current: 1,
        total: 4,
      },
      {
        category: "Refresh",
        topic: "shows",
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
          topic: "shows",
          stageKey: "details_sync_shows",
          message: "Show Info: details sync shows: success",
          current: 1,
          total: 4,
        },
        {
          category: "Show Info",
          topic: "shows",
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
