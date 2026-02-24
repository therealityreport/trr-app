import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season cast tab quality wiring", () => {
  const filePath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
  );
  const castRouteStatePath = path.resolve(__dirname, "../src/lib/admin/cast-route-state.ts");
  const contents = fs.readFileSync(filePath, "utf8");
  const castRouteStateContents = fs.readFileSync(castRouteStatePath, "utf8");

  it("hardens cast-role-members loading with timeout, retry, and stale snapshot warning", () => {
    expect(contents).toMatch(/SEASON_CAST_ROLE_MEMBERS_LOAD_TIMEOUT_MS = 120_000/);
    expect(contents).toMatch(/SEASON_CAST_ROLE_MEMBERS_MAX_ATTEMPTS = 2/);
    expect(contents).toMatch(
      /adminGetJson<unknown\[]>\(\s*`\/api\/admin\/trr-api\/shows\/\$\{showId\}\/cast-role-members\?\$\{params\.toString\(\)\}`/
    );
    expect(contents).toMatch(/timeoutMs:\s*SEASON_CAST_ROLE_MEMBERS_LOAD_TIMEOUT_MS/);
    expect(contents).toMatch(/Showing last successful cast intelligence snapshot\./);
    expect(contents).toMatch(/setCastRoleMembersWarning/);
  });

  it("runs season cast media enrich with bounded concurrency", () => {
    expect(contents).toMatch(/SEASON_CAST_PROFILE_SYNC_CONCURRENCY = 3/);
    expect(contents).toMatch(/const runSeasonCastMediaEnrich = useCallback/);
    expect(contents).toMatch(/const runWorker = async \(\) =>/);
    expect(contents).toMatch(/Promise\.all\(Array\.from\(\{ length: workerCount \}/);
  });

  it("surfaces detailed per-person stream errors", () => {
    expect(contents).toMatch(/eventType === "error"/);
    expect(contents).toMatch(/errorPayload\?\./);
    expect(contents).toMatch(/detailText \? `\$\{errorText\}: \$\{detailText\}` : errorText/);
  });

  it("supports explicit cancel for season cast refresh", () => {
    expect(contents).toMatch(/const castRefreshAbortControllerRef = useRef<AbortController \| null>\(null\)/);
    expect(contents).toMatch(/const castEnrichAbortControllerRef = useRef<AbortController \| null>\(null\)/);
    expect(contents).toMatch(/const cancelSeasonCastRefresh = useCallback/);
    expect(contents).toMatch(/castRefreshAbortControllerRef\.current\?\.abort\(\)/);
    expect(contents).toMatch(/castEnrichAbortControllerRef\.current\?\.abort\(\)/);
    expect(contents).toMatch(/castRefreshAbortControllerRef\.current = null/);
    expect(contents).toMatch(/Season cast refresh canceled\./);
    expect(contents).toMatch(/onClick=\{cancelSeasonCastRefresh\}/);
  });

  it("shows retry controls and filtered\\/total cast count chips", () => {
    expect(contents).toMatch(/castRoleMembersWarningWithSnapshotAge && \(/);
    expect(contents).toMatch(/onClick=\{\(\) => void fetchCastRoleMembers\(\{ force: true \}\)\}/);
    expect(contents).toMatch(/trrShowCastError && \(/);
    expect(contents).toMatch(/showCastFetchAttemptedRef\.current = false;/);
    expect(contents).toMatch(/void fetchShowCastForBrand\(\);/);
    expect(contents).toMatch(/const castDisplayTotals = useMemo/);
    expect(contents).toMatch(/renderedCastCount}\/\{matchedCastCount}\/\{totalCastCount} cast/);
    expect(contents).toMatch(/renderedCrewCount}\/\{matchedCrewCount}\/\{totalCrewCount} crew/);
    expect(contents).toMatch(/renderedVisibleCount}\/\{matchedVisibleCount}\/\{totalVisibleCount} visible/);
  });

  it("splits season cast actions into sync and enrich, with per-card actions", () => {
    expect(contents).toMatch(/Sync Cast/);
    expect(contents).toMatch(/Enrich Cast & Crew Media/);
    expect(contents).toMatch(/handleRefreshSeasonCastMember/);
    expect(contents).toMatch(/Edit Roles/);
    expect(contents).toMatch(/cast_open_role_editor/);
  });

  it("adds cast search and URL-persisted cast filters", () => {
    expect(contents).toMatch(/parseSeasonCastRouteState/);
    expect(contents).toMatch(/writeSeasonCastRouteState/);
    expect(contents).toMatch(/writeShowCastRouteState/);
    expect(contents).toMatch(/castSearchQuery/);
    expect(castRouteStateContents).toMatch(/cast_q/);
    expect(castRouteStateContents).toMatch(/cast_role_filters/);
    expect(castRouteStateContents).toMatch(/cast_credit_filters/);
    expect(contents).toMatch(/Search Name/);
  });

  it("uses non-blocking supplemental show-cast warning when role members exist", () => {
    expect(contents).toMatch(/castRoleMembersLoadedOnce/);
    expect(contents).toMatch(/Loading cast intelligence\.\.\./);
    expect(contents).toMatch(/Loading supplemental show cast data\.\.\./);
  });

  it("refreshes supporting cast intelligence after person refresh and retry-failed enrich", () => {
    expect(contents).toMatch(/await Promise\.all\(\[fetchCastRoleMembers\(\{ force: true \}\), fetchShowCastForBrand\(\)\]\);/);
    expect(contents).toMatch(/const summary = await runSeasonCastMediaEnrich\(retryMembers, \{ signal: runController\.signal \}\);/);
  });

  it("dedupes season cast members and blocks top-level actions when person refresh is in flight", () => {
    expect(contents).toMatch(/const castUniqueMembers = useMemo/);
    expect(contents).toMatch(/const seasonHasPersonRefreshInFlight = Object\.keys\(refreshingPersonIds\)\.length > 0;/);
    expect(contents).toMatch(/const seasonCastAnyJobRunning = refreshingCast \|\| enrichingCast \|\| seasonHasPersonRefreshInFlight;/);
    expect(contents).toMatch(/disabled=\{seasonCastAnyJobRunning\}/);
  });

  it("builds show role-editor deep links from whitelisted cast query state", () => {
    expect(contents).toMatch(/const buildShowCastRoleEditorQuery = useCallback/);
    expect(contents).toMatch(/writeShowCastRouteState\(new URLSearchParams\(\), \{/);
    expect(contents).toMatch(/query: buildShowCastRoleEditorQuery\(member\.person_id\)/);
  });
});
