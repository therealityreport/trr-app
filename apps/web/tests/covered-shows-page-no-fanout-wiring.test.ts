import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("covered shows page enriched payload wiring", () => {
  const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/page.tsx");
  const contents = fs.readFileSync(filePath, "utf8");

  it("uses covered-shows payload metadata directly", () => {
    expect(contents).toMatch(/show\.canonical_slug/);
    expect(contents).toMatch(/show\.show_total_episodes/);
    expect(contents).toMatch(/show\.poster_url/);
  });

  it("does not fan out to per-show seasons/show endpoints for covered card metadata", () => {
    expect(contents).not.toMatch(/\/api\/admin\/trr-api\/shows\/\$\{trrShowId\}\/seasons\?limit=50/);
    expect(contents).not.toMatch(/\/api\/admin\/trr-api\/shows\/\$\{trrShowId\}/);
  });
});
