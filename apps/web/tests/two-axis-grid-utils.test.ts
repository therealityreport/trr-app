import { describe, it, expect } from "vitest";
import {
  coercePlacements,
  coordToPercent,
  fanOffset,
  snapFromRectCenterToCoord,
} from "@/components/survey/twoAxisGridUtils";

describe("twoAxisGridUtils", () => {
  it("coordToPercent maps extremes and center correctly (extent=5)", () => {
    expect(coordToPercent(-5, 5, 5)).toEqual({ leftPct: 0, topPct: 0 });
    expect(coordToPercent(5, -5, 5)).toEqual({ leftPct: 100, topPct: 100 });
    expect(coordToPercent(0, 0, 5)).toEqual({ leftPct: 50, topPct: 50 });
  });

  it("snapFromRectCenterToCoord rounds and clamps to [-extent, +extent]", () => {
    const boardRect = { left: 0, top: 0, width: 100, height: 100 } satisfies Pick<
      DOMRect,
      "left" | "top" | "width" | "height"
    >;

    // Center
    expect(
      snapFromRectCenterToCoord({ left: 45, top: 45, width: 10, height: 10 }, boardRect, 5),
    ).toEqual({ x: 0, y: 0 });

    // Top-left corner
    expect(
      snapFromRectCenterToCoord({ left: -5, top: -5, width: 10, height: 10 }, boardRect, 5),
    ).toEqual({ x: -5, y: 5 });

    // Bottom-right corner
    expect(
      snapFromRectCenterToCoord({ left: 95, top: 95, width: 10, height: 10 }, boardRect, 5),
    ).toEqual({ x: 5, y: -5 });

    // Far outside clamps
    expect(
      snapFromRectCenterToCoord({ left: -1000, top: 2000, width: 10, height: 10 }, boardRect, 5),
    ).toEqual({ x: -5, y: -5 });
  });

  it("coercePlacements drops unknown ids, rounds, and clamps coords", () => {
    const subjects = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];

    const value = {
      a: { x: 10, y: -10 },
      b: { x: 2.2, y: "3" },
      c: { x: 0, y: 0 },
    };

    expect(coercePlacements(value, subjects as any, 5)).toEqual({
      a: { x: 5, y: -5 },
      b: { x: 2, y: 3 },
    });
  });

  it("fanOffset is deterministic and returns finite offsets", () => {
    const a = fanOffset(0, 2, 36);
    const b = fanOffset(1, 2, 36);

    expect(a).toEqual(fanOffset(0, 2, 36));
    expect(b).toEqual(fanOffset(1, 2, 36));

    expect(Number.isFinite(a.dx)).toBe(true);
    expect(Number.isFinite(a.dy)).toBe(true);
    expect(Number.isFinite(b.dx)).toBe(true);
    expect(Number.isFinite(b.dy)).toBe(true);

    // Should not collapse to identical offsets for different indices in small counts
    expect(a.dx === b.dx && a.dy === b.dy).toBe(false);
  });
});
