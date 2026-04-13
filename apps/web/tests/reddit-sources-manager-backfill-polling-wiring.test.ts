import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("reddit sources manager backfill polling wiring", () => {
  it("pauses backfill polling when the document is hidden", () => {
    const filePath = path.resolve(__dirname, "../src/components/admin/reddit-sources-manager.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    // Visibility handler is wired into the document.
    expect(contents).toContain("document.addEventListener(\"visibilitychange\", handleVisibility)");
    // Handler maps the current visibility to the isTabVisible React state.
    expect(contents).toContain("setIsTabVisible(document.visibilityState === \"visible\")");
    // At least one effect bails early when the tab is not visible, which pauses
    // the work that would otherwise enqueue the next poll.
    expect(contents).toContain("if (!isTabVisible) return;");
  });
});
