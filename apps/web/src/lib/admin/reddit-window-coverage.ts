/** Window provenance counts are supplied by the backend, never inferred from run absence. */
export interface RedditWindowCoverageCounts {
  captured_container_count?: number;
  covered_container_count?: number;
  partial_container_count?: number;
  uncovered_container_count?: number;
  upcoming_container_count?: number;
  unknown_container_count?: number;
  proven_through?: string | null;
}

export function formatRedditWindowCoverage(coverage?: RedditWindowCoverageCounts): string {
  if (coverage?.covered_container_count == null) return "Window coverage unknown";
  const counts = [
    [coverage.covered_container_count, "covered"],
    [coverage.partial_container_count, "partial"],
    [coverage.uncovered_container_count, "uncovered"],
    [coverage.upcoming_container_count, "upcoming"],
    [coverage.unknown_container_count, "unknown"],
  ] as const;
  return counts.filter(([count]) => (count ?? 0) > 0).map(([count, label]) => `${count} ${label}`).join(" · ") || "No windows";
}

export function describeRedditWindowCoverage(
  status: { coverage_state?: "covered" | "partial" | "uncovered" | "upcoming" | "unknown"; covered_through?: string | null },
  formatDate: (value: string) => string = (value) => value,
): string {
  switch (status.coverage_state) {
    case "covered": return "Covered by recorded capture";
    case "partial": return status.covered_through
      ? `Partially captured · through ${formatDate(status.covered_through)}`
      : "Partially captured";
    case "uncovered": return "No recorded capture for this window";
    case "upcoming": return "Upcoming window";
    default: return "Window coverage unknown";
  }
}
