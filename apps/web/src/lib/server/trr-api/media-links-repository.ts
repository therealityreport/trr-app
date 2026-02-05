import "server-only";

import { getSupabaseTrrCore } from "@/lib/server/supabase-trr-core";

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
  const supabase = getSupabaseTrrCore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("media_links")
    .select(MEDIA_LINK_FIELDS)
    .eq("id", linkId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to get media link: ${error.message}`);
  }

  return data as MediaLinkRow;
}

export async function getMediaLinksByAssetId(
  mediaAssetId: string
): Promise<MediaLinkRow[]> {
  const supabase = getSupabaseTrrCore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("media_links")
    .select(MEDIA_LINK_FIELDS)
    .eq("media_asset_id", mediaAssetId)
    .eq("entity_type", "person")
    .eq("kind", "gallery");

  if (error) {
    throw new Error(`Failed to get media links: ${error.message}`);
  }

  return (data ?? []) as MediaLinkRow[];
}

export async function ensureMediaLinksForPeople(
  mediaAssetId: string,
  people: TagPerson[],
  baseContext: Record<string, unknown>
): Promise<void> {
  const peopleWithIds = people.filter((person) => Boolean(person.id));
  if (peopleWithIds.length === 0) return;

  const supabase = getSupabaseTrrCore();
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("media_links").insert(rows);
  if (error) {
    throw new Error(`Failed to insert media links: ${error.message}`);
  }
}

export async function updateMediaLinksContext(
  mediaAssetId: string,
  context: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseTrrCore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("media_links")
    .update({ context })
    .eq("media_asset_id", mediaAssetId)
    .eq("entity_type", "person")
    .eq("kind", "gallery");

  if (error) {
    throw new Error(`Failed to update media links context: ${error.message}`);
  }
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

/**
 * Create a media link between an existing media asset and an entity.
 * Returns the link (existing or new) and whether it already existed.
 */
export async function createMediaLink(
  params: CreateMediaLinkParams
): Promise<CreateMediaLinkResult> {
  const supabase = getSupabaseTrrCore();
  const { media_asset_id, entity_type, entity_id, kind = "gallery", context = {} } = params;

  // Check if link already exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: checkError } = await (supabase as any)
    .from("media_links")
    .select(MEDIA_LINK_FIELDS)
    .eq("media_asset_id", media_asset_id)
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .eq("kind", kind)
    .maybeSingle();

  if (checkError) {
    throw new Error(`Failed to check existing link: ${checkError.message}`);
  }

  if (existing) {
    return { link: existing as MediaLinkRow, already_exists: true };
  }

  // Create new link
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newLink, error: insertError } = await (supabase as any)
    .from("media_links")
    .insert({
      media_asset_id,
      entity_type,
      entity_id,
      kind,
      position: null,
      context,
    })
    .select(MEDIA_LINK_FIELDS)
    .single();

  if (insertError) {
    throw new Error(`Failed to create media link: ${insertError.message}`);
  }

  return { link: newLink as MediaLinkRow, already_exists: false };
}

/**
 * Get all media links for a specific media asset (across all entity types).
 */
export async function getAllLinksForAsset(
  mediaAssetId: string
): Promise<MediaLinkRow[]> {
  const supabase = getSupabaseTrrCore();
  const { data, error } = await supabase
    .from("media_links")
    .select(MEDIA_LINK_FIELDS)
    .eq("media_asset_id", mediaAssetId);

  if (error) {
    throw new Error(`Failed to get media links: ${error.message}`);
  }

  return (data ?? []) as MediaLinkRow[];
}
