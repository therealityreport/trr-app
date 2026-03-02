const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  return null;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
};

export function formatPersonRefreshSummary(summary: unknown): string | null {
  if (typeof summary === "string") return summary;
  if (!summary || typeof summary !== "object") return null;

  const summaryRecord = summary as Record<string, unknown>;
  const parts = Object.entries(summaryRecord)
    .filter(([, value]) => typeof value === "number")
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`);

  const configured = toBoolean(summaryRecord.text_overlay_configured);
  const candidates = toNumber(summaryRecord.text_overlay_candidates);
  const skippedReason =
    typeof summaryRecord.text_overlay_skipped_reason === "string"
      ? summaryRecord.text_overlay_skipped_reason
      : null;
  const failedPartsRaw = Array.isArray(summaryRecord.failed_parts) ? summaryRecord.failed_parts : [];
  const failedParts = failedPartsRaw
    .map((part) => {
      if (!part || typeof part !== "object") return null;
      const record = part as Record<string, unknown>;
      const partName = typeof record.part === "string" ? record.part : null;
      const failed = toNumber(record.failed);
      if (!partName || failed === null || failed <= 0) return null;
      return `${partName.replace(/_/g, " ")} (${failed})`;
    })
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const retryAttemptsRaw =
    summaryRecord.retry_attempts && typeof summaryRecord.retry_attempts === "object"
      ? (summaryRecord.retry_attempts as Record<string, unknown>)
      : null;
  const retryStageCount = retryAttemptsRaw
    ? Object.values(retryAttemptsRaw).filter((value) => toNumber(value) !== null && (toNumber(value) ?? 0) > 1).length
    : 0;

  let textOverlayNote: string | null = null;
  if (configured === false || skippedReason === "not_configured") {
    textOverlayNote = "Text overlay skipped (not configured).";
  } else if ((configured === true && candidates === 0) || skippedReason === "no_pending_images") {
    textOverlayNote = "Text overlay already up to date (no pending images).";
  }
  const failedPartsNote =
    failedParts.length > 0 ? `Failed parts: ${failedParts.join(", ")}.` : null;
  const retryNote =
    retryStageCount > 0
      ? `Partial retries ran for ${retryStageCount} stage${retryStageCount === 1 ? "" : "s"}.`
      : null;

  const countsText = parts.length > 0 ? parts.join(", ") : null;
  const notes = [textOverlayNote, failedPartsNote, retryNote].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  if (countsText && notes.length > 0) {
    return `${countsText}. ${notes.join(" ")}`;
  }
  if (countsText) return countsText;
  if (notes.length > 0) return notes.join(" ");
  return null;
}
