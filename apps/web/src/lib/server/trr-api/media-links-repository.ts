import "server-only";

import { query } from "@/lib/server/postgres";
import type { ThumbnailCrop } from "@/lib/thumbnail-crop";

export interface MediaLinkRow {
  id: string;
  entity_type: string;
  entity_id: string;
  media_asset_id: string;
  kind: string;
  position: number | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface TagPerson {
  id?: string;
  name: string;
}

const MEDIA_LINK_FIELDS =
  "id, entity_type, entity_id, media_asset_id, kind, position, context, created_at";

export async function getMediaLinkById(linkId: string): Promise<MediaLinkRow | null> {
  const result = await query<MediaLinkRow>(
    `SELECT ${MEDIA_LINK_FIELDS}
     FROM core.media_links
     WHERE id = $1::uuid
     LIMIT 1`,
    [linkId]
  );
  return result.rows[0] ?? null;
}

export async function getMediaLinksByAssetId(
  mediaAssetId: string
): Promise<MediaLinkRow[]> {
  const result = await query<MediaLinkRow>(
    `SELECT ${MEDIA_LINK_FIELDS}
     FROM core.media_links
     WHERE media_asset_id = $1::uuid
       AND entity_type = 'person'
       AND kind = 'gallery'`,
    [mediaAssetId]
  );
  return result.rows;
}

export async function ensureMediaLinksForPeople(
  mediaAssetId: string,
  people: TagPerson[],
  baseContext: Record<string, unknown>
): Promise<void> {
  const peopleWithIds = people.filter((person) => Boolean(person.id));
  if (peopleWithIds.length === 0) return;

  const existing = await getMediaLinksByAssetId(mediaAssetId);
  const existingIds = new Set(existing.map((link) => link.entity_id));

  const rows = peopleWithIds
    .filter((person) => person.id && !existingIds.has(person.id))
    .map((person) => ({
      entity_type: "person",
      entity_id: person.id as string,
      media_asset_id: mediaAssetId,
      kind: "gallery",
      position: null,
      context: baseContext,
    }));

  if (rows.length === 0) return;

  const values: unknown[] = [];
  const tuples: string[] = [];
  let idx = 1;
  for (const row of rows) {
    tuples.push(
      `($${idx++}::text, $${idx++}::uuid, $${idx++}::uuid, $${idx++}::text, $${idx++}::int, $${idx++}::jsonb)`
    );
    values.push(
      row.entity_type,
      row.entity_id,
      row.media_asset_id,
      row.kind,
      row.position,
      JSON.stringify(row.context ?? {})
    );
  }

  await query(
    `INSERT INTO core.media_links (entity_type, entity_id, media_asset_id, kind, position, context)
     VALUES ${tuples.join(", ")}`,
    values
  );
}

export async function updateMediaLinksContext(
  mediaAssetId: string,
  context: Record<string, unknown>
): Promise<void> {
  await query(
    `UPDATE core.media_links
     SET context = $2::jsonb
     WHERE media_asset_id = $1::uuid
       AND entity_type = 'person'
       AND kind = 'gallery'`,
    [mediaAssetId, JSON.stringify(context)]
  );
}

export async function setMediaLinkContextById(
  linkId: string,
  context: Record<string, unknown>
): Promise<MediaLinkRow | null> {
  const result = await query<MediaLinkRow>(
    `UPDATE core.media_links
     SET context = $2::jsonb,
         updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING ${MEDIA_LINK_FIELDS}`,
    [linkId, JSON.stringify(context)]
  );
  return result.rows[0] ?? null;
}

export interface CreateMediaLinkParams {
  media_asset_id: string;
  entity_type: "person" | "season" | "show" | "episode";
  entity_id: string;
  kind?: string;
  context?: Record<string, unknown>;
}

export interface CreateMediaLinkResult {
  link: MediaLinkRow;
  already_exists: boolean;
}

export interface MediaLinkContextPatch {
  people_count?: number | null;
  people_count_source?: "auto" | "manual" | null;
  thumbnail_crop?: ThumbnailCrop | null;
}

/**
 * Create a media link between an existing media asset and an entity.
 * Returns the link (existing or new) and whether it already existed.
 */
export async function createMediaLink(
  params: CreateMediaLinkParams
): Promise<CreateMediaLinkResult> {
  const { media_asset_id, entity_type, entity_id, kind = "gallery", context = {} } = params;

  // Check if link already exists
  const existing = await query<MediaLinkRow>(
    `SELECT ${MEDIA_LINK_FIELDS}
     FROM core.media_links
     WHERE media_asset_id = $1::uuid
       AND entity_type = $2::text
       AND entity_id = $3::uuid
       AND kind = $4::text
     LIMIT 1`,
    [media_asset_id, entity_type, entity_id, kind]
  );
  if (existing.rows[0]) {
    const existingLink = existing.rows[0];
    const existingContext =
      existingLink.context && typeof existingLink.context === "object"
        ? (existingLink.context as Record<string, unknown>)
        : {};
    const nextContext = { ...existingContext, ...(context ?? {}) };
    const contextChanged =
      JSON.stringify(existingContext) !== JSON.stringify(nextContext);

    if (contextChanged) {
      const updated = await query<MediaLinkRow>(
        `UPDATE core.media_links
         SET context = $2::jsonb
         WHERE id = $1::uuid
         RETURNING ${MEDIA_LINK_FIELDS}`,
        [existingLink.id, JSON.stringify(nextContext)]
      );
      const updatedLink = updated.rows[0];
      if (updatedLink) {
        return { link: updatedLink, already_exists: true };
      }
    }

    return { link: existingLink, already_exists: true };
  }

  // Create new link
  const inserted = await query<MediaLinkRow>(
    `INSERT INTO core.media_links (media_asset_id, entity_type, entity_id, kind, position, context)
     VALUES ($1::uuid, $2::text, $3::uuid, $4::text, NULL, $5::jsonb)
     RETURNING ${MEDIA_LINK_FIELDS}`,
    [media_asset_id, entity_type, entity_id, kind, JSON.stringify(context)]
  );

  const link = inserted.rows[0];
  if (!link) throw new Error("Failed to create media link");
  return { link, already_exists: false };
}

/**
 * Get all media links for a specific media asset (across all entity types).
 */
export async function getAllLinksForAsset(
  mediaAssetId: string
): Promise<MediaLinkRow[]> {
  const result = await query<MediaLinkRow>(
    `SELECT ${MEDIA_LINK_FIELDS}
     FROM core.media_links
     WHERE media_asset_id = $1::uuid`,
    [mediaAssetId]
  );
  return result.rows;
}

/**
 * Merge-patch safe context keys for a single media link.
 * Returns updated link or null when link does not exist.
 */
export async function updateMediaLinkContextById(
  linkId: string,
  patch: MediaLinkContextPatch
): Promise<MediaLinkRow | null> {
  const existing = await getMediaLinkById(linkId);
  if (!existing) return null;

  const baseContext =
    existing.context && typeof existing.context === "object"
      ? (existing.context as Record<string, unknown>)
      : {};
  const nextContext: Record<string, unknown> = { ...baseContext };

  if (Object.prototype.hasOwnProperty.call(patch, "people_count")) {
    nextContext.people_count = patch.people_count ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "people_count_source")) {
    nextContext.people_count_source = patch.people_count_source ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "thumbnail_crop")) {
    nextContext.thumbnail_crop = patch.thumbnail_crop ?? null;
  }

  const result = await query<MediaLinkRow>(
    `UPDATE core.media_links
     SET context = $2::jsonb,
         updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING ${MEDIA_LINK_FIELDS}`,
    [linkId, JSON.stringify(nextContext)]
  );
  return result.rows[0] ?? null;
}
