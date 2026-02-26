import { describe, expect, it } from "vitest";

import { buildShadeMatrix, buildThemes } from "@/lib/admin/color-lab/theme-contrast";

const PALETTE = ["#412733", "#383D73", "#1E2044", "#0E0B1A", "#1D101C", "#495194", "#BE8FB8"];

describe("color-lab theme contrast", () => {
  it("builds the shade matrix from +90% to -90% plus original", () => {
    const rows = buildShadeMatrix(PALETTE);
    expect(rows.length).toBe(19);
    expect(rows[0]?.label).toBe("+90%");
    expect(rows[9]?.label).toBe("Original");
    expect(rows[18]?.label).toBe("-90%");
    expect(rows[9]?.colors).toEqual(PALETTE);
  });

  it("builds light and dark themes with AA pass flags", () => {
    const themes = buildThemes(PALETTE, 4.5);
    expect(themes).toHaveLength(2);
    expect(themes[0]?.mode).toBe("light");
    expect(themes[1]?.mode).toBe("dark");

    for (const theme of themes) {
      expect(theme.cells.length).toBe(PALETTE.length);
      for (const cell of theme.cells) {
        expect(cell.contrast).toBeGreaterThanOrEqual(4.5);
        expect(cell.passes).toBe(true);
      }
      expect(theme.passes).toBe(true);
    }
  });
});
