import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season social analytics polling wiring", () => {
  it("gates hidden-tab polling behind visibility-aware timeout loops", () => {
    const filePath = path.resolve(__dirname, "../src/components/admin/season-social-analytics-section.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toContain("document.addEventListener(\"visibilitychange\", handleVisibilityChange)");
    expect(contents).toContain("if (DEV_LOW_HEAT_MODE && !isDocumentVisible) return;");
    expect(contents).toContain("const delay = pollFailureCountRef.current > 0 ? LIVE_POLL_BACKOFF_MS[failureIndex] : baseInterval;");
  });
});
