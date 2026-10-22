import { describe, expect, it } from "vitest";
import { describeRedditWindowCoverage, formatRedditWindowCoverage } from "@/lib/admin/reddit-window-coverage";

describe("Reddit window provenance labels", () => {
  it("keeps partial and future windows separate from covered windows", () => {
    expect(formatRedditWindowCoverage({ covered_container_count: 5, partial_container_count: 2, upcoming_container_count: 7 })).toBe("5 covered · 2 partial · 7 upcoming");
  });
  it("does not infer coverage from missing run history or zero stale runs", () => {
    expect(formatRedditWindowCoverage()).toBe("Window coverage unknown");
    expect(formatRedditWindowCoverage({ covered_container_count: 0, unknown_container_count: 14 })).toBe("14 unknown");
  });
  it("keeps uncovered and upcoming windows distinct", () => {
    expect(formatRedditWindowCoverage({ covered_container_count: 0, uncovered_container_count: 1, upcoming_container_count: 2 })).toBe("1 uncovered · 2 upcoming");
  });
  it("never labels upcoming, partial or unknown cards recovered", () => {
    expect(describeRedditWindowCoverage({ coverage_state: "upcoming" })).toBe("Upcoming window");
    expect(describeRedditWindowCoverage({ coverage_state: "partial", covered_through: "fixed-cutoff" })).toBe("Partially captured · through fixed-cutoff");
    expect(describeRedditWindowCoverage({})).toBe("Window coverage unknown");
  });

});
