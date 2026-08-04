import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show refresh health center wiring", () => {
  const showPagePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const modalPath = path.resolve(__dirname, "../src/components/admin/ShowHealthCenterModal.tsx");
  const seasonPagePath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
  );
  const showPage = fs.readFileSync(showPagePath, "utf8");
  const modal = fs.readFileSync(modalPath, "utf8");
  const seasonPage = fs.readFileSync(seasonPagePath, "utf8");

  it("routes show refresh through the health center modal with unified backend stages", () => {
    expect(showPage).toMatch(/const FULL_SHOW_REFRESH_TARGETS: ShowRefreshTarget\[] = \[/);
    expect(showPage).toMatch(/const FULL_SHOW_REFRESH_TOTAL_PHASES = FULL_SHOW_REFRESH_TARGETS\.length \+ 1;/);
    expect(showPage).toMatch(/"show_core"/);
    expect(showPage).toMatch(/"links"/);
    expect(showPage).toMatch(/"bravo"/);
    expect(showPage).toMatch(/"cast_profiles"/);
    expect(showPage).toMatch(/"cast_media"/);
    expect(showPage).toMatch(/force_new_operation: true/);
    expect(showPage).toMatch(/const refreshRunButtonLabel =/);
    expect(showPage).toMatch(/const refreshCenterButtonLabel = isShowRefreshBusy/);
    expect(showPage).toMatch(/"Open Refresh Center"/);
    expect(showPage).toMatch(/"View Refresh Center"/);
    expect(showPage).toMatch(/onRefresh=\{\(\) => setRefreshLogOpen\(true\)\}/);
    expect(showPage).toMatch(/<ShowHealthCenterModal/);
    expect(showPage).toMatch(/onRun: \(\) => \{/);
    expect(showPage).toMatch(/captureHealthCenterScrollPosition\(\);/);
    expect(showPage).toMatch(/void refreshAllShowData\(\);/);
    expect(showPage).not.toMatch(/ariaLabel="Health Center"/);
    expect(modal).toMatch(/ariaLabel="Health Center"/);
    expect(modal).toMatch(/preserveScrollPosition=\{true\}/);
    expect(modal).toMatch(/Content Health, Sync Pipeline, Operations Inbox, and Refresh Log\./);
    expect(modal).toMatch(/Sync Pipeline/);
    expect(showPage).not.toMatch(/Show Gallery/);
  });

  it("keeps the health center component presentational and leaves retry plus operations callbacks in the route", () => {
    expect(showPage).toMatch(/pipeline=\{\{\s*steps: pipelineSteps,\s*onRetryStep: retryRefreshTarget,/s);
    expect(showPage).toMatch(/operationsInboxItems=\{operationsInboxItems\}/);
    expect(showPage).toMatch(
      /refreshLog=\{\{\s*hasEntries: refreshLogEntries\.length > 0,\s*topicGroups: refreshLogTopicGroups,\s*\}\}/s
    );
    expect(showPage).toMatch(/progressContent: \(\s*<RefreshProgressBar/s);
    expect(modal).not.toMatch(/\bfetch\s*\(/);
    expect(modal).not.toMatch(/useEffect|useLayoutEffect|useState|useReducer/);
    expect(modal).not.toMatch(/["'`]\/api\//);
    expect(modal).toMatch(/pipeline\.onRetryStep\(step\.topic\.key, step\.parentOperationId!\)/);
    expect(modal).toMatch(/operationsInboxItems\.map/);
  });

  it("surfaces remote worker events and refetches credits payload after cast refresh", () => {
    expect(showPage).toMatch(/event === "operation" \|\| event === "dispatched_to_modal"/);
    expect(showPage).toMatch(/remote worker/);
    expect(showPage).toMatch(/fetchShowCredits\(\)/);
    expect(showPage).toMatch(/IMDb Full Credits synced for cast \+ crew/);
  });

  it("runs gallery media after unified refresh with fast gallery-only settings", () => {
    expect(showPage).toMatch(/void refreshAllShowData\(\);/);
    expect(showPage).toMatch(/loadBravoData\(\{ force: true \}\),\s*loadUnifiedNews\(\{ force: true \}\)/);
    expect(showPage).toMatch(/return refreshShow\("photos", \{/);
    expect(showPage).toMatch(/photoMode: "fast"/);
    expect(showPage).toMatch(/skipCastPhotos: true/);
    expect(showPage).toMatch(/suppressSuccessNotice: true/);
    expect(showPage).toMatch(/skip_auto_count: fastPhotoMode \|\| skipCastPhotos/);
    expect(showPage).toMatch(/skip_word_detection: fastPhotoMode \|\| skipCastPhotos/);
    expect(showPage).toMatch(/skip_cast_photos: skipCastPhotos/);
    expect(showPage).toMatch(/gallery media refresh/);
  });

  it("auto-runs the full refresh once per viewed show", () => {
    expect(showPage).toMatch(/searchParams\.get\("showRefreshOperationId"\) \?\? searchParams\.get\("showCoreOperationId"\)/);
    expect(showPage).toMatch(/searchParams\.get\("showRefreshStarted"\) === "1"/);
    expect(showPage).toMatch(/trr:show-full-auto-refresh:\$\{showId\}/);
    expect(showPage).toMatch(/if \(preNavigationShowRefreshStarted\) return;/);
    expect(showPage).toMatch(/if \(!autoShowCorePauseLoaded\) return;/);
    expect(showPage).toMatch(/if \(autoShowCorePaused\) return;/);
    expect(showPage).toMatch(/void refreshAllShowData\(\);/);
  });

  it("removes duplicate gallery headings and stale inline progress bars from season assets", () => {
    expect(seasonPage).not.toMatch(/Season Images/);
    expect(seasonPage).not.toMatch(/Season Videos/);
  });
});
