import {
  hexToHslString,
  hexToRgbaString,
  normalizeHexColor,
  withOpaqueAlpha,
} from "@/lib/admin/color-lab/color-math";
import { buildDescriptiveColorNames } from "@/lib/admin/color-lab/color-names";
import type { ExportBundle } from "@/lib/admin/color-lab/types";

function normalizeColors(colors: string[]): string[] {
  return colors
    .map((color) => normalizeHexColor(color))
    .filter((value): value is string => Boolean(value));
}

function joinLines(lines: string[]): string {
  return lines.join("\n");
}

export function buildPaletteExportBundle(colors: string[]): ExportBundle {
  const normalized = normalizeColors(colors);
  const names = buildDescriptiveColorNames(normalized);
  const hexWithAlpha = normalized.map((hex) => withOpaqueAlpha(hex));

  const cssHex = joinLines([
    "/* CSS HEX */",
    ...names.map((name, index) => `--${name}: ${hexWithAlpha[index]?.toLowerCase() ?? "#000000ff"};`),
  ]);

  const cssHsl = joinLines([
    "/* CSS HSL */",
    ...names.map((name, index) => `--${name}: ${hexToHslString(normalized[index] ?? "#000000", 1)};`),
  ]);

  const scssHex = joinLines([
    "/* SCSS HEX */",
    ...names.map((name, index) => `$${name}: ${hexWithAlpha[index]?.toLowerCase() ?? "#000000ff"};`),
  ]);

  const scssHsl = joinLines([
    "/* SCSS HSL */",
    ...names.map((name, index) => `$${name}: ${hexToHslString(normalized[index] ?? "#000000", 1)};`),
  ]);

  const scssRgb = joinLines([
    "/* SCSS RGB */",
    ...names.map((name, index) => `$${name}: ${hexToRgbaString(normalized[index] ?? "#000000", 1)};`),
  ]);

  const gradientStops = hexWithAlpha.length > 0 ? hexWithAlpha.map((hex) => hex.toLowerCase()).join(", ") : "#000000ff";
  const scssGradient = joinLines([
    "/* SCSS Gradient */",
    `$gradient-top: linear-gradient(0deg, ${gradientStops});`,
    `$gradient-right: linear-gradient(90deg, ${gradientStops});`,
    `$gradient-bottom: linear-gradient(180deg, ${gradientStops});`,
    `$gradient-left: linear-gradient(270deg, ${gradientStops});`,
    `$gradient-top-right: linear-gradient(45deg, ${gradientStops});`,
    `$gradient-bottom-right: linear-gradient(135deg, ${gradientStops});`,
    `$gradient-top-left: linear-gradient(225deg, ${gradientStops});`,
    `$gradient-bottom-left: linear-gradient(315deg, ${gradientStops});`,
    `$gradient-radial: radial-gradient(${gradientStops});`,
  ]);

  const all = joinLines([cssHex, "", cssHsl, "", scssHex, "", scssHsl, "", scssRgb, "", scssGradient]);

  return {
    cssHex,
    cssHsl,
    scssHex,
    scssHsl,
    scssRgb,
    scssGradient,
    all,
  };
}
