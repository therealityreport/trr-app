import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show detail cast lazy-loading wiring", () => {
  const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const castRouteStatePath = path.resolve(__dirname, "../src/lib/admin/cast-route-state.ts");
  const contents = fs.readFileSync(filePath, "utf8");
  const castRouteStateContents = fs.readFileSync(castRouteStatePath, "utf8");

  it("keeps initial page load Promise.all free of fetchCast", () => {
    expect(contents).toMatch(/await Promise\.allSettled\(\[fetchSeasons\(\), checkCoverage\(\)\]\)/);
    expect(contents).not.toMatch(/await Promise\.allSettled\(\[fetchSeasons\(\), fetchCast\(\), checkCoverage\(\)\]\)/);
  });

  it("loads cast lazily on cast tab entry", () => {
    expect(contents).toMatch(/if \(castLoadedOnce \|\| castLoading\) return;/);
    expect(contents).toMatch(/if \(!hasAccess \|\| !showId \|\| activeTab !== "cast"\) return;/);
    expect(contents).toMatch(/void fetchCast\(\);/);
  });

  it("provides explicit enrich missing cast photos action with bravo fallback", () => {
    expect(contents).toMatch(/Enrich Missing Cast Photos/);
    expect(contents).toMatch(/photoFallbackMode: "bravo"/);
    expect(contents).toMatch(/mergeMissingPhotosOnly: true/);
    expect(contents).toMatch(/params\.set\("photo_fallback", photoFallbackMode\)/);
  });

  it("suppresses early cast refresh success notices while pipeline phases continue", () => {
    expect(contents).toMatch(/suppressSuccessNotice\?: boolean/);
    expect(contents).toMatch(/suppressSuccessNotice: true/);
    expect(contents).toMatch(/if \(!suppressSuccessNotice\)/);
    expect(contents).toMatch(
      /Cast refresh complete: credits synced, profile links synced, bios refreshed, network augmentation applied, media ingest complete\./
    );
  });

  it("threads abort signals through cast refresh/person media paths", () => {
    expect(contents).toMatch(/options\?: \{ mode\?: PersonRefreshMode; signal\?: AbortSignal \}/);
    expect(contents).toMatch(/\{ mode, signal: options\?\.signal \}/);
    expect(contents).toMatch(/runPhasedCastRefresh\(\{\s*phases,\s*signal: runController\.signal,/s);
    expect(contents).toMatch(/if \(options\?\.signal\?\.aborted \|\| \/canceled\/i\.test\(errorText\)\)/);
  });

  it("keeps cast tab progress scoped to cast workflows only", () => {
    expect(contents).toMatch(/const castTabProgress =\s*refreshingTargets\.cast_credits \|\| castRefreshPipelineRunning \|\| castMediaEnriching/s);
    expect(contents).not.toMatch(/:\s*globalRefreshProgress;/);
  });

  it("adds cast search and URL-persisted cast filter state", () => {
    expect(contents).toMatch(/parseShowCastRouteState/);
    expect(contents).toMatch(/writeShowCastRouteState/);
    expect(contents).toMatch(/castSearchQuery/);
    expect(contents).toMatch(/castSearchQueryDebounced/);
    expect(castRouteStateContents).toMatch(/cast_q/);
    expect(castRouteStateContents).toMatch(/cast_filters/);
    expect(contents).toMatch(/Search Name/);
  });

  it("disables per-card cast actions while cast jobs are running", () => {
    expect(contents).toMatch(/const castAnyJobRunning =/);
    expect(contents).toMatch(/const hasPersonRefreshInFlight = Object\.keys\(refreshingPersonIds\)\.length > 0/);
    expect(contents).toMatch(/disabled=\{castAnyJobRunning \|\| Boolean\(refreshingPersonIds\[member\.person_id\]\)\}/);
    expect(contents).toMatch(/title=\{castAnyJobRunning \? \"Cast sync in progress\" : undefined\}/);
  });

  it("tracks and renders failed cast members with retry-failed control", () => {
    expect(contents).toMatch(/const \[castRunFailedMembers, setCastRunFailedMembers\] = useState<CastRunFailedMember\[]>\(\[\]\)/);
    expect(contents).toMatch(/Retry failed only/);
    expect(contents).toMatch(/retryFailedCastMediaEnrich/);
    expect(contents).toMatch(/Failed Members \(\{castRunFailedMembers\.length\}\)/);
  });

  it("shows rendered\\/matched\\/total cast counters and exposes cancel for running cast jobs", () => {
    expect(contents).toMatch(/const castDisplayTotals = useMemo/);
    expect(contents).toMatch(/renderedCastCount}\/\{matchedCastCount}\/\{totalCastCount} cast/);
    expect(contents).toMatch(/renderedCrewCount}\/\{matchedCrewCount}\/\{totalCrewCount} crew/);
    expect(contents).toMatch(/renderedVisibleCount}\/\{matchedVisibleCount}\/\{totalVisibleCount} visible/);
    expect(contents).toMatch(/const cancelShowCastWorkflow = useCallback/);
    expect(contents).toMatch(/castRefreshAbortControllerRef\.current\?\.abort\(\)/);
    expect(contents).toMatch(/castMediaEnrichAbortControllerRef\.current\?\.abort\(\)/);
    expect(contents).toMatch(/\(castRefreshPipelineRunning \|\| castMediaEnriching \|\| hasPersonRefreshInFlight\) &&/);
    expect(contents).toMatch(/if \(completedSuccessfully\) \{\s*setCastRefreshPhaseStates\(\[\]\);/s);
    expect(contents).toMatch(
      /castRefreshAbortControllerRef\.current\?\.abort\(\);\s*castMediaEnrichAbortControllerRef\.current\?\.abort\(\);/s
    );
    expect(contents).toMatch(/personRefreshAbortControllersRef/);
  });

  it("uses valid interactive structure for cast cards by separating link and action buttons", () => {
    expect(contents).toMatch(/<div\s+key=\{member\.id\}/);
    expect(contents).toMatch(/className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"/);
    expect(contents).toMatch(/className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"/);
    expect(contents).not.toMatch(/event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*handleRefreshCastMember/s);
  });

  it("uses canonical 5-phase cast refresh orchestration with phase-aware button labels", () => {
    expect(contents).toMatch(/runPhasedCastRefresh\(\{/);
    expect(contents).toMatch(/id:\s*"credits_sync"/);
    expect(contents).toMatch(/id:\s*"profile_links_sync"/);
    expect(contents).toMatch(/id:\s*"bio_sync"/);
    expect(contents).toMatch(/id:\s*"network_augmentation"/);
    expect(contents).toMatch(/id:\s*"media_ingest"/);
    expect(contents).toMatch(/CAST_REFRESH_PHASE_TIMEOUTS:\s*Record<CastRefreshPhaseId,\s*number>/);
    expect(contents).toMatch(/Ingesting media: \$\{completedCount\}\/\$\{total\} complete \(\$\{inFlightCount\} in flight\)/);
    expect(contents).toMatch(/Syncing Credits\.\.\./);
    expect(contents).toMatch(/Syncing Links\.\.\./);
    expect(contents).toMatch(/Syncing Bios\.\.\./);
    expect(contents).toMatch(/Syncing Bravo\.\.\./);
    expect(contents).toMatch(/Ingesting Media\.\.\./);
    expect(contents).toMatch(/const castPhaseProgress =/);
    expect(contents).toMatch(/castPhaseProgress \?\? refreshTargetProgress\.cast_credits \?\? null/);
  });

  it("defers cast search filtering work and waits for role data before deep-link editor open", () => {
    expect(contents).toMatch(/useDeferredValue/);
    expect(contents).toMatch(/const castSearchQueryDeferred = useDeferredValue/);
    expect(contents).toMatch(/const roleDataReady = castRoleMembersLoadedOnce \|\| Boolean\(roleMember\);/);
    expect(contents).toMatch(/if \(!roleDataReady\) \{/);
  });

  it("keeps cast tab usable when cast-role-members refresh fails", () => {
    expect(contents).toMatch(/Showing last successful cast intelligence snapshot/);
    expect(contents).toMatch(/setCastRoleMembersWarning/);
    expect(contents).toMatch(/onClick=\{\(\) => void fetchCastRoleMembers\(\{ force: true \}\)\}/);
    expect(contents).toMatch(/rolesWarningWithSnapshotAge && \(/);
    expect(contents).toMatch(/Retry Roles/);
    expect(contents).toMatch(/onClick=\{\(\) => void fetchShowRoles\(\{ force: true \}\)\}/);
    expect(contents).toMatch(/Cast intelligence unavailable; showing base cast snapshot\./);
    expect(contents).toMatch(/Retry Cast Intelligence/);
    expect(contents).toMatch(/Refreshing cast intelligence\.\.\./);
    expect(contents).toMatch(
      /showCastIntelligenceUnavailable =\s*activeTab === "cast" &&\s*castSource === "show_fallback" &&\s*!castRoleMembersLoading &&\s*!rolesLoading &&\s*\(Boolean\(castRoleMembersError\) \|\| Boolean\(rolesError\)\)/
    );
  });

  it("prevents cast intelligence auto-load retry loops and keeps manual retries explicit", () => {
    expect(contents).toMatch(/showRolesAutoLoadAttemptedRef/);
    expect(contents).toMatch(/castRoleMembersAutoLoadAttemptedRef/);
    expect(contents).toMatch(/if \(showRolesAutoLoadAttemptedRef\.current === autoLoadKey\) return;/);
    expect(contents).toMatch(/if \(castRoleMembersAutoLoadAttemptedRef\.current === autoLoadKey\) return;/);
    expect(contents).toMatch(/if \(!force && showRolesLoadedOnceRef\.current\) return;/);
    expect(contents).toMatch(
      /if \(!force && castRoleMembersLoadKeyRef\.current === fetchKey && castRoleMembersLoadedOnceRef\.current\)/
    );
  });

  it("keeps deep-link role editor params when intelligence is unavailable", () => {
    expect(contents).toMatch(/castRoleEditorDeepLinkWarning/);
    expect(contents).toMatch(
      /if \(!castRoleMembersLoading && !rolesLoading && \(Boolean\(castRoleMembersError\) \|\| Boolean\(rolesError\)\)\)/
    );
    expect(contents).toMatch(
      /Role editor deep-link is waiting for cast intelligence\. Retry roles and cast intelligence, then reopen\./
    );
  });
});
