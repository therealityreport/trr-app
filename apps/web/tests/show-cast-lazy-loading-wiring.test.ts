import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show detail cast lazy-loading wiring", () => {
  const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const contents = fs.readFileSync(filePath, "utf8");

  it("keeps initial page load Promise.all free of fetchCast", () => {
    expect(contents).toMatch(/await Promise\.all\(\[fetchSeasons\(\), checkCoverage\(\)\]\)/);
    expect(contents).not.toMatch(/await Promise\.all\(\[fetchSeasons\(\), fetchCast\(\), checkCoverage\(\)\]\)/);
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
  });

  it("keeps cast tab usable when cast-role-members refresh fails", () => {
    expect(contents).toMatch(/Showing last successful cast intelligence snapshot/);
    expect(contents).toMatch(/setCastRoleMembersWarning/);
    expect(contents).toMatch(/onClick=\{\(\) => void fetchCastRoleMembers\(\{ force: true \}\)\}/);
  });
});
