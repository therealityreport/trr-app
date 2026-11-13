import type { components } from "@/lib/server/trr-api/generated/instagram-counts";

/** Generated from the backend's additive contract; legacy counters do not supply inventory. */
export type InstagramCountObservation = components["schemas"]["CommentCountObservation"];
export type InstagramCommentCounts = components["schemas"]["InstagramCommentCounts"];
export type InstagramCommentCountsSummary = components["schemas"]["InstagramCommentCountsSummary"];
export const INSTAGRAM_COUNT_LABELS = {
  post: "Post comment count",
  saved: "Saved Instagram comments and replies",
  topLevel: "Saved top-level comments",
  replies: "Saved replies",
  markedMissing: "Previously saved records marked missing",
  facebook: "Facebook comments shown on Instagram",
  threads: "Threads comments shown on Instagram",
  difference: "Post count minus saved Instagram records",
} as const;
export const INSTAGRAM_COUNT_METRICS = {
  post: { label: INSTAGRAM_COUNT_LABELS.post, unit: "reported comments", scope: "Instagram post response", description: "The count reported for this post. Its scope and relationship to saved records are unverified." },
  saved: { label: INSTAGRAM_COUNT_LABELS.saved, unit: "comment records", scope: "canonical Instagram saved inventory", description: "Active saved Instagram comment and reply records. Previously saved records marked missing are listed separately." },
  facebook: { label: INSTAGRAM_COUNT_LABELS.facebook, unit: "reported comments", scope: "Facebook count in an Instagram response", description: "An independent source observation. Overlap with the post count is unverified." },
  threads: { label: INSTAGRAM_COUNT_LABELS.threads, unit: "reported comments", scope: "Threads count in an Instagram response", description: "An independent source observation. Overlap with the post count is unverified." },
  difference: { label: INSTAGRAM_COUNT_LABELS.difference, unit: "signed count difference", scope: "post count compared with saved Instagram records", description: "Arithmetic only. A positive or negative value does not establish missing, hidden, or removed comments." },
} as const;
export function knownCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export function formatInstagramCount(value: unknown, signed = false): string {
  const count = knownCount(value);
  if (count === null) return "Unknown";
  return new Intl.NumberFormat("en-US", { signDisplay: signed ? "exceptZero" : "auto" }).format(count);
}
export function instagramExploratoryComparison(counts?: InstagramCommentCounts | null) {
  const values = [counts?.instagram_saved_count, counts?.facebook_count_observed_on_instagram, counts?.threads_count_observed_on_instagram].map(knownCount);
  const sum = values.every(value => value !== null) ? values.reduce<number>((total, value) => total + (value ?? 0), 0) : null;
  const post = knownCount(counts?.post_reported_count);
  const difference = post !== null && sum !== null ? post - sum : null;
  const missingInputs = [counts?.post_reported_count == null ? INSTAGRAM_COUNT_LABELS.post : null, counts?.instagram_saved_count == null ? INSTAGRAM_COUNT_LABELS.saved : null, counts?.facebook_count_observed_on_instagram == null ? INSTAGRAM_COUNT_LABELS.facebook : null, counts?.threads_count_observed_on_instagram == null ? INSTAGRAM_COUNT_LABELS.threads : null].filter(label => label !== null);
  return { sum, difference, missingInputs, agreement: difference === 0 ? "Counts match numerically; relationship unverified." : null };
}
export function instagramSummaryObservation(summary: InstagramCommentCountsSummary | null | undefined, source: "post_reported" | "facebook" | "threads"): string {
  if (!summary) return "Unknown";
  const subtotal = knownCount(summary[`${source}_known_subtotal`]);
  const known = knownCount(summary[`${source}_known_posts_count`]);
  const unknown = knownCount(summary[`${source}_unknown_posts_count`]);
  return `${formatInstagramCount(subtotal)} known subtotal · ${formatInstagramCount(known)} posts known · ${formatInstagramCount(unknown)} posts unknown`;
}

export function instagramInventoryExplanation(summary: InstagramCommentCountsSummary | null | undefined, kind: "saved" | "difference" = "saved"): string {
  const available = summary?.inventory_status === "available" && knownCount(summary.instagram_saved_count) !== null;
  if (!available) return kind === "difference"
    ? "The difference is unknown because saved Instagram inventory is unavailable."
    : "Saved Instagram inventory is unavailable. The saved count is unknown.";
  if (kind === "difference") return instagramSummaryObservation(summary, "post_reported");
  const observedAt = summary.inventory_observed_at ? new Date(summary.inventory_observed_at).toLocaleString() : "Unknown";
  return `Canonical saved Instagram comment records. Inventory observed: ${observedAt}.`;
}
export const INSTAGRAM_RUN_STATUS_LABELS = { queued: "Queued", pending: "Queued", retrying: "Waiting to retry", cancelling: "Cancelling", running: "Running", paused: "Paused", held: "Held", cancelled: "Cancelled", completed: "Finished", failed: "Failed" } as const;
export const INSTAGRAM_TARGET_OUTCOME_LABELS = { committed: "Targets saved", cached_satisfied: "Targets already satisfied", source_unavailable: "Unavailable from source", unresolved: "Unresolved targets" } as const;
export function instagramRunStatusLabel(value?: string | null, evidence?: { execution_hold_reason?: string | null; retry_at?: string | null }): string {
  if (value === "blocked") return evidence?.execution_hold_reason ? "Held" : evidence?.retry_at ? "Waiting to retry" : "Unknown";
  return value && value in INSTAGRAM_RUN_STATUS_LABELS ? INSTAGRAM_RUN_STATUS_LABELS[value as keyof typeof INSTAGRAM_RUN_STATUS_LABELS] : "Unknown";
}
export function instagramScanStatusLabel(value?: string | null): string {
  const labels: Record<string, string> = { not_started: "Not started", in_progress: "In progress", running: "In progress", interrupted: "Interrupted", cancelled: "Interrupted", finished: "Finished", completed: "Finished", exhausted: "Finished", unknown: "Unknown" };
  return value ? labels[value] ?? "Unknown" : "Unknown";
}
/** A false legacy acceptance flag alone is not evidence of verification failure. */
export function instagramVerificationLabel(value: { final_acceptance?: boolean | null; verification_status?: string | null; verification_details?: unknown } | null | undefined): string {
  const state = value?.verification_status;
  if (state === "not_checked") return "Not checked";
  if (state === "checks_pending") return "Checks pending";
  const labels: Record<string, string> = { passed: "Passed", verified: "Passed", failed: "Blocked", blocked: "Blocked", running: "Checks pending", unavailable: "Blocked" };
  const details = value?.verification_details;
  const hasDetails = typeof details === "string" ? Boolean(details.trim()) : Boolean(details && typeof details === "object" && Object.keys(details).length);
  return hasDetails && state ? labels[state] ?? "Not verified" : "Not verified";
}
