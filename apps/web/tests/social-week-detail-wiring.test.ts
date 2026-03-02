import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("social week detail wiring", () => {
  it("uses speed-first week route retry/timeout defaults", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/max_comments_per_post",\s*"0"/);
    expect(contents).toMatch(/retries:\s*0/);
    expect(contents).toMatch(/timeoutMs:\s*40_000/);
  });

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
    expect(contents).toMatch(/ingestKickoff:\s*25_000/);
    expect(contents).toMatch(/Ingest kickoff request timed out/);
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

  it("uses season social header chrome wiring with official analytics context", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/SocialAdminPageHeader/);
    expect(contents).toMatch(/buildSeasonSocialBreadcrumb/);
    expect(contents).toMatch(/subTabLabel:\s*"Official Analytics"/);
    expect(contents).toMatch(/SeasonTabsNav tabs=\{SEASON_PAGE_TABS\} activeTab="social" onSelect=\{handleSeasonTabSelect\}/);
    expect(contents).toMatch(/SEASON_SOCIAL_ANALYTICS_VIEWS/);
  });

  it("canonicalizes legacy social_platform query links to platform path URLs", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/nextQuery\.delete\("social_platform"\)/);
    expect(contents).toMatch(/platform:\s*socialPlatformFromQuery/);
    expect(contents).toMatch(/compareAndReplaceGuarded\(nextRoute\)/);
    expect(contents).toMatch(/router\.replace\(nextRoute as Route,\s*{ scroll: false }\);/);
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

  it("uses local state for platform tab clicks without week-route replacement", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/onClick=\{\(\) => \{\s*setPlatformFilter\(tab\.key\);\s*\}\}/s);
    expect(contents).not.toMatch(
      /onClick=\{\(\) => \{\s*setPlatformFilter\(tab\.key\);[\s\S]*buildSeasonSocialWeekUrl\(\{[\s\S]*\}\);[\s\S]*compareAndReplaceGuarded\(nextRoute\);[\s\S]*\}\}/s,
    );
  });

  it("guards duplicate route replacements to avoid replace loops", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const lastRouteReplaceAttemptRef = useRef<string \| null>\(null\)/);
    expect(contents).toMatch(/const compareAndReplaceGuarded = useCallback\(/);
    expect(contents).toMatch(/if \(lastRouteReplaceAttemptRef\.current === canonicalNextRoute\) return;/);
    expect(contents).toMatch(/lastRouteReplaceAttemptRef\.current = canonicalCurrentRoute;/);
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
    expect(contents).toMatch(/subTabLabel:\s*"Official Analytics"/);
    expect(contents).toMatch(/buildSeasonSocialBreadcrumb\(/);
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

  it("renders additive refresh diagnostics and youtube transcript metadata", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/refresh\.comment_gap/);
    expect(contents).toMatch(/Refresh completed with warnings:/);
    expect(contents).toMatch(/Transcript/);
    expect(contents).toMatch(/Media Asset Metadata/);
  });
});
