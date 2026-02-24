import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  getShowById,
  updateShowById,
  validateShowImageForField,
} from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function normalizeUuidOrNull(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!UUID_RE.test(trimmed)) {
    throw new Error("invalid_uuid");
  }
  return trimmed;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/**
 * GET /api/admin/trr-api/shows/[showId]
 *
 * Get a single show from TRR Core API by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { showId } = await params;

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

    const show = await getShowById(showId);

    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    return NextResponse.json({ show });
  } catch (error) {
    console.error("[api] Failed to get TRR show", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/admin/trr-api/shows/[showId]
 *
 * Update editable TRR show fields (details + default image IDs).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { showId } = await params;

    if (!showId) {
      return NextResponse.json({ error: "showId is required" }, { status: 400 });
    }
    if (!UUID_RE.test(showId)) {
      return NextResponse.json({ error: "showId must be a UUID" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const name = normalizeText(body.name);
    const description = normalizeText(body.description);
    const premiereDateRaw = normalizeText(body.premiere_date);
    const nickname = normalizeText(body.nickname);
    const alternativeNamesInput = normalizeStringArray(body.alternative_names);
    const primaryPosterImageId = normalizeUuidOrNull(body.primary_poster_image_id);
    const primaryBackdropImageId = normalizeUuidOrNull(body.primary_backdrop_image_id);
    const primaryLogoImageId = normalizeUuidOrNull(body.primary_logo_image_id);

    if (name !== undefined && name.length === 0) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }

    let premiereDate: string | null | undefined;
    if (premiereDateRaw !== undefined) {
      if (premiereDateRaw.length === 0) {
        premiereDate = null;
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(premiereDateRaw)) {
        return NextResponse.json(
          { error: "premiere_date must be YYYY-MM-DD or empty" },
          { status: 400 }
        );
      } else {
        const parsed = new Date(premiereDateRaw + "T00:00:00");
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: "premiere_date is not a valid calendar date" },
            { status: 400 }
          );
        }
        premiereDate = premiereDateRaw;
      }
    }

    let alternativeNames: string[] | undefined;
    if (nickname !== undefined || alternativeNamesInput !== undefined) {
      const combined: string[] = [];
      if (nickname && nickname.length > 0) combined.push(nickname);
      if (alternativeNamesInput && alternativeNamesInput.length > 0) {
        combined.push(...alternativeNamesInput);
      }
      const seen = new Set<string>();
      const deduped: string[] = [];
      for (const candidate of combined) {
        const key = candidate.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(candidate);
      }
      alternativeNames = deduped;
    }

    if (primaryPosterImageId) {
      const isValidPoster = await validateShowImageForField(
        showId,
        primaryPosterImageId,
        "poster"
      );
      if (!isValidPoster) {
        console.warn("[api] Rejected invalid featured poster image assignment", {
          showId,
          field: "primary_poster_image_id",
          imageId: primaryPosterImageId,
        });
        return NextResponse.json(
          { error: "primary_poster_image_id must reference a poster image for this show" },
          { status: 400 }
        );
      }
    }

    if (primaryBackdropImageId) {
      const isValidBackdrop = await validateShowImageForField(
        showId,
        primaryBackdropImageId,
        "backdrop"
      );
      if (!isValidBackdrop) {
        console.warn("[api] Rejected invalid featured backdrop image assignment", {
          showId,
          field: "primary_backdrop_image_id",
          imageId: primaryBackdropImageId,
        });
        return NextResponse.json(
          { error: "primary_backdrop_image_id must reference a backdrop image for this show" },
          { status: 400 }
        );
      }
    }

    const show = await updateShowById(showId, {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description.length > 0 ? description : null } : {}),
      ...(premiereDate !== undefined ? { premiereDate } : {}),
      ...(alternativeNames !== undefined ? { alternativeNames } : {}),
      ...(primaryPosterImageId !== undefined ? { primaryPosterImageId } : {}),
      ...(primaryBackdropImageId !== undefined ? { primaryBackdropImageId } : {}),
      ...(primaryLogoImageId !== undefined ? { primaryLogoImageId } : {}),
    });

    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    return NextResponse.json({ show });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_uuid") {
      return NextResponse.json(
        {
          error:
            "primary_poster_image_id, primary_backdrop_image_id, and primary_logo_image_id must be UUIDs or null",
        },
        { status: 400 }
      );
    }
    console.error("[api] Failed to update TRR show", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
