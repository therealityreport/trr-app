import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { upsertCastPhotoTags } from "@/lib/server/admin/cast-photo-tags-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ photoId: string }>;
}

interface RawPerson {
  id?: unknown;
  name?: unknown;
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
    const peopleIds = people.map((p) => p.id).filter(Boolean) as string[];
    const peopleNames = uniqueNames(people);

    const peopleCountRaw = (body as { people_count?: unknown }).people_count;
    const hasExplicitCount = Object.prototype.hasOwnProperty.call(
      body as Record<string, unknown>,
      "people_count"
    );
    const peopleCount =
      hasExplicitCount && typeof peopleCountRaw === "number" && Number.isFinite(peopleCountRaw)
        ? Math.max(1, Math.floor(peopleCountRaw))
        : null;

    const peopleCountSource = hasExplicitCount && peopleCount !== null ? "manual" : null;

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

    return NextResponse.json({
      people_names: result.people_names ?? [],
      people_ids: result.people_ids ?? [],
      people_count: result.people_count,
      people_count_source: result.people_count_source ?? peopleCountSource,
    });
  } catch (error) {
    console.error("[api] Failed to update cast photo tags", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
