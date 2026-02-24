import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("social week detail wiring", () => {
  it("forwards season_id and timezone in week detail fetch", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/season_id/);
    expect(contents).toMatch(/timezone:\s*SOCIAL_TIME_ZONE/);
    expect(contents).toMatch(/social\/analytics\/week\/\$\{weekIndex\}\?/);
  });

  it("includes season_id in week ingest and poll requests", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/social\/runs\?\$\{runParams\.toString\(\)\}/);
    expect(contents).toMatch(/social\/jobs\?\$\{jobsParams\.toString\(\)\}/);
    expect(contents).toMatch(/social\/ingest\$\{ingestParams\.toString\(\) \? `\?\$\{ingestParams\.toString\(\)\}` : ""\}/);
    expect(contents).toMatch(/runParams = new URLSearchParams\(\{\s*source_scope:\s*sourceScope,\s*run_id:\s*runId,\s*limit:\s*"1"/s);
  });

  it("uses timeout-bounded fetches for week detail and sync polling", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const REQUEST_TIMEOUT_MS = \{/);
    expect(contents).toMatch(/const fetchWithTimeout = async/);
    expect(contents).toMatch(/Week detail request timed out/);
    expect(contents).toMatch(/Sync runs request timed out/);
    expect(contents).toMatch(/Sync jobs request timed out/);
    expect(contents).toMatch(/SYNC_POLL_BACKOFF_MS/);
    expect(contents).toMatch(/syncPollFailureCountRef/);
    expect(contents).toMatch(/if \(syncPollFailureCountRef\.current >= 2\)/);
  });

  it("preserves social_view and social_platform in back link query", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/query\.set\("social_platform", socialPlatform\)/);
    expect(contents).toMatch(/query\.set\("social_view", socialView\)/);
    expect(contents).toMatch(/query\.set\("season_id", resolvedSeasonId\)/);
  });

  it("wires a clickable show breadcrumb back to the show admin page", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/buildShowAdminUrl\(\{ showSlug: showSlugForRouting \}\)/);
    expect(contents).toMatch(/showHref:\s*breadcrumbShowHref/);
    expect(contents).toMatch(/buildSeasonWeekBreadcrumb\(/);
  });

  it("uses stable job ids for sync log row keys", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/social/week/[weekIndex]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/syncLogs\.map\(\(entry\) => \(/);
    expect(contents).toMatch(/key=\{entry\.id\}/);
    expect(contents).not.toMatch(/key=\{`\$\{line\}-\$\{index\}`\}/);
  });
});
