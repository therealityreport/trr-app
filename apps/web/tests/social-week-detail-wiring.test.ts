import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

const sourceBetween = (contents: string, start: string, end: string): string => {
  const startIndex = contents.indexOf(start);
  expect(startIndex, `Expected source to contain start marker: ${start}`).toBeGreaterThanOrEqual(0);
  const endIndex = contents.indexOf(end, startIndex + start.length);
  expect(endIndex, `Expected source to contain end marker after ${start}: ${end}`).toBeGreaterThan(startIndex);
  return contents.slice(startIndex, endIndex);
};

const expectInOrder = (contents: string, snippets: string[]): void => {
  let previousIndex = -1;
  for (const snippet of snippets) {
    const nextIndex = contents.indexOf(snippet, previousIndex + 1);
    expect(nextIndex, `Expected source to contain snippet after index ${previousIndex}: ${snippet}`).toBeGreaterThan(
      previousIndex,
    );
    previousIndex = nextIndex;
  }
};

describe("social week detail wiring", () => {
  it("uses speed-first week route retry/timeout defaults", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route.ts",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/max_comments_per_post",\s*"0"/);
    expect(contents).toMatch(/include_status",\s*"false"/);
    expect(contents).toMatch(/retries:\s*0/);
    expect(contents).toMatch(/timeoutMs:\s*40_000/);
  });

  it("caps the initial client week detail comment preview load", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const WEEK_DETAIL_MAX_COMMENTS_PER_POST = 25/);
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

  it("defaults first paint sorting to posted_at desc", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/useState<SortField>\("posted_at"\)/);
    expect(contents).toMatch(/useState<SortDir>\("desc"\)/);
  });

  it("defers metrics fetch until idle time after the main week payload loads", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/requestIdleCallback/);
    expect(contents).toMatch(/triggerMetricsFetch/);
    expect(contents).toMatch(/setTimeout\(\(\) => \{\s*triggerMetricsFetch\(\);\s*\}, 1500\)/s);
    expect(contents).not.toMatch(/useEffect\(\(\) => \{\s*void fetchWeekMetricsPosts\(\);\s*\}, \[fetchWeekMetricsPosts\]\);/s);
  });

  it("includes season_id in week ingest and poll requests", () => {
    const contents = readSource("../src/components/admin/social-week/WeekDetailPageView.tsx");

    const runProgressBlock = sourceBetween(
      contents,
      "const progressParams = new URLSearchParams({ recent_log_limit: \"40\" });",
      "const progressPayload = await parseResponseJson<RunProgressSnapshot>(",
    );
    expectInOrder(runProgressBlock, [
      "const progressParams = new URLSearchParams({ recent_log_limit: \"40\" });",
      "if (resolvedSeasonId) {",
      "progressParams.set(\"season_id\", resolvedSeasonId);",
      "social/runs/${runId}/progress?${progressParams.toString()}",
      "REQUEST_TIMEOUT_MS.runProgress",
    ]);

    const syncSessionKickoffBlock = sourceBetween(
      contents,
      "const ingestParams = new URLSearchParams();",
      "const adoptRun = (runId: string | null, syncSessionIdValue: string, operationId?: string | null) => {",
    );
    expectInOrder(syncSessionKickoffBlock, [
      "const ingestParams = new URLSearchParams();",
      "if (resolvedSeasonId) {",
      "ingestParams.set(\"season_id\", resolvedSeasonId);",
      "social/sync-sessions${ingestParams.toString() ? `?${ingestParams.toString()}` : \"\"}",
    ]);

    const syncSessionPollBlock = sourceBetween(
      contents,
      "const fetchSyncSessionProgress = useCallback(",
      "const fetchCommentsCoverage = useCallback",
    );
    expectInOrder(syncSessionPollBlock, [
      "if (resolvedSeasonId) {",
      "params.set(\"season_id\", resolvedSeasonId);",
      "social/sync-sessions/${sessionId}${params.toString() ? `?${params.toString()}` : \"\"}",
      "REQUEST_TIMEOUT_MS.syncRuns",
    ]);

    const syncSessionStreamBlock = sourceBetween(
      contents,
      "const syncSessionStream = useSharedSseResource<SocialSyncSessionStreamPayload>({",
      "useEffect(() => {",
    );
    expect(syncSessionStreamBlock).toContain(
      "social/sync-sessions/${syncSessionId}/stream${resolvedSeasonId ? `?season_id=${encodeURIComponent(resolvedSeasonId)}` : \"\"}",
    );
  });

  it("uses the active day filter when kicking off a sync session", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const scopedDayRange = activeDayFilter \? buildIsoDayRange\(activeDayFilter\) : null;/);
    expect(contents).toMatch(/const syncWindow = scopedDayRange \?\? \{/);
    expect(contents).toMatch(/dateStart: syncWindow\.dateStart,/);
    expect(contents).toMatch(/dateEnd: syncWindow\.dateEnd,/);
  });

  it("uses timeout-bounded fetches for week detail and sync polling", () => {
    const contents = readSource("../src/components/admin/social-week/WeekDetailPageView.tsx");

    const timeoutConfig = sourceBetween(contents, "const REQUEST_TIMEOUT_MS = {", "} as const;");
    expect(timeoutConfig).toMatch(/weekDetail:\s*50_000/);
    expect(timeoutConfig).toMatch(/weekSummary:\s*40_000/);
    expect(timeoutConfig).toMatch(/ingestKickoff:\s*210_000/);
    expect(timeoutConfig).toMatch(/syncRuns:\s*30_000/);
    expect(timeoutConfig).toMatch(/runProgress:\s*30_000/);
    expect(timeoutConfig).toMatch(/weekLiveHealth:\s*20_000/);

    const timeoutHelper = sourceBetween(contents, "const fetchWithTimeout = async (", "const registerInFlightRequest = (");
    expectInOrder(timeoutHelper, [
      "const controller = new AbortController();",
      "const timeoutId = setTimeout(() => controller.abort(), timeoutMs);",
      "externalSignal.addEventListener(\"abort\", onExternalAbort, { once: true });",
      "throw new Error(timeoutMessage);",
      "clearTimeout(timeoutId);",
    ]);

    const weekDetailFetch = sourceBetween(contents, "const fetchData = useCallback(", "const fetchPlatformTotalsSummary = useCallback");
    expectInOrder(weekDetailFetch, [
      "fetchWithTimeout(",
      "REQUEST_TIMEOUT_MS.weekDetail",
      "\"Week detail request timed out\"",
    ]);

    const weekSummaryFetch = sourceBetween(contents, "const fetchPlatformTotalsSummary = useCallback", "const fetchWeekMetricsPosts = useCallback");
    expectInOrder(weekSummaryFetch, [
      "fetchWithTimeout(",
      "REQUEST_TIMEOUT_MS.weekSummary",
      "\"Week detail summary request timed out\"",
    ]);

    const runProgressFetch = sourceBetween(contents, "const fetchSyncProgress = useCallback(", "const queueSyncPass = useCallback");
    expectInOrder(runProgressFetch, [
      "fetchWithTimeout(",
      "REQUEST_TIMEOUT_MS.runProgress",
      "\"Sync run progress request timed out\"",
      "options?.signal",
    ]);

    const syncSessionKickoff = sourceBetween(contents, "const queueSyncPass = useCallback", "const syncAllCommentsForWeek = useCallback");
    expectInOrder(syncSessionKickoff, [
      "fetchWithTimeout(",
      "REQUEST_TIMEOUT_MS.ingestKickoff",
      "SYNC_KICKOFF_TIMEOUT_MESSAGE",
    ]);

    const snapshotFetch = sourceBetween(contents, "const fetchWeekSnapshot = useCallback(", "const refreshWeekSnapshotNow = useCallback");
    expectInOrder(snapshotFetch, [
      "fetchWithTimeout(",
      "REQUEST_TIMEOUT_MS.runProgress",
      "\"Week social snapshot request timed out\"",
    ]);

    const fallbackPolling = sourceBetween(contents, "if (!syncRunId || !syncingComments) return;", "useEffect(() => {\n    if (!syncingComments && syncPass !== 0)");
    expect(fallbackPolling).toContain("SYNC_POLL_BACKOFF_MS");
    expect(fallbackPolling).toContain("syncPollFailureCountRef.current >= 2 && !isTransientDevRestartMessage(message)");
    expect(contents).toContain("Waiting for sync session follow-up");
  });

  it("shows detailed sync-session gap counters including comment media", () => {
    const weekFilePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const weekContents = fs.readFileSync(weekFilePath, "utf8");

    expect(weekContents).toMatch(/Missing comment media/);
    expect(weekContents).toMatch(/missing_comment_media_count/);

    const seasonFilePath = path.resolve(
      __dirname,
      "../src/components/admin/season-social-analytics-section.tsx",
    );
    const seasonContents = fs.readFileSync(seasonFilePath, "utf8");

    expect(seasonContents).toMatch(/Missing comment media/);
    expect(seasonContents).toMatch(/missing_comment_media_count/);
  });

  it("uses the sync-session stream helper with polling fallback", () => {
    const weekFilePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const weekContents = fs.readFileSync(weekFilePath, "utf8");

    expect(weekContents).toMatch(/consumeSocialSyncSessionStream/);
    expect(weekContents).toMatch(/social\/sync-sessions\/\$\{syncSessionId\}.*\/stream/s);
    expect(weekContents).toMatch(/if \(syncSessionStreamConnected\) return;/);
    expect(weekContents).toMatch(/if \(!syncPollingEnabled\) return;/);
    expect(weekContents).toMatch(/syncPollAbortRef\.current\?\.abort\(\);/);

    const seasonFilePath = path.resolve(
      __dirname,
      "../src/components/admin/season-social-analytics-section.tsx",
    );
    const seasonContents = fs.readFileSync(seasonFilePath, "utf8");

    expect(seasonContents).toMatch(/consumeSocialSyncSessionStream/);
    expect(seasonContents).toMatch(/social\/sync-sessions\/\$\{activeSyncSessionId\}\/stream/s);
    expect(seasonContents).toMatch(/if \(activeSyncSessionStreamConnected\) return;/);
  });

  it("cleans up in-flight week requests without leaking rejected finally promises", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const registerInFlightRequest = \(/);
    expect(contents).toMatch(/requestPromise\s*\.finally\(\(\) => \{/);
    expect(contents).toMatch(/\.catch\(\(\) => \{\}\);/);
    expect(contents).toMatch(/registerInFlightRequest\(\s*weekDetailInFlightRef\.current,/s);
    expect(contents).toMatch(/registerInFlightRequest\(\s*weekSummaryInFlightRef\.current,/s);
  });

  it("defaults summary proxy include mode to totals_only", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/summary/route.ts",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/forwardedSearchParams\.set\("include", "totals_only"\)/);
    expect(contents).toMatch(/timeoutMs:\s*40_000/);
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

  it("throttles week and season social polling in dev when tabs are hidden", () => {
    const weekContents = readSource("../src/components/admin/social-week/WeekDetailPageView.tsx");
    const seasonContents = readSource("../src/components/admin/season-social-analytics-section.tsx");
    const sharedPollingContents = readSource("../src/lib/admin/shared-live-resource.ts");

    const sharedVisibilityGate = sourceBetween(
      sharedPollingContents,
      "private shouldRunInThisTab(): boolean {",
      "private publish =",
    );
    expectInOrder(sharedVisibilityGate, [
      "if (typeof document === \"undefined\") return false;",
      "if (document.visibilityState !== \"visible\") return false;",
      "return this.hasActiveInterest();",
    ]);
    expect(sharedPollingContents).toContain("private handleVisibilityChange = (): void => {");
    expect(sharedPollingContents).toContain("this.requestImmediateRefresh();");
    expect(sharedPollingContents).toContain("this.reconcile();");

    const weekVisibilityState = sourceBetween(weekContents, "const [isDocumentVisible, setIsDocumentVisible]", "const resolvedSeasonId = useMemo");
    expectInOrder(weekVisibilityState, [
      "document.visibilityState === \"visible\"",
      "document.addEventListener(\"visibilitychange\", handleVisibilityChange);",
      "document.removeEventListener(\"visibilitychange\", handleVisibilityChange);",
      "const syncPollingEnabled = !DEV_LOW_HEAT_MODE || isDocumentVisible;",
    ]);
    expect(weekContents).toContain("const SYNC_GALLERY_REFRESH_MS = DEV_LOW_HEAT_MODE ? 10_000 : 4_000;");
    expect(weekContents).toContain("const SYNC_ACTIVE_POLL_INTERVAL_MS = DEV_LOW_HEAT_MODE ? 10_000 : 4_000;");
    expect(weekContents.match(/if \(!syncPollingEnabled\) return;/g)?.length).toBeGreaterThanOrEqual(3);
    expectInOrder(weekContents, [
      "const liveWeekSnapshot = useSharedPollingResource",
      "intervalMs: syncingComments ? SYNC_ACTIVE_POLL_INTERVAL_MS : 30_000",
    ]);

    const seasonVisibilityState = sourceBetween(seasonContents, "const [isDocumentVisible, setIsDocumentVisible]", "const showRouteSlug =");
    expectInOrder(seasonVisibilityState, [
      "document.visibilityState === \"visible\"",
      "document.addEventListener(\"visibilitychange\", handleVisibilityChange);",
      "document.removeEventListener(\"visibilitychange\", handleVisibilityChange);",
    ]);
    expect(seasonContents).toContain("const DEV_LOW_HEAT_MODE = process.env.NODE_ENV !== \"production\";");
    expect(seasonContents).toContain("const DEV_VISIBLE_POLL_INTERVAL_MS = 8_000;");
    expect(seasonContents).toContain("if (DEV_LOW_HEAT_MODE && !isDocumentVisible) return;");
    expectInOrder(seasonContents, [
      "const liveSeasonSnapshot = useSharedPollingResource",
      "intervalMs: DEV_LOW_HEAT_MODE ? DEV_VISIBLE_POLL_INTERVAL_MS : runningIngest ? 3_000 : 5_000",
    ]);
  });

  it("does not keep polling manual attach runs while the week detail screen is idle", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/void fetchManualAttachRunCandidates\(\);/);
    expect(contents).not.toMatch(/setInterval\(\(\) => \{\s*void fetchManualAttachRunCandidates\(\);\s*\}, 20_000\)/s);
  });

  it("surfaces worker-health blocking and sync-session diagnostics in the week sync UI", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/syncActionsBlockedReason/);
    expect(contents).toMatch(/Queue mode is enabled but no healthy remote executors are reporting/);
    expect(contents).toMatch(/platformDiagnostics/);
    expect(contents).toMatch(/Auth detail:/);
    expect(contents).toMatch(/Follow-up breakdown/);
    expect(contents).toMatch(/Per-dimension coverage/);
    expect(contents).toMatch(/Twitter\/X auth warning/);
    expect(contents).toMatch(/Degraded mode:/);
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

  it("routes platform tab clicks through the canonical week subtab URL", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const handlePlatformFilterSelect = useCallback\(/);
    expect(contents).toMatch(/setPlatformFilter\(nextFilter\);/);
    expect(contents).toMatch(/const nextRoute = buildSeasonSocialWeekUrl\(\{/);
    expect(contents).toMatch(/compareAndReplaceGuarded\(nextRoute\);/);
    expect(contents).toMatch(/onClick=\{\(\) => \{\s*handlePlatformFilterSelect\(tab\.key\);\s*\}\}/s);
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

  it("renders per-handle sync progress cards above summary KPI containers while syncing", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/Per-Handle Job Progress/);
    expect(contents).toMatch(/Day View/);
    expect(contents).toMatch(/Asset Health/);
    expect(contents).toMatch(/syncHandleProgressCards\.map\(\(card\) => \(/);
    expect(contents).toMatch(/Runner lanes:/);
    expect(contents).toMatch(/Pending start/);
    expect(contents).toMatch(/Next stage/);
    expect(contents).toMatch(/formatSyncStageLabel\(stage\.stage\)/);
    const handleProgressIndex = contents.indexOf("Per-Handle Job Progress");
    const summaryIndex = contents.indexOf("/* Summary bar - Row 1");
    expect(handleProgressIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(handleProgressIndex);
  });

  it("removes the in-progress narrative container and keeps logs collapsible", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).not.toMatch(/In progress:/);
    expect(contents).toMatch(/setSyncLogsExpanded/);
    expect(contents).toMatch(/Recent Run Log/);
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
    expect(contents).toMatch(/formatTranscriptErrorLabel/);
    expect(contents).not.toMatch(/Unavailable: \{data\.transcript_error\}/);
    expect(contents).toMatch(/shouldShowPostTitle/);
    expect(contents).toMatch(/Slide \{boundedInstagramDrawerSlideIndex \+ 1\} of/);
  });

  it("delegates manual single-platform sync kickoff shaping to the shared sync-session builder", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/buildSocialSyncSessionRequest\(\{/);
    expect(contents).toMatch(/platforms,/);
    expect(contents).toMatch(/dateStart,/);
    expect(contents).toMatch(/dateEnd,/);
    expect(contents).not.toMatch(/runner_strategy: singleRunnerPass \? "single_runner" : "adaptive_dual_runner"/);
  });

  it("renders sync-session follow-up messaging and dimension-specific retry counts", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/display_status/);
    expect(contents).toMatch(/status_reason/);
    expect(contents).toMatch(/Follow-up dimensions:/);
    expect(contents).toMatch(/Comment targets/);
    expect(contents).toMatch(/Avatar targets/);
    expect(contents).toMatch(/Comment media targets/);
  });

  it("separates running work from queued work in sync progress copy", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/jobs_running\?: number/);
    expect(contents).toMatch(/jobs_waiting\?: number/);
    expect(contents).toMatch(/syncProgress\.running/);
    expect(contents).toMatch(/syncProgress\.waiting/);
    expect(contents).toMatch(/stage\.running/);
    expect(contents).toMatch(/stage\.waiting/);
    expect(contents).toMatch(/completed \+ failed \+ running \+ waiting/);
    expect(contents).not.toMatch(/`\s*· \$\{stage\.active\} active/);
  });

  it("merges live sync telemetry into KPI cards while a sync is active", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const syncLiveSummaryTotals = useMemo/);
    expect(contents).toMatch(/Math\.max\(filteredTotals\.posts, syncLiveSummaryTotals\.posts\)/);
    expect(contents).toMatch(/const displayedPlatformMetrics = useMemo/);
    expect(contents).toMatch(/merged\.likes = Math\.max\(merged\.likes \?\? 0, syncLiveSummaryTotals\.total_likes\)/);
    expect(contents).toMatch(/merged\.comments_count = Math\.max\(merged\.comments_count \?\? 0, syncLiveSummaryTotals\.total_comments\)/);
    expect(contents).toMatch(/displayedPlatformMetrics\[metric\.key\]/);
  });

  it("scopes live day-view sync telemetry to the active platform and day filters", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const scopedRows = \(syncWeekLiveHealth\?\.day_account_rows \?\? \[\]\)\.filter/);
    expect(contents).toMatch(/if \(platformFilter !== "all" && row\.platform !== platformFilter\) return false/);
    expect(contents).toMatch(/if \(activeDayFilter && row\.day !== activeDayFilter\) return false/);
    expect(contents).toMatch(/const syncScheduleModeLabel = useMemo/);
    expect(contents).toMatch(/Single-lane schedule/);
  });

  it("renders explicit platform status cards and post-level sync chips from backend status objects", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/status_by_platform\?: Record<string, PlatformStatusPayload>/);
    expect(contents).toMatch(/const visiblePlatformStatuses = useMemo/);
    expect(contents).toMatch(/formatPlatformStatusSummary/);
    expect(contents).toMatch(/Comment sync/);
    expect(contents).toMatch(/Comment sync \{formatPlatformSyncStatus\(postStatus\.comment_sync_status\.status\)\}/);
    expect(contents).toMatch(/Mirror/);
    expect(contents).toMatch(/Mirror \{formatPlatformSyncStatus\(postStatus\.media_mirror_status\.status\)\}/);
  });

  it("prefers mirrored hosted YouTube assets when pre-filling cast screentime imports", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/components/admin/social-week/WeekDetailPageView.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/function getPreferredCastScreentimeImportSource/);
    expect(contents).toMatch(/mode: "external_url"/);
    expect(contents).toMatch(/source_mode: castScreentimeImportSource\.mode/);
    expect(contents).toMatch(/source_url: castScreentimeImportSource\.url/);
    expect(contents).toMatch(/normalizeSocialMediaCandidateUrl\(externalPostUrl\)/);
  });
});
