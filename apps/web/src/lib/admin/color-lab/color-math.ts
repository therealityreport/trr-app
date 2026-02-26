export interface Rgb {
  red: number;
  green: number;
  blue: number;
}

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(HEX_RE);
  if (!match) return null;

  const raw = match[1];
  if (!raw) return null;

  const six =
    raw.length === 3
      ? `${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`
      : raw.length === 8
        ? raw.slice(0, 6)
        : raw;
  return `#${six.toUpperCase()}`;
}

export function toHexByte(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0").toUpperCase();
}

export function rgbToHex(rgb: Rgb): string {
  return `#${toHexByte(rgb.red)}${toHexByte(rgb.green)}${toHexByte(rgb.blue)}`;
}

export function hexToRgb(value: string): Rgb | null {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;

  const hex = normalized.slice(1);
  return {
    red: parseInt(hex.slice(0, 2), 16),
    green: parseInt(hex.slice(2, 4), 16),
    blue: parseInt(hex.slice(4, 6), 16),
  };
}

function toLinearChannel(channel: number): number {
  const normalized = clamp(channel / 255, 0, 1);
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(rgb: Rgb): number {
  const red = toLinearChannel(rgb.red);
  const green = toLinearChannel(rgb.green);
  const blue = toLinearChannel(rgb.blue);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(firstHex: string, secondHex: string): number {
  const first = hexToRgb(firstHex);
  const second = hexToRgb(secondHex);
  if (!first || !second) return 1;

  const firstLum = relativeLuminance(first);
  const secondLum = relativeLuminance(second);
  const lighter = Math.max(firstLum, secondLum);
  const darker = Math.min(firstLum, secondLum);
  return (lighter + 0.05) / (darker + 0.05);
}

export function rgbToHsl(rgb: Rgb): { hue: number; saturation: number; lightness: number } {
  const red = clamp(rgb.red / 255, 0, 1);
  const green = clamp(rgb.green / 255, 0, 1);
  const blue = clamp(rgb.blue / 255, 0, 1);

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    hue: Math.round(hue),
    saturation: Math.round(saturation * 100),
    lightness: Math.round(lightness * 100),
  };
}

function hueToRgbComponent(p: number, q: number, t: number): number {
  let next = t;
  if (next < 0) next += 1;
  if (next > 1) next -= 1;
  if (next < 1 / 6) return p + (q - p) * 6 * next;
  if (next < 1 / 2) return q;
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
  return p;
}

export function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
  const h = ((hue % 360) + 360) % 360 / 360;
  const s = clamp(saturation / 100, 0, 1);
  const l = clamp(lightness / 100, 0, 1);

  if (s === 0) {
    const gray = Math.round(l * 255);
    return { red: gray, green: gray, blue: gray };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    red: Math.round(hueToRgbComponent(p, q, h + 1 / 3) * 255),
    green: Math.round(hueToRgbComponent(p, q, h) * 255),
    blue: Math.round(hueToRgbComponent(p, q, h - 1 / 3) * 255),
  };
}

export function shiftHexLightness(hex: string, ratio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000000";

  const hsl = rgbToHsl(rgb);
  const delta = clamp(ratio, -1, 1);
  const nextLightness =
    delta >= 0
      ? hsl.lightness + (100 - hsl.lightness) * delta
      : hsl.lightness * (1 + delta);

  return rgbToHex(hslToRgb(hsl.hue, hsl.saturation, nextLightness));
}

export function mixHex(firstHex: string, secondHex: string, ratio: number): string {
  const first = hexToRgb(firstHex);
  const second = hexToRgb(secondHex);
  if (!first || !second) return "#000000";

  const clamped = clamp(ratio, 0, 1);
  return rgbToHex({
    red: first.red + (second.red - first.red) * clamped,
    green: first.green + (second.green - first.green) * clamped,
    blue: first.blue + (second.blue - first.blue) * clamped,
  });
}

export function pickBestTextColor(backgroundHex: string): { text: "#111111" | "#FFFFFF"; contrast: number } {
  const darkRatio = contrastRatio(backgroundHex, "#111111");
  const lightRatio = contrastRatio(backgroundHex, "#FFFFFF");
  return darkRatio >= lightRatio
    ? { text: "#111111", contrast: darkRatio }
    : { text: "#FFFFFF", contrast: lightRatio };
}

export function ensureContrast(
  backgroundHex: string,
  minContrast = 4.5
): { background: string; text: "#111111" | "#FFFFFF"; contrast: number; passes: boolean } {
  const candidate = normalizeHexColor(backgroundHex) ?? "#000000";
  let best = pickBestTextColor(candidate);
  if (best.contrast >= minContrast) {
    return {
      background: candidate,
      text: best.text,
      contrast: best.contrast,
      passes: true,
    };
  }

  // Try adjusting lightness in both directions until AA passes.
  for (let step = 1; step <= 20; step += 1) {
    const ratio = step / 20;
    const lighter = shiftHexLightness(candidate, ratio);
    const lighterBest = pickBestTextColor(lighter);
    if (lighterBest.contrast >= minContrast) {
      return {
        background: lighter,
        text: lighterBest.text,
        contrast: lighterBest.contrast,
        passes: true,
      };
    }

    const darker = shiftHexLightness(candidate, -ratio);
    const darkerBest = pickBestTextColor(darker);
    if (darkerBest.contrast >= minContrast) {
      return {
        background: darker,
        text: darkerBest.text,
        contrast: darkerBest.contrast,
        passes: true,
      };
    }
  }

  best = pickBestTextColor(candidate);
  return {
    background: candidate,
    text: best.text,
    contrast: best.contrast,
    passes: best.contrast >= minContrast,
  };
}

export function hexToRgbaString(hex: string, alpha = 1): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "rgba(0, 0, 0, 1)";
  return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${clamp(alpha, 0, 1)})`;
}

export function hexToHslString(hex: string, alpha = 1): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "hsla(0, 0%, 0%, 1)";
  const hsl = rgbToHsl(rgb);
  return `hsla(${hsl.hue}, ${hsl.saturation}%, ${hsl.lightness}%, ${clamp(alpha, 0, 1)})`;
}

export function withOpaqueAlpha(hex: string): string {
  const normalized = normalizeHexColor(hex) ?? "#000000";
  return `${normalized}FF`.toUpperCase();
}
