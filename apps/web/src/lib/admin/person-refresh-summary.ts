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

  let textOverlayNote: string | null = null;
  if (configured === false || skippedReason === "not_configured") {
    textOverlayNote = "Text overlay skipped (not configured).";
  } else if ((configured === true && candidates === 0) || skippedReason === "no_pending_images") {
    textOverlayNote = "Text overlay already up to date (no pending images).";
  }

  const countsText = parts.length > 0 ? parts.join(", ") : null;
  if (countsText && textOverlayNote) {
    return `${countsText}. ${textOverlayNote}`;
  }
  return textOverlayNote ?? countsText;
}
