import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("legacy networks summary polling wiring", () => {
  it("uses visibility-aware timeout polling instead of a permanent interval", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/networks/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toContain("document.addEventListener(\"visibilitychange\", handleVisibilityChange)");
    expect(contents).toContain("window.setTimeout(() => {");
    expect(contents).not.toContain("window.setInterval(pollSummary, 15_000)");
  });
});
