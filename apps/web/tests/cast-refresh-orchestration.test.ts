import { describe, expect, it, vi } from "vitest";

import {
  CastRefreshPhaseTimeoutError,
  runCastEnrichMediaWorkflow,
  runPhasedCastRefresh,
  runCastRefreshWorkflow,
} from "@/lib/admin/cast-refresh-orchestration";

describe("cast refresh orchestration", () => {
  it("runs refresh sequence in fixed order", async () => {
    const order: string[] = [];
    const members = [{ person_id: "person-1" }, { person_id: "person-2" }];

    await runCastRefreshWorkflow({
      refreshCastCredits: async () => {
        order.push("cast_credits");
      },
      syncCastMatrixRoles: async () => {
        order.push("cast_matrix");
      },
      fetchCastMembers: async () => {
        order.push("fetch_cast");
        return members;
      },
      ingestCastMemberMedia: async (incoming) => {
        order.push(`ingest:${incoming.length}`);
      },
    });

    expect(order).toEqual(["cast_credits", "cast_matrix", "fetch_cast", "ingest:2"]);
  });

  it("enrich workflow uses reprocess media path and never calls source ingest", async () => {
    const members = [{ person_id: "person-1" }];
    const ingestCastMemberMedia = vi.fn(async () => undefined);
    const reprocessCastMemberMedia = vi.fn(async () => undefined);

    await runCastEnrichMediaWorkflow({
      fetchCastMembers: async () => members,
      ingestCastMemberMedia,
      reprocessCastMemberMedia,
    });

    expect(reprocessCastMemberMedia).toHaveBeenCalledTimes(1);
    expect(reprocessCastMemberMedia).toHaveBeenCalledWith(members);
    expect(ingestCastMemberMedia).not.toHaveBeenCalled();
  });

  it("allows final success notice only after ingest phase completes", async () => {
    const events: string[] = [];
    const members = [{ person_id: "person-1" }];

    await runCastRefreshWorkflow({
      refreshCastCredits: async () => {
        events.push("phase_1_complete");
      },
      syncCastMatrixRoles: async () => {
        events.push("phase_2_complete");
      },
      fetchCastMembers: async () => {
        events.push("phase_3_complete");
        return members;
      },
      ingestCastMemberMedia: async () => {
        events.push("phase_4_complete");
      },
    });

    events.push("final_success_notice");
    expect(events).toEqual([
      "phase_1_complete",
      "phase_2_complete",
      "phase_3_complete",
      "phase_4_complete",
      "final_success_notice",
    ]);
  });

  it("runs phased cast refresh in fixed order and emits completed statuses", async () => {
    const events: string[] = [];
    const snapshots: string[][] = [];

    const states = await runPhasedCastRefresh({
      phases: [
        {
          id: "credits_sync",
          label: "Credits",
          timeoutMs: 1_000,
          run: async ({ updateProgress }) => {
            updateProgress({ current: 1, total: 1, message: "done credits" });
            events.push("credits");
          },
        },
        {
          id: "profile_links_sync",
          label: "Links",
          timeoutMs: 1_000,
          run: async () => {
            events.push("links");
          },
        },
      ],
      onPhaseStatesChange: (phaseStates) => {
        snapshots.push(phaseStates.map((state) => state.status));
      },
    });

    expect(events).toEqual(["credits", "links"]);
    expect(states.map((state) => state.status)).toEqual(["completed", "completed"]);
    expect(snapshots.length).toBeGreaterThan(0);
  });

  it("marks timeout and stops execution when a phase exceeds timeout budget", async () => {
    const events: string[] = [];
    const snapshots: string[][] = [];

    await expect(
      runPhasedCastRefresh({
        phases: [
          {
            id: "credits_sync",
            label: "Credits",
            timeoutMs: 5,
            run: async () => {
              await new Promise((resolve) => setTimeout(resolve, 30));
              events.push("credits");
            },
          },
          {
            id: "profile_links_sync",
            label: "Links",
            timeoutMs: 1_000,
            run: async () => {
              events.push("links");
            },
          },
        ],
        onPhaseStatesChange: (phaseStates) => {
          snapshots.push(phaseStates.map((state) => state.status));
        },
      })
    ).rejects.toBeInstanceOf(CastRefreshPhaseTimeoutError);

    expect(events).toEqual([]);
    const latestSnapshot = snapshots[snapshots.length - 1] ?? [];
    expect(latestSnapshot[0]).toBe("timed_out");
    expect(latestSnapshot[1]).toBe("pending");
  });

  it("supports external cancel signal and stops before next phase", async () => {
    const controller = new AbortController();
    const events: string[] = [];

    const runPromise = runPhasedCastRefresh({
      phases: [
        {
          id: "credits_sync",
          label: "Credits",
          timeoutMs: 1_000,
          run: async () => {
            events.push("credits-started");
            controller.abort();
            await new Promise((resolve) => setTimeout(resolve, 20));
            events.push("credits-finished");
          },
        },
        {
          id: "profile_links_sync",
          label: "Links",
          timeoutMs: 1_000,
          run: async () => {
            events.push("links-started");
          },
        },
      ],
      signal: controller.signal,
    });

    await expect(runPromise).rejects.toThrow(/canceled/i);
    expect(events).not.toContain("links-started");
  });
});
