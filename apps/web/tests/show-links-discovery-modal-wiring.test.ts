import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

describe("show links discovery modal wiring", () => {
  const route = readSource("../src/app/admin/trr-shows/[showId]/page.tsx");
  const modal = readSource("../src/components/admin/ShowLinksDiscoveryModal.tsx");

  it("keeps links discovery orchestration in the route", () => {
    expect(route).toMatch(/<ShowLinksDiscoveryModal/);
    expect(route).toMatch(/const refreshShowLinks = useCallback/);
    expect(route).toMatch(/const cancelShowLinksRefresh = useCallback/);
    expect(route).toMatch(/await adminStream\(targetPath/);
    expect(route).toMatch(/upsertAdminOperationSession/);
    expect(route).toMatch(/getAutoResumableAdminOperationSession/);
    expect(route).toMatch(/void refreshShowLinks\(\{ resumeOnly: true \}\)/);
    expect(route).toMatch(/onRefresh: refreshShowLinks/);
    expect(route).toMatch(/linksRefreshTimeoutMessage/);
    expect(route).not.toMatch(/ariaLabel="Links discovery progress"/);
    expect(modal).toMatch(/ariaLabel="Links discovery progress"/);
  });

  it("keeps the extracted modal presentational and preserves neighboring packets", () => {
    expect(modal).not.toMatch(/\bfetch\s*\(/);
    expect(modal).not.toMatch(/adminStream|upsertAdminOperationSession/);
    expect(modal).not.toMatch(/useEffect|useLayoutEffect|useState|useReducer|useMemo/);
    expect(modal).not.toMatch(/["'`]\/api\//);
    expect(route).toMatch(/<ShowHealthCenterModal/);
    expect(route).toMatch(/<ShowBravoSyncModal/);
    expect(modal).toMatch(/dialog\.error \|\| dialog\.completionNotice \|\| dialog\.notice/);
    expect(modal).toMatch(/execution\.owner === "remote_worker"/);
    expect(modal).toMatch(/progress\.hasResult/);
  });
});
