import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season cast tab quality wiring", () => {
  const filePath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
  );
  const contents = fs.readFileSync(filePath, "utf8");

  it("hardens cast-role-members loading with timeout, retry, and stale snapshot warning", () => {
    expect(contents).toMatch(/SEASON_CAST_ROLE_MEMBERS_LOAD_TIMEOUT_MS = 120_000/);
    expect(contents).toMatch(/SEASON_CAST_ROLE_MEMBERS_MAX_ATTEMPTS = 2/);
    expect(contents).toMatch(/fetchWithTimeout\(\s*`\/api\/admin\/trr-api\/shows\/\$\{showId\}\/cast-role-members/);
    expect(contents).toMatch(/Showing last successful cast intelligence snapshot\./);
    expect(contents).toMatch(/setCastRoleMembersWarning/);
  });

  it("runs season cast profile refresh with bounded concurrency", () => {
    expect(contents).toMatch(/SEASON_CAST_PROFILE_SYNC_CONCURRENCY = 3/);
    expect(contents).toMatch(/const runProfileWorker = async \(\) =>/);
    expect(contents).toMatch(/Promise\.all\(Array\.from\(\{ length: profileWorkerCount \}/);
  });

  it("surfaces detailed per-person stream errors", () => {
    expect(contents).toMatch(/eventType === "error"/);
    expect(contents).toMatch(/errorPayload\?\./);
    expect(contents).toMatch(/detailText \? `\$\{errorText\}: \$\{detailText\}` : errorText/);
  });

  it("supports explicit cancel for season cast refresh", () => {
    expect(contents).toMatch(/const castRefreshAbortControllerRef = useRef<AbortController \| null>\(null\)/);
    expect(contents).toMatch(/const cancelSeasonCastRefresh = useCallback/);
    expect(contents).toMatch(/castRefreshAbortControllerRef\.current\?\.abort\(\)/);
    expect(contents).toMatch(/castRefreshAbortControllerRef\.current = null/);
    expect(contents).toMatch(/Season cast refresh canceled\./);
    expect(contents).toMatch(/onClick=\{cancelSeasonCastRefresh\}/);
  });

  it("shows retry controls and filtered\\/total cast count chips", () => {
    expect(contents).toMatch(/castRoleMembersWarning && \(/);
    expect(contents).toMatch(/onClick=\{\(\) => void fetchCastRoleMembers\(\{ force: true \}\)\}/);
    expect(contents).toMatch(/trrShowCastError && \(/);
    expect(contents).toMatch(/showCastFetchAttemptedRef\.current = false;/);
    expect(contents).toMatch(/void fetchShowCastForBrand\(\);/);
    expect(contents).toMatch(/const castDisplayTotals = useMemo/);
    expect(contents).toMatch(/castSeasonMembers\.length}\/\{castDisplayTotals\.cast} cast/);
    expect(contents).toMatch(/crewSeasonMembers\.length}\/\{castDisplayTotals\.crew} crew/);
    expect(contents).toMatch(/castDisplayMembers\.length}\/\{castDisplayTotals\.total} visible/);
  });
});
