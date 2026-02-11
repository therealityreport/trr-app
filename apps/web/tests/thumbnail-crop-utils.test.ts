import { describe, expect, it } from "vitest";

import {
  clampThumbnailCrop,
  parseThumbnailCrop,
  resolveAutoThumbnailFocus,
  resolveThumbnailPresentation,
  resolveThumbnailViewportRect,
} from "@/lib/thumbnail-crop";

describe("thumbnail-crop utils", () => {
  it("uses portrait/square auto focus at upper center", () => {
    expect(resolveAutoThumbnailFocus(1000, 1400)).toEqual({ x: 50, y: 30 });
    expect(resolveAutoThumbnailFocus(1000, 1000)).toEqual({ x: 50, y: 30 });
  });

  it("uses landscape auto focus lower than portrait", () => {
    expect(resolveAutoThumbnailFocus(1400, 1000)).toEqual({ x: 50, y: 35 });
  });

  it("falls back to neutral auto focus when dimensions are missing", () => {
    expect(resolveAutoThumbnailFocus(null, null)).toEqual({ x: 50, y: 32 });
  });

  it("prefers manual crop presentation over auto heuristics", () => {
    const result = resolveThumbnailPresentation({
      width: 1800,
      height: 1200,
      peopleCount: 1,
      crop: { x: 42, y: 26, zoom: 1.23, mode: "manual" },
    });

    expect(result.mode).toBe("manual");
    expect(result.objectPosition).toBe("42% 26%");
    expect(result.zoom).toBe(1.23);
  });

  it("uses persisted auto crop when available", () => {
    const result = resolveThumbnailPresentation({
      width: 1800,
      height: 1200,
      peopleCount: 1,
      crop: { x: 61, y: 37, zoom: 1.18, mode: "auto" },
    });

    expect(result.mode).toBe("auto");
    expect(result.objectPosition).toBe("61% 37%");
    expect(result.zoom).toBe(1.18);
  });

  it("clamps out-of-range manual crop values", () => {
    const clamped = clampThumbnailCrop({ x: -50, y: 130, zoom: 5, mode: "manual" });

    expect(clamped).toEqual({ x: 0, y: 100, zoom: 4, mode: "manual" });
  });

  it("supports strict validation when clamp=false", () => {
    expect(
      parseThumbnailCrop({ x: -1, y: 20, zoom: 1.1, mode: "manual" }, { clamp: false }),
    ).toBeNull();

    expect(
      parseThumbnailCrop({ x: 10, y: 20, zoom: 1.1, mode: "manual" }, { clamp: false }),
    ).toEqual({ x: 10, y: 20, zoom: 1.1, mode: "manual" });
  });

  it("uses solo-focused auto framing for portrait images", () => {
    const result = resolveThumbnailPresentation({
      width: 1000,
      height: 1400,
      peopleCount: 1,
    });

    expect(result.mode).toBe("auto");
    expect(result.objectPosition).toBe("50% 28%");
    expect(result.zoom).toBe(1.1);
  });

  it("uses solo-focused auto framing for landscape images", () => {
    const result = resolveThumbnailPresentation({
      width: 1600,
      height: 1000,
      peopleCount: 1,
    });

    expect(result.mode).toBe("auto");
    expect(result.objectPosition).toBe("50% 32%");
    expect(result.zoom).toBe(1.12);
  });

  it("computes preview viewport box for 4:5 thumbnails", () => {
    const rect = resolveThumbnailViewportRect({
      imageWidth: 1000,
      imageHeight: 1500,
      focusX: 50,
      focusY: 50,
      zoom: 1,
      aspectRatio: 4 / 5,
    });

    expect(rect).toEqual({
      leftPct: 0,
      topPct: 8.333333333333332,
      widthPct: 100,
      heightPct: 83.33333333333334,
    });
  });

  it("clamps preview viewport to image bounds near edges", () => {
    const rect = resolveThumbnailViewportRect({
      imageWidth: 1200,
      imageHeight: 900,
      focusX: 0,
      focusY: 0,
      zoom: 1.6,
      aspectRatio: 4 / 5,
    });

    expect(rect).not.toBeNull();
    expect(rect!.leftPct).toBe(0);
    expect(rect!.topPct).toBe(0);
    expect(rect!.widthPct).toBeLessThanOrEqual(100);
    expect(rect!.heightPct).toBeLessThanOrEqual(100);
  });
});
