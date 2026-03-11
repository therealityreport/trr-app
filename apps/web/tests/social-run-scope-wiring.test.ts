import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("social run scope wiring", () => {
  it("scopes season social runs and summaries to the current platform and window", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/season-social-analytics-section.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const appendCurrentRunScopeParams = useCallback/);
    expect(contents).toMatch(/params\.set\("platforms", effectivePlatform\)/);
    expect(contents).toMatch(/params\.set\("week_index", String\(effectiveWeek\)\)/);
    expect(contents).toMatch(/params\.set\("date_start", weekWindow\.start\)/);
    expect(contents).toMatch(/params\.set\("date_end", weekWindow\.end\)/);
    expect(contents).toMatch(/appendCurrentRunScopeParams\(params\);/);
  });

  it("uses single-runner coarse scheduling for bounded single-platform season syncs", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/season-social-analytics-section.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const requestedPlatforms =/);
    expect(contents).toMatch(/const singlePlatform = requestedPlatforms\.length === 1/);
    expect(contents).toMatch(/payload\.runner_strategy = "single_runner"/);
    expect(contents).toMatch(/payload\.window_shard_hours =\s*singlePlatformTarget === "instagram" \|\| singlePlatformTarget === "tiktok" \? 12 : 24/);
  });

  it("scopes week-detail sync recovery and manual attach queries to the current tab window", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const appendSyncRunScopeParams = useCallback/);
    expect(contents).toMatch(/params\.append\("platforms", platform\)/);
    expect(contents).toMatch(/params\.set\("week_index", String\(weekIndexInt\)\)/);
    expect(contents).toMatch(/appendSyncRunScopeParams\(runsParams, \{/);
    expect(contents).toMatch(/appendSyncRunScopeParams\(runsParams\);/);
  });
});
