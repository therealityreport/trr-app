import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show refresh health center wiring", () => {
  const showPagePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const seasonPagePath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
  );
  const showPage = fs.readFileSync(showPagePath, "utf8");
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
    expect(showPage).toMatch(/preserveScrollPosition=\{true\}/);
    expect(showPage).not.toMatch(/onClick=\{\(\) => void refreshAllShowData\(\)\}/);
    expect(showPage).toMatch(/Refresh Links/);
    expect(showPage).not.toMatch(/Show Gallery/);
  });

  it("surfaces remote worker events and refetches credits payload after cast refresh", () => {
    expect(showPage).toMatch(/event === "operation" \|\| event === "dispatched_to_modal"/);
    expect(showPage).toMatch(/remote worker/);
    expect(showPage).toMatch(/fetchShowCredits\(\)/);
    expect(showPage).toMatch(/IMDb Full Credits synced for cast \+ crew/);
  });

  it("runs gallery media after unified refresh with fast gallery-only settings", () => {
    expect(showPage).toMatch(/void refreshAllShowData\(\);/);
    expect(showPage).toMatch(/return refreshShow\("photos", \{/);
    expect(showPage).toMatch(/photoMode: "fast"/);
    expect(showPage).toMatch(/skipCastPhotos: true/);
    expect(showPage).toMatch(/suppressSuccessNotice: true/);
    expect(showPage).toMatch(/skip_auto_count: fastPhotoMode \|\| skipCastPhotos/);
    expect(showPage).toMatch(/skip_word_detection: fastPhotoMode \|\| skipCastPhotos/);
    expect(showPage).toMatch(/skip_cast_photos: skipCastPhotos/);
    expect(showPage).toMatch(/gallery media refresh/);
  });

  it("removes duplicate gallery headings and stale inline progress bars from season assets", () => {
    expect(seasonPage).not.toMatch(/Season Images/);
    expect(seasonPage).not.toMatch(/Season Videos/);
  });
});
