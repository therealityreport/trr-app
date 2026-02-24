import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  getTagsByPhotoIds,
  setCastPhotoFaceBoxes,
  upsertCastPhotoTags,
} from "@/lib/server/admin/cast-photo-tags-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ photoId: string }>;
}

interface RawPerson {
  id?: unknown;
  name?: unknown;
}

interface FaceBoxInput {
  index?: unknown;
  kind?: unknown;
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  confidence?: unknown;
  person_id?: unknown;
  person_name?: unknown;
  label?: unknown;
}

const normalizePeople = (raw: unknown): { id?: string; name: string }[] => {
  if (!Array.isArray(raw)) return [];
  const byKey = new Map<string, { id?: string; name: string }>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as RawPerson;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    if (!name) continue;
    const key = id ? `id:${id}` : `name:${name.toLowerCase()}`;
    if (!byKey.has(key)) {
      byKey.set(key, { id: id || undefined, name });
    }
  }
  return Array.from(byKey.values());
};

const uniqueNames = (people: { id?: string; name: string }[]): string[] => {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const person of people) {
    const key = person.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(person.name);
  }
  return names;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const normalizeFaceBoxes = (
  raw: unknown
):
  | Array<{
      index: number;
      kind: "face";
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number | null;
      person_id?: string;
      person_name?: string;
      label?: string;
    }>
  | null => {
  if (raw === null) return null;
  if (!Array.isArray(raw)) return [];
  const out: Array<{
    index: number;
    kind: "face";
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number | null;
    person_id?: string;
    person_name?: string;
    label?: string;
  }> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as FaceBoxInput;
    const x = typeof candidate.x === "number" && Number.isFinite(candidate.x) ? clamp01(candidate.x) : null;
    const y = typeof candidate.y === "number" && Number.isFinite(candidate.y) ? clamp01(candidate.y) : null;
    const width =
      typeof candidate.width === "number" && Number.isFinite(candidate.width)
        ? clamp01(candidate.width)
        : null;
    const height =
      typeof candidate.height === "number" && Number.isFinite(candidate.height)
        ? clamp01(candidate.height)
        : null;
    if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) {
      continue;
    }
    const index =
      typeof candidate.index === "number" && Number.isFinite(candidate.index)
        ? Math.max(1, Math.floor(candidate.index))
        : out.length + 1;
    const confidence =
      typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence)
        ? clamp01(candidate.confidence)
        : null;
    const personId = typeof candidate.person_id === "string" && candidate.person_id.trim() ? candidate.person_id.trim() : undefined;
    const personName =
      typeof candidate.person_name === "string" && candidate.person_name.trim()
        ? candidate.person_name.trim()
        : undefined;
    const label = typeof candidate.label === "string" && candidate.label.trim() ? candidate.label.trim() : undefined;

    out.push({
      index,
      kind: "face",
      x,
      y,
      width,
      height,
      confidence,
      ...(personId ? { person_id: personId } : {}),
      ...(personName ? { person_name: personName } : {}),
      ...(label ? { label } : {}),
    });
  }
  return out;
};

/**
 * PUT /api/admin/trr-api/cast-photos/[photoId]/tags
 *
 * Update people tags for a cast photo in admin.cast_photo_people_tags.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { photoId } = await params;

    if (!photoId) {
      return NextResponse.json({ error: "photoId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const people = normalizePeople((body as { people?: unknown }).people);
    const hasFaceBoxes = Object.prototype.hasOwnProperty.call(
      body as Record<string, unknown>,
      "face_boxes"
    );
    const faceBoxes = hasFaceBoxes
      ? normalizeFaceBoxes((body as { face_boxes?: unknown }).face_boxes)
      : undefined;
    const peopleIds = people.map((p) => p.id).filter(Boolean) as string[];
    const peopleNames = uniqueNames(people);

    const peopleCountRaw = (body as { people_count?: unknown }).people_count;
    const hasExplicitCount = Object.prototype.hasOwnProperty.call(
      body as Record<string, unknown>,
      "people_count"
    );

    const existingTags = (await getTagsByPhotoIds([photoId])).get(photoId) ?? null;
    let peopleCount = existingTags?.people_count ?? null;
    let peopleCountSource = existingTags?.people_count_source ?? null;

    if (hasExplicitCount) {
      peopleCount =
        typeof peopleCountRaw === "number" && Number.isFinite(peopleCountRaw)
          ? Math.max(0, Math.floor(peopleCountRaw))
          : null;
      peopleCountSource = peopleCount !== null ? "manual" : null;
    } else if (peopleNames.length > 0 || peopleIds.length > 0) {
      // Tag edits without explicit count are still a manual tagging action.
      peopleCountSource = "manual";
    }

    const result = await upsertCastPhotoTags({
      cast_photo_id: photoId,
      people_names: peopleNames.length > 0 ? peopleNames : null,
      people_ids: peopleIds.length > 0 ? peopleIds : null,
      people_count: peopleCount,
      people_count_source: peopleCountSource,
      updated_by_firebase_uid: user.uid,
      created_by_firebase_uid: user.uid,
    });

    if (!result) {
      return NextResponse.json({ error: "Failed to update tags" }, { status: 500 });
    }

    if (hasFaceBoxes) {
      const faceBoxesPersisted = await setCastPhotoFaceBoxes(photoId, faceBoxes ?? null);
      if (!faceBoxesPersisted) {
        return NextResponse.json({ error: "Failed to update face boxes" }, { status: 500 });
      }
    }

    return NextResponse.json({
      people_names: result.people_names ?? [],
      people_ids: result.people_ids ?? [],
      people_count: result.people_count,
      people_count_source: result.people_count_source ?? peopleCountSource,
      face_boxes: hasFaceBoxes ? faceBoxes ?? null : null,
    });
  } catch (error) {
    console.error("[api] Failed to update cast photo tags", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
