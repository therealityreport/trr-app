import { describe, expect, it } from "vitest";

import {
  formatCastBatchCounts,
  formatCastBatchMemberMessage,
  formatCastBatchRunningMessage,
} from "@/lib/admin/cast-batch-progress";

describe("cast batch progress helpers", () => {
  it("formats completed-count semantics with in-flight detail", () => {
    expect(formatCastBatchCounts({ completed: 6, total: 33, inFlight: 3 })).toBe(
      "completed 6/33, in-flight 3"
    );
    expect(
      formatCastBatchMemberMessage("Seth Marks", { completed: 6, total: 33, inFlight: 3 })
    ).toBe("Syncing Seth Marks... (completed 6/33, in-flight 3)");
    expect(formatCastBatchRunningMessage({ completed: 6, total: 33, inFlight: 3 })).toBe(
      "Syncing cast profiles/media... (completed 6/33, in-flight 3)"
    );
  });
});
