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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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

  const { error } = await supabase.from("media_links").insert(rows);
  if (error) {
    throw new Error(`Failed to insert media links: ${error.message}`);
  }
}

export async function updateMediaLinksContext(
  mediaAssetId: string,
  context: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseTrrCore();
  const { error } = await supabase
    .from("media_links")
    .update({ context })
    .eq("media_asset_id", mediaAssetId)
    .eq("entity_type", "person")
    .eq("kind", "gallery");

  if (error) {
    throw new Error(`Failed to update media links context: ${error.message}`);
  }
}
