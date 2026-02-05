import "server-only";
import { getSupabaseTrrCore } from "@/lib/server/supabase-trr-core";
import {
  getPhotoIdsByPersonId,
  getTagsByPhotoIds,
} from "@/lib/server/admin/cast-photo-tags-repository";

// ============================================================================
// Types
// ============================================================================

export interface TrrShow {
  id: string;
  name: string;
  imdb_id: string | null;
  tmdb_id: number | null;
  show_total_seasons: number | null;
  show_total_episodes: number | null;
  description: string | null;
  premiere_date: string | null;
  genres: string[];
  networks: string[];
  tags: string[];
  // Image fields (from primary_* columns or joined)
  primary_poster_image_id: string | null;
  primary_backdrop_image_id: string | null;
  primary_logo_image_id: string | null;
  // Image URLs (fetched from show_images table)
  poster_url: string | null;
  backdrop_url: string | null;
  logo_url: string | null;
  // TMDB metadata
  tmdb_status: string | null;
  tmdb_vote_average: number | null;
  // IMDB metadata
  imdb_rating_value: number | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface TrrSeason {
  id: string;
  show_id: string;
  show_name: string | null;
  season_number: number;
  name: string | null;
  title: string | null;
  overview: string | null;
  air_date: string | null;
  premiere_date: string | null;
  poster_path: string | null;
  url_original_poster: string | null;
  tmdb_season_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TrrEpisode {
  id: string;
  show_id: string;
  season_id: string;
  show_name: string | null;
  season_number: number;
  episode_number: number;
  title: string | null;
  synopsis: string | null;
  overview: string | null;
  air_date: string | null;
  runtime: number | null;
  // Image
  still_path: string | null;
  url_original_still: string | null;
  imdb_primary_image_url: string | null;
  // Ratings
  imdb_rating: number | null;
  imdb_vote_count: number | null;
  tmdb_vote_average: number | null;
  tmdb_vote_count: number | null;
  // IDs
  imdb_episode_id: string | null;
  tmdb_episode_id: number | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface TrrCastMember {
  id: string;
  show_id: string;
  person_id: string;
  show_name: string | null;
  cast_member_name: string | null;
  role: string | null;
  billing_order: number | null;
  credit_category: string;
  source_type: string;
  // Joined from people table
  full_name: string | null;
  known_for: string | null;
  // Photo URL (from view or joined)
  photo_url: string | null;
  // Stats
  total_episodes?: number | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface TrrPerson {
  id: string;
  full_name: string;
  known_for: string | null;
  external_ids: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TrrCastFandom {
  id: string;
  person_id: string;
  source: string;
  source_url: string;
  page_title: string | null;
  scraped_at: string;
  // Biographical
  full_name: string | null;
  birthdate: string | null;
  birthdate_display: string | null;
  gender: string | null;
  resides_in: string | null;
  hair_color: string | null;
  eye_color: string | null;
  height_display: string | null;
  weight_display: string | null;
  // Relationships
  romances: string[] | null;
  family: Record<string, unknown> | null;
  friends: Record<string, unknown> | null;
  enemies: Record<string, unknown> | null;
  // Show data
  installment: string | null;
  installment_url: string | null;
  main_seasons_display: string | null;
  summary: string | null;
  taglines: Record<string, unknown> | null;
  reunion_seating: Record<string, unknown> | null;
  trivia: Record<string, unknown> | null;
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 500;

function normalizePagination(options?: PaginationOptions): {
  limit: number;
  offset: number;
} {
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(options?.offset ?? 0, 0);
  return { limit, offset };
}

/**
 * Helper: Fetch image URLs for shows from show_images table.
 * Mutates the shows array in place to add poster_url, backdrop_url, logo_url.
 */
async function enrichShowsWithImageUrls(shows: TrrShow[]): Promise<void> {
  if (shows.length === 0) return;

  const supabase = getSupabaseTrrCore();

  // Collect all image IDs
  const imageIds = shows.flatMap((show) =>
    [show.primary_poster_image_id, show.primary_backdrop_image_id, show.primary_logo_image_id]
      .filter((id): id is string => id !== null)
  );

  if (imageIds.length === 0) return;

  // Fetch image URLs
  const { data: images, error } = await supabase
    .from("show_images")
    .select("id, hosted_url")
    .in("id", imageIds);

  if (error || !images) {
    console.log("[trr-shows-repository] enrichShowsWithImageUrls error:", error?.message);
    return;
  }

  const imageMap = new Map(images.map((img: { id: string; hosted_url: string | null }) => [img.id, img.hosted_url]));

  // Enrich each show
  for (const show of shows) {
    show.poster_url = show.primary_poster_image_id ? imageMap.get(show.primary_poster_image_id) ?? null : null;
    show.backdrop_url = show.primary_backdrop_image_id ? imageMap.get(show.primary_backdrop_image_id) ?? null : null;
    show.logo_url = show.primary_logo_image_id ? imageMap.get(show.primary_logo_image_id) ?? null : null;
  }
}

// ============================================================================
// Show Functions
// ============================================================================

/**
 * Search shows by name or alternative names (case-insensitive, partial match).
 * Results are ordered by name ASC for deterministic pagination.
 */
export async function searchShows(
  query: string,
  options?: PaginationOptions
): Promise<TrrShow[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();
  const queryLower = query.toLowerCase();

  // Search by name first
  const { data: nameResults, error: nameError } = await supabase
    .from("shows")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (nameError) {
    console.error("[trr-shows-repository] searchShows name error:", nameError);
    throw new Error(`Failed to search shows: ${nameError.message}`);
  }

  // Also search in alternative_names - fetch shows with alt names and filter in code
  // since Supabase doesn't support ilike on array elements directly
  const { data: allWithAltNames, error: altError } = await supabase
    .from("shows")
    .select("*")
    .not("alternative_names", "is", null)
    .order("name", { ascending: true })
    .limit(500);

  if (altError) {
    console.error("[trr-shows-repository] searchShows alt error:", altError);
    // Don't fail - just use name results
  }

  // Filter shows where any alternative_name contains the query
  const altMatches = ((allWithAltNames ?? []) as Array<TrrShow & { alternative_names?: string[] }>).filter((show) => {
    if (!show.alternative_names) return false;
    return show.alternative_names.some((name) => name.toLowerCase().includes(queryLower));
  });

  // Merge results, removing duplicates by ID
  const seenIds = new Set<string>();
  const merged: TrrShow[] = [];

  for (const show of [...(nameResults ?? []), ...altMatches] as TrrShow[]) {
    if (!seenIds.has(show.id)) {
      seenIds.add(show.id);
      merged.push(show);
    }
  }

  // Sort by name and apply pagination
  merged.sort((a, b) => a.name.localeCompare(b.name));
  const results = merged.slice(0, limit);

  // Enrich with image URLs
  await enrichShowsWithImageUrls(results);

  return results;
}

/**
 * Get a single show by ID.
 * Fetches image URLs from show_images table based on primary_*_image_id fields.
 */
export async function getShowById(id: string): Promise<TrrShow | null> {
  const supabase = getSupabaseTrrCore();

  const { data, error } = await supabase
    .from("shows")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    console.error("[trr-shows-repository] getShowById error:", error);
    throw new Error(`Failed to get show: ${error.message}`);
  }

  const show = data as TrrShow;
  await enrichShowsWithImageUrls([show]);
  return show;
}

/**
 * Get a show by IMDB ID.
 * Fetches image URLs from show_images table based on primary_*_image_id fields.
 */
export async function getShowByImdbId(imdbId: string): Promise<TrrShow | null> {
  const supabase = getSupabaseTrrCore();

  const { data, error } = await supabase
    .from("shows")
    .select("*")
    .eq("imdb_id", imdbId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("[trr-shows-repository] getShowByImdbId error:", error);
    throw new Error(`Failed to get show by IMDB ID: ${error.message}`);
  }

  const show = data as TrrShow;
  await enrichShowsWithImageUrls([show]);
  return show;
}

// ============================================================================
// Season Functions
// ============================================================================

/**
 * Get all seasons for a show, ordered by season_number DESC (newest first).
 */
export async function getSeasonsByShowId(
  showId: string,
  options?: PaginationOptions
): Promise<TrrSeason[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();

  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("show_id", showId)
    .order("season_number", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[trr-shows-repository] getSeasonsByShowId error:", error);
    throw new Error(`Failed to get seasons: ${error.message}`);
  }

  return (data ?? []) as TrrSeason[];
}

/**
 * Get a single season by ID.
 */
export async function getSeasonById(seasonId: string): Promise<TrrSeason | null> {
  const supabase = getSupabaseTrrCore();

  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", seasonId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("[trr-shows-repository] getSeasonById error:", error);
    throw new Error(`Failed to get season: ${error.message}`);
  }

  return data as TrrSeason;
}

/**
 * Get a season by show ID and season number.
 */
export async function getSeasonByShowAndNumber(
  showId: string,
  seasonNumber: number
): Promise<TrrSeason | null> {
  const supabase = getSupabaseTrrCore();

  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("show_id", showId)
    .eq("season_number", seasonNumber)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("[trr-shows-repository] getSeasonByShowAndNumber error:", error);
    throw new Error(`Failed to get season: ${error.message}`);
  }

  return data as TrrSeason;
}

// ============================================================================
// Episode Functions
// ============================================================================

/**
 * Get episodes for a season, ordered by episode_number ASC.
 */
export async function getEpisodesBySeasonId(
  seasonId: string,
  options?: PaginationOptions
): Promise<TrrEpisode[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();

  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("season_id", seasonId)
    .order("episode_number", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[trr-shows-repository] getEpisodesBySeasonId error:", error);
    throw new Error(`Failed to get episodes: ${error.message}`);
  }

  return (data ?? []) as TrrEpisode[];
}

/**
 * Get episodes for a show and season number.
 */
export async function getEpisodesByShowAndSeason(
  showId: string,
  seasonNumber: number,
  options?: PaginationOptions
): Promise<TrrEpisode[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();

  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("show_id", showId)
    .eq("season_number", seasonNumber)
    .order("episode_number", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[trr-shows-repository] getEpisodesByShowAndSeason error:", error);
    throw new Error(`Failed to get episodes: ${error.message}`);
  }

  return (data ?? []) as TrrEpisode[];
}

/**
 * Get a single episode by ID.
 */
export async function getEpisodeById(episodeId: string): Promise<TrrEpisode | null> {
  const supabase = getSupabaseTrrCore();

  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("id", episodeId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("[trr-shows-repository] getEpisodeById error:", error);
    throw new Error(`Failed to get episode: ${error.message}`);
  }

  return data as TrrEpisode;
}

// ============================================================================
// Cast Functions
// ============================================================================

/**
 * Get cast members for a show, ordered by billing_order ASC.
 * Joins with people table to get full_name and with cast_photos for photo URL.
 */
export async function getCastByShowId(
  showId: string,
  options?: PaginationOptions
): Promise<TrrCastMember[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();

  // First get cast with basic info
  const { data: castData, error: castError } = await supabase
    .from("show_cast")
    .select("*")
    .eq("show_id", showId)
    .order("billing_order", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (castError) {
    console.error("[trr-shows-repository] getCastByShowId error:", castError);
    throw new Error(`Failed to get cast: ${castError.message}`);
  }

  if (!castData || castData.length === 0) {
    return [];
  }

  // Type assertion for untyped Supabase query result
  const typedCastData = castData as Array<{ person_id: string; [key: string]: unknown }>;

  // Get unique person IDs
  const personIds = [...new Set(typedCastData.map((c) => c.person_id))];

  // Fetch people details
  const { data: peopleData, error: peopleError } = await supabase
    .from("people")
    .select("id, full_name, known_for")
    .in("id", personIds);

  if (peopleError) {
    console.error("[trr-shows-repository] getCastByShowId people error:", peopleError);
    // Continue without people data rather than failing
  }

  // Try to get photos from v_cast_photos view first (uses display_url which prefers hosted_url)
  const photosMap: Map<string, string> = new Map();

  // First try the view - it has display_url which picks the best available URL
  let viewPhotos: Array<{ person_id: string; display_url?: string; hosted_url?: string; url?: string }> | null = null;
  if (vCastPhotosAvailable !== (false as boolean | null)) {
    const { data: viewData, error: viewError } = await supabase
      .from("v_cast_photos")
      .select("person_id, display_url, hosted_url, url")
      .in("person_id", personIds);

    if (viewError) {
      if (isViewUnavailableError(viewError)) {
        if (vCastPhotosAvailable !== (false as boolean | null)) {
          vCastPhotosAvailable = false;
          console.log(
            "[trr-shows-repository] v_cast_photos view not available:",
            viewError.message
          );
        }
      } else {
        console.log("[trr-shows-repository] v_cast_photos view error:", viewError.message);
      }
    } else {
      vCastPhotosAvailable = true;
      viewPhotos = (viewData ?? []) as Array<{
        person_id: string;
        display_url?: string;
        hosted_url?: string;
        url?: string;
      }>;
    }
  }

  if (!viewPhotos || viewPhotos.length === 0) {
    // Fall back to cast_photos table
    const { data: tablePhotos, error: tableError } = await supabase
      .from("cast_photos")
      .select("person_id, hosted_url, url")
      .in("person_id", personIds);

    if (tableError) {
      console.log("[trr-shows-repository] cast_photos table error:", tableError.message);
    } else if (tablePhotos) {
      const typedPhotos = tablePhotos as Array<{ person_id: string; hosted_url?: string; url?: string }>;
      for (const photo of typedPhotos) {
        // Only use hosted URLs (CloudFront) - skip unmirrored external images
        const photoUrl = photo.hosted_url;
        if (photoUrl && isLikelyImage(null, photoUrl) && !photosMap.has(photo.person_id)) {
          photosMap.set(photo.person_id, photoUrl);
        }
      }
      console.log(`[trr-shows-repository] Loaded ${photosMap.size} hosted photos from cast_photos table`);
    }
  } else {
    for (const photo of viewPhotos) {
      // Only use hosted URLs (CloudFront) - skip unmirrored external images
      const photoUrl = photo.hosted_url;
      if (photoUrl && isLikelyImage(null, photoUrl) && !photosMap.has(photo.person_id)) {
        photosMap.set(photo.person_id, photoUrl);
      }
    }
    console.log(`[trr-shows-repository] Loaded ${photosMap.size} hosted photos from v_cast_photos view`);
  }

  // Create person lookup
  const typedPeopleData = (peopleData ?? []) as Array<{ id: string; full_name?: string; known_for?: string }>;
  const peopleMap = new Map(
    typedPeopleData.map((p) => [p.id, p])
  );

  // Merge data
  return typedCastData.map((cast) => {
    const person = peopleMap.get(cast.person_id);
    return {
      ...cast,
      full_name: person?.full_name ?? (cast as { cast_member_name?: string }).cast_member_name ?? null,
      known_for: person?.known_for ?? null,
      photo_url: photosMap.get(cast.person_id) ?? null,
    } as TrrCastMember;
  });
}

/**
 * Get cast members for a show with total episode counts and any available photo URL.
 * Uses v_person_show_seasons for totals and v_cast_photos for display_url (fallback to hosted/url).
 */
export async function getShowCastWithStats(
  showId: string,
  options?: PaginationOptions
): Promise<TrrCastMember[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();

  const { data: castData, error: castError } = await supabase
    .from("show_cast")
    .select("*")
    .eq("show_id", showId)
    .order("billing_order", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (castError) {
    console.error("[trr-shows-repository] getShowCastWithStats cast error:", castError);
    throw new Error(`Failed to get cast: ${castError.message}`);
  }

  if (!castData || castData.length === 0) {
    return [];
  }

  const typedCastData = castData as Array<{ person_id: string; [key: string]: unknown }>;
  const personIds = [...new Set(typedCastData.map((c) => c.person_id))];

  const { data: peopleData, error: peopleError } = await supabase
    .from("people")
    .select("id, full_name, known_for")
    .in("id", personIds);

  if (peopleError) {
    console.error("[trr-shows-repository] getShowCastWithStats people error:", peopleError);
  }

  const totalsMap: Map<string, number> = new Map();
  const nameFallbackMap: Map<string, string> = new Map();
  const { data: totalsData, error: totalsError } = await supabase
    .from("v_person_show_seasons")
    .select("person_id, total_episodes, person_name")
    .eq("show_id", showId)
    .in("person_id", personIds);

  if (totalsError) {
    console.error("[trr-shows-repository] getShowCastWithStats totals error:", totalsError);
  } else if (totalsData) {
    const typedTotals = totalsData as Array<{
      person_id: string;
      total_episodes: number | null;
      person_name?: string | null;
    }>;
    for (const row of typedTotals) {
      if (typeof row.total_episodes === "number") {
        totalsMap.set(row.person_id, row.total_episodes);
      }
      if (row.person_name) {
        nameFallbackMap.set(row.person_id, row.person_name);
      }
    }
  }

  const pickPhotoUrl = (row: {
    display_url?: string | null;
    hosted_url?: string | null;
    url?: string | null;
  }): string | null => {
    const candidates = [row.display_url, row.hosted_url, row.url];
    for (const candidate of candidates) {
      if (candidate && isLikelyImage(null, candidate)) {
        return candidate;
      }
    }
    return null;
  };

  const photosMap: Map<string, string> = new Map();
  let viewPhotos:
    | Array<{ person_id: string; display_url?: string | null; hosted_url?: string | null; url?: string | null }>
    | null = null;

  if (vCastPhotosAvailable !== (false as boolean | null)) {
    const { data: viewData, error: viewError } = await supabase
      .from("v_cast_photos")
      .select("person_id, display_url, hosted_url, url")
      .in("person_id", personIds);

    if (viewError) {
      if (isViewUnavailableError(viewError)) {
        if (vCastPhotosAvailable !== (false as boolean | null)) {
          vCastPhotosAvailable = false;
          console.log(
            "[trr-shows-repository] v_cast_photos view not available:",
            viewError.message
          );
        }
      } else {
        console.log("[trr-shows-repository] v_cast_photos view error:", viewError.message);
      }
    } else {
      vCastPhotosAvailable = true;
      viewPhotos = (viewData ?? []) as Array<{
        person_id: string;
        display_url?: string | null;
        hosted_url?: string | null;
        url?: string | null;
      }>;
    }
  }

  if (!viewPhotos || viewPhotos.length === 0) {
    const { data: tablePhotos, error: tableError } = await supabase
      .from("cast_photos")
      .select("person_id, hosted_url, url")
      .in("person_id", personIds);

    if (tableError) {
      console.log("[trr-shows-repository] getShowCastWithStats cast_photos error:", tableError.message);
    } else if (tablePhotos) {
      const typedPhotos = tablePhotos as Array<{ person_id: string; hosted_url?: string | null; url?: string | null }>;
      for (const photo of typedPhotos) {
        const photoUrl = pickPhotoUrl({ hosted_url: photo.hosted_url, url: photo.url });
        if (photoUrl && !photosMap.has(photo.person_id)) {
          photosMap.set(photo.person_id, photoUrl);
        }
      }
    }
  } else {
    for (const photo of viewPhotos) {
      const photoUrl = pickPhotoUrl(photo);
      if (photoUrl && !photosMap.has(photo.person_id)) {
        photosMap.set(photo.person_id, photoUrl);
      }
    }
  }

  const typedPeopleData = (peopleData ?? []) as Array<{ id: string; full_name?: string; known_for?: string }>;
  const peopleMap = new Map(typedPeopleData.map((p) => [p.id, p]));

  return typedCastData.map((cast) => {
    const person = peopleMap.get(cast.person_id);
    return {
      ...cast,
      full_name: person?.full_name ?? (cast as { cast_member_name?: string }).cast_member_name ?? null,
      known_for: person?.known_for ?? null,
      photo_url: photosMap.get(cast.person_id) ?? null,
      total_episodes: totalsMap.get(cast.person_id) ?? null,
    } as TrrCastMember;
  });
}

/**
 * Get a single person by ID.
 */
export async function getPersonById(personId: string): Promise<TrrPerson | null> {
  const supabase = getSupabaseTrrCore();

  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("id", personId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("[trr-shows-repository] getPersonById error:", error);
    throw new Error(`Failed to get person: ${error.message}`);
  }

  return data as TrrPerson;
}

/**
 * Search people by name using PREFIX match (index-friendly).
 * Uses `query%` pattern instead of `%query%` for better performance.
 * Results are ordered by full_name ASC.
 */
export async function searchPeople(
  query: string,
  options?: PaginationOptions
): Promise<TrrPerson[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();

  // Use PREFIX match (query%) - much faster than contains (%query%)
  // This matches "John Smith" when searching "john" but not "Smithjohn"
  const { data, error } = await supabase
    .from("people")
    .select("id, full_name, known_for, external_ids, created_at, updated_at")
    .ilike("full_name", `${query}%`)
    .order("full_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[trr-shows-repository] searchPeople error:", error);
    throw new Error(`Failed to search people: ${error.message}`);
  }

  return (data ?? []) as TrrPerson[];
}

// ============================================================================
// Person Photo & Credit Functions
// ============================================================================

const getMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | null => {
  if (!metadata) return null;
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const normalizeScrapeSource = (
  source: string | null | undefined,
  url: string | null | undefined,
  metadata?: Record<string, unknown> | null
): string => {
  const rawSource = source ?? "";
  const lower = rawSource.toLowerCase();
  if (!lower.startsWith("web_scrape") && !lower.startsWith("webscrape")) {
    return rawSource;
  }

  const metadataUrl =
    getMetadataString(metadata, "source_url") ??
    getMetadataString(metadata, "sourceUrl") ??
    getMetadataString(metadata, "source_page_url") ??
    getMetadataString(metadata, "sourcePageUrl") ??
    null;
  const candidateUrl = url ?? metadataUrl;
  if (!candidateUrl) {
    const cleaned = lower.replace(/^web[_-]?scrape[:]?/, "").replace(/^www\./, "");
    if (cleaned && cleaned.includes(".")) {
      return cleaned;
    }
    return rawSource;
  }

  try {
    const hostname = new URL(candidateUrl).hostname.toLowerCase();
    const normalized = hostname.replace(/^www\./, "");
    return normalized || rawSource;
  } catch {
    return rawSource;
  }
};

const normalizeFandomSource = (
  source: string,
  metadata?: Record<string, unknown> | null
): { source: string; metadata: Record<string, unknown> | null } => {
  const lower = source.toLowerCase();
  if (lower !== "fandom-gallery") {
    return { source, metadata: metadata ?? null };
  }

  const nextMetadata = metadata ?? {};
  if (typeof nextMetadata.source_variant !== "string") {
    return {
      source: "fandom",
      metadata: { ...nextMetadata, source_variant: "fandom_gallery" },
    };
  }

  return { source: "fandom", metadata: nextMetadata };
};

const isLikelyImage = (
  contentType: string | null | undefined,
  url: string | null | undefined
): boolean => {
  if (contentType && !contentType.toLowerCase().startsWith("image/")) {
    return false;
  }
  if (url && url.toLowerCase().endsWith(".bin")) {
    return false;
  }
  return true;
};

let vCastPhotosAvailable: boolean | null = null;
let vSeasonCastAvailable: boolean | null = null;

type PostgrestErrorLike = { code?: string | null; message?: string | null };

const getErrorMessage = (
  error: string | PostgrestErrorLike | null | undefined
): string | null => {
  if (!error) return null;
  if (typeof error === "string") return error;
  return error.message ?? null;
};

const getErrorCode = (
  error: string | PostgrestErrorLike | null | undefined
): string | null => {
  if (!error || typeof error === "string") return null;
  return error.code ?? null;
};

const isViewUnavailableError = (error: string | PostgrestErrorLike | null | undefined): boolean => {
  const code = getErrorCode(error);
  if (code) {
    const upper = code.toUpperCase();
    if (upper === "PGRST205" || upper === "42P01") {
      return true;
    }
  }
  const message = getErrorMessage(error);
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("permission denied") ||
    lower.includes("does not exist") ||
    lower.includes("not found") ||
    lower.includes("could not find the table") ||
    lower.includes("schema cache")
  );
};

const isMissingColumnError = (error: string | PostgrestErrorLike | null | undefined): boolean => {
  const code = getErrorCode(error);
  if (code && code === "42703") {
    return true;
  }
  const message = getErrorMessage(error);
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("column") && lower.includes("does not exist");
};

const runSelectWithFallback = async <T>(
  selects: string[],
  run: (select: string) => Promise<{ data: T[] | null; error: PostgrestErrorLike | null }>
): Promise<{ data: T[] | null; error: PostgrestErrorLike | null }> => {
  let last: { data: T[] | null; error: PostgrestErrorLike | null } = {
    data: null,
    error: null,
  };
  for (const select of selects) {
    const result = await run(select);
    if (!result.error) return result;
    last = result;
    if (!isMissingColumnError(result.error)) {
      return result;
    }
  }
  return last;
};

export interface TrrPersonPhoto {
  id: string;
  person_id: string;
  source: string;
  url: string | null;
  hosted_url: string | null;
  hosted_content_type?: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  context_section: string | null;
  context_type: string | null;
  season: number | null;
  source_page_url?: string | null;
  // Metadata fields
  people_names: string[] | null;
  people_ids: string[] | null;
  people_count?: number | null;
  people_count_source?: "auto" | "manual" | null;
  ingest_status?: string | null;
  title_names: string[] | null;
  metadata: Record<string, unknown> | null;
  fetched_at: string | null;
  created_at: string | null;
  // Origin metadata
  origin: "cast_photos" | "media_links";
  link_id?: string | null;
  media_asset_id?: string | null;
}

export interface TrrPersonCredit {
  id: string;
  show_id: string;
  person_id: string;
  show_name: string | null;
  role: string | null;
  billing_order: number | null;
  credit_category: string;
}

/**
 * Get all photos for a person, ordered by source then gallery_index.
 * Only returns photos with hosted_url (mirrored to CloudFront).
 * Queries both cast_photos table AND media_links/media_assets for imported photos.
 */
export async function getPhotosByPersonId(
  personId: string,
  options?: PaginationOptions
): Promise<TrrPersonPhoto[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();

  const person = await getPersonById(personId);
  const fullName = person?.full_name?.trim() ?? null;
  const manualTagPhotoIds = await getPhotoIdsByPersonId(personId);

  // Query 1: Get photos from cast_photos table
  const { data: castPhotosByPerson, error: castError } = await supabase
    .from("cast_photos")
    .select("id, person_id, source, url, hosted_url, hosted_content_type, caption, width, height, context_section, context_type, season, source_page_url, people_names, title_names, metadata, fetched_at")
    .eq("person_id", personId)
    .not("hosted_url", "is", null)
    .order("source", { ascending: true })
    .order("gallery_index", { ascending: true, nullsFirst: false });

  if (castError) {
    console.error("[trr-shows-repository] getPhotosByPersonId cast_photos error:", castError);
    throw new Error(`Failed to get photos: ${castError.message}`);
  }

  let castPhotosByName: TrrPersonPhoto[] = [];
  if (fullName) {
    const { data: namePhotosRaw, error: nameError } = await supabase
      .from("cast_photos")
      .select("id, person_id, source, url, hosted_url, hosted_content_type, caption, width, height, context_section, context_type, season, source_page_url, people_names, title_names, metadata, fetched_at")
      .contains("people_names", [fullName])
      .not("hosted_url", "is", null)
      .order("source", { ascending: true })
      .order("gallery_index", { ascending: true, nullsFirst: false });

    if (nameError) {
      console.error("[trr-shows-repository] getPhotosByPersonId cast_photos name error:", nameError);
    } else {
      castPhotosByName = (namePhotosRaw ?? []) as TrrPersonPhoto[];
    }
  }

  let castPhotosByManualTags: TrrPersonPhoto[] = [];
  if (manualTagPhotoIds.length > 0) {
    const { data: manualPhotosRaw, error: manualError } = await supabase
      .from("cast_photos")
      .select("id, person_id, source, url, hosted_url, hosted_content_type, caption, width, height, context_section, context_type, season, source_page_url, people_names, title_names, metadata, fetched_at")
      .in("id", manualTagPhotoIds)
      .not("hosted_url", "is", null)
      .order("source", { ascending: true })
      .order("gallery_index", { ascending: true, nullsFirst: false });

    if (manualError) {
      console.error(
        "[trr-shows-repository] getPhotosByPersonId cast_photos manual tag error:",
        manualError
      );
    } else {
      castPhotosByManualTags = (manualPhotosRaw ?? []) as TrrPersonPhoto[];
    }
  }

  const castPhotos = [
    ...((castPhotosByPerson ?? []) as TrrPersonPhoto[]),
    ...castPhotosByName,
    ...castPhotosByManualTags,
  ].map((photo) => {
    const normalizedScrape = normalizeScrapeSource(
      photo.source,
      photo.url,
      photo.metadata
    );
    const mergedMetadata = {
      ...(photo.metadata ?? {}),
      ...(photo.source_page_url
        ? { source_page_url: photo.source_page_url }
        : null),
    };
    const normalizedFandom = normalizeFandomSource(
      normalizedScrape,
      mergedMetadata
    );
    return {
      ...photo,
      source: normalizedFandom.source,
      metadata: normalizedFandom.metadata,
      created_at: (photo as { created_at?: string | null }).created_at ?? photo.fetched_at ?? null,
      people_ids: null,
      people_count: null,
      people_count_source: null,
      ingest_status: null,
      origin: "cast_photos" as const,
      link_id: null,
      media_asset_id: null,
    };
  });

  const castPhotosFiltered = castPhotos.filter((photo) =>
    isLikelyImage(photo.hosted_content_type, photo.hosted_url)
  );

  const tagRows = await getTagsByPhotoIds(
    castPhotosFiltered.map((photo) => photo.id)
  );
  const castPhotosWithTags = castPhotosFiltered.map((photo) => {
    const tagRow = tagRows.get(photo.id);
    if (!tagRow) return photo;
    return {
      ...photo,
      people_names: tagRow.people_names ?? photo.people_names,
      people_ids: tagRow.people_ids ?? null,
      people_count: tagRow.people_count ?? null,
      people_count_source: tagRow.people_count_source ?? null,
    } as TrrPersonPhoto;
  });

  // Query 2: Get photos from media_links joined with media_assets
  // These tables may not be in generated types, so we use explicit types
  interface MediaLinkRow {
    id: string;
    entity_id: string;
    media_asset_id: string;
    kind: string;
    position: number | null;
    context: Record<string, unknown> | null;
    created_at: string;
  }
  interface MediaAssetRow {
    id: string;
    source: string;
    source_url: string | null;
    hosted_url: string | null;
    hosted_content_type: string | null;
    caption: string | null;
    width: number | null;
    height: number | null;
    metadata: Record<string, unknown> | null;
    fetched_at: string | null;
    created_at: string | null;
    ingest_status: string | null;
  }

  // First get media_links for this person
  const { data: mediaLinksRaw, error: linksError } = await supabase
    .from("media_links")
    .select("id, entity_id, media_asset_id, kind, position, context, created_at")
    .eq("entity_type", "person")
    .eq("entity_id", personId)
    .eq("kind", "gallery")
    .order("position", { ascending: true, nullsFirst: false });

  const mediaLinks = mediaLinksRaw as MediaLinkRow[] | null;

  if (linksError) {
    console.error("[trr-shows-repository] getPhotosByPersonId media_links error:", linksError);
    // Don't fail completely if media_links query fails, just use cast_photos
  }

  // If we have media links, fetch the corresponding assets
  let mediaPhotos: TrrPersonPhoto[] = [];
  if (mediaLinks && mediaLinks.length > 0) {
    const assetIds = mediaLinks.map(link => link.media_asset_id);
    const { data: assetsRaw, error: assetsError } = await supabase
      .from("media_assets")
      .select("id, source, source_url, hosted_url, hosted_content_type, caption, width, height, metadata, fetched_at, created_at, ingest_status")
      .in("id", assetIds)
      .not("hosted_url", "is", null);

    const assets = assetsRaw as MediaAssetRow[] | null;

    if (assetsError) {
      console.error("[trr-shows-repository] getPhotosByPersonId media_assets error:", assetsError);
    } else if (assets) {
      // Create a map for quick lookup
      const assetMap = new Map(assets.map(a => [a.id, a]));

      // Transform media_links + media_assets to TrrPersonPhoto format
      mediaPhotos = mediaLinks
        .map(link => {
          const asset = assetMap.get(link.media_asset_id);
          if (!asset || !asset.hosted_url) return null;

          const context = link.context;
          const contextPeopleNames = Array.isArray((context as { people_names?: unknown })?.people_names)
            ? ((context as { people_names: unknown }).people_names as string[])
            : null;
          const contextPeopleIds = Array.isArray((context as { people_ids?: unknown })?.people_ids)
            ? ((context as { people_ids: unknown }).people_ids as string[])
            : null;
          const rawPeopleCount = (context as { people_count?: unknown } | null)?.people_count;
          const contextPeopleCount =
            typeof rawPeopleCount === "number"
              ? rawPeopleCount
              : typeof rawPeopleCount === "string" && rawPeopleCount.trim().length > 0
                ? Number.parseInt(rawPeopleCount, 10)
                : null;
          const contextPeopleCountSource =
            typeof (context as { people_count_source?: unknown } | null)?.people_count_source === "string"
              ? ((context as { people_count_source: string }).people_count_source as
                  | "auto"
                  | "manual")
              : null;
          const metadataPeopleNames = Array.isArray((asset.metadata as { people_names?: unknown } | null)?.people_names)
            ? ((asset.metadata as { people_names: unknown }).people_names as string[])
            : null;
          const peopleNames = contextPeopleNames ?? metadataPeopleNames ?? null;
          const normalizedScrape = normalizeScrapeSource(
            asset.source || "web_scrape",
            asset.source_url,
            asset.metadata
          );
          const normalizedFandom = normalizeFandomSource(
            normalizedScrape,
            asset.metadata
          );
          return {
            id: link.id,
            person_id: personId,
            source: normalizedFandom.source,
            url: asset.source_url,
            hosted_url: asset.hosted_url,
            hosted_content_type: asset.hosted_content_type ?? null,
            caption: asset.caption,
            width: asset.width,
            height: asset.height,
            context_section: context?.context_section as string | null ?? null,
            context_type: context?.context_type as string | null ?? null,
            season: context?.season as number | null ?? null,
            people_names: peopleNames,
            people_ids: contextPeopleIds,
            people_count: contextPeopleCount,
            people_count_source: contextPeopleCountSource,
            ingest_status: asset.ingest_status ?? null,
            title_names: null,
            metadata: normalizedFandom.metadata,
            fetched_at: asset.fetched_at,
            created_at: asset.created_at ?? link.created_at,
            origin: "media_links",
            link_id: link.id,
            media_asset_id: link.media_asset_id,
          } as TrrPersonPhoto;
        })
        .filter((p): p is TrrPersonPhoto => p !== null);
    }
  }

  if (mediaPhotos.length > 0) {
    mediaPhotos = mediaPhotos.filter((photo) =>
      isLikelyImage(photo.hosted_content_type, photo.hosted_url)
    );
  }

  // Merge both sources, cast_photos first then media_links
  const allPhotos = [...(castPhotosWithTags ?? []) as TrrPersonPhoto[], ...mediaPhotos];

  // Deduplicate by hosted_url (in case same image exists in both sources)
  const seenUrls = new Set<string>();
  const dedupedPhotos = allPhotos.filter(photo => {
    if (!photo.hosted_url || seenUrls.has(photo.hosted_url)) return false;
    seenUrls.add(photo.hosted_url);
    return true;
  });

  // Apply pagination
  return dedupedPhotos.slice(offset, offset + limit);
}

/**
 * Get all show credits for a person.
 */
export async function getCreditsByPersonId(
  personId: string,
  options?: PaginationOptions
): Promise<TrrPersonCredit[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();

  const { data, error } = await supabase
    .from("show_cast")
    .select("id, show_id, person_id, show_name, role, billing_order, credit_category")
    .eq("person_id", personId)
    .order("billing_order", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[trr-shows-repository] getCreditsByPersonId error:", error);
    throw new Error(`Failed to get credits: ${error.message}`);
  }

  return (data ?? []) as TrrPersonCredit[];
}

// ============================================================================
// Season-specific Cast Functions
// ============================================================================

export interface SeasonCastMember {
  person_id: string;
  person_name: string;
  seasons_appeared: number[];
  total_episodes: number;
  photo_url: string | null;
}

export interface SeasonCastEpisodeCount {
  person_id: string;
  person_name: string | null;
  episodes_in_season: number;
  total_episodes: number | null;
  photo_url: string | null;
}

/**
 * Get cast members who appeared in a specific season of a show.
 * Uses v_person_show_seasons view and joins with photos.
 */
export async function getCastByShowSeason(
  showId: string,
  seasonNumber: number,
  options?: PaginationOptions
): Promise<SeasonCastMember[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();

  // Query the view for people who appeared in this season
  const { data: castData, error: castError } = await supabase
    .from("v_person_show_seasons")
    .select("person_id, person_name, seasons_appeared, total_episodes")
    .eq("show_id", showId)
    .contains("seasons_appeared", [seasonNumber])
    .order("total_episodes", { ascending: false })
    .range(offset, offset + limit - 1);

  if (castError) {
    console.error("[trr-shows-repository] getCastByShowSeason error:", castError);
    throw new Error(`Failed to get season cast: ${castError.message}`);
  }

  if (!castData || castData.length === 0) {
    return [];
  }

  // Type assertion for view data
  type ViewCastRow = {
    person_id: string;
    person_name: string;
    seasons_appeared: number[];
    total_episodes: number;
  };
  const typedCastData = castData as ViewCastRow[];

  // Get person IDs for photo lookup
  const personIds = typedCastData.map((c) => c.person_id);

  // Get photos
  const photosMap: Map<string, string> = new Map();
  const { data: photoData, error: photoError } = await supabase
    .from("cast_photos")
    .select("person_id, hosted_url")
    .in("person_id", personIds)
    .not("hosted_url", "is", null);

  if (!photoError && photoData) {
    type PhotoRow = { person_id: string; hosted_url: string | null };
    const typedPhotoData = photoData as PhotoRow[];
    for (const photo of typedPhotoData) {
      if (
        photo.hosted_url &&
        isLikelyImage(null, photo.hosted_url) &&
        !photosMap.has(photo.person_id)
      ) {
        photosMap.set(photo.person_id, photo.hosted_url);
      }
    }
  }

  return typedCastData.map((cast) => ({
    person_id: cast.person_id,
    person_name: cast.person_name,
    seasons_appeared: cast.seasons_appeared,
    total_episodes: cast.total_episodes,
    photo_url: photosMap.get(cast.person_id) ?? null,
  }));
}

/**
 * Fallback function when episode_cast (Credits V2) has no data.
 * Returns show-level cast from show_cast table without per-season episode counts.
 */
async function getSeasonCastFallbackFromShowCast(
  showId: string,
  options?: PaginationOptions
): Promise<SeasonCastEpisodeCount[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();

  // Query show_cast for all cast members of this show
  const { data: showCastData, error: showCastError } = await supabase
    .from("show_cast")
    .select("person_id, cast_member_name, billing_order")
    .eq("show_id", showId)
    .order("billing_order", { ascending: true, nullsFirst: false });

  if (showCastError) {
    console.error("[trr-shows-repository] getSeasonCastFallbackFromShowCast error:", showCastError);
    return [];
  }

  if (!showCastData || showCastData.length === 0) {
    return [];
  }

  type ShowCastRow = { person_id: string; cast_member_name: string | null; billing_order: number | null };
  const typedShowCast = showCastData as ShowCastRow[];
  const personIds = [...new Set(typedShowCast.map((c) => c.person_id))];

  // Get people names
  const { data: peopleData, error: peopleError } = await supabase
    .from("people")
    .select("id, full_name")
    .in("id", personIds);

  if (peopleError) {
    console.error("[trr-shows-repository] getSeasonCastFallbackFromShowCast people error:", peopleError);
  }

  type PeopleRow = { id: string; full_name?: string | null };
  const peopleMap = new Map((peopleData as PeopleRow[] ?? []).map((p) => [p.id, p.full_name ?? null]));

  // Get photos
  const photosMap: Map<string, string> = new Map();

  const pickPhotoUrl = (row: {
    display_url?: string | null;
    hosted_url?: string | null;
    url?: string | null;
  }): string | null => {
    const candidates = [row.display_url, row.hosted_url, row.url];
    for (const candidate of candidates) {
      if (candidate && isLikelyImage(null, candidate)) {
        return candidate;
      }
    }
    return null;
  };

  if (vCastPhotosAvailable !== (false as boolean | null)) {
    const { data: viewData, error: viewError } = await supabase
      .from("v_cast_photos")
      .select("person_id, display_url, hosted_url, url")
      .in("person_id", personIds);

    if (viewError) {
      if (isViewUnavailableError(viewError)) {
        if (vCastPhotosAvailable !== (false as boolean | null)) {
          vCastPhotosAvailable = false;
        }
      }
    } else if (viewData) {
      type PhotoRow = { person_id: string; display_url?: string | null; hosted_url?: string | null; url?: string | null };
      for (const photo of viewData as PhotoRow[]) {
        const photoUrl = pickPhotoUrl(photo);
        if (photoUrl && !photosMap.has(photo.person_id)) {
          photosMap.set(photo.person_id, photoUrl);
        }
      }
    }
  }

  // If view didn't return photos, try the table directly
  if (photosMap.size === 0) {
    const { data: tablePhotos, error: tableError } = await supabase
      .from("cast_photos")
      .select("person_id, hosted_url, url")
      .in("person_id", personIds);

    if (!tableError && tablePhotos) {
      type TablePhotoRow = { person_id: string; hosted_url?: string | null; url?: string | null };
      for (const photo of tablePhotos as TablePhotoRow[]) {
        const photoUrl = pickPhotoUrl({ hosted_url: photo.hosted_url, url: photo.url });
        if (photoUrl && !photosMap.has(photo.person_id)) {
          photosMap.set(photo.person_id, photoUrl);
        }
      }
    }
  }

  // Build results - dedupe by person_id and use first occurrence (sorted by billing_order)
  const seen = new Set<string>();
  const results: SeasonCastEpisodeCount[] = [];

  for (const cast of typedShowCast) {
    if (seen.has(cast.person_id)) continue;
    seen.add(cast.person_id);

    results.push({
      person_id: cast.person_id,
      person_name: peopleMap.get(cast.person_id) ?? cast.cast_member_name ?? null,
      episodes_in_season: 0, // Unknown without Credits V2 data
      total_episodes: null, // Unknown without Credits V2 data
      photo_url: photosMap.get(cast.person_id) ?? null,
    });
  }

  return results.slice(offset, offset + limit);
}

/**
 * Get cast members who appeared in a specific season with per-season episode counts.
 * Prefers v_season_cast, falls back to episode_cast, then v_person_show_seasons for membership-only.
 */
export async function getSeasonCastWithEpisodeCounts(
  showId: string,
  seasonNumber: number,
  options?: PaginationOptions
): Promise<SeasonCastEpisodeCount[]> {
  const { limit, offset } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();

  const season = await getSeasonByShowAndNumber(showId, seasonNumber);
  if (!season) {
    return [];
  }

  let personIds: string[] = [];
  const episodesInSeasonMap = new Map<string, number>();
  const episodesCountKnown = new Set<string>();
  let viewRangeApplied = false;
  let seasonMembersLoaded = false;
  const fallbackNames = new Map<string, string | null>();

  const loadSeasonMembers = async (): Promise<boolean> => {
    const { data, error } = await supabase
      .from("v_person_show_seasons")
      .select("person_id, person_name, total_episodes")
      .eq("show_id", showId)
      .contains("seasons_appeared", [seasonNumber])
      .order("total_episodes", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (isViewUnavailableError(error)) {
        return false;
      }
      throw new Error(`Failed to get season cast: ${error.message}`);
    }

    const typed = (data ?? []) as Array<{
      person_id: string;
      person_name: string | null;
      total_episodes: number | null;
    }>;

    if (typed.length === 0) {
      return true;
    }

    viewRangeApplied = true;
    personIds = typed.map((row) => row.person_id);
    for (const row of typed) {
      fallbackNames.set(row.person_id, row.person_name);
      episodesInSeasonMap.set(row.person_id, 0);
    }
    return true;
  };

  if (vSeasonCastAvailable !== (false as boolean | null)) {
    const { data: viewData, error: viewError } = await supabase
      .from("v_season_cast")
      .select("person_id, episodes_in_season")
      .eq("show_id", showId)
      .eq("season_id", season.id)
      .order("episodes_in_season", { ascending: false })
      .range(offset, offset + limit - 1);

    if (viewError) {
      if (isViewUnavailableError(viewError)) {
        vSeasonCastAvailable = false;
        console.log(
          "[trr-shows-repository] v_season_cast view not available:",
          viewError.message
        );
      } else {
        console.error(
          "[trr-shows-repository] getSeasonCastWithEpisodeCounts v_season_cast error:",
          viewError
        );
        throw new Error(`Failed to get season cast: ${viewError.message}`);
      }
    } else {
      vSeasonCastAvailable = true;
      const typedView = (viewData ?? []) as Array<{
        person_id: string;
        episodes_in_season: number | null;
      }>;
      if (typedView.length > 0) {
        viewRangeApplied = true;
        personIds = typedView.map((row) => row.person_id);
        for (const row of typedView) {
          episodesInSeasonMap.set(row.person_id, row.episodes_in_season ?? 0);
          episodesCountKnown.add(row.person_id);
        }
      } else {
        const loaded = await loadSeasonMembers();
        if (!loaded) {
          return [];
        }
        seasonMembersLoaded = true;
        if (personIds.length === 0) {
          return [];
        }
      }
    }
  }

  if (personIds.length === 0) {
    const { data: episodeCast, error: episodeCastError } = await supabase
      .from("episode_cast")
      .select("person_id, episode_id")
      .eq("show_id", showId)
      .eq("season_number", seasonNumber);

    if (episodeCastError) {
      console.error(
        "[trr-shows-repository] getSeasonCastWithEpisodeCounts episode_cast error:",
        episodeCastError
      );
      if (isViewUnavailableError(episodeCastError)) {
        const loaded = await loadSeasonMembers();
        if (!loaded) {
          return [];
        }
        seasonMembersLoaded = true;
        if (personIds.length === 0) {
          return [];
        }
        // Skip further episode_cast handling since fallback succeeded.
      } else {
        throw new Error(`Failed to get season cast: ${episodeCastError.message}`);
      }
    }

    if (!episodeCastError && !seasonMembersLoaded) {
      const castRows = (episodeCast ?? []) as Array<{ person_id: string; episode_id: string | number }>;

      // If episode_cast has no data (Credits V2 not populated), fall back to season membership view
      if (castRows.length === 0) {
        const loaded = await loadSeasonMembers();
        if (!loaded) {
          return [];
        }
        seasonMembersLoaded = true;
        if (personIds.length === 0) {
          return [];
        }
        // Skip further episode_cast handling since fallback succeeded
        // Continue to people/totals/photo loading below.
      }

      if (!seasonMembersLoaded) {
        const episodeCounts = new Map<string, Set<string>>();
        for (const row of castRows) {
          if (!episodeCounts.has(row.person_id)) {
            episodeCounts.set(row.person_id, new Set());
          }
          episodeCounts.get(row.person_id)?.add(String(row.episode_id));
        }

        personIds = Array.from(episodeCounts.keys());
        for (const [personId, episodes] of episodeCounts.entries()) {
          episodesInSeasonMap.set(personId, episodes.size);
          episodesCountKnown.add(personId);
        }
      }
    }
  }

  const { data: peopleData, error: peopleError } = await supabase
    .from("people")
    .select("id, full_name")
    .in("id", personIds);

  if (peopleError) {
    console.error("[trr-shows-repository] getSeasonCastWithEpisodeCounts people error:", peopleError);
  }

  const pickPhotoUrl = (row: {
    display_url?: string | null;
    hosted_url?: string | null;
    url?: string | null;
  }): string | null => {
    const candidates = [row.display_url, row.hosted_url, row.url];
    for (const candidate of candidates) {
      if (candidate && isLikelyImage(null, candidate)) {
        return candidate;
      }
    }
    return null;
  };

  const photosMap: Map<string, string> = new Map();
  let viewPhotos:
    | Array<{ person_id: string; display_url?: string | null; hosted_url?: string | null; url?: string | null }>
    | null = null;

  if (vCastPhotosAvailable !== (false as boolean | null)) {
    const { data: viewData, error: viewError } = await supabase
      .from("v_cast_photos")
      .select("person_id, display_url, hosted_url, url")
      .in("person_id", personIds);

    if (viewError) {
      if (isViewUnavailableError(viewError)) {
        if (vCastPhotosAvailable !== (false as boolean | null)) {
          vCastPhotosAvailable = false;
          console.log(
            "[trr-shows-repository] v_cast_photos view not available:",
            viewError.message
          );
        }
      } else {
        console.log("[trr-shows-repository] v_cast_photos view error:", viewError.message);
      }
    } else {
      vCastPhotosAvailable = true;
      viewPhotos = (viewData ?? []) as Array<{
        person_id: string;
        display_url?: string | null;
        hosted_url?: string | null;
        url?: string | null;
      }>;
    }
  }

  if (!viewPhotos || viewPhotos.length === 0) {
    const { data: tablePhotos, error: tableError } = await supabase
      .from("cast_photos")
      .select("person_id, hosted_url, url")
      .in("person_id", personIds);

    if (tableError) {
      console.log(
        "[trr-shows-repository] getSeasonCastWithEpisodeCounts cast_photos error:",
        tableError.message
      );
    } else if (tablePhotos) {
      const typedPhotos = tablePhotos as Array<{ person_id: string; hosted_url?: string | null; url?: string | null }>;
      for (const photo of typedPhotos) {
        const photoUrl = pickPhotoUrl({ hosted_url: photo.hosted_url, url: photo.url });
        if (photoUrl && !photosMap.has(photo.person_id)) {
          photosMap.set(photo.person_id, photoUrl);
        }
      }
    }
  } else {
    for (const photo of viewPhotos) {
      const photoUrl = pickPhotoUrl(photo);
      if (photoUrl && !photosMap.has(photo.person_id)) {
        photosMap.set(photo.person_id, photoUrl);
      }
    }
  }

  const typedPeopleData = (peopleData ?? []) as Array<{ id: string; full_name?: string }>;
  const peopleMap = new Map(typedPeopleData.map((p) => [p.id, p]));

  const results = personIds.map((personId) => ({
    person_id: personId,
    person_name: peopleMap.get(personId)?.full_name ?? fallbackNames.get(personId) ?? null,
    episodes_in_season: episodesInSeasonMap.get(personId) ?? 0,
    total_episodes: episodesCountKnown.has(personId)
      ? episodesInSeasonMap.get(personId) ?? 0
      : null,
    photo_url: photosMap.get(personId) ?? null,
  }));

  results.sort((a, b) => b.episodes_in_season - a.episodes_in_season);
  return viewRangeApplied ? results : results.slice(offset, offset + limit);
}

// ============================================================================
// Season Assets Functions
// ============================================================================

export interface SeasonAsset {
  id: string;
  type: "season" | "episode" | "cast" | "show";
  source: string;
  kind: string;
  hosted_url: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  episode_number?: number;
  person_name?: string;
  person_id?: string;
  // Rich metadata fields (matching People gallery)
  season_number?: number;
  ingest_status?: string | null;
  created_at?: string | null;
  fetched_at?: string | null;
  context_section?: string | null;
  context_type?: string | null;
  metadata?: Record<string, unknown> | null;
  hosted_content_type?: string | null;
}

/**
 * Get all media assets for a show/season.
 * Combines images from season_images, episode_images, and cast_photos.
 */
export async function getAssetsByShowSeason(
  showId: string,
  seasonNumber: number,
  options?: PaginationOptions
): Promise<SeasonAsset[]> {
  const { limit } = normalizePagination(options);
  const supabase = getSupabaseTrrCore();
  const assets: SeasonAsset[] = [];

  const toDateOnly = (value?: string | null): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const computeSeasonWindow = (start?: string | null, end?: string | null) => {
    const startDate = toDateOnly(start);
    let endDate = toDateOnly(end);
    if (startDate && !endDate) {
      endDate = new Date();
      endDate.setHours(0, 0, 0, 0);
    }
    return { startDate, endDate };
  };

  // Fetch season record for date window and season_id
  let seasonId: string | null = null;
  let seasonStartDate: Date | null = null;
  let seasonEndDate: Date | null = null;
  let showImdbId: string | null = null;
  let showName: string | null = null;
  const { data: seasonRow, error: seasonRowError } = await supabase
    .from("seasons")
    .select("id, premiere_date, air_date")
    .eq("show_id", showId)
    .eq("season_number", seasonNumber)
    .maybeSingle();

  if (seasonRowError) {
    console.error("[trr-shows-repository] getAssetsByShowSeason season lookup error:", seasonRowError);
  } else if (seasonRow) {
    seasonId = seasonRow.id;
    const initialStart = seasonRow.premiere_date ?? seasonRow.air_date ?? null;
    if (seasonId) {
      const { data: episodeDates, error: episodeDatesError } = await supabase
        .from("episodes")
        .select("air_date")
        .eq("season_id", seasonId)
        .not("air_date", "is", null)
        .limit(500);

      if (episodeDatesError) {
        console.error(
          "[trr-shows-repository] getAssetsByShowSeason episode date error:",
          episodeDatesError
        );
      } else if (episodeDates) {
        const parsedDates = (episodeDates as Array<{ air_date: string | null }>)
          .map((row) => toDateOnly(row.air_date))
          .filter((date): date is Date => Boolean(date));

        if (parsedDates.length > 0) {
          parsedDates.sort((a, b) => a.getTime() - b.getTime());
          seasonStartDate = parsedDates[0];
          seasonEndDate = parsedDates[parsedDates.length - 1];
        }
      }
    }

    if (!seasonStartDate) {
      const window = computeSeasonWindow(initialStart, null);
      seasonStartDate = window.startDate;
      seasonEndDate = window.endDate;
    } else if (!seasonEndDate) {
      const window = computeSeasonWindow(seasonStartDate.toISOString(), null);
      seasonEndDate = window.endDate;
    }
  }

  const { data: showRow, error: showRowError } = await supabase
    .from("shows")
    .select("name, external_ids")
    .eq("id", showId)
    .maybeSingle();

  if (showRowError) {
    console.error("[trr-shows-repository] getAssetsByShowSeason show lookup error:", showRowError);
  } else if (showRow) {
    showName = showRow.name ?? null;
    const externalIds = (showRow.external_ids ?? {}) as Record<string, string>;
    showImdbId = externalIds.imdb_id ?? externalIds.imdb ?? null;
  }

  // 1. Get season images
  const seasonSelects = [
    "id, source, kind, image_type, hosted_url, width, height, created_at, ingest_status, metadata",
    "id, source, kind, image_type, hosted_url, width, height, created_at, metadata",
    "id, source, kind, hosted_url, width, height, created_at, metadata",
    "id, source, kind, hosted_url, width, height",
    "id, source, hosted_url, width, height",
  ];
  const { data: seasonImages, error: seasonError } = await runSelectWithFallback(
    seasonSelects,
    (select) =>
      supabase
        .from("season_images")
        .select(select)
        .eq("show_id", showId)
        .eq("season_number", seasonNumber)
        .not("hosted_url", "is", null)
        .limit(30)
  );

  if (seasonError) {
    console.error("[trr-shows-repository] getAssetsByShowSeason season_images error:", seasonError);
  } else if (seasonImages) {
    type SeasonImageRow = {
      id: string;
      source: string;
      kind?: string | null;
      image_type?: string | null;
      hosted_url: string;
      width: number | null;
      height: number | null;
      created_at?: string | null;
      ingest_status?: string | null;
      metadata?: Record<string, unknown> | null;
    };
    const typedSeasonImages = seasonImages as SeasonImageRow[];
    for (const img of typedSeasonImages) {
      const imageKind = img.image_type ?? img.kind ?? "poster";
      assets.push({
        id: img.id,
        type: "season",
        source: img.source,
        kind: imageKind,
        hosted_url: img.hosted_url,
        width: img.width,
        height: img.height,
        caption: `Season ${seasonNumber}`,
        season_number: seasonNumber,
        created_at: img.created_at,
        ingest_status: img.ingest_status,
        metadata: img.metadata,
      });
    }
  }

  // 2. Get episode images
  const episodeSelects = [
    "id, source, kind, image_type, hosted_url, width, height, episode_number, created_at, ingest_status, metadata",
    "id, source, kind, image_type, hosted_url, width, height, episode_number, created_at, metadata",
    "id, source, kind, hosted_url, width, height, episode_number, created_at, metadata",
    "id, source, kind, hosted_url, width, height, episode_number",
    "id, source, hosted_url, width, height, episode_number",
  ];
  const { data: episodeImages, error: episodeError } = await runSelectWithFallback(
    episodeSelects,
    (select) =>
      supabase
        .from("episode_images")
        .select(select)
        .eq("show_id", showId)
        .eq("season_number", seasonNumber)
        .not("hosted_url", "is", null)
        .order("episode_number", { ascending: true })
        .limit(50)
  );

  if (episodeError) {
    console.error("[trr-shows-repository] getAssetsByShowSeason episode_images error:", episodeError);
  } else if (episodeImages) {
    type EpisodeImageRow = {
      id: string;
      source: string;
      kind?: string | null;
      image_type?: string | null;
      hosted_url: string;
      width: number | null;
      height: number | null;
      episode_number: number;
      created_at?: string | null;
      ingest_status?: string | null;
      metadata?: Record<string, unknown> | null;
    };
    const typedEpisodeImages = episodeImages as EpisodeImageRow[];
    for (const img of typedEpisodeImages) {
      const imageKind = img.image_type ?? img.kind ?? "still";
      assets.push({
        id: img.id,
        type: "episode",
        source: img.source,
        kind: imageKind,
        hosted_url: img.hosted_url,
        width: img.width,
        height: img.height,
        caption: `Episode ${img.episode_number}`,
        episode_number: img.episode_number,
        season_number: seasonNumber,
        created_at: img.created_at,
        ingest_status: img.ingest_status,
        metadata: img.metadata,
      });
    }
  }

  // 3. Get cast photos for people who appeared in this season
  // First get person IDs from the season cast view
  const { data: seasonCast, error: castError } = await supabase
    .from("v_person_show_seasons")
    .select("person_id, person_name")
    .eq("show_id", showId)
    .contains("seasons_appeared", [seasonNumber])
    .limit(30);

  if (castError) {
    console.error("[trr-shows-repository] getAssetsByShowSeason cast error:", castError);
  } else if (seasonCast && seasonCast.length > 0) {
    type CastRow = { person_id: string; person_name: string };
    const typedCast = seasonCast as CastRow[];
    const personIds = typedCast.map((c) => c.person_id);
    const personNameMap = new Map(typedCast.map((c) => [c.person_id, c.person_name]));

    // Get photos for these people
    const castSelects = [
      "id, person_id, source, hosted_url, hosted_content_type, width, height, caption, context_section, context_type, season, fetched_at, hosted_at, updated_at, title_imdb_ids, title_names, metadata, ingest_status",
      "id, person_id, source, hosted_url, hosted_content_type, width, height, caption, context_section, context_type, season, fetched_at, hosted_at, updated_at, title_imdb_ids, title_names, metadata",
      "id, person_id, source, hosted_url, hosted_content_type, width, height, caption, context_section, context_type, season, fetched_at, hosted_at, updated_at, title_imdb_ids, title_names",
      "id, person_id, source, hosted_url, hosted_content_type, width, height, caption, season, fetched_at, hosted_at, updated_at, title_imdb_ids, title_names",
    ];
    const { data: castPhotos, error: photoError } = await runSelectWithFallback(
      castSelects,
      (select) =>
        supabase
          .from("cast_photos")
          .select(select)
          .in("person_id", personIds)
          .not("hosted_url", "is", null)
          .limit(100)
    );

    if (photoError) {
      console.error("[trr-shows-repository] getAssetsByShowSeason cast_photos error:", photoError);
    } else if (castPhotos) {
      type PhotoRow = {
        id: string;
        person_id: string;
        source: string;
        hosted_url: string;
        hosted_content_type: string | null;
        width: number | null;
        height: number | null;
        caption: string | null;
        context_section: string | null;
        context_type: string | null;
        season: number | null;
        fetched_at?: string | null;
        hosted_at?: string | null;
        updated_at?: string | null;
        created_at?: string | null;
        title_imdb_ids?: string[] | null;
        title_names?: string[] | null;
        metadata?: Record<string, unknown> | null;
        ingest_status?: string | null;
      };
      const typedPhotos = castPhotos as PhotoRow[];
      for (const photo of typedPhotos) {
        const isSeasonTagged = photo.season === seasonNumber;
        const photoDate =
          photo.fetched_at ?? photo.hosted_at ?? photo.updated_at ?? photo.created_at ?? null;
        const photoDateOnly = toDateOnly(photoDate);
        const inSeasonWindow =
          seasonStartDate && seasonEndDate && photoDateOnly
            ? photoDateOnly >= seasonStartDate && photoDateOnly <= seasonEndDate
            : false;

        if (!isSeasonTagged && !inSeasonWindow) {
          continue;
        }

        if (photo.title_imdb_ids && photo.title_imdb_ids.length > 0) {
          if (showImdbId && !photo.title_imdb_ids.includes(showImdbId)) {
            continue;
          }
          if (!showImdbId && showName) {
            const normalizedShowName = showName.toLowerCase();
            const matchesShow = photo.title_names?.some((title) =>
              title.toLowerCase().includes(normalizedShowName)
            );
            if (!matchesShow) {
              continue;
            }
          }
        }

        if (!isLikelyImage(null, photo.hosted_url)) {
          continue;
        }
        assets.push({
          id: photo.id,
          type: "cast",
          source: photo.source,
          kind: "profile",
          hosted_url: photo.hosted_url,
          width: photo.width,
          height: photo.height,
          caption: photo.caption,
          person_id: photo.person_id,
          person_name: personNameMap.get(photo.person_id) ?? undefined,
          season_number: photo.season ?? seasonNumber,
          context_section: photo.context_section,
          context_type: photo.context_type,
          fetched_at: photo.fetched_at,
          created_at: photo.created_at,
          metadata: photo.metadata,
          ingest_status: photo.ingest_status,
          hosted_content_type: photo.hosted_content_type,
        });
      }
    }
  }

  // Sort by type priority: season first, then episode, then cast
  const typePriority: Record<string, number> = { season: 0, episode: 1, cast: 2, show: 3 };
  assets.sort((a, b) => {
    const priorityA = typePriority[a.type] ?? 99;
    const priorityB = typePriority[b.type] ?? 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    // Within same type, sort by episode_number if available
    if (a.episode_number !== undefined && b.episode_number !== undefined) {
      return a.episode_number - b.episode_number;
    }
    return 0;
  });

  return assets.slice(0, limit);
}

// ============================================================================
// Fandom/Wikia Functions
// ============================================================================

/**
 * Get Fandom/Wikia data for a person by their person_id.
 */
export async function getFandomDataByPersonId(
  personId: string
): Promise<TrrCastFandom[]> {
  const supabase = getSupabaseTrrCore();

  const { data, error } = await supabase
    .from("cast_fandom")
    .select("*")
    .eq("person_id", personId)
    .order("scraped_at", { ascending: false });

  if (error) {
    console.error("[trr-shows-repository] getFandomDataByPersonId error:", error);
    throw new Error(`Failed to get fandom data: ${error.message}`);
  }

  return (data ?? []) as TrrCastFandom[];
}
