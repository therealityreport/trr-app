import { clamp, normalizeHexColor, rgbToHex } from "@/lib/admin/color-lab/color-math";
import type { PaletteExtractionResult, PaletteSamplePoint } from "@/lib/admin/color-lab/types";

interface PixelRgb {
  red: number;
  green: number;
  blue: number;
}

const DEFAULT_RADIUS = 24;

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function seededRandom(seed: number): () => number {
  let next = (seed >>> 0) || 1;
  return () => {
    next = Math.imul(1664525, next) + 1013904223;
    return ((next >>> 0) & 0xffffffff) / 0x100000000;
  };
}

function pointDistanceSquared(a: PaletteSamplePoint, b: PaletteSamplePoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function generateSamplePoints(
  width: number,
  height: number,
  count: number,
  seed: number,
  radius = DEFAULT_RADIUS,
): PaletteSamplePoint[] {
  const rng = seededRandom(seed);
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const normalizedRadius = clamp(radius, 4, 80);
  const marginX = normalizedRadius / safeWidth;
  const marginY = normalizedRadius / safeHeight;

  const points: PaletteSamplePoint[] = [];
  const minDistance = Math.min(0.2, 0.9 / Math.max(count, 1));
  const minDistanceSq = minDistance * minDistance;

  const maxAttempts = count * 80;
  for (let attempt = 0; attempt < maxAttempts && points.length < count; attempt += 1) {
    const candidate: PaletteSamplePoint = {
      x: clamp(marginX + rng() * (1 - marginX * 2), 0.02, 0.98),
      y: clamp(marginY + rng() * (1 - marginY * 2), 0.02, 0.98),
      radius: normalizedRadius,
    };

    if (points.every((existing) => pointDistanceSquared(existing, candidate) >= minDistanceSq)) {
      points.push(candidate);
    }
  }

  while (points.length < count) {
    points.push({ x: rng(), y: rng(), radius: normalizedRadius });
  }

  return points;
}

function samplePointAverage(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  point: PaletteSamplePoint,
): PixelRgb {
  const centerX = clamp(Math.round(point.x * (width - 1)), 0, width - 1);
  const centerY = clamp(Math.round(point.y * (height - 1)), 0, height - 1);
  const radius = clamp(Math.round(point.radius), 1, Math.max(width, height));

  let red = 0;
  let green = 0;
  let blue = 0;
  let samples = 0;

  const left = Math.max(0, centerX - radius);
  const right = Math.min(width - 1, centerX + radius);
  const top = Math.max(0, centerY - radius);
  const bottom = Math.min(height - 1, centerY + radius);

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy > radius * radius) continue;
      const offset = (y * width + x) * 4;
      red += pixels[offset] ?? 0;
      green += pixels[offset + 1] ?? 0;
      blue += pixels[offset + 2] ?? 0;
      samples += 1;
    }
  }

  if (samples === 0) {
    return { red: 0, green: 0, blue: 0 };
  }

  return {
    red: Math.round(red / samples),
    green: Math.round(green / samples),
    blue: Math.round(blue / samples),
  };
}

function colorDistanceSquared(first: PixelRgb, second: PixelRgb): number {
  const dr = first.red - second.red;
  const dg = first.green - second.green;
  const db = first.blue - second.blue;
  return dr * dr + dg * dg + db * db;
}

function dedupeColors(colors: PixelRgb[], maxCount: number): PixelRgb[] {
  const deduped: PixelRgb[] = [];
  for (const color of colors) {
    const isNearExisting = deduped.some((existing) => colorDistanceSquared(existing, color) < 18 * 18);
    if (!isNearExisting) deduped.push(color);
    if (deduped.length >= maxCount) break;
  }

  if (deduped.length >= maxCount) return deduped;

  for (const color of colors) {
    if (deduped.length >= maxCount) break;
    deduped.push(color);
  }

  while (deduped.length < maxCount) {
    deduped.push(deduped[deduped.length - 1] ?? { red: 0, green: 0, blue: 0 });
  }

  return deduped;
}

export function extractPaletteFromImageData(
  imageData: ImageData,
  points: PaletteSamplePoint[],
  count: number,
): string[] {
  const safeCount = clamp(count, 1, 20);
  const sampled = points
    .slice(0, safeCount)
    .map((point) => samplePointAverage(imageData.data, imageData.width, imageData.height, point));

  const deduped = dedupeColors(sampled, safeCount);
  return deduped
    .map((rgb) => rgbToHex(rgb))
    .map((hex) => normalizeHexColor(hex) ?? "#000000");
}

export function buildPaletteFromImageData(params: {
  imageData: ImageData;
  count: number;
  seedStep: number;
  imageIdentity: string;
  radius?: number;
}): PaletteExtractionResult {
  const safeCount = clamp(params.count, 1, 20);
  const normalizedSeedStep = clamp(Math.round(params.seedStep), 0, 1000);
  const seed = hashString(`${params.imageIdentity}:${normalizedSeedStep}`);
  const points = generateSamplePoints(
    params.imageData.width,
    params.imageData.height,
    safeCount,
    seed,
    params.radius,
  );
  const colors = extractPaletteFromImageData(params.imageData, points, safeCount);

  return {
    seed,
    points,
    colors,
  };
}
