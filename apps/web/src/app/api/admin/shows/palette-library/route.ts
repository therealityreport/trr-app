import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/server/auth";
import {
  createPaletteLibraryEntry,
  listPaletteLibraryEntriesByShow,
  type PaletteLibrarySourceType,
  type PaletteSamplePoint,
} from "@/lib/server/shows/shows-repository";
import { isValidUuid } from "@/lib/server/validation/identifiers";

export const dynamic = "force-dynamic";

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function normalizeHex(hex: string): string | null {
  const trimmed = hex.trim();
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

function parseSeasonNumber(value: string | null): number | null | undefined {
  if (value === null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "all") return null;
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function parseSourceType(value: unknown): PaletteLibrarySourceType | null {
  if (value === "upload" || value === "url" || value === "media_library") {
    return value;
  }
  return null;
}

function parseMarkerPoints(value: unknown): PaletteSamplePoint[] | null {
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

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const trrShowId = request.nextUrl.searchParams.get("trrShowId")?.trim() ?? "";
    if (!isValidUuid(trrShowId)) {
      return NextResponse.json({ error: "trrShowId must be a valid UUID" }, { status: 400 });
    }

    const seasonParam = request.nextUrl.searchParams.get("seasonNumber");
    const seasonNumber = parseSeasonNumber(seasonParam);
    if (seasonParam !== null && seasonParam.trim() !== "" && seasonNumber === undefined) {
      return NextResponse.json(
        { error: "seasonNumber must be a positive integer or 'all'" },
        { status: 400 },
      );
    }

    const includeAllSeasonEntries = request.nextUrl.searchParams.get("includeAll") !== "0";

    const entries = await listPaletteLibraryEntriesByShow(trrShowId, {
      seasonNumber,
      includeAllSeasonEntries,
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[api] Failed to load palette library", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const trrShowId = typeof body.trrShowId === "string" ? body.trrShowId.trim() : "";
    if (!isValidUuid(trrShowId)) {
      return NextResponse.json({ error: "trrShowId must be a valid UUID" }, { status: 400 });
    }

    const rawSeasonNumber = body.seasonNumber;
    const seasonNumber =
      rawSeasonNumber === null || rawSeasonNumber === undefined || rawSeasonNumber === "all"
        ? null
        : Number.parseInt(String(rawSeasonNumber), 10);

    if (seasonNumber !== null && (!Number.isFinite(seasonNumber) || seasonNumber <= 0)) {
      return NextResponse.json({ error: "seasonNumber must be null, 'all', or a positive integer" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const colorsRaw = Array.isArray(body.colors) ? body.colors : [];
    const colors = colorsRaw
      .map((entry) => (typeof entry === "string" ? normalizeHex(entry) : null))
      .filter((entry): entry is string => Boolean(entry));

    if (colors.length < 3 || colors.length > 10) {
      return NextResponse.json({ error: "colors must contain between 3 and 10 valid hex entries" }, { status: 400 });
    }

    const sourceType = parseSourceType(body.sourceType);
    if (!sourceType) {
      return NextResponse.json(
        { error: "sourceType must be one of upload, url, media_library" },
        { status: 400 },
      );
    }

    const sourceImageUrl = typeof body.sourceImageUrl === "string" && body.sourceImageUrl.trim().length > 0
      ? body.sourceImageUrl.trim()
      : null;

    const seed = Number.parseInt(String(body.seed ?? ""), 10);
    if (!Number.isFinite(seed)) {
      return NextResponse.json({ error: "seed must be a valid integer" }, { status: 400 });
    }

    const markerPoints = parseMarkerPoints(body.markerPoints);
    if (!markerPoints || markerPoints.length !== colors.length) {
      return NextResponse.json(
        { error: "markerPoints must be a valid array matching the colors length" },
        { status: 400 },
      );
    }

    const entry = await createPaletteLibraryEntry({
      trrShowId,
      seasonNumber,
      name,
      colors,
      sourceType,
      sourceImageUrl,
      seed,
      markerPoints,
      createdByUid: user.uid,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create palette library entry", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A palette with this name already exists for the selected show/season scope" },
        { status: 409 },
      );
    }

    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
