import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show detail cast lazy-loading wiring", () => {
  const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const castRouteStatePath = path.resolve(__dirname, "../src/lib/admin/cast-route-state.ts");
  const creditsViewsPath = path.resolve(__dirname, "../src/components/admin/show-tabs/ShowCreditsViews.tsx");
  const contents = fs.readFileSync(filePath, "utf8");
  const castRouteStateContents = fs.readFileSync(castRouteStatePath, "utf8");
  const creditsViewsContents = fs.readFileSync(creditsViewsPath, "utf8");

  it("keeps initial page load Promise.all free of fetchCast", () => {
    expect(contents).toMatch(/useShowIdentityLoad/);
    expect(contents).toMatch(/const \{\s*[\s\S]*fetchSeasons,\s*loadShowIdentity,\s*\} = useShowIdentityLoad/s);
    expect(contents).toMatch(/const autoLoadKey = `\$\{showId\}:cast`;/);
  });

  it("loads cast lazily on cast tab entry", () => {
    expect(contents).toMatch(/if \(!hasAccess \|\| !showId \|\| activeTab !== "cast"\) return;/);
    expect(contents).toMatch(/castAutoLoadAttemptedRef/);
    expect(contents).toMatch(/const autoLoadKey = `\$\{showId\}:cast`;/);
    expect(contents).toMatch(/if \(castAutoLoadAttemptedRef\.current === autoLoadKey\) return;/);
    expect(contents).toMatch(/void fetchCast\(\{ force: true, includePhotos: false \}\);/);
    expect(contents).toMatch(/castAutoRecoveryAttemptedRef/);
    expect(contents).toMatch(/Cast list unavailable; retrying cast roster\.\.\./);
  });

  it("hardens cast loading with longer timeout, retry, and zero-episode exclusion", () => {
    expect(contents).toMatch(/SHOW_CAST_LOAD_TIMEOUT_MS = 90_000/);
    expect(contents).toMatch(/SHOW_CAST_LOAD_MAX_ATTEMPTS = 2/);
    expect(contents).toMatch(/SHOW_CAST_LOAD_RETRY_BACKOFF_MS = 250/);
    expect(contents).toMatch(/params\.set\("exclude_zero_episode_members", "1"\)/);
    expect(contents).toMatch(/castLoadInFlightRef/);
    expect(contents).toMatch(/castSnapshotRef/);
    expect(contents).toMatch(/Showing last successful cast snapshot\./);
  });

  it("provides explicit enrich missing cast photos action with bravo fallback", () => {
    expect(contents).toMatch(/Enrich Missing Cast Photos/);
    expect(contents).toMatch(/photoFallbackMode: "bravo"/);
    expect(contents).toMatch(/includePhotos: true/);
    expect(contents).toMatch(/mergeMissingPhotosOnly: true/);
    expect(contents).toMatch(/background: true/);
    expect(contents).toMatch(/params\.set\("photo_fallback", photoFallbackMode\)/);
  });

  it("uses staged cast photo loading with one automatic merge-only recovery pass", () => {
    expect(contents).toMatch(/const castAutoPhotoRecoveryAttemptedRef = useRef<string \| null>\(null\);/);
    expect(contents).toMatch(/const includePhotos = options\?\.includePhotos \?\? true;/);
    expect(contents).toMatch(/const background = options\?\.background === true;/);
    expect(contents).toMatch(/params\.set\("include_photos", includePhotos \? "true" : "false"\)/);
    expect(contents).toMatch(/if \(!background\) \{\s*setCastLoading\(true\);/s);
    expect(contents).toMatch(/const recoveryKey = `\$\{showId\}:missing-photo-recovery`;/);
    expect(contents).toMatch(/if \(castAutoPhotoRecoveryAttemptedRef\.current === recoveryKey\) return;/);
    expect(contents).toMatch(/mergeMissingPhotosOnly: true,\s*includePhotos: true,\s*background: true,\s*throwOnError: false,/s);
  });

  it("suppresses early cast refresh success notices while pipeline phases continue", () => {
    expect(contents).toMatch(/suppressSuccessNotice\?: boolean/);
    expect(contents).toMatch(/suppressSuccessNotice: true/);
    expect(contents).toMatch(/if \(!suppressSuccessNotice\)/);
    expect(contents).toMatch(/Credits refresh pipeline completed\./);
    expect(contents).toMatch(/IMDb Full Credits, profile links, bios, network augmentation, and media ingest refreshed/);
  });

  it("threads abort signals through cast person media paths and switches the credits refresh to admin operations", () => {
    expect(contents).toMatch(/options\?: \{ mode\?: PersonRefreshMode; signal\?: AbortSignal; personName\?: string \}/);
    expect(contents).toMatch(/refresh-profile\/stream/);
    expect(contents).toMatch(/mode,\s*signal: options\?\.signal,\s*personName: label/);
    expect(contents).toMatch(/if \(options\?\.signal\?\.aborted \|\| \/canceled\/i\.test\(errorText\)\)/);
    expect(contents).toMatch(/buildCreditsPipelineFlowScope/);
    expect(contents).toMatch(/getAutoResumableAdminOperationSession/);
    expect(contents).toMatch(/clearAdminOperationSession\(flowScope\)/);
  });

  it("keeps cast tab progress scoped to cast workflows only", () => {
    expect(contents).toMatch(
      /const castAnyJobRunning =\s*castRefreshPipelineRunning \|\|\s*castMediaEnriching \|\|\s*castMatrixSyncLoading \|\|\s*Boolean\(refreshingTargets\.cast_credits\) \|\|\s*hasReconnectableCreditsRun \|\|\s*hasPersonRefreshInFlight/s
    );
    expect(contents).toMatch(
      /const isCastRefreshBusy =\s*isShowRefreshBusy \|\|\s*castMatrixSyncLoading \|\|\s*castRefreshPipelineRunning \|\|\s*castMediaEnriching \|\|\s*hasReconnectableCreditsRun \|\|\s*hasPersonRefreshInFlight;/s
    );
    expect(contents).not.toMatch(/globalRefreshProgress/);
  });

  it("adds cast search and URL-persisted cast filter state", () => {
    expect(contents).toMatch(/parseShowCastRouteState/);
    expect(contents).toMatch(/writeShowCastRouteState/);
    expect(contents).toMatch(/castSearchQuery/);
    expect(contents).toMatch(/castSearchQueryDebounced/);
    expect(castRouteStateContents).toMatch(/cast_q/);
    expect(castRouteStateContents).toMatch(/cast_filters/);
    expect(castRouteStateContents).toMatch(/cast_episode_exact/);
    expect(castRouteStateContents).toMatch(/cast_episode_min/);
    expect(castRouteStateContents).toMatch(/cast_episode_max/);
    expect(castRouteStateContents).toMatch(/cast_view/);
    expect(castRouteStateContents).toMatch(/cast_cols/);
    expect(contents).toMatch(/Search Name/);
  });

  it("keeps cast job state tracking even after removing per-card credits actions", () => {
    expect(contents).toMatch(/const castAnyJobRunning =/);
    expect(contents).toMatch(/const hasPersonRefreshInFlight = Object\.keys\(refreshingPersonIds\)\.length > 0/);
    expect(contents).not.toMatch(/Refresh Person/);
    expect(contents).not.toMatch(/Edit Roles/);
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
    expect(contents).toMatch(/\(castRefreshPipelineRunning \|\|\s*castMediaEnriching \|\|\s*hasPersonRefreshInFlight \|\|\s*hasReconnectableCreditsRun\) &&/s);
    expect(contents).toMatch(
      /castRefreshAbortControllerRef\.current\?\.abort\(\);\s*castMediaEnrichAbortControllerRef\.current\?\.abort\(\);/s
    );
    expect(contents).toMatch(/\/api\/admin\/trr-api\/operations\/\$\{operationId\}\/cancel/);
    expect(contents).toMatch(/Cancel Run/);
    expect(contents).toMatch(/personRefreshAbortControllersRef/);
  });

  it("renders cast members through the dedicated credits view components", () => {
    expect(contents).toMatch(/const renderShowCreditsCastMember =/);
    expect(contents).toMatch(/ShowCreditsCastMembers/);
    expect(contents).toMatch(/ShowCreditsCastViewControls/);
    expect(contents).not.toMatch(/event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*handleRefreshCastMember/s);
  });

  it("uses canonical 5-phase cast refresh state with durable credits-pipeline resume wiring", () => {
    expect(contents).toMatch(/const CREDITS_PIPELINE_BACKEND_TARGET = "credits_pipeline"/);
    expect(contents).toMatch(/CAST_REFRESH_PHASE_TIMEOUTS:\s*Record<CastRefreshPhaseId,\s*number>/);
    expect(contents).toMatch(/const buildCreditsPipelineRequestBody =/);
    expect(contents).toMatch(/const buildCreditsPipelineFlowScope =/);
    expect(contents).toMatch(/createCastRefreshPhaseStates\(\)/);
    expect(contents).toMatch(/updateCastRefreshPhaseStates\(/);
    expect(contents).toMatch(/void refreshShowCast\(\{ resumeOnly: true \}\);/);
    expect(contents).toMatch(/Syncing Credits\.\.\./);
    expect(contents).toMatch(/Syncing Links\.\.\./);
    expect(contents).toMatch(/Syncing Bios\.\.\./);
    expect(contents).toMatch(/Syncing Bravo\.\.\./);
    expect(contents).toMatch(/Ingesting Media\.\.\./);
    expect(contents).toMatch(/const castRefreshActivePhase =/);
    expect(contents).toMatch(/const castRefreshButtonLabel =/);
    expect(contents).toMatch(/CAST_REFRESH_PHASE_BUTTON_LABELS\[castRefreshActivePhase\.id\]/);
  });

  it("hydrates cast cards from the credits roster and preserves that roster against empty legacy cast responses", () => {
    expect(contents).toMatch(/const normalizeShowCreditsCastRoster = \(value: unknown\): TrrCastMember\[\] =>/);
    expect(contents).toMatch(/const \[showCreditsCastRoster, setShowCreditsCastRoster\] = useState<TrrCastMember\[]>\(\[\]\);/);
    expect(contents).toMatch(/const creditsCastRoster = normalizeShowCreditsCastRoster\(data\.cast_roster\);/);
    expect(contents).toMatch(/setShowCreditsCastRoster\(creditsCastRoster\);/);
    expect(contents).toMatch(/setCast\(creditsCastRoster\);/);
    expect(contents).toMatch(/const creditsRoster = activeTab === "cast" \? showCreditsCastRosterRef\.current : \[\];/);
    expect(contents).toMatch(/nextCast = mergeMissingPhotoFields\(creditsRoster, nextCast\);/);
  });

  it("renders the credits header and cast view controls without per-card edit actions", () => {
    expect(contents).toMatch(/<h3 className="text-xl font-bold text-zinc-900">\s*Credits\s*<\/h3>/);
    expect(contents).not.toMatch(/The Real Housewives of Salt Lake City/);
    expect(contents).toMatch(/ShowCreditsCastViewControls/);
    expect(contents).toMatch(/ShowCreditsCastMembers/);
    expect(contents).toMatch(/ShowCreditsCrewSections/);
    expect(contents).not.toMatch(/Refresh Person/);
    expect(contents).not.toMatch(/Edit Roles/);
    expect(creditsViewsContents).toMatch(/<th[^>]*>\s*Name\s*<\/th>/);
    expect(creditsViewsContents).toMatch(/<th[^>]*>\s*Role\s*<\/th>/);
    expect(creditsViewsContents).toMatch(/<th[^>]*>\s*Episodes\s*<\/th>/);
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
    expect(contents).toMatch(/castUiTerminalReady/);
    expect(contents).toMatch(/const castRosterReady =/);
    expect(contents).toMatch(/Loading role and credit filters\.\.\./);
    expect(contents).toMatch(/Loading cast roster\.\.\./);
    expect(contents).toMatch(/No cast members found for this show\./);
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
