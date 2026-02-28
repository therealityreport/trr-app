import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("social week detail wiring", () => {
  it("forwards season_id and timezone in week detail fetch", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/season_id/);
    expect(contents).toMatch(/timezone:\s*SOCIAL_TIME_ZONE/);
    expect(contents).toMatch(/social\/analytics\/week\/\$\{weekIndex\}\?/);
  });

  it("includes season_id in week ingest and poll requests", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
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
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const REQUEST_TIMEOUT_MS = \{/);
    expect(contents).toMatch(/const fetchWithTimeout = async/);
    expect(contents).toMatch(/Week detail request timed out/);
    expect(contents).toMatch(/Sync runs request timed out/);
    expect(contents).toMatch(/Sync jobs request timed out/);
    expect(contents).toMatch(/SYNC_POLL_BACKOFF_MS/);
    expect(contents).toMatch(/syncPollFailureCountRef/);
    expect(contents).toMatch(/syncPollFailureCountRef\.current >= 2 && !isTransientDevRestartMessage\(message\)/);
  });

  it("keeps transient dev-restart poll failures below retry-banner threshold", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const TRANSIENT_DEV_RESTART_PATTERNS = \[/);
    expect(contents).toMatch(/isTransientDevRestartMessage/);
    expect(contents).toMatch(/syncPollFailureCountRef\.current = Math\.max\(1, syncPollFailureCountRef\.current\)/);
  });

  it("preserves social_view and social_platform in back link query", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/query\.set\("social_platform", socialPlatform\)/);
    expect(contents).toMatch(/normalizedSocialView/);
    expect(contents).toMatch(/query\.set\("social_view", normalizedSocialView\)/);
    expect(contents).not.toMatch(/query\.set\("season_id", resolvedSeasonId\)/);
  });

  it("canonicalizes legacy social_platform query links to platform path URLs", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/nextQuery\.delete\("social_platform"\)/);
    expect(contents).toMatch(/platform:\s*socialPlatformFromQuery/);
    expect(contents).toMatch(/router\.replace\(\s*buildSeasonSocialWeekUrl\(/s);
  });

  it("canonicalizes legacy /social/week/{n} paths to /social/w{n}/{subtab}", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/pathname\.includes\(\"\/social\/week\/\"\)/);
    expect(contents).toMatch(/legacyWeekPathRedirectRef/);
    expect(contents).toMatch(/buildSeasonSocialWeekUrl\(\{/);
  });

  it("keeps canonical platform path while mutating week-detail query params", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/platform:\s*socialPlatform \?\? undefined/);
    expect(contents).toMatch(/buildSeasonSocialWeekUrl\(\{\s*showSlug:\s*showSlugForRouting,/s);
  });

  it("wires deep social breadcrumbs with linked show and social ancestors", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/buildShowAdminUrl\(\{ showSlug: showSlugForRouting \}\)/);
    expect(contents).toMatch(/showHref:\s*breadcrumbShowHref/);
    expect(contents).toMatch(/seasonHref:\s*breadcrumbSeasonHref/);
    expect(contents).toMatch(/socialHref:\s*breadcrumbSocialHref/);
    expect(contents).toMatch(/subTabLabel:\s*breadcrumbSubTabLabel/);
    expect(contents).toMatch(/buildSeasonWeekBreadcrumb\(/);
  });

  it("uses stable job ids for sync log row keys", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/syncLogs\.map\(\(entry\) => \(/);
    expect(contents).toMatch(/key=\{entry\.id\}/);
    expect(contents).not.toMatch(/key=\{`\$\{line\}-\$\{index\}`\}/);
  });
});
