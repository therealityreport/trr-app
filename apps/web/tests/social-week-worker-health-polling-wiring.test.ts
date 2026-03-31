import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("social week worker-health polling wiring", () => {
  it("uses a visibility-aware timeout loop instead of a fixed interval", () => {
    const filePath = path.resolve(__dirname, "../src/components/admin/social-week/WeekDetailPageView.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toContain("document.addEventListener(\"visibilitychange\", handleVisibilityChange)");
    expect(contents).toContain("window.setTimeout(() => {");
    expect(contents).not.toContain("window.setInterval(() => {");
  });
});
