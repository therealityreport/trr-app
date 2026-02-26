import {
  clamp,
  contrastRatio,
  ensureContrast,
  mixHex,
  normalizeHexColor,
  shiftHexLightness,
} from "@/lib/admin/color-lab/color-math";
import type { GeneratedTheme, ShadeMatrixRow, ThemeCell } from "@/lib/admin/color-lab/types";

const SHADE_STEPS: Array<{ label: string; ratio: number }> = [
  { label: "+90%", ratio: 0.9 },
  { label: "+80%", ratio: 0.8 },
  { label: "+70%", ratio: 0.7 },
  { label: "+60%", ratio: 0.6 },
  { label: "+50%", ratio: 0.5 },
  { label: "+40%", ratio: 0.4 },
  { label: "+30%", ratio: 0.3 },
  { label: "+20%", ratio: 0.2 },
  { label: "+10%", ratio: 0.1 },
  { label: "Original", ratio: 0 },
  { label: "-10%", ratio: -0.1 },
  { label: "-20%", ratio: -0.2 },
  { label: "-30%", ratio: -0.3 },
  { label: "-40%", ratio: -0.4 },
  { label: "-50%", ratio: -0.5 },
  { label: "-60%", ratio: -0.6 },
  { label: "-70%", ratio: -0.7 },
  { label: "-80%", ratio: -0.8 },
  { label: "-90%", ratio: -0.9 },
];

export function buildShadeMatrix(colors: string[]): ShadeMatrixRow[] {
  const normalized = colors
    .map((color) => normalizeHexColor(color))
    .filter((value): value is string => Boolean(value));

  return SHADE_STEPS.map((step) => ({
    label: step.label,
    ratio: step.ratio,
    colors: normalized.map((color) =>
      step.ratio === 0 ? color : shiftHexLightness(color, step.ratio)
    ),
  }));
}

function buildThemeCells(baseColors: string[], mode: "light" | "dark", minContrast: number): ThemeCell[] {
  return baseColors.map((color) => {
    const normalized = normalizeHexColor(color) ?? "#000000";
    const transformed =
      mode === "light"
        ? normalized
        : mixHex(normalized, "#FFFFFF", 0.72);

    const ensured = ensureContrast(transformed, minContrast);

    if (ensured.passes) {
      return {
        background: ensured.background,
        text: ensured.text,
        contrast: ensured.contrast,
        passes: true,
      };
    }

    // Last-resort fallback by nudging further in both directions.
    for (let step = 1; step <= 15; step += 1) {
      const ratio = clamp(step / 15, 0.05, 1);
      const lighter = ensureContrast(shiftHexLightness(transformed, ratio), minContrast);
      if (lighter.passes) {
        return {
          background: lighter.background,
          text: lighter.text,
          contrast: lighter.contrast,
          passes: true,
        };
      }

      const darker = ensureContrast(shiftHexLightness(transformed, -ratio), minContrast);
      if (darker.passes) {
        return {
          background: darker.background,
          text: darker.text,
          contrast: darker.contrast,
          passes: true,
        };
      }
    }

    const ratio = contrastRatio(transformed, ensured.text);
    return {
      background: transformed,
      text: ensured.text,
      contrast: ratio,
      passes: ratio >= minContrast,
    };
  });
}

export function buildThemes(colors: string[], minContrast = 4.5): GeneratedTheme[] {
  const normalized = colors
    .map((color) => normalizeHexColor(color))
    .filter((value): value is string => Boolean(value));

  const lightCells = buildThemeCells(normalized, "light", minContrast);
  const darkCells = buildThemeCells(normalized, "dark", minContrast);

  return [
    {
      mode: "light",
      cells: lightCells,
      passes: lightCells.every((cell) => cell.passes),
    },
    {
      mode: "dark",
      cells: darkCells,
      passes: darkCells.every((cell) => cell.passes),
    },
  ];
}
