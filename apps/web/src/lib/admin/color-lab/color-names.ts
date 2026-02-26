import { hexToRgb, rgbToHsl } from "@/lib/admin/color-lab/color-math";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hueFamily(hue: number): string {
  if (hue < 12 || hue >= 348) return "red";
  if (hue < 28) return "orange";
  if (hue < 48) return "amber";
  if (hue < 66) return "yellow";
  if (hue < 88) return "lime";
  if (hue < 142) return "green";
  if (hue < 176) return "teal";
  if (hue < 202) return "cyan";
  if (hue < 230) return "blue";
  if (hue < 255) return "indigo";
  if (hue < 290) return "violet";
  if (hue < 326) return "magenta";
  return "rose";
}

function neutralFamily(hue: number, lightness: number): string {
  if (lightness < 12) return "ink-black";
  if (lightness < 22) return "charcoal";
  if (hue < 40 || hue >= 320) return "coffee-bean";
  if (hue >= 40 && hue < 80) return "olive-stone";
  if (hue >= 200 && hue < 280) return "slate";
  return "graphite";
}

function lightnessDescriptor(lightness: number): string {
  if (lightness <= 12) return "midnight";
  if (lightness <= 22) return "ink";
  if (lightness <= 32) return "dusk";
  if (lightness <= 44) return "deep";
  if (lightness <= 58) return "twilight";
  if (lightness <= 72) return "soft";
  if (lightness <= 84) return "pastel";
  return "frost";
}

function saturationDescriptor(saturation: number): string {
  if (saturation <= 16) return "muted";
  if (saturation >= 72) return "vivid";
  return "";
}

function baseColorName(hex: string, fallbackIndex: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `color-${fallbackIndex + 1}`;

  const hsl = rgbToHsl(rgb);
  const descriptor = lightnessDescriptor(hsl.lightness);
  const saturation = saturationDescriptor(hsl.saturation);

  if (hsl.saturation < 14) {
    return neutralFamily(hsl.hue, hsl.lightness);
  }

  const family = hueFamily(hsl.hue);
  const parts = [descriptor, saturation, family].filter(Boolean);
  return parts.join("-");
}

export function buildDescriptiveColorNames(hexColors: string[]): string[] {
  const used = new Map<string, number>();

  return hexColors.map((hex, index) => {
    const raw = slugify(baseColorName(hex, index)) || `color-${index + 1}`;
    const existing = used.get(raw) ?? 0;
    used.set(raw, existing + 1);
    return existing === 0 ? raw : `${raw}-${existing + 1}`;
  });
}
