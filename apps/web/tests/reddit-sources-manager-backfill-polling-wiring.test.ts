import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("reddit sources manager backfill polling wiring", () => {
  it("pauses backfill polling when the document is hidden", () => {
    const filePath = path.resolve(__dirname, "../src/components/admin/reddit-sources-manager.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toContain("document.addEventListener(\"visibilitychange\", handleVisibilityChange)");
    expect(contents).toContain("document.visibilityState === \"hidden\"");
    expect(contents).toContain("scheduleNextPoll();");
  });
});
