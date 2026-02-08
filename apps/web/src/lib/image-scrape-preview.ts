"use client";

export function formatBytes(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined) return null;
  if (!Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) return `${Math.round(value)} B`;

  const fixed = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  const normalized = fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
  return `${normalized} ${units[unitIndex]}`;
}

export function formatImageCandidateBadgeText(input: {
  width: number | null;
  height: number | null;
  bytes?: number | null;
}): string | null {
  const width =
    typeof input.width === "number" && Number.isFinite(input.width) ? input.width : null;
  const height =
    typeof input.height === "number" && Number.isFinite(input.height) ? input.height : null;
  const size = formatBytes(input.bytes ?? null);

  if (width && height) return size ? `${width}x${height} · ${size}` : `${width}x${height}`;
  if (width) return size ? `${width}w · ${size}` : `${width}w`;
  if (size) return size;
  return null;
}

