import { describe, expect, it } from "vitest";
import {
  buildInstagramCatalogCapacityQuery,
  describeInstagramCatalogCapacity,
  type InstagramCatalogCapacitySnapshot,
} from "@/components/admin/SocialAccountProfilePage";

const capacity = (
  overrides: Partial<InstagramCatalogCapacitySnapshot> = {},
): InstagramCatalogCapacitySnapshot => ({
  available: true,
  blocked: false,
  safe_combined_worker_limit: 10,
  remaining_workers: 6,
  raw_requested_workers: 4,
  backend_effective_requested_workers: 4,
  effective_details_worker_count: 2,
  effective_comments_worker_count: 2,
  active_db_jobs: 0,
  dispatched_unclaimed_jobs: 0,
  nonterminal_remote_call_ids: [],
  ...overrides,
});

describe("Instagram catalog capacity presentation", () => {
  it("shows a clean backend-effective snapshot without blocking Start", () => {
    const result = describeInstagramCatalogCapacity(capacity());

    expect(result.blocked).toBe(false);
    expect(result.warning).toBeNull();
    expect(result.summary).toContain("2 detail + 2 comments (4 combined)");
    expect(result.summary).toContain("6 of 10 slots remain");
  });

  it("blocks Start only when the fresh backend snapshot is blocked", () => {
    const result = describeInstagramCatalogCapacity(
      capacity({ blocked: true, remaining_workers: 1 }),
    );

    expect(result.blocked).toBe(true);
    expect(result.warning).toContain("Start is blocked");
  });

  it("warns without blocking when current capacity is unavailable", () => {
    const result = describeInstagramCatalogCapacity(null, true);

    expect(result.blocked).toBe(false);
    expect(result.warning).toContain("backend will make the final safety decision");
  });

  it("uses the backend-effective zero-session result for a media-only request", () => {
    const query = buildInstagramCatalogCapacityQuery({
      selectedTasks: ["media"],
      detailWorkerCount: 8,
      commentsWorkerCount: 8,
    });
    const result = describeInstagramCatalogCapacity(
      capacity({
        raw_requested_workers: 0,
        backend_effective_requested_workers: 0,
        effective_details_worker_count: 0,
        effective_comments_worker_count: 0,
      }),
    );

    expect(query.get("selected_tasks")).toBe("media");
    expect(query.get("detail_worker_count")).toBe("8");
    expect(query.get("comments_worker_count")).toBe("8");
    expect(result.summary).toContain("0 detail + 0 comments (0 combined)");
  });

  it("shows raw 8+8 as backend-effective 2+2", () => {
    const result = describeInstagramCatalogCapacity(
      capacity({ raw_requested_workers: 16 }),
    );

    expect(result.summary).toContain("2 detail + 2 comments (4 combined)");
    expect(result.summary).toContain("16 raw requested");
  });
});
