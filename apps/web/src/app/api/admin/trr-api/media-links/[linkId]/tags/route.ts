import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  ensureMediaLinksForPeople,
  getMediaLinksByAssetId,
  getMediaLinkById,
  setMediaLinkContextById,
  type TagPerson,
} from "@/lib/server/trr-api/media-links-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ linkId: string }>;
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

const normalizePeople = (raw: unknown): TagPerson[] => {
  if (!Array.isArray(raw)) return [];
  const byKey = new Map<string, TagPerson>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as { id?: unknown; name?: unknown };
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

const uniqueNames = (people: TagPerson[]): string[] => {
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

const parseCount = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : null;

const parseCountSource = (value: unknown): "auto" | "manual" | null =>
  value === "auto" || value === "manual" ? value : null;

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
 * PUT /api/admin/trr-api/media-links/[linkId]/tags
 *
 * Update people tags for a media asset, ensuring tagged people
 * are linked to the asset and context is updated across links.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { linkId } = await params;

    if (!linkId) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
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

    const link = await getMediaLinkById(linkId);
    if (!link) {
      return NextResponse.json({ error: "Media link not found" }, { status: 404 });
    }

    const peopleIds = people.map((p) => p.id).filter(Boolean) as string[];
    const peopleNames = uniqueNames(people);
    const baseContext =
      link.context && typeof link.context === "object" ? link.context : {};
    const peopleCountRaw = (body as { people_count?: unknown }).people_count;
    const hasExplicitCount = Object.prototype.hasOwnProperty.call(
      body as Record<string, unknown>,
      "people_count"
    );
    let peopleCount = parseCount(baseContext.people_count);
    let peopleCountSource = parseCountSource(baseContext.people_count_source);

    if (hasExplicitCount) {
      peopleCount = parseCount(peopleCountRaw);
      peopleCountSource = peopleCount !== null ? "manual" : null;
    } else if (peopleNames.length > 0 || peopleIds.length > 0) {
      // Tag edits without explicit count are still a manual tagging action.
      peopleCountSource = "manual";
    }

    const mergedContext: Record<string, unknown> = {
      ...baseContext,
      people_ids: peopleIds,
      people_names: peopleNames,
      people_count: peopleCount,
      people_count_source: peopleCountSource,
      ...(hasFaceBoxes ? { face_boxes: faceBoxes ?? null } : {}),
    };

    await ensureMediaLinksForPeople(link.media_asset_id, people, mergedContext);
    const linksForAsset = await getMediaLinksByAssetId(link.media_asset_id);
    const targetEntityIds = new Set<string>([
      ...(typeof link.entity_id === "string" && link.entity_id.trim().length > 0
        ? [link.entity_id]
        : []),
      ...peopleIds,
    ]);
    const linkIdsToUpdate = linksForAsset
      .filter((candidate) => candidate.id === linkId || targetEntityIds.has(candidate.entity_id))
      .map((candidate) => candidate.id);
    if (linkIdsToUpdate.length === 0) {
      linkIdsToUpdate.push(linkId);
    }
    await Promise.all(
      linkIdsToUpdate.map(async (candidateLinkId) => {
        const existingLink = linksForAsset.find((candidate) => candidate.id === candidateLinkId);
        const existingContext =
          existingLink?.context && typeof existingLink.context === "object"
            ? (existingLink.context as Record<string, unknown>)
            : {};
        const nextContext: Record<string, unknown> = {
          ...existingContext,
          people_ids: peopleIds,
          people_names: peopleNames,
          people_count: peopleCount,
          people_count_source: peopleCountSource,
          ...(hasFaceBoxes ? { face_boxes: faceBoxes ?? null } : {}),
        };
        await setMediaLinkContextById(candidateLinkId, nextContext);
      })
    );

    return NextResponse.json({
      people_names: peopleNames,
      people_ids: peopleIds,
      people_count: peopleCount,
      people_count_source: peopleCountSource,
      face_boxes: hasFaceBoxes ? faceBoxes ?? null : null,
    });
  } catch (error) {
    console.error("[api] Failed to update media link tags", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
