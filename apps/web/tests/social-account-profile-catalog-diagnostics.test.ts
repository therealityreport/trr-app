import { describe, expect, it } from "vitest";
import { buildCatalogProgressDiagnosticRows } from "@/components/admin/SocialAccountProfilePage";
import type { SocialAccountCatalogRunProgressSnapshot } from "@/lib/admin/social-account-profile";

const baseProgress = (
  overrides: Partial<SocialAccountCatalogRunProgressSnapshot> = {},
): SocialAccountCatalogRunProgressSnapshot => ({
  run_id: "run-diag-1",
  run_status: "running",
  source_scope: "bravo",
  stages: {},
  per_handle: [],
  recent_log: [],
  ...overrides,
});

describe("buildCatalogProgressDiagnosticRows comments-skip + worker reconciliation", () => {
  it("surfaces the comments-skip reason, detail, and operator action", () => {
    const rows = buildCatalogProgressDiagnosticRows(
      baseProgress({
        comments_skip_reason: "posts_auth_blocked",
        comments_skip_detail: "Instagram posts auth was blocked before commentable targets were ready.",
        comments_operator_action: "Complete manual Instagram auth, then rerun the comments lane.",
      }),
    );

    const skipRow = rows.find((row) => row.key === "comments-skip-reason");
    expect(skipRow).toBeDefined();
    expect(skipRow?.label).toBe("Comments Skipped");
    expect(skipRow?.value).toBe("Posts auth blocked");
    expect(skipRow?.detail).toContain("Instagram posts auth was blocked");
    expect(skipRow?.detail).toContain("Operator action: Complete manual Instagram auth");
  });

  it("falls back to a humanized token for unknown skip reasons and omits the row when absent", () => {
    const unknown = buildCatalogProgressDiagnosticRows(
      baseProgress({ comments_skip_reason: "some_new_backend_reason" }),
    );
    const unknownRow = unknown.find((row) => row.key === "comments-skip-reason");
    expect(unknownRow?.value).toBe("some new backend reason");
    expect(unknownRow?.detail).toBeNull();

    const none = buildCatalogProgressDiagnosticRows(baseProgress());
    expect(none.some((row) => row.key === "comments-skip-reason")).toBe(false);
  });

  it("shows applied-vs-requested detail workers, the binding cap, and the cap note", () => {
    const rows = buildCatalogProgressDiagnosticRows(
      baseProgress({
        selected_tasks: ["post_details"],
        requested_details_worker_count: 8,
        details_refresh_worker_count: 4,
        live_apply_binding_cap: 4,
        worker_cap_note: "Capped to 4 by the live apply binding cap.",
      }),
    );

    const workerRow = rows.find((row) => row.key === "detail-worker-count");
    expect(workerRow).toBeDefined();
    expect(workerRow?.value).toBe("4 applied · 8 requested");
    expect(workerRow?.detail).toContain("Binding cap 4.");
    expect(workerRow?.detail).toContain("Capped to 4 by the live apply binding cap.");
  });

  it("keeps the simple worker count when requested equals applied", () => {
    const rows = buildCatalogProgressDiagnosticRows(
      baseProgress({
        selected_tasks: ["post_details"],
        requested_details_worker_count: 4,
        details_refresh_worker_count: 4,
      }),
    );

    const workerRow = rows.find((row) => row.key === "detail-worker-count");
    expect(workerRow?.value).toBe("4 workers");
  });
});
