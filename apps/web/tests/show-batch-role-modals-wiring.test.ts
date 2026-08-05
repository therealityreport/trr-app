import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

describe("show batch and role modal wiring", () => {
  const route = readSource("../src/app/admin/trr-shows/[showId]/page.tsx");
  const modals = readSource("../src/components/admin/ShowBatchRoleModals.tsx");

  it("keeps state, validation, mutations, and option semantics in the route", () => {
    expect(route).toMatch(/<ShowBatchRoleModals/);
    expect(route).toMatch(/const BATCH_JOB_OPERATION_LABELS/);
    expect(route).toMatch(/const SHOW_GALLERY_ALLOWED_SECTIONS/);
    expect(route).toMatch(/const runBatchJobs = useCallback/);
    expect(route).toMatch(/const saveRenamedShowRole = useCallback/);
    expect(route).toMatch(/const saveCastRoleAssignments = useCallback/);
    expect(route).toMatch(/setRoleRenameDraft/);
    expect(route).toMatch(/setCastRoleEditDraft/);
    expect(route).toMatch(/toggleBatchJobOperation/);
    expect(route).toMatch(/toggleBatchJobContentSection/);
    expect(route).toMatch(/if \(!batchJobsRunning\) setBatchJobsOpen\(false\)/);
    expect(route).toMatch(/<AdvancedFilterDrawer/);
  });

  it("moves only the three modal views into a presentational component", () => {
    expect(route).not.toMatch(/ariaLabel="Run image batch jobs"/);
    expect(route).not.toMatch(/ariaLabel="Rename role"/);
    expect(route).not.toMatch(/ariaLabel="Assign cast roles"/);
    expect(modals).toMatch(/ariaLabel="Run image batch jobs"/);
    expect(modals).toMatch(/ariaLabel="Rename role"/);
    expect(modals).toMatch(/ariaLabel="Assign cast roles"/);
    expect(modals).not.toMatch(/useEffect|useLayoutEffect|useState|useReducer|useMemo/);
    expect(modals).not.toMatch(/\bfetch\s*\(|adminStream|patchShowRole|assignRolesToCastMember/);
    expect(modals).not.toMatch(/["'`]\/api\//);
  });
});
