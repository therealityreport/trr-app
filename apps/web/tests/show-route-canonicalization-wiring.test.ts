import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show route canonicalization wiring", () => {
  it("promotes root default details routes to /credits when the rendered tab is Credits", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const canonicalShowTab =/);
    expect(contents).toMatch(/showRouteState\.tab === "details"/);
    expect(contents).toMatch(/showRouteState\.source === "default"/);
    expect(contents).toMatch(/activeTab === "cast"/);
    expect(contents).toMatch(/tab: canonicalShowTab,/);
  });

  it("continues to route social canonical replacements from the canonical tab variable", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/if \(canonicalShowTab === "social"\)/);
    expect(contents).toMatch(/socialView: canonicalShowTab === "social" \? socialAnalyticsView : undefined/);
  });
});
