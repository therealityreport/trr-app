import { describe, it, expect } from "vitest";
import { formatBytes, formatImageCandidateBadgeText } from "@/lib/image-scrape-preview";

describe("image-scrape-preview formatters", () => {
  it("formatBytes returns null for null/undefined/invalid", () => {
    expect(formatBytes(null)).toBeNull();
    expect(formatBytes(undefined)).toBeNull();
    expect(formatBytes(Number.NaN)).toBeNull();
    expect(formatBytes(-1)).toBeNull();
  });

  it("formatBytes renders B/KB/MB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(999)).toBe("999 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });

  it("formatImageCandidateBadgeText prefers dimensions, appends size when present", () => {
    expect(
      formatImageCandidateBadgeText({ width: 800, height: 600, bytes: 1024 * 1024 }),
    ).toBe("800x600 · 1 MB");

    expect(formatImageCandidateBadgeText({ width: 800, height: null, bytes: 1024 })).toBe(
      "800w · 1 KB",
    );

    expect(formatImageCandidateBadgeText({ width: null, height: null, bytes: 1024 })).toBe("1 KB");
    expect(formatImageCandidateBadgeText({ width: null, height: null, bytes: null })).toBeNull();
  });
});

