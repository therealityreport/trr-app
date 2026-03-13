import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import type { AuthContext } from "@/lib/server/postgres";
import { supabaseTrrAdmin } from "@/lib/server/supabase-trr-admin";

export interface CoveredShow {
  id: string;
  trr_show_id: string;
  show_name: string;
  canonical_slug?: string | null;
  alternative_names?: string[] | null;
  show_total_episodes?: number | null;
  poster_url?: string | null;
  created_at: string;
  created_by_firebase_uid: string;
}

export interface CreateCoveredShowInput {
  trr_show_id: string;
  show_name: string;
}

interface CoveredShowRow {
  id: string;
  trr_show_id: string;
  show_name: string;
  created_at: string;
  created_by_firebase_uid: string;
}

interface CoreShowRow {
  id: string;
  name: string | null;
  slug: string | null;
  alternative_names: string[] | null;
  show_total_episodes: number | null;
  primary_poster_image_id: string | null;
}

interface ShowImageRow {
  id: string;
  hosted_url: string | null;
}

const COVERED_SHOWS_TABLE = "covered_shows";

const normalizeSlug = (value: string | null | undefined): string => {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const throwIfSupabaseError = (error: PostgrestError | null, fallback: string): void => {
  if (!error) return;
  throw new Error(error.message || fallback);
};

const loadCoveredShowRows = async (): Promise<CoveredShowRow[]> => {
  const { data, error } = await supabaseTrrAdmin.client
    .schema("admin")
    .from(COVERED_SHOWS_TABLE)
    .select("id,trr_show_id,show_name,created_at,created_by_firebase_uid")
    .order("show_name", { ascending: true });

  throwIfSupabaseError(error, "Failed to load covered shows");
  return Array.isArray(data) ? (data as CoveredShowRow[]) : [];
};

const loadCoreShows = async (showIds: string[]): Promise<CoreShowRow[]> => {
  if (showIds.length === 0) return [];

  const { data, error } = await supabaseTrrAdmin.client
    .schema("core")
    .from("shows")
    .select("id,name,slug,alternative_names,show_total_episodes,primary_poster_image_id")
    .in("id", showIds);

  throwIfSupabaseError(error, "Failed to load show metadata");
  return Array.isArray(data) ? (data as CoreShowRow[]) : [];
};

const loadShowImages = async (imageIds: string[]): Promise<ShowImageRow[]> => {
  if (imageIds.length === 0) return [];

  const { data, error } = await supabaseTrrAdmin.client
    .schema("core")
    .from("show_images")
    .select("id,hosted_url")
    .in("id", imageIds);

  throwIfSupabaseError(error, "Failed to load show posters");
  return Array.isArray(data) ? (data as ShowImageRow[]) : [];
};

const buildCoveredShowRecords = (
  coveredShows: CoveredShowRow[],
  coreShows: CoreShowRow[],
  showImages: ShowImageRow[],
): CoveredShow[] => {
  const showsById = new Map(coreShows.map((row) => [row.id, row]));
  const imagesById = new Map(showImages.map((row) => [row.id, row.hosted_url ?? null]));
  const slugCounts = new Map<string, number>();

  for (const row of coreShows) {
    const computedSlug = normalizeSlug(row.name);
    if (!computedSlug) continue;
    slugCounts.set(computedSlug, (slugCounts.get(computedSlug) ?? 0) + 1);
  }

  return coveredShows.map((row) => {
    const show = showsById.get(row.trr_show_id);
    const computedSlug = normalizeSlug(show?.name);
    const canonicalBase = show?.slug?.trim() || computedSlug || null;
    const collisionCount = computedSlug ? (slugCounts.get(computedSlug) ?? 0) : 0;
    const canonicalSlug =
      canonicalBase && collisionCount > 1 && show?.id
        ? `${canonicalBase}--${show.id.slice(0, 8).toLowerCase()}`
        : canonicalBase;

    return {
      ...row,
      canonical_slug: canonicalSlug,
      alternative_names: show?.alternative_names ?? null,
      show_total_episodes: show?.show_total_episodes ?? null,
      poster_url:
        show?.primary_poster_image_id ? (imagesById.get(show.primary_poster_image_id) ?? null) : null,
    };
  });
};

export async function getCoveredShows(): Promise<CoveredShow[]> {
  const coveredShowRows = await loadCoveredShowRows();
  const showIds = Array.from(new Set(coveredShowRows.map((row) => row.trr_show_id).filter(Boolean)));
  const coreShows = await loadCoreShows(showIds);
  const imageIds = Array.from(
    new Set(coreShows.map((row) => row.primary_poster_image_id).filter((value): value is string => Boolean(value))),
  );
  const showImages = await loadShowImages(imageIds);
  return buildCoveredShowRecords(coveredShowRows, coreShows, showImages);
}

export async function getCoveredShowByTrrShowId(trrShowId: string): Promise<CoveredShow | null> {
  const shows = await getCoveredShows();
  return shows.find((row) => row.trr_show_id === trrShowId) ?? null;
}

export async function isShowCovered(trrShowId: string): Promise<boolean> {
  const { count, error } = await supabaseTrrAdmin.client
    .schema("admin")
    .from(COVERED_SHOWS_TABLE)
    .select("trr_show_id", { count: "exact", head: true })
    .eq("trr_show_id", trrShowId);

  throwIfSupabaseError(error, "Failed to check covered show");
  return (count ?? 0) > 0;
}

export async function getCoveredShowIds(): Promise<Set<string>> {
  const rows = await loadCoveredShowRows();
  return new Set(rows.map((row) => row.trr_show_id));
}

export async function addCoveredShow(
  authContext: AuthContext,
  input: CreateCoveredShowInput,
): Promise<CoveredShow> {
  const firebaseUid = authContext.firebaseUid;
  if (!firebaseUid) {
    throw new Error("Firebase UID is required to add a covered show");
  }

  const existing = await getCoveredShowByTrrShowId(input.trr_show_id);
  if (existing) {
    const { error } = await supabaseTrrAdmin.client
      .schema("admin")
      .from(COVERED_SHOWS_TABLE)
      .update({ show_name: input.show_name })
      .eq("trr_show_id", input.trr_show_id);
    throwIfSupabaseError(error, "Failed to update covered show");
  } else {
    const { error } = await supabaseTrrAdmin.client
      .schema("admin")
      .from(COVERED_SHOWS_TABLE)
      .insert({
        trr_show_id: input.trr_show_id,
        show_name: input.show_name,
        created_by_firebase_uid: firebaseUid,
      });
    throwIfSupabaseError(error, "Failed to add covered show");
  }

  const show = await getCoveredShowByTrrShowId(input.trr_show_id);
  if (!show) {
    throw new Error("Failed to load covered show after add");
  }
  return show;
}

export async function removeCoveredShow(
  _authContext: AuthContext,
  trrShowId: string,
): Promise<boolean> {
  const { count, error } = await supabaseTrrAdmin.client
    .schema("admin")
    .from(COVERED_SHOWS_TABLE)
    .delete({ count: "exact" })
    .eq("trr_show_id", trrShowId);

  throwIfSupabaseError(error, "Failed to remove covered show");
  return (count ?? 0) > 0;
}
