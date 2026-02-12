import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  ensureMediaLinksForPeople,
  getMediaLinkById,
  updateMediaLinksContext,
  type TagPerson,
} from "@/lib/server/trr-api/media-links-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ linkId: string }>;
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
    ? Math.max(1, Math.floor(value))
    : null;

const parseCountSource = (value: unknown): "auto" | "manual" | null =>
  value === "auto" || value === "manual" ? value : null;

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
    };

    await ensureMediaLinksForPeople(link.media_asset_id, people, mergedContext);
    await updateMediaLinksContext(link.media_asset_id, mergedContext);

    return NextResponse.json({
      people_names: peopleNames,
      people_ids: peopleIds,
      people_count: peopleCount,
      people_count_source: peopleCountSource,
    });
  } catch (error) {
    console.error("[api] Failed to update media link tags", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
