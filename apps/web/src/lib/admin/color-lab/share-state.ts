import { buildDesignSystemHref } from "@/lib/admin/design-system-routing";
import { normalizeHexColor } from "@/lib/admin/color-lab/color-math";
import type { ColorLabShareState, PaletteLibrarySourceType, PaletteSamplePoint } from "@/lib/admin/color-lab/types";

const SHARE_STATE_VERSION = 1;

interface SerializedColorLabShareStateV1 {
  v: 1;
  s: PaletteLibrarySourceType;
  u: string | null;
  t: string | null;
  n: number | null;
  c: string[];
  d: number;
  m: PaletteSamplePoint[];
  p: string | null;
}

function encodeText(input: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf8").toString("base64url");
  }

  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeText(input: string): string | null {
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(input, "base64url").toString("utf8");
    }

    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${base64}${"=".repeat((4 - (base64.length % 4 || 4)) % 4)}`;
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function isSourceType(value: unknown): value is PaletteLibrarySourceType {
  return value === "upload" || value === "url" || value === "media_library";
}

function normalizeMarkerPoints(value: unknown): PaletteSamplePoint[] | null {
  if (!Array.isArray(value)) return null;

  const points: PaletteSamplePoint[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Partial<PaletteSamplePoint>;
    if (
      typeof candidate.x !== "number" ||
      typeof candidate.y !== "number" ||
      typeof candidate.radius !== "number"
    ) {
      return null;
    }
    if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.y) || !Number.isFinite(candidate.radius)) {
      return null;
    }
    points.push({
      x: Math.min(1, Math.max(0, candidate.x)),
      y: Math.min(1, Math.max(0, candidate.y)),
      radius: Math.min(120, Math.max(1, candidate.radius)),
    });
  }

  return points;
}

function normalizeColors(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const colors = value
    .map((entry) => (typeof entry === "string" ? normalizeHexColor(entry) : null))
    .filter((entry): entry is string => Boolean(entry));

  if (colors.length < 3 || colors.length > 10) {
    return null;
  }

  return colors;
}

function normalizeSeasonNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.trunc(value);
}

function normalizeSelectedPaletteEntryId(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeShareState(value: unknown): ColorLabShareState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SerializedColorLabShareStateV1>;

  if (candidate.v !== SHARE_STATE_VERSION || !isSourceType(candidate.s)) {
    return null;
  }

  const colors = normalizeColors(candidate.c);
  const markerPoints = normalizeMarkerPoints(candidate.m);
  if (!colors || !markerPoints || markerPoints.length !== colors.length) {
    return null;
  }

  const seed = typeof candidate.d === "number" && Number.isFinite(candidate.d)
    ? Math.trunc(candidate.d)
    : null;
  if (seed === null) {
    return null;
  }

  return {
    sourceType: candidate.s,
    sourceImageUrl: typeof candidate.u === "string" && candidate.u.trim().length > 0 ? candidate.u.trim() : null,
    trrShowId: typeof candidate.t === "string" && candidate.t.trim().length > 0 ? candidate.t.trim() : null,
    seasonNumber: normalizeSeasonNumber(candidate.n),
    colors,
    seed,
    markerPoints,
    selectedPaletteEntryId: normalizeSelectedPaletteEntryId(candidate.p),
  };
}

export function encodeColorLabShareState(state: ColorLabShareState): string {
  const payload: SerializedColorLabShareStateV1 = {
    v: SHARE_STATE_VERSION,
    s: state.sourceType,
    u: state.sourceImageUrl,
    t: state.trrShowId,
    n: state.seasonNumber,
    c: state.colors,
    d: state.seed,
    m: state.markerPoints,
    p: state.selectedPaletteEntryId,
  };

  return encodeText(JSON.stringify(payload));
}

export function decodeColorLabShareState(payload: string | null | undefined): ColorLabShareState | null {
  if (!payload) return null;

  const decodedText = decodeText(payload);
  if (!decodedText) return null;

  try {
    const parsed = JSON.parse(decodedText) as unknown;
    return normalizeShareState(parsed);
  } catch {
    return null;
  }
}

export function buildColorLabShareHref(state: ColorLabShareState): `/design-system/${string}` {
  const pathname = buildDesignSystemHref("colors");
  return `${pathname}?palette=${encodeURIComponent(encodeColorLabShareState(state))}`;
}

export type { ColorLabShareState } from "@/lib/admin/color-lab/types";
