import "server-only";
import { getSupabaseTrrCore } from "@/lib/server/supabase-trr-core";

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
  const { data: viewPhotos, error: viewError } = await supabase
    .from("v_cast_photos")
    .select("person_id, display_url, hosted_url, url")
    .in("person_id", personIds);

  if (viewError) {
    console.log("[trr-shows-repository] v_cast_photos view not available:", viewError.message);

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
        if (photoUrl && !photosMap.has(photo.person_id)) {
          photosMap.set(photo.person_id, photoUrl);
        }
      }
      console.log(`[trr-shows-repository] Loaded ${photosMap.size} hosted photos from cast_photos table`);
    }
  } else if (viewPhotos) {
    const typedPhotos = viewPhotos as Array<{ person_id: string; display_url?: string; hosted_url?: string; url?: string }>;
    for (const photo of typedPhotos) {
      // Only use hosted URLs (CloudFront) - skip unmirrored external images
      const photoUrl = photo.hosted_url;
      if (photoUrl && !photosMap.has(photo.person_id)) {
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

export interface TrrPersonPhoto {
  id: string;
  person_id: string;
  source: string;
  url: string | null;
  hosted_url: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  context_type: string | null;
  season: number | null;
  // Metadata fields
  people_names: string[] | null;
  title_names: string[] | null;
  metadata: Record<string, unknown> | null;
  fetched_at: string | null;
  created_at: string | null;
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

  // Query 1: Get photos from cast_photos table
  const { data: castPhotos, error: castError } = await supabase
    .from("cast_photos")
    .select("id, person_id, source, url, hosted_url, caption, width, height, context_type, season, people_names, title_names, metadata, fetched_at")
    .eq("person_id", personId)
    .not("hosted_url", "is", null)
    .order("source", { ascending: true })
    .order("gallery_index", { ascending: true, nullsFirst: false });

  if (castError) {
    console.error("[trr-shows-repository] getPhotosByPersonId cast_photos error:", castError);
    throw new Error(`Failed to get photos: ${castError.message}`);
  }

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
    caption: string | null;
    width: number | null;
    height: number | null;
    metadata: Record<string, unknown>;
    fetched_at: string | null;
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
      .select("id, source, source_url, hosted_url, caption, width, height, metadata, fetched_at")
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
          return {
            id: link.id,
            person_id: personId,
            source: asset.source || "web_scrape",
            url: asset.source_url,
            hosted_url: asset.hosted_url,
            caption: asset.caption,
            width: asset.width,
            height: asset.height,
            context_type: context?.context_type as string | null ?? null,
            season: context?.season as number | null ?? null,
            people_names: null,
            title_names: null,
            metadata: asset.metadata,
            fetched_at: asset.fetched_at,
            created_at: link.created_at,
          } as TrrPersonPhoto;
        })
        .filter((p): p is TrrPersonPhoto => p !== null);
    }
  }

  // Merge both sources, cast_photos first then media_links
  const allPhotos = [...(castPhotos ?? []) as TrrPersonPhoto[], ...mediaPhotos];

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
      if (photo.hosted_url && !photosMap.has(photo.person_id)) {
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

  // 1. Get season images
  const { data: seasonImages, error: seasonError } = await supabase
    .from("season_images")
    .select("id, source, image_type, hosted_url, width, height")
    .eq("show_id", showId)
    .eq("season_number", seasonNumber)
    .not("hosted_url", "is", null)
    .limit(30);

  if (seasonError) {
    console.error("[trr-shows-repository] getAssetsByShowSeason season_images error:", seasonError);
  } else if (seasonImages) {
    type SeasonImageRow = {
      id: string;
      source: string;
      image_type: string | null;
      hosted_url: string;
      width: number | null;
      height: number | null;
    };
    const typedSeasonImages = seasonImages as SeasonImageRow[];
    for (const img of typedSeasonImages) {
      assets.push({
        id: img.id,
        type: "season",
        source: img.source,
        kind: img.image_type ?? "poster",
        hosted_url: img.hosted_url,
        width: img.width,
        height: img.height,
        caption: `Season ${seasonNumber}`,
      });
    }
  }

  // 2. Get episode images
  const { data: episodeImages, error: episodeError } = await supabase
    .from("episode_images")
    .select("id, source, image_type, hosted_url, width, height, episode_number")
    .eq("show_id", showId)
    .eq("season_number", seasonNumber)
    .not("hosted_url", "is", null)
    .order("episode_number", { ascending: true })
    .limit(50);

  if (episodeError) {
    console.error("[trr-shows-repository] getAssetsByShowSeason episode_images error:", episodeError);
  } else if (episodeImages) {
    type EpisodeImageRow = {
      id: string;
      source: string;
      image_type: string | null;
      hosted_url: string;
      width: number | null;
      height: number | null;
      episode_number: number;
    };
    const typedEpisodeImages = episodeImages as EpisodeImageRow[];
    for (const img of typedEpisodeImages) {
      assets.push({
        id: img.id,
        type: "episode",
        source: img.source,
        kind: img.image_type ?? "still",
        hosted_url: img.hosted_url,
        width: img.width,
        height: img.height,
        caption: `Episode ${img.episode_number}`,
        episode_number: img.episode_number,
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
    const { data: castPhotos, error: photoError } = await supabase
      .from("cast_photos")
      .select("id, person_id, source, hosted_url, width, height, caption")
      .in("person_id", personIds)
      .not("hosted_url", "is", null)
      .limit(100);

    if (photoError) {
      console.error("[trr-shows-repository] getAssetsByShowSeason cast_photos error:", photoError);
    } else if (castPhotos) {
      type PhotoRow = {
        id: string;
        person_id: string;
        source: string;
        hosted_url: string;
        width: number | null;
        height: number | null;
        caption: string | null;
      };
      const typedPhotos = castPhotos as PhotoRow[];
      for (const photo of typedPhotos) {
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
