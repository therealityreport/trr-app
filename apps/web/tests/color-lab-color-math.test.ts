import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  ensureContrast,
  hexToHslString,
  hexToRgbaString,
  normalizeHexColor,
  shiftHexLightness,
} from "@/lib/admin/color-lab/color-math";

describe("color-lab color math", () => {
  it("normalizes 3, 6, and 8 digit hex values", () => {
    expect(normalizeHexColor("#abc")).toBe("#AABBCC");
    expect(normalizeHexColor(" a1b2c3 ")).toBe("#A1B2C3");
    expect(normalizeHexColor("112233ff")).toBe("#112233");
  });

  it("computes strong contrast for black and white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 4);
  });

  it("can shift lightness in both directions", () => {
    expect(shiftHexLightness("#204080", 0.4)).not.toBe("#204080");
    expect(shiftHexLightness("#204080", -0.4)).not.toBe("#204080");
  });

  it("enforces AA contrast using ensureContrast", () => {
    const ensured = ensureContrast("#777777", 4.5);
    expect(ensured.passes).toBe(true);
    expect(ensured.contrast).toBeGreaterThanOrEqual(4.5);
  });

  it("formats rgba and hsla strings", () => {
    expect(hexToRgbaString("#412733")).toBe("rgba(65, 39, 51, 1)");
    expect(hexToHslString("#412733")).toMatch(/^hsla\(/);
  });
});
